<?php

namespace App\Jobs\Import;

use App\Services\ImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Facades\Developer;
use Throwable;

class ImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 1;
    public $timeout = 600;

    protected int $userId;
    protected string $fullTable;
    protected string $type;
    protected string $csvFilePath;
    protected array $mapping;
    protected string $processId;

    // Optional fields to use in failed()
    protected ?int $totalRows = null;
    protected ?int $insertedRows = null;
    protected ?string $rejectedFilePath = null;

    public function __construct(int $userId, string $fullTable, string $type, string $csvFilePath, array $mapping, string $processId)
    {
        $this->userId = $userId;
        $this->fullTable = $fullTable;
        $this->type = $type;
        $this->csvFilePath = $csvFilePath;
        $this->mapping = $mapping;
        $this->processId = $processId;
    }

    public function handle(): void
    {
        $importService = new ImportService(
            $this->fullTable,
            $this->csvFilePath,
            $this->mapping,
            $this->type,
            $this->processId,
            $this->userId
        );

        // Optional: collect some result data for use in failed()
        $result = $importService->processImport();
        $this->totalRows = $result['total'] ?? null;
        $this->insertedRows = $result['inserted'] ?? null;
        $this->rejectedFilePath = $result['rejected_file_path'] ?? null;

        // Cache total row count
        try {
            [$database, $table] = explode('.', $this->fullTable);
            $qualifiedTable = "`$database`.`$table`";
            $totalKey = "{$table}_total_count";

            $count = DB::table(DB::raw($qualifiedTable))->count();
            Cache::put($totalKey, $count, 600);
        } catch (Throwable $e) {
            Developer::error("Failed to cache row count for {$this->fullTable}: " . $e->getMessage());
        }
    }

    public function failed(Throwable $exception): void
    {
        Developer::error("Import failed for process ID {$this->processId}: {$exception->getMessage()}");

        [$database, $table] = explode('.', $this->fullTable);

        // Save failure log to process_logs
        DB::table('process_logs')->insert([
            'process_id' => $this->processId,
            'user_id'    => $this->userId,
            'file'       => $this->csvFilePath,
            'database'   => $database,
            'table'      => $table,
            'progress'   => json_encode([
                'total'               => $this->totalRows ?? 0,
                'inserted_count'      => $this->insertedRows ?? 0,
                'rejected_count'      => 0,
                'rejected_file_path'  => $this->rejectedFilePath ?? null,
            ]),
            'status' => 'failed',
            'created_at' => now(),
        ]);

        // Broadcast progress failure
        broadcast(new \App\Events\ProgressEvent(
            userId: $this->userId,
            processId: $this->processId,
            type: $this->type,
            percent: 100,
            message: 'Import failed for table ' . $table,
            details: [
                'status' => 'error',
                'total' => $this->totalRows ?? 0,
                'inserted' => $this->insertedRows ?? 0,
                'rejected' => 0,
                'error' => $exception->getMessage(),
                'rejected_file_path' => $this->rejectedFilePath ?? null,
            ]
        ));
    }
}
