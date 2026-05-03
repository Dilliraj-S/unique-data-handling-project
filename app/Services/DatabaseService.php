<?php

namespace App\Services;

use App\Facades\{Developer, Skeleton};
use Exception;
use Illuminate\Support\Facades\{Config, DB};
use Illuminate\Database\Connection;
use Illuminate\Auth\AuthenticationException;

/**
 * Service for managing dynamic database connections.
 */
class DatabaseService
{
    /**
     * Set up the central database connection.
     *
     * @throws Exception
     */
    public function setupCentralConnection(): void
    {
        try {
            // Check if connection is already established
            $connection = DB::connection('central');
            if ($connection->getPdo() && $connection->getDatabaseName() === env('DB_DATABASE', 'unique')) {
                return;
            }
        } catch (Exception $e) {
            // Connection not established, proceed to set up
        }

        try {
            Config::set('database.connections.central', [
                'driver' => 'mysql',
                'host' => env('DB_HOST', '127.0.0.1'),
                'port' => env('DB_PORT', '3306'),
                'database' => env('DB_DATABASE', 'unique'),
                'username' => env('DB_USERNAME', 'root'),
                'password' => env('DB_PASSWORD', ''),
                'charset' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
                'prefix' => '',
                'strict' => true,
                'engine' => null,
            ]);
            DB::purge('central'); // Clear any stale connection
            $connection = DB::connection('central');
            $connection->getPdo();
            if ($connection->getDatabaseName() !== env('DB_DATABASE', 'unique')) {
                throw new Exception('Central database not selected correctly.');
            }
            Developer::notice('Central database connection established');
        } catch (Exception $e) {
            Developer::error('Central database connection failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw new Exception('Central database connection failed: ' . $e->getMessage());
        }
    }

    /**
     * Set up a business database connection.
     *
     * @param string $businessId
     * @return string Connection name
     * @throws Exception
     */
    public function setupBusinessConnection(string $businessId): string
    {
        try {
            if (empty(trim($businessId)) || $businessId === 'CENTRAL') {
                throw new Exception("Invalid business_id: {$businessId}.");
            }

            // Ensure central connection is set up for querying systems table
            $this->setupCentralConnection();
            $system = DB::connection('central')
                ->table('systems')
                ->where('business_id', $businessId)
                ->where('is_active', true)
                ->first();
            if (!$system) {
                throw new Exception("Active system {$businessId} not found.");
            }

            $connectionName = 'business';
            try {
                $connection = DB::connection($connectionName);
                if ($connection->getPdo() && $connection->getDatabaseName() === $system->database) {
                    return $connectionName;
                }
            } catch (Exception $e) {
                // Connection not established, proceed to set up
            }

            Config::set("database.connections.{$connectionName}", [
                'driver' => 'mysql',
                'host' => env('DB_HOST', '127.0.0.1'),
                'port' => env('DB_PORT', '3306'),
                'database' => $system->database,
                'username' => env('DB_USERNAME', 'root'),
                'password' => env('DB_PASSWORD', ''),
                'charset' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
                'prefix' => '',
                'strict' => true,
                'engine' => null,
            ]);

            DB::purge($connectionName); // Clear any stale connection
            $connection = DB::connection($connectionName);
            $connection->getPdo();
            if ($connection->getDatabaseName() !== $system->database) {
                throw new Exception("Business database {$system->database} not selected correctly for {$businessId}.");
            }
            Developer::notice('Business database connection established', [
                'business_id' => $businessId,
                'connection' => $connectionName,
                'database' => $system->database,
            ]);
            return $connectionName;
        } catch (Exception $e) {
            Developer::error('Business database connection failed', [
                'business_id' => $businessId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw new Exception("Business database connection failed for {$businessId}: " . $e->getMessage());
        }
    }

    /**
     * Get the active connection for a user or specific business_id.
     *
     * @param string|null $businessId
     * @return string
     */
    public function getActiveConnection(?string $businessId): string
    {
        $connection = $businessId && $businessId !== 'CENTRAL' ? 'business_' . $businessId : 'central';
        return $connection;
    }

    /**
     * Get a database connection by type and optional business_id.
     *
     * @param string $type Connection type ('central' or 'business')
     * @param string|null $businessId Optional business_id for business type
     * @return \Illuminate\Database\Connection
     * @throws Exception
     */
    public function getConnection(string $type, ?string $businessId = null): Connection
    {
        try {
            if (!in_array($type, ['central', 'business'])) {
                Developer::error('Invalid connection type', ['type' => $type]);
                throw new Exception("Invalid connection type: {$type}. Must be 'central' or 'business'.");
            }

            if ($type === 'central') {
                $this->setupCentralConnection();
                return DB::connection('central');
            }

            // For business type
            if (!$businessId) {
                $user = Skeleton::getAuthenticatedUser(null, true);
                $businessId = $user->business_id;
                if (!$businessId || $businessId === 'CENTRAL') {
                    Developer::warning('No valid business_id for user, falling back to central', [
                        'user_id' => $user->user_id ?? 'unknown',
                        'business_id' => $businessId,
                    ]);
                    $this->setupCentralConnection();
                    return DB::connection('central');
                }
            }

            $connectionName = $this->setupBusinessConnection($businessId);
            return DB::connection($connectionName);
        } catch (AuthenticationException $e) {
            Developer::error('Authentication failed for business connection', [
                'type' => $type,
                'business_id' => $businessId,
                'error' => $e->getMessage(),
            ]);
            throw new Exception("Authentication required for {$type} connection: " . $e->getMessage());
        } catch (Exception $e) {
            Developer::error('Failed to get connection', [
                'type' => $type,
                'business_id' => $businessId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw new Exception("Failed to get {$type} connection: " . $e->getMessage());
        }
    }
}
