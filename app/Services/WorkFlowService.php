<?php

namespace App\Services;

use App\Facades\{Developer, Skeleton};
use Exception;
use Illuminate\Support\Facades\{Config, DB};
use Illuminate\Database\Connection;
use Illuminate\Auth\AuthenticationException;
use App\Http\Helpers\ProcessFlowHelper;
use Illuminate\Support\Str;
use App\Http\Classes\AgentHelper;

/**
 * Service for managing dynamic database connections.
 */
class WorkflowService
{
    public function processFlow(array $flows, array $flowData): array
    {
        // Set memory limit for large file processing from config
        $memoryLimit = Config::get('large_file_processing.memory_limit', '2048M');
        $maxExecutionTime = Config::get('large_file_processing.max_execution_time', 7200);
        
        ini_set('memory_limit', $memoryLimit);
        ini_set('max_execution_time', $maxExecutionTime);
        
        // Initialize tracing
        $tracing = [];

        // Extract workflow name and method
        $workflowName = key($flows);
        $method = $flows[$workflowName] ?? null;

        Developer::info("✨✨Processing Flow", [
            'flow_data' => $flowData,
            'method' => $method,
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time')
        ]);

        // Extract process details
        $processId = $flowData['metadata']['process_id'] ?? null;
        $processName = $flowData['metadata']['process_name'] ?? 'Unknown';
        $processMode = $flowData['process_mode'] ?? 'workflow';
        $mode = $flowData['metadata']['mode'] ?? 'unknown';
        $input = $flowData['input'] ?? [];
        $output = $flowData['output'] ?? [];
        $metadata = $flowData['metadata'] ?? [];

        // Validate process_id
        if (empty($processId)) {
            $errorMessage = "Process ID is missing in flowData";
            Developer::error("❌ Process failed: $errorMessage", [
                'flow_data' => $flowData
            ]);
            throw new Exception($errorMessage);
        }

        // Insert initial log entry
        try {
            ProcessFlowHelper::updateLogs([
                'process_id' => $processId,
                'process_name' => $processName,
                'process_mode' => $processMode,
                'mode' => $mode,
                'status' => 'started',
                'input' => $input,
                'output' => $output,
                'trace_details' => [],
            ]);
        } catch (Exception $e) {
            Developer::error("❌ Failed to log process start for `$processName`", [
                'process_id' => $processId,
                'error' => $e->getMessage()
            ]);
            throw new Exception("Failed to log process start: " . $e->getMessage());
        }

        // Log process start
        Developer::info("🚀 Process `$processName` started", [
            'process_id' => $processId,
            'workflow' => $workflowName,
            'method' => $method,
            'flow_data' => $flowData
        ]);

        // Validate method
        if (!$method || !method_exists($this, $method)) {
            $errorMessage = "Method `$method` not found for workflow `$workflowName`";
            try {
                ProcessFlowHelper::updateLogs([
                    'process_id' => $processId,
                    'process_name' => $processName,
                    'process_mode' => $processMode,
                    'mode' => $mode,
                    'status' => 'failed',
                    'input' => $input,
                    'output' => $output,
                    'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'failed', ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0], $errorMessage)],
                ]);
            } catch (Exception $e) {
                Developer::error("❌ Failed to log method validation failure for `$processName`", [
                    'process_id' => $processId,
                    'error' => $e->getMessage()
                ]);
            }
            Developer::error("❌ Process `$processName` failed", [
                'process_id' => $processId,
                'error' => $errorMessage
            ]);
            throw new Exception($errorMessage);
        }

        try {
            // Call the method
            $traceEntry = call_user_func(
                [$this, $method],
                $workflowName,
                $input,
                $output,
                $tracing,
                $metadata
            );

            // Update log with final details
            try {
                ProcessFlowHelper::updateLogs([
                    'process_id' => $processId,
                    'process_name' => $processName,
                    'process_mode' => $processMode,
                    'mode' => $mode,
                    'status' => $traceEntry['status'],
                    'input' => $input,
                    'output' => $output,
                    'total' => $traceEntry['metrics']['total'],
                    'affected' => $traceEntry['metrics']['affected'],
                    'rejected' => $traceEntry['metrics']['rejected'],
                    'skipped' => $traceEntry['metrics']['skipped'],
                    'trace_details' => [$traceEntry],
                ]);
                // AgentHelper::logActivity('Workflow Execution', 'Processed workflow' . $workflowName . '', [$traceEntry]);
            } catch (Exception $e) {
                Developer::error("❌ Failed to log process completion for `$processName`", [
                    'process_id' => $processId,
                    'error' => $e->getMessage()
                ]);
                throw new Exception("Failed to log process completion: " . $e->getMessage());
            }

            // Log completion
            Developer::info("✅ Process `$processName` completed", [
                'process_id' => $processId,
                'trace_entry' => $traceEntry
            ]);

            return [
                'process_id' => $processId,
                'process_name' => $processName,
                'status' => $traceEntry['status'],
                'trace_entry' => $traceEntry
            ];
        } catch (\Throwable $e) {
            // Update log on failure
            try {
                ProcessFlowHelper::updateLogs([
                    'process_id' => $processId,
                    'process_name' => $processName,
                    'process_mode' => $processMode,
                    'mode' => $mode,
                    'status' => 'failed',
                    'input' => $input,
                    'output' => $output,
                    'total' => 0,
                    'affected' => 0,
                    'rejected' => 0,
                    'skipped' => 0,
                    'trace_details' => [ProcessFlowHelper::addTraceEntry($workflowName, 'failed', ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0], "Error in `$workflowName`: " . $e->getMessage())],
                ]);
            } catch (Exception $e2) {
                Developer::error("❌ Failed to log process failure for `$processName`", [
                    'process_id' => $processId,
                    'error' => $e2->getMessage()
                ]);
            }

            Developer::error("❌ Process `$processName` failed", [
                'process_id' => $processId,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    public function FullnameSplitMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
    {
        Developer::info("📥 Starting FullnameSplitMethod", [
            'workflow' => $workflowName,
            'input_type' => $input['type'] ?? 'unknown',
            'input_source' => $input['table'] ?? $input['path'] ?? 'unknown',
        ]);

        $metrics = ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0];
        $outputRows = [];

        $rowGenerator = function () use (&$outputRows) {
            foreach ($outputRows as $row) {
                yield $row;
            }
        };

        try {
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
            $mandatory = (bool)($workflowConfig['mandatory'] ?? false);

            // Detect input headers
            $inputHeaders = match ($input['type']) {
                'csv' => function () use ($input) {
                    if (!file_exists($input['path'] ?? '')) {
                        throw new Exception("CSV file not found: {$input['path']}");
                    }
                    $file = fopen($input['path'], 'r');
                    $headers = $file ? fgetcsv($file) : [];
                    if ($file) fclose($file);
                    return $headers ?: [];
                },
                'db' => fn() => DB::getSchemaBuilder()->getColumnListing($input['table']),
                default => throw new Exception("Unsupported input type: {$input['type']}"),
            };
            $inputHeaders = is_callable($inputHeaders) ? $inputHeaders() : [];

            $hasStatus = in_array('status', $inputHeaders);
            $headers = array_merge($inputHeaders, $updateHeaders);
            if (!$hasStatus) $headers[] = 'status';
            $headers[] = 'reason';
            $headers = array_values(array_unique($headers));

            // Read input
            ProcessFlowHelper::readInput($input, function ($row, $index) use (
                &$metrics,
                $requiredHeaders,
                $updateHeaders,
                $mandatory,
                $hasStatus,
                &$outputRows
            ) {
                $metrics['total']++;

                // Handle status logic
                $status = strtolower(trim($row['status'] ?? ''));
                if ($status && in_array($status, ['rejected', 'skipped'])) {
                    $row['reason'] = $row['reason'] ?? 'Skipped due to status';
                    $outputRows[] = $row;
                    $metrics['skipped']++;
                    return;
                }

                if ($status && !in_array($status, ['pending', 'processed', 'completed'])) {
                    $row['status'] = 'skipped';
                    $row['reason'] = 'Invalid status';
                    $outputRows[] = $row;
                    $metrics['skipped']++;
                    return;
                }

                // Validation
                $fullName = $row['li_full_name'] ?? null;
                if (!$fullName || !preg_match('/^[a-zA-Z\s\-]+$/u', $fullName)) {
                    $row['status'] = 'rejected';
                    $row['reason'] = 'Invalid or missing full name';
                    $outputRows[] = $row;
                    $metrics['rejected']++;
                    return;
                }

                $parts = preg_split('/\s+/', trim($fullName));
                if (count($parts) > 3) {
                    $row['status'] = 'rejected';
                    $row['reason'] = 'Name has more than 3 words';
                    $outputRows[] = $row;
                    $metrics['rejected']++;
                    return;
                }

                if (count($parts) < 2) {
                    $row['status'] = 'rejected';
                    $row['reason'] = 'Name too short';
                    $outputRows[] = $row;
                    $metrics['rejected']++;
                    return;
                }

                // Parse name
                $first = $parts[0];
                $last = $parts[count($parts) - 1];
                $middle = count($parts) === 3 ? $parts[1] : null;

                $row['li_first_name'] = $first;
                $row['li_last_name'] = $last;
                $row['li_middle_name'] = $middle;
                $row['li_firstname_initial'] = strtoupper(substr($first, 0, 1));
                $row['li_lastname_initial'] = strtoupper(substr($last, 0, 1));

                $row['status'] = $mandatory ? 'processed' : 'completed';
                $row['reason'] = 'Name split successfully';

                $metrics['affected']++;
                $outputRows[] = $row;
            });

            ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
        } catch (\Throwable $e) {
            Developer::error("❗ Error in FullnameSplitMethod", ['error' => $e->getMessage()]);
            return ProcessFlowHelper::addTraceEntry(
                $workflowName,
                'failed',
                $metrics,
                "Error in `$workflowName`: " . $e->getMessage()
            );
        }

        $traceEntry = ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'completed',
            $metrics,
            "Processed `$workflowName`"
        );

        Developer::info("✅ Completed FullnameSplitMethod", [
            'workflow' => $workflowName,
            'trace_entry' => $traceEntry
        ]);

        return [
            ...$traceEntry,
            'rows' => $outputRows
        ];
    }
public function DlsDesignationsMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
{
    Developer::info("📥 Starting DlsDesignationsMethod", [
        'workflow' => $workflowName,
        'input_type' => $input['type'] ?? 'unknown',
        'input_source' => $input['table'] ?? $input['path'] ?? 'unknown',
    ]);

    $metrics = ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
    $outputRows = [];

    $rowGenerator = function () use (&$outputRows) {
        foreach ($outputRows as $row) {
            yield $row;
        }
    };

    try {
        $workflowConfig = collect($metadata['workflow_map'] ?? [])
            ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

        if (!$workflowConfig) {
            throw new Exception("No workflow mapping found for `$workflowName`.");
        }

        // support_table can sometimes be provided as array in configs -> normalise to string
        $supportTable = $workflowConfig['support_table'] ?? 'mercury.titles_master';
        if (is_array($supportTable)) {
            $supportTable = $supportTable[0] ?? 'mercury.titles_master';
        }

        $requiredHeaders = $workflowConfig['required_headers'] ?? ['li_job_title'];
        $mappingHeaders  = $workflowConfig['mapping_headers'] ?? ['li_job_title'];
        $updateHeaders   = $workflowConfig['update_headers'] ?? ['dls_designation', 'dls_management_level', 'dls_jobfunction'];
        $mandatory       = (bool)($workflowConfig['mandatory'] ?? false);

        if (!$supportTable || empty($requiredHeaders) || empty($mappingHeaders) || empty($updateHeaders)) {
            throw new Exception("Invalid configuration: missing support table, required headers, mapping headers, or update headers.");
        }

        if (count($requiredHeaders) !== count($mappingHeaders) && count($mappingHeaders) < 1) {
            // mappingHeaders may differ in count from requiredHeaders — allow that, but ensure mappingHeaders not empty
            throw new Exception("Invalid configuration: mapping headers must be provided.");
        }

        // Detect headers
        $inputHeaders = match ($input['type'] ?? null) {
            'csv' => function () use ($input) {
                if (!file_exists($input['path'] ?? '')) {
                    throw new Exception("CSV file not found: {$input['path']}");
                }
                $file = fopen($input['path'], 'r');
                $headers = $file ? fgetcsv($file) : [];
                if ($file) fclose($file);

                // Remove BOM and trim header names (like original Dls method)
                $headers = array_map(function ($h) {
                    $h = preg_replace('/^\xEF\xBB\xBF/', '', $h); // Remove BOM
                    return trim($h, " \t\n\r\0\x0B\"");
                }, $headers ?: []);

                return $headers ?: [];
            },
            'db' => fn() => DB::getSchemaBuilder()->getColumnListing($input['table']),
            default => throw new Exception("Unsupported input type: {$input['type']}")
        };
        $inputHeaders = is_callable($inputHeaders) ? $inputHeaders() : [];

        $missing = array_diff($requiredHeaders, $inputHeaders);
        if (!empty($missing)) {
            throw new Exception("Missing required headers: " . implode(', ', $missing));
        }

        $hasStatus = in_array('status', $inputHeaders, true);
        $headers = array_merge($inputHeaders, $updateHeaders);
        if (!$hasStatus) $headers[] = 'status';
        $headers[] = 'reason';
        $headers = array_values(array_unique($headers));

        // Build support-map in memory (no temp tables), key = mapping headers
        $parts = explode('.', $supportTable);
        $supportDb = $parts[0];
        $supportTableName = $parts[1] ?? $supportTable;

        // fetch columns needed from support table (mapping + update columns)
        $columns = array_values(array_unique(array_merge($mappingHeaders, $updateHeaders)));

        $supportRows = DB::connection('central')
            ->table("$supportDb.$supportTableName")
            ->select($columns)
            ->get()
            ->map(fn($r) => (array) $r)
            ->all();

        $supportMap = [];
        foreach ($supportRows as $r) {
            $key = implode('|', array_map(fn($c) => strtolower(trim($r[$c] ?? '')), $mappingHeaders));
            $supportMap[$key] = $r;
        }

        // Read input, enrich from supportMap
        ProcessFlowHelper::readInput($input, function ($row, $index) use (
            &$metrics,
            $mappingHeaders,
            $requiredHeaders,
            $updateHeaders,
            $hasStatus,
            $mandatory,
            $supportMap,
            &$outputRows
        ) {
            $metrics['total']++;

            if ($hasStatus) {
                $status = strtolower(trim($row['status'] ?? ''));
                if (in_array($status, ['skipped', 'rejected'], true)) {
                    $metrics['skipped']++;
                    $row['reason'] = 'Ignored status';
                    $outputRows[] = $row;
                    return;
                }
                if ($status !== '' && !in_array($status, ['pending', 'completed', 'processed'], true)) {
                    $metrics['skipped']++;
                    $row['status'] = 'skipped';
                    $row['reason'] = 'Invalid status (not pending/completed/processed)';
                    $outputRows[] = $row;
                    return;
                }
            }

            // Validate required fields
            foreach ($requiredHeaders as $field) {
                if (empty(trim($row[$field] ?? ''))) {
                    $metrics['skipped']++;
                    $row['status'] = 'skipped';
                    $row['reason'] = "Missing `$field`";
                    $outputRows[] = $row;
                    return;
                }
            }

            // Build lookup key from requiredHeaders (allows different input field names vs support mapping columns)
            $key = implode('|', array_map(fn($c) => strtolower(trim($row[$c] ?? '')), $requiredHeaders));
            $match = $supportMap[$key] ?? null;

            // Check if match contains valid (non-null) update data
            $hasValidUpdate = $match && !empty(array_filter(array_intersect_key($match, array_flip($updateHeaders)), fn($v) => $v !== null && $v !== ''));

            if (!$match || !$hasValidUpdate) {
                if ($mandatory) {
                    $row['status'] = 'rejected';
                    $row['reason'] = 'No valid match in support table';
                    $metrics['rejected']++;
                } else {
                    $row['status'] = 'pending';
                    $row['reason'] = 'Optional step: no valid match';
                    $metrics['pending']++;
                }
            } else {
                // copy update fields from support row
                foreach ($updateHeaders as $f) {
                    if (array_key_exists($f, $match)) {
                        $row[$f] = $match[$f];
                    }
                }
                $row['status'] = $mandatory ? 'processed' : 'completed';
                $row['reason'] = 'Match found and updated';
                $metrics['affected']++;
            }

            $outputRows[] = $row;
        });

        ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
    } catch (\Throwable $e) {
        Developer::error("❗ Error in DlsDesignationsMethod", ['error' => $e->getMessage()]);
        return ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'failed',
            $metrics,
            "Error in `$workflowName`: " . $e->getMessage()
        );
    }

    $traceEntry = ProcessFlowHelper::addTraceEntry(
        $workflowName,
        'completed',
        $metrics,
        "Processed `$workflowName`"
    );

    Developer::info("✅ Completed DlsDesignationsMethod", [
        'workflow' => $workflowName,
        'trace_entry' => $traceEntry
    ]);

    return [
        ...$traceEntry,
        'rows' => $outputRows
    ];
}




    public function SmtpUpdateMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
    {
        Developer::info("📥 Starting SmtpBaseMappingMethod", [
            'workflow' => $workflowName,
            'input_type' => $input['type'] ?? 'unknown',
            'input_source' => $input['table'] ?? $input['path'] ?? 'unknown',
        ]);

        $metrics = ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0, 'pending' => 0];
        $outputRows = [];

        $rowGenerator = function () use (&$outputRows) {
            foreach ($outputRows as $row) {
                yield $row;
            }
        };

        try {
            $workflowConfig = collect($metadata['workflow_map'] ?? [])
                ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

            if (!$workflowConfig) {
                throw new Exception("No workflow mapping found for `$workflowName`.");
            }

            $mandatory = (bool)($workflowConfig['mandatory'] ?? true);
            $supportTable = $workflowConfig['support_table'] ?? 'mars.li_company_info';
            $requiredHeaders = $workflowConfig['required_headers'] ?? ['lic_smtp'];
            $mappingHeaders = $workflowConfig['mapping_headers'] ?? ['licc_smtp'];
            $updateHeaders = $workflowConfig['update_headers'] ?? ['lic_smtp', 'lic_company_id', 'lic_company_name'];

            if (!$supportTable || empty($requiredHeaders) || empty($mappingHeaders) || empty($updateHeaders)) {
                throw new Exception("Invalid configuration: missing support table, required headers, mapping headers, or update headers.");
            }

            if (count($requiredHeaders) !== count($mappingHeaders)) {
                throw new Exception("Required headers and mapping headers must have the same number of elements for proper mapping.");
            }

            // Detect headers
            $inputHeaders = match ($input['type']) {
                'csv' => function () use ($input) {
                    if (!file_exists($input['path'] ?? '')) {
                        throw new Exception("CSV file not found: {$input['path']}");
                    }
                    $file = fopen($input['path'], 'r');
                    $headers = $file ? fgetcsv($file) : [];
                    if ($file) fclose($file);
                    return $headers ?: [];
                },
                'db' => fn() => DB::getSchemaBuilder()->getColumnListing($input['table']),
                default => throw new Exception("Unsupported input type: {$input['type']}")
            };
            $inputHeaders = is_callable($inputHeaders) ? $inputHeaders() : [];

            $missing = array_diff($requiredHeaders, $inputHeaders);
            if (!empty($missing)) {
                throw new Exception("Missing required headers: " . implode(', ', $missing));
            }

            $hasStatus = in_array('status', $inputHeaders);
            $headers = array_merge($inputHeaders, $updateHeaders);
            if (!$hasStatus) $headers[] = 'status';
            $headers[] = 'reason';
            $headers = array_values(array_unique($headers));

            // Build support-map in memory (no temp tables), key = mapping headers
            $parts = explode('.', $supportTable);
            $supportDb = $parts[0];
            $supportTableName = $parts[1] ?? $supportTable;

            $columns = array_values(array_unique(array_merge($mappingHeaders, $updateHeaders)));
            $supportRows = DB::connection('central')
                ->table("$supportDb.$supportTableName")
                ->select($columns)
                ->get()
                ->map(fn($r) => (array) $r)
                ->all();

            $supportMap = [];
            foreach ($supportRows as $r) {
                $key = implode('|', array_map(fn($c) => strtolower(trim($r[$c] ?? '')), $mappingHeaders));
                $supportMap[$key] = $r;
            }

            // Read input, enrich from supportMap
            ProcessFlowHelper::readInput($input, function ($row, $index) use (
                &$metrics,
                $mappingHeaders,
                $requiredHeaders,
                $updateHeaders,
                $hasStatus,
                $mandatory,
                $supportMap,
                &$outputRows
            ) {
                $metrics['total']++;

                if ($hasStatus) {
                    $status = strtolower(trim($row['status'] ?? ''));
                    if (in_array($status, ['skipped', 'rejected'])) {
                        $metrics['skipped']++;
                        $row['reason'] = 'Ignored status';
                        $outputRows[] = $row;
                        return;
                    }
                    if ($status !== '' && !in_array($status, ['pending', 'completed', 'processed'])) {
                        $metrics['skipped']++;
                        $row['status'] = 'skipped';
                        $row['reason'] = 'Invalid status (not pending/completed/processed)';
                        $outputRows[] = $row;
                        return;
                    }
                }

                foreach ($requiredHeaders as $field) {
                    if (empty(trim($row[$field] ?? ''))) {
                        $metrics['skipped']++;
                        $row['status'] = 'skipped';
                        $row['reason'] = "Missing `$field`";
                        $outputRows[] = $row;
                        return;
                    }
                }

                $key = implode('|', array_map(fn($c) => strtolower(trim($row[$c] ?? '')), $requiredHeaders)); // Changed to use requiredHeaders for input key to allow different field names
                $match = $supportMap[$key] ?? null;

                if (!$match || empty(array_filter(array_intersect_key($match, array_flip($updateHeaders)), fn($v) => $v !== null))) {
                    if ($mandatory) {
                        $row['status'] = 'rejected';
                        $row['reason'] = 'No valid match in support table';
                        $metrics['rejected']++;
                    } else {
                        $row['status'] = 'pending';
                        $row['reason'] = 'Optional step: no valid match';
                        $metrics['pending']++;
                    }
                } else {
                    foreach ($updateHeaders as $f) {
                        if (array_key_exists($f, $match)) {
                            $row[$f] = $match[$f];
                        }
                    }
                    $row['status'] = $mandatory ? 'processed' : 'completed';
                    $row['reason'] = 'Match found and updated';
                    $metrics['affected']++;
                }

                $outputRows[] = $row;
            });

            ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
        } catch (\Throwable $e) {
            Developer::error("❗ Error in SmtpBaseMappingMethod", ['error' => $e->getMessage()]);
            return ProcessFlowHelper::addTraceEntry(
                $workflowName,
                'failed',
                $metrics,
                "Error in `$workflowName`: " . $e->getMessage()
            );
        }

        $traceEntry = ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'completed',
            $metrics,
            "Processed `$workflowName`"
        );

        Developer::info("✅ Completed SmtpBaseMappingMethod", [
            'workflow' => $workflowName,
            'trace_entry' => $traceEntry
        ]);

        return [
            ...$traceEntry,
            'rows' => $outputRows
        ];
    }

    public function CountryMappingMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
    {
        // Log received parameters
        Developer::info("📥 Received to CountryMappingMethod", [
            'workflow' => $workflowName,
            'input' => $input,
            'output' => $output,
            'metadata' => $metadata,
            'tracing' => $tracing
        ]);

        // Initialize metrics
        $metrics = [
            'total' => 0,
            'affected' => 0,
            'rejected' => 0,
            'skipped' => 0
        ];

        try {
            // Detect input headers based on input type
            $inputHeaders = match ($input['type']) {
                'csv' => function () use ($input) {
                    if (!file_exists($input['path'] ?? '')) {
                        throw new Exception("CSV file not found: {$input['path']}");
                    }
                    $file = fopen($input['path'], 'r');
                    $headers = $file ? fgetcsv($file) : [];
                    // Fix: Remove BOM and trim whitespace/quotes from headers
                    $headers = array_map(function ($h) {
                        $h = preg_replace('/^\xEF\xBB\xBF/', '', $h); // Remove BOM
                        return trim($h, " \t\n\r\0\x0B\"");
                    }, $headers);
                    if ($file) fclose($file);
                    return $headers ?: [];
                },
                'db' => fn() => DB::getSchemaBuilder()->getColumnListing($input['table']),
                default => throw new Exception("Unsupported input type: {$input['type']}"),
            };
            $inputHeaders = is_callable($inputHeaders) ? $inputHeaders() : [];

            // Define required and update headers
            $requiredHeaders = ['li_contact_location'];
            $updateHeaders = ['gs_country', 'gs_zone_region', 'li_contact_country', 'status', 'reason'];
            $headers = array_merge($inputHeaders, $updateHeaders);

            // Validate required headers
            $missing = array_diff($requiredHeaders, $inputHeaders);
            if (!empty($missing)) {
                throw new Exception("Missing required headers: " . implode(', ', $missing));
            }

            // Load country mappings from mercury.country_mapping
            $countryMappings = DB::table('mercury.country_mapping')
                ->whereNull('deleted_at')
                ->get()
                ->keyBy('location')
                ->map(fn($item) => [
                    'country' => $item->country,
                    'region' => $item->region
                ])
                ->toArray();

            // Load country names from moon.countries for fallback detection
            $countries = DB::select('SELECT name FROM moon.countries');
            $countryNames = array_column($countries, 'name');

            // Define country detection function for fallback
            $detectCountryFromLocation = function ($location, $countryNames) {
                $locationLower = strtolower($location);
                foreach ($countryNames as $country) {
                    if (strpos($locationLower, strtolower($country)) !== false) {
                        return $country;
                    }
                }
                return null;
            };

            // Initialize rows array to store processed data
            $rows = [];

            // Process input data
            ProcessFlowHelper::readInput($input, function ($row, $index) use (&$rows, &$metrics, $countryMappings, $countryNames, $detectCountryFromLocation) {
                $metrics['total']++;

                $location = trim($row['li_contact_location'] ?? '');

                $country = '';
                $region = '';
                $status = 'Bad';
                $reason = 'No match found';

                if (!empty($location)) {
                    if (isset($countryMappings[$location])) {
                        // Direct match found in country_mappings
                        $country = $countryMappings[$location]['country'];
                        $region = $countryMappings[$location]['region'];
                        $status = 'Good';
                        $reason = 'Updated';
                    } else {
                        // Fallback detection
                        $detectedCountry = $detectCountryFromLocation($location, $countryNames);
                        if ($detectedCountry) {
                            $country = $detectedCountry;
                            // Determine region based on most frequent region for the detected country
                            $matchingRegions = array_filter($countryMappings, fn($v) => strtolower($v['country']) === strtolower($country));
                            $regions = array_column($matchingRegions, 'region');
                            $regionCounts = array_count_values(array_filter($regions));
                            arsort($regionCounts);
                            $region = array_key_first($regionCounts) ?? '';
                            $status = 'Suggestion';
                            $reason = 'Country detected using fallback (add to country_mapping for better match)';
                        }
                    }
                } else {
                    $reason = 'Empty location';
                }

                // Update row with mapped values
                $row['gs_country'] = $country;
                $row['gs_zone_region'] = $region;
                $row['li_contact_country'] = $country;
                $row['status'] = $status;
                $row['reason'] = $reason;

                $rows[] = $row;

                // Update metrics
                if ($status === 'Good' || $status === 'Suggestion') {
                    $metrics['affected']++;
                } else {
                    $metrics['rejected']++;
                }
            });

            // Define generator for writing output
            $rowGenerator = function () use ($rows) {
                foreach ($rows as $row) {
                    yield $row;
                }
            };

            // Write processed data to output
            ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
        } catch (\Throwable $e) {
            // Handle exceptions and return trace entry
            Developer::error("❌ Error in CountryMappingMethod", ['error' => $e->getMessage()]);
            return ProcessFlowHelper::addTraceEntry(
                $workflowName,
                'failed',
                $metrics,
                "Error in `$workflowName`: " . $e->getMessage()
            );
        }

        // Create successful trace entry
        $traceEntry = ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'completed',
            $metrics,
            "Processed `$workflowName`"
        );

        // Log completion
        Developer::info("✅ Completed CountryMappingMethod", [
            'workflow' => $workflowName,
            'trace_entry' => $traceEntry
        ]);

        return [
            ...$traceEntry,
            'rows' => $rows // or $rows
        ];
    }

    public function UsAddressSplitMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
    {
        // Log received parameters
        Developer::info("📥 Received to UsAddressSplitMethod", [
            'workflow' => $workflowName,
            'input' => $input,
            'output' => $output,
            'metadata' => $metadata,
            'tracing' => $tracing
        ]);

        $metrics = [
            'total' => 0,
            'affected' => 0,
            'rejected' => 0,
            'skipped' => 0
        ];

        // Define headers
        $requiredHeaders = ['address'];
        $updateHeaders = ['address_old', 'street', 'city', 'state', 'state_code', 'pincode', 'country', 'status', 'status_code'];
        $headers = array_merge($requiredHeaders, $updateHeaders, ['__state', '__reason']);

        // Load reference data
        $states = DB::select('SELECT iso_2, name FROM moon.states WHERE country_code = ?', ['US']);
        $stateCodes = array_change_key_case(array_column($states, 'name', 'iso_2'), CASE_LOWER);
        $stateNames = array_change_key_case(array_column($states, 'name', 'name'), CASE_LOWER);
        $cities = array_reduce(
            DB::select('SELECT name, state_code FROM moon.cities WHERE country_code = ?', ['US']),
            fn($carry, $city) => [...$carry, $city->state_code => [...($carry[$city->state_code] ?? []), strtolower($city->name)]],
            []
        );
        $countries = ['united states' => ['united states', 'us', 'usa', 'united states of america', 'u.s.', 'u.s.a.']];

        // Generator for rows to optimize memory
        $rows = [];
        $rowGenerator = function () use (&$rows) {
            foreach ($rows as $row) {
                yield $row;
            }
        };

        try {
            // Process input with integrated parsing logic
            ProcessFlowHelper::readInput($input, function ($row, $index) use (&$rows, &$metrics, $stateCodes, $stateNames, $cities, $countries) {
                $metrics['total']++;

                $address = trim($row['address'] ?? '');
                if (empty($address)) {
                    $row['__state'] = 'skipped';
                    $row['__reason'] = 'Empty address';
                    $metrics['skipped']++;
                    $rows[] = $row;
                    return;
                }

                // Initialize components
                $components = [
                    'address_old' => $address,
                    'address' => $address,
                    'street' => '',
                    'city' => '',
                    'state' => '',
                    'state_code' => '',
                    'pincode' => '',
                    'country' => '',
                    'status' => '',
                    'status_code' => ''
                ];
                $statusCodes = [];

                // Validate address format
                if (preg_match('/[^A-Za-z0-9\s,.\/\-\'\(\)#]/', $address)) {
                    $components['status'] = 'Bad';
                    $components['status_code'] = 'Invalid characters in address';
                } else {
                    // Normalize address
                    $address = preg_replace('/[,]+/', ' ', trim($address));
                    $address = preg_replace('/\s+/', ' ', $address);
                    $parts = preg_split('/\s+/', $address, -1, PREG_SPLIT_NO_EMPTY);
                    $partsLower = array_map('strtolower', $parts);

                    if (empty($parts) || strlen($address) < 5) {
                        $components['status'] = 'Bad';
                        $components['status_code'] = 'Empty or too short address';
                    } else {
                        // Country Detection
                        $matchedCountry = null;
                        $countryTerms = $countries['united states'];
                        for ($i = count($parts) - 1; $i >= 0 && !$matchedCountry; $i--) {
                            $candidate = $partsLower[$i];
                            if (in_array($candidate, $countryTerms)) {
                                $matchedCountry = ['name' => $parts[$i], 'start' => $i, 'length' => 1];
                            } elseif ($i >= 1) {
                                $candidate = strtolower(implode(' ', array_slice($partsLower, $i - 1, 2)));
                                if ($candidate === 'united states') {
                                    $matchedCountry = ['name' => 'United States', 'start' => $i - 1, 'length' => 2];
                                }
                            }
                        }
                        if (!$matchedCountry) {
                            $hasUsState = false;
                            foreach ($partsLower as $part) {
                                if (isset($stateCodes[$part]) || isset($stateNames[$part])) {
                                    $hasUsState = true;
                                    break;
                                }
                            }
                            if ($hasUsState) {
                                $matchedCountry = ['name' => 'United States', 'start' => -1, 'length' => 0];
                            } else {
                                $components['status'] = 'Bad';
                                $components['status_code'] = 'Non-USA address';
                            }
                        }
                        if ($matchedCountry) {
                            $components['country'] = 'United States';
                            foreach ($partsLower as $i => $part) {
                                if (in_array($part, $countryTerms)) {
                                    $parts[$i] = $partsLower[$i] = null;
                                } elseif ($i + 1 < count($partsLower)) {
                                    $candidate = implode(' ', array_slice($partsLower, $i, 2));
                                    if ($candidate === 'united states') {
                                        $parts[$i] = $partsLower[$i] = null;
                                        $parts[$i + 1] = $partsLower[$i + 1] = null;
                                    }
                                }
                            }
                            $parts = array_values(array_filter($parts));
                            $partsLower = array_values(array_filter($partsLower));
                            $components['address'] = trim(implode(' ', $parts));
                        }

                        if ($components['status'] !== 'Bad') {
                            // Pincode Detection
                            $pincode = '';
                            for ($i = count($parts) - 1; $i >= 0; $i--) {
                                if (preg_match('/^\d{5}(-\d{4})?$/', $parts[$i])) {
                                    $pincode = $parts[$i];
                                    $parts[$i] = $partsLower[$i] = null;
                                }
                            }
                            if ($pincode) {
                                $components['pincode'] = $pincode;
                                $parts = array_values(array_filter($parts));
                                $partsLower = array_values(array_filter($partsLower));
                                $components['address'] = trim(implode(' ', $parts));
                            } else {
                                $statusCodes[] = 'Missing or invalid pincode';
                            }

                            // State Detection
                            $matchedState = null;
                            for ($i = count($parts) - 1; $i >= 0 && !$matchedState; $i--) {
                                $partLower = $partsLower[$i];
                                if (isset($stateCodes[$partLower]) && strlen($partLower) === 2) {
                                    $matchedState = ['name' => $stateCodes[$partLower], 'code' => strtoupper($partLower), 'start' => $i, 'length' => 1];
                                } elseif (isset($stateNames[$partLower])) {
                                    $matchedState = ['name' => $stateNames[$partLower], 'code' => strtoupper(array_search($stateNames[$partLower], $stateCodes) ?: ''), 'start' => $i, 'length' => 1];
                                } elseif ($i >= 1) {
                                    $candidate = strtolower(implode(' ', array_slice($partsLower, $i - 1, 2)));
                                    if ($candidate === 'united states') {
                                        $matchedState = ['name' => 'United States', 'code' => strtoupper(array_search($stateNames[$candidate], $stateCodes) ?: ''), 'start' => $i - 1, 'length' => 2];
                                    }
                                }
                            }
                            if ($matchedState) {
                                $components['state'] = $matchedState['name'];
                                $components['state_code'] = $matchedState['code'];
                                $stateTerms = array_filter([strtolower($matchedState['name']), strtolower($matchedState['code'])]);
                                foreach ($partsLower as $i => $part) {
                                    foreach ($stateTerms as $term) {
                                        if ($part && strpos($term, ' ') === false && $part === $term) {
                                            $parts[$i] = $partsLower[$i] = null;
                                        } elseif ($i + 1 < count($partsLower)) {
                                            $candidate = implode(' ', array_slice($partsLower, $i, 2));
                                            if ($candidate === $term) {
                                                $parts[$i] = $partsLower[$i] = null;
                                                $parts[$i + 1] = $partsLower[$i + 1] = null;
                                            }
                                        }
                                    }
                                }
                                $parts = array_values(array_filter($parts));
                                $partsLower = array_values(array_filter($partsLower));
                                $components['address'] = trim(implode(' ', $parts));
                            } else {
                                $statusCodes[] = 'Missing or invalid state';
                            }

                            // City Detection
                            $matchedCity = null;
                            if ($components['state'] && $components['state_code']) {
                                $stateCities = $cities[$components['state_code']] ?? [];
                                for ($i = count($parts) - 1; $i >= 0 && !$matchedCity; $i--) {
                                    for ($len = min(3, $i + 1); $len >= 1; $len--) {
                                        if ($i - $len + 1 < 0) continue;
                                        $candidate = strtolower(implode(' ', array_slice($partsLower, $i - $len + 1, $len)));
                                        if (in_array($candidate, $stateCities)) {
                                            $matchedCity = ['name' => implode(' ', array_slice($parts, $i - $len + 1, $len)), 'start' => $i - $len + 1, 'length' => $len];
                                            break;
                                        }
                                    }
                                }
                            }
                            if ($matchedCity) {
                                $components['city'] = $matchedCity['name'];
                                $cityTerm = strtolower($matchedCity['name']);
                                $cityTermParts = explode(' ', $cityTerm);
                                $cityTermLen = count($cityTermParts);
                                foreach ($partsLower as $i => $part) {
                                    if ($cityTermLen === 1 && $part === $cityTerm) {
                                        $parts[$i] = $partsLower[$i] = null;
                                    } elseif ($cityTermLen > 1 && $i + $cityTermLen - 1 < count($partsLower)) {
                                        $candidate = implode(' ', array_slice($partsLower, $i, $cityTermLen));
                                        if ($candidate === $cityTerm) {
                                            for ($j = $i; $j < $i + $cityTermLen; $j++) {
                                                $parts[$j] = $partsLower[$j] = null;
                                            }
                                        }
                                    }
                                }
                                $parts = array_values(array_filter($parts));
                                $partsLower = array_values(array_filter($partsLower));
                                $components['address'] = trim(implode(' ', $parts));
                            } else {
                                $statusCodes[] = 'Missing or invalid city';
                            }

                            // Street Assignment
                            if (!empty($parts)) {
                                $components['street'] = implode(' ', $parts);
                            } else {
                                $statusCodes[] = 'Missing street';
                            }

                            // Final Validation
                            $requiredComponents = ['street', 'city', 'state', 'country'];
                            $missingComponents = array_filter($requiredComponents, fn($key) => empty($components[$key]));
                            if (!empty($missingComponents)) {
                                $statusCodes[] = 'Missing required components: ' . implode(', ', $missingComponents);
                                $components['status'] = 'Bad';
                                $components['status_code'] = implode('; ', $statusCodes);
                            } else {
                                $components['status'] = empty($statusCodes) ? 'Good' : 'Bad';
                                $components['status_code'] = implode('; ', $statusCodes);
                            }
                        }
                    }
                }

                // Merge components into row
                $row = array_merge($row, $components);

                // Set __state and __reason
                if ($components['status'] === 'Good') {
                    $row['__state'] = 'processed';
                    $row['__reason'] = 'completed';
                    $metrics['affected']++;
                } else {
                    $row['__state'] = 'rejected';
                    $row['__reason'] = $components['status_code'];
                    $metrics['rejected']++;
                }

                $rows[] = $row;
            });

            // Write output
            ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
        } catch (\Throwable $e) {
            return ProcessFlowHelper::addTraceEntry(
                $workflowName,
                'failed',
                $metrics,
                "Error in `$workflowName`: " . $e->getMessage()
            );
        }

        // Create trace entry
        $traceEntry = ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'completed',
            $metrics,
            "Processed `$workflowName`"
        );

        // Log completion
        Developer::info("✅ Completed UsAddressSplitMethod", [
            'workflow' => $workflowName,
            'trace_entry' => $traceEntry
        ]);

        return $traceEntry;
    }

    public function GlobalAddressSplitMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
    {
        Developer::info("📥 Received to GlobalAddressSplitMethod", [
            'workflow' => $workflowName,
            'input' => $input,
            'output' => $output,
            'metadata' => $metadata,
            'tracing' => $tracing
        ]);

        $metrics = [
            'total' => 0,
            'affected' => 0,
            'rejected' => 0,
            'skipped' => 0
        ];

        $headers = ['address', 'address_old', 'street', 'city', 'state', 'pincode', 'country', 'status', 'status_code', '__state', '__reason'];

        // Load reference data
        $countries = array_reduce(
            DB::select('SELECT id, name, iso_2, iso_3, pincode_regex FROM base.countries'),
            fn($carry, $c) => [...$carry, $c->id => [
                'name' => $c->name,
                'iso_2' => $c->iso_2,
                'iso_3' => $c->iso_3,
                'pincode_regex' => $c->pincode_regex
            ]],
            []
        );
        $states = array_reduce(
            DB::select('SELECT id, name, iso_2, country_id, country_name FROM base.states'),
            fn($carry, $s) => [...$carry, $s->country_id => [...($carry[$s->country_id] ?? []), $s->id => [
                'name' => $s->name,
                'iso_2' => $s->iso_2,
                'country_name' => $s->country_name
            ]]],
            []
        );
        $cities = array_reduce(
            DB::select('SELECT id, name, state_name, country_name FROM base.cities'),
            fn($carry, $c) => [
                ...$carry,
                $c->country_name => [
                    ...($carry[$c->country_name] ?? []),
                    $c->state_name => [
                        ...($carry[$c->country_name][$c->state_name] ?? []),
                        strtolower($c->name)
                    ]
                ]
            ],
            []
        );

        $rows = [];

        try {
            ProcessFlowHelper::readInput($input, function ($row, $index) use (&$rows, &$metrics, $countries, $states, $cities, $headers) {
                $metrics['total']++;

                $rawAddress = $row['address'] ?? '';
                $address = mb_convert_encoding($rawAddress, 'UTF-8', mb_detect_encoding($rawAddress, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true) ?: 'UTF-8');
                $address = preg_replace('/[\,\.;]+(?=\s|$)/', ' ', $address);
                $address = preg_replace('/\s+/', ' ', trim($address));

                if (empty($address)) {
                    $row['address_old'] = $rawAddress;
                    $row['street'] = '';
                    $row['city'] = '';
                    $row['state'] = '';
                    $row['pincode'] = '';
                    $row['country'] = '';
                    $row['status'] = 'Incomplete';
                    $row['status_code'] = 'Empty address';
                    $row['__state'] = 'rejected';
                    $row['__reason'] = 'Empty address';
                    foreach ($headers as $header) {
                        if (!array_key_exists($header, $row)) {
                            $row[$header] = '';
                        }
                    }
                    $rows[] = $row;
                    $metrics['rejected']++;
                    return;
                }

                $components = [
                    'address' => trim($address),
                    'street' => '',
                    'city' => '',
                    'state' => '',
                    'pincode' => '',
                    'country' => '',
                    'status' => 'Incomplete',
                    'status_code' => ''
                ];
                $statusCodes = [];

                if (preg_match('/[^A-Za-z0-9\s,.\/\-]/', $address)) {
                    $statusCodes[] = 'Invalid characters in address';
                }
                if (strlen($address) < 5 || preg_match('/^[\W]*$/', $address)) {
                    $statusCodes[] = 'Address is too short or invalid';
                }

                $parts = preg_split('/[\s,]+/', $address);
                $parts = array_values(array_filter(array_map('trim', $parts)));
                $partsLower = array_map('strtolower', $parts);
                $countryId = null;

                $matchedCountry = null;
                for ($i = count($partsLower) - 1; $i >= 0; $i--) {
                    for ($len = min(4, $i + 1); $len >= 1; $len--) {
                        $candidate = implode(' ', array_slice($partsLower, $i - $len + 1, $len));
                        foreach ($countries as $cId => $cData) {
                            if ($candidate === strtolower($cData['name'])) {
                                $matchedCountry = ['id' => $cId, 'name' => $cData['name'], 'start' => $i - $len + 1, 'length' => $len];
                                $countryId = $cId;
                                break 3;
                            }
                        }
                    }
                }
                if (!$matchedCountry) {
                    for ($i = count($partsLower) - 1; $i >= 0; $i--) {
                        $candidate = $partsLower[$i];
                        foreach ($countries as $cId => $cData) {
                            if ($candidate === strtolower($cData['iso_3'])) {
                                $matchedCountry = ['id' => $cId, 'name' => $cData['name'], 'start' => $i, 'length' => 1];
                                $countryId = $cId;
                                break 2;
                            }
                        }
                    }
                }
                if (!$matchedCountry) {
                    for ($i = count($partsLower) - 1; $i >= 0; $i--) {
                        $candidate = $partsLower[$i];
                        foreach ($countries as $cId => $cData) {
                            if ($candidate === strtolower($cData['iso_2'])) {
                                $matchedCountry = ['id' => $cId, 'name' => $cData['name'], 'start' => $i, 'length' => 1];
                                $countryId = $cId;
                                break 2;
                            }
                        }
                    }
                }
                if ($matchedCountry) {
                    $components['country'] = $matchedCountry['name'];
                    $countryTerms = array_filter([strtolower($matchedCountry['name']), strtolower($countries[$countryId]['iso_2'] ?? ''), strtolower($countries[$countryId]['iso_3'] ?? '')]);
                    foreach ($partsLower as $i => $part) {
                        foreach ($countryTerms as $term) {
                            if ($part && strpos($term, ' ') === false && $part === $term) {
                                $parts[$i] = $partsLower[$i] = null;
                            } elseif (strpos($term, ' ') !== false && $i + count(explode(' ', $term)) - 1 < count($partsLower)) {
                                $termParts = explode(' ', $term);
                                $candidate = implode(' ', array_slice($partsLower, $i, count($termParts)));
                                if ($candidate === $term) {
                                    for ($j = $i; $j < $i + count($termParts); $j++) {
                                        $parts[$j] = $partsLower[$j] = null;
                                    }
                                }
                            }
                        }
                    }
                    $parts = array_values(array_filter($parts));
                    $partsLower = array_values(array_filter($partsLower));
                    $components['address'] = trim(preg_replace('/\s+/', ' ', implode(' ', $parts)));
                } else {
                    $statusCodes[] = 'Missing or invalid country';
                }

                if ($countryId && !empty($countries[$countryId]['pincode_regex'])) {
                    $regex = $countries[$countryId]['pincode_regex'];
                    $pincodesFound = [];
                    for ($i = count($parts) - 1; $i >= 0; $i--) {
                        if (preg_match("/^$regex$/i", $parts[$i])) {
                            $pincodesFound[] = $parts[$i];
                            $parts[$i] = $partsLower[$i] = null;
                        }
                    }
                    if (count($pincodesFound) > 1) {
                        $statusCodes[] = 'Multiple pincodes detected, using last';
                    }
                    if (!empty($pincodesFound)) {
                        $components['pincode'] = end($pincodesFound);
                        $parts = array_values(array_filter($parts));
                        $partsLower = array_values(array_filter($partsLower));
                        $components['address'] = trim(preg_replace('/\s+/', ' ', implode(' ', $parts)));
                    }
                }

                $countryName = $components['country'] ?? null;
                if ($countryName) {
                    $countryId = null;
                    foreach ($states as $cId => $stateData) {
                        foreach ($stateData as $sData) {
                            if (strtolower($sData['country_name']) === strtolower($countryName)) {
                                $countryId = $cId;
                                break 2;
                            }
                        }
                    }
                    if ($countryId && isset($states[$countryId])) {
                        $matchedState = null;
                        $matchedStateIso = null;
                        for ($i = count($parts) - 1; $i >= 0 && !$matchedState; $i--) {
                            foreach ($states[$countryId] as $sId => $sData) {
                                $stateName = $sData['name'];
                                $stateIso2 = $sData['iso_2'] ?? '';
                                $stateNameLower = strtolower($stateName);
                                $stateNameParts = preg_split('/\s+/', $stateNameLower, -1, PREG_SPLIT_NO_EMPTY);
                                $stateNameLen = count($stateNameParts);
                                $isCity = false;
                                if ($countryName && isset($cities[$countryName])) {
                                    foreach ($cities[$countryName] as $cityState => $cityList) {
                                        if (in_array($stateNameLower, $cityList)) {
                                            $isCity = true;
                                            break;
                                        }
                                    }
                                }
                                if (!$isCity) {
                                    if ($stateNameLen > 1 && $i - $stateNameLen + 1 >= 0) {
                                        $slice = array_slice($partsLower, $i - $stateNameLen + 1, $stateNameLen);
                                        $candidate = implode(' ', $slice);
                                        if ($candidate === $stateNameLower) {
                                            $matchedState = $stateName;
                                            $matchedStateIso = $stateIso2;
                                            for ($j = $i - $stateNameLen + 1; $j <= $i; $j++) {
                                                $parts[$j] = $partsLower[$j] = null;
                                            }
                                            break;
                                        }
                                    } elseif ($stateNameLen === 1 && $partsLower[$i] === $stateNameLower) {
                                        $matchedState = $stateName;
                                        $matchedStateIso = $stateIso2;
                                        $parts[$i] = $partsLower[$i] = null;
                                        break;
                                    }
                                }
                            }
                        }
                        if (!$matchedState) {
                            for ($i = count($parts) - 1; $i >= 0 && !$matchedState; $i--) {
                                foreach ($states[$countryId] as $sId => $sData) {
                                    $stateIso2 = $sData['iso_2'] ?? '';
                                    if ($stateIso2 !== '' && $partsLower[$i] === strtolower($stateIso2)) {
                                        $matchedState = $sData['name'];
                                        $matchedStateIso = $stateIso2;
                                        $parts[$i] = $partsLower[$i] = null;
                                        break;
                                    }
                                }
                            }
                        }
                        if ($matchedState) {
                            $components['state'] = $matchedState;
                            $stateTerms = array_filter([strtolower($matchedState), strtolower($matchedStateIso ?? '')]);
                            foreach ($partsLower as $i => $part) {
                                foreach ($stateTerms as $term) {
                                    if ($part && strpos($term, ' ') === false && $part === $term) {
                                        $parts[$i] = $partsLower[$i] = null;
                                    } elseif (strpos($term, ' ') !== false && $i + count(explode(' ', $term)) - 1 < count($partsLower)) {
                                        $termParts = explode(' ', $term);
                                        $candidate = implode(' ', array_slice($partsLower, $i, count($termParts)));
                                        if ($candidate === $term) {
                                            for ($j = $i; $j < $i + count($termParts); $j++) {
                                                $parts[$j] = $partsLower[$j] = null;
                                            }
                                        }
                                    }
                                }
                            }
                            $parts = array_values(array_filter($parts));
                            $partsLower = array_values(array_filter($partsLower));
                            $components['address'] = trim(preg_replace('/\s+/', ' ', implode(' ', $parts)));
                        } else {
                            $statusCodes[] = 'Missing or invalid state';
                        }
                    }
                }

                if ($components['country'] && $components['state'] && isset($cities[$components['country']][$components['state']])) {
                    $matchedCity = null;
                    $cityPool = $cities[$components['country']][$components['state']];
                    for ($i = count($parts) - 1; $i >= 0 && !$matchedCity; $i--) {
                        for ($len = min(3, $i + 1); $len >= 1; $len--) {
                            if ($i - $len + 1 < 0) continue;
                            $candidate = strtolower(implode(' ', array_slice($partsLower, $i - $len + 1, $len)));
                            if (in_array($candidate, $cityPool)) {
                                $matchedCity = implode(' ', array_slice($parts, $i - $len + 1, $len));
                                for ($j = $i - $len + 1; $j <= $i; $j++) {
                                    $parts[$j] = $partsLower[$j] = null;
                                }
                                break;
                            }
                        }
                    }
                    if ($matchedCity) {
                        $components['city'] = $matchedCity;
                        $cityTerms = [strtolower($matchedCity)];
                        foreach ($partsLower as $i => $part) {
                            foreach ($cityTerms as $term) {
                                if ($part && strpos($term, ' ') === false && $part === $term) {
                                    $parts[$i] = $partsLower[$i] = null;
                                } elseif (strpos($term, ' ') !== false && $i + count(explode(' ', $term)) - 1 < count($partsLower)) {
                                    $termParts = explode(' ', $term);
                                    $candidate = implode(' ', array_slice($partsLower, $i, count($termParts)));
                                    if ($candidate === $term) {
                                        for ($j = $i; $j < $i + count($termParts); $j++) {
                                            $parts[$j] = $partsLower[$j] = null;
                                        }
                                    }
                                }
                            }
                        }
                        $parts = array_values(array_filter($parts));
                        $partsLower = array_values(array_filter($partsLower));
                        $components['address'] = trim(preg_replace('/\s+/', ' ', implode(' ', $parts)));
                    } else {
                        $statusCodes[] = 'Missing or invalid city';
                    }
                } else {
                    $statusCodes[] = 'Cannot match city without valid country and state';
                }

                if (!empty($parts)) {
                    $components['street'] = implode(' ', $parts);
                } else {
                    $statusCodes[] = 'Missing street';
                }

                $requiredComponents = ['street', 'city', 'state', 'country'];
                $missingComponents = array_filter($requiredComponents, fn($key) => empty($components[$key]));
                if (!empty($missingComponents)) {
                    $statusCodes[] = 'Missing required components: ' . implode(', ', $missingComponents);
                }
                $components['status'] = empty($missingComponents) && empty($statusCodes) ? 'Complete' : 'Incomplete';
                $components['status_code'] = implode('; ', array_unique($statusCodes));

                $row['address_old'] = $rawAddress;
                $row['street'] = $components['street'];
                $row['city'] = $components['city'];
                $row['state'] = $components['state'];
                $row['pincode'] = $components['pincode'];
                $row['country'] = $components['country'];
                $row['status'] = $components['status'];
                $row['status_code'] = $components['status_code'];
                $row['__state'] = $components['status'] === 'Complete' ? 'processed' : 'rejected';
                $row['__reason'] = $components['status'] === 'Complete' ? 'completed' : $components['status_code'];

                // Ensure all headers are present in the row
                foreach ($headers as $header) {
                    if (!array_key_exists($header, $row)) {
                        $row[$header] = '';
                    }
                }

                $rows[] = $row;
                if ($row['__state'] === 'processed') {
                    $metrics['affected']++;
                } else {
                    $metrics['rejected']++;
                }
            });

            // Log the number of rows collected before writing output
            Developer::info("Rows collected for output", ['count' => count($rows)]);

            // Define the generator AFTER $rows is filled
            $rowGenerator = function () use (&$rows) {
                foreach ($rows as $row) {
                    yield $row;
                }
            };

            // Write output
            ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
        } catch (\Throwable $e) {
            return ProcessFlowHelper::addTraceEntry(
                $workflowName,
                'failed',
                $metrics,
                "Error in `$workflowName`: " . $e->getMessage()
            );
        }

        $traceEntry = ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'completed',
            $metrics,
            "Processed `$workflowName`"
        );

        Developer::info("✅ Completed GlobalAddressSplitMethod", [
            'workflow' => $workflowName,
            'trace_entry' => $traceEntry
        ]);

        return $traceEntry;
    }
    public function PhoneCheckMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
    {
        // Log received parameters
        Developer::info("📥 Received to PhoneCheckMethod", [
            'workflow' => $workflowName,
            'input' => $input,
            'output' => $output,
            'metadata' => $metadata,
            'tracing' => $tracing
        ]);

        // Initialize metrics
        $metrics = [
            'total' => 0,
            'affected' => 0,
            'rejected' => 0,
            'skipped' => 0
        ];

        // Load reference data
        $countriesRaw = DB::select('SELECT name, phone_code, phone_length FROM moon.countries');
        $countries = [];
        foreach ($countriesRaw as $c) {
            $countries[strtolower($c->name)] = $c;
        }

        // Define output headers
        $headers = ['country', 'phone_old', 'phone_new', 'country_code', 'phone_count', 'status', '__state', '__reason'];

        // Initialize rows array and generator
        $rows = [];
        $rowGenerator = function () use (&$rows) {
            foreach ($rows as $row) {
                yield $row;
            }
        };

        try {
            // Process input data row by row
            ProcessFlowHelper::readInput($input, function ($row, $index) use (&$rows, &$metrics, $countries) {
                $metrics['total']++;

                // Use correct header: 'phone' (not 'phone_number')
                $phone = trim($row['phone'] ?? '');
                $country = trim($row['country'] ?? '');

                // Only skip if phone is empty
                if (empty($phone)) {
                    $row['country'] = $country;
                    $row['phone_old'] = $phone;
                    $row['phone_new'] = $phone;
                    $row['country_code'] = null;
                    $row['phone_count'] = null;
                    $row['status'] = 'Skipped';
                    $row['__state'] = 'skipped';
                    $row['__reason'] = 'Empty phone number';
                    $rows[] = $row;
                    $metrics['skipped']++;
                    return;
                }

                // Parse phone number
                $countryKey = strtolower(trim($country));
                $originalCountry = $country;

                // Always attempt to infer country if not found or empty
                $inferredCountry = null;
                $cleanTempPhone = preg_replace('/[^\d+]/', '', $phone);
                if (empty($country) || !isset($countries[$countryKey])) {
                    if (Str::startsWith($cleanTempPhone, '+')) {
                        foreach ($countries as $key => $data) {
                            // Skip ambiguous codes like +1
                            if ($data->phone_code == '1') {
                                continue;
                            }
                            if (Str::startsWith($cleanTempPhone, '+' . $data->phone_code)) {
                                $inferredCountry = $key;
                                break;
                            }
                        }
                        if ($inferredCountry) {
                            $countryKey = $inferredCountry;
                            $originalCountry = $countries[$countryKey]->name;
                        } else {
                            $row['country'] = $country;
                            $row['phone_old'] = $phone;
                            $row['phone_new'] = $phone;
                            $row['country_code'] = null;
                            $row['phone_count'] = null;
                            $row['status'] = 'Invalid country and no match by code';
                            $row['__state'] = 'rejected';
                            $row['__reason'] = 'Invalid country and no match by code';
                            $rows[] = $row;
                            $metrics['rejected']++;
                            return;
                        }
                    } else {
                        $row['country'] = $country;
                        $row['phone_old'] = $phone;
                        $row['phone_new'] = $phone;
                        $row['country_code'] = null;
                        $row['phone_count'] = null;
                        $row['status'] = 'Invalid country and no code to infer';
                        $row['__state'] = 'rejected';
                        $row['__reason'] = 'Invalid country and no code to infer';
                        $rows[] = $row;
                        $metrics['rejected']++;
                        return;
                    }
                }

                $phoneCode = $countries[$countryKey]->phone_code;
                $lengthRules = explode(',', $countries[$countryKey]->phone_length);

                $cleanPhone = preg_replace('/[^\d+]/', '', $phone);
                $cleanPhone = ltrim($cleanPhone, '0');

                $status = 'Valid';
                if (!Str::startsWith($cleanPhone, '+')) {
                    $cleanPhone = "+$phoneCode $cleanPhone";
                    $status = 'Valid (Added code)';
                } elseif (!Str::startsWith($cleanPhone, "+$phoneCode")) {
                    $cleanPhone = "+$phoneCode " . substr($cleanPhone, strlen($phoneCode) + 1);
                    $status = 'Valid (Fixed code)';
                }

                // Extract digits only (after code) for length validation
                $phoneWithoutCode = preg_replace('/^\+' . preg_quote($phoneCode, '/') . '\s*/', '', $cleanPhone);
                $phoneCount = strlen($phoneWithoutCode);

                // Support for fixed and ranged lengths
                $lengthValid = false;
                foreach ($lengthRules as $rule) {
                    $rule = trim($rule);
                    if (strpos($rule, '-') !== false) {
                        [$min, $max] = explode('-', $rule);
                        if ($phoneCount >= (int)$min && $phoneCount <= (int)$max) {
                            $lengthValid = true;
                            break;
                        }
                    } elseif ((int)$rule === $phoneCount) {
                        $lengthValid = true;
                        break;
                    }
                }

                if (!$lengthValid) {
                    $status = 'Invalid length';
                }

                // Prepare row for output
                $row['country'] = $originalCountry;
                $row['phone_old'] = $phone;
                $row['phone_new'] = '="' . $cleanPhone . '"';
                $row['country_code'] = '="' . "+$phoneCode" . '"';
                $row['phone_count'] = $phoneCount;
                $row['status'] = $status;
                $row['__state'] = $lengthValid ? 'processed' : 'rejected';
                $row['__reason'] = $lengthValid ? 'completed' : $status;

                $rows[] = $row;
                if ($lengthValid) {
                    $metrics['affected']++;
                } else {
                    $metrics['rejected']++;
                }
            });

            // Debug: log first few rows and phone/country values
            Developer::info('PhoneCheckMethod debug', [
                'first_rows' => array_slice($rows, 0, 3),
                'row_count' => count($rows)
            ]);

            // Write processed rows to output
            ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
        } catch (\Throwable $e) {
            // Handle exceptions
            return ProcessFlowHelper::addTraceEntry(
                $workflowName,
                'failed',
                $metrics,
                "Error in `$workflowName`: " . $e->getMessage()
            );
        }

        // Create trace entry
        $traceEntry = ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'completed',
            $metrics,
            "Processed `$workflowName`"
        );

        // Log completion
        Developer::info("✅ Completed PhoneCheckMethod", [
            'workflow' => $workflowName,
            'trace_entry' => $traceEntry
        ]);

        return $traceEntry;
    }

    public function SmtpJunkMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
    {
        // Log received parameters
        Developer::info("📥 Received to SmtpJunkMethod", [
            'workflow' => $workflowName,
            'input' => $input,
            'output' => $output,
            'metadata' => $metadata,
            'tracing' => $tracing
        ]);

        // Initialize metrics
        $metrics = [
            'total' => 0,
            'affected' => 0,
            'rejected' => 0,
            'skipped' => 0
        ];

        // Load SMTP junk reference data
        $smtpJunk = array_map(
            fn($row) => (array) $row,
            DB::select('SELECT smtp, status FROM base.smtp_junk')
        );
        // Add debug log for loaded rules
        Developer::info('Loaded smtp_junk rules', ['smtpJunk' => $smtpJunk]);

        // Define output headers
        $headers = ['smtp', 'cleaned_smtp', 'status', '__state', '__reason'];

        // Initialize rows array and generator
        $rows = [];
        $rowGenerator = function () use (&$rows) {
            foreach ($rows as $row) {
                yield $row;
            }
        };

        try {
            // Process input data row by row
            ProcessFlowHelper::readInput($input, function ($row, $index) use (&$rows, &$metrics, $smtpJunk, &$smtpHeader) {
                $metrics['total']++;

                // Extract and trim required field
                $smtpHeader = null;
                foreach (array_keys($row) as $key) {
                    if (strtolower($key) === 'smtp') {
                        $smtpHeader = $key;
                        break;
                    }
                }

                if (!$smtpHeader) {
                    $row['smtp'] = '';
                    $row['cleaned_smtp'] = '';
                    $row['status'] = 'Error';
                    $row['__state'] = 'rejected';
                    $row['__reason'] = 'No smtp column found';
                    $rows[] = $row;
                    $metrics['rejected']++;
                    return;
                }

                $smtp = trim($row[$smtpHeader] ?? '');

                // Check for empty SMTP
                if (empty($smtp)) {
                    $row['smtp'] = $smtp;
                    $row['cleaned_smtp'] = '';
                    $row['status'] = 'Skipped';
                    $row['__state'] = 'skipped';
                    $row['__reason'] = 'Empty SMTP';
                    $rows[] = $row;
                    $metrics['skipped']++;
                    return;
                }

                // Clean SMTP string
                $cleanedSmtp = $smtp;
                $statusList = [];
                $matchedRule = false;

                foreach ($smtpJunk as $rule) {
                    $pattern = $rule['smtp'];
                    $status = $rule['status'];

                    if ($cleanedSmtp === null) {
                        break;
                    }

                    switch ($status) {
                        case 'Remove URL':
                            $urlPatterns = [
                                'http://',
                                'https://',
                                'www.',
                                'HTTP://',
                                'HTTPS://',
                                'WWW.',
                                'Http://',
                                'Https://',
                                'Www.'
                            ];
                            $allPatterns = array_merge([$pattern], $urlPatterns);
                            foreach ($allPatterns as $p) {
                                if (stripos($cleanedSmtp, $p) !== false) {
                                    $cleanedSmtp = str_ireplace($p, '', $cleanedSmtp);
                                    $statusList[] = 'url removed';
                                    $matchedRule = true;
                                }
                            }
                            break;
                        case 'Remove Symbol':
                            if (strpos($cleanedSmtp, $pattern) !== false) {
                                $cleanedSmtp = str_replace($pattern, '', $cleanedSmtp);
                                $statusList[] = 'symbol removed';
                                $matchedRule = true;
                            }
                            break;
                        case 'Remove Total':
                            if (strpos($cleanedSmtp, $pattern) !== false) {
                                $cleanedSmtp = null;
                                $statusList[] = 'junk removed';
                                $matchedRule = true;
                                break 2;
                            }
                            break;
                        case 'Remove Word':
                            if (strpos($cleanedSmtp, $pattern) !== false) {
                                $cleanedSmtp = str_replace($pattern, '', $cleanedSmtp);
                                $statusList[] = 'word removed';
                                $matchedRule = true;
                            }
                            break;
                        case 'Remove Country':
                            if (strpos($cleanedSmtp, $pattern) === 0) {
                                $cleanedSmtp = substr($cleanedSmtp, strlen($pattern));
                                $statusList[] = 'country removed';
                                $matchedRule = true;
                            }
                            break;
                        case 'Remove Prefix':
                            if (strpos($cleanedSmtp, $pattern) === 0) {
                                $cleanedSmtp = substr($cleanedSmtp, strlen($pattern));
                                $statusList[] = 'prefix removed';
                                $matchedRule = true;
                            }
                            break;
                        case 'Check Company':
                            if (stripos($cleanedSmtp, $pattern) !== false) {
                                if (stripos($cleanedSmtp, $pattern) === 0) {
                                    $cleanedSmtp = substr($cleanedSmtp, strlen($pattern));
                                    $statusList[] = 'company prefix removed';
                                } else {
                                    $statusList[] = 'check company';
                                }
                                $matchedRule = true;
                            }
                            break;
                        case 'Needs Rework':
                            if (strpos($cleanedSmtp, $pattern) !== false) {
                                $statusList[] = 'needs rework';
                                $matchedRule = true;
                            }
                            break;
                        case 'Truncate Query':
                            if (strpos($cleanedSmtp, '?') !== false) {
                                $cleanedSmtp = explode('?', $cleanedSmtp)[0];
                                $statusList[] = 'query truncated';
                                $matchedRule = true;
                            }
                            break;
                        case 'Truncate Percent':
                            if (strpos($cleanedSmtp, '%') !== false) {
                                $cleanedSmtp = explode('%', $cleanedSmtp)[0];
                                $statusList[] = 'percent truncated';
                                $matchedRule = true;
                            }
                            break;
                        case 'Truncate Slash':
                            $parsed = parse_url($cleanedSmtp);
                            if (!empty($parsed['host'])) {
                                $cleanedSmtp = $parsed['host'];
                                $statusList[] = 'slash truncated';
                                $matchedRule = true;
                            } else {
                                $slashPos = strpos($cleanedSmtp, '/');
                                if ($slashPos !== false) {
                                    $cleanedSmtp = substr($cleanedSmtp, 0, $slashPos);
                                    $statusList[] = 'slash truncated';
                                    $matchedRule = true;
                                }
                            }
                            break;
                        case 'Unknown':
                            $cleanedSmtp = null;
                            $statusList[] = 'unknown';
                            $matchedRule = true;
                            break;
                    }
                }

                // Fallback cleaning if no rule matched or nothing was cleaned
                if (!$matchedRule || $cleanedSmtp === $smtp || $cleanedSmtp === null) {
                    // Remove common junk characters from both ends
                    $cleanedSmtp = trim($smtp, " \t\n\r\0\x0B@./\\-_:;#%?[]{}()<>|\"'*$=!");
                    // If still nothing, try to extract a valid hostname
                    if (preg_match('/([a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})/', $cleanedSmtp, $matches)) {
                        $cleanedSmtp = $matches[1];
                        $statusList[] = 'fallback cleaned';
                    }
                }

                // Final trim of unwanted edge characters
                if ($cleanedSmtp !== null) {
                    $cleanedSmtp = trim($cleanedSmtp, " \t\n\r\0\x0B@./\\-_:;#%?[]{}()<>|\"'");
                }

                // Remove duplicates while preserving order
                $statusList = array_values(array_unique($statusList));
                $statusString = $statusList ? implode(', ', $statusList) : 'no action';

                // Debug log for each row
                Developer::info('SmtpJunkMethod row debug', [
                    'row_index' => $index,
                    'smtp' => $smtp,
                    'cleaned_smtp' => $cleanedSmtp,
                    'status_list' => $statusList,
                    'status_string' => $statusString,
                    'row' => $row,
                ]);

                // Accept cleaned SMTPs if they look valid
                if ($cleanedSmtp !== null && preg_match('/^[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$/', $cleanedSmtp)) {
                    $row['smtp'] = $smtp;
                    $row['cleaned_smtp'] = $cleanedSmtp;
                    $row['status'] = $statusString === 'no action' ? 'cleaned' : $statusString;
                    $row['__state'] = 'processed';
                    $row['__reason'] = $statusString === 'no action' ? 'completed' : $statusString;
                    $rows[] = $row;
                    $metrics['affected']++;
                } else {
                    $row['smtp'] = $smtp;
                    $row['cleaned_smtp'] = $cleanedSmtp ?? '';
                    $row['status'] = $statusString;
                    $row['__state'] = 'rejected';
                    $row['__reason'] = $statusString;
                    $rows[] = $row;
                    $metrics['rejected']++;
                }
            });

            // Write processed rows to output
            ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
        } catch (\Throwable $e) {
            // Handle exceptions
            return ProcessFlowHelper::addTraceEntry(
                $workflowName,
                'failed',
                $metrics,
                "Error in `$workflowName`: " . $e->getMessage()
            );
        }

        // Create trace entry
        $traceEntry = ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'completed',
            $metrics,
            "Processed `$workflowName`"
        );

        // Log completion
        Developer::info("✅ Completed SmtpJunkMethod", [
            'workflow' => $workflowName,
            'trace_entry' => $traceEntry
        ]);

        return $traceEntry;
    }
    public function GenerateEmailsMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
    {
        Developer::info("📥 Received to GenerateEmailsMethod", [
            'workflow' => $workflowName,
            'input' => $input,
            'output' => $output,
            'metadata' => $metadata,
            'tracing' => $tracing
        ]);

        $metrics = ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0];

        $requiredHeaders = ['li_full_name', 'domain'];
        $updateHeaders = [
            'li_first_name',
            'li_last_name',
            'li_firstname_initial',
            'li_lastname_initial',
            'generated_email',
            'format_code',
            'status',
            'reason'
        ];
        $headers = array_merge($requiredHeaders, $updateHeaders, ['__state', '__reason']);

        // Use streaming approach for large files instead of storing all rows in memory
        $rowGenerator = function () use ($input, $headers, &$metrics, $requiredHeaders, $updateHeaders) {
            $separatorMap = ['Dot' => '.', 'Hyphen' => '-', 'Underscore' => '_', 'Space' => '', 'Empty' => ''];

            // Load domain formats and email formats
            $domainFormatMap = array_column(DB::select('SELECT domain, email_format FROM moon.domain_formats'), 'email_format', 'domain');
            $emailFormats = array_map('get_object_vars', DB::select('SELECT * FROM moon.email_formats'));

            // If no email formats found, create a default one
            if (empty($emailFormats)) {
                Developer::warning("No email formats found in database, creating default format");
                $emailFormats = [
                    [
                        'status' => 1,
                        'field_1' => 'FirstName',
                        'field_2' => 'LastName',
                        'separator' => 'Dot'
                    ]
                ];
            }

            // Process input data in streaming fashion
            ProcessFlowHelper::readInput($input, function ($row, $index) use (&$metrics, $domainFormatMap, $emailFormats, $separatorMap, $requiredHeaders, $updateHeaders) {
                $metrics['total']++;

                $fullName = trim($row['li_full_name'] ?? '');
                $domain = trim($row['domain'] ?? '');

                if ($fullName === '' || $domain === '') {
                    $row['li_full_name'] = $fullName;
                    $row['domain'] = $domain;
                    $row['li_first_name'] = '';
                    $row['li_last_name'] = '';
                    $row['li_firstname_initial'] = '';
                    $row['li_lastname_initial'] = '';
                    $row['generated_email'] = '';
                    $row['format_code'] = '';
                    $row['status'] = 'skipped';
                    $row['reason'] = 'Missing full name or domain';
                    $row['__state'] = 'skipped';
                    $row['__reason'] = 'Missing full name or domain';
                    $metrics['skipped']++;
                    return $row;
                }

                // Parse name using the same technique as reference code
                $nameParts = explode(' ', $fullName);
                $firstName = $nameParts[0] ?? '';
                $lastName = count($nameParts) > 1 ? array_pop($nameParts) : '';
                $firstInitial = strtoupper(substr($firstName, 0, 1));
                $lastInitial = strtoupper(substr($lastName, 0, 1));

                if (empty($firstName) || empty($lastName)) {
                    $row['li_full_name'] = $fullName;
                    $row['domain'] = $domain;
                    $row['li_first_name'] = $firstName;
                    $row['li_last_name'] = $lastName;
                    $row['li_firstname_initial'] = $firstInitial;
                    $row['li_lastname_initial'] = $lastInitial;
                    $row['generated_email'] = '';
                    $row['format_code'] = '';
                    $row['status'] = 'skipped';
                    $row['reason'] = 'Full name must have at least 2 words';
                    $row['__state'] = 'skipped';
                    $row['__reason'] = 'Full name must have at least 2 words';
                    $metrics['skipped']++;
                    return $row;
                }

                // Use the same variable naming as reference code
                $formatsToUse = $domainFormatMap[$domain] ?? implode(',', array_column($emailFormats, 'status'));
                $formatsToUse = array_map('intval', array_filter(explode(',', $formatsToUse)));

                // If no active formats found, use all available formats
                if (empty($formatsToUse)) {
                    $formatsToUse = array_column($emailFormats, 'status');
                }

                // Ensure we have at least one format to process
                if (empty($formatsToUse) && !empty($emailFormats)) {
                    $formatsToUse = [1]; // Use first format as fallback
                }

                foreach ($emailFormats as $format) {
                    if (!in_array((int)$format['status'], $formatsToUse, true)) continue;

                    $sep = $separatorMap[$format['separator']] ?? '';

                    $f1 = match ($format['field_1']) {
                        'FirstName' => $firstName,
                        'LastName' => $lastName,
                        'FirstInitial' => $firstInitial,
                        'LastInitial' => $lastInitial,
                        default => ''
                    };

                    $f2 = match ($format['field_2']) {
                        'FirstName' => $firstName,
                        'LastName' => $lastName,
                        'FirstInitial' => $firstInitial,
                        'LastInitial' => $lastInitial,
                        default => ''
                    };

                    if ($f1 === '' && $f2 === '') {
                        $row['li_full_name'] = $fullName;
                        $row['domain'] = $domain;
                        $row['li_first_name'] = $firstName;
                        $row['li_last_name'] = $lastName;
                        $row['li_firstname_initial'] = $firstInitial;
                        $row['li_lastname_initial'] = $lastInitial;
                        $row['generated_email'] = '';
                        $row['format_code'] = $format['status'];
                        $row['status'] = 'Bad';
                        $row['reason'] = 'Empty name fields';
                        $row['__state'] = 'rejected';
                        $row['__reason'] = 'Empty name fields';
                        $metrics['rejected']++;
                        return $row;
                    }

                    $email = strtolower(trim($f1 . $sep . $f2 . '@' . $domain));
                    $isValid = filter_var($email, FILTER_VALIDATE_EMAIL);

                    $row['li_full_name'] = $fullName;
                    $row['domain'] = $domain;
                    $row['li_first_name'] = $firstName;
                    $row['li_last_name'] = $lastName;
                    $row['li_firstname_initial'] = $firstInitial;
                    $row['li_lastname_initial'] = $lastInitial;
                    $row['generated_email'] = $email;
                    $row['format_code'] = $format['status'];
                    $row['status'] = $isValid ? 'Good' : 'Bad';
                    $row['reason'] = $isValid ? 'Valid email generated' : 'Invalid email format';
                    $row['__state'] = $isValid ? 'processed' : 'rejected';
                    $row['__reason'] = $isValid ? 'completed' : 'Invalid email format';

                    $isValid ? $metrics['affected']++ : $metrics['rejected']++;
                    return $row;
                }

                // Add a fallback row to ensure at least one output per input if no formats were processed
                if (empty($formatsToUse)) {
                    $row['li_full_name'] = $fullName;
                    $row['domain'] = $domain;
                    $row['li_first_name'] = $firstName;
                    $row['li_last_name'] = $lastName;
                    $row['li_firstname_initial'] = $firstInitial;
                    $row['li_lastname_initial'] = $lastInitial;
                    $row['generated_email'] = '';
                    $row['format_code'] = '';
                    $row['status'] = 'Bad';
                    $row['reason'] = 'No email formats available';
                    $row['__state'] = 'rejected';
                    $row['__reason'] = 'No email formats available';
                    $metrics['rejected']++;
                    return $row;
                }
            });
        };

        try {
            ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
        } catch (\Throwable $e) {
            return ProcessFlowHelper::addTraceEntry(
                $workflowName,
                'failed',
                $metrics,
                "Error in `$workflowName`: " . $e->getMessage()
            );
        }

        $traceEntry = ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'completed',
            $metrics,
            "Processed `$workflowName`"
        );

        Developer::info("✅ Completed GenerateEmailsMethod", [
            'workflow' => $workflowName,
            'trace_entry' => $traceEntry
        ]);

        return $traceEntry;
    }

    public function EmailSyntaxMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
    {
        Developer::info("📥 Received to ValidateEmailSyntaxMethod", [
            'workflow' => $workflowName,
            'input' => $input,
            'output' => $output,
            'metadata' => $metadata,
            'tracing' => $tracing
        ]);

        $metrics = ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0];

        $requiredHeaders = ['email'];
        $updateHeaders = ['domain', 'syntax_status', 'reason', 'suggested_email'];
        $headers = array_merge($requiredHeaders, $updateHeaders);

        $rows = [];

        $rowGenerator = function () use (&$rows) {
            foreach ($rows as $row) {
                yield $row;
            }
        };

        try {
            $emailRegex = '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/';

            ProcessFlowHelper::readInput($input, function ($row, $index) use (&$rows, &$metrics, $emailRegex) {
                $metrics['total']++;

                $emailRaw = trim($row['email'] ?? '');
                $email = strtolower($emailRaw);
                $domain = explode('@', $email)[1] ?? '';

                if ($email === '') {
                    $row['email'] = $emailRaw;
                    $row['domain'] = '';
                    $row['syntax_status'] = 'skipped';
                    $row['reason'] = 'Empty email';
                    $rows[] = $row;
                    $metrics['skipped']++;
                    return;
                }

                $isValid = filter_var($email, FILTER_VALIDATE_EMAIL) && preg_match($emailRegex, $email);

                if ($isValid) {
                    $row['email'] = $email;
                    $row['domain'] = $domain;
                    $row['syntax_status'] = 'Valid';
                    $row['reason'] = 'Valid email syntax';
                    $row['suggested_email'] = '';
                    $rows[] = $row;
                    $metrics['affected']++;
                } else {
                    // Try to suggest a fix
                    $parts = explode('@', $email);
                    $suggestedEmail = '';
                    if (count($parts) === 2) {
                        $local = preg_replace('/[^a-zA-Z0-9._%+-]/', '', $parts[0]);
                        $dom = preg_replace('/[^a-zA-Z0-9.-]/', '', $parts[1]);
                        if (!str_contains($dom, '.')) {
                            $dom .= '.com';
                        }
                        $suggestedEmail = $local . '@' . $dom;
                    } else {
                        $suggestedEmail = 'example@example.com';
                    }

                    $row['email'] = $email;
                    $row['domain'] = $domain;
                    $row['syntax_status'] = 'Invalid';
                    $row['reason'] = 'Invalid email syntax';
                    $row['suggested_email'] = $suggestedEmail;
                    $rows[] = $row;
                    $metrics['rejected']++;
                }
            });

            ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
        } catch (\Throwable $e) {
            return ProcessFlowHelper::addTraceEntry(
                $workflowName,
                'failed',
                $metrics,
                "Error in `$workflowName`: " . $e->getMessage()
            );
        }

        $traceEntry = ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'completed',
            $metrics,
            "Processed `$workflowName`"
        );

        Developer::info("✅ Completed ValidateEmailSyntaxMethod", [
            'workflow' => $workflowName,
            'trace_entry' => $traceEntry
        ]);

        return $traceEntry;
    }

    public function DomainFormatMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
    {
        Developer::info("📥 Received to DomainFormatMethod", [
            'workflow' => $workflowName,
            'input' => $input,
            'output' => $output,
            'metadata' => $metadata,
            'tracing' => $tracing
        ]);

        $metrics = ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0];

        // ✅ Define headers like in EmailSyntaxMethod
        $requiredHeaders = ['li_full_name', 'email'];
        $updateHeaders = ['domain', 'matched_formats', 'status', 'reason'];
        $headers = array_merge($requiredHeaders, $updateHeaders);

        $rows = [];

        $rowGenerator = function () use (&$rows) {
            foreach ($rows as $row) {
                yield $row;
            }
        };

        try {
            $emailRegex = '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/';
            $formats = array_map('get_object_vars', DB::select('SELECT * FROM moon.email_formats'));
            $separatorMap = ['Dot' => '.', 'Hyphen' => '-', 'Underscore' => '_', 'Space' => '', 'Empty' => ''];
            $domainFormats = [];

            ProcessFlowHelper::readInput($input, function ($row, $index) use (&$metrics, &$domainFormats, $formats, $separatorMap, &$rows, $emailRegex) {
                $metrics['total']++;

                $fullNameRaw = trim($row['li_full_name'] ?? '');
                $emailRaw = trim($row['email'] ?? '');
                $email = strtolower($emailRaw);

                if ($fullNameRaw === '' || $email === '') {
                    $metrics['skipped']++;
                    $row['li_full_name'] = $fullNameRaw;
                    $row['email'] = $emailRaw;
                    $row['domain'] = '';
                    $row['matched_formats'] = '';
                    $row['status'] = 'skipped';
                    $row['reason'] = 'Missing full name or email';
                    $rows[] = $row;
                    return;
                }

                if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match($emailRegex, $email)) {
                    $metrics['rejected']++;
                    $row['li_full_name'] = $fullNameRaw;
                    $row['email'] = $email;
                    $row['domain'] = '';
                    $row['matched_formats'] = '';
                    $row['status'] = 'rejected';
                    $row['reason'] = 'Invalid email syntax';
                    $rows[] = $row;
                    return;
                }

                $parts = preg_split('/\s+/', $fullNameRaw);
                if (count($parts) < 2) {
                    $metrics['rejected']++;
                    $row['li_full_name'] = $fullNameRaw;
                    $row['email'] = $email;
                    $row['domain'] = '';
                    $row['matched_formats'] = '';
                    $row['status'] = 'rejected';
                    $row['reason'] = 'Incomplete full name';
                    $rows[] = $row;
                    return;
                }

                [$first, $last] = [$parts[0], $parts[array_key_last($parts)]];
                [$fi, $li] = [strtolower($first[0] ?? ''), strtolower($last[0] ?? '')];
                $domain = explode('@', $email)[1] ?? '';

                if ($domain === '') {
                    $metrics['skipped']++;
                    $row['li_full_name'] = $fullNameRaw;
                    $row['email'] = $email;
                    $row['domain'] = '';
                    $row['matched_formats'] = '';
                    $row['status'] = 'skipped';
                    $row['reason'] = 'Email missing domain';
                    $rows[] = $row;
                    return;
                }

                $matched = collect($formats)->filter(function ($format) use ($first, $last, $fi, $li, $domain, $email, $separatorMap) {
                    $sep = $separatorMap[$format['separator']] ?? '';
                    $f1 = match ($format['field_1']) {
                        'FirstName' => strtolower($first),
                        'LastName' => strtolower($last),
                        'FirstInitial' => strtolower($fi),
                        'LastInitial' => strtolower($li),
                        default => ''
                    };
                    $f2 = match ($format['field_2']) {
                        'FirstName' => strtolower($first),
                        'LastName' => strtolower($last),
                        'FirstInitial' => strtolower($fi),
                        'LastInitial' => strtolower($li),
                        default => ''
                    };

                    return strtolower("$f1$sep$f2@$domain") === $email;
                })->pluck('status')->unique()->values()->all();

                if (!isset($domainFormats[$domain])) {
                    $domainFormats[$domain] = [];
                }

                $domainFormats[$domain] = array_unique(array_merge($domainFormats[$domain], $matched));

                $formatStr = implode(',', $matched);
                $status = $matched ? 'matched' : 'not_matched';
                $reason = $matched ? 'Formats identified' : 'No formats matched';

                $row['li_full_name'] = $fullNameRaw;
                $row['email'] = $email;
                $row['domain'] = $domain;
                $row['matched_formats'] = $formatStr;
                $row['status'] = $status;
                $row['reason'] = $reason;
                $rows[] = $row;

                $metrics['affected']++;
            });

            foreach ($domainFormats as $domain => $formats) {
                $formatStr = implode(',', $formats);
                DB::table('moon.domain_formats')->updateOrInsert(
                    ['domain' => $domain],
                    ['email_format' => $formatStr]
                );
            }

            ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);
        } catch (\Throwable $e) {
            return ProcessFlowHelper::addTraceEntry(
                $workflowName,
                'failed',
                $metrics,
                "Error in `$workflowName`: " . $e->getMessage()
            );
        }

        $traceEntry = ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'completed',
            $metrics,
            "Processed `$workflowName`"
        );

        Developer::info("✅ Completed DomainFormatMethod", [
            'workflow' => $workflowName,
            'trace_entry' => $traceEntry
        ]);

        return $traceEntry;
    }


public function AutoflowsMethod(string $workflowName, array $input, array $output, array $tracing, array $metadata): array
{
    Developer::info("📥 Starting AutoflowsMethod", [
        'workflow' => $workflowName,
        'input_type' => $input['type'] ?? 'unknown',
        'input_source' => $input['table'] ?? $input['path'] ?? 'unknown',
    ]);

    $metrics = ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0];
    $outputRows = [];
    
    try {
        $workflowConfig = collect($metadata['workflow_map'] ?? [])
            ->first(fn($config) => strcasecmp(trim($config['workflow_name'] ?? ''), trim($workflowName)) === 0);

        if (!$workflowConfig) {
            throw new Exception("No workflow mapping found for `$workflowName`.");
        }

        // Get base database and table from metadata
        $baseInputDb = $metadata['base_input_db'] ?? null;
        $baseInputTable = $metadata['base_input_table'] ?? null;

        if (!$baseInputDb || !$baseInputTable) {
            throw new Exception("Base database and table are required for AutoflowsMethod.");
        }

        // Remove database prefix if it exists
        if (str_contains($baseInputTable, '.')) {
            $baseInputTable = explode('.', $baseInputTable)[1];
        }

        Developer::info("AutoflowsMethod base table analysis", [
            'base_table' => "{$baseInputDb}.{$baseInputTable}",
            'workflow' => $workflowName
        ]);

        // === OPTIMIZATION 1: Prefetch all required data ===
        
        // Prefetch email formats
        $emailFormatsByStatus = DB::table('moon.email_formats')
            ->whereNotNull('status')
            ->where('status', '>', 0)
            ->get()
            ->keyBy('status')
            ->map(fn($r) => (array) $r)
            ->toArray();

        // Prefetch domain formats
        $domainFormatsMap = DB::table('moon.domain_formats')
            ->whereNull('deleted_at')
            ->whereNotNull('email_format')
            ->where('email_format', '!=', '')
            ->pluck('email_format', 'domain')
            ->map(function($formats) {
                return array_values(array_filter(array_map(function ($v) {
                    $n = (int) trim($v);
                    return $n > 0 ? $n : null;
                }, explode(',', (string) $formats))));
            })
            ->toArray();

        // === OPTIMIZATION 2: Collect unique domains first ===
        $uniqueDomains = [];
        $inputBuffer = [];
        
        ProcessFlowHelper::readInput($input, function($row, $index) use (&$uniqueDomains, &$inputBuffer, &$metrics) {
            $metrics['total']++;
            $inputBuffer[] = $row;
            
            $domain = trim($row['domain'] ?? '');
            if ($domain !== '') {
                $domainNorm = strtolower($domain);
                if (str_starts_with($domainNorm, 'www.')) {
                    $domainNorm = substr($domainNorm, 4);
                }
                $uniqueDomains[$domainNorm] = true;
            }
        });
        
        $uniqueDomains = array_keys($uniqueDomains);
        Developer::info("Unique domains to process", ['count' => count($uniqueDomains)]);

        // === OPTIMIZATION 3: Batch query for domain modes ===
        $domainModesMap = [];
        
        if (!empty($uniqueDomains)) {
            // Process domains in chunks to avoid query size limits
            $domainChunks = array_chunk($uniqueDomains, 500);
            
            foreach ($domainChunks as $chunk) {
                // Build optimized query using raw SQL for better performance
                $placeholders = implode(',', array_fill(0, count($chunk), '?'));
                
                $sql = "
                    SELECT 
                        LOWER(REPLACE(li_smtp, 'www.', '')) as domain_norm,
                        dls_email_number,
                        COUNT(*) as cnt
                    FROM {$baseInputDb}.{$baseInputTable}
                    WHERE li_smtp IS NOT NULL 
                        AND LOWER(REPLACE(li_smtp, 'www.', '')) IN ({$placeholders})
                    GROUP BY domain_norm, dls_email_number
                ";
                
                $results = DB::connection($baseInputDb)->select($sql, $chunk);
                
                // Process results to find mode for each domain
                $domainCounts = [];
                foreach ($results as $row) {
                    $domain = $row->domain_norm;
                    $number = (int) $row->dls_email_number;
                    $count = (int) $row->cnt;
                    
                    if (!isset($domainCounts[$domain])) {
                        $domainCounts[$domain] = [];
                    }
                    $domainCounts[$domain][$number] = $count;
                }
                
                // Find mode for each domain
                foreach ($domainCounts as $domain => $counts) {
                    arsort($counts);
                    $modeNumber = array_key_first($counts);
                    if ($modeNumber > 0) {
                        $domainModesMap[$domain] = $modeNumber;
                    }
                }
            }
        }

        Developer::info("Domain modes calculated", ['domains_with_modes' => count($domainModesMap)]);

        // === OPTIMIZATION 4: Process with streaming output ===
        $headers = [
            'li_full_name', 'domain', 'li_first_name', 'li_last_name',
            'li_firstname_initial', 'li_lastname_initial', 'generated_email',
            'format_code', 'status', 'reason', '__state', '__reason'
        ];

        $separatorMap = ['Dot' => '.', 'Hyphen' => '-', 'Underscore' => '_', 'Space' => '', 'Empty' => ''];
        
        // Create generator for streaming output
        $rowGenerator = function() use (
            $inputBuffer,
            &$metrics,
            $domainModesMap,
            $domainFormatsMap,
            $emailFormatsByStatus,
            $separatorMap,
            &$outputRows
        ) {
            foreach ($inputBuffer as $row) {
                $fullName = trim($row['li_full_name'] ?? '');
                $domain = trim($row['domain'] ?? '');
                $domainNorm = strtolower($domain);
                if (str_starts_with($domainNorm, 'www.')) {
                    $domainNorm = substr($domainNorm, 4);
                }

                // Initialize output row
                $outputRow = [
                    'li_full_name' => $fullName,
                    'domain' => $domainNorm,
                    'li_first_name' => '',
                    'li_last_name' => '',
                    'li_firstname_initial' => '',
                    'li_lastname_initial' => '',
                    'generated_email' => '',
                    'format_code' => '',
                    'status' => '',
                    'reason' => '',
                    '__state' => '',
                    '__reason' => ''
                ];

                // Validation checks
                if ($fullName === '' || $domainNorm === '') {
                    $outputRow['status'] = 'skipped';
                    $outputRow['reason'] = 'Missing full name or domain';
                    $outputRow['__state'] = 'skipped';
                    $outputRow['__reason'] = 'Missing full name or domain';
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    yield $outputRow;
                    continue;
                }

                // Get mode number from pre-calculated map
                $modeNumber = $domainModesMap[$domainNorm] ?? null;
                
                if ($modeNumber === null || $modeNumber <= 0) {
                    $outputRow['status'] = 'skipped';
                    $outputRow['reason'] = 'No base match for domain';
                    $outputRow['__state'] = 'skipped';
                    $outputRow['__reason'] = 'No base match for domain';
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    yield $outputRow;
                    continue;
                }

                // Get allowed formats from pre-fetched map
                $allowedFormats = $domainFormatsMap[$domainNorm] ?? [];
                
                // Choose format
                $chosenFormatNum = in_array($modeNumber, $allowedFormats, true)
                    ? $modeNumber
                    : (!empty($allowedFormats) ? $allowedFormats[0] : $modeNumber);

                $formatDef = $emailFormatsByStatus[$chosenFormatNum] ?? null;
                
                if (!$formatDef) {
                    $outputRow['format_code'] = (string) $chosenFormatNum;
                    $outputRow['status'] = 'rejected';
                    $outputRow['reason'] = "Email format not defined for status {$chosenFormatNum}";
                    $outputRow['__state'] = 'rejected';
                    $outputRow['__reason'] = $outputRow['reason'];
                    $metrics['rejected']++;
                    $outputRows[] = $outputRow;
                    yield $outputRow;
                    continue;
                }

                // Parse name
                $nameParts = explode(' ', $fullName);
                $firstName = $nameParts[0] ?? '';
                $lastName = count($nameParts) > 1 ? array_pop($nameParts) : '';
                $firstInitial = strtoupper(substr($firstName, 0, 1));
                $lastInitial = strtoupper(substr($lastName, 0, 1));

                $outputRow['li_first_name'] = $firstName;
                $outputRow['li_last_name'] = $lastName;
                $outputRow['li_firstname_initial'] = $firstInitial;
                $outputRow['li_lastname_initial'] = $lastInitial;

                if (empty($firstName) || empty($lastName)) {
                    $outputRow['status'] = 'skipped';
                    $outputRow['reason'] = 'Full name must have at least 2 words';
                    $outputRow['__state'] = 'skipped';
                    $outputRow['__reason'] = 'Full name must have at least 2 words';
                    $metrics['skipped']++;
                    $outputRows[] = $outputRow;
                    yield $outputRow;
                    continue;
                }

                // Generate email
                $sep = $separatorMap[$formatDef['separator'] ?? ''] ?? '';
                $f1 = match ($formatDef['field_1'] ?? '') {
                    'FirstName' => $firstName,
                    'LastName' => $lastName,
                    'FirstInitial' => $firstInitial,
                    'LastInitial' => $lastInitial,
                    default => ''
                };

                $f2 = match ($formatDef['field_2'] ?? '') {
                    'FirstName' => $firstName,
                    'LastName' => $lastName,
                    'FirstInitial' => $firstInitial,
                    'LastInitial' => $lastInitial,
                    default => ''
                };

                if ($f1 === '' && $f2 === '') {
                    $outputRow['format_code'] = (string) $chosenFormatNum;
                    $outputRow['status'] = 'Bad';
                    $outputRow['reason'] = 'Empty name fields';
                    $outputRow['__state'] = 'rejected';
                    $outputRow['__reason'] = 'Empty name fields';
                    $metrics['rejected']++;
                    $outputRows[] = $outputRow;
                    yield $outputRow;
                    continue;
                }

                $email = strtolower(trim($f1 . $sep . $f2 . '@' . $domainNorm));
                $isValid = filter_var($email, FILTER_VALIDATE_EMAIL);

                $outputRow['generated_email'] = $email;
                $outputRow['format_code'] = (string) $chosenFormatNum;
                $outputRow['status'] = $isValid ? 'Good' : 'Bad';
                $outputRow['reason'] = $isValid ? 'Valid email generated using auto-discovered format' : 'Invalid email format';
                $outputRow['__state'] = $isValid ? 'processed' : 'rejected';
                $outputRow['__reason'] = $isValid ? 'completed' : 'Invalid email format';
                
                $isValid ? $metrics['affected']++ : $metrics['rejected']++;
                $outputRows[] = $outputRow;
                yield $outputRow;
            }
        };

        // Write output using generator
        ProcessFlowHelper::writeOutput($output, $headers, $rowGenerator);

    } catch (\Throwable $e) {
        Developer::error("❗ Error in AutoflowsMethod", ['error' => $e->getMessage()]);
        return ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'failed',
            $metrics,
            "Error in `$workflowName`: " . $e->getMessage()
        );
    }

    $traceEntry = ProcessFlowHelper::addTraceEntry(
        $workflowName,
        'completed',
        $metrics,
        "Processed `$workflowName` using auto-discovered email format"
    );

    Developer::info("✅ Completed AutoflowsMethod", [
        'workflow' => $workflowName,
        'trace_entry' => $traceEntry,
        'performance' => [
            'total_rows' => $metrics['total'],
            'unique_domains' => count($domainModesMap),
            'memory_peak' => memory_get_peak_usage(true) / 1048576 . ' MB'
        ]
    ]);

    return [
        ...$traceEntry,
        'rows' => $outputRows
    ];
}

    public function __call($method, $arguments)
    {
        $flows = $arguments[0] ?? [];
        $workflowName = key($flows);

        return ProcessFlowHelper::addTraceEntry(
            $workflowName,
            'failed',
            ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0],
            "No specific method `$method` defined for `$workflowName`"
        );
    }
}
