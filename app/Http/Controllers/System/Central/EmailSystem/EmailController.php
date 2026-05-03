<?php

namespace App\Http\Controllers\System\Central\EmailSystem;

use App\Facades\Developer;
use App\Http\Controllers\Controller;
use App\Models\Central\EmailSystem\Keyword;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Laravel\Socialite\Facades\Socialite;
use App\Jobs\EmailSystem\LiveEmailFetch;
use App\Services\GmailUtility;
use Google_Service_Gmail;

class EmailController extends Controller
{
    private function setupPlutoConnection()
    {
        $connection = [
            'driver' => 'mysql',
            'host' => '127.0.0.1',
            'port' => '3306',
            'database' => 'pluto',
            'username' => 'root',
            'password' => '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
        ];

        DB::purge('pluto');
        config(['database.connections.pluto' => $connection]);
        try {
            $db = DB::connection('pluto');
            $db->getPdo();
            Log::info("Pluto connection established");

            // Ensure optimal indexes exist for email queries
            $this->ensureEmailIndexes($db);

            return $db;
        } catch (\Exception $e) {
            Log::error("Failed to connect to Pluto database: " . $e->getMessage());
            throw $e;
        }
    }

    private function ensureEmailIndexes($db)
    {
        try {
            // Check and create indexes for better query performance
            $indexes = [
                'idx_emails_account_category' => 'CREATE INDEX IF NOT EXISTS idx_emails_account_category ON emails (account_email, category)',
                'idx_emails_received_at' => 'CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails (received_at DESC)',
                'idx_emails_message_id' => 'CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails (message_id)',
                'idx_emails_subject' => 'CREATE INDEX IF NOT EXISTS idx_emails_subject ON emails (subject)',
                'idx_emails_from' => 'CREATE INDEX IF NOT EXISTS idx_emails_from ON emails (`from`)',
            ];

            foreach ($indexes as $name => $sql) {
                $db->statement($sql);
            }
            Log::info("Email indexes ensured for optimal performance");
        } catch (\Exception $e) {
            Log::warning("Failed to create email indexes: " . $e->getMessage());
            // Don't throw - let the app continue without indexes
        }
    }

    public function index()
    {
        $activeEmail = Session::get('active_email');

        // If no active email is set, try to set the first available one
        if (!$activeEmail) {
            try {
                $db = $this->setupPlutoConnection();
                $firstAccount = $db->selectOne(
                    'SELECT email FROM email_accounts WHERE user_id = ? AND status = ? ORDER BY created_at ASC LIMIT 1',
                    [auth()->id(), 'active']
                );

                if ($firstAccount) {
                    $activeEmail = $firstAccount->email;
                    Session::put('active_email', $activeEmail);
                    Log::info("Auto-set active email to: " . $activeEmail);
                }
            } catch (\Exception $e) {
                Log::error("Failed to auto-set active email: " . $e->getMessage());
            }
        }

        Log::info("EmailController::index - Active email: " . ($activeEmail ?? 'None'));
        return view('system.central.email-system.engage', ['activeEmail' => $activeEmail ?? '']);
    }

    public function preSaveGoogleAccount(Request $request)
    {
        Log::info('preSaveGoogleAccount request all', $request->all());
        try {
            $data = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'extension' => 'nullable|string|max:255',
                'phone_number' => 'required|string|max:255',
                'designation' => 'required|string|max:255',
                'postal_code' => 'required|string|max:255',
                'address' => 'required|string',
                'fax' => 'nullable|string|max:255',
                'unsubscribe' => 'nullable|string|max:255',
                'region' => 'required|string|in:North America,South America,APJ & APAC,EMEA,MENA,DACH,Oceania,NORDICS',
                'daily_send_limit' => 'required|numeric|min:1'
            ]);
            Log::info('preSaveGoogleAccount received daily_send_limit', ['daily_send_limit' => $data['daily_send_limit']]);

            $db = $this->setupPlutoConnection();
            $db->insert(
                'INSERT INTO email_accounts (user_id, type, first_name, last_name, extension, phone_number, designation, postal_code, address, fax, unsubscribe, daily_send_limit, region, status, created_at, updated_at) 
            VALUES (?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [
                    auth()->id(),
                    'google',
                    $data['first_name'],
                    $data['last_name'],
                    $data['extension'] ?? null,
                    $data['phone_number'],
                    $data['designation'],
                    $data['postal_code'],
                    $data['address'],
                    $data['fax'] ?? null,
                    $data['unsubscribe'] ?? null,
                    $data['daily_send_limit'] ?? null, // <-- Added daily_send_limit here
                    $data['region'],
                    'pending'
                ]
            );

            $preSaveId = $db->getPdo()->lastInsertId();
            Session::put('google_pre_save_id', $preSaveId);

            return response()->json(['redirect' => route('google.redirect')]);
        } catch (\Exception $e) {
            Log::error("Error in preSaveGoogleAccount: " . $e->getMessage());
            return response()->json(['error' => 'Failed to pre-save details'], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'type' => 'required|string|in:manual',
                'email' => 'required|email',
                'password' => 'required|string',
                'incoming_host' => 'required|string',
                'incoming_port' => 'required|integer',
                'incoming_encryption' => 'required|string|in:ssl,tls,starttls,none',
                'outgoing_host' => 'required|string',
                'outgoing_port' => 'required|integer',
                'outgoing_encryption' => 'required|string|in:ssl,tls,starttls,none',
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'extension' => 'nullable|string|max:255',
                'phone_number' => 'nullable|string|max:255',
                'designation' => 'required|string|max:255',
                'postal_code' => 'required|string|max:255',
                'address' => 'required|string',
                'fax' => 'nullable|string|max:255',
                'unsubscribe' => 'nullable|string|max:255',
                'region' => 'required|string|in:North America,South America,APJ & APAC,EMEA,MENA,DACH,Oceania,NORDICS',
                'daily_send_limit' => 'required|numeric|min:1',
            ]);
            Log::info('store received daily_send_limit', ['daily_send_limit' => $data['daily_send_limit']]);

            $imapMailbox = "{" . $data['incoming_host'] . ":" . $data['incoming_port'];
            if ($data['incoming_encryption'] === 'ssl') {
                $imapMailbox .= "/imap/ssl";
            } elseif ($data['incoming_encryption'] === 'tls' || $data['incoming_encryption'] === 'starttls') {
                $imapMailbox .= "/imap/tls";
            } else {
                $imapMailbox .= "/imap";
            }
            $imapMailbox .= "}INBOX";

            if (!extension_loaded('imap')) {
                Log::error("IMAP extension not loaded");
                return response()->json(['error' => 'IMAP extension is not enabled on the server'], 500);
            }

            $imap = @imap_open($imapMailbox, $data['email'], $data['password'], OP_READONLY, 1);
            if ($imap === false) {
                $imapError = imap_last_error();
                Log::error("IMAP connection failed for {$data['email']}: {$imapError}");
                return response()->json(['error' => "IMAP connection failed: {$imapError}"], 422);
            }
            imap_close($imap);
            Log::info("IMAP connection validated for {$data['email']}");

            $smtpHost = $data['outgoing_host'];
            $smtpPort = $data['outgoing_port'];
            $smtpEncryption = $data['outgoing_encryption'];
            $prefix = $smtpEncryption === 'ssl' ? 'ssl://' : ($smtpEncryption === 'tls' || $smtpEncryption === 'starttls' ? 'tcp://' : '');
            $smtp = @fsockopen($prefix . $smtpHost, $smtpPort, $errno, $errstr, 5);
            if ($smtp === false) {
                Log::error("SMTP connection failed for {$data['email']}: {$errstr} ({$errno})");
                return response()->json(['error' => "SMTP connection failed: {$errstr} ({$errno})"], 422);
            }
            fclose($smtp);
            Log::info("SMTP connection validated for {$data['email']}");

            $db = $this->setupPlutoConnection();
            $db->insert(
                'INSERT INTO email_accounts (
                        user_id, type, email, password, incoming_host, incoming_port, incoming_encryption,
                        outgoing_host, outgoing_port, outgoing_encryption, first_name, last_name,
                        extension, phone_number, designation, postal_code, address, fax, unsubscribe, daily_send_limit, region, status,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [
                    auth()->id(),
                    $data['type'],
                    $data['email'],
                    $data['password'],
                    $data['incoming_host'],
                    $data['incoming_port'],
                    $data['incoming_encryption'],
                    $data['outgoing_host'],
                    $data['outgoing_port'],
                    $data['outgoing_encryption'],
                    $data['first_name'],
                    $data['last_name'],
                    $data['extension'] ?? null,
                    $data['phone_number'] ?? null,
                    $data['designation'],
                    $data['postal_code'],
                    $data['address'],
                    $data['fax'] ?? null,
                    $data['unsubscribe'] ?? null,
                    $data['daily_send_limit'] ?? null, // ✅ Added here
                    $data['region'],
                    'active'
                ]
            );

            $accountId = $db->getPdo()->lastInsertId();
            Log::info("Manual account saved successfully for {$data['email']}", ['account_id' => $accountId]);

            return response()->json([
                'message' => 'Manual account saved successfully',
                'account' => [
                    'id' => $accountId,
                    'email' => $data['email'],
                    'type' => $data['type'],
                    'status' => 'active',
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error("Validation error in store email account: " . json_encode($e->errors()));
            return response()->json(['error' => 'Invalid input: ' . implode(', ', $e->errors())], 422);
        } catch (\Exception $e) {
            Log::error("Unexpected error in store email account for {$data['email']}: {$e->getMessage()}");
            return response()->json(['error' => 'Failed to save manual account: ' . $e->getMessage()], 500);
        }
    }


    public function redirectToGoogle()
    {
        return Socialite::driver('google')
            ->scopes(['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'])
            ->with(['access_type' => 'offline', 'prompt' => 'consent'])
            ->redirect();
    }
    public function handleGoogleCallback()
    {
        try {
            $user = Socialite::driver('google')->stateless()->user();
            $preSaveId = Session::pull('google_pre_save_id');
            Log::info("Retrieved google_pre_save_id from session: {$preSaveId}");

            $db = $this->setupPlutoConnection();
            if (!$preSaveId) {
                Log::error("No google_pre_save_id found in session for email: {$user->email}");
                return response()->json(['error' => 'Session data lost. Please try again.'], 400);
            }

            $preSaved = $db->select('SELECT id, user_id FROM email_accounts WHERE id = ? AND user_id = ?', [$preSaveId, auth()->id()])[0] ?? null;
            if (!$preSaved) {
                Log::error("Pre-saved record not found for ID: {$preSaveId}, email: {$user->email}");
                return response()->json(['error' => 'Pre-saved record not found. Please try again.'], 404);
            }

            $db->update(
                'UPDATE email_accounts SET email = ?, access_token = ?, refresh_token = ?, status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
                [$user->email, $user->token, $user->refreshToken, 'active', $preSaveId, auth()->id()]
            );

            Log::info("Google account updated", [
                'email' => $user->email,
                'preSaveId' => $preSaveId
            ]);

            Storage::put("tokens/{$user->email}.json", json_encode([
                'access_token' => $user->token,
                'refresh_token' => $user->refreshToken,
                'expires_in' => $user->expiresIn,
                'created' => time(),
            ]));

            Session::put('active_email', $user->email);
            $this->startInitialSync($user->email);
            return redirect()->route('mailConfig', ['google_success' => 1]);
        } catch (\Exception $e) {
            Log::error("Google Callback Error: " . $e->getMessage());
            return redirect()->route('mailConfig', ['google_error' => urlencode($e->getMessage())]);
        }
    }
    private function createNewGoogleAccount($user)
    {
        $db = $this->setupPlutoConnection();
        $db->insert(
            'INSERT INTO email_accounts (user_id, type, email, access_token, refresh_token, status, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [auth()->id(), 'google', $user->email, $user->token, $user->refreshToken, 'active']
        );

        Storage::put("tokens/{$user->email}.json", json_encode([
            'access_token' => $user->token,
            'refresh_token' => $user->refreshToken,
            'expires_in' => $user->expiresIn,
            'created' => time(),
        ]));

        Session::put('active_email', $user->email);
        $this->startInitialSync($user->email);
        return redirect('/email-config?google_success=1&warning=New%20record%20created');
    }

    public function getEmailAccounts()
    {
        try {
            $db = $this->setupPlutoConnection();
            $accounts = $db->select(
                'SELECT id, email, type, status FROM email_accounts WHERE user_id = ? AND status = ?',
                [auth()->id(), 'active']
            );
            return response()->json($accounts);
        } catch (\Exception $e) {
            Log::error("Error fetching email accounts: " . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch email accounts'], 500);
        }
    }
    public function switchAccount(Request $request)
    {
        $email = $request->input('email');
        if (!$email) {
            return response()->json(['success' => false, 'error' => 'Email required'], 400);
        }

        $db = $this->setupPlutoConnection();
        $account = $db->selectOne(
            'SELECT email FROM email_accounts WHERE email = ? AND user_id = ? AND status = ?',
            [$email, auth()->id(), 'active']
        );
        if (!$account) {
            return response()->json(['success' => false, 'error' => 'Account not found'], 404);
        }

        Session::put('active_email', $email);
        $categories = ['inbox', 'spam'];
        foreach ($categories as $category) {
            $emailCount = $db->selectOne(
                'SELECT COUNT(*) as count FROM emails WHERE account_email = ? AND category = ?',
                [$email, $category]
            )->count;
            if ($emailCount == 0) {
                LiveEmailFetch::dispatch($email, $category)
                    ->delay(now()->addMinutes(5)) // Add delay to prevent cascade
                    ->onQueue('email-sync')
                    ->onConnection('database');
            }
        }

        return response()->json(['success' => true, 'message' => "Switched to {$email}"]);
    }
    public function startInitialSync($email)
    {
        $db = $this->setupPlutoConnection();
        $db->insert(
            'INSERT INTO sync_status (account_email, status) VALUES (?, "syncing") 
                ON DUPLICATE KEY UPDATE status = "syncing", updated_at = NOW()',
            [$email]
        );

        $categories = ['inbox', 'spam'];
        foreach ($categories as $category) {
            LiveEmailFetch::dispatch($email, $category)
                ->delay(now()->addMinutes(5)) // Add delay to prevent cascade
                ->onQueue('email-sync')
                ->onConnection('database');
        }
    }
    // Thunderbird-style Email Fetching with Smart Caching
    public function fetchEmails(Request $request)
    {
        $email = $request->query('email') ?? Session::get('active_email');
        $category = strtolower($request->query('category', 'inbox'));
        $search = $request->query('search', '');
        $pageToken = $request->query('pageToken');
        $status = $request->query('status', 'all');
        $cacheBust = $request->query('cache_bust', '');
        $fromDatabase = $request->query('from_database', 'true') === 'true';
        $noSync = $request->query('no_sync', 'false') === 'true';
        $perPage = $fromDatabase ? 25 : 20; // Reduced initial load size for faster response

        // Input validation
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['error' => 'Invalid email format'], 400);
        }

        if (!in_array($category, ['inbox', 'spam'])) {
            return response()->json(['error' => 'Invalid category'], 400);
        }

        $db = $this->setupPlutoConnection();

        // Only trigger sync if no_sync is false
        if (!$noSync) {
            // Thunderbird-style smart sync check
            $lastSynced = $db->selectOne('SELECT updated_at, status FROM sync_status WHERE account_email = ? AND category = ?', [$email, $category]);

            // Only trigger sync if:
            // 1. No sync record exists
            // 2. Last sync was more than 5 minutes ago AND status is not 'syncing'
            // 3. Status is 'failed' (retry)
            if (
                !$lastSynced ||
                (now()->subMinutes(5)->gt($lastSynced->updated_at) && $lastSynced->status !== 'syncing') ||
                $lastSynced->status === 'failed'
            ) {

                LiveEmailFetch::dispatch($email, $category)
                    ->delay(now()->addSeconds(30)) // Small delay to prevent cascade
                    ->onQueue('email-sync')
                    ->onConnection('database');
            }
        }

        // Optimized database query - exclude heavy body field for list view
        $query = 'SELECT id, message_id, thread_id, `from`, subject, 
                         LEFT(body, 200) as snippet, received_at, `read`, labels, status, campaign_id 
                         FROM emails 
                         WHERE account_email = ? AND category = ?';
        $params = [$email, $category];

        if ($status !== 'all') {
            $query .= ' AND status = ?';
            $params[] = $status;
        }

        if ($search) {
            // Optimized search - avoid searching large body field, focus on subject and from
            $query .= ' AND (subject LIKE ? OR `from` LIKE ?)';
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        $query .= ' ORDER BY received_at DESC, id DESC LIMIT ?';
        $params[] = $perPage;

        if ($pageToken) {
            $query .= ' OFFSET ?';
            $params[] = (int)$pageToken;
        }

        try {
            // Use query caching for better performance
            $cacheKey = "emails_" . md5($email . $category . $search . $status . $pageToken . $perPage);
            $emails = Cache::remember($cacheKey, 60, function () use ($db, $query, $params) {
                return $db->select($query, $params);
            });

            $nextPageToken = count($emails) === $perPage ? ((int)$pageToken + $perPage) : null;

            $formattedEmails = array_map(function ($email) {
                return [
                    'id' => $email->message_id ?? $email->id, // Use message_id for consistency
                    'thread_id' => $email->thread_id,
                    'from' => $email->from ?? 'Unknown',
                    'subject' => $email->subject ?? 'No Subject',
                    'snippet' => strip_tags($email->snippet ?? ''), // Use pre-trimmed snippet from SQL
                    'received_at' => $email->received_at,
                    'read' => (bool)$email->read,
                    'labels' => $email->labels ? json_decode($email->labels, true) : [],
                    'status' => $email->status ?? 'unknown',
                    'campaign_id' => $email->campaign_id
                ];
            }, $emails);

            // Get total count for pagination info (cached for 5 minutes)
            $countCacheKey = "email_count_" . md5($email . $category . $search . $status);
            $totalCount = Cache::remember($countCacheKey, 300, function () use ($db, $email, $category, $search, $status) {
                $countQuery = 'SELECT COUNT(*) as total FROM emails WHERE account_email = ? AND category = ?';
                $countParams = [$email, $category];

                if ($status !== 'all') {
                    $countQuery .= ' AND status = ?';
                    $countParams[] = $status;
                }

                if ($search) {
                    $countQuery .= ' AND (subject LIKE ? OR `from` LIKE ?)';
                    $searchTerm = "%{$search}%";
                    $countParams[] = $searchTerm;
                    $countParams[] = $searchTerm;
                }

                return $db->selectOne($countQuery, $countParams)->total ?? 0;
            });

            $response = [
                'emails' => $formattedEmails,
                'nextPageToken' => $nextPageToken,
                'from_database' => true,
                'total_count' => $totalCount
            ];

            if (empty($emails)) {
                $response['message'] = 'No emails found';
            }

            return response()->json($response);
        } catch (\Exception $e) {
            Log::error("Failed to fetch emails from database", [
                'email' => $email,
                'category' => $category,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch emails'], 500);
        }
    }

    public function fetchEmailContent(Request $request)
    {
        $activeEmail = Session::get('active_email');
        $emailId = $request->query('email_id');

        // Log the request for debugging
        Log::info('fetchEmailContent called', [
            'email_id' => $emailId,
            'active_email' => $activeEmail,
            'user_id' => auth()->id(),
            'session_id' => session()->getId()
        ]);

        if (!$activeEmail) {
            Log::error('No active email in session');
            return response()->json(['error' => 'No active email selected'], 400);
        }

        if (!$emailId) {
            Log::error('Email ID missing in fetchEmailContent request');
            return response()->json(['error' => 'Email ID required'], 400);
        }

        $db = $this->setupPlutoConnection();

        // Try to find email by message_id first (which is the Gmail message ID)
        $email = $db->select('SELECT thread_id, body, message_id FROM emails WHERE message_id = ? AND account_email = ?', [$emailId, $activeEmail])[0] ?? null;

        // If not found by message_id, try by internal id
        if (!$email) {
            $email = $db->select('SELECT thread_id, body, message_id FROM emails WHERE id = ? AND account_email = ?', [$emailId, $activeEmail])[0] ?? null;
        }

        if (!$email) {
            Log::error("Email not found", [
                'email_id' => $emailId,
                'active_email' => $activeEmail,
                'user_id' => auth()->id()
            ]);
            return response()->json(['error' => 'Email not found'], 404);
        }

        $account = $db->select('SELECT * FROM email_accounts WHERE email = ? AND user_id = ? LIMIT 1', [$activeEmail, auth()->id()]);
        if (empty($account)) return response()->json(['error' => 'Account not found'], 404);
        $account = $account[0];

        try {
            if ($account->type === 'google') {
                $client = GmailUtility::getGoogleClient($account);
                $gmail = new Google_Service_Gmail($client);

                Log::info("Fetching thread content", [
                    'email_id' => $emailId,
                    'thread_id' => $email->thread_id,
                    'active_email' => $activeEmail
                ]);

                $threadData = [];

                // Check if we have a valid thread_id
                if (!$email->thread_id) {
                    Log::warning("No thread_id found for email {$emailId}, trying to get single message");
                    // Try to get the single message directly
                    $fullMessage = $gmail->users_messages->get('me', $email->message_id, ['format' => 'full']);
                    $messages = [$fullMessage];
                } else {
                    $thread = $gmail->users_threads->get('me', $email->thread_id, ['format' => 'full']);
                    $messages = $thread->getMessages();
                }

                foreach ($messages as $msg) {
                    try {
                        // Get full message with all parts
                        $fullMessage = $gmail->users_messages->get('me', $msg->getId(), ['format' => 'full']);
                    } catch (\Exception $e) {
                        Log::warning("Failed to fetch message {$msg->getId()}: " . $e->getMessage());
                        continue; // Skip this message and continue with others
                    }

                    $headers = $fullMessage->getPayload()->getHeaders();
                    $from = collect($headers)->firstWhere('name', 'From')['value'] ?? 'Unknown';
                    $subject = collect($headers)->firstWhere('name', 'Subject')['value'] ?? 'No Subject';
                    $date = collect($headers)->firstWhere('name', 'Date')['value'] ?? date('Y-m-d H:i:s', $fullMessage->getInternalDate() / 1000);
                    $body = GmailUtility::getMessageBody($fullMessage);
                    $read = !in_array('UNREAD', $fullMessage->getLabelIds());

                    // Ensure we have content
                    if (empty($body) || $body === '<p>No content available</p>') {
                        Log::warning("Empty body for message {$fullMessage->getId()}, attempting alternative extraction");
                        $body = self::extractMessageContent($fullMessage);
                    }

                    $threadData[] = [
                        'id' => $fullMessage->getId(),
                        'from' => $from,
                        'subject' => $subject,
                        'date' => $date,
                        'body' => $body,
                        'read' => $read,
                    ];

                    // Update using message_id instead of id
                    $db->update('UPDATE emails SET body = ?, updated_at = NOW() WHERE message_id = ? AND account_email = ?', [$body, $fullMessage->getId(), $activeEmail]);
                }

                return response()->json(['thread_id' => $email->thread_id, 'messages' => $threadData]);
            }
        } catch (\Exception $e) {
            Log::error("Error fetching thread content for {$emailId}: " . $e->getMessage());

            // Fallback: return cached content if available
            if ($email->body) {
                Log::info("Returning cached content for email {$emailId}");
                return response()->json([
                    'thread_id' => $email->thread_id,
                    'messages' => [[
                        'id' => $email->message_id ?? $emailId,
                        'from' => 'Unknown',
                        'subject' => 'No Subject',
                        'date' => date('Y-m-d H:i:s'),
                        'body' => $email->body,
                        'read' => true,
                    ]]
                ]);
            }

            return response()->json(['error' => 'Failed to fetch email content'], 500);
        }
    }
    public function emailCounts(Request $request)
    {
        $activeEmail = $request->query('email') ?? Session::get('active_email');
        if (!$activeEmail) return response()->json(['error' => 'No active email selected'], 400);

        // Add input validation
        if (!filter_var($activeEmail, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['error' => 'Invalid email format'], 400);
        }

        $db = $this->setupPlutoConnection();
        $account = $db->select('SELECT * FROM email_accounts WHERE email = ? AND user_id = ? LIMIT 1', [$activeEmail, auth()->id()]);
        if (empty($account)) return response()->json(['error' => 'Account not found'], 404);
        $account = $account[0];

        try {
            $counts = ['inbox' => 0, 'spam' => 0];
            if ($account->type === 'google') {
                $client = GmailUtility::getGoogleClient($account);
                $gmail = new Google_Service_Gmail($client);
                $counts['inbox'] = $this->getMessageCount($gmail, 'in:inbox -in:drafts -in:sent -in:trash -in:spam');
                $counts['spam'] = $this->getMessageCount($gmail, 'in:spam');
            }
            return response()->json($counts);
        } catch (Google_Service_Exception $e) {
            Log::error("Gmail API error for {$activeEmail}: " . $e->getMessage());
            return response()->json(['error' => 'Gmail service temporarily unavailable'], 503);
        } catch (\Exception $e) {
            Log::error("Error fetching email counts for {$activeEmail}: " . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch email counts'], 500);
        }
    }

    public function deleteEmails(Request $request)
    {
        $activeEmail = Session::get('active_email');
        if (!$activeEmail) return response()->json(['error' => 'No active email selected'], 400);

        $emailIds = $request->input('email_ids', []);
        if (empty($emailIds)) return response()->json(['error' => 'No email IDs provided'], 400);

        $db = $this->setupPlutoConnection();
        $account = $db->select('SELECT * FROM email_accounts WHERE email = ? AND user_id = ? LIMIT 1', [$activeEmail, auth()->id()]);
        if (empty($account)) return response()->json(['error' => 'Account not found'], 404);
        $account = $account[0];

        try {
            if ($account->type === 'google') {
                $client = GmailUtility::getGoogleClient($account);
                $gmail = new Google_Service_Gmail($client);
                foreach ($emailIds as $id) {
                    $gmail->users_messages->trash('me', $id);
                    $db->update('UPDATE emails SET category = "Trash", updated_at = NOW() WHERE id = ? AND account_email = ?', [$id, $activeEmail]);
                }
                return response()->json(['message' => 'Emails moved to Trash']);
            }
        } catch (\Exception $e) {
            Log::error("Error deleting emails for {$activeEmail}: " . $e->getMessage());
            return response()->json(['error' => 'Failed to delete emails'], 500);
        }
    }

    public function updateEmailStatus(Request $request)
    {
        $activeEmail = Session::get('active_email');
        if (!$activeEmail) return response()->json(['error' => 'No active email selected'], 400);

        $emailIds = $request->input('email_ids', []);
        $action = $request->input('action');
        if (empty($emailIds) || !$action) return response()->json(['error' => 'Email IDs and action required'], 400);

        $db = $this->setupPlutoConnection();
        $account = $db->select('SELECT * FROM email_accounts WHERE email = ? AND user_id = ? LIMIT 1', [$activeEmail, auth()->id()]);
        if (empty($account)) return response()->json(['error' => 'Account not found'], 404);
        $account = $account[0];

        try {
            if ($account->type === 'google') {
                $client = GmailUtility::getGoogleClient($account);
                $gmail = new Google_Service_Gmail($client);
                foreach ($emailIds as $id) {
                    $modifyRequest = new \Google_Service_Gmail_ModifyMessageRequest();
                    $modifyRequest->setRemoveLabelIds($action === 'read' ? ['UNREAD'] : []);
                    $modifyRequest->setAddLabelIds($action === 'unread' ? ['UNREAD'] : []);
                    $gmail->users_messages->modify('me', $id, $modifyRequest);
                    $db->update('UPDATE emails SET `read` = ? WHERE id = ? AND account_email = ?', [$action === 'read' ? 1 : 0, $id, $activeEmail]);
                }
                return response()->json(['message' => "Emails marked as $action"]);
            }
        } catch (\Exception $e) {
            Log::error("Error updating email status for {$activeEmail}: " . $e->getMessage());
            return response()->json(['error' => 'Failed to update email status'], 500);
        }
    }

    public function autoDetect(Request $request)
    {
        try {
            $email = $request->input('email');
            if (!$email) {
                return response()->json(['error' => 'Email address is required'], 400);
            }

            $domain = strtolower(explode('@', $email)[1] ?? '');
            if (!$domain) {
                return response()->json(['error' => 'Invalid email address'], 400);
            }

            $providerSettings = [
                'gmail.com' => [
                    'imap_host' => 'imap.gmail.com',
                    'imap_port' => 993,
                    'imap_encryption' => 'ssl',
                    'smtp_host' => 'smtp.gmail.com',
                    'smtp_port' => 587,
                    'smtp_encryption' => 'tls',
                ],
                'outlook.com' => [
                    'imap_host' => 'imap-mail.outlook.com',
                    'imap_port' => 993,
                    'imap_encryption' => 'ssl',
                    'smtp_host' => 'smtp-mail.outlook.com',
                    'smtp_port' => 587,
                    'smtp_encryption' => 'tls',
                ],
                'hotmail.com' => [
                    'imap_host' => 'imap-mail.outlook.com',
                    'imap_port' => 993,
                    'imap_encryption' => 'ssl',
                    'smtp_host' => 'smtp-mail.outlook.com',
                    'smtp_port' => 587,
                    'smtp_encryption' => 'tls',
                ],
                'yahoo.com' => [
                    'imap_host' => 'imap.mail.yahoo.com',
                    'imap_port' => 993,
                    'imap_encryption' => 'ssl',
                    'smtp_host' => 'smtp.mail.yahoo.com',
                    'smtp_port' => 587,
                    'smtp_encryption' => 'tls',
                ],
                'aol.com' => [
                    'imap_host' => 'imap.aol.com',
                    'imap_port' => 993,
                    'imap_encryption' => 'ssl',
                    'smtp_host' => 'smtp.aol.com',
                    'smtp_port' => 587,
                    'smtp_encryption' => 'tls',
                ],
            ];

            if (!isset($providerSettings[$domain])) {
                Log::warning("Auto-detect: No settings found for domain {$domain}");
                return response()->json(['settings' => null, 'message' => 'No auto-detect settings available for this domain'], 200);
            }

            $settings = $providerSettings[$domain];
            Log::info("Auto-detected settings for {$email}", $settings);

            return response()->json(['settings' => $settings, 'message' => 'Settings auto-detected successfully']);
        } catch (\Exception $e) {
            Log::error("Auto-detect error for {$email}: {$e->getMessage()}");
            return response()->json(['error' => 'Failed to auto-detect settings'], 500);
        }
    }

    public function testConnection(Request $request)
    {
        try {
            $data = $request->validate([
                'email' => 'required|email',
                'password' => 'required|string',
                'incoming_host' => 'required|string',
                'incoming_port' => 'required|integer',
                'incoming_encryption' => 'required|string|in:ssl,tls,starttls,none',
                'outgoing_host' => 'required|string',
                'outgoing_port' => 'required|integer',
                'outgoing_encryption' => 'required|string|in:ssl,tls,starttls,none',
            ]);

            $imapMailbox = "{" . $data['incoming_host'] . ":" . $data['incoming_port'];
            if ($data['incoming_encryption'] === 'ssl') {
                $imapMailbox .= "/imap/ssl";
            } elseif ($data['incoming_encryption'] === 'tls' || $data['incoming_encryption'] === 'starttls') {
                $imapMailbox .= "/imap/tls";
            } else {
                $imapMailbox .= "/imap";
            }
            $imapMailbox .= "}INBOX";

            if (!extension_loaded('imap')) {
                Log::error("IMAP extension not loaded");
                return response()->json(['error' => 'IMAP extension is not enabled on the server'], 500);
            }

            $imap = @imap_open($imapMailbox, $data['email'], $data['password'], OP_READONLY, 1);
            if ($imap === false) {
                $imapError = imap_last_error();
                Log::error("IMAP connection failed for {$data['email']}: {$imapError}");
                return response()->json(['error' => "IMAP connection failed: {$imapError}"], 422);
            }
            imap_close($imap);
            Log::info("IMAP connection successful for {$data['email']}");

            $smtpHost = $data['outgoing_host'];
            $smtpPort = $data['outgoing_port'];
            $smtpEncryption = $data['outgoing_encryption'];
            $prefix = $smtpEncryption === 'ssl' ? 'ssl://' : ($smtpEncryption === 'tls' || $smtpEncryption === 'starttls' ? 'tcp://' : '');
            $smtp = @fsockopen($prefix . $smtpHost, $smtpPort, $errno, $errstr, 5);
            if ($smtp === false) {
                Log::error("SMTP connection failed for {$data['email']}: {$errstr} ({$errno})");
                return response()->json(['error' => "SMTP connection failed: {$errstr} ({$errno})"], 422);
            }
            fclose($smtp);
            Log::info("SMTP connection successful for {$data['email']}");

            return response()->json(['message' => 'Connection test successful for IMAP and SMTP']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error("Validation error in testConnection: " . json_encode($e->errors()));
            return response()->json(['error' => 'Invalid input: ' . implode(', ', $e->errors())], 422);
        } catch (\Exception $e) {
            Log::error("Unexpected error in testConnection for {$data['email']}: {$e->getMessage()}");
            return response()->json(['error' => 'Failed to test connection: ' . $e->getMessage()], 500);
        }
    }

    public function getKeywords()
    {
        $keywords = Keyword::all();
        return response()->json($keywords);
    }

    public function debugEmail(Request $request)
    {
        $emailId = $request->query('email_id');
        $activeEmail = Session::get('active_email');

        if (!$emailId || !$activeEmail) {
            return response()->json(['error' => 'Missing email_id or active_email'], 400);
        }

        $db = $this->setupPlutoConnection();

        // Check if email exists by message_id
        $emailByMessageId = $db->select('SELECT * FROM emails WHERE message_id = ? AND account_email = ?', [$emailId, $activeEmail]);

        // Check if email exists by id
        $emailById = $db->select('SELECT * FROM emails WHERE id = ? AND account_email = ?', [$emailId, $activeEmail]);

        // Check all emails for this account
        $allEmails = $db->select('SELECT id, message_id, thread_id, subject FROM emails WHERE account_email = ? LIMIT 10', [$activeEmail]);

        return response()->json([
            'email_id_requested' => $emailId,
            'active_email' => $activeEmail,
            'found_by_message_id' => count($emailByMessageId),
            'found_by_id' => count($emailById),
            'email_by_message_id' => $emailByMessageId,
            'email_by_id' => $emailById,
            'recent_emails' => $allEmails
        ]);
    }

    public function testKeyword(Request $request)
    {
        $request->validate(['text' => 'required|string']);
        $text = strtolower($request->input('text'));
        $keywords = Cache::remember("keywords_global", 3600, function () {
            return Keyword::all()->groupBy('type')->toArray();
        });
        $status = 'unknown';
        $matchedKeyword = null;
        $priority = ['hard_bounce', 'soft_bounce', 'no_longer', 'unsubscribe', 'automatic_reply'];

        foreach ($priority as $type) {
            foreach ($keywords[$type] ?? [] as $keyword) {
                if (preg_match('/\b' . preg_quote($keyword['keyword'], '/') . '\b/i', $text)) {
                    $status = $type;
                    $matchedKeyword = $keyword['keyword'];
                    break 2;
                }
            }
        }

        return response()->json(['status' => $status, 'matchedKeyword' => $matchedKeyword]);
    }

    public function storeKeyword(Request $request)
    {
        $data = $request->validate([
            'keyword' => 'required|string|min:1|max:255',
            'type' => 'required|in:unsubscribe,automatic_reply,no_longer,hard_bounce,soft_bounce',
        ]);

        $keyword = Keyword::create([
            'keyword' => $data['keyword'],
            'type' => $data['type'],
        ]);
        Cache::forget("keywords_user_" . auth()->id());

        return response()->json(['success' => true, 'keyword' => $keyword]);
    }
    public function deleteKeyword(Request $request, $id)
    {
        $keyword = Keyword::find($id);
        if (!$keyword) {
            return response()->json(['success' => false, 'error' => 'Keyword not found'], 404);
        }

        $keyword->delete();
        Cache::forget("keywords_user_" . auth()->id());

        return response()->json(['success' => true]);
    }

    private function getMessageCount($gmail, $query)
    {
        try {
            $totalCount = 0;
            $nextPageToken = null;
            do {
                $response = $gmail->users_messages->listUsersMessages('me', [
                    'maxResults' => 500,
                    'q' => $query,
                    'pageToken' => $nextPageToken,
                ]);
                $messages = $response->getMessages() ?: [];
                $totalCount += count($messages);
                $nextPageToken = $response->getNextPageToken();
            } while ($nextPageToken);
            return $totalCount;
        } catch (\Exception $e) {
            Log::error("Error getting message count for query '$query': " . $e->getMessage());
            return 0;
        }
    }

    private function extractMessageContent($message)
    {
        $payload = $message->getPayload();
        if (!$payload) return 'No content available';

        $content = '';
        $parts = $payload->getParts();

        if (empty($parts)) {
            // Single part message
            $body = $payload->getBody();
            if ($body && $body->getData()) {
                $content = base64_decode(str_replace(['-', '_'], ['+', '/'], $body->getData()));
            }
        } else {
            // Multipart message - extract all text content
            $content = $this->extractFromParts($parts);
        }

        if (empty($content)) {
            // Fallback: try to get any available text
            $content = $this->extractAnyText($payload);
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
                // Recursively process nested parts
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

    /**
     * Health check endpoint for monitoring
     */
    public function healthCheck()
    {
        try {
            $db = $this->setupPlutoConnection();

            // Check database connection
            $db->select('SELECT 1');

            // Check Gmail API status (if any accounts exist)
            $accounts = $db->select('SELECT COUNT(*) as count FROM email_accounts WHERE user_id = ?', [auth()->id()]);
            $accountCount = $accounts[0]->count ?? 0;

            return response()->json([
                'status' => 'healthy',
                'database' => 'connected',
                'gmail_accounts' => $accountCount,
                'timestamp' => now()->toISOString()
            ]);
        } catch (\Exception $e) {
            Log::error('Health check failed: ' . $e->getMessage());
            return response()->json([
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
                'timestamp' => now()->toISOString()
            ], 503);
        }
    }

    /**
     * Trigger manual sync for a specific account and category
     */
    public function triggerOnDemandSync(Request $request)
    {
        try {
            $email = $request->input('email') ?? Session::get('active_email');
            $category = strtolower($request->input('category', 'inbox'));

            if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return response()->json(['success' => false, 'error' => 'Invalid email format'], 400);
            }

            if (!in_array($category, ['inbox', 'spam'])) {
                return response()->json(['success' => false, 'error' => 'Invalid category'], 400);
            }

            // Dispatch sync job immediately
            LiveEmailFetch::dispatch($email, $category)
                ->onQueue('email-sync')
                ->onConnection('database');

            return response()->json([
                'success' => true,
                'message' => 'Sync job dispatched successfully',
                'email' => $email,
                'category' => $category
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to trigger manual sync", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['success' => false, 'error' => 'Failed to trigger sync'], 500);
        }
    }

    /**
     * Get sync status for a specific account and category
     */
    public function getSyncStatus(Request $request)
    {
        try {
            $email = $request->query('email') ?? Session::get('active_email');
            $category = strtolower($request->query('category', 'inbox'));

            if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return response()->json(['error' => 'Invalid email format'], 400);
            }

            if (!in_array($category, ['inbox', 'spam'])) {
                return response()->json(['error' => 'Invalid category'], 400);
            }

            $db = $this->setupPlutoConnection();

            $syncStatus = $db->selectOne(
                'SELECT status, synced_count, total_count, updated_at FROM sync_status WHERE account_email = ? AND category = ?',
                [$email, $category]
            );

            if (!$syncStatus) {
                return response()->json([
                    'status' => 'not_started',
                    'synced_count' => 0,
                    'total_count' => 0,
                    'last_updated' => null,
                    'progress' => 0
                ]);
            }

            $progress = $syncStatus->total_count > 0 ? round(($syncStatus->synced_count / $syncStatus->total_count) * 100, 1) : 0;

            return response()->json([
                'status' => $syncStatus->status,
                'synced_count' => (int)$syncStatus->synced_count,
                'total_count' => (int)$syncStatus->total_count,
                'last_updated' => $syncStatus->updated_at,
                'progress' => $progress
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to get sync status", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to get sync status'], 500);
        }
    }

    /**
     * Reset sync status for a specific account and category
     */
    public function resetSyncStatus(Request $request)
    {
        try {
            $email = $request->input('email') ?? Session::get('active_email');
            $category = strtolower($request->input('category', 'inbox'));

            if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return response()->json(['success' => false, 'error' => 'Invalid email format'], 400);
            }

            if (!in_array($category, ['inbox', 'spam'])) {
                return response()->json(['success' => false, 'error' => 'Invalid category'], 400);
            }

            $db = $this->setupPlutoConnection();

            // Reset sync status to allow fresh sync
            $db->update(
                'UPDATE sync_status SET status = "not_started", synced_count = 0, total_count = 0, page_token = NULL, last_uid = NULL, updated_at = NOW() 
                WHERE account_email = ? AND category = ?',
                [$email, $category]
            );

            Log::info("Sync status reset", ['email' => $email, 'category' => $category]);

            return response()->json([
                'success' => true,
                'message' => 'Sync status reset successfully',
                'email' => $email,
                'category' => $category
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to reset sync status", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['success' => false, 'error' => 'Failed to reset sync status'], 500);
        }
    }

    /**
     * Get sync status for all accounts with Gmail statistics and job status
     */
    public function getAllSyncStatus(Request $request)
    {
        try {
            $db = $this->setupPlutoConnection();

            $syncStatuses = $db->select(
                'SELECT account_email, category, status, synced_count, total_count, updated_at 
                FROM sync_status 
                ORDER BY updated_at DESC'
            );

            $formattedStatuses = [];
            foreach ($syncStatuses as $status) {
                // Get Gmail statistics for this account/category
                $gmailStats = $this->getGmailStatistics($status->account_email, $status->category);

                // Check if job is actually running for this account/category
                $jobStatus = $this->checkJobStatus($status->account_email, $status->category);

                // Determine actual status
                $actualStatus = $status->status;
                if ($status->status === 'syncing' && !$jobStatus['is_running']) {
                    $actualStatus = 'failed';
                }

                // Calculate progress based on Gmail total vs synced count
                $progress = $gmailStats['total'] > 0 ? round(($status->synced_count / $gmailStats['total']) * 100, 1) : 0;

                $formattedStatuses[] = [
                    'email' => $status->account_email,
                    'category' => $status->category,
                    'status' => $actualStatus,
                    'synced_count' => (int)$status->synced_count,
                    'total_count' => (int)$status->total_count,
                    'gmail_total' => $gmailStats['total'],
                    'gmail_unread' => $gmailStats['unread'],
                    'needs_sync' => $gmailStats['total'] > $status->synced_count,
                    'progress' => $progress,
                    'last_updated' => $status->updated_at,
                    'job_running' => $jobStatus['is_running'],
                    'job_id' => $jobStatus['job_id']
                ];
            }

            return response()->json([
                'success' => true,
                'sync_statuses' => $formattedStatuses
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to get all sync status", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['success' => false, 'error' => 'Failed to get sync statuses'], 500);
        }
    }

    /**
     * Check if a sync job is currently running for an account/category
     */
    private function checkJobStatus($email, $category)
    {
        try {
            // Check if there's a job in the queue for this account/category
            $jobId = "sync_emails_{$email}_{$category}";

            // Check if job exists in the jobs table with better query
            $job = DB::table('jobs')
                ->where('queue', 'email-sync')
                ->where(function ($query) use ($email, $category) {
                    $query->whereRaw("JSON_EXTRACT(payload, '$.data.email') = ?", [$email])
                        ->whereRaw("JSON_EXTRACT(payload, '$.data.category') = ?", [$category]);
                })
                ->first();

            // Also check failed_jobs table
            $failedJob = DB::table('failed_jobs')
                ->where('queue', 'email-sync')
                ->where(function ($query) use ($email, $category) {
                    $query->whereRaw("JSON_EXTRACT(payload, '$.data.email') = ?", [$email])
                        ->whereRaw("JSON_EXTRACT(payload, '$.data.category') = ?", [$category]);
                })
                ->first();

            // Check if job is currently being processed
            $isRunning = false;
            if ($job && !$failedJob) {
                // Job exists in queue and hasn't failed
                $isRunning = true;
            }

            Log::info("Job status check", [
                'email' => $email,
                'category' => $category,
                'job_exists' => $job ? true : false,
                'failed_job' => $failedJob ? true : false,
                'is_running' => $isRunning
            ]);

            return [
                'is_running' => $isRunning,
                'job_id' => $job ? $job->id : null
            ];
        } catch (\Exception $e) {
            Log::warning("Failed to check job status", [
                'email' => $email,
                'category' => $category,
                'error' => $e->getMessage()
            ]);
            return [
                'is_running' => false,
                'job_id' => null
            ];
        }
    }

    /**
     * Start live email fetching for all accounts
     */
    public function startLiveFetch(Request $request)
    {
        try {
            $db = $this->setupPlutoConnection();
            $accounts = $db->select('SELECT email FROM email_accounts WHERE status = "active"');

            if (empty($accounts)) {
                return response()->json(['success' => false, 'error' => 'No active email accounts found']);
            }

            $categories = ['inbox', 'spam'];
            $totalJobs = 0;

            foreach ($accounts as $account) {
                foreach ($categories as $category) {
                    // Dispatch live fetch job for each account/category
                    \App\Jobs\EmailSystem\LiveEmailFetch::dispatch($account->email, $category);
                    $totalJobs++;
                }
            }

            Log::info("Live email fetch started", [
                'accounts' => count($accounts),
                'total_jobs' => $totalJobs
            ]);

            return response()->json([
                'success' => true,
                'message' => "Started live email fetching for {$totalJobs} account/category combinations",
                'accounts' => count($accounts),
                'total_jobs' => $totalJobs
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to start live email fetch", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['success' => false, 'error' => 'Failed to start live email fetch: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get Gmail statistics for an account and category
     */
    private function getGmailStatistics($email, $category)
    {
        try {
            $db = $this->setupPlutoConnection();
            $account = $db->selectOne('SELECT * FROM email_accounts WHERE email = ?', [$email]);

            if (!$account || $account->type !== 'google') {
                return ['total' => 0, 'unread' => 0];
            }

            $client = GmailUtility::getGoogleClient($account);
            $gmail = new Google_Service_Gmail($client);

            // Build proper query for each category
            $query = '';
            if ($category === 'inbox') {
                $query = 'in:inbox -in:drafts -in:sent -in:trash -in:spam';
            } elseif ($category === 'spam') {
                $query = 'in:spam';
            } else {
                // For other categories, use a more specific query
                $query = "in:{$category}";
            }

            // Get total count with better error handling
            $totalCount = 0;
            try {
                $totalParams = [
                    'q' => $query,
                    'maxResults' => 1
                ];
                $totalResponse = $gmail->users_messages->listUsersMessages('me', $totalParams);
                $totalCount = $totalResponse->getResultSizeEstimate() ?? 0;
            } catch (\Exception $e) {
                Log::warning("Failed to get total count for Gmail", [
                    'email' => $email,
                    'category' => $category,
                    'query' => $query,
                    'error' => $e->getMessage()
                ]);
            }

            // Get unread count
            $unreadCount = 0;
            try {
                $unreadParams = [
                    'q' => $query . ' is:unread',
                    'maxResults' => 1
                ];
                $unreadResponse = $gmail->users_messages->listUsersMessages('me', $unreadParams);
                $unreadCount = $unreadResponse->getResultSizeEstimate() ?? 0;
            } catch (\Exception $e) {
                Log::warning("Failed to get unread count for Gmail", [
                    'email' => $email,
                    'category' => $category,
                    'error' => $e->getMessage()
                ]);
            }

            Log::info("Gmail statistics retrieved", [
                'email' => $email,
                'category' => $category,
                'total' => $totalCount,
                'unread' => $unreadCount,
                'query' => $query
            ]);

            return [
                'total' => $totalCount,
                'unread' => $unreadCount
            ];
        } catch (\Exception $e) {
            Log::warning("Failed to get Gmail statistics", [
                'email' => $email,
                'category' => $category,
                'error' => $e->getMessage()
            ]);
            return ['total' => 0, 'unread' => 0];
        }
    }
}
