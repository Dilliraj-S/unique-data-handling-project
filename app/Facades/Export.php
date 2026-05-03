<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for the Helper.
 */
class Export extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \App\Services\ExportService::class;
    }
}