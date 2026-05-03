<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

class Crud extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \App\Services\CrudService::class;
    }
}