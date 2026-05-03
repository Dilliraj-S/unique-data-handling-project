<?php

namespace App\Http\Controllers\System\Central\Filters;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request, Response};
use Illuminate\Support\Facades\{Config, Validator, DB, Cache, Log};
use App\Events\CountEvent;
use App\Jobs\ProcessMappingJob;
use Illuminate\Support\Facades\Queue;

/**
 * Controller for saving new Filters entities.
 */
class FormCtrl extends Controller
{
    /**
     * Saves new Filters entity data based on validated input.
     *
     * @param Request $request HTTP request with form data and token
     * @return JsonResponse Success or error message
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $request->input('save_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            // Add detailed logging for token resolution
            Log::info('Resolving token: ' . $token);
            Log::info('Resolved token set: ' . json_encode($reqSet));
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            // Initialize variables
            $byMeta = $timestampMeta = $reloadTable = true;
            $validated = [];
            $title = 'Success';
            $message = 'Data saved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add logging to capture token and action
            Log::info('Token: ' . $token . ', Action: ' . $request->input('action'));
            // Handle different configuration keys
            switch ($reqSet['key']) {
                case 'central_filters_mapping':
                    $action = $request->input('action');
                    
                    switch ($action) {
                        case 'get_tables':
                            return $this->getTables($request);
                            
                        case 'get_table_fields':
                            return $this->getTableFields($request);
                            
                        case 'upload_csv':
                            return $this->uploadCsvFile($request);
                            
                        case 'process_mapping':
                            return $this->processMapping($request);
                            
                        case 'get_mapping_progress':
                            return $this->getMappingProgress($request);
                            
                        case 'cancel_mapping':
                            return $this->cancelMapping($request);
                            
                        case 'download_mapping_results':
                            return $this->downloadMappingResults($request);
                            
                        case 'get_mapping_preview':
                            return $this->getMappingPreview($request);
                            
                        default:
                            return ResponseHelper::moduleError('Invalid Action', 'The specified action is not supported.', 400);
                    }
                    
                case 'central_unique_get_count':
                    $validator = Validator::make($request->all(), [
                        'processId' => 'required|string|max:255',
                        'type' => 'required|string|max:255',
                    ]);

                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Failed', $validator->errors()->first(), 422);
                    }

                    $validated = $validator->validated();
                    $type = $validated['type'];

                    // SQL and Bindings from request
                    $totalSql = $request->input('total_comapanies');
                    $filteredSql = $request->input('filtered_companies');

                    $totalBindings = json_decode($request->input('total_bindings', '[]'), true);
                    $filteredBindings = json_decode($request->input('filtered_bindings', '[]'), true);
                    $cacheKey = "{$type}_counts";
                    try {
                        if ($type === 'total_companies') {
                            $result = collect(DB::select($totalSql, $totalBindings))->first();
                        } else {
                            $result = collect(DB::select($filteredSql, $filteredBindings))->first();
                        }

                        $count = (int)($result->count ?? 0);

                        Cache::put($cacheKey, $count, now()->addHours(12));
                        $userId = Skeleton::getAuthenticatedUser()->id;
                        broadcast(new CountEvent($userId, $request->processId, $type, $count))->toOthers();
                        return response()->json([
                            'status' => true,
                            'token' => $reqSet['token'] ?? null,
                            'title' => 'Success',
                            'message' => "Count $count fetched successfully",
                            'count' => $count,
                        ]);
                    } catch (\Exception $e) {
                        return ResponseHelper::moduleError('Query Failed', $e->getMessage(), 500);
                    }



                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add metadata
            if ($byMeta || $timestampMeta) {
                if ($byMeta) {
                    $validated['created_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
                if ($timestampMeta) {
                    $validated['created_at'] = $validated['updated_at'] = now();
                }
            }
            // Insert data
            $result = Data::create('central', $reqSet['table'], $validated);
            // Generate response
            return response()->json([
                'status' => $result['status'],
                'reload_table' => $reloadTable,
                'token' => $reqSet['token'],
                'affected' => $result['status'] ? $result['data']['id'] : '-',
                'title' => $result['status'] ? $title : 'Failed',
                'message' => $result['status'] ? $message : $result['message']
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.', 500);
        }
    }
    
    private function getTableFields(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'database' => 'required|string|max:255',
                'table' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                Log::error('getTableFields validation failed: ' . $validator->errors()->first());
                return ResponseHelper::moduleError('Validation Failed', $validator->errors()->first(), 422);
            }

            $database = $request->input('database');
            $table = $request->input('table');
            
            Log::info("Raw input - Database: '{$database}', Table: '{$table}'");
            
            // Handle case where table might be in format "database.table"
            if (strpos($table, '.') !== false) {
                $tableParts = explode('.', $table);
                if (count($tableParts) == 2) {
                    $actualDatabase = $tableParts[0];
                    $actualTable = $tableParts[1];
                    
                    // Use the database from the table name if it's different from the passed database
                    // or if the passed database matches the prefix
                    if ($database === $actualDatabase || empty($database)) {
                        $database = $actualDatabase;
                        $table = $actualTable;
                        Log::info("Parsed table name - Database: '{$database}', Table: '{$table}'");
                    } else {
                        Log::warning("Database mismatch - Passed: '{$database}', From table: '{$actualDatabase}'. Using passed database.");
                        // Keep original database but extract just the table name
                        $table = $actualTable;
                    }
                }
            }
            
            Log::info("Fetching fields for table: {$database}.{$table}");

            $fields = $this->getTableFieldsInternal($database, $table);
            
            Log::info("Retrieved " . count($fields) . " fields for {$database}.{$table}: " . implode(', ', $fields));

            return response()->json([
                'status' => true,
                'fields' => $fields,
                'database' => $database,
                'table' => $table,
                'message' => 'Fields retrieved successfully'
            ]);

        } catch (Exception $e) {
            $database = $request->input('database', 'unknown');
            $table = $request->input('table', 'unknown');
            Log::error("Failed to retrieve fields for {$database}.{$table}: " . $e->getMessage());
            Log::error("Exception details: " . $e->getTraceAsString());
            return ResponseHelper::moduleError('Database Error', 'Failed to retrieve fields: ' . $e->getMessage(), 500);
        }
    }

    private function getTableFieldsInternal(string $database, string $table): array
    {
        try {
            // Validate database and table names to prevent SQL injection
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $database) || !preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
                throw new Exception('Invalid database or table name format');
            }
            
            Log::info("Executing SHOW COLUMNS for {$database}.{$table}");
            $fields = DB::select("SHOW COLUMNS FROM `{$database}`.`{$table}`");
            
            $fieldNames = array_map(function($field) {
                return $field->Field;
            }, $fields);
            
            Log::info("Found fields: " . implode(', ', $fieldNames));
            return $fieldNames;
            
        } catch (Exception $e) {
            Log::error("Error getting table fields for {$database}.{$table}: " . $e->getMessage());
            Developer::error("Error getting table fields for {$database}.{$table}: " . $e->getMessage());
            
            // Return empty array or throw a more user-friendly error
            throw new Exception("Unable to retrieve fields from table '{$table}' in database '{$database}'. Please check if the table exists and you have proper permissions. Error: " . $e->getMessage());
        }
    }

    private function uploadCsvFile(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'mapped_database' => 'required|string|max:255',
                'csv_file' => 'required|file',
                'new_table_name' => 'nullable|string|max:190',
            ]);

            if ($validator->fails()) {
                return ResponseHelper::moduleError('Validation Failed', $validator->errors()->first(), 422);
            }

            // Use the user-selected target database
            $database = $request->input('mapped_database');
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $database)) {
                return ResponseHelper::moduleError('Invalid Database', 'Invalid database name.', 400);
            }

            $file = $request->file('csv_file');
            $originalName = $file->getClientOriginalName();
            $extension = strtolower($file->getClientOriginalExtension());

            if ($extension !== 'csv') {
                return ResponseHelper::moduleError('Unsupported File', 'Only CSV is supported at the moment.', 422);
            }

            // Compute table name
            $baseName = $request->input('new_table_name');
            if ($baseName) {
                $baseName = preg_replace('/[^a-zA-Z0-9_]+/', '_', $baseName);
            } else {
                $safeFile = preg_replace('/[^a-zA-Z0-9_]+/', '_', pathinfo($originalName, PATHINFO_FILENAME));
                $baseName = 'map_' . date('Ymd_His') . '_' . strtolower($safeFile ?: 'upload');
            }
            $table = substr($baseName, 0, 64);

            // Read CSV
            $tmpPath = $file->getRealPath();
            $handle = fopen($tmpPath, 'r');
            if ($handle === false) {
                return ResponseHelper::moduleError('File Error', 'Unable to open uploaded file.', 422);
            }

            $headers = [];
            $rows = [];
            $line = 0;
            while (($data = fgetcsv($handle)) !== false) {
                if ($line === 0) {
                    $headers = $data;
                } else {
                    $rows[] = $data;
                }
                $line++;
            }
            fclose($handle);

            if (empty($headers)) {
                return ResponseHelper::moduleError('Invalid File', 'No header row detected in the CSV.', 422);
            }

            // Sanitize and ensure unique column names
            $sanitized = [];
            $taken = [];
            foreach ($headers as $col) {
                $name = strtolower(trim((string)$col));
                $name = preg_replace('/[^a-z0-9_]+/i', '_', $name);
                $name = trim($name, '_');
                if ($name === '' || is_numeric($name)) {
                    $name = 'col';
                }
                $base = $name;
                $i = 1;
                while (in_array($name, $taken, true)) {
                    $name = $base . '_' . $i;
                    $i++;
                }
                $taken[] = $name;
                $sanitized[] = $name;
            }

            // Type inference
            $types = [];
            for ($i = 0; $i < count($sanitized); $i++) {
                $colValues = array_filter(array_column($rows, $i), function ($v) {
                    return $v !== null && $v !== '';
                });
                if (empty($colValues)) {
                    $types[$i] = 'TEXT';
                    continue;
                }
                $allInt = true;
                $allFloat = true;
                $allDate = true;
                foreach ($colValues as $v) {
                    if (!is_numeric($v) || (int)$v != $v) $allInt = false;
                    if (!is_numeric($v)) $allFloat = false;
                    if (!strtotime($v)) $allDate = false;
                }
                if ($allInt) {
                    $types[$i] = 'BIGINT';
                } elseif ($allFloat) {
                    $types[$i] = 'DOUBLE';
                } elseif ($allDate) {
                    $types[$i] = 'DATETIME';
                } else {
                    $types[$i] = 'TEXT';
                }
            }

            // Create table with inferred types
            $qualifiedTable = "`{$database}`.`{$table}`";
            $columnsSql = [];
            for ($i = 0; $i < count($sanitized); $i++) {
                $columnsSql[] = "`{$sanitized[$i]}` {$types[$i]} NULL";
            }
            $ddl = "CREATE TABLE IF NOT EXISTS {$qualifiedTable} (\n                `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\n                " . implode(",\n                ", $columnsSql) . ",\n                PRIMARY KEY (`id`)\n            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            DB::statement($ddl);

            // Bulk insert with fallback to per-row on error for better error reporting
            $rowsInserted = 0;
            $rowsFailed = 0;
            if (!empty($rows)) {
                $chunkSize = 500;
                $placeholders = '(' . implode(',', array_fill(0, count($sanitized), '?')) . ')';
                $insertSql = "INSERT INTO {$qualifiedTable} (" . implode(',', array_map(function ($c) { return "`{$c}`"; }, $sanitized)) . ") VALUES ";

                for ($offset = 0; $offset < count($rows); $offset += $chunkSize) {
                    $chunk = array_slice($rows, $offset, $chunkSize);
                    $valuesSql = [];
                    $bindings = [];
                    foreach ($chunk as $r) {
                        $r = array_slice(array_pad($r, count($sanitized), null), 0, count($sanitized));
                        $valuesSql[] = $placeholders;
                        foreach ($r as $v) {
                            $bindings[] = is_string($v) ? trim($v) : $v;
                        }
                    }
                    if (!empty($valuesSql)) {
                        try {
                            DB::insert($insertSql . implode(',', $valuesSql), $bindings);
                            $rowsInserted += count($chunk);
                        } catch (\Exception $e) {
                            // Fallback to per-row inserts to count failures
                            foreach ($chunk as $r) {
                                try {
                                    $rowBindings = [];
                                    foreach (array_slice(array_pad($r, count($sanitized), null), 0, count($sanitized)) as $v) {
                                        $rowBindings[] = is_string($v) ? trim($v) : $v;
                                    }
                                    DB::insert($insertSql . $placeholders, $rowBindings);
                                    $rowsInserted++;
                                } catch (\Exception $inner) {
                                    $rowsFailed++;
                                }
                            }
                        }
                    }
                }
            }

            $totalRows = count($rows);
            $finalInserted = $rowsInserted ?: $totalRows; // If bulk insert succeeded, rowsInserted may be 0; fallback to total
            return response()->json([
                'status' => true,
                'title' => 'Table Created',
                'message' => "Created {$qualifiedTable} and imported {$finalInserted} of {$totalRows} rows" . ($rowsFailed ? ", {$rowsFailed} failed" : '.'),
                'database' => $database,
                'table' => $table,
                'headers' => $sanitized,
                'rows_inserted' => $finalInserted,
                'rows_failed' => $rowsFailed,
            ]);
        } catch (Exception $e) {
            Log::error('uploadCsvFile error: ' . $e->getMessage());
            Log::error('Exception trace: ' . $e->getTraceAsString());
            Log::error('Request data that caused error: ' . json_encode($request->all()));
            return ResponseHelper::moduleError('Upload Error', $e->getMessage(), 500);
        }
    }
    
    private function processMapping(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'main_database' => 'required|string|max:255',
                'main_table' => 'required|string|max:255',
                'mapped_database' => 'required|string|max:255',
                'mapped_table' => 'required|string|max:255',
                'field_mappings' => 'required|array|min:1',
                'field_mappings.*.main' => 'required|string|max:255',
                'field_mappings.*.mapped' => 'required|string|max:255',
                'result_type_1' => 'required|string|in:all_mapped,common,not_in_main',
                'result_type_2' => 'required|string|in:all_matched,all_empty,all_non_empty',
                'empty_type' => 'nullable|string|in:strict,whitespace',
                'custom_filter' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                Log::error('processMapping validation failed: ' . $validator->errors()->first());
                Log::error('Request data: ' . json_encode($request->all()));
                return ResponseHelper::moduleError('Validation Failed', $validator->errors()->first(), 422);
            }

            $validated = $validator->validated();
            
            // Parse table names in case they contain database prefixes
            $mainDatabase = $validated['main_database'];
            $mainTable = $validated['main_table'];
            $mappedDatabase = $validated['mapped_database'];
            $mappedTable = $validated['mapped_table'];
            
            // Handle main table name parsing
            if (strpos($mainTable, '.') !== false) {
                $parts = explode('.', $mainTable);
                if (count($parts) == 2) {
                    $mainDatabase = $parts[0];
                    $mainTable = $parts[1];
                    Log::info("Parsed main table - Database: '{$mainDatabase}', Table: '{$mainTable}'");
                }
            }
            
            // Handle mapped table name parsing
            if (strpos($mappedTable, '.') !== false) {
                $parts = explode('.', $mappedTable);
                if (count($parts) == 2) {
                    $mappedDatabase = $parts[0];
                    $mappedTable = $parts[1];
                    Log::info("Parsed mapped table - Database: '{$mappedDatabase}', Table: '{$mappedTable}'");
                }
            }
            
            // Update validated data with parsed values
            $validated['main_database'] = $mainDatabase;
            $validated['main_table'] = $mainTable;
            $validated['mapped_database'] = $mappedDatabase;
            $validated['mapped_table'] = $mappedTable;
            
            Log::info("Processing mapping - Main: {$mainDatabase}.{$mainTable}, Mapped: {$mappedDatabase}.{$mappedTable}");
            Log::info("Field mappings count: " . count($validated['field_mappings']));
            $userId = Skeleton::getAuthenticatedUser()->id;
            $processId = Random::string('alnum', 16); // Generate unique process ID

            // Estimate data size to determine processing approach
            $estimatedSize = $this->estimateDataSize($validated);
            
            if ($estimatedSize > 100000) {
                // Use background processing for large datasets
                $mappingConfig = [
                    'main_database' => $validated['main_database'],
                    'main_table' => $validated['main_table'],
                    'mapped_database' => $validated['mapped_database'],
                    'mapped_table' => $validated['mapped_table'],
                    'field_mappings' => $validated['field_mappings'],
                    'result_type_1' => $validated['result_type_1'],
                    'result_type_2' => $validated['result_type_2'],
                    'empty_type' => $validated['empty_type'] ?? 'whitespace',
                    'custom_filter' => $validated['custom_filter'] ?? null
                ];

                // Dispatch background job
                ProcessMappingJob::dispatch($mappingConfig, $userId, $processId);

                return response()->json([
                    'status' => true,
                    'background_processing' => true,
                    'process_id' => $processId,
                    'estimated_size' => $estimatedSize,
                    'title' => 'Processing Started',
                    'message' => "Large dataset detected ({$estimatedSize} records). Processing in background..."
                ]);
            } else {
                // Process small datasets immediately
                Log::info('Processing small dataset immediately');
                return $this->processSmallMapping($validated);
            }

        } catch (Exception $e) {
            Log::error('processMapping error: ' . $e->getMessage());
            Log::error('Exception trace: ' . $e->getTraceAsString());
            Log::error('Request data that caused error: ' . json_encode($validated));
            return ResponseHelper::moduleError('Processing Error', $e->getMessage(), 500);
        }
    }

    private function processSmallMapping(array $config): JsonResponse
    {
        try {
            Log::info('Starting processSmallMapping');
            $mainTable = "`{$config['main_database']}`.`{$config['main_table']}`";
            $mappedTable = "`{$config['mapped_database']}`.`{$config['mapped_table']}`";
            
            Log::info("Main table: {$mainTable}, Mapped table: {$mappedTable}");
            
            // Validate that both tables exist before building query
            Log::info('Validating table existence...');
            try {
                $mainFields = $this->getTableFieldsInternal($config['main_database'], $config['main_table']);
                Log::info('Main table validated - has ' . count($mainFields) . ' fields');
            } catch (Exception $e) {
                throw new Exception("Main table {$mainTable} does not exist or is not accessible: " . $e->getMessage());
            }
            
            try {
                $mappedFields = $this->getTableFieldsInternal($config['mapped_database'], $config['mapped_table']);
                Log::info('Mapped table validated - has ' . count($mappedFields) . ' fields');
            } catch (Exception $e) {
                throw new Exception("Mapped table {$mappedTable} does not exist or is not accessible: " . $e->getMessage());
            }
            
            // Build and execute query
            Log::info('Building mapping query...');
            $query = $this->buildMappingQuery($config);
            Log::info('Generated query: ' . $query);
            
            Log::info('Executing query...');
            
            try {
                $startTime = microtime(true);
                
                // Use Laravel's timeout method instead of MySQL session variable
                $results = DB::select($query);
                
                $executionTime = round((microtime(true) - $startTime) * 1000, 2);
                
                Log::info("Query executed successfully in {$executionTime}ms, got " . count($results) . ' results');
            } catch (\Exception $queryError) {
                Log::error('Query execution failed: ' . $queryError->getMessage());
                Log::error('Failed query: ' . $query);
                throw new Exception('Database query failed: ' . $queryError->getMessage());
            }
            
            $data = array_map(function($row) {
                return (array) $row;
            }, $results);
            
            $outputFields = !empty($data) ? array_keys($data[0]) : [];
            $previewData = array_slice($data, 0, 100); // Default preview: first 100 rows
            $totalRecords = count($data);
            
            return response()->json([
                'status' => true,
                'background_processing' => false,
                'data' => $data,
                'output_fields' => $outputFields,
                'preview_data' => $previewData,
                'total_records' => $totalRecords,
                'title' => 'Processing Complete',
                'message' => "Data processed successfully ({$totalRecords} total records)"
            ]);
        } catch (Exception $e) {
            Log::error('processSmallMapping error: ' . $e->getMessage());
            Log::error('Exception trace: ' . $e->getTraceAsString());
            Log::error('Config that caused error: ' . json_encode($config));
            return ResponseHelper::moduleError('Mapping Processing Error', $e->getMessage(), 500);
        }
    }

    private function buildMappingQuery(array $config): string
    {
        Log::info('buildMappingQuery started with config: ' . json_encode($config));
        
        $mainTable = "`{$config['main_database']}`.`{$config['main_table']}`";
        $mappedTable = "`{$config['mapped_database']}`.`{$config['mapped_table']}`";
        
        Log::info("Building query for main table: {$mainTable}, mapped table: {$mappedTable}");
        
        // Get all main fields
        Log::info('Getting main fields...');
        $mainFields = $this->getTableFieldsInternal($config['main_database'], $config['main_table']);
        Log::info('Main fields retrieved: ' . json_encode($mainFields));
        
        // Validate mapped table exists and get its fields
        Log::info('Getting mapped fields to validate...');
        try {
            $mappedFields = $this->getTableFieldsInternal($config['mapped_database'], $config['mapped_table']);
            Log::info('Mapped fields retrieved: ' . json_encode($mappedFields));
        } catch (Exception $e) {
            $error = "Failed to get fields from mapped table {$mappedTable}: " . $e->getMessage();
            Log::error($error);
            throw new Exception($error);
        }
        
        // Build from explicit pairs
        $pairs = $config['field_mappings'];
        Log::info('Field mappings: ' . json_encode($pairs));
        
        // Validate that all mapped fields in pairs actually exist in the mapped table
        foreach ($pairs as $pair) {
            if (!in_array($pair['mapped'], $mappedFields)) {
                $error = "Mapped field '{$pair['mapped']}' does not exist in table {$mappedTable}";
                Log::error($error);
                throw new Exception($error);
            }
            if (!in_array($pair['main'], $mainFields)) {
                $error = "Main field '{$pair['main']}' does not exist in table {$mainTable}";
                Log::error($error);
                throw new Exception($error);
            }
        }
        
        // IMPORTANT: Build select fields using ALL main table columns (no prefixed headers)
        // This ensures output includes ALL columns from main table with original headers like: id, li_company_name, created_at, email, etc.
        $selectFields = [];
        
        // Include ALL fields from the main table (entire row)
        foreach ($mainFields as $field) {
            $selectFields[] = "m.`{$field}`";
        }
        
        $selectClause = implode(', ', $selectFields);
        
        // Build join conditions for field mappings
        $joinConditions = [];
        foreach ($pairs as $pair) {
            $mainF = $pair['main'];
            $mappedF = $pair['mapped'];
            $joinConditions[] = "m.`{$mainF}` = mp.`{$mappedF}`";
        }
        $onClause = implode(' AND ', $joinConditions);
        
        // Determine base FROM and JOIN based on result_type_1 (Primary - Main-Table Oriented)
        $fromClause = '';
        $baseWhere = '';
        switch ($config['result_type_1']) {
            case 'all_mapped':
                // All Records From Map Table + All Matched Records: Start with main table, INNER JOIN to get only matching records
                $fromClause = "FROM {$mainTable} m INNER JOIN {$mappedTable} mp ON {$onClause}";
                break;
            case 'common':
                // Common Records in Both Tables: INNER JOIN to get only matching records
                $fromClause = "FROM {$mainTable} m INNER JOIN {$mappedTable} mp ON {$onClause}";
                break;
            case 'not_in_main':
                // Records Not-In Main Table: This doesn't make sense when selecting from main table
                // Convert to show all main records that have matches in mapped table
                $fromClause = "FROM {$mainTable} m INNER JOIN {$mappedTable} mp ON {$onClause}";
                break;
            default:
                $fromClause = "FROM {$mainTable} m INNER JOIN {$mappedTable} mp ON {$onClause}";
        }
        
        // Build secondary conditions based on result_type_2 (Secondary - Both-Tables Comparisons)
        $secondaryWhere = '';
        switch ($config['result_type_2']) {
            case 'all_matched':
                // All Matched Records: Filter to only rows where mapped fields have matches in main table
                $matchConditions = [];
                foreach ($pairs as $pair) {
                    $mainF = $pair['main'];
                    $matchConditions[] = "m.`{$mainF}` IS NOT NULL";
                }
                if (!empty($matchConditions)) {
                    $secondaryWhere = (empty($baseWhere) ? ' WHERE ' : ' AND ') . '(' . implode(' AND ', $matchConditions) . ')';
                }
                break;
                
            case 'all_empty':
                // All Empty Records: Rows where mapped fields are empty in either table
                $emptyConditions = [];
                $empty_type = $config['empty_type'] ?? 'whitespace';
                foreach ($pairs as $pair) {
                    $mainF = $pair['main'];
                    $mappedF = $pair['mapped'];
                    if ($empty_type === 'strict') {
                        $mpEmpty = "COALESCE(mp.`{$mappedF}`, '') = ''";
                        $mEmpty = "COALESCE(m.`{$mainF}`, '') = ''";
                    } else { // whitespace
                        $mpEmpty = "LENGTH(TRIM(COALESCE(mp.`{$mappedF}`, ''))) = 0";
                        $mEmpty = "LENGTH(TRIM(COALESCE(m.`{$mainF}`, ''))) = 0";
                    }
                    $emptyConditions[] = "({$mpEmpty} OR {$mEmpty})";
                }
                if (!empty($emptyConditions)) {
                    $secondaryWhere = (empty($baseWhere) ? ' WHERE ' : ' AND ') . '(' . implode(' OR ', $emptyConditions) . ')';
                }
                break;
                
            case 'all_non_empty':
                // All Non-Empty Records: Rows where mapped fields are non-empty in both tables
                $nonEmptyConditions = [];
                foreach ($pairs as $pair) {
                    $mainF = $pair['main'];
                    $mappedF = $pair['mapped'];
                    $mpNonEmpty = "LENGTH(TRIM(COALESCE(mp.`{$mappedF}`, ''))) > 0";
                    $mNonEmpty = "LENGTH(TRIM(COALESCE(m.`{$mainF}`, ''))) > 0";
                    $nonEmptyConditions[] = "({$mpNonEmpty} AND {$mNonEmpty})";
                }
                if (!empty($nonEmptyConditions)) {
                    $secondaryWhere = (empty($baseWhere) ? ' WHERE ' : ' AND ') . '(' . implode(' AND ', $nonEmptyConditions) . ')';
                }
                break;
        }
        
        // Combine WHERE clauses
        $whereClause = $baseWhere . $secondaryWhere;
        
        // Add custom filter if provided
        if (!empty($config['custom_filter'])) {
            $whereClause .= (strpos($whereClause, 'WHERE') !== false ? ' AND ' : ' WHERE ') . $config['custom_filter'];
        }
        
        // Add LIMIT to prevent huge result sets (optimized for performance)
        $limit = $config['limit'] ?? 10000; // Default limit of 10,000 rows
        
        // Full optimized query with LIMIT
        $query = "SELECT {$selectClause} {$fromClause} {$whereClause} LIMIT {$limit}";
        
        Log::info("Final optimized query with LIMIT {$limit}: " . substr($query, 0, 500) . '...');
        
        return $query;
    }

    private function getMappingProgress(Request $request)
    {
        try {
            $processId = $request->input('process_id');
            
            if (!$processId) {
                return ResponseHelper::moduleError('Missing Process ID', 'Process ID is required', 400);
            }

            // Get progress from cache
            $progress = Cache::get("mapping_progress_{$processId}");
            $error = Cache::get("mapping_error_{$processId}");
            $metadata = Cache::get("mapping_metadata_{$processId}");

            if ($error) {
                return response()->json([
                    'status' => false,
                    'error' => $error['error'],
                    'failed_at' => $error['failed_at']
                ]);
            }

            if ($metadata && $metadata['status'] === 'completed') {
                return response()->json([
                    'status' => true,
                    'completed' => true,
                    'progress' => [
                        'percentage' => 100,
                        'message' => 'Processing completed successfully'
                    ],
                    'metadata' => $metadata
                ]);
            }

            if ($progress) {
                return response()->json([
                    'status' => true,
                    'completed' => false,
                    'progress' => $progress
                ]);
            }

            return response()->json([
                'status' => true,
                'completed' => false,
                'progress' => [
                    'percentage' => 0,
                    'message' => 'Initializing...'
                ]
            ]);

        } catch (Exception $e) {
            return ResponseHelper::moduleError('Progress Error', $e->getMessage(), 500);
        }
    }

    private function cancelMapping(Request $request)
    {
        try {
            $processId = $request->input('process_id');
            
            if (!$processId) {
                return ResponseHelper::moduleError('Missing Process ID', 'Process ID is required', 400);
            }

            // Set cancellation flag
            Cache::put("mapping_cancel_{$processId}", true, now()->addHours(2));

            return response()->json([
                'status' => true,
                'message' => 'Mapping process cancellation requested'
            ]);

        } catch (Exception $e) {
            return ResponseHelper::moduleError('Cancellation Error', $e->getMessage(), 500);
        }
    }

    private function downloadMappingResults(Request $request): Response
    {
        try {
            $processId = $request->input('process_id');
            $selectedFields = is_array($request->input('selected_fields')) ? $request->input('selected_fields') : [];
            
            if (!$processId) {
                return ResponseHelper::moduleError('Missing Process ID', 'Process ID is required', 400);
            }

            $metadata = Cache::get("mapping_metadata_{$processId}");
            
            if (!$metadata || $metadata['status'] !== 'completed') {
                return ResponseHelper::moduleError('Invalid Process', 'Process not completed or not found', 404);
            }

            // Use selected fields or all output fields
            $headerFields = !empty($selectedFields) ? $selectedFields : $metadata['output_fields'];
            $filename = "mapping_results_{$processId}_" . date('Y-m-d_H-i-s') . ".csv";
            
            return response()->stream(function() use ($processId, $selectedFields, $metadata) {
                $handle = fopen('php://output', 'w');
                
                // Write CSV header
                fputcsv($handle, $headerFields);
                
                // Stream data from chunks
                $chunkSize = 1000; // Assume chunk size used in job
                for ($chunkIndex = 0; $chunkIndex < $metadata['total_chunks']; $chunkIndex++) {
                    $chunkData = Cache::get("mapping_chunk_{$processId}_{$chunkIndex}");
                    
                    if ($chunkData && is_array($chunkData)) {
                        foreach ($chunkData as $row) {
                            if (!empty($selectedFields)) {
                                $filteredRow = [];
                                foreach ($selectedFields as $field) {
                                    $filteredRow[] = $row[$field] ?? '';
                                }
                                fputcsv($handle, $filteredRow);
                            } else {
                                $outputRow = [];
                                foreach ($headerFields as $field) {
                                    $outputRow[] = $row[$field] ?? '';
                                }
                                fputcsv($handle, $outputRow);
                            }
                        }
                    }
                }
                
                fclose($handle);
            }, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);

        } catch (Exception $e) {
            return ResponseHelper::moduleError('Download Error', $e->getMessage(), 500);
        }
    }

    private function getMappingPreview(Request $request)
    {
        try {
            $processId = $request->input('process_id');
            
            if (!$processId) {
                return ResponseHelper::moduleError('Missing Process ID', 'Process ID is required', 400);
            }

            $metadata = Cache::get("mapping_metadata_{$processId}");
            
            if (!$metadata || $metadata['status'] !== 'completed') {
                return ResponseHelper::moduleError('Invalid Process', 'Process not completed or not found', 404);
            }

            // Get first chunk for preview (up to 100 rows)
            $firstChunk = Cache::get("mapping_chunk_{$processId}_0") ?? [];
            $previewData = array_slice($firstChunk, 0, 100);

            return response()->json([
                'status' => true,
                'preview_data' => $previewData,
                'output_fields' => $metadata['output_fields'],
                'total_records' => $metadata['total_records'] ?? 0,
                'total_chunks' => $metadata['total_chunks'] ?? 0
            ]);

        } catch (Exception $e) {
            return ResponseHelper::moduleError('Preview Error', $e->getMessage(), 500);
        }
    }

    private function estimateDataSize(array $config): int
    {
        try {
            $mainTable = "`{$config['main_database']}`.`{$config['main_table']}`";
            $mappedTable = "`{$config['mapped_database']}`.`{$config['mapped_table']}`";
            
            // Get row counts
            $mainCount = (int) (DB::select("SELECT COUNT(*) as count FROM {$mainTable}")[0]->count ?? 0);
            $mappedCount = (int) (DB::select("SELECT COUNT(*) as count FROM {$mappedTable}")[0]->count ?? 0);
            
            // Estimate based on primary type (secondary filters reduce size, so conservative upper bound)
            switch ($config['result_type_1']) {
                case 'all_mapped':
                    return $mappedCount;
                case 'common':
                    return (int) min($mainCount, $mappedCount) * 0.7; // Assume ~70% overlap
                case 'not_in_main':
                    return (int) $mappedCount * 0.3; // Assume ~30% not matching
                default:
                    return max($mainCount, $mappedCount);
            }
            
        } catch (Exception $e) {
            Developer::error("Error estimating data size: " . $e->getMessage());
            return 100000; // Conservative default to trigger background
        }
    }

    private function getTables(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'database' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                Log::error('getTables validation failed: ' . $validator->errors()->first());
                return ResponseHelper::moduleError('Validation Failed', $validator->errors()->first(), 422);
            }

            $database = $request->input('database');
            
            // Validate database name to prevent SQL injection
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $database)) {
                return ResponseHelper::moduleError('Invalid Database', 'Invalid database name format.', 400);
            }
            
            Log::info("Fetching tables for database: {$database}");

            // Get tables from the specified database
            $tables = DB::select("SHOW TABLES FROM `{$database}`");
            $tableNames = array_map(function($table) use ($database) {
                $key = "Tables_in_{$database}";
                return $table->$key;
            }, $tables);
            
            Log::info("Retrieved " . count($tableNames) . " tables for {$database}: " . implode(', ', $tableNames));

            return response()->json([
                'status' => true,
                'tables' => $tableNames,
                'database' => $database,
                'message' => 'Tables retrieved successfully'
            ]);

        } catch (Exception $e) {
            Log::error("Failed to retrieve tables for {$database}: " . $e->getMessage());
            return ResponseHelper::moduleError('Database Error', 'Failed to retrieve tables: ' . $e->getMessage(), 500);
        }
    }
}