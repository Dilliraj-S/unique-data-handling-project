<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Jobs\EmailSystem\LiveEmailFetch;

class InitializeEmailSyncs extends Command
{
    protected $signature = 'emails:init-sync {--email=} {--category=} {--interval=5 : Interval in seconds between checks} {--daemon : Run as daemon} {--cleanup : Clear old jobs before starting}';
    protected $description = 'Initialize continuous email synchronization for instant live fetching (optimized for drift sequences - 5s interval)';

    public function handle()
    {
        $interval = (int) $this->option('interval');
        $daemon = $this->option('daemon');
        $cleanup = $this->option('cleanup');
        
        $this->info("🚀 Starting continuous email sync (checking every {$interval} seconds)...");
        
        // Clean up old jobs if requested
        if ($cleanup) {
            $this->cleanupOldJobs();
        }
        
        if ($daemon) {
            $this->info("Running in daemon mode - will restart automatically on errors");
        } else {
            $this->info('Press Ctrl+C to stop.');
        }

        $runCount = 0;

        while (true) {
            try {
                $runCount++;
                $currentTime = now();
                
                $this->checkAllAccounts();
                
                sleep($interval);
                
            } catch (\Exception $e) {
                $this->error("❌ Error in email sync: " . $e->getMessage());
                
                if ($daemon) {
                    $this->warn("🔄 Restarting in 30 seconds due to error...");
                    sleep(30);
                } else {
                    $this->error("Stopping due to error. Use --daemon flag for auto-restart.");
                    break;
                }
            }
        }
    }

    private function cleanupOldJobs()
    {
        $this->info("🧹 Cleaning up old email sync jobs...");
        
        try {
            // Clear ALL email-sync jobs instantly from the jobs table in unique database
            $deletedJobs = DB::connection('central')->table('jobs')
                ->where('queue', 'email-sync')
                ->delete();
            
            if ($deletedJobs > 0) {
                $this->line("✅ Deleted {$deletedJobs} email-sync jobs instantly");
            }
            
            // Clear failed jobs instantly from unique database
            $deletedFailed = DB::connection('central')->table('failed_jobs')
                ->where('queue', 'email-sync')
                ->delete();
            
            if ($deletedFailed > 0) {
                $this->line("✅ Deleted {$deletedFailed} failed email-sync jobs instantly");
            }
            
            // Clear stuck jobs instantly (reserved for more than 10 minutes) from unique database
            $deletedStuck = DB::connection('central')->table('jobs')
                ->where('queue', 'email-sync')
                ->where('reserved_at', '<', now()->subMinutes(10))
                ->delete();
            
            if ($deletedStuck > 0) {
                $this->line("✅ Deleted {$deletedStuck} stuck email-sync jobs instantly");
            }
            
            // Check current job status in unique database
            $currentJobs = DB::connection('central')->table('jobs')
                ->where('queue', 'email-sync')
                ->count();
            
            $this->line("📊 Current email-sync jobs in queue: {$currentJobs}");
            
        } catch (\Exception $e) {
            $this->warn("⚠️ Could not cleanup old jobs: " . $e->getMessage());
        }
    }

    private function checkAllAccounts()
    {
        $db = DB::connection('pluto');
        $emailFilter = $this->option('email');
        $categoryFilter = $this->option('category');
        
        $accounts = $emailFilter
            ? $db->select('SELECT email FROM email_accounts WHERE email = ? AND status = "active"', [$emailFilter])
            : $db->select('SELECT email FROM email_accounts WHERE status = "active"');
            
        $categories = $categoryFilter ? [$categoryFilter] : ['inbox', 'spam'];

        if (empty($accounts)) {
            $this->warn('⚠️ No active email accounts found.');
            return;
        }

        $totalJobs = 0;

        foreach ($accounts as $account) {
            foreach ($categories as $category) {
                // Dispatch live fetch job for instant email fetching
                LiveEmailFetch::dispatch($account->email, $category)
                    ->onQueue('email-sync')
                    ->onConnection('database');
                $totalJobs++;
            }
        }
    }
}
