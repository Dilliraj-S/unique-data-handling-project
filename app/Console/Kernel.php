<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use App\Jobs\PollEmailHistory;
use Illuminate\Support\Facades\DB;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule)
    {
        // DISABLED - Automatic email polling for on-demand fetching system
        // Email history polling
        /*
        $schedule->call(function () {
            $db = DB::connection('pluto');
            $emails = $db->select('SELECT email FROM email_accounts WHERE status = "active"');
            foreach ($emails as $email) {
                PollEmailHistory::dispatch($email->email)->onQueue('email-sync');
            }
        })->everyMinute(); // Adjust frequency as needed (e.g., everyTenSeconds() for testing)
        */
        
        // TEMPORARILY DISABLED - Email queue monitoring
        // $schedule->command('email:monitor')->everyFiveMinutes();
        
        // TEMPORARILY DISABLED - Email queue monitoring with auto-fix
        // $schedule->command('email:monitor --fix')->everyFifteenMinutes();
    }

    protected function commands()
    {
        $this->load(__DIR__ . '/Commands');
        require base_path('routes/console.php');
    }
}
