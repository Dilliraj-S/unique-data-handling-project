<?php

namespace App\Jobs;

use App\Services\EncryptorService;
use App\Facades\{Database, Developer};
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Exception;
use RuntimeException;

/**
 * Job to re-encrypt a single table's data in the background.
 */
class ReencryptTableJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3; // Maximum retry attempts
    public $timeout = 3600; // 1 hour timeout
    public $backoff = [3600, 7200, 14400]; // Retry delays (1h, 2h, 4h)

    protected string $bizId;
    protected string $table;
    protected string $oldVersion;
    protected string $newVersion;

    /**
     * Create a new job instance.
     *
     * @param string $bizId Business ID
     * @param string $table Table name
     * @param string $oldVersion Previous key version
     * @param string $newVersion New key version
     */
    public function __construct(string $bizId, string $table, string $oldVersion, string $newVersion)
    {
        $this->bizId = $bizId;
        $this->table = $table;
        $this->oldVersion = $oldVersion;
        $this->newVersion = $newVersion;
        $this->onQueue('encryption');
    }

    /**
     * Execute the re-encryption job.
     *
     * @param EncryptorService $encryptor
     * @return void
     * @throws Exception
     */
    public function handle(EncryptorService $encryptor): void
    {
        try {
            $encryptor->reencrypt($this->bizId, $this->table, $this->oldVersion, $this->newVersion);
            Developer::info('Table re-encrypted via job', [
                'biz_id' => $this->bizId,
                'table' => $this->table,
                'new_version' => $this->newVersion,
            ]);
        } catch (RuntimeException $e) {
            $this->logFailure($e);
            if ($this->attempts() < $this->tries) {
                $delay = $this->backoff[$this->attempts() - 1] ?? 3600;
                $this->release($delay);
            } else {
                $this->markProgressAsFailed();
                throw $e;
            }
        } catch (Exception $e) {
            $this->logFailure($e);
            $this->markProgressAsFailed();
            throw $e;
        }
    }

    /**
     * Log the failure of the re-encryption job.
     *
     * @param Exception $e
     * @return void
     */
    protected function logFailure(Exception $e): void
    {
        Developer::error('Re-encryption job failed', [
            'biz_id' => $this->bizId,
            'table' => $this->table,
            'old_version' => $this->oldVersion,
            'new_version' => $this->newVersion,
            'attempt' => $this->attempts(),
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
    }

    /**
     * Mark the encryption progress as failed.
     *
     * @return void
     */
    protected function markProgressAsFailed(): void
    {
        try {
            $connection = Database::getConnection('central');
            $connection
                ->table('encryption_progress')
                ->where(['business_id' => $this->bizId, 'status' => 'pending'])
                ->update([
                    'status' => 'failed',
                    'updated_at' => now(),
                    'error_message' => 'Re-encryption failed for table: ' . $this->table,
                ]);
        } catch (Exception $e) {
            Developer::error('Failed to mark encryption progress as failed', [
                'biz_id' => $this->bizId,
                'table' => $this->table,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}