<?php

namespace App\Http\Controllers\System\Central\EmailSystem;

use App\Http\Controllers\Controller;
use Google_Client;
use Google_Service_Gmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;

class GoogleAuthController extends Controller
{
    private function setupPlutoConnection(Request $request)
    {
        $host = $request->input('db_host', '127.0.0.1');
        $port = '3306';
        $database = 'pluto';
        $username = 'root'; // Replace with your actual username
        $password = ''; // Replace with your actual password

        $connection = [
            'driver' => 'mysql',
            'host' => $host,
            'port' => $port,
            'database' => $database,
            'username' => $username,
            'password' => $password,
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
        ];

        DB::purge('pluto');
        config(['database.connections.pluto' => $connection]);
        return DB::connection('pluto');
    }

    public function redirect(Request $request)
    {
        $client = new Google_Client();
        $client->setAuthConfig(storage_path('app/client_secret.json'));
        $client->addScope([
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ]);

        $redirectUri = env('GOOGLE_REDIRECT_URI', 'http://127.0.0.1:8000/auth/google/callback-new');
        $client->setRedirectUri($redirectUri);
        Log::info("Redirect URI set to: " . $redirectUri);

        $client->setAccessType('offline');
        $client->setPrompt('consent');

        $state = bin2hex(random_bytes(16));
        $client->setState($state);
        Session::put('google_auth_state', $state);
        Session::put('google_email', $request->query('email'));
        Log::info("Redirecting to Google from resources/views/system/central/email-system/mail-config, session: " . json_encode(Session::all()));

        return redirect($client->createAuthUrl());
    }
    public function callback(Request $request)
    {
        $client = new Google_Client();
        $client->setAuthConfig(storage_path('app/client_secret.json'));
        $client->setRedirectUri(config('services.google.redirect'));

        try {
            $state = $request->input('state');
            $storedState = Session::get('google_auth_state');
            if (!$state || $state !== $storedState) {
                Log::error("Invalid state parameter: expected {$storedState}, received {$state}");
                return redirect('/mail-config')->with('error', 'Invalid state parameter');
            }

            $token = $client->fetchAccessTokenWithAuthCode($request->input('code'));
            if (isset($token['error'])) {
                throw new \Exception("Token fetch failed: " . $token['error']);
            }

            $client->setAccessToken($token);
            $gmail = new Google_Service_Gmail($client);
            $profile = $gmail->users->getProfile('me');
            $email = $profile->getEmailAddress();

            $db = $this->setupPlutoConnection($request);
            Log::info("Pluto connection successful for Google callback");

            // Look for a pre-saved record with null email for the current user
            $preSaved = $db->select(
                'SELECT id FROM email_accounts WHERE user_id = ? AND email IS NULL ORDER BY created_at DESC LIMIT 1',
                [auth()->id()]
            )[0] ?? null;

            if ($preSaved) {
                // Update the pre-saved record
                $db->update(
                    'UPDATE email_accounts SET email = ?, type = ?, access_token = ?, refresh_token = ?, status = ?, updated_at = NOW() 
                     WHERE id = ? AND user_id = ?',
                    [$email, 'google', $token['access_token'], $token['refresh_token'] ?? null, 'active', $preSaved->id, auth()->id()]
                );
                Log::info("Updated pre-saved record for email: {$email}, id: {$preSaved->id}");
            } else {
                // Check for an existing record with the same email
                $exists = $db->select(
                    'SELECT COUNT(*) as count FROM email_accounts WHERE email = ? AND user_id = ?',
                    [$email, auth()->id()]
                )[0]->count;

                if ($exists > 0) {
                    // Update existing record
                    $db->update(
                        'UPDATE email_accounts SET type = ?, access_token = ?, refresh_token = ?, status = ?, updated_at = NOW() 
                         WHERE email = ? AND user_id = ?',
                        ['google', $token['access_token'], $token['refresh_token'] ?? null, 'active', $email, auth()->id()]
                    );
                    Log::info("Updated existing record for email: {$email}");
                } else {
                    // Create new record
                    $db->insert(
                        'INSERT INTO email_accounts (user_id, type, email, access_token, refresh_token, status, created_at, updated_at) 
                         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
                        [auth()->id(), 'google', $email, $token['access_token'], $token['refresh_token'] ?? null, 'active']
                    );
                    Log::info("Created new record for email: {$email}");
                }
            }

            Storage::put("tokens/{$email}.json", json_encode($token));
            Session::put('active_email', $email);
            Session::save();
            Log::info("Google OAuth processed for email: {$email}");

            return redirect('/mail-config')->with('success', "Authenticated $email successfully.");
        } catch (\Exception $e) {
            Log::error("Google OAuth callback failed: " . $e->getMessage());
            return redirect('/mail-config')->with('error', 'Authentication failed: ' . $e->getMessage());
        }
    }
    public function switchAccount(Request $request)
    {
        $email = $request->input('email');
        $db = $this->setupPlutoConnection($request);
        $exists = $db->select(
            'SELECT COUNT(*) as count FROM email_accounts WHERE email = ? AND user_id = ?',
            [$email, auth()->id()]
        )[0]->count;

        if ($exists) {
            Session::put('active_email', $email);
            Log::info("Switched active account to: $email");
            return response()->json(['message' => "Switched to $email successfully."]);
        }
        return response()->json(['message' => "Account $email not authenticated."], 400);
    }

    public function getAuthenticatedAccounts()
    {
        $db = $this->setupPlutoConnection(request());
        $accounts = $db->select(
            'SELECT email FROM email_accounts WHERE user_id = ?',
            [auth()->id()]
        );
        $emails = array_map(function ($account) {
            return $account->email;
        }, $accounts);
        return response()->json(['accounts' => $emails, 'active' => Session::get('active_email')]);
    }
}
