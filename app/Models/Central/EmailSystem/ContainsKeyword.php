<?php

namespace App\Models\Central\EmailSystem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContainsKeyword extends Model
{
    use SoftDeletes;
    protected $table = 'contains_keywords';
    protected $fillable = ['keyword', 'type', 'created_at', 'updated_at'];
}