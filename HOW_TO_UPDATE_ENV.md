# How to Update Your .env File

## 📋 Quick Guide

Follow these steps to update your `.env` file for massive file processing:

---

## Option 1: Copy-Paste Method (Easiest)

### Step 1: Open your .env file
```
Location: C:\xampp\htdocs\bv\.env
```

### Step 2: Scroll to the bottom of your .env file

### Step 3: Copy EVERYTHING from `ADD_TO_ENV_FILE.txt` and paste at the bottom

That's it! Your .env file now has all the settings.

---

## Option 2: Manual Update (If settings already exist)

If you already have some of these settings in your .env file, update them with these values:

### CRITICAL Settings (MUST UPDATE)

```env
QUEUE_TIMEOUT=172800              # Change from 3600 to 172800
QUEUE_MEMORY=8192                 # Change from 4096 to 8192
CSV_MAX_UPLOAD_SIZE_MB=10240      # Change from 500 to 10240
LARGE_FILE_BATCH_SIZE=10000       # Change from 5000 to 10000
```

### Optional Settings (Recommended)

```env
QUEUE_TRIES=2                     # Change from 3 to 2
LARGE_FILE_PROGRESS_INTERVAL=100000  # Change from 20000 to 100000
CSV_CHUNK_SIZE=10000              # Change from 5000 to 10000
```

---

## ✅ After Updating .env

### Step 1: Clear config cache
```bash
php artisan config:clear
```

### Step 2: Stop any running queue workers
```bash
taskkill /F /IM php.exe /FI "WINDOWTITLE eq *artisan*queue*"
```

### Step 3: Start the new queue worker
```bash
start-queue-worker.bat
```

### Step 4: Verify the settings loaded
Check the worker console - it should show:
```
Timeout:  172800 seconds (48 hours)
Memory:   8192 MB (8 GB)
```

---

## 🔍 Verify Your Settings

### Check if settings are loaded correctly:

```bash
php artisan tinker
```

Then run:
```php
config('large_file_processing.queue_settings.timeout')
// Should show: 172800

config('large_file_processing.queue_settings.memory')
// Should show: 8192

config('large_file_processing.csv_processing.max_upload_size_mb')
// Should show: 10240

exit
```

---

## 📝 Complete Example .env File

Here's what your .env file should look like (showing only the relevant sections):

```env
APP_NAME=Laravel
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost

# ... your existing settings ...

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=root
DB_PASSWORD=

# ... your existing settings ...

# ============================================================================
# MASSIVE FILE PROCESSING SETTINGS (ADD THESE)
# ============================================================================

# Queue Configuration
QUEUE_CONNECTION=database
QUEUE_TIMEOUT=172800
QUEUE_MEMORY=8192
QUEUE_TRIES=2
QUEUE_RETRY_AFTER=259200

# Large File Processing
LARGE_FILE_MEMORY_LIMIT=-1
LARGE_FILE_MAX_EXECUTION_TIME=0
LARGE_FILE_BATCH_SIZE=10000
LARGE_FILE_PROGRESS_INTERVAL=100000

# CSV Processing
CSV_CHUNK_SIZE=10000
CSV_MEMORY_THRESHOLD=10000
CSV_FILE_SPLIT_THRESHOLD=0
CSV_MAX_UPLOAD_SIZE_MB=10240
CSV_ENABLE_PROGRESS_LOGGING=true
CSV_ENABLE_MEMORY_OPTIMIZATION=true

# PHP Settings
PHP_UPLOAD_MAX_FILESIZE=10G
PHP_POST_MAX_SIZE=10G
PHP_MAX_INPUT_TIME=0
PHP_MEMORY_LIMIT=-1
PHP_MAX_EXECUTION_TIME=0

# Massive File Features
ENABLE_AUTO_SPLIT=false
AUTO_SPLIT_THRESHOLD=10000000
MAX_PARALLEL_WORKERS=4
DB_BATCH_INSERT_SIZE=10000
USE_CURSOR=true
CLEANUP_TEMP_FILES=true
MIN_FREE_DISK_SPACE_GB=100
OPTIMIZE_DB_QUERIES=true
CHECKPOINT_INTERVAL=1000000

# Database Optimization
DB_CONNECTION_POOL_SIZE=20
MYSQL_BULK_INSERT_SIZE=10000
MYSQL_INNODB_BUFFER_POOL=8G
DISABLE_FOREIGN_KEYS=true
USE_LOAD_DATA_INFILE=false
DROP_INDEXES_DURING_IMPORT=false
REBUILD_INDEXES_AFTER_IMPORT=true
```

---

## ⚠️ Important Notes

### 1. Do NOT modify these existing settings:
- `APP_KEY` (keep your existing key)
- `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE` (keep your database settings)
- `APP_URL` (keep your URL)
- Any other custom settings you have

### 2. Only ADD or UPDATE the massive file processing settings listed above

### 3. Save the file and make sure there are NO extra spaces or special characters

---

## 🚨 Common Mistakes to Avoid

❌ **Don't do this:**
```env
QUEUE_TIMEOUT = 172800      # Space before = (wrong!)
QUEUE_TIMEOUT=172800        # Extra space in value (wrong!)
QUEUE_TIMEOUT="172800"      # Quotes not needed (wrong!)
```

✅ **Do this:**
```env
QUEUE_TIMEOUT=172800        # Correct!
```

---

## 🎯 For Your 30,000 Rows (500MB File)

With these settings:
- ✅ Upload time: 2-3 minutes
- ✅ Processing time: 10-15 minutes
- ✅ Total time: ~15-20 minutes
- ✅ Timeout risk: ZERO (you have 48 hours!)
- ✅ Memory: More than enough (8GB available, ~500MB used)
- ✅ File size: No problem (10GB limit, 500MB used = 5%)

**Your 30k rows will process smoothly!** 🚀

---

## 📞 Need Help?

If something doesn't work:

1. **Check .env syntax:**
   - No spaces around `=`
   - No quotes unless string value
   - One setting per line

2. **Clear config cache:**
   ```bash
   php artisan config:clear
   ```

3. **Restart queue worker:**
   ```bash
   taskkill /F /IM php.exe /FI "WINDOWTITLE eq *artisan*queue*"
   start-queue-worker.bat
   ```

4. **Check logs:**
   ```bash
   Get-Content storage\logs\laravel.log -Wait -Tail 50
   ```

---

## ✅ Checklist

Before processing your file:

- [ ] Updated .env file with new settings
- [ ] Ran `php artisan config:clear`
- [ ] Stopped old queue workers
- [ ] Started new queue worker with `start-queue-worker.bat`
- [ ] Verified timeout shows 172800 seconds in worker console
- [ ] Tested with small file (1,000 rows) successfully

**All checked?** You're ready to process your 30,000 rows! 🎉

---

**Files to reference:**
- `ADD_TO_ENV_FILE.txt` - Copy-paste ready settings
- `ENV_SETTINGS_COPY_PASTE.txt` - Detailed version with comments
- `QUICK_REFERENCE.txt` - Quick commands

