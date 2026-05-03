<?php

namespace App\Jobs\EmailSystem;

use App\Models\Campaign;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mime\Email;
use Google_Client;
use Google_Service_Gmail;
use Google_Service_Gmail_Message;

class SendCampaignEmailJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $uniqueId;
    public $timeout = 300; // 5 minutes timeout to prevent hanging jobs

    protected $campaignId;
    protected $fromEmail;
    protected $subject;
    protected $templateContent;
    protected $subscriberId;
    protected $region;
    protected $timezone;
    protected $progressId;
    protected $batchSize;

    public function __construct(
        $campaignId,
        $fromEmail,
        $subject,
        $templateContent,
        $subscriberId,
        $region,
        $timezone,
        $progressId,
        $batchSize
    ) {
        $this->campaignId = $campaignId;
        $this->fromEmail = $fromEmail;
        $this->subject = $subject;
        $this->templateContent = $templateContent;
        $this->subscriberId = $subscriberId;
        $this->region = $region;
        $this->timezone = $timezone;
        $this->progressId = $progressId;
        $this->batchSize = $batchSize;
        $this->uniqueId = "campaign_{$campaignId}_subscriber_{$subscriberId}_progress_{$progressId}";

        // Get email account ID for dynamic queue assignment
        $emailAccount = DB::connection('pluto')
            ->table('email_accounts')
            ->where('email', $fromEmail)
            ->first();

        if ($emailAccount) {
            // Dynamic queue assignment based on sender account (like drift system)
            $queueName = 'emails_sender_' . $emailAccount->id;
            $this->onQueue($queueName);
        } else {
            // Fallback to default queue
            $this->onQueue('emails');
        }
    }

    public function uniqueId()
    {
        return $this->uniqueId;
    }

    public function handle()
    {
        Log::info('Processing SendCampaignEmailJob', [
            'campaign_id' => $this->campaignId,
            'subscriber_id' => $this->subscriberId,
            'from_email' => $this->fromEmail,
            'progress_id' => $this->progressId,
            'batch_size' => $this->batchSize,
        ]);

        $emailAccount = $this->retryModelQuery(function () {
            return DB::connection('pluto')
                ->table('email_accounts')
                ->where('email', $this->fromEmail)
                ->first();
        });

        if (!$emailAccount) {
            Log::error('Email account not found', [
                'campaign_id' => $this->campaignId,
                'from_email' => $this->fromEmail,
            ]);
            throw new \Exception('Email account not found: ' . $this->fromEmail);
        }

        $lockKey = "email_quota:{$emailAccount->id}";
        $lock = Cache::lock($lockKey, 10);

        if (!$lock->get()) {
            Log::warning('Could not acquire lock for email quota check', [
                'email_account_id' => $emailAccount->id,
                'campaign_id' => $this->campaignId,
            ]);
            $delay = min(pow(2, max(1, $this->attempts())) * 10, 120);
            $this->release($delay);
            return;
        }

        try {
            // Check daily send limit
            $sentCount = $this->retryModelQuery(function () {
                return DB::connection('pluto')
                    ->table('email_campaign_logs')
                    ->where('from_email', $this->fromEmail)
                    ->where('sent_at', '>=', now()->subDay())
                    ->count();
            });
            $limit = $emailAccount->daily_send_limit ?? 500; // Default to 500 if not set
            if ($sentCount >= $limit) {
                Log::warning('Daily send limit reached', [
                    'email_account_id' => $emailAccount->id,
                    'from_email' => $this->fromEmail,
                    'limit' => $limit,
                    'sent_in_last_24h' => $sentCount,
                ]);
                $this->retryModelQuery(function () {
                    return DB::connection('pluto')
                        ->table('email_campaign_logs')
                        ->updateOrInsert(
                            [
                                'campaign_id' => $this->campaignId,
                                'subscriber_id' => $this->subscriberId,
                                'progress_id' => $this->progressId ?: DB::raw('progress_id'),
                            ],
                            [
                                'from_email' => $this->fromEmail,
                                'status' => 'pending',
                                'error_message' => 'Queued for retry after daily send limit reached',
                                'updated_at' => now(),
                                'batch_size' => $this->batchSize,
                            ]
                        );
                });
                Log::info('Queueing retry for email after quota reset', [
                    'email_account_id' => $emailAccount->id,
                    'campaign_id' => $this->campaignId,
                ]);
                SendCampaignEmailJob::dispatch(
                    $this->campaignId,
                    $this->fromEmail,
                    $this->subject,
                    $this->templateContent,
                    $this->subscriberId,
                    $this->region,
                    $this->timezone,
                    $this->progressId,
                    $this->batchSize
                )->delay(now()->addHours(24));
                return;
            }

            $campaign = $this->retryModelQuery(function () {
                return \App\Models\Central\EmailSystem\Campaign::on('pluto')
                    ->with(['audience.subscribers'])
                    ->find($this->campaignId);
            });

            if (!$campaign) {
                Log::error('Campaign not found in SendCampaignEmailJob', [
                    'campaign_id' => $this->campaignId,
                    'subscriber_id' => $this->subscriberId,
                    'progress_id' => $this->progressId,
                ]);
                throw new \Exception('Campaign not found: ' . $this->campaignId);
            }
            if (!$campaign->audience) {
                Log::error('Audience is null in SendCampaignEmailJob', [
                    'campaign_id' => $this->campaignId,
                    'subscriber_id' => $this->subscriberId,
                    'progress_id' => $this->progressId,
                ]);
                throw new \Exception('Audience is null for campaign: ' . $this->campaignId);
            }

            $subscriber = $this->retryModelQuery(function () {
                return DB::connection('pluto')
                    ->table('subscribers')
                    ->where('id', $this->subscriberId)
                    ->first();
            });

            if (!$subscriber) {
                throw new \Exception('Subscriber not found: ' . $this->subscriberId);
            }

            // Lock the log entry to prevent concurrent updates
            $existingLog = $this->retryModelQuery(function () {
                return DB::connection('pluto')
                    ->table('email_campaign_logs')
                    ->where('campaign_id', $this->campaignId)
                    ->where('subscriber_id', $this->subscriberId)
                    ->where('progress_id', $this->progressId ?: DB::raw('progress_id'))
                    ->lockForUpdate()
                    ->first();
            });

            $trackingId = $existingLog ? $existingLog->tracking_id : uniqid();
            $messageIdHeader = sprintf(
                '<%s>',
                uniqid('campaign_smtp_') . '.' . time() . '@'
                    . (parse_url(config('app.url'), PHP_URL_HOST) ?: 'localhost')
            );

            if ($existingLog) {
                if ($existingLog->status !== 'pending') {
                    Log::info('Skipping job for non-pending log entry', [
                        'campaign_id' => $this->campaignId,
                        'subscriber_id' => $this->subscriberId,
                        'progress_id' => $this->progressId,
                        'existing_status' => $existingLog->status,
                    ]);
                    return;
                }

                // Update the existing log to 'sending' with message_id
                $this->retryModelQuery(function () use ($existingLog, $messageIdHeader) {
                    return DB::connection('pluto')
                        ->table('email_campaign_logs')
                        ->where('id', $existingLog->id)
                        ->update([
                            'status' => 'sending',
                            'message_id' => $messageIdHeader,
                            'updated_at' => now(),
                        ]);
                });
            } else {
                Log::warning('No existing log found, creating new log entry', [
                    'campaign_id' => $this->campaignId,
                    'subscriber_id' => $this->subscriberId,
                    'progress_id' => $this->progressId,
                ]);
                $this->retryModelQuery(function () use ($subscriber, $messageIdHeader, $trackingId) {
                    return DB::connection('pluto')
                        ->table('email_campaign_logs')
                        ->insert([
                            'progress_id' => $this->progressId,
                            'campaign_id' => $this->campaignId,
                            'subscriber_id' => $this->subscriberId,
                            'from_email' => $this->fromEmail,
                            'to_email' => $subscriber->email,
                            'region' => $this->region,
                            'timezone' => $this->timezone,
                            'batch_size' => $this->batchSize,
                            'status' => 'sending',
                            'message_id' => $messageIdHeader,
                            'tracking_open' => false,
                            'tracking_clicks' => json_encode([]),
                            'tracking_id' => $trackingId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                });
            }

            // Increment sending_emails in campaign_progress
            if ($this->progressId) {
                $this->retryModelQuery(function () {
                    return DB::connection('pluto')
                        ->table('campaign_progress')
                        ->where('progress_id', $this->progressId)
                        ->increment('sending_emails');
                });
            }

            if (!$this->validateEmailAccount($emailAccount)) {
                throw new \Exception('Invalid email account configuration for sending');
            }
            $this->sendEmailToSubscriber($emailAccount, $subscriber, $messageIdHeader);

            // Update email_campaign_logs on success
            $this->retryModelQuery(function () {
                return DB::connection('pluto')
                    ->table('email_campaign_logs')
                    ->where('campaign_id', $this->campaignId)
                    ->where('subscriber_id', $this->subscriberId)
                    ->where('progress_id', $this->progressId ?: DB::raw('progress_id'))
                    ->update([
                        'status' => 'sent',
                        'sent_at' => now(),
                        'updated_at' => now(),
                    ]);
            });

            // Update campaign_progress on success
            if ($this->progressId) {
                $this->retryModelQuery(function () {
                    return DB::connection('pluto')
                        ->table('campaign_progress')
                        ->where('progress_id', $this->progressId)
                        ->update([
                            'sent_emails' => DB::raw('sent_emails + 1'),
                            'sending_emails' => DB::raw('sending_emails - 1'),
                            'pending_emails' => DB::raw('pending_emails - 1'),
                            'status' => DB::raw("IF(sent_emails + failed_emails + 1 >= total_emails, 'Completed', 'In Progress')"),
                            'updated_at' => now(),
                        ]);
                });
            }
        } catch (\Exception $e) {
            // Update email_campaign_logs on failure
            $this->retryModelQuery(function () use ($e) {
                return DB::connection('pluto')
                    ->table('email_campaign_logs')
                    ->where('campaign_id', $this->campaignId)
                    ->where('subscriber_id', $this->subscriberId)
                    ->where('progress_id', $this->progressId ?: DB::raw('progress_id'))
                    ->update([
                        'status' => 'failed',
                        'error_message' => $e->getMessage(),
                        'updated_at' => now(),
                    ]);
            });

            // Update campaign_progress on failure
            if ($this->progressId) {
                $this->retryModelQuery(function () {
                    return DB::connection('pluto')
                        ->table('campaign_progress')
                        ->where('progress_id', $this->progressId)
                        ->update([
                            'failed_emails' => DB::raw('failed_emails + 1'),
                            'sending_emails' => DB::raw('sending_emails - 1'),
                            'pending_emails' => DB::raw('pending_emails - 1'),
                            'status' => DB::raw("IF(sent_emails + failed_emails + 1 >= total_emails, 'Completed', 'In Progress')"),
                            'updated_at' => now(),
                        ]);
                });
            }

            Log::error('Failed to send campaign email', [
                'campaign_id' => $this->campaignId,
                'subscriber_id' => $this->subscriberId,
                'from_email' => $this->fromEmail,
                'progress_id' => $this->progressId,
                'batch_size' => $this->batchSize,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        } finally {
            $lock->release();
        }
    }

    protected function sendEmailToSubscriber($account, $subscriber, $messageIdHeader)
    {
        $content = $this->templateContent;

        $subscriberReplacements = [
            '[email]' => $subscriber->email ?? 'N/A',
            '[first_name]' => $subscriber->first_name ?? 'N/A',
            '[last_name]' => $subscriber->last_name ?? 'N/A',
            '[phone_number]' => $subscriber->phone_number ?? 'N/A',
            '[designation]' => $subscriber->designation ?? 'N/A',
            '[fax]' => $subscriber->fax ?? 'N/A',
            '[unsubscribe_link]' => url('/unsubscribe/' . ($subscriber->tracking_id ?? $subscriber->id)),
            '[postal_code]' => $subscriber->postal_code ?? 'N/A',
            '[address]' => $subscriber->address ?? 'N/A',
            '[tracking_id]' => $subscriber->tracking_id ?? 'N/A',
        ];

        $senderReplacements = [
            '[sender_email]' => $account->email ?? 'N/A',
            '[sender_first_name]' => $account->first_name ?? 'N/A',
            '[sender_last_name]' => $account->last_name ?? 'N/A',
            '[type]' => $account->type ?? 'N/A',
            '[status]' => $account->status ?? 'N/A',
            '[phone_number]' => $account->phone_number ?? 'N/A',
            '[designation]' => $account->designation ?? 'N/A',
            '[fax]' => $account->fax ?? 'N/A',
            '[unsubscribe]' => $account->unsubscribe ?? url('/unsubscribe/test'),
            '[postal_code]' => $account->postal_code ?? 'N/A',
            '[address]' => $account->address ?? 'N/A',
        ];

        $replacements = array_merge($subscriberReplacements, $senderReplacements);

        Log::info('Replacements applied for email', [
            'campaign_id' => $this->campaignId,
            'subscriber_id' => $subscriber->id,
            'from_email' => $this->fromEmail,
            'progress_id' => $this->progressId,
            'batch_size' => $this->batchSize,
            'replacements' => $replacements,
        ]);

        foreach ($replacements as $placeholder => $value) {
            $content = str_replace($placeholder, $value, $content);
        }

        $content = mb_convert_encoding($content, 'UTF-8', 'auto');
        $subject = mb_convert_encoding($this->subject, 'UTF-8', 'auto');

        $maxRetries = 3;
        $attempt = 0;
        $success = false;
        $errorMessage = null;
        $finalMessageId = $messageIdHeader;

        // Clean and process content for consistent rendering across all email providers
        $cleanContent = $this->cleanEmailContent($content);

        while ($attempt < $maxRetries && !$success) {
            try {
                if ($account->type === 'google') {
                    Log::info('Preparing Google API email send', [
                        'subscriber_email' => $subscriber->email,
                        'progress_id' => $this->progressId,
                        'batch_size' => $this->batchSize,
                        'message_id' => $messageIdHeader,
                        'attempt' => $attempt + 1,
                    ]);
                    $client = $this->getGoogleClient($account);
                    $gmail = new Google_Service_Gmail($client);
                    $message = $this->createGmailMessage($this->fromEmail, $subscriber->email, $subject, $cleanContent, $messageIdHeader);
                    $sentMessage = $gmail->users_messages->send('me', $message);
                    $gmailMessageId = $sentMessage->getId();

                    // Fetch the sent message to get the actual Message-ID
                    $sentMsgObj = $gmail->users_messages->get('me', $gmailMessageId, ['format' => 'full']);
                    $headers = $sentMsgObj->getPayload()->getHeaders();
                    foreach ($headers as $header) {
                        if (strtolower($header->getName()) === 'message-id') {
                            $finalMessageId = $header->getValue();
                            break;
                        }
                    }

                    Log::info('Gmail API email sent successfully', [
                        'campaign_id' => $this->campaignId,
                        'subscriber_id' => $subscriber->id,
                        'gmail_internal_id' => $gmailMessageId,
                        'message_id' => $finalMessageId,
                        'attempt' => $attempt + 1,
                    ]);
                } else {
                    Log::info('Preparing SMTP email send', [
                        'subscriber_email' => $subscriber->email,
                        'progress_id' => $this->progressId,
                        'batch_size' => $this->batchSize,
                        'message_id' => $messageIdHeader,
                        'attempt' => $attempt + 1,
                    ]);
                    $dsn = sprintf(
                        'smtp://%s:%s@%s:%s?encryption=%s',
                        urlencode($account->email),
                        urlencode($account->password),
                        $account->outgoing_host,
                        $account->outgoing_port,
                        $account->outgoing_encryption ?: 'tls'
                    );
                    $transport = Transport::fromDsn($dsn);
                    $mailer = new Mailer($transport);

                    $email = (new Email())
                        ->from($this->fromEmail)
                        ->to($subscriber->email)
                        ->subject($subject)
                        ->html($cleanContent);

                    $email->getHeaders()
                        ->addIdHeader('Message-ID', trim($messageIdHeader, '<>'))
                        ->addTextHeader('X-Campaign-ID', (string)$this->campaignId)
                        ->addTextHeader('X-Subscriber-ID', (string)$this->subscriberId);

                    Log::channel('campaign_debug')->debug('Email payload for campaign', [
                        'campaign_id' => $this->campaignId,
                        'subscriber_id' => $subscriber->id,
                        'from' => $this->fromEmail,
                        'to' => $subscriber->email,
                        'subject' => $subject,
                        'content_length' => strlen($cleanContent),
                        'headers' => $email->getHeaders()->toArray(),
                    ]);

                    $mailer->send($email);

                    Log::info('SMTP email sent successfully', [
                        'campaign_id' => $this->campaignId,
                        'subscriber_id' => $subscriber->id,
                        'message_id' => $messageIdHeader,
                        'attempt' => $attempt + 1,
                    ]);
                }

                $success = true;

                // Update email_campaign_logs with final message_id
                DB::connection('pluto')
                    ->table('email_campaign_logs')
                    ->where('campaign_id', $this->campaignId)
                    ->where('subscriber_id', $this->subscriberId)
                    ->where('progress_id', $this->progressId ?: DB::raw('progress_id'))
                    ->update(['message_id' => $finalMessageId]);
            } catch (\Exception $e) {
                $attempt++;
                $errorMessage = $e->getMessage();
                Log::warning('Attempt ' . $attempt . ' failed for subscriber', [
                    'campaign_id' => $this->campaignId,
                    'subscriber_id' => $subscriber->id,
                    'email' => $subscriber->email,
                    'progress_id' => $this->progressId,
                    'batch_size' => $this->batchSize,
                    'error' => $errorMessage,
                    'account_type' => $account->type,
                    'message_id' => $messageIdHeader,
                ]);

                if ($attempt < $maxRetries) {
                    sleep($attempt * 2);
                }
            }
        }

        if (!$success) {
            throw new \Exception('Failed to send email after ' . $maxRetries . ' attempts: ' . $errorMessage);
        }
    }

    protected function getGoogleClient($account)
    {
        Log::info('Entering getGoogleClient', [
            'email' => $account->email,
            'progress_id' => $this->progressId,
            'batch_size' => $this->batchSize,
            'access_token' => $account->access_token ? 'present' : 'null',
            'refresh_token' => $account->refresh_token ? 'present' : 'null',
        ]);

        $cacheKey = "google_access_token_{$account->email}";
        if (Cache::has($cacheKey)) {
            $client = new Google_Client();
            $client->setApplicationName('Email Scheduler');
            $client->setScopes([Google_Service_Gmail::GMAIL_SEND]);
            $client->setAccessToken(Cache::get($cacheKey));
            Log::info('Using cached access token for campaign Gmail client', ['email' => $account->email]);
            return $client;
        }

        $client = new Google_Client();
        $client->setApplicationName('Email Scheduler');
        $client->setScopes([Google_Service_Gmail::GMAIL_SEND]);

        $credentialsPath = config('services.google.credentials_file');
        Log::info('Google credentials path', [
            'path' => $credentialsPath,
            'exists' => file_exists($credentialsPath),
            'progress_id' => $this->progressId,
            'batch_size' => $this->batchSize,
        ]);
        if (!file_exists($credentialsPath)) {
            throw new \Exception('Google credentials file not found at: ' . $credentialsPath);
        }
        $client->setAuthConfig($credentialsPath);

        $client->setAccessToken($account->access_token);

        if ($client->isAccessTokenExpired()) {
            Log::info('Access token expired, attempting to refresh', [
                'email' => $account->email,
                'progress_id' => $this->progressId,
                'batch_size' => $this->batchSize,
            ]);
            $newToken = $client->fetchAccessTokenWithRefreshToken($account->refresh_token);
            Log::info('Token refresh response', [
                'newToken' => $newToken,
                'progress_id' => $this->progressId,
                'batch_size' => $this->batchSize,
            ]);

            if (empty($newToken) || isset($newToken['error'])) {
                throw new \Exception('Failed to refresh access token: ' . ($newToken['error_description'] ?? 'Unknown error'));
            }

            $currentToken = $client->getAccessToken();
            Log::info('Current access token', [
                'currentToken' => $currentToken,
                'progress_id' => $this->progressId,
                'batch_size' => $this->batchSize,
            ]);

            if (!isset($currentToken['access_token'])) {
                throw new \Exception('No access_token in refresh response: ' . json_encode($currentToken));
            }

            DB::connection('pluto')
                ->table('email_accounts')
                ->where('email', $account->email)
                ->update(['access_token' => $currentToken['access_token']]);
            if (isset($currentToken['expires_in'])) {
                Cache::put($cacheKey, $currentToken, now()->addSeconds(max(60, $currentToken['expires_in'] - 60)));
            }
            Log::info('Access token updated', [
                'email' => $account->email,
                'progress_id' => $this->progressId,
                'batch_size' => $this->batchSize,
                'new_access_token' => $currentToken['access_token'],
            ]);
        }

        return $client;
    }


    /**
     * Clean and standardize email content for consistent rendering across all providers
     */
    protected function cleanEmailContent($content)
    {
        // Decode HTML entities (&quot; -> ", &amp; -> &, etc.)
        $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Replace special characters with standard equivalents
        $content = str_replace([
            "\u{2018}", // Left single quotation mark
            "\u{2019}", // Right single quotation mark
            "\u{201C}", // Left double quotation mark
            "\u{201D}", // Right double quotation mark
            "\u{2013}", // En dash
            "\u{2014}", // Em dash
            "\u{00A0}"  // Non-breaking space
        ], [
            "'",
            "'",
            '"',
            '"',
            '-',
            '-',
            ' '
        ], $content);

        // Ensure UTF-8 encoding
        $content = mb_convert_encoding($content, 'UTF-8', 'auto');

        return $content;
    }

    protected function createGmailMessage($from, $to, $subject, $content, $messageIdHeader)
    {
        // Content is already cleaned by cleanEmailContent() method
        $content = str_replace(['’', '‘', '“', '”', '–', '—', ' '], ["'", "'", '"', '"', '-', '-', ' '], $content);

        $from = str_replace(['<', '>'], '', $from);
        $rawMessage = '';
        $boundary = uniqid();

        $rawMessage .= "From: {$from}\r\n";
        $rawMessage .= "To: {$to}\r\n";
        $rawMessage .= "Subject: =?utf-8?B?" . base64_encode($subject) . "?=\r\n";
        $rawMessage .= "Message-ID: {$messageIdHeader}\r\n";
        $rawMessage .= "MIME-Version: 1.0\r\n";
        $rawMessage .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
        $rawMessage .= "X-Campaign-ID: {$this->campaignId}\r\n";
        $rawMessage .= "X-Subscriber-ID: {$this->subscriberId}\r\n\r\n";
        $rawMessage .= "--{$boundary}\r\n";
        $rawMessage .= "Content-Type: text/html; charset=UTF-8\r\n";
        $rawMessage .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
        $rawMessage .= quoted_printable_encode($content) . "\r\n\r\n";
        $rawMessage .= "--{$boundary}--";

        $message = new Google_Service_Gmail_Message();
        $message->setRaw(str_replace(['+', '/'], ['-', '_'], base64_encode($rawMessage)));

        return $message;
    }

    protected function validateEmailAccount($account)
    {
        try {
            if (($account->status ?? 'active') !== 'active') {
                return false;
            }
            if ($account->type === 'manual') {
                if (empty($account->email) || empty($account->outgoing_host) || empty($account->outgoing_port)) {
                    Log::error('SMTP configuration incomplete', ['email' => $account->email]);
                    return false;
                }
                if (stripos($account->email, '@gmail.com') !== false) {
                    $expectedHost = 'smtp.gmail.com';
                    $expectedPorts = [587, 465];
                    if ($account->outgoing_host !== $expectedHost || !in_array((int)$account->outgoing_port, $expectedPorts)) {
                        Log::error('Invalid Gmail SMTP settings', [
                            'email' => $account->email,
                            'host' => $account->outgoing_host,
                            'port' => $account->outgoing_port,
                        ]);
                        return false;
                    }
                }
            } elseif ($account->type === 'google') {
                if (empty($account->access_token) || empty($account->refresh_token)) {
                    Log::error('Google OAuth configuration incomplete', ['email' => $account->email]);
                    return false;
                }
            }
            return true;
        } catch (\Exception $e) {
            Log::error('validateEmailAccount error', ['email' => $account->email, 'error' => $e->getMessage()]);
            return false;
        }
    }

    protected function retryModelQuery($callback, $maxRetries = 5)
    {
        $attempt = 0;
        while ($attempt < $maxRetries) {
            try {
                return $callback();
            } catch (\Exception $e) {
                $attempt++;
                $isConnectionError =
                    strpos($e->getMessage(), 'Connection refused') !== false ||
                    strpos($e->getMessage(), 'SQLSTATE[HY000] [2002]') !== false ||
                    strpos($e->getMessage(), 'SQLSTATE[HY000] [2003]') !== false ||
                    strpos($e->getMessage(), 'Connection timed out') !== false ||
                    strpos($e->getMessage(), 'No route to host') !== false ||
                    strpos($e->getMessage(), 'Network is unreachable') !== false;

                if ($isConnectionError) {
                    Log::warning('DB connection error on attempt ' . $attempt, ['error' => $e->getMessage()]);
                    if ($attempt >= $maxRetries) {
                        throw $e;
                    }
                    $delay = min(pow(2, $attempt) * 2, 30);
                    sleep($delay);
                    continue;
                }
                throw $e;
            }
        }
    }
}
