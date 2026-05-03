<?php

namespace App\Http\Controllers\System\Central\EmailSystem;

use App\Http\Controllers\Controller;

use App\Models\Central\EmailSystem\DriftSequence;
use App\Models\Central\EmailSystem\DriftSequenceLog;
use App\Jobs\EmailSystem\SendDriftEmailSequenceJob;
use App\Models\Central\EmailSystem\Audience;
use App\Models\Central\EmailSystem\Template;
use App\Models\Central\EmailSystem\Subscriber;
use App\Models\Central\EmailSystem\EmailAccount;
use App\Models\Central\EmailSystem\Set;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class DriftController extends Controller
{
    /**
     * Get selected report filter categories for a sequence (for Select2 pills)
     * GET: /drift/sequences/{sequence}/categories
     * Returns: { categories: [ ... ] }
     */
    public function getSequenceCategories($sequenceId)
    {
        try {
            // Use Pluto connection for DriftSequence
            $sequence = DriftSequence::on('pluto')->findOrFail($sequenceId);
            $categories = [];
            if (is_array($sequence->categories)) {
                $categories = $sequence->categories;
            } elseif (is_string($sequence->categories) && !empty($sequence->categories)) {
                // Try JSON decode first
                $decoded = json_decode($sequence->categories, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $categories = $decoded;
                } else {
                    // Fallback: comma-separated string
                    $categories = array_map('trim', explode(',', $sequence->categories));
                }
            }
            return response()->json(['categories' => $categories]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch sequence categories: ' . $e->getMessage(), ['sequence_id' => $sequenceId]);
            return response()->json(['error' => 'Failed to fetch categories for sequence.'], 404);
        }
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // You can customize the view path if needed
        return view('system.central.email-system.drift-emails');
    }

    /**
     * Get quota information for all email accounts
     */
    public function getQuotaInfo()
    {
        $userId = auth()->id();

        $accounts = DB::connection('pluto')
            ->table('email_accounts')
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->select('id', 'email', 'daily_send_limit')
            ->get();

        $totalLimit = 0;
        $totalUsed = 0;

        foreach ($accounts as $account) {
            $account->sent_in_last_24h = DriftSequenceLog::on('pluto')
                ->where('email_account_id', $account->id)
                ->where('sent_at', '>=', now()->subDay())
                ->count();

            $totalLimit += $account->daily_send_limit;
            $totalUsed += $account->sent_in_last_24h;
        }

        return response()->json([
            'accounts' => $accounts,
            'total_limit' => $totalLimit,
            'total_used' => $totalUsed
        ]);
    }

    private function setupPlutoConnection(Request $request)
    {
        $host = $request->input('db_host', '127.0.0.1');
        $port = '3306';
        $database = 'pluto';
        $username = 'root';
        $password = '';

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

        try {
            DB::purge('pluto');
            config(['database.connections.pluto' => $connection]);
            $db = DB::connection('pluto');
            $db->getPdo();
            Log::info("Pluto connection established to database: $database");

            $tableExists = DB::connection('pluto')
                ->getPdo()
                ->query("SHOW TABLES LIKE 'email_accounts'")
                ->fetch();
            if (!$tableExists) {
                Log::error("email_accounts table does not exist in database: $database");
                throw new \Exception("email_accounts table not found in $database");
            }

            return $db;
        } catch (\Exception $e) {
            Log::error("Failed to establish Pluto connection: " . $e->getMessage());
            throw $e;
        }
    }

    public function createSet(Request $request)
    {
        $this->setupPlutoConnection($request);
        $validator = Validator::make($request->all(), [
            'set_name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            Log::warning("Validation failed for createSet: " . json_encode($validator->errors()));
            return response()->json(['details' => $validator->errors()->first()], 422);
        }

        try {
            $set = DB::connection('pluto')->table('sets')->insertGetId([
                'set_name' => $request->set_name,
                'description' => $request->description,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            Log::info("Set created: $set");
            return response()->json(['message' => 'Set created successfully', 'set_id' => $set], 200);
        } catch (\Exception $e) {
            Log::error("Error creating set: " . $e->getMessage());
            return response()->json(['error' => 'Failed to create set: ' . $e->getMessage()], 500);
        }
    }

    public function createSequence(Request $request)
    {
        $this->setupPlutoConnection($request);

        $validator = Validator::make($request->all(), [
            'set_id' => 'required|exists:pluto.sets,id',
            'name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            Log::warning("Validation failed for createSequence: " . json_encode($validator->errors()));
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        try {
            $sequence = DriftSequence::on('pluto')->create([
                'set_id' => $request->set_id,
                'name' => $request->name,
                'audience_id' => $request->audience_id ?? null,
                'template_id' => 0, // Placeholder; user must select later
                'subject' => "Default Subject",
                'from_emails' => json_encode([]), // Ensure valid JSON
                'time_gap' => 1,
                'batch_size' => 2,
                'wait_time' => 0,
                'wait_unit' => 'minutes',
                'status' => 'draft',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info("Sequence created: " . $sequence->id, ['set_id' => $request->set_id]);
            return response()->json([
                'message' => 'Sequence created successfully',
                'sequence' => $sequence,
            ], 200);
        } catch (\Exception $e) {
            Log::error("Error creating sequence: " . $e->getMessage());
            return response()->json(['error' => 'Failed to create sequence: ' . $e->getMessage()], 500);
        }
    }
    public function previewTemplate(Request $request, $id)
    {
        try {
            $this->setupPlutoConnection($request);
            $template = Template::on('pluto')->findOrFail($id);
            $subscriberId = $request->query('subscriber_id');
            $fromEmail = $request->query('from_email');
            $sequenceId = $request->query('sequence_id');

            // Fetch email account
            $emailAccountQuery = DB::connection('pluto')
                ->table('email_accounts')
                ->where('user_id', auth()->id())
                ->where('status', 'active');

            if ($fromEmail) {
                $emailAccountQuery->where('email', $fromEmail);
            }

            $emailAccount = $emailAccountQuery->first();

            if (!$emailAccount) {
                \Log::warning('No active email account found for email: ' . ($fromEmail ?? 'none'));
                $emailAccount = (object) [
                    'email' => $fromEmail ?? 'unknown@example.com',
                    'first_name' => 'Sender',
                    'last_name' => 'Unknown'
                ];
            }

            // Fetch subscriber
            $subscriber = $subscriberId
                ? Subscriber::on('pluto')->find($subscriberId)
                : null;

            if ($subscriberId && !$subscriber) {
                \Log::warning('Subscriber not found: ' . $subscriberId);
                return response()->json(['error' => 'Subscriber not found'], 404);
            }

            \Log::info('Template preview for template_id: ' . $id . ', subscriber_id: ' . ($subscriberId ?? 'none') . ', from_email: ' . ($fromEmail ?? 'none'));
            \Log::info('Raw template content: ' . $template->content);

            $content = $template->content;

            // Subscriber placeholders
            $subscriberReplacements = $subscriber
                ? [
                    '[first_name]' => $subscriber->first_name ?? 'Subscriber',
                    '[last_name]' => $subscriber->last_name ?? '',
                    '[email]' => $subscriber->email ?? 'subscriber@example.com',
                    '[unsubscribe_link]' => $sequenceId
                        ? url("/drift/unsubscribe/{$subscriber->id}/{$sequenceId}")
                        : url('/unsubscribe/preview')
                ]
                : [
                    '[first_name]' => 'John',
                    '[last_name]' => 'Doe',
                    '[email]' => 'subscriber@example.com',
                    '[unsubscribe_link]' => url('/unsubscribe/preview')
                ];

            // Email account placeholders
            $emailAccountReplacements = [
                '[sender_email]' => $emailAccount->email,
                '[sender_first_name]' => $emailAccount->first_name ?? 'Sender',
                '[sender_last_name]' => $emailAccount->last_name ?? 'Unknown'
            ];

            $replacements = array_merge($subscriberReplacements, $emailAccountReplacements);
            \Log::info('Replacements array: ' . json_encode($replacements));

            foreach ($replacements as $placeholder => $value) {
                $content = str_replace($placeholder, $value, $content);
            }

            \Log::info('Processed content: ' . $content);

            return response()->json([
                'title' => $template->title,
                'content' => $content
            ]);
        } catch (\Exception $e) {
            \Log::error('Error previewing template: ' . $e->getMessage(), [
                'template_id' => $id,
                'subscriber_id' => $subscriberId,
                'from_email' => $fromEmail,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to preview template: ' . $e->getMessage()], 500);
        }
    }


    /**
     * Preview Drift Email (for modal preview)
     * POST: /api/drift/preview
     * Params: subscriber_id, template_id, subject, sequence_id
     * Returns: { subject, content }
     */
    public function preview(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);
            $templateId = $request->input('template_id');
            $subject = $request->input('subject', '');
            $subscriberId = $request->input('subscriber_id');
            $sequenceId = $request->input('sequence_id');

            // Fetch template
            $template = Template::on('pluto')->findOrFail($templateId);
            $content = $template->content;

            // Fetch subscriber if given
            $subscriber = null;
            if ($subscriberId) {
                $subscriber = Subscriber::on('pluto')->find($subscriberId);
            }

            // Simple placeholder replacement (e.g. {{first_name}})
            if ($subscriber) {
                $content = str_replace(
                    ['{{first_name}}', '{{last_name}}', '{{email}}'],
                    [$subscriber->first_name, $subscriber->last_name, $subscriber->email],
                    $content
                );
                $subject = str_replace(
                    ['{{first_name}}', '{{last_name}}', '{{email}}'],
                    [$subscriber->first_name, $subscriber->last_name, $subscriber->email],
                    $subject
                );
            }

            return response()->json([
                'subject' => $subject ?: $template->subject,
                'content' => $content,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error generating drift preview: ' . $e->getMessage(), [
                'template_id' => $request->input('template_id'),
                'subscriber_id' => $request->input('subscriber_id'),
                'sequence_id' => $request->input('sequence_id'),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to generate preview: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Fetch subscribers from previous sequence filtered by category for preview modal
     * GET: /api/drift/sequence-category-emails
     * Params: prev_sequence_id, category
     * Returns: { subscribers: [ {id, email, name} ] }
     */
    public function getCategoryEmailsForNextSequence(Request $request)
    {
        $prevSequenceId = $request->input('prev_sequence_id');
        $category = $request->input('category');

        \Log::info('Category API called', [
            'prev_sequence_id' => $prevSequenceId,
            'category' => $category,
            'request_params' => $request->all()
        ]);

        // Fetch the previous sequence with audience and subscribers
        $sequence = DriftSequence::on('pluto')
            ->with(['audience.subscribers'])
            ->find($prevSequenceId);
        if (!$sequence) {
            \Log::warning('Previous sequence not found', ['prev_sequence_id' => $prevSequenceId]);
            return response()->json(['error' => 'Previous sequence not found'], 404);
        }

        // Prepare all subscriber emails
        $subscriberCollection = $sequence->audience && $sequence->audience->subscribers
            ? $sequence->audience->subscribers
            : collect();
        $subscriberEmails = $subscriberCollection->pluck('email')->toArray();
        $subscriberMap = $subscriberCollection->keyBy('email');
        $fromEmails = is_array($sequence->from_emails)
            ? $sequence->from_emails
            : json_decode($sequence->from_emails, true);
        if (empty($fromEmails)) {
            \Log::warning('No from_emails found for previous sequence', ['sequence_id' => $prevSequenceId]);
            return response()->json(['subscribers' => []]);
        }

        // Query emails table for all emails received for our from_emails, from our audience
        $emailLogs = \DB::connection('pluto')
            ->table('emails')
            ->whereIn('account_email', $fromEmails)
            ->whereIn(
                \DB::raw("TRIM(BOTH '<>' FROM SUBSTRING_INDEX(SUBSTRING_INDEX(`from`, '<', -1), '>', 1))"),
                $subscriberEmails
            )
            ->select(
                'status',
                \DB::raw("TRIM(BOTH '<>' FROM SUBSTRING_INDEX(SUBSTRING_INDEX(`from`, '<', -1), '>', 1)) as email")
            )
            ->get();

        // Filter by category
        $emailsByCategory = collect();
        switch ($category) {
            case 'replied':
                $emailsByCategory = $emailLogs->filter(fn($e) => strtolower($e->status) === 'replied')->pluck('email')->unique();
                break;
            case 'unsubscribed':
                $emailsByCategory = $emailLogs->filter(fn($e) => in_array(strtolower($e->status), ['unsubscribed', 'unsubscribe']))->pluck('email')->unique();
                break;
            case 'Softbounce':
                $emailsByCategory = $emailLogs->filter(fn($e) => in_array(strtolower($e->status), ['softbounce', 'soft_bounce']))->pluck('email')->unique();
                break;
            case 'hardSoftbounce':
                $emailsByCategory = $emailLogs->filter(fn($e) => in_array(strtolower($e->status), ['hardbounce', 'hard_bounce']))->pluck('email')->unique();
                break;
            default:
                // For unknown or unsupported categories, return empty
                $emailsByCategory = collect();
        }

        // Map emails to subscriber info
        $output = $emailsByCategory->map(function ($email) use ($subscriberMap) {
            $sub = $subscriberMap[$email] ?? null;
            if ($sub) {
                return [
                    'id' => $sub->id,
                    'email' => $sub->email,
                    'name' => trim(($sub->first_name ?? '') . ' ' . ($sub->last_name ?? '')),
                ];
            }
            return null;
        })->filter(fn($a) => $a && !empty($a['email']))->values();

        \Log::info('Category API emails returned', [
            'emails' => $output->pluck('email')->toArray(),
            'count' => $output->count(),
            'category' => $category,
            'prev_sequence_id' => $prevSequenceId
        ]);

        return response()->json(['subscribers' => $output]);
    }

    public function getSets(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);
            $sets = Set::on('pluto')->get(['id', 'set_name']);
            Log::info("Fetched sets: " . $sets->count());
            return response()->json(['sets' => $sets], 200);
        } catch (\Exception $e) {
            Log::error("Error fetching sets: " . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch sets: ' . $e->getMessage()], 500);
        }
    }

    public function deleteSet(Request $request, $setId)
    {
        $this->setupPlutoConnection($request);

        try {
            // Begin transaction to ensure atomicity
            DB::connection('pluto')->beginTransaction();

            // Fetch the set
            $set = Set::on('pluto')->findOrFail($setId);

            // Fetch all sequences associated with the set
            $sequences = DriftSequence::on('pluto')->where('set_id', $setId)->get();

            foreach ($sequences as $sequence) {
                // Cancel any scheduled or running jobs for the sequence
                DB::connection('pluto')
                    ->table('jobs')
                    ->where('payload', 'like', '%DriftSequence%' . $sequence->id . '%')
                    ->delete();

                // Delete associated logs
                DriftSequenceLog::on('pluto')->where('sequence_id', $sequence->id)->delete();

                // Delete the sequence
                $sequence->delete();

                Log::info("Deleted sequence {$sequence->id} for set {$setId}");
            }

            // Delete the set
            $set->delete();

            DB::connection('pluto')->commit();

            Log::info("Set deleted: {$setId}");
            return response()->json(['message' => 'Set and all associated sequences deleted successfully'], 200);
        } catch (\Exception $e) {
            DB::connection('pluto')->rollBack();
            Log::error("Error deleting set {$setId}: " . $e->getMessage(), [
                'set_id' => $setId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to delete set: ' . $e->getMessage()], 500);
        }
    }

    public function getSequences(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);
            $setId = $request->input('set_id', DB::connection('pluto')
                ->table('sets')
                ->latest('id')
                ->value('id')); // Default to latest set if not specified

            if (!$setId) {
                Log::info('No sets found, returning empty response');
                return response()->json([
                    'set_id' => null,
                    'set_name' => null,
                    'sequences' => [],
                ], 200);
            }

            $sequences = DriftSequence::on('pluto')
                ->where('set_id', $setId)
                ->get(['id', 'set_id', 'name', 'status', 'subject', 'template_id', 'audience_id', 'from_emails', 'time_gap', 'batch_size', 'wait_time', 'wait_unit', 'categories', 'assignment_mode', 'manual_assignments']);
            Log::info("Fetched sequences for set $setId: " . $sequences->count());
            return response()->json([
                'set_id' => $setId,
                'set_name' => DB::connection('pluto')->table('sets')->where('id', $setId)->value('set_name'),
                'sequences' => $sequences
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching sequences: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch sequences: ' . $e->getMessage()], 500);
        }
    }
    public function saveSequences(Request $request)
    {
        Log::info('saveSequences request details:', [
            'input' => $request->all(),
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'headers' => $request->headers->all()
        ]);

        try {
            $this->setupPlutoConnection($request);

            // Normalize input: wrap single sequence in array if sequences key is missing
            $input = $request->all();
            $sequences = $request->has('sequences') ? $request->sequences : [$input];

            // Normalize categories/filters for Sequence 2+
            foreach ($sequences as &$sequence) {
                $sequence_number = $sequence['sequence_number'] ?? 1;
                if ($sequence_number == 1) {
                    unset($sequence['categories']); // Only allow categories for sequence 1 if present
                } else {
                    // If categories is present and filters is not, use categories as filters
                    if (isset($sequence['categories']) && !isset($sequence['filters'])) {
                        $sequence['filters'] = $sequence['categories'];
                    }
                    // If filters is present and categories is not, use filters as categories
                    if (isset($sequence['filters']) && !isset($sequence['categories'])) {
                        $sequence['categories'] = $sequence['filters'];
                    }
                }
            }
            unset($sequence);

            Log::info('Normalized sequences:', ['sequences' => $sequences]);

            // Validation
            $validator = Validator::make(['set_id' => $request->set_id, 'sequences' => $sequences], [
                'set_id' => 'required|exists:pluto.sets,id',
                'sequences' => 'required|array',
                'sequences.*.sequence_id' => 'nullable|exists:pluto.drift_sequences,id',
                'sequences.*.set_id' => 'required|exists:pluto.sets,id',
                'sequences.*.name' => 'required|string|max:255',
                'sequences.*.subject' => 'required|string|max:255',
                'sequences.*.template_id' => 'required|exists:pluto.templates,id',
                'sequences.*.from_emails' => 'required|array',
                'sequences.*.from_emails.*' => 'required|email',
                'sequences.*.time_gap' => 'exclude_unless:sequences.*.sequence_number,1|nullable|integer|min:0',
                'sequences.*.batch_size' => 'nullable|integer|min:1',
                'sequences.*.audience_id' => 'exclude_unless:sequences.*.sequence_number,1|nullable|exists:pluto.audiences,id',
                'sequences.*.categories' => 'nullable|array', // Allow categories array for sequences 2+
                'sequences.*.categories.*' => 'in:replied,unsubscribed,softbounce,hardbounce,opened,unopened,automatic_reply,no_longer',
                'sequences.*.assignment_mode' => 'nullable|in:batch_size,manual_assign',
                'sequences.*.manual_assignments' => 'exclude_unless:sequences.*.assignment_mode,manual_assign|array',
                'sequences.*.manual_assignments.*' => 'integer|min:0',
                'sequences.*.wait_time' => 'required|integer|min:0',
                'sequences.*.wait_unit' => 'required|in:minutes,hours,days',
            ]);

            Log::info('Validation data:', ['set_id' => $request->set_id, 'sequences' => $sequences]);

            if ($validator->fails()) {
                Log::warning('Validation failed for saveSequences: ' . json_encode($validator->errors()));
                return response()->json(['error' => $validator->errors()->first()], 422);
            }

            // Ensure wait_time and wait_unit are set for non-final sequences
            foreach ($sequences as $idx => $sequenceData) {
                $sequence_number = ($sequenceData['sequence_number'] ?? $idx + 1);
                if ($sequence_number < count($sequences) && (!isset($sequenceData['wait_time']) || !isset($sequenceData['wait_unit']))) {
                    Log::warning("Missing wait_time or wait_unit for non-final sequence {$sequence_number}");
                    return response()->json(['error' => "Sequence {$sequence_number} requires wait_time and wait_unit"], 422);
                }
            }

            DB::connection('pluto')->beginTransaction();

            $updatedSequences = [];

            foreach (array_values($sequences) as $idx => $sequenceData) {
                $sequence_number = ($sequenceData['sequence_number'] ?? $idx + 1);
                $sequenceData['sequence_number'] = $sequence_number;

                // Validate set_id consistency
                if ($sequenceData['set_id'] != $request->set_id) {
                    Log::warning("Set ID mismatch for sequence", [
                        'sequence_id' => $sequenceData['sequence_id'] ?? null,
                        'set_id' => $sequenceData['set_id'],
                    ]);
                    return response()->json(['error' => 'Sequence set_id does not match request set_id'], 400);
                }

                // Log sequence data for debugging
                Log::info("Processing sequence save", [
                    'sequence_id' => $sequenceData['sequence_id'] ?? null,
                    'assignment_mode' => $sequenceData['assignment_mode'] ?? null,
                    'sequenceData_full' => $sequenceData,
                ]);

                // Ensure assignment_mode is set and saved
                if (!isset($sequenceData['assignment_mode']) || !$sequenceData['assignment_mode']) {
                    $sequenceData['assignment_mode'] = 'batch_size';
                }

                // Save/update sequence
                $sequence = null;
                if (isset($sequenceData['sequence_id'])) {
                    $sequence = DriftSequence::on('pluto')->find($sequenceData['sequence_id']);
                }
                if ($sequence) {
                    $sequence->assignment_mode = $sequenceData['assignment_mode'];
                    $sequence->batch_size = ($sequenceData['assignment_mode'] === 'batch_size') ? ($sequenceData['batch_size'] ?? null) : null;
                    $sequence->manual_assignments = ($sequenceData['assignment_mode'] === 'manual_assign') ? json_encode($sequenceData['manual_assignments'] ?? []) : null;
                    $sequence->save();
                }

                $data = [
                    'name' => $sequenceData['name'],
                    'set_id' => $sequenceData['set_id'],
                    'template_id' => $sequenceData['template_id'],
                    'subject' => $sequenceData['subject'],
                    'from_emails' => json_encode($sequenceData['from_emails']),
                    'time_gap' => $sequence_number == 1 ? ($sequenceData['time_gap'] ?? null) : null,
                    'batch_size' => $sequence_number == 1 && ($sequenceData['assignment_mode'] ?? 'batch_size') === 'batch_size' ? ($sequenceData['batch_size'] ?? null) : null,
                    'wait_time' => $sequenceData['wait_time'] ?? 0,
                    'wait_unit' => $sequenceData['wait_unit'] ?? 'minutes',
                    'audience_id' => $sequence_number == 1 ? ($sequenceData['audience_id'] ?? null) : null,
                    'categories' => $sequence_number > 1 && !empty($sequenceData['categories']) ? json_encode($sequenceData['categories']) : null,
                    'sequence_number' => $sequence_number,
                    'assignment_mode' => $sequenceData['assignment_mode'] ?? 'batch_size',
                    'manual_assignments' => $sequence_number == 1 && ($sequenceData['assignment_mode'] ?? 'batch_size') === 'manual_assign' ? json_encode($sequenceData['manual_assignments'] ?? []) : null,
                    'updated_at' => now(),
                ];
                // Only set status if creating a new sequence
                if (empty($sequenceData['sequence_id'])) {
                    $data['status'] = 'draft';
                }

                if (!empty($sequenceData['sequence_id'])) {
                    // Update existing sequence
                    $sequence = DriftSequence::on('pluto')->findOrFail($sequenceData['sequence_id']);

                    if ($sequence->set_id != $sequenceData['set_id']) {
                        Log::warning("Set ID mismatch for sequence", [
                            'sequence_id' => $sequenceData['sequence_id'],
                            'set_id' => $sequenceData['set_id'],
                        ]);
                        return response()->json(['error' => 'Sequence does not belong to the specified set'], 400);
                    }

                    if (in_array($sequence->status, ['running', 'scheduled', 'paused'])) {
                        Log::warning("Cannot update sequence in {$sequence->status} status", [
                            'sequence_id' => $sequenceData['sequence_id'],
                        ]);
                        return response()->json(['error' => "Cannot update sequence {$sequenceData['sequence_id']} in {$sequence->status} status"], 422);
                    }

                    $sequence->update($data);
                    $updatedSequences[] = $sequence;
                } else {
                    // Create new sequence
                    $data['created_at'] = now();
                    $sequence = DriftSequence::on('pluto')->create($data);
                    $updatedSequences[] = $sequence;
                }

                // Update previous_sequence_id for sequences after the first
                if ($sequence_number > 1) {
                    $previousSequence = $updatedSequences[$idx - 1] ?? DriftSequence::on('pluto')
                        ->where('set_id', $request->set_id)
                        ->where('sequence_number', $sequence_number - 1)
                        ->first();
                    if ($previousSequence) {
                        $sequence->update(['previous_sequence_id' => $previousSequence->id]);
                    }
                }
            }

            DB::connection('pluto')->commit();

            Log::info("Successfully saved sequences for set {$request->set_id}", [
                'sequence_count' => count($sequences),
            ]);

            return response()->json([
                'message' => 'Sequences saved successfully',
                'sequences' => $updatedSequences
            ], 200);
        } catch (\Exception $e) {
            DB::connection('pluto')->rollBack();
            Log::error("Error saving sequences: " . $e->getMessage(), [
                'set_id' => $request->set_id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to save sequences: ' . $e->getMessage()], 500);
        }
    }
  public function send(Request $request)
    {
        Log::info('[Drift] Sequence send requested', [
            'user_id' => auth()->id(),
            'request' => $request->all(),
            'timestamp' => now()->toDateTimeString(),
        ]);

        try {
            $this->setupPlutoConnection($request);

            // Normalize input data
            $input = $request->all();
            if (isset($input['manual_assignments']) && is_string($input['manual_assignments'])) {
                $input['manual_assignments'] = json_decode($input['manual_assignments'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    Log::warning('Invalid manual_assignments format', ['manual_assignments' => $input['manual_assignments']]);
                    return response()->json(['error' => 'Invalid manual_assignments format'], 422);
                }
            }

            // Normalize batch_size to null if 0 or not provided
            $input['batch_size'] = isset($input['batch_size']) && $input['batch_size'] === 0 ? null : ($input['batch_size'] ?? null);
            $input['wait_time'] = $input['wait_time'] ?? 0;
            $input['wait_unit'] = $input['wait_unit'] ?? 'minutes';
            $input['sequence_number'] = $input['sequence_number'] ?? 1;

            Log::info('Normalized input data:', ['batch_size' => $input['batch_size'], 'input' => $input]);

            $validator = Validator::make($input, [
                'sequence_id' => 'required|exists:pluto.drift_sequences,id',
                'name' => 'nullable|string|max:255',
                'template_id' => 'required|exists:pluto.templates,id',
                'audience_id' => 'required_if:sequence_number,1|nullable|exists:pluto.audiences,id',
                'subject' => 'required|string|max:255',
                'from_emails' => 'required|array|min:1',
                'from_emails.*' => 'email|exists:pluto.email_accounts,email',
                'time_gap' => 'required_if:sequence_number,1|nullable|integer|min:0',
                'batch_size' => 'nullable|integer|min:1',
                'wait_time' => 'nullable|integer|min:0',
                'wait_unit' => 'nullable|in:minutes,hours,days',
                'sequence_number' => 'nullable|integer|min:1',
                'assignment_mode' => 'required_if:sequence_number,1|nullable|in:batch_size,manual_assign',
                'manual_assignments' => 'nullable|array',
                'manual_assignments.*' => 'integer|min:0',
                'categories' => 'exclude_if:sequence_number,1|nullable|array',
                'categories.*' => 'exclude_if:sequence_number,1|in:replied,unsubscribed,softbounce,hardbounce,opened,unopened,automatic_reply,no_longer',
                'set_id' => 'required|exists:pluto.sets,id',
            ]);

            if ($validator->fails()) {
                Log::warning("Validation failed for send: " . json_encode($validator->errors()));
                return response()->json(['details' => $validator->errors()->first()], 422);
            }

            Log::info('Validated data:', $validator->validated());

            $sequence = DriftSequence::on('pluto')->findOrFail($input['sequence_id']);
            if (!in_array($sequence->status, ['draft'])) {
                Log::warning("Sequence cannot be sent due to invalid status", [
                    'sequence_id' => $sequence->id,
                    'status' => $sequence->status,
                ]);
                return response()->json(['error' => 'Sequence cannot be sent in current status'], 422);
            }

            if ($sequence->set_id != $input['set_id']) {
                Log::warning("Set ID mismatch for sequence", [
                    'sequence_id' => $sequence->id,
                    'set_id' => $input['set_id'],
                ]);
                return response()->json(['error' => 'Sequence does not belong to the specified set'], 422);
            }

            $isFirstSequence = ($input['sequence_number'] == 1);
            $updateData = [
                'name' => $input['name'] ?? $sequence->name,
                'template_id' => $input['template_id'],
                'audience_id' => $isFirstSequence ? $input['audience_id'] : null,
                'subject' => $input['subject'],
                'from_emails' => json_encode($input['from_emails']),
                'time_gap' => $isFirstSequence ? ($input['time_gap'] ?? 0) : 0,
                'batch_size' => $isFirstSequence && ($input['assignment_mode'] === 'batch_size') ? ($input['batch_size'] ?? null) : null,
                'wait_time' => $input['wait_time'] ?? 0,
                'wait_unit' => $input['wait_unit'] ?? 'minutes',
                'status' => 'running',
                'sequence_number' => $input['sequence_number'],
                'assignment_mode' => $isFirstSequence ? ($input['assignment_mode'] ?? 'batch_size') : 'batch_size',
                'manual_assignments' => $isFirstSequence && ($input['assignment_mode'] === 'manual_assign') ? json_encode($input['manual_assignments'] ?? []) : null,
                'started_at' => now(),
            ];

            // Log current categories value before update
            Log::info('Current categories before update:', [
                'sequence_id' => $sequence->id,
                'categories' => $sequence->categories,
                'is_first_sequence' => $isFirstSequence,
            ]);

            // Only update categories if explicitly provided in the input and not first sequence
            if (array_key_exists('categories', $input) && !$isFirstSequence) {
                $updateData['categories'] = json_encode($input['categories'] ?? []);
                Log::info('Updating categories:', [
                    'sequence_id' => $sequence->id,
                    'new_categories' => $updateData['categories'],
                ]);
            } else {
                // Explicitly exclude categories to prevent overwriting
                unset($updateData['categories']);
                Log::info('Preserving existing categories:', [
                    'sequence_id' => $sequence->id,
                    'existing_categories' => $sequence->categories,
                ]);
            }

            $sequence->update($updateData);

            // Log categories value after update
            Log::info('Categories after update:', [
                'sequence_id' => $sequence->id,
                'categories' => $sequence->fresh()->categories,
            ]);

            Log::info('Sequence updated:', $sequence->toArray());

            $subscribers = $this->getSubscribers($sequence);
            if ($subscribers->isEmpty()) {
                Log::warning("No subscribed subscribers found for sequence {$sequence->id}", [
                    'audience_id' => $sequence->audience_id,
                    'sequence_number' => $sequence->sequence_number,
                    'categories' => $sequence->categories,
                ]);
                $sequence->update(['status' => 'completed', 'unopened' => 0]);
                return response()->json(['error' => 'No subscribed subscribers found'], 400);
            }

            $activeAccounts = EmailAccount::on('pluto')
                ->whereIn('email', $input['from_emails'])
                ->where('status', 'active')
                ->get();

            if ($activeAccounts->isEmpty()) {
                Log::error("No active email accounts found for sequence {$sequence->id}", [
                    'from_emails' => $input['from_emails'],
                ]);
                return response()->json(['error' => 'No active email accounts found'], 400);
            }

            $totalSubscribers = $subscribers->count();
            $response = ['message' => 'Sequence sent successfully', 'sequence' => $sequence];
            $assignedSubscribers = 0;

            if ($isFirstSequence && $input['assignment_mode'] === 'manual_assign' && !empty($input['manual_assignments'])) {
                // Manual assignments with round-robin dispatching for first sequence
                $manualAssignments = $input['manual_assignments'];
                $delay = 0;

                // Prepare assignment data for round-robin dispatching
                $assignmentData = [];
                $subscriberIndex = 0;
                
                foreach ($manualAssignments as $email => $count) {
                    $account = $activeAccounts->firstWhere('email', $email);
                    if (!$account) {
                        Log::warning("Email account not found or inactive: {$email}");
                        continue;
                    }

                    $subscribersForEmail = $subscribers->slice($subscriberIndex, $count);
                    $subscriberIndex += $subscribersForEmail->count();

                    foreach ($subscribersForEmail as $subscriber) {
                        $assignmentData[] = [
                            'subscriber' => $subscriber,
                            'account' => $account,
                            'count' => $count,
                        ];
                    }
                }

                Log::info('Manual assignment round-robin dispatching for immediate send', [
                    'total_assignments' => count($assignmentData),
                    'manual_assignments' => $manualAssignments,
                ]);

                // Dispatch all assignments in the order they were prepared (round-robin style)
                foreach ($assignmentData as $index => $assignment) {
                    $subscriber = $assignment['subscriber'];
                    $account = $assignment['account'];
                    $count = $assignment['count'];

                    // Create log
                    DriftSequenceLog::on('pluto')->updateOrCreate(
                        [
                            'sequence_id' => $sequence->id,
                            'subscriber_id' => $subscriber->id,
                            'email_account_id' => $account->id,
                        ],
                        [
                            'set_id' => $sequence->set_id,
                            'template_id' => $sequence->template_id,
                            'status' => 'pending',
                            'tracking_open' => false,
                            'tracking_clicks' => json_encode([]),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );

                    $queueName = "emails_sender_{$account->id}"; // Use dedicated queue for the email account
                    if ($delay > 0) {
                        SendDriftEmailSequenceJob::dispatch($sequence->id, $subscriber->id, $account->id, $count)
                            ->onQueue($queueName)
                            ->delay(now()->addSeconds($delay));
                    } else {
                        SendDriftEmailSequenceJob::dispatch($sequence->id, $subscriber->id, $account->id, $count)
                            ->onQueue($queueName);
                    }

                    Log::info("Dispatched manual assignment job for subscriber {$subscriber->id} in sequence {$sequence->id}", [
                        'email_account_id' => $account->id,
                        'queue' => $queueName,
                        'delay' => $delay,
                        'assignment_index' => $index + 1,
                        'total_assignments' => count($assignmentData),
                    ]);

                    $delay += $sequence->time_gap;
                    $assignedSubscribers++;
                }
            } else {
                // Round-robin assignment for even distribution across all accounts
                $batchSize = $isFirstSequence ? ($input['batch_size'] ?? 1) : 1;
                $accountCount = $activeAccounts->count();
                $batchSize = max(1, (int) $batchSize);
                
                // Respect batch size limit: each account gets exactly batch_size subscribers
                $maxTotal = $batchSize * $accountCount;
                $totalToAssign = min($subscribers->count(), $maxTotal);
                $subscribersPerAccount = $batchSize; // Each account gets exactly batch_size

                Log::info('Round-robin assignment for immediate send (respecting batch size)', [
                    'total_available_subscribers' => $subscribers->count(),
                    'batch_size' => $batchSize,
                    'account_count' => $accountCount,
                    'max_total_to_assign' => $maxTotal,
                    'total_to_assign' => $totalToAssign,
                    'subscribers_per_account' => $subscribersPerAccount,
                ]);

                // True round-robin dispatching - interleave jobs across accounts with batch size limit
                $subscriberIndex = 0;
                $delay = 0;
                $accountIndex = 0;
                $accountJobCounts = array_fill(0, $accountCount, 0); // Track jobs per account

                Log::info("Starting true round-robin job dispatching for immediate send", [
                    'total_to_assign' => $totalToAssign,
                    'account_count' => $accountCount,
                    'batch_size_per_account' => $batchSize,
                    'dispatch_pattern' => 'interleaved_round_robin_with_batch_limit',
                ]);

                // Dispatch jobs in round-robin fashion: Job1→Account1, Job2→Account2, etc. until each account hits batch_size
                while ($subscriberIndex < $totalToAssign) {
                    $currentAccountIndex = $accountIndex % $accountCount;
                    
                    // Skip this account if it has reached its batch size limit
                    if ($accountJobCounts[$currentAccountIndex] >= $batchSize) {
                        $accountIndex++;
                        
                        // Check if all accounts have reached their limits
                        $allAccountsFull = true;
                        for ($i = 0; $i < $accountCount; $i++) {
                            if ($accountJobCounts[$i] < $batchSize) {
                                $allAccountsFull = false;
                                break;
                            }
                        }
                        
                        if ($allAccountsFull) {
                            Log::info("All accounts have reached batch size limit", [
                                'assigned_subscribers' => $subscriberIndex,
                                'total_available' => $totalToAssign,
                                'account_job_counts' => $accountJobCounts,
                            ]);
                            break;
                        }
                        continue;
                    }

                    $account = $activeAccounts[$currentAccountIndex];
                    $subscriber = $subscribers[$subscriberIndex];

                    // Create log
                    DriftSequenceLog::on('pluto')->updateOrCreate(
                        [
                            'sequence_id' => $sequence->id,
                            'subscriber_id' => $subscriber->id,
                            'email_account_id' => $account->id,
                        ],
                        [
                            'set_id' => $sequence->set_id,
                            'template_id' => $sequence->template_id,
                            'status' => 'pending',
                            'tracking_open' => false,
                            'tracking_clicks' => json_encode([]),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );

                    // Dispatch job immediately to round-robin queue
                    $queueName = "emails_sender_{$account->id}";
                    if ($delay > 0) {
                        SendDriftEmailSequenceJob::dispatch($sequence->id, $subscriber->id, $account->id, $batchSize)
                            ->onQueue($queueName)
                            ->delay(now()->addSeconds($delay));
                    } else {
                        SendDriftEmailSequenceJob::dispatch($sequence->id, $subscriber->id, $account->id, $batchSize)
                            ->onQueue($queueName);
                    }

                    Log::info("Dispatched batch-limited round-robin job for subscriber {$subscriber->id} in sequence {$sequence->id}", [
                        'email_account_id' => $account->id,
                        'queue' => $queueName,
                        'delay' => $delay,
                        'subscriber_index' => $subscriberIndex,
                        'account_index' => $currentAccountIndex,
                        'account_job_count' => $accountJobCounts[$currentAccountIndex] + 1,
                        'batch_size_limit' => $batchSize,
                        'round_robin_position' => ($subscriberIndex + 1),
                    ]);

                    $delay += $sequence->time_gap;
                    $subscriberIndex++;
                    $accountIndex++;
                    $accountJobCounts[$currentAccountIndex]++; // Increment job count for this account
                    $assignedSubscribers++;
                }

                Log::info("Batch-limited round-robin assignment completed", [
                    'total_assigned' => $assignedSubscribers,
                    'account_job_counts' => $accountJobCounts,
                    'batch_size_per_account' => $batchSize,
                ]);
            }

            $sentCount = DriftSequenceLog::on('pluto')
            ->where('sequence_id', $sequence->id)
                ->where('status', 'sent')
                ->count();
            $sequence->update(['unopened' => $sentCount]);

            if ($assignedSubscribers < $totalSubscribers) {
                $response['warning'] = 'Not all subscribers were assigned due to email account limits';
                $response['unassigned_subscribers'] = $totalSubscribers - $assignedSubscribers;
            }

            Log::info("Sequence dispatched successfully: {$sequence->id}", [
                'batch_size' => $batchSize ?? null,
                'assigned_subscribers' => $assignedSubscribers,
                'total_subscribers' => $totalSubscribers,
                'unopened' => $sentCount,
            ]);

            return response()->json($response, 200);
        } catch (\Exception $e) {
            Log::error("Error sending sequence: " . $e->getMessage(), [
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to send sequence: ' . $e->getMessage()], 500);
        }
    }
    public function scheduleSequence(Request $request, $sequenceId)
    {
        Log::info('Schedule Drift sequence request data:', $request->all());

        try {
            if (!auth()->check()) {
                Log::error('User not authenticated for scheduling sequence', ['sequence_id' => $sequenceId]);
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $this->setupPlutoConnection($request);

            $data = $request->validate([
                'sequence_id' => 'required',
                'name' => 'nullable|string|max:255',
                'template_id' => 'required|exists:pluto.templates,id',
                'audience_id' => 'required_if:sequence_number,1|nullable|exists:pluto.audiences,id',
                'subject' => 'required|string|max:255',
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
                'time_gap' => 'required_if:sequence_number,1|nullable|integer|min:0',
                'batch_size' => 'required_if:assignment_mode,batch_size|nullable|integer|min:1',
                'wait_time' => 'required|integer|min:0',
                'wait_unit' => 'required|in:minutes,hours,days',
                'sequence_number' => 'required|integer|min:1',
                'assignment_mode' => 'required_if:sequence_number,1|nullable|in:batch_size,manual_assign',
                'manual_assignments' => 'required_if:assignment_mode,manual_assign|array',
                'manual_assignments.*' => 'integer|min:0',
                'categories' => 'exclude_if:sequence_number,1|nullable|array',
                'categories.*' => 'exclude_if:sequence_number,1|in:opened,clicked,unsubscribed,bounced,unopened,hardSoftbounce,automatic_reply',
                'set_id' => 'required|exists:pluto.sets,id',
            ]);

            if (str_starts_with($data['sequence_id'], 'new-')) {
                $sequence = DriftSequence::on('pluto')->create([
                    'name' => $data['name'] ?? 'Sequence ' . time(),
                    'template_id' => $data['template_id'],
                    'audience_id' => $data['audience_id'],
                    'subject' => $data['subject'],
                    'from_emails' => json_encode($data['from_emails']),
                    'time_gap' => $data['time_gap'] ?? 0,
                    'batch_size' => ($data['assignment_mode'] === 'batch_size') ? ($data['batch_size'] ?? null) : null,
                    'wait_time' => $data['wait_time'] ?? 0,
                    'wait_unit' => $data['wait_unit'] ?? 'minutes',
                    'status' => 'draft',
                    'filters' => $data['sequence_number'] > 1 ? json_encode($data['categories'] ?? []) : null,
                    'sequence_number' => $data['sequence_number'],
                    'assignment_mode' => $data['sequence_number'] == 1 ? ($data['assignment_mode'] ?? 'batch_size') : 'batch_size',
                    'manual_assignments' => $data['sequence_number'] == 1 && ($data['assignment_mode'] === 'manual_assign') ? json_encode($data['manual_assignments'] ?? []) : null,
                    'set_id' => $data['set_id'],
                ]);
            } else {
                $sequence = DriftSequence::on('pluto')
                    ->with(['template', 'audience.subscribers'])
                    ->findOrFail($data['sequence_id']);

                if (!in_array($sequence->status, ['draft', 'scheduled'])) {
                    Log::error('Sequence cannot be scheduled due to invalid status', [
                        'sequence_id' => $data['sequence_id'],
                        'status' => $sequence->status
                    ]);
                    return response()->json(['error' => 'Sequence cannot be scheduled in current status'], 422);
                }

                $sequence->update([
                    'name' => $data['name'] ?? $sequence->name,
                    'template_id' => $data['template_id'],
                    'audience_id' => $data['sequence_number'] == 1 ? $data['audience_id'] : null,
                    'subject' => $data['subject'],
                    'from_emails' => json_encode($data['from_emails']),
                    'time_gap' => $data['sequence_number'] == 1 ? ($data['time_gap'] ?? 0) : 0,
                    'batch_size' => $data['sequence_number'] == 1 && ($data['assignment_mode'] === 'batch_size') ? ($data['batch_size'] ?? null) : null,
                    'wait_time' => $data['wait_time'] ?? 0,
                    'wait_unit' => $data['wait_unit'] ?? 'minutes',
                    'filters' => $data['sequence_number'] > 1 ? json_encode($data['categories'] ?? []) : null,
                    'sequence_number' => $data['sequence_number'],
                    'assignment_mode' => $data['sequence_number'] == 1 ? ($data['assignment_mode'] ?? 'batch_size') : 'batch_size',
                    'manual_assignments' => $data['sequence_number'] == 1 && ($data['assignment_mode'] === 'manual_assign') ? json_encode($data['manual_assignments'] ?? []) : null,
                    'set_id' => $data['set_id'],
                ]);
            }

            if (!$sequence->template) {
                Log::error('Template not found for sequence', ['sequence_id' => $sequence->id]);
                return response()->json(['error' => 'Template not found'], 404);
            }

            $subscribers = $this->getSubscribers($sequence);
            if ($subscribers->isEmpty()) {
                Log::warning('No subscribed subscribers found for sequence', ['sequence_id' => $sequence->id]);
                return response()->json(['error' => 'No subscribed subscribers found'], 400);
            }

            $activeAccounts = DB::connection('pluto')
                ->table('email_accounts')
                ->where('user_id', auth()->id())
                ->where('status', 'active')
                ->whereIn('email', $data['from_emails'])
                ->get(['id', 'email', 'type'])
                ->toArray();

            if (empty($activeAccounts)) {
                Log::error('No active email accounts available for the selected emails', ['sequence_id' => $sequence->id]);
                return response()->json(['error' => 'No active email accounts available'], 400);
            }

            $subscribers = $subscribers->values();
            $totalSubscribers = $subscribers->count();
            $scheduledTime = Carbon::parse($data['scheduled_at'], $data['timezone'])->setTimezone('UTC');
            $delay = 0;
            $assignedSubscribers = 0;

            DB::connection('pluto')
                ->table('jobs')
                ->where('payload', 'like', '%DriftSequence%' . $sequence->id . '%')
                ->delete();

            if ($data['sequence_number'] == 1 && $data['assignment_mode'] === 'manual_assign' && !empty($data['manual_assignments'])) {
                // Manual assignments with round-robin dispatching for first sequence
                $manualAssignments = $data['manual_assignments'];
                $delay = 0;

                // Prepare assignment data for round-robin dispatching
                $assignmentData = [];
                $subscriberIndex = 0;
                
                foreach ($manualAssignments as $email => $count) {
                    $account = array_filter($activeAccounts, fn($acc) => $acc->email === $email);
                    $account = reset($account);
                    if (!$account) {
                        Log::warning("Email account not found or inactive: {$email}");
                        continue;
                    }

                    $subscribersForEmail = $subscribers->slice($subscriberIndex, $count);
                    $subscriberIndex += $subscribersForEmail->count();

                    foreach ($subscribersForEmail as $subscriber) {
                        $assignmentData[] = [
                            'subscriber' => $subscriber,
                            'account' => $account,
                            'count' => $count, // Keep the original manual assignment count
                        ];
                    }
                }

                Log::info('Manual assignment round-robin dispatching for scheduled sequence', [
                    'total_assignments' => count($assignmentData),
                    'manual_assignments' => $manualAssignments,
                    'scheduled_at' => $scheduledTime,
                ]);

                // Dispatch all assignments in the order they were prepared (round-robin style)
                foreach ($assignmentData as $index => $assignment) {
                    $subscriber = $assignment['subscriber'];
                    $account = $assignment['account'];
                    $count = $assignment['count']; // Get the manual assignment count

                    // Create log
                    DB::connection('pluto')->table('drift_sequence_logs')->updateOrInsert(
                        [
                            'sequence_id' => $sequence->id,
                            'subscriber_id' => $subscriber->id,
                            'email_account_id' => $account->id
                        ],
                        [
                            'set_id' => $sequence->set_id,
                            'template_id' => $sequence->template_id,
                            'status' => 'pending',
                            'tracking_open' => false,
                            'tracking_clicks' => json_encode([]),
                            'created_at' => now(),
                            'updated_at' => now()
                        ]
                    );

                    $queueName = "emails_sender_{$account->id}"; // Use dedicated queue for the email account
                    SendDriftEmailSequenceJob::dispatch(
                        $sequence->id,
                        $subscriber->id,
                        $account->id,
                        $count // Pass the manual assignment count as batch size
                    )->onQueue($queueName)->delay($scheduledTime->addSeconds($delay));

                    Log::info("Scheduled manual assignment job for subscriber {$subscriber->id} in sequence {$sequence->id}", [
                        'email_account_id' => $account->id,
                        'queue' => $queueName,
                        'delay' => $delay,
                        'scheduled_at' => $scheduledTime->toDateTimeString(),
                        'assignment_index' => $index + 1,
                        'total_assignments' => count($assignmentData),
                    ]);

                    $delay += $sequence->time_gap;
                    $assignedSubscribers++;
                }
            } else {
                // Round-robin assignment for even distribution across all accounts
                $batchSize = ($data['sequence_number'] == 1) ? ($data['batch_size'] ?? 1) : 1;
                $accountCount = count($activeAccounts);
                $batchSize = max(1, (int) $batchSize);
                
                // Respect batch size limit: each account gets exactly batch_size subscribers
                $maxTotal = $batchSize * $accountCount;
                $totalToAssign = min($totalSubscribers, $maxTotal);
                $subscribersPerAccount = $batchSize; // Each account gets exactly batch_size

                Log::info('Round-robin assignment for scheduled sequence (respecting batch size)', [
                    'total_available_subscribers' => $totalSubscribers,
                    'batch_size' => $batchSize,
                    'account_count' => $accountCount,
                    'max_total_to_assign' => $maxTotal,
                    'total_to_assign' => $totalToAssign,
                    'subscribers_per_account' => $subscribersPerAccount,
                    'scheduled_at' => $scheduledTime,
                ]);

                // True round-robin dispatching - interleave jobs across accounts with batch size limit
                $subscriberIndex = 0;
                $delay = 0;
                $accountIndex = 0;
                $accountJobCounts = array_fill(0, $accountCount, 0); // Track jobs per account

                Log::info("Starting true round-robin job dispatching for scheduled sequence", [
                    'total_to_assign' => $totalToAssign,
                    'account_count' => $accountCount,
                    'batch_size_per_account' => $batchSize,
                    'dispatch_pattern' => 'interleaved_round_robin_with_batch_limit',
                    'scheduled_at' => $scheduledTime,
                ]);

                // Dispatch jobs in round-robin fashion: Job1→Account1, Job2→Account2, etc. until each account hits batch_size
                while ($subscriberIndex < $totalToAssign) {
                    $currentAccountIndex = $accountIndex % $accountCount;
                    
                    // Skip this account if it has reached its batch size limit
                    if ($accountJobCounts[$currentAccountIndex] >= $batchSize) {
                        $accountIndex++;
                        
                        // Check if all accounts have reached their limits
                        $allAccountsFull = true;
                        for ($i = 0; $i < $accountCount; $i++) {
                            if ($accountJobCounts[$i] < $batchSize) {
                                $allAccountsFull = false;
                                break;
                            }
                        }
                        
                        if ($allAccountsFull) {
                            Log::info("All accounts have reached batch size limit for scheduled sequence", [
                                'assigned_subscribers' => $subscriberIndex,
                                'total_available' => $totalToAssign,
                                'account_job_counts' => $accountJobCounts,
                            ]);
                            break;
                        }
                        continue;
                    }

                    $account = $activeAccounts[$currentAccountIndex];
                    $subscriber = $subscribers[$subscriberIndex];

                    // Create log
                    DB::connection('pluto')->table('drift_sequence_logs')->updateOrInsert(
                        [
                            'sequence_id' => $sequence->id,
                            'subscriber_id' => $subscriber->id,
                            'email_account_id' => $account->id
                        ],
                        [
                            'set_id' => $sequence->set_id,
                            'template_id' => $sequence->template_id,
                            'status' => 'pending',
                            'tracking_open' => false,
                            'tracking_clicks' => json_encode([]),
                            'created_at' => now(),
                            'updated_at' => now()
                        ]
                    );

                    // Dispatch job immediately to round-robin queue
                    $queueName = "emails_sender_{$account->id}";
                    SendDriftEmailSequenceJob::dispatch(
                        $sequence->id,
                        $subscriber->id,
                        $account->id
                    )->onQueue($queueName)->delay($scheduledTime->addSeconds($delay));

                    Log::info("Scheduled batch-limited round-robin job for subscriber {$subscriber->id} in sequence {$sequence->id}", [
                        'email_account_id' => $account->id,
                        'queue' => $queueName,
                        'delay' => $delay,
                        'scheduled_at' => $scheduledTime->toDateTimeString(),
                        'subscriber_index' => $subscriberIndex,
                        'account_index' => $currentAccountIndex,
                        'account_job_count' => $accountJobCounts[$currentAccountIndex] + 1,
                        'batch_size_limit' => $batchSize,
                        'round_robin_position' => ($subscriberIndex + 1),
                    ]);

                    $delay += $sequence->time_gap;
                    $subscriberIndex++;
                    $accountIndex++;
                    $accountJobCounts[$currentAccountIndex]++; // Increment job count for this account
                    $assignedSubscribers++;
                }

                Log::info("Batch-limited round-robin assignment completed for scheduled sequence", [
                    'total_assigned' => $assignedSubscribers,
                    'account_job_counts' => $accountJobCounts,
                    'batch_size_per_account' => $batchSize,
                ]);
            }

            $sequence->update(['status' => 'scheduled', 'scheduled_at' => $scheduledTime]);

            $response = [
                'message' => 'Sequence scheduled successfully',
                'sequence' => $sequence,
                'scheduled_at' => $scheduledTime->setTimezone($data['timezone'])->toDateTimeString(),
                'assigned_subscribers' => $assignedSubscribers,
                'total_subscribers' => $totalSubscribers
            ];

            if ($assignedSubscribers < $totalSubscribers) {
                $response['warning'] = 'Not all subscribers were assigned due to email account limits';
                $response['unassigned_subscribers'] = $totalSubscribers - $assignedSubscribers;
            }

            Log::info("Sequence scheduled successfully: {$sequence->id}", [
                'batch_size' => $data['batch_size'] ?? null,
                'assigned_subscribers' => $assignedSubscribers,
                'total_subscribers' => $totalSubscribers,
                'scheduled_at' => $scheduledTime->toDateTimeString()
            ]);

            return response()->json($response, 200);
        } catch (\Exception $e) {
            Log::error("Error scheduling sequence: " . $e->getMessage(), [
                'sequence_id' => $sequenceId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to schedule sequence: ' . $e->getMessage()], 500);
        }
    }
    public function sendSequence(Request $request, $sequenceId)
    {
        $this->setupPlutoConnection($request);

        try {
            $sequence = DriftSequence::on('pluto')->findOrFail($sequenceId);

            // Validate request data
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'subject' => 'required|string|max:255',
                'template_id' => 'required|exists:pluto.templates,id',
                'audience_id' => $sequence->is_first ? 'required|exists:pluto.audiences,id' : 'nullable|exists:pluto.audiences,id',
                'from_emails' => 'required|array',
                'from_emails.*' => 'email',
                'time_gap' => 'required|integer|min:0',
                'batch_size' => 'required|integer|min:1',
                'wait_time' => 'required|integer|min:0',
                'wait_unit' => 'required|in:minutes,hours,days',
            ]);

            // Update sequence
            $sequence->update([
                'name' => $validated['name'],
                'subject' => $validated['subject'],
                'template_id' => $validated['template_id'],
                'audience_id' => $validated['audience_id'],
                'from_emails' => json_encode($validated['from_emails']),
                'time_gap' => $validated['time_gap'],
                'batch_size' => $validated['batch_size'],
                'wait_time' => $validated['wait_time'],
                'wait_unit' => $validated['wait_unit'],
                'status' => 'running',
                'started_at' => now(),
            ]);

            // Trigger email sending (simplified; implement your email sending logic)
            // Example: Queue a job to process emails
            // SendDriftEmailsJob::dispatch($sequence);

            Log::info("Sequence sent: " . $sequenceId);
            return response()->json(['message' => 'Sequence sent successfully'], 200);
        } catch (\Exception $e) {
            Log::error("Error sending sequence: " . $e->getMessage(), ['sequence_id' => $sequenceId]);
            return response()->json(['error' => 'Failed to send sequence: ' . $e->getMessage()], 500);
        }
    }


    public function previewSequence(Request $request, $sequenceId)
    {
        $this->setupPlutoConnection($request);

        try {
            $sequence = DriftSequence::on('pluto')->findOrFail($sequenceId);

            // Validate request data
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'subject' => 'required|string|max:255',
                'template_id' => 'required|exists:pluto.templates,id',
                'audience_id' => $sequence->is_first ? 'required|exists:pluto.audiences,id' : 'nullable|exists:pluto.audiences,id',
                'from_emails' => 'required|array|min:1',
                'from_emails.*' => 'email',
                'time_gap' => 'required|integer|min:0',
                'batch_size' => 'required|integer|min:1',
                'wait_time' => 'required|integer|min:0',
                'wait_unit' => 'required|in:minutes,hours,days',
            ]);

            // Fetch template content
            $template = Template::on('pluto')->findOrFail($validated['template_id']);

            // Clean and prepare content
            $content = $template->content;
            // Replace multiple newlines with single newline
            $content = preg_replace("/\n+/", "\n", $content);
            // Escape HTML to treat as plain text, preserving newlines
            $content = htmlspecialchars($content, ENT_QUOTES, 'UTF-8');

            // Replace placeholders
            $placeholders = [
                '[first_name]' => 'John',
                '[last_name]' => 'Doe',
                '[email]' => 'john.doe@example.com',
                '[unsubscribe_link]' => '#',
                '[sender_email]' => $validated['from_emails'][0],
                '[sender_first_name]' => 'Sender',
                '[sender_last_name]' => 'Name',
            ];

            $content = str_replace(
                array_keys($placeholders),
                array_values($placeholders),
                $content
            );

            $subject = str_replace(
                array_keys($placeholders),
                array_values($placeholders),
                $validated['subject']
            );

            // Render content with pre-wrap to preserve newlines
            $html = <<<HTML
<html>
    <head><title>Email Preview</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.2; color: #333; margin: 0; padding: 0;">
        <div style="margin: 0; padding: 10px;">
            <h3 style="margin: 0 0 10px 0;">Subject: {$subject}</h3>
            <p style="margin: 0 0 10px 0;"><strong>From:</strong> {$validated['from_emails'][0]}</p>
            <div style="white-space: pre-wrap; font-size: 14px;">{$content}</div>
        </div>
    </body>     
</html>
HTML;

            Log::info("Sequence previewed: " . $sequenceId . ", Content: " . $content);
            return response()->json(['preview' => $html], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error("Validation error previewing sequence: " . json_encode($e->errors()), ['sequence_id' => $sequenceId]);
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error("Error previewing sequence: " . $e->getMessage(), ['sequence_id' => $sequenceId]);
            return response()->json(['error' => 'Failed to preview sequence: ' . $e->getMessage()], 500);
        }
    }
    public function pause(Request $request, $sequenceId)
    {
        $this->setupPlutoConnection($request);

        try {
            $sequence = DriftSequence::on('pluto')->findOrFail($sequenceId);

            if ($sequence->status !== 'running') {
                return response()->json(['details' => 'Sequence is not running'], 422);
            }

            $sequence->update(['status' => 'paused']);

            DB::connection('pluto')
                ->table('jobs')
                ->where('payload', 'like', '%DriftSequence%' . $sequenceId . '%')
                ->update(['reserved_at' => null, 'attempts' => 0]);

            Log::info("Sequence paused: " . $sequenceId);
            return response()->json(['message' => 'Sequence paused successfully'], 200);
        } catch (\Exception $e) {
            Log::error("Error pausing sequence: " . $e->getMessage());
            return response()->json(['error' => 'Failed to pause sequence: ' . $e->getMessage()], 500);
        }
    }

    public function resume(Request $request, $sequenceId)
    {
        $this->setupPlutoConnection($request);

        try {
            $sequence = DriftSequence::on('pluto')->findOrFail($sequenceId);

            if ($sequence->status !== 'paused') {
                return response()->json(['details' => 'Sequence is not paused'], 422);
            }

            $sequence->update(['status' => 'running']);

            // Clear existing jobs
            DB::connection('pluto')
                ->table('jobs')
                ->where('payload', 'like', '%DriftSequence%' . $sequenceId . '%')
                ->delete();
            Log::info("Cleared existing jobs for resumed sequence: " . $sequenceId);

            // Fetch pending subscribers
            $pendingLogs = DriftSequenceLog::on('pluto')
                ->where('sequence_id', $sequenceId)
                ->where('status', 'pending')
                ->get();

            if ($pendingLogs->isEmpty()) {
                Log::info("No pending subscribers for resumed sequence: " . $sequenceId);
                $sequence->update(['status' => 'completed']);
                return response()->json(['message' => 'Sequence resumed but no pending subscribers'], 200);
            }

            // Re-dispatch jobs for pending subscribers
            foreach ($pendingLogs as $log) {
                SendDriftEmailSequenceJob::dispatch(
                    $sequenceId,
                    $log->subscriber_id,
                    $log->email_account_id
                )->onQueue('emails');
            }

            Log::info("Sequence resumed: " . $sequenceId, [
                'pending_subscribers' => $pendingLogs->count()
            ]);
            return response()->json(['message' => 'Sequence resumed successfully'], 200);
        } catch (\Exception $e) {
            Log::error("Error resuming sequence: " . $e->getMessage());
            return response()->json(['error' => 'Failed to resume sequence: ' . $e->getMessage()], 500);
        }
    }

    public function cancel(Request $request, $sequenceId)
    {
        $this->setupPlutoConnection($request);

        try {
            $sequence = DriftSequence::on('pluto')->findOrFail($sequenceId);

            if (!in_array($sequence->status, ['running', 'scheduled', 'paused'])) {
                return response()->json(['details' => 'Sequence cannot be cancelled'], 422);
            }

            $sequence->update(['status' => 'cancelled']);

            DB::connection('pluto')
                ->table('jobs')
                ->where('payload', 'like', '%DriftSequence%' . $sequenceId . '%')
                ->delete();

            Log::info("Sequence cancelled: " . $sequenceId);
            return response()->json(['message' => 'Sequence cancelled successfully'], 200);
        } catch (\Exception $e) {
            Log::error("Error cancelling sequence: " . $e->getMessage());
            return response()->json(['error' => 'Failed to cancel sequence: ' . $e->getMessage()], 500);
        }
    }
    public function createSetWithSequences(Request $request)
    {
        Log::info('Create set with sequences request data:', $request->all());

        try {
            $this->setupPlutoConnection($request);

            // Validate input
            $validator = Validator::make($request->all(), [
                'set_name' => 'required|string|max:255|unique:pluto.sets,set_name',
                'sequence_count' => 'required|integer|min:1|max:50',
            ]);

            if ($validator->fails()) {
                Log::warning('Validation failed for createSetWithSequences: ' . json_encode($validator->errors()));
                return response()->json(['error' => $validator->errors()->first()], 422);
            }

            // Begin transaction to ensure atomicity
            DB::connection('pluto')->beginTransaction();

            // Create the set
            $set = Set::on('pluto')->create([
                'set_name' => $request->set_name,
                'description' => $request->description ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create sequences
            $sequences = [];
            for ($i = 1; $i <= $request->sequence_count; $i++) {
                $sequence = DriftSequence::on('pluto')->create([
                    'set_id' => $set->id,
                    'name' => "Sequence $i",
                    'template_id' => 0, // Placeholder; user must select later
                    'subject' => "Default Subject $i",
                    'from_emails' => json_encode([]), // Ensure valid JSON
                    'time_gap' => 1,
                    'batch_size' => 2,
                    'wait_time' => 0,
                    'wait_unit' => 'minutes',
                    'status' => 'draft',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $sequences[] = $sequence;
            }

            DB::connection('pluto')->commit();

            Log::info("Set created with ID: {$set->id}, Sequences created: {$request->sequence_count}");

            return response()->json([
                'message' => 'Set and sequences created successfully',
                'set_id' => $set->id,
                'set_name' => $set->set_name,
                'sequences' => $sequences,
            ], 200);
        } catch (\Illuminate\Database\QueryException $e) {
            DB::connection('pluto')->rollBack();
            Log::error('Database error creating set with sequences: ' . $e->getMessage());
            return response()->json(['error' => 'Database error: ' . $e->getMessage()], 500);
        } catch (\Exception $e) {
            DB::connection('pluto')->rollBack();
            Log::error('Error creating set with sequences: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create set: ' . $e->getMessage()], 500);
        }
    }

    public function deleteSequence(Request $request, $sequenceId)
    {
        $this->setupPlutoConnection($request);

        try {
            $sequence = DriftSequence::on('pluto')->findOrFail($sequenceId);

            // Check if sequence can be deleted
            if (in_array($sequence->status, ['running', 'scheduled', 'paused'])) {
                Log::warning("Cannot delete sequence in {$sequence->status} status", ['sequence_id' => $sequenceId]);
                return response()->json(['error' => 'Cannot delete sequence in current status'], 422);
            }

            // Delete associated logs
            DriftSequenceLog::on('pluto')->where('sequence_id', $sequenceId)->delete();

            // Delete the sequence
            $sequence->delete();

            Log::info("Sequence deleted: " . $sequenceId);
            return response()->json(['message' => 'Sequence deleted successfully'], 200);
        } catch (\Exception $e) {
            Log::error("Error deleting sequence: " . $e->getMessage(), ['sequence_id' => $sequenceId]);
            return response()->json(['error' => 'Failed to delete sequence: ' . $e->getMessage()], 500);
        }
    }


    public function sequences(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);

            Log::info('Fetching sequences for request', ['request' => $request->getUri()]);

            $setId = $request->input('set_id');
            if (!$setId) {
                return response()->json(['error' => 'Set ID is required'], 400);
            }

            $set = Set::on('pluto')->findOrFail($setId);

            $sequences = DriftSequence::on('pluto')
                ->where('set_id', $setId)
                ->with(['template' => function ($query) {
                    $query->select('id', 'title');
                }])
                ->get([
                    'id',
                    'set_id',
                    'name',
                    'subject',
                    'template_id',
                    'audience_id',
                    'from_emails',
                    'time_gap',
                    'batch_size',
                    'wait_time',
                    'wait_unit',
                    'categories',
                    'status',
                    'previous_sequence_id',
                    'assignment_mode',
                    'manual_assignments',
                ]);

            // Ensure all fields are present and decode JSON fields
            $sequencesArr = [];
            foreach ($sequences as $sequence) {
                $arr = $sequence->toArray();
                $arr['categories'] = $arr['categories'] ? json_decode($arr['categories'], true) : [];
                if (!isset($arr['assignment_mode']) || $arr['assignment_mode'] === null) {
                    $arr['assignment_mode'] = 'batch_size';
                }
                if (!isset($arr['batch_size'])) {
                    $arr['batch_size'] = null;
                }
                if (isset($arr['manual_assignments'])) {
                    if (is_string($arr['manual_assignments'])) {
                        $decoded = json_decode($arr['manual_assignments'], true);
                        $arr['manual_assignments'] = $decoded !== null ? $decoded : [];
                    }
                } else {
                    $arr['manual_assignments'] = [];
                }
                $sequencesArr[] = $arr;
            }

            Log::info("Fetched sequences for set {$set->id}: " . count($sequencesArr), [
                'sequence_ids' => array_column($sequencesArr, 'id'),
            ]);

            $apiResponse = [
                'set_id' => $set->id,
                'set_name' => $set->set_name,
                'sequences' => $sequencesArr,
            ];
            Log::info('[DEBUG] DriftController sequences API response', $apiResponse);
            return response()->json($apiResponse, 200);
        } catch (\Exception $e) {
            Log::error("Error fetching sequences: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to fetch sequences: ' . $e->getMessage()], 500);
        }
    }
    public function reports($sequenceId, Request $request)
    {
        $this->setupPlutoConnection($request);

        try {
            $sequence = DriftSequence::on('pluto')
                ->with(['audience.subscribers'])
                ->findOrFail($sequenceId);

            $report = [
                'total' => ['count' => 0, 'emails' => []],
                'sent' => ['count' => 0, 'emails' => []],
                'opened' => ['count' => 0, 'emails' => []],
                'clicked' => ['count' => 0, 'emails' => []],
                'replied' => ['count' => 0, 'emails' => []],
                'unsubscribed' => ['count' => 0, 'emails' => []],
                'softbounce' => ['count' => 0, 'emails' => []],
                'hardbounce' => ['count' => 0, 'emails' => []],
                'unopened' => ['count' => 0, 'emails' => []],
                'automatic_reply' => ['count' => 0, 'emails' => []],
                'no_longer' => ['count' => 0, 'emails' => []],
            ];

            if (!in_array($sequence->status, ['running', 'completed'])) {
                return response()->json([
                    'message' => 'Reports are only available for running or completed sequences',
                    'report' => $report,
                ], 200);
            }

            $setId = $request->input('set_id');
            if ($setId && $sequence->set_id != $setId) {
                return response()->json(['error' => 'Sequence does not belong to the specified set'], 400);
            }

            $fromEmails = is_array($sequence->from_emails)
                ? $sequence->from_emails
                : json_decode($sequence->from_emails, true) ?? [];

            $subscriberEmails = $sequence->audience && $sequence->audience->subscribers
                ? $sequence->audience->subscribers->pluck('email')->toArray()
                : [];

            $filters = [];

            $sequenceLogs = DB::connection('pluto')
                ->table('drift_sequence_logs')
                ->where('sequence_id', $sequenceId)
                ->join('subscribers', 'drift_sequence_logs.subscriber_id', '=', 'subscribers.id')
                ->leftJoin('email_accounts', 'drift_sequence_logs.email_account_id', '=', 'email_accounts.id')
                ->select(
                    'drift_sequence_logs.id',
                    'drift_sequence_logs.message_id',
                    'drift_sequence_logs.status',
                    'drift_sequence_logs.tracking_open',
                    'drift_sequence_logs.tracking_clicks',
                    'email_accounts.email as account_email',
                    'subscribers.id as subscriber_id',
                    'subscribers.email'
                )
                ->get();

            $replyMap = DB::connection('pluto')->table('emails')
                ->select('in_reply_to', 'status')
                ->whereNotNull('in_reply_to')
                ->get()
                ->groupBy('in_reply_to');

            foreach ($sequenceLogs as $log) {
                $status = strtolower($log->status ?? 'unknown');
                // Fetch the email body for this log
                $emailBody = null;
                if (!empty($log->message_id)) {
                    if ($status === 'sent') {
                        // Fetch template content by template_id from drift_sequence_logs
                        $templateId = DB::connection('pluto')->table('drift_sequence_logs')->where('id', $log->id)->value('template_id');
                        $emailBody = null;
                        if ($templateId) {
                            $emailBody = Template::on('pluto')->where('id', $templateId)->value('content');
                        }
                        Log::debug('[DriftReport] Sent email body fetch (TEMPLATE)', [
                            'log_id' => $log->id,
                            'template_id' => $templateId,
                            'body' => $emailBody
                        ]);
                    } else {
                        $emailBody = DB::connection('pluto')->table('emails')
                            ->where('account_email', $log->account_email)
                            ->where('in_reply_to', $log->message_id)
                            ->where('from', 'like', '%' . $log->email . '%')
                            ->value('body');
                        Log::debug('[DriftReport] Reply email body fetch', [
                            'account_email' => $log->account_email,
                            'from' => $log->email,
                            'in_reply_to' => $log->message_id,
                            'body' => $emailBody
                        ]);
                    }
                }
                $entry = [
                    'subscriber_email' => $log->email,
                    'account_email' => $log->account_email,
                    'body' => $emailBody
                ];
                // For sent logs, also include sender and recipient from the log row
                if ($status === 'sent') {
                    $entry['sender'] = $log->account_email;
                    $entry['recipient'] = $log->email;
                }

                $report['total']['count']++;
                $report['total']['emails'][] = $entry;

                if (!empty($log->message_id)) {
                    $report['sent']['count']++;
                    $report['sent']['emails'][] = $entry;
                }

                if (!empty($log->message_id) && isset($replyMap[$log->message_id])) {
                    $replyStatus = strtolower($replyMap[$log->message_id][0]->status ?? null);
                    if ($replyStatus && $replyStatus !== $status) {
                        DB::connection('pluto')->table('drift_sequence_logs')
                            ->where('sequence_id', $sequenceId)
                            ->where('message_id', $log->message_id)
                            ->update(['status' => $replyStatus]);

                        $status = $replyStatus;
                    }

                    if ($replyStatus === 'unknown') {
                        $report['replied']['count']++;
                        $report['replied']['emails'][] = $entry;
                        $this->removeFromUnopened($report, $log->email);
                    }
                }

                $filters[] = [
                    'id' => $log->subscriber_id,
                    'status' => $status,
                    'email' => $log->email,
                ];

                if ($log->tracking_open) {
                    $report['opened']['count']++;
                    $report['opened']['emails'][] = $entry;
                }

                if (!is_null($log->tracking_clicks) && $log->tracking_clicks !== '[]') {
                    $report['clicked']['count']++;
                    $report['clicked']['emails'][] = $entry;
                }

                if ($status === 'sent' && !$log->tracking_open) {
                    $report['unopened']['count']++;
                    $report['unopened']['emails'][] = $entry;
                }

                switch ($status) {
                    case 'replied':
                        $report['replied']['count']++;
                        $report['replied']['emails'][] = $entry;
                        $this->removeFromUnopened($report, $log->email);
                        break;
                    case 'unsubscribed':
                    case 'unsubscribe':
                        $report['unsubscribed']['count']++;
                        $report['unsubscribed']['emails'][] = $entry;
                        $this->removeFromUnopened($report, $log->email);
                        break;
                    case 'softbounce':
                    case 'soft_bounce':
                        $report['softbounce']['count']++;
                        $report['softbounce']['emails'][] = $entry;
                        $this->removeFromUnopened($report, $log->email);
                        break;
                    case 'hardbounce':
                    case 'hard_bounce':
                        $report['hardbounce']['count']++;
                        $report['hardbounce']['emails'][] = $entry;
                        $this->removeFromUnopened($report, $log->email);
                        break;
                    case 'automatic_reply':
                        $report['automatic_reply']['count']++;
                        $report['automatic_reply']['emails'][] = $entry;
                        $this->removeFromUnopened($report, $log->email);
                        break;
                    case 'no_longer':
                    case 'nolonger':
                        $report['no_longer']['count']++;
                        $report['no_longer']['emails'][] = $entry;
                        $this->removeFromUnopened($report, $log->email);
                        break;
                }
            }

            $groupedFilters = [];
            foreach ($filters as $filter) {
                if (!isset($filter['status'])) continue;
                $type = $filter['status'];
                if (!isset($groupedFilters[$type])) {
                    $groupedFilters[$type] = [
                        'type' => $type,
                        'id' => [],
                        'email' => [],
                    ];
                }
                $groupedFilters[$type]['id'][] = $filter['id'];
                $groupedFilters[$type]['email'][] = $filter['email'];
            }

            $finalGroupedFilters = array_values($groupedFilters);

            DriftSequence::on('pluto')->where('id', $sequenceId)->update([
                'unopened' => $report['unopened']['count'],
                'filters' => json_encode($finalGroupedFilters),
            ]);

            return response()->json($report, 200);
        } catch (\Exception $e) {
            Log::error("Error fetching reports: " . $e->getMessage(), [
                'sequence_id' => $sequenceId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to fetch reports: ' . $e->getMessage()], 500);
        }
    }


    protected function isReplyToSequence($inReplyTo, $sequenceId)
    {
        // Check if the In-Reply-To header matches a sent email's Message-ID from this sequence
        return DB::connection('pluto')
            ->table('drift_sequence_logs')
            ->where('sequence_id', $sequenceId)
            ->where('message_id', $inReplyTo)
            ->exists();
    }


    protected function getGoogleClient(EmailAccount $account)
    {
        $client = new Google_Client();
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setRedirectUri(config('services.google.redirect_uri'));
        $client->setScopes([
            Google_Service_Gmail::GMAIL_SEND,
            Google_Service_Gmail::GMAIL_READONLY,
        ]);
        $client->setAccessType('offline');

        $token = json_decode($account->token, true);
        if (!$token) {
            throw new \Exception('No OAuth token found for email account: ' . $account->email);
        }

        $client->setAccessToken($token);

        if ($client->isAccessTokenExpired()) {
            $refreshToken = $token['refresh_token'] ?? null;
            if ($refreshToken) {
                $client->fetchAccessTokenWithRefreshToken($refreshToken);
                $newToken = $client->getAccessToken();
                $account->update(['token' => json_encode($newToken)]);
            } else {
                throw new \Exception('Access token expired and no refresh token available for email account: ' . $account->email);
            }
        }

        return $client;
    }
    /**
     * Remove an email from the unopened list in the report.
     *
     * @param array &$report
     * @param string $email
     * @return void
     */
    protected function removeFromUnopened(array &$report, string $email)
    {
        if (in_array($email, $report['unopened']['emails'])) {
            $index = array_search($email, $report['unopened']['emails']);
            unset($report['unopened']['emails'][$index]);
            $report['unopened']['emails'] = array_values($report['unopened']['emails']);
            $report['unopened']['count'] = count($report['unopened']['emails']);
        }
    }

    public function filter(Request $request, $sequenceId)
    {
        $this->setupPlutoConnection($request);

        $validator = Validator::make($request->all(), [
            'filters' => 'required|array',
            'filters.opened' => 'boolean',
            'filters.clicked' => 'boolean',
            'filters.unsubscribed' => 'boolean',
            'filters.bounced' => 'boolean',
            'filters.unopened' => 'boolean',
        ]);

        if ($validator->fails()) {
            Log::warning("Validation failed for filter: " . json_encode($validator->errors()));
            return response()->json(['details' => $validator->errors()->first()], 422);
        }

        try {
            $sequence = DriftSequence::on('pluto')->findOrFail($sequenceId);
            $sequence->update(['filters' => $request->filters]);

            Log::info("Filters applied for sequence: " . $sequenceId);
            return response()->json(['message' => 'Filters applied successfully'], 200);
        } catch (\Exception $e) {
            Log::error("Error applying filters: " . $e->getMessage());
            return response()->json(['error' => 'Failed to apply filters: ' . $e->getMessage()], 500);
        }
    }
    public function getTemplates(Request $request, $id = null)
    {
        try {
            $this->setupPlutoConnection($request);

            if ($id !== null) {
                // Fetch a single template by ID
                Log::info("Fetching template with ID: {$id}");
                $template = Template::on('pluto')->findOrFail($id);
                return response()->json([
                    'id' => $template->id,
                    'title' => $template->title,
                    'subject' => $template->subject,
                    'content' => $template->content
                ]);
            }

            // Fetch all templates
            $templates = Template::on('pluto')->get();
            Log::info("Fetched templates: " . $templates->count());
            return response()->json($templates);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error("Template not found for ID: {$id}");
            return response()->json(['error' => 'Template not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching templates: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch templates: ' . $e->getMessage()], 500);
        }
    }


    public function getAudiences(Request $request)
    {
        try {
            $this->setupPlutoConnection($request);
            $audiences = Audience::on('pluto')->with('subscribers')->get();
            Log::info("Fetched audiences: " . $audiences->count());
            return response()->json($audiences);
        } catch (\Exception $e) {
            Log::error('Error fetching audiences: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch audiences: ' . $e->getMessage()], 500);
        }
    }
    public function getSubscriberCount(Request $request, $audienceId)
    {
        try {
            $this->setupPlutoConnection($request);
            $count = Subscriber::on('pluto')
                ->where('audience_id', $audienceId)
                ->where('status', 'subscribed')
                ->count();
            Log::info("Fetched subscriber count for audience: " . $audienceId, ['count' => $count]);
            return response()->json(['count' => $count], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching subscriber count: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch subscriber count: ' . $e->getMessage()], 500);
        }
    }
    public function getEmailAccounts(Request $request)
    {
        try {
            if (!auth()->check()) {
                Log::error('User not authenticated when fetching active email accounts', [
                    'request' => $request->all(),
                    'ip' => $request->ip(),
                ]);
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $this->setupPlutoConnection($request);
            $userId = auth()->id();
            Log::info('Starting fetch of active email accounts', [
                'user_id' => $userId,
                'request_params' => $request->all(),
            ]);

            $query = DB::connection('pluto')
                ->table('email_accounts')
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->select('id', 'email', 'first_name', 'last_name', 'daily_send_limit', 'status');

            if ($request->has('email')) {
                $query->where('email', $request->email);
                Log::info('Filtering by email', ['email' => $request->email]);
            }

            $accounts = $query->get();
            Log::info('Raw email accounts fetched from database', [
                'user_id' => $userId,
                'account_count' => $accounts->count(),
                'accounts' => $accounts->toArray(),
            ]);

            // Add current usage (emails sent in last 24h) for each account
            $now = now();
            foreach ($accounts as $account) {
                $sentCount = \App\Models\Central\EmailSystem\DriftSequenceLog::on('pluto')
                    ->where('email_account_id', $account->id)
                    ->where('sent_at', '>=', $now->copy()->subDay())
                    ->count();
                $account->sent_in_last_24h = $sentCount;
                Log::debug('Calculated sent_in_last_24h for account', [
                    'email' => $account->email,
                    'email_account_id' => $account->id,
                    'sent_in_last_24h' => $sentCount,
                    'daily_send_limit' => $account->daily_send_limit,
                ]);
            }

            Log::info('Final email accounts response prepared', [
                'user_id' => $userId,
                'account_count' => $accounts->count(),
                'response_data' => $accounts->toArray(),
            ]);

            if ($accounts->isEmpty()) {
                Log::warning('No active email accounts found', ['user_id' => $userId]);
            }

            return response()->json($accounts);
        } catch (\Exception $e) {
            Log::error('Error fetching email accounts', [
                'user_id' => auth()->id() ?? 'unknown',
                'error_message' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to fetch email accounts: ' . $e->getMessage()], 500);
        }
    }
    public function getTimezones(Request $request)
    {
        try {
            $timezones = \DateTimeZone::listIdentifiers(\DateTimeZone::ALL);
            Log::info("Fetched timezones: " . count($timezones));
            return response()->json($timezones);
        } catch (\Exception $e) {
            Log::error('Error fetching timezones: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch timezones: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $this->setupPlutoConnection($request);

        $validator = Validator::make($request->all(), [
            'id' => 'nullable|exists:pluto.templates,id',
            'title' => 'required|string|max:255',
            'subject' => 'required|string|max:255',
            'content' => 'required|string',
        ]);

        if ($validator->fails()) {
            Log::warning("Validation failed for saveTemplate: " . json_encode($validator->errors()));
            return response()->json(['details' => $validator->errors()->first()], 422);
        }

        try {
            $template = Template::on('pluto')->updateOrCreate(
                ['id' => $request->id],
                [
                    'title' => $request->title,
                    'subject' => $request->subject,
                    'content' => $request->content,
                    'last_modified' => now(),
                ]
            );
            Log::info("Template saved: " . $template->id);
            return response()->json(['message' => 'Template saved successfully', 'template' => $template], 200);
        } catch (\Exception $e) {
            Log::error("Error saving template: " . $e->getMessage());
            return response()->json(['error' => 'Failed to save template: ' . $e->getMessage()], 500);
        }
    }

    public function saveAudience(Request $request)
    {
        $this->setupPlutoConnection($request);

        // Coerce null or empty string to array for 'subscribers'
        $input = $request->all();
        if (isset($input['subscribers']) && !is_array($input['subscribers'])) {
            if (is_null($input['subscribers']) || $input['subscribers'] === '') {
                $input['subscribers'] = [];
            }
        }

        $validator = Validator::make($input, [
            'name' => 'required|string|max:255',
            'subscribers' => 'nullable|array',
            'subscribers.*.first_name' => 'required_with:subscribers|string|max:255',
            'subscribers.*.last_name' => 'nullable|string|max:255',
            'subscribers.*.email' => 'required_with:subscribers|email|max:255',
        ]);

        if ($validator->fails()) {
            Log::warning("Validation failed for saveAudience: " . json_encode($validator->errors()));
            return response()->json(['details' => $validator->errors()->first()], 422);
        }

        try {
            $audience = Audience::on('pluto')->create(['name' => $input['name']]);

            if (isset($input['subscribers']) && is_array($input['subscribers'])) {
                foreach ($input['subscribers'] as $subscriberData) {
                    Subscriber::on('pluto')->create([
                        'audience_id' => $audience->id,
                        'first_name' => $subscriberData['first_name'],
                        'last_name' => $subscriberData['last_name'] ?? null,
                        'email' => $subscriberData['email'],
                        'status' => 'subscribed',
                    ]);
                }
            }
            Log::info("Audience saved: " . $audience->id);
            return response()->json(['message' => 'Audience created successfully', 'audience' => $audience], 200);
        } catch (\Exception $e) {
            Log::error("Error saving audience: " . $e->getMessage());
            return response()->json(['error' => 'Failed to create audience: ' . $e->getMessage()], 500);
        }
    }

    public function getActiveEmailAccounts(Request $request)
    {
        try {
            if (!auth()->check()) {
                Log::error('User not authenticated when fetching active email accounts');
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $this->setupPlutoConnection($request);

            $userId = auth()->id();
            Log::info('Fetching active email accounts for user_id: ' . $userId);

            $emailAccounts = DB::connection('pluto')
                ->table('email_accounts')
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->get(['email']);

            Log::info('Fetched email accounts: ', ['emails' => $emailAccounts->toArray()]);

            if ($emailAccounts->isEmpty()) {
                Log::warning('No active email accounts found for user_id: ' . $userId);
                return response()->json(['emails' => [], 'message' => 'No active email accounts found'], 200);
            }

            return response()->json(['emails' => $emailAccounts->pluck('email')]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch active email accounts: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Failed to fetch email accounts', 'details' => $e->getMessage()], 500);
        }
    }

    public function unsubscribe(Request $request, $subscriberId, $sequenceId)
    {
        try {
            $this->setupPlutoConnection($request);

            $subscriber = Subscriber::on('pluto')->findOrFail($subscriberId);
            $sequence = DriftSequence::on('pluto')->findOrFail($sequenceId);

            $subscriber->update(['status' => 'unsubscribed']);

            // Fetch email_account_id for the first email in from_emails
            $emailAccount = DB::connection('pluto')
                ->table('email_accounts')
                ->where('email', $sequence->from_emails[0])
                ->where('status', 'active')
                ->first();

            if (!$emailAccount) {
                Log::error("No active email account found for unsubscribe", [
                    'sequence_id' => $sequenceId,
                    'email' => $sequence->from_emails[0]
                ]);
                return response()->json(['error' => 'No active email account found'], 400);
            }

            DriftSequenceLog::on('pluto')->create([
                'sequence_id' => $sequenceId,
                'subscriber_id' => $subscriberId,
                'email_account_id' => $emailAccount->id,
                'status' => 'failed',
                'error_message' => 'Subscriber unsubscribed',
                'tracking_open' => false,
                'tracking_clicks' => json_encode([]),
                'sent_at' => now()
            ]);

            Log::info("Subscriber {$subscriberId} unsubscribed from sequence {$sequenceId}");

            return response()->json(['message' => 'Successfully unsubscribed'], 200);
        } catch (\Exception $e) {
            Log::error("Failed to unsubscribe subscriber {$subscriberId} from sequence {$sequenceId}: {$e->getMessage()}", [
                'exception' => $e->getMessage(),
                'subscriber_id' => $subscriberId,
                'sequence_id' => $sequenceId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to unsubscribe: ' . $e->getMessage()], 500);
        }
    }

    public function importAudience(Request $request)
    {
        $this->setupPlutoConnection($request);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'format' => 'required|in:first-email,first-last-email',
            'file' => 'required|file|mimes:csv,txt',
        ]);

        if ($validator->fails()) {
            Log::warning("Validation failed for importAudience: " . json_encode($validator->errors()));
            return response()->json(['details' => $validator->errors()->first()], 422);
        }

        try {
            $audience = Audience::on('pluto')->create(['name' => $request->name]);

            $file = $request->file('file');
            $csvData = array_map('str_getcsv', file($file->getPathname()));

            foreach ($csvData as $row) {
                if (empty($row))
                    continue;

                if ($request->format === 'first-email' && count($row) >= 2) {
                    Subscriber::on('pluto')->create([
                        'audience_id' => $audience->id,
                        'first_name' => $row[0],
                        'email' => $row[1],
                        'status' => 'subscribed',
                    ]);
                } elseif ($request->format === 'first-last-email' && count($row) >= 3) {
                    Subscriber::on('pluto')->create([
                        'audience_id' => $audience->id,
                        'first_name' => $row[0],
                        'last_name' => $row[1],
                        'email' => $row[2],
                        'status' => 'subscribed',
                    ]);
                }
            }
            Log::info("Audience imported: " . $audience->id);
            return response()->json(['message' => 'Audience imported successfully', 'audience' => $audience], 200);
        } catch (\Exception $e) {
            Log::error("Error importing audience: " . $e->getMessage());
            return response()->json(['error' => 'Failed to import audience: ' . $e->getMessage()], 500);
        }
    }

    private function getSubscribers(DriftSequence $sequence)
    {
        try {
            $subscribersQuery = Subscriber::on('pluto')
                ->where('status', 'subscribed');

            if ($sequence->previous_sequence_id) {
                $categories = $sequence->categories ? json_decode($sequence->categories, true) : [];
                $selectedCategory = $categories['selected_category'] ?? null;

                if ($selectedCategory) {
                    $previousLogs = DriftSequenceLog::on('pluto')
                        ->where('sequence_id', $sequence->previous_sequence_id)
                        ->select('subscriber_id');

                    switch ($selectedCategory) {
                        case 'replied':
                            $previousLogs->where('status', 'replied');
                            break;
                        case 'unsubscribed':
                            $previousLogs->whereIn('status', ['unsubscribed', 'unsubscribe']);
                            break;
                        case 'softbounce':
                            $previousLogs->whereIn('status', ['softbounce', 'soft_bounce']);
                            break;
                        case 'hardbounce':
                            $previousLogs->whereIn('status', ['hardbounce', 'hard_bounce']);
                            break;
                        case 'opened':
                            $previousLogs->where('tracking_open', true);
                            break;
                        case 'unopened':
                            $previousLogs->where('status', 'sent')->where('tracking_open', false);
                            break;
                    }

                    $subscriberIds = $previousLogs->pluck('subscriber_id');
                    $subscribersQuery->whereIn('id', $subscriberIds);
                } elseif ($sequence->filters) {
                    $previousLogs = DriftSequenceLog::on('pluto')
                        ->where('sequence_id', $sequence->previous_sequence_id)
                        ->select('subscriber_id');

                    if (is_array($sequence->filters) && ($sequence->filters['opened'] ?? false)) {
                        $previousLogs->orWhere('tracking_open', true);
                    }
                    if ($sequence->filters['clicked'] ?? false) {
                        $previousLogs->orWhereNotNull('tracking_clicks');
                    }
                    if ($sequence->filters['unsubscribed'] ?? false) {
                        $previousLogs->orWhere('status', 'failed')
                            ->where('error_message', 'like', '%unsubscribed%');
                    }
                    if ($sequence->filters['bounced'] ?? false) {
                        $previousLogs->orWhere('status', 'failed')
                            ->where('error_message', 'like', '%bounced%');
                    }
                    if ($sequence->filters['unopened'] ?? false) {
                        $previousLogs->orWhere('status', 'sent')
                            ->where('tracking_open', false);
                    }
                    if ($sequence->filters['hardSoftbounce'] ?? false) {
                        $previousLogs->orWhere('status', 'failed')
                            ->where('error_message', 'like', '%hardbounce%');
                    }

                    $subscriberIds = $previousLogs->pluck('subscriber_id');
                    $subscribersQuery->whereIn('id', $subscriberIds);
                }
            } else {
                $subscribersQuery->where('audience_id', $sequence->audience_id);
            }

            $subscribers = $subscribersQuery->get();

            // Handle assignment mode for Sequence 1
            if ($sequence->sequence_number == 1) {
                if ($sequence->assignment_mode === 'manual_assign' && $sequence->manual_assignments) {
                    $assignments = json_decode($sequence->manual_assignments, true) ?? [];
                    $assignedSubscribers = [];
                    $index = 0;

                    foreach ($assignments as $email => $count) {
                        if ($count > 0 && $index < $subscribers->count()) {
                            $subscribersSlice = $subscribers->slice($index, $count);
                            foreach ($subscribersSlice as $subscriber) {
                                $assignedSubscribers[] = (object)[
                                    'id' => $subscriber->id,
                                    'email' => $subscriber->email,
                                    'first_name' => $subscriber->first_name,
                                    'last_name' => $subscriber->last_name,
                                    'status' => $subscriber->status,
                                    'email_account_email' => $email,
                                ];
                            }
                            $index += $count;
                        }
                    }

                    $skippedCount = $subscribers->count() - $index;
                    if ($skippedCount > 0) {
                        Log::warning("Skipped {$skippedCount} subscribers due to manual assignment configuration", [
                            'sequence_id' => $sequence->id,
                            'total_subscribers' => $subscribers->count(),
                            'assigned_subscribers' => count($assignedSubscribers),
                        ]);
                    }

                    return collect($assignedSubscribers);
                } elseif ($sequence->assignment_mode === 'batch_size' && $sequence->batch_size) {
                    $fromEmails = json_decode($sequence->from_emails, true) ?? $sequence->from_emails;
                    $batchSize = $sequence->batch_size;
                    $totalAssigned = $batchSize * count($fromEmails);
                    $assignedSubscribers = [];
                    $index = 0;

                    foreach ($fromEmails as $email) {
                        $subscribersSlice = $subscribers->slice($index, $batchSize);
                        foreach ($subscribersSlice as $subscriber) {
                            $assignedSubscribers[] = (object)[
                                'id' => $subscriber->id,
                                'email' => $subscriber->email,
                                'first_name' => $subscriber->first_name,
                                'last_name' => $subscriber->last_name,
                                'status' => $subscriber->status,
                                'email_account_email' => $email,
                            ];
                        }
                        $index += $batchSize;
                    }

                    $skippedCount = $subscribers->count() - $totalAssigned;
                    if ($skippedCount > 0) {
                        Log::warning("Skipped {$skippedCount} subscribers due to batch size configuration", [
                            'sequence_id' => $sequence->id,
                            'total_subscribers' => $subscribers->count(),
                            'batch_size' => $batchSize,
                            'from_emails_count' => count($fromEmails),
                        ]);
                    }

                    return collect($assignedSubscribers);
                }
            }

            Log::info("Fetched subscribers for sequence {$sequence->id}: " . $subscribers->count(), [
                'previous_sequence_id' => $sequence->previous_sequence_id,
                'selected_category' => $selectedCategory ?? 'none',
                'categories' => $sequence->categories,
            ]);
            return $subscribers;
        } catch (\Exception $e) {
            Log::error("Error fetching subscribers: " . $e->getMessage(), [
                'sequence_id' => $sequence->id,
                'trace' => $e->getTraceAsString(),
            ]);
            return collect([]);
        }
    }
    private function dispatchSequenceJobs(DriftSequence $sequence)
    {
        Log::info('[Drift] Dispatching sequence jobs', [
            'sequence_id' => $sequence->id,
            'set_id' => $sequence->set_id,
            'sequence_number' => $sequence->sequence_number,
            'status' => $sequence->status,
            'scheduled_at' => $sequence->scheduled_at,
            'timestamp' => now()->toDateTimeString(),
        ]);
        try {
            $subscribers = $this->getSubscribers($sequence);

            if ($subscribers->isEmpty()) {
                Log::warning('No subscribers found for sequence', ['sequence_id' => $sequence->id]);
                $sequence->update(['status' => 'completed']);
                return;
            }

            $pendingLogs = DriftSequenceLog::on('pluto')
            ->where('sequence_id', $sequence->id)
            ->where('status', 'pending')
            ->get();

            if ($pendingLogs->isEmpty()) {
                Log::info('No pending logs found for sequence', ['sequence_id' => $sequence->id]);
                return;
            }

            // Group logs by email account for round-robin dispatching
            $logsByAccount = $pendingLogs->groupBy('email_account_id');
            $maxJobsPerAccount = $logsByAccount->map->count()->max();

            Log::info('Round-robin job dispatching in dispatchSequenceJobs', [
                'sequence_id' => $sequence->id,
                'total_pending_logs' => $pendingLogs->count(),
                'accounts_with_jobs' => $logsByAccount->keys()->toArray(),
                'max_jobs_per_account' => $maxJobsPerAccount,
                'jobs_per_account' => $logsByAccount->map->count()->toArray(),
            ]);

            // Dispatch in round-robin fashion
            for ($round = 0; $round < $maxJobsPerAccount; $round++) {
                foreach ($logsByAccount as $emailAccountId => $logs) {
                    if (isset($logs[$round])) {
                        $log = $logs[$round];
                        $queueName = "emails_sender_{$log->email_account_id}"; // Use dedicated queue for the email account
                        
                        SendDriftEmailSequenceJob::dispatch(
                            $sequence->id,
                            $log->subscriber_id,
                            $log->email_account_id
                        )->onQueue($queueName);

                        Log::info("Dispatched round-robin email job for subscriber {$log->subscriber_id} in sequence {$sequence->id}", [
                            'email_account_id' => $log->email_account_id,
                            'queue' => $queueName,
                            'round' => $round + 1,
                            'max_rounds' => $maxJobsPerAccount,
                        ]);
                    }
                }
            }

            Log::info("Sequence jobs dispatched for sequence: " . $sequence->id, [
                'batch_size' => $sequence->batch_size,
                'subscriber_count' => $subscribers->count(),
            ]);
        } catch (\Exception $e) {
            Log::error("Error dispatching sequence jobs: " . $e->getMessage());
            $sequence->update(['status' => 'failed']);
        }
    }

    public function updateSequenceCategory(Request $request, $sequenceId)
    {
        $this->setupPlutoConnection($request);

        try {
            $validator = Validator::make($request->all(), [
                'category' => 'required|in:replied,unsubscribed,softbounce,hardbounce,opened,unopened',
            ]);

            if ($validator->fails()) {
                Log::warning("Validation failed for updateSequenceCategory: " . json_encode($validator->errors()));
                return response()->json(['error' => $validator->errors()->first()], 422);
            }

            $sequence = DriftSequence::on('pluto')->findOrFail($sequenceId);
            if ($sequence->status !== 'draft') {
                Log::warning("Cannot update category for sequence in {$sequence->status} status", [
                    'sequence_id' => $sequenceId,
                ]);
                return response()->json(['error' => "Cannot update category for sequence in {$sequence->status} status"], 422);
            }

            $categories = $sequence->categories ? json_decode($sequence->categories, true) : [];
            $categories['selected_category'] = $request->category;

            $sequence->update([
                'categories' => json_encode($categories),
                'updated_at' => now(),
            ]);

            Log::info("Category updated for sequence: {$sequenceId}", [
                'category' => $request->category,
            ]);

            return response()->json([
                'message' => 'Category updated successfully',
                'sequence_id' => $sequenceId,
                'category' => $request->category,
            ], 200);
        } catch (\Exception $e) {
            Log::error("Error updating sequence category: " . $e->getMessage(), [
                'sequence_id' => $sequenceId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to update category: ' . $e->getMessage()], 500);
        }
    }

    public function importMappedAudience(Request $request)
    {
        $this->setupPlutoConnection($request);
        $data = $request->all();
        $name = $data['name'] ?? null;
        $format = $data['format'] ?? null;
        $subscribers = $data['subscribers'] ?? [];
        $userId = auth()->id();
        // Validate top-level fields
        if (!$name || !$format || !in_array($format, ['first-email', 'first-last-email']) || !is_array($subscribers)) {
            return response()->json(['error' => 'Invalid request data'], 422);
        }
        // Create audience
        $audience = \App\Models\Central\EmailSystem\Audience::on('pluto')->create(['name' => $name]);
        $inserted = 0;
        $leftover = [];
        foreach ($subscribers as $row) {
            $first_name = trim($row['first_name'] ?? '');
            $last_name = trim($row['last_name'] ?? '');
            $email = trim($row['email'] ?? '');
            // Validation
            if (!$first_name) {
                $leftover[] = array_merge($row, ['reason' => 'Missing first_name']);
                continue;
            }
            if ($format === 'first-last-email' && !$last_name) {
                $leftover[] = array_merge($row, ['reason' => 'Missing last_name']);
                continue;
            }
            if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $leftover[] = array_merge($row, ['reason' => 'Invalid or missing email']);
                continue;
            }
            // Check for duplicate in this audience only
            $exists = \App\Models\Central\EmailSystem\Subscriber::on('pluto')
                ->where('audience_id', $audience->id)
                ->where('email', $email)
                ->exists();
            if ($exists) {
                $leftover[] = array_merge($row, ['reason' => 'Duplicate in this audience']);
                continue;
            }
            try {
                \App\Models\Central\EmailSystem\Subscriber::on('pluto')->create([
                    'audience_id' => $audience->id,
                    'first_name' => $first_name,
                    'last_name' => $last_name ?: null,
                    'email' => $email,
                    'status' => 'subscribed',
                ]);
                $inserted++;
            } catch (\Exception $e) {
                $leftover[] = array_merge($row, ['reason' => 'DB error: ' . $e->getMessage()]);
            }
        }
        return response()->json([
            'message' => 'Audience imported',
            'audience' => $audience,
            'inserted_count' => $inserted,
            'leftover' => $leftover
        ], 200);
    }

    public function uploadCsv(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);
        // Ensure tmp directory exists
        $tmpDir = storage_path('app/tmp');
        if (!file_exists($tmpDir)) {
            mkdir($tmpDir, 0777, true);
        }
        $file = $request->file('file');
        $token = uniqid('csv_', true);
        $filename = $token . '.csv';
        $file->move($tmpDir, $filename);
        $fullPath = $tmpDir . DIRECTORY_SEPARATOR . $filename;
        $handle = fopen($fullPath, 'r');
        $header = fgetcsv($handle);
        $sample = [];
        for ($i = 0; $i < 5 && ($row = fgetcsv($handle)); $i++) {
            $sample[] = $row;
        }
        fclose($handle);
        return response()->json([
            'token' => $token,
            'header' => $header,
            'sample' => $sample,
            'row_count' => $this->countCsvRows($fullPath),
        ]);
    }
    private function countCsvRows($filePath)
    {
        $count = 0;
        if (($handle = fopen($filePath, 'r')) !== false) {
            fgetcsv($handle); // skip header
            while (fgetcsv($handle) !== false) {
                $count++;
            }
            fclose($handle);
        }
        return $count;
    }
    public function processCsv(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'mapping' => 'required|array',
            'from' => 'required|integer|min:1',
            'to' => 'required|integer|min:1',
            'name' => 'required|string|max:255',
            'format' => 'required|in:first-email,first-last-email',
        ]);

        $token = $request->input('token');
        $mapping = $request->input('mapping');
        $from = (int)$request->input('from');
        $to = (int)$request->input('to');
        $name = $request->input('name');
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

        // Create audience
        $audience = \App\Models\Central\EmailSystem\Audience::on('pluto')->create(['name' => $name]);
        $totalToImport = $to - $from + 1;

        // Initialize progress
        Cache::put('import_progress_' . $token, [
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
                Cache::put('import_progress_' . $token, $progressData, 3600);
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
                    ->where('audience_id', $audience->id)
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
                        'audience_id' => $audience->id,
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
        Cache::put('import_progress_' . $token, [
            'current' => $totalToImport,
            'total' => $totalToImport,
            'inserted' => $inserted,
            'failed' => count($failedRows),
            'remaining' => count($remainingRows)
        ], 3600);

        return response()->json([
            'message' => 'Audience imported successfully',
            'audience' => $audience,
            'inserted_count' => $inserted,
            'failed_count' => count($failedRows),
            'remaining_count' => count($remainingRows),
            'failed_csv' => $failedCsv,
            'remaining_csv' => $remainingCsv,
            'total_rows_in_file' => $totalRows,
            'imported_range' => "{$from} - {$to}",
        ]);
    }
    public function importProgress(Request $request)
    {
        $token = $request->input('token');
        $progress = Cache::get('import_progress_' . $token, [
            'current' => 0,
            'total' => 1,
            'inserted' => 0,
            'failed' => 0,
            'remaining' => 0
        ]);

        return response()->json($progress);
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

        return '/drift/audiences/download-csv?filename=' . $filename;
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
     * Download CSV file
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
}