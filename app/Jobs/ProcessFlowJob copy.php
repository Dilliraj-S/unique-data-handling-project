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

use App\Services\{WorkflowService, MasterflowService};

class ProcessFlowJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected array $flowData;

    public function __construct(array $flowData)
    {
        $this->flowData = $flowData;
    }

    public function handle(): void
    {
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
            : new MasterflowService();

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

        $allSuccessful = true;

        foreach ($workflowNames as $name) {
            $flow = $flowDefinitions[$name] ?? null;

            if (!$flow || !$flows[$name]) {
                Developer::info("❗ Skipping Workflow `$name`", [
                    'reason' => 'Flow definition or method not found'
                ]);
                $restructuredFlowData['tracing'][] = [
                    'workflow' => $name,
                    'status' => 'skipped',
                    'metrics' => ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0],
                    'details' => "Flow definition or method not found for `$name`"
                ];
                $allSuccessful = false;
                continue;
            }

            $method = $flows[$name];

            if (!method_exists($service, 'processFlow')) {
                Developer::info("❗ Skipping Workflow `$name`", [
                    'reason' => "Supervisor method `processFlow` not found in service"
                ]);
                $restructuredFlowData['tracing'][] = [
                    'workflow' => $name,
                    'status' => 'skipped',
                    'metrics' => ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0],
                    'details' => "Supervisor method `processFlow` not found"
                ];
                $allSuccessful = false;
                continue;
            }

            // Log before sending to service supervisor
            Developer::info("📤 Sending to Service Supervisor for Workflow `$name`", [
                'flows' => [$name => $method],
                'flow_data' => $restructuredFlowData
            ]);

            // Call the supervisor method with flows and flowData
            try {
                $traceEntry = call_user_func(
                    [$service, 'processFlow'],
                    [$name => $method],
                    $restructuredFlowData
                );
            } catch (\Throwable $e) {
                Developer::info("❗ Workflow `$name` Failed", [
                    'reason' => $e->getMessage()
                ]);
                $restructuredFlowData['tracing'][] = [
                    'workflow' => $name,
                    'status' => 'failed',
                    'metrics' => ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0],
                    'details' => "Error in `$name`: " . $e->getMessage()
                ];
                $allSuccessful = false;
                continue;
            }

            // Add trace entry to tracing
            $restructuredFlowData['tracing'][] = array_merge([
                'workflow' => $name,
                'status' => 'success',
                'metrics' => ['total' => 0, 'affected' => 0, 'rejected' => 0, 'skipped' => 0],
                'details' => "Processed `$name`"
            ], $traceEntry);

            // Log trace entry for the workflow
            Developer::info("📊 Stats for Workflow `$name`", [
                'trace_entry' => $restructuredFlowData['tracing'][count($restructuredFlowData['tracing']) - 1]
            ]);

            // Check if the workflow failed based on trace entry status
            if ($restructuredFlowData['tracing'][count($restructuredFlowData['tracing']) - 1]['status'] === 'failed') {
                $allSuccessful = false;
            }
        }

        // Log final restructured flow data
        Developer::info('🧾 Final Flow Data', [
            'flow_data' => $restructuredFlowData
        ]);

        // Final success logs only if all workflows succeeded
        if ($allSuccessful) {
            Developer::info('✅ Job Completed Successfully', [
                'message' => 'All workflows processed successfully.'
            ]);
            Developer::info('📌 Reminder', [
                'message' => 'Please check logs/output files for processed results.'
            ]);
        } else {
            Developer::info('❗ Job Completed with Errors', [
                'message' => 'Some workflows failed or were skipped. Check tracing for details.'
            ]);
        }
    }

    private function getMethodName(string $identifier): string
    {
        // Dynamically convert snake_case to PascalCase and append "Method"
        return str_replace(' ', '', ucwords(str_replace('_', ' ', $identifier))) . 'Method';
    }
}
