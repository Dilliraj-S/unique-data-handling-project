<?php
namespace App\Jobs\Adms;
use App\Facades\{Adms, Developer};
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\{Cache, Config};
use InvalidArgumentException;
use Exception;
use Carbon\Carbon;
/**
 * Job to process ADMS iClock data (cdata) for OPERLOG (USER, FP, FACE) and ATTLOG.
 * Synchronizes device users to the database and processes dependent records.
 * Optimized for high throughput (100,000 devices, 10M requests/hour) with Redis queue/cache.
 */
class AdmsCDataJob implements ShouldQueue
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
        // // Prevent duplicate processing using a cache lock
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
            if (empty($records)) {
                Developer::warning('No valid records parsed', [
                    'type' => $this->type,
                    'deviceId' => $this->deviceId,
                ]);
                return;
            }
            // Process all records at once
            $this->processRecords($records);
        } catch (Exception $e) {
            throw $e;
        } finally {
            // $lock->release();
        }
    }
    /**
     * Parse tab-separated data into structured records matching table columns.
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
        $parseKeyValueRecord = function (array $parts, string $pinKey) use (&$records): ?array {
            $record = [];
            $deviceUserId = '';
            foreach ($parts as $pair) {
                if (!str_contains($pair, '=')) {
                    continue;
                }
                [$key, $value] = explode('=', $pair, 2);
                $key = trim($key);
                $value = trim($value);
                if ($key === $pinKey) {
                    $deviceUserId = $value;
                    $record['device_user_id'] = $value;
                } else {
                    $record[$key] = $value;
                }
            }
            if (empty($deviceUserId)) {
                return null;
            }
            return $record;
        };
        // Process each line
        foreach ($lines as $line) {
            if (!str_contains($line, "\t")) {
                continue;
            }
            $parts = explode("\t", trim($line));
            if ($table === 'ATTLOG') {
                // Parse attendance log records
                if (count($parts) < 9) {
                    continue;
                }
                $records['ATND'][] = [
                    'device_id' => $this->deviceId,
                    'device_user_id' => $parts[0],
                    'timestamp' => Carbon::parse($parts[1] ?? now())->toDateTimeString(),
                    'method' => (int) ($parts[3] ?? 1),
                    'punch' => (int) ($parts[2] ?? 255),
                    'code_1' => $parts[4] ?? null,
                    'code_2' => $parts[7] ?? null,
                    'code_3' => $parts[8] ?? null,
                    'created_at' => now(),
                ];
            } elseif ($table === 'OPERLOG') {
                // Parse operational log records
                if (str_starts_with($line, 'USER PIN')) {
                    if ($user = $parseKeyValueRecord($parts, 'USER PIN')) {
                        $records['USER'][] = [
                            'device_user_id' => $user['device_user_id'],
                            'device_id' => $this->deviceId,
                            'name' => $user['Name'] ?? 'Unknown',
                            'privilege' => (int) ($user['Pri'] ?? 0),
                            'password' => $user['Passwd'] ?? null,
                            'card_number' => $user['Card'] ?? null,
                            'group_id' => (int) ($user['Grp'] ?? 1),
                            'time_zone' => $user['time_zone'] ?? '0000000100000000',
                            'expires' => (int) ($user['Expires'] ?? 0),
                            'start_datetime' => $user['StartDatetime'] ?? null,
                            'end_datetime' => $user['EndDatetime'] ?? null,
                            'valid_count' => (int) ($user['valid_count'] ?? 0),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                } elseif (str_starts_with($line, 'FP PIN')) {
                    if ($fp = $parseKeyValueRecord($parts, 'FP PIN')) {
                        $records['FP'][] = [
                            'device_user_id' => $fp['device_user_id'],
                            'device_id' => $this->deviceId,
                            'fid' => (int) ($fp['FID'] ?? 0),
                            'size' => (int) ($fp['SIZE'] ?? 0),
                            'valid' => (int) ($fp['Valid'] ?? 1),
                            'template' => $fp['TMP'] ?? '',
                            'created_at' => now(),
                        ];
                    }
                } elseif (str_starts_with($line, 'FACE PIN')) {
                    if ($face = $parseKeyValueRecord($parts, 'FACE PIN')) {
                        $records['FACE'][] = [
                            'device_user_id' => $face['device_user_id'],
                            'device_id' => $this->deviceId,
                            'fid' => (int) ($face['FID'] ?? 0),
                            'size' => (int) ($face['SIZE'] ?? 0),
                            'valid' => (int) ($face['Valid'] ?? 1),
                            'template' => $face['TMP'] ?? '',
                            'created_at' => now(),
                        ];
                    }
                }
            }
        }
        return $records;
    }
    /**
     * Process records by calling AdmsService methods.
     *
     * @param array $records Records to process (USER, FP, FACE, ATND).
     */
    protected function processRecords(array $records): void
    {
        $recordTypes = [
            'USER' => 'storeUser',
            'FP' => 'storeFingerprint',
            'FACE' => 'storeFace',
            'ATND' => 'storeAttendance',
        ];
        foreach ($recordTypes as $type => $method) {
            if (!empty($records[$type])) {
                Adms::$method($this->businessId, $this->deviceId, $records[$type]);
                gc_collect_cycles();
            }
        }
    }
}
