<?php

return [
    /*
    |--------------------------------------------------------------------------
    | ADMS Batch Processing
    |--------------------------------------------------------------------------
    | Defines batch size for processing biometric data. Optimized for database performance.
    */
    'batch_size' => env('ADMS_BATCH_SIZE', 500), // Increased batch size for better throughput

    /*
    |--------------------------------------------------------------------------
    | Cache Configuration
    |--------------------------------------------------------------------------
    | Configures caching for device metadata, settings, and commands using Redis for better performance.
    */
    'cache' => [
        'driver' => env('ADMS_CACHE_DRIVER', 'redis'), // Changed to Redis for faster caching
        'prefix' => env('ADMS_CACHE_PREFIX', 'adms:'),
        'ttl' => [
            'device' => env('ADMS_DEVICE_TTL', 86400), // Extended TTL for devices
            'settings' => env('ADMS_SETTINGS_TTL', 600), // Increased for less frequent queries
            'commands' => env('ADMS_COMMANDS_TTL', 30), // Increased for stability
            'request' => env('ADMS_REQUEST_TTL', 120), // Extended to reduce duplicates
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Queue Configuration
    |--------------------------------------------------------------------------
    | Defines queue settings for ADMS jobs with Redis for high throughput.
    */
    'queue' => [
        'driver' => env('ADMS_QUEUE_DRIVER', 'redis'), // Changed to Redis for better performance
        'connection' => env('ADMS_QUEUE_CONNECTION', 'adms_queue'), // Dedicated connection
        'prefix' => env('ADMS_QUEUE_PREFIX', 'adms:'),
        'retry_after' => env('ADMS_QUEUE_RETRY_AFTER', 300), // Increased for longer job processing
        'max_attempts' => env('ADMS_QUEUE_MAX_ATTEMPTS', 5), // Added max attempts for jobs
    ],

    /*
    |--------------------------------------------------------------------------
    | Retry Configuration
    |--------------------------------------------------------------------------
    | Configures retry behavior with exponential backoff for transient errors.
    */
    'retry' => [
        'max_retries' => env('ADMS_MAX_RETRIES', 5), // Increased retries for robustness
        'delay_ms' => env('ADMS_RETRY_DELAY_MS', 200), // Slightly increased initial delay
        'backoff_factor' => env('ADMS_BACKOFF_FACTOR', 2),
    ],

    /*
    |--------------------------------------------------------------------------
    | Database Connections
    |--------------------------------------------------------------------------
    | Defines database connections for central and business databases.
    */
    'database' => [
        'central' => env('ADMS_CENTRAL_DB_CONNECTION', 'central'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging
    |--------------------------------------------------------------------------
    | Configures logging for ADMS operations with structured JSON output.
    */
    'logging' => [
        'level' => env('ADMS_LOG_LEVEL', 'info'),
        'channel' => env('ADMS_LOG_CHANNEL', 'adms'),
    ],
];