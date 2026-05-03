<?php

namespace App\Models\Central\EmailSystem;

use Illuminate\Database\Eloquent\Model;

class EmailSchedule extends Model
{
    protected $fillable = ['csv_path', 'template_id', 'schedule_time', 'schedule_gap', 'status'];

    public function template()
    {
        return $this->belongsTo(EmailTemplate::class);
    }

    public function recipients()
    {
        return $this->hasMany(EmailRecipient::class, 'email_schedule_id');
    }
}
