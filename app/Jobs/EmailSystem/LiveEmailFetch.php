<?php

namespace App\Jobs\EmailSystem;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\GmailUtility;
use Google_Service_Gmail;
use App\Models\Central\EmailSystem\Keyword;
use App\Events\NewEmailReceived;

class LiveEmailFetch implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 60; // 1 minute (reduced from 2 minutes)
    public $tries = 2; // Reduced from 3
    public $backoff = [10, 30]; // Reduced delays

    protected $email;
    protected $category;
    protected $priority; // 'normal' or 'high' for drift sequences
    protected $sequenceId; // For drift sequences

    public function __construct($email, $category, $priority = 'normal', $sequenceId = null)
    {
        $this->email = $email;
        $this->category = $category;
        $this->priority = $priority;
        $this->sequenceId = $sequenceId;
        
        // Set queue priority based on priority
        if ($priority === 'high') {
            $this->onQueue('email-sync-high');
        } else {
            $this->onQueue('email-sync');
        }
    }

    public function uniqueId()
    {
        $base = "live_fetch_{$this->email}_{$this->category}";
        return $this->sequenceId ? "{$base}_seq_{$this->sequenceId}" : $base;
    }

    public function handle()
    {
        try {
            $db = DB::connection('pluto');
            $account = $db->selectOne('SELECT * FROM email_accounts WHERE email = ?', [$this->email]);
            
            if (!$account) {
                Log::error("Account not found", ['email' => $this->email]);
                return;
            }

            // --- GOOGLE ACCOUNT LIVE FETCHING ---
            if ($account->type === 'google') {
                $this->fetchGmailEmails($db, $account);
            }
            // --- MANUAL ACCOUNT LIVE FETCHING (IMAP) ---
            elseif ($account->type === 'manual') {
                $this->fetchImapEmails($db, $account);
            }

        } catch (\Exception $e) {
            Log::error("Live fetch failed", [
                'email' => $this->email,
                'category' => $this->category,
                'priority' => $this->priority,
                'sequence_id' => $this->sequenceId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function fetchGmailEmails($db, $account)
    {
        $client = GmailUtility::getGoogleClient($account);
        $gmail = new Google_Service_Gmail($client);
        
        // Optimize query based on priority and sequence
        if ($this->priority === 'high' && $this->sequenceId) {
            // For drift sequences, fetch recent emails that might be replies
            $query = $this->buildDriftQuery($db);
            $maxResults = 50; // Reduced from 100 for faster processing
        } else {
            // Standard query for engage system
            $query = $this->category === 'inbox' ? 'in:inbox -in:drafts -in:sent -in:trash -in:spam' : 'in:spam';
            $maxResults = 25; // Reduced from 50 for faster processing
        }

        // Get the latest email timestamp from our database
        $latestEmail = $db->selectOne(
            'SELECT received_at FROM emails WHERE account_email = ? AND category = ? ORDER BY received_at DESC LIMIT 1',
            [$this->email, $this->category]
        );

        // Build query to get only new emails
        if ($latestEmail && $this->priority === 'normal') {
            $latestTimestamp = strtotime($latestEmail->received_at);
            $query .= ' after:' . date('Y/m/d', $latestTimestamp);
        }

        // Get processed message IDs to avoid duplicates
        $processedMessageIds = array_column(
            $db->select('SELECT message_id FROM emails WHERE account_email = ? AND category = ?', [$this->email, $this->category]),
            'message_id'
        );

        try {
            // Fetch messages with optimized parameters
            $params = [
                'q' => $query,
                'maxResults' => $maxResults
            ];

            $messages = $gmail->users_messages->listUsersMessages('me', $params);
            $messageList = $messages->getMessages();

            if (empty($messageList)) {
                return;
            }

            $newEmails = [];
            $processedCount = 0;
            
            foreach ($messageList as $message) {
                $messageId = $message->getId();
                
                // Skip if already processed
                if (in_array($messageId, $processedMessageIds)) {
                    $processedCount++;
                    continue;
                }

                try {
                    $msg = $gmail->users_messages->get('me', $messageId, ['format' => 'full']);
                    $threadId = $msg->getThreadId();
                    $headers = $msg->getPayload()->getHeaders();
                    $from = $this->getHeader($headers, 'From', 'Unknown');
                    $subject = $this->getHeader($headers, 'Subject', 'No Subject');
                    $inReplyTo = $this->getHeader($headers, 'In-Reply-To', null);
                    
                    // Convert Gmail timestamp to local timezone
                    $timestamp = $msg->getInternalDate() / 1000;
                    $receivedAt = date('Y-m-d H:i:s', $timestamp);
                    $labels = $msg->getLabelIds();
                    $read = !in_array('UNREAD', $labels);
                    $body = GmailUtility::getMessageBody($msg);

                    if (empty($body) || $body === '<p>No content available</p>') {
                        $body = $this->extractMessageContent($msg);
                    }

                    $result = $this->classifyReply($headers, $body, $messageId, $from, $subject);
                    $status = $result['status'];
                    $matchedKeywords = $result['matched_keywords'];
                    $keywords = json_encode(array_column($matchedKeywords, 'keyword'));
                    // Truncate keywords if too long to prevent status_reasons column overflow
                    if (strlen($keywords) > 500) {
                        $keywords = json_encode(array_slice(array_column($matchedKeywords, 'keyword'), 0, 5));
                    }
                    $campaignId = $this->getCampaignIdFromSubject($subject);

                    $db->insert(
                        'INSERT INTO emails (message_id, account_email, thread_id, category, `from`, subject, body, body_html, in_reply_to, received_at, `read`, labels, thread_count, status, status_reasons, campaign_id, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                        ON DUPLICATE KEY UPDATE updated_at = NOW()',
                        [$messageId, $this->email, $threadId, $this->category, $from, $subject, strip_tags($body), $body, $inReplyTo, $receivedAt, $read ? 1 : 0, json_encode($labels), 1, $status, $keywords, $campaignId]
                    );

                    $newEmails[] = $messageId;

                } catch (\Exception $e) {
                    Log::error("Failed to process Gmail message", [
                        'message_id' => $messageId, 
                        'error' => $e->getMessage(),
                        'priority' => $this->priority
                    ]);
                    continue;
                }
            }

            if (!empty($newEmails)) {
                // Broadcast new emails event for real-time UI updates
                event(new NewEmailReceived($this->email, $this->category, $newEmails, count($newEmails)));
            }

        } catch (\Google_Service_Exception $e) {
            if ($e->getCode() == 429) {
                Log::warning("Gmail API rate limit hit", [
                    'email' => $this->email,
                    'priority' => $this->priority
                ]);
                // Retry after 60 seconds
                LiveEmailFetch::dispatch($this->email, $this->category, $this->priority, $this->sequenceId)->delay(now()->addSeconds(60));
                return;
            }
            
            Log::error("Gmail API error", [
                'email' => $this->email,
                'category' => $this->category,
                'priority' => $this->priority,
                'sequence_id' => $this->sequenceId,
                'error_code' => $e->getCode(),
                'error_message' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    private function buildDriftQuery($db)
    {
        // Build optimized query for drift sequences
        $query = 'in:inbox -in:drafts -in:sent -in:trash -in:spam';
        
        if ($this->sequenceId) {
            // Get message IDs from drift_sequence_logs for this sequence
            $sentMessageIds = $db->select(
                'SELECT message_id FROM drift_sequence_logs WHERE sequence_id = ? AND message_id IS NOT NULL',
                [$this->sequenceId]
            );
            
            if (!empty($sentMessageIds)) {
                $messageIdQueries = [];
                foreach ($sentMessageIds as $log) {
                    if ($log->message_id) {
                        // Clean message ID for Gmail query
                        $cleanMessageId = str_replace(['<', '>'], '', $log->message_id);
                        $messageIdQueries[] = $cleanMessageId;
                    }
                }
                
                if (!empty($messageIdQueries)) {
                    // Search for emails that might be replies to our sequence emails
                    $query .= ' (' . implode(' OR ', array_map(function($id) {
                        return "rfc822msgid:{$id}";
                    }, $messageIdQueries)) . ')';
                }
            }
        }
        
        // Add time filter for recent emails (last 24 hours for drift sequences)
        $query .= ' after:' . date('Y/m/d', strtotime('-24 hours'));
        
        return $query;
    }

    private function fetchImapEmails($db, $account)
    {
        $imapHost = $account->incoming_host;
        $imapPort = $account->incoming_port;
        $imapEncryption = $account->incoming_encryption;
        $baseMailbox = "{" . $imapHost . ":" . $imapPort;
        if ($imapEncryption === 'ssl') {
            $baseMailbox .= "/imap/ssl";
        } elseif ($imapEncryption === 'tls' || $imapEncryption === 'starttls') {
            $baseMailbox .= "/imap/tls";
        } else {
            $baseMailbox .= "/imap";
        }
        $baseMailbox .= "}";

        $folder = $this->category === 'inbox' ? 'INBOX' : null;
        $imap = false;

        // Try possible spam folders
        if ($this->category === 'spam') {
            $possibleFolders = ['Spam', 'Junk', '[Gmail]/Spam', 'SPAM', 'JUNK'];
            foreach ($possibleFolders as $tryFolder) {
                $imapMailbox = $baseMailbox . $tryFolder;
                $imap = @imap_open($imapMailbox, $account->email, $account->password, OP_READONLY, 1);
                if ($imap !== false) {
                    $folder = $tryFolder;
                    break;
                }
            }
        } else {
            $imapMailbox = $baseMailbox . "INBOX";
            $imap = @imap_open($imapMailbox, $account->email, $account->password, OP_READONLY, 1);
        }

        if ($imap === false) {
            $imapError = imap_last_error();
            Log::error("IMAP connection failed", [
                'email' => $account->email, 
                'category' => $this->category, 
                'error' => $imapError,
                'priority' => $this->priority
            ]);
            throw new \Exception("IMAP connection failed: {$imapError}");
        }

        // Get processed message IDs to avoid duplicates
        $processedMessageIds = array_column(
            $db->select('SELECT message_id FROM emails WHERE account_email = ? AND category = ?', [$this->email, $this->category]),
            'message_id'
        );

        $newEmails = [];
        $emails = imap_sort($imap, SORTDATE, 1, SE_UID); // Sort by date descending
        $total = count($emails);
        
        // Check only the latest emails for new ones (more for high priority)
        $checkLimit = $this->priority === 'high' ? 100 : 50;
        $latestEmails = array_slice($emails, 0, $checkLimit);

        foreach ($latestEmails as $uid) {
            $msgno = imap_msgno($imap, $uid);
            $header = imap_headerinfo($imap, $msgno);
            $messageId = isset($header->message_id) ? trim($header->message_id, '<>') : $uid;
            
            if (in_array($messageId, $processedMessageIds)) {
                continue;
            }

            try {
                $from = $header->fromaddress ?? 'Unknown';
                $subject = isset($header->subject) ? imap_utf8($header->subject) : 'No Subject';
                $inReplyTo = $header->in_reply_to ?? null;
                $receivedAt = isset($header->date) ? date('Y-m-d H:i:s', strtotime($header->date)) : null;
                $read = ($header->Unseen !== 'U');
                $labels = [];
                $bodyParts = $this->getImapMessageBody($imap, $msgno);
                $body = $bodyParts['plain'] ?? '';
                $bodyHtml = $bodyParts['html'] ?? '';

                $result = $this->classifyReply([], $body, $messageId, $from, $subject);
                $status = $result['status'];
                $matchedKeywords = $result['matched_keywords'];
                $keywords = json_encode(array_column($matchedKeywords, 'keyword'));
                // Truncate keywords if too long to prevent status_reasons column overflow
                if (strlen($keywords) > 500) {
                    $keywords = json_encode(array_slice(array_column($matchedKeywords, 'keyword'), 0, 5));
                }
                $campaignId = $this->getCampaignIdFromSubject($subject);

                $db->insert(
                    'INSERT INTO emails (message_id, account_email, thread_id, category, `from`, subject, body, body_html, in_reply_to, received_at, `read`, labels, thread_count, status, status_reasons, campaign_id, created_at, updated_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE updated_at = NOW()',
                    [$messageId, $this->email, $messageId, $this->category, $from, $subject, $body, $bodyHtml, $inReplyTo, $receivedAt, $read ? 1 : 0, json_encode($labels), 1, $status, $keywords, $campaignId]
                );

                $newEmails[] = $messageId;

            } catch (\Exception $e) {
                Log::error("Failed to process IMAP message", [
                    'uid' => $uid, 
                    'error' => $e->getMessage(),
                    'priority' => $this->priority
                ]);
                continue;
            }
        }

        imap_close($imap);
        
        if (!empty($newEmails)) {
            // Broadcast new emails event for real-time UI updates
            event(new NewEmailReceived($this->email, $this->category, $newEmails, count($newEmails)));
        }
    }

    private function getHeader($headers, $name, $default = '')
    {
        foreach ($headers as $header) {
            if ($header->getName() === $name) {
                return $header->getValue();
            }
        }
        return $default;
    }

    private function classifyReply($headers, $body, $messageId, $from, $subject)
    {
        $diagnosticCode = $this->getHeader($headers, 'Diagnostic-Code', '');
        $statusHeader = $this->getHeader($headers, 'Status', '');
        $returnPath = $this->getHeader($headers, 'Return-Path', '');
        $failedRecipients = $this->getHeader($headers, 'X-Failed-Recipients', '');

        // Check for automatic reply indicators first
        $isAutomaticReply = $this->isAutomaticReply($headers, $subject, $from);
        
        // Clean and process the body
        $cleanBody = $body ?? '';
        if (preg_match_all('/<(a|button)[^>]*>(.*?)<\/\1>/i', $cleanBody, $matches)) {
            $cleanBody .= ' ' . implode(' ', $matches[2]);
        }
        $cleanBody = strip_tags($cleanBody);
        $cleanBody = preg_replace('/\s+/', ' ', trim($cleanBody));
        
        // ALWAYS extract reply content to avoid considering quoted content in keyword analysis
        $originalLength = strlen($cleanBody);
        $cleanBody = $this->extractReplyContent($cleanBody);
        $newLength = strlen($cleanBody);
        
        // Use ONLY the cleaned/extracted content for keyword analysis
        $rawText = $cleanBody . ' ' . $subject . ' ' . $diagnosticCode . ' ' . $statusHeader . ' ' . $failedRecipients;
        $text = strtolower($rawText);

        $isDaemon = preg_match('/\b(postmaster|mailer-daemon|mail-daemon|nondelivery|delivery|noreply)(@|\s|$)/i', $from) === 1;

        $keywords = \Cache::remember("keywords_global", 3600, function () {
            return Keyword::all()->groupBy('type')->toArray();
        });

        if (empty($keywords)) {
            Log::error("No keywords available for classification", ['message_id' => $messageId]);
            return [
                'status' => 'unknown',
                'matched_keywords' => [],
            ];
        }

        $keywordPatterns = [
            'hard_bounce' => [
                'patterns' => ['\b(undeliverable|permanent\s*failure|invalid\s*(recipient|address)|mailbox\s*(not\s*found|unavailable)|550\s*5\.1\.1)\b'],
                'weight' => 2.0,
            ],
            'soft_bounce' => [
                'patterns' => ['\b(temporary\s*failure|mailbox\s*full|quota\s*exceeded|450\s*4\.2\.1|message\s*blocked)\b'],
                'weight' => 1.5,
            ],
            'no_longer' => [
                'patterns' => ['\b(no\s*longer\s*(at|with|employed)|not\s*with\s*company|left\s*the\s*organization)\b'],
                'weight' => 1.2,
            ],
            'unsubscribe' => [
                'patterns' => ['\b(unsubscribe|opt\s*out|remove\s*(me|from\s*list)|stop\s*sending|do\s*not\s*contact)\b'],
                'weight' => 1.0,
            ],
            'automatic_reply' => [
                'patterns' => ['\b(out\s*of\s*office|auto\s*reply|on\s*vacation|away\s*from\s*office)\b'],
                'weight' => 0.8,
            ],
        ];

        foreach ($keywords as $type => $typeKeywords) {
            foreach ($typeKeywords as $keyword) {
                $keyword = strtolower(trim($keyword['keyword']));
                $pattern = '\b' . preg_quote($keyword, '/') . '(?:d|ed|ing)?\b';
                $keywordPatterns[$type]['patterns'][] = $pattern;
            }
        }

        $maxScore = 0;
        $bestType = 'unknown';
        $matchedKeywords = [];
        $earliestPositions = [];

        // First pass: find the earliest position of each keyword type
        foreach ($keywordPatterns as $type => $config) {
            $earliestPositions[$type] = PHP_INT_MAX;
            
            foreach ($config['patterns'] as $pattern) {
                if (preg_match_all('/' . $pattern . '/i', $text, $matches, PREG_OFFSET_CAPTURE)) {
                    foreach ($matches[0] as $match) {
                        $position = $match[1];
                        if ($position < $earliestPositions[$type]) {
                            $earliestPositions[$type] = $position;
                        }
                    }
                }
            }
        }

        // Second pass: calculate scores with position-based weighting
        foreach ($keywordPatterns as $type => $config) {
            $score = 0;
            $typeMatchedKeywords = [];

            foreach ($config['patterns'] as $pattern) {
                if (preg_match_all('/' . $pattern . '/i', $text, $matches, PREG_OFFSET_CAPTURE)) {
                    foreach ($matches[0] as $match) {
                        $position = $match[1];
                        $keyword = $match[0];
                        
                        // Apply position-based weighting (earlier = higher weight)
                        $positionWeight = 1.0;
                        if ($position < 100) {
                            $positionWeight = 2.0; // Very early in the text
                        } elseif ($position < 500) {
                            $positionWeight = 1.5; // Early in the text
                        } elseif ($position > 2000) {
                            $positionWeight = 0.5; // Late in the text (likely quoted)
                        }
                        
                        $score += $config['weight'] * $positionWeight;
                        $typeMatchedKeywords[] = ['keyword' => $keyword, 'type' => $type, 'position' => $position];
                    }
                }
            }

            if ($score > $maxScore) {
                $maxScore = $score;
                $bestType = $type;
                $matchedKeywords = $typeMatchedKeywords;
            }
        }

        // Special handling for daemon emails
        if ($isDaemon && $maxScore === 0) {
            $bestType = 'hard_bounce';
            $matchedKeywords = [['keyword' => 'daemon', 'type' => 'hard_bounce']];
        }

        // For automatic replies, prioritize automatic_reply classification
        if ($isAutomaticReply) {
            // If it was classified as something else but it's an automatic reply, 
            // check if the classification was based on quoted content
            if ($bestType !== 'automatic_reply') {
                $bestType = 'automatic_reply';
                $matchedKeywords = [['keyword' => 'automatic_reply', 'type' => 'automatic_reply']];
            }
        }

        return [
            'status' => $bestType,
            'matched_keywords' => $matchedKeywords,
        ];
    }

    private function isAutomaticReply($headers, $subject, $from)
    {
        // Check for automatic reply headers
        $autoReplyHeaders = [
            'Auto-Submitted',
            'X-Auto-Response-Suppress',
            'X-Autoreply',
            'Precedence',
            'X-Precedence'
        ];

        foreach ($autoReplyHeaders as $headerName) {
            $headerValue = $this->getHeader($headers, $headerName, '');
            if (stripos($headerValue, 'auto') !== false || stripos($headerValue, 'bulk') !== false) {
                return true;
            }
        }

        // Check subject for automatic reply indicators
        $subjectLower = strtolower($subject);
        $autoReplySubjects = [
            'out of office',
            'automatic reply',
            'auto reply',
            'away from office',
            'on vacation',
            'out of the office',
            'automatic response',
            'auto response'
        ];

        foreach ($autoReplySubjects as $indicator) {
            if (strpos($subjectLower, $indicator) !== false) {
                return true;
            }
        }

        return false;
    }

    private function extractReplyContent($body)
    {
        // If the body contains HTML, handle it differently
        if (strpos($body, '<') !== false && strpos($body, '>') !== false) {
            return $this->extractReplyContentFromHtml($body);
        }
        
        // Remove quoted/forwarded content for plain text
        $patterns = [
            // Common quote patterns
            '/^>.*$/m',                    // Lines starting with >
            '/^\|.*$/m',                   // Lines starting with |
            '/^On.*wrote:$/m',             // "On ... wrote:" lines
            '/^From:.*$/m',                // "From:" lines
            '/^Sent:.*$/m',                // "Sent:" lines
            '/^To:.*$/m',                  // "To:" lines
            '/^Subject:.*$/m',             // "Subject:" lines
            '/^-{3,}.*Original Message.*-{3,}$/m', // "--- Original Message ---"
            '/^_{3,}.*Original Message.*_{3,}$/m', // "___ Original Message ___"
            '/^From:.*Sent:.*To:.*Subject:.*$/m', // Email headers
            '/^>+\s*From:.*$/m',           // Quoted "From:" lines
            '/^>+\s*Sent:.*$/m',           // Quoted "Sent:" lines
            '/^>+\s*To:.*$/m',             // Quoted "To:" lines
            '/^>+\s*Subject:.*$/m',        // Quoted "Subject:" lines
            '/^>+\s*Date:.*$/m',           // Quoted "Date:" lines
            '/^>+\s*Reply-To:.*$/m',       // Quoted "Reply-To:" lines
            '/^>+\s*Message-ID:.*$/m',     // Quoted "Message-ID:" lines
            '/^>+\s*MIME-Version:.*$/m',   // Quoted "MIME-Version:" lines
            '/^>+\s*Content-Type:.*$/m',   // Quoted "Content-Type:" lines
            '/^>+\s*Content-Transfer-Encoding:.*$/m', // Quoted "Content-Transfer-Encoding:" lines
            '/^-{3,}.*Forwarded message.*-{3,}$/m', // "--- Forwarded message ---"
            '/^_{3,}.*Forwarded message.*_{3,}$/m', // "___ Forwarded message ___"
            '/^-{3,}.*Begin forwarded message.*-{3,}$/m', // "--- Begin forwarded message ---"
            '/^_{3,}.*Begin forwarded message.*_{3,}$/m', // "___ Begin forwarded message ___"
            '/^>+\s*Begin forwarded message:.*$/m', // "> Begin forwarded message:"
            '/^>+\s*From:.*Sent:.*To:.*Subject:.*$/m', // Quoted email headers block
            '/^>+\s*Date:.*From:.*To:.*Subject:.*$/m', // Alternative quoted headers block
            '/^>+\s*.*@.*\s*wrote:.*$/m',  // "> someone@domain.com wrote:"
            '/^>+\s*.*\s*<.*@.*>\s*wrote:.*$/m', // "> Name <email@domain.com> wrote:"
            '/^>+\s*.*\s*on.*wrote:.*$/m', // "> Name on date wrote:"
            '/^>+\s*.*\s*at.*wrote:.*$/m', // "> Name at time wrote:"
            '/^>+\s*.*\s*\(.*\)\s*wrote:.*$/m', // "> Name (email) wrote:"
            
            // Only remove unsubscribe content that is actually quoted (starts with >)
            '/^>+\s*.*unsubscribe.*$/im',  // Quoted unsubscribe lines
            '/^>+\s*.*opt\s*out.*$/im',    // Quoted opt-out lines
            '/^>+\s*.*remove.*$/im',       // Quoted remove lines
            '/^>+\s*.*stop.*sending.*$/im', // Quoted stop sending lines
            '/^>+\s*.*do\s*not\s*contact.*$/im', // Quoted do not contact lines
            '/^>+\s*.*click\s*here.*$/im', // Quoted click here lines
            '/^>+\s*.*click\s*below.*$/im', // Quoted click below lines
            '/^>+\s*.*unsubscribe\s*link.*$/im', // Quoted unsubscribe link lines
            '/^>+\s*.*unsubscribe\s*button.*$/im', // Quoted unsubscribe button lines
        ];

        $cleanBody = $body;
        
        // First, try to extract only the reply content before quoted content
        $lines = explode("\n", $cleanBody);
        $replyLines = [];
        $inQuote = false;
        $quoteStartFound = false;
        
        foreach ($lines as $line) {
            $trimmedLine = trim($line);
            
            // Check for quote indicators (only actual quote indicators, not content)
            if (preg_match('/^(>|\||On .* wrote:|From:|Sent:|To:|Subject:|Date:|Reply-To:|Message-ID:|MIME-Version:|Content-Type:|Content-Transfer-Encoding:)/', $trimmedLine) ||
                preg_match('/^-{3,}.*(Original Message|Forwarded message|Begin forwarded message).*-{3,}$/', $trimmedLine) ||
                preg_match('/^_{3,}.*(Original Message|Forwarded message|Begin forwarded message).*_{3,}$/', $trimmedLine) ||
                preg_match('/^>+\s*.*@.*\s*wrote:/', $trimmedLine) ||
                preg_match('/^>+\s*.*\s*<.*@.*>\s*wrote:/', $trimmedLine) ||
                preg_match('/^>+\s*.*\s*on.*wrote:/', $trimmedLine) ||
                preg_match('/^>+\s*.*\s*at.*wrote:/', $trimmedLine) ||
                preg_match('/^>+\s*.*\s*\(.*\)\s*wrote:/', $trimmedLine)) {
                $inQuote = true;
                $quoteStartFound = true;
                continue;
            }
            
            // If we're in a quote section, skip the line
            if ($inQuote) {
                continue;
            }
            
            // Add non-quoted lines (including unsubscribe content that is part of the actual reply)
            $replyLines[] = $line;
        }
        
        $cleanBody = implode("\n", $replyLines);
        
        // If no quote indicators were found, try a different approach
        if (!$quoteStartFound) {
            // Look for patterns that indicate the start of quoted content
            $quotePatterns = [
                '/\s*<[^>]*@[^>]*>\s*wrote:/i',  // <email@domain.com> wrote:
                '/\s*On\s+.*\s+wrote:/i',        // On ... wrote:
                '/\s*From:\s*.*\s*Sent:\s*.*\s*To:\s*.*\s*Subject:/i', // Email headers
                '/\s*-{3,}.*Original Message.*-{3,}/i', // --- Original Message ---
                '/\s*_{3,}.*Original Message.*_{3,}/i', // ___ Original Message ___
            ];
            
            foreach ($quotePatterns as $pattern) {
                if (preg_match($pattern, $cleanBody, $matches, PREG_OFFSET_CAPTURE)) {
                    $position = $matches[0][1];
                    // Take only content before the quote
                    $cleanBody = substr($cleanBody, 0, $position);
                    break;
                }
            }
        }
        
        // Then apply regex patterns for any remaining quoted content
        foreach ($patterns as $pattern) {
            $cleanBody = preg_replace($pattern, '', $cleanBody);
        }

        // Remove multiple blank lines and excessive whitespace
        $cleanBody = preg_replace('/\n\s*\n\s*\n/', "\n\n", $cleanBody);
        $cleanBody = preg_replace('/\s+/', ' ', $cleanBody);
        
        return trim($cleanBody);
    }

    private function extractReplyContentFromHtml($htmlBody)
    {
        // Check for Gmail quote container first
        if (strpos($htmlBody, 'gmail_quote_container') !== false) {
            $parts = preg_split('/<div[^>]*class\s*=\s*["\']gmail_quote_container[^>]*>/i', $htmlBody);
            if (count($parts) > 1) {
                $cleanHtml = trim($parts[0]); // Take only the content before the quote
            } else {
                $cleanHtml = $htmlBody;
            }
        } else {
            $cleanHtml = $htmlBody;
        }
        
        // Also check for other quote indicators in HTML
        $quotePatterns = [
            '/<div[^>]*class\s*=\s*["\']gmail_quote[^>]*>.*?<\/div>/is', // Gmail quote divs
            '/<blockquote[^>]*class\s*=\s*["\']gmail_quote[^>]*>.*?<\/blockquote>/is', // Gmail quote blockquotes
            '/<div[^>]*class\s*=\s*["\']gmail_attr[^>]*>.*?<\/div>/is', // Gmail attribute divs
            '/<div[^>]*class\s*=\s*["\']gmail_quote_container[^>]*>.*?<\/div>/is', // Gmail quote containers
            '/<blockquote[^>]*>.*?<\/blockquote>/is', // Generic blockquotes
            '/<div[^>]*class\s*=\s*["\']quote[^>]*>.*?<\/div>/is', // Quote divs
            '/<div[^>]*class\s*=\s*["\']quoted[^>]*>.*?<\/div>/is', // Quoted divs
            '/<div[^>]*class\s*=\s*["\']WordSection1[^>]*>.*?<\/div>/is', // Outlook Word sections
            '/<div[^>]*class\s*=\s*["\']MsoNormal[^>]*>.*?<\/div>/is', // Outlook MSO normal
            '/<div[^>]*style\s*=\s*["\'][^"\']*border-left[^>]*>.*?<\/div>/is', // Divs with border-left (quotes)
            '/<div[^>]*style\s*=\s*["\'][^"\']*margin-left[^>]*>.*?<\/div>/is', // Divs with margin-left (quotes)
        ];

        // Remove quoted content using patterns
        foreach ($quotePatterns as $pattern) {
            $cleanHtml = preg_replace($pattern, '', $cleanHtml);
        }
        
        // Also try to remove content after "On ... wrote:" patterns in HTML
        $cleanHtml = preg_replace('/<div[^>]*>.*?On .*? wrote:.*?<\/div>/is', '', $cleanHtml);
        $cleanHtml = preg_replace('/<div[^>]*>.*?From:.*?<\/div>/is', '', $cleanHtml);
        $cleanHtml = preg_replace('/<div[^>]*>.*?Sent:.*?<\/div>/is', '', $cleanHtml);
        $cleanHtml = preg_replace('/<div[^>]*>.*?To:.*?<\/div>/is', '', $cleanHtml);
        $cleanHtml = preg_replace('/<div[^>]*>.*?Subject:.*?<\/div>/is', '', $cleanHtml);
        
        // Convert HTML to text for further processing
        $text = strip_tags($cleanHtml);
        
        // Apply the same text-based quote removal
        return $this->extractReplyContent($text);
    }

    private function getCampaignIdFromSubject($subject)
    {
        if (preg_match('/\[([A-Z0-9]{8,})\]/', $subject, $matches)) {
            return $matches[1];
        }
        return null;
    }

    private function getImapMessageBody($imap, $msgno)
    {
        $structure = imap_fetchstructure($imap, $msgno);
        $body = ['plain' => '', 'html' => ''];

        if ($structure->type === 0) {
            // Simple text
            $data = imap_fetchbody($imap, $msgno, 1);
            $encoding = $structure->encoding;
            $decoded = $this->decodeImapBody($data, $encoding);
            
            if (strtolower($structure->subtype) === 'html') {
                $body['html'] = $decoded;
            } else {
                $body['plain'] = $decoded;
            }
        } elseif ($structure->type === 1) {
            // Multipart
            foreach ($structure->parts as $index => $part) {
                $partNumber = $index + 1;
                $data = imap_fetchbody($imap, $msgno, $partNumber);
                $encoding = $part->encoding;
                $decoded = $this->decodeImapBody($data, $encoding);
                
                if (strtolower($part->subtype) === 'html') {
                    $body['html'] = $decoded;
                } elseif (strtolower($part->subtype) === 'plain') {
                    $body['plain'] = $decoded;
                }
            }
        }

        return $body;
    }

    private function decodeImapBody($body, $encoding)
    {
        switch ($encoding) {
            case 3: // BASE64
                return base64_decode($body);
            case 4: // QUOTED-PRINTABLE
                return quoted_printable_decode($body);
            default:
                return $body;
        }
    }

    private function extractMessageContent($message)
    {
        $payload = $message->getPayload();
        if (!$payload) {
            return '';
        }

        $content = '';
        if ($payload->getBody()) {
            $content = $this->extractAnyText($payload);
        } elseif ($payload->getParts()) {
            $content = $this->extractFromParts($payload->getParts());
        }

        return $content ?: 'No content available';
    }

    private function extractFromParts($parts)
    {
        $content = '';

        foreach ($parts as $part) {
            $mimeType = $part->getMimeType();
            $body = $part->getBody();

            if (!$body) continue;

            $data = $body->getData();
            if (!$data) continue;

            $decoded = base64_decode(str_replace(['-', '_'], ['+', '/'], $data));

            if (in_array($mimeType, ['text/plain', 'text/html'])) {
                $content .= $decoded . "\n";
            } elseif (strpos($mimeType, 'multipart/') === 0) {
                $nestedParts = $part->getParts();
                if ($nestedParts) {
                    $content .= $this->extractFromParts($nestedParts);
                }
            }
        }

        return $content;
    }

    private function extractAnyText($payload)
    {
        $body = $payload->getBody();
        if ($body && $body->getData()) {
            return base64_decode(str_replace(['-', '_'], ['+', '/'], $body->getData()));
        }
        return '';
    }

    public function failed(\Throwable $exception)
    {
        Log::error('LiveEmailFetch job failed', [
            'email' => $this->email,
            'category' => $this->category,
            'exception' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString()
        ]);
    }
} 