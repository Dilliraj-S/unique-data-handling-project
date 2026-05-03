<?php

namespace App\Models\Encryption;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class SecureKey extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'business_id',
        'key',
        'version',
        'is_active',
        'secure_version',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function business()
    {
        return $this->belongsTo(\App\Models\Business\Business::class, 'business_id', 'business_id');
    }
}