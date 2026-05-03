<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for central database queries.
 *
 * @method static \Illuminate\Database\Query\Builder table(string $table)
 * @method static \Illuminate\Database\Connection connection()
 */
class CentralDB extends Facade
{
    protected static function getFacadeAccessor()
    {
        return 'centraldb';
    }
}