<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for the RandomService.
 */
class Adms extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \App\Services\AdmsService::class;
    }
}