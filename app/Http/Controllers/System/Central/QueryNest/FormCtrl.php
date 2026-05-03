<?php

namespace App\Http\Controllers\System\Central\QueryNest;

use App\Facades\{Data, Developer, Random, Skeleton, Crud};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator, DB};
use Illuminate\Support\Facades\Log;
use Hash;
use Laravel\Pail\ValueObjects\Origin\Console;
use App\Jobs\Import\ImportJob;

/**
 * Controller for saving new QueryNest entities.
 */
class FormCtrl extends Controller
{
    /**
     * Saves new QueryNest entity data based on validated input.
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
            // Handle different configuration keys
            switch ($reqSet['key']) {
                case 'central_unique_import':
                    // Validate input
                    $validator = Validator::make($request->all(), [
                        'file' => 'required|string',
                        'table' => 'required|string',
                        'mapping' => 'required',
                        'process_id' => 'required|string',
                        'type' => 'required|string',
                    ]);

                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }

                    $validated = $validator->validated();
                    $file = $validated['file'];
                    $type = $validated['type'];
                    $rawPath = storage_path("app/private/" . $file);
                    if (!file_exists($rawPath)) {
                        return response()->json([
                            'status' => false,
                            'message' => 'CSV file not found.',
                        ], 404);
                    }

                    $fullTable = $validated['table']; // e.g., 'sun.master_leads'
                    $mapping = json_decode($validated['mapping'], true);
                    // \Log::info($mapping);
                    if (!is_array($mapping)) {
                        return response()->json([
                            'status' => false,
                            'message' => 'Invalid mapping format.',
                        ], 422);
                    }

                    $userId = auth()->id();
                    $processId = $validated['process_id'];

                    // Dispatch the ImportJob
                    ImportJob::dispatch($userId, $fullTable, $type, $rawPath, $mapping, $processId)->onQueue('high');
                    return response()->json([
                        'status' => true,
                        'title' => 'Queued',
                        'message' => 'Import has started in the background.',
                    ]);
                    break;
                case 'central_unique_update_byselect':
                    try {
                        $validator = Validator::make($request->all(), [
                            'table'        => 'required|string',  // format: "database.table"
                            'header'       => 'required|string',
                            'matchvalue'   => 'required',
                            'updatevalue'  => 'required',
                            'function'     => 'nullable|string'
                        ]);



                        if ($validator->fails()) {

                            return response()->json([
                                'success' => false,
                                'message' => $validator->errors()->first(),
                            ], 422);
                        }

                        $validated = $validator->validated();

                        // Normalize match and update values (handle both arrays and comma-separated strings)
                        $matchValuesRaw = $validated['matchvalue'];
                        $updateValuesRaw = $validated['updatevalue'];

                        $matchValues = is_array($matchValuesRaw)
                            ? $matchValuesRaw
                            : array_map('trim', preg_split('/[\r\n,]+/', $matchValuesRaw, -1, PREG_SPLIT_NO_EMPTY));

                        $updateValues = is_array($updateValuesRaw)
                            ? $updateValuesRaw
                            : array_map('trim', preg_split('/[\r\n,]+/', $updateValuesRaw, -1, PREG_SPLIT_NO_EMPTY));

                        // Parse the table string
                        $parts = explode('.', $validated['table']);
                        if (count($parts) !== 2) {
                            return response()->json([
                                'success' => false,
                                'message' => 'Invalid table format. Use "database.table".',
                            ], 422);
                        }

                        [$database, $table] = $parts;
                        // Call update function
                        $result = Crud::updateField(
                            $database,
                            $table,
                            $validated['header'],
                            $matchValues,
                            $updateValues,
                            $validated['function'] ?? null
                        );

                        $title = 'Update Successful';
                        $message = $result['message'] ?? 'Records updated successfully.';

                        return response()->json([
                            'title' => $result['status'] == true ? 'Success' : 'Failed',
                            'success' => $result['status'],
                            'message' => $result['message'],
                        ]);
                    } catch (Exception $e) {

                        return response()->json([
                            'success' => false,
                            'message' => 'Unexpected error: ' . $e->getMessage(),
                        ], 500);
                    }


                    break;
                case 'central_unique_update_bycsv':
                    try {

                        // Step 1: Determine mode first
                        $mode = $request->input('mode', 'csv');

                        // Step 2: Helper to normalize comma-separated strings or arrays
                        $normalizeColumns = function ($input) {
                            if (is_array($input)) return $input;
                            return is_string($input) ? array_filter(array_map('trim', explode(',', $input))) : [];
                        };

                        // Step 3: Normalize all inputs
                        $csv_file         = $request->file('csv_file');
                        $match_columns    = $normalizeColumns($request->input('match_columns'));
                        $update_columns   = $normalizeColumns($request->input('update_columns'));
                        $to_columns       = $normalizeColumns($request->input('to_columns'));
                        $src_match_cols   = $normalizeColumns($request->input('src_match_cols'));
                        $src_update_cols  = $normalizeColumns($request->input('src_update_cols'));

                        $source_table_raw = $request->input('source_table'); // e.g. moon.users
                        $target_table_raw = $request->input('target_table'); // e.g. earth.people

                        // Step 4: Split "db.table" format into database and table
                        [$source_database, $source_table] = explode('.', $source_table_raw . '.') + [null, null];
                        [$target_database, $target_table] = explode('.', $target_table_raw . '.') + [null, null];

                        // Step 5: Prepare input data conditionally based on mode
                        $input = [
                            'mode' => $mode,
                            'target_database' => $target_database,
                            'target_table' => $target_table,
                            'to_columns' => $to_columns,
                        ];

                        $rules = [
                            'mode' => 'required|in:csv,db',
                            'to_columns' => 'required|array|min:1',
                            'target_database' => 'required|string',
                            'target_table' => 'required|string',
                        ];

                        if ($mode === 'csv') {
                            $input['csv_file'] = $csv_file;
                            $input['match_columns'] = $match_columns;
                            $input['update_columns'] = $update_columns;

                            $rules['csv_file'] = 'required_if:mode,csv|file|mimes:csv,txt|max:102400';
                            $rules['match_columns'] = 'required_if:mode,csv|array|min:1';
                            $rules['update_columns'] = 'required_if:mode,csv|array|min:1';
                        } else {
                            $input['src_match_cols'] = $src_match_cols;
                            $input['src_update_cols'] = $src_update_cols;
                            $input['source_database'] = $source_database;
                            $input['source_table'] = $source_table;

                            $rules['src_match_cols'] = 'required_if:mode,db|array|min:1';
                            $rules['src_update_cols'] = 'required_if:mode,db|array|min:1';
                            $rules['source_database'] = 'required_if:mode,db|string';
                            $rules['source_table'] = 'required_if:mode,db|string';
                        }

                        // Step 6: Validate input
                        $validator = Validator::make($input, $rules, [
                            'mode.required' => 'Mode (csv or db) is required.',
                            'mode.in' => 'Mode must be either "csv" or "db".',
                            'csv_file.required_if' => 'CSV file is required when mode is csv.',
                            'csv_file.file' => 'CSV file must be a valid file.',
                            'csv_file.mimes' => 'CSV file must be a .csv or .txt file.',
                            'csv_file.max' => 'CSV file size must not exceed 100MB.',
                            'match_columns.required_if' => 'Match columns are required for CSV mode.',
                            'update_columns.required_if' => 'Update columns are required for CSV mode.',
                            'to_columns.required' => 'Target columns are required.',
                            'src_match_cols.required_if' => 'Source match columns are required for DB mode.',
                            'src_update_cols.required_if' => 'Source update columns are required for DB mode.',
                            'source_database.required_if' => 'Source database is required for DB mode.',
                            'source_table.required_if' => 'Source table is required for DB mode.',
                        ]);



                        if ($validator->fails()) {
                            Log::warning('Validation failed', [
                                'errors' => $validator->errors()->all(),
                                'input' => $input
                            ]);
                            return response()->json([
                                'success' => false,
                                'message' => $validator->errors()->first(),
                                'errors' => $validator->errors()
                            ], 422);
                        }

                        // Step 7: Call the update logic
                        $result = Crud::updateFieldCSV(
                            $mode,
                            $csv_file,
                            $match_columns,
                            $update_columns,
                            $src_match_cols,
                            $src_update_cols,
                            $source_database,
                            $source_table,
                            $target_database,
                            $target_table,
                            $to_columns
                        );


                        return response()->json([
                            'title' => $result['status'] === 'success' ? 'Success' : 'Failed',
                            'success' => $result['status'] === 'success',
                            'message' => $result['message'],
                        ], $result['code'] ?? 200);
                    } catch (Exception $e) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Unexpected error: ' . $e->getMessage(),
                        ], 500);
                    }
                    break;
                case 'central_unique_delete_byvalue':
                    try {
                        $validator = Validator::make($request->all(), [
                            'database_field1'   => 'required|string',
                            'table_field1'      => 'required|string',
                            'columns_field1'    => 'required', // Accept string or array
                            'match_value'       => 'required|string',
                            'password'          => 'required|string',
                        ]);

                        if ($validator->fails()) {

                            return response()->json([
                                'success' => false,
                                'message' => $validator->errors()->first(),
                            ], 422);
                        }

                        $validated = $validator->validated();
                        $user = Skeleton::getAuthenticatedUser();
                        if (!$user || !Hash::check($validated['password'], $user->password)) {
                            return response()->json([
                                'success' => false,
                                'message' => 'Invalid password.',
                            ], 401);
                        }

                        // Always treat columns_field1 as array
                        $columns = $request->input('columns_field1');
                        if (!is_array($columns)) {
                            $columns = $columns ? [$columns] : [];
                        }
                        if (count($columns) === 0) {
                            return response()->json([
                                'success' => false,
                                'message' => 'At least one column must be selected.',
                            ], 422);
                        }

                        // Parse table name (can be 'table' or 'database.table')
                        $database = $validated['database_field1'];
                        $table = $validated['table_field1'];
                        if (strpos($table, '.') !== false) {
                            [$database, $table] = explode('.', $table, 2);
                        }
                        $matchValue = $validated['match_value'];
                        $matchValues = array_map('trim', explode('|', $matchValue));

                        // Build where clause
                        $whereParts = [];
                        $bindings = [];
                        foreach ($columns as $column) {
                            foreach ($matchValues as $value) {
                                $whereParts[] = "`$column` = ?";
                                $bindings[] = $value;
                            }
                        }
                        $whereSql = implode(' OR ', $whereParts);
                        $sql = "DELETE FROM `{$database}`.`{$table}` WHERE $whereSql";
                        $affected = 0;
                        try {
                            $affected = DB::delete($sql, $bindings);
                        } catch (Exception $e) {
                            return response()->json([
                                'status' => false,
                                'title' => 'Delete Failed',
                                'message' => 'Database error: ' . $e->getMessage(),
                                'affected' => 0,
                            ], 500);
                        }
                        return response()->json([
                            'status' => $affected > 0,
                            'title' => $affected > 0 ? 'Delete Successful' : 'Delete Failed',
                            'message' => $affected > 0 ? "Deleted $affected record(s)." : 'No records found to delete.',
                            'affected' => $affected,
                        ], 200);
                    } catch (Exception $e) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Unexpected error: ' . $e->getMessage(),
                        ], 500);
                    }
                    break;
                case 'central_unique_duplicate':
                    try {
                        $validator = Validator::make($request->all(), [
                            'database_field1'   => 'required|string',
                            'table_field1'      => 'required|string',
                            'base_columns_field' => 'required', // Accept string or array
                            'delete_value'      => 'required|string',
                            'password'          => 'required|string',
                        ]);

                        if ($validator->fails()) {


                            return response()->json([
                                'success' => false,
                                'message' => $validator->errors()->first(),
                            ], 422);
                        }

                        $validated = $validator->validated();
                        $user = Skeleton::getAuthenticatedUser();
                        if (!$user || !Hash::check($validated['password'], $user->password)) {
                            return response()->json([
                                'success' => false,
                                'message' => 'Invalid password.',
                            ], 401);
                        }

                        // Normalize base_columns_field and duplicate_columns_field as arrays
                        $baseColumns = $request->input('base_columns_field');
                        if (!is_array($baseColumns)) {
                            $baseColumns = $baseColumns ? [$baseColumns] : [];
                        }
                        if (count($baseColumns) === 0) {
                            return response()->json([
                                'success' => false,
                                'message' => 'At least one base column must be selected.',
                            ], 422);
                        }
                        $duplicateColumns = $request->input('duplicate_columns_field', []);
                        if (!is_array($duplicateColumns)) {
                            $duplicateColumns = $duplicateColumns ? [$duplicateColumns] : [];
                        }


                        // Parse database and table
                        $database = $validated['database_field1'];
                        $table = $validated['table_field1'];
                        if (strpos($table, '.') !== false) {
                            [$database, $table] = explode('.', $table, 2);
                        }
                        $deleteValue = $validated['delete_value'];


                        // Build join conditions for base columns
                        $joinOn = [];
                        foreach ($baseColumns as $col) {
                            $joinOn[] = "t1.`$col` = t2.`$col`";
                        }
                        $joinOnSql = implode(' AND ', $joinOn);

                        // Build conditions for duplicate columns
                        $extraWheres = [];
                        if (!empty($duplicateColumns)) {
                            foreach ($duplicateColumns as $col) {
                                if ($deleteValue === 'empty') {
                                    $extraWheres[] = "(t1.`$col` IS NULL OR t1.`$col` = '')";
                                } elseif ($deleteValue === 'non_empty') {
                                    $extraWheres[] = "(t1.`$col` IS NOT NULL AND t1.`$col` != '')";
                                }
                            }
                        }
                        $extraWhere = '';
                        if (!empty($extraWheres)) {
                            $extraWhere = ' AND (' . implode(' OR ', $extraWheres) . ')';
                        }

                        // Subquery to find duplicate IDs (keep lowest id)
                        $subquery = "
                            SELECT t1.id
                            FROM `{$database}`.`{$table}` t1
                            JOIN `{$database}`.`{$table}` t2
                            ON {$joinOnSql}
                            AND t2.id < t1.id
                            {$extraWhere}
                        ";

                        $idsToDelete = DB::select("SELECT id FROM ({$subquery}) as sub");
                        $ids = array_map(fn($row) => $row->id, $idsToDelete);

                        $affected = 0;
                        if (!empty($ids)) {
                            $affected = DB::table("{$database}.{$table}")
                                ->whereIn('id', $ids)
                                ->delete();
                        }

                        return response()->json([
                            'status' => $affected > 0,
                            'title' => $affected > 0 ? 'Delete Duplicates Successful' : 'Delete Duplicates Failed',
                            'message' => $affected > 0 ? "Deleted $affected duplicate record(s)." : 'No duplicate records found to delete.',
                            'affected' => $affected,
                        ], 200);
                    } catch (Exception $e) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Unexpected error: ' . $e->getMessage(),
                        ], 500);
                    }
                    break;


                case 'central_unique_deleteby':
                    try {
                        Log::info('Delete by select request data', $request->all());
                        $validator = Validator::make($request->all(), [
                            'database_field1'   => 'required|string',
                            'table_field1'      => 'required|string',
                            'columns_field1'    => 'required|array|min:1',
                            'database_field2'   => 'required|string',
                            'table_field2'      => 'required|string',
                            'columns_field2'    => 'required|array|min:1',
                            'delete_action'     => 'required|in:match_field2,match_field1',
                            'password'          => 'required|string',
                            'commit'            => 'required|in:0,1',
                        ]);

                        if ($validator->fails()) {
                            Log::warning('Validation failed (delete by select)', [
                                'errors' => $validator->errors()->all(),
                                'input'  => $request->all()
                            ]);
                            return response()->json([
                                'success' => false,
                                'message' => $validator->errors()->first(),
                            ], 422);
                        }

                        $validated = $validator->validated();
                        $user = Skeleton::getAuthenticatedUser();
                        if (!$user || !Hash::check($validated['password'], $user->password)) {
                            return response()->json([
                                'success' => false,
                                'message' => 'Invalid password.',
                            ], 401);
                        }

                        $database1 = $validated['database_field1'];
                        $table1 = $validated['table_field1'];
                        // Fix: If table1 contains a dot, split it
                        if (strpos($table1, '.') !== false) {
                            [$database1, $table1] = explode('.', $table1, 2);
                        }
                        $columns1 = $validated['columns_field1'];
                        $database2 = $validated['database_field2'];
                        $table2 = $validated['table_field2'];
                        // Fix: If table2 contains a dot, split it
                        if (strpos($table2, '.') !== false) {
                            [$database2, $table2] = explode('.', $table2, 2);
                        }
                        $columns2 = $validated['columns_field2'];
                        $deleteAction = $validated['delete_action'];
                        $commit = $validated['commit'];

                        if (count($columns1) !== count($columns2)) {
                            return response()->json([
                                'success' => false,
                                'message' => 'The number of columns selected for both fields must be the same.',
                            ], 422);
                        }

                        $isMatchField2 = $deleteAction === 'match_field2';
                        $sourceDatabase = $isMatchField2 ? $database1 : $database2;
                        $sourceTable = $isMatchField2 ? $table1 : $table2;
                        $sourceColumns = $isMatchField2 ? $columns1 : $columns2;
                        $referenceDatabase = $isMatchField2 ? $database2 : $database1;
                        $referenceTable = $isMatchField2 ? $table2 : $table1;
                        $referenceColumns = $isMatchField2 ? $columns2 : $columns1;

                        try {
                            $subQuery = DB::table("{$referenceDatabase}.{$referenceTable}");
                            if (count($sourceColumns) > 1) {
                                $sourceConcat = DB::raw("CONCAT(" . implode(',', $sourceColumns) . ")");
                                $referenceConcat = DB::raw("CONCAT(" . implode(',', $referenceColumns) . ")");
                                $query = DB::table("{$sourceDatabase}.{$sourceTable}")
                                    ->whereIn($sourceConcat, $subQuery->pluck($referenceConcat));
                            } else {
                                $query = DB::table("{$sourceDatabase}.{$sourceTable}")
                                    ->whereIn($sourceColumns[0], $subQuery->select($referenceColumns[0])->distinct());
                            }

                            if ($commit == 0) {
                                $affected = $query->count();
                                Log::info('🟠 Preview delete by select', [
                                    'source' => "{$sourceDatabase}.{$sourceTable}",
                                    'would_delete' => $affected
                                ]);
                                return response()->json([
                                    'status' => true,
                                    'title' => 'Preview Delete',
                                    'message' => "Would delete $affected record(s).",
                                    'affected' => $affected,
                                ], 200);
                            } else {
                                $deletedRecords = $query->delete();
                                Log::info('🗑️ Delete by select result', [
                                    'source' => "{$sourceDatabase}.{$sourceTable}",
                                    'deleted' => $deletedRecords
                                ]);
                                return response()->json([
                                    'status' => $deletedRecords > 0,
                                    'title' => $deletedRecords > 0 ? 'Delete Successful' : 'Delete Failed',
                                    'message' => $deletedRecords > 0 ? "Deleted $deletedRecords record(s)." : 'No records found to delete.',
                                    'affected' => $deletedRecords,
                                ], 200);
                            }
                        } catch (Exception $e) {
                            Log::error('Delete by select failed', [
                                'source' => "{$sourceDatabase}.{$sourceTable}",
                                'reference' => "{$referenceDatabase}.{$referenceTable}",
                                'error' => $e->getMessage()
                            ]);
                            return response()->json([
                                'status' => false,
                                'title' => 'Delete Failed',
                                'message' => 'Database error: ' . $e->getMessage(),
                                'affected' => 0,
                            ], 500);
                        }
                    } catch (Exception $e) {
                        Log::error('Exception in delete by select', ['error' => $e->getMessage()]);
                        return response()->json([
                            'success' => false,
                            'message' => 'Unexpected error: ' . $e->getMessage(),
                        ], 500);
                    }

                    break;

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
}
