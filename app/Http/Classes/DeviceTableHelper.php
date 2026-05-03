<?php
namespace App\Http\Classes;
use Exception;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use App\Http\Classes\{ExceptionHelper, UserHelper};
class DeviceTableHelper
{
    /**
     * Create a table with dynamic columns based on the table name and ID.
     *
     * @param string $table_name The name of the table to create.
     * @param string $id The ID used to generate the final table name.
     * 
     * @return void
     */
    public static function createTable($table_name, $id)
    {
        $columns = null;
        $prefix = '';
        switch ($table_name) {
            case 'users':
                $prefix = 'zusr';
                $columns = function (Blueprint $table) {
                    $table->id();
                    $table->string('device_id', 20)->nullable();
                    $table->string('uid', 10)->nullable();
                    $table->string('usrid', 10)->nullable();
                    $table->string('grpid', 10)->nullable();
                    $table->string('name', 25)->nullable();
                    $table->string('role', 5)->nullable();
                    $table->string('pswd', 10)->nullable();
                    $table->string('card', 12)->nullable();
                    $table->text('fngr_temp')->nullable();
                    $table->string('count', 5)->default('0');
                    $table->string('status', 10)->default('A');
                    $table->string('uqcol', 50)->unique();
                    $table->softDeletes();
                    $table->timestamps();
                    $table->unique(['device_id', 'uid', 'usrid', 'grpid', 'uqcol'], 'users_group_unique');
                    $table->index(['device_id', 'uid', 'usrid', 'grpid', 'name', 'role', 'pswd', 'card', 'count', 'status', 'uqcol']);
                };
                break;
            case 'attendance':
                $prefix = 'zatd';
                $columns = function (Blueprint $table) {
                    $table->id();
                    $table->string('device_id', 12)->nullable();
                    $table->string('uid', 10)->nullable();
                    $table->string('usrid', 10)->nullable();
                    $table->string('meth', 10)->nullable();
                    $table->string('chk', 10)->nullable();
                    $table->string('time', 50)->nullable();
                    $table->string('uqcol', 60);
                    $table->softDeletes();
                    $table->timestamps();
                    $table->unique(['device_id', 'uid', 'usrid', 'meth', 'chk', 'uqcol'], 'attendance_group_unique');
                    $table->index(['device_id', 'uid', 'usrid', 'meth', 'chk', 'time', 'uqcol']);
                };
                break;
            case 'commands':
                $prefix = 'zcmd';
                $columns = function (Blueprint $table) {
                    $table->id();
                    $table->string('cmd_id', 20);
                    $table->string('org_id', 20)->nullable();
                    $table->string('device_id', 12)->nullable();
                    $table->string('cret_id', 20)->nullable();
                    $table->string('afct_id', 20)->nullable();
                    $table->string('command', 20)->nullable();
                    $table->text('inputs')->nullable();
                    $table->string('nxt_loop', 10)->default('30000');
                    $table->string('state', 10)->nullable();
                    $table->string('status', 10)->nullable();
                    $table->text('msg')->nullable();
                    $table->softDeletes();
                    $table->timestamps();
                    // Add indexes to all columns except created_at and updated_at
                    $table->index(['cmd_id', 'org_id', 'device_id', 'cret_id', 'afct_id', 'command', 'state', 'status']);
                };
                break;
            default:
                throw new \InvalidArgumentException("Invalid table name: $table_name");
        }
        $final_table_name = strtolower($prefix . '_' . $id);
        // Try to create the table, and handle the case where it already exists
        try {
            if (!Schema::hasTable($final_table_name) && $columns instanceof \Closure) {
                Schema::create($final_table_name, $columns);
            }
        } catch (Exception $e) {
            return ExceptionHelper::handle($e);
        }
    }
    /**
     * Get the table name based on the provided table name and org_id.
     *
     * @param string $table_name The base name of the table.
     * 
     * @return string|null The fully qualified table name or null if invalid.
     */
    public static function table($table_name)
    {
        $org_id = strtolower(UserHelper::getCurrentUser('org_id'));
        if ($table_name == "attendance") {
            return 'zatd_' . $org_id;
        } else if ($table_name == "commands") {
            return 'zcmd_' . $org_id;
        } else if ($table_name == "users") {
            return 'zusr_' . $org_id;
        } else {
            return null;
        }
    }
}
