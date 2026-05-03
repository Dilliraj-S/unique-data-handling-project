<?php

namespace App\Jobs\Counts;

use App\Events\CountEvent;
use App\Facades\Developer;
use Illuminate\Bus\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

class CountJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected array $filtered;
    protected array $total;
    protected string $table;
    protected string $processId;
    protected int $userId;

    public function __construct(array $data)
    {
        $this->filtered = $data['filtered'];
        $this->total = $data['total'];
        $this->table = $data['table'];
        $this->processId = is_array($data['process_id']) ? ($data['process_id'][0] ?? '') : $data['process_id'];
        $this->userId = $data['user_id'];
    }

    public function handle(): void
    {
        try {
            // Count distinct li_company_id for filtered query
            $filteredCompanyCount = DB::selectOne(
                "SELECT COUNT(DISTINCT li_company_id) as count FROM ({$this->filtered['sql']}) as sub",
                $this->filtered['bindings']
            )?->count ?? 0;

            // Count distinct li_company_id for total query
            $totalCompanyCount = DB::selectOne(
                "SELECT COUNT(DISTINCT li_company_id) as count FROM ({$this->total['sql']}) as sub",
                $this->total['bindings']
            )?->count ?? 0;

            Developer::info('Total Companies', [$totalCompanyCount]);
            Developer::info('Filtered Companies', [$filteredCompanyCount]);

            broadcast(new CountEvent(
                $this->userId,
                $this->processId,
                'company_counts',
                [
                    'filtered_company_count' => $filteredCompanyCount,
                    'total_company_count' => $totalCompanyCount,
                ]
            ));
        } catch (\Throwable $e) {
            Developer::error("CountCompaniesJob failed for {$this->table}: {$e->getMessage()}", [
                'processId' => $this->processId,
                'userId' => $this->userId,
            ]);
        }
    }
}
