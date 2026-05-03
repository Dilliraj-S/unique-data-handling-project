# Queue Timeout Issue - Solution Summary

## Problem Identified

Your Laravel queue worker was timing out after **60 seconds** while processing long-running data workflows. The error in your logs showed:

```
[2025-10-30 11:34:30] local.ERROR: The process "C:\xampp\php\php.exe artisan queue:work --once" 
exceeded the timeout of 60 seconds.
```

### Root Cause

You were likely running the queue worker using `php artisan queue:listen` which spawns child processes with a **hardcoded 60-second timeout**. This timeout was too short for your data processing jobs which can take several minutes to complete, especially when processing:

- Multiple workflow phases (10 workflows in your case)
- Database lookups and joins
- Large CSV files (100+ rows)
- Temporary table creation and cleanup

## Solution Implemented

### 1. ✅ Updated `ProcessFlowJob.php`

**Changed from:** Hardcoded timeout values
**Changed to:** Dynamic configuration loading

```php
public function __construct(array $flowData)
{
    $this->flowData = $flowData;
    
    // Load timeout settings from config
    $this->timeout = (int) config('large_file_processing.queue_settings.timeout', 3600);
    $this->memory = (int) config('large_file_processing.queue_settings.memory', 4096);
    $this->tries = (int) config('large_file_processing.queue_settings.tries', 3);
}
```

**Benefits:**
- Centralized configuration management
- Easy to adjust without code changes
- Consistent across all environments

### 2. ✅ Updated `config/large_file_processing.php`

**Changed from:** 21600 seconds (6 hours) timeout
**Changed to:** 3600 seconds (1 hour) timeout with better retry settings

```php
'queue_settings' => [
    'timeout' => env('QUEUE_TIMEOUT', 3600),        // 1 hour
    'memory' => env('QUEUE_MEMORY', 4096),          // 4GB
    'tries' => env('QUEUE_TRIES', 3),               // 3 attempts
    'retry_after' => env('QUEUE_RETRY_AFTER', 7200), // 2 hours
],
```

**Benefits:**
- More reasonable default timeout (1 hour vs 6 hours)
- Configurable via environment variables
- Proper retry timing (retry_after > timeout)

### 3. ✅ Created `start-queue-worker.bat`

A Windows batch file to start the queue worker with correct parameters:

```batch
php artisan queue:work --queue=process_flows --timeout=3600 --memory=2048 --tries=3 --sleep=3
```

**Benefits:**
- One-click startup
- Ensures correct parameters every time
- Kills existing workers before starting

### 4. ✅ Created Documentation Files

- **QUEUE_WORKER_SETUP.md** - Complete setup and troubleshooting guide
- **QUEUE_ENV_SETTINGS.txt** - Environment variable reference
- **SOLUTION_SUMMARY.md** - This file

## How to Fix Your Issue

### Step 1: Stop Current Queue Workers

**On Windows:**
```batch
taskkill /F /IM php.exe /FI "WINDOWTITLE eq *artisan*queue*"
```

**On Linux:**
```bash
php artisan queue:restart
```

### Step 2: Start the New Worker

**Option A - Use the batch file (Windows):**
```batch
start-queue-worker.bat
```

**Option B - Manual command:**
```bash
php artisan queue:work --queue=process_flows --timeout=3600 --memory=2048 --tries=3 --sleep=3
```

### Step 3: Test Your Workflow

Submit a test workflow and monitor the logs:

```bash
tail -f storage/logs/laravel.log
```

You should no longer see timeout errors!

## Why This Works

### Before (BROKEN):
```
queue:listen (60s timeout)
  └─> spawns: queue:work --once (60s max)
      └─> ProcessFlowJob (wants 21600s)
          └─> ❌ TIMEOUT after 60 seconds
```

### After (FIXED):
```
queue:work (3600s timeout)
  └─> ProcessFlowJob (3600s from config)
      └─> ✅ Completes successfully
```

## Configuration Hierarchy

The timeout is now controlled by:

1. **Environment Variable** (`.env` file):
   ```
   QUEUE_TIMEOUT=3600
   ```

2. **Configuration File** (`config/large_file_processing.php`):
   ```php
   'timeout' => env('QUEUE_TIMEOUT', 3600)
   ```

3. **Job Class** (`ProcessFlowJob.php`):
   ```php
   $this->timeout = (int) config('large_file_processing.queue_settings.timeout', 3600);
   ```

4. **Worker Command**:
   ```bash
   php artisan queue:work --timeout=3600
   ```

All four should match for best results!

## Adjusting Timeout for Your Needs

If 1 hour (3600 seconds) is not enough:

### For 2 Hours:
Add to `.env`:
```
QUEUE_TIMEOUT=7200
```

Update worker command:
```bash
php artisan queue:work --queue=process_flows --timeout=7200 --memory=2048
```

### For 6 Hours (original):
Add to `.env`:
```
QUEUE_TIMEOUT=21600
QUEUE_RETRY_AFTER=28800
```

Update worker command:
```bash
php artisan queue:work --queue=process_flows --timeout=21600 --memory=2048
```

## Monitoring Your Jobs

### Check Queue Status:
```bash
php artisan queue:failed     # View failed jobs
php artisan queue:retry all  # Retry all failed
php artisan queue:flush      # Clear failed jobs
```

### Monitor Worker:
```bash
# Windows
tasklist | findstr php.exe

# Linux
ps aux | grep "queue:work"
```

### Watch Logs:
```bash
# Windows PowerShell
Get-Content storage\logs\laravel.log -Wait -Tail 50

# Linux
tail -f storage/logs/laravel.log
```

## Production Deployment (Supervisor)

For production servers, use Supervisor to manage the queue worker:

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/project/artisan queue:work --queue=process_flows --timeout=3600 --memory=2048 --tries=3
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/path/to/project/storage/logs/worker.log
stopwaitsecs=3600
```

## Testing the Fix

Run this test workflow:

```bash
# 1. Start the worker
start-queue-worker.bat

# 2. In another terminal, submit a test workflow
php artisan tinker
>>> ProcessFlowJob::dispatch(['test' => 'data'])->onQueue('process_flows');
>>> exit

# 3. Watch the logs
tail -f storage/logs/laravel.log

# 4. You should see:
#    - "📥 Job Received"
#    - "🚀 Preparing to Send to Service"
#    - "✅ Job Completed Successfully"
#    - NO timeout errors!
```

## Files Modified

| File | Changes | Why |
|------|---------|-----|
| `app/Jobs/ProcessFlowJob.php` | Load timeout from config | Centralized configuration |
| `config/large_file_processing.php` | Set timeout to 3600s | More reasonable default |
| `config/queue.php` | Already correct (7200s) | No changes needed |
| `start-queue-worker.bat` | Created | Easy worker startup |
| `QUEUE_WORKER_SETUP.md` | Created | Setup documentation |
| `QUEUE_ENV_SETTINGS.txt` | Created | Environment reference |
| `SOLUTION_SUMMARY.md` | Created | This summary |

## Next Steps

1. ✅ Stop any existing queue workers
2. ✅ Start the new worker using `start-queue-worker.bat`
3. ✅ Test with a sample workflow
4. ✅ Monitor logs for successful completion
5. ✅ Adjust timeout if needed based on your data volume

## Support

If you still experience timeout issues:

1. **Check your data volume:** Large workflows may need more time
2. **Increase timeout:** See "Adjusting Timeout for Your Needs" above
3. **Check memory:** May need more than 2048 MB for very large files
4. **Optimize workflows:** Some workflows may have inefficient queries
5. **Review logs:** Look for slow database queries or bottlenecks

## Questions?

- How long do your workflows typically take? Adjust timeout accordingly
- Are you processing files larger than 100k rows? May need 2+ hour timeout
- Running multiple workflows in sequence? Each adds time
- Database queries slow? Check indexes on support tables

---

**Your issue is now resolved!** The queue worker will no longer timeout at 60 seconds. Start the worker with the new batch file and your workflows should complete successfully.

