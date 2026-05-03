<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class DiagnoseWslNetwork extends Command
{
    protected $signature = 'wsl:diagnose {--fix : Attempt to fix network issues}';
    protected $description = 'Diagnose WSL2 network connectivity to Windows XAMPP';

    public function handle()
    {
        $this->info('🔍 Diagnosing WSL2 Network Connectivity...');
        
        // 1. Check WSL2 IP
        $this->checkWsl2Ip();
        
        // 2. Check Windows host IP
        $this->checkWindowsHostIp();
        
        // 3. Test connectivity to common Windows IPs
        $this->testWindowsConnectivity();
        
        // 4. Test MySQL connectivity
        $this->testMysqlConnectivity();
        
        // 5. Check XAMPP status
        $this->checkXamppStatus();
        
        if ($this->option('fix')) {
            $this->fixNetworkIssues();
        }
        
        $this->info('✅ Network diagnosis complete!');
    }
    
    private function checkWsl2Ip()
    {
        $this->info('📡 Checking WSL2 IP address...');
        
        try {
            $wslIp = shell_exec("hostname -I | awk '{print $1}'");
            $wslIp = trim($wslIp);
            
            if ($wslIp) {
                $this->info("✅ WSL2 IP: {$wslIp}");
            } else {
                $this->error('❌ Could not determine WSL2 IP');
            }
        } catch (\Exception $e) {
            $this->error('❌ Failed to get WSL2 IP: ' . $e->getMessage());
        }
    }
    
    private function checkWindowsHostIp()
    {
        $this->info('🖥️ Checking Windows host IP...');
        
        try {
            // Try to get Windows host IP
            $windowsIp = shell_exec("cat /etc/resolv.conf | grep nameserver | awk '{print $2}'");
            $windowsIp = trim($windowsIp);
            
            if ($windowsIp) {
                $this->info("✅ Windows host IP: {$windowsIp}");
            } else {
                $this->error('❌ Could not determine Windows host IP');
            }
        } catch (\Exception $e) {
            $this->error('❌ Failed to get Windows host IP: ' . $e->getMessage());
        }
    }
    
    private function testWindowsConnectivity()
    {
        $this->info('🌐 Testing connectivity to Windows...');
        
        $hostsToTest = [
            'host.docker.internal',
            'localhost',
            '127.0.0.1',
            '172.17.0.1',
            '192.168.1.1',
            '10.0.0.1',
        ];
        
        foreach ($hostsToTest as $host) {
            $this->info("Testing ping to: {$host}");
            
            try {
                $result = shell_exec("ping -c 1 -W 3 {$host} 2>/dev/null");
                
                if (strpos($result, '1 received') !== false) {
                    $this->info("✅ Ping to {$host}: SUCCESS");
                } else {
                    $this->error("❌ Ping to {$host}: FAILED");
                }
            } catch (\Exception $e) {
                $this->error("❌ Failed to ping {$host}: " . $e->getMessage());
            }
        }
    }
    
    private function testMysqlConnectivity()
    {
        $this->info('🗄️ Testing MySQL connectivity...');
        
        $hostsToTest = [
            'host.docker.internal',
            'localhost',
            '127.0.0.1',
        ];
        
        foreach ($hostsToTest as $host) {
            $this->info("Testing MySQL connection to: {$host}");
            
            try {
                $result = shell_exec("timeout 5 bash -c '</dev/tcp/{$host}/3306' 2>/dev/null && echo 'SUCCESS' || echo 'FAILED'");
                
                if (trim($result) === 'SUCCESS') {
                    $this->info("✅ MySQL port 3306 on {$host}: OPEN");
                } else {
                    $this->error("❌ MySQL port 3306 on {$host}: CLOSED");
                }
            } catch (\Exception $e) {
                $this->error("❌ Failed to test MySQL on {$host}: " . $e->getMessage());
            }
        }
    }
    
    private function checkXamppStatus()
    {
        $this->info('🔧 Checking XAMPP status...');
        
        $this->info("💡 Manual XAMPP checks:");
        $this->info("1. Open XAMPP Control Panel on Windows");
        $this->info("2. Check if MySQL is running (should show green)");
        $this->info("3. Check if Apache is running (if needed)");
        $this->info("4. Verify MySQL is listening on port 3306");
        $this->info("5. Check Windows Firewall settings");
    }
    
    private function fixNetworkIssues()
    {
        $this->info('🔧 Attempting to fix network issues...');
        
        try {
            // Restart network services
            $this->info('Restarting network services...');
            shell_exec('sudo service networking restart 2>/dev/null');
            
            // Flush DNS cache
            $this->info('Flushing DNS cache...');
            shell_exec('sudo systemctl restart systemd-resolved 2>/dev/null');
            
            // Restart WSL2 network
            $this->info('Restarting WSL2 network...');
            shell_exec('sudo ip link set eth0 down && sudo ip link set eth0 up 2>/dev/null');
            
            $this->info('✅ Network services restarted');
            
        } catch (\Exception $e) {
            $this->error('❌ Failed to fix network issues: ' . $e->getMessage());
        }
    }
} 