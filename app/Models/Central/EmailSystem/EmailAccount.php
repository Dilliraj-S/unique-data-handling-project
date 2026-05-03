<?php

namespace App\Models\Central\EmailSystem;


use Illuminate\Database\Eloquent\Model;

class EmailAccount extends Model
{
    protected $connection = 'pluto';
    protected $table = 'email_accounts';


    protected $fillable = [
        'type',
        'email',
        'access_token',
        'refresh_token',
        'password',
        'incoming_host',
        'incoming_port',
        'incoming_encryption',
        'outgoing_host',
        'outgoing_port',
        'outgoing_encryption',
        'first_name',
        'last_name',
        'extension',
        'phone_number',
        'designation',
        'fax',
        'region',
        'daily_send_limit',
        'used_quota',
        'unsubscribe',
        'postal_code',
        'address',
        'status',
        'user_id'
    ];
}
