<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Central\EmailSystem\DriftSequenceLog;

class MonitorEmailQueue extends Command
{
    protected $signature = 'email:monitor {--fix : Attempt to fix issues}';
    protected $description = 'Monitor email queue health and fix issues';

    public function handle()
    {
        $this->info('🔍 Monitoring Email Queue Health...');
        
        // Check Redis connection
        $this->checkRedisConnection();
        
        // Check database connections
        $this->checkDatabaseConnections();
        
        // Check queue statistics
        $this->checkQueueStats();
        
        // Check for stuck jobs
        $this->checkStuckJobs();
        
        // Check memory usage
        $this->checkMemoryUsage();
        
        if ($this->option('fix')) {
            $this->fixIssues();
        }
        
        $this->info('✅ Monitoring complete!');
    }
    
    private function checkRedisConnection()
    {
        $this->info('📡 Checking Redis connection...');
        
        try {
            $redis = Redis::connection();
            $redis->ping();
            $this->info('✅ Redis connection: OK');
        } catch (\Exception $e) {
            $this->error('❌ Redis connection failed: ' . $e->getMessage());
        }
    }
    
    private function checkDatabaseConnections()
    {
        $this->info('🗄️ Checking database connections...');
        
        $connections = ['central', 'pluto'];
        
        foreach ($connections as $connection) {
            try {
                DB::connection($connection)->getPdo();
                $this->info("✅ Database connection '{$connection}': OK");
            } catch (\Exception $e) {
                $this->error("❌ Database connection '{$connection}' failed: " . $e->getMessage());
            }
        }
    }
    
    private function checkQueueStats()
    {
        $this->info('📊 Checking queue statistics...');
        
        try {
            $redis = Redis::connection();
            
            // Check queue lengths
            $queues = ['emails', 'filters', 'default'];
            
            foreach ($queues as $queue) {
                $length = $redis->lLen("queues:{$queue}");
                $this->info("📧 Queue '{$queue}': {$length} jobs");
                
                if ($length > 1000) {
                    $this->warn("⚠️ Queue '{$queue}' has {$length} jobs - consider scaling workers");
                }
            }
            
            // Check failed jobs
            $failedCount = $redis->lLen('failed_jobs');
            $this->info("❌ Failed jobs: {$failedCount}");
            
            if ($failedCount > 100) {
                $this->warn("⚠️ High number of failed jobs: {$failedCount}");
            }
            
        } catch (\Exception $e) {
            $this->error('❌ Failed to check queue stats: ' . $e->getMessage());
        }
    }
    
    private function checkStuckJobs()
    {
        $this->info('🔍 Checking for stuck jobs...');
        
        try {
            // Check for jobs stuck in 'sending' status for more than 10 minutes
            $stuckJobs = DriftSequenceLog::on('pluto')
                ->where('status', 'sending')
                ->where('updated_at', '<', now()->subMinutes(10))
                ->count();
                
            if ($stuckJobs > 0) {
                $this->warn("⚠️ Found {$stuckJobs} jobs stuck in 'sending' status");
                
                if ($this->option('fix')) {
                    $this->fixStuckJobs();
                }
            } else {
                $this->info('✅ No stuck jobs found');
            }
            
        } catch (\Exception $e) {
            $this->error('❌ Failed to check stuck jobs: ' . $e->getMessage());
        }
    }
    
    private function checkMemoryUsage()
    {
        $this->info('💾 Checking memory usage...');
        
        $memoryUsage = memory_get_usage(true);
        $memoryLimit = ini_get('memory_limit');
        
        $this->info("Current memory usage: " . $this->formatBytes($memoryUsage));
        $this->info("Memory limit: {$memoryLimit}");
        
        if ($memoryUsage > 100 * 1024 * 1024) { // 100MB
            $this->warn('⚠️ High memory usage detected');
        }
    }
    
    private function fixIssues()
    {
        $this->info('🔧 Attempting to fix issues...');
        
        // Clear failed jobs if too many
        try {
            $redis = Redis::connection();
            $failedCount = $redis->lLen('failed_jobs');
            
            if ($failedCount > 500) {
                $this->warn("Clearing {$failedCount} failed jobs...");
                $redis->del('failed_jobs');
                $this->info('✅ Cleared failed jobs');
            }
        } catch (\Exception $e) {
            $this->error('❌ Failed to clear failed jobs: ' . $e->getMessage());
        }
    }
    
    private function fixStuckJobs()
    {
        $this->info('🔧 Fixing stuck jobs...');
        
        try {
            $stuckJobs = DriftSequenceLog::on('pluto')
                ->where('status', 'sending')
                ->where('updated_at', '<', now()->subMinutes(10))
                ->update([
                    'status' => 'failed',
                    'error_message' => 'Job stuck in sending status - auto-fixed by monitor',
                    'failed_at' => now(),
                    'updated_at' => now(),
                ]);
                
            $this->info("✅ Fixed {$stuckJobs} stuck jobs");
            
        } catch (\Exception $e) {
            $this->error('❌ Failed to fix stuck jobs: ' . $e->getMessage());
        }
    }
    
    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }
} 