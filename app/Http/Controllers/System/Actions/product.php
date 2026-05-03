<?php

namespace App\Http\Controllers\System\Actions;

use App\Facades\{Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use Illuminate\Http\{Request, JsonResponse};
use Illuminate\Support\Facades\{Config, Log, DB};
use Exception;

/**
 * Controller for handling dynamic and static Product dropdown data.
 */
class Product extends Controller
{
    /**
     * Handle AJAX requests for Product dropdown data (dynamic or static).
     *
     * @param Request $request HTTP request object.
     * @param array $params Route parameters with token.
     * @return JsonResponse Dropdown data or error message.
     */
    public function index(Request $request, array $params = []): JsonResponse
    {
        \Log::info('Product options request:', [
            'params' => $params,
            'request' => $request->all(),
            'full_url' => $request->fullUrl()
        ]);

        try {
            $token = $params['token'] ?? $request->input('skeleton_token');
            $reqSet = [];
            $hasToken = is_string($token) && !empty($token);

            $searchTerm = $request->input('q', '');
            $page = max(1, (int)$request->input('page', 1));
            $perPage = min(50, max(10, (int)$request->input('per_page', 10)));
            $preselected = $request->input('selected') ? (array)$request->input('selected') : [];
            $table = $request->input('table');
            $columns = $request->input('columns', 'id|name');
            
            // Handle table-based request directly
            if ($table) {
                // Handle database.table format and clean table name
                $tableParts = explode('.', $table);
                $tableName = end($tableParts);
                $databaseName = count($tableParts) > 1 ? $tableParts[0] : null;
                
                // Clean table and database names to prevent SQL injection
                // If table name contains a dot, split into database and table
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
                
                // Log the query details for debugging
                \Log::info('Product query details', [
                    'table' => $fullTableName,
                    'columns' => $columns,
                    'searchTerm' => $searchTerm,
                    'preselected' => $preselected
                ]);
                
                // Parse columns if they're in 'id|name' format
                $columnParts = explode('|', $columns);
                $valueColumn = $columnParts[0];
                $displayColumn = $columnParts[1] ?? $valueColumn;
                
                // Clean column names
                $valueColumn = preg_replace('/[^a-zA-Z0-9_]/', '', $valueColumn);
                $displayColumn = preg_replace('/[^a-zA-Z0-9_]/', '', $displayColumn);
                
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
                
                \Log::info('Product options response:', [
                'table' => $fullTableName,
                'search' => $searchTerm,
                'results_count' => count($formattedResults['data'])
            ]);

            return response()->json($formattedResults);
            }
            
            // Handle token-based request if no table specified
            if ($hasToken) {
                Developer::info("Processing token-based product request", ['token' => $token]);
                $reqSet = Skeleton::resolveToken($token);
            }

            Developer::info('chanduuuuuuuu');

            Developer::info($request->all());
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
                    Developer::warning('ProductCtrl: Invalid token configuration and no table provided', [
                        'token' => $token,
                        'reqSet' => $reqSet
                    ]);
                    return response()->json(['status' => false, 'message' => 'Invalid configuration'], 400);
                }
            }

            // Handle special cases for database and column listing
            if (isset($reqSet['key']) && $reqSet['key'] === 'central_unique_database' && $selectedValue) {
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
                Developer::info($data);
                return response()->json(['status' => true, 'data' => $data]);
            }
            if ($reqSet['key'] === 'central_unique_columns' && $selectedValue) {
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
        } catch (\Exception $e) {
            \Log::error('ProductCtrl: Error fetching dropdown data', [
                'token' => $token ?? 'undefined',
                'error' => $e->getMessage(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString(),
                'table' => $fullTableName ?? 'not set',
                'query' => isset($query) ? $query->toSql() : 'Query not built',
                'bindings' => isset($query) ? $query->getBindings() : []
            ]);

            // For database errors, provide a more user-friendly message
            if ($e instanceof \Illuminate\Database\QueryException) {
                return response()->json([
                    'status' => false,
                    'message' => 'Database error occurred while fetching data',
                    'error' => 'Unable to connect to the specified table. Please check the table name and try again.'
                ], 500);
            }

            return response()->json([
                'status' => false,
                'message' => 'Error fetching dropdown data',
                'error' => $e->getMessage()
            ], 500);
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
        Developer::warning('ProductCtrl: Invalid columns format, using default', [
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
                Developer::warning('ProductCtrl: Invalid or empty columns, using default', [
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
                Developer::debug('ProductCtrl: Options generated', [
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
            Developer::error('ProductCtrl: Error generating options', [
                'system' => $system ?? 'undefined',
                'token_or_table' => $tokenOrTable,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}