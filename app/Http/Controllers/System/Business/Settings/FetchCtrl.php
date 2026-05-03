<?php

namespace App\Http\Controllers\System\Business\Management;

use App\Facades\{Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\TableHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};

/**
 * Controller for handling data requests for table, grid, and list views.
 */
class FetchCtrl extends Controller
{
    /**
     * Handles AJAX request for data processing based on view type.
     *
     * @param Request $request HTTP request object.
     * @param array $params Route parameters (module, section, item, token).
     * @return JsonResponse Data response or error message.
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (empty($token)) {
                return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
            }

            // Resolve token and validate configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['table'])) {
                if (Config::get('skeleton.developer_mode')) {
                    Log::warning('FetchCtrl: Invalid token', ['token' => $token, 'reqSet' => $reqSet]);
                }
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid or lacks required configuration.']);
            }

            // Log user activity and request details
            Developer::info(Skeleton::getAuthenticatedUser()->user_id);
            if (Config::get('skeleton.developer_mode')) {
                Log::debug('FetchCtrl: Request details', [
                    'token' => $token,
                    'key' => $reqSet['key'],
                    'table' => $reqSet['table'],
                    'view' => $request->input('view_type', 'table'),
                    'filters' => $request->input('skeleton_filters', [])
                ]);
            }

            // Validate view type and filters
            $reqSet['view'] = $request->input('view_type', 'table');
            $reqSet['draw'] = (int)$request->input('draw', 1);
            $reqSet['filters'] = $request->input('skeleton_filters', []) ?: [];
            if (!in_array($reqSet['view'], ['table', 'grid', 'list'])) {
                if (Config::get('skeleton.developer_mode')) {
                    Log::warning('FetchCtrl: Invalid view type', ['view_type' => $reqSet['view'], 'token' => $token]);
                }
                return response()->json(['status' => false, 'title' => 'Invalid View Type', 'message' => 'The specified view type is not supported.']);
            }
            if (!is_array($reqSet['filters'])) {
                if (Config::get('skeleton.developer_mode')) {
                    Log::warning('FetchCtrl: Invalid filters format', ['filters' => $reqSet['filters'], 'token' => $token]);
                }
                return response()->json(['status' => false, 'title' => 'Invalid Filters', 'message' => 'The filters format is invalid.']);
            }

            // Configure columns and customizations based on key
            $columns = [];
            $custom = [];
            switch ($reqSet['key']) {
                case 'central_skeleton_tokens':
                    $columns = [
                        'id' => 'skeleton_tokens.id',
                        'key' => 'skeleton_tokens.key',
                        'table' => 'skeleton_tokens.table',
                        'value' => 'skeleton_tokens.value',
                        'created_at' => 'skeleton_tokens.created_at',
                        'updated_at' => 'skeleton_tokens.updated_at'
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'key',
                            'view' => '<span class="badge bg-info">::key::</span>',
                            'renderHtml' => true
                        ]
                    ];
                    break;
                case 'supreme_modules':
                    $columns = [
                        'id' => 'skeleton_modules.id',
                        'module_id' => 'skeleton_modules.module_id',
                        'module' => 'skeleton_modules.module',
                        'icon' => 'skeleton_modules.icon',
                        'role' => 'skeleton_modules.role',
                        'created_at' => 'skeleton_modules.created_at',
                        'updated_at' => 'skeleton_modules.updated_at'
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'module',
                            'view' => '<span class="badge bg-info">::module::</span>',
                            'renderHtml' => true
                        ]
                    ];
                    break;
                case 'supreme_sections':
                    $columns = [
                        'id' => 'skeleton_sections.id',
                        'section_id' => 'skeleton_sections.section_id',
                        'section' => 'skeleton_sections.section',
                        'icon' => 'skeleton_sections.icon'
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'section',
                            'view' => '<span class="badge bg-info">::section::</span>',
                            'renderHtml' => true
                        ]
                    ];
                    break;
                case 'supreme_items':
                    $columns = [
                        'id' => 'skeleton_items.id',
                        'item_id' => 'skeleton_items.item_id',
                        'section_id' => 'skeleton_items.section_id',
                        'item' => 'skeleton_items.item',
                        'icon' => 'skeleton_items.icon',
                        'created_at' => 'skeleton_items.created_at',
                        'updated_at' => 'skeleton_items.updated_at'
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'item',
                            'view' => '<span class="badge bg-info">::item::</span>',
                            'renderHtml' => true
                        ]
                    ];
                    break;
                case 'sa_categories_custom':
                    $columns = [
                        'id' => 'categories.id',
                        'name' => 'categories.name',
                        'description' => 'categories.description',
                        'created_at' => 'categories.created_at',
                        'updated_at' => 'categories.updated_at'
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'name',
                            'view' => '<span class="badge bg-info">::name::</span>',
                            'renderHtml' => true
                        ]
                    ];
                    break;
                default:
                    if (Config::get('skeleton.developer_mode')) {
                        Log::warning('FetchCtrl: Unknown configuration key', ['key' => $reqSet['key'], 'token' => $token]);
                    }
                    return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
            }

            // Fetch data using Data facade
            $params = [
                'columns' => array_values($columns),
                'filters' => $reqSet['filters'],
                'draw' => $reqSet['draw']
            ];
            $result = Data::filter('central', $reqSet['table'], $params);

            // Check if data retrieval was successful
            if (!$result['status']) {
                if (Config::get('skeleton.developer_mode')) {
                    Log::warning('FetchCtrl: Data fetch failed', ['table' => $reqSet['table'], 'message' => $result['message']]);
                }
                return response()->json([
                    'status' => false,
                    'title' => 'Data Fetch Failed',
                    'message' => $result['message']
                ]);
            }

            // Process data with TableHelper
            $tableHelper = app(TableHelper::class);
            $processedData = [];
            $columnsMetadata = [];
            if ($reqSet['view'] === 'table') {
                $processedData = $tableHelper->processData($result['data'], $columns, $custom, $reqSet);
                $columnsMetadata = $tableHelper->generateColumnMeta($columns, $reqSet, $custom);
            } elseif ($reqSet['view'] === 'grid') {
                $processedData = $tableHelper->processGridData($result['data'], $columns, $custom, $reqSet);
                $columnsMetadata = $tableHelper->generateGridMeta($columns, $reqSet, $custom);
            } elseif ($reqSet['view'] === 'list') {
                $processedData = $tableHelper->processListData($result['data'], $columns, $custom, $reqSet);
                $columnsMetadata = $tableHelper->generateListMeta($columns, $reqSet, $custom);
            }
            return response()->json(DataHelper::generateResponse($result, $columns, $custom, $reqSet));
        } catch (Exception $e) {
            if (Config::get('skeleton.developer_mode')) {
                Log::error('FetchCtrl: Error', [
                    'error' => $e->getMessage(),
                    'token' => $token ?? 'none',
                    'key' => $reqSet['key'] ?? 'none',
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]);
            }
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Failed to retrieve data.']);
        }
    }
}
