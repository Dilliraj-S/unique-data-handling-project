<?php

return [
    'developer_mode' => env('SKELETON_DEVELOPER_MODE', false),
    'developer_logs' => env('SKELETON_DEVELOPER_LOGS', 'all'),
    'allowed_systems' => explode(',', env('SKELETON_ALLOWED_SYSTEMS', 'central,business')),
    'cache_ttl' => (int) env('SKELETON_CACHE_TTL', 7200),
    'token_reload' => (int) env('SKELETON_TOKEN_RELOAD', false),
    'token_length' => (int) env('SKELETON_TOKEN_LENGTH', 27),
    'max_token_attempts' => (int) env('SKELETON_MAX_TOKEN_ATTEMPTS', 15),
    'session_db_key' => env('SKELETON_SESSION_DB_KEY', 'business_db'),
    'encryption_cipher' => env('SKELETON_ENCRYPTION_CIPHER', 'AES-256-CBC'),
    'encryption_queue' => env('SKELETON_ENCRYPTION_QUEUE', 'encryption'),
    'password_expiry_days' => (int) env('SKELETON_PASSWORD_EXPIRY_DAYS', 90),
    'max_logins' => (int) env('SKELETON_MAX_LOGINS', 5),
];