<?php

namespace App\Http\Controllers\System\Central\EmailSystem;

use Illuminate\Support\Str;
use Illuminate\Http\Request;
use App\Models\Central\EmailSystem\Audience;
use App\Models\Central\EmailSystem\Subscriber;
use App\Models\Central\EmailSystem\Template;
use App\Models\Central\EmailSystem\Campaign;
use App\Jobs\EmailSystem\SendCampaignEmailJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\Session;
use Laravel\Socialite\Facades\Socialite;
use Google_Client;
use Google_Service_Gmail;
use Google_Service_Gmail_Message;

use App\Http\Controllers\Controller;

class EmailMarketingController extends Controller
{
    private function setupPlutoConnection(Request $request)
    {
        try {
            $host = $request->input('db_host', '127.0.0.1');
            $port = '3306';
            $database = 'pluto';
            $username = 'root'; // Replace with actual username
            $password = '';     // Replace with actual password

            Log::info("Setting up Pluto connection: host=$host, db=$database, user=$username");

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
            $db = DB::connection('pluto');
            $db->getPdo(); // Test connection
            Log::info("Pluto connection established");
            return $db;
        } catch (\Exception $e) {
            Log::error('Failed to setup Pluto connection: ' . $e->getMessage());
            throw new \Exception('Database connection failed: ' . $e->getMessage());
        }
    }

    public function index()
    {
        return view('system.central.email-system.email-scheduling');
    }

    public function mailConfig()
    {
        return view('system.central.email-system.mail-config');
    }

    // Audience Endpoints
    public function getAudiences(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);
            $audiences = Audience::on('pluto')->with('subscribers')->get();
            Log::info('Audiences fetched with subscribers:', $audiences->toArray());
            return response()->json($audiences);
        } catch (\Exception $e) {
            Log::error('Error fetching audiences: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch audiences'], 500);
        }
    }


    public function storeAudience(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);

            Log::info('Store Audience Request Data:', $request->all());

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'time' => 'nullable|string|max:255',
                'timezone' => 'nullable|string|max:255',
            ]);

            Log::info('Validated Audience Data:', $validated);

            $audiences = Audience::on('pluto')->create($validated);

            Log::info('Audience created successfully:', ['id' => $audiences->id]);

            // Return only the required fields
            return response()->json([
                'id' => $audiences->id,
                'name' => $audiences->name,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed for audiences: ' . json_encode($e->errors()));
            return response()->json(['error' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error storing audiences: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to save audiences'], 500);
        }
    }

    public function updateAudience(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $request->validate([
                'name' => 'required|string|max:255',
                'time' => 'nullable|string',
                'timezone' => 'nullable|string',
            ]);
            $audiences = Audience::on('pluto')->findOrFail($id);
            $audiences->update($request->only(['name', 'time', 'timezone']));
            return response()->json($audiences);
        } catch (\Exception $e) {
            Log::error('Error updating audiences: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update audiences'], 500);
        }
    }

    public function deleteAudience(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $audiences = Audience::on('pluto')->findOrFail($id);
            $audiences->delete();
            return response()->json(['message' => 'Audience deleted']);
        } catch (\Exception $e) {
            Log::error('Error deleting audiences: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete audiences'], 500);
        }
    }

    public function showAudience(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $audience = Audience::on('pluto')->with('subscribers')->findOrFail($id);
            return view('system.central.email-system.audience-details', compact('audience'));
        } catch (\Exception $e) {
            Log::error('Error showing audiences: ' . $e->getMessage());
            return redirect()->route('email-scheduler')->with('error', 'Audience not found');
        }
    }

    // Subscriber Endpoints
    public function bulkStoreSubscribers(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);
            $subscribers = $request->input('subscribers');
            foreach ($subscribers as $subscriber) {
                Subscriber::on('pluto')->create($subscriber);
            }
            return response()->json(['message' => 'Subscribers added successfully'], 201);
        } catch (\Exception $e) {
            Log::error('Error storing subscribers: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to save subscribers'], 500);
        }
    }

    public function getSubscribersByAudience(Request $request, $audiencesId)
    {
        try {
            $this->setupPlutoConnection($request);
            $subscribers = Subscriber::on('pluto')->where('audience_id', $audiencesId)->get();
            return response()->json($subscribers);
        } catch (\Exception $e) {
            Log::error('Error fetching subscribers: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch subscribers'], 500);
        }
    }

    public function subscribeSubscriber(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $subscriber = Subscriber::on('pluto')->findOrFail($id);
            $subscriber->update(['status' => 'subscribed']);
            return response()->json(['message' => 'Subscriber subscribed'], 200);
        } catch (\Exception $e) {
            Log::error('Error subscribing subscriber: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to subscribe subscriber'], 500);
        }
    }

    public function updateSubscriber(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'nullable|string|max:255', // <-- changed here
                'email' => 'required|email|max:255',
            ]);
            $subscriber = Subscriber::on('pluto')->findOrFail($id);
            $subscriber->update([
                'first_name' => $request->first_name,
                'last_name' => $request->last_name, // will be null if not provided
                'email' => $request->email,
            ]);
            return response()->json(['message' => 'Subscriber updated successfully', 'subscriber' => $subscriber], 200);
        } catch (\Exception $e) {
            Log::error('Error updating subscriber: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update subscriber'], 500);
        }
    }

    public function unsubscribeSubscriber(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $subscriber = Subscriber::on('pluto')->findOrFail($id);
            $subscriber->update(['status' => 'unsubscribed']);
            return response()->json(['message' => 'Subscriber unsubscribed'], 200);
        } catch (\Exception $e) {
            Log::error('Error unsubscribing subscriber: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to unsubscribe subscriber'], 500);
        }
    }

    public function deleteSubscriber(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $subscriber = Subscriber::on('pluto')->findOrFail($id);
            $subscriber->delete();
            return response()->json(['message' => 'Subscriber deleted'], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting subscriber: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete subscriber'], 500);
        }
    }

    // Template Endpoints
    public function getTemplates(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);
            $templates = Template::on('pluto')->get();
            Log::info('Templates fetched from pluto:', $templates->toArray());
            return response()->json($templates);
        } catch (\Exception $e) {
            Log::error('Error fetching templates: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch templates'], 500);
        }
    }

    public function storeTemplate(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);
            $request->validate([
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'subject' => 'nullable|string|max:255',
            ]);
            $template = Template::on('pluto')->create([
                'title' => $request->title,
                'content' => $request->content,
                'subject' => $request->subject,
                'last_modified' => now(),
            ]);
            return response()->json($template, 201);
        } catch (\Exception $e) {
            Log::error('Error storing template: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to save template'], 500);
        }
    }

    public function updateTemplate(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $request->validate([
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'subject' => 'nullable|string|max:255',
            ]);
            $template = Template::on('pluto')->findOrFail($id);
            $template->update([
                'title' => $request->title,
                'content' => $request->content,
                'subject' => $request->subject,
                'last_modified' => now(),
            ]);
            return response()->json($template);
        } catch (\Exception $e) {
            Log::error('Error updating template: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update template'], 500);
        }
    }

    public function deleteTemplate(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $template = Template::on('pluto')->findOrFail($id);
            $template->delete();
            return response()->json(['message' => 'Template deleted']);
        } catch (\Exception $e) {
            Log::error('Error deleting template: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete template'], 500);
        }
    }

    public function previewTemplate(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $template = Template::on('pluto')->findOrFail($id);
            $emailAccount = DB::connection('pluto')
                ->table('email_accounts')
                ->where('user_id', auth()->id())
                ->where('status', 'active')
                ->first();

            Log::info('Email account data for preview: ' . json_encode($emailAccount ? [$emailAccount] : []));
            Log::info('Raw template content: ' . $template->content);

            $content = $template->content;

            // Subscriber placeholders (mock data for preview)
            $subscriberReplacements = [
                '[first_name]' => 'John',
                '[last_name]' => 'Doe',
                '[email]' => 'subscriber@example.com',
                '[unsubscribe_link]' => url('/unsubscribe/preview')
            ];

            // Email account placeholders
            $emailAccountReplacements = [
                '[sender_email]' => $emailAccount->email ?? 'unknown@example.com',
                '[sender_first_name]' => $emailAccount->first_name ?? 'Sender',
                '[sender_last_name]' => $emailAccount->last_name ?? 'Unknown',
                '[type]' => $emailAccount->type ?? 'N/A',
                '[status]' => $emailAccount->status ?? 'N/A',
                '[phone_number]' => $emailAccount->phone_number ?? 'N/A',
                '[designation]' => $emailAccount->designation ?? 'N/A',
                '[fax]' => $emailAccount->fax ?? 'N/A',
                '[unsubscribe]' => $emailAccount->unsubscribe ?? url('/unsubscribe/preview'),
                '[postal_code]' => $emailAccount->postal_code ?? 'N/A',
                '[address]' => $emailAccount->address ?? 'N/A'
            ];

            $replacements = array_merge($subscriberReplacements, $emailAccountReplacements);
            Log::info('Replacements array: ' . json_encode($replacements));

            foreach ($replacements as $placeholder => $value) {
                $content = str_replace($placeholder, $value, $content);
            }

            Log::info('Processed content: ' . $content);

            return response()->json([
                'title' => $template->title,
                'content' => $content
            ]);
        } catch (\Exception $e) {
            Log::error('Error previewing template: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to preview template'], 500);
        }
    }
    public function getCampaignProgress(Request $request, $campaignId)
    {
        try {
            $this->setupPlutoConnection($request);

            // Fetch stats from email_campaign_logs
            $stats = DB::connection('pluto')
                ->table('email_campaign_logs')
                ->where('campaign_id', $campaignId)
                ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'sending' THEN 1 ELSE 0 END) as sending
            ")
                ->first();

            // Fetch batch_size from email_campaigns table
            $campaign = DB::connection('pluto')
                ->table('email_campaign_logs')
                ->where('id', $campaignId)
                ->select('batch_size')
                ->first();

            $batchSize = $campaign ? (int) $campaign->batch_size : 0;

            // Fetch failed details
            $failedDetails = DB::connection('pluto')
                ->table('email_campaign_logs')
                ->where('campaign_id', $campaignId)
                ->where('status', 'failed')
                ->select('to_email', 'error_message', 'retry_attempts')
                ->limit(50)
                ->get();

            // Save stats to campaign_progress table
            DB::connection('pluto')
                ->table('campaign_progress')
                ->updateOrInsert(
                    ['campaign_id' => $campaignId],
                    [
                        'total_emails' => (int) $stats->total ?? 0,
                        'sent_emails' => (int) $stats->sent ?? 0,
                        'failed_emails' => (int) $stats->failed ?? 0,
                        'pending_emails' => (int) $stats->pending ?? 0,
                        'sending_emails' => (int) $stats->sending ?? 0,
                        'batch_size' => $batchSize,
                        'updated_at' => now(),
                        'status' => 'pending',
                    ]
                );

            $response = [
                'total_emails' => (int) $stats->total ?? 0,
                'sent_emails' => (int) $stats->sent ?? 0,
                'failed_emails' => (int) $stats->failed ?? 0,
                'pending_emails' => (int) $stats->pending ?? 0,
                'sending_emails' => (int) $stats->sending ?? 0,
                'batch_size' => $batchSize,
                'failed_details' => $failedDetails->toArray(),
            ];


            return response()->json($response);
        } catch (\Exception $e) {
            Log::error('Error fetching campaign progress: ' . $e->getMessage(), ['campaign_id' => $campaignId]);
            return response()->json(['error' => 'Failed to fetch progress', 'details' => $e->getMessage()], 500);
        }
    }
    // Campaign Endpoints
    public function getCampaigns(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);
            $campaigns = Campaign::on('pluto')->with(['template', 'audience'])->get();
            return response()->json($campaigns);
        } catch (\Exception $e) {
            Log::error('Error fetching campaigns: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch campaigns'], 500);
        }
    }

    public function storeCampaign(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);

            Log::info('Request data:', $request->all());
            $templateExists = DB::connection('pluto')->table('templates')->where('id', $request->input('template_id'))->exists();
            $audiencesExists = DB::connection('pluto')->table('audiences')->where('id', $request->input('audience_id'))->exists();
            Log::info('Template ID exists: ' . $request->input('template_id'), ['exists' => $templateExists]);
            Log::info('Audience ID exists: ' . $request->input('audience_id'), ['exists' => $audiencesExists]);

            // Force the connection for validation
            DB::setDefaultConnection('pluto');

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'template_id' => 'required|exists:templates,id',
                'audience_id' => 'required|exists:audiences,id',
                'status' => 'nullable|string|in:Draft,Sent,Scheduled'
            ]);

            $campaign = Campaign::on('pluto')->create($validated);
            return response()->json($campaign, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed:', $e->errors());
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error storing campaign: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to save campaign'], 500);
        }
    }
    public function updateCampaign(Request $request, $id)
    {
        try {
            // First establish the connection
            $this->setupPlutoConnection($request);

            // Force the connection for validation
            DB::setDefaultConnection('pluto');

            // Validate with proper connection
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'template_id' => 'required|exists:templates,id', // Remove pluto. prefix
                'audience_id' => 'required|exists:audiences,id', // Remove pluto. prefix
                'status' => 'nullable|string|in:Draft,Sent,Scheduled'
            ]);

            Log::info('Updating campaign with validated data:', $validated);

            $campaign = Campaign::on('pluto')->findOrFail($id);
            $campaign->update($validated);

            Log::info('Campaign updated successfully:', ['id' => $campaign->id]);
            return response()->json($campaign);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed for campaign update:', [
                'errors' => $e->errors(),
                'input' => $request->all()
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating campaign:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'error' => 'Failed to update campaign',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteCampaign(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $campaign = Campaign::on('pluto')->findOrFail($id);
            $campaign->delete();
            return response()->json(['message' => 'Campaign deleted']);
        } catch (\Exception $e) {
            Log::error('Error deleting campaign: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete campaign'], 500);
        }
    }

    public function showCampaign($id)
    {
        try {
            $this->setupPlutoConnection(request());
            $campaign = Campaign::on('pluto')
                ->with(['template', 'audience.subscribers'])
                ->findOrFail($id);

            $emailAccount = DB::connection('pluto')
                ->table('email_accounts')
                ->where('user_id', auth()->id())
                ->where('status', 'active')
                ->first();

            $templateContent = $campaign->template ? $campaign->template->content : 'No template content available';
            $sampleSubscriber = $campaign->audience && $campaign->audience->subscribers->isNotEmpty()
                ? $campaign->audience->subscribers->first()
                : null;

            $replacements = [
                '[email]' => $emailAccount->email ?? 'N/A',
                '[type]' => $emailAccount->type ?? 'N/A',
                '[status]' => $emailAccount->status ?? 'N/A',
                '[first_name]' => $sampleSubscriber ? $sampleSubscriber->first_name : 'N/A',
                '[last_name]' => $sampleSubscriber ? $sampleSubscriber->last_name : 'N/A',
                '[phone_number]' => $sampleSubscriber ? $sampleSubscriber->phone_number : 'N/A',
                '[designation]' => $sampleSubscriber ? $sampleSubscriber->designation : 'N/A',
                '[fax]' => $sampleSubscriber ? $sampleSubscriber->fax : 'N/A',
                '[unsubscribe_link]' => $sampleSubscriber ? url('/unsubscribe/' . $sampleSubscriber->id) : 'N/A',
                '[postal_code]' => $sampleSubscriber ? $sampleSubscriber->postal_code : 'N/A',
                '[address]' => $sampleSubscriber ? $sampleSubscriber->address : 'N/A',
            ];

            foreach ($replacements as $placeholder => $value) {
                $templateContent = str_replace($placeholder, $value, $templateContent);
            }

            $response = [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'status' => $campaign->status,
                'template_id' => $campaign->template_id,
                'template_title' => $campaign->template ? $campaign->template->title : 'N/A',
                'template_content' => $templateContent,
                'audience_id' => $campaign->audience_id,
                'audience_name' => $campaign->audience ? $campaign->audience->name : 'N/A',
                'subscribers' => $campaign->audience ? $campaign->audience->subscribers->map(function ($subscriber) {
                    return [
                        'id' => $subscriber->id,
                        'first_name' => $subscriber->first_name ?? 'N/A',
                        'last_name' => $subscriber->last_name ?? 'N/A',
                        'email' => $subscriber->email,
                        'status' => $subscriber->status,
                        'phone_number' => $subscriber->phone_number ?? 'N/A',
                        'designation' => $subscriber->designation ?? 'N/A',
                        'fax' => $subscriber->fax ?? 'N/A',
                        'postal_code' => $subscriber->postal_code ?? 'N/A',
                        'address' => $subscriber->address ?? 'N/A',
                    ];
                })->toArray() : [],
                'email_accounts' => $emailAccount ? [$emailAccount->email] : [],
            ];

            Log::info('Campaign preview data fetched:', ['campaign_id' => $id]);
            return response()->json($response);
        } catch (\Exception $e) {
            Log::error('Error showing campaign: ' . $e->getMessage(), ['campaign_id' => $id]);
            return response()->json(['error' => 'Failed to retrieve campaign', 'details' => $e->getMessage()], 500);
        }
    }
    public function getSendSettings()
    {
        return response()->json([]);
    }

    public function storeSendSettings(Request $request)
    {
        return response()->json(['message' => 'Send settings not implemented yet']);
    }
    // Email Account Endpoints
    public function getEmailAccounts(Request $request)
    {
        try {
            $db = $this->setupPlutoConnection($request);
            $accounts = $db->select(
                'SELECT id, user_id, type, email, password, incoming_host, incoming_port, incoming_encryption, outgoing_host, outgoing_port, outgoing_encryption, access_token, refresh_token, status,timezone, created_at, updated_at 
                FROM email_accounts WHERE user_id = ?',
                [auth()->id()]
            );
            return response()->json($accounts);
        } catch (\Exception $e) {
            Log::error('Error fetching email accounts: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch email accounts'], 500);
        }
    }

    // Email Account Endpoints
    public function getEmailAccountPlaceholders(Request $request)
    {
        try {
            if (!auth()->check()) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $db = $this->setupPlutoConnection($request);
            $accounts = $db->select(
                'SELECT id, user_id, type, email, status, first_name, last_name, phone_number, designation, fax, unsubscribe, postal_code, address 
             FROM email_accounts WHERE user_id = ? AND status = ?',
                [auth()->id(), 'active']
            );
            Log::info('Query results', ['accounts' => $accounts]);

            if (empty($accounts)) {
                return response()->json(['message' => 'No active email accounts found'], 404);
            }

            $account = $accounts[0];
            $subscriberPlaceholders = [
                ['value' => '[first_name]', 'text' => 'Subscriber First Name'],
                ['value' => '[last_name]', 'text' => 'Subscriber Last Name'],
                ['value' => '[email]', 'text' => 'Subscriber Email'],
                ['value' => '[unsubscribe_link]', 'text' => 'Unsubscribe Link']
            ];

            $emailAccountPlaceholders = [
                ['value' => '[sender_email]', 'key' => 'email', 'text' => 'Sender Email', 'data' => $account->email],
                ['value' => '[sender_first_name]', 'key' => 'first_name', 'text' => 'Sender First Name', 'data' => $account->first_name],
                ['value' => '[sender_last_name]', 'key' => 'last_name', 'text' => 'Sender Last Name', 'data' => $account->last_name],
                ['value' => '[type]', 'key' => 'type', 'text' => 'Account Type', 'data' => $account->type],
                ['value' => '[status]', 'key' => 'status', 'text' => 'Account Status', 'data' => $account->status],
                ['value' => '[phone_number]', 'key' => 'phone_number', 'text' => 'Phone Number', 'data' => $account->phone_number],
                ['value' => '[designation]', 'key' => 'designation', 'text' => 'Designation', 'data' => $account->designation],
                ['value' => '[fax]', 'key' => 'fax', 'text' => 'Fax', 'data' => $account->fax],
                ['value' => '[unsubscribe]', 'key' => 'unsubscribe', 'text' => 'Unsubscribe Link', 'data' => $account->unsubscribe],
                ['value' => '[postal_code]', 'key' => 'postal_code', 'text' => 'Postal Code', 'data' => $account->postal_code],
                ['value' => '[address]', 'key' => 'address', 'text' => 'Address', 'data' => $account->address]
            ];

            Log::info('Returning placeholders', [
                'subscriber' => $subscriberPlaceholders,
                'email_account' => $emailAccountPlaceholders
            ]);

            return response()->json([
                'subscriber_placeholders' => $subscriberPlaceholders,
                'email_account_placeholders' => $emailAccountPlaceholders
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching email account placeholders: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Failed to fetch placeholders', 'details' => $e->getMessage()], 500);
        }
    }

    public function updateEmailAccount(Request $request, $id)
    {
        try {
            $data = $request->validate([
                'email' => 'required|email',
                'password' => 'nullable',
                'incoming_host' => 'nullable',
                'incoming_port' => 'nullable|integer',
                'incoming_encryption' => 'nullable|in:tls,ssl,none',
                'outgoing_host' => 'nullable',
                'outgoing_port' => 'nullable|integer',
                'outgoing_encryption' => 'nullable|in:tls,ssl,none',
                'status' => 'required|in:active,inactive'
            ]);
            $db = $this->setupPlutoConnection($request);
            $exists = $db->select('SELECT COUNT(*) as count FROM email_accounts WHERE id = ? AND user_id = ?', [$id, auth()->id()])[0]->count;
            if ($exists === 0) {
                return response()->json(['error' => 'Email account not found'], 404);
            }

            $currentAccount = $db->select('SELECT * FROM email_accounts WHERE id = ? LIMIT 1', [$id])[0];
            if ($currentAccount->type === 'manual' && ($data['password'] || $data['incoming_host'] || $data['incoming_port'] || $data['incoming_encryption'] || $data['outgoing_host'] || $data['outgoing_port'] || $data['outgoing_encryption'])) {
                $password = $data['password'] ?? $currentAccount->password;
                $imapMailbox = "{" . ($data['incoming_host'] ?? $currentAccount->incoming_host) . ":" . ($data['incoming_port'] ?? $currentAccount->incoming_port);
                $imapEncryption = $data['incoming_encryption'] ?? $currentAccount->incoming_encryption;
                if ($imapEncryption === 'ssl')
                    $imapMailbox .= "/imap/ssl";
                elseif ($imapEncryption === 'tls')
                    $imapMailbox .= "/imap/tls";
                else
                    $imapMailbox .= "/imap";
                $imapMailbox .= "}INBOX";

                $imap = @imap_open($imapMailbox, $data['email'], $password, OP_READONLY, 1);
                if ($imap === false) {
                    return response()->json(['error' => 'Invalid incoming settings: ' . imap_last_error()], 422);
                }
                imap_close($imap);

                $smtpHost = $data['outgoing_host'] ?? $currentAccount->outgoing_host;
                $smtpPort = $data['outgoing_port'] ?? $currentAccount->outgoing_port;
                $smtpEncryption = $data['outgoing_encryption'] ?? $currentAccount->outgoing_encryption;
                $smtp = @fsockopen(($smtpEncryption === 'ssl' ? 'ssl://' : ($smtpEncryption === 'tls' ? 'tcp://' : '')) . $smtpHost, $smtpPort, $errno, $errstr, 5);
                if ($smtp === false) {
                    return response()->json(['error' => 'Invalid outgoing settings: ' . $errstr], 422);
                }
                fclose($smtp);
            }

            $db->update(
                'UPDATE email_accounts SET email = ?, password = ?, incoming_host = ?, incoming_port = ?, incoming_encryption = ?, outgoing_host = ?, outgoing_port = ?, outgoing_encryption = ?, status = ?, updated_at = NOW() 
                 WHERE id = ? AND user_id = ?',
                [$data['email'], $data['password'] ?? null, $data['incoming_host'] ?? null, $data['incoming_port'] ?? null, $data['incoming_encryption'] ?? null, $data['outgoing_host'] ?? null, $data['outgoing_port'] ?? null, $data['outgoing_encryption'] ?? null, $data['status'], $id, auth()->id()]
            );

            $updatedAccount = $db->select('SELECT * FROM email_accounts WHERE id = ? LIMIT 1', [$id])[0];
            return response()->json($updatedAccount);
        } catch (\Exception $e) {
            Log::error('Error updating email account: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update email account'], 500);
        }
    }

    public function switchAccount(Request $request)
    {
        $email = $request->input('email');
        $db = $this->setupPlutoConnection($request);
        $account = $db->select('SELECT * FROM email_accounts WHERE email = ? AND user_id = ?', [$email, auth()->id()]);
        if ($account) {
            Session::put('active_email', $email);
            Session::save();
            return response()->json(['success' => true, 'active' => $email]);
        }
        return response()->json(['success' => false, 'error' => 'Account not found'], 404);
    }

    public function storeEmailAccount(Request $request)
    {
        try {
            $data = $request->validate([
                'type' => 'required|in:google,manual',
                'email' => 'required|email',
                'password' => 'required_if:type,manual',
                'incoming_host' => 'required_if:type,manual',
                'incoming_port' => 'required_if:type,manual|integer',
                'incoming_encryption' => 'required_if:type,manual|in:tls,ssl,none',
                'outgoing_host' => 'required_if:type,manual',
                'outgoing_port' => 'required_if:type,manual|integer',
                'outgoing_encryption' => 'required_if:type,manual|in:tls,ssl,none',
                'access_token' => 'nullable',
                'refresh_token' => 'nullable',
            ]);
            $db = $this->setupPlutoConnection($request);
            $exists = $db->select('SELECT COUNT(*) as count FROM email_accounts WHERE email = ?', [$data['email']])[0]->count;
            if ($exists > 0) {
                return response()->json(['error' => 'Email already exists'], 422);
            }

            if ($data['type'] === 'manual') {
                $imapMailbox = "{" . $data['incoming_host'] . ":" . $data['incoming_port'];
                if ($data['incoming_encryption'] === 'ssl')
                    $imapMailbox .= "/imap/ssl";
                elseif ($data['incoming_encryption'] === 'tls')
                    $imapMailbox .= "/imap/tls";
                else
                    $imapMailbox .= "/imap";
                $imapMailbox .= "}INBOX";
                $imap = @imap_open($imapMailbox, $data['email'], $data['password'], OP_READONLY, 1);
                if ($imap === false) {
                    return response()->json(['error' => 'Invalid IMAP settings: ' . imap_last_error()], 422);
                }
                imap_close($imap);

                $smtpHost = $data['outgoing_host'];
                $smtpPort = $data['outgoing_port'];
                $smtpEncryption = $data['outgoing_encryption'];
                $smtp = @fsockopen(($smtpEncryption === 'ssl' ? 'ssl://' : ($smtpEncryption === 'tls' ? 'tcp://' : '')) . $smtpHost, $smtpPort, $errno, $errstr, 5);
                if ($smtp === false) {
                    return response()->json(['error' => 'Invalid SMTP settings: ' . $errstr], 422);
                }
                fclose($smtp);
            }

            $db->insert(
                'INSERT INTO email_accounts (user_id, type, email, password, incoming_host, incoming_port, incoming_encryption, outgoing_host, outgoing_port, outgoing_encryption, access_token, refresh_token, status, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [auth()->id(), $data['type'], $data['email'], $data['password'] ?? null, $data['incoming_host'] ?? null, $data['incoming_port'] ?? null, $data['incoming_encryption'] ?? null, $data['outgoing_host'] ?? null, $data['outgoing_port'] ?? null, $data['outgoing_encryption'] ?? null, $data['access_token'] ?? null, $data['refresh_token'] ?? null, 'active']
            );

            $newAccount = $db->select('SELECT * FROM email_accounts WHERE email = ? LIMIT 1', [$data['email']])[0];
            return response()->json($newAccount, 201);
        } catch (\Exception $e) {
            Log::error('Error storing email account: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to save email account'], 500);
        }
    }

    public function deleteEmailAccount(Request $request, $id)
    {
        try {
            $db = $this->setupPlutoConnection($request);
            $exists = $db->select('SELECT COUNT(*) as count FROM email_accounts WHERE id = ? AND user_id = ?', [$id, auth()->id()])[0]->count;
            if ($exists === 0) {
                return response()->json(['error' => 'Email account not found'], 404);
            }
            $db->delete('DELETE FROM email_accounts WHERE id = ? AND user_id = ?', [$id, auth()->id()]);
            return response()->json(['message' => 'Email account deleted']);
        } catch (\Exception $e) {
            Log::error('Error deleting email account: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete email account'], 500);
        }
    }

    // Google OAuth
    public function redirectToGoogle()
    {
        return Socialite::driver('google')
            ->scopes(['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.compose'])
            ->with(['access_type' => 'offline', 'prompt' => 'consent'])
            ->redirect();
    }
    public function getRecentCampaignProgress(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);

            $recentCampaigns = DB::connection('pluto')
                ->table('campaign_progress')
                ->leftJoin('campaigns', 'campaign_progress.campaign_id', '=', 'campaigns.id')
                ->select(
                    'campaign_progress.progress_id',
                    'campaign_progress.campaign_id',
                    'campaign_progress.status',
                    'campaign_progress.updated_at',
                    'campaign_progress.sent_emails',
                    'campaign_progress.total_emails',
                    'campaigns.name as campaign_name',
                    'campaigns.status as campaign_status'
                )
                ->orderByDesc('campaign_progress.updated_at')
                ->limit(10)
                ->get();

            // Remove the invalid 'message' column filter. Instead, count started campaigns by status if available
            $campaignStartedCount = DB::connection('pluto')
                ->table('campaign_progress')
                ->where('status', 'started')
                ->count();

            Log::info('Type of recentCampaigns', ['type' => gettype($recentCampaigns), 'is_array' => is_array($recentCampaigns), 'is_collection' => ($recentCampaigns instanceof \Illuminate\Support\Collection)]);
            Log::info('Type of recentCampaigns->toArray()', ['type' => gettype($recentCampaigns->toArray()), 'value' => $recentCampaigns->toArray()]);
            return response()->json([
                'campaigns' => array_values($recentCampaigns->toArray()),
                'started_campaign_count' => $campaignStartedCount
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch campaign progress for dropdown', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch campaign progress'], 500);
        }
    }


    public function handleGoogleCallback(Request $request)
    {
        try {
            $user = Socialite::driver('google')->stateless()->user();
            $email = $user->email;
            $db = $this->setupPlutoConnection($request);
            $exists = $db->select('SELECT COUNT(*) as count FROM email_accounts WHERE email = ?', [$email])[0]->count;

            if ($exists > 0) {
                $db->update(
                    'UPDATE email_accounts SET type = ?, access_token = ?, refresh_token = ?, status = ?, updated_at = NOW() 
                     WHERE email = ? AND user_id = ?',
                    ['google', $user->token, $user->refreshToken, 'active', $email, auth()->id()]
                );
            } else {
                $db->insert(
                    'INSERT INTO email_accounts (user_id, type, email, access_token, refresh_token, status, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
                    [auth()->id(), 'google', $email, $user->token, $user->refreshToken, 'active']
                );
            }
            return redirect('/system/central/email-system/mail-config?google_success=1');
        } catch (\Exception $e) {
            Log::error('Google OAuth error: ' . $e->getMessage());
            return redirect('/system/central/email-system/mail-config?google_error=' . urlencode($e->getMessage()));
        }
    }

    // Preview and Send Endpoints
    public function sendTestEmail(Request $request)
    {
        try {
            $data = $request->validate([
                'content' => 'required|string',
                'from' => 'required|email',
                'to' => 'required|email',
                'subject' => 'required|string|max:255',
            ]);

            $this->setupPlutoConnection($request);
            $account = DB::connection('pluto')->table('email_accounts')
                ->where('email', $data['from'])
                ->where('user_id', auth()->id())
                ->where('status', 'active')
                ->first();

            if (!$account) {
                Log::error('No active email account found for email: ' . $data['from'], [
                    'user_id' => auth()->id(),
                    'from' => $data['from']
                ]);
                return response()->json(['error' => 'Email account not found or inactive'], 404);
            }

            // Log the fetched account data to debug
            Log::info('Fetched email account for sending test email: ' . json_encode($account));

            // Replace placeholders in content
            $content = $data['content'];
            $subscriberReplacements = [
                '[first_name]' => 'Test Subscriber', // Mock data for test email
                '[last_name]' => 'User',
                '[email]' => $data['to'],
                '[unsubscribe_link]' => url('/unsubscribe/test')
            ];

            $emailAccountReplacements = [
                '[sender_email]' => $account->email ?? 'unknown@example.com',
                '[sender_first_name]' => $account->first_name ?? 'Sender',
                '[sender_last_name]' => $account->last_name ?? 'Unknown',
                '[type]' => $account->type ?? 'N/A',
                '[status]' => $account->status ?? 'N/A',
                '[phone_number]' => $account->phone_number ?? 'N/A',
                '[designation]' => $account->designation ?? 'N/A',
                '[fax]' => $account->fax ?? 'N/A',
                '[unsubscribe]' => $account->unsubscribe ?? url('/unsubscribe/test'),
                '[postal_code]' => $account->postal_code ?? 'N/A',
                '[address]' => $account->address ?? 'N/A'
            ];

            $replacements = array_merge($subscriberReplacements, $emailAccountReplacements);
            Log::info('Replacements for test email: ' . json_encode($replacements));

            foreach ($replacements as $placeholder => $value) {
                $content = str_replace($placeholder, $value, $content);
            }

            Log::info('Processed email content: ' . $content);

            if ($account->type === 'google') {
                $client = $this->getGoogleClient($account);
                $gmail = new Google_Service_Gmail($client);
                $message = $this->createGmailMessage($data['from'], $data['to'], $data['subject'], $content);
                $gmail->users_messages->send('me', $message);
            } else {
                $transport = (new \Swift_SmtpTransport($account->outgoing_host, $account->outgoing_port, $account->outgoing_encryption))
                    ->setUsername($account->email)
                    ->setPassword($account->password);
                $mailer = new \Swift_Mailer($transport);
                $message = (new \Swift_Message($data['subject']))
                    ->setFrom($data['from'])
                    ->setTo($data['to'])
                    ->setBody($content, 'text/html');
                $mailer->send($message);
            }

            // Log the test email
            DB::connection('pluto')->table('email_test_logs')->insert([
                'user_id' => auth()->id(),
                'from_email' => $data['from'],
                'to_email' => $data['to'],
                'subject' => $data['subject'],
                'status' => 'sent',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info('Test email sent successfully', [
                'from' => $data['from'],
                'to' => $data['to'],
                'subject' => $data['subject']
            ]);
            return response()->json(['message' => 'Test email sent successfully']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed for test email: ' . json_encode($e->errors()));
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error sending test email: ' . $e->getMessage(), [
                'from' => $data['from'] ?? 'N/A',
                'to' => $data['to'] ?? 'N/A'
            ]);
            DB::connection('pluto')->table('email_test_logs')->insert([
                'user_id' => auth()->id(),
                'from_email' => $data['from'] ?? 'N/A',
                'to_email' => $data['to'] ?? 'N/A',
                'subject' => $data['subject'] ?? 'N/A',
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            return response()->json(['error' => 'Failed to send test email', 'details' => $e->getMessage()], 500);
        }
    }


    public function sendEmail(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);

            $data = $request->validate([
                'campaign_id' => 'required|exists:pluto.campaigns,id',
                'from_emails' => 'required|array|min:1',
                'from_emails.*' => 'email',
                'subject' => 'required|string|max:255',
                'time_gap' => 'required|integer|min:0',
                'batch_size' => 'required|integer|min:1',
                'timezone' => 'nullable|string|timezone',
                'regions' => 'nullable|string',
                'is_scheduled' => 'nullable|boolean',
            ]);

            $isScheduled = $request->input('is_scheduled', false);
            $campaign = Campaign::on('pluto')
                ->with(['template', 'audience.subscribers'])
                ->findOrFail($data['campaign_id']);

            \Log::info('DEBUG: Loaded campaign', ['campaign' => $campaign->toArray()]);
            \Log::info('DEBUG: Loaded campaign audience', ['audience' => optional($campaign->audience)->toArray()]);

            if (!$campaign->template) {
                return response()->json(['error' => 'Template not found'], 404);
            }

            $subscribers = $campaign->audience->subscribers->where('status', 'subscribed');
            if ($subscribers->isEmpty()) {
                return response()->json(['error' => 'No subscribed subscribers found for this campaign'], 400);
            }

            $activeAccounts = DB::connection('pluto')
                ->table('email_accounts')
                ->where('user_id', auth()->id())
                ->where('status', 'active')
                ->whereIn('email', $data['from_emails'])
                ->get(['id', 'email', 'type', 'region'])
                ->toArray();

            if (empty($activeAccounts)) {
                return response()->json(['error' => 'No active email accounts available for the selected emails'], 400);
            }

            // Log the selected email accounts for debugging
            Log::info('Selected email accounts for campaign', [
                'campaign_id' => $data['campaign_id'],
                'selected_emails' => $data['from_emails'],
                'active_accounts' => $activeAccounts,
                'user_id' => auth()->id()
            ]);

            $progressId = Str::uuid()->toString();
            $emailAccountCount = count($activeAccounts);
            $batchSize = $data['batch_size'];
            $totalCount = $emailAccountCount * $batchSize; // Total count as email accounts × batch size
            $pendingEmails = $subscribers->count();

            DB::connection('pluto')
                ->table('campaign_progress')
                ->insert([
                    'progress_id' => $progressId,
                    'campaign_id' => $data['campaign_id'],
                    'from_email' => implode(',', array_column($activeAccounts, 'email')),
                    'total_emails' => $totalCount,
                    'sent_emails' => 0,
                    'failed_emails' => 0,
                    'pending_emails' => $pendingEmails,
                    'sending_emails' => 0,
                    'batch_size' => $batchSize,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            $subscribers = $subscribers->values();
            $totalSubscribers = $subscribers->count();
            $timeGap = $data['time_gap'];
            $delay = 0;

            $accountUsage = array_fill(0, count($activeAccounts), 0);
            $availableAccounts = $activeAccounts;
            $assignedSubscribers = 0;

            $subscriberChunks = $subscribers->chunk($batchSize);

            DB::connection('pluto')->beginTransaction();
            try {
                foreach ($subscriberChunks as $chunk) {
                    if (empty($availableAccounts)) {
                        Log::warning('No available email accounts remaining for campaign', [
                            'campaign_id' => $data['campaign_id'],
                            'remaining_subscribers' => $totalSubscribers - $assignedSubscribers,
                        ]);
                        break;
                    }

                    $account = array_shift($availableAccounts);
                    $accountIndex = array_search($account, $activeAccounts);

                    foreach ($chunk as $subscriber) {
                        $region = $account->region ?? ($data['regions'] ? explode(',', $data['regions'])[0] : null);
                        $timezone = $isScheduled ? ($data['timezone'] ?? null) : null;

                        // Lock the row to prevent concurrent inserts
                        $existingLog = DB::connection('pluto')
                            ->table('email_campaign_logs')
                            ->where('campaign_id', $campaign->id)
                            ->where('subscriber_id', $subscriber->id)
                            ->where('progress_id', $progressId)
                            ->lockForUpdate()
                            ->first();

                        if ($existingLog) {
                            Log::info('Skipping duplicate log entry', [
                                'campaign_id' => $campaign->id,
                                'subscriber_id' => $subscriber->id,
                                'progress_id' => $progressId,
                                'email' => $subscriber->email,
                            ]);
                            continue;
                        }

                        $trackingId = uniqid();
                        DB::connection('pluto')->table('email_campaign_logs')->insert([
                            'progress_id' => $progressId,
                            'campaign_id' => $campaign->id,
                            'subscriber_id' => $subscriber->id,
                            'from_email' => $account->email,
                            'to_email' => $subscriber->email,
                            'region' => $region,
                            'timezone' => $timezone,
                            'batch_size' => $batchSize,
                            'status' => 'pending',
                            'tracking_open' => false,
                            'tracking_clicks' => json_encode([]),
                            'tracking_id' => $trackingId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);


                        Log::info('Dispatching SendCampaignEmailJob', [
                            'campaign_id' => $data['campaign_id'],
                            'from_email' => $account->email,
                            'subscriber_id' => $subscriber->id,
                            'region' => $region,
                            'timezone' => $timezone,
                            'batch_size' => $batchSize,
                            'delay' => $delay,
                            'progress_id' => $progressId,
                        ]);

                        SendCampaignEmailJob::dispatch(
                            $data['campaign_id'],
                            $account->email,
                            $data['subject'],
                            $campaign->template->content,
                            $subscriber->id,
                            $region,
                            $timezone,
                            $progressId,
                            $batchSize
                        )
                            ->onQueue('emails')
                            ->delay(now()->addSeconds($delay));

                        $delay += $timeGap;
                        $accountUsage[$accountIndex]++;
                        $assignedSubscribers++;
                    }

                    if ($accountUsage[$accountIndex] < $batchSize) {
                        $availableAccounts[] = $account;
                    }
                }

                DB::connection('pluto')->commit();
            } catch (\Exception $e) {
                DB::connection('pluto')->rollBack();
                Log::error('Failed to process email campaign logs', [
                    'campaign_id' => $data['campaign_id'],
                    'error' => $e->getMessage(),
                ]);
                throw $e;
            }

            $campaign->update(['status' => 'Sending']);

            $response = [
                'message' => 'Campaign email sending started',
                'campaign_id' => $data['campaign_id'],
                'progress_id' => $progressId,
                'total_subscribers' => $totalSubscribers,
                'total_count' => $totalCount,
                'assigned_subscribers' => $assignedSubscribers,
                'active_accounts' => array_column($activeAccounts, 'email'),
                'batch_size' => $batchSize,
            ];

            if ($assignedSubscribers < $totalSubscribers) {
                $response['warning'] = 'Not all subscribers were assigned due to email account limits';
                $response['unassigned_subscribers'] = $totalSubscribers - $assignedSubscribers;
            }

            return response()->json($response);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed for send email: ' . json_encode($e->errors()));
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Failed to start email campaign: ' . $e->getMessage(), ['campaign_id' => $data['campaign_id'] ?? 'N/A']);
            return response()->json(['error' => 'Failed to start campaign', 'details' => $e->getMessage()], 500);
        }
    }

    public function scheduleEmail(Request $request)
    {
        Log::info('Schedule email request data:', $request->all());
        try {
            $this->setupPlutoConnection($request);

            $data = $request->validate([
                'campaign_id' => 'required|exists:pluto.campaigns,id',
                'from_emails' => 'required|array|min:1',
                'from_emails.*' => [
                    'email',
                    function ($attribute, $value, $fail) {
                        $exists = DB::connection('pluto')
                            ->table('email_accounts')
                            ->where('email', $value)
                            ->where('user_id', auth()->id())
                            ->where('status', 'active')
                            ->exists();

                        if (!$exists) {
                            $fail('The selected email account is not available or active');
                        }
                    }
                ],
                'scheduled_at' => 'required|date|after:now',
                'timezone' => 'required|timezone',
                'time_gap' => 'required|integer|min:0',
                'batch_size' => 'required|integer|min:1',
                'subject' => 'required|string|max:255',
                'regions' => 'nullable|string',
                'is_scheduled' => 'nullable|boolean',
            ]);

            $isScheduled = $request->input('is_scheduled', true); // Default to true for scheduled emails
            $campaign = Campaign::on('pluto')
                ->with(['template', 'audience.subscribers'])
                ->findOrFail($data['campaign_id']);

            if (!$campaign->template) {
                return response()->json(['error' => 'Template not found'], 404);
            }

            $subscribers = $campaign->audience->subscribers->where('status', 'subscribed');
            if ($subscribers->isEmpty()) {
                return response()->json(['error' => 'No subscribed subscribers found for this campaign'], 400);
            }

            $activeAccounts = DB::connection('pluto')
                ->table('email_accounts')
                ->where('user_id', auth()->id())
                ->where('status', 'active')
                ->whereIn('email', $data['from_emails'])
                ->get(['id', 'email', 'type', 'region'])
                ->toArray();

            if (empty($activeAccounts)) {
                return response()->json(['error' => 'No active email accounts available for the selected emails'], 400);
            }

            $progressId = Str::uuid()->toString();
            $emailAccountCount = count($activeAccounts);
            $batchSize = $data['batch_size'];
            $totalCount = $emailAccountCount * $batchSize; // Total count as email accounts × batch size
            $pendingEmails = $subscribers->count(); // Pending emails as subscriber count

            DB::connection('pluto')
                ->table('campaign_progress')
                ->insert([
                    'progress_id' => $progressId,
                    'campaign_id' => $data['campaign_id'],
                    'from_email' => implode(',', array_column($activeAccounts, 'email')),
                    'total_emails' => $totalCount,
                    'sent_emails' => 0,
                    'failed_emails' => 0,
                    'pending_emails' => $pendingEmails,
                    'sending_emails' => 0,
                    'batch_size' => $batchSize,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            $subscribers = $subscribers->values();
            $totalSubscribers = $subscribers->count();
            $timeGap = $data['time_gap'];
            $scheduledTime = Carbon::parse($data['scheduled_at'], $data['timezone'])->setTimezone('UTC');
            $delay = 0;

            $accountUsage = array_fill(0, count($activeAccounts), 0);
            $availableAccounts = $activeAccounts;
            $assignedSubscribers = 0;

            $subscriberChunks = $subscribers->chunk($batchSize);

            DB::connection('pluto')->beginTransaction();
            try {
                foreach ($subscriberChunks as $chunk) {
                    if (empty($availableAccounts)) {
                        Log::warning('No available email accounts remaining for scheduled campaign', [
                            'campaign_id' => $data['campaign_id'],
                            'remaining_subscribers' => $totalSubscribers - $assignedSubscribers,
                        ]);
                        break;
                    }

                    $account = array_shift($availableAccounts);
                    $accountIndex = array_search($account, $activeAccounts);

                    foreach ($chunk as $subscriber) {
                        $region = $account->region ?? ($data['regions'] ? explode(',', $data['regions'])[0] : null);
                        $timezone = $isScheduled ? ($data['timezone'] ?? null) : null;

                        // Lock the row to prevent concurrent inserts
                        $existingLog = DB::connection('pluto')
                            ->table('email_campaign_logs')
                            ->where('campaign_id', $campaign->id)
                            ->where('subscriber_id', $subscriber->id)
                            ->where('progress_id', $progressId)
                            ->lockForUpdate()
                            ->first();

                        if ($existingLog) {
                            Log::info('Skipping duplicate log entry for scheduled campaign', [
                                'campaign_id' => $campaign->id,
                                'subscriber_id' => $subscriber->id,
                                'progress_id' => $progressId,
                                'email' => $subscriber->email,
                            ]);
                            continue;
                        }

                        $trackingId = uniqid();
                        DB::connection('pluto')->table('email_campaign_logs')->insert([
                            'progress_id' => $progressId,
                            'campaign_id' => $campaign->id,
                            'subscriber_id' => $subscriber->id,
                            'from_email' => $account->email,
                            'to_email' => $subscriber->email,
                            'region' => $region,
                            'timezone' => $timezone,
                            'batch_size' => $batchSize,
                            'status' => 'pending',
                            'tracking_open' => false,
                            'tracking_clicks' => json_encode([]),
                            'tracking_id' => $trackingId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        Log::info('Dispatching SendCampaignEmailJob for scheduled campaign', [
                            'campaign_id' => $data['campaign_id'],
                            'from_email' => $account->email,
                            'subscriber_id' => $subscriber->id,
                            'region' => $region,
                            'timezone' => $timezone,
                            'batch_size' => $batchSize,
                            'delay' => $delay,
                            'progress_id' => $progressId,
                        ]);

                        SendCampaignEmailJob::dispatch(
                            $data['campaign_id'],
                            $account->email,
                            $data['subject'],
                            $campaign->template->content,
                            $subscriber->id,
                            $region,
                            $timezone,
                            $progressId,
                            $batchSize
                        )
                            ->onQueue('emails')
                            ->delay($scheduledTime->copy()->addSeconds($delay));

                        $delay += $timeGap;
                        $accountUsage[$accountIndex]++;
                        $assignedSubscribers++;
                    }

                    if ($accountUsage[$accountIndex] < $batchSize) {
                        $availableAccounts[] = $account;
                    }
                }

                DB::connection('pluto')->commit();
            } catch (\Exception $e) {
                DB::connection('pluto')->rollBack();
                Log::error('Failed to process email campaign logs for scheduled campaign', [
                    'campaign_id' => $data['campaign_id'],
                    'error' => $e->getMessage(),
                ]);
                throw $e;
            }

            $campaign->update([
                'status' => 'Scheduled',
                'scheduled_at' => $scheduledTime,
                'timezone' => $data['timezone'],
            ]);

            $response = [
                'message' => 'Campaign scheduled successfully',
                'campaign_id' => $campaign->id,
                'progress_id' => $progressId,
                'scheduled_at' => $scheduledTime->setTimezone($data['timezone'])->toDateTimeString(),
                'total_subscribers' => $totalSubscribers,
                'total_count' => $totalCount,
                'assigned_subscribers' => $assignedSubscribers,
                'active_accounts' => array_column($activeAccounts, 'email'),
                'batch_size' => $batchSize,
            ];

            if ($assignedSubscribers < $totalSubscribers) {
                $response['warning'] = 'Not all subscribers were assigned due to email account limits';
                $response['unassigned_subscribers'] = $totalSubscribers - $assignedSubscribers;
            }

            Log::info('Email campaign scheduled', [
                'campaign_id' => $campaign->id,
                'scheduled_at' => $scheduledTime->toDateTimeString(),
                'subscriber_count' => $totalSubscribers,
                'assigned_subscribers' => $assignedSubscribers,
                'subject' => $data['subject'],
            ]);

            return response()->json($response);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed for schedule email: ' . json_encode($e->errors()));
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Failed to schedule email campaign: ' . $e->getMessage(), ['campaign_id' => $data['campaign_id'] ?? 'N/A']);
            return response()->json(['error' => 'Failed to schedule campaign', 'details' => $e->getMessage()], 500);
        }
    }
    public function getEmailAccountsByRegion(Request $request)
    {
        try {
            $db = $this->setupPlutoConnection($request);
            $accounts = $db->select(
                'SELECT email, status FROM email_accounts WHERE user_id = ? AND status = ?',
                [auth()->id(), 'active']
            );

            // Group emails by region (derived from email domain)
            $regions = [];
            foreach ($accounts as $account) {
                $email = $account->email;
                // Extract domain and map to region (simplified example)
                $domain = substr(strrchr($email, "@"), 1);
                $regionName = $this->mapDomainToRegion($domain);

                if (!isset($regions[$regionName])) {
                    $regions[$regionName] = [
                        'name' => $regionName,
                        'emails' => []
                    ];
                }
                $regions[$regionName]['emails'][] = $email;
            }

            // Convert to array for JSON response
            $response = array_values($regions);
            Log::info('Email accounts by region:', ['regions' => $response]);
            return response()->json($response);
        } catch (\Exception $e) {
            Log::error('Error fetching email accounts by region: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch email accounts'], 500);
        }
    }

    private function mapDomainToRegion($domain)
    {
        // Simplified mapping of email domains to regions
        $domainMap = [
            'gmail.com' => 'Google',
            'yahoo.com' => 'Yahoo',
            'outlook.com' => 'Microsoft',
            'hotmail.com' => 'Microsoft',
            // Add more mappings as needed
        ];

        return $domainMap[$domain] ?? 'Other';
    }
    public function getActiveEmailAccounts(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);

            $emailAccounts = DB::connection('pluto')
                ->table('email_accounts')
                ->where('user_id', '1') // Replace with auth()->id() if dynamic
                ->where('status', 'active')
                ->get(['email']);

            return response()->json(['emails' => $emailAccounts->pluck('email')]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch active email accounts: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch email accounts'], 500);
        }
    }


    private function getGoogleClient($account)
    {
        $client = new Google_Client();
        $client->setApplicationName('Email Scheduler');
        $client->setScopes([Google_Service_Gmail::GMAIL_SEND]);
        $client->setAuthConfig(config('services.google.credentials_file')); // Path to credentials.json
        $client->setAccessToken($account->access_token);
        if ($client->isAccessTokenExpired()) {
            $client->fetchAccessTokenWithRefreshToken($account->refresh_token);
            DB::connection('pluto')->table('email_accounts')
                ->where('email', $account->email)
                ->update(['access_token' => $client->getAccessToken()['access_token']]);
        }
        return $client;
    }

    private function createGmailMessage($from, $to, $subject, $content)
    {
        $rawMessage = "From: $from\r\nTo: $to\r\nSubject: $subject\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n$content";
        $encodedMessage = strtr(base64_encode($rawMessage), '+/', '-_');
        $message = new Google_Service_Gmail_Message();
        $message->setRaw($encodedMessage);
        return $message;
    }
    public function getTimezones()
    {
        // Get all IANA timezones
        $timezones = \DateTimeZone::listIdentifiers(\DateTimeZone::ALL);
        return response()->json($timezones);
    }

    public function getQuotaInfo(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);
            $userId = auth()->id();
            $now = now();

            $accounts = DB::connection('pluto')
                ->table('email_accounts')
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->select('id', 'email', 'daily_send_limit')
                ->get();

            $totalLimit = 0;
            $totalUsed = 0;

            foreach ($accounts as $account) {
                $campaignEmails = DB::connection('pluto')
                    ->table('email_campaign_logs')
                    ->where('from_email', $account->email)
                    ->where('status', 'sent')
                    ->where('sent_at', '>=', $now->copy()->subDay())
                    ->count();

                $driftEmails = DB::connection('pluto')
                    ->table('drift_sequence_logs')
                    ->where('email_account_id', $account->id)
                    ->where('sent_at', '>=', $now->copy()->subDay())
                    ->count();

                $account->sent_in_last_24h = $campaignEmails + $driftEmails;
                $totalLimit += $account->daily_send_limit ?? 0;
                $totalUsed += $account->sent_in_last_24h;
            }

            return response()->json([
                'accounts' => $accounts,
                'total_limit' => $totalLimit,
                'total_used' => $totalUsed
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching quota info (EmailMarketingController): ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch quota information'], 500);
        }
    }


    public function trackEmailEvent(Request $request, $campaignId, $subscriberId, $eventType)
    {
        $this->setupPlutoConnection();

        if (!in_array($eventType, ['open', 'click'])) {
            return response()->json(['error' => 'Invalid event type'], 400);
        }

        $log = DB::connection('pluto')->table('email_campaign_logs')
            ->where('campaign_id', $campaignId)
            ->where('subscriber_id', $subscriberId)
            ->first();

        if (!$log) {
            return response()->json(['error' => 'Log not found'], 404);
        }

        if ($eventType === 'open' && !$log->tracking_open) {
            DB::connection('pluto')->table('email_campaign_logs')
                ->where('id', $log->id)
                ->update(['tracking_open' => true]);
        } elseif ($eventType === 'click') {
            $clicks = json_decode($log->tracking_clicks, true) ?? [];
            $clicks[] = ['url' => $request->input('url'), 'timestamp' => now()];
            DB::connection('pluto')->table('email_campaign_logs')
                ->where('id', $log->id)
                ->update(['tracking_clicks' => json_encode($clicks)]);
        }

        DB::connection('pluto')->table('email_tracking_events')->insert([
            'campaign_id' => $campaignId,
            'subscriber_id' => $subscriberId,
            'event_type' => $eventType,
            'event_data' => $eventType === 'click' ? json_encode(['url' => $request->input('url')]) : null,
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Event tracked']);
    }

    /**
     * Upload CSV file for audience import
     */
    public function uploadCsv(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:102400', // 100MB max
        ]);

        $file = $request->file('file');
        $token = uniqid('audience_csv_', true);
        $filePath = storage_path('app/tmp/' . $token . '.csv');

        // Ensure tmp directory exists
        $tmpDir = storage_path('app/tmp');
        if (!file_exists($tmpDir)) {
            mkdir($tmpDir, 0777, true);
        }

        $file->move($tmpDir, $token . '.csv');

        // Read CSV to get header and sample data
        $handle = fopen($filePath, 'r');
        $header = fgetcsv($handle);
        $sample = [];
        $rowCount = 0;

        // Count total rows and get sample
        while (($row = fgetcsv($handle)) !== false) {
            $rowCount++;
            if (count($sample) < 5) {
                $sample[] = $row;
            }
        }
        fclose($handle);

        return response()->json([
            'token' => $token,
            'header' => $header,
            'sample' => $sample,
            'row_count' => $rowCount
        ]);
    }

    /**
     * Process CSV import for audience
     */
    public function processCsv(Request $request)
    {
        // Log the incoming request data for debugging
        Log::info('processCsv request data:', $request->all());

        try {
            $request->validate([
                'token' => 'required|string',
                'mapping' => 'required|array',
                'from' => 'required|integer|min:1',
                'to' => 'required|integer|min:1',
                'audience_id' => 'required|integer',
                'format' => 'required|in:first-email,first-last-email',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed in processCsv:', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 422);
        }

        // Setup Pluto connection
        try {
            $this->setupPlutoConnection($request);
        } catch (\Exception $e) {
            Log::error('Database connection failed in processCsv:', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Database connection failed: ' . $e->getMessage()], 500);
        }

        // Validate audience exists in Pluto database
        $audienceId = (int)$request->input('audience_id');
        try {
            $audienceExists = Audience::on('pluto')->where('id', $audienceId)->exists();
            if (!$audienceExists) {
                Log::error('Audience not found in Pluto database:', ['audience_id' => $audienceId]);
                return response()->json(['error' => 'Audience not found'], 422);
            }
        } catch (\Exception $e) {
            Log::error('Error checking audience existence:', ['error' => $e->getMessage(), 'audience_id' => $audienceId]);
            return response()->json(['error' => 'Database error while checking audience'], 500);
        }

        $token = $request->input('token');
        $mapping = $request->input('mapping');
        $from = (int)$request->input('from');
        $to = (int)$request->input('to');
        $format = $request->input('format');

        $filePath = storage_path('app/tmp/' . $token . '.csv');
        if (!file_exists($filePath)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        // Get total rows in file for remaining calculation
        $totalRows = $this->countCsvRows($filePath);

        $handle = fopen($filePath, 'r');
        $header = fgetcsv($handle);
        $rowNum = 1;
        $inserted = 0;
        $failedRows = [];
        $remainingRows = [];

        $totalToImport = $to - $from + 1;

        // Initialize progress
        Cache::put('audience_import_progress_' . $token, [
            'current' => 0,
            'total' => $totalToImport,
            'inserted' => 0,
            'failed' => 0,
            'remaining' => 0
        ], 3600); // 1 hour cache

        // Process rows in the specified range
        $processedCount = 0;
        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;

            // Skip rows outside the range
            if ($rowNum < $from + 1) continue;
            if ($rowNum > $to + 1) break;

            $processedCount++;

            // Update progress every 5 rows or on first row for more frequent updates
            if ($processedCount % 5 === 0 || $processedCount === 1) {
                $progressData = [
                    'current' => $processedCount,
                    'total' => $totalToImport,
                    'inserted' => $inserted,
                    'failed' => count($failedRows),
                    'remaining' => 0
                ];
                Cache::put('audience_import_progress_' . $token, $progressData, 3600);
            }

            $data = [];
            foreach ($mapping as $colIdx => $field) {
                $data[$field] = $row[$colIdx] ?? '';
            }

            $first_name = trim($data['first_name'] ?? '');
            $last_name = trim($data['last_name'] ?? '');
            $email = trim($data['email'] ?? '');

            // Validation
            $error = null;
            if (!$first_name) {
                $error = 'Missing first_name';
            } elseif ($format === 'first-last-email' && !$last_name) {
                $error = 'Missing last_name';
            } elseif (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $error = 'Invalid or missing email';
            } else {
                // Check for duplicates
                $exists = \App\Models\Central\EmailSystem\Subscriber::on('pluto')
                    ->where('audience_id', $audienceId)
                    ->where('email', $email)
                    ->exists();
                if ($exists) {
                    $error = 'Duplicate in this audience';
                }
            }

            if ($error) {
                $failedRows[] = array_merge($data, [
                    'row_number' => $rowNum,
                    'reason' => $error
                ]);
            } else {
                try {
                    \App\Models\Central\EmailSystem\Subscriber::on('pluto')->create([
                        'audience_id' => $audienceId,
                        'first_name' => $first_name,
                        'last_name' => $last_name ?: null,
                        'email' => $email,
                        'status' => 'subscribed',
                    ]);
                    $inserted++;
                } catch (\Exception $e) {
                    $failedRows[] = array_merge($data, [
                        'row_number' => $rowNum,
                        'reason' => 'DB error: ' . $e->getMessage()
                    ]);
                }
            }
        }

        fclose($handle);

        // Generate failed rows CSV
        $failedCsv = null;
        if (count($failedRows) > 0) {
            $failedCsv = $this->generateCsvFile($failedRows, $token . '_failed');
        }

        // Generate remaining rows CSV (rows after the import range)
        $remainingCsv = null;
        if ($to < $totalRows) {
            $remainingRows = $this->extractRemainingRows($filePath, $to + 1, $totalRows, $header);
            if (count($remainingRows) > 0) {
                $remainingCsv = $this->generateCsvFile($remainingRows, $token . '_remaining');
            }
        }

        // Clean up original file
        @unlink($filePath);

        // Final progress update
        Cache::put('audience_import_progress_' . $token, [
            'current' => $totalToImport,
            'total' => $totalToImport,
            'inserted' => $inserted,
            'failed' => count($failedRows),
            'remaining' => count($remainingRows)
        ], 3600);

        return response()->json([
            'message' => 'Subscribers imported successfully',
            'inserted_count' => $inserted,
            'failed_count' => count($failedRows),
            'remaining_count' => count($remainingRows),
            'failed_csv' => $failedCsv,
            'remaining_csv' => $remainingCsv,
            'total_rows_in_file' => $totalRows,
            'imported_range' => "{$from} - {$to}",
        ]);
    }

    /**
     * Get import progress for audience CSV
     */
    public function importProgress(Request $request)
    {
        $token = $request->input('token');
        $progress = Cache::get('audience_import_progress_' . $token, [
            'current' => 0,
            'total' => 1,
            'inserted' => 0,
            'failed' => 0,
            'remaining' => 0
        ]);
        return response()->json($progress);
    }

    /**
     * Download CSV file for audience import
     */
    public function downloadCsv(Request $request)
    {
        $request->validate([
            'filename' => 'required|string',
        ]);

        $filename = $request->input('filename');
        $filePath = storage_path('app/tmp/' . $filename . '.csv');

        if (!file_exists($filePath)) {
            return response()->json(['error' => 'File not found: ' . $filePath], 404);
        }

        // Create symbolic link if it doesn't exist
        $publicPath = public_path('storage/tmp/' . $filename . '.csv');
        $publicDir = dirname($publicPath);

        if (!file_exists($publicDir)) {
            mkdir($publicDir, 0755, true);
        }

        // Copy file to public directory for download
        copy($filePath, $publicPath);

        return response()->download($publicPath, $filename . '.csv', [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '.csv"'
        ])->deleteFileAfterSend(true);
    }

    /**
     * Count CSV rows
     */
    private function countCsvRows($filePath)
    {
        $handle = fopen($filePath, 'r');
        $count = 0;
        while (fgetcsv($handle) !== false) {
            $count++;
        }
        fclose($handle);
        return $count - 1; // Subtract header row
    }

    /**
     * Generate CSV file from data array
     */
    private function generateCsvFile($data, $filename)
    {
        if (empty($data)) {
            return null;
        }

        // Ensure tmp directory exists
        $tmpDir = storage_path('app/tmp');
        if (!file_exists($tmpDir)) {
            mkdir($tmpDir, 0777, true);
        }

        $csvPath = storage_path('app/tmp/' . $filename . '.csv');
        $csvHandle = fopen($csvPath, 'w');

        // Get all unique keys from the data
        $allKeys = array_unique(array_merge(...array_map('array_keys', $data)));

        // Write header
        fputcsv($csvHandle, $allKeys);

        // Write data rows
        foreach ($data as $row) {
            $line = [];
            foreach ($allKeys as $key) {
                $line[] = $row[$key] ?? '';
            }
            fputcsv($csvHandle, $line);
        }

        fclose($csvHandle);

        // Create public directory and copy file for download
        $publicDir = public_path('storage/tmp');
        if (!file_exists($publicDir)) {
            mkdir($publicDir, 0755, true);
        }

        $publicPath = public_path('storage/tmp/' . $filename . '.csv');
        copy($csvPath, $publicPath);

        return '/audience/download-csv?filename=' . $filename;
    }

    /**
     * Extract remaining rows from CSV file
     */
    private function extractRemainingRows($filePath, $startRow, $endRow, $header)
    {
        $remainingRows = [];
        $handle = fopen($filePath, 'r');

        // Skip header
        fgetcsv($handle);

        $rowNum = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;

            // Only process rows in the remaining range
            if ($rowNum >= $startRow && $rowNum <= $endRow) {
                $rowData = [];
                foreach ($header as $index => $columnName) {
                    $rowData[$columnName] = $row[$index] ?? '';
                }
                $remainingRows[] = $rowData;
            }

            if ($rowNum > $endRow) {
                break;
            }
        }

        fclose($handle);
        return $remainingRows;
    }

    /**
     * Upload CSV for campaign audience creation
     */
    public function uploadCsvCampaign(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:102400', // 100MB max
        ]);

        $file = $request->file('file');
        $token = uniqid('campaign_csv_', true);
        $filePath = storage_path('app/tmp/' . $token . '.csv');

        // Ensure tmp directory exists
        $tmpDir = storage_path('app/tmp');
        if (!file_exists($tmpDir)) {
            mkdir($tmpDir, 0777, true);
        }

        $file->move($tmpDir, $token . '.csv');

        // Read CSV to get header and sample data
        $handle = fopen($filePath, 'r');
        $header = fgetcsv($handle);
        $sample = [];
        $rowCount = 0;

        // Count total rows and get sample
        while (($row = fgetcsv($handle)) !== false) {
            $rowCount++;
            if (count($sample) < 5) {
                $sample[] = $row;
            }
        }
        fclose($handle);

        return response()->json([
            'token' => $token,
            'header' => $header,
            'sample' => $sample,
            'row_count' => $rowCount
        ]);
    }

    /**
     * Process CSV import for campaign audience
     */
    public function processCsvCampaign(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'name' => 'required|string|max:255',
            'mapping' => 'required|array',
            'from' => 'required|integer|min:1',
            'to' => 'required|integer|min:1'
        ]);

        $token = $request->input('token');
        $name = $request->input('name');
        $mapping = $request->input('mapping');
        $from = (int)$request->input('from');
        $to = (int)$request->input('to');

        $filePath = storage_path('app/tmp/' . $token . '.csv');
        if (!file_exists($filePath)) {
            return response()->json(['error' => 'CSV file not found'], 404);
        }

        // Create audience first
        $audience = \App\Models\Central\EmailSystem\Audience::create([
            'name' => $name,
            'business_id' => auth()->user()->business_id,
            'status' => 'active'
        ]);

        $totalRows = $this->countCsvRows($filePath);
        $startRow = max(1, $from);
        $endRow = min($totalRows, $to);
        $totalToImport = $endRow - $startRow + 1;

        $inserted = 0;
        $failedRows = [];
        $processedCount = 0;

        $handle = fopen($filePath, 'r');
        $header = fgetcsv($handle);

        // Skip to start row
        for ($i = 1; $i < $startRow; $i++) {
            fgetcsv($handle);
        }

        // Process the specified range
        for ($i = $startRow; $i <= $endRow; $i++) {
            $row = fgetcsv($handle);
            $processedCount++;

            if ($row === false) break;

            try {
                // Process mapping like drift-emails: mapping[colIdx] = field
                $data = [];
                foreach ($mapping as $colIdx => $field) {
                    $data[$field] = $row[$colIdx] ?? '';
                }

                $email = trim($data['email'] ?? '');
                if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $failedRows[] = array_merge($row, ['error' => 'Invalid email']);
                    continue;
                }

                $firstName = trim($data['first_name'] ?? '');
                $lastName = trim($data['last_name'] ?? '');

                \App\Models\Central\EmailSystem\Subscriber::create([
                    'audience_id' => $audience->id,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $email,
                    'status' => 'subscribed',
                    'business_id' => auth()->user()->business_id
                ]);

                $inserted++;
            } catch (\Exception $e) {
                $failedRows[] = array_merge($row, ['error' => $e->getMessage()]);
            }

            // Update progress every 5 rows or on first row for more frequent updates
            if ($processedCount % 5 === 0 || $processedCount === 1) {
                $progressData = [
                    'current' => $processedCount,
                    'total' => $totalToImport,
                    'inserted' => $inserted,
                    'failed' => count($failedRows),
                    'remaining' => 0
                ];
                Cache::put('campaign_import_progress_' . $token, $progressData, 3600);
            }
        }
        fclose($handle);

        // Generate failed rows CSV if any
        $failedCsv = null;
        if (!empty($failedRows)) {
            $failedCsv = $this->generateCsvFile($failedRows, 'failed_rows_' . $token . '.csv');
        }

        // Generate remaining rows CSV if not all rows were imported
        $remainingCsv = null;
        $remainingCount = 0;
        if ($endRow < $totalRows) {
            $remainingRows = $this->extractRemainingRows($filePath, $endRow + 1, $totalRows, $header);
            $remainingCount = count($remainingRows);
            if ($remainingCount > 0) {
                $remainingCsv = $this->generateCsvFile($remainingRows, 'remaining_rows_' . $token . '.csv');
            }
        }

        // Clean up the temporary file
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        return response()->json([
            'success' => true,
            'audience_id' => $audience->id,
            'inserted_count' => $inserted,
            'failed_count' => count($failedRows),
            'remaining_count' => $remainingCount,
            'total_rows_in_file' => $totalRows,
            'imported_range' => "Rows {$startRow} to {$endRow}",
            'failed_csv' => $failedCsv,
            'remaining_csv' => $remainingCsv
        ]);
    }

    /**
     * Get import progress for campaign
     */
    public function importProgressCampaign(Request $request)
    {
        $request->validate([
            'token' => 'required|string'
        ]);

        $token = $request->input('token');
        $progress = Cache::get('campaign_import_progress_' . $token);

        return response()->json($progress ?: ['current' => 0, 'total' => 0]);
    }

    /**
     * Download CSV file for campaign
     */
    public function downloadCsvCampaign(Request $request)
    {
        $request->validate([
            'filename' => 'required|string'
        ]);

        $filename = $request->input('filename');
        $filePath = storage_path('app/tmp/' . $filename);

        if (!file_exists($filePath)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        // Copy to public storage for download
        $publicPath = public_path('storage/tmp/' . $filename);
        $publicDir = dirname($publicPath);
        if (!file_exists($publicDir)) {
            mkdir($publicDir, 0777, true);
        }
        copy($filePath, $publicPath);

        return response()->download($publicPath, $filename)->deleteFileAfterSend(true);
    }
}
