<?php

namespace App\Models\Central\EmailSystem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_name', 'smtp', 'location', 'industry', 'employee_size', 'revenue_size', 'status'
    ];
}