<?php

namespace App\Models\Skeleton;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Credential extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'cred_id',
        'name',
        'type',
        'credentials',
        'status',
        'created_by',
        'updated_by',
        'restored_at',
    ];

    protected $casts = [
        'credentials' => 'array',
        'restored_at' => 'datetime',
    ];
}