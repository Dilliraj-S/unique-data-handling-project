<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class System extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'business_id',
        'system',
        'database',
        'is_active',
        'created_by',
        'updated_by',
    ];
   
}
