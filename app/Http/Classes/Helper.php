<?php
namespace App\Http\Classes;
use Exception;
use InvalidArgumentException;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Http\Classes\SelectHelper;
class Helper
{
    /**
     * Returns an associative array that maps table identifiers to corresponding column names and table names.
     * 
     * The table identifiers (e.g., 'GT', 'ATT', 'CTG') are mapped to an array where:
     * - The first element represents the unique column name (e.g., 'gotit_id', 'org_id', etc.).
     * - The second element represents the table name (e.g., 'users', 'attendance', etc.).
     * - The second element represents the main column name (e.g., 'first_name', 'category', etc.).
     * 
     * @return array An associative array where each key is a table identifier, and the value is an array with 
     *               the column name and table name.
     */
    public static function tableFinder($prefix, $all = False)
    { 
        $table = [
            'GT' => ['users', 'gotit_id', 'user'],
            'ATT' => ['org_id', 'org_id', 'attendance'],
            'CTG' => ['categories', 'category_id', 'category'],
            'CMD' => ['commands', 'command_id', 'command'],
            'GMD' => ['global_commands', 'command_id', 'command'],
            'CLI' => ['clients', 'client_id', 'client_id'],
            'DEP' => ['departments', 'dept_id', 'department'],
            'DSG' => ['designations', 'desg_id', 'designation'],
            'DEV' => ['devices', 'device_id', 'name'],
            'HOL' => ['holidays', 'holiday_id', 'holiday'],
            'ITM' => ['skeleton_items', 'item_id', 'item'],
            'JOB' => ['jobs', 'queue', 'job'],
            'JBA' => ['job_batches', 'name', 'job_batch'],
            'LEV' => ['leaves', 'leave_id', 'leave'],
            'MYP' => ['my_payments', 'payment_id', 'client_id'],
            'MOD' => ['skeleton_modules', 'module_id', 'Module'],
            'NTF' => ['notifications', 'notify_id', 'notification'],
            'OPT' => ['options', 'option_id', 'option'],
            'ORG' => ['organizations', 'org_id', 'organization'],
            'OTP' => ['otps', 'gotit_id', 'otp'],
            'PAY' => ['payrolls', 'payroll_id', 'payroll'],
            'SES' => ['sessions', 'user_id', 'session'],
            'SEC' => ['skeleton_sections', 'section_id', 'section'],
            'SFT' => ['shifts', 'shift_id', 'name'],
            'GOT' => ['users', 'gotit_id', 'user'],
            'USR' => ['users', 'gotit_id', 'user'],
            'USD' => ['user_data', 'gotit_id', 'user_data'],
            'ORC' => ['org_contacts', 'contact_id', 'org_contact'],
            'WSH' => ['wishes', 'wish_id', 'wishes'],
            
        ];
        if ($all) {
            return $table;
        } else {
            return $table[$prefix];
        }
    }
    /**
     * Update IDs - Append or update ID string
     * @param string $string
     * @param mixed $id
     * @return string
     */
    public static function appendId($string, $id)
    {
        try {
            if (empty($string)) {
                if (!is_array($id)) {
                    return trim($id);
                } else {
                    return implode(',', array_map('trim', $id));
                }
            }
            $idArray = explode(',', $string);
            $idArray = array_map('trim', $idArray);
            if (!is_array($id)) {
                $id = [$id];
            }
            foreach ($id as $singleId) {
                $singleId = trim($singleId);
                if (!in_array($singleId, $idArray)) {
                    $idArray[] = $singleId;
                }
            }
            return implode(',', $idArray);
        } catch (Exception $e) {
            throw new Exception("Error in appendId: " . $e->getMessage());
        }
    }
    /**
     * Option Pills - Generate styled pills for options.
     * 
     * This method generates HTML span elements styled as pills based on a comma-separated string of option IDs.
     * If the prefix is 'OPT', the background color is retrieved and applied. Otherwise, a default pill style is used.
     * 
     * @param string $prefix The prefix used for selecting the option type (e.g., 'OPT').
     * @param string $string A comma-separated string of option IDs.
     * 
     * @return string A string containing the HTML for the styled pills.
     * 
     * @throws Exception If an error occurs while processing the options.
     */
    public static function optionPills($prefix, $string)
    {
        try {
            // Return an empty string if the input string is empty
            if (empty($string)) {
                return '';
            }
            // Split the input string into individual option IDs
            $optionIds = explode(',', $string);
            $output = '';
            // Generate HTML for each option ID
            foreach ($optionIds as $id) {
                $value = SelectHelper::getValue($prefix, $id); // Get the value of the option
                if ($prefix == 'OPT') {
                    // Get the color for the option if the prefix is 'OPT'
                    $color = SelectHelper::getColValue($prefix, 'color', $id);
                    $output .= '<span class="options-pills" style="background-color:' . htmlspecialchars($color) . '">' . htmlspecialchars($value) . '</span>';
                } else {
                    $output .= '<span class="options-pills">' . htmlspecialchars($value) . '</span>';
                }
            }
            return $output;
        } catch (Exception $e) {
            throw new Exception("Error in optionPills: " . $e->getMessage());
        }
    }
    /**
     * Helper function to check if a string is JSON
     */
    public static function isJson($string)
    {
        json_decode($string);
        return (json_last_error() == JSON_ERROR_NONE);
    }
    /**
     * Category Pills - JSON values for options in a category.
     * 
     * This method retrieves options for a specific category and returns the values as a JSON array.
     * 
     * @param string $prefix The prefix used for selecting the category type (e.g., 'CTG').
     * @param int $find The value used to find the specific category.
     * @param string $id The column name representing the ID of the category option.
     * @param string $value The column name representing the value of the category option.
     * @param string $group The column name representing the group of the category option.
     * 
     * @return string A JSON string containing the category option IDs, values, and groups.
     * 
     * @throws Exception If an error occurs while retrieving or processing the category options.
     */
    public static function pillsJsonValues($prefix, $find, $id, $value, $group)
    {
        try {
            // Retrieve table and column mappings based on the prefix
            [$table, $column, $name] = Helper::tableFinder($prefix);
            // Fetch options for the given category from the database
            $pills = DB::table($table)->where($column, $find)->get();
            $result = [];
            // Process each pill and prepare the JSON response
            foreach ($pills as $pill) {
                $result[] = [
                    'id' => $pill->$id, // ID of the category option
                    'value' => $pill->$value, // Value of the category option
                    'group' => SelectHelper::getValue($prefix, $pill->$group), // Group of the category option
                ];
            }
            // Return the result as a JSON string
            return json_encode($result);
        } catch (Exception $e) {
            throw new Exception("Error in pillsJsonValues: " . $e->getMessage());
        }
    }
    /**
     * Pills JSON Profiles - Get user profiles as JSON.
     * 
     * This method retrieves user profiles based on a given type and finds them in the specified `type` field.
     * The result is returned as a JSON array with user IDs, names, avatars, and groups.
     * 
     * @param string $prefix The prefix used for selecting the user type (e.g., 'USR').
     * @param string $type The field name for user grouping (e.g., 'role', 'department').
     * @param string $finds A comma-separated string of values used to find matching users.
     * 
     * @return string A JSON string containing the user profiles with IDs, names, avatars, and groups.
     * 
     * @throws Exception If an error occurs while retrieving or processing the user profiles.
     */
    public static function pillsJsonProfiles($prefix, $type, $finds)
    {
        try {
            // Return an empty JSON array if no `finds` are provided
            if (empty($finds)) {
                return json_encode([]);
            }
            // Trim and split the `finds` string into an array of values
            $find = array_map('trim', explode(',', $finds));
            // Return an empty JSON array if there are no valid values in `find`
            if (empty($find)) {
                return json_encode([]);
            }
            // Retrieve users matching the provided `type` field
            $users = User::whereIn($type, $find)->get();
            $result = [];
            // Process each user and prepare the JSON response
            foreach ($users as $user) {
                $result[] = [
                    'id' => $user->unique_id, // User's unique ID
                    'value' => $user->first_name . ' ' . $user->last_name, // User's full name
                    'avatar' => $user->profile ? asset($user->profile) : asset('treasury/images/common/profile/profile.png'), // User's avatar
                    'group' => $user->$type, // User's group based on the type
                ];
            }
            // Return the result as a JSON string
            return json_encode($result);
        } catch (Exception $e) {
            throw new Exception("Error in pillsJsonProfiles: " . $e->getMessage());
        }
    }
    /**
     * Convert Array to String
     * @param array $arr
     * @return string
     */
    public static function convrtstr($arr)
    {
        try {
            if (!is_array($arr)) {
                throw new InvalidArgumentException("Input must be an array");
            }
            return implode(',', array_map('trim', $arr));
        } catch (Exception $e) {
            throw new Exception("Error in convrtstr: " . $e->getMessage());
        }
    }
    /**
     * Generate Random Background
     * @return string
     */
    public static function randomBg()
    {
        try {
            $colors = [
                'bg-primary',
                'bg-secondary',
                'bg-success',
                'bg-danger',
                'bg-warning',
                'bg-info',
                'bg-dark',
                'bg-sun',
                'bg-moon',
                'bg-mercury',
                'bg-venus',
                'bg-earth',
                'bg-mars',
                'bg-jupiter',
                'bg-saturn',
                'bg-uranus',
                'bg-neptune',
                'bg-star',
                'bg-galaxy',
                'bg-nebula',
                'bg-comet',
                'bg-supernova',
                'bg-aurora',
                'bg-meteor',
                'bg-blackhole',
                'bg-quasar'
            ];
            return $colors[array_rand($colors)];
        } catch (Exception $e) {
            throw new Exception("Error in randomBg: " . $e->getMessage());
        }
    }
    /**
     * Convert Number to Words
     * @param int $number
     * @return string
     */
    public static function numberToWords($number)
    {
        try {
            $words = [
                '0' => '',
                '1' => 'One',
                '2' => 'Two',
                '3' => 'Three',
                '4' => 'Four',
                '5' => 'Five',
                '6' => 'Six',
                '7' => 'Seven',
                '8' => 'Eight',
                '9' => 'Nine',
                '10' => 'Ten',
                '11' => 'Eleven',
                '12' => 'Twelve',
                '13' => 'Thirteen',
                '14' => 'Fourteen',
                '15' => 'Fifteen',
                '16' => 'Sixteen',
                '17' => 'Seventeen',
                '18' => 'Eighteen',
                '19' => 'Nineteen',
                '20' => 'Twenty',
                '30' => 'Thirty',
                '40' => 'Forty',
                '50' => 'Fifty',
                '60' => 'Sixty',
                '70' => 'Seventy',
                '80' => 'Eighty',
                '90' => 'Ninety'
            ];
            $units = ['', 'Thousand', 'Lakh', 'Crore'];
            if ($number == 0) {
                return 'Zero';
            }
            $number = str_pad($number, 9, '0', STR_PAD_LEFT);
            $segments = [
                'crore' => (int)substr($number, 0, 2),
                'lakh' => (int)substr($number, 2, 2),
                'thousand' => (int)substr($number, 4, 2),
                'hundred' => (int)substr($number, 6, 1),
                'remainder' => (int)substr($number, 7, 2),
            ];
            $output = '';
            foreach ($segments as $unit => $value) {
                if ($value > 0) {
                    $output .= ($value < 21) ? $words[$value] : $words[$value - $value % 10] . ' ' . $words[$value % 10];
                    $output .= " " . ucfirst($unit) . " ";
                }
            }
            return trim($output);
        } catch (Exception $e) {
            throw new Exception("Error in numberToWords: " . $e->getMessage());
        }
    }
    /**
     * Generates a form based on the provided JSON data and form type.
     *
     * @param string|array $jsonData The JSON data representing form fields (either as a string or array).
     * @param string $formType The type of form layout ("floating" or "default").
     * @param string $name The name attribute for the hidden input that holds the form data.
     * @param int $maxColumns The maximum number of columns to display per row (default is 4).
     * 
     * @return string The HTML string for the generated form with embedded JavaScript for dynamic updates.
     * 
     * @throws InvalidArgumentException if the JSON data is invalid or doesn't have the required structure.
     */
    public static function formGenerator($jsonData, $formType, $name, $maxColumns = 4)
    {
        try {
            // Validate input type and decode JSON data if necessary
            if (is_array($jsonData)) {
                $jsonData = json_encode($jsonData);  // Ensure $jsonData is a JSON string
            }
            // Decode JSON data into an associative array
            $data = json_decode($jsonData, true);
            // Validate the decoded data structure
            if (!is_array($data) || !isset($data['fields']) || !is_array($data['fields'])) {
                throw new InvalidArgumentException("Invalid JSON data provided.");
            }
            // Generate unique class names for CSS styling
            $uniqueClass = 'form-' . rand(0, 9999999);
            $hiddenInputId = 'form-' . rand(0, 9999999);
            $form = "<div class='{$uniqueClass}'>";
            // Helper function to determine column classes based on number of fields
            $getColumnClasses = function ($count) use ($maxColumns) {
                $cols = min($count, $maxColumns); // Ensure columns don't exceed $maxColumns
                $colWidth = floor(12 / $cols);    // Bootstrap grid system logic
                return array_fill(0, $cols, "col-$colWidth");
            };
            // Determine column classes based on the number of fields
            $columnClasses = $getColumnClasses(count($data['fields']));
            $form .= '<div class="row g-3">';
            // Iterate over form fields and generate input elements
            foreach ($data['fields'] as $index => $field) {
                // Create a new row for every $maxColumns fields
                if ($index % $maxColumns === 0 && $index !== 0) {
                    $form .= '</div><div class="row g-3">';
                }
                // Determine the column class for this field
                $colClass = $columnClasses[$index % $maxColumns];
                $form .= "<div class='{$colClass}'>";
                $input = '';  // Placeholder for the input field HTML
                // Generate input elements based on the field type
                switch ($field['type']) {
                    case 'radio':
                        $input .= "<div class='w-100'>";
                        if (isset($field['options']) && is_array($field['options'])) {
                            foreach ($field['options'] as $option) {
                                $checked = isset($field['data']) && $field['data'] === $option ? 'checked' : '';
                                $input .= "<div class='form-check form-check-inline'>
                                        <input class='form-check-input {$uniqueClass}-field' type='radio' name='{$field['label']}' value='{$option}' {$checked}>
                                        <label class='form-check-label'>{$option}</label>
                                    </div>";
                            }
                        }
                        $input .= "</div>";
                        break;
                    case 'checkbox':
                        $input .= "<div class='w-100'>";
                        if (isset($field['options']) && is_array($field['options'])) {
                            foreach ($field['options'] as $option) {
                                $checked = isset($field['data']) && is_array($field['data']) && in_array($option, $field['data']) ? 'checked' : '';
                                $input .= "<div class='form-check form-check-inline'>
                                        <input class='form-check-input {$uniqueClass}-field' type='checkbox' name='{$field['label']}[]' value='{$option}' {$checked}>
                                        <label class='form-check-label'>{$option}</label>
                                    </div>";
                            }
                        }
                        $input .= "</div>";
                        break;
                    case 'select':
                        $options = "<option value=''>Select {$field['label']}</option>";
                        if (isset($field['options']) && is_array($field['options'])) {
                            foreach ($field['options'] as $option) {
                                $selected = isset($field['data']) && $field['data'] === $option ? 'selected' : '';
                                $options .= "<option value='{$option}' {$selected}>{$option}</option>";
                            }
                        }
                        $input = "<select class='form-select {$uniqueClass}-field' name='{$field['label']}' " . ($field['required'] ? 'required' : '') . ">{$options}</select>";
                        break;
                    case 'editor':
                        $dataValue = isset($field['data']) ? $field['data'] : '';
                        $input = "<textarea class='form-control {$uniqueClass}-field' name='{$field['label']}' placeholder='{$field['label']}' " . ($field['required'] ? 'required' : '') . ">{$dataValue}</textarea>";
                        break;
                    default:
                        $dataValue = isset($field['data']) ? $field['data'] : '';
                        $input = "<input type='{$field['type']}' class='form-control {$uniqueClass}-field' name='{$field['label']}' placeholder='{$field['label']}' value='{$dataValue}' " . ($field['required'] ? 'required' : '') . ">";
                        break;
                }
                // Floating label form type or standard form type
                $form .= $formType === 'floating' && !in_array($field['type'], ['radio', 'checkbox'])
                    ? "<div class='form-floating form-floating-outline mb-3'>{$input}<label>{$field['label']}</label></div>"
                    : "<div class='mb-3'><label class='form-label'>{$field['label']}</label>{$input}</div>";
                $form .= "</div>"; // Close the column
            }
            // Close the last row if needed
            if (count($data['fields']) % $maxColumns !== 0) {
                $form .= '</div>';
            }
            $form .= "</div><input type='hidden' id='{$hiddenInputId}' class='form-data' name='{$name}'></div>";
            // Escape JSON data properly for JavaScript usage
            $escapedJsonData = addslashes($jsonData);
            // Embedded JavaScript to dynamically update hidden input with form data
            $script = "
        <script>
            function updateHiddenInput() {
                const uniqueClass = '{$uniqueClass}';
                const jsonData = JSON.parse(decodeURIComponent('{$escapedJsonData}'));
                const updatedFields = jsonData.fields.map(function(field) {
                    let value = '';
                    if (field.type === 'checkbox') {
                        value = Array.from(document.querySelectorAll('input[name=\"' + field.label + '[]\"]:checked'))
                                    .map(function(checkbox) {
                                        return checkbox.value;
                                    });
                    } else if (field.type === 'radio') {
                        const radioElement = document.querySelector('input[name=\"' + field.label + '\"]:checked');
                        value = radioElement ? radioElement.value : '';
                    } else {
                        const inputElement = document.querySelector('input[name=\"' + field.label + '\"], select[name=\"' + field.label + '\"], textarea[name=\"' + field.label + '\"]');
                        value = inputElement ? inputElement.value : '';
                    }
                    return { ...field, data: value };
                });
                const updatedJsonData = { ...jsonData, fields: updatedFields };
                document.getElementById('{$hiddenInputId}').value = JSON.stringify(updatedJsonData);
            }
            function attachEventListeners() {
                document.querySelectorAll('.{$uniqueClass}-field').forEach(function(element) {
                    ['input', 'change', 'blur'].forEach(function(event) {
                        element.addEventListener(event, updateHiddenInput);
                    });
                });
            }
            attachEventListeners();
            updateHiddenInput();
        </script>";
            return $form . $script;
        } catch (InvalidArgumentException $e) {
            // Handle the case where the input JSON data is invalid
            return "<div class='alert alert-danger'>{$e->getMessage()}</div>";
        } catch (Exception $e) {
            // Handle any other exceptions
            return "<div class='alert alert-danger'>An unexpected error occurred: {$e->getMessage()}</div>";
        }
    }
}
