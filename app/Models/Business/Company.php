<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id',
        'business_id',
        'name',
        'legal_name',
        'industry',
        'industry_subtype',
        'registration_no',
        'email',
        'phone',
        'address_json',
        'operating_hours_json',
        'employee_count',
        'meta_data',
        'status',
        'created_by',
        'updated_by',
        'secure_version',
        'delete_on',
        'restored_at',
    ];

    protected $casts = [
        'address_json' => 'array',
        'operating_hours_json' => 'array',
        'meta_data' => 'array',
        'employee_count' => 'integer',
        'delete_on' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'business_id');
    }
}