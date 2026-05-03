<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for the RandomService.
 */
class FileManager extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \App\Services\FileManagerService::class;
    }
}