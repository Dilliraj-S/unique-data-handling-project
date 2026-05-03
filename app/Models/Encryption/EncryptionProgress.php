<?php

namespace App\Models\Encryption;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class EncryptionProgress extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'business_id',
        'database_name',
        'total_tables',
        'tables_encrypted',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'total_tables' => 'integer',
        'tables_encrypted' => 'integer',
    ];

    public function business()
    {
        return $this->belongsTo(\App\Models\Business\Business::class, 'business_id', 'business_id');
    }
}