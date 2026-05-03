<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class QuickTestReference extends Command
{
    protected $signature = 'email:quick-test {step : Testing step (1-5)} {--audience=1 : Audience ID}';
    protected $description = 'Quick reference for email testing steps';

    public function handle()
    {
        $step = $this->argument('step');
        $audienceId = $this->option('audience');
        
        $this->info('⚡ Quick Test Reference - Step ' . $step);
        $this->info('=====================================');
        
        $configs = [
            1 => ['accounts' => 1, 'batch' => 100, 'total' => 100, 'time' => '2-3 min'],
            2 => ['accounts' => 3, 'batch' => 500, 'total' => 1500, 'time' => '10-15 min'],
            3 => ['accounts' => 5, 'batch' => 1000, 'total' => 5000, 'time' => '30-45 min'],
            4 => ['accounts' => 10, 'batch' => 1500, 'total' => 15000, 'time' => '1-2 hours'],
            5 => ['accounts' => 19, 'batch' => 1950, 'total' => 37050, 'time' => '3-4 hours']
        ];
        
        if (!isset($configs[$step])) {
            $this->error('Invalid step. Use 1-5.');
            return;
        }
        
        $config = $configs[$step];
        
        $this->info("\n📋 Quick Configuration:");
        $this->info("  • Accounts: {$config['accounts']}");
        $this->info("  • Batch Size: {$config['batch']}");
        $this->info("  • Total Emails: {$config['total']}");
        $this->info("  • Expected Time: {$config['time']}");
        
        $this->info("\n🎯 UI Steps:");
        $this->info("  1. Go to drift-emails.blade.php");
        $this->info("  2. Select audience: {$audienceId}");
        $this->info("  3. Select {$config['accounts']} email account(s)");
        $this->info("  4. Set Assignment Mode: 'Batch Size'");
        $this->info("  5. Set Batch Size: {$config['batch']}");
        $this->info("  6. Click 'Save' and 'Send'");
        
        $this->info("\n📊 Monitor:");
        $this->info("  • php artisan email:performance");
        $this->info("  • php artisan email:monitor");
        $this->info("  • php artisan horizon:status");
        
        $this->info("\n✅ Success Check:");
        $this->info("  • {$config['total']} emails sent");
        $successRate = $step <= 2 ? '90%' : ($step <= 3 ? '85%' : ($step <= 4 ? '80%' : '75%'));
        $this->info("  • Success rate > {$successRate}");
        $this->info("  • All {$config['accounts']} jobs completed");
        
        $this->info("\n🚨 If Failed:");
        $this->info("  • php artisan email:restart");
        $this->info("  • Check database: php artisan db:test");
        $this->info("  • Verify accounts: php artisan email:plan-assignment {$audienceId}");
    }
} 