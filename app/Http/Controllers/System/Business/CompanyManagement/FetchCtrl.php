<?php

namespace App\Http\Controllers\System\Business\CompanyManagement;

use App\Facades\{Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\DataHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config};

/**
 * Controller for handling data requests for table, grid, and list views.
 */
class FetchCtrl extends Controller
{
    /**
     * Handles AJAX requests for data processing based on view type.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters (module, section, item, token)
     * @return JsonResponse Data response or error message
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (empty($token)) {
                Developer::warning('FetchCtrl: No token provided', ['params' => $params, 'request' => $request->input()]);
                return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
            }
            // Resolve token and validate configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['table'])) {
                Developer::warning('FetchCtrl: Invalid token configuration', ['token' => $token, 'reqSet' => $reqSet]);
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid or lacks required configuration.']);
            }
            // Validate view type and filters
            $filters = $request->input('skeleton_filters', []);
            $reqSet['view'] = $request->input('skeleton_view', 'table');
            $reqSet['draw'] = (int) $request->input('draw', 1);
            $reqSet['filters'] = [
                'search'     => $filters['search'] ?? '',
                'dateRange'  => $filters['dateRange'] ?? [],
                'columns'    => $filters['columns'] ?? [],
                'sort'       => $filters['sort'] ?? [],
                'pagination' => $filters['pagination'] ?? ['page' => 1, 'limit' => 10],
            ];
            if (!in_array($reqSet['view'], ['table', 'grid', 'list'])) {
                Developer::warning('FetchCtrl: Invalid view type', ['view_type' => $reqSet['view'], 'token' => $token]);
                return response()->json(['status' => false, 'title' => 'Invalid View Type', 'message' => 'The specified view type is not supported.']);
            }
            if (!is_array($reqSet['filters'])) {
                Developer::warning('FetchCtrl: Invalid filters format', ['filters' => $reqSet['filters'], 'token' => $token]);
                return response()->json(['status' => false, 'title' => 'Invalid Filters', 'message' => 'The filters format is invalid.']);
            }
            // Configure columns, joins, and customizations
            $columns = $conditions = $joins = $custom = [];
            Developer::emergency('req set key', ['req key' => $reqSet['key']]);
           $companyId = Skeleton::getAuthenticatedUser()['employee']->company_id;
            Developer::alert('hello', ['req set' => $reqSet['key']]);

            switch ($reqSet['key']) {
                /****************************************************************************************************
                 *                                                                                                  *
                 *                             >>> MODIFY THIS SECTION (START) <<<                                  *
                 *                                                                                                  *
                 ****************************************************************************************************/
                case 'central_skeleton_tokens':
                    $columns = [
                        'id' => ['skeleton_tokens.id', true],
                        'key' => ['skeleton_tokens.key', true],
                        'module' => ['skeleton_tokens.module', true],
                        'system' => ['skeleton_tokens.system', true],
                        'type' => ['skeleton_tokens.type', true],
                        'column' => ['skeleton_tokens.column', true],
                        'value' => ['skeleton_tokens.value', false],
                        'act' => ['skeleton_tokens.act', false],
                        'actions' => ['skeleton_tokens.actions', false],
                        'created_at' => ['skeleton_tokens.created_at', true],
                        'updated_at' => ['skeleton_tokens.updated_at', true],
                    ];
                    break;
                case 'business_branches':
                    $columns = [
                        'id' => ['branches.id', true],
                        'sno' => ['branches.sno', true],
                        'name' => ['branches.name', true],
                        'founded_date' => ['branches.founded_date', true],
                        'phone' => ['branches.phone', true],
                        'email' => ['branches.email', true],
                        'no_of_employees' => ['branches.no_of_employees', true],
                        'tax_id' => ['branches.tax_id', true],
                        'address_json' => ['branches.address_json', true],
                        'status' => ['branches.status', true],
                        'created_at' => ['branches.created_at', true],
                        'updated_at' => ['branches.updated_at', true],
                    ];
                    $conditions = [
                        ['column' => 'branches.company_id', 'operator' => '=', 'value' => $companyId],
                    ];
                    break;
                case 'designations':
                    $columns = [
                        'id' => ['designations.id', true],
                        'designation_id' => ['designations.designation_id', true],
                        'department_id' => ['designations.department_id', true],
                        'designation' => ['designations.designation', true],
                        'status' => ['designations.status', true],
                        'created_by' => ['designations.created_by', true],
                        'updated_by' => ['designations.updated_by', true],
                    ];
                    break;

                case 'departments':
                    $columns = [
                        'department_id' => ['departments.department_id', true],
                        'department' => ['departments.department', true],
                    ];

                    break;

                case 'documents':
                    $columns = [
                        'id' => ['documents.id', true],
                        'document_id' => ['documents.document_id', true],
                        'document_name' => ['documents.document_name', true],
                        'category' => ['documents.category', true],
                        'file_type' => ['documents.file_type', true],
                        'status' => ['documents.status', true],
                    ];
                    break;

                case 'central_skeleton_modules':
                    $columns = [
                        'id' => ['skeleton_modules.id', true],
                        'module_id' => ['skeleton_modules.module_id', true],
                        'name' => ['skeleton_modules.name', true],
                        'system' => ['skeleton_modules.system', true],
                        'icon' => ['skeleton_modules.icon', true],
                        'order' => ['skeleton_modules.order', false],
                        'is_active' => ['skeleton_modules.is_active', true],
                        'created_at' => ['skeleton_modules.created_at', true],
                        'updated_at' => ['skeleton_modules.updated_at', true],
                    ];
                    $joins = [];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'is_active',
                            'view' => '::((is_active = 1 OR system = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive</span>)::',
                            'renderHtml' => true
                        ]
                    ];
                    break;
                case 'central_skeleton_sections':
                    $columns = [
                        'id' => ['skeleton_sections.id', true],
                        'section_id' => ['skeleton_sections.section_id', true],
                        'module_id' => ['skeleton_sections.module_id', false],
                        'module_name' => ['skeleton_modules.name AS module_name', true],
                        'section_name' => ['skeleton_sections.name', true],
                        'icon' => ['skeleton_sections.icon', true],
                        'order' => ['skeleton_sections.order', true],
                        'is_active' => ['skeleton_sections.is_active', true],
                        'created_at' => ['skeleton_sections.created_at', true],
                        'updated_at' => ['skeleton_sections.updated_at', true],
                    ];
                    $joins = [
                        [
                            'type' => 'left',
                            'table' => 'skeleton_modules',
                            'on' => ['skeleton_sections.module_id', 'skeleton_modules.module_id']
                        ]
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'is_active',
                            'view' => '::((is_active = 1 AND module_name LIKE %Settings%) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive</span>)::',
                            'renderHtml' => true
                        ]
                    ];
                    break;
                case 'central_skeleton_items':
                    $columns = [
                        'id' => ['skeleton_items.id', true],
                        'item_id' => ['skeleton_items.item_id', true],
                        'section' => ['skeleton_sections.name', true],
                        'name' => ['skeleton_items.name', true],
                        'icon' => ['skeleton_items.icon', true],
                        'order' => ['skeleton_items.order', true],
                        'is_active' => ['skeleton_items.is_active', true],
                        'created_by' => ['skeleton_items.created_by', false],
                        'updated_by' => ['skeleton_items.updated_by', false],
                        'created_at' => ['skeleton_items.created_at', true],
                        'updated_at' => ['skeleton_items.updated_at', true],
                    ];

                    $joins = [
                        ['type' => 'left', 'table' => 'skeleton_sections', 'on' => ['skeleton_items.section_id', 'skeleton_sections.section_id']],
                        ['type' => 'left', 'table' => 'skeleton_modules', 'on' => ['skeleton_items.module_id', 'skeleton_modules.module_id']]
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'is_active',
                            'view' => '::((is_active = 1 OR system = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive</span>)::',
                            'renderHtml' => true
                        ]
                    ];
                    break;
                    case 'business_Company_documents':
                    $columns = [
                        'id' => ['documents.id', true],
                        'document_id' => ['documents.document_id', true],
                        'document_name' => ['documents.document_name', true],
                        'category' => ['documents.category', true],
                        'file_type' => ['documents.file_type', true],
                        'status' => ['documents.status', true],
                    ];
                    break;

                case 'business_companies':
                    $columns = [
                        'id' => ['companies.id', true],
                        'name' => ['companies.name', true],
                        'legal_name' => ['companies.legal_name', true],
                        'founded_date' => ['companies.founded_date', true],
                        'phone' => ['companies.phone', true],
                        'email' => ['companies.email', true],
                        'industry' => ['companies.industry', true],
                        'website' => ['companies.website', true],
                        'industry' => ['companies.industry', true],
                        'no_of_employees' => ['companies.no_of_employees', true],
                        'tax_id' => ['companies.tax_id', true],
                        'created_at' => ['companies.created_at', true],
                        'updated_at' => ['companies.updated_at', true],
                    ];
                    break;

                default:
                    Developer::warning('FetchCtrl: Unknown configuration key', ['key' => $reqSet['key'], 'token' => $token]);
                    return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Fetch data using Data facade with joins and filters
            $params = DataHelper::generateParams($columns, $joins, $conditions, $reqSet);
            Developer::info($reqSet);
            $result = Data::filter('business', $reqSet['table'], $params);
            // Check if data retrieval was successful
            if (!$result['status']) {
                return response()->json([
                    'status' => false,
                    'title' => 'Data Fetch Failed',
                    'message' => $result['message']
                ]);
            }
            // Generate response using DataHelper
            Developer::alert('the request set is ', ['reqset' => $reqSet]);
            return response()->json(DataHelper::generateResponse($result, $columns, $custom, $reqSet));
        } catch (Exception $e) {
            return response()->json([
                'status' => false,
                'title' => 'Error',
                'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Failed to retrieve data.'
            ]);
        }
    }
}
