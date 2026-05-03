<?php

namespace App\Http\Controllers\System\Central\QueryChain;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{TableHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;

/**
 * Controller for handling AJAX table data requests in the QueryChain module.
 */
class TableCtrl extends Controller
{
    /**
     * Handles AJAX requests for table data processing.
     *
     * @param Request $request HTTP request object containing filters and view settings
     * @param array $params Route parameters (module, section, item, token)
     * @return JsonResponse Processed table data or error response
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (empty($token)) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['table'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid or lacks required configuration.', 400);
            }
            $reqSet['view'] = 'table';
            $reqSet['draw'] = (int) $request->input('draw', 1);
            $filters = $request->input('skeleton_filters', []);
            $reqSet['filters'] = [
                'search' => $filters['search'] ?? [],
                'dateRange' => $filters['dateRange'] ?? [],
                'filterType' => $filters['filterType'] ?? [],
                'columns' => $filters['columns'] ?? [],
                'sort' => $filters['sort'] ?? [],
                'pagination' => $filters['pagination'] ?? ['page' => 1, 'limit' => 10],
                'visible_columns' => $filters['visible_columns'] ?? [],
                'export' => $filters['export'] ?? [],

            ];
            if (!is_array($reqSet['filters'])) {
                return ResponseHelper::moduleError('Invalid Filters', 'The filters format is invalid.', 400);
            }
            $columns = $conditions = $joins = $custom = [];
            $title = 'Data Retrieved';
            $message = 'QueryChain data retrieved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'central_unique_database':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at', 'image', 'updated_by', 'created_by']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'status', 'view' => '::((status = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive!</span>)::', 'renderHtml' => true],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'QueryChain entity data retrieved successfully.';
                    break;
                case 'central_unique_workflows':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at', 'flow_id', 'updated_at', 'identifier']);
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'required_headers',
                            'view' => '::((required_headers != []) ~ <span class="badge text-dark me-1">::required_headers::</span> || <span class="text-muted">No values to display</span>)::',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'modify',
                            'column' => 'update_headers',
                            'view' => '::((update_headers != []) ~ <span class="badge text-dark me-1">::update_headers::</span> || <span class="text-muted">No values to display</span>)::',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'modify',
                            'column' => 'mapping_headers',
                            'view' => '::(mapping_headers != []) ~ <span class="badge text-dark me-1">::mapping_headers::</span> || <span class="text-muted">No values to display</span>)::',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'modify',
                            'column' => 'type',
                            'view' => '::((type = wf) ~ <span class="text-primary fw-semibold text-uppercase">Workflow</span> || <span class="text-primary fw-semibold text-uppercase">Master Flow</span>)::',
                            'renderHtml' => true,
                        ],
                        ['type' => 'modify', 'column' => 'mandatory', 'view' => '::((mandatory = 1) ~ <span class="badge bg-success">Yes</span> || <span class="badge bg-danger">Nah!</span>)::', 'renderHtml' => true],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'Workflows data retrieved successfully.';
                    break;
                case 'central_unique_processes':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at', 'process_id', 'updated_at', 'mode']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'type', 'input_source' => '<span class="text-primary fw-semibold text-uppercase">::input_source::</span>', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'type', 'output_target' => '<span class="text-info fw-semibold text-uppercase">::output_target::</span>', 'renderHtml' => true],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'Processes data retrieved successfully.';
                    break;
case 'unique_process_logs':
    $columns = Data::getTableColumns($reqSet['table'], [
        'deleted_at',
        'updated_at',
        'trace_details'
    ]);

    $custom = [
        [
            'type' => 'modify',
            'column' => 'process_id',
            'view' => '<span class="badge bg-primary fw-bold">::process_id::</span>',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'process_name',
            'view' => '::<span class="fw-semibold text-dark">::process_name::</span>::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'process_mode',
            'view' => '::((process_mode = workflow) ~ <span class="badge bg-primary text-uppercase">Workflow</span> || <span class="badge bg-info text-uppercase">Master Flow</span>)::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'mode',
            'view' => '::<span class="badge bg-secondary text-uppercase">::mode::</span>::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'status',
            'view' => '::((status = pending) ~ <span class="badge bg-warning text-dark">Pending</span> || 
                        (status = started) ~ <span class="badge bg-primary">Started</span> || 
                        (status = completed) ~ <span class="badge bg-success">Completed</span> || 
                        <span class="badge bg-danger">Failed</span>)::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'input_location',
            'view' => '::((input_location != null && input_location != "") ~ <span class="text-info"><i class="mdi mdi-file-import me-1"></i>::input_location::</span> || <span class="text-muted">No input</span>)::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'output_location',
            'view' => '::((output_location != null && output_location != "") ~ <span class="text-success"><i class="mdi mdi-file-export me-1"></i>::output_location::</span> || <span class="text-muted">No output</span>)::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'total',
            'view' => '::<span class="badge bg-dark me-1">Total: ::total::</span>::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'processed',
            'view' => '::<span class="badge bg-success me-1">Processed: ::processed::</span>::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'rejected',
            'view' => '::<span class="badge bg-danger me-1">Rejected: ::rejected::</span>::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'skipped',
            'view' => '::<span class="badge bg-secondary me-1">Skipped: ::skipped::</span>::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'created_by',
            'view' => '::((created_by != null && created_by != "") ~ <span class="badge bg-light text-dark">::created_by::</span> || <span class="text-muted">System</span>)::',
            'renderHtml' => true,
        ],
        [
            'type' => 'modify',
            'column' => 'created_at',
            'view' => '::<span class="text-muted small"><i class="mdi mdi-clock-outline me-1"></i>::created_at::</span>::',
            'renderHtml' => true,
        ],
    ];

    $title = 'Process Logs Retrieved';
    $message = 'Process logs data retrieved successfully.';
    break;


                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            $params = TableHelper::generateParams($columns, $joins, $conditions, $reqSet);
            $result = Data::filter($reqSet['table'], $params);
            if (!$result['status']) {
                return ResponseHelper::moduleError('Data Fetch Failed', $result['message'], 500);
            }
            return response()->json(array_merge(
                TableHelper::generateResponse($result, $columns, $custom, $reqSet),
                ['title' => $title, 'message' => $message]
            ));
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Failed to retrieve table data.', 500);
        }
    }
}
