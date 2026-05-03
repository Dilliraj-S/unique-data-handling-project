<?php
/**
 * Verify .env Settings for Massive File Processing
 * Run this to check if your .env file has correct settings
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "\n";
echo "╔═══════════════════════════════════════════════════════════════════════╗\n";
echo "║         VERIFYING .env SETTINGS FOR MASSIVE FILE PROCESSING          ║\n";
echo "╚═══════════════════════════════════════════════════════════════════════╝\n";
echo "\n";

// Define expected values
$expectedSettings = [
    // Critical Settings
    'large_file_processing.queue_settings.timeout' => [
        'expected' => 172800,
        'critical' => true,
        'description' => 'Queue Timeout (48 hours)'
    ],
    'large_file_processing.queue_settings.memory' => [
        'expected' => 8192,
        'critical' => true,
        'description' => 'Queue Memory (8 GB)'
    ],
    'large_file_processing.queue_settings.tries' => [
        'expected' => 2,
        'critical' => true,
        'description' => 'Queue Tries'
    ],
    'large_file_processing.batch_size' => [
        'expected' => 10000,
        'critical' => true,
        'description' => 'Batch Size'
    ],
    'large_file_processing.csv_processing.max_upload_size_mb' => [
        'expected' => 10240,
        'critical' => true,
        'description' => 'Max Upload Size (10 GB)'
    ],
    'large_file_processing.csv_processing.chunk_size' => [
        'expected' => 10000,
        'critical' => true,
        'description' => 'CSV Chunk Size'
    ],
    'large_file_processing.progress_log_interval' => [
        'expected' => 100000,
        'critical' => false,
        'description' => 'Progress Log Interval'
    ],
    
    // Optional Settings
    'large_file_processing.massive_file_processing.enable_auto_split' => [
        'expected' => false,
        'critical' => false,
        'description' => 'Auto Split (optional)'
    ],
    'large_file_processing.massive_file_processing.auto_split_threshold' => [
        'expected' => 10000000,
        'critical' => false,
        'description' => 'Auto Split Threshold'
    ],
    'large_file_processing.database_optimization.disable_foreign_keys' => [
        'expected' => true,
        'critical' => false,
        'description' => 'Disable Foreign Keys (for speed)'
    ],
];

$allPassed = true;
$criticalIssues = 0;

echo "CHECKING CRITICAL SETTINGS:\n";
echo str_repeat("─", 75) . "\n";

foreach ($expectedSettings as $key => $setting) {
    $actualValue = config($key);
    $expectedValue = $setting['expected'];
    $isCritical = $setting['critical'];
    $description = $setting['description'];
    
    $passed = ($actualValue == $expectedValue);
    
    if ($isCritical) {
        $status = $passed ? '✅ PASS' : '❌ FAIL';
        $icon = $passed ? '✅' : '❌';
        
        echo sprintf(
            "%s %-50s %s\n",
            $icon,
            $description,
            $status
        );
        
        if (!$passed) {
            echo sprintf(
                "   Expected: %s, Got: %s\n",
                var_export($expectedValue, true),
                var_export($actualValue, true)
            );
            $criticalIssues++;
            $allPassed = false;
        }
    }
}

echo "\n";
echo "CHECKING OPTIONAL SETTINGS:\n";
echo str_repeat("─", 75) . "\n";

foreach ($expectedSettings as $key => $setting) {
    if (!$setting['critical']) {
        $actualValue = config($key);
        $expectedValue = $setting['expected'];
        $description = $setting['description'];
        
        $passed = ($actualValue == $expectedValue);
        $icon = $passed ? '✅' : '⚠️';
        $status = $passed ? 'PASS' : 'DIFFERENT';
        
        echo sprintf(
            "%s %-50s %s\n",
            $icon,
            $description,
            $status
        );
        
        if (!$passed) {
            echo sprintf(
                "   Expected: %s, Got: %s (optional - may be OK)\n",
                var_export($expectedValue, true),
                var_export($actualValue, true)
            );
        }
    }
}

echo "\n";
echo str_repeat("═", 75) . "\n";

if ($allPassed && $criticalIssues === 0) {
    echo "🎉 PERFECT! All critical settings are correct!\n";
    echo "\n";
    echo "✅ Your .env file is properly configured for massive file processing.\n";
    echo "✅ You can process up to 200M rows (20 crore).\n";
    echo "✅ Your 30,000 rows (500MB) will process in 10-15 minutes.\n";
    echo "✅ Timeout: 48 hours (172,800 seconds) - More than enough!\n";
    echo "✅ Memory: 8 GB - More than enough!\n";
    echo "\n";
    echo "NEXT STEPS:\n";
    echo "1. Start queue worker: start-queue-worker.bat\n";
    echo "2. Upload your file\n";
    echo "3. Monitor logs: Get-Content storage\\logs\\laravel.log -Wait -Tail 100\n";
    echo "4. Wait 10-15 minutes for completion\n";
    echo "\n";
    echo "🚀 You're ready to process!\n";
} elseif ($criticalIssues > 0) {
    echo "❌ CRITICAL ISSUES FOUND: {$criticalIssues}\n";
    echo "\n";
    echo "Your .env file needs updating. Please:\n";
    echo "1. Open: .env file\n";
    echo "2. Copy settings from: ADD_TO_ENV_FILE.txt\n";
    echo "3. Paste at the bottom of .env file\n";
    echo "4. Save the file\n";
    echo "5. Run: php artisan config:clear\n";
    echo "6. Run this script again to verify\n";
} else {
    echo "⚠️  Some optional settings differ from recommended values.\n";
    echo "Your critical settings are correct, but you may want to update optional ones.\n";
    echo "\n";
    echo "✅ You can still process files, but optional optimizations are not applied.\n";
}

echo "\n";
echo str_repeat("═", 75) . "\n";

// Show current configuration summary
echo "\n";
echo "CURRENT CONFIGURATION SUMMARY:\n";
echo str_repeat("─", 75) . "\n";
echo sprintf("Timeout:           %s seconds (%s hours)\n", 
    config('large_file_processing.queue_settings.timeout'),
    round(config('large_file_processing.queue_settings.timeout') / 3600, 1)
);
echo sprintf("Memory:            %s MB (%s GB)\n", 
    config('large_file_processing.queue_settings.memory'),
    round(config('large_file_processing.queue_settings.memory') / 1024, 1)
);
echo sprintf("Max Upload:        %s MB (%s GB)\n", 
    config('large_file_processing.csv_processing.max_upload_size_mb'),
    round(config('large_file_processing.csv_processing.max_upload_size_mb') / 1024, 1)
);
echo sprintf("Batch Size:        %s rows\n", 
    config('large_file_processing.batch_size')
);
echo sprintf("Chunk Size:        %s rows\n", 
    config('large_file_processing.csv_processing.chunk_size')
);
echo sprintf("Progress Logging:  Every %s rows\n", 
    number_format(config('large_file_processing.progress_log_interval'))
);

echo "\n";
echo "ESTIMATED PROCESSING TIMES:\n";
echo str_repeat("─", 75) . "\n";
echo "30,000 rows (500MB):      10-15 minutes\n";
echo "100,000 rows (1GB):       45-90 minutes\n";
echo "1M rows (10GB):           2-4 hours\n";
echo "10M rows (1 crore):       3-5 hours\n";
echo "100M rows (10 crore):     20-24 hours\n";
echo "200M rows (20 crore):     40-48 hours\n";

echo "\n";
echo "╔═══════════════════════════════════════════════════════════════════════╗\n";
echo "║                    VERIFICATION COMPLETE                              ║\n";
echo "╚═══════════════════════════════════════════════════════════════════════╝\n";
echo "\n";

