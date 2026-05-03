# Massive File Processing Checklist (100M-200M Rows)

Use this checklist before processing files with 10 crore (100M) or 20 crore (200M) rows.

---

## 📋 PRE-PROCESSING CHECKLIST

### ☑️ Hardware Requirements

- [ ] **RAM:** Minimum 16GB, recommended 32GB+
- [ ] **CPU:** Minimum 4 cores, recommended 8+ cores
- [ ] **Disk Space:** Minimum 200GB free, recommended 500GB+
- [ ] **Database:** MySQL 8.0+ installed and running
- [ ] **Network:** Stable connection (1 Gbps recommended)

### ☑️ Software Configuration

#### PHP Settings (`php.ini`)
- [ ] `memory_limit = -1`
- [ ] `max_execution_time = 0`
- [ ] `upload_max_filesize = 10G`
- [ ] `post_max_size = 10G`
- [ ] `max_allowed_packet = 1G`

#### MySQL Settings (`my.ini` or `my.cnf`)
- [ ] `innodb_buffer_pool_size = 8G` (or 70% of RAM)
- [ ] `max_connections = 200`
- [ ] `wait_timeout = 172800`
- [ ] `interactive_timeout = 172800`
- [ ] `bulk_insert_buffer_size = 256M`
- [ ] `max_allowed_packet = 1G`
- [ ] **MySQL service restarted after changes**

#### Environment Variables (`.env`)
- [ ] `QUEUE_TIMEOUT=172800` (48 hours)
- [ ] `QUEUE_MEMORY=8192` (8GB)
- [ ] `QUEUE_TRIES=2`
- [ ] `LARGE_FILE_BATCH_SIZE=10000`
- [ ] `LARGE_FILE_PROGRESS_INTERVAL=100000`
- [ ] `CSV_MAX_UPLOAD_SIZE_MB=10240` (10GB)

### ☑️ Database Preparation

#### Indexes Created
- [ ] `mars.li_company_info` - index on `lic_smtp`, `lic_company_id`, `lic_company_name`
- [ ] `mercury.titles_master` - index on `title`
- [ ] `mercury.country_mapping` - index on `location`
- [ ] `moon.countries` - index on `name`
- [ ] `moon.states` - index on `name`
- [ ] `moon.cities` - index on `name`
- [ ] `mars.gmse_company_info` - composite index on `gs_smtp, gs_country`
- [ ] `jupiter.apollo_data` - composite index on `ap_company_smtp, ap_company_name`
- [ ] `saturn.zm_data` - composite index on `zm_smtp, zm_company`
- [ ] `neptune.py_smtp` - index on `py_smtp`

#### Tables Analyzed
- [ ] Run `ANALYZE TABLE` on all support tables
- [ ] Verify indexes are being used: `EXPLAIN SELECT ...`

#### Database Health
- [ ] No slow queries running: `SHOW PROCESSLIST;`
- [ ] No locked tables: `SHOW OPEN TABLES WHERE In_use > 0;`
- [ ] InnoDB buffer pool warm (after first query)
- [ ] Temp table space cleared: `DROP TABLE moon.temp_*;`

### ☑️ File Preparation

- [ ] CSV file is UTF-8 encoded
- [ ] No special characters in headers
- [ ] No empty rows at end of file
- [ ] Headers match required workflow fields
- [ ] File size verified (use `ls -lh` or Properties)
- [ ] Test with first 10,000 rows successfully

### ☑️ Disk Space

Check available space on:
- [ ] **C:\** (or root `/`) - minimum 100GB free
- [ ] **MySQL data directory** - minimum 200GB free
- [ ] **Temp directory** - minimum 50GB free
- [ ] **Upload directory** - minimum 20GB free
- [ ] **Export directory** - minimum 20GB free

### ☑️ System Resources

Before starting:
- [ ] CPU usage <20%
- [ ] Memory usage <50%
- [ ] No other heavy processes running
- [ ] No database maintenance scheduled
- [ ] No system updates pending

---

## 🚀 PROCESSING CHECKLIST

### ☑️ Queue Worker

- [ ] Old workers stopped: `taskkill /F /IM php.exe ...`
- [ ] Worker started: `start-queue-worker.bat` or manual command
- [ ] Worker visible in Task Manager
- [ ] Worker console showing "Waiting for jobs..."

### ☑️ Upload & Submit

- [ ] Logged into application
- [ ] Navigated to Query Chain → Workflows
- [ ] Selected 10 workflows in correct order
- [ ] CSV file selected for upload
- [ ] Input source: CSV
- [ ] Output target: CSV (or Excel)
- [ ] Process name entered
- [ ] Clicked "Process" button
- [ ] Success message received
- [ ] Job dispatched to queue

### ☑️ Monitoring Setup

- [ ] Log viewer open: `Get-Content storage\logs\laravel.log -Wait -Tail 100`
- [ ] Task Manager open (Performance tab)
- [ ] Notepad with estimated times for reference
- [ ] Timer/clock to track elapsed time
- [ ] Browser tab open to check results later

---

## 📊 DURING PROCESSING CHECKLIST

### ☑️ Every Hour

- [ ] Check logs for progress updates
- [ ] Verify rows/second rate (should be 1000-2000)
- [ ] Check memory usage (<70%)
- [ ] Check disk space (should not decrease rapidly)
- [ ] Check CPU usage (should be 50-80%)
- [ ] Check network activity (should show data transfer)

### ☑️ Every 4 Hours

- [ ] Calculate estimated completion time
- [ ] Verify all workflows completed so far
- [ ] Check MySQL connections: `SHOW PROCESSLIST;`
- [ ] Check for any errors in logs
- [ ] Take note of current progress percentage

### ☑️ If Issues Occur

- [ ] Note the exact time of issue
- [ ] Capture last 100 lines of log
- [ ] Check Task Manager for hung process
- [ ] Verify MySQL is still running
- [ ] Check disk space hasn't filled up
- [ ] Review error messages carefully

---

## ✅ POST-PROCESSING CHECKLIST

### ☑️ Verify Completion

- [ ] Log shows "🏁 MasterFlow completed"
- [ ] All 10 workflows completed successfully
- [ ] Total processed rows matches expected
- [ ] Rejected count is reasonable (<10%)
- [ ] No "failed" workflows in logs

### ☑️ Check Output

- [ ] Output file exists in `public/exports/flow/`
- [ ] File size is reasonable (similar to input)
- [ ] File can be opened in Excel/LibreOffice
- [ ] Headers are correct and complete
- [ ] First 100 rows look correct
- [ ] Last 100 rows look correct
- [ ] Random sample checks pass

### ☑️ Database Cleanup

- [ ] Cloned table dropped: `DROP TABLE moon.master_PROC*;`
- [ ] Temp tables dropped: `DROP TABLE moon.temp_*;`
- [ ] Process logs archived or cleaned
- [ ] Foreign keys re-enabled (if disabled)
- [ ] Indexes rebuilt (if dropped)

### ☑️ System Cleanup

- [ ] Queue worker stopped (if not needed)
- [ ] Temp files deleted
- [ ] Cache cleared if needed
- [ ] Browser cache cleared
- [ ] Logs rotated/archived

---

## 🎯 OPTIMIZATION CHECKLIST (For Next Time)

### ☑️ If Processing Was Slow (<1000 rows/sec)

- [ ] Add missing indexes on support tables
- [ ] Increase `innodb_buffer_pool_size` in MySQL
- [ ] Move database to SSD if on HDD
- [ ] Increase batch size to 15000-20000
- [ ] Use dedicated database server
- [ ] Optimize slow queries identified in logs

### ☑️ If Memory Issues Occurred

- [ ] Reduce batch size to 5000
- [ ] Increase physical RAM
- [ ] Close other applications before processing
- [ ] Enable more aggressive garbage collection
- [ ] Consider file splitting for parallel processing

### ☑️ If Disk Space Issues Occurred

- [ ] Archive old process logs
- [ ] Clean up old export files
- [ ] Move database to larger drive
- [ ] Compress old CSV files
- [ ] Consider using database output instead of CSV

---

## 🆘 EMERGENCY CONTACTS & COMMANDS

### Stop Everything

```bash
# Windows
taskkill /F /IM php.exe
net stop MySQL80

# Linux
pkill -f "queue:work"
sudo systemctl stop mysql
```

### Resume Processing

```bash
# Start MySQL (if stopped)
net start MySQL80

# Start worker
start-queue-worker.bat

# Retry failed job
php artisan queue:retry all
```

### Get Help

If stuck, gather this information:
1. Last 200 lines of `laravel.log`
2. Screenshot of Task Manager
3. Output of `php artisan queue:failed`
4. MySQL processlist: `SHOW FULL PROCESSLIST;`
5. Disk space: `df -h` or `wmic logicaldisk get size,freespace`

---

## 📝 NOTES & OBSERVATIONS

Use this space to note anything unusual:

```
Date: _______________
Time Started: _______________
Time Completed: _______________
Total Rows: _______________
Processing Time: _______________ hours
Rows/Second Average: _______________

Issues Encountered:
[ ]
[ ]
[ ]

Optimizations Applied:
[ ]
[ ]
[ ]

Next Time, Remember To:
[ ]
[ ]
[ ]
```

---

**Print this checklist and keep it handy while processing massive files!**

**Version:** 1.0 - Optimized for 100M-200M rows  
**Last Updated:** 2025-10-30

