<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for the DatabaseService.
 *
 * @method static void setupCentralConnection()
 * @method static string setupBusinessConnection(string $businessId)
 * @method static string getActiveConnection(?string $businessId)
 */
class Database extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \App\Services\DatabaseService::class;
    }
}