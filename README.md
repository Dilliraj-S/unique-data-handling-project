<<<<<<< HEAD
# Laravel Enterprise Workflow System

A scalable Laravel 12 application designed for **massive-scale data processing** (100-200 million rows), featuring queue-based architecture, multi-database management, and enterprise-grade workflow automation.

---

## Key Features

### Massive Scale Processing
- Handles CSV files up to **10GB** and **200 million rows**
- Optimized queue workers with 48-hour timeout support
- Batch processing with 1000-2000 rows/second throughput
- Database indexing for optimal performance

### Queue & Job Processing
- Laravel Queue with Redis/database drivers
- Multi-phase sequential workflow processing
- Failed job retry mechanisms
- Real-time progress monitoring

### Multi-Database Architecture
- Central database for user/auth data
- Business database for company information
- Separate databases for Mercury, Mars, Moon schemas
- Cross-database query optimization

### Enterprise Modules
- **Company Management** - CRUD operations with unique validation
- **Attendance Management** - Employee tracking system
- **Authorization System** - Role-based access control
- **File Manager** - Document upload/download handling
- **Modal Operations** - Dynamic form handling

### Additional Capabilities
- Email sync and monitoring system
- PDF generation (DOMPDF, TCPDF)
- Excel import/export (Maatwebsite Excel)
- DataTables for large dataset display
- API integrations (Google, ZoomInfo, Apollo)

---

## Technology Stack

- **Framework:** Laravel 12
- **PHP:** 8.2+
- **Database:** MySQL 8.0+
- **Queue:** Laravel Queue (database driver)
- **Frontend:** Bootstrap 5, jQuery, Vite
- **Packages:** Laravel Sanctum, Socialite, Reverb, DataTables

---

## Project Structure

```
app/
├── Console/Commands/     # Artisan commands for monitoring & maintenance
├── Events/              # Event classes for broadcasting
├── Exceptions/          # Custom exception handlers
├── Facades/             # Static service wrappers
├── Http/
│   ├── Controllers/     # Business logic controllers
│   └── Classes/         # Helper classes
routes/
├── web.php              # Web routes
└── api.php              # API routes
config/
└── large_file_processing.php  # Processing configuration
database/
├── migrations/          # Database schema
└── seeders/             # Sample data
```

---

## Performance Optimizations

- Custom queue timeout (172800 seconds)
- Memory limit optimization (8GB for queue)
- Database index creation for key tables
- Chunk-based processing for large files
- Connection pooling configuration
- MySQL buffer pool tuning (8GB)

---

## Getting Started

```bash
# Install dependencies
composer install
npm install

# Configure environment
cp .env.example .env
# Update .env with your database credentials

# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate

# Start queue worker
php artisan queue:work --queue=process_flows --timeout=172800 --memory=8192
```

---

## Monitoring & Maintenance

```bash
# View processing logs
Get-Content storage\logs\laravel.log -Wait -Tail 100

# Check failed jobs
php artisan queue:failed

# Retry failed jobs
php artisan queue:retry all
```

---

## License

MIT License - Open source for learning and development.
=======
# unique-data-handling-project
Laravel-based system for cleaning raw data, processing workflows, and executing targeted email campaigns.
>>>>>>> 9fd942668ad4474affe41fe9bd6e49048c229e40
