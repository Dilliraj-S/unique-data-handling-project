<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Central\EmailSystem\DriftSequenceLog;
use App\Models\Central\EmailSystem\EmailAccount;

class MonitorEmailPerformance extends Command
{
    protected $signature = 'email:performance {--sequence= : Monitor specific sequence} {--hours=24 : Hours to analyze}';
    protected $description = 'Monitor email sending performance and provide insights';

    public function handle()
    {
        $this->info('📊 Monitoring Email Performance...');
        
        $hours = $this->option('hours');
        $sequenceId = $this->option('sequence');
        
        // Get performance metrics
        $this->getOverallPerformance($hours);
        
        if ($sequenceId) {
            $this->getSequencePerformance($sequenceId, $hours);
        }
        
        // Get account performance
        $this->getAccountPerformance($hours);
        
        // Get queue performance
        $this->getQueuePerformance();
        
        $this->info('✅ Performance monitoring complete!');
    }
    
    private function getOverallPerformance($hours)
    {
        $this->info("\n📈 Overall Performance (Last {$hours} hours):");
        
        try {
            $stats = DriftSequenceLog::on('pluto')
                ->where('created_at', '>=', now()->subHours($hours))
                ->selectRaw('
                    COUNT(*) as total_emails,
                    COUNT(CASE WHEN status = "sent" THEN 1 END) as sent_emails,
                    COUNT(CASE WHEN status = "failed" THEN 1 END) as failed_emails,
                    COUNT(CASE WHEN status = "pending" THEN 1 END) as pending_emails,
                    AVG(CASE WHEN status = "sent" THEN TIMESTAMPDIFF(SECOND, created_at, sent_at) END) as avg_send_time_seconds
                ')
                ->first();
            
            if ($stats) {
                $successRate = $stats->total_emails > 0 ? 
                    round(($stats->sent_emails / $stats->total_emails) * 100, 2) : 0;
                
                $this->info("📧 Total Emails: {$stats->total_emails}");
                $this->info("✅ Sent: {$stats->sent_emails}");
                $this->info("❌ Failed: {$stats->failed_emails}");
                $this->info("⏳ Pending: {$stats->pending_emails}");
                $this->info("📊 Success Rate: {$successRate}%");
                $this->info("⏱️ Average Send Time: " . round($stats->avg_send_time_seconds ?? 0, 2) . " seconds");
                
                if ($stats->total_emails > 0) {
                    $emailsPerHour = round($stats->sent_emails / $hours, 2);
                    $this->info("🚀 Emails per Hour: {$emailsPerHour}");
                }
            }
        } catch (\Exception $e) {
            $this->error('❌ Failed to get overall performance: ' . $e->getMessage());
        }
    }
    
    private function getSequencePerformance($sequenceId, $hours)
    {
        $this->info("\n🎯 Sequence Performance (ID: {$sequenceId}):");
        
        try {
            $sequence = DB::connection('pluto')
                ->table('drift_sequences')
                ->where('id', $sequenceId)
                ->first();
            
            if (!$sequence) {
                $this->error("❌ Sequence not found");
                return;
            }
            
            $stats = DriftSequenceLog::on('pluto')
                ->where('sequence_id', $sequenceId)
                ->where('created_at', '>=', now()->subHours($hours))
                ->selectRaw('
                    COUNT(*) as total_emails,
                    COUNT(CASE WHEN status = "sent" THEN 1 END) as sent_emails,
                    COUNT(CASE WHEN status = "failed" THEN 1 END) as failed_emails,
                    COUNT(CASE WHEN status = "pending" THEN 1 END) as pending_emails,
                    AVG(CASE WHEN status = "sent" THEN TIMESTAMPDIFF(SECOND, created_at, sent_at) END) as avg_send_time_seconds
                ')
                ->first();
            
            if ($stats) {
                $successRate = $stats->total_emails > 0 ? 
                    round(($stats->sent_emails / $stats->total_emails) * 100, 2) : 0;
                
                $this->info("📧 Total Emails: {$stats->total_emails}");
                $this->info("✅ Sent: {$stats->sent_emails}");
                $this->info("❌ Failed: {$stats->failed_emails}");
                $this->info("⏳ Pending: {$stats->pending_emails}");
                $this->info("📊 Success Rate: {$successRate}%");
                $this->info("⏱️ Average Send Time: " . round($stats->avg_send_time_seconds ?? 0, 2) . " seconds");
            }
            
            // Get batch size info
            $batchSizes = DriftSequenceLog::on('pluto')
                ->where('sequence_id', $sequenceId)
                ->where('created_at', '>=', now()->subHours($hours))
                ->selectRaw('batch_size, COUNT(*) as count')
                ->groupBy('batch_size')
                ->get();
            
            if ($batchSizes->isNotEmpty()) {
                $this->info("\n📦 Batch Size Distribution:");
                foreach ($batchSizes as $batch) {
                    $this->info("  Batch Size {$batch->batch_size}: {$batch->count} jobs");
                }
            }
            
        } catch (\Exception $e) {
            $this->error('❌ Failed to get sequence performance: ' . $e->getMessage());
        }
    }
    
    private function getAccountPerformance($hours)
    {
        $this->info("\n📧 Email Account Performance:");
        
        try {
            $accountStats = DriftSequenceLog::on('pluto')
                ->join('email_accounts', 'drift_sequence_logs.email_account_id', '=', 'email_accounts.id')
                ->where('drift_sequence_logs.created_at', '>=', now()->subHours($hours))
                ->selectRaw('
                    email_accounts.email,
                    COUNT(*) as total_emails,
                    COUNT(CASE WHEN drift_sequence_logs.status = "sent" THEN 1 END) as sent_emails,
                    COUNT(CASE WHEN drift_sequence_logs.status = "failed" THEN 1 END) as failed_emails,
                    AVG(CASE WHEN drift_sequence_logs.status = "sent" THEN TIMESTAMPDIFF(SECOND, drift_sequence_logs.created_at, drift_sequence_logs.sent_at) END) as avg_send_time_seconds,
                    AVG(drift_sequence_logs.batch_size) as avg_batch_size,
                    MAX(drift_sequence_logs.batch_size) as max_batch_size,
                    MIN(drift_sequence_logs.batch_size) as min_batch_size
                ')
                ->groupBy('email_accounts.id', 'email_accounts.email')
                ->orderBy('total_emails', 'desc')
                ->limit(10)
                ->get();
            
            foreach ($accountStats as $stat) {
                $successRate = $stat->total_emails > 0 ? 
                    round(($stat->sent_emails / $stat->total_emails) * 100, 2) : 0;
                
                $this->info("📧 {$stat->email}:");
                $this->info("  Total: {$stat->total_emails} | Sent: {$stat->sent_emails} | Failed: {$stat->failed_emails}");
                $this->info("  Success Rate: {$successRate}% | Avg Time: " . round($stat->avg_send_time_seconds ?? 0, 2) . "s");
                $this->info("  Batch Size: Avg " . round($stat->avg_batch_size ?? 0, 0) . " | Range: " . ($stat->min_batch_size ?? 0) . "-" . ($stat->max_batch_size ?? 0));
            }
            
        } catch (\Exception $e) {
            $this->error('❌ Failed to get account performance: ' . $e->getMessage());
        }
    }
    
    private function getQueuePerformance()
    {
        $this->info("\n⚡ Queue Performance:");
        
        try {
            // Get recent job performance
            $recentJobs = DriftSequenceLog::on('pluto')
                ->where('created_at', '>=', now()->subMinutes(30))
                ->selectRaw('
                    COUNT(*) as total_jobs,
                    COUNT(CASE WHEN status = "sent" THEN 1 END) as completed_jobs,
                    COUNT(CASE WHEN status = "failed" THEN 1 END) as failed_jobs,
                    AVG(CASE WHEN status = "sent" THEN TIMESTAMPDIFF(SECOND, created_at, sent_at) END) as avg_processing_time
                ')
                ->first();
            
            if ($recentJobs) {
                $this->info("📊 Last 30 Minutes:");
                $this->info("  Total Jobs: {$recentJobs->total_jobs}");
                $this->info("  Completed: {$recentJobs->completed_jobs}");
                $this->info("  Failed: {$recentJobs->failed_jobs}");
                $this->info("  Avg Processing Time: " . round($recentJobs->avg_processing_time ?? 0, 2) . " seconds");
                
                if ($recentJobs->total_jobs > 0) {
                    $jobsPerMinute = round($recentJobs->completed_jobs / 30, 2);
                    $this->info("  Jobs per Minute: {$jobsPerMinute}");
                }
            }
            
            // Get pending jobs count
            $pendingJobs = DriftSequenceLog::on('pluto')
                ->whereIn('status', ['pending', 'sending'])
                ->count();
            
            $this->info("⏳ Pending Jobs: {$pendingJobs}");
            
        } catch (\Exception $e) {
            $this->error('❌ Failed to get queue performance: ' . $e->getMessage());
        }
    }
} 