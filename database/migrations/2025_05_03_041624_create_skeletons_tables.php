<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Skeleton_modules table
        Schema::create('skeleton_modules', function (Blueprint $table) {
            $table->id();
            $table->string('module_id', 20)->unique()->index();
            $table->string('name', 100);
            $table->enum('system', ['central', 'business', 'dynamic']);
            $table->string('icon', 100);
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('created_by', 20)->nullable();
            $table->string('updated_by', 20)->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['name', 'system']);
        });

        // Skeleton_sections table
        Schema::create('skeleton_sections', function (Blueprint $table) {
            $table->id();
            $table->string('section_id', 20)->unique()->index();
            $table->string('module_id', 20);
            $table->foreign('module_id', 'skeleton_sections_module_id_foreign')->references('module_id')->on('skeleton_modules')->onDelete('cascade');
            $table->string('name', 100);
            $table->string('icon', 100);
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('created_by', 20)->nullable();
            $table->string('updated_by', 20)->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['module_id', 'name']);
        });

        // Skeleton_items table
        Schema::create('skeleton_items', function (Blueprint $table) {
            $table->id();
            $table->string('item_id', 20)->unique()->index();
            $table->string('section_id', 20);
            $table->foreign('section_id', 'skeleton_items_section_id_foreign')->references('section_id')->on('skeleton_sections')->onDelete('cascade');
            $table->string('name', 100);
            $table->string('icon', 100);
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('created_by', 20)->nullable();
            $table->string('updated_by', 20)->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['section_id', 'name']);
        });

        // Skeleton_tokens table
        Schema::create('skeleton_tokens', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('key', 200)->unique()->index();
            $table->string('module', 200)->index()->nullable();
            $table->enum('system', ['central', 'business', 'dynamic']);
            $table->string('type', 200);
            $table->string('table', 50);
            $table->string('column', 50);
            $table->string('value', 255);
            $table->boolean('validate')->default(false);
            $table->string('actions', 50)->nullable();
            $table->string('created_by', 25)->nullable();
            $table->string('updated_by', 25)->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['key', 'module', 'system', 'type']);
        });

        // Categories table
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_id', 20)->unique()->index();
            $table->string('category', 100)->unique()->index();
            $table->text('description')->nullable();
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        // Options table
        Schema::create('options', function (Blueprint $table) {
            $table->id();
            $table->string('option_id', 20)->unique()->index();
            $table->string('category_id', 20)->index();
            $table->foreign('category_id', 'options_category_id_foreign')->references('category_id')->on('categories')->onDelete('cascade');
            $table->string('option', 100)->index();
            $table->string('color', 15)->nullable();
            $table->string('class', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        // Credentials table
        Schema::create('credentials', function (Blueprint $table) {
            $table->id();
            $table->string('cred_id', 15)->unique()->index();
            $table->string('name', 100);
            $table->string('type', 100)->index();
            $table->json('credentials');
            $table->string('status', 100)->index();
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('skeleton_tokens');
        Schema::dropIfExists('skeleton_items');
        Schema::dropIfExists('skeleton_sections');
        Schema::dropIfExists('skeleton_modules');
        Schema::dropIfExists('credentials');
        Schema::dropIfExists('options');
        Schema::dropIfExists('categories');
    }
};