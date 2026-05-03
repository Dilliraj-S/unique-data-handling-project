<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TestDatabaseConnection extends Command
{
    protected $signature = 'db:test {--host= : Test specific host}';
    protected $description = 'Test database connections and find correct XAMPP IP';

    public function handle()
    {
        $this->info('🔍 Testing Database Connections...');
        
        // Common IPs to test for XAMPP
        $hostsToTest = [
            'localhost',
            '127.0.0.1',
            'host.docker.internal', // For Docker/WSL2
            '172.17.0.1', // Docker bridge
            '192.168.1.112', // Current config
            '10.0.0.1',
            '192.168.0.1',
        ];
        
        if ($this->option('host')) {
            $hostsToTest = [$this->option('host')];
        }
        
        $workingHosts = [];
        
        foreach ($hostsToTest as $host) {
            $this->info("Testing connection to: {$host}");
            
            try {
                // Test with different configurations
                $configs = [
                    'central' => [
                        'driver' => 'mysql',
                        'host' => $host,
                        'port' => '3306',
                        'database' => env('DB_DATABASE', 'unique'),
                        'username' => env('DB_USERNAME', 'root'),
                        'password' => env('DB_PASSWORD', ''),
                        'charset' => 'utf8mb4',
                        'collation' => 'utf8mb4_unicode_ci',
                        'strict' => true,
                        'engine' => null,
                    ],
                    'pluto' => [
                        'driver' => 'mysql',
                        'host' => $host,
                        'port' => '3306',
                        'database' => env('PLUTO_DATABASE', 'pluto'),
                        'username' => env('PLUTO_USERNAME', 'root'),
                        'password' => env('PLUTO_PASSWORD', ''),
                        'charset' => 'utf8mb4',
                        'collation' => 'utf8mb4_unicode_ci',
                        'strict' => true,
                        'engine' => null,
                    ]
                ];
                
                foreach ($configs as $connection => $config) {
                    try {
                        // Create a temporary connection
                        $pdo = new \PDO(
                            "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}",
                            $config['username'],
                            $config['password'],
                            [
                                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                                \PDO::ATTR_TIMEOUT => 5, // 5 second timeout
                            ]
                        );
                        
                        $this->info("✅ Connection to '{$connection}' via {$host}: SUCCESS");
                        $workingHosts[$connection] = $host;
                        
                        // Test a simple query
                        $result = $pdo->query('SELECT 1 as test')->fetch();
                        $this->info("✅ Query test: SUCCESS");
                        
                    } catch (\Exception $e) {
                        $this->error("❌ Connection to '{$connection}' via {$host}: FAILED - " . $e->getMessage());
                    }
                }
                
            } catch (\Exception $e) {
                $this->error("❌ Failed to test {$host}: " . $e->getMessage());
            }
        }
        
        if (!empty($workingHosts)) {
            $this->info("\n🎉 Working configurations found:");
            foreach ($workingHosts as $connection => $host) {
                $this->info("  {$connection}: {$host}");
            }
            
            $this->info("\n📝 Update your .env file with these settings:");
            foreach ($workingHosts as $connection => $host) {
                if ($connection === 'central') {
                    $this->info("DB_HOST={$host}");
                } elseif ($connection === 'pluto') {
                    $this->info("PLUTO_HOST={$host}");
                }
            }
        } else {
            $this->error("❌ No working database connections found!");
            $this->info("\n💡 Troubleshooting tips:");
            $this->info("1. Make sure XAMPP MySQL is running");
            $this->info("2. Check if MySQL is listening on port 3306");
            $this->info("3. Verify firewall settings");
            $this->info("4. Try using 'host.docker.internal' if using Docker");
        }
    }
} 