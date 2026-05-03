@echo off
cd /d "D:\DILLI\UNIQUE OG LIVE"
php artisan queue:work --queue=emails_sender_%i --timeout=300 --tries=2 --sleep=1
pause
