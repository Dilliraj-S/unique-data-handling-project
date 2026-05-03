<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Exception;

/**
 * User model representing an authenticated user with role-based permissions.
 */
class User extends Authenticatable
{
    
    use HasFactory, Notifiable, SoftDeletes;

    protected $table = 'users';
    protected $primaryKey = 'id';
    protected $connection = 'central';

    protected $fillable = [
        'user_id', 'business_id', 'first_name', 'last_name', 'email', 'username', 'password',
        'provider', 'provider_id', 'provider_token', 'provider_refresh_token',
        'two_factor_enabled', 'two_factor_secret', 'two_factor_recovery_codes',
        'two_factor_confirmed_at', 'two_factor_method', 'device_token', 'device_type',
        'fcm_enabled', 'password_updated_at', 'max_logins', 'verification',
        'account_status', 'profile', 'last_login_at', 'remember_token',
        'created_by', 'updated_by', 'delete_on', 'restored_at',
    ];

    protected $hidden = [
        'password', 'remember_token', 'two_factor_secret',
        'two_factor_recovery_codes', 'provider_token', 'provider_refresh_token',
    ];

    protected $casts = [
        'two_factor_enabled' => 'boolean',
        'fcm_enabled' => 'boolean',
        'two_factor_confirmed_at' => 'datetime',
        'password_updated_at' => 'datetime',
        'last_login_at' => 'datetime',
        'delete_on' => 'datetime',
        'restored_at' => 'datetime',
    ];

    /**
     * Override connection to ensure central database is used.
     */
    public function getConnectionName()
    {
        return 'central';
    }
}