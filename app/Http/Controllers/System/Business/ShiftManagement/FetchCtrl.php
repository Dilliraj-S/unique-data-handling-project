<?php

namespace App\Http\Controllers\System\Business\ShiftManagement;

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


                case 'business_shifts':


                    $columns = [
                        'id' => ['shifts.id', true],
                        'sno' => ['shifts.sno', true],
                        'shift_id' => ['shifts.shift_id', true],
                        'shift_name' => ['shifts.shift_name', true],
                        'shift_type' => ['shifts.shift_type', true],
                        'start_time' => ['shifts.start_time', true],
                        'end_time' => ['shifts.end_time', true],
                        'grace_period' => ['shifts.grace_period', true],
                        'break_start_time' => ['shifts.break_start_time', true],
                        'break_end_time' => ['shifts.break_end_time', true],
                        'break_duration' => ['shifts.break_duration', true],
                        'work_hours' => ['shifts.work_hours', true],
                        'company_id' => ['shifts.company_id', true],
                        'branch_id' => ['shifts.branch_id', true],
                        'has_break' => ['shifts.has_break', true],
                        'break_grace_period' => ['shifts.break_grace_period', true],
                        'include_break' => ['shifts.include_break', true],
                        'is_holiday_shift' => ['shifts.is_holiday_shift', true],
                        'allow_shift_termination' => ['shifts.allow_shift_termination', true],
                        'allow_break_termination' => ['shifts.allow_break_termination', true],
                        'allow_multiple_breaks' => ['shifts.allow_multiple_breaks', true],
                        'allow_strict_break' => ['shifts.allow_strict_break', true],
                        'has_variable_shift' => ['shifts.has_variable_shift', true],
                        'has_variable_break' => ['shifts.has_variable_break', true],
                    ];
                    $joins = [];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'is_holiday_shift',
                            'view' => '::((is_holiday_shift = 1 OR system = 1) ~ <span class="badge bg-success">Holiday Shift</span> || <span class="badge bg-danger">Normal Shift</span>)::',
                            'renderHtml' => true
                        ]
                    ];
                    break;

                case 'business_shift_schedules':
                    $columns = [
                        'id' => ['shift_schedules.id', true],
                        'employee_id' => ['shift_schedules.employee_id', true],
                        'shift_id' => ['shift_schedules.shift_id', true],
                        'type' => ['shift_schedules.type', true],
                        'rules' => ['shift_schedules.rules', true],
                        'priority' => ['shift_schedules.priority', true],
                        'status' => ['shift_schedules.status', true],
                        'created_at' => ['shift_schedules.created_at', true],
                        'updated_at' => ['shift_schedules.updated_at', true],
                    ];
                    $joins = [];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'status',
                            'view' => '::((status = 1 OR system = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Deactive</span>)::',
                            'renderHtml' => true
                        ],

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
