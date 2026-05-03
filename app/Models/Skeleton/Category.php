<?php

namespace App\Models\Skeleton;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'category',
        'description',
        'created_by',
        'updated_by',
        'restored_at',
    ];

    protected $casts = [
        'restored_at' => 'datetime',
    ];

    public function options()
    {
        return $this->hasMany(Option::class, 'category_id', 'category_id');
    }
}