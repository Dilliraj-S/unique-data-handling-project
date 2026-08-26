@echo off
setlocal enabledelayedexpansion
REM Email System Starter Script - FOR Project
REM This script starts the email sync system with continuous monitoring and dedicated queue worker
REM Based on BV project's start_email_system.bat pattern

echo.
echo ========================================
echo    🚀 EMAIL SYSTEM STARTER
echo ========================================
echo.

REM Change to the project directory
cd /d "%~dp0"
if not exist "package.json" (
    echo ❌ Error: Project not found in current directory!
    echo Please make sure you're running this script from the project root.
    pause
    exit /b 1
)

echo [%date% %time%] 📍 Changed to project directory: %cd%
echo.

REM Check if user wants to cleanup old jobs first
echo.
echo 🧹 Do you want to clear old email-sync jobs before starting? (y/n)
echo This will remove old failed jobs from the queue.
echo Recommended: Yes (y) - This ensures a clean start
set /p "cleanup=Enter y for cleanup, n to skip: "

if /i "%cleanup%"=="y" (
    echo.
    echo [%date% %time%] 🧹 Note: Old jobs will be cleaned up automatically by the init script
    echo.
)

echo.
echo 🚀 Starting Email System Components...
echo ========================================
echo.

REM Start the continuous email sync monitor (5s interval for instant email detection)
echo [%date% %time%] 🔄 Starting continuous email sync (5s interval)...
echo    ⏳ This will check all accounts every 5 seconds for new emails...
start "Email Sync Monitor" cmd /k "npm run emails:init-sync:daemon"

REM Wait a moment for the sync to start
timeout /t 3 /nobreak > nul
echo    ✅ Email sync monitor started!

REM Start the dedicated email sync queue worker
echo [%date% %time%] ⚡ Starting email sync queue worker...
echo    ⏳ This will process email-sync jobs...
start "Email Sync Queue Worker" cmd /k "npm run queue:email-sync"

REM Wait a moment for the queue worker to start
timeout /t 2 /nobreak > nul
echo    ✅ Email sync queue worker started!

echo.
echo ========================================
echo    ✅ EMAIL SYSTEM STARTED SUCCESSFULLY!
echo ========================================
echo.
echo 📊 System Status:
echo - 🔄 Continuous email sync: Running (checks every 5 seconds - instant detection!)
echo - ⚡ Email sync queue worker: Running (processes email-sync jobs)
echo - 📧 Live fetching: Active (instant email detection)
echo.
echo 🎯 Your system is now live and will:
echo - ✅ Check all accounts every 5 seconds (instant detection!)
echo - ✅ Instantly fetch new emails when received
echo - ✅ Add emails to database automatically
echo - ✅ Work for both engage and drift systems
echo - ✅ Perfect for instant email detection
echo.
echo 📝 Important Notes:
echo - All processes are running in separate windows
echo - Close any window to stop that specific process
echo - System will continue running until you close the windows
echo - Check the windows for any error messages
echo - Main queue worker (npm run queue:work) handles imports and other operations
echo.
echo 🎉 Your email system is now fully operational!
echo.
echo Press any key to exit this script (system will continue running)...
pause > nul

