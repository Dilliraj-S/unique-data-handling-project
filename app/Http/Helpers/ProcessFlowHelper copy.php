<?php

namespace App\Http\Helpers;

use App\Facades\{Data, Developer, Select, Skeleton};
use App\Services\DataService;
use Illuminate\Support\Facades\{Cache, Schema, DB};
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use InvalidArgumentException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use League\Csv\Reader;
use League\Csv\Writer;
use Illuminate\Support\Facades\File;
use PhpOffice\PhpSpreadsheet\Reader\Csv;
use App\Jobs\ProcessFlowJob;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;


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
            ],
        ];
    }


    /**
     * Read input data based on mode, optimized for large datasets.
     *
     * @param array $input Input configuration (type, file_name, path, headers, or table for DB)
     * @param callable $callback Callback to process each row or chunk
     * @throws \Exception
     */
    public static function readInput(array $input, callable $callback): void
    {
        $type = $input['type'] ?? 'csv';

        if ($type === 'csv') {
            if (!isset($input['path']) || !file_exists($input['path'])) {
                throw new \Exception('Invalid or missing CSV file path');
            }

            $csv = Reader::createFromPath($input['path'], 'r');
            $csv->setHeaderOffset(0);
            $headers = $input['headers'] ?? $csv->getHeader();
            $headers = array_filter($headers, fn($h) => !is_null($h) && $h !== ''); // Remove null/empty headers

            if (empty($headers)) {
                throw new \Exception('No valid headers found in CSV input');
            }

            foreach ($csv->getRecords() as $index => $record) {
                $row = [];
                foreach ($headers as $header) {
                    $row[$header] = $record[$header] ?? null;
                }
                $callback($row, $index);
            }
        } elseif ($type === 'db') {
            if (!isset($input['table'])) {
                throw new \Exception('Missing database table name');
            }

            $columns = Schema::getColumnListing($input['table']);
            $orderByColumn = in_array('id', $columns) ? 'id' : $columns[0];

            DB::table($input['table'])
                ->select($input['headers'] ?? ['*'])
                ->orderBy($orderByColumn)
                ->chunk(1000, function ($rows, $index) use ($callback) {
                    foreach ($rows as $rowIndex => $row) {
                        $callback((array) $row, $index * 1000 + $rowIndex);
                    }
                });
        } else {
            throw new \Exception("Unsupported input type: $type");
        }
    }

    /**
     * Write output data based on mode, optimized for large datasets.
     *
     * @param array $output Output configuration (type, path, or table for DB)
     * @param array $headers Combined headers (required, updated, tracing)
     * @param callable $rowGenerator Generator yielding rows
     * @throws \Exception
     */
    public static function writeOutput(array $output, array $headers, callable $rowGenerator): void
    {
        $type = $output['type'] ?? 'csv';

        if ($type === 'csv') {
            if (!isset($output['path'])) {
                throw new \Exception('Missing CSV output path');
            }

            $csv = Writer::createFromPath($output['path'], 'w+');
            $csv->insertOne($headers);

            foreach ($rowGenerator() as $row) {
                $record = [];
                foreach ($headers as $header) {
                    $record[] = $row[$header] ?? null;
                }
                $csv->insertOne($record);
            }
        } elseif ($type === 'excel') {
            if (!isset($output['path'])) {
                throw new \Exception('Missing Excel output path');
            }

            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->fromArray($headers, null, 'A1');

            $rowIndex = 2;
            foreach ($rowGenerator() as $row) {
                $record = [];
                foreach ($headers as $header) {
                    $record[] = $row[$header] ?? null;
                }
                $sheet->fromArray($record, null, "A{$rowIndex}");
                $rowIndex++;
                if ($rowIndex % 10000 === 0) {
                    $spreadsheet->garbageCollect();
                }
            }

            $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
            $writer->setPreCalculateFormulas(false);
            $writer->save($output['path']);
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        } elseif ($type === 'db') {
            if (!isset($output['table'])) {
                throw new \Exception('Missing database table name');
            }

            $chunk = [];
            foreach ($rowGenerator() as $row) {
                $record = [];
                foreach ($headers as $header) {
                    $record[$header] = $row[$header] ?? null;
                }
                $chunk[] = $record;

                if (count($chunk) >= 1000) {
                    DB::table($output['table'])->insert($chunk);
                    $chunk = [];
                }
            }

            if (!empty($chunk)) {
                DB::table($output['table'])->insert($chunk);
            }
        } else {
            throw new \Exception("Unsupported output type: $type");
        }
    }

    /**
     * Create a trace entry.
     *
     * @param string $workflowName Workflow name
     * @param string $status Status (completed, failed, skipped)
     * @param array $metrics Metrics (total, affected, rejected, skipped)
     * @param string $details Details message
     * @return array Trace entry
     */
    public static function addTraceEntry(string $workflowName, string $status, array $metrics, string $details): array
    {
        return [
            'workflow' => $workflowName,
            'status' => $status,
            'metrics' => $metrics,
            'details' => $details
        ];
    }

    /**
     * Insert or update a record in moon.process_logs.
     *
     * @param array $data Process data to insert/update
     * @throws \Exception
     */
    public static function updateLogs(array $data): void
    {
        if (empty($data['process_id'])) {
            throw new \Exception('Process ID cannot be null or empty');
        }

        $inputLocation = $data['input']['type'] === 'db'
            ? ($data['input']['database'] ?? 'moon') . '.' . $data['input']['table']
            : $data['input']['path'] ?? null;

        $outputLocation = $data['output']['type'] === 'db'
            ? ($data['output']['database'] ?? 'moon') . '.' . $data['output']['table']
            : $data['output']['path'] ?? null;

        $logData = [
            'process_id' => $data['process_id'],
            'process_name' => $data['process_name'] ?? 'Unknown',
            'process_mode' => $data['process_mode'] ?? 'workflow',
            'mode' => $data['mode'] ?? 'unknown',
            'status' => $data['status'] ?? 'pending',
            'input_location' => $inputLocation,
            'output_location' => $outputLocation,
            'total' => $data['total'] ?? 0,
            'affected' => $data['affected'] ?? 0,
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

        return $query->get()->map(function ($record) {
            $record->trace_details = json_decode($record->trace_details, true);
            return (array) $record;
        })->toArray();
    }
}
