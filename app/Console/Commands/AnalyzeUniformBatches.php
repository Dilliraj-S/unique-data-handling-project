<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Central\EmailSystem\EmailAccount;
use App\Models\Central\EmailSystem\Subscriber;

class AnalyzeUniformBatches extends Command
{
    protected $signature = 'email:analyze-uniform {batch_size=1950 : Batch size per account} {--audience=1 : Audience ID to analyze}';
    protected $description = 'Analyze uniform batch assignments for all accounts';

    public function handle()
    {
        $batchSize = $this->argument('batch_size');
        $audienceId = $this->option('audience');
        
        $this->info('📊 Analyzing Uniform Batch Assignment...');
        
        // Get subscriber count
        $subscriberCount = Subscriber::on('pluto')
            ->where('audience_id', $audienceId)
            ->where('status', 'subscribed')
            ->count();
        
        // Get email accounts
        $emailAccounts = EmailAccount::on('pluto')
            ->where('status', 'active')
            ->get();
        
        $this->info("\n📈 Configuration Analysis:");
        $this->info("  Batch Size per Account: {$batchSize}");
        $this->info("  Total Email Accounts: " . $emailAccounts->count());
        $this->info("  Total Subscribers: {$subscriberCount}");
        
        $totalCapacity = $emailAccounts->count() * $batchSize;
        $this->info("  Total Capacity: {$totalCapacity}");
        
        if ($subscriberCount > $totalCapacity) {
            $this->warn("⚠️  Not enough capacity! Need " . ($subscriberCount - $totalCapacity) . " more emails");
        } else {
            $unusedCapacity = $totalCapacity - $subscriberCount;
            $this->info("  Unused Capacity: {$unusedCapacity}");
        }
        
        $this->showPerformanceAnalysis($batchSize, $emailAccounts->count());
        $this->showJobDistribution($batchSize, $emailAccounts);
        $this->showOptimizationTips($batchSize);
    }
    
    private function showPerformanceAnalysis($batchSize, $accountCount)
    {
        $this->info("\n⚡ Performance Analysis:");
        
        // Determine timeout based on batch size
        if ($batchSize >= 2000) {
            $timeout = 15; // 15 minutes
            $retries = 2;
        } elseif ($batchSize >= 1000) {
            $timeout = 10; // 10 minutes
            $retries = 3;
        } else {
            $timeout = 5; // 5 minutes
            $retries = 3;
        }
        
        $this->info("  Timeout per Job: {$timeout} minutes");
        $this->info("  Retries per Job: {$retries}");
        $this->info("  Total Jobs: {$accountCount}");
        
        // Calculate processing time
        $totalProcessingTime = $accountCount * $timeout;
        $this->info("  Total Processing Time: " . round($totalProcessingTime / 60, 1) . " hours");
        
        // Calculate emails per second
        $totalEmails = $accountCount * $batchSize;
        $emailsPerSecond = round($totalEmails / ($totalProcessingTime * 60), 2);
        $this->info("  Expected Emails per Second: {$emailsPerSecond}");
        
        // Worker optimization
        $optimalWorkers = min(12, $accountCount);
        $this->info("  Optimal Workers: {$optimalWorkers}");
        
        if ($accountCount > 12) {
            $this->warn("⚠️  Consider increasing workers for {$accountCount} jobs");
        }
    }
    
    private function showJobDistribution($batchSize, $emailAccounts)
    {
        $this->info("\n📦 Job Distribution:");
        
        $batchTypes = [];
        foreach ($emailAccounts as $account) {
            if ($batchSize <= 500) {
                $batchTypes['small'] = ($batchTypes['small'] ?? 0) + 1;
            } elseif ($batchSize <= 1000) {
                $batchTypes['medium'] = ($batchTypes['medium'] ?? 0) + 1;
            } else {
                $batchTypes['large'] = ($batchTypes['large'] ?? 0) + 1;
            }
        }
        
        $this->info("  Small batches (≤500): " . ($batchTypes['small'] ?? 0) . " accounts");
        $this->info("  Medium batches (501-1000): " . ($batchTypes['medium'] ?? 0) . " accounts");
        $this->info("  Large batches (1001-2000): " . ($batchTypes['large'] ?? 0) . " accounts");
        
        $this->info("\n📧 Account Details:");
        foreach ($emailAccounts->take(5) as $account) {
            $this->info("  • {$account->email}: {$batchSize} emails");
        }
        if ($emailAccounts->count() > 5) {
            $this->info("  • ... and " . ($emailAccounts->count() - 5) . " more accounts");
        }
    }
    
    private function showOptimizationTips($batchSize)
    {
        $this->info("\n💡 Optimization Tips for {$batchSize} emails per account:");
        
        if ($batchSize >= 2000) {
            $this->info("  • Large batch size - monitor memory usage");
            $this->info("  • Consider reducing batch size if jobs timeout");
            $this->info("  • Use 12 workers for optimal performance");
        } elseif ($batchSize >= 1000) {
            $this->info("  • Medium batch size - good balance");
            $this->info("  • Optimal for current worker configuration");
            $this->info("  • Monitor success rates closely");
        } else {
            $this->info("  • Small batch size - fast processing");
            $this->info("  • Can increase worker count if needed");
            $this->info("  • Good for testing and small campaigns");
        }
        
        $this->info("\n🚀 Recommended Commands:");
        $this->info("  • php artisan email:performance");
        $this->info("  • php artisan email:monitor");
        $this->info("  • php artisan horizon:work");
        $this->info("  • php artisan horizon:status");
    }
} 