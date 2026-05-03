<?php
namespace App\Http\Controllers\System\Central\QueryNest;
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{TableHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;
/**
 * Controller for handling AJAX table data requests in the QueryNest module.
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
                'filterType'=>$filters['filterType'] ?? [],
                'columns' => $filters['columns'] ?? [],
                'sort' => $filters['sort'] ?? [],
                'pagination' => $filters['pagination'] ?? ['page' => 1, 'limit' => 10],
                'visible_columns'=>$filters['visible_columns']?? [],
                'export' => $filters['export'] ?? [],
            ];
            if (!is_array($reqSet['filters'])) {
                return ResponseHelper::moduleError('Invalid Filters', 'The filters format is invalid.', 400);
            }
            $columns = $conditions = $joins = $custom = [];
            $title = 'Data Retrieved';
            $message = 'QueryNest data retrieved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                 case 'central_unique_unq_tables':
                    $columns = [
                        'id' => ['unq_tables.id', true],
                        'table_id' => ['unq_tables.table_id', true],
                        'name' => ['unq_tables.name', true],
                        'headers' => ['unq_tables.headers', true],
                        'system_id' => ['unq_tables.system_id', true],
                        'system' => ['unq_tables.system', true],
                        'records' => ['unq_tables.records', true],
                        'created_at' => ['unq_tables.created_at', true],
                        'updated_at' => ['unq_tables.updated_at', true],
                    ];
                    break;
                case 'central_unique_import_logs':
                    $columns = Data::getTableColumns($reqSet['table'], ['type', 'deleted_at']);
                    $columns['user_id'] =['users.username AS username', true];
                    $custom = [
                           ['type' => 'modify', 'column' => 'status', 'view' => '::((status =completed) ~ <span class="badge bg-success">::status::</span></span> || <span class="badge bg-danger">::status::</span>)::', 'renderHtml' => true],
                    ];
                    $joins = [
                        ['type' => 'left', 'table' => 'users', 'on' => ['process_logs.user_id', 'users.id']]
                    ];
                    $conditions = [
                        ['column' => 'process_logs.type', 'operator' => '=', 'value' => 'import'],
                    ];
                    $reqSet['filters']['sort'] = ['process_logs.id' => 'desc'];
                    $title = 'Entities Retrieved';
                    $message = 'QueryNest entity data retrieved successfully.';
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