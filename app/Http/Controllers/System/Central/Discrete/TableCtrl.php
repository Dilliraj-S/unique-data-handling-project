<?php

namespace App\Http\Controllers\System\Central\Discrete;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{TableHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;

/**
 * Controller for handling AJAX table data requests in the Discrete module.
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
            $message = 'Discrete data retrieved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/

            switch ($reqSet['key']) {
                case 'central_unique_categories':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'category', 'view' => '<span class="badge bg-success">::category::</span>', 'renderHtml' => true],
                    ];
                    $title = 'options Retrieved';
                    $message = 'options data retrieved successfully.';
                    break;
                case 'central_unique_options':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $custom = [
                        ['type' => 'modify', 'column' => 'category_id', 'view' => '<span class="badge bg-success">::category_id::</span>', 'renderHtml' => true],
                    ];
                    $title = 'options Retrieved';
                    $message = 'options data retrieved successfully.';
                    break;
                case 'news_feeds':
                    $columns = [
                        'id'             => ['news_feeds.id', true],
                        'org_id'         => ['news_feeds.org_id', true],
                        'feed_id'        => ['news_feeds.feed_id', true],
                        'title'          => ['news_feeds.title', true],
                        'content'        => ['news_feeds.content', true],
                        'attachment_url' => ['news_feeds.attachment_url', true],
                        'author_id'      => ['news_feeds.author_id', true],
                        'category_id'    => ['news_feeds.category_id', true],
                        'tags'           => ['news_feeds.tags', true],
                        'views'          => ['news_feeds.views', true],
                        'likes'          => ['news_feeds.likes', true],
                        'comment_ids'    => ['news_feeds.comment_ids', true],
                        'priority'       => ['news_feeds.priority', true],
                        'status'         => ['news_feeds.status', true],
                        'completed_at'   => ['news_feeds.completed_at', true],
                        'deleted_at'     => ['news_feeds.deleted_at', true],
                        'created_at'     => ['news_feeds.created_at', true],
                        'updated_at'     => ['news_feeds.updated_at', true],
                    ];

                    $custom = [
                        ['type' => 'modify', 'column' => 'category_id', 'view' => '<span class="badge bg-success">::category_id::</span>', 'renderHtml' => true],
                    ];

                    $title = 'Entities Retrieved';
                    $message = 'Discrete entity data retrieved successfully.';
                    break;

                case 'news_feeds_projects':
                    $columns = [
                        'id' => ['news_feeds.id', true],
                        'org_id' => ['news_feeds.org_id', true],
                        'feed_id' => ['news_feeds.feed_id', true],
                        'title' => ['news_feeds.title', true],
                        'content' => ['news_feeds.content', true],
                        'attachment_url' => ['news_feeds.attachment_url', true],
                        'author_id' => ['news_feeds.author_id', true],
                        'category_id' => ['news_feeds.category_id', true],
                        'tags' => ['news_feeds.tags', true],
                        'views' => ['news_feeds.views', true],
                        'likes' => ['news_feeds.likes', true],
                        'comment_ids' => ['news_feeds.comment_ids', true],
                        'priority' => ['news_feeds.priority', true],
                        'status' => ['news_feeds.status', true],
                        'completed_at' => ['news_feeds.completed_at', true],
                        'deleted_at' => ['news_feeds.deleted_at', true],
                        'created_at' => ['news_feeds.created_at', true],
                        'updated_at' => ['news_feeds.updated_at', true],
                    ];
                    $custom = [
                        ['type' => 'modify', 'column' => 'category_id', 'view' => '<span class="badge bg-success">::category_id::</span>', 'renderHtml' => true],
                    ];
                    $conditions = [
                        [
                            'column' => 'news_feeds.category_id',
                            'operator' => '=',
                            'value' => 'Projects',
                        ],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'Discrete entity data retrieved successfully.';
                    break;
                case 'news_feeds_news':
                    $columns = [
                        'id' => ['news_feeds.id', true],
                        'org_id' => ['news_feeds.org_id', true],
                        'feed_id' => ['news_feeds.feed_id', true],
                        'title' => ['news_feeds.title', true],
                        'content' => ['news_feeds.content', true],
                        'attachment_url' => ['news_feeds.attachment_url', true],
                        'author_id' => ['news_feeds.author_id', true],
                        'category_id' => ['news_feeds.category_id', true],
                        'tags' => ['news_feeds.tags', true],
                        'views' => ['news_feeds.views', true],
                        'likes' => ['news_feeds.likes', true],
                        'comment_ids' => ['news_feeds.comment_ids', true],
                        'priority' => ['news_feeds.priority', true],
                        'status' => ['news_feeds.status', true],
                        'completed_at' => ['news_feeds.completed_at', true],
                        'deleted_at' => ['news_feeds.deleted_at', true],
                        'created_at' => ['news_feeds.created_at', true],
                        'updated_at' => ['news_feeds.updated_at', true],
                    ];
                    $custom = [
                        ['type' => 'modify', 'column' => 'category_id', 'view' => '<span class="badge bg-success">::category_id::</span>', 'renderHtml' => true],
                    ];
                    $conditions = [
                        [
                            'column' => 'news_feeds.category_id',
                            'operator' => '=',
                            'value' => 'news',
                        ],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'Discrete entity data retrieved successfully.';
                    break;


                case 'central_users':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at', 'business_id', 'password', 'provider', 'provider_id', 'provider_token', 'provider_refresh_token', 'max_logins', 'banner', 'remember_token', 'delete_on', 'restored_at', 'two_factor_enabled', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'two_factor_method', 'device_token', 'device_type']);
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'user_id',
                            'view' => '<span class="badge bg-success">::user_id::</span>',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'modify',
                            'column' => 'profile',
                            'view' => '<img src="' . asset('::profile::') . '" alt="Profile Image" style="width:40px;height:40px;border-radius:50%;">',
                            'renderHtml' => true
                        ],




                    ];
                    $title = 'options Retrieved';
                    $message = 'options data retrieved successfully.';
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
