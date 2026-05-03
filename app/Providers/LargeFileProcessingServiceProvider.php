<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Config;

class LargeFileProcessingServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Apply PHP settings for large file processing
        $phpSettings = Config::get('large_file_processing.php_settings', []);
        
        foreach ($phpSettings as $setting => $value) {
            if (function_exists('ini_set')) {
                ini_set($setting, $value);
            }
        }

        // // Log configuration for debugging
        // if (Config::get('large_file_processing.csv_processing.enable_progress_logging', true)) {
        //     \Log::info('Large File Processing Configuration Applied', [
        //         'memory_limit' => ini_get('memory_limit'),
        //         'max_execution_time' => ini_get('max_execution_time'),
        //         'upload_max_filesize' => ini_get('upload_max_filesize'),
        //         'post_max_size' => ini_get('post_max_size'),
        //     ]);
        // }
    }
}
