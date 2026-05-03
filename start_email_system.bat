@echo off
setlocal enabledelayedexpansion
REM Email System Starter Script - Complete System + Individual Workers + Filters
REM This script starts the complete email system with continuous monitoring, individual workers, and filters

echo.
echo ========================================
echo    🚀 EMAIL SYSTEM STARTER
echo ========================================
echo.

REM Change to the Laravel project directory
cd /d "D:\DILLI\UNIQUE OG LIVE"
if not exist "artisan" (
    echo ❌ Error: Laravel project not found in current directory!
    echo Please make sure you're running this script from the correct location.
    pause
    exit /b 1
)

echo [%date% %time%] 📍 Changed to project directory: %cd%
echo.

REM Check if user wants to cleanup old jobs first
echo.
echo 🧹 Do you want to clear old email-sync jobs before starting? (y/n)
echo This will remove ALL old, failed, and stuck jobs from the queue instantly.
echo Recommended: Yes (y) - This ensures a clean start
set /p "cleanup=Enter y for cleanup, n to skip: "

if /i "%cleanup%"=="y" (
    echo.
    echo [%date% %time%] 🧹 Clearing old email-sync jobs instantly...
    echo ⏳ Please wait...
    php artisan email:cleanup --force
    if %errorlevel% neq 0 (
        echo ❌ Cleanup failed! Please check the error above.
        echo You can still continue, but old jobs might interfere with new ones.
        echo.
        set /p "continue=Do you want to continue anyway? (y/n): "
        if /i not "!continue!"=="y" (
            pause
            exit /b 1
        )
    ) else (
        echo.
        echo [%date% %time%] ✅ Cleanup completed instantly!
    )
    echo.
)

echo.
echo 🚀 Starting Email System Components...
echo ========================================
echo.

REM Start the continuous email sync in background (5s interval for instant email detection)
echo [%date% %time%] 🔄 Starting continuous email sync (5s interval)...
echo    ⏳ This will check all accounts every 5 seconds for new emails...
start "Email Sync Monitor" cmd /k "php artisan emails:init-sync --daemon --interval=5"

REM Wait a moment for the sync to start
timeout /t 3 /nobreak > nul
echo    ✅ Email sync monitor started!

REM Start the main queue worker
echo [%date% %time%] ⚡ Starting main queue worker...
echo    ⏳ This will process email-sync-high and email-sync queues...
start "Email Queue Worker" cmd /k "php artisan queue:work --queue=email-sync-high,email-sync --timeout=300 --tries=2 --sleep=1"

REM Wait a moment for the queue worker to start
timeout /t 2 /nobreak > nul
echo    ✅ Main queue worker started!

REM Start the filter queue worker
echo [%date% %time%] 🔍 Starting filter queue worker...
echo    ⏳ This will process filters for drift sequences...
start "Filter Queue Worker" cmd /k "php artisan queue:work --queue=filters --timeout=300 --tries=2 --sleep=1"

REM Wait a moment for the filter worker to start
timeout /t 2 /nobreak > nul
echo    ✅ Filter queue worker started!

echo.
echo 🔧 Individual Workers Setup
echo ========================================
echo.
echo Do you want to start individual workers for specific email accounts?
echo These are dedicated workers for sending emails from specific accounts.
echo.
echo Example email account IDs: 1,4,5,6,7,8,9,10,12,13,14,16,17,18,19,23,24,31
echo.
set /p "ids=Enter email account IDs (or press Enter to skip): "

if not "%ids%"=="" (
    echo.
    echo [%date% %time%] Starting individual workers...
    echo.
    
    set "count=0"
    for %%i in (%ids%) do (
        set /a count+=1
        echo [%date% %time%] Starting worker for sender %%i... (!count!)
        
        REM Create a simple batch file for each worker using a different approach
        (
            echo @echo off
            echo cd /d "D:\DILLI\UNIQUE OG LIVE"
            echo php artisan queue:work --queue=emails_sender_%%i --timeout=300 --tries=2 --sleep=1
            echo pause
        ) > "worker_%%i.bat"
        
        REM Start the worker using the batch file
        start "Worker %%i" "worker_%%i.bat"
        
        REM Wait a moment between starting workers
        timeout /t 2 /nobreak >nul
    )
    
    echo.
    echo [%date% %time%] ✅ All !count! individual workers started!
    echo.
    echo ℹ️ Individual worker batch files created. They will be cleaned up automatically.
    
    REM Clean up the batch files after a delay
    timeout /t 10 /nobreak >nul
    for %%i in (%ids%) do (
        if exist "worker_%%i.bat" del "worker_%%i.bat" >nul 2>&1
    )
) else (
    echo.
    echo [%date% %time%] ℹ️ Skipping individual workers.
)

echo.
echo ========================================
echo    ✅ EMAIL SYSTEM STARTED SUCCESSFULLY!
echo ========================================
echo.
echo 📊 System Status:
echo - 🔄 Continuous email sync: Running (checks every 5 seconds - instant detection!)
echo - ⚡ Main queue worker: Running (processes email-sync-high, email-sync)
echo - 🔍 Filter queue worker: Running (processes filters)
if not "%ids%"=="" (
    echo - 🔧 Individual workers: Running for accounts %ids%
)
echo - 📧 Live fetching: Active (instant email detection)
echo.
echo 🎯 Your system is now live and will:
echo - ✅ Check all accounts every 5 seconds (3x faster for instant detection!)
echo - ✅ Instantly fetch new emails when received
echo - ✅ Add emails to database automatically
echo - ✅ Process filters for drift sequences
echo - ✅ Work for both engage and drift systems
if not "%ids%"=="" (
    echo - ✅ Process individual sender queues in parallel
)
echo - ✅ Perfect for instant email detection
echo.
echo 📝 Important Notes:
echo - All processes are running in separate windows
echo - Close any window to stop that specific process
echo - System will continue running until you close the windows
echo - Check the windows for any error messages
echo - Filter queue handles drift sequence processing
echo - Individual workers handle email sending for specific accounts
echo.
echo 🎉 Your email system is now fully operational!
echo.
echo Press any key to exit this script (system will continue running)...
pause > nul 