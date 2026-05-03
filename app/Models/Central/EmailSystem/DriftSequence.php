<?php

namespace App\Models\Central\EmailSystem;

use Illuminate\Database\Eloquent\Model;

class DriftSequence extends Model
{
    protected $connection = 'pluto';
    protected $table = 'drift_sequences';

    protected $fillable = [
        'name',
        'set_id',
        'template_id',
        'audience_id',
        'subject',
        'from_emails',
        'time_gap',
        'categories',
        'batch_size',
        'wait_time',
        'wait_unit',
        'status',
        'unopened',
        'scheduled_at',
        'timezone',
        'previous_sequence_id',
        'filters',
        'assignment_mode',
        'manual_assignments',
    ];

    protected $casts = [
        'from_emails' => 'array',
        'filters' => 'array',
        'manual_assignments' => 'array',
        'scheduled_at' => 'datetime',
    ];

    public function template()
    {
        return $this->belongsTo(Template::class);
    }

    public function audiences()
    {
        return $this->belongsTo(Audience::class, 'audience_id');
    }

    public function audience()
    {
        return $this->belongsTo(Audience::class, 'audience_id');
    }

    public function previousSequence()
    {
        return $this->belongsTo(self::class, 'previous_sequence_id');
    }

    public function logs()
    {
        return $this->hasMany(DriftSequenceLog::class, 'sequence_id');
    }

    public function getNextSequenceStartTime()
    {
        if (!$this->wait_time || !$this->wait_unit) {
            return now();
        }

        $startTime = $this->started_at ?? now();

        return match ($this->wait_unit) {
            'minutes' => $startTime->addMinutes($this->wait_time),
            'hours' => $startTime->addHours($this->wait_time),
            'days' => $startTime->addDays($this->wait_time),
            default => $startTime,
        };
    }

    public function nextSequence()
    {
        return self::on('pluto')
            ->where('set_id', $this->set_id)
            ->where('previous_sequence_id', $this->id)
            ->first();
    }
}
