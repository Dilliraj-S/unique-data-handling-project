<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class MixedBatchGuide extends Command
{
    protected $signature = 'email:mixed-batch-guide';
    protected $description = 'Complete guide for mixed batch email sending';

    public function handle()
    {
        $this->info('📚 Mixed Batch Email Sending Guide');
        $this->info('=====================================');
        
        $this->showConfiguration();
        $this->showUISteps();
        $this->showPerformanceTips();
        $this->showMonitoringCommands();
        $this->showTroubleshooting();
    }
    
    private function showConfiguration()
    {
        $this->info("\n🎯 Configuration:");
        $this->info("  • 19 email accounts available");
        $this->info("  • Mixed batch sizes: 500, 1000, 2000");
        $this->info("  • Total capacity: 18,500 emails");
        $this->info("  • Dynamic timeouts based on batch size");
        $this->info("  • Optimized for 12 workers");
    }
    
    private function showUISteps()
    {
        $this->info("\n📱 UI Configuration Steps:");
        $this->info("  1. Go to drift-emails.blade.php interface");
        $this->info("  2. Select your audience with subscribers");
        $this->info("  3. Select all 19 email accounts");
        $this->info("  4. Set Assignment Mode: 'Manual Assign'");
        $this->info("  5. Click 'Configure Assignment'");
        $this->info("  6. Set individual counts:");
        
        $this->info("\n     Sample Assignment:");
        $this->info("     • james.smith@getemaildata.com: 500");
        $this->info("     • michael.johnson@getemaildata.com: 2000");
        $this->info("     • anthony.hernandez@innodatabase.com: 1000");
        $this->info("     • ... continue for all 19 accounts");
    }
    
    private function showPerformanceTips()
    {
        $this->info("\n⚡ Performance Optimization:");
        $this->info("  • Small batches (500): 5-minute timeout");
        $this->info("  • Medium batches (1000): 10-minute timeout");
        $this->info("  • Large batches (2000): 15-minute timeout");
        $this->info("  • Expected processing time: ~3 hours");
        $this->info("  • Success rate target: 95%+");
        $this->info("  • Emails per second: 10-20");
    }
    
    private function showMonitoringCommands()
    {
        $this->info("\n📊 Monitoring Commands:");
        $this->info("  • php artisan email:performance");
        $this->info("  • php artisan email:monitor");
        $this->info("  • php artisan email:plan-assignment {audience_id}");
        $this->info("  • php artisan horizon:work");
        $this->info("  • php artisan horizon:status");
    }
    
    private function showTroubleshooting()
    {
        $this->info("\n🔧 Troubleshooting:");
        $this->info("  • Low success rate: Check database connections");
        $this->info("  • Timeout errors: Increase batch size timeouts");
        $this->info("  • Memory issues: Reduce worker count");
        $this->info("  • Queue stuck: php artisan email:restart");
        $this->info("  • Performance: Monitor with email:performance");
        
        $this->info("\n🚨 Common Issues:");
        $this->info("  • Connection refused: Check WSL2 networking");
        $this->info("  • Lock timeouts: Increase lock duration");
        $this->info("  • Job failures: Check email account credentials");
        $this->info("  • Memory leaks: Restart Horizon periodically");
    }
    
    private function showExampleAssignment()
    {
        $this->info("\n📋 Example Mixed Assignment JSON:");
        $example = [
            "james.smith@getemaildata.com" => 500,
            "michael.johnson@getemaildata.com" => 2000,
            "anthony.hernandez@innodatabase.com" => 1000,
            "john.wilson@innodatabase.com" => 500,
            "taylor.morgan@themailflow.com" => 2000,
            "casey.parker@themailflow.com" => 1000,
            "jasper.thorne@databasemails.com" => 500,
            "elowen.hayes@databasemails.com" => 2000,
            "alden.price@theemaildata.com" => 1000,
            "roman.ellis@theemaildata.com" => 500,
            "alberto.tristan@theemailelevate.com" => 2000,
            "jims.chacko@theemailelevate.com" => 1000,
            "kevin.gendron@b2bitsolution.com" => 500,
            "george.friedman@datasoles.com" => 2000,
            "chris.quinn@globalhighdata.com" => 1000,
            "john.kennedy@thedataprison.com" => 500,
            "karen.mclntyre@theb2bsolution.com" => 2000,
            "scott.poore@globebigdata.com" => 1000,
            "dillirajs345@gmail.com" => 500
        ];
        
        $this->info(json_encode($example, JSON_PRETTY_PRINT));
    }
} 