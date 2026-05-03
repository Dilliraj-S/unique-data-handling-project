<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Large File Processing Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration settings for handling MASSIVE CSV files in workflow processing.
    | Optimized for 10 crore (100 million) to 20 crore (200 million) rows.
    |
    | IMPORTANT: For files with 100M+ rows:
    | - Processing time: 10-48 hours depending on workflows
    | - Recommended: Split files into chunks for parallel processing
    | - Use dedicated database server with optimized indexes
    | - Monitor disk space (temp tables can be very large)
    |
    */

    'memory_limit' => env('LARGE_FILE_MEMORY_LIMIT', '-1'), // unlimited for heavy jobs
    'max_execution_time' => env('LARGE_FILE_MAX_EXECUTION_TIME', 0), // unlimited
    'batch_size' => env('LARGE_FILE_BATCH_SIZE', 10000), // Increased from 5000 for better throughput
    'progress_log_interval' => env('LARGE_FILE_PROGRESS_INTERVAL', 100000), // Log every 100k rows (was 20k)
    
    'php_settings' => [
        'upload_max_filesize' => env('PHP_UPLOAD_MAX_FILESIZE', '10G'), // Increased from 500M to 10GB
        'post_max_size' => env('PHP_POST_MAX_SIZE', '10G'), // Increased from 500M to 10GB
        'max_input_time' => env('PHP_MAX_INPUT_TIME', 0),
        'memory_limit' => env('PHP_MEMORY_LIMIT', '-1'),
        'max_execution_time' => env('PHP_MAX_EXECUTION_TIME', 0),
    ],

    'queue_settings' => [
        'timeout' => env('QUEUE_TIMEOUT', 172800), // 48 hours (was 1 hour) - for massive files
        'memory' => env('QUEUE_MEMORY', 8192), // 8GB (was 4GB) - increased for large batch processing
        'tries' => env('QUEUE_TRIES', 2), // Reduced from 3 - failed jobs on 100M rows should not auto-retry
        'retry_after' => env('QUEUE_RETRY_AFTER', 259200), // 72 hours - longer than timeout
    ],

    'csv_processing' => [
        'chunk_size' => env('CSV_CHUNK_SIZE', 10000), // Increased from 5000 - larger batches for efficiency
        'memory_threshold' => env('CSV_MEMORY_THRESHOLD', 10000), // Reduced to 10k - always use background for large files
        // Set to 0 to disable row-count hard limit and allow unlimited rows
        'file_split_threshold' => env('CSV_FILE_SPLIT_THRESHOLD', 0), // 0 = unlimited
        'enable_progress_logging' => env('CSV_ENABLE_PROGRESS_LOGGING', true),
        'max_upload_size_mb' => env('CSV_MAX_UPLOAD_SIZE_MB', 10240), // 10GB (was 500MB)
        'enable_memory_optimization' => env('CSV_ENABLE_MEMORY_OPTIMIZATION', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Massive File Processing (100M+ rows)
    |--------------------------------------------------------------------------
    |
    | Special settings for processing files with 10 crore (100M) or more rows.
    | These settings enable chunked processing and parallel execution.
    |
    */
    
    'massive_file_processing' => [
        // Enable automatic file splitting for parallel processing
        'enable_auto_split' => env('ENABLE_AUTO_SPLIT', true),
        
        // Split files larger than this into multiple jobs (in rows)
        // 10 crore = 100M, 20 crore = 200M
        'auto_split_threshold' => env('AUTO_SPLIT_THRESHOLD', 10000000), // 10 million rows per chunk
        
        // Maximum parallel workers for processing chunks
        'max_parallel_workers' => env('MAX_PARALLEL_WORKERS', 4),
        
        // Database batch insert size (larger = faster but more memory)
        'db_batch_insert_size' => env('DB_BATCH_INSERT_SIZE', 10000),
        
        // Use database cursor for memory-efficient reading
        'use_cursor' => env('USE_CURSOR', true),
        
        // Enable temp file cleanup after processing
        'cleanup_temp_files' => env('CLEANUP_TEMP_FILES', true),
        
        // Disk space check before processing (in GB)
        'min_free_disk_space_gb' => env('MIN_FREE_DISK_SPACE_GB', 100),
        
        // Enable database query optimization
        'optimize_db_queries' => env('OPTIMIZE_DB_QUERIES', true),
        
        // Checkpoint interval (save progress every N rows)
        'checkpoint_interval' => env('CHECKPOINT_INTERVAL', 1000000), // Every 1M rows
    ],

    /*
    |--------------------------------------------------------------------------
    | Database Optimization for Massive Files
    |--------------------------------------------------------------------------
    */
    
    'database_optimization' => [
        // Connection pool size
        'connection_pool_size' => env('DB_CONNECTION_POOL_SIZE', 20),
        
        // MySQL specific optimizations
        'mysql_bulk_insert_size' => env('MYSQL_BULK_INSERT_SIZE', 10000),
        'mysql_innodb_buffer_pool_size' => env('MYSQL_INNODB_BUFFER_POOL', '8G'),
        
        // Disable foreign key checks during bulk operations
        'disable_foreign_keys' => env('DISABLE_FOREIGN_KEYS', true),
        
        // Use LOAD DATA INFILE for fastest CSV import (if available)
        'use_load_data_infile' => env('USE_LOAD_DATA_INFILE', false),
        
        // Index optimization
        'drop_indexes_during_import' => env('DROP_INDEXES_DURING_IMPORT', false), // Risky but faster
        'rebuild_indexes_after_import' => env('REBUILD_INDEXES_AFTER_IMPORT', true),
    ],
];
