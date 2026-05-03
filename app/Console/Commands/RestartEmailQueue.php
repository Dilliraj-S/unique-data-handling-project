<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class RestartEmailQueue extends Command
{
    protected $signature = 'email:restart {--force : Force restart without confirmation}';
    protected $description = 'Safely restart the email queue system';

    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('This will restart the email queue system. Are you sure?')) {
                $this->info('Operation cancelled.');
                return;
            }
        }

        $this->info('🔄 Restarting Email Queue System...');
        
        try {
            // 1. Stop Horizon
            $this->info('⏹️ Stopping Horizon...');
            Artisan::call('horizon:terminate');
            $this->info('✅ Horizon stopped');
            
            // 2. Clear Redis queues if needed
            $this->info('🧹 Clearing Redis queues...');
            $redis = Redis::connection();
            
            // Get queue statistics before clearing
            $queues = ['emails', 'filters', 'default'];
            foreach ($queues as $queue) {
                $length = $redis->lLen("queues:{$queue}");
                if ($length > 0) {
                    $this->warn("Queue '{$queue}' has {$length} jobs");
                }
            }
            
            $failedCount = $redis->lLen('failed_jobs');
            if ($failedCount > 0) {
                $this->warn("Failed jobs: {$failedCount}");
            }
            
            // 3. Clear failed jobs if too many
            if ($failedCount > 100) {
                $this->info('Clearing failed jobs...');
                $redis->del('failed_jobs');
                $this->info('✅ Cleared failed jobs');
            }
            
            // 4. Restart Horizon
            $this->info('▶️ Starting Horizon...');
            Artisan::call('horizon:purge');
            Artisan::call('horizon:work', ['--daemon' => true]);
            $this->info('✅ Horizon started');
            
            // 5. Wait a moment for workers to start
            $this->info('⏳ Waiting for workers to initialize...');
            sleep(5);
            
            // 6. Check status
            $this->info('📊 Checking queue status...');
            Artisan::call('email:monitor');
            
            $this->info('✅ Email queue system restarted successfully!');
            
        } catch (\Exception $e) {
            $this->error('❌ Failed to restart email queue: ' . $e->getMessage());
            Log::error('Email queue restart failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
} 