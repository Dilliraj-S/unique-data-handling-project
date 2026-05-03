<?php

namespace App\Http\Controllers\System\Central\Profile;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Controllers\System\Actions\Select;
use App\Http\Helpers\{TableHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Controller for handling AJAX table data requests in the Profile module.
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
            $message = 'Profile data retrieved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'central_activity_history':
                    $columns = [
                        'id' => ['activity_history.id', true],
                        'act_id' => ['activity_history.act_id', true],
                        'user_id' => ['activity_history.user_id', true],
                        'username' => ['activity_history.username', true],
                        'ip_address' => ['activity_history.ip_address', true],
                        'browser' => ['activity_history.browser', true],
                        'device' => ['activity_history.device', true],
                        'action' => ['activity_history.action', true],
                        'description' => ['activity_history.description', true],
                        'deleted_at' => ['activity_history.deleted_at', true],
                    ];
                    $custom = [];
                    $title = 'Entities Retrieved';
                    $message = 'Activity data retrieved successfully.';
                    break;
                case 'central_login_history':
                    $user = auth()->user();
                    $columns = [
                        'id' => ['login_history.id', true],
                        'user_id' => ['login_history.user_id', true],
                        'browser' => ['login_history.browser', true],
                        'device' => ['login_history.device', true],
                        'os' => ['login_history.os', true],
                        'login_time' => ['login_history.login_time', true],
                        'logout_time' => ['login_history.logout_time', true],
                    ];
                    // Developer::info($user->role['name']);
                    // Developer::info($user->user_id);

                    if ($user->role['name'] !== 'Admin') {
                        Developer::info('Not Admin');
                        Developer::info($user->role['name']);
                        // $conditions = [
                        //     'login_history.user_id' => $user->user_id,
                        //     'login_history.deleted_at' => null,
                        // ];
                        $conditions = [
                            ['column' => 'login_history.user_id', 'operator' => '=', 'value' => $user->user_id],
                            ['column' => 'login_history.deleted_at', 'operator' => '=', 'value' => null],
                        ];
                    }
                    $title = 'Entities Retrieved';
                    $message = 'Login History data retrieved successfully.';
                    break;
                case 'central_unique_profile_data':
                    $columns = [
                        'id' => ['login_history.id', true],
                        'user_id' => ['login_history.user_id', true],
                        'login_time' => ['login_history.login_time', true],
                        'logout_time' => ['login_history.logout_time', true],
                        'browser' => ['login_history.browser', true],
                        'device' => ['login_history.device', true],
                        'action' => ['login_history.action', true],
                        'platform' => ['login_history.platform', true],
                        'os' => ['login_history.os', true],
                        'deleted_at' => ['login_history.deleted_at', true],
                    ];
                    $custom = [];
                    $title = 'Entities Retrieved';
                    $message = 'Profile entity data retrieved successfully.';
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
            return response()->json(array_merge(TableHelper::generateResponse($result, $columns, $custom, $reqSet), ['title' => $title, 'message' => $message]));
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Failed to retrieve table data.', 500);
        }
    }
}
