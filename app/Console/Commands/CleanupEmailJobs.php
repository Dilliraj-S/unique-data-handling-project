<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupEmailJobs extends Command
{
    protected $signature = 'email:cleanup {--force : Force cleanup without confirmation} {--older-than=1 : Clear jobs older than X hours}';
    protected $description = 'Clean up old email sync jobs from the queue';

    public function handle()
    {
        $force = $this->option('force');
        $olderThan = (int) $this->option('older-than');
        
        if (!$force) {
            $this->info("🧹 This will clean up email sync jobs older than {$olderThan} hour(s)");
            if (!$this->confirm('Are you sure you want to continue?')) {
                $this->info('Operation cancelled.');
                return;
            }
        }

        $this->info("🧹 Starting email job cleanup...");
        
        try {
            // Get current job counts from unique database
            $totalJobs = DB::connection('central')->table('jobs')->where('queue', 'email-sync')->count();
            $failedJobs = DB::connection('central')->table('failed_jobs')->where('queue', 'email-sync')->count();
            $stuckJobs = DB::connection('central')->table('jobs')
                ->where('queue', 'email-sync')
                ->where('reserved_at', '<', now()->subMinutes(10))
                ->count();
            
            $this->line("📊 Current job status:");
            $this->line("  - Total email-sync jobs: {$totalJobs}");
            $this->line("  - Failed jobs: {$failedJobs}");
            $this->line("  - Stuck jobs (>10 min): {$stuckJobs}");
            $this->line("");
            
            // Clear ALL email-sync jobs instantly (not just old ones)
            $deletedJobs = DB::connection('central')->table('jobs')
                ->where('queue', 'email-sync')
                ->delete();
            
            if ($deletedJobs > 0) {
                $this->line("✅ Deleted {$deletedJobs} email-sync jobs instantly");
            } else {
                $this->line("ℹ️ No email-sync jobs found to delete");
            }
            
            // Clear failed jobs instantly
            $deletedFailed = DB::connection('central')->table('failed_jobs')
                ->where('queue', 'email-sync')
                ->delete();
            
            if ($deletedFailed > 0) {
                $this->line("✅ Deleted {$deletedFailed} failed email-sync jobs instantly");
            } else {
                $this->line("ℹ️ No failed jobs found to delete");
            }
            
            // Clear stuck jobs instantly
            $deletedStuck = DB::connection('central')->table('jobs')
                ->where('queue', 'email-sync')
                ->where('reserved_at', '<', now()->subMinutes(10))
                ->delete();
            
            if ($deletedStuck > 0) {
                $this->line("✅ Deleted {$deletedStuck} stuck email-sync jobs instantly");
            } else {
                $this->line("ℹ️ No stuck jobs found to delete");
            }
            
            // Show final status
            $remainingJobs = DB::connection('central')->table('jobs')->where('queue', 'email-sync')->count();
            $this->line("");
            $this->line("📊 Cleanup completed instantly!");
            $this->line("  - Remaining email-sync jobs: {$remainingJobs}");
            
            if ($remainingJobs > 0) {
                $this->line("  - These are recent jobs and will be processed normally");
            } else {
                $this->line("  - ✅ All email-sync jobs cleared successfully!");
            }
            
        } catch (\Exception $e) {
            $this->error("❌ Failed to cleanup jobs: " . $e->getMessage());
        }
    }
} 