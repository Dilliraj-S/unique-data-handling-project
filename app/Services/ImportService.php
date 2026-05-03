<?php

namespace App\Services;

use App\Facades\Developer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use League\Csv\Writer;
use App\Events\ProgressEvent;
use Illuminate\Support\Facades\Cache;

class ImportService
{
    protected string $table;
    protected string $csvPath;
    protected string $fullTable;
    protected array $mapping;
    protected string $type;
    protected string $processId;
    protected string $database;
    protected int $userId;
    protected array $rejectedRows = [];
    protected int $totalRows = 0;
    protected int $processedRows = 0;
    protected int $insertedRows = 0;
    protected string $rejectedFilePath = '';
    protected array $csvHeaders = [];
    protected array $tableColumns = [];

    public function __construct(string $fullTable, string $csvPath, array $mapping, string $type, string $processId, int $userId)
    {
        [$this->database, $this->table] = explode('.', $fullTable);
        $this->fullTable = $fullTable;
        $this->csvPath = $csvPath;
        $this->mapping = $mapping;
        $this->type = $type;
        $this->processId = $processId;
        $this->userId = $userId;
        $this->tableColumns = $this->getTableColumns();
    }

    public function processImport()
    {
        try {
            if (!file_exists($this->csvPath) || !is_readable($this->csvPath)) {
                throw new \Exception('CSV file not found or not readable.', 'ERR_FILE_NOT_FOUND');
            }
            DB::disableQueryLog();
            $this->broadcastProgress(0, 'Import started');
            $result = $this->type === 'bulk'
                ? $this->processBulkImport()
                : $this->processRowWiseImport();
            $this->logProcess($result['status'] ?? 'completed', $result);
            return $result;
        } catch (\Exception $e) {
            $this->broadcastProgress(
                max(0, ($this->processedRows / max($this->totalRows, 1)) * 100),
                "Import failed: {$e->getMessage()} [Code: {$e->getCode()}]",
                [
                    'status' => 'failed',
                    'total' => $this->totalRows,
                    'inserted' => $this->insertedRows,
                    'rejected' => count($this->rejectedRows),
                    'rejected_csv' => $this->rejectedFilePath
                ]
            );
            $this->logProcess('failed');
            throw $e;
        }
    }

    protected function processBulkImport()
    {
        $mapping = $this->getFilteredMapping();
        $this->totalRows = $this->countCsvRows(true);
        $this->broadcastProgress(0, 'Bulk import started');

        $csvHeaders = $this->getCsvHeaders();
        $tableColumns = $this->getTableColumns(); // Implement this to fetch DB column names.

        $varList = [];
        $setClauseParts = [];

        foreach ($csvHeaders as $csvCol) {
            if (!isset($mapping[$csvCol]) || $mapping[$csvCol] === null) {
                continue;
            }

            // Sanitize variable names: replace spaces and special chars with underscores
            $sanitizedVar = preg_replace('/[^a-zA-Z0-9_]/', '_', $csvCol);
            $dbCol = $mapping[$csvCol];

            $varList[] = "@{$sanitizedVar}";
            $setClauseParts[] = "`$dbCol` = @{$sanitizedVar}";
        }

        if (in_array('created_at', $tableColumns) && !in_array('created_at', $mapping)) {
            $setClauseParts[] = "`created_at` = NOW()";
        }

        if (empty($setClauseParts)) {
            throw new \Exception('No mapped columns found between CSV and DB.');
        }

        $escapedPath = addslashes($this->csvPath);
        $varListStr = implode(', ', $varList);
        $setClauseStr = implode(', ', $setClauseParts);

        $query = <<<SQL
        LOAD DATA LOCAL INFILE '{$escapedPath}'
        INTO TABLE {$this->fullTable} CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 LINES ($varListStr)
        SET $setClauseStr
        SQL;

        $beforeCount = $this->getTableRowCount();
        DB::unprepared($query);
        $afterCount = $this->getTableRowCount();

        $this->insertedRows = max(0, $afterCount - $beforeCount);
        $this->processedRows = $this->totalRows;

        $this->broadcastProgress(100, 'Bulk import completed', [
            'status' => 'completed',
            'total' => $this->totalRows,
            'inserted' => $this->insertedRows,
            'rejected' => $this->totalRows - $this->insertedRows,
        ]);

        return [
            'status' => 'completed',
            'total_rows' => $this->totalRows,
            'inserted_rows' => $this->insertedRows,
            'rejected_rows' => $this->totalRows - $this->insertedRows,
        ];
    }



    protected function processRowWiseImport()
    {
        $chunkSize = 500;
        $handle = fopen($this->csvPath, 'r');
        if (!$handle) {
            throw new \Exception('Failed to open CSV file.', 'ERR_FILE_OPEN');
        }

        // Handle UTF-8 BOM
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $this->csvHeaders = fgetcsv($handle, 0, ',', '"');
        if (!$this->csvHeaders) {
            fclose($handle);
            throw new \Exception('Invalid or empty CSV header.', 'ERR_INVALID_HEADER');
        }

        $mappedHeader = $this->prepareMappedHeaders($this->csvHeaders);
        $validIndexes = array_filter(array_keys($mappedHeader), fn($i) => $mappedHeader[$i] !== null);
        $this->totalRows = $this->countCsvRows(false);

        $batch = [];
        $rowNumber = 1;
        DB::disableQueryLog();

        while (($row = fgetcsv($handle, 0, ',', '"')) !== false) {
            $rowNumber++;
            $this->processedRows++;
            // ✅ Cancel check
            if ($this->wasImportCancelled()) {
                fclose($handle);

                if (!empty($batch)) {
                    $this->insertBatch($batch);
                }
                $this->saveRejectedRows();

                $this->broadcastProgress(0, 'Import cancelled by user', [
                    'status' => 'cancelled',
                    'total' => $this->totalRows - 1,
                    'inserted' => $this->insertedRows,
                    'rejected' => count($this->rejectedRows),
                    'rejected_csv' => basename($this->rejectedFilePath),
                    'cancelled' => true
                ]);
                return [
                    'status' => 'cancelled',
                    'message' => 'Row-wise import was cancelled',
                    'total_rows' => $this->totalRows,
                    'inserted_rows' => $this->insertedRows,
                    'rejected_rows' => count($this->rejectedRows),
                    'rejected_file_path' => $this->rejectedFilePath
                ];
            }

            // ✅ Column count check
            if (count($row) !== count($this->csvHeaders)) {
                $this->addRejectedRow(
                    $rowNumber,
                    '',
                    $this->buildRecordFromCsv($this->csvHeaders, $row),
                    'Column count mismatch',
                    'ERR_CSV_MISMATCH'
                );
                continue;
            }

            // ✅ Build record
            $record = [];
            foreach ($validIndexes as $i) {
                $value = $row[$i] ?? null;
                try {
                    $value = $value !== null
                        ? trim(preg_replace('/[\x00-\x1F\x7F]/u', '', iconv('UTF-8', 'UTF-8//IGNORE', $value)))
                        : null;
                } catch (\Exception $e) {
                    $this->addRejectedRow(
                        $rowNumber,
                        $mappedHeader[$i] ?? '',
                        $this->buildRecordFromCsv($this->csvHeaders, $row),
                        'Multibyte decode error: ' . $e->getMessage(),
                        'ERR_ICONV'
                    );
                    continue 2;
                }
                $record[$mappedHeader[$i]] = ($value === '') ? null : $value;
            }

            $batch[] = [
                'record' => $record,
                'rowId' => $rowNumber,
                'csvRecord' => $this->buildRecordFromCsv($this->csvHeaders, $row)
            ];

            if (count($batch) >= $chunkSize) {
                $this->insertBatch($batch);
                $batch = [];

                $this->broadcastProgress(
                    ($this->processedRows / max($this->totalRows, 1)) * 100,
                    "Processed {$this->processedRows} rows"
                );
            }
        }

        if (!empty($batch)) {
            $this->insertBatch($batch);
        }

        fclose($handle);
        DB::enableQueryLog();
        $this->saveRejectedRows();

        $this->broadcastProgress(100, 'Row-wise import completed', [
            'status' => 'completed',
            'total' => $this->totalRows - 1,
            'inserted' => $this->insertedRows,
            'rejected' => count($this->rejectedRows),
            'rejected_csv' => basename($this->rejectedFilePath)
        ]);

        return [
            'status' => 'completed',
            'message' => 'Row-wise import completed successfully',
            'total_rows' => $this->totalRows,
            'inserted_rows' => $this->insertedRows,
            'rejected_rows' => count($this->rejectedRows),
            'rejected_file_path' => $this->rejectedFilePath
        ];
    }

    protected function insertBatch(array $records)
    {
        if (empty($records)) {
            return;
        }

        $now = now();
        $batchSize = 500;
        $chunks = array_chunk($records, $batchSize);

        foreach ($chunks as $chunk) {
            $prepared = [];
            foreach ($chunk as $item) {
                $prepared[] = array_merge(
                    $item['record'],
                    ['created_at' => $now] // Always use $now
                );
            }

            try {
                DB::table($this->fullTable)->insert($prepared);
                $this->insertedRows += count($prepared);
            } catch (\Exception $e) {
                foreach ($chunk as $item) {
                    try {
                        DB::table($this->fullTable)->insert(
                            array_merge(
                                $item['record'],
                                ['created_at' => $now] // Always use $now
                            )
                        );
                        $this->insertedRows++;
                    } catch (\Exception $ex) {
                        $errorMessage = $ex->getMessage();
                        $errorCode = $ex->getCode() ?: 'ERR_DB_INSERT';
                        $column = $this->extractOffendingColumn($errorMessage, $item['record']);
                        $this->addRejectedRow(
                            $item['rowId'],
                            $column,
                            $item['csvRecord'],
                            $errorMessage,
                            $errorCode
                        );
                    }
                }
            }
        }
    }




    protected function saveRejectedRows()
    {
        if (empty($this->rejectedRows)) {
            return;
        }

        $this->rejectedFilePath = 'reject/rejected_rows_' . $this->processId . '_' . time() . '.csv';
        Storage::makeDirectory('reject');
        $writer = Writer::createFromPath(Storage::path($this->rejectedFilePath), 'w+');
        $headers = array_merge(['rowId'], $this->csvHeaders, ['column', 'reason', 'error_code']);
        $writer->insertOne($headers);
        foreach ($this->rejectedRows as $row) {
            $line = [$row['rowId']];
            foreach ($this->csvHeaders as $header) {
                $line[] = $row['record'][$header] ?? '';
            }
            $line[] = $row['column'];
            $line[] = $row['reason'];
            $line[] = $row['errorCode'];
            $writer->insertOne($line);
        }
    }

    protected function buildRecordFromCsv(array $header, array $row): array
{
    if (count($header) !== count($row)) {
        \Log::warning('CSV row/header length mismatch', [
            'expected_columns' => count($header),
            'actual_columns'   => count($row),
            'header'           => $header,
            'row'              => $row,
        ]);

        // Option 1: pad missing values with null
        if (count($row) < count($header)) {
            $row = array_pad($row, count($header), null);
        }

        // Option 2: trim extra values
        if (count($row) > count($header)) {
            $row = array_slice($row, 0, count($header));
        }
    }

    return array_combine($header, $row);
}

    protected function extractOffendingColumn(string $message, array $record): string
    {
        foreach (array_keys($record) as $column) {
            if (str_contains(strtolower($message), strtolower($column))) {
                return $column;
            }
        }
        return 'unknown';
    }

    protected function getFilteredMapping(): array
    {
        $csvHeaders = $this->getCsvHeaders();
        $tableColumns = $this->getTableColumns();

        return collect($this->mapping)
            ->filter(function ($dbCol, $csvCol) use ($csvHeaders, $tableColumns) {
                return $csvCol !== 'null'
                    && $dbCol !== null
                    && in_array($csvCol, $csvHeaders)
                    && in_array($dbCol, $tableColumns);
            })
            ->toArray();
    }


    protected function prepareMappedHeaders(array $csvHeader): array
    {
        $mapping = $this->getFilteredMapping();
        return array_map(fn($col) => $mapping[$col] ?? null, $csvHeader);
    }

    protected function countCsvRows(bool $storeHeaders = false): int
    {
        $handle = fopen($this->csvPath, 'r');
        if (!$handle) {
            return 0;
        }

        if (fread($handle, 3) !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $count = 0;
        if ($storeHeaders) {
            $this->csvHeaders = fgetcsv($handle, 0, ',', '"');
        }
        while (fgetcsv($handle, 0, ',', '"')) {
            $count++;
        }
        fclose($handle);
        return $count;
    }

    protected function getTableRowCount(): int
    {
        return (int)(DB::select("SELECT COUNT(*) as count FROM {$this->fullTable}")[0]->count ?? 0);
    }

    protected function getTableColumns(): array
    {
        return array_column(DB::select("SHOW COLUMNS FROM {$this->fullTable}"), 'Field');
    }

    protected function addRejectedRow(int $index, string $column, array $record, string $reason, string $code)
    {
        $this->rejectedRows[] = [
            'rowId' => $index,
            'record' => $record,
            'column' => $column,
            'reason' => $reason,
            'errorCode' => $code
        ];
    }

    protected function broadcastProgress(float $progress, string $message, array $data = [])
    {
        broadcast(new ProgressEvent(
            $this->userId,
            $this->processId,
            $this->type,
            $progress,
            $message,
            array_merge([
                'status' => $data['status'] ?? 'processing',
                'total' => $this->totalRows,
                'inserted' => $this->insertedRows,
                'rejected' => count($this->rejectedRows),
                'rejected_csv' => basename($this->rejectedFilePath),
                'file' => basename($this->csvPath),
            ], $data)
        ));
    }

    protected function logProcess(string $status, array $result = [])
    {
        DB::table('process_logs')->insert([
            'process_id' => $this->processId,
            'user_id' => $this->userId,
            'file' => basename($this->csvPath),
            'type' => "import",
            'database' => $this->database,
            'table' => $this->table,
            'progress' => json_encode([
                'total' => $this->totalRows,
                'inserted_count' => $this->insertedRows,
                'rejected_count' => count($this->rejectedRows),
                'rejected_file_path' => $this->rejectedFilePath,
            ]),
            'status' => $status,
            'created_at' => now()
        ]);
    }

    protected function getCsvHeaders(): array
    {
        if (!file_exists($this->csvPath)) {
            throw new \Exception("CSV file not found at: {$this->csvPath}");
        }

        $handle = fopen($this->csvPath, 'r');
        if (!$handle) {
            throw new \Exception("Unable to open CSV file at: {$this->csvPath}");
        }

        $headers = fgetcsv($handle, 0, ',', '"');
        fclose($handle);

        if (!$headers || !is_array($headers)) {
            throw new \Exception("Invalid or empty CSV header in file: {$this->csvPath}");
        }
        return array_map(fn($col) => trim($col), $headers);
    }

    protected function wasImportCancelled(): bool
    {
        return Cache::has("import_cancel_{$this->userId}_{$this->processId}");
    }
}
