<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RolePermission extends Model
{
    use HasFactory;

    protected $table = 'role_permissions';
    protected $fillable = [
        'role_id',
        'permission_id',
        'created_by',
        'updated_by',
    ];
    
}