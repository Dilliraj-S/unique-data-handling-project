<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Facades\Data;
use App\Events\ProgressEvent;
use Exception;

class ExportService
{
    /**
     * Maximum number of rows per file.
     */
    const MAX_ROWS = 1000000;

    /**
     * Maximum file size in bytes (450MB).
     */
    const MAX_FILE_SIZE = 450 * 1024 * 1024; // 450MB in bytes

    protected $processId;
    protected $userId;
    protected $database;
    protected $table;

    /**
     * Process the export for the given table and parameters.
     *
     * @param string $table
     * @param array $params
     * @param string $processId
     * @param string $userId
     * @param string $export_limit
     * @return array
     * @throws Exception
     */
    public function process(string $table, array $params, string $processId, string $userId, string $export_limit): array
    {
        $this->processId = $processId;
        $this->userId = $userId;

        try {
            // Parse database and table names
            [$this->database, $this->table] = $this->parseTable($table);

            $filterResult = Data::filter($table, $params);

            if (!$filterResult['status']) {
                throw new Exception($filterResult['message']);
            }

            $exportColumns = $params['filters']['export']['columns'] ?? $params['columns'];
            if (empty($exportColumns)) {
                throw new Exception('No columns specified for export');
            }

            $query = clone $filterResult['recordsQuery'];
            $query->limit = null;
            $query->offset = null;

            $totalRecords = $filterResult['recordsFiltered'] ?? $query->count();
            // Apply export limit
            $exportLimit = (int)$export_limit;
            $recordsToExport = $exportLimit > 0 ? min($totalRecords, $exportLimit) : $totalRecords;

            // Broadcast initial progress with total_rows
            broadcast(new ProgressEvent(
                $this->userId,
                $this->processId,
                'export',
                0,
                'Export started...',
                ['total_rows' => $recordsToExport, 'chunk_count' => 0, 'files' => [], 'table' => $this->table]
            ));

            $timestamp = now()->format('Ymd_His');
            $filePrefix = "export_{$this->table}";

            $filePaths = $this->exportCsv($query, $exportColumns, $filePrefix, $recordsToExport);

            if (empty($filePaths)) {
                throw new Exception('No records found for export');
            }

            // Log completion and broadcast final 100% progress
            $this->logProcess('completed', [
                'total_rows' => $recordsToExport,
                'exported_rows' => $recordsToExport,
                'file_paths' => $filePaths
            ]);
            broadcast(new ProgressEvent(
                $this->userId,
                $this->processId,
                'export',
                100,
                'Export completed successfully',
                ['total_rows' => $recordsToExport, 'chunk_count' => count($filePaths), 'files' => $filePaths, 'table' => $this->table]
            ));

            return [
                'status' => true,
                'message' => 'Export completed successfully',
                'files' => $filePaths,
                'total_records' => $recordsToExport,
                'parts' => count($filePaths)
            ];
        } catch (Exception $e) {
            $this->logProcess('failed', [
                'total_rows' => 0,
                'exported_rows' => 0,
                'file_paths' => [],
                'error' => $e->getMessage()
            ]);
            broadcast(new ProgressEvent(
                $this->userId,
                $this->processId,
                'export',
                0,
                'Export failed: ' . $e->getMessage(),
                ['total_rows' => 0, 'chunk_count' => 0, 'files' => [], 'table' => $this->table]
            ));
            return [
                'status' => false,
                'message' => 'Export failed: ' . $e->getMessage(),
                'files' => [],
                'total_records' => 0,
                'parts' => 0
            ];
        }
    }

    /**
     * Export query results to CSV files with row and size limits, updating progress based on chunk count.
     *
     * @param mixed $query
     * @param array $columns
     * @param string $filePrefix
     * @param int $totalRecords
     * @return array
     * @throws Exception
     */
    protected function exportCsv($query, array $columns, string $filePrefix, int $totalRecords): array
    {
        $timestamp = now()->format('Ymd_His');
        $basePath = "exports/{$filePrefix}_{$timestamp}";

        // Ensure the export directory exists
        Storage::disk('local')->makeDirectory($basePath);

        // Estimate number of chunks based on MAX_ROWS
        $expectedChunks = max(1, ceil($totalRecords / self::MAX_ROWS));
        $progressPerChunk = $expectedChunks > 1 ? 99 / $expectedChunks : 99; // Reserve 100% for final completion

        $fileIndex = 1;
        $rowCount = 0;
        $fileSize = 0;
        $filePaths = [];
        $exportedRows = 0;
        $completedChunks = 0;
        $handle = null;
        $file = null;

        // Apply limit to the query
        $query->take($totalRecords);

        foreach ($query->cursor() as $row) {
            // Start new file if not opened or if limits exceeded
            if (!$handle || $rowCount >= self::MAX_ROWS || $fileSize >= self::MAX_FILE_SIZE) {
                if ($handle) {
                    // Write the previous file to storage
                    Storage::disk('local')->writeStream($file, $handle);
                    fclose($handle);
                    // Broadcast progress update with chunk_count and total_rows
                    $completedChunks++;
                    $progress = round($completedChunks * $progressPerChunk);
                    broadcast(new ProgressEvent(
                        $this->userId,
                        $this->processId,
                        'export',
                        $progress,
                        "Completed chunk {$completedChunks} of {$expectedChunks}",
                        ['total_rows' => $totalRecords, 'chunk_count' => $completedChunks, 'files' => $filePaths, 'table' => $this->table]
                    ));
                }

                // Define new file path
                $file = "{$basePath}/{$filePrefix}_part{$fileIndex}.csv";
                $filePaths[] = $file;

                $handle = tmpfile();
                if (!$handle) {
                    throw new Exception("Failed to create temporary file for writing: {$file}");
                }

                // Write CSV header with human-readable column names
                fputcsv($handle, array_map(fn($column) => ucfirst(str_replace('_', ' ', Str::after($column, '.'))), $columns));

                $rowCount = 0;
                $fileSize = 0;
                $fileIndex++;
            }

            // Extract only needed columns
            $flatRow = [];
            foreach ($columns as $col) {
                $flatRow[] = data_get($row, Str::after($col, '.')) ?? '';
            }

            fputcsv($handle, $flatRow);
            $rowCount++;
            $exportedRows++;

            // Update file size (approximate for tmpfile)
            $fileSize += strlen(implode(',', $flatRow)) + 2; // Approximate size (CSV row + newline)
        }

        if ($handle && $file) {
            // Write the final file to storage
            Storage::disk('local')->writeStream($file, $handle);
            fclose($handle);
            // Broadcast progress update for the final chunk
            $completedChunks++;
            $progress = round($completedChunks * $progressPerChunk);
            broadcast(new ProgressEvent(
                $this->userId,
                $this->processId,
                'export',
                $progress,
                "Completed chunk {$completedChunks} of {$expectedChunks}",
                ['total_rows' => $totalRecords, 'chunk_count' => $completedChunks, 'files' => $filePaths, 'table' => $this->table]
            ));
        }

        return $filePaths;
    }

    /**
     * Parse the table parameter to extract database and table names.
     *
     * @param string $table
     * @return array [database, table]
     */
    protected function parseTable(string $table): array
    {
        if (Str::contains($table, '.')) {
            [$database, $table] = explode('.', $table, 2);
            return [$database, $table];
        }
        return [config('database.connections.mysql.database'), $table];
    }

    /**
     * Log the process details to the process_logs table.
     *
     * @param string $status
     * @param array $progress
     */
    protected function logProcess(string $status, array $progress): void
    {
        DB::table('process_logs')->insert([
            'process_id' => $this->processId,
            'user_id' => $this->userId,
            'type' => "export",
            'file' => isset($progress['file_paths']) && !empty($progress['file_paths']) ? basename(end($progress['file_paths'])) : null,
            'database' => $this->database,
            'table' => $this->table,
            'progress' => json_encode($progress),
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }
}