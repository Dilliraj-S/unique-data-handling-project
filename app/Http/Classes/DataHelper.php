<?php
namespace App\Http\Classes;
use Exception;
use InvalidArgumentException;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Creators\Lead;
use App\Http\Classes\OptionHelper;
use Carbon\Carbon;
class DataHelper
{
    /* Replace Placeholder Values */
    public static function replaceValues($content, $valuePairsJson)
    {
        $valuePairs = json_decode($valuePairsJson, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidArgumentException("Invalid JSON provided: " . json_last_error_msg());
        }
        $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        preg_match_all('/\{\:\{([a-zA-Z_]+)\}\:\}/', $content, $matches);
        foreach ($matches[1] as $index => $placeholder) {
            $search = $matches[0][$index];
            if (array_key_exists($placeholder, $valuePairs)) {
                $content = str_replace($search, $valuePairs[$placeholder], $content);
            } else {
                if (in_array($placeholder, ['place_service_items_here', 'place_email_content_here'])) {
                    $highlighted = htmlspecialchars($search);
                    $content = str_replace($search, $highlighted, $content);
                } else {
                    $highlighted = '<b style="background-color:red;color:white;border-radius:5px;padding:2px 3px 3px 3px">' . htmlspecialchars($search) . '</b>';
                    $content = str_replace($search, $highlighted, $content);
                }
            }
        }
        return $content;
    }
    public static function getColumnNames($table, $exclude = ['deleted_at', 'created_at', 'updated_at'])
    {
        $databaseName = env('DB_DATABASE');
        $query = "SELECT column_name 
                  FROM information_schema.columns 
                  WHERE table_schema = ? 
                  AND table_name = ?";
        $columns = DB::select($query, [$databaseName, $table]);
        $columnNames = array_column($columns, 'column_name');
        return array_diff($columnNames, $exclude);
    }
    public static function jsonToTable($jsonArray)
    {
        if (!is_array($jsonArray)) {
            $jsonArray = [$jsonArray];
        }
        $table = "<table class='table table-hover table-borderless table-sm sf-12 m-0'>";
        $table .= "<tbody>";
        foreach ($jsonArray as $jsonData) {
            $jsonData = json_decode($jsonData, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                self::parseJsonData($jsonData, $table);
            } else {
                $table .= "<tr><td class='p-1' colspan='2'><strong>Invalid JSON provided</strong></td></tr>";
            }
        }
        $table .= "</tbody>";
        $table .= "</table>";
        return $table;
    }
    private static function parseJsonData($data, &$table, $parentLabel = '')
    {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (is_array($value) && self::isFieldArray($value)) {
                    foreach ($value as $field) {
                        if (isset($field['label']) && isset($field['data'])) {
                            $label = self::formatLabel($field['label']);
                            $fieldValue = htmlspecialchars($field['data'], ENT_QUOTES, 'UTF-8');
                            $table .= "<tr><td class='p-1 w-25'><strong class='text-dark'>{$label}</strong></td><td class='p-1'>{$fieldValue}</td></tr>";
                        }
                    }
                } elseif (is_array($value)) {
                    $nestedLabel = $parentLabel ? "{$parentLabel} - {$key}" : $key;
                    self::parseJsonData($value, $table, $nestedLabel);
                } else {
                    $label = self::formatLabel($parentLabel ? "{$parentLabel} - {$key}" : $key);
                    $displayValue = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
                    if (self::isImagePath($value)) {
                        $displayValue = "<a data-fancybox='view-more-imgs' href='" . asset($displayValue) . "'><img src='" . asset($displayValue) . "' alt='{$label}' class='view-more-img-thumbnail'></a>";
                    }
                    $table .= "<tr><td class='p-1 w-25 text-secondary'><strong>{$label}</strong></td><td class='p-1 text-secondary'>" . self::formatLabel($displayValue) . "</td></tr>";
                }
            }
        } else {
            $label = self::formatLabel($parentLabel);
            $displayValue = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
            $table .= "<tr><td class='p-1 w-25'><strong>{$label}</strong></td><td class='p-1'>{$displayValue}</td></tr>";
        }
    }
    private static function formatLabel($label)
    {
        $label = str_replace(['_', '-'], ' ', $label);
        return ucwords($label);
    }
    private static function isFieldArray($array)
    {
        return isset($array[0]) && is_array($array[0]) && array_key_exists('label', $array[0]) && array_key_exists('data', $array[0]);
    }
    public static function isImagePath($value)
    {
        $imageExtensions = ['png', 'jpg', 'jpeg', 'gif'];
        $pathInfo = pathinfo($value);
        return isset($pathInfo['extension']) && in_array(strtolower($pathInfo['extension']), $imageExtensions);
    }
}
