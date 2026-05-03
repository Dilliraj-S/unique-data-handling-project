# Email Queue Workers - Dynamic Starter Scripts

This directory contains batch files to start individual queue workers for each email sender account. Each sender gets its own dedicated queue worker running in a separate terminal window.

## Files Overview

### 1. `start_dynamic_workers.bat` - Interactive Batch Script
- **Purpose**: Takes email account IDs as user input
- **Usage**: Run the script and enter comma-separated account IDs when prompted
- **Features**:
  - Input validation
  - Individual log files for each worker
  - Separate terminal windows for each worker
  - Error handling and validation

### 2. `start_dynamic_workers.ps1` - PowerShell Script
- **Purpose**: Advanced PowerShell version with better error handling
- **Usage**: 
  - Interactive: `.\start_dynamic_workers.ps1`
  - With parameters: `.\start_dynamic_workers.ps1 -EmailAccountIds "1,4,5,6"`
- **Features**:
  - Parameter support
  - Better error handling
  - Colored output
  - More detailed logging

### 3. `start_workers_quick.bat` - Quick Start Script
- **Purpose**: Uses predefined email account IDs for immediate testing
- **Usage**: Just run the script - no input required
- **Features**:
  - No user input needed
  - Predefined account IDs (modify the script to change them)
  - Quick testing and development

## How It Works

### Queue Structure
Based on your `SendDriftEmailSequenceJob.php`, each email account gets its own dedicated queue:

```php
// Dynamic queue assignment based on sender account
$queueName = 'emails_sender_' . $emailAccountId;
$this->onQueue($queueName);
```

### Worker Commands
Each worker runs this command:
```bash
php artisan queue:work --queue=emails_sender_[ID]
```

## Usage Instructions

### Method 1: Interactive Input (Recommended)
```bash
# Run the dynamic batch script
start_dynamic_workers.bat

# Enter email account IDs when prompted
# Example: 1,4,5,6,7,8,9,10,12,13,14,16,17,18,19,23,24,31
```

### Method 2: PowerShell (Advanced)
```powershell
# Interactive mode
.\start_dynamic_workers.ps1

# With parameters
.\start_dynamic_workers.ps1 -EmailAccountIds "1,4,5,6,7,8,9,10"
```

### Method 3: Quick Start
```bash
# Uses predefined account IDs
start_workers_quick.bat
```

## Features

### ✅ Parallel Processing
- Each sender has its own dedicated worker
- No dependency between workers
- True parallel processing

### ✅ Individual Logging
- Each worker creates its own log file
- Log files named: `logs\worker_sender_[ID]_[TIMESTAMP].log`
- Separate terminal windows for easy monitoring

### ✅ Error Handling
- Validates PHP and Laravel installation
- Stops existing workers before starting new ones
- Input validation for account IDs
- Graceful error messages

### ✅ Monitoring
- Real-time logs in separate terminal windows
- Log files for historical analysis
- Redis queue monitoring commands

## Monitoring Commands

### Check Running Workers
```bash
# Windows
tasklist /fi "imagename eq php.exe"

# PowerShell
Get-Process php
```

### Check Redis Queue Lengths
```bash
# Check specific sender queue
redis-cli LLEN queues:emails_sender_1

# Check all sender queues
redis-cli LLEN queues:emails_sender_*
```

### View Logs
```bash
# View all worker logs
type logs\worker_sender_*.log

# View specific worker log
type logs\worker_sender_1_*.log

# Monitor logs in real-time (PowerShell)
Get-Content logs\worker_sender_*.log -Wait
```

## Stopping Workers

### Method 1: Close Terminal Windows
- Simply close the individual terminal windows for each worker

### Method 2: Kill All PHP Processes
```bash
# Windows
taskkill /f /im php.exe

# PowerShell
Get-Process php | Stop-Process -Force
```

## Configuration

### Modify Predefined Account IDs
Edit `start_workers_quick.bat` and change this line:
```batch
set "email_account_ids=1,4,5,6,7,8,9,10,12,13,14,16,17,18,19,23,24,31"
```

### Worker Parameters
Each worker uses the default Laravel queue parameters:
- Uses default connection (usually redis)
- Default retry settings
- Default timeout and memory limits

## Troubleshooting

### PHP Not Found
```
❌ ERROR: PHP is not installed or not in PATH
```
**Solution**: Install PHP and add it to your system PATH

### Laravel Artisan Not Found
```
❌ ERROR: Laravel artisan file not found
```
**Solution**: Run the script from your Laravel project root directory

### Workers Not Processing
1. Check if Redis is running: `redis-cli ping`
2. Check queue lengths: `redis-cli LLEN queues:emails_sender_[ID]`
3. Check logs: `type logs\worker_sender_*.log`
4. Verify email account configuration in database

### High Memory Usage
- Reduce `--memory=256` to `--memory=128` in the worker commands
- Monitor memory usage: `tasklist /fi "imagename eq php.exe"`

## Testing

### Test Individual Sender
1. Start only one worker: Enter single account ID
2. Send test email to that sender
3. Monitor the specific terminal window

### Test Multiple Senders
1. Start multiple workers with different account IDs
2. Send emails to different senders
3. Verify each worker processes its dedicated queue

### Monitor Performance
- Check log files for processing times
- Monitor Redis queue lengths
- Watch terminal windows for real-time activity

## Security Notes

- Log files may contain sensitive information
- Keep log files secure and clean up old logs regularly
- Don't share log files containing email content or credentials

## Support

For issues or questions:
1. Check the log files in `logs\` directory
2. Verify Redis connection and queue status
3. Ensure email account configuration is correct
4. Check Laravel logs: `storage/logs/laravel.log` 