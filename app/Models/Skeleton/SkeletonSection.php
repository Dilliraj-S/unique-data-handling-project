<?php

namespace App\Models\Skeleton;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class SkeletonSection extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'skeleton_sections';
    protected $connection = 'central';
    protected $fillable = [
        'section_id',
        'module_id',
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

    public function module()
    {
        return $this->belongsTo(SkeletonModule::class, 'module_id', 'module_id');
    }

    public function items()
    {
        return $this->hasMany(SkeletonItem::class, 'section_id', 'section_id');
    }
}