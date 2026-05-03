@echo off
REM ============================================================================
REM Queue Worker for MASSIVE File Processing (10 crore - 20 crore rows)
REM ============================================================================
REM This starts the queue worker optimized for 100M-200M row CSV files

echo.
echo ╔═══════════════════════════════════════════════════════════════════════╗
echo ║     Queue Worker for MASSIVE File Processing (100M-200M rows)        ║
echo ╚═══════════════════════════════════════════════════════════════════════╝
echo.
echo Configuration:
echo   Timeout:  172800 seconds (48 hours)
echo   Memory:   8192 MB (8 GB)
echo   Queue:    process_flows
echo   Tries:    2 attempts
echo   Batch:    10000 rows per batch
echo.
echo WARNING: This worker can run for 24-48 hours for massive files!
echo          Monitor logs at: storage\logs\laravel.log
echo.

REM Stop any existing queue workers first
echo Stopping existing queue workers...
taskkill /F /IM php.exe /FI "WINDOWTITLE eq *artisan*queue*" 2>nul
timeout /t 2 /nobreak >nul

REM Start the queue worker with massive file settings
echo Starting queue worker for massive file processing...
echo.
php artisan queue:work --queue=process_flows --timeout=172800 --memory=8192 --tries=2 --sleep=3

pause

