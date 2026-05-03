<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Jobs\EmailSystem\LiveEmailFetch;

class StartLiveEmailFetch extends Command
{
    protected $signature = 'email:start-live-fetch';
    protected $description = 'Start live email fetching for all accounts';

    public function handle()
    {
        $this->info('Starting live email fetch for all accounts...');

        try {
            $db = DB::connection('pluto');
            $accounts = $db->select('SELECT email FROM email_accounts WHERE status = "active"');

            if (empty($accounts)) {
                $this->warn('No active email accounts found.');
                return;
            }

            $categories = ['inbox', 'spam'];
            $totalJobs = 0;

            foreach ($accounts as $account) {
                foreach ($categories as $category) {
                    // Dispatch live fetch job for each account/category
                    LiveEmailFetch::dispatch($account->email, $category);
                    $totalJobs++;
                    
                    $this->line("Queued live fetch for: {$account->email} - {$category}");
                }
            }

            $this->info("Successfully queued {$totalJobs} live fetch jobs.");
            $this->info('Run: php artisan queue:work --queue=email-sync');
            $this->info('This will continuously monitor all accounts for new emails.');

        } catch (\Exception $e) {
            $this->error("Failed to start live email fetch: " . $e->getMessage());
        }
    }
} 