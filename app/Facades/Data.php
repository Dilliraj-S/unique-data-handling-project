<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static \Illuminate\Database\Connection on(string $connectionName)
 * @method static array add(string $db, string $table, array $data)
 * @method static array upd(string $db, string $table, array $data, array $where)
 * @method static array del(string $db, string $table, array $where)
 * @method static array get(string $db, string $table, array $params = [])
 * @method static array filter(string $db, string $table, array $params = [])
 * @method static object|null resolveBusinessDatabase(mixed $user)
 * @method static object|null resolveBusinessDatabaseByUsername(string $username)
 * @method static void configureBusinessServices(string $dbName)
 * @method static void disconnect(string $connName)
 */
class Data extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \App\Services\DataService::class;
    }
}
