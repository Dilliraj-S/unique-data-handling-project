<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class UserPermission extends Model
{
    use HasFactory;

    protected $table = 'user_permissions';
    protected $fillable = [
        'user_id',
        'permission_id',
        'created_by',
        'updated_by',
    ];

}