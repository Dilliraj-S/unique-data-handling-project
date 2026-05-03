<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for business database queries.
 *
 * formatResponse(bool $status, array $data, string $message)
 * @method static \Illuminate\Database\Query\Builder table(string $table)
 * @method static \Illuminate\Database\Connection connection()
 */
class BusinessDB extends Facade
{
    protected static function getFacadeAccessor()
    {
        return 'businessdb';
    }
}