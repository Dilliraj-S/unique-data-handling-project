<?php

namespace App\Http\Controllers\System\Business\EmployeeManagement;

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
            switch ($reqSet['key']) {
                /****************************************************************************************************
                 *                                                                                                  *
                 *                             >>> MODIFY THIS SECTION (START) <<<                                  *
                 *                                                                                                  *
                 ****************************************************************************************************/
                    case 'business_documents':
                    $columns = [
                        'id' => ['documents.id', true],
                        'document_id' => ['documents.document_id', true],
                        'document_name' => ['documents.document_name', true],
                        'category' => ['documents.category', true],
                        'file_type' => ['documents.file_type', true],
                        'status' => ['documents.status', true],
                    ];
                    break;
                case 'business_employees':
                    $columns = [
                        'id' => ['employees.id',true],
                        'sno' => ['employees.sno', true],
                        'first_name' => ['employees.first_name', true],
                        'last_name' => ['employees.last_name', true],
                        'role_id' => ['employees.role_id', true],
                        'birth_date' => ['employees.birth_date', true],
                        'created_at' => ['employees.created_at', true],
                        'updated_at' => ['employees.updated_at', true],
                    ];
                    break;
                case 'business_designations':
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

                case 'business_departments':
                    $columns = [
                        'id' => ['departments.id', true],
                        'sno' => ['departments.sno', true],
                        'department_id' => ['departments.department_id', true],
                        'department' => ['departments.department', true],
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
          
            //   $response = DataHelper::generateResponse($result['data'], $columns, $custom, $reqSet);
            // return response()->json([
            //     'status' => true,
            //     'draw' => $result['draw'],
            //     'data' => $response['data'],
            //     'columns' => $response['columns'] ?? [],
            //     'recordsTotal' => $response['recordsTotal'],
            //     'recordsFiltered' => $response['recordsFiltered']
            // ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => false,
                'title' => 'Error',
                'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Failed to retrieve data.'
            ]);
        }
    }
}