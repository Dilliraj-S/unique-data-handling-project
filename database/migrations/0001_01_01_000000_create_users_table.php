<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->timestamps();
            $table->index('name'); // Index for role lookups
        });

        // Users table
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 30)->unique()->index(); // Unique index for user_id
            $table->string('business_id', 30)->index(); // Index for business_id
            $table->string('first_name', 50);
            $table->string('last_name', 50);
            $table->string('email', 100)->unique()->index();
            $table->string('username', 100)->unique()->index();
            $table->string('password', 255)->nullable();
            $table->unsignedTinyInteger('role_id');
            $table->string('provider', 20)->nullable();
            $table->string('provider_id', 50)->nullable()->index(); // Index for provider_id
            $table->string('provider_token', 255)->nullable();
            $table->string('provider_refresh_token', 255)->nullable();
            $table->boolean('two_factor_enabled')->default(false);
            $table->text('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();
            $table->string('two_factor_method', 20)->nullable();
            $table->string('device_token')->nullable();
            $table->string('device_type')->nullable();
            $table->boolean('fcm_enabled')->default(true);
            $table->timestamp('password_updated_at')->nullable();
            $table->unsignedInteger('max_logins')->default(1);
            $table->string('verification', 20)->default('pending')->index(); // Index for verification status
            $table->string('account_status', 20)->default('active')->index(); // Index for account status
            $table->text('profile')->nullable(); // Stores file path or URL
            $table->timestamp('last_login_at')->nullable(); // Track last login
            $table->rememberToken();
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->timestamp('delete_on')->nullable(); // For scheduled deletion
            $table->timestamp('restored_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        // Permissions table
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['create', 'import', 'view', 'edit', 'export', 'delete']);
            $table->string('name');
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->timestamps();
            $table->unique(['name', 'type']);
            $table->index('type', 'name');
        });


        // User_profiles table
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 30)->unique();
            $table->string('phone', 15)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('gender', 20)->nullable();
            $table->string('address', 255)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('country', 100)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('timezone', 50)->nullable(); // User timezone
            $table->json('meta_data')->nullable(); // Stores social URLs and interests
            $table->text('bio')->nullable();
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->timestamps();
        });

        // Tokens table
        Schema::create('tokens', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 30)->index(); // Changed to reference users.id
            $table->string('token', 255)->index(); // Index for token lookups
            $table->string('type', 50)->index(); // Index for token type
            $table->timestamp('expires_at')->nullable()->index(); // Index for expiration checks
            $table->timestamp('used_at')->nullable(); // Track when token is used
            $table->string('created_by', 30)->nullable();
            $table->timestamp('created_at')->nullable();
        });

        // Role_permissions pivot table
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->onDelete('cascade');
            $table->foreignId('permission_id')->constrained('permissions')->onDelete('cascade');
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->timestamps();
        });

        // User_permissions pivot table
        Schema::create('user_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('permission_id')->constrained('permissions')->onDelete('cascade');
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->timestamps();
        });

        // Auth_logs table
        Schema::create('auth_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('business_id', 20)->nullable()->index(); // Index for business_id
            $table->string('session_id', 255)->nullable()->index(); // Index for session_id
            $table->timestamp('login_time')->nullable();
            $table->timestamp('logout_time')->nullable();
            $table->string('ip_address', 45)->nullable(); // Track IP for audit
            $table->string('platform', 50)->nullable();
            $table->string('device', 100)->nullable();
            $table->string('os', 100)->nullable();
            $table->string('browser', 100)->nullable();
            $table->string('location', 255)->nullable();
            $table->boolean('active')->default(true)->index(); // Index for active status
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        // Sessions table
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('auth_logs');
        Schema::dropIfExists('user_permissions');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('tokens');
        Schema::dropIfExists('user_profiles');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
    }
};