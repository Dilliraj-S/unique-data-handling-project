<?php

namespace App\Http\Controllers\System\Actions;

use App\Facades\{Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use Illuminate\Http\{Request, JsonResponse};
use Illuminate\Support\Facades\{Config, Log, DB};
use Exception;

/**
 * Controller for handling dynamic and static Select2 dropdown data.
 */
class Select extends Controller
{
    /**
     * Handle AJAX requests for Select2 dropdown data (dynamic or static).
     *
     * @param Request $request HTTP request object.
     * @param array $params Route parameters with token.
     * @return JsonResponse Dropdown data or error message.
     */
    public function index(Request $request, array $params = []): JsonResponse
    {
        try {
            Developer::info("Entered In select");
            $token = $params['token'] ?? $request->input('skeleton_token');
            $reqSet = [];
            $hasToken = is_string($token) && !empty($token);
            
            // Simple test response for debugging
            if ($request->input('test') === 'true') {
                return response()->json([
                    'status' => true,
                    'message' => 'Select endpoint is working',
                    'data' => [
                        ['value' => 'test1', 'view' => 'Test Option 1', 'is_selected' => false],
                        ['value' => 'test2', 'view' => 'Test Option 2', 'is_selected' => false]
                    ]
                ]);
            }

            $selectedValue = $request->input('selected_value');
            $searchTerm = $request->input('q', '');
            $page = max(1, (int)$request->input('page', 1));
            $perPage = min(50, max(10, (int)$request->input('per_page', 10)));
            $preselected = $request->input('selected') ? (array)$request->input('selected') : null;
            $initialLoad = filter_var($request->input('initial_load', false), FILTER_VALIDATE_BOOLEAN);
            $table = $request->input('table');
            $columns = $request->input('columns', 'id|name');
            $countOnly = $request->input('count_only', false);
            
            // Handle table-based request directly
            if ($table) {
                // Handle database.table format and clean table name
                $tableParts = explode('.', $table);
                $tableName = end($tableParts);
                $databaseName = count($tableParts) > 1 ? $tableParts[0] : null;
                
                // Clean table and database names to prevent SQL injection
                if (str_contains($tableName, '.')) {
                    list($databaseName, $tableName) = explode('.', $tableName, 2);
                    $databaseName = trim($databaseName);
                    $tableName = trim($tableName);
                }
                
                // Clean the database and table names
                $tableName = preg_replace('/[^a-zA-Z0-9_]/', '', $tableName);
                $databaseName = $databaseName ? preg_replace('/[^a-zA-Z0-9_]/', '', $databaseName) : null;
                
                // Set the full table name with database prefix if needed
                $fullTableName = $databaseName ? DB::raw("`{$databaseName}`.`{$tableName}`") : "`{$tableName}`";
                
                // Parse columns if they're in 'id|name' format
                $columnParts = explode('|', $columns);
                $valueColumn = $columnParts[0];
                $displayColumn = $columnParts[1] ?? $valueColumn;
                
                // Clean column names
                $valueColumn = preg_replace('/[^a-zA-Z0-9_]/', '', $valueColumn);
                $displayColumn = preg_replace('/[^a-zA-Z0-9_]/', '', $displayColumn);
                
                // Check if table exists before building query
                try {
                    $tableExists = DB::select("SHOW TABLES LIKE '{$tableName}'");
                    
                    if (empty($tableExists)) {
                        Developer::error("Table does not exist", [
                            'table' => $tableName,
                            'database' => $databaseName,
                            'fullTableName' => $fullTableName
                        ]);
                        
                        return response()->json([
                            'status' => false,
                            'message' => "Table '{$tableName}' does not exist",
                            'data' => []
                        ], 404);
                    }
                } catch (Exception $e) {
                    Developer::error("Error checking table existence", [
                        'table' => $tableName,
                        'error' => $e->getMessage()
                    ]);
                    
                    return response()->json([
                        'status' => false,
                        'message' => "Error checking table existence: " . $e->getMessage(),
                        'data' => []
                    ], 500);
                }
                
                // Build the query with the properly formatted table name
                $query = DB::table(DB::raw($fullTableName));
                
                // Add search condition if search term exists
                if (!empty($searchTerm)) {
                    $query->where($displayColumn, 'LIKE', "%{$searchTerm}%");
                }
                
                // If we have preselected values, make sure they're included in the results
                if (!empty($preselected)) {
                    $query->orWhereIn($valueColumn, $preselected);
                }
                
                // Handle count-only requests for dataset size detection
                if ($countOnly) {
                    $totalCount = $query->count();
                    return response()->json([
                        'status' => true,
                        'total_count' => $totalCount,
                        'is_large_dataset' => $totalCount > 500,
                        'data' => [] // No data needed for count-only
                    ]);
                }
                
                // Get paginated results
                $results = $query->select([
                    $valueColumn . ' as value',
                    $displayColumn . ' as view',
                    DB::raw('0 as is_selected') // Add is_selected for Select2
                ])
                ->orderBy($displayColumn)
                ->paginate($perPage, ['*'], 'page', $page);
                
                // Mark preselected items
                if (!empty($preselected)) {
                    $results->getCollection()->transform(function ($item) use ($preselected) {
                        $item->is_selected = in_array($item->value, $preselected) ? 1 : 0;
                        return $item;
                    });
                }
                
                // Format the response for Select2
                $formattedResults = [
                    'status' => true,
                    'data' => $results->items(),
                    'pagination' => [
                        'more' => $results->hasMorePages()
                    ]
                ];
                
                return response()->json($formattedResults);
            }
            
            // Handle token-based request if no table specified
            if ($hasToken) {
                Developer::info("Processing token-based select request", ['token' => $token]);
                try {
                    $reqSet = Skeleton::resolveToken($token);
                    Developer::info("Token resolved successfully", ['reqSet' => $reqSet]);
                } catch (Exception $e) {
                    Developer::error("Token resolution failed", [
                        'token' => $token,
                        'error' => $e->getMessage()
                    ]);
                    return response()->json(['status' => false, 'message' => 'Token resolution failed'], 400);
                }
            }
            Developer::info('chanduuuuuuuu');

            Developer::info('Select request details', [
                'request_all' => $request->all(),
                'token' => $token,
                'hasToken' => $hasToken,
                'selectedValue' => $selectedValue,
                'reqSet' => $reqSet
            ]);
            // Fallback: allow plain table + columns without token for large datasets
            if (!isset($reqSet['table']) || !isset($reqSet['value'])) {
                $plainTable = $request->input('table');
                $plainColumns = $request->input('columns', 'id|name');
                if ($plainTable) {
                    $reqSet = [
                        'system' => Skeleton::getUserSystem(),
                        'table'  => $plainTable,
                        'value'  => is_string($plainColumns) ? $this->parseColumns($plainColumns) : ($plainColumns ?: ['id' => 'name'])
                    ];
                } else {
                    Developer::warning('SelectCtrl: Invalid token configuration and no table provided', [
                        'token' => $token,
                        'reqSet' => $reqSet
                    ]);
                    return response()->json(['status' => false, 'message' => 'Invalid configuration'], 400);
                }
            }

            // Handle special cases for database and column listing
            if (isset($reqSet['key']) && $reqSet['key'] === 'central_unique_database' && $selectedValue) {
                Developer::info('Processing central_unique_database request', [
                    'selectedValue' => $selectedValue,
                    'reqSet' => $reqSet
                ]);
                
                $tables = DB::select("
                    SELECT table_name as name
                    FROM information_schema.tables 
                    WHERE table_schema = ?
                    AND table_type = 'BASE TABLE'
                ", [$selectedValue]);

                $data = array_map(function ($table) use ($preselected, $selectedValue) {
                    return [
                        'value' => $selectedValue . '.' . $table->name,
                        'view' => $table->name,
                        'is_selected' => $preselected ? in_array($table->name, $preselected) : false
                    ];
                }, $tables);
                
                Developer::info('Database tables found', [
                    'database' => $selectedValue,
                    'tables_count' => count($data),
                    'tables' => $data
                ]);
                
                return response()->json(['status' => true, 'data' => $data]);
            }
            if (isset($reqSet['key']) && $reqSet['key'] === 'central_unique_columns' && $selectedValue) {
                [$database, $table] = explode('.', $selectedValue);
                $columns = DB::select("
                    SELECT column_name as name
                    FROM information_schema.columns 
                    WHERE table_schema = ?
                    AND table_name = ?
                ", [$database, $table]);

                $data = array_map(function ($column) use ($preselected) {
                    return [
                        'value' => $column->name,
                        'view' => $column->name,
                        'is_selected' => $preselected ? in_array($column->name, $preselected) : false
                    ];
                }, $columns);
                return response()->json(['status' => true, 'data' => $data]);
            }

            // Build conditions for standard table queries
            $condition = ['where' => [], 'token' => $token];
            if ($selectedValue && isset($reqSet['column']) && isset($reqSet['value'])) {
                $columnsData = is_string($reqSet['value']) ? $this->parseColumns($reqSet['value']) : ($reqSet['value'] ?? ['id' => 'name']);
                $condition['where'][$reqSet['column']] = $selectedValue;
            }
            if ($searchTerm) {
                $condition['search'] = $searchTerm;
            } elseif ($initialLoad) {
                $condition['initial_load'] = true;
            }
            $condition['limit'] = $perPage;
            $condition['offset'] = ($page - 1) * $perPage;

            $results = $this->options(
                tokenOrTable: isset($reqSet['table']) && !$hasToken ? $reqSet['table'] : $token,
                output: 'json',
                columns: $reqSet['value'] ?? null,
                condition: $condition,
                selected: $preselected
            );

            return response()->json([
                'status' => true,
                'data' => $results['data'],
                'pagination' => ['more' => $results['has_more']]
            ]);
        } catch (Exception $e) {
            Developer::error('SelectCtrl: Error fetching dropdown data', [
                'token' => $params['token'] ?? 'undefined',
                'error' => $e->getMessage(),
                'request' => $request->except(['password', 'token'])
            ]);
            return response()->json(['status' => false, 'message' => 'Failed to fetch dropdown data'], 500);
        }
    }

    /**
     * Parse columns string into an array (e.g., 'module_id|name' to ['module_id' => 'name']).
     *
     * @param string $columns Column string in 'idColumn|valueColumn' or JSON format
     * @return array Parsed columns array
     */
    private function parseColumns(string $columns): array
    {
        if (empty($columns)) {
            return ['id' => 'name'];
        }
        // Try JSON parsing first (for backward compatibility)
        $decoded = json_decode($columns, true);
        if (is_array($decoded) && !empty($decoded)) {
            return $decoded;
        }
        // Parse 'idColumn|valueColumn' format
        if (strpos($columns, '|') !== false) {
            [$idColumn, $valueColumn] = explode('|', $columns, 2);
            $idColumn = trim($idColumn);
            $valueColumn = trim($valueColumn) ?: $idColumn;
            if ($idColumn) {
                return [$idColumn => $valueColumn];
            }
        }
        Developer::warning('SelectCtrl: Invalid columns format, using default', [
            'columns' => $columns
        ]);
        return ['id' => 'name'];
    }

    /**
     * Generate dropdown options based on system, table, or token, and output format using Data facade.
     *
     * @param string $tokenOrTable Token or table name
     * @param string $output Output format ('html', 'array', or 'json')
     * @param array|string|null $columns Column mapping for value and display
     * @param array|null $condition Where conditions
     * @param array|null $selected Array of keys to mark as selected
     * @return string|array HTML options string, associative array, or array with data and pagination info
     * @throws Exception
     */
    public function options(string $tokenOrTable, string $output, $columns = null, ?array $condition = [], ?array $selected = null)
    {
        try {
            $system = Skeleton::getUserSystem();
            if (!in_array($output, ['html', 'array', 'json'], true)) {
                throw new Exception('Invalid output format. Must be "html", "array", or "json".');
            }
            $table = $tokenOrTable;
            $reqSet = [];
            $tokenLength = config('skeleton.token_length', 27);
            if (
                strlen(substr($tokenOrTable, 0, strrpos($tokenOrTable, '_'))) === $tokenLength &&
                substr_count($tokenOrTable, '_') >= 3
            ) {
                $reqSet = Skeleton::resolveToken($tokenOrTable);
                if (!isset($reqSet['key']) || !isset($reqSet['table']) || !isset($reqSet['value'])) {
                    throw new Exception('Invalid token configuration.');
                }
                $table = $reqSet['table'];
                $system = $reqSet['system'];
                $columns = $columns ?? $reqSet['value'];
            }
            if (empty($table)) {
                throw new Exception('Table name or valid token is required.');
            }
            if (is_string($columns)) {
                $columns = $this->parseColumns($columns);
            }
            if (!is_array($columns) || empty($columns)) {
                $columns = ['id' => 'name'];
                Developer::warning('SelectCtrl: Invalid or empty columns, using default', [
                    'token_or_table' => $tokenOrTable,
                    'original_columns' => $columns
                ]);
            }
            $idColumn = key($columns);
            $valueColumn = reset($columns);
            // Pass token in condition for DataService to resolve columns
            $condition['token'] = $tokenOrTable;
            $data = Data::get($system, $table, $condition)['data'] ?? [];
            $totalRecords = Data::count($system, $table, $condition);
            $results = array_map(function ($row) use ($idColumn, $valueColumn, $selected) {
                $id = isset($row[$idColumn]) ? htmlspecialchars((string)$row[$idColumn]) : '';
                $text = isset($row[$valueColumn]) ? htmlspecialchars((string)$row[$valueColumn]) : '';
                $isSelected = $selected ? in_array((string)$id, array_map('strval', $selected), true) : false;
                return [
                    'id' => $id,
                    'text' => $text,
                    'value' => $id,
                    'view' => $text,
                    'is_selected' => $isSelected,
                ];
            }, $data);
            if (config('skeleton.developer_mode')) {
                Developer::debug('SelectCtrl: Options generated', [
                    'system' => $system,
                    'table' => $table,
                    'token' => strlen($tokenOrTable) === $tokenLength ? $tokenOrTable : 'not a token',
                    'output' => $output,
                    'columns' => $columns,
                    'condition' => $condition,
                    'selected' => $selected,
                    'results_count' => count($results),
                    'total_records' => $totalRecords,
                    'sample_result' => $results ? array_slice($results, 0, 3) : [],
                ]);
            }
            if ($output === 'json') {
                return [
                    'data' => array_map(function ($item) {
                        return [
                            'value' => $item['value'],
                            'view' => $item['view'],
                            'is_selected' => $item['is_selected'],
                        ];
                    }, $results),
                    'has_more' => ($condition['offset'] + $condition['limit']) < $totalRecords
                ];
            }
            if ($output === 'array') {
                $assoc = [];
                foreach ($results as $item) {
                    $assoc[$item['value']] = $item['view'];
                }
                return $assoc;
            }
            $html = '';
            foreach ($results as $result) {
                $selectedAttr = $result['is_selected'] ? ' selected' : '';
                $html .= sprintf(
                    '<option value="%s"%s>%s</option>',
                    $result['value'],
                    $selectedAttr,
                    $result['view']
                );
            }
            return $html;
        } catch (Exception $e) {
            Developer::error('SelectCtrl: Error generating options', [
                'system' => $system ?? 'undefined',
                'token_or_table' => $tokenOrTable,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}