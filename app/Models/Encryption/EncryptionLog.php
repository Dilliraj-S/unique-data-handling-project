<?php

namespace App\Models\Encryption;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class EncryptionLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'business_id',
        'user_id',
        'table',
        'old_version',
        'new_version',
        're_encrypted_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        're_encrypted_at' => 'datetime',
    ];

    public function business()
    {
        return $this->belongsTo(\App\Models\Business\Business::class, 'business_id', 'business_id');
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id', 'user_id');
    }
}