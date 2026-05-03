<?php

namespace App\Models\Skeleton;

use App\Models\User\Role;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

/**
 * Model representing a skeleton token configuration.
 */
class SkeletonToken extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'key',
        'module',
        'system',
        'type',
        'table',
        'column',
        'value',
        'validate',
        'act',
        'actions',
        'created_by',
        'updated_by',
    ];
}