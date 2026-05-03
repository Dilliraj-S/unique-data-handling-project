<?php
namespace App\Http\Controllers\System\Central\QueryChain;
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{CardHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;
/**
 * Controller for handling AJAX card data requests in the QueryChain module with clean UI.
 */
class CardCtrl extends Controller
{
    /**
     * Handles AJAX requests for card data processing for modules, sections, and items.
     *
     * @param Request $request HTTP request object containing filters and view settings
     * @param array $params Route parameters (module, section, item, token)
     * @return JsonResponse Processed card data or error response
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
            // Set view to card and parse filters
            $reqSet['view'] = 'card';
            $reqSet['draw'] = (int) $request->input('draw', 1);
            $filters = $request->input('skeleton_filters', []);
            $reqSet['filters'] = [
                'search' => $filters['search'] ?? '',
                'dateRange' => $filters['dateRange'] ?? [],
                'sort' => $filters['sort'] ?? [],
                'pagination' => $filters['pagination'] ?? ['page' => 1, 'limit' => 12],
            ];
            // Validate filters format
            if (!is_array($reqSet['filters'])) {
                return ResponseHelper::moduleError('Invalid Filters', 'The filters format is invalid.', 400);
            }
            // Initialize configuration arrays
            $columns = $conditions = $joins = $custom = [];
            $view = '';
            $title = 'Success';
            $message = 'Card data retrieved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch ($reqSet['key']) {
                case 'QueryChain_entities':
                    $columns = [
                        'id' => 'entities.id',
                        'name' => 'entities.name',
                        'description' => 'entities.description',
                        'is_active' => 'entities.is_active',
                        'created_at' => 'entities.created_at',
                        'updated_at' => 'entities.updated_at',
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'is_active',
                            'view' => '::(is_active == 1 ~ "<span class=\"text-green-600 font-semibold\">Active</span>" || "<span class=\"text-red-600 font-semibold\">Inactive</span>")::',
                            'renderHtml' => true
                        ]
                    ];
                    $view = '<div class="card h-100 bg-white shadow-md rounded-lg hover:shadow-lg transition-shadow duration-300"><div class="card-body p-4"><h5 class="card-title text-lg font-bold text-gray-800 mb-2">::name::</h5><p class="card-text text-gray-600 text-sm mb-3">Description: ::description::<br>Status: ::is_active::<br>Created: ::created_at::<br>Updated: ::updated_at::</p><a href="#" class="btn bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200">View Entity ::id::</a></div></div>';
                    $title = 'Entities Retrieved';
                    $message = 'QueryChain entity card data retrieved successfully.';
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
            $params = CardHelper::generateParams($columns, $joins, $conditions, $reqSet);
            $result = Data::filter('central', $reqSet['table'], $params);
            // Check if data retrieval was successful
            if (!$result['status']) {
                return ResponseHelper::moduleError('Data Fetch Failed', $result['message'], 500);
            }
            // Generate and return response using CardHelper
            return response()->json(array_merge(
                CardHelper::generateResponse($result, $columns, $custom, $reqSet, $view),
                ['title' => $title, 'message' => $message]
            ));
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Failed to retrieve card data.', 500);
        }
    }
}