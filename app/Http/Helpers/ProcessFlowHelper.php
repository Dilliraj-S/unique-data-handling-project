<?php

namespace App\Http\Helpers;

use App\Facades\{Data, Developer, Select, Skeleton};
use App\Services\DataService;
use Illuminate\Support\Facades\{Cache, Schema, DB, Log, Config};
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use InvalidArgumentException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use League\Csv\Reader;
use League\Csv\Writer;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Reader\Csv;
use Illuminate\Support\Arr;
use Exception;
use ZipArchive;


class ProcessFlowHelper
{
    /**
     * If no names are provided, returns all active workflows (where deleted_at is null).
     * If name(s) are provided, returns only matching ones.
     * @param  string|array|null  $names  (Optional) Workflow name or list of names to fetch
     * @return array
     */
    public static function getFlowsData($names = null): array
    {
        $rows = DB::select('SELECT * FROM moon.workflows');

        $flows = collect($rows)
            ->filter(fn($row) => empty($row->deleted_at))
            ->mapWithKeys(fn($row) => [
                $row->name => [
                    'flow_id'          => $row->flow_id ?? null,
                    'identifier'       => $row->identifier ?? null,
                    'type'             => $row->type ?? null,
                    'mandatory'        => $row->mandatory ?? 1, // include the new column
                    'required_headers' => is_string($row->required_headers)
                        ? json_decode($row->required_headers, true)
                        : ($row->required_headers ?? []),
                    'update_headers'   => is_string($row->update_headers)
                        ? json_decode($row->update_headers, true)
                        : ($row->update_headers ?? []),
                    'mapping_headers'  => is_string($row->mapping_headers)
                        ? json_decode($row->mapping_headers, true)
                        : ($row->mapping_headers ?? []),
                    'support_table' => $row->support_table ?? null,
                ]
            ]);

        if (!is_null($names)) {
            $names = is_array($names) ? $names : [$names];
            $flows = $flows->only($names);
        }

        return $flows->toArray();
    }

    public static function buildFlowData(array $validated, Collection $workflowList, string $processId): array
    {
        $processMode = $validated['mode'];
        $inputSource = $validated['input_source'];
        $outputTarget = $validated['output_target'];
        $mode = "{$inputSource}-{$outputTarget}";

        $headers = $validated['csv_headers'] ?? [];

        $includeStatus = $processMode === 'flow' && !in_array('status', $headers);
        if ($includeStatus) {
            $headers[] = 'status';
        }

        if ($inputSource === 'csv' && $includeStatus) {
            $csvPath = public_path("uploads/{$validated['csv_file_name']}");
            if (file_exists($csvPath)) {
                $original = Reader::createFromPath($csvPath, 'r');
                $original->setHeaderOffset(0);
                $records = iterator_to_array($original->getRecords());

                // Write patched file
                $writer = Writer::createFromPath($csvPath, 'w+');
                $patchedHeaders = array_merge($original->getHeader(), ['status']);
                $writer->insertOne($patchedHeaders);

                foreach ($records as $row) {
                    $row['status'] = 'pending';
                    $writer->insertOne(array_map(fn($h) => $row[$h] ?? '', $patchedHeaders));
                }
            }
        }

        if ($inputSource === 'db') {
            if (!str_contains($validated['input_table'], '.')) {
                throw new InvalidArgumentException("input_table must be in 'db.table' format like 'db_name.table_name'.");
            }

            // ✅ Parse but DO NOT override validated input
            $tableName = $validated['input_table'];

            // ✅ Fetch sample row for columns
            $sampleRow = DB::table($tableName)->limit(1)->first();
            $tableColumns = $sampleRow ? array_keys((array) $sampleRow) : [];

            // ✅ Get required headers from workflows
            $allRequiredHeaders = collect($validated['workflows'])
                ->map(fn($name) => $workflowList->firstWhere('name', $name)['required_headers'] ?? [])
                ->flatten()
                ->unique()
                ->values()
                ->toArray();

            // ✅ Use only required headers present in the table
            $headers = array_values(array_intersect($tableColumns, $allRequiredHeaders));
            Developer::info('DB Input Headers', [
                'input_table' => $tableName,
                'headers' => $headers
            ]);
        }


        // 🟡 Input definition (used for readInput)
        $input = match ($inputSource) {
            'csv' => [
                'type' => 'csv',
                'file_name' => $validated['csv_file_name'] ?? null,
                'headers' => $headers,
                'path' => tap(public_path("uploads/{$validated['csv_file_name']}"), function ($path) {
                    if (!File::exists(dirname($path))) {
                        File::makeDirectory(dirname($path), 0755, true);
                    }
                }),
            ],
            'db' => [
                'type' => 'db',
                'database' => $validated['input_db'],
                'table' => $validated['input_table'],
                'headers' => $headers,
            ]
        };

        $output = match ($outputTarget) {
            'csv' => [
                'type' => $outputTarget,
                'path' => tap(public_path("exports/flow/" . uniqid('export_') . ".{$outputTarget}"), function ($path) {
                    if (!File::exists(dirname($path))) {
                        File::makeDirectory(dirname($path), 0755, true);
                    }
                }),
            ],
            'excel' => [
                'type' => $outputTarget,
                'path' => tap(public_path("exports/flow/" . uniqid('export_') . ".xlsx"), function ($path) {
                    $dir = dirname($path);
                    if (!File::exists($dir)) {
                        File::makeDirectory($dir, 0755, true);
                    }
                }),
            ],
            'db' => [
                'type' => 'db',
                'database' => $validated['output_db'],
                'table' => $validated['output_table'],
            ]
        };

        $workflowMap = collect($validated['workflows'])->mapWithKeys(function ($name) use ($workflowList) {
            $wf = $workflowList->firstWhere('name', $name);
            return $wf ? [
                $wf['id'] => [
                    'workflow_name' => $name,
                    'support_table' => $wf['support_table'] ?? null,
                    'mandatory' => $wf['mandatory'] ?? false,
                    'update_headers' => (array) ($wf['update_headers'] ?? []),
                    'mapping_headers' => (array) ($wf['mapping_headers'] ?? []),
                    'required_headers' => (array) ($wf['required_headers'] ?? []),
                ]
            ] : [];
        })->toArray();

        return [
            'input' => $input,
            'output' => $output,
            'meta' => [
                'process_name' => $validated['process_name'],
                'process_id' => $processId,
                'mode' => $mode,
                'workflow_map' => $workflowMap,
                'base_input_db' => $validated['base_input_db'] ?? null,
                'base_input_table' => $validated['base_input_table'] ?? null, //see this two are related two autoflow method okayta
            ],
        ];
    }
    /**
     * Read input data based on mode, optimized for large datasets.
     *
     * @param array $input Input configuration (type, file_name, path, headers, or table for DB)
     * @param callable $callback Callback to process each row or chunk
     * @throws Exception
     */
    public static function readInput(array $input, callable $callback): void
    {
        $type = $input['type'] ?? 'csv';
        $idCounter = 1;
        $usedIds = [];
        $processedCount = 0;
        $batchSize = Config::get('large_file_processing.csv_processing.chunk_size', 1000); // Process in batches to manage memory
        
        // Set memory limit for large file processing
        $memoryLimit = Config::get('large_file_processing.memory_limit', '2048M');
        $maxExecutionTime = Config::get('large_file_processing.max_execution_time', 7200);
        
        ini_set('memory_limit', $memoryLimit);
        ini_set('max_execution_time', $maxExecutionTime);

        if ($type === 'csv') {
            if (!isset($input['path']) || !file_exists($input['path'])) {
                throw new Exception('Invalid or missing CSV file path');
            }

            // Quick row count validation in background job (optional)
            $maxRows = (int) Config::get('large_file_processing.csv_processing.file_split_threshold', 0);
            $actualRowCount = self::getQuickRowCount($input['path']);

            if ($maxRows > 0 && $actualRowCount > $maxRows) {
                throw new Exception("CSV file contains {$actualRowCount} rows, which exceeds the {$maxRows} row limit.");
            }

            Log::info('Background CSV Processing Started', [
                'file_path' => $input['path'],
                'row_count' => $actualRowCount,
                'max_allowed' => $maxRows
            ]);

            $csv = Reader::createFromPath($input['path'], 'r');
            $csv->setHeaderOffset(0);
            $headers = $input['headers'] ?? $csv->getHeader();
            $headers = array_filter($headers, fn($h) => !is_null($h) && $h !== ''); // Remove null/empty headers

            if (empty($headers)) {
                throw new Exception('No valid headers found in CSV input');
            }

            $batch = [];
            foreach ($csv->getRecords() as $index => $record) {
                $row = [];
                foreach ($headers as $header) {
                    $row[$header] = $record[$header] ?? null;
                }
                // Assign unique ID if missing or non-unique
                if (!isset($row['id']) || isset($usedIds[$row['id']])) {
                    while (isset($usedIds[$idCounter])) {
                        $idCounter++;
                    }
                    $row['id'] = $idCounter;
                    $idCounter++;
                }
                $usedIds[$row['id']] = true;
                
                $batch[] = $row;
                $processedCount++;

                // Process batch when it reaches batch size
                if (count($batch) >= $batchSize) {
                    foreach ($batch as $batchRow) {
                        $callback($batchRow, $index - count($batch) + array_search($batchRow, $batch));
                    }
                    $batch = [];
                    
                    // Force garbage collection to free memory
                    gc_collect_cycles();
                    
                    // Log progress for large files (configurable interval)
                    $logInterval = (int) Config::get('large_file_processing.progress_log_interval', 100000);
                    if ($processedCount % $logInterval === 0) {
                        $elapsedTime = microtime(true) - ($_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true));
                        $rowsPerSecond = $processedCount / max(1, $elapsedTime);
                        $estimatedRemaining = ($actualRowCount - $processedCount) / max(1, $rowsPerSecond);
                        
                        Log::info("📊 CSV processing progress", [
                            'processed_rows' => number_format($processedCount),
                            'total_rows' => number_format($actualRowCount),
                            'progress_pct' => round(($processedCount / max(1, $actualRowCount)) * 100, 2) . '%',
                            'rows_per_sec' => round($rowsPerSecond, 2),
                            'elapsed_time_min' => round($elapsedTime / 60, 2),
                            'estimated_remaining_min' => round($estimatedRemaining / 60, 2),
                            'memory_usage_mb' => round(memory_get_usage() / 1024 / 1024, 2),
                            'peak_memory_mb' => round(memory_get_peak_usage() / 1024 / 1024, 2)
                        ]);
                        
                        // Force garbage collection to free memory
                        gc_collect_cycles();
                    }
                }
            }

            // Process remaining batch
            if (!empty($batch)) {
                foreach ($batch as $batchRow) {
                    $callback($batchRow, $processedCount - count($batch) + array_search($batchRow, $batch));
                }
            }
        } elseif ($type === 'db') {
            if (!isset($input['table'])) {
                throw new Exception('Missing database table name');
            }

            DB::table($input['table'])
                ->select($input['headers'] ?? ['*'])
                ->orderBy($input['order_by'] ?? 'id')
                ->chunk(1000, function ($rows, $index) use ($callback, &$idCounter, &$usedIds) {
                    foreach ($rows as $rowIndex => $row) {
                        $row = (array) $row;
                        // Assign unique ID if missing or non-unique
                        if (!isset($row['id']) || isset($usedIds[$row['id']])) {
                            while (isset($usedIds[$idCounter])) {
                                $idCounter++;
                            }
                            $row['id'] = $idCounter;
                            $idCounter++;
                        }
                        $usedIds[$row['id']] = true;
                        $callback($row, $index * 1000 + $rowIndex);
                    }
                });
        } else {
            throw new Exception("Unsupported input type: $type");
        }

        Developer::debug("Completed reading input", [
            'type' => $type,
            'id_count' => $idCounter - 1,
        ]);
    }

    public static function writeOutput(array $output, array $headers, callable $rowGenerator): void
    {
        $type = $output['type'] ?? 'csv';
        $startTime = microtime(true);
        $threshold = 600000;
        $batchSize = 10000; // Increased for large datasets

        if (!in_array('id', $headers)) {
            array_unshift($headers, 'id');
        }

        try {
            $rowCount = 0;
            $batch = [];
            $getRecord = fn($row) => array_map(fn($h) => $row[$h] ?? null, $headers);

            if ($type === 'csv') {
                if (empty($output['path'])) throw new Exception('Missing CSV output path');

                $basePath = $output['path'];
                $dir = dirname($basePath);
                if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
                    throw new Exception("Cannot create directory: $dir");
                }
                if (!is_writable($dir)) {
                    throw new Exception("Directory not writable: $dir");
                }

                $fileIndex = 0;
                $filePaths = [];
                $currentWriter = null;

                foreach ($rowGenerator() as $row) {
                    if (!is_array($row)) throw new Exception("Row must be an array");

                    if ($rowCount % $threshold === 0) {
                        if ($currentWriter && !empty($batch)) {
                            try {
                                $currentWriter->insertAll($batch);
                            } catch (\League\Csv\Exception $e) {
                                throw new Exception("Failed to write batch: " . $e->getMessage());
                            }
                            $batch = [];
                        }

                        $filePath = $rowCount === 0 ? $basePath : str_replace('.csv', "_part{$fileIndex}.csv", $basePath);
                        $filePaths[] = $filePath;
                        if (file_exists($filePath) && !is_writable($filePath)) {
                            throw new Exception("File not writable: $filePath");
                        }
                        try {
                            $currentWriter = Writer::createFromPath($filePath, 'w');
                            $currentWriter->setDelimiter(',');
                            $currentWriter->setEnclosure('"');
                            $currentWriter->setEscape(''); // ✅ safer escape
                            $currentWriter->insertOne($headers);
                        } catch (\League\Csv\Exception $e) {
                            throw new Exception("Failed to create CSV writer for $filePath: " . $e->getMessage());
                        }
                        $fileIndex++;
                    }

                    $batch[] = array_map(function ($value) {
                        return is_string($value) && !mb_check_encoding($value, 'UTF-8')
                            ? mb_convert_encoding($value, 'UTF-8', 'UTF-8')
                            : $value;
                    }, $getRecord($row));
                    $rowCount++;

                    $logInterval = (int) Config::get('large_file_processing.progress_log_interval', 100000);
                    if ($rowCount % $logInterval === 0) {
                        $elapsedTime = microtime(true) - $startTime;
                        $rowsPerSecond = $rowCount / max(1, $elapsedTime);
                        
                        Log::info("📝 CSV write progress", [
                            'rows_written' => number_format($rowCount),
                            'rows_per_sec' => round($rowsPerSecond, 2),
                            'elapsed_time_min' => round($elapsedTime / 60, 2),
                            'file_path' => basename($filePath ?? 'unknown'),
                            'memory_usage_mb' => round(memory_get_peak_usage() / 1024 / 1024, 2)
                        ]);
                    }

                    if (count($batch) >= $batchSize) {
                        try {
                            $currentWriter->insertAll($batch);
                        } catch (\League\Csv\Exception $e) {
                            throw new Exception("Failed to write batch: " . $e->getMessage());
                        }
                        $batch = [];
                        gc_collect_cycles();
                    }
                }

                if (!empty($batch)) {
                    try {
                        $currentWriter->insertAll($batch);
                    } catch (\League\Csv\Exception $e) {
                        throw new Exception("Failed to write final batch: " . $e->getMessage());
                    }
                }

                if (count($filePaths) > 1) {
                    $zipPath = str_replace('.csv', '.zip', $basePath);
                    $zip = new ZipArchive();
                    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                        throw new Exception("Failed to create zip file: $zipPath");
                    }
                    foreach ($filePaths as $filePath) {
                        $zip->addFile($filePath, basename($filePath));
                    }
                    $zip->close();
                    $output['path'] = $zipPath;
                }
            } elseif ($type === 'excel') {
                if (empty($output['path'])) throw new Exception('Missing Excel output path');

                $spreadsheet = new Spreadsheet();
                $sheet = $spreadsheet->getActiveSheet();
                $sheet->fromArray($headers, null, 'A1');
                $rowIndex = 2;

                foreach ($rowGenerator() as $row) {
                    if (!is_array($row)) throw new Exception("Row must be an array");

                    $batch[] = $getRecord($row);
                    $rowCount++;

                    if ($rowCount % 100000 === 0) {
                        Log::info("Excel write progress", [
                            'rows_written' => $rowCount,
                            'file_path' => $output['path'],
                            'memory_usage_mb' => round(memory_get_peak_usage() / 1024 / 1024, 2)
                        ]);
                    }

                    if (count($batch) >= $batchSize) {
                        $sheet->fromArray($batch, null, "A{$rowIndex}");
                        $rowIndex += count($batch);
                        $batch = [];
                        $spreadsheet->garbageCollect();
                        gc_collect_cycles();
                    }
                }

                if (!empty($batch)) {
                    $sheet->fromArray($batch, null, "A{$rowIndex}");
                }

                IOFactory::createWriter($spreadsheet, 'Xlsx')
                    ->setPreCalculateFormulas(false)
                    ->save($output['path']);

                $spreadsheet->disconnectWorksheets();
                unset($spreadsheet);
            } elseif ($type === 'db') {
                if (empty($output['table'])) throw new Exception('Missing database table name');

                foreach ($rowGenerator() as $row) {
                    if (!is_array($row)) throw new Exception("Row must be an array");

                    $record = array_combine($headers, $getRecord($row));
                    $batch[] = $record;
                    $rowCount++;

                    if ($rowCount % 100000 === 0) {
                        Log::info("DB write progress", [
                            'rows_written' => $rowCount,
                            'table' => $output['table'],
                            'memory_usage_mb' => round(memory_get_peak_usage() / 1024 / 1024, 2)
                        ]);
                    }

                    if (count($batch) >= $batchSize) {
                        DB::table($output['table'])->upsert($batch, ['id']);
                        $batch = [];
                        gc_collect_cycles();
                    }
                }

                if (!empty($batch)) {
                    DB::table($output['table'])->upsert($batch, ['id']);
                }
            } else {
                throw new Exception("Unsupported output type: $type");
            }

            Log::info("Output written", [
                'type' => $type,
                'target' => $output['path'] ?? $output['table'] ?? 'N/A',
                'rows' => $rowCount,
                'duration_sec' => round(microtime(true) - $startTime, 2),
            ]);
        } catch (\Throwable $e) {
            Log::error("Output write failed", [
                'type' => $type,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            throw new Exception("Failed to write output ($type): " . $e->getMessage());
        }
    }

    public static function normalizeCols(array $rows, array &$metrics = []): array
    {
        $normalized = [];
        $idCounter = 1;
        $usedIds = [];

        foreach ($rows as $row) {
            $status = strtolower(trim($row['status'] ?? 'pending'));
            $reason = $row['reason'] ?? '';

            if (!array_key_exists('status', $row)) {
                $row['status'] = 'pending';
                $status = 'pending';
            }

            if (!array_key_exists('reason', $row)) {
                $row['reason'] = '';
            }

            if (!isset($row['id']) || isset($usedIds[$row['id']])) {
                while (isset($usedIds[$idCounter])) {
                    $idCounter++;
                }
                $row['id'] = $idCounter;
                $idCounter++;
            }
            $usedIds[$row['id']] = true;

            if (in_array($status, ['rejected', 'skipped'])) {
                $metrics['skipped'] = ($metrics['skipped'] ?? 0) + 1;
            } elseif (!in_array($status, ['pending', 'processed', 'completed'])) {
                Developer::warning("Invalid status found, resetting to pending", [
                    'row_id' => $row['id'],
                    'status' => $status
                ]);
                $row['status'] = 'pending';
                $row['reason'] = 'Invalid status reset to pending';
                $metrics['skipped'] = ($metrics['skipped'] ?? 0) + 1;
            } else {
                $metrics['total'] = ($metrics['total'] ?? 0) + 1;
            }

            $normalized[] = $row;
        }

        return $normalized;
    }

    public static function getRows(string $database, string $table, array $headers = []): array
    {
        if (Str::contains($table, '.')) {
            [$database, $table] = explode('.', $table, 2);
        }
        $qualifiedTable = "{$database}.{$table}";
        $query = DB::table($qualifiedTable);
        if (!empty($headers)) {
            $query->select($headers);
        }
        return $query->get()->map(fn($row) => (array) $row)->toArray();
    }

    /**
     * Create a trace entry.
     *
     * @param string $workflowName Workflow name
     * @param string $status Status (completed, failed, skipped)
     * @param array $metrics Metrics (total, processed, rejected, skipped)
     * @param string $details Details message
     * @return array Trace entry
     */
    public static function addTraceEntry(string $workflowName, string $status, array $metrics, string $details): array
    {
        return [
            'workflow' => $workflowName,
            'status' => $status,
            'metrics' => $metrics,
            'details' => $details,
        ];
    }
    /**
     * Insert or update a record in moon.process_logs.
     *
     * @param array $data Process data to insert/update
     * @throws Exception
     */
    public static function updateLogs(array $data): void
    {
        if (empty($data['process_id'])) {
            throw new Exception('Process ID cannot be null or empty');
        }

        $inputLocation = $data['input']['type'] === 'db'
            ? ($data['input']['database'] ?? 'moon') . '.' . $data['input']['table']
            : $data['input']['path'] ?? null;

        $outputLocation = $data['output']['type'] === 'db'
            ? ($data['output']['database'] ?? 'moon') . '.' . $data['output']['table']
            : $data['output']['path'] ?? null;

        $data['trace_details'] = collect($data['trace_details'])->map(function ($trace) {
            unset($trace['rows']);
            return $trace;
        })->toArray();

        $logData = [
            'process_id' => $data['process_id'],
            'process_name' => $data['process_name'] ?? 'Unknown',
            'process_mode' => $data['process_mode'] ?? 'workflow',
            'mode' => $data['mode'] ?? 'unknown',
            'status' => $data['status'] ?? 'pending',
            'input_location' => $inputLocation,
            'output_location' => $outputLocation,
            'total' => $data['total'] ?? 0,
            'processed' => $data['processed'] ?? 0,
            'rejected' => $data['rejected'] ?? 0,
            'skipped' => $data['skipped'] ?? 0,
            'trace_details' => isset($data['trace_details']) ? json_encode($data['trace_details']) : null,
            'created_by' => Skeleton::getAuthenticatedUser()->user_id ?? 'System',
            'created_at' => isset($data['created_at']) ? $data['created_at'] : now(),
            'updated_at' => now(),
        ];

        DB::table('moon.process_logs')->updateOrInsert(
            ['process_id' => $data['process_id']],
            $logData
        );
    }

    /**
     * Fetch records from moon.process_logs.
     *
     * @param string|null $processId Specific process ID to fetch, or null for all
     * @return array
     */
    public static function fetchLogs(?string $processId = null): array
    {
        $query = DB::table('moon.process_logs')->whereNull('deleted_at');

        if ($processId) {
            $query->where('process_id', $processId);
        }

        $toPublicUrl = function (?string $path): ?string {
            if (empty($path)) return null;
            // Already a full URL
            if (preg_match('/^https?:\/\//i', $path)) {
                return $path;
            }
            $normalizedPath = str_replace('\\\\', '/', str_replace('\\', '/', $path));
            $publicBase = str_replace('\\\\', '/', str_replace('\\', '/', public_path()));
            if (str_starts_with($normalizedPath, $publicBase)) {
                $relative = ltrim(substr($normalizedPath, strlen($publicBase)), '/');
                return asset($relative);
            }
            // If it's already a relative path, ensure no leading public/ and build URL
            $relative = ltrim($normalizedPath, '/');
            if (str_starts_with($relative, 'public/')) {
                $relative = substr($relative, 7);
            }
            return asset($relative);
        };

        return $query->get()->map(function ($record) use ($toPublicUrl) {
            $record->trace_details = json_decode($record->trace_details, true);
            // Add computed URLs for frontend download buttons
            $record->input_url = $toPublicUrl($record->input_location ?? null);
            $record->output_url = $toPublicUrl($record->output_location ?? null);
            return (array) $record;
        })->toArray();
    }

    /**
     * Get quick row count from CSV file (used in background job)
     * 
     * @param string $filePath Path to the CSV file
     * @return int Number of data rows (excluding header)
     */
    private static function getQuickRowCount(string $filePath): int
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
