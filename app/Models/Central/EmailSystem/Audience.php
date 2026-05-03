<?php

namespace App\Models\Central\EmailSystem;

use Illuminate\Database\Eloquent\Model;

class Audience extends Model
{
    protected $connection = 'pluto';
    protected $table = 'audiences';
    protected $fillable = ['name'];

    public function subscribers()
    {
        return $this->hasMany(Subscriber::class);
    }
}
