<?php

namespace App\Models\Central\EmailSystem;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class Set extends Model
{
    protected $connection = 'pluto';
    protected $table = 'sets';
    protected $fillable = ['set_name', 'description', 'created_at', 'updated_at'];

    protected static function booted()
    {
        static::creating(function ($set) {
            Log::info('Creating new set:', [
                'set_name' => $set->set_name,
                'created_at' => now(),
                'stack_trace' => debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 15)
            ]);
        });
    }

    public function sequences()
    {
        return $this->hasMany(DriftSequence::class, 'set_id');
    }
}
