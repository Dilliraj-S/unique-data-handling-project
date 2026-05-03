<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for the SelectControl.
 */
class Select extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \App\Http\Controllers\System\Actions\Select::class;
    }
}