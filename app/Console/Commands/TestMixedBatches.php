<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Central\EmailSystem\EmailAccount;
use App\Models\Central\EmailSystem\Subscriber;

class TestMixedBatches extends Command
{
    protected $signature = 'email:test-mixed-batches {--audience=1 : Audience ID to test} {--dry-run : Show what would be sent without actually sending}';
    protected $description = 'Test mixed batch size configurations';

    public function handle()
    {
        $audienceId = $this->option('audience');
        $dryRun = $this->option('dry-run');
        
        $this->info('🧪 Testing Mixed Batch Configuration...');
        
        // Get subscriber count
        $subscriberCount = Subscriber::on('pluto')
            ->where('audience_id', $audienceId)
            ->where('status', 'subscribed')
            ->count();
        
        $this->info("\n📊 Test Configuration:");
        $this->info("  Audience ID: {$audienceId}");
        $this->info("  Subscribers: {$subscriberCount}");
        $this->info("  Mode: " . ($dryRun ? 'DRY RUN' : 'LIVE'));
        
        // Get email accounts
        $emailAccounts = EmailAccount::on('pluto')
            ->where('status', 'active')
            ->limit(19)
            ->get();
        
        // Create mixed batch configuration
        $mixedBatches = $this->createMixedBatchConfig($emailAccounts, $subscriberCount);
        
        $this->info("\n📦 Mixed Batch Configuration:");
        $totalAssigned = 0;
        $batchTypes = [];
        
        foreach ($mixedBatches as $email => $count) {
            $this->info("  {$email}: {$count} emails");
            $totalAssigned += $count;
            
            if ($count <= 500) {
                $batchTypes['small'] = ($batchTypes['small'] ?? 0) + 1;
            } elseif ($count <= 1000) {
                $batchTypes['medium'] = ($batchTypes['medium'] ?? 0) + 1;
            } else {
                $batchTypes['large'] = ($batchTypes['large'] ?? 0) + 1;
            }
        }
        
        $this->info("\n📊 Batch Distribution:");
        $this->info("  Small batches (≤500): " . ($batchTypes['small'] ?? 0) . " accounts");
        $this->info("  Medium batches (501-1000): " . ($batchTypes['medium'] ?? 0) . " accounts");
        $this->info("  Large batches (1001-2000): " . ($batchTypes['large'] ?? 0) . " accounts");
        $this->info("  Total Assigned: {$totalAssigned}");
        
        if ($subscriberCount > 0) {
            $this->info("  Coverage: " . round(($totalAssigned / $subscriberCount) * 100, 2) . "%");
        } else {
            $this->info("  Coverage: 0% (no subscribers)");
        }
        
        // Show expected performance
        $this->showExpectedPerformance($mixedBatches);
        
        if (!$dryRun) {
            $this->warn("\n⚠️  This would create actual jobs. Use --dry-run to test first.");
        } else {
            $this->info("\n✅ Dry run completed. Configuration looks good!");
            $this->info("   Use this configuration in your UI with Manual Assignment mode.");
        }
    }
    
    private function createMixedBatchConfig($emailAccounts, $subscriberCount)
    {
        $config = [];
        $remaining = $subscriberCount;
        
        // Create a mixed pattern
        $batchSizes = [500, 2000, 1000, 500, 2000, 1000, 500, 2000, 1000, 500, 2000, 1000, 500, 2000, 1000, 500, 2000, 1000, 500];
        
        foreach ($emailAccounts as $index => $account) {
            if ($remaining <= 0) break;
            
            $batchSize = $batchSizes[$index] ?? 1000;
            $assigned = min($batchSize, $remaining);
            
            $config[$account->email] = $assigned;
            $remaining -= $assigned;
        }
        
        return $config;
    }
    
    private function showExpectedPerformance($mixedBatches)
    {
        $this->info("\n⚡ Expected Performance:");
        
        $smallBatches = 0;
        $mediumBatches = 0;
        $largeBatches = 0;
        
        foreach ($mixedBatches as $email => $count) {
            if ($count <= 500) {
                $smallBatches++;
            } elseif ($count <= 1000) {
                $mediumBatches++;
            } else {
                $largeBatches++;
            }
        }
        
        // Calculate expected processing times
        $smallTime = $smallBatches * 5; // 5 minutes per small batch
        $mediumTime = $mediumBatches * 10; // 10 minutes per medium batch
        $largeTime = $largeBatches * 15; // 15 minutes per large batch
        
        $totalTime = $smallTime + $mediumTime + $largeTime;
        $totalJobs = count($mixedBatches);
        
        $this->info("  Total Jobs: {$totalJobs}");
        $this->info("  Expected Processing Time: " . round($totalTime / 60, 1) . " minutes");
        
        if ($totalJobs > 0) {
            $this->info("  Average Time per Job: " . round($totalTime / $totalJobs, 1) . " minutes");
        } else {
            $this->info("  Average Time per Job: 0 minutes (no jobs)");
        }
        
        // Show queue optimization
        $this->info("\n🚀 Queue Optimization:");
        $this->info("  Small batches: {$smallBatches} jobs (fast processing)");
        $this->info("  Medium batches: {$mediumBatches} jobs (balanced)");
        $this->info("  Large batches: {$largeBatches} jobs (high throughput)");
        
        if ($totalJobs <= 12) {
            $this->info("  ✅ Optimal for 12 workers");
        } else {
            $this->info("  ⚠️  Consider increasing workers for {$totalJobs} jobs");
        }
    }
} 