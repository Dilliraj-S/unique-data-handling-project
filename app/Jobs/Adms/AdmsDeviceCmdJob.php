<?php

namespace App\Jobs\Adms;

use App\Facades\{Adms, Developer};
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\{Cache, Config, Log};
use InvalidArgumentException;
use Exception;

/**
 * Job to process ADMS iClock data (cdata) for OPERLOG (USER, FP, FACE) and ATTLOG.
 * Synchronizes device users to the database and processes dependent records.
 * Optimized for high throughput (100,000 devices, 10M requests/hour) with Redis queue/cache.
 */
class AdmsDeviceCmdJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 300;

    protected string $deviceId;
    protected string $businessId;
    protected string $type;
    protected string $data;
    protected array $meta;

    /**
     * Initialize job with device and business context.
     *
     * @param string $deviceId Device identifier.
     * @param string $businessId Business identifier.
     * @param string $type Data type (e.g., OPERLOG, ATTLOG).
     * @param string $data Raw tab-separated data.
     * @param array $meta Metadata including table type.
     */
    public function __construct(string $deviceId, string $businessId, string $type, string $data, array $meta)
    {
        $this->deviceId = $deviceId;
        $this->businessId = $businessId;
        $this->type = $type;
        $this->data = $data;
        $this->meta = $meta;
        $this->onQueue(Config::get('adms.queue.prefix', 'adms:') . $businessId);
    }

    /**
     * Execute the job to parse and store records.
     *
     * @throws InvalidArgumentException If data is empty.
     */
    public function handle(): void
    {
        // Validate input data
        if (empty(trim($this->data))) {
            throw new InvalidArgumentException('Empty data payload');
        }

        // Prevent duplicate processing using a cache lock
        // $dataHash = md5($this->data);
        // $lockKey = "adms:job:{$this->deviceId}:{$this->type}:{$dataHash}";
        // $lockTtl = Config::get('adms.cache.ttl.job_lock', 300);
        // $lock = Cache::lock($lockKey, $lockTtl);

        // if (!$lock->get()) {
        //     Developer::info('Duplicate job skipped', [
        //         'deviceId' => $this->deviceId,
        //         'businessId' => $this->businessId,
        //         'type' => $this->type,
        //         'dataHash' => $dataHash,
        //     ]);
        //     return;
        // }

        try {
            // Parse data into structured records
            $records = $this->parseData();
            if (empty($records['USER']) && empty($records['FP']) && empty($records['FACE']) && empty($records['ATND'])) {
                Developer::warning('No valid records parsed', [
                    'type' => $this->type,
                    'deviceId' => $this->deviceId,
                ]);
                return;
            }

            // Process records in batches
            $batchSize = Config::get('adms.batch_size', 500);
            $this->processRecords($records, $batchSize);

            Developer::info('Records processed successfully', [
                'deviceId' => $this->deviceId,
                'businessId' => $this->businessId,
                'type' => $this->type,
                'counts' => array_map('count', $records),
            ]);
        } catch (Exception $e) {
            Log::error('Failed to process ADMS job', [
                'deviceId' => $this->deviceId,
                'businessId' => $this->businessId,
                'type' => $this->type,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        } finally {
            // $lock->release();
        }
    }

    /**
     * Parse tab-separated data into structured records.
     *
     * @return array Structured records for USER, FP, FACE, and ATND.
     */
    protected function parseData(): array
    {
        // Initialize record structure
        $records = ['USER' => [], 'FP' => [], 'FACE' => [], 'ATND' => []];

        // Split input data into non-empty lines
        $lines = array_filter(explode("\n", trim($this->data)), 'strlen');
        if (empty($lines)) {
            return $records;
        }

        // Get table type from metadata
        $table = $this->meta['table'] ?? '';

        // Helper closure to parse key-value pairs
        $parseKeyValueRecord = function (array $parts, string $pinKey): ?array {
            $record = [];
            foreach ($parts as $pair) {
                if (!str_contains($pair, '=')) {
                    continue;
                }
                [$key, $value] = explode('=', $pair, 2);
                $key = trim($key);
                $value = trim($value);
                $record[$key === $pinKey ? 'Id' : $key] = $value;
            }
            return $record ?: null;
        };

        // Process each line
        foreach ($lines as $line) {
            if (!str_contains($line, "\t")) {
                Log::warning('Skipping malformed line', ['line' => $line]);
                continue;
            }

            $parts = explode("\t", trim($line));

            if ($table === 'ATTLOG') {
                // Parse attendance log records
                if (count($parts) < 9) {
                    Log::warning('Incomplete ATTLOG line', ['line' => $line]);
                    continue;
                }
                $records['ATND'][] = [
                    'Id' => $parts[0],
                    'Time' => $parts[1],
                    'Punch' => $parts[2],
                    'Method' => $parts[3],
                    'Code_1' => $parts[4],
                    'Code_2' => $parts[7],
                    'Code_3' => $parts[8],
                ];
            } elseif ($table === 'OPERLOG') {
                // Parse operational log records
                if (str_starts_with($line, 'USER PIN')) {
                    if ($user = $parseKeyValueRecord($parts, 'USER PIN')) {
                        $records['USER'][] = $user;
                    }
                } elseif (str_starts_with($line, 'FP PIN')) {
                    if ($fp = $parseKeyValueRecord($parts, 'FP PIN')) {
                        $records['FP'][] = $fp;
                    }
                } elseif (str_starts_with($line, 'FACE PIN')) {
                    if ($face = $parseKeyValueRecord($parts, 'FACE PIN')) {
                        $records['FACE'][] = $face;
                    }
                }
            }
        }

        return $records;
    }

    /**
     * Process records in batches to store them via Adms facade.
     *
     * @param array $records Records to process (USER, FP, FACE, ATND).
     * @param int $batchSize Number of records per batch.
     */
    protected function processRecords(array $records, int $batchSize): void
    {
        $recordTypes = [
            'USER' => 'storeUser',
            'FP' => 'storeFingerprint',
            'FACE' => 'storeFace',
            'ATND' => 'storeAttendance',
        ];

        foreach ($recordTypes as $type => $method) {
            if (empty($records[$type])) {
                continue;
            }

            foreach (collect($records[$type])->chunk($batchSize) as $batch) {
                Adms::$method($this->businessId, $this->deviceId, $batch->toArray());
                gc_collect_cycles();
            }
        }
    }
}