<?php

namespace App\Jobs\Export;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\DB;
use App\Events\ProgressEvent;
use App\Facades\{Developer, Export};

class ExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $table;
    protected array $params;
    protected string $processId;
    protected string $userId;
    protected string $export_limit;

    public function __construct(string $table, array $params, string $processId, string $userId, string $export_limit)
    {
        $this->table = $table;
        $this->params = $params;
        $this->processId = $processId;
        $this->userId = $userId;
        $this->export_limit = $export_limit;
    }

    public function handle()
    {
        try {
            Export::process($this->table, $this->params, $this->processId, $this->userId, $this->export_limit);
        } catch (\Exception $e) {
            Developer::error("ExportJob failed for table {$this->table}: " . $e->getMessage());
            throw $e; // This will trigger the failed() method
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $progress = [
            'status' => 'failed',
            'error' => $exception->getMessage(),
        ];

        // Update process_logs table
        DB::table('process_logs')->insert([
            'process_id' => $this->processId,
            'user_id' => $this->userId,
            'type' => 'export',
            'file' => null,
            'database' => config('database.connections.mysql.database'), // or set your database name
            'table' => $this->table,
            'progress' => json_encode($progress),
            'status' => 'failed',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Broadcast progress event with failure info
        broadcast(new ProgressEvent(
            $this->userId,
            $this->processId,
            'export',
            0,
            "Export failed: {$exception->getMessage()}",
            [
                'total_rows' => 0,
                'chunk_count' => 0,
                'files' => [],
                'table' => $this->table,
                'cancelled' => true,
            ]
        ));
    }
}
