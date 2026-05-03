<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Business extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'business_id',
        'name',
        'legal_name',
        'logo',
        'industry',
        'registration_no',
        'email',
        'phone',
        'website',
        'country',
        'timezone',
        'address_json',
        'no_of_employees',
        'hr_contact_email',
        'hr_contact_phone',
        'business_size',
        'currency',
        'language',
        'founded_date',
        'tax_id',
        'license_key',
        'subscription_plan',
        'billing_status',
        'database_name',
        'total_migrations',
        'total_migrated',
        'migrated_at',
        'database_status',
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
        'meta_data' => 'array',
        'founded_date' => 'date',
        'migrated_at' => 'datetime',
        'delete_on' => 'datetime',
        'restored_at' => 'datetime',
        'no_of_employees' => 'integer',
    ];

    public function companies()
    {
        return $this->hasMany(Company::class, 'business_id', 'business_id');
    }
}