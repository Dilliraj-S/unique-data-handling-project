<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Log;
use  App\Facades\{Developer};
use App\Http\Helpers\ResponseHelper,
    App\Http\Helpers\ProcessFlowHelper;
use Illuminate\Support\Arr;

use App\Services\{WorkflowService, MasterFlowService};

class ProcessFlowJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries;
    public $timeout;
    public $memory;
    public $failOnTimeout = true; // Ensure job fails properly on timeout

    protected array $flowData;

    public function __construct(array $flowData)
    {
        $this->flowData = $flowData;
        
        // Load timeout settings from config
        $this->timeout = (int) config('large_file_processing.queue_settings.timeout', 3600);
        $this->memory = (int) config('large_file_processing.queue_settings.memory', 4096);
        $this->tries = (int) config('large_file_processing.queue_settings.tries', 3);
    }

    public function handle(): void
    {
        // Hard-raise PHP execution limits for this job
        try {
            @set_time_limit(0);
            @ini_set('max_execution_time', '0');
            @ini_set('max_input_time', '0');
            @ini_set('memory_limit', config('large_file_processing.memory_limit', '-1'));
        } catch (\Throwable $e) {
            // ignore ini errors
        }

        // Apply queue-specific settings if configured
        $queueTimeout = (int) config('large_file_processing.queue_settings.timeout', $this->timeout);
        if ($queueTimeout > $this->timeout) {
            $this->timeout = $queueTimeout;
        }
        $queueMem = (int) config('large_file_processing.queue_settings.memory', $this->memory);
        if ($queueMem > $this->memory) {
            $this->memory = $queueMem;
        }

        // Tune DB session for long-running bulk operations
        try {
            \Illuminate\Support\Facades\DB::disableQueryLog();
            \Illuminate\Support\Facades\DB::statement('SET SESSION wait_timeout = 28800');
            \Illuminate\Support\Facades\DB::statement('SET SESSION interactive_timeout = 28800');
            \Illuminate\Support\Facades\DB::statement('SET SESSION net_read_timeout = 600');
            \Illuminate\Support\Facades\DB::statement('SET SESSION net_write_timeout = 600');
            // Increase packet size to handle large bulk updates/inserts
            \Illuminate\Support\Facades\DB::statement('SET SESSION max_allowed_packet = 1073741824');
        } catch (\Throwable $e) {
            // If DB driver does not support these, continue gracefully
        }

        // Log when job receives flow data
        Developer::info('📥 Job Received', [
            'flow_data' => $this->flowData
        ]);

        try {
            $this->runFlow($this->flowData);
        } catch (\Throwable $e) {
            Log::error('❌ Flow Job Failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'flow_data' => $this->flowData,
            ]);
            Developer::info('❗ Job Failed', [
                'error' => $e->getMessage(),
                'details' => 'See error logs for stack trace.'
            ]);
        }
    }


    private function runFlow(array $flowData): void
    {
        $processType = $flowData['process_mode'] ?? 'workflow';

        // Select service based on process_mode
        $service = $processType === 'workflow'
            ? new WorkflowService()
            : new MasterFlowService();

        // Log before sending to service
        Developer::info('🚀 Preparing to Send to Service', [
            'process_mode' => $processType,
            'service' => get_class($service)
        ]);

        // Extract workflow names dynamically
        $workflowNames = [];
        if (isset($flowData['meta']['workflow_map']) && is_array($flowData['meta']['workflow_map'])) {
            $workflowNames = array_map(fn($workflow) => $workflow['workflow_name'] ?? '', $flowData['meta']['workflow_map']);
            $workflowNames = array_filter($workflowNames); // Remove empty names
        } elseif (isset($flowData['flows']) && is_array($flowData['flows'])) {
            $workflowNames = $flowData['flows'];
        }

        if (empty($workflowNames)) {
            Developer::info('❗ No Workflows Found', [
                'message' => 'No valid workflows in flow data. Exiting.'
            ]);
            return;
        }

        // Get flow definitions
        $flowDefinitions = ProcessFlowHelper::getFlowsData($workflowNames);

        // Restructure flow data without tracing
        $restructuredFlowData = [
            'input' => $flowData['input'] ?? [],
            'output' => $flowData['output'] ?? [],
            'metadata' => $flowData['meta'] ?? [],
            'tracing' => [] // Initialize tracing to collect returned trace entries
        ];

        // Log restructured flow data
        Developer::info('🛠️ Restructured Flow Data', [
            'flow_data' => $restructuredFlowData
        ]);

        // Construct method names
        $flows = [];
        foreach ($workflowNames as $name) {
            $flow = $flowDefinitions[$name] ?? null;
            if ($flow) {
                $identifier = $flow['identifier'] ?? str_replace(' ', '_', strtolower($name));
                $flows[$name] = $this->getMethodName($identifier);
            } else {
                $flows[$name] = null;
            }
        }

        // Log constructed method names
        Developer::info('🔧 Constructed Flows (Method Names)', [
            'flows' => $flows
        ]);

        // Call processFlow ONCE with all workflows, so all update the same cloned table
        $service->processFlow($flows, $restructuredFlowData);

        // Log final restructured flow data
        Developer::info('🧾 Final Flow Data', [
            'flow_data' => $restructuredFlowData
        ]);

        Developer::info('✅ Job Completed Successfully', [
            'message' => 'All workflows processed successfully.'
        ]);
        Developer::info('📌 Reminder', [
            'message' => 'Please check logs/output files for processed results.'
        ]);
    }

    private function getMethodName(string $identifier): string
    {
        // Sanitize identifier, remove hidden whitespace/non-alphanumeric chars, then convert to PascalCase and append "Method"
        $identifier = preg_replace('/[^A-Za-z0-9_]/', '', trim($identifier));
        return str_replace(' ', '', ucwords(str_replace('_', ' ', $identifier))) . 'Method';
    }
}

// class ProcessFlowJob implements ShouldQueue
// {
//     use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

//     public $tries = 3; // Allow 3 attempts
//     public $timeout = 1800; // 30 minutes for large datasets
//     protected array $flowData;

//     public function __construct(array $flowData)
//     {
//         $this->flowData = $flowData;
//     }

//     public function handle(): void
//     {
//         $startTime = microtime(true);
//         Log::debug('Starting ProcessFlowJob', [
//             'process_id' => $this->flowData['meta']['process_id'] ?? 'N/A',
//             'memory_usage_mb' => round(memory_get_usage() / 1024 / 1024, 2)
//         ]);

//         try {
//             $this->runFlow($this->flowData);
//             Log::info('Completed ProcessFlowJob', [
//                 'process_id' => $this->flowData['meta']['process_id'] ?? 'N/A',
//                 'duration_seconds' => round(microtime(true) - $startTime, 2),
//                 'memory_usage_mb' => round(memory_get_usage() / 1024 / 1024, 2)
//             ]);
//         } catch (\Throwable $e) {
//             Log::error('❌ ProcessFlowJob Failed: ' . $e->getMessage(), [
//                 'process_id' => $this->flowData['meta']['process_id'] ?? 'N/A',
//                 'trace' => array_slice($e->getTrace(), 0, 5),
//                 'file' => $e->getFile(),
//                 'line' => $e->getLine()
//             ]);
//             throw $e; // Rethrow to trigger retries
//         }
//     }

//     private function runFlow(array $flowData): void
//     {
//         $processType = $flowData['process_mode'] ?? 'workflow';
//         $processId = $flowData['meta']['process_id'] ?? 'unknown';

//         // Select service based on process_mode
//         $service = $processType === 'workflow'
//             ? new WorkflowService()
//             : new MasterFlowService();

//         Log::debug('Preparing to Send to Service', [
//             'process_id' => $processId,
//             'process_mode' => $processType,
//             'service' => get_class($service)
//         ]);

//         // Extract workflow names dynamically
//         $workflowNames = [];
//         if (isset($flowData['meta']['workflow_map']) && is_array($flowData['meta']['workflow_map'])) {
//             $workflowNames = array_map(fn($workflow) => $workflow['workflow_name'] ?? '', $flowData['meta']['workflow_map']);
//             $workflowNames = array_filter($workflowNames);
//         } elseif (isset($flowData['flows']) && is_array($flowData['flows'])) {
//             $workflowNames = $flowData['flows'];
//         }

//         if (empty($workflowNames)) {
//             Log::warning('No Workflows Found', [
//                 'process_id' => $processId,
//                 'message' => 'No valid workflows in flow data. Exiting.'
//             ]);
//             return;
//         }

//         // Get flow definitions
//         $flowDefinitions = ProcessFlowHelper::getFlowsData($workflowNames);

//         // Restructure flow data without tracing
//         $restructuredFlowData = [
//             'input' => $flowData['input'] ?? [],
//             'output' => $flowData['output'] ?? [],
//             'metadata' => $flowData['meta'] ?? [],
//             'tracing' => []
//         ];

//         Log::debug('Restructured Flow Data', [
//             'process_id' => $processId,
//             'flow_data' => Arr::except($restructuredFlowData, ['tracing'])
//         ]);

//         // Construct method names
//         $flows = [];
//         foreach ($workflowNames as $name) {
//             $flow = $flowDefinitions[$name] ?? null;
//             if ($flow) {
//                 $identifier = $flow['identifier'] ?? str_replace(' ', '_', strtolower($name));
//                 $flows[$name] = $this->getMethodName($identifier);
//             } else {
//                 $flows[$name] = null;
//             }
//         }

//         Log::debug('Constructed Flows (Method Names)', [
//             'process_id' => $processId,
//             'flows' => $flows
//         ]);

//         // Call processFlow
//         $service->processFlow($flows, $restructuredFlowData);

//         Log::info('Completed processFlow', [
//             'process_id' => $processId,
//             'flow_data' => Arr::except($restructuredFlowData, ['tracing']),
//             'duration_seconds' => round(microtime(true), 2)
//         ]);
//     }

//     private function getMethodName(string $identifier): string
//     {
//         return str_replace(' ', '', ucwords(str_replace('_', ' ', $identifier))) . 'Method';
//     }
// }
