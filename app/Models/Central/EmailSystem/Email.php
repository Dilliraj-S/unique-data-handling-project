<?php

namespace App\Models\Central\EmailSystem;
use Illuminate\Database\Eloquent\Model;

class Email extends Model
{
    // Use custom connection
    protected $connection = 'pluto';

    // Table name (optional if it matches plural form)
    protected $table = 'emails';

    // Fillable columns (for mass assignment)
    protected $fillable = [
        'message_id',
        'in_reply_to',
        'account_email',
        'thread_id',
        'category',
        'from',
        'subject',
        'body',
        'body_html',
        'received_at',
        'read',
        'labels',
        'thread_count',
        'status',
        'status_reasons',
        'campaign_id',
        'created_at',
        'updated_at',
    ];

    // If timestamps are not auto-managed
    public $timestamps = true;

    // If 'created_at' and 'updated_at' columns are named differently:
    // const CREATED_AT = 'your_created_column';
    // const UPDATED_AT = 'your_updated_column';
}
