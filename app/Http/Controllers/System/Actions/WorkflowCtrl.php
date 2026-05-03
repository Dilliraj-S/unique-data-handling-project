<?php

namespace App\Http\Controllers\System\Actions;

use App\Facades\{Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log, DB};


/**
 * Controller for validating unique values in a specified table and column.
 */
class WorkflowCtrl extends Controller
{
    /**
     * Validates if a value is unique in the specified table and column.
     *
     * @param Request $request HTTP request with token and value.
     * @param array $params Route parameters with token and value.
     * @return JsonResponse Validation result or error message.
     */
    public function index(): JsonResponse
    {
        try {
            // Raw query from moon.workflows
            $rows = DB::select('SELECT * FROM moon.workflows');

            // Map results into a flat array for frontend compatibility
            $mappedWorkflows = array_map(function ($workflow) {
                return [
                    'id' => (int) $workflow->id,
                    'identifier' => $workflow->identifier ?? $workflow->name,
                    'name' => $workflow->name ?? 'Unnamed Workflow',
                    'type' => in_array($workflow->type, ['wf', 'wmf', 'mf']) ? $workflow->type : 'wf',
                    'required_headers' => json_decode($workflow->required_headers, true) ?? [],
                    'update_headers' => json_decode($workflow->update_headers, true) ?? [],
                    'mapping_headers' => json_decode($workflow->mapping_headers, true) ?? []
                ];
            }, $rows);
            return response()->json([
                'status' => true,
                'data' => array_values($mappedWorkflows),
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
    public static function getFlowsdata()
    {
        try {
            // Raw query from moon.workflows
            $rows = DB::select('SELECT id, identifier, name, type, required_headers, update_headers, mapping_headers FROM moon.workflows');

            $mappedWorkflows = array_map(function ($workflow) {
                return [
                    'id' => (int) $workflow->id,
                    'identifier' => $workflow->identifier ?? $workflow->name,
                    'name' => $workflow->name ?? 'Unnamed Workflow',
                    'type' => in_array($workflow->type, ['wf', 'wmf', 'mf']) ? $workflow->type : 'wf',
                    'required_headers' => json_decode($workflow->required_headers ?? '[]', true) ?? [],
                    'update_headers' => json_decode($workflow->update_headers ?? '[]', true) ?? [],
                    'mapping_headers' => json_decode($workflow->mapping_headers ?? '[]', true) ?? [],
                ];
            }, $rows);

            return response()->json([
                'status' => true,
                'data' => array_values($mappedWorkflows),
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
}
