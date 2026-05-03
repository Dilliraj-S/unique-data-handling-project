<?php
namespace App\Http\Controllers\System\Central\Filters;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{TableHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, DB};

class TableCtrl extends Controller
{
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
                'processId' => $filters['processId'] ?? [],
            ];

            if (!is_array($reqSet['filters'])) {
                return ResponseHelper::moduleError('Invalid Filters', 'The filters format is invalid.', 400);
            }
            $columns = $conditions = $joins = $custom = [];
            $title = 'Data Retrieved';
            $message = 'Filters data retrieved successfully.';

            switch ($reqSet['key']) {
                case 'central_sun_master_leads':
                    $columns = Data::getTableColumns($reqSet['table'], ['master_lead_id', 'deleted_at', 'need_to_action']);
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'li_company_name',
                            'view' => '<a href="/filters/search/product_tables?li_company_id=::li_company_id::" class="badge bg-info">::li_company_name::</a>',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'addon',
                            'column' => 'Mail Log',
                            'view' => '<button class="btn btn-sm btn-info skeleton-popup" data-token="' . $reqSet['token'] . '_v_::email::"><i class="fa fa-envelope"></i></button>',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'modify',
                            'column' => 'need_to_action',
                            'view' => '::((need_to_action = 0) ~ <span class="badge bg-info" data-token="' . $reqSet['token'] . '_a_::id::">Need To Action</span> || <span class="badge bg-danger">Moved To Action</span>)::',
                            'renderHtml' => true
                        ]
                    ];
                    $parts = explode('_', $token);
                    $lastPart = end($parts);
                    if (is_numeric($lastPart)) {
                        $conditions[] = ['column' => 'sun.master_leads.li_company_id', 'operator' => '=', 'value' => $lastPart];
                    }
                    // Apply li_smtp filter if provided in skeleton_filters
                    if (!empty($filters['search'])) {
                        foreach ($filters['search'] as $search) {
                            if ($search['column'] === 'li_smtp') {
                                $conditions[] = ['column' => 'sun.master_leads.li_smtp', 'operator' => '=', 'value' => $search['value']];
                            }
                        }
                    }
                    $conditions[] = ['column' => 'sun.master_leads.need_to_action', 'operator' => '=', 'value' => 0];
                    $title = 'Entities Retrieved';
                    $message = 'Filters entity data retrieved successfully.';
                    break;

                case 'central_sun_master_accounts':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at', 'need_to_action', 'master_acct_id']);
                    $custom = [
                        [
                            'type' => 'addon',
                            'column' => 'View Contacts',
                            'view' => '<a href="/filters/search/clients?li_company_id=::li_company_id::" class="btn btn-sm btn-info">View Contacts</a>',
                            'renderHtml' => true,
                        ],
                        [
                            'type' => 'modify',
                            'column' => 'li_company_name',
                            'view' => '<a href="/filters/search/product_tables?li_company_id=::li_company_id::" class="badge bg-info">::li_company_name::</a>',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'modify',
                            'column' => 'need_to_action',
                            'view' => '::((need_to_action = 0) ~ <span class="badge bg-info">Need To Action</span> || <span class="badge bg-danger">Moved To Action</span>)::',
                            'renderHtml' => true
                        ],
                    ];
                    $parts = explode('_', $token);
                    $lastPart = end($parts);
                    if (is_numeric($lastPart)) {
                        $conditions[] = ['column' => 'sun.master_accounts.li_company_id', 'operator' => '=', 'value' => $lastPart];
                    }
                    $conditions[] = ['column' => 'sun.master_accounts.need_to_action', 'operator' => '=', 'value' => 0];
                    $title = 'Entities Retrieved';
                    $message = 'Filters entity data retrieved successfully.';
                    break;

                case 'central_unique_products':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    if (isset($reqSet['id']) && !empty($reqSet['id'])) {
                        $conditions = [
                            ['column' => 'products.pp_id', 'operator' => '=', 'value' => $reqSet['id']],
                        ];
                    }
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'status',
                            'view' => '::((status = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive</span>)::',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'modify',
                            'column' => 'product_name',
                            'view' => '<a href="/filters/search/product_tables?product_id=::product_id::" class="badge bg-info">::product_name::</a>',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'modify',
                            'column' => 'contacts_count',
                            'view' => '<a href="/filters/search/product_tables?product_id=::product_id::" class="badge bg-info">::contacts_count::</a>',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'modify',
                            'column' => 'companies_count',
                            'view' => '<a href="/filters/search/product_tables?product_id=::product_id::" class="badge bg-info">::companies_count::</a>',
                            'renderHtml' => true
                        ]
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'Filters entity data retrieved successfully.';
                    break;

                case 'central_need_action_contacts':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at','need_to_action']);
                    // Add the status column from the joined table
                    $columns['status'] = ['need_to_action.status', true];
                    $conditions = [
                        ['column' => 'sun.master_leads.need_to_action', 'operator' => '=', 'value' => 1],
                    ];
                    $joins = [
                        [
                            'type' => 'left',
                            'table' => 'need_to_action',
                            'on' => ['sun.master_leads.id', 'need_to_action.action_id']
                        ]
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'need_to_action',
                            'view' => '::((need_to_action = 0) ~ <span class="btn btn-info btn-sm skeleton-popup" data-token="' . $reqSet['token'] . '_a_::id::">Need To Action</span> || <span class="badge bg-danger">Moved To Action</span>)::',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'addon',
                            'column' => 'status',
                            'view' => '::status::',
                            'renderHtml' => false
                        ],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'Filters entity data retrieved successfully.';
                    break;

                case 'central_need_action_companies':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at','need_to_action']);
                    // Add the status column from the joined table
                    $columns['status'] = ['need_to_action.status', true];
                    $conditions = [
                        ['column' => 'sun.master_accounts.need_to_action', 'operator' => '=', 'value' => 1],
                        ['column' => 'need_to_action.table_name', 'operator' => '=', 'value' => 'sun.master_accounts'],
                    ];
                    $joins = [
                        [
                            'type' => 'left',
                            'table' => 'need_to_action',
                            'on' => ['sun.master_accounts.id', 'need_to_action.action_id']
                        ]
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'need_to_action',
                            'view' => '::((need_to_action = 0) ~ <span class="btn btn-info btn-sm skeleton-popup" data-token="' . $reqSet['token'] . '_a_::id::">Need To Action</span> || <span class="badge bg-danger">Moved To Action</span>)::',
                            'renderHtml' => true
                        ],
                        [
                            'type' => 'addon',
                            'column' => 'status',
                            'view' => '::status::',
                            'renderHtml' => false
                        ],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'Filters entity data retrieved successfully.';
                    break;

                case 'central_sun_clients':
                    $columns = Data::getTableColumns($reqSet['table'], ['created_id', 'updated_at', 'deleted_at']);
                    $parts = explode('_', $token);
                    $lastPart = end($parts);
                    $conditions = [
                        ['column' => 'li_company_id', 'operator' => '=', 'value' => $lastPart]
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'EmailSystem entity data retrieved successfully.';
                    break;

                case 'central_product_contacts':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $parts = explode('_', $token);
                    $lastPart = end($parts);
                    $productContacts = DB::table('products')
                        ->where('product_id', $lastPart)
                        ->pluck('contacts')
                        ->flatMap(function ($contactString) {
                            return array_map('intval', explode(',', $contactString));
                        })
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();
                    $contactsCount = count($productContacts);
                    $conditions = [
                        ['column' => 'sun.master_leads.id', 'operator' => 'IN', 'value' => $productContacts],
                    ];
                    $custom = [
                        [
                            'type' => 'addon',
                            'column' => 'Contacts Count',
                            'view' => '<span class="badge bg-info">' . $contactsCount . '</span>',
                            'renderHtml' => true,
                        ],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'Filters entity data retrieved successfully.';
                    break;

                case 'central_product_companies':
                    $columns = Data::getTableColumns($reqSet['table'], ['deleted_at']);
                    $parts = explode('_', $token);
                    $lastPart = end($parts);
                    $companyId = $request->query('li_company_id') ?? $lastPart;
                    $conditions = [];
                    if (is_numeric($companyId)) {
                        $conditions[] = ['column' => 'sun.master_accounts.li_company_id', 'operator' => '=', 'value' => $companyId];
                    } else {
                        $productCompanies = DB::table('products')
                            ->where('product_id', $lastPart)
                            ->pluck('companies')
                            ->flatMap(function ($companyString) {
                                return array_map('intval', explode(',', $companyString));
                            })
                            ->filter()
                            ->unique()
                            ->values()
                            ->toArray();
                        $conditions[] = ['column' => 'sun.master_accounts.id', 'operator' => 'IN', 'value' => $productCompanies];
                    }
                    $companiesCount = count($productCompanies ?? []);
                    $custom = [
                        [
                            'type' => 'addon',
                            'column' => 'View Contacts',
                            'view' => '<a href="/filters/search/clients?li_company_id=::li_company_id::" class="btn btn-sm btn-info">View Contacts</a>',
                            'renderHtml' => true,
                        ],
                        [
                            'type' => 'addon',
                            'column' => 'Companies Count',
                            'view' => '<span class="badge bg-info">' . $companiesCount . '</span>',
                            'renderHtml' => true,
                        ],
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'Filters entity data retrieved successfully.';
                    break;

                case 'central_pluto_product_unsubscribe':
                    $columns = Data::getTableColumns($reqSet['table'], ['message_id', 'in_reply_to', 'thread_id', 'category', 'body', 'body_html', 'read', 'labels', 'thread_count', 'status_reasons', 'deleted_at', 'created_by', 'updated_by']);
                    $conditions = [
                        ['column' => 'status', 'operator' => '=', 'value' => 'unsubscribe']
                    ];
                    $title = 'Entities Retrieved';
                    $message = 'Filters entity data retrieved successfully.';
                    break;

                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }

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