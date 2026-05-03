<?php

namespace App\Models\Skeleton;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class SkeletonItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'skeleton_items';
    protected $connection = 'central';
    protected $fillable = [
        'item_id',
        'section_id',
        'name',
        'icon',
        'order',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function section()
    {
        return $this->belongsTo(SkeletonSection::class, 'section_id', 'section_id');
    }
}