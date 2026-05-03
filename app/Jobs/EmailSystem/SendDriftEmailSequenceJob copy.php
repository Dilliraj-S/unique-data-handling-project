<?php

namespace App\Jobs\EmailSystem;

use App\Models\Central\EmailSystem\DriftSequence;
use App\Models\Central\EmailSystem\EmailAccount;
use App\Models\Central\EmailSystem\Subscriber;
use App\Models\Central\EmailSystem\DriftSequenceLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mime\Email;
use Google_Client;
use Google_Service_Gmail;
use Google_Service_Gmail_Message;

class SendDriftEmailSequenceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $sequenceId;
    protected $subscriberId;
    protected $emailAccountId;
    protected $batchSize;

    public $timeout = 300; // 5 minutes timeout to prevent hanging jobs

    public function __construct($sequenceId, $subscriberId, $emailAccountId, $batchSize = 1)
    {
        $this->sequenceId = $sequenceId;
        $this->subscriberId = $subscriberId;
        $this->emailAccountId = $emailAccountId;
        $this->batchSize = $batchSize;
        $this->onQueue('emails');
    }

    public function handle()
    {
        Log::info('Processing email job', [
            'sequence_id' => $this->sequenceId,
            'subscriber_id' => $this->subscriberId,
            'email_account_id' => $this->emailAccountId,
            'batch_size' => $this->batchSize,
        ]);

        $lockKey = "email_quota:{$this->emailAccountId}";
        $lock = Cache::lock($lockKey, 10);

        if (!$lock->get()) {
            Log::warning("Could not acquire lock for email quota check", [
                'email_account_id' => $this->emailAccountId,
            ]);
            $this->release(10); // Retry after 10 seconds
            return;
        }

        try {
            $sequence = DriftSequence::on('pluto')->findOrFail($this->sequenceId);
            $subscriber = Subscriber::on('pluto')->findOrFail($this->subscriberId);
            $emailAccount = EmailAccount::on('pluto')->findOrFail($this->emailAccountId);

            // Rolling 24-hour quota enforcement
            $sentCount = DriftSequenceLog::on('pluto')
                ->where('email_account_id', $emailAccount->id)
                ->where('sent_at', '>=', now()->subDay())
                ->count();
            $limit = $emailAccount->daily_send_limit;
            if ($sentCount >= $limit) {
                Log::warning("Daily send limit reached for {$emailAccount->email}", [
                    'email_account_id' => $emailAccount->id,
                    'limit' => $limit,
                    'sent_in_last_24h' => $sentCount,
                ]);
                DriftSequenceLog::on('pluto')->updateOrCreate(
                    [
                        'sequence_id' => $sequence->id,
                        'subscriber_id' => $subscriber->id,
                        'email_account_id' => $emailAccount->id,
                    ],
                    [
                        'set_id' => $sequence->set_id,
                        'status' => 'pending',
                        'error_message' => 'Queued for retry after daily send limit reached',
                        'updated_at' => now(),
                        'batch_size' => $this->batchSize,
                    ]
                );
                Log::info("Queueing retry for email after quota reset", [
                    'email_account_id' => $emailAccount->id,
                    'sequence_id' => $this->sequenceId,
                ]);
                SendDriftEmailSequenceJob::dispatch($this->sequenceId, $this->subscriberId, $this->emailAccountId, $this->batchSize)
                    ->delay(now()->addHours(24))
                    ->onQueue('emails');
                $this->checkSequenceCompletion($sequence);
                return;
            }

            if (!$this->validateEmailAccount($emailAccount)) {
                Log::error("Email account validation failed for {$emailAccount->email}", [
                    'email_account_id' => $emailAccount->id,
                    'sequence_id' => $this->sequenceId,
                    'subscriber_id' => $this->subscriberId,
                ]);
                DriftSequenceLog::on('pluto')->updateOrCreate(
                    [
                        'sequence_id' => $sequence->id,
                        'subscriber_id' => $subscriber->id,
                        'email_account_id' => $emailAccount->id,
                    ],
                    [
                        'set_id' => $sequence->set_id,
                        'status' => 'failed',
                        'error_message' => 'Invalid email account configuration',
                        'failed_at' => now(),
                        'updated_at' => now(),
                        'batch_size' => $this->batchSize,
                    ]
                );
                return;
            }

            $this->sendEmailToSubscriber($sequence, $subscriber, $emailAccount);
            $this->checkSequenceCompletion($sequence);
        } catch (\Exception $e) {
            Log::error('Error processing email job', [
                'sequence_id' => $this->sequenceId,
                'subscriber_id' => $this->subscriberId,
                'email_account_id' => $this->emailAccountId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            DriftSequenceLog::on('pluto')->updateOrCreate(
                [
                    'sequence_id' => $this->sequenceId,
                    'subscriber_id' => $this->subscriberId,
                    'email_account_id' => $this->emailAccountId,
                ],
                [
                    'set_id' => $sequence->set_id,
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                    'failed_at' => now(),
                    'updated_at' => now(),
                    'batch_size' => $this->batchSize,
                ]
            );
            $this->checkSequenceCompletion($sequence);
        } finally {
            $lock->release();
        }
    }

    protected function sendEmailToSubscriber(DriftSequence $sequence, Subscriber $subscriber, EmailAccount $emailAccount)
    {
        try {
            if (!$subscriber->id || !$subscriber->email) {
                throw new \Exception("Invalid subscriber data: ID or email missing for subscriber ID {$subscriber->id}");
            }

            $template = $sequence->template;
            if (!$template) {
                throw new \Exception("No template found for sequence {$sequence->id}");
            }

            $fromEmail = $subscriber->email_account_email ?? $emailAccount->email;
            $emailAccount = EmailAccount::on('pluto')->where('email', $fromEmail)->first();
            if (!$emailAccount) {
                throw new \Exception("Email account not found for email: {$fromEmail}");
            }

            $content = $this->replacePlaceholders($template->content, $subscriber, $emailAccount);
            $subject = $this->replacePlaceholders($sequence->subject, $subscriber, $emailAccount);

            $content = mb_convert_encoding($content, 'UTF-8', 'auto');
            $subject = mb_convert_encoding($subject, 'UTF-8', 'auto');

            $log = DriftSequenceLog::on('pluto')->firstOrCreate(
                [
                    'sequence_id' => $sequence->id,
                    'subscriber_id' => $subscriber->id,
                    'email_account_id' => $emailAccount->id,
                ],
                [
                    'set_id' => $sequence->set_id,
                    'status' => 'pending',
                    'batch_size' => $this->batchSize,
                    'created_at' => now(),
                    'updated_at' => now(),
                    'sent_at' => now(), // Ensure sent_at is set for quota enforcement
                ]
            );

            Log::info("Created/Updated DriftSequenceLog for sending", [
                'sequence_id' => $sequence->id,
                'subscriber_id' => $subscriber->id,
                'email_account_id' => $emailAccount->id,
                'log_id' => $log->id,
                'initial_message_id' => $log->message_id ?? 'null',
            ]);

            // Always generate a unique RFC822 Message-ID header for both Gmail API and SMTP
            $messageIdHeader = sprintf(
                '<%s>',
                uniqid('drift_smtp_') . '.' . time() . '@'
                    . (parse_url(config('app.url'), PHP_URL_HOST) ?: 'localhost')
            );

            $log->fill([
                'status' => 'sending',
                'message_id' => $messageIdHeader, // Store RFC822 Message-ID for reply matching
                'updated_at' => now(),
            ])->save();

            Log::info("Sending email for sequence {$sequence->id}", [
                'subscriber_id' => $subscriber->id,
                'email_account_id' => $emailAccount->id,
                'email' => $emailAccount->email,
                'scheduled_at' => $sequence->scheduled_at ?? 'N/A',
                'batch_size' => $this->batchSize,
                'message_id' => $messageIdHeader,
            ]);

            $maxRetries = 3;
            $attempt = 0;
            $success = false;
            $errorMessage = null;

            while ($attempt < $maxRetries && !$success) {
                try {
                    if ($emailAccount->type === 'google') {
                        Log::debug("Attempting to send email via Gmail API", [
                            'sequence_id' => $sequence->id,
                            'attempt' => $attempt + 1,
                            'email_account_id' => $emailAccount->id,
                        ]);

                        $client = $this->getGoogleClient($emailAccount);
                        $gmail = new \Google_Service_Gmail($client);
                        // Create the MIME message and insert the custom Message-ID header
                        $mime = $this->createGmailMessage(
                            $emailAccount->email,
                            $subscriber->email,
                            $subject,
                            $content,
                            $messageIdHeader // Pass the generated Message-ID
                        );

                        $sentMessage = $gmail->users_messages->send('me', $mime);
                        $gmailMessageId = $sentMessage->getId();

                        // Fetch the sent message to get the real Message-ID header assigned by Gmail
                        $sentMsgObj = $gmail->users_messages->get('me', $gmailMessageId, ['format' => 'full']);
                        $headers = $sentMsgObj->getPayload()->getHeaders();
                        $actualMessageId = null;
                        foreach ($headers as $header) {
                            if (strtolower($header->getName()) === 'message-id') {
                                $actualMessageId = $header->getValue();
                                break;
                            }
                        }
                        if ($actualMessageId) {
                            $messageIdHeader = $actualMessageId;
                        }

                        Log::info("Gmail API email sent successfully", [
                            'sequence_id' => $sequence->id,
                            'gmail_internal_id' => $gmailMessageId,
                            'actual_message_id' => $actualMessageId,
                            'attempt' => $attempt + 1,
                        ]);
                        $success = true;
                    } else {
                        Log::debug("Attempting to send email via SMTP", [
                            'sequence_id' => $sequence->id,
                            'attempt' => $attempt + 1,
                            'email_account_id' => $emailAccount->id,
                        ]);

                        $encryption = $emailAccount->outgoing_encryption ?? 'tls';
                        $port = $emailAccount->outgoing_port ?? 587;
                        $host = $emailAccount->outgoing_host;
                        $username = $emailAccount->email;

                        try {
                            $password = $emailAccount->password;
                        } catch (\Exception $e) {
                            throw new \Exception("Failed to decrypt password for {$emailAccount->email}: {$e->getMessage()}");
                        }

                        $dsn = sprintf(
                            'smtp://%s:%s@%s:%s?encryption=%s&verify_peer=1',
                            urlencode($username),
                            urlencode($password),
                            urlencode($host),
                            $port,
                            urlencode($encryption)
                        );

                        Log::debug("SMTP DSN configured for sequence {$sequence->id}", [
                            'dsn' => preg_replace('/:.+@/', ':****@', $dsn),
                            'email_account_id' => $emailAccount->id,
                            'host' => $host,
                            'port' => $port,
                            'encryption' => $encryption,
                        ]);

                        $transport = Transport::fromDsn($dsn);
                        $mailer = new Mailer($transport);

                        Log::info("Generated Message-ID for SMTP email", [
                            'sequence_id' => $sequence->id,
                            'message_id' => $messageIdHeader,
                            'attempt' => $attempt + 1,
                        ]);

                        $email = (new Email())
                            ->from($emailAccount->email)
                            ->to($subscriber->email)
                            ->subject($subject)
                            ->html($content);

                        $email->getHeaders()
                            ->addIdHeader('Message-ID', trim($messageIdHeader, '<>'))
                            ->addTextHeader('X-Drift-Sequence-ID', (string)$sequence->id)
                            ->addTextHeader('X-Drift-Subscriber-ID', (string)$subscriber->id);

                        Log::channel('drift_debug')->debug("Email payload for sequence {$sequence->id}", [
                            'from' => $emailAccount->email,
                            'to' => $subscriber->email,
                            'subject' => $subject,
                            'content_length' => strlen($content),
                            'headers' => $email->getHeaders()->toArray(),
                        ]);

                        $mailer->send($email);

                        Log::info("SMTP email sent successfully", [
                            'sequence_id' => $sequence->id,
                            'message_id' => $messageIdHeader,
                            'attempt' => $attempt + 1,
                        ]);

                        $success = true;
                    }

                    $log->fill([
                        'status' => 'sent',
                        'message_id' => $messageIdHeader,
                        'sent_at' => now(),
                        'updated_at' => now(),
                    ])->save();

                    Log::info("Updated DriftSequenceLog to sent status", [
                        'sequence_id' => $sequence->id,
                        'subscriber_id' => $subscriber->id,
                        'email_account_id' => $emailAccount->id,
                        'log_id' => $log->id,
                        'message_id' => $messageIdHeader,
                    ]);
                } catch (\Exception $e) {
                    $attempt++;
                    $errorMessage = $e->getMessage();
                    Log::warning("Attempt {$attempt} failed for sequence {$sequence->id}, subscriber {$subscriber->id}", [
                        'error' => $errorMessage,
                        'account_type' => $emailAccount->type,
                        'email_account_id' => $emailAccount->id,
                        'trace' => $e->getTraceAsString(),
                    ]);

                    if ($attempt < $maxRetries) {
                        sleep($attempt * 2);
                    }
                }
            }

            if (!$success) {
                throw new \Exception("Failed to send email after {$maxRetries} attempts: {$errorMessage}");
            }
        } catch (\Exception $e) {
            Log::error("Failed to send email to subscriber {$subscriber->id} for sequence {$sequence->id}", [
                'exception' => $e->getMessage(),
                'subscriber_id' => $subscriber->id,
                'sequence_id' => $sequence->id,
                'email_account_id' => $emailAccount->id,
                'email' => $emailAccount->email,
                'message_id' => $messageIdHeader ?? 'null',
                'trace' => $e->getTraceAsString(),
            ]);

            DB::connection('pluto')->transaction(function () use ($log, $sequence, $subscriber, $e, $messageIdHeader) {
                Log::debug("Updating drift_sequence_log to failed status", [
                    'sequence_id' => $sequence->id,
                    'subscriber_id' => $subscriber->id,
                    'log_id' => $log->id,
                ]);

                try {
                    $log->fill([
                        'status' => 'failed',
                        'error_message' => $e->getMessage(),
                        'message_id' => $messageIdHeader ?? $log->message_id,
                        'failed_at' => now(),
                        'updated_at' => now(),
                    ])->saveOrFail();
                } catch (\Exception $saveException) {
                    Log::error("Failed to update drift_sequence_log to failed status", [
                        'sequence_id' => $sequence->id,
                        'subscriber_id' => $subscriber->id,
                        'log_id' => $log->id,
                        'error' => $saveException->getMessage(),
                        'trace' => $saveException->getTraceAsString(),
                    ]);
                    throw $saveException;
                }

                $updatedLog = DriftSequenceLog::on('pluto')->findOrFail($log->id);
                Log::debug("Verified drift_sequence_log after failed update", [
                    'sequence_id' => $sequence->id,
                    'subscriber_id' => $subscriber->id,
                    'log_id' => $log->id,
                    'stored_message_id' => $updatedLog->message_id ?? 'null',
                ]);
            });

            throw $e;
        }
    }

    protected function replacePlaceholders(string $content, Subscriber $subscriber, EmailAccount $emailAccount)
    {
        try {
            $unsubscribeLink = Route::has('drift.unsubscribe')
                ? route('drift.unsubscribe', ['subscriber_id' => $subscriber->id, 'sequence_id' => $this->sequenceId])
                : config('drift.unsubscribe_fallback_url', '#unsubscribe');

            if (!Route::has('drift.unsubscribe')) {
                Log::warning("Route [drift.unsubscribe] not defined. Using fallback URL: {$unsubscribeLink}", [
                    'subscriber_id' => $subscriber->id,
                    'sequence_id' => $this->sequenceId,
                ]);
            }

            $placeholders = [
                '[first_name]' => $subscriber->first_name ?? '',
                '[last_name]' => $subscriber->last_name ?? '',
                '[email]' => $subscriber->email,
                '[unsubscribe_link]' => $unsubscribeLink,
                '[sender_email]' => $emailAccount->email,
                '[sender_first_name]' => $emailAccount->first_name ?? '',
                '[sender_last_name]' => $emailAccount->last_name ?? '',
            ];

            return str_replace(
                array_keys($placeholders),
                array_values($placeholders),
                $content
            );
        } catch (\Exception $e) {
            Log::error("Failed to replace placeholders for subscriber {$subscriber->id} in sequence {$this->sequenceId}: {$e->getMessage()}", [
                'exception' => $e->getMessage(),
                'subscriber_id' => $subscriber->id,
                'sequence_id' => $this->sequenceId,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    protected function getGoogleClient(EmailAccount $account)
    {
        $cacheKey = "google_access_token_{$account->email}";
        if (Cache::has($cacheKey)) {
            $client = new Google_Client();
            $client->setApplicationName('Drift Email Sequence');
            $client->setScopes([Google_Service_Gmail::GMAIL_SEND]);
            $client->setAccessToken(Cache::get($cacheKey));
            Log::info("Using cached access token for Drift", ['email' => $account->email]);
            return $client;
        }

        Log::info("Entering getGoogleClient for Drift sequence", [
            'email' => $account->email,
            'access_token' => $account->access_token ? 'present' : 'null',
            'refresh_token' => $account->refresh_token ? 'present' : 'null',
            'batch_size' => $this->batchSize,
        ]);

        $client = new Google_Client();
        $client->setApplicationName('Drift Email Sequence');
        $client->setScopes([Google_Service_Gmail::GMAIL_SEND]);

        $credentialsPath = config('services.google.credentials_file');
        Log::info("Google credentials path for Drift", [
            'path' => $credentialsPath,
            'exists' => file_exists($credentialsPath),
        ]);
        if (!file_exists($credentialsPath)) {
            throw new \Exception("Google credentials file not found at: {$credentialsPath}");
        }
        $client->setAuthConfig($credentialsPath);

        $client->setAccessToken($account->access_token);

        if ($client->isAccessTokenExpired()) {
            Log::info("Access token expired, attempting to refresh for Drift", ['email' => $account->email]);
            $newToken = $client->fetchAccessTokenWithRefreshToken($account->refresh_token);
            Log::info("Token refresh response for Drift", ['newToken' => $newToken]);

            if (empty($newToken) || isset($newToken['error'])) {
                throw new \Exception("Failed to refresh access token: " . ($newToken['error_description'] ?? 'Unknown error'));
            }

            $currentToken = $client->getAccessToken();
            Log::info("Current access token for Drift", ['currentToken' => $currentToken]);

            if (!isset($currentToken['access_token'])) {
                throw new \Exception("No access_token in refresh response: " . json_encode($currentToken));
            }

            EmailAccount::on('pluto')
                ->where('email', $account->email)
                ->update(['access_token' => $currentToken['access_token']]);
            Log::info("Access token updated for Drift", [
                'email' => $account->email,
                'new_access_token' => $currentToken['access_token'],
            ]);

            Cache::put($cacheKey, $currentToken, now()->addSeconds($currentToken['expires_in'] - 60));
        }

        return $client;
    }

    protected function createGmailMessage(string $from, string $to, string $subject, string $content, string $messageIdHeader)
    {
        $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $content = str_replace(['’', '‘', '“', '”', '–', '—', ' '], ["'", "'", '"', '"', '-', '-', ' '], $content);

        $from = str_replace(['<', '>'], '', $from);
        $headers = [
            "From: {$from}",
            "To: {$to}",
            "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
            "Message-ID: {$messageIdHeader}", // Ensure this is set for reply matching
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "Content-Transfer-Encoding: base64",
            "X-Drift-Sequence-ID: {$this->sequenceId}",
            "X-Drift-Subscriber-ID: {$this->subscriberId}",
            "",
            chunk_split(base64_encode($content)),
        ];

        $rawMessage = implode("\r\n", $headers);
        $rawBase64UrlSafe = strtr(base64_encode($rawMessage), ['+' => '-', '/' => '_', '=' => '']);

        $message = new \Google_Service_Gmail_Message();
        $message->setRaw($rawBase64UrlSafe);

        return $message;
    }

    protected function validateEmailAccount(EmailAccount $emailAccount)
    {
        try {
            if ($emailAccount->daily_send_limit === null || $emailAccount->daily_send_limit <= 0) {
                Log::error("Invalid daily_send_limit for {$emailAccount->email}", [
                    'email_account_id' => $emailAccount->id,
                    'daily_send_limit' => $emailAccount->daily_send_limit,
                    'sequence_id' => $this->sequenceId,
                ]);
                return false;
            }

            if ($emailAccount->type === 'manual') {
                if (empty($emailAccount->email) || empty($emailAccount->outgoing_host) || empty($emailAccount->outgoing_port)) {
                    Log::error("Incomplete SMTP configuration for email account {$emailAccount->email}", [
                        'email_account_id' => $emailAccount->id,
                        'sequence_id' => $this->sequenceId,
                    ]);
                    return false;
                }

                $rawPassword = $emailAccount->getRawOriginal('password');
                if (empty($rawPassword)) {
                    Log::error("Password field is empty for email account {$emailAccount->email}", [
                        'email_account_id' => $emailAccount->id,
                        'sequence_id' => $this->sequenceId,
                    ]);
                    return false;
                }

                try {
                    $decryptedPassword = $emailAccount->password;
                    if (empty($decryptedPassword)) {
                        Log::error("Decrypted password is empty for email account {$emailAccount->email}", [
                            'email_account_id' => $emailAccount->id,
                            'sequence_id' => $this->sequenceId,
                        ]);
                        return false;
                    }
                } catch (\Exception $e) {
                    Log::error("Failed to decrypt password for email account {$emailAccount->email}: {$e->getMessage()}", [
                        'email_account_id' => $emailAccount->id,
                        'sequence_id' => $this->sequenceId,
                        'raw_password' => substr($rawPassword, 0, 10) . '...',
                        'trace' => $e->getTraceAsString(),
                    ]);
                    return false;
                }

                if (stripos($emailAccount->email, '@gmail.com') !== false) {
                    $expectedHost = 'smtp.gmail.com';
                    $expectedPorts = [587, 465];
                    $expectedEncryption = $emailAccount->outgoing_port == 465 ? 'ssl' : 'tls';

                    if (
                        $emailAccount->outgoing_host !== $expectedHost ||
                        !in_array($emailAccount->outgoing_port, $expectedPorts) ||
                        ($emailAccount->outgoing_encryption && $emailAccount->outgoing_encryption !== $expectedEncryption)
                    ) {
                        Log::error("Invalid Gmail SMTP settings for {$emailAccount->email}", [
                            'email_account_id' => $emailAccount->id,
                            'outgoing_host' => $emailAccount->outgoing_host,
                            'outgoing_port' => $emailAccount->outgoing_port,
                            'outgoing_encryption' => $emailAccount->outgoing_encryption,
                            'expected_host' => $expectedHost,
                            'expected_ports' => $expectedPorts,
                            'expected_encryption' => $expectedEncryption,
                        ]);
                        return false;
                    }

                    // Test SMTP connection
                    try {
                        $dsn = sprintf(
                            'smtp://%s:%s@%s:%s?encryption=%s&verify_peer=1',
                            urlencode($emailAccount->email),
                            urlencode($emailAccount->password),
                            urlencode($emailAccount->outgoing_host),
                            $emailAccount->outgoing_port,
                            urlencode($emailAccount->outgoing_encryption ?? 'tls')
                        );
                        $transport = Transport::fromDsn($dsn);
                        $transport->start(); // Initialize SMTP connection
                        $transport->stop(); // Close connection immediately
                        Log::debug("SMTP connection test successful for {$emailAccount->email}", [
                            'email_account_id' => $emailAccount->id,
                            'sequence_id' => $this->sequenceId,
                        ]);
                    } catch (\Exception $e) {
                        Log::error("SMTP connection test failed for {$emailAccount->email}: {$e->getMessage()}", [
                            'email_account_id' => $emailAccount->id,
                            'sequence_id' => $this->sequenceId,
                            'trace' => $e->getTraceAsString(),
                        ]);
                        return false;
                    }
                }
            } elseif ($emailAccount->type === 'google') {
                if (empty($emailAccount->access_token) || empty($emailAccount->refresh_token)) {
                    Log::error("Incomplete Google OAuth configuration for email account {$emailAccount->email}", [
                        'email_account_id' => $emailAccount->id,
                        'sequence_id' => $this->sequenceId,
                    ]);
                    return false;
                }
            }

            return $emailAccount->status === 'active';
        } catch (\Exception $e) {
            Log::error("Failed to validate email account {$emailAccount->email}: {$e->getMessage()}", [
                'email_account_id' => $emailAccount->id,
                'sequence_id' => $this->sequenceId,
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    protected function checkSequenceCompletion(DriftSequence $sequence)
    {
        $lockKey = 'drift:completion:sequence:' . $this->sequenceId;
        $lock = Cache::lock($lockKey, 10);

        if (!$lock->get()) {
            Log::info('Another job is checking sequence completion, skipping', [
                'sequence_id' => $this->sequenceId,
            ]);
            return;
        }

        try {
            // Clean up stale logs (increased to 60 minutes for more reliable handling)
            $staleThreshold = now()->subMinutes(60);
            DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->whereIn('status', ['pending', 'sending'])
                ->where('updated_at', '<', $staleThreshold)
                ->update([
                    'status' => 'failed',
                    'error_message' => 'Stale job: timed out after 60 minutes',
                    'failed_at' => now(),
                    'updated_at' => now(),
                ]);

            // Get assigned subscribers from manual_assignments or batch_size
            $assignedSubscribers = json_decode($sequence->manual_assignments, true);
            $audienceSubscribers = Subscriber::on('pluto')
                ->where('audience_id', $sequence->audience_id)
                ->orderBy('id')
                ->get(['id', 'email']);

            if (is_array($assignedSubscribers) && !empty($assignedSubscribers)) {
                $assignedCount = array_sum(array_values($assignedSubscribers));
                $subscriberIds = $audienceSubscribers->take($assignedCount)->pluck('id')->toArray();
                $subscriberEmails = $audienceSubscribers->take($assignedCount)->pluck('email')->toArray();
            } elseif (!empty($sequence->batch_size) && is_numeric($sequence->batch_size)) {
                $assignedCount = (int) $sequence->batch_size;
                $subscriberIds = $audienceSubscribers->take($assignedCount)->pluck('id')->toArray();
                $subscriberEmails = $audienceSubscribers->take($assignedCount)->pluck('email')->toArray();
            } else {
                $assignedCount = $audienceSubscribers->count();
                $subscriberIds = $audienceSubscribers->pluck('id')->toArray();
                $subscriberEmails = $audienceSubscribers->pluck('email')->toArray();
            }

            // Get actual subscriber IDs from DriftSequenceLog to avoid mismatches
            $loggedSubscriberIds = DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->pluck('subscriber_id')
                ->toArray();
            $effectiveSubscriberIds = array_intersect($subscriberIds, $loggedSubscriberIds);

            // Log any discrepancies
            $missingSubscribers = array_diff($subscriberIds, $loggedSubscriberIds);
            if (!empty($missingSubscribers)) {
                Log::warning('Subscribers expected but missing in DriftSequenceLog', [
                    'sequence_id' => $this->sequenceId,
                    'missing_subscriber_ids' => $missingSubscribers,
                    'assigned_count' => $assignedCount,
                    'logged_count' => count($loggedSubscriberIds),
                ]);
            }

            // Count pending/sending logs only for subscribers with logs
            $pendingCount = DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->whereIn('subscriber_id', $effectiveSubscriberIds)
                ->whereIn('status', ['pending', 'sending'])
                ->count();
            $sentCount = DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->whereIn('subscriber_id', $effectiveSubscriberIds)
                ->where('status', 'sent')
                ->count();
            $failedCount = DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->whereIn('subscriber_id', $effectiveSubscriberIds)
                ->where('status', 'failed')
                ->count();

            Log::info('Sequence log status counts', [
                'sequence_id' => $this->sequenceId,
                'pending_or_sending' => $pendingCount,
                'sent' => $sentCount,
                'failed' => $failedCount,
                'effective_subscribers' => count($effectiveSubscriberIds),
            ]);

            if ($pendingCount > 0) {
                $pendingLogs = DriftSequenceLog::on('pluto')
                    ->where('sequence_id', $this->sequenceId)
                    ->whereIn('subscriber_id', $effectiveSubscriberIds)
                    ->whereIn('status', ['pending', 'sending'])
                    ->pluck('subscriber_id')
                    ->toArray();
                Log::warning('Pending logs blocking completion', [
                    'sequence_id' => $this->sequenceId,
                    'pending_subscriber_ids' => $pendingLogs,
                ]);
                return;
            }

            Log::info('All emails processed for sequence, marking as completed', [
                'sequence_id' => $this->sequenceId,
                'sent' => $sentCount,
                'failed' => $failedCount,
                'effective_subscribers' => count($effectiveSubscriberIds),
            ]);

            // Use Eloquent for status update
            $sequence->update([
                'status' => 'completed',
                'updated_at' => now(),
            ]);

            // Check for next sequence
            $nextSequence = DriftSequence::on('pluto')
                ->where('set_id', $sequence->set_id)
                ->where('id', '>', $sequence->id)
                ->orderBy('id')
                ->first();

            if (!$nextSequence) {
                Log::info('No next sequence found in set', [
                    'sequence_id' => $this->sequenceId,
                    'set_id' => $sequence->set_id,
                ]);
                return;
            }

            $delayInSeconds = max($this->calculateDelaySeconds($sequence), 60);
            Log::info('Scheduling next sequence and filters update', [
                'sequence_id' => $this->sequenceId,
                'next_sequence_id' => $nextSequence->id,
                'delay_seconds' => $delayInSeconds,
            ]);

            // Schedule periodic filters updates
            $interval = 30;
            $steps = max(1, ceil($delayInSeconds / $interval));
            for ($i = 0; $i < $steps; $i++) {
                Log::info('Dispatching UpdateSequenceFiltersJob', [
                    'sequence_id' => $this->sequenceId,
                    'step' => $i + 1,
                    'delay_seconds' => $i * $interval,
                ]);
                UpdateSequenceFiltersJob::dispatch($this->sequenceId, $sequence->set_id)
                    ->delay($i * $interval)
                    ->onQueue('filters');
            }

            // Dispatch next sequence
            Log::info('Dispatching DispatchNextDriftSequenceJob', [
                'sequence_id' => $this->sequenceId,
                'delay_seconds' => $delayInSeconds,
            ]);
            DispatchNextDriftSequenceJob::dispatch($this->sequenceId)
                ->delay($delayInSeconds)
                ->onQueue('emails');
        } catch (\Exception $e) {
            Log::error('Error in checkSequenceCompletion', [
                'sequence_id' => $this->sequenceId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        } finally {
            $lock->release();
        }
    }

    protected function calculateDelaySeconds(DriftSequence $sequence)
    {
        $waitTime = $sequence->wait_time ?? 0;
        $waitUnit = $sequence->wait_unit ?? 'minutes';

        switch ($waitUnit) {
            case 'seconds':
                return $waitTime;
            case 'hours':
                return $waitTime * 3600;
            case 'days':
                return $waitTime * 86400;
            case 'minutes':
            default:
                return $waitTime * 60;
        }
    }
}
