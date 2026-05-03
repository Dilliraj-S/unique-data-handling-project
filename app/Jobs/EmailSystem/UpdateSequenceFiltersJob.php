<?php

namespace App\Jobs\EmailSystem;



use App\Models\Central\EmailSystem\DriftSequence;
use App\Models\Central\EmailSystem\Subscriber;
use App\Models\Central\EmailSystem\EmailAccount;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Google_Client;
use Google_Service_Gmail;

class UpdateSequenceFiltersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $sequenceId;
    protected $step;

    public function __construct($sequenceId, $step = 1)
    {
        $this->sequenceId = $sequenceId;
        $this->step = $step;
    }

    public function handle()
    {
        try {
            // Check if sequence exists before proceeding
            $sequence = DriftSequence::find($this->sequenceId);
            if (!$sequence) {
                Log::warning("UpdateSequenceFiltersJob: Sequence not found", [
                    'sequence_id' => $this->sequenceId,
                    'message' => 'Sequence does not exist in the database'
                ]);
                return; // Exit gracefully instead of throwing an exception
            }

            $emailAccounts = EmailAccount::whereIn('id', function ($query) use ($sequence) {
                $query->select('email_account_id')
                    ->from('drift_sequence_logs')
                    ->where('sequence_id', $sequence->id);
            })->get();

            // Trigger high-priority email fetching for all accounts
            foreach ($emailAccounts as $emailAccount) {
                // Dispatch high-priority LiveEmailFetch for this sequence
                \App\Jobs\EmailSystem\LiveEmailFetch::dispatch(
                    $emailAccount->email, 
                    'inbox', 
                    'high', 
                    $this->sequenceId
                )->onQueue('email-sync-high');
            }

            // Wait a bit for emails to be fetched, then process filters
            sleep(5);

            $filters = [];
            foreach ($emailAccounts as $emailAccount) {
                $replies = DB::connection('pluto')->table('emails')
                    ->join('drift_sequence_logs', function ($join) {
                        $join->on('emails.in_reply_to', '=', 'drift_sequence_logs.message_id')
                            ->where('drift_sequence_logs.sequence_id', $this->sequenceId);
                    })
                    ->where('emails.account_email', $emailAccount->email)
                    ->where('emails.created_at', '>=', $sequence->created_at)
                    ->select('emails.account_email', 'emails.from', 'emails.status', 'emails.in_reply_to', 'emails.created_at', 'emails.updated_at')
                    ->get();

                foreach ($replies as $reply) {
                    // Extract email address from "cloudsync <cloudsync3000@gmail.com>"
                    preg_match('/<(.+?)>/', $reply->from, $matches);
                    $fromEmail = $matches[1] ?? $reply->from;
                    $filters[] = [
                        'email' => $fromEmail,
                        'status' => $reply->status,
                        'sequence_id' => $this->sequenceId,
                        'created_at' => now()->toDateTimeString(),
                        'updated_at' => now()->toDateTimeString(),
                    ];
                }
            }

            if (!empty($filters)) {
                // Update drift_sequences.filters with JSON-encoded filters
                DB::connection('pluto')->table('drift_sequences')
                    ->where('id', $this->sequenceId)
                    ->update(['filters' => json_encode($filters)]);
            }

            // Update report to count replies from emails table
            $report = DB::connection('pluto')->table('drift_sequence_logs')
                ->where('sequence_id', $this->sequenceId)
                ->selectRaw('
                    COUNT(*) as total_sent,
                    SUM(CASE WHEN status = "delivered" THEN 1 ELSE 0 END) as delivered,
                    SUM(CASE WHEN status = "bounced" THEN 1 ELSE 0 END) as bounced,
                    SUM(CASE WHEN status = "failed" THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = "opened" THEN 1 ELSE 0 END) as opened,
                    SUM(CASE WHEN status = "clicked" THEN 1 ELSE 0 END) as clicked,
                    SUM(CASE WHEN status = "replied" THEN 1 ELSE 0 END) as replied
                ')
                ->first();

            // Count replies from emails table
            $replyCount = DB::connection('pluto')->table('emails')
                ->join('drift_sequence_logs', function ($join) {
                    $join->on('emails.in_reply_to', '=', 'drift_sequence_logs.message_id')
                        ->where('drift_sequence_logs.sequence_id', $this->sequenceId);
                })
                ->where('emails.created_at', '>=', $sequence->created_at)
                ->count();

            // Log the report data for debugging purposes only
            if ($report) {
                Log::info('UpdateSequenceFiltersJob report data:', [
                    'sequence_id' => $this->sequenceId,
                    'total_sent' => $report->total_sent,
                    'delivered' => $report->delivered,
                    'bounced' => $report->bounced,
                    'failed' => $report->failed,
                    'opened' => $report->opened,
                    'clicked' => $report->clicked,
                    'replied' => $replyCount,
                ]);
            }

        } catch (\Exception $e) {
            Log::error("UpdateSequenceFiltersJob failed", [
                'sequence_id' => $this->sequenceId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    protected function fetchGmailReplies(DriftSequence $sequence, EmailAccount $emailAccount)
    {
        try {
            $client = $this->getGoogleClient($emailAccount);
            $gmail = new Google_Service_Gmail($client);

            $sentMessageIds = DB::connection('pluto')
                ->table('drift_sequence_logs')
                ->where('sequence_id', $sequence->id)
                ->whereNotNull('message_id')
                ->pluck('message_id')
                ->toArray();

            if (empty($sentMessageIds)) {
                Log::warning('No sent message IDs found in drift_sequence_logs', [
                    'sequence_id' => $sequence->id,
                    'sender_email' => $emailAccount->email,
                ]);
                return;
            }

            foreach ($sentMessageIds as $messageId) {
                $escapedMessageId = str_replace(['<', '>'], '', $messageId);
                $query = "to:{$emailAccount->email} {$escapedMessageId}";
                $messages = $gmail->users_messages->listUsersMessages('me', [
                    'q' => $query,
                    'maxResults' => 100,
                ]);

                foreach ($messages->getMessages() as $message) {
                    $fullMessage = $gmail->users_messages->get('me', $message->getId(), ['format' => 'full']);
                    $headers = $fullMessage->getPayload()->getHeaders();

                    $inReplyTo = collect($headers)->firstWhere('name', 'In-Reply-To')?->value;
                    $references = collect($headers)->firstWhere('name', 'References')?->value;
                    $fromHeader = collect($headers)->firstWhere('name', 'From')?->value;

                    if (!$inReplyTo && !$references) {
                        continue;
                    }

                    if (strpos($inReplyTo, $messageId) === false && strpos($references, $messageId) === false) {
                        continue;
                    }

                    preg_match('/<(.+?)>/', $fromHeader, $matches);
                    $fromEmail = $matches[1] ?? $fromHeader;

                    $subscriber = Subscriber::on('pluto')
                        ->where('email', $fromEmail)
                        ->where('audiences_id', $sequence->audiences_id)
                        ->first();

                    if (!$subscriber) {
                        Log::warning('No subscriber found for reply', [
                            'sequence_id' => $sequence->id,
                            'from_email' => $fromEmail,
                            'message_id' => $message->getId(),
                        ]);
                        continue;
                    }

                    $status = 'replied';
                    $autoReplyHeaders = ['Auto-Submitted', 'X-Auto-Response-Suppress'];
                    foreach ($headers as $header) {
                        if (in_array($header->name, $autoReplyHeaders) && stripos($header->value, 'auto') !== false) {
                            $status = 'automatic_reply';
                            break;
                        }
                        // Detect unsubscribe (simplified, adjust based on your logic)
                        if (stripos($header->name, 'List-Unsubscribe') !== false || stripos($message->getSnippet(), 'unsubscribe') !== false) {
                            $status = 'unsubscribe';
                        }
                    }

                    DB::connection('pluto')->table('emails')->updateOrInsert(
                        [
                            'account_email' => $emailAccount->email,
                            'from' => $fromEmail,
                            'message_id' => $message->getId(),
                        ],
                        [
                            'in_reply_to' => $inReplyTo,
                            'status' => $status,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to fetch Gmail replies', [
                'sequence_id' => $sequence->id,
                'email_account_id' => $emailAccount->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    protected function getGoogleClient(EmailAccount $account)
    {
        $client = new Google_Client();
        $client->setApplicationName('Drift Email Sequence');
        $client->setScopes([Google_Service_Gmail::GMAIL_READONLY]);

        $credentialsPath = config('services.google.credentials_file');
        if (!file_exists($credentialsPath)) {
            throw new \Exception("Google credentials file not found at: {$credentialsPath}");
        }
        $client->setAuthConfig($credentialsPath);

        $client->setAccessToken($account->access_token);

        if ($client->isAccessTokenExpired()) {
            $newToken = $client->fetchAccessTokenWithRefreshToken($account->refresh_token);
            if (empty($newToken) || isset($newToken['error'])) {
                throw new \Exception('Failed to refresh access token: ' . ($newToken['error_description'] ?? 'Unknown error'));
            }
            $currentToken = $client->getAccessToken();
            EmailAccount::on('pluto')
                ->where('email', $account->email)
                ->update(['access_token' => $currentToken['access_token']]);
        }

        return $client;
    }
}
