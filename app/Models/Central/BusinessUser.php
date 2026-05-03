<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class BusinessUser extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'business_id',
        'username',
    ];
    public function companies()
    {
        return $this->hasMany(Company::class, 'business_id', 'business_id');
    }
}
