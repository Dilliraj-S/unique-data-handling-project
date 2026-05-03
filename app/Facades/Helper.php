<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for the Helper.
 */
class Helper extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \App\Http\Helpers\Helper::class;
    }
}