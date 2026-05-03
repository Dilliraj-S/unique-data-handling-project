<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Secure_keys table
        Schema::create('secure_keys', function (Blueprint $table) {
            $table->id();
            $table->string('business_id', 30)->index();
            $table->foreign('business_id', 'secure_keys_business_id_foreign')
                  ->references('business_id')->on('businesses')->onDelete('cascade');
            $table->string('key', 150)->unique()->index();
            $table->string('version', 100)->unique()->index();
            $table->boolean('is_active')->default(true)->index();
            $table->text('secure_version')->nullable();
            $table->string('created_by', 20)->nullable();
            $table->string('updated_by', 20)->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['business_id', 'key', 'version']);
        });

        // Encrypted_tables table
        Schema::create('encrypted_tables', function (Blueprint $table) {
            $table->id();
            $table->enum('system', ['central', 'business', 'dynamic']);
            $table->string('table', 100);
            $table->json('columns')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->string('created_by', 20)->nullable();
            $table->string('updated_by', 20)->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['system', 'table']);
        });

        // Encryption_progress table
        Schema::create('encryption_progress', function (Blueprint $table) {
            $table->id();
            $table->string('business_id', 30)->index();
            $table->foreign('business_id', 'encryption_progress_business_id_foreign')
                  ->references('business_id')->on('businesses')->onDelete('cascade');
            $table->string('database_name', 50)->nullable()->index();
            $table->integer('total_tables')->default(0);
            $table->integer('tables_encrypted')->default(0);
            $table->enum('status', ['pending', 'completed'])->default('pending')->index();
            $table->string('created_by', 20)->nullable();
            $table->string('updated_by', 20)->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['business_id', 'status']);
        });

        // Encryption_logs table
        Schema::create('encryption_logs', function (Blueprint $table) {
            $table->id();
            $table->string('business_id', 30)->index();
            $table->foreign('business_id', 'encryption_logs_business_id_foreign')
                  ->references('business_id')->on('businesses')->onDelete('cascade');
            $table->string('user_id', 30)->index();
            $table->foreign('user_id', 'encryption_logs_user_id_foreign')
                  ->references('user_id')->on('users')->onDelete('cascade');
            $table->string('table', 100);
            $table->string('old_version', 100)->nullable();
            $table->string('new_version', 100)->nullable();
            $table->timestamp('re_encrypted_at')->nullable();
            $table->string('created_by', 20)->nullable();
            $table->string('updated_by', 20)->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['business_id', 'user_id', 'table']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('encryption_logs');
        Schema::dropIfExists('encryption_progress');
        Schema::dropIfExists('encrypted_tables');
        Schema::dropIfExists('secure_keys');
    }
};