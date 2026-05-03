<?php

namespace App\Models\Central\EmailSystem;

use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    protected $connection = 'pluto'; // Add this if not already present
    protected $fillable = [
        'id',
        'name',
        'template_id',
        'audience_id',
        'status',
        'scheduled_at', // Add this
        'timezone',     // Add this
    ];
    public function template()
    {
        return $this->belongsTo(Template::class);
    }

    public function audience()
    {
        return $this->belongsTo(Audience::class, 'audience_id');
    }
}
