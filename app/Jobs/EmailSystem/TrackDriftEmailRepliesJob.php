<?php

namespace App\Jobs\EmailSystem;

use App\Models\Central\EmailSystem\DriftSequence;
use App\Models\Central\EmailSystem\EmailAccount;
use App\Models\Central\EmailSystem\DriftSequenceLog;
use App\Models\Central\EmailSystem\Subscriber;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Google_Client;
use Google_Service_Gmail;
use Carbon\Carbon;

class TrackDriftEmailRepliesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $sequenceId;
    protected $emailAccountEmail;

    public $timeout = 300;

    public function __construct($sequenceId, $emailAccountEmail)
    {
        $this->sequenceId = $sequenceId;
        $this->emailAccountEmail = $emailAccountEmail;
        $this->onQueue('emails');
    }

    public function handle()
    {
        Log::info('Processing reply tracking job', [
            'sequence_id' => $this->sequenceId,
            'email_account_email' => $this->emailAccountEmail,
        ]);

        try {
            $sequence = DriftSequence::on('pluto')->findOrFail($this->sequenceId);
            $emailAccount = EmailAccount::on('pluto')->where('email', $this->emailAccountEmail)->firstOrFail();

            $client = $this->getGoogleClient($emailAccount);
            $gmail = new Google_Service_Gmail($client);

            // Fetch logs with sent status for this sequence
            $logs = DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->where('status', 'sent')
                ->get(['id', 'subscriber_id', 'message_id', 'email_account_id']);

            $nextSequence = DriftSequence::on('pluto')
                ->where('set_id', $sequence->set_id)
                ->where('id', '>', $this->sequenceId)
                ->whereJsonContains('categories', 'automatic_reply')
                ->orderBy('id')
                ->first();

            foreach ($logs as $log) {
                $this->checkRepliesForMessage($gmail, $emailAccount, $log, $nextSequence);
            }

            Log::info('Completed reply tracking for sequence', [
                'sequence_id' => $this->sequenceId,
                'email_account_email' => $this->emailAccountEmail,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in reply tracking job', [
                'sequence_id' => $this->sequenceId,
                'email_account_email' => $this->emailAccountEmail,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    protected function checkRepliesForMessage(Google_Service_Gmail $gmail, EmailAccount $emailAccount, $log, $nextSequence)
    {
        $messageId = trim($log->message_id, '<>');
        Log::debug('Checking replies for message', [
            'sequence_id' => $this->sequenceId,
            'subscriber_id' => $log->subscriber_id,
            'original_message_id' => $messageId,
        ]);

        // Query Gmail for emails with In-Reply-To or References matching the original Message-ID
        $query = sprintf('from: inbox in:reply %s', $messageId);
        $messages = $gmail->users_messages->listUsersMessages('me', [
            'q' => $query,
            'maxResults' => 10,
        ]);

        foreach ($messages->getMessages() as $message) {
            $fullMessage = $gmail->users_messages->get('me', $message->getId(), ['format' => 'metadata']);
            $headers = $fullMessage->getPayload()->getHeaders();
            $replyMessageId = $fullMessage->getId();

            $inReplyTo = '';
            $references = '';
            $fromEmail = '';
            foreach ($headers as $header) {
                if ($header->getName() === 'In-Reply-To') {
                    $inReplyTo = $header->getValue();
                }
                if ($header->getName() === 'References') {
                    $references = $header->getValue();
                }
                if ($header->getName() === 'From') {
                    $fromEmail = $header->getValue();
                }
            }

            if (strpos($inReplyTo, $messageId) !== false || strpos($references, $messageId) !== false) {
                Log::info('Reply detected for sequence', [
                    'sequence_id' => $this->sequenceId,
                    'subscriber_id' => $log->subscriber_id,
                    'original_message_id' => $messageId,
                    'reply_message_id' => $replyMessageId,
                    'from_email' => $fromEmail,
                ]);

                // Update drift_sequence_logs (add replies column if not exists)
                DriftSequenceLog::on('pluto')
                    ->where('id', $log->id)
                    ->update([
                        'replies' => \DB::raw('COALESCE(replies, 0) + 1'),
                        'replied_at' => now(),
                        'updated_at' => now(),
                    ]);

                // Insert into drift_sequence_replies (if table exists)
                if (\Schema::connection('pluto')->hasTable('drift_sequence_replies')) {
                    \DB::connection('pluto')->table('drift_sequence_replies')->insert([
                        'sequence_id' => $this->sequenceId,
                        'subscriber_id' => $log->subscriber_id,
                        'email_account_id' => $log->email_account_id,
                        'original_log_id' => $log->id,
                        'reply_message_id' => $replyMessageId,
                        'replied_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // Dispatch automatic reply sequence (sequence 167)
                if ($nextSequence) {
                    $replySubscriber = Subscriber::on('pluto')
                        ->where('email', $this->extractEmail($fromEmail))
                        ->first();
                    if ($replySubscriber) {
                        Log::info('Dispatching automatic reply sequence', [
                            'next_sequence_id' => $nextSequence->id,
                            'subscriber_id' => $replySubscriber->id,
                            'email' => $replySubscriber->email,
                        ]);
                        SendDriftEmailSequenceJob::dispatch(
                            $nextSequence->id,
                            $replySubscriber->id,
                            $log->email_account_id,
                            1
                        )->onQueue('emails');
                    }
                }
            }
        }
    }

    protected function extractEmail($fromHeader)
    {
        // Extract email from "Name <email@domain.com>" format
        if (preg_match('/<(.+?)>/', $fromHeader, $matches)) {
            return $matches[1];
        }
        return $fromHeader;
    }

    protected function getGoogleClient(EmailAccount $account)
    {
        Log::info('Entering getGoogleClient for reply tracking', [
            'email' => $account->email,
            'access_token' => $account->access_token ? 'present' : 'null',
            'refresh_token' => $account->refresh_token ? 'present' : 'null',
        ]);

        $client = new Google_Client();
        $client->setApplicationName('Drift Email Sequence');
        $client->setScopes([Google_Service_Gmail::GMAIL_READONLY]);

        $credentialsPath = config('services.google.credentials_file');
        Log::info('Google credentials path for reply tracking', [
            'path' => $credentialsPath,
            'exists' => file_exists($credentialsPath),
        ]);
        if (!file_exists($credentialsPath)) {
            throw new \Exception("Google credentials file not found at: {$credentialsPath}");
        }
        $client->setAuthConfig($credentialsPath);

        $client->setAccessToken($account->access_token);

        if ($client->isAccessTokenExpired()) {
            Log::info('Access token expired, attempting to refresh for reply tracking', ['email' => $account->email]);
            $newToken = $client->fetchAccessTokenWithRefreshToken($account->refresh_token);
            Log::info('Token refresh response for reply tracking', ['newToken' => $newToken]);

            if (empty($newToken) || isset($newToken['error'])) {
                throw new \Exception("Failed to refresh access token: " . ($newToken['error_description'] ?? 'Unknown error'));
            }

            $currentToken = $client->getAccessToken();
            if (!isset($currentToken['access_token'])) {
                throw new \Exception("No access_token in refresh response: " . json_encode($currentToken));
            }

            EmailAccount::on('pluto')
                ->where('email', $account->email)
                ->update(['access_token' => $currentToken['access_token']]);
            Log::info('Access token updated for reply tracking', [
                'email' => $account->email,
                'new_access_token' => $currentToken['access_token'],
            ]);
        }

        return $client;
    }
}
