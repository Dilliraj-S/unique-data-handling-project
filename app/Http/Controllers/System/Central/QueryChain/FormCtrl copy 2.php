<?php

namespace App\Http\Controllers\System\Central\QueryChain;

use App\Facades\{Data, Developer, Random, Skeleton, Workflow};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ProcessFlowHelper;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator, Log, DB};
use Illuminate\Support\Facades\File;
use PhpOffice\PhpSpreadsheet\Reader\Csv;
use App\Jobs\ProcessFlowJob;

/**
 * Controller for saving new QueryChain entities.
 */
class FormCtrl extends Controller
{
    /**
     * Saves new QueryChain entity data based on validated input.
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
                case 'QueryChain_entities':
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|max:255',
                        'type' => 'required|in:data,unique,select,other',
                        'status' => 'required|in:active,inactive',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Failed', $validator->errors()->first(), 422);
                    }
                    $validated = $validator->validated();
                    $validated['entity_id'] = Random::unique(6, 'ENT');
                    $title = 'Entity Added';
                    $message = 'Entity configuration added successfully.';
                    break;
                case 'central_unique_workflows':
                    try {
                        Log::info('Master Flow Validation Started', [
                            'request_data' => $request->all(),
                            'token' => $reqSet['token']
                        ]);

                        $validator = Validator::make($request->all(), [
                            'process_name' => 'required|string|max:255',
                            'preprocess_id' => 'nullable|string|max:15',
                            'mode' => 'required|in:flow,workflow',
                            'workflows' => 'required|array|min:1',
                            'workflows.*' => 'string',
                            'input_source' => 'required|in:csv,db',
                            'output_target' => 'required|in:csv,excel,db',
                            'csv_file' => 'required_if:input_source,csv|file|mimes:csv,txt|max:819200',
                            'input_db' => 'required_if:input_source,db|string',
                            'input_table' => 'required_if:input_source,db|string',
                            'output_db' => 'required_if:output_target,db|string',
                            'output_table' => 'required_if:output_target,db|string',
                            'base_input_db' => 'nullable|string',
                            'base_input_table' => 'nullable|string',   //see this both base are related to autoflow
                            'add_to_process' => 'nullable|boolean'
                        ]);

                        // AgentHelper::logActivity('Workflow Execution', 'Processed workflow' . $workflowName . '', [$traceEntry]);

                        if ($validator->fails()) {
                            return ResponseHelper::flowError('Validation Error', $validator->errors()->first(), 422);
                        }

                        $validated = $validator->validated();
                        $processMode = $validated['mode'];
                        $normalize = fn($val) => preg_replace('/[^a-z0-9]/', '', strtolower($val));

                        // Check if Autoflows workflow is selected and validate base database/table this is start of autoflow
                        $isAutoflowsSelected = collect($validated['workflows'])->contains(function ($workflowName) {
                            return strtolower($workflowName) === 'autoflows' || 
                                   strtolower($workflowName) === 'auto flows' ||
                                   strtolower($workflowName) === 'autoflow';
                        });

                        if ($isAutoflowsSelected) {
                            if (empty($validated['base_input_db']) || empty($validated['base_input_table'])) {
                                return ResponseHelper::flowError('Autoflows Configuration Required', 
                                    'Base database and table are required for Autoflows workflow.', 422);
                            }

                            // Validate base table exists and has dls_email_number column
                            try {
                                $baseDb = $validated['base_input_db'];
                                $baseTable = $validated['base_input_table'];
                                
                                // Remove database prefix if it exists in table name
                                if (str_contains($baseTable, '.')) {
                                    $baseTable = explode('.', $baseTable)[1];
                                }
                                
                                // Use the correct database connection - just use table name since we're already connected to the database
                                $columns = DB::connection($baseDb)->select("SHOW COLUMNS FROM `{$baseTable}`");
                                $columnNames = array_map(fn($col) => $col->Field, $columns);
                                
                                if (!in_array('dls_email_number', $columnNames)) {
                                    return ResponseHelper::flowError('Invalid Base Table', 
                                        'Base table must contain dls_email_number column for Autoflows workflow.', 422);
                                }
                            } catch (\Exception $e) {
                                return ResponseHelper::flowError('Invalid Base Table', 
                                    'Base table does not exist or cannot be accessed: ' . $e->getMessage(), 422);
                            }
                        }//this is end of autoflow

                        $workflowResponse = Workflow::getFlowsData();
                        $workflowList = $workflowResponse instanceof JsonResponse
                            ? $workflowResponse->getData(true)['data'] ?? []
                            : (array)($workflowResponse['data'] ?? []);
                        $workflows = collect($workflowList)->map(fn($wf) => (array) $wf);

                        $validTypes = $processMode === 'flow' ? ['mf', 'wmf'] : ['wf', 'wmf'];
                        $invalidWorkflows = collect($validated['workflows'])->reject(function ($name) use ($workflows, $validTypes) {
                            $wf = $workflows->firstWhere('name', $name);
                            return $wf && in_array($wf['type'] ?? '', $validTypes);
                        });

                        if ($invalidWorkflows->isNotEmpty()) {
                            return ResponseHelper::flowError("Invalid Workflows", [
                                "The following workflows are invalid for $processMode mode:",
                                $invalidWorkflows->values()
                            ], 422);
                        }

                        // Handle CSV Input
                        if ($validated['input_source'] === 'csv') {
                            $file = $request->file('csv_file');
                            $originalName = preg_replace('/\s+/', '_', $file->getClientOriginalName());
                            $timestampedName = time() . '_' . $originalName;
                            $uploadPath = public_path('uploads');

                            if (!File::exists($uploadPath)) {
                                File::makeDirectory($uploadPath, 0755, true);
                            }

                            $file->move($uploadPath, $timestampedName);
                            $validated['csv_file_name'] = $timestampedName;

                            // Get configuration limits
                            $maxRows = Config::get('large_file_processing.csv_processing.file_split_threshold', 600000);
                            $memoryThreshold = Config::get('large_file_processing.csv_processing.memory_threshold', 600000);
                            
                            try {
                                $filePath = public_path("uploads/{$timestampedName}");
                                $fileSizeMB = round(filesize($filePath) / 1024 / 1024, 2);
                                
                                // Quick file size check (much faster than row counting)
                                $maxSizeMB = Config::get('large_file_processing.csv_processing.max_upload_size_mb', 500);
                                if ($fileSizeMB > $maxSizeMB) {
                                    return ResponseHelper::flowError('File Too Large', 
                                        "The CSV file size ({$fileSizeMB}MB) exceeds the {$maxSizeMB}MB limit.", 422);
                                }

                                // Quick header read (only first line - very fast)
                                $handle = fopen($filePath, 'r');
                                if ($handle === false) {
                                    throw new \Exception("Cannot open CSV file");
                                }
                                $headers = fgetcsv($handle);
                                fclose($handle);
                                
                                if (empty($headers)) {
                                    throw new \Exception("No headers found in CSV file");
                                }
                                
                                $validated['csv_headers'] = $headers;
                                
                                Log::info('CSV File Quick Analysis', [
                                    'file_name' => $timestampedName,
                                    'file_size_mb' => $fileSizeMB,
                                    'headers_count' => count($headers),
                                    'will_process_in_background' => true
                                ]);
                                
                            } catch (\Exception $e) {
                                Log::error('CSV File Analysis Failed', [
                                    'file_name' => $timestampedName,
                                    'error' => $e->getMessage()
                                ]);
                                return ResponseHelper::flowError('CSV Processing Error', 
                                    'Failed to analyze CSV file. Please ensure the file is valid and try again.', 422);
                            }

                            $normalizedHeaders = array_map($normalize, $headers);
                            $required = collect($validated['workflows'])->flatMap(function ($name) use ($workflows) {
                                $wf = $workflows->firstWhere('name', $name);
                                return is_array($wf['required_headers'])
                                    ? $wf['required_headers']
                                    : json_decode($wf['required_headers'] ?? '[]', true);
                            })->unique()->values();

                            $missing = $required->reject(fn($header) => in_array($normalize($header), $normalizedHeaders));
                            if ($missing->isNotEmpty()) {
                                return ResponseHelper::flowError('Missing CSV Headers', [
                                    'The CSV file is missing required columns:',
                                    $missing->values()
                                ], 422);
                            }
                        }

                        // Handle DB Input
                        if ($validated['input_source'] === 'db') {
                            if (!str_contains($validated['input_table'], '.')) {
                                return ResponseHelper::flowError('Invalid Input Table', 'Input table must be in "db.table" format.', 422);
                            }

                            [$inputDb, $inputTable] = explode('.', $validated['input_table']);
                            $allowedDbs = explode(',', Skeleton::getAuthenticatedUser()->access_db ?? '');
                            if (!in_array($validated['input_db'], $allowedDbs)) {
                                return ResponseHelper::flowError('Unauthorized Input DB', 'Not authorized for this input DB.', 403);
                            }

                            $columns = DB::select("SHOW COLUMNS FROM `{$inputDb}`.`{$inputTable}`");
                            $inputCols = array_map(fn($col) => $normalize($col->Field ?? $col['Field']), $columns);

                            $required = collect($validated['workflows'])->flatMap(function ($name) use ($workflows) {
                                $wf = $workflows->firstWhere('name', $name);
                                return is_array($wf['required_headers'])
                                    ? $wf['required_headers']
                                    : json_decode($wf['required_headers'] ?? '[]', true);
                            })->unique()->values();

                            $missing = $required->reject(fn($header) => in_array($normalize($header), $inputCols));
                            if ($missing->isNotEmpty()) {
                                return ResponseHelper::flowError('Missing Input Columns', [
                                    'Missing required columns in input DB table:',
                                    $missing->values()
                                ], 422);
                            }
                        }

                        // Handle DB Output
                        if ($validated['output_target'] === 'db') {
                            if (!str_contains($validated['output_table'], '.')) {
                                return ResponseHelper::flowError('Invalid Output Table', 'Output table must be in "db.table" format.', 422);
                            }

                            [$outputDb, $outputTable] = explode('.', $validated['output_table']);
                            if (!in_array($validated['output_db'], explode(',', Skeleton::getAuthenticatedUser()->access_db ?? ''))) {
                                return ResponseHelper::flowError('Unauthorized Output DB', 'Not authorized for this output DB.', 403);
                            }

                            $columns = DB::select("SHOW COLUMNS FROM `{$outputDb}`.`{$outputTable}`");
                            $outputCols = array_map(fn($col) => $normalize($col->Field ?? $col['Field']), $columns);

                            foreach (['update_headers', 'mapping_headers'] as $key) {
                                $missing = collect($validated['workflows'])->flatMap(function ($name) use ($workflows, $key) {
                                    $wf = $workflows->firstWhere('name', $name);
                                    return is_array($wf[$key])
                                        ? $wf[$key]
                                        : json_decode($wf[$key] ?? '[]', true);
                                })->unique()->reject(fn($header) => in_array($normalize($header), $outputCols));

                                if ($missing->isNotEmpty()) {
                                    return ResponseHelper::flowError("Missing Output Columns", [
                                        "Missing required `$key` in output table:",
                                        $missing->values()
                                    ], 422);
                                }
                            }
                        }

                        // Determine process_id
                        $processId = null;
                        $creatingNew = true;

                        if (!empty($validated['preprocess_id'])) {
                            $exists = DB::table('moon.processes')
                                ->where('process_id', $validated['preprocess_id'])
                                ->exists();

                            if ($exists && $validated['preprocess_id'] !== 'custom') {
                                $processId = $validated['preprocess_id'];
                                $creatingNew = false;
                            } else {
                                $processId = Random::unique(6, 'PROC');
                            }
                        } else {
                            return ResponseHelper::flowError('Invalid Predefined Process ID', 'Provided preprocess_id does not exist.', 422);
                        }

                        // Build Flow Data
                        $flowData = ProcessFlowHelper::buildFlowData($validated, $workflows, $processId);
                        $flowData['process_mode'] = $processMode;

                        // Save/Update Process (only if checkbox checked)
                        if ($processMode === 'flow' && $request->boolean('add_to_process')) {
                            $now = now();
                            $data = [
                                'name' => $validated['process_name'],
                                'flows' => json_encode($flowData['meta']['workflow_map']),
                                'mode' => $processMode,
                                'input_source' => $validated['input_source'],
                                'output_target' => $validated['output_target'],
                                'updated_by' => Skeleton::getAuthenticatedUser()->id ?? 0,
                                'updated_at' => $now,
                            ];

                            if ($creatingNew) {
                                $data['created_by'] = Skeleton::getAuthenticatedUser()->id ?? 0;
                                $data['created_at'] = $now;
                                DB::connection('moon')->table('processes')->insert(array_merge(['process_id' => $processId], $data));
                            } else {
                                DB::connection('moon')->table('processes')
                                    ->where('process_id', $processId)
                                    ->update($data);
                            }
                        }

                        Developer::info('Final Flow Data for Dispatch:', ['flow_data' => $flowData]);

                        dispatch(new ProcessFlowJob($flowData))->onQueue('process_flows');

                        // Return standard response format expected by frontend
                        return response()->json([
                            'status' => true,
                            'reload_table' => false, // No table to reload for workflow processing
                            'token' => $reqSet['token'],
                            'affected' => $processId, // Use process ID as affected identifier
                            'title' => 'Master Flow Started',
                            'message' => 'Flow process has been queued successfully and is now processing in the background. Check "Previous Results" to monitor progress.'
                        ]);
                    } catch (Exception $e) {
                        Log::error('Master Flow Validation Failed: ' . $e->getMessage(), [
                            'error' => $e->getTraceAsString()
                        ]);
                        return response()->json([
                            'status' => false,
                            'reload_table' => false,
                            'token' => $reqSet['token'] ?? '',
                            'affected' => '-',
                            'title' => 'Master Flow Failed',
                            'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Something went wrong. Please try again later.'
                        ], 500);
                    }
                    break; // CRITICAL: Prevent fall-through to default case and database insertion
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

    /**
     * Get actual row count from CSV file using efficient method
     * 
     * @param string $filePath Path to the CSV file
     * @return int Number of data rows (excluding header)
     */
    private function getActualRowCount(string $filePath): int
    {
        if (!file_exists($filePath)) {
            throw new Exception("CSV file not found: {$filePath}");
        }

        $rowCount = 0;
        $handle = fopen($filePath, 'r');
        
        if ($handle === false) {
            throw new Exception("Cannot open CSV file: {$filePath}");
        }

        try {
            // Skip header row
            if (fgetcsv($handle) !== false) {
                // Count data rows
                while (fgetcsv($handle) !== false) {
                    $rowCount++;
                }
            }
        } finally {
            fclose($handle);
        }

        return $rowCount;
    }
}
