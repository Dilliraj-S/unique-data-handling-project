<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Central\EmailSystem\EmailAccount;
use App\Models\Central\EmailSystem\Subscriber;

class PlanEmailAssignment extends Command
{
    protected $signature = 'email:plan-assignment {audience_id : Audience ID to plan for} {--show-accounts : Show available email accounts}';
    protected $description = 'Plan manual email assignments for optimal distribution';

    public function handle()
    {
        $audienceId = $this->argument('audience_id');
        $showAccounts = $this->option('show-accounts');
        
        $this->info('📋 Planning Email Assignment...');
        
        // Get audience subscriber count
        $subscriberCount = Subscriber::on('pluto')
            ->where('audience_id', $audienceId)
            ->where('status', 'subscribed')
            ->count();
        
        $this->info("\n📊 Audience Information:");
        $this->info("  Audience ID: {$audienceId}");
        $this->info("  Total Subscribers: {$subscriberCount}");
        
        // Get available email accounts
        $emailAccounts = EmailAccount::on('pluto')
            ->where('status', 'active')
            ->orderBy('daily_send_limit', 'desc')
            ->get();
        
        if ($showAccounts) {
            $this->info("\n📧 Available Email Accounts:");
            $this->table(
                ['Email', 'Daily Limit', 'Type', 'Status'],
                $emailAccounts->map(function($account) {
                    return [
                        $account->email,
                        $account->daily_send_limit ?? 'Not set',
                        $account->type ?? 'manual',
                        $account->status
                    ];
                })->toArray()
            );
        }
        
        $this->info("\n🎯 Assignment Planning:");
        $this->info("  Total Email Accounts: " . $emailAccounts->count());
        $this->info("  Total Subscribers: {$subscriberCount}");
        
        if ($subscriberCount > 0 && $emailAccounts->count() > 0) {
            $this->suggestAssignments($subscriberCount, $emailAccounts);
        }
        
        $this->info("\n💡 Manual Assignment Tips:");
        $this->info("  1. Use 'Manual Assign' mode in the UI");
        $this->info("  2. Set individual counts for each account");
        $this->info("  3. Consider daily send limits");
        $this->info("  4. Balance load across accounts");
        $this->info("  5. Monitor performance with: php artisan email:performance");
    }
    
    private function suggestAssignments($subscriberCount, $emailAccounts)
    {
        $this->info("\n📈 Suggested Assignments:");
        
        // Calculate base distribution
        $basePerAccount = floor($subscriberCount / $emailAccounts->count());
        $remaining = $subscriberCount % $emailAccounts->count();
        
        $suggestions = [];
        $totalAssigned = 0;
        
        foreach ($emailAccounts as $index => $account) {
            $suggested = $basePerAccount;
            
            // Distribute remaining subscribers
            if ($index < $remaining) {
                $suggested++;
            }
            
            // Check against daily limit
            $dailyLimit = $account->daily_send_limit ?? 2000;
            if ($suggested > $dailyLimit) {
                $suggested = $dailyLimit;
                $this->warn("⚠️  Account {$account->email} limited to {$dailyLimit} (daily limit)");
            }
            
            $suggestions[] = [
                'email' => $account->email,
                'suggested' => $suggested,
                'daily_limit' => $dailyLimit,
                'type' => $account->type ?? 'manual'
            ];
            
            $totalAssigned += $suggested;
        }
        
        // Display suggestions
        $this->table(
            ['Email', 'Suggested Count', 'Daily Limit', 'Type'],
            collect($suggestions)->map(function($suggestion) {
                return [
                    $suggestion['email'],
                    $suggestion['suggested'],
                    $suggestion['daily_limit'],
                    $suggestion['type']
                ];
            })->toArray()
        );
        
        $this->info("\n📊 Summary:");
        $this->info("  Total Assigned: {$totalAssigned}");
        $this->info("  Unassigned: " . ($subscriberCount - $totalAssigned));
        $this->info("  Coverage: " . round(($totalAssigned / $subscriberCount) * 100, 2) . "%");
        
        if ($totalAssigned < $subscriberCount) {
            $this->warn("⚠️  Not all subscribers can be assigned with current limits");
            $this->info("   Consider reducing batch sizes or adding more accounts");
        }
        
        // Show JSON format for easy copy-paste
        $this->info("\n📋 JSON Format for Manual Assignment:");
        $jsonAssignments = [];
        foreach ($suggestions as $suggestion) {
            if ($suggestion['suggested'] > 0) {
                $jsonAssignments[$suggestion['email']] = $suggestion['suggested'];
            }
        }
        $this->info(json_encode($jsonAssignments, JSON_PRETTY_PRINT));
    }
} 