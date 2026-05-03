<?php

namespace App\Models\Central\EmailSystem;

use Illuminate\Database\Eloquent\Model;

class MailConfig extends Model
{
    protected $fillable = [
        'email',
        'app_password',
        'from_name',
        'from_address',
        'host',
        'port',
        'encryption',
        'priority',
        'daily_limit'
    ];
}
