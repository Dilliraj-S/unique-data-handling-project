<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Central\EmailSystem\EmailAccount;
use App\Models\Central\EmailSystem\Subscriber;

class EmailTestingGuide extends Command
{
    protected $signature = 'email:testing-guide {--step=1 : Current testing step (1-5)} {--audience=1 : Audience ID to test}';
    protected $description = 'Step-by-step guide for testing email sending from few to all accounts';

    public function handle()
    {
        $step = $this->option('step');
        $audienceId = $this->option('audience');
        
        $this->info('🧪 Email Testing Guide - Step by Step');
        $this->info('=====================================');
        
        switch ($step) {
            case 1:
                $this->step1SingleAccount($audienceId);
                break;
            case 2:
                $this->step2ThreeAccounts($audienceId);
                break;
            case 3:
                $this->step3FiveAccounts($audienceId);
                break;
            case 4:
                $this->step4TenAccounts($audienceId);
                break;
            case 5:
                $this->step5AllAccounts($audienceId);
                break;
            default:
                $this->showAllSteps();
                break;
        }
    }
    
    private function step1SingleAccount($audienceId)
    {
        $this->info("\n🎯 STEP 1: Single Account Test (100 emails)");
        $this->info("==========================================");
        
        $this->info("\n📋 Configuration:");
        $this->info("  • 1 email account");
        $this->info("  • 100 emails");
        $this->info("  • Batch size: 100");
        $this->info("  • Expected time: 2-3 minutes");
        
        $this->info("\n📱 UI Steps:");
        $this->info("  1. Go to drift-emails.blade.php interface");
        $this->info("  2. Select audience ID: {$audienceId}");
        $this->info("  3. Select 1 email account (james.smith@getemaildata.com)");
        $this->info("  4. Set Assignment Mode: 'Batch Size'");
        $this->info("  5. Set Batch Size: 100");
        $this->info("  6. Click 'Save' and 'Send'");
        
        $this->info("\n📊 Monitoring Commands:");
        $this->info("  • php artisan email:performance");
        $this->info("  • php artisan email:monitor");
        $this->info("  • php artisan horizon:status");
        
        $this->info("\n✅ Success Criteria:");
        $this->info("  • 100 emails sent successfully");
        $this->info("  • Success rate > 90%");
        $this->info("  • Processing time < 5 minutes");
        $this->info("  • No failed jobs");
        
        $this->info("\n🚨 If Issues:");
        $this->info("  • Check database connections");
        $this->info("  • Verify email account credentials");
        $this->info("  • Check WSL2 networking");
        $this->info("  • Run: php artisan email:restart");
    }
    
    private function step2ThreeAccounts($audienceId)
    {
        $this->info("\n🎯 STEP 2: Three Accounts Test (500 emails each)");
        $this->info("================================================");
        
        $this->info("\n📋 Configuration:");
        $this->info("  • 3 email accounts");
        $this->info("  • 500 emails per account");
        $this->info("  • Total: 1,500 emails");
        $this->info("  • Expected time: 10-15 minutes");
        
        $this->info("\n📱 UI Steps:");
        $this->info("  1. Go to drift-emails.blade.php interface");
        $this->info("  2. Select audience ID: {$audienceId}");
        $this->info("  3. Select 3 email accounts:");
        $this->info("     • james.smith@getemaildata.com");
        $this->info("     • michael.johnson@getemaildata.com");
        $this->info("     • anthony.hernandez@innodatabase.com");
        $this->info("  4. Set Assignment Mode: 'Batch Size'");
        $this->info("  5. Set Batch Size: 500");
        $this->info("  6. Click 'Save' and 'Send'");
        
        $this->info("\n📊 Monitoring Commands:");
        $this->info("  • php artisan email:performance");
        $this->info("  • php artisan email:monitor");
        $this->info("  • php artisan horizon:status");
        
        $this->info("\n✅ Success Criteria:");
        $this->info("  • 1,500 emails sent successfully");
        $this->info("  • Success rate > 85%");
        $this->info("  • Processing time < 20 minutes");
        $this->info("  • All 3 jobs completed");
        
        $this->info("\n🚨 If Issues:");
        $this->info("  • Check memory usage");
        $this->info("  • Monitor worker performance");
        $this->info("  • Verify account limits");
        $this->info("  • Run: php artisan email:restart");
    }
    
    private function step3FiveAccounts($audienceId)
    {
        $this->info("\n🎯 STEP 3: Five Accounts Test (1000 emails each)");
        $this->info("=================================================");
        
        $this->info("\n📋 Configuration:");
        $this->info("  • 5 email accounts");
        $this->info("  • 1000 emails per account");
        $this->info("  • Total: 5,000 emails");
        $this->info("  • Expected time: 30-45 minutes");
        
        $this->info("\n📱 UI Steps:");
        $this->info("  1. Go to drift-emails.blade.php interface");
        $this->info("  2. Select audience ID: {$audienceId}");
        $this->info("  3. Select 5 email accounts:");
        $this->info("     • james.smith@getemaildata.com");
        $this->info("     • michael.johnson@getemaildata.com");
        $this->info("     • anthony.hernandez@innodatabase.com");
        $this->info("     • john.wilson@innodatabase.com");
        $this->info("     • taylor.morgan@themailflow.com");
        $this->info("  4. Set Assignment Mode: 'Batch Size'");
        $this->info("  5. Set Batch Size: 1000");
        $this->info("  6. Click 'Save' and 'Send'");
        
        $this->info("\n📊 Monitoring Commands:");
        $this->info("  • php artisan email:performance");
        $this->info("  • php artisan email:monitor");
        $this->info("  • php artisan horizon:status");
        
        $this->info("\n✅ Success Criteria:");
        $this->info("  • 5,000 emails sent successfully");
        $this->info("  • Success rate > 80%");
        $this->info("  • Processing time < 60 minutes");
        $this->info("  • All 5 jobs completed");
        
        $this->info("\n🚨 If Issues:");
        $this->info("  • Check system resources");
        $this->info("  • Monitor database performance");
        $this->info("  • Verify network stability");
        $this->info("  • Run: php artisan email:restart");
    }
    
    private function step4TenAccounts($audienceId)
    {
        $this->info("\n🎯 STEP 4: Ten Accounts Test (1500 emails each)");
        $this->info("=================================================");
        
        $this->info("\n📋 Configuration:");
        $this->info("  • 10 email accounts");
        $this->info("  • 1500 emails per account");
        $this->info("  • Total: 15,000 emails");
        $this->info("  • Expected time: 1-2 hours");
        
        $this->info("\n📱 UI Steps:");
        $this->info("  1. Go to drift-emails.blade.php interface");
        $this->info("  2. Select audience ID: {$audienceId}");
        $this->info("  3. Select 10 email accounts (first 10 from list)");
        $this->info("  4. Set Assignment Mode: 'Batch Size'");
        $this->info("  5. Set Batch Size: 1500");
        $this->info("  6. Click 'Save' and 'Send'");
        
        $this->info("\n📊 Monitoring Commands:");
        $this->info("  • php artisan email:performance");
        $this->info("  • php artisan email:monitor");
        $this->info("  • php artisan horizon:status");
        
        $this->info("\n✅ Success Criteria:");
        $this->info("  • 15,000 emails sent successfully");
        $this->info("  • Success rate > 75%");
        $this->info("  • Processing time < 2.5 hours");
        $this->info("  • All 10 jobs completed");
        
        $this->info("\n🚨 If Issues:");
        $this->info("  • Check worker capacity");
        $this->info("  • Monitor memory usage");
        $this->info("  • Verify account quotas");
        $this->info("  • Run: php artisan email:restart");
    }
    
    private function step5AllAccounts($audienceId)
    {
        $this->info("\n🎯 STEP 5: All 19 Accounts Test (1950 emails each)");
        $this->info("====================================================");
        
        $this->info("\n📋 Configuration:");
        $this->info("  • 19 email accounts");
        $this->info("  • 1950 emails per account");
        $this->info("  • Total: 37,050 emails");
        $this->info("  • Expected time: 3-4 hours");
        
        $this->info("\n📱 UI Steps:");
        $this->info("  1. Go to drift-emails.blade.php interface");
        $this->info("  2. Select audience ID: {$audienceId}");
        $this->info("  3. Select ALL 19 email accounts");
        $this->info("  4. Set Assignment Mode: 'Batch Size'");
        $this->info("  5. Set Batch Size: 1950");
        $this->info("  6. Click 'Save' and 'Send'");
        
        $this->info("\n📊 Monitoring Commands:");
        $this->info("  • php artisan email:performance");
        $this->info("  • php artisan email:monitor");
        $this->info("  • php artisan horizon:status");
        
        $this->info("\n✅ Success Criteria:");
        $this->info("  • 37,050 emails sent successfully");
        $this->info("  • Success rate > 70%");
        $this->info("  • Processing time < 4 hours");
        $this->info("  • All 19 jobs completed");
        
        $this->info("\n🚨 If Issues:");
        $this->info("  • Check system resources");
        $this->info("  • Monitor network stability");
        $this->info("  • Verify all account credentials");
        $this->info("  • Run: php artisan email:restart");
    }
    
    private function showAllSteps()
    {
        $this->info("\n📚 Complete Testing Guide:");
        $this->info("==========================");
        
        $this->info("\n🎯 Testing Progression:");
        $this->info("  Step 1: 1 account × 100 emails = 100 total");
        $this->info("  Step 2: 3 accounts × 500 emails = 1,500 total");
        $this->info("  Step 3: 5 accounts × 1000 emails = 5,000 total");
        $this->info("  Step 4: 10 accounts × 1500 emails = 15,000 total");
        $this->info("  Step 5: 19 accounts × 1950 emails = 37,050 total");
        
        $this->info("\n📊 Commands for Each Step:");
        $this->info("  • php artisan email:testing-guide --step=1");
        $this->info("  • php artisan email:testing-guide --step=2");
        $this->info("  • php artisan email:testing-guide --step=3");
        $this->info("  • php artisan email:testing-guide --step=4");
        $this->info("  • php artisan email:testing-guide --step=5");
        
        $this->info("\n🔧 Pre-Testing Setup:");
        $this->info("  1. Ensure Horizon is running: php artisan horizon:work");
        $this->info("  2. Check queue health: php artisan email:monitor");
        $this->info("  3. Verify database connections: php artisan db:test");
        $this->info("  4. Check email accounts: php artisan email:plan-assignment 1");
        
        $this->info("\n📈 Success Metrics:");
        $this->info("  • Success rate should increase with each step");
        $this->info("  • Processing time should be predictable");
        $this->info("  • No memory leaks or crashes");
        $this->info("  • All jobs complete successfully");
    }
} 