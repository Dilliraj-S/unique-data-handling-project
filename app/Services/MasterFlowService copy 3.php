<?php

namespace App\Services;

use App\Facades\{Developer, Skeleton};
use Exception;
use Illuminate\Support\Facades\{Config, DB, Schema, Log};
use Illuminate\Database\Connection;
use Illuminate\Auth\AuthenticationException;
use App\Http\Helpers\ProcessFlowHelper;
use Illuminate\Support\Str;

class MasterFlowService
{

    private function parseDbAndTable(?string $qualified): array
    {
        if (!$qualified) return [null, null];
        $parts = explode('.', $qualified, 2);
        if (count($parts) === 2) {
            return [$parts[0], $parts[1]];
        }
        return [null, $qualified];
    }

    private function getConnectionForDatabase(?string $dbName): string
    {
        if (empty($dbName)) return 'central';
        $connections = Config::get('database.connections', []);
        foreach ($connections as $name => $cfg) {
            $connDb = strtolower($cfg['database'] ?? '');
            if (strtolower($name) === strtolower($dbName) || $connDb === strtolower($dbName)) {
                return $name;
            }
        }
        return 'central';
    }

    private function tableExists(string $connection, ?string $dbName, string $table): bool
    {
        try {
            $schema = $dbName ?: Config::get("database.connections.$connection.database");
            $count = DB::connection($connection)->table('information_schema.tables')
                ->where('table_schema', $schema)
                ->where('table_name', $table)
                ->count();
            return $count > 0;
        } catch (\Throwable $e) {
            Log::warning('tableExists check failed', ['connection' => $connection, 'db' => $dbName, 'table' => $table, 'error' => $e->getMessage()]);
            return false;
        }
    }

    private function getTableColumns(string $connection, ?string $dbName, string $table): array
    {
        try {
            $schema = $dbName ?: Config::get("database.connections.$connection.database");
            return DB::connection($connection)->table('information_schema.columns')
                ->select('column_name')
                ->where('table_schema', $schema)
                ->where('table_name', $table)
                ->pluck('column_name')
                ->map(fn($c) => (string)$c)
                ->toArray();
        } catch (\Throwable $e) {
            Log::warning('getTableColumns failed', ['connection' => $connection, 'db' => $dbName, 'table' => $table, 'error' => $e->getMessage()]);
            return [];
        }
    }

    public function processFlow(array $flows, array $flowData): array
    {
        // Extract and validate flow data
        $processId = $flowData['metadata']['process_id'] ?? null;
        $processName = $flowData['metadata']['process_name'] ?? 'Unknown Master Flow';
        $processMode = $flowData['process_mode'] ?? 'flow';
        $mode = $flowData['metadata']['mode'] ?? 'unknown';
        $input = $flowData['input'] ?? [];
        $output = $flowData['output'] ?? [];
        $metadata = $flowData['metadata'] ?? [];
        $workflowMap = $metadata['workflow_map'] ?? [];

        $input['rows'] = $input['rows'] ?? [];

        // Validate required fields
        if (empty($processId)) {
            Log::error("❌ MasterFlow failed: Missing process ID", ['flow_data' => $flowData]);
            throw new Exception("Process ID is missing in master flowData");
        }
        if (empty($flows)) {
            Log::error("❌ MasterFlow failed: No workflows provided", ['flow_data' => $flowData]);
            throw new Exception("No workflows provided in flows array");
        }
        if (empty($workflowMap)) {
            Log::error("❌ MasterFlow failed: Missing workflow map", ['metadata' => $metadata]);
            throw new Exception("Workflow map is missing in metadata");
        }

        Log::info("🚦 Starting MasterFlow `$processName`", [
            'process_id' => $processId,
            'process_mode' => $processMode,
            'mode' => $mode,
            'flows' => array_keys($flows),
            'input_headers' => $input['headers'] ?? [],
            'workflow_map' => $workflowMap,
            'input_row_count' => count($input['rows'])
        ]);

        $traceDetails = [];
        $status = 'completed';
        $pipelineMetrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0];
        $dbConnection = DB::connection('central');
        $dbConnection->statement("SET NAMES 'utf8mb4'");
        $clonedTable = "master_{$processId}";
        $baseTable = "master_copy";
        $fullClonedTable = "moon." . $clonedTable;
        $fullBaseTable = "moon." . $baseTable;

        // Cache workflow configs to avoid repeated queries
        $workflowNames = array_keys($flows);
        $workflowConfigs = $dbConnection
            ->table('moon.workflows')
            ->whereIn('name', $workflowNames)
            ->get()
            ->keyBy('name')
            ->toArray();

        try {
            // Create cloned table with partitioning for large datasets
            try {
                $dbConnection->statement("DROP TABLE IF EXISTS `moon`.`{$clonedTable}`");
                Log::info("🧹 Dropped existing cloned table {$fullClonedTable}");

                $createTableResult = $dbConnection->selectOne("SHOW CREATE TABLE `moon`.`{$baseTable}`");
                $createTableSql = $createTableResult->{'Create Table'};

                $createTableSql = preg_replace(
                    '/CREATE TABLE `[^`]+`/',
                    "CREATE TABLE `moon`.`{$clonedTable}`",
                    $createTableSql
                );

                $createTableSql .= "
                PARTITION BY RANGE (id) (
                    PARTITION p0 VALUES LESS THAN (1000000),
                    PARTITION p1 VALUES LESS THAN (2000000),
                    PARTITION p2 VALUES LESS THAN (3000000),
                    PARTITION p3 VALUES LESS THAN (4000000),
                    PARTITION p4 VALUES LESS THAN (5000000),
                    PARTITION p5 VALUES LESS THAN (6000000),
                    PARTITION p6 VALUES LESS THAN (7000000),
                    PARTITION p7 VALUES LESS THAN (8000000),
                    PARTITION p8 VALUES LESS THAN (9000000),
                    PARTITION p9 VALUES LESS THAN (10000000),
                    PARTITION pmax VALUES LESS THAN MAXVALUE
                );";

                $dbConnection->statement($createTableSql);
                $dbConnection->statement("ALTER TABLE `moon`.`{$clonedTable}` ADD INDEX idx_status (status)");
                Log::info("✅ Created partitioned cloned table {$fullClonedTable} with status index");
            } catch (Exception $e) {
                Log::error("❌ Failed to create cloned table", [
                    'error' => $e->getMessage(),
                    'table' => $fullClonedTable
                ]);
                throw $e;
            }

            // Validate CSV encoding
            if ($processMode === 'flow' && $input['type'] === 'csv' && !empty($input['path'])) {
                $csvContent = file_get_contents($input['path'], false, null, 0, 1024);
                $detectedEncoding = mb_detect_encoding($csvContent, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
                if ($detectedEncoding !== 'UTF-8') {
                    Log::error("❌ Invalid CSV encoding detected", [
                        'process_id' => $processId,
                        'file' => $input['path'],
                        'detected_encoding' => $detectedEncoding
                    ]);
                    throw new Exception("CSV file must be UTF-8 encoded, detected: $detectedEncoding");
                }
            }

            // Insert input data in batches using transactions
            if ($processMode === 'flow' && empty($input['rows'])) {
                ProcessFlowHelper::readInput($input, function ($row) use (&$input) {
                    $input['rows'][] = $row;
                });
            }
            if (empty($input['rows'])) {
                Log::warning("⚠️ No input rows to process", ['process_id' => $processId]);
                throw new Exception("No input rows available for processing");
            }

            $tableColumnsResult = $dbConnection->select("SHOW COLUMNS FROM `moon`.`{$clonedTable}`");
            $tableColumns = array_map(fn($col) => $col->Field, $tableColumnsResult);

            if (!in_array('id', $tableColumns)) {
                throw new Exception("❌ The cloned table moon.{$clonedTable} does not contain an 'id' column. Partitioning and inserts will fail.");
            }

            $datetimeColumns = array_filter($tableColumnsResult, fn($col) => in_array(strtolower($col->Type), ['datetime', 'timestamp']));
            $datetimeColumnNames = array_map(fn($col) => $col->Field, $datetimeColumns);

            $maxPlaceholders = 10000;
            $columnCount = count($tableColumns);
            $batchSize = max(1, floor($maxPlaceholders / $columnCount) * 2); // Increased batch size
            $usedIds = [];
            $idCounter = 1;
            $insertBatch = [];

            $rowGenerator = function () use ($input) {
                foreach ($input['rows'] as $row) {
                    yield $row;
                }
            };

            $dbConnection->beginTransaction();
            try {
                foreach ($rowGenerator() as $rowIndex => $row) {
                    if (!isset($row['id']) || isset($usedIds[$row['id']])) {
                        while (isset($usedIds[$idCounter])) {
                            $idCounter++;
                        }
                        $row['id'] = $idCounter;
                        $idCounter++;
                    }
                    $usedIds[$row['id']] = true;

                    $insertRow = array_fill_keys($tableColumns, null);

                    foreach ($row as $key => $value) {
                        if (in_array($key, $tableColumns)) {
                            if (is_string($value) && !mb_check_encoding($value, 'UTF-8')) {
                                $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
                                Log::warning("Invalid UTF-8 string detected in row $rowIndex, column $key, converted to UTF-8", [
                                    'process_id' => $processId
                                ]);
                            }
                            if ($value === '' || (in_array($key, $datetimeColumnNames) && !strtotime($value))) {
                                $insertRow[$key] = null;
                            } else {
                                $insertRow[$key] = $value;
                            }
                        }
                    }

                    $insertBatch[] = $insertRow;

                    if (count($insertBatch) >= $batchSize || $rowIndex === count($input['rows']) - 1) {
                        foreach (array_chunk($insertBatch, $batchSize) as $chunk) {
                            $dbConnection->table("moon.$clonedTable")->insert($chunk);
                            $pipelineMetrics['total'] += count($chunk);
                        }
                        $insertBatch = [];
                        $dbConnection->commit();
                        $dbConnection->beginTransaction();
                    }
                }

                $dbConnection->commit();
                Log::info("📥 Inserted initial rows into moon.$clonedTable", [
                    'row_count' => $pipelineMetrics['total'],
                    'batch_size' => $batchSize
                ]);
            } catch (Exception $e) {
                $dbConnection->rollBack();
                Log::error("❌ Failed to insert rows into moon.$clonedTable", [
                    'error' => $e->getMessage(),
                    'batch_size' => $batchSize
                ]);
                throw $e;
            }

            // Process workflows sequentially
            foreach ($flows as $workflowName => $method) {
                Log::debug("🔄 Starting workflow `$workflowName` via `$method`", [
                    'process_id' => $processId,
                    'metrics' => $pipelineMetrics
                ]);

                if (!method_exists($this, $method)) {
                    Log::error("❌ Method `$method` not found for workflow `$workflowName`", [
                        'process_id' => $processId
                    ]);
                    $traceDetails[] = ProcessFlowHelper::addTraceEntry($workflowName, 'failed', ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0], "Method `$method` not found");
                    $status = 'pending';
                    continue;
                }

                $workflowConfig = $workflowConfigs[$workflowName] ?? null;
                if (!$workflowConfig) {
                    Log::error("❷ Workflow config not found for `$workflowName`", [
                        'process_id' => $processId
                    ]);
                    $traceDetails[] = ProcessFlowHelper::addTraceEntry($workflowName, 'failed', ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0], "Workflow config not found");
                    $status = 'pending';
                    continue;
                }

                // Ensure method-level config can read from metadata by injecting normalized config
                try {
                    $normalizedConfig = [
                        'workflow_name'   => $workflowName,
                        'mandatory'       => filter_var($workflowConfig->mandatory ?? true, FILTER_VALIDATE_BOOLEAN),
                        // Fallback defaults for known workflows if DB value is missing
                        'support_table'   => ($workflowConfig->support_table ?? null) ?: (function ($name) {
                            $map = [
                                'Map Smtp' => 'mars.li_company_info',
                                'SMTP Base Mapping Phase 2' => 'mars.li_company_info',
                                'GMSE Mapping Phase 3' => 'mars.gmse_company_info',
                                'Zoom Info Phase 6' => 'saturn.zm_data',
                            ];
                            foreach ($map as $k => $v) {
                                if (strcasecmp($k, $name) === 0) return $v;
                            }
                            return null;
                        })($workflowName),
                        'required_headers'=> json_decode($workflowConfig->required_headers ?? '[]', true) ?: [],
                        'mapping_headers' => json_decode($workflowConfig->mapping_headers ?? '[]', true) ?: [],
                        'update_headers'  => json_decode($workflowConfig->update_headers ?? '[]', true) ?: []
                    ];

                    // Merge/replace into metadata['workflow_map'] so downstream methods can reliably read it
                    $metadata['workflow_map'] = array_values(array_filter(
                        array_map(function ($cfg) use ($workflowName, $normalizedConfig) {
                            if (!is_array($cfg)) { return $cfg; }
                            $name = trim($cfg['workflow_name'] ?? '');
                            if (strcasecmp($name, $workflowName) === 0) {
                                // Replace existing with normalized DB-backed config, preserving known keys if present
                                return array_merge($cfg, $normalizedConfig);
                            }
                            return $cfg;
                        }, $metadata['workflow_map'] ?? [])
                    ));

                    // If no entry existed, append
                    $hasEntry = false;
                    foreach ($metadata['workflow_map'] as $cfg) {
                        if (is_array($cfg) && strcasecmp(trim($cfg['workflow_name'] ?? ''), $workflowName) === 0) {
                            $hasEntry = true;
                            break;
                        }
                    }
                    if (!$hasEntry) {
                        $metadata['workflow_map'][] = $normalizedConfig;
                    }

                    // Debug log: resolved support table + connection mapping
                    $resolvedSupport = $normalizedConfig['support_table'] ?? null;
                    [$dbgDb, $dbgTbl] = $this->parseDbAndTable($resolvedSupport);
                    $dbgConn = $this->getConnectionForDatabase($dbgDb);
                    $dbgExists = $dbgTbl ? $this->tableExists($dbgConn, $dbgDb, $dbgTbl) : null;
                    Log::debug('🔎 Workflow config resolved', [
                        'process_id' => $processId,
                        'workflow' => $workflowName,
                        'method' => $method,
                        'support_table' => $resolvedSupport,
                        'connection' => $dbgConn,
                        'database' => $dbgDb,
                        'table' => $dbgTbl,
                        'table_exists' => $dbgExists,
                        'mandatory' => $normalizedConfig['mandatory'],
                        'required_headers' => $normalizedConfig['required_headers'],
                        'mapping_headers' => $normalizedConfig['mapping_headers'],
                        'update_headers' => $normalizedConfig['update_headers']
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('Failed to normalize workflow config into metadata', [
                        'process_id' => $processId,
                        'workflow' => $workflowName,
                        'error' => $e->getMessage()
                    ]);
                }

                $batchSize = 5000;
                $lastId = 0;
                $totalProcessed = 0;
                $allWorkflowRows = [];

                do {
                    $dbConnection->beginTransaction();
                    try {
                        $rows = $dbConnection->table($fullClonedTable)
                            ->where('id', '>', $lastId)
                            ->where(function ($query) {
                                $query->whereIn('status', ['processed', 'pending'])
                                    ->orWhereNull('status');
                            })
                            ->orderBy('id')
                            ->limit($batchSize)
                            ->get()
                            ->map(fn($row) => (array)$row)
                            ->toArray();

                        Log::debug("Fetched batch for workflow `$workflowName`", [
                            'process_id' => $processId,
                            'batch_size' => count($rows),
                            'last_id' => $lastId
                        ]);

                        if (empty($rows)) {
                            $dbConnection->commit();
                            break;
                        }

                        $lastId = end($rows)['id'] ?? $lastId;

                        $inputForWorkflow = $input;
                        $inputForWorkflow['headers'] = $tableColumns;
                        $inputForWorkflow['rows'] = $rows;

                        $workflowRows = call_user_func([$this, $method], $workflowName, $inputForWorkflow, $output, $metadata);

                        if (!is_array($workflowRows)) {
                            Log::error("❷ Workflow `$workflowName` did not return valid rows", [
                                'process_id' => $processId
                            ]);
                            $traceDetails[] = ProcessFlowHelper::addTraceEntry($workflowName, 'failed', ['total' => count($rows), 'processed' => 0, 'rejected' => 0, 'skipped' => 0], "Workflow `$workflowName` missing or invalid rows");
                            $status = 'pending';
                            $dbConnection->commit();
                            continue;
                        }

                        $allWorkflowRows = array_merge($allWorkflowRows, $workflowRows);

                        $updateBatch = [];
                        foreach ($workflowRows as $row) {
                            if (!isset($row['id'])) {
                                Log::error("❷ Row missing ID in workflow `$workflowName`", [
                                    'process_id' => $processId,
                                    'row' => $row
                                ]);
                                continue;
                            }

                            $updateHeaders = json_decode($workflowConfig->update_headers, true) ?? [];
                            $updateData = array_intersect_key($row, array_flip($updateHeaders));
                            $updateData['status'] = $row['workflow_status'] ?? 'processed';
                            $updateData['reason'] = $row['workflow_reason'] ?? 'Match found and updated';

                            $updateBatch[] = ['id' => $row['id'], 'data' => $updateData];
                        }

                        foreach (array_chunk($updateBatch, 1000) as $chunk) {
                            $caseStatements = [];
                            $ids = [];
                            foreach ($chunk as $update) {
                                $ids[] = $update['id'];
                                foreach ($update['data'] as $key => $value) {
                                    $caseStatements[$key][] = "WHEN id = {$update['id']} THEN " . ($value === null ? 'NULL' : $dbConnection->getPdo()->quote($value));
                                }
                            }

                            $setClauses = [];
                            foreach ($caseStatements as $key => $cases) {
                                $setClauses[] = "`$key` = CASE " . implode(' ', $cases) . " ELSE `$key` END";
                            }

                            $query = "UPDATE $fullClonedTable SET " . implode(', ', $setClauses) . " WHERE id IN (" . implode(',', $ids) . ")";
                            $rowsAffected = $dbConnection->statement($query);

                            $pipelineMetrics['processed'] += count($chunk);
                        }

                        $dbConnection->commit();
                        $totalProcessed += count($workflowRows);

                        if ($totalProcessed <= 3) {
                            Log::info("✅ Updated rows in `$workflowName`", [
                                'process_id' => $processId,
                                'rows_affected' => count($workflowRows)
                            ]);
                        }
                    } catch (Exception $e) {
                        $dbConnection->rollBack();
                        Log::error("❷ Failed to update rows in `$workflowName`", [
                            'process_id' => $processId,
                            'error' => $e->getMessage()
                        ]);
                        $status = 'pending';
                    }
                } while (true);

                $workflowMetrics = ['total' => count($rows), 'processed' => 0, 'rejected' => 0, 'skipped' => 0];
                foreach ($allWorkflowRows as $row) {
                    $workflowMetrics[$row['workflow_status'] ?? 'processed']++;
                }
                $pipelineMetrics['processed'] = $workflowMetrics['processed'];
                $pipelineMetrics['rejected'] += $workflowMetrics['rejected'];
                $pipelineMetrics['skipped'] += $workflowMetrics['skipped'];

                $traceDetails[] = ProcessFlowHelper::addTraceEntry(
                    $workflowName,
                    $workflowMetrics['rejected'] > 0 || $workflowMetrics['skipped'] > 0 ? 'pending' : 'completed',
                    $workflowMetrics,
                    "Processed `$workflowName`"
                );

                Log::info("✅ Completed workflow `$workflowName`", [
                    'process_id' => $processId,
                    'total_processed' => $totalProcessed,
                    'metrics' => $pipelineMetrics
                ]);
            }

            // Write final output
            if ($processMode === 'flow') {
                Log::info("📝 Preparing to write final output", [
                    'process_id' => $processId,
                    'headers' => $tableColumns,
                    'metrics' => $pipelineMetrics
                ]);

                $rowGenerator = function () use ($dbConnection, $fullClonedTable, $tableColumns, $processId) {
                    $lastId = 0;
                    $batchSize = 5000;
                    $maxIterations = 1000;
                    $iteration = 0;

                    do {
                        if ($iteration >= $maxIterations) {
                            Log::error("Row generator exceeded maximum iterations", [
                                'process_id' => $processId,
                                'max_iterations' => $maxIterations,
                                'last_id' => $lastId
                            ]);
                            throw new Exception("Row generator exceeded maximum iterations: $maxIterations");
                        }

                        $rows = $dbConnection->table($fullClonedTable)
                            ->select($tableColumns)
                            ->where('id', '>', $lastId)
                            ->orderBy('id')
                            ->limit($batchSize)
                            ->get();
                        Log::debug("Fetched output rows batch", [
                            'process_id' => $processId,
                            'batch_size' => $rows->count(),
                            'last_id' => $lastId
                        ]);

                        foreach ($rows as $row) {
                            $lastId = $row->id;
                            yield (array)$row;
                        }
                        $iteration++;
                    } while (!$rows->isEmpty());
                };

                // if ($output['type' === ['csv', 'excel']]) {
                //     Log::debug("Starting CSV write to {$output['path']}", [
                //         'process_id' => $processId,
                //         'headers_count' => count($tableColumns)
                //     ]);
                // }
                // Log::debug("Starting to write to {$output}", [
                //     'process_id' => $processId,
                //     'headers_count' => count($tableColumns)
                // ]);
                ProcessFlowHelper::writeOutput($output, $tableColumns, $rowGenerator);
                // Log::debug("Completed CSV write to {$output['path']}", [
                //     'process_id' => $processId
                // ]);
            }

            Log::info("🏁 MasterFlow `$processName` completed", [
                'process_id' => $processId,
                'metrics' => $pipelineMetrics
            ]);
        } catch (Exception $e) {
            $status = 'failed';
            Log::error("MasterFlow `$processName` failed", [
                'process_id' => $processId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $traceDetails[] = ProcessFlowHelper::addTraceEntry('MasterFlow', 'failed', $pipelineMetrics, "MasterFlow failed: {$e->getMessage()}");
        }

        ProcessFlowHelper::updateLogs([
            'process_id' => $processId,
            'process_name' => $processName,
            'process_mode' => $processMode,
            'mode' => $mode,
            'status' => $status,
            'input' => $input,
            'output' => $output,
            'total' => $pipelineMetrics['total'],
            'processed' => $pipelineMetrics['processed'],
            'rejected' => $pipelineMetrics['rejected'],
            'skipped' => $pipelineMetrics['skipped'],
            'trace_details' => $traceDetails,
            'flow_data' => [
                'input' => $input,
                'output' => $output,
                'metadata' => $metadata,
                'tracing' => $traceDetails
            ]
        ]);

        return [
            'status' => $status,
            'metrics' => $pipelineMetrics,
            'rows' => []
        ];
    }
    // public function FullnameSplitMethod(string $workflowName, array $input, array $output, array $metadata): array
    // {
    //     Log::info("📥 Starting FullnameSplitMethod", [
    //         'workflow' => $workflowName,
    //         'input_row_count' => count($input['rows'])
    //     ]);

    //     $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0];
    //     $outputRows = [];
    //     $processId = $metadata['process_id'] ?? 'unknown';

    //     try {
    //         $workflowConfig = collect($metadata['workflow_map'] ?? [])
    //             ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

    //         if (!$workflowConfig) {
    //             throw new Exception("No workflow mapping found for `$workflowName`.");
    //         }

    //         $requiredHeaders = $workflowConfig['required_headers'] ?? ['li_full_name'];
    //         $updateHeaders = $workflowConfig['update_headers'] ?? [
    //             'li_first_name',
    //             'li_middle_name',
    //             'li_last_name',
    //             'li_firstname_initial',
    //             'li_lastname_initial'
    //         ];

    //         foreach ($input['rows'] as $row) {
    //             $metrics['total']++;
    //             $outputRow = $row;

    //             if (!isset($row['id'])) {
    //                 Log::error("❷ Row missing ID in workflow `$workflowName`", [
    //                     'process_id' => $processId,
    //                     'row' => $row
    //                 ]);
    //                 throw new Exception("Row missing ID in workflow `$workflowName`");
    //             }

    //             $fullName = trim($row['li_full_name'] ?? '');
    //             if (empty($fullName)) {
    //                 $outputRow['workflow_status'] = 'rejected';
    //                 $outputRow['workflow_reason'] = 'Missing full name';
    //                 $outputRows[] = $outputRow;
    //                 $metrics['rejected']++;
    //                 continue;
    //             }

    //             // Simplified name validation
    //             $parts = explode(' ', $fullName);
    //             if (count($parts) > 3) {
    //                 $outputRow['workflow_status'] = 'rejected';
    //                 $outputRow['workflow_reason'] = 'Name has more than 3 words';
    //                 $outputRows[] = $outputRow;
    //                 $metrics['rejected']++;
    //                 continue;
    //             }

    //             if (count($parts) < 2) {
    //                 $outputRow['workflow_status'] = 'rejected';
    //                 $outputRow['workflow_reason'] = 'Name too short';
    //                 $outputRows[] = $outputRow;
    //                 $metrics['rejected']++;
    //                 continue;
    //             }

    //             $first = $parts[0];
    //             $last = $parts[count($parts) - 1];
    //             $middle = count($parts) === 3 ? $parts[1] : null;

    //             $outputRow['li_first_name'] = $first;
    //             $outputRow['li_last_name'] = $last;
    //             $outputRow['li_middle_name'] = $middle;
    //             $outputRow['li_firstname_initial'] = strtoupper(substr($first, 0, 1));
    //             $outputRow['li_lastname_initial'] = strtoupper(substr($last, 0, 1));
    //             $outputRow['workflow_status'] = 'processed';
    //             $outputRow['workflow_reason'] = 'Name split successfully';
    //             $metrics['processed']++;
    //             $outputRows[] = $outputRow;
    //         }

    //         ProcessFlowHelper::updateLogs([
    //             'process_id' => $processId,
    //             'process_name' => $metadata['process_name'] ?? 'Unknown',
    //             'process_mode' => $metadata['process_mode'] ?? 'flow',
    //             'mode' => $metadata['mode'] ?? 'unknown',
    //             'status' => 'pending',
    //             'input' => $input,
    //             'output' => $output,
    //             'total' => $metrics['total'],
    //             'processed' => $metrics['processed'],
    //             'rejected' => $metrics['rejected'],
    //             'skipped' => $metrics['skipped'],
    //             'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'completed', $metrics, "Processed `$workflowName`")]
    //         ]);

    //         Log::info("✅ Completed FullnameSplitMethod", [
    //             'workflow' => $workflowName,
    //             'metrics' => $metrics
    //         ]);
    //     } catch (\Throwable $e) {
    //         Log::error("❷ Error in FullnameSplitMethod", [
    //             'process_id' => $processId,
    //             'error' => $e->getMessage()
    //         ]);

    //         ProcessFlowHelper::updateLogs([
    //             'process_id' => $processId,
    //             'process_name' => $metadata['process_name'] ?? 'Unknown',
    //             'process_mode' => $metadata['process_mode'] ?? 'flow',
    //             'mode' => $metadata['mode'] ?? 'unknown',
    //             'status' => 'failed',
    //             'input' => $input,
    //             'output' => $output,
    //             'total' => $metrics['total'],
    //             'processed' => $metrics['processed'],
    //             'rejected' => $metrics['rejected'],
    //             'skipped' => $metrics['skipped'],
    //             'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())]
    //         ]);
    //     }

    //     return $outputRows;
    // }

    public function FullnameSplitMethod(string $workflowName, array $input, array $output, array $metadata): array
    {
        // ✅ Filter rows to process only those with status 'processed', 'pending', or NULL
        $input['rows'] = array_values(array_filter($input['rows'], function ($row) {
            $status = strtolower($row['workflow_status'] ?? '');
            return empty($status) || in_array($status, ['processed', 'pending']);
        }));

        Log::info("📥 Starting FullnameSplitMethod (Junk → Punctuation → Split)", [
            'workflow' => $workflowName,
            'input_row_count' => count($input['rows'])
        ]);

        $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0];
        $outputRows = [];
        $processId = $metadata['process_id'] ?? 'unknown';

        try {
            // ✅ Load workflow configuration
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);
            if (!$workflowConfig) {
                throw new Exception("No workflow mapping found for `$workflowName`.");
            }

            $requiredHeaders = $workflowConfig['required_headers'] ?? ['li_full_name'];
            $updateHeaders = $workflowConfig['update_headers'] ?? [
                'li_first_name',
                'li_middle_name',
                'li_last_name',
                'li_firstname_initial',
                'li_lastname_initial'
            ];

            // ✅ Load junk removal rules from DB
            $junkRules = DB::connection('central')
                ->table('moon.fullname_junk')
                ->select('Junk_Keyword', 'Junk_Type')
                ->get()
                ->map(fn($r) => [
                    'keyword' => trim($r->Junk_Keyword),
                    'type'    => strtolower(trim($r->Junk_Type))
                ])
                ->toArray();

            // Helper to remove junk keywords case-insensitively
            $removeJunk = function (string $name) use ($junkRules): string {
                foreach ($junkRules as $rule) {
                    $pattern = preg_quote($rule['keyword'], '/');
                    switch ($rule['type']) {
                        case 'beginswith':
                            $name = preg_replace('/^' . $pattern . '\b\s*/i', '', $name);
                            break;
                        case 'endswith':
                            $name = preg_replace('/\s*\b' . $pattern . '$/i', '', $name);
                            break;
                        case 'both':
                            $name = preg_replace('/\b' . $pattern . '\b/i', '', $name);
                            break;
                        case 'contains':
                            $name = preg_replace('/\b' . $pattern . '\b/i', '', $name);
                            break;
                    }
                }
                return trim(preg_replace('/\s+/', ' ', $name));
            };

            // ✅ Process each row
            foreach ($input['rows'] as $row) {
                $metrics['total']++;
                $outputRow = $row;

                // Skip if ID is missing
                if (!isset($row['id'])) {
                    $outputRow['workflow_status'] = 'skipped';
                    $outputRow['workflow_reason'] = 'Missing ID';
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                $fullName = trim($row[$requiredHeaders[0]] ?? '');
                if ($fullName === '') {
                    $outputRow['workflow_status'] = 'rejected';
                    $outputRow['workflow_reason'] = 'Missing full name';
                    $metrics['rejected']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                // ✅ Step 1: Remove junk (matches exactly as in DB, case-insensitive)
                $fullName = $removeJunk($fullName);

                if ($fullName === '') {
                    $outputRow['workflow_status'] = 'rejected';
                    $outputRow['workflow_reason'] = 'Name empty after junk removal';
                    $metrics['rejected']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                // ✅ Step 2: Punctuation cleanup
                $fullName = str_replace(',', ' ', $fullName);
                $tokens = explode(' ', $fullName);
                $cleanTokens = [];
                $valid = true;

                foreach ($tokens as $tok) {
                    if (preg_match('/^[A-Z]\.$/i', $tok)) {
                        // Single-letter initial with dot
                        $cleanTokens[] = rtrim($tok, '.');
                    } elseif (preg_match('/^[A-Za-z]+$/', $tok)) {
                        // Normal word
                        $cleanTokens[] = $tok;
                    } else {
                        // Remove any dots from non-initial words
                        $tok = preg_replace('/\./', '', $tok);
                        if (preg_match('/^[A-Za-z]+$/', $tok)) {
                            $cleanTokens[] = $tok;
                        } else {
                            $valid = false; // invalid characters
                            break;
                        }
                    }
                }

                if (!$valid) {
                    $outputRow['workflow_status'] = 'rejected';
                    $outputRow['workflow_reason'] = 'Name contains invalid characters';
                    $metrics['rejected']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                $fullName = trim(preg_replace('/\s+/', ' ', implode(' ', $cleanTokens)));

                if ($fullName === '') {
                    $outputRow['workflow_status'] = 'rejected';
                    $outputRow['workflow_reason'] = 'Name empty after punctuation clean';
                    $metrics['rejected']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                // ✅ Step 3: Validate word count
                $parts = explode(' ', $fullName);
                if (count($parts) < 2) {
                    $outputRow['workflow_status'] = 'rejected';
                    $outputRow['workflow_reason'] = 'Only one word in name';
                    $metrics['rejected']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                if (count($parts) > 3) {
                    $outputRow['workflow_status'] = 'rejected';
                    $outputRow['workflow_reason'] = 'More than three words in name';
                    $metrics['rejected']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                // ✅ Step 4: Assign names (capitalize properly)
                $first  = ucfirst(strtolower($parts[0]));
                $last   = ucfirst(strtolower($parts[count($parts) - 1]));
                $middle = (count($parts) === 3) ? ucfirst(strtolower($parts[1])) : null;

                $outputRow['li_first_name']        = $first;
                $outputRow['li_middle_name']       = $middle;
                $outputRow['li_last_name']         = $last;
                $outputRow['li_firstname_initial'] = strtoupper(substr($first, 0, 1));
                $outputRow['li_lastname_initial']  = strtoupper(substr($last, 0, 1));

                $outputRow['workflow_status'] = 'processed';
                $outputRow['workflow_reason'] = 'Name cleaned and split successfully';
                $metrics['processed']++;
                $outputRows[] = $outputRow;
            }

            // ✅ Log completion
            $workflowStatus = ($metrics['rejected'] > 0 || $metrics['skipped'] > 0) ? 'pending' : 'completed';
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => $workflowStatus,
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'trace_details' => [
                    ProcessFlowHelper::addTraceEntry($workflowName, $workflowStatus, $metrics, "Processed `$workflowName`")
                ]
            ]);

            Log::info("✅ Completed FullnameSplitMethod", [
                'workflow' => $workflowName,
                'metrics' => $metrics
            ]);
        } catch (\Throwable $e) {
            Log::error("❌ Error in FullnameSplitMethod", [
                'process_id' => $processId,
                'error' => $e->getMessage()
            ]);

            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'status' => 'failed',
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'trace_details' => [
                    ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())
                ]
            ]);

            return $outputRows;
        }

        return $outputRows;
    }
    public function DlsDesignationsMethod(string $workflowName, array $input, array $output, array $metadata): array
    {
        // ✅ Filter rows to process only those with status 'processed', 'pending', or NULL
        $input['rows'] = array_values(array_filter($input['rows'], function ($row) {
            $status = strtolower($row['workflow_status'] ?? '');
            return empty($status) || in_array($status, ['processed', 'pending']);
        }));

        Log::info("📥 Starting DlsDesignationsMethod", [
            'workflow' => $workflowName,
            'input_row_count' => count($input['rows'])
        ]);

        $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
        $outputRows = [];
        $processId = $metadata['process_id'] ?? 'unknown';

        try {
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

            if (!$workflowConfig) {
                throw new Exception("No workflow mapping found for `$workflowName`.");
            }

            $mandatory = filter_var($workflowConfig['mandatory'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $supportTable = $workflowConfig['support_table'] ?? null;
            $requiredHeaders = $workflowConfig['required_headers'] ?? ['li_job_title'];
            $mappingHeaders = $workflowConfig['mapping_headers'] ?? ['li_job_title'];
            $updateHeaders = $workflowConfig['update_headers'] ?? ['dls_designation', 'dls_management_level', 'dls_jobfunction'];

            if (!$supportTable || empty($requiredHeaders) || empty($mappingHeaders) || empty($updateHeaders)) {
                throw new Exception("Invalid configuration: missing support table, required headers, mapping headers, or update headers.");
            }

            // ✅ Create temporary table
            $tempTableName = 'temp_designations_' . uniqid();
            $tempTable = 'moon.' . $tempTableName;
            $cols = implode(', ', array_map(fn($col) => "`$col` VARCHAR(255) COLLATE utf8mb4_unicode_ci", $mappingHeaders));
            $indexes = implode(', ', array_map(fn($col) => "INDEX(`$col`)", $mappingHeaders));
            DB::connection('central')->statement("CREATE TEMPORARY TABLE $tempTable ($cols, $indexes) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // ✅ Insert rows into temp table with dynamic chunking
            $maxPlaceholders = 10000;
            $columnCount = count($mappingHeaders);
            $batchSize = max(1, floor($maxPlaceholders / $columnCount));
            $insertBatch = [];

            foreach ($input['rows'] as $row) {
                $keyParts = array_map(fn($col) => strtolower(trim($row[$col] ?? '')), $mappingHeaders);
                $insertBatch[] = $keyParts;

                if (count($insertBatch) >= $batchSize) {
                    $placeholders = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, count($mappingHeaders), '?')) . ')'));
                    DB::connection('central')->statement(
                        "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                        array_merge(...$insertBatch)
                    );
                    $insertBatch = [];
                }
            }

            if (!empty($insertBatch)) {
                $placeholders = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, count($mappingHeaders), '?')) . ')'));
                DB::connection('central')->statement(
                    "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                    array_merge(...$insertBatch)
                );
            }

            // ✅ Perform join with support table in batches
            $batchSize = 5000;
            $offset = 0;
            $mappedData = [];

            do {
                $rows = DB::connection('central')
                    ->table($tempTable)
                    ->offset($offset)
                    ->limit($batchSize)
                    ->get()
                    ->map(fn($row) => (array)$row)
                    ->toArray();

                if (empty($rows)) {
                    break;
                }

                // Create a temporary table for this batch
                $batchTempTableName = 'batch_temp_' . uniqid();
                $batchTempTable = 'moon.' . $batchTempTableName;
                DB::connection('central')->statement("CREATE TEMPORARY TABLE $batchTempTable ($cols, $indexes) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

                // Insert batch rows
                $batchInsert = [];
                foreach ($rows as $row) {
                    $batchInsert[] = array_map(fn($col) => strtolower(trim($row[$col] ?? '')), $mappingHeaders);
                }
                if (!empty($batchInsert)) {
                    $placeholders = implode(',', array_fill(0, count($batchInsert), '(' . implode(',', array_fill(0, count($mappingHeaders), '?')) . ')'));
                    DB::connection('central')->statement(
                        "INSERT INTO $batchTempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                        array_merge(...$batchInsert)
                    );
                }

                // Perform join for this batch
                $on = implode(' AND ', array_map(fn($col) => "t.`$col` = s.`$col`", $mappingHeaders));
                $select = implode(', ', array_merge(
                    array_map(fn($col) => "s.`$col`", $updateHeaders),
                    array_map(fn($col) => "t.`$col`", $mappingHeaders)
                ));

                $query = "SELECT $select FROM $batchTempTable t LEFT JOIN $supportTable s ON $on";
                $results = DB::connection('central')->select($query);

                // Map results
                foreach ($results as $res) {
                    $rowArray = (array)$res;
                    $lookupKey = implode('|', array_map(fn($col) => strtolower(trim($rowArray[$col] ?? '')), $mappingHeaders));
                    $mappedData[$lookupKey] = $rowArray;
                }

                // Drop batch temp table
                DB::connection('central')->statement("DROP TEMPORARY TABLE IF EXISTS $batchTempTable");

                $offset += $batchSize;
            } while (!empty($rows));

            // ✅ Process each row
            foreach ($input['rows'] as $row) {
                $metrics['total']++;
                $outputRow = $row;

                // Check for skipped rows
                if ($mandatory && (empty(trim($row['li_job_title'] ?? '')) || is_null($row['li_job_title']))) {
                    $outputRow['workflow_status'] = 'skipped';
                    $outputRow['workflow_reason'] = "Missing or NULL `li_job_title`";
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                $keyParts = array_map(fn($col) => strtolower(trim($row[$col] ?? '')), $mappingHeaders);
                $lookupKey = implode('|', $keyParts);
                $match = $mappedData[$lookupKey] ?? null;

                // Check if match has non-NULL values for update_headers
                $hasValidMatch = $match && !empty(array_filter(array_intersect_key($match, array_flip($updateHeaders)), fn($v) => $v !== null));

                if ($mandatory) {
                    // --- Mandatory = true ---
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'rejected';
                        $outputRow['workflow_reason'] = 'No valid match found for li_job_title in support table';
                        $metrics['rejected']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) {
                                $outputRow[$field] = $match[$field];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                } else {
                    // --- Mandatory = false ---
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'pending';
                        $outputRow['workflow_reason'] = 'Optional step: no valid match found for li_job_title';
                        $metrics['pending']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) {
                                $outputRow[$field] = $match[$field];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                }
                
                $outputRows[] = $outputRow;
            }

            // ✅ Drop temp table
            DB::connection('central')->statement("DROP TEMPORARY TABLE IF EXISTS $tempTable");

            // ✅ Update logs
            $workflowStatus = ($metrics['rejected'] > 0 || $metrics['skipped'] > 0 || $metrics['pending'] > 0) ? 'pending' : 'completed';
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => $workflowStatus,
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, $workflowStatus, $metrics, "Processed `$workflowName`")]
            ]);

            Log::info("✅ Completed DlsDesignationsMethod", [
                'workflow' => $workflowName,
                'metrics' => $metrics
            ]);

            // ✅ Sampled logging of output rows with update_headers
            if (count($outputRows) > 0 && count($outputRows) <= 3) {
                $sampleRows = array_map(function ($row) use ($updateHeaders) {
                    $sample = [
                        'id' => $row['id'],
                        'li_job_title' => $row['li_job_title'] ?? 'NULL',
                        'workflow_status' => $row['workflow_status'] ?? 'NULL',
                        'workflow_reason' => $row['workflow_reason'] ?? 'NULL'
                    ];
                    foreach ($updateHeaders as $header) {
                        $sample[$header] = $row[$header] ?? 'NULL';
                    }
                    return $sample;
                }, array_slice($outputRows, 0, 3));
                Log::info("📤 Sample output rows", [
                    'workflow' => $workflowName,
                    'sample_rows' => $sampleRows
                ]);
            }
        } catch (\Throwable $e) {
            Log::error("❌ Error in DlsDesignationsMethod", [
                'process_id' => $processId,
                'error' => $e->getMessage()
            ]);

            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => 'failed',
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())]
            ]);

            return $outputRows; // Return partial results to allow continuation
        }

        return $outputRows;
    }
    public function CountryMappingMethod(string $workflowName, array $input, array $output, array $metadata): array
    {
        Log::info("📥 Starting CountryMappingMethod (Optimized)", [
            'workflow' => $workflowName,
            'input_row_count' => count($input['rows'])
        ]);

        $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
        $outputRows = [];
        $processId = $metadata['process_id'] ?? 'unknown';

        try {
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

            if (!$workflowConfig) {
                throw new Exception("No workflow mapping found for `$workflowName`.");
            }

            foreach (($workflowConfig['required_headers'] ?? ['li_contact_location']) as $header) {
                if (!in_array($header, $input['headers'] ?? [])) {
                    throw new Exception("Required header `$header` missing for `$workflowName`.");
                }
            }

            // Build list of unique normalized locations to process
            $uniqueLocations = [];
            foreach ($input['rows'] as $row) {
                if (!in_array($row['workflow_status'] ?? 'pending', ['pending', 'processed'])) continue;
                $loc = strtolower(trim($row['li_contact_location'] ?? ''));
                if ($loc !== '') $uniqueLocations[$loc] = true;
            }
            $uniqueLocations = array_keys($uniqueLocations);

            if (empty($uniqueLocations)) {
                Log::warning("⚠ No locations to process in CountryMappingMethod");
                return $input['rows'];
            }

            // Create temp table for locations
            $tempTable = 'moon.temp_country_' . uniqid();
            DB::connection('central')->statement("
            CREATE TEMPORARY TABLE $tempTable (
                location VARCHAR(255) COLLATE utf8mb4_unicode_ci,
                INDEX idx_location (location)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

            // Bulk insert normalized locations in chunks
            $insertChunkSize = 5000;
            $chunks = array_chunk($uniqueLocations, $insertChunkSize);
            foreach ($chunks as $chunk) {
                $placeholders = implode(',', array_fill(0, count($chunk), '(?)'));
                $bindings = array_map(fn($v) => $v, $chunk); // already normalized
                // PDO placeholder expansion in Laravel statement expects flat array, but (?),... is allowed
                DB::connection('central')->statement(
                    "INSERT INTO $tempTable (location) VALUES $placeholders",
                    $bindings
                );
            }

            // Single query to find matches from country_mapping, countries, states, cities (only required cols)
            // NOTE: ensure indexes on columns used in joins (location/name) exist in DB for performance.
            $query = "
            SELECT t.location, cm.country, cm.region, 'country_mapping' AS match_type
            FROM $tempTable t
            JOIN mercury.country_mapping cm ON t.location = LOWER(TRIM(cm.location)) AND cm.deleted_at IS NULL
            UNION ALL
            SELECT t.location, c.name AS country, c.region, 'countries' AS match_type
            FROM $tempTable t
            JOIN moon.countries c ON t.location = LOWER(TRIM(c.name))
            UNION ALL
            SELECT t.location, ctry.name AS country, ctry.region, 'states' AS match_type
            FROM $tempTable t
            JOIN moon.states s ON t.location = LOWER(TRIM(s.name))
            JOIN moon.countries ctry ON s.country_id = ctry.id
            UNION ALL
            SELECT t.location, ctry.name AS country, ctry.region, 'cities' AS match_type
            FROM $tempTable t
            JOIN moon.cities ci ON t.location = LOWER(TRIM(ci.name))
            JOIN moon.countries ctry ON ci.country_id = ctry.id
        ";

            // Stream results; this keeps memory bounded
            $mappingResults = [];
            foreach (DB::connection('central')->cursor($query) as $r) {
                $loc = strtolower($r->location);
                // prefer the first mapping source by insertion order (country_mapping first)
                if (!isset($mappingResults[$loc])) {
                    $mappingResults[$loc] = [
                        'country' => $r->country,
                        'region' => $r->region,
                        'match_type' => $r->match_type
                    ];
                }
            }

            // Apply mappings to original rows
            foreach ($input['rows'] as $row) {
                if (!in_array($row['workflow_status'] ?? 'pending', ['pending', 'processed'])) {
                    $outputRows[] = $row;
                    continue;
                }

                $metrics['total']++;
                $location = strtolower(trim($row['li_contact_location'] ?? ''));

                if ($location === '') {
                    $status = $workflowConfig['mandatory'] ? 'skipped' : 'pending';
                    $row['workflow_status'] = $status;
                    $row['workflow_reason'] = 'Empty li_contact_location';
                    $metrics[$status]++;
                    $outputRows[] = $row;
                    continue;
                }

                if (isset($mappingResults[$location])) {
                    $map = $mappingResults[$location];
                    $row['gs_country'] = $map['country'];
                    $row['gs_zone_region'] = $map['region'];
                    $row['li_contact_country'] = $map['country'];
                    $row['workflow_status'] = 'processed';
                    $row['workflow_reason'] = 'Matched in ' . $map['match_type'];
                    $metrics['processed']++;
                } else {
                    $status = $workflowConfig['mandatory'] ? 'skipped' : 'pending';
                    $row['workflow_status'] = $status;
                    $row['workflow_reason'] = 'No match found';
                    $metrics[$status]++;
                }

                $outputRows[] = $row;
            }

            DB::connection('central')->statement("DROP TEMPORARY TABLE IF EXISTS $tempTable");

            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => $metrics['skipped'] > 0 || $metrics['rejected'] > 0 ? 'pending' : 'completed',
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'completed', $metrics, "Processed `$workflowName`")]
            ]);

            Log::info("✅ Completed CountryMappingMethod", [
                'workflow' => $workflowName,
                'metrics' => $metrics
            ]);

            return $outputRows;
        } catch (\Throwable $e) {
            Log::error("❌ CountryMappingMethod Error", [
                'process_id' => $processId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => 'failed',
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())]
            ]);
            throw $e;
        }
    }
    public function SmtpUpdateMethod(string $workflowName, array $input, array $output, array $metadata): array
    {
        // ✅ Filter rows to only process those with allowed statuses
        $input['rows'] = array_values(array_filter($input['rows'], function ($row) {
            $status = strtolower($row['workflow_status'] ?? '');
            return empty($status) || in_array($status, ['processed', 'pending']);
        }));

        Log::info("📥 Starting SmtpUpdateMethod (SQL-Optimized, ID Preserved)", [
            'workflow' => $workflowName,
            'input_row_count' => count($input['rows'])
        ]);

        $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
        $outputRows = [];
        $processId = $metadata['process_id'] ?? 'unknown';

        try {
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

            if (!$workflowConfig) {
                throw new Exception("No workflow mapping found for `$workflowName`.");
            }

            $mandatory = filter_var($workflowConfig['mandatory'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $supportTable = $workflowConfig['support_table'] ?? null;

            if (!$supportTable) {
                throw new Exception("Invalid configuration: missing support table.");
            }

            // Resolve support connection/schema early
            [$smtpDb, $smtpTbl] = $this->parseDbAndTable($supportTable);
            $smtpConn = $this->getConnectionForDatabase($smtpDb);

            Log::debug('🔎 SmtpUpdateMethod support table resolution', [
                'workflow' => $workflowName,
                'support_table' => $supportTable,
                'connection' => $smtpConn,
                'database' => $smtpDb,
                'table' => $smtpTbl,
            ]);

            // ✅ Create temporary table with needed columns
            $tempTableName = 'temp_update_' . uniqid();
            $tempTable = 'moon.' . $tempTableName;
            DB::connection($smtpConn)->statement("\n            CREATE TEMPORARY TABLE $tempTable (\n                li_company_id VARCHAR(255) COLLATE utf8mb4_unicode_ci,\n                li_company_name VARCHAR(255) COLLATE utf8mb4_unicode_ci,\n                INDEX(li_company_id),\n                INDEX(li_company_name)\n            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci\n        ");

            // ✅ Insert unique li_company_id / li_company_name values
            $insertBatch = [];
            foreach ($input['rows'] as $row) {
                $insertBatch[] = [
                    strtolower(trim($row['li_company_id'] ?? '')),
                    strtolower(trim($row['li_company_name'] ?? ''))
                ];
            }

            if (!empty($insertBatch)) {
                $placeholders = implode(',', array_fill(0, count($insertBatch), '(?, ?)'));
                DB::connection($smtpConn)->statement(
                    "INSERT INTO $tempTable (li_company_id, li_company_name) VALUES $placeholders",
                    array_merge(...$insertBatch)
                );
            }

            // ✅ Perform join to map SMTP and company IDs using resolved connection
            if (!$this->tableExists($smtpConn, $smtpDb, $smtpTbl)) {
                throw new Exception("Support table not found: $supportTable");
            }
            $qualifiedSupportTable = $smtpDb ? ("`$smtpDb`.`$smtpTbl`") : ("`$smtpTbl`");
            $results = DB::connection($smtpConn)->select("\n            SELECT \n                t.li_company_id,\n                t.li_company_name,\n                s.lic_smtp,\n                s.lic_company_id,\n                s.lic_company_name\n            FROM $tempTable t\n            JOIN $qualifiedSupportTable s\n                ON (t.li_company_id != '' AND t.li_company_id = s.lic_company_id)\n                OR (t.li_company_id = '' AND t.li_company_name != '' AND t.li_company_name = s.lic_company_name)\n        ");

            // ✅ Map results by company_id or name
            $mappedData = [];
            foreach ($results as $res) {
                $rowArray = (array) $res;
                $key = strtolower(trim($rowArray['li_company_id'] ?? ''));
                if (!$key) {
                    $key = strtolower(trim($rowArray['li_company_name'] ?? ''));
                }
                $mappedData[$key] = $rowArray;
            }

            // ✅ Loop through input and update
            foreach ($input['rows'] as $row) {
                $metrics['total']++;
                $outputRow = $row; // preserve id, type, etc.

                $lookupKey = strtolower(trim($row['li_company_id'] ?? ''));
                if (!$lookupKey) {
                    $lookupKey = strtolower(trim($row['li_company_name'] ?? ''));
                }
                $match = $mappedData[$lookupKey] ?? null;

                $hasValidMatch = $match && !empty($match['lic_smtp']);

                if ($mandatory) {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'rejected';
                        $outputRow['workflow_reason'] = "No valid match found for company in support table";
                        $metrics['rejected']++;
                    } else {
                        $outputRow['li_smtp'] = $match['lic_smtp'];
                        $outputRow['lic_smtp'] = $match['lic_smtp'];

                        if (empty($row['li_company_id'])) {
                            $outputRow['li_company_id'] = $match['lic_company_id'];
                        }
                        if (empty($row['lic_company_id'])) {
                            $outputRow['lic_company_id'] = $match['lic_company_id'];
                        }

                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                } else {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'pending';
                        $outputRow['workflow_reason'] = "Optional step: no valid match found";
                        $metrics['pending']++;
                    } else {
                        $outputRow['li_smtp'] = $match['lic_smtp'];
                        $outputRow['lic_smtp'] = $match['lic_smtp'];

                        if (empty($row['li_company_id'])) {
                            $outputRow['li_company_id'] = $match['lic_company_id'];
                        }
                        if (empty($row['lic_company_id'])) {
                            $outputRow['lic_company_id'] = $match['lic_company_id'];
                        }

                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                }

                // Normalize industry relevance spelling to canonical 'Relevance' before export
                if (array_key_exists('lic_industry_relavance', $outputRow)) {
                    $value = strtolower(trim((string) $outputRow['lic_industry_relavance']));
                    if (in_array($value, ['relevance', 'relavance', 'revelance', 'revevance', 'revlance', 'revlavance', 'relavence', 'relevence'], true)) {
                        $outputRow['lic_industry_relavance'] = 'Relevance';
                    }
                }

                $outputRows[] = $outputRow;
            }

            DB::connection($smtpConn)->statement("DROP TEMPORARY TABLE IF EXISTS $tempTable");

            $workflowStatus = ($metrics['rejected'] > 0 || $metrics['skipped'] > 0 || $metrics['pending'] > 0) ? 'pending' : 'completed';

            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => $workflowStatus,
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, $workflowStatus, $metrics, "Processed `$workflowName`")]
            ]);

            Log::info("✅ Completed SmtpUpdateMethod", [
                'workflow' => $workflowName,
                'metrics' => $metrics
            ]);
        } catch (\Throwable $e) {
            Log::error("❌ Error in SmtpUpdateMethod (SQL-Optimized, ID Preserved)", [
                'process_id' => $processId,
                'error' => $e->getMessage()
            ]);

            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => 'failed',
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())]
            ]);

            return $outputRows;
        }

        return $outputRows;
    }
    public function SmtpBaseMappingMethod(string $workflowName, array $input, array $output, array $metadata): array
    {
        // ✅ Filter rows to process only those with status 'processed', 'pending', or NULL
        $input['rows'] = array_values(array_filter($input['rows'], function ($row) {
            $status = strtolower($row['workflow_status'] ?? '');
            return empty($status) || in_array($status, ['processed', 'pending']);
        }));

        Log::info("📥 Starting SmtpBaseMappingMethod (SQL-Optimized, ID-preserving)", [
            'workflow' => $workflowName,
            'input_row_count' => count($input['rows'])
        ]);

        $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
        $outputRows = [];
        $processId = $metadata['process_id'] ?? 'unknown';

        try {
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

            if (!$workflowConfig) {
                throw new Exception("No workflow mapping found for `$workflowName`.");
            }

            $mandatory = filter_var($workflowConfig['mandatory'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $supportTable = $workflowConfig['support_table'] ?? null;
            $requiredHeaders = $workflowConfig['required_headers'] ?? ['li_smtp'];
            $mappingHeaders = $workflowConfig['mapping_headers'] ?? ['li_smtp'];
            $updateHeaders = $workflowConfig['update_headers'] ?? ['lic_smtp', 'lic_company_id', 'lic_company_name'];

            if (!$supportTable || empty($requiredHeaders) || empty($mappingHeaders) || empty($updateHeaders)) {
                throw new Exception("Invalid configuration: missing support table, required headers, mapping headers, or update headers.");
            }

            // Resolve connection for support table (e.g., mars.li_company_info)
            [$dbName, $tblName] = $this->parseDbAndTable($supportTable);
            $supportConn = $this->getConnectionForDatabase($dbName);

            // Filter update headers to only existing columns to avoid unknown column errors
            $existingCols = $this->getTableColumns($supportConn, $dbName, $tblName);
            if (!empty($existingCols)) {
                $updateHeaders = array_values(array_filter($updateHeaders, fn($c) => in_array($c, $existingCols, true)));
            }

            Log::debug('🔎 SmtpBaseMappingMethod support table resolution', [
                'workflow' => $workflowName,
                'support_table' => $supportTable,
                'connection' => $supportConn,
                'database' => $dbName,
                'table' => $tblName,
                'filtered_update_headers' => $updateHeaders
            ]);

            // ✅ Create temporary table
            $tempTableName = 'temp_smtp_' . uniqid();
            $tempTable = 'moon.' . $tempTableName;
            $cols = implode(', ', array_map(fn($col) => "`$col` VARCHAR(255) COLLATE utf8mb4_unicode_ci", $mappingHeaders));
            $indexes = implode(', ', array_map(fn($col) => "INDEX(`$col`)", $mappingHeaders));
            DB::connection('central')->statement("CREATE TEMPORARY TABLE $tempTable ($cols, $indexes) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // ✅ Insert rows into temp table
            $maxPlaceholders = 10000;
            $columnCount = count($mappingHeaders);
            $batchSize = max(1, floor($maxPlaceholders / $columnCount));
            $insertBatch = [];

            foreach ($input['rows'] as $row) {
                $keyParts = array_map(fn($col) => strtolower(trim($row[$col] ?? '')), $mappingHeaders);
                $insertBatch[] = $keyParts;

                if (count($insertBatch) >= $batchSize) {
                    $placeholders = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, $columnCount, '?')) . ')'));
                    DB::connection('central')->statement(
                        "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                        array_merge(...$insertBatch)
                    );
                    $insertBatch = [];
                }
            }

            if (!empty($insertBatch)) {
                $placeholders = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, $columnCount, '?')) . ')'));
                DB::connection('central')->statement(
                    "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                    array_merge(...$insertBatch)
                );
            }

            // ✅ Join with support table
            $on = implode(' AND ', array_map(fn($col) => "t.`$col` = s.`$col`", $mappingHeaders));
            $select = implode(', ', array_merge(
                array_map(fn($col) => "s.`$col`", $updateHeaders),
                array_map(fn($col) => "t.`$col`", $mappingHeaders)
            ));
            $qualifiedSupportTable = $dbName ? ("`$dbName`.`$tblName`") : ("`$tblName`");
            $results = DB::connection($supportConn)->select("SELECT $select FROM $tempTable t LEFT JOIN $qualifiedSupportTable s ON $on");

            // ✅ Map lookup results
            $mappedData = [];
            foreach ($results as $res) {
                $rowArray = (array)$res;
                $lookupKey = implode('|', array_map(fn($col) => strtolower(trim($rowArray[$col] ?? '')), $mappingHeaders));
                $mappedData[$lookupKey] = $rowArray;
            }

            // ✅ Process each row
            foreach ($input['rows'] as $row) {
                $metrics['total']++;
                $outputRow = $row; // preserve id, type, etc.

                // Skip rows missing mandatory field
                if ($mandatory && (empty(trim($row[$requiredHeaders[0]] ?? '')) || is_null($row[$requiredHeaders[0]]))) {
                    $outputRow['workflow_status'] = 'skipped';
                    $outputRow['workflow_reason'] = "Missing or NULL `{$requiredHeaders[0]}`";
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                $keyParts = array_map(fn($col) => strtolower(trim($row[$col] ?? '')), $mappingHeaders);
                $lookupKey = implode('|', $keyParts);
                $match = $mappedData[$lookupKey] ?? null;

                $hasValidMatch = $match && !empty(array_filter(array_intersect_key($match, array_flip($updateHeaders)), fn($v) => $v !== null));

                if ($mandatory) {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'rejected';
                        $outputRow['workflow_reason'] = "No valid match found for {$mappingHeaders[0]} in support table";
                        $metrics['rejected']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) {
                                $outputRow[$field] = $match[$field];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                } else {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'pending';
                        $outputRow['workflow_reason'] = "Optional step: no valid match found for {$mappingHeaders[0]}";
                        $metrics['pending']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) {
                                $outputRow[$field] = $match[$field];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                }

                $outputRows[] = $outputRow;
            }

            DB::connection('central')->statement("DROP TEMPORARY TABLE IF EXISTS $tempTable");

            // ✅ Log completion
            $workflowStatus = ($metrics['rejected'] > 0 || $metrics['skipped'] > 0 || $metrics['pending'] > 0) ? 'pending' : 'completed';
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => $workflowStatus,
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, $workflowStatus, $metrics, "Processed `$workflowName`")]
            ]);

            Log::info("✅ Completed SmtpBaseMappingMethod", [
                'workflow' => $workflowName,
                'metrics' => $metrics
            ]);
        } catch (\Throwable $e) {
            Log::error("❌ Error in SmtpBaseMappingMethod", [
                'process_id' => $processId,
                'error' => $e->getMessage()
            ]);

            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => 'failed',
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())]
            ]);

            return $outputRows; // partial results
        }

        return $outputRows;
    }
    public function GmseMappingMethod(string $workflowName, array $input, array $output, array $metadata): array
    {
        // ✅ Filter only needed rows
        $input['rows'] = array_values(array_filter($input['rows'], function ($row) {
            $status = strtolower($row['workflow_status'] ?? '');
            return empty($status) || in_array($status, ['processed', 'pending']);
        }));

        Log::info("📥 Starting GmseMappingMethod (SQL-Optimized, ID-preserving)", [
            'workflow' => $workflowName,
            'input_row_count' => count($input['rows'])
        ]);

        $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
        $outputRows = [];
        $processId = $metadata['process_id'] ?? 'unknown';

        try {
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

            if (!$workflowConfig) {
                throw new Exception("No workflow mapping found for `$workflowName`.");
            }

            $mandatory       = filter_var($workflowConfig['mandatory'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $supportTable    = $workflowConfig['support_table'] ?? 'mars.gmse_company_info';
            $requiredHeaders = $workflowConfig['required_headers'] ?? ['li_smtp', 'li_contact_country'];
            $mappingHeaders  = $workflowConfig['mapping_headers'] ?? ['gs_smtp', 'gs_country'];
            $updateHeaders   = $workflowConfig['update_headers'] ?? [
                'gs_place_url',
                'gs_category',
                'gs_phone_number',
                'gs_company_address',
                'gs_street',
                'gs_city',
                'gs_state',
                'gs_zipcode',
                'gs_country',
                'gs_zone_region',
                'gs_country_code',
                'gs_plus_code',
                'gs_website',
                'gs_smtp',
                'gs_company_name',
                'gs_title'
            ];

            if (!$supportTable || empty($requiredHeaders) || empty($mappingHeaders) || empty($updateHeaders)) {
                throw new Exception("Invalid configuration: missing support table, headers, or mapping headers.");
            }

            // Resolve support connection early
            [$gmseDb, $gmseTbl] = $this->parseDbAndTable($supportTable);
            $gmseConn = $this->getConnectionForDatabase($gmseDb);

            Log::debug('🔎 GmseMappingMethod support table resolution', [
                'workflow' => $workflowName,
                'support_table' => $supportTable,
                'connection' => $gmseConn,
                'database' => $gmseDb,
                'table' => $gmseTbl,
            ]);

            // ✅ Create temp table with mappingHeaders like SMTP method
            $tempTableName = 'temp_gmse_' . uniqid();
            $tempTable = 'moon.' . $tempTableName;
            $cols = implode(', ', array_map(fn($col) => "`$col` VARCHAR(255) COLLATE utf8mb4_unicode_ci", $mappingHeaders));
            $indexes = implode(', ', array_map(fn($col) => "INDEX(`$col`)", $mappingHeaders));
            DB::connection($gmseConn)->statement("CREATE TEMPORARY TABLE $tempTable ($cols, $indexes) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // ✅ Insert values into temp table (mappingHeaders from input)
            $maxPlaceholders = 10000;
            $columnCount = count($mappingHeaders);
            $batchSize = max(1, floor($maxPlaceholders / $columnCount));
            $insertBatch = [];

            foreach ($input['rows'] as $row) {
                $keyParts = array_map(function ($i) use ($row, $requiredHeaders) {
                    return strtolower(trim($row[$requiredHeaders[$i]] ?? ''));
                }, array_keys($mappingHeaders)); // keep order
                $insertBatch[] = $keyParts;

                if (count($insertBatch) >= $batchSize) {
                    $placeholders = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, $columnCount, '?')) . ')'));
                    DB::connection($gmseConn)->statement(
                        "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                        array_merge(...$insertBatch)
                    );
                    $insertBatch = [];
                }
            }

            if (!empty($insertBatch)) {
                $placeholders = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, $columnCount, '?')) . ')'));
                DB::connection($gmseConn)->statement(
                    "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                    array_merge(...$insertBatch)
                );
            }

            // ✅ Join with support table (identical to SMTP)
            $on = implode(' AND ', array_map(fn($col) => "t.`$col` = s.`$col`", $mappingHeaders));
            $select = implode(', ', array_merge(
                array_map(fn($col) => "s.`$col`", $updateHeaders),
                array_map(fn($col) => "t.`$col`", $mappingHeaders)
            ));
            $qualifiedGmseTable = $gmseDb ? ("`$gmseDb`.`$gmseTbl`") : ("`$gmseTbl`");
            $results = DB::connection($gmseConn)->select("SELECT $select FROM $tempTable t LEFT JOIN $qualifiedGmseTable s ON $on");

            // ✅ Build map
            $mappedData = [];
            foreach ($results as $res) {
                $rowArray = (array)$res;
                $lookupKey = implode('|', array_map(fn($col) => strtolower(trim($rowArray[$col] ?? '')), $mappingHeaders));
                $mappedData[$lookupKey] = $rowArray;
            }

            // ✅ Process each row (same as SMTP)
            foreach ($input['rows'] as $row) {
                $metrics['total']++;
                $outputRow = $row;

                if ($mandatory && (empty(trim($row[$requiredHeaders[0]] ?? '')) || is_null($row[$requiredHeaders[0]]))) {
                    $outputRow['workflow_status'] = 'skipped';
                    $outputRow['workflow_reason'] = "Missing or NULL `{$requiredHeaders[0]}`";
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                // Build lookup key from requiredHeaders / mappingHeaders mapping
                $keyParts = array_map(function ($i) use ($row, $requiredHeaders) {
                    return strtolower(trim($row[$requiredHeaders[$i]] ?? ''));
                }, array_keys($mappingHeaders));
                $lookupKey = implode('|', $keyParts);

                $match = $mappedData[$lookupKey] ?? null;
                $hasValidMatch = $match && !empty(array_filter(array_intersect_key($match, array_flip($updateHeaders)), fn($v) => $v !== null));

                if ($mandatory) {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'rejected';
                        $outputRow['workflow_reason'] = "No valid match found for {$mappingHeaders[0]} in support table";
                        $metrics['rejected']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) {
                                $outputRow[$field] = $match[$field];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                } else {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'pending';
                        $outputRow['workflow_reason'] = "Optional step: no valid match found for {$mappingHeaders[0]}";
                        $metrics['pending']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) {
                                $outputRow[$field] = $match[$field];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                }

                $outputRows[] = $outputRow;
            }

            DB::connection($gmseConn)->statement("DROP TEMPORARY TABLE IF EXISTS $tempTable");

            // ✅ Update logs
            $workflowStatus = ($metrics['rejected'] > 0 || $metrics['skipped'] > 0 || $metrics['pending'] > 0) ? 'pending' : 'completed';
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => $workflowStatus,
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, $workflowStatus, $metrics, "Processed `$workflowName`")]
            ]);

            Log::info("✅ Completed GmseMappingMethod", [
                'workflow' => $workflowName,
                'metrics' => $metrics
            ]);
        } catch (\Throwable $e) {
            Log::error("❌ Error in GmseMappingMethod", [
                'process_id' => $processId,
                'error' => $e->getMessage()
            ]);

            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => 'failed',
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())]
            ]);

            return $outputRows;
        }

        return $outputRows;
    }
   
    public function CompanyAboutMappingMethod(string $workflowName, array $input, array $output, array $metadata): array
    {
        // ✅ Filter rows to process only those with status 'processed', 'pending', or NULL
        $input['rows'] = array_values(array_filter($input['rows'], function ($row) {
            $status = strtolower($row['workflow_status'] ?? '');
            return empty($status) || in_array($status, ['processed', 'pending']);
        }));

        Log::info("📥 Starting CompanyAboutMappingMethod (Optimized for large TEXT)", [
            'workflow' => $workflowName,
            'input_row_count' => count($input['rows'])
        ]);

        $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
        $outputRows = [];
        $processId = $metadata['process_id'] ?? 'unknown';

        try {
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

            if (!$workflowConfig) {
                throw new Exception("No workflow mapping found for `$workflowName`.");
            }

            $mandatory       = filter_var($workflowConfig['mandatory'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $supportTable    = $workflowConfig['support_table'] ?? 'earth.lic_company_extr';
            $requiredHeaders = $workflowConfig['required_headers'] ?? ['lic_company_id', 'lic_company_name'];
            $mappingHeaders  = $workflowConfig['mapping_headers'] ?? ['lic_company_id', 'lic_company_name'];
            $updateHeaders   = $workflowConfig['update_headers'] ?? ['lic_company_id', 'lic_company_name', 'lic_company_about'];

            if (!$supportTable || empty($requiredHeaders) || empty($mappingHeaders) || empty($updateHeaders)) {
                throw new Exception("Invalid configuration: missing support table, required headers, mapping headers, or update headers.");
            }

            // ✅ Create lightweight temporary table (only IDs/names, no TEXT here)
            $tempTableName = 'temp_companyabout_' . uniqid();
            $tempTable = 'moon.' . $tempTableName;
            $cols = implode(', ', array_map(fn($col) => "`$col` VARCHAR(255) COLLATE utf8mb4_unicode_ci", $mappingHeaders));
            $indexes = implode(', ', array_map(fn($col) => "INDEX(`$col`)", $mappingHeaders));
            DB::connection('central')->statement("CREATE TEMPORARY TABLE $tempTable ($cols, $indexes) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // ✅ Insert rows into temp table in batches (safe for huge input sets)
            $maxPlaceholders = 10000;
            $columnCount = count($mappingHeaders);
            $batchSize = max(1, floor($maxPlaceholders / $columnCount));
            $insertBatch = [];

            foreach ($input['rows'] as $row) {
                $keyParts = array_map(function ($i) use ($row, $requiredHeaders) {
                    return strtolower(trim($row[$requiredHeaders[$i]] ?? ''));
                }, array_keys($mappingHeaders));
                $insertBatch[] = $keyParts;

                if (count($insertBatch) >= $batchSize) {
                    $placeholders = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, $columnCount, '?')) . ')'));
                    DB::connection('central')->statement(
                        "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                        array_merge(...$insertBatch)
                    );
                    $insertBatch = [];
                }
            }
            if (!empty($insertBatch)) {
                $placeholders = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, $columnCount, '?')) . ')'));
                DB::connection('central')->statement(
                    "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                    array_merge(...$insertBatch)
                );
            }

            // ✅ Join with support table (TEXT included, but not part of join keys)
            $on = implode(' AND ', array_map(fn($col) => "t.`$col` = s.`$col`", $mappingHeaders));
            $select = implode(', ', array_merge(
                array_map(fn($col) => "s.`$col`", $updateHeaders),  // includes lic_company_about safely
                array_map(fn($col) => "t.`$col`", $mappingHeaders)
            ));
            $results = DB::connection('central')->select("SELECT $select FROM $tempTable t LEFT JOIN $supportTable s ON $on");

            // ✅ Build lookup map in PHP
            $mappedData = [];
            foreach ($results as $res) {
                $rowArray = (array)$res;
                $lookupKey = implode('|', array_map(fn($col) => strtolower(trim($rowArray[$col] ?? '')), $mappingHeaders));
                $mappedData[$lookupKey] = $rowArray;
            }

            // ✅ Process rows
            foreach ($input['rows'] as $row) {
                $metrics['total']++;
                $outputRow = $row;

                // ✅ FIXED mandatory check (both ID + name required)
                if ($mandatory && (empty(trim($row[$requiredHeaders[0]] ?? '')) || empty(trim($row[$requiredHeaders[1]] ?? '')))) {
                    $outputRow['workflow_status'] = 'skipped';
                    $outputRow['workflow_reason'] = "Missing or NULL `{$requiredHeaders[0]}` or `{$requiredHeaders[1]}`";
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                $keyParts = array_map(function ($i) use ($row, $requiredHeaders) {
                    return strtolower(trim($row[$requiredHeaders[$i]] ?? ''));
                }, array_keys($mappingHeaders));
                $lookupKey = implode('|', $keyParts);
                $match = $mappedData[$lookupKey] ?? null;

                $hasValidMatch = $match && !empty(array_filter(array_intersect_key($match, array_flip($updateHeaders)), fn($v) => $v !== null));

                if ($mandatory) {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'rejected';
                        $outputRow['workflow_reason'] = "No valid Company About match found";
                        $metrics['rejected']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) {
                                $outputRow[$field] = $match[$field]; // includes huge TEXT safely
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Company about mapped successfully';
                        $metrics['processed']++;
                    }
                } else {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'pending';
                        $outputRow['workflow_reason'] = "Optional step: no valid match found";
                        $metrics['pending']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) {
                                $outputRow[$field] = $match[$field];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Company about mapped successfully';
                        $metrics['processed']++;
                    }
                }

                $outputRows[] = $outputRow;
            }

            // ✅ Cleanup temp table
            DB::connection('central')->statement("DROP TEMPORARY TABLE IF EXISTS $tempTable");

            // ✅ Log completion
            $workflowStatus = ($metrics['rejected'] > 0 || $metrics['skipped'] > 0 || $metrics['pending'] > 0) ? 'pending' : 'completed';
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => $workflowStatus,
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, $workflowStatus, $metrics, "Processed `$workflowName`")]
            ]);

            Log::info("✅ Completed CompanyAboutMappingMethod", [
                'workflow' => $workflowName,
                'metrics' => $metrics
            ]);
        } catch (\Throwable $e) {
            Log::error("❌ Error in CompanyAboutMappingMethod", [
                'process_id' => $processId,
                'error' => $e->getMessage()
            ]);

            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => 'failed',
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())]
            ]);

            return $outputRows;
        }

        return $outputRows;
    }

    public function ApolloMappingMethod(string $workflowName, array $input, array $output, array $metadata): array
    {
        // ✅ Filter rows to process only those with status 'processed', 'pending', or NULL
        $input['rows'] = array_values(array_filter($input['rows'], function ($row) {
            $status = strtolower($row['workflow_status'] ?? '');
            return empty($status) || in_array($status, ['processed', 'pending']);
        }));

        Log::info("📥 Starting ApolloMappingMethod (SMTP-Style)", [
            'workflow' => $workflowName,
            'input_row_count' => count($input['rows'])
        ]);

        $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
        $outputRows = [];
        $processId = $metadata['process_id'] ?? 'unknown';

        try {
            // ✅ Load workflow config
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

            if (!$workflowConfig) {
                throw new Exception("No workflow mapping found for `$workflowName`.");
            }

            $mandatory       = filter_var($workflowConfig['mandatory'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $supportTable    = $workflowConfig['support_table'] ?? 'jupiter.apollo_data';
            $requiredHeaders = $workflowConfig['required_headers'] ?? ['lic_smtp', 'lic_company_name', 'li_full_name', 'li_job_title'];
            $mappingHeaders  = $workflowConfig['mapping_headers'] ?? ['ap_company_smtp', 'ap_company_name', 'ap_full_name', 'ap_job_title'];
            $updateHeaders   = $workflowConfig['update_headers'] ?? ['ap_linkedin_contact_url', 'ap_full_name', 'ap_contact_city', 'ap_contact_country', 'ap_contact_twitter_url', 'ap_contact_facebook_url', 'last_contact_date', 'ap_industry', 'ap_company_keywords', 'ap_company_city', 'ap_company_state', 'ap_company_country', 'ap_company_linkedin_url', 'ap_company_twitter_url', 'ap_company_facebook_url', 'ap_company_phone_numbers', 'ap_company_name', 'ap_company_website', 'ap_company_smtp'];

            if (!$supportTable || empty($requiredHeaders) || empty($mappingHeaders) || empty($updateHeaders)) {
                throw new Exception("Invalid configuration: missing support table, required headers, mapping headers, or update headers.");
            }

            // ✅ Create temporary table
            $tempTableName = 'temp_apollo_' . uniqid();
            $tempTable = 'moon.' . $tempTableName;
            $cols = implode(', ', array_map(fn($col) => "`$col` VARCHAR(255) COLLATE utf8mb4_unicode_ci", $mappingHeaders));
            $indexes = implode(', ', array_map(fn($col) => "INDEX(`$col`)", $mappingHeaders));
            DB::connection('central')->statement("CREATE TEMPORARY TABLE $tempTable ($cols, $indexes) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // ✅ Insert rows into temp table
            $maxPlaceholders = 10000;
            $columnCount = count($mappingHeaders);
            $batchSize = max(1, floor($maxPlaceholders / $columnCount));
            $insertBatch = [];

            foreach ($input['rows'] as $row) {
                $keyParts = array_map(function ($i) use ($row, $requiredHeaders) {
                    return strtolower(trim($row[$requiredHeaders[$i]] ?? ''));
                }, array_keys($mappingHeaders));
                $insertBatch[] = $keyParts;

                if (count($insertBatch) >= $batchSize) {
                    $placeholders = implode(',', array_fill(
                        0,
                        count($insertBatch),
                        '(' . implode(',', array_fill(0, $columnCount, '?')) . ')'
                    ));
                    DB::connection('central')->statement(
                        "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                        array_merge(...$insertBatch)
                    );
                    $insertBatch = [];
                }
            }

            if (!empty($insertBatch)) {
                $placeholders = implode(',', array_fill(
                    0,
                    count($insertBatch),
                    '(' . implode(',', array_fill(0, $columnCount, '?')) . ')'
                ));
                DB::connection('central')->statement(
                    "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                    array_merge(...$insertBatch)
                );
            }

            // ✅ Join with support table
            $on = implode(' AND ', array_map(fn($col) => "t.`$col` = s.`$col`", $mappingHeaders));
            $select = implode(', ', array_merge(
                array_map(fn($col) => "s.`$col`", $updateHeaders),
                array_map(fn($col) => "t.`$col`", $mappingHeaders)
            ));
            $results = DB::connection('central')->select("SELECT $select FROM $tempTable t LEFT JOIN $supportTable s ON $on");

            // ✅ Map lookup results
            $mappedData = [];
            foreach ($results as $res) {
                $rowArray = (array)$res;
                $lookupKey = implode('|', array_map(fn($col) => strtolower(trim($rowArray[$col] ?? '')), $mappingHeaders));
                $mappedData[$lookupKey] = $rowArray;
            }

            // ✅ Process each row
            foreach ($input['rows'] as $row) {
                $metrics['total']++;
                $outputRow = $row;

                // Skip rows missing mandatory fields
                if ($mandatory && count(array_filter($requiredHeaders, fn($h) => empty(trim($row[$h] ?? '')))) > 0) {
                    $outputRow['workflow_status'] = 'skipped';
                    $outputRow['workflow_reason'] = "Missing required mapping fields";
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                $keyParts = array_map(function ($i) use ($row, $requiredHeaders) {
                    return strtolower(trim($row[$requiredHeaders[$i]] ?? ''));
                }, array_keys($mappingHeaders));
                $lookupKey = implode('|', $keyParts);
                $match = $mappedData[$lookupKey] ?? null;

                $hasValidMatch = $match && !empty(array_filter(array_intersect_key($match, array_flip($updateHeaders)), fn($v) => $v !== null));

                // Define field mapping for the problematic fields
                $fieldMapping = [
                    'ap_full_name' => 'ap_company_name',  // Map company name to fullname
                    'ap_company_smtp' => 'ap_company_smtp',  // Keep SMTP as is
                    'ap_company_name' => 'ap_company_name',  // Keep company name as is
                ];

                if ($mandatory) {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'rejected';
                        $outputRow['workflow_reason'] = "No valid Apollo match found";
                        $metrics['rejected']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            $sourceField = $fieldMapping[$field] ?? $field;
                            if (isset($match[$sourceField]) && $match[$sourceField] !== null) {
                                $outputRow[$field] = $match[$sourceField];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Apollo match found and updated';
                        $metrics['processed']++;
                    }
                } else {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'pending';
                        $outputRow['workflow_reason'] = "Optional: no Apollo match found";
                        $metrics['pending']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            $sourceField = $fieldMapping[$field] ?? $field;
                            if (isset($match[$sourceField]) && $match[$sourceField] !== null) {
                                $outputRow[$field] = $match[$sourceField];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Apollo match found and updated';
                        $metrics['processed']++;
                    }
                }

                $outputRows[] = $outputRow;
            }

            // ✅ Drop temp table
            DB::connection('central')->statement("DROP TEMPORARY TABLE IF EXISTS $tempTable");

            // ✅ Log completion
            $workflowStatus = ($metrics['rejected'] || $metrics['skipped'] || $metrics['pending']) ? 'pending' : 'completed';
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => $workflowStatus,
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [
                    ProcessFlowHelper::addTraceEntry($workflowName, $workflowStatus, $metrics, "Processed `$workflowName`")
                ]
            ]);

            Log::info("✅ Completed ApolloMappingMethod", [
                'workflow' => $workflowName,
                'metrics' => $metrics
            ]);
        } catch (\Throwable $e) {
            Log::error("❌ Error in ApolloMappingMethod", [
                'process_id' => $processId,
                'error' => $e->getMessage()
            ]);

            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode' => $metadata['mode'] ?? 'unknown',
                'status' => 'failed',
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [
                    ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())
                ]
            ]);

            return $outputRows;
        }

        return $outputRows;
    }
    public function ZoomInfoMappingMethod(string $workflowName, array $input, array $output, array $metadata): array
    {
        // ✅ Filter only rows with status 'processed', 'pending', or NULL
        $input['rows'] = array_values(array_filter($input['rows'], function ($row) {
            $status = strtolower($row['workflow_status'] ?? '');
            return empty($status) || in_array($status, ['processed', 'pending']);
        }));

        Log::info("📥 Starting ZoomInfoMappingMethod (GMSE-Style)", [
            'workflow' => $workflowName,
            'input_row_count' => count($input['rows'])
        ]);

        $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
        $outputRows = [];
        $processId = $metadata['process_id'] ?? 'unknown';

        try {
            // ✅ Load config
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($c) => strcasecmp(trim($c['workflow_name'] ?? ''), trim($workflowName)) === 0);
            if (!$workflowConfig) {
                throw new Exception("No workflow mapping found for `$workflowName`.");
            }

            $mandatory       = filter_var($workflowConfig['mandatory'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $supportTable    = $workflowConfig['support_table'] ?? 'saturn.zm_data';
            $requiredHeaders = $workflowConfig['required_headers'] ?? ['lic_smtp', 'lic_company_name'];
            $mappingHeaders  = $workflowConfig['mapping_headers'] ?? ['zm_smtp', 'zm_company'];
            $updateHeaders   = $workflowConfig['update_headers'] ?? [
                'zm_smtp',
                'zm_company',
                'zm_technologies',
                'zm_revenue_size',
                'zm_location',
                'zm_industry',
                'zm_employee_size',
                'zm_website',
                'zm_country',
                'zm_summary',
                'zm_sic_codes',
                'zm_naics_codes'
            ];

            if (!$supportTable || empty($requiredHeaders) || empty($mappingHeaders) || empty($updateHeaders)) {
                throw new Exception("Invalid configuration: missing support table, headers, or mapping headers.");
            }

            // Resolve support connection early
            [$zmDb, $zmTbl] = $this->parseDbAndTable($supportTable);
            $zmConn = $this->getConnectionForDatabase($zmDb);

            Log::debug('🔎 ZoomInfoMappingMethod support table resolution', [
                'workflow' => $workflowName,
                'support_table' => $supportTable,
                'connection' => $zmConn,
                'database' => $zmDb,
                'table' => $zmTbl,
            ]);

            // ✅ Create temp table
            $tempTableName = 'temp_zoominfo_' . uniqid();
            $tempTable = 'moon.' . $tempTableName;
            $cols = implode(', ', array_map(fn($col) => "`$col` VARCHAR(255) COLLATE utf8mb4_unicode_ci", $mappingHeaders));
            $indexes = implode(', ', array_map(fn($col) => "INDEX(`$col`)", $mappingHeaders));
            DB::connection($zmConn)->statement(
                "CREATE TEMPORARY TABLE $tempTable ($cols, $indexes)
             ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
            );

            // ✅ Insert data into temp table
            $maxPlaceholders = 10000;
            $colCount = count($mappingHeaders);
            $batchSize = max(1, floor($maxPlaceholders / $colCount));
            $insertBatch = [];

            foreach ($input['rows'] as $row) {
                $keyParts = array_map(function ($i) use ($row, $requiredHeaders) {
                    return strtolower(trim($row[$requiredHeaders[$i]] ?? ''));
                }, array_keys($mappingHeaders));
                $insertBatch[] = $keyParts;

                if (count($insertBatch) >= $batchSize) {
                    $placeholders = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, $colCount, '?')) . ')'));
                    DB::connection($zmConn)->statement(
                        "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                        array_merge(...$insertBatch)
                    );
                    $insertBatch = [];
                }
            }
            if (!empty($insertBatch)) {
                $placeholders = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, $colCount, '?')) . ')'));
                DB::connection($zmConn)->statement(
                    "INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $placeholders",
                    array_merge(...$insertBatch)
                );
            }

            // ✅ Join with support table
            $on = implode(' AND ', array_map(fn($col) => "t.`$col` = s.`$col`", $mappingHeaders));
            $select = implode(', ', array_merge(
                array_map(fn($col) => "s.`$col`", $updateHeaders),
                array_map(fn($col) => "t.`$col`", $mappingHeaders)
            ));
            $qualifiedSupportTable = $zmDb ? ("`$zmDb`.`$zmTbl`") : ("`$zmTbl`");
            $results = DB::connection($zmConn)->select("SELECT $select FROM $tempTable t LEFT JOIN $qualifiedSupportTable s ON $on");

            // ✅ Build in-memory map
            $mappedData = [];
            foreach ($results as $res) {
                $rowArray = (array)$res;
                $lookupKey = implode('|', array_map(fn($col) => strtolower(trim($rowArray[$col] ?? '')), $mappingHeaders));
                $mappedData[$lookupKey] = $rowArray;
            }

            // ✅ Process each row
            foreach ($input['rows'] as $row) {
                $metrics['total']++;
                $outputRow = $row;

                if ($mandatory && count(array_filter($requiredHeaders, fn($h) => empty(trim($row[$h] ?? '')))) > 0) {
                    $outputRow['workflow_status'] = 'skipped';
                    $outputRow['workflow_reason'] = "Missing or NULL `{$requiredHeaders[0]}`";
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    continue;
                }

                $keyParts = array_map(function ($i) use ($row, $requiredHeaders) {
                    return strtolower(trim($row[$requiredHeaders[$i]] ?? ''));
                }, array_keys($mappingHeaders));
                $lookupKey = implode('|', $keyParts);
                $match = $mappedData[$lookupKey] ?? null;
                $hasValidMatch = $match && !empty(array_filter(array_intersect_key($match, array_flip($updateHeaders)), fn($v) => $v !== null));

                if ($mandatory) {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'rejected';
                        $outputRow['workflow_reason'] = "No valid match found for {$mappingHeaders[0]} in support table";
                        $metrics['rejected']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) {
                                $outputRow[$field] = $match[$field];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                } else {
                    if (!$hasValidMatch) {
                        $outputRow['workflow_status'] = 'pending';
                        $outputRow['workflow_reason'] = "Optional step: no valid match found for {$mappingHeaders[0]}";
                        $metrics['pending']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) {
                                $outputRow[$field] = $match[$field];
                            }
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                }
                $outputRows[] = $outputRow;
            }

            // ✅ Drop temp table
            DB::connection($zmConn)->statement("DROP TEMPORARY TABLE IF EXISTS $tempTable");

            // ✅ Final logs
            $workflowStatus = ($metrics['rejected'] > 0 || $metrics['skipped'] > 0 || $metrics['pending'] > 0)
                ? 'pending' : 'completed';
            ProcessFlowHelper::updateLogs([
                'process_id'   => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode'         => $metadata['mode'] ?? 'unknown',
                'status'       => $workflowStatus,
                'input'        => $input,
                'output'       => $output,
                'total'        => $metrics['total'],
                'processed'    => $metrics['processed'],
                'rejected'     => $metrics['rejected'],
                'skipped'      => $metrics['skipped'],
                'pending'      => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, $workflowStatus, $metrics, "Processed `$workflowName`")]
            ]);

            Log::info("✅ Completed ZoomInfoMappingMethod", [
                'workflow' => $workflowName,
                'metrics'  => $metrics
            ]);
        } catch (\Throwable $e) {
            Log::error("❌ Error in ZoomInfoMappingMethod", [
                'process_id' => $processId,
                'error'      => $e->getMessage()
            ]);
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'status'     => 'failed',
                'total'      => $metrics['total'],
                'processed'  => $metrics['processed'],
                'rejected'   => $metrics['rejected'],
                'skipped'    => $metrics['skipped'],
                'pending'    => $metrics['pending'],
                'trace_details' => [
                    ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())
                ]
            ]);
            return $outputRows;
        }

        return $outputRows;
    }
    public function PySmtpMappingMethod(string $workflowName, array $input, array $output, array $metadata): array
    {
        // ✅ Filter
        $input['rows'] = array_values(array_filter($input['rows'], function ($row) {
            $status = strtolower($row['workflow_status'] ?? '');
            return empty($status) || in_array($status, ['processed', 'pending']);
        }));

        Log::info("📥 Starting PySmtpMappingMethod (SMTP-Style)", [
            'workflow' => $workflowName,
            'input_row_count' => count($input['rows'])
        ]);

        $metrics = ['total' => 0, 'processed' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
        $outputRows = [];
        $processId = $metadata['process_id'] ?? 'unknown';

        try {
            // ✅ Config
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($c) => strcasecmp(trim($c['workflow_name'] ?? ''), trim($workflowName)) === 0);
            if (!$workflowConfig) throw new Exception("No workflow mapping found for `$workflowName`.");

            $mandatory       = filter_var($workflowConfig['mandatory'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $supportTable    = $workflowConfig['support_table'] ?? 'neptune.py_smtp';
            $requiredHeaders = $workflowConfig['required_headers'] ?? ['lic_smtp'];
            $mappingHeaders  = $workflowConfig['mapping_headers'] ?? ['py_smtp'];
            $updateHeaders   = $workflowConfig['update_headers'] ?? [
                'py_smtp',
                'py_title',
                'py_keywords',
                'py_description',
                'py_fetched_by'
            ];
            if (!$supportTable || empty($requiredHeaders) || empty($mappingHeaders) || empty($updateHeaders)) {
                throw new Exception("Invalid configuration: missing support table, required headers, mapping headers, or update headers.");
            }

            // ✅ Temp table
            $tempTableName = 'temp_pysmtp_' . uniqid();
            $tempTable = 'moon.' . $tempTableName;
            $cols = implode(', ', array_map(fn($col) => "`$col` VARCHAR(255) COLLATE utf8mb4_unicode_ci", $mappingHeaders));
            $indexes = implode(', ', array_map(fn($col) => "INDEX(`$col`)", $mappingHeaders));
            DB::connection('central')->statement("CREATE TEMPORARY TABLE $tempTable ($cols,$indexes) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // ✅ Insert
            $maxPlaceholders = 10000;
            $colCount = count($mappingHeaders);
            $batchSize = max(1, floor($maxPlaceholders / $colCount));
            $insertBatch = [];
            foreach ($input['rows'] as $row) {
                $keyParts = array_map(fn($i) => strtolower(trim($row[$requiredHeaders[$i]] ?? '')), array_keys($mappingHeaders));
                $insertBatch[] = $keyParts;
                if (count($insertBatch) >= $batchSize) {
                    $ph = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, $colCount, '?')) . ')'));
                    DB::connection('central')->statement("INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $ph", array_merge(...$insertBatch));
                    $insertBatch = [];
                }
            }
            if ($insertBatch) {
                $ph = implode(',', array_fill(0, count($insertBatch), '(' . implode(',', array_fill(0, $colCount, '?')) . ')'));
                DB::connection('central')->statement("INSERT INTO $tempTable (" . implode(',', $mappingHeaders) . ") VALUES $ph", array_merge(...$insertBatch));
            }

            // ✅ Join
            $on = implode(' AND ', array_map(fn($col) => "t.`$col` = s.`$col`", $mappingHeaders));
            $select = implode(', ', array_merge(array_map(fn($col) => "s.`$col`", $updateHeaders), array_map(fn($col) => "t.`$col`", $mappingHeaders)));
            $results = DB::connection('central')->select("SELECT $select FROM $tempTable t LEFT JOIN $supportTable s ON $on");

            // ✅ Map
            $mappedData = [];
            foreach ($results as $res) {
                $arr = (array)$res;
                $lookupKey = implode('|', array_map(fn($c) => strtolower(trim($arr[$c] ?? '')), $mappingHeaders));
                $mappedData[$lookupKey] = $arr;
            }

            // ✅ Process
            foreach ($input['rows'] as $row) {
                $metrics['total']++;
                $outputRow = $row;
                if ($mandatory && empty(trim($row[$requiredHeaders[0]] ?? ''))) {
                    $outputRow['workflow_status'] = 'skipped';
                    $outputRow['workflow_reason'] = "Missing or NULL `{$requiredHeaders[0]}`";
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    continue;
                }
                $lookupKey = implode('|', array_map(fn($i) => strtolower(trim($row[$requiredHeaders[$i]] ?? '')), array_keys($mappingHeaders)));
                $match = $mappedData[$lookupKey] ?? null;
                $hasValid = $match && !empty(array_filter(array_intersect_key($match, array_flip($updateHeaders)), fn($v) => $v !== null));

                if ($mandatory) {
                    if (!$hasValid) {
                        $outputRow['workflow_status'] = 'rejected';
                        $outputRow['workflow_reason'] = "No valid match found for {$mappingHeaders[0]} in support table";
                        $metrics['rejected']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) $outputRow[$field] = $match[$field];
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                } else {
                    if (!$hasValid) {
                        $outputRow['workflow_status'] = 'pending';
                        $outputRow['workflow_reason'] = "Optional step: no valid match found for {$mappingHeaders[0]}";
                        $metrics['pending']++;
                    } else {
                        foreach ($updateHeaders as $field) {
                            if (isset($match[$field])) $outputRow[$field] = $match[$field];
                        }
                        $outputRow['workflow_status'] = 'processed';
                        $outputRow['workflow_reason'] = 'Match found and updated';
                        $metrics['processed']++;
                    }
                }
                $outputRows[] = $outputRow;
            }

            DB::connection('central')->statement("DROP TEMPORARY TABLE IF EXISTS $tempTable");

            $workflowStatus = ($metrics['rejected'] || $metrics['skipped'] || $metrics['pending']) ? 'pending' : 'completed';
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $metadata['process_name'] ?? 'Unknown',
                'process_mode' => $metadata['process_mode'] ?? 'flow',
                'mode'         => $metadata['mode'] ?? 'unknown',
                'status'       => $workflowStatus,
                'input' => $input,
                'output' => $output,
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, $workflowStatus, $metrics, "Processed `$workflowName`")]
            ]);
            Log::info("✅ Completed PySmtpMappingMethod", ['workflow' => $workflowName, 'metrics' => $metrics]);
        } catch (\Throwable $e) {
            Log::error("❌ Error in PySmtpMappingMethod", ['process_id' => $processId, 'error' => $e->getMessage()]);
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'status' => 'failed',
                'total' => $metrics['total'],
                'processed' => $metrics['processed'],
                'rejected' => $metrics['rejected'],
                'skipped' => $metrics['skipped'],
                'pending' => $metrics['pending'],
                'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'failed', $metrics, "Error in `$workflowName`: " . $e->getMessage())]
            ]);
            return $outputRows;
        }
        return $outputRows;
    }
}
