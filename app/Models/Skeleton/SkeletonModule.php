<?php

namespace App\Models\Skeleton;

use App\Models\User\Role;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class SkeletonModule extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'skeleton_modules';
    protected $connection = 'central';
    protected $fillable = [
        'module_id',
        'system',
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

    public function sections()
    {
        return $this->hasMany(SkeletonSection::class, 'module_id', 'module_id');
    }
}