<?php

namespace App\Jobs\Filter;

use App\Facades\Data;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Throwable;

class FilterDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $table;
    public array $params;

    public function __construct(string $table, array $params)
    {
        $this->table = $table;
        $this->params = $params;
    }

    public function handle()
    {
        $filters = $this->params['filters'] ?? [];
        $qualifiedTable = str_contains($this->table, '.') ? $this->table : DB::getTablePrefix() . $this->table;
        $filterHash = md5(json_encode($filters));
        $totalCacheKey = "{$this->table}_total_count";
        $filteredCacheKey = "{$this->table}_filtered_count_{$filterHash}";

        // Get filtered count
        $filteredQuery = DB::table($qualifiedTable);
        Data::applyJoins($filteredQuery, $this->params['joins'] ?? [], $qualifiedTable);
        Data::applyAllFilters($filteredQuery, $filters, $qualifiedTable, ['id']);

        $filteredCount = $filteredQuery->count();
        $totalCount = DB::table($qualifiedTable)->count('id');

        Cache::put($filteredCacheKey, $filteredCount, 600);
        Cache::put($totalCacheKey, $totalCount, 600);
        Cache::forget("{$this->table}_job_running_{$filterHash}");
    }
}
