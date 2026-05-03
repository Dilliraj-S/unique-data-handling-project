<?php

namespace App\Models\Central\EmailSystem;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DriftSequenceLog extends Model
{
    use HasFactory;

    protected $table = 'drift_sequence_logs';
    protected $connection = 'pluto';

    protected $fillable = [
        'set_id',
        'message_id',
        'sequence_id',
        'subscriber_id',
        'email_account_id',
        'template_id',
        'sent_at',
        'opened_at',
        'clicked_at',
        'replied_at',
        'unsubscribed_at',
        'status',
        'batch_size',
        'error_message',
        'failed_at',
        'bounced_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'opened_at' => 'datetime',
        'clicked_at' => 'datetime',
        'replied_at' => 'datetime',
        'unsubscribed_at' => 'datetime',
        'bounced_at' => 'datetime',
    ];

    /**
     * Get the sequence that this log belongs to.
     */
    public function sequence()
    {
        return $this->belongsTo(DriftSequence::class);
    }

    /**
     * Get the subscriber associated with this log.
     */
    public function subscriber()
    {
        return $this->belongsTo(Subscriber::class);
    }

    /**
     * Get the email account used for this log.
     */
    public function emailAccount()
    {
        return $this->belongsTo(EmailAccount::class);
    }

    /**
     * Get the template used for this log.
     */
    public function template()
    {
        return $this->belongsTo(Template::class);
    }
}
