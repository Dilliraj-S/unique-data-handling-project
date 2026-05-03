<?php
namespace App\Http\Controllers\System\Central\Developer;

use App\Facades\{Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{TableHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;

/**
 * Controller for handling AJAX table data requests in the central system.
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
                Developer::warning('TableCtrl: No token provided', [
                    'params' => $params,
                    'request' => $request->except(['password', 'token'])
                ]);
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }

            
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['table'])) {
                Developer::warning('TableCtrl: Invalid token configuration', [
                    'token' => $token,
                    'reqSet' => $reqSet
                ]);
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid or lacks required configuration.', 400);
            }

            
            $reqSet['view'] = 'table';
            $reqSet['draw'] = (int) $request->input('draw', 1);
            $filters = $request->input('skeleton_filters', []);
            $reqSet['filters'] = [
                'search' => $filters['search'] ?? [],
                'dateRange' => $filters['dateRange'] ?? [],
                'filterType'=>$filters['filterType'] ?? [],
                'columns' => $filters['columns'] ?? [],
                'sort' => $filters['sort'] ?? [],
                'pagination' => $filters['pagination'] ?? ['page' => 1, 'limit' => 10],
                'visible_columns'=>$filters['visible_columns']?? [],
                'export' => $filters['export'] ?? [],
            ];

            
            if (!is_array($reqSet['filters'])) {
                Developer::warning('TableCtrl: Invalid filters format', [
                    'filters' => $reqSet['filters'],
                    'token' => $token
                ]);
                return ResponseHelper::moduleError('Invalid Filters', 'The filters format is invalid.', 400);
            }

            
            $columns = $conditions = $joins = $custom = [];

            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            
            switch ($reqSet['key']) {
                
                case 'central_skeleton_tokens':
                    
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at'],['actions'=>'action']);
                    $title = 'Tokens Retrieved';
                    $message = 'Token configuration data retrieved successfully.';
                    break;

                
                case 'central_skeleton_modules':
                    
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'approval', 'view' => '::((approval = 1) ~ <span class="badge bg-success">Approved</span> || <span class="badge bg-danger">Rejected</span>)::', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'navigable', 'view' => '::((navigable = 1) ~ <span class="badge bg-success">Yes</span> || <span class="badge bg-danger">No</span>)::', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'system', 'view' => '::((system = \'central\') ~ <span class="badge bg-info">Central</span> || <span class="badge bg-secondary">Business</span>)::', 'renderHtml' => true]
                    ];
                    $title = 'Modules Retrieved';
                    $message = 'Module configuration data retrieved successfully.';
                    break;

                
                case 'central_skeleton_sections':
                    
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $columns['module_id']=['skeleton_modules.name AS module', true];
                    $joins = [
                        ['type' => 'left', 'table' => 'skeleton_modules', 'on' => ['skeleton_sections.module_id', 'skeleton_modules.module_id']]
                    ];
                    $custom = [
                        ['type' => 'modify', 'column' => 'approval', 'view' => '::((approval = 1) ~ <span class="badge bg-success">Approved</span> || <span class="badge bg-danger">Rejected</span>)::', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'navigable', 'view' => '::((navigable = 1) ~ <span class="badge bg-success">Yes</span> || <span class="badge bg-danger">No</span>)::', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'system', 'view' => '::((system = \'central\') ~ <span class="badge bg-info">Central</span> || <span class="badge bg-secondary">Business</span>)::', 'renderHtml' => true]
                    ];
                    $title = 'Sections Retrieved';
                    $message = 'Section configuration data retrieved successfully.';
                    break;

                
                case 'central_skeleton_items':
                    
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $joins = [
                        ['type' => 'left', 'table' => 'skeleton_sections', 'on' => ['skeleton_items.section_id', 'skeleton_sections.section_id']],
                        ['type' => 'left', 'table' => 'skeleton_modules', 'on' => ['skeleton_sections.module_id', 'skeleton_modules.module_id']],
                    ];
                    $custom = [
                        ['type' => 'modify', 'column' => 'approval', 'view' => '::((approval = 1) ~ <span class="badge bg-success">Approved</span> || <span class="badge bg-danger">Rejected</span>)::', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'navigable', 'view' => '::((navigable = 1) ~ <span class="badge bg-success">Yes</span> || <span class="badge bg-danger">No</span>)::', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'system', 'view' => '::((system = \'central\') ~ <span class="badge bg-info">Central</span> || <span class="badge bg-secondary">Business</span>)::', 'renderHtml' => true]
                    ];
                    $title = 'Items Retrieved';
                    $message = 'Item configuration data retrieved successfully.';
                    break;

                
                case 'central_skeleton_permissions':
                    
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'name', 'view' => '<span class="badge bg-primary">::name::</span>', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'approval', 'view' => '::((approval = 1) ~ <span class="badge bg-success">Approved</span> || <span class="badge bg-danger">Rejected</span>)::', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'is_skeleton', 'view' => '::((is_skeleton = 1) ~ <span class="badge bg-success">Yes</span> || <span class="badge bg-danger">No</span>)::', 'renderHtml' => true]
                    ];
                    $title = 'Permissions Retrieved';
                    $message = 'Permission configuration data retrieved successfully.';
                    break;

                
                case 'central_skeleton_custom_permissions':
                    
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'name', 'view' => '<span class="badge bg-primary">::name::</span>', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'approval', 'view' => '::((approval = 1) ~ <span class="badge bg-success">Approved</span> || <span class="badge bg-danger">Rejected</span>)::', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'is_skeleton', 'view' => '::((is_skeleton = 1) ~ <span class="badge bg-success">Yes</span> || <span class="badge bg-danger">No</span>)::', 'renderHtml' => true]
                    ];
                    $conditions = [
                        ['column' => 'permissions.is_skeleton', 'operator' => '=', 'value' => 0],
                    ];
                    $title = 'Custom Permissions Retrieved';
                    $message = 'Custom permission configuration data retrieved successfully.';
                    break;

                
                case 'central_skeleton_role_permissions':
                    
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'name', 'view' => '<span class="badge bg-info">::name::</span>', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'status', 'view' => '::((status = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">In-Active</span>)::', 'renderHtml' => true],
                        ['type' => 'modify', 'column' => 'is_system_role', 'view' => '::((is_system_role = 1) ~ <span class="badge bg-success">Yes</span> || <span class="badge bg-danger">No</span>)::', 'renderHtml' => true]
                    ];
                    $title = 'Role Permissions Retrieved';
                    $message = 'Role permission configuration data retrieved successfully.';
                    break;

                
                case 'central_skeleton_user_permissions':
                    
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $joins = [
                        ['type' => 'left', 'table' => 'user_roles', 'on' => ['users.user_id', 'user_roles.user_id']],
                        ['type' => 'left', 'table' => 'roles', 'on' => ['user_roles.role_id', 'roles.role_id']],
                    ];
                    $title = 'User Permissions Retrieved';
                    $message = 'User permission configuration data retrieved successfully.';
                    break;

                
                case 'central_skeleton_folders':
                    
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'name', 'view' => '<span class="badge bg-info">::key::</span>', 'renderHtml' => true]
                    ];
                    $title = 'Folders Retrieved';
                    $message = 'Folder configuration data retrieved successfully.';
                    break;

                
                case 'central_file_extensions':
                    
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'extension', 'view' => '<span class="badge bg-info">::extension::</span>', 'renderHtml' => true]
                    ];
                    $title = 'File Extensions Retrieved';
                    $message = 'File extension configuration data retrieved successfully.';
                    break;
                    
                    case 'central_skeleton_templates':
                        
                        $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                        $custom = [
                            ['type' => 'modify', 'column' => 'type', 'view' => '<span class="badge bg-info">::type::</span>', 'renderHtml' => true],
                            ['type' => 'modify', 'column' => 'purpose', 'view' => '<span class="badge bg-secondary">::purpose::</span>', 'renderHtml' => true]
                        ];
                        $conditions = [
                            ['column' => 'skeleton_templates.type', 'operator' => '=', 'value' => $reqSet['id']],
                        ];
                        $title = 'Skeleton Templates Retrieved';
                        $message = 'Skeleton template configuration data retrieved successfully.';
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
                Developer::warning('TableCtrl: Data fetch failed', [
                    'message' => $result['message'],
                    'token' => $token,
                    'params' => $params
                ]);
                return ResponseHelper::moduleError('Data Fetch Failed', $result['message'], 500);
            }

            
            return response()->json(array_merge(
                TableHelper::generateResponse($result, $columns, $custom, $reqSet),
                ['title' => $title, 'message' => $message]
            ));
        } catch (Exception $e) {
            Developer::error('TableCtrl: Exception occurred', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'token' => $token ?? 'unknown',
                'request' => $request->except(['password', 'token'])
            ]);
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Failed to retrieve table data.', 500);
        }
    }
}