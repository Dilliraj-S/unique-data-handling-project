<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Jobs\EmailSystem\LiveEmailFetch;

class LiveEmailMonitor extends Command
{
    protected $signature = 'email:live-monitor {--interval=60 : Interval in seconds between checks} {--daemon : Run as daemon}';
    protected $description = 'Continuously monitor all email accounts for new emails';

    public function handle()
    {
        $interval = (int) $this->option('interval');
        $daemon = $this->option('daemon');
        
        $this->info("🚀 Starting live email monitor (checking every {$interval} seconds)...");
        if ($daemon) {
            $this->info("Running in daemon mode - will restart automatically on errors");
        } else {
            $this->info('Press Ctrl+C to stop.');
        }

        $runCount = 0;
        $lastCheck = null;

        while (true) {
            try {
                $runCount++;
                $currentTime = now();
                
                $this->line("[" . $currentTime->format('Y-m-d H:i:s') . "] Run #{$runCount} - Checking all accounts...");
                
                $this->checkAllAccounts();
                
                $lastCheck = $currentTime;
                $this->line("[" . $currentTime->format('Y-m-d H:i:s') . "] Check completed. Sleeping for {$interval} seconds...");
                
                sleep($interval);
                
            } catch (\Exception $e) {
                $this->error("❌ Error in live email monitor: " . $e->getMessage());
                
                if ($daemon) {
                    $this->warn("🔄 Restarting in 60 seconds due to error...");
                    sleep(60);
                } else {
                    $this->error("Stopping due to error. Use --daemon flag for auto-restart.");
                    break;
                }
            }
        }
    }

    private function checkAllAccounts()
    {
        $db = DB::connection('pluto');
        $accounts = $db->select('SELECT email FROM email_accounts WHERE status = "active"');

        if (empty($accounts)) {
            $this->warn('⚠️ No active email accounts found.');
            return;
        }

        $categories = ['inbox', 'spam'];
        $totalJobs = 0;

        foreach ($accounts as $account) {
            foreach ($categories as $category) {
                // Dispatch live fetch job for each account/category
                LiveEmailFetch::dispatch($account->email, $category);
                $totalJobs++;
            }
        }

        $this->line("✅ Queued {$totalJobs} live fetch jobs for " . count($accounts) . " accounts");
    }
} 