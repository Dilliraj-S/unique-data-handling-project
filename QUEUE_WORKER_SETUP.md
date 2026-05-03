# Queue Worker Setup - Process Flows

## The Problem

Your queue worker was timing out after 60 seconds because the Laravel queue listener (`queue:listen`) spawns child processes with a default 60-second timeout, which was too short for your data processing jobs.

**Error you were seeing:**
```
The process exceeded the timeout of 60 seconds.
```

## The Solution

### Option 1: Use the Batch File (Recommended for Windows)

Simply run the provided batch file:
```bash
start-queue-worker.bat
```

This will start the queue worker with:
- **Timeout:** 3600 seconds (1 hour)
- **Memory:** 2048 MB
- **Queue:** process_flows
- **Tries:** 3 attempts

### Option 2: Manual Command

Run this command in your terminal:
```bash
php artisan queue:work --queue=process_flows --timeout=3600 --memory=2048 --tries=3 --sleep=3
```

### Option 3: For Production (Supervisor Configuration)

Create a supervisor configuration file `/etc/supervisor/conf.d/laravel-worker.conf`:

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/your/project/artisan queue:work --queue=process_flows --timeout=3600 --memory=2048 --tries=3
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/path/to/your/project/storage/logs/worker.log
stopwaitsecs=3600
```

Then run:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-worker:*
```

## Key Differences

### ❌ DON'T USE: `queue:listen`
```bash
php artisan queue:listen  # This spawns child processes with 60s timeout
```

### ✅ USE: `queue:work`
```bash
php artisan queue:work --timeout=3600  # This runs jobs in the same process
```

## Job Configuration

The `ProcessFlowJob` is now configured with:
- **Timeout:** 3600 seconds (1 hour)
- **Memory:** 4096 MB
- **Tries:** 3
- **Fail on Timeout:** Yes

## Monitoring

To see if your queue worker is running:
```bash
# Windows
tasklist | findstr php.exe

# Linux
ps aux | grep "queue:work"
```

To check queue status:
```bash
php artisan queue:failed     # See failed jobs
php artisan queue:retry all  # Retry failed jobs
php artisan queue:flush      # Clear failed jobs
```

## Troubleshooting

### If jobs still timeout:
1. Check the job timeout in `ProcessFlowJob.php` (currently 1 hour)
2. Increase the `--timeout` parameter when starting the worker
3. Check your `config/queue.php` `retry_after` setting

### If memory issues occur:
1. Increase the `--memory` parameter (currently 2048 MB)
2. Check `$memory` property in `ProcessFlowJob.php` (currently 4096 MB)
3. Monitor with `php artisan queue:work --memory=2048 --verbose`

### To restart the worker:
```bash
# Windows
taskkill /F /IM php.exe /FI "WINDOWTITLE eq *artisan*queue*"

# Linux
php artisan queue:restart
```

## Configuration Files Updated

1. ✅ `app/Jobs/ProcessFlowJob.php` - Updated timeout from 21600s to 3600s
2. ✅ `start-queue-worker.bat` - New batch file for easy startup
3. ✅ `config/queue.php` - Already configured with 7200s retry_after

## Next Steps

1. Stop any running queue workers
2. Start the new worker using `start-queue-worker.bat` or the manual command
3. Test your workflow processing
4. Monitor the logs at `storage/logs/laravel.log`

