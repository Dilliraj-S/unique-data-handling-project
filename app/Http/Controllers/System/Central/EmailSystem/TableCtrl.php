<?php

namespace App\Http\Controllers\System\Central\EmailSystem;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{TableHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;

/**
 * Controller for handling AJAX table data requests in the EmailSystem module.
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
            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (empty($token)) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token and validate configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['table'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid or lacks required configuration.', 400);
            }
            // Set view to table and parse filters
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
            ];
            // Validate filters format
            if (!is_array($reqSet['filters'])) {
                return ResponseHelper::moduleError('Invalid Filters', 'The filters format is invalid.', 400);
            }
            // Initialize configuration arrays
            $columns = $conditions = $joins = $custom = [];
            $title = 'Data Retrieved';
            $message = 'EmailSystem data retrieved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch ($reqSet['key']) {
                case 'EmailSystem_entities':
                    $columns = Data::getTableColumns($reqSet['table'], ['created_id', 'updated_at', 'deleted_at']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'status', 'view' => '::((status = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive</span>)::', 'renderHtml' => true],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'EmailSystem entity data retrieved successfully.';
                    break;

                case 'central_emails_audience':
                    $columns = Data::getTableColumns($reqSet['table'], ['created_id', 'updated_at', 'deleted_at']);
                    $custom = [
                        [
                            ['type' => 'modify', 'column' => 'status', 'view' => '::((status = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive</span>)::', 'renderHtml' => true],
                        ],
                        [
                            'type'       => 'addon',
                            'column'     => 'Need Action',
                            'view' => '<a href="/email-system/audience-details#::id::" class="btn btn-sm btn-info">Edit</a>',
                            'renderHtml' => true,
                        ],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'EmailSystem entity data retrieved successfully.';
                    break;
                case 'central_emails_templates':
                    $columns = Data::getTableColumns($reqSet['table'], ['created_id', 'updated_at', 'deleted_at']);
                    $custom = [

                        ['type' => 'modify', 'column' => 'status', 'view' => '::((status = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive</span>)::', 'renderHtml' => true],
                    ];

                    $title = 'Entities Retrieved';
                    $message = 'EmailSystem entity data retrieved successfully.';
                    break;

                case 'central_email_config':
                    $columns = Data::getTableColumns($reqSet['table'], ['user_id', 'temp_id', 'last_history_id', 'password', 'refresh_token', 'incoming_host', 'incoming_port', 'incoming_encryption', 'outgoing_host', 'outgoing_port', 'outgoing_encryption', 'access_token', 'refresh_token', 'created_id', 'created_at', 'created_by', 'updated_by', 'updated_at', 'deleted_at']);
                    break;
                case 'central_emails_campaigns':
                    $columns = Data::getTableColumns($reqSet['table'], ['created_id', 'updated_at', 'deleted_at']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'status', 'view' => '::((status = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive</span>)::', 'renderHtml' => true],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'EmailSystem entity data retrieved successfully.';
                    break;
                case 'central_audience_details':
                    $columns = Data::getTableColumns($reqSet['table'], ['created_id', 'updated_at', 'deleted_at']);
                    $parts = explode('_', $token);
                    $lastPart = end($parts);
                    developer::info($lastPart);
                    $conditions = [
                        ['column' => 'audience_id', 'operator' => '=', 'value' => $lastPart]
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'EmailSystem entity data retrieved successfully.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Generate parameters and fetch data using DataService
            $params = TableHelper::generateParams($columns, $joins, $conditions, $reqSet);
            $result = Data::filter($reqSet['table'], $params);
            if (!$result['status']) {
                return ResponseHelper::moduleError('Data Fetch Failed', $result['message'], 500);
            }
            // Generate and return response using TableHelper
            return response()->json(array_merge(
                TableHelper::generateResponse($result, $columns, $custom, $reqSet),
                ['title' => $title, 'message' => $message]
            ));
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Failed to retrieve table data.', 500);
        }
    }
}
