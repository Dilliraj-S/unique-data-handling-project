<?php
namespace App\Http\Classes;
use Illuminate\Support\Facades\DB;
use Exception;
use League\Csv\Reader;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Support\Facades\Cache;
class IEHelper
{
    public static function importData($request, $filename, $prefix, $headerColumns)
    {
        try {
            $tableData = Helper::tableFinder($prefix);
            if (!$tableData) {
                throw new Exception("Table configuration not found for the provided prefix: $prefix");
            }
            $table = $tableData[0];
            $uniqueColumn = $tableData[1];
            $orgId = UserHelper::getCurrentUser('org_id');
            if (!$orgId) {
                throw new Exception("Organization ID not found for the current user.");
            }
            $fileExtension = $request->file('file')->getClientOriginalExtension();
            $fileData = self::getFileRecords($filename, $fileExtension);
            $fileHeaders = $fileData['headers'];
            $records = $fileData['records'];
            $headerValidationResult = self::matchHeaders($fileHeaders, $headerColumns);
            if (!$headerValidationResult['success']) {
                return [
                    'success' => false,
                    'message' => 'The headers in the uploaded file do not match the expected headers.',
                    'expected_headers' => $headerColumns,
                    'file_headers' => $fileHeaders,
                ];
            }
            $imported = 0;
            $skipped = 0;
            $duplicates = [];
            $hasOrgIdColumn = Schema::hasColumn($table, 'org_id');
            $hasTimestamps = Schema::hasColumn($table, 'created_at') && Schema::hasColumn($table, 'updated_at');
            $totalRecords = count($records);
            foreach ($records as $index => $record) {
                if (!is_array($record) || empty($record)) {
                    Log::warning("Skipping invalid or empty record:", $record);
                    continue;
                }
                $insertRecord = [];
                foreach ($headerColumns as $column) {
                    if (isset($record[$column])) {
                        $insertRecord[$column] = trim($record[$column]);
                    }
                }
                if ($hasOrgIdColumn) {
                    $insertRecord['org_id'] = $orgId;
                }
                if ($hasTimestamps) {
                    $insertRecord['created_at'] = now();
                    $insertRecord['updated_at'] = now();
                }
                $query = DB::table($table);
                foreach ($headerColumns as $column) {
                    if (isset($record[$column])) {
                        $query->where($column, trim($record[$column]));
                    } else {
                        $query->whereNull($column);
                    }
                }
                if ($hasOrgIdColumn) {
                    $query->where('org_id', $orgId);
                }
                $existingRecord = $query->first();
                if ($existingRecord) {
                    $duplicates[] = $record;
                    $skipped++;
                    continue;
                }
                $insertRecord[$uniqueColumn] = RandomHelper::uniqueId($prefix, 10);
                if (empty($insertRecord)) {
                    $skipped++;
                    continue;
                }
                DB::table($table)->insert($insertRecord);
                $imported++;
            }
            $duplicateFilePath = null;
            if (!empty($duplicates)) {
                $filePath = storage_path('duplicates.csv');
                $handle = fopen($filePath, 'w');
                fputcsv($handle, array_keys($duplicates[0]));
                foreach ($duplicates as $duplicate) {
                    fputcsv($handle, $duplicate);
                }
                fclose($handle);
                if (file_exists($filePath)) {
                    $duplicateFilePath = url('storage/duplicates.csv');
                }
            }
            return [
                'success' => true,
                'imported' => $imported,
                'skipped' => $skipped,
                'duplicates_skipped' => count($duplicates),
                'duplicates_file' => $duplicateFilePath,
                'total_records' => $totalRecords,
            ];
        } catch (Exception $e) {
            Log::error("Error during import: " . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }
    private static function matchHeaders($fileHeaders, $headerColumns)
    {
        $fileHeaders = array_map('trim', array_map('strtolower', $fileHeaders));
        $expectedHeaders = array_map('trim', array_map('strtolower', $headerColumns));
        sort($fileHeaders);
        sort($expectedHeaders);
        Log::info("CSV Headers (sorted):", $fileHeaders);
        Log::info("Expected Headers (sorted):", $expectedHeaders);
        if ($fileHeaders !== $expectedHeaders) {
            return [
                'success' => false,
                'message' => 'The headers in the uploaded file do not match the expected headers.',
                'expected_headers' => $expectedHeaders,
                'file_headers' => $fileHeaders,
            ];
        }
        return [
            'success' => true,
        ];
    }
    private static function getFileRecords($filename, $fileExtension)
    {
        $headers = [];
        $records = [];
        if ($fileExtension === 'csv') {
            $csv = Reader::createFromPath($filename, 'r');
            $csv->setHeaderOffset(0);
            $headers = $csv->getHeader();
            $records = iterator_to_array($csv->getRecords());
        } elseif (in_array($fileExtension, ['xlsx', 'xls'])) {
            $spreadsheet = IOFactory::load($filename);
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = [];
            foreach ($worksheet->getRowIterator() as $rowIndex => $row) {
                $cells = [];
                $cellIterator = $row->getCellIterator();
                $cellIterator->setIterateOnlyExistingCells(false);
                foreach ($cellIterator as $cell) {
                    $cells[] = $cell->getValue();
                }
                if ($rowIndex === 1) {
                    $headers = $cells;
                    continue;
                }
                if (!empty($headers)) {
                    $rows[] = array_combine($headers, $cells);
                }
            }
            $records = $rows;
        } else {
            throw new Exception("Unsupported file format: $fileExtension");
        }
        if (empty($records)) {
            throw new Exception("The file does not contain any valid records.");
        }
        return ['headers' => $headers, 'records' => $records];
    }
}
