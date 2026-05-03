<?php
namespace App\Http\Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;
use App\Http\Classes\Helper;
use App\Http\Classes\UserHelper;
class SelectHelper
{
    /**
     * ----------------------------------------------------------------------------------------------
     * Dynamic Select Data Retrieval
     * ----------------------------------------------------------------------------------------------
     */
    public function dyna_select(Request $request)
    {
        try {
            // Validate input
            $option = $request->input('option');
            if (!$option) {
                throw new Exception('The "option" parameter is required.');
            }
            $tablePref = strtoupper(substr($option, 0, 3));
            if (!in_array($tablePref, ['CTG', 'DEP'])) {
                throw new Exception('Invalid option provided.');
            }
            // Find appropriate model
            if ($tablePref === 'CTG') {
                $tableData = Helper::tableFinder('OPT');
            } elseif ($tablePref === 'DEP') {
                $tableData = Helper::tableFinder('DSG');
            } else {
                throw new Exception('Model key not supported: ' . $tablePref);
            }
            $table = $tableData[0];
            // Query options
            if ($tablePref === 'CTG') {
                $options = DB::table($table)->where('category_id', $option)->whereNull('deleted_at')->get();
                $tablePref = 'OPT';
            } elseif ($tablePref === 'DEP') {
                $org_id = UserHelper::getCurrentUser('org_id');
                $options = DB::table($table)->whereNull('deleted_at')->where('dept_id', $option)->where('org_id', $org_id)->get();
                $tablePref = 'DSG';
            } else {
                $options = collect();
            }
            // Generate select options
            $selectOptions = $options->isEmpty()
                ? '<option value="">Options not found</option>'
                : self::generateOptions($tablePref, $options, []);
            return $selectOptions;
        } catch (Exception $e) {
            // Return an error option for user feedback
            return '<option value="">Options not found (E)</option>';
        }
    }
    /**
     * ----------------------------------------------------------------------------------------------
     * Data Values Retrieval
     * ----------------------------------------------------------------------------------------------
     * Retrieve a specific value from a model based on the provided key and value.
     *
     * @param string $tablePref Key to identify the model.
     * @param mixed $value The value to search for in the model.
     * @return mixed The retrieved value from the model or the original input value on failure.
     */
    public static function getValue($tablePref, $value)
    {
        try {
            $org_id = UserHelper::getCurrentUser('org_id');
            $tableData = Helper::tableFinder($tablePref);
            [$table, $fieldKey, $fieldValue] = $tableData;
            if (in_array($tablePref, ['CTG', 'OPT'])) {
                $result = DB::table($table)->where($fieldKey, $value)->firstOrFail();
            } else {
                $result = DB::table($table)->where($fieldKey, $value)
                    ->where('org_id', $org_id)
                    ->firstOrFail();
            }
            return $result->$fieldValue;
        } catch (Exception $e) {
            return $value;
        }
    }
    /**
     * ----------------------------------------------------------------------------------------------
     * Data Column Values Retrieval
     * ----------------------------------------------------------------------------------------------
     * Retrieve a specific column value from a model based on the provided key and value.
     *
     * @param string $tablePref Key to identify the model.
     * @param string $column The column to retrieve.
     * @param mixed $value The value to search for in the model.
     * @return mixed The retrieved column value or the original input value on failure.
     */
    public static function getColValue($tablePref, $column, $value)
    {
        try {
            $org_id = UserHelper::getCurrentUser('org_id');
            $tableData = Helper::tableFinder($tablePref);
            [$table, $fieldKey, $fieldValue] = $tableData;
            $result = DB::table($table)->where($fieldKey, $value)
                ->where('org_id', $org_id)
                ->firstOrFail();
            return $result->$column;
        } catch (Exception $e) {
            return $value;
        }
    }
    /**
     * ----------------------------------------------------------------------------------------------
     * Generate HTML Select Options
     * ----------------------------------------------------------------------------------------------
     */
    private static function generateOptions($tablePref, $options_load, $selectedIds = [])
    {
        try {
            $options = '<option value="">Select an option</option>'; // Default option
            $tableData = Helper::tableFinder($tablePref);
            $optKey = $tableData[1];
            $optView = $tableData[2];
            foreach ($options_load as $option) {
                $isSelected = is_array($selectedIds)
                    ? in_array($option->$optKey, $selectedIds)
                    : ($selectedIds == $option->$optKey);
                $options .= '<option value="' . $option->$optKey . '"' . ($isSelected ? ' selected' : '') . '>' .
                    ucwords(str_replace('_', ' ', $option->$optView)) .
                    '</option>';
            }
            return $options;
        } catch (Exception $e) {
            return '<option value="">Options not found (E) ' . $e->getMessage() . '</option>';
        }
    }
    /**
     * ----------------------------------------------------------------------------------------------
     * Get Select Options
     * ----------------------------------------------------------------------------------------------
     */
    public static function getOptions($tablePref, $column, $value = 'all', $selectedIds = [])
    {
        try {
            $org_id = UserHelper::getCurrentUser('org_id');
            $tableData = Helper::tableFinder($tablePref);
            $table = $tableData[0];
            if (in_array($tablePref, ['CTG', 'OPT'])) {
                $options = $value === 'all' ? DB::table($table)->whereNull('deleted_at')->get() : DB::table($table)->whereNull('deleted_at')->where($column, $value)->get();
            } else if (in_array($tablePref, ['DEP', 'DSG'])) {
                $options = $value === 'all' ? DB::table($table)->whereNull('deleted_at')->where('org_id', $org_id)->get() : DB::table($table)->whereNull('deleted_at')->where($column, $value)->where('org_id', $org_id)->get();
            } else {
                $options = $value === 'all' ? DB::table($table)->whereNull('deleted_at')->where('org_id', $org_id)->get() : DB::table($table)->whereNull('deleted_at')->where($column, $value)->where('org_id', $org_id)->get();
            }
            return $options->isEmpty() ? '<option>Not found</option>' : self::generateOptions($tablePref, $options, $selectedIds);
        } catch (Exception $e) {
            return '<option value="">Options not found (E)</option>';
        }
    }
    public static function getKeyAndValues($tablePref, $column)
    {
        try {
            $org_id = UserHelper::getCurrentUser('org_id');
            $tableData = Helper::tableFinder($tablePref);
            $table = $tableData[0];
            $uniqueColumn = $tableData[1]; 
            
            if (in_array($tablePref, ['CTG', 'OPT'])) {
                $options = DB::table($table)->whereNull('deleted_at')->get();
            } else {
                $options = DB::table($table)->whereNull('deleted_at')->where('org_id', $org_id)->get();
            }
            
            if ($options->isEmpty()) {
                return [];
            }
            
            $result = [];
            foreach ($options as $option) {
                $result[$option->$uniqueColumn] = $option->$column;
            }
            
            return $result;
        } catch (Exception $e) {
            return [];
        }
    }
}
