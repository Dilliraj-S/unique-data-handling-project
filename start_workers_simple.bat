@echo off
echo Simple Email Queue Worker Starter
echo.

set /p "ids=Enter email account IDs (comma-separated): "

if "%ids%"=="" (
    echo No IDs provided. Exiting.
    pause
    exit /b
)

echo.
echo Starting workers...
echo.

for %%i in (%ids%) do (
    echo Starting worker for sender %%i...
    start "Worker %%i" cmd /k "php artisan queue:work --queue=emails_sender_%%i"
    timeout /t 1 /nobreak >nul
)

echo.
echo All workers started!
pause 