<?php

namespace App\Models\Central\EmailSystem;

use Illuminate\Database\Eloquent\Model;

class Template extends Model
{
    protected $connection = 'pluto'; // Add this
    protected $fillable = ['id', 'title','subject', 'content', 'last_modified'];

    protected $casts = [
        'last_modified' => 'datetime',
    ];
}
