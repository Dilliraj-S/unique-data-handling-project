<?php

namespace App\Jobs\EmailSystem;


use App\Models\Central\EmailSystem\DriftSequence;
use App\Models\Central\EmailSystem\Subscriber;
use App\Models\Central\EmailSystem\DriftSequenceLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DispatchNextDriftSequenceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $previousSequenceId;
    protected $emailAccountId;

    public function __construct($previousSequenceId, $emailAccountId)
    {
        $this->previousSequenceId = $previousSequenceId;
        $this->emailAccountId = $emailAccountId;
        $this->onQueue('emails_sender_' . $emailAccountId);
    }

    public function handle()
    {
        $lockKey = 'drift:dispatch:sequence:' . $this->previousSequenceId;
        $lock = Cache::lock($lockKey, 10);

        if (!$lock->get()) {
            Log::info('Another job is dispatching next sequence, skipping', [
                'previous_sequence_id' => $this->previousSequenceId,
            ]);
            return;
        }

        try {
            $previousSequence = DriftSequence::on('pluto')->findOrFail($this->previousSequenceId);
            $nextSequence = DriftSequence::on('pluto')
                ->where('set_id', $previousSequence->set_id)
                ->where('id', '>', $this->previousSequenceId)
                ->orderBy('id')
                ->first();

            if (!$nextSequence) {
                Log::info('No next sequence found in set', [
                    'previous_sequence_id' => $this->previousSequenceId,
                    'set_id' => $previousSequence->set_id,
                ]);
                return;
            }

            Log::info('Processing next sequence dispatch', [
                'previous_sequence_id' => $this->previousSequenceId,
                'next_sequence_id' => $nextSequence->id,
                'set_id' => $nextSequence->set_id,
            ]);

            if ($nextSequence->status !== 'draft' && $nextSequence->status !== 'scheduled') {
                Log::warning('Next sequence is not in draft or scheduled status, cannot dispatch', [
                    'next_sequence_id' => $nextSequence->id,
                    'set_id' => $nextSequence->set_id,
                    'status' => $nextSequence->status,
                ]);
                return;
            }

            $setExists = DB::connection('pluto')
                ->table('sets')
                ->where('id', $nextSequence->set_id)
                ->exists();

            if (!$setExists) {
                Log::error('Invalid set_id for next sequence, cannot dispatch', [
                    'next_sequence_id' => $nextSequence->id,
                    'set_id' => $nextSequence->set_id,
                ]);
                $nextSequence->update(['status' => 'failed']);
                return;
            }

            $fromEmails = is_array($nextSequence->from_emails)
                ? $nextSequence->from_emails
                : json_decode($nextSequence->from_emails, true) ?? [];

            $emailAccounts = DB::connection('pluto')
                ->table('email_accounts')
                ->whereIn('email', $fromEmails)
                ->where('status', 'active')
                ->select('id', 'email')
                ->get();

            if ($emailAccounts->isEmpty()) {
                Log::warning('No active email accounts found for next sequence', [
                    'next_sequence_id' => $nextSequence->id,
                    'from_emails' => $fromEmails,
                ]);
                $nextSequence->update(['status' => 'failed']);
                return;
            }

            $subscribers = $this->getSubscribersForNextSequence($previousSequence, $nextSequence);

            if ($subscribers->isEmpty()) {
                Log::info('No subscribers matched for next sequence', [
                    'next_sequence_id' => $nextSequence->id,
                    'previous_sequence_id' => $this->previousSequenceId,
                    'filters' => $previousSequence->filters,
                    'categories' => $nextSequence->categories,
                ]);

                $nextSequence->update([
                    'status' => 'skipped',
                    'skipped_reason' => 'No recipients matched the selected categories for Sequence ' . $nextSequence->id . '. Email not sent.',
                ]);
                Log::info('Next sequence skipped: no matching recipients', [
                    'next_sequence_id' => $nextSequence->id,
                    'categories' => $nextSequence->categories,
                ]);
                return;
            }

            // ROUND-ROBIN ASSIGNMENT: Assign each subscriber to only one sender (email account)
            $emailAccountsArr = $emailAccounts->all();
            $emailAccountCount = count($emailAccountsArr);
            $subscriberIndex = 0;
            foreach ($subscribers as $subscriber) {
                $account = $emailAccountsArr[$subscriberIndex % $emailAccountCount];
                $log = DriftSequenceLog::on('pluto')->create([
                    'sequence_id' => $nextSequence->id,
                    'subscriber_id' => $subscriber->id,
                    'email_account_id' => $account->id,
                    'set_id' => $nextSequence->set_id,
                    'status' => 'pending',
                    'batch_size' => $nextSequence->batch_size,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $batchSize = (is_int($nextSequence->batch_size) && $nextSequence->batch_size > 0)
                    ? $nextSequence->batch_size
                    : (is_int($previousSequence->batch_size) && $previousSequence->batch_size > 0 ? $previousSequence->batch_size : 1);
                if (!is_int($nextSequence->batch_size) || $nextSequence->batch_size <= 0) {
                    Log::warning('Batch size for next sequence is invalid, using fallback', [
                        'next_sequence_id' => $nextSequence->id,
                        'fallback_batch_size' => $batchSize,
                    ]);
                }

                SendDriftEmailSequenceJob::dispatch(
                    $nextSequence->id,
                    $subscriber->id,
                    $account->id,
                    $batchSize
                )->onQueue('emails_sender_' . $account->id);

                Log::info('Dispatched job for next sequence', [
                    'next_sequence_id' => $nextSequence->id,
                    'subscriber_id' => $subscriber->id,
                    'email_account_id' => $account->id,
                    'set_id' => $nextSequence->set_id,
                ]);
                $subscriberIndex++;
            }

            Log::info('Next sequence dispatched', [
                'previous_sequence_id' => $this->previousSequenceId,
                'next_sequence_id' => $nextSequence->id,
                'next_sequence_name' => $nextSequence->name,
                'set_id' => $nextSequence->set_id,
                'subscriber_count' => $subscribers->count(),
                'email_account_count' => $emailAccounts->count(),
            ]);
        } finally {
            $lock->release();
        }
    }

    protected function getSubscribersForNextSequence(?DriftSequence $previousSequence, DriftSequence $nextSequence)
    {
        try {
            if (!$previousSequence) {
                $subscribers = Subscriber::on('pluto')
                    ->where('audience_id', $nextSequence->audience_id)
                    ->where('status', 'subscribed')
                    ->get();
                Log::info('Fetched all audiences subscribers for first sequence', [
                    'next_sequence_id' => $nextSequence->id,
                    'audience_id' => $nextSequence->audience_id,
                    'subscriber_count' => $subscribers->count(),
                ]);
                return $subscribers;
            }

            $subscribersQuery = Subscriber::on('pluto')
                ->where('status', 'subscribed');

            $categories = $nextSequence->categories;
            if (is_string($categories)) {
                $categories = json_decode($categories, true);
            }
            if (!is_array($categories)) {
                $categories = [];
            }

            $categoryMappings = [
                'unsubscribed' => ['unsubscribe', 'unsubscribed'],
                'hardbounce' => ['hardbounce', 'hard_bounce'],
                'softbounce' => ['softbounce', 'soft_bounce'],
                'replied' => ['replied'],
                'automatic_reply' => ['automatic_reply'],
                'no_longer' => ['no_longer', 'nolonger'],
                'opened' => ['opened'],
                'unopened' => ['unopened'],
            ];

            $normalizedCategories = [];
            foreach ($categories as $category) {
                foreach ($categoryMappings as $normalized => $aliases) {
                    if (in_array(strtolower($category), array_map('strtolower', $aliases))) {
                        $normalizedCategories = array_merge($normalizedCategories, $aliases);
                        break;
                    }
                }
            }
            $normalizedCategories = array_unique($normalizedCategories);

            Log::info('Normalized categories for filtering', [
                'next_sequence_id' => $nextSequence->id,
                'original_categories' => $categories,
                'normalized_categories' => $normalizedCategories,
            ]);

            $filtersData = $previousSequence->filters;
            if (is_string($filtersData)) {
                $filtersData = json_decode($filtersData, true);
            }
            if (!is_array($filtersData)) {
                $filtersData = [];
            }

            Log::info('Filters data from previous sequence', [
                'filters' => $filtersData,
                'previous_sequence_id' => $previousSequence->id,
            ]);

            if (!empty($normalizedCategories)) {
                $subscriberEmails = [];
                foreach ($filtersData as $filterEntry) {
                    // If the subscriber matches at least one selected category, include them
                    if (isset($filterEntry['status']) && !empty($filterEntry['email'])) {
                        foreach ($normalizedCategories as $cat) {
                            if (strtolower($filterEntry['status']) === strtolower($cat)) {
                                $subscriberEmails[] = $filterEntry['email'];
                                break; // No need to check other categories for this entry
                            }
                        }
                    }
                }
                $subscriberEmails = array_unique($subscriberEmails);

                Log::info('Subscriber emails after filtering (OR logic for categories)', [
                    'next_sequence_id' => $nextSequence->id,
                    'subscriber_emails' => $subscriberEmails,
                ]);

                if (empty($subscriberEmails)) {
                    Log::info('No subscribers matched the selected categories', [
                        'next_sequence_id' => $nextSequence->id,
                        'categories' => $categories,
                        'normalized_categories' => $normalizedCategories,
                        'previous_sequence_id' => $previousSequence->id,
                    ]);
                    return collect();
                }

                $subscribersQuery->whereIn('email', $subscriberEmails);
            } else {
                $subscribersQuery->where('audience_id', $nextSequence->audience_id);
            }

            $subscribers = $subscribersQuery->get();
            Log::info('Fetched subscribers for next sequence', [
                'next_sequence_id' => $nextSequence->id,
                'subscriber_count' => $subscribers->count(),
                'categories' => $categories,
                'normalized_categories' => $normalizedCategories,
                'subscriber_emails' => $subscribers->pluck('email')->toArray(),
            ]);

            return $subscribers;
        } catch (\Exception $e) {
            Log::error('Error fetching subscribers for next sequence', [
                'next_sequence_id' => $nextSequence->id,
                'previous_sequence_id' => $previousSequence->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return collect();
        }
    }
}
