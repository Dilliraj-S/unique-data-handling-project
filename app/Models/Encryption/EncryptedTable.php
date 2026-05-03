<?php

namespace App\Models\Encryption;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class EncryptedTable extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'type',
        'table',
        'columns',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'columns' => 'array',
        'is_active' => 'boolean',
    ];
}