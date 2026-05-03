<?php

namespace App\Models\Central\EmailSystem;

use Illuminate\Database\Eloquent\Model;

class Subscriber extends Model
{
    // Do not hardcode the connection
    protected $connection = 'pluto';
    protected $table = 'subscribers';

    protected $fillable = ['id', 'audience_id', 'first_name', 'last_name', 'email', 'status'];

    public function audiences()
    {
        return $this->belongsTo(Audience::class);
    }
}
