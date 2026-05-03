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

    public $timeout = 600; // 10 minutes timeout for large batches
    public $tries = 3; // Reduced from 5 to 3 to prevent excessive retries
    public $maxExceptions = 2; // Reduced from 3 to 2
    public $backoff = [30, 60, 120]; // Simplified backoff strategy

    public function __construct($sequenceId, $subscriberId, $emailAccountId, $batchSize = 1)
    {
        $this->sequenceId = $sequenceId;
        $this->subscriberId = $subscriberId;
        $this->emailAccountId = $emailAccountId;
        $this->batchSize = $batchSize;
        
     
        
        // Dynamic timeout and retry configuration based on batch size
        if ($batchSize >= 2000) {
            $this->timeout = 900; // 15 minutes for large batches
            $this->tries = 2; // Fewer retries for large batches
            $this->maxExceptions = 1;
        } elseif ($batchSize >= 1000) {
            $this->timeout = 600; // 10 minutes for medium batches
            $this->tries = 3;
            $this->maxExceptions = 2;
        } elseif ($batchSize >= 500) {
            $this->timeout = 300; // 5 minutes for small batches
            $this->tries = 3;
            $this->maxExceptions = 2;
        } else {
            $this->timeout = 180; // 3 minutes for individual emails
            $this->tries = 3;
            $this->maxExceptions = 2;
        }
        
        // Dynamic backoff based on batch size
        if ($batchSize >= 1000) {
            $this->backoff = [60, 120, 300]; // Longer delays for large batches
        } else {
            $this->backoff = [30, 60, 120]; // Standard delays for smaller batches
        }
    }

    public function handle()
    {
        Log::info('Processing email job', [
            'sequence_id' => $this->sequenceId,
            'subscriber_id' => $this->subscriberId,
            'email_account_id' => $this->emailAccountId,
            'batch_size' => $this->batchSize,
        ]);

        // No sender lock needed: each sender has a dedicated queue and worker

        // Add database connection retry logic
        $maxDbRetries = 3;
        $dbRetryCount = 0;
        
        while ($dbRetryCount < $maxDbRetries) {
            try {
                // Test database connection
                DB::connection('pluto')->getPdo();
                break;
            } catch (\Exception $e) {
                $dbRetryCount++;
                Log::warning("Database connection attempt {$dbRetryCount} failed", [
                    'error' => $e->getMessage(),
                    'sequence_id' => $this->sequenceId,
                ]);
                
                if ($dbRetryCount >= $maxDbRetries) {
                    Log::error("Database connection failed after {$maxDbRetries} attempts", [
                        'sequence_id' => $this->sequenceId,
                        'error' => $e->getMessage(),
                    ]);
                    $this->release(30); // Retry in 30 seconds
                    return;
                }
                
                sleep(2); // Wait 2 seconds before retry
            }
        }

        $lockKey = "email_quota:{$this->emailAccountId}";
        $lock = Cache::lock($lockKey, 10); // Increased lock time to 10 seconds

        if (!$lock->get()) {
            Log::warning("Could not acquire lock for email quota check", [
                'email_account_id' => $this->emailAccountId,
                'attempt' => $this->attempts(),
            ]);
            // Use exponential backoff based on attempt number
            $delay = min(pow(2, $this->attempts()) * 10, 120); // Max 2 minutes delay
            $this->release($delay);
            return;
        }

        $sequence = null;
        $subscriber = null;
        $emailAccount = null;

        try {
            // Add connection retry for model queries
            $sequence = $this->retryModelQuery(function() {
                return DriftSequence::on('pluto')->findOrFail($this->sequenceId);
            });
            
            $subscriber = $this->retryModelQuery(function() {
                return Subscriber::on('pluto')->findOrFail($this->subscriberId);
            });
            
            $emailAccount = $this->retryModelQuery(function() {
                return EmailAccount::on('pluto')->findOrFail($this->emailAccountId);
            });

            // Rolling 24-hour quota enforcement - only count actually sent emails
            $sentCount = $this->retryModelQuery(function() use ($emailAccount) {
                return DriftSequenceLog::on('pluto')
                ->where('email_account_id', $emailAccount->id)
                ->where('status', 'sent')
                ->where('sent_at', '>=', now()->subDay())
                ->count();
            });
            
            $limit = $emailAccount->daily_send_limit ?? 100; // Default limit if not set
            if ($sentCount >= $limit) {
                Log::warning("Daily send limit reached for {$emailAccount->email}", [
                    'email_account_id' => $emailAccount->id,
                    'limit' => $limit,
                    'sent_in_last_24h' => $sentCount,
                ]);
                
                $this->retryModelQuery(function() use ($sequence, $subscriber, $emailAccount) {
                    return DriftSequenceLog::on('pluto')->updateOrCreate(
                    [
                        'sequence_id' => $sequence->id,
                        'subscriber_id' => $subscriber->id,
                        'email_account_id' => $emailAccount->id,
                    ],
                    [
                        'set_id' => $sequence->set_id,
                        'template_id' => $sequence->template_id,
                        'status' => 'pending',
                        'error_message' => 'Queued for retry after daily send limit reached',
                        'updated_at' => now(),
                        'batch_size' => $this->batchSize,
                    ]
                );
                });
                
                Log::info("Queueing retry for email after quota reset", [
                    'email_account_id' => $emailAccount->id,
                    'sequence_id' => $this->sequenceId,
                ]);
                // SendDriftEmailSequenceJob::dispatch($this->sequenceId, $this->subscriberId, $this->emailAccountId, $this->batchSize)
                //     ->delay(now()->addHours(24))
                //     ->onQueue($queueName);
                $this->checkSequenceCompletion($sequence);
                return;
            }

            if (!$this->validateEmailAccount($emailAccount)) {
                Log::error("Email account validation failed for {$emailAccount->email}", [
                    'email_account_id' => $emailAccount->id,
                    'sequence_id' => $this->sequenceId,
                    'subscriber_id' => $this->subscriberId,
                ]);
                
                $this->retryModelQuery(function() use ($sequence, $subscriber, $emailAccount) {
                    return DriftSequenceLog::on('pluto')->updateOrCreate(
                    [
                        'sequence_id' => $sequence->id,
                        'subscriber_id' => $subscriber->id,
                        'email_account_id' => $emailAccount->id,
                    ],
                    [
                        'set_id' => $sequence->set_id,
                        'template_id' => $sequence->template_id,
                        'status' => 'failed',
                        'error_message' => 'Invalid email account configuration',
                        'failed_at' => now(),
                        'updated_at' => now(),
                        'batch_size' => $this->batchSize,
                    ]
                );
                });
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

            // Only try to create log if we have the sequence data
            if ($sequence) {
                try {
                    $this->retryModelQuery(function() use ($sequence, $e) {
                        return DriftSequenceLog::on('pluto')->updateOrCreate(
                    [
                        'sequence_id' => $this->sequenceId,
                        'subscriber_id' => $this->subscriberId,
                        'email_account_id' => $this->emailAccountId,
                    ],
                    [
                        'set_id' => $sequence->set_id,
                        'template_id' => $sequence->template_id,
                        'status' => 'failed',
                        'error_message' => $e->getMessage(),
                        'failed_at' => now(),
                        'updated_at' => now(),
                        'batch_size' => $this->batchSize,
                    ]
                );
                    });
                $this->checkSequenceCompletion($sequence);
                } catch (\Exception $logException) {
                    Log::error('Failed to create log entry', [
                        'sequence_id' => $this->sequenceId,
                        'error' => $logException->getMessage(),
                    ]);
                }
            } else {
                Log::error('Cannot create log entry - sequence not found', [
                    'sequence_id' => $this->sequenceId,
                    'subscriber_id' => $this->subscriberId,
                    'email_account_id' => $this->emailAccountId,
                ]);
            }
        } finally {
            $lock->release();
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception)
    {
        Log::error('SendDriftEmailSequenceJob failed permanently', [
            'sequence_id' => $this->sequenceId,
            'subscriber_id' => $this->subscriberId,
            'email_account_id' => $this->emailAccountId,
            'attempts' => $this->attempts(),
            'exception' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);

        // Mark the sequence log as failed
        try {
            DriftSequenceLog::on('pluto')->updateOrCreate(
                [
                    'sequence_id' => $this->sequenceId,
                    'subscriber_id' => $this->subscriberId,
                    'email_account_id' => $this->emailAccountId,
                ],
                [
                    'status' => 'failed',
                    'error_message' => 'Job failed permanently after ' . $this->attempts() . ' attempts: ' . $exception->getMessage(),
                    'failed_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Check if we need to update sequence completion
            $sequence = DriftSequence::on('pluto')->find($this->sequenceId);
            if ($sequence) {
                $this->checkSequenceCompletion($sequence);
            }
        } catch (\Exception $e) {
            Log::error('Failed to update sequence log in failed job handler', [
                'sequence_id' => $this->sequenceId,
                'subscriber_id' => $this->subscriberId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    protected function sendEmailToSubscriber(DriftSequence $sequence, Subscriber $subscriber, EmailAccount $emailAccount)
    {
        try {
            // Memory management - clear any cached data
            if (function_exists('gc_collect_cycles')) {
                gc_collect_cycles();
            }
            
            if (!$subscriber->id || !$subscriber->email) {
                throw new \Exception("Invalid subscriber data: ID or email missing for subscriber ID {$subscriber->id}");
            }

            $template = $sequence->template;
            if (!$template) {
                throw new \Exception("No template found for sequence {$sequence->id}");
            }

            $fromEmail = $subscriber->email_account_email ?? $emailAccount->email;
            $emailAccount = $this->retryModelQuery(function() use ($fromEmail) {
                return EmailAccount::on('pluto')->where('email', $fromEmail)->first();
            });
            
            if (!$emailAccount) {
                throw new \Exception("Email account not found for email: {$fromEmail}");
            }

            $content = $this->replacePlaceholders($template->content, $subscriber, $emailAccount);
            $subject = $this->replacePlaceholders($sequence->subject, $subscriber, $emailAccount);

            $content = mb_convert_encoding($content, 'UTF-8', 'auto');
            $subject = mb_convert_encoding($subject, 'UTF-8', 'auto');

            $log = $this->retryModelQuery(function() use ($sequence, $subscriber, $emailAccount) {
                return DriftSequenceLog::on('pluto')->firstOrCreate(
                [
                    'sequence_id' => $sequence->id,
                    'subscriber_id' => $subscriber->id,
                    'email_account_id' => $emailAccount->id,
                ],
                [
                    'set_id' => $sequence->set_id,
                    'template_id' => $sequence->template_id,
                    'status' => 'pending',
                    'batch_size' => $this->batchSize,
                    'created_at' => now(),
                    'updated_at' => now(),
                    'sent_at' => now(), // Ensure sent_at is set for quota enforcement
                ]
            );
            });

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

            $this->retryModelQuery(function() use ($log, $messageIdHeader) {
                return $log->fill([
                'status' => 'sending',
                'message_id' => $messageIdHeader, // Store RFC822 Message-ID for reply matching
                'updated_at' => now(),
            ])->save();
            });

            Log::info("Sending email for sequence {$sequence->id}", [
                'subscriber_id' => $subscriber->id,
                'email_account_id' => $emailAccount->id,
                'email' => $emailAccount->email,
                'scheduled_at' => $sequence->scheduled_at ?? 'N/A',
                'batch_size' => $this->batchSize,
                'message_id' => $messageIdHeader,
            ]);

            $maxRetries = 2; // Reduced from 3 to 2
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

                        Log::debug("Email payload for sequence {$sequence->id}", [
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

                    $this->retryModelQuery(function() use ($log, $messageIdHeader) {
                        return $log->fill([
                        'status' => 'sent',
                        'message_id' => $messageIdHeader,
                        'sent_at' => now(),
                        'updated_at' => now(),
                    ])->save();
                    });

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
                        sleep($attempt * 3); // Increased delay between retries
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

            $this->retryModelQuery(function() use ($log, $sequence, $subscriber, $e, $messageIdHeader) {
                Log::debug("Updating drift_sequence_log to failed status", [
                    'sequence_id' => $sequence->id,
                    'subscriber_id' => $subscriber->id,
                    'log_id' => $log->id,
                ]);

                try {
                    return $log->fill([
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
            });

            throw $e;
        }
    }

    /**
     * Process multiple emails in a single job for better efficiency
     */
    protected function processBatchEmails(DriftSequence $sequence, $subscribers, EmailAccount $emailAccount)
    {
        $successCount = 0;
        $failedCount = 0;
        $startTime = microtime(true);

        Log::info("Starting batch email processing", [
                    'sequence_id' => $sequence->id,
            'subscriber_count' => count($subscribers),
            'email_account_id' => $emailAccount->id,
            'batch_size' => $this->batchSize,
        ]);

        foreach ($subscribers as $subscriber) {
            try {
                $this->sendEmailToSubscriber($sequence, $subscriber, $emailAccount);
                $successCount++;
                
                // Add small delay between emails to avoid rate limiting
                if ($emailAccount->type === 'google') {
                    usleep(100000); // 0.1 second delay for Gmail API
                } else {
                    usleep(50000); // 0.05 second delay for SMTP
                }
                
            } catch (\Exception $e) {
                $failedCount++;
                Log::error("Failed to send email in batch", [
                    'subscriber_id' => $subscriber->id,
                    'sequence_id' => $sequence->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $endTime = microtime(true);
        $processingTime = $endTime - $startTime;

        Log::info("Batch email processing completed", [
            'sequence_id' => $sequence->id,
            'success_count' => $successCount,
            'failed_count' => $failedCount,
            'processing_time_seconds' => round($processingTime, 2),
            'emails_per_second' => round($successCount / $processingTime, 2),
        ]);

        return [
            'success_count' => $successCount,
            'failed_count' => $failedCount,
            'processing_time' => $processingTime,
        ];
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
        $lock = Cache::lock($lockKey, 15); // Increased lock time

        if (!$lock->get()) {
            Log::info('Another job is checking sequence completion, skipping', [
                'sequence_id' => $this->sequenceId,
            ]);
            return;
        }

        try {
            // Clean up stale logs (increased to 60 minutes for more reliable handling)
            $staleThreshold = now()->subMinutes(60);
            $this->retryModelQuery(function() use ($staleThreshold) {
                return DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->whereIn('status', ['pending', 'sending'])
                ->where('updated_at', '<', $staleThreshold)
                ->update([
                    'status' => 'failed',
                    'error_message' => 'Stale job: timed out after 60 minutes',
                    'failed_at' => now(),
                    'updated_at' => now(),
                ]);
            });

            // Get assigned subscribers from manual_assignments or batch_size
            $assignedSubscribers = json_decode($sequence->manual_assignments, true);
            $audienceSubscribers = $this->retryModelQuery(function() use ($sequence) {
                return Subscriber::on('pluto')
                ->where('audience_id', $sequence->audience_id)
                ->orderBy('id')
                ->get(['id', 'email']);
            });

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
            $loggedSubscriberIds = $this->retryModelQuery(function() {
                return DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->pluck('subscriber_id')
                ->toArray();
            });
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
            $pendingCount = $this->retryModelQuery(function() use ($effectiveSubscriberIds) {
                return DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->whereIn('subscriber_id', $effectiveSubscriberIds)
                ->whereIn('status', ['pending', 'sending'])
                ->count();
            });
            
            $sentCount = $this->retryModelQuery(function() use ($effectiveSubscriberIds) {
                return DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->whereIn('subscriber_id', $effectiveSubscriberIds)
                ->where('status', 'sent')
                ->count();
            });
            
            $failedCount = $this->retryModelQuery(function() use ($effectiveSubscriberIds) {
                return DriftSequenceLog::on('pluto')
                ->where('sequence_id', $this->sequenceId)
                ->whereIn('subscriber_id', $effectiveSubscriberIds)
                ->where('status', 'failed')
                ->count();
            });

            Log::info('Sequence log status counts', [
                'sequence_id' => $this->sequenceId,
                'pending_or_sending' => $pendingCount,
                'sent' => $sentCount,
                'failed' => $failedCount,
                'effective_subscribers' => count($effectiveSubscriberIds),
            ]);

            if ($pendingCount > 0) {
                $pendingLogs = $this->retryModelQuery(function() use ($effectiveSubscriberIds) {
                    return DriftSequenceLog::on('pluto')
                    ->where('sequence_id', $this->sequenceId)
                    ->whereIn('subscriber_id', $effectiveSubscriberIds)
                    ->whereIn('status', ['pending', 'sending'])
                    ->pluck('subscriber_id')
                    ->toArray();
                });
                
                // Only log first 100 pending IDs to avoid log overflow
                $pendingLogsToShow = array_slice($pendingLogs, 0, 100);
                Log::warning('Pending logs blocking completion', [
                    'sequence_id' => $this->sequenceId,
                    'pending_subscriber_ids' => $pendingLogsToShow,
                    'total_pending' => count($pendingLogs),
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
            $this->retryModelQuery(function() use ($sequence) {
                return $sequence->update([
                'status' => 'completed',
                'updated_at' => now(),
            ]);
            });

            // Check for next sequence
            $nextSequence = $this->retryModelQuery(function() use ($sequence) {
                return DriftSequence::on('pluto')
                ->where('set_id', $sequence->set_id)
                ->where('id', '>', $sequence->id)
                ->orderBy('id')
                ->first();
            });

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

    /**
     * Retry model queries with database connection handling
     */
    protected function retryModelQuery($callback, $maxRetries = 5) // Increased from 3 to 5
    {
        $attempt = 0;
        while ($attempt < $maxRetries) {
            try {
                return $callback();
            } catch (\Exception $e) {
                $attempt++;
                
                // Check for various connection errors
                $isConnectionError = 
                    strpos($e->getMessage(), 'Connection refused') !== false || 
                    strpos($e->getMessage(), 'SQLSTATE[HY000] [2002]') !== false ||
                    strpos($e->getMessage(), 'SQLSTATE[HY000] [2003]') !== false ||
                    strpos($e->getMessage(), 'Connection timed out') !== false ||
                    strpos($e->getMessage(), 'No route to host') !== false ||
                    strpos($e->getMessage(), 'Network is unreachable') !== false;
                
                if ($isConnectionError) {
                    Log::warning("Database connection error on attempt {$attempt}", [
                        'error' => $e->getMessage(),
                        'sequence_id' => $this->sequenceId,
                        'attempt' => $attempt,
                        'max_retries' => $maxRetries,
                    ]);
                    
                    if ($attempt >= $maxRetries) {
                        Log::error("Database connection failed after {$maxRetries} attempts", [
                            'sequence_id' => $this->sequenceId,
                            'error' => $e->getMessage(),
                        ]);
                        throw $e;
                    }
                    
                    // Exponential backoff for network issues
                    $delay = min(pow(2, $attempt) * 2, 30); // Max 30 seconds
                    Log::info("Waiting {$delay} seconds before retry", [
                        'sequence_id' => $this->sequenceId,
                        'attempt' => $attempt,
                    ]);
                    sleep($delay);
                    continue;
                }
                
                // Re-throw non-connection errors immediately
                throw $e;
            }
        }
    }
}