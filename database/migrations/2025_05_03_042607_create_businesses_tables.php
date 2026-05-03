<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Businesses table
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->string('business_id', 30)->unique()->index();
            $table->string('name', 100)->index();
            $table->string('legal_name', 100)->nullable();
            $table->string('logo')->nullable(); // Changed to default string length
            $table->string('industry', 50)->nullable()->index();
            $table->string('registration_no', 50)->nullable()->unique()->index();
            $table->string('email', 100)->unique()->index();
            $table->string('phone', 15)->nullable()->index();
            $table->string('website')->nullable(); // Changed to default string length
            $table->string('country', 2)->nullable(); // Changed to ISO country code length
            $table->string('timezone', 50)->nullable();
            $table->json('address_json')->nullable();
            $table->unsignedInteger('no_of_employees')->default(0);
            $table->string('hr_contact_email', 100)->nullable();
            $table->string('hr_contact_phone', 15)->nullable();
            $table->string('business_size', 20)->nullable();
            $table->string('currency', 3)->nullable(); // ISO 4217 currency code
            $table->string('language', 5)->nullable(); // Supports en-US format
            $table->date('founded_date')->nullable();
            $table->string('tax_id', 50)->nullable()->index(); // Increased length for international formats
            $table->string('license_key', 50)->nullable()->index();
            $table->string('subscription_plan', 50)->nullable();
            $table->string('billing_status', 20)->default('active')->index();
            $table->string('database_name', 50)->nullable();
            $table->unsignedInteger('total_migrations')->nullable(); // Changed to numeric
            $table->unsignedInteger('total_migrated')->nullable(); // Changed to numeric
            $table->timestamp('migrated_at')->nullable();
            $table->string('database_status', 20)->default('not_created')->index();
            $table->json('meta_data')->nullable();
            $table->string('status', 20)->default('active')->index();
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->string('secure_version', 20)->nullable(); // Added length for consistency
            $table->timestamp('delete_on')->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        // Companies table
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('company_id', 30)->index();
            $table->string('business_id', 30);
            $table->foreign('business_id')->references('business_id')->on('businesses')->onDelete('restrict');
            $table->string('name', 100)->index();
            $table->string('legal_name', 100)->nullable();
            $table->string('industry', 50)->nullable()->index();
            $table->string('industry_subtype', 50)->nullable();
            $table->string('registration_no', 50)->nullable()->unique()->index();
            $table->string('email', 100)->nullable()->index();
            $table->string('phone', 15)->nullable()->index();
            $table->json('address_json')->nullable();
            $table->json('operating_hours_json')->nullable();
            $table->unsignedInteger('employee_count')->default(0);
            $table->json('meta_data')->nullable();
            $table->string('status', 20)->default('active')->index();
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->string('secure_version', 20)->nullable(); // Added length for consistency
            $table->timestamp('delete_on')->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        // Systems table
        Schema::create('systems', function (Blueprint $table) {
            $table->id();
            $table->string('business_id', 30);
            $table->foreign('business_id')->references('business_id')->on('businesses')->onDelete('restrict');
            $table->string('system', 20)->index(); // Changed enum to string with length
            $table->string('name', 100)->index();
            $table->string('database', 50)->index();
            $table->boolean('is_active')->default(true);
            $table->string('created_by', 30)->nullable();
            $table->string('updated_by', 30)->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('systems');
        Schema::dropIfExists('business_users');
        Schema::dropIfExists('companies');
        Schema::dropIfExists('businesses');
    }
};