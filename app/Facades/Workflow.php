<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for the RandomService.
 */
class Workflow extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \App\Http\Controllers\System\Actions\WorkflowCtrl::class;
    }
}
