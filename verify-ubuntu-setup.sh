#!/bin/bash
# ============================================================================
# Ubuntu Setup Verification Script
# ============================================================================
# Run this after deploying to Ubuntu to verify everything is configured

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║         Ubuntu Setup Verification for Massive File Processing        ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $1"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $1"
        return 1
    fi
}

warn() {
    echo -e "${YELLOW}⚠️  WARNING${NC}: $1"
}

info() {
    echo -e "ℹ️  INFO: $1"
}

echo "1. Checking PHP Installation..."
php -v > /dev/null 2>&1
check "PHP is installed"
PHP_VERSION=$(php -r "echo PHP_VERSION;")
info "PHP Version: $PHP_VERSION"

echo ""
echo "2. Checking PHP CLI Settings..."
MEMORY_LIMIT=$(php -r "echo ini_get('memory_limit');")
info "memory_limit = $MEMORY_LIMIT"
if [ "$MEMORY_LIMIT" = "-1" ]; then
    check "memory_limit is unlimited (recommended)"
else
    warn "memory_limit is $MEMORY_LIMIT (recommend -1 for massive files)"
fi

UPLOAD_MAX=$(php -r "echo ini_get('upload_max_filesize');")
info "upload_max_filesize = $UPLOAD_MAX"

POST_MAX=$(php -r "echo ini_get('post_max_size');")
info "post_max_size = $POST_MAX"

echo ""
echo "3. Checking MySQL..."
mysql --version > /dev/null 2>&1
check "MySQL/MariaDB is installed"

echo ""
echo "4. Checking Composer..."
composer --version > /dev/null 2>&1
check "Composer is installed"

echo ""
echo "5. Checking File Permissions..."
if [ -d "storage" ]; then
    STORAGE_PERM=$(stat -c "%a" storage)
    if [ "$STORAGE_PERM" = "775" ] || [ "$STORAGE_PERM" = "777" ]; then
        check "storage directory has correct permissions ($STORAGE_PERM)"
    else
        warn "storage directory permissions are $STORAGE_PERM (recommend 775)"
    fi
else
    warn "storage directory not found"
fi

if [ -d "bootstrap/cache" ]; then
    CACHE_PERM=$(stat -c "%a" bootstrap/cache)
    if [ "$CACHE_PERM" = "775" ] || [ "$CACHE_PERM" = "777" ]; then
        check "bootstrap/cache has correct permissions ($CACHE_PERM)"
    else
        warn "bootstrap/cache permissions are $CACHE_PERM (recommend 775)"
    fi
else
    warn "bootstrap/cache directory not found"
fi

echo ""
echo "6. Checking Laravel Files..."
if [ -f ".env" ]; then
    check ".env file exists"
else
    warn ".env file not found - copy from .env.example"
fi

if [ -f "artisan" ]; then
    check "artisan file exists"
else
    warn "artisan file not found - are you in Laravel root?"
fi

if [ -d "vendor" ]; then
    check "vendor directory exists (composer install done)"
else
    warn "vendor directory not found - run 'composer install'"
fi

echo ""
echo "7. Checking Queue Worker Script..."
if [ -f "start-queue-worker.sh" ]; then
    check "start-queue-worker.sh exists"
    if [ -x "start-queue-worker.sh" ]; then
        check "start-queue-worker.sh is executable"
    else
        warn "start-queue-worker.sh is not executable - run 'chmod +x start-queue-worker.sh'"
    fi
else
    warn "start-queue-worker.sh not found"
fi

echo ""
echo "8. Checking Disk Space..."
DISK_FREE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
info "Free disk space: ${DISK_FREE}GB"
if [ "$DISK_FREE" -gt 100 ]; then
    check "Sufficient disk space for massive files (${DISK_FREE}GB)"
elif [ "$DISK_FREE" -gt 50 ]; then
    warn "Disk space is ${DISK_FREE}GB (recommend 100GB+ for 10GB files)"
else
    warn "Low disk space: ${DISK_FREE}GB (may cause issues with large files)"
fi

echo ""
echo "9. Checking Memory..."
MEM_TOTAL=$(free -g | grep Mem: | awk '{print $2}')
info "Total RAM: ${MEM_TOTAL}GB"
if [ "$MEM_TOTAL" -ge 8 ]; then
    check "Sufficient RAM for massive files (${MEM_TOTAL}GB)"
elif [ "$MEM_TOTAL" -ge 4 ]; then
    warn "RAM is ${MEM_TOTAL}GB (recommend 8GB+ for optimal performance)"
else
    warn "Low RAM: ${MEM_TOTAL}GB (may cause issues with large files)"
fi

echo ""
echo "10. Checking Laravel Configuration..."
if [ -f ".env" ]; then
    # Check key environment variables
    QUEUE_TIMEOUT=$(grep "^QUEUE_TIMEOUT=" .env | cut -d '=' -f2)
    if [ ! -z "$QUEUE_TIMEOUT" ]; then
        info "QUEUE_TIMEOUT = $QUEUE_TIMEOUT"
        if [ "$QUEUE_TIMEOUT" -ge 172800 ]; then
            check "QUEUE_TIMEOUT is configured for massive files"
        else
            warn "QUEUE_TIMEOUT is $QUEUE_TIMEOUT (recommend 172800 for 48 hours)"
        fi
    else
        warn "QUEUE_TIMEOUT not set in .env"
    fi
    
    QUEUE_MEMORY=$(grep "^QUEUE_MEMORY=" .env | cut -d '=' -f2)
    if [ ! -z "$QUEUE_MEMORY" ]; then
        info "QUEUE_MEMORY = $QUEUE_MEMORY MB"
        if [ "$QUEUE_MEMORY" -ge 8192 ]; then
            check "QUEUE_MEMORY is configured for massive files"
        else
            warn "QUEUE_MEMORY is $QUEUE_MEMORY (recommend 8192 for 8GB)"
        fi
    else
        warn "QUEUE_MEMORY not set in .env"
    fi
fi

echo ""
echo "11. Testing Laravel..."
php artisan --version > /dev/null 2>&1
check "Laravel artisan is working"

echo ""
echo "12. Checking Running Processes..."
QUEUE_WORKERS=$(ps aux | grep -c "queue:work")
if [ "$QUEUE_WORKERS" -gt 1 ]; then
    info "Queue workers running: $QUEUE_WORKERS"
    check "Queue worker is running"
else
    info "No queue workers currently running"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "                          VERIFICATION COMPLETE                          "
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Next Steps:"
echo "  1. If any WARNINGs above, fix them before processing large files"
echo "  2. Start queue worker: ./start-queue-worker.sh"
echo "  3. Test with small file (1,000 rows) first"
echo "  4. Monitor logs: tail -f storage/logs/laravel.log"
echo "  5. For production, configure Supervisor"
echo ""
echo "See UBUNTU_DEPLOYMENT_GUIDE.md for detailed instructions."
echo ""

