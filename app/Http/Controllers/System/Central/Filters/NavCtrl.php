<?php
namespace App\Http\Controllers\System\Central\Filters;

use App\Http\Controllers\Controller;
use App\Facades\{Skeleton, Developer};
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Config, View, DB};

class NavCtrl extends Controller
{
    public function index(Request $request, array $params)
    {
        try {
            $baseView = 'system.central.filters';
            $module = $params['module'] ?? 'Filters';
            $section = $params['section'] ?? null;
            $item = $params['item'] ?? null;
            $token = $params['token'] ?? null;

            $viewPath = $baseView;
            if ($section) {
                $viewPath .= '.' . $section;
                if ($item) $viewPath .= '.' . $item;
            } else {
                $viewPath .= '.index';
            }
            $viewName = strtolower(str_replace(' ', '-', str_replace("{$baseView}.", '', $viewPath)));
            $viewPath = strtolower(str_replace(' ', '-', $viewPath));
            Developer::info($viewName);

            // Default data
            $data = [
                'status' => true,
                'module' => $module,
                'section' => $section,
                'item' => $item,
                'token' => $token,
                'title' => 'Page Loaded',
                'message' => 'Filters module page loaded successfully.',
                'user' => Skeleton::getAuthenticatedUser(),
            ];

            switch ($viewName) {
                case 'mapping':
                    // Get user's accessible databases
                    $user = Skeleton::getAuthenticatedUser();
                    $allowedDatabases = explode(',', $user->access_db ?? '');
                    
                    $data = array_merge($data, [
                        'allowed_databases' => $allowedDatabases,
                        'mapping_config' => [
                            'max_file_size' => '10MB',
                            'allowed_extensions' => ['csv', 'xlsx'],
                            'result_types' => [
                                'type1' => [
                                    'all_mapped' => 'All Records From Map Table',
                                    'common' => 'Common Records in Both Tables',
                                    'not_in_main' => 'Records Not-In Main Table'
                                ],
                                'type2' => [
                                    'all_matched' => 'All Matched Records',
                                    'all_empty' => 'All Empty Records',
                                    'all_non_empty' => 'All Non-Empty Records'
                                ]
                            ]
                        ]
                    ]);
                    break;

                case 'search.product_tables':
                    $productId = $request->query('product_id');
                    $productName = $request->query('product_name');
                    $companyId = $request->query('li_company_id'); // Support li_company_id
                    Developer::info("Product ID: " . ($productId ?? 'Not provided'));
                    Developer::info("Product Name: " . ($productName ?? 'Not provided'));
                    Developer::info("Company ID: " . ($companyId ?? 'Not provided'));

                    $data = [
                        'company' => [],
                        'product' => null,
                        'company_name' => 'Unknown Company',
                        'lead_count' => 0,
                        'related_products' => [],
                        'related_products_count' => 0,
                        'li_smtp' => '',
                        'company_id' => null,
                        'product_id' => $productId,
                        'product_name' => $productName,
                        'contacts_table_token' => '',
                        'companies_table_token' => '',
                        'leads_table_token' => '',
                        'is_product_view' => false,
                    ];

                    if ($companyId) {
                        // Fetch company data from sun.master_accounts using li_company_id
                        $matchedCompany = DB::table('sun.master_accounts')
                            ->where('li_company_id', $companyId)
                            ->select(
                                'id',
                                'li_company_id',
                                'li_smtp',
                                'li_company_name',
                                'li_tag_line',
                                'li_logo',
                                'li_banner',
                                'li_company_industry',
                                'li_company_headquarters',
                                'li_company_founded',
                                'li_type',
                                'li_company_specialties',
                                'li_website',
                                'li_company_description',
                                'employees_on_linked_in'
                            )
                            ->first();

                        if ($matchedCompany) {
                            // Count leads with matching li_smtp in sun.master_leads
                            $leadCount = DB::table('sun.master_leads')
                                ->where('li_smtp', $matchedCompany->li_smtp)
                                ->count();

                            // Fetch related products with matching li_smtp in products table
                            $relatedProducts = DB::table('products')
                                ->where('pp_name', $matchedCompany->li_smtp)
                                ->select('product_id', 'pp_name', 'contacts', 'companies')
                                ->get()
                                ->toArray();
                            $relatedProductsCount = count($relatedProducts);

                            // Generate table tokens
                            $contactsTableToken = "@skeletonToken('central_sun_clients')_t_" . $companyId;
                            $companiesTableToken = "@skeletonToken('central_sun_master_accounts')_t_" . $companyId;
                            $leadsTableToken = "@skeletonToken('central_sun_master_leads')_t_" . $companyId;

                            $data = [
                                'company' => [(object) array_merge((array) $matchedCompany, [
                                    'lead_count' => $leadCount,
                                    'related_products_count' => $relatedProductsCount
                                ])],
                                'product' => $relatedProducts ? $relatedProducts[0] : null,
                                'company_name' => $matchedCompany->li_company_name,
                                'related_products' => $relatedProducts,
                                'related_products_count' => $relatedProductsCount,
                                'company_id' => $companyId,
                                'li_smtp' => $matchedCompany->li_smtp,
                                'contacts_table_token' => $contactsTableToken,
                                'companies_table_token' => $companiesTableToken,
                                'leads_table_token' => $leadsTableToken,
                                'is_product_view' => false,
                            ];
                            Developer::info("Matched Company: " . json_encode($matchedCompany));
                            Developer::info("Lead Count for li_smtp {$matchedCompany->li_smtp}: {$leadCount}");
                            Developer::info("Related Products Count: {$relatedProductsCount}");
                        } else {
                            Developer::info("No company found in sun.master_accounts for li_company_id: {$companyId}");
                        }
                    } elseif ($productId || $productName) {
                        // Logic for product_id or product_name
                        $query = DB::table('products')
                            ->select('product_id', 'pp_name', 'contacts', 'companies', 'product_name');
                        
                        if ($productId) {
                            $query->where('product_id', $productId);
                        } elseif ($productName) {
                            $query->where('product_name', $productName);
                        }
                        
                        $productData = $query->first();

                        if ($productData) {
                            $matchedCompany = DB::table('sun.master_accounts')
                                ->where('li_smtp', $productData->pp_name)
                                ->select(
                                    'id',
                                    'li_company_id',
                                    'li_smtp',
                                    'li_company_name',
                                    'li_tag_line',
                                    'li_logo',
                                    'li_banner',
                                    'li_company_industry',
                                    'li_company_headquarters',
                                    'li_company_founded',
                                    'li_type',
                                    'li_company_specialties',
                                    'li_website',
                                    'li_company_description',
                                    'employees_on_linked_in'
                                )
                                ->first();

                            if ($matchedCompany) {
                                // For product-based queries, count contacts instead of leads
                                $contactCount = 0;
                                if ($productData && $productData->contacts) {
                                    $contactIds = array_filter(explode(',', $productData->contacts));
                                    $contactCount = count($contactIds);
                                }
                                
                                $relatedProducts = DB::table('products')
                                    ->where('pp_name', $matchedCompany->li_smtp)
                                    ->select('product_id', 'pp_name', 'contacts', 'companies')
                                    ->get()
                                    ->toArray();
                                $relatedProductsCount = count($relatedProducts);

                                // Generate table tokens for product view
                                $contactsTableToken = "@skeletonToken('central_product_contacts')_t_" . ($productId ?: $productName);
                                $companiesTableToken = "@skeletonToken('central_product_companies')_t_" . ($productId ?: $productName);
                                $leadsTableToken = "@skeletonToken('central_sun_master_leads')_t_" . $matchedCompany->li_company_id;

                                $data = [
                                    'company' => [(object) array_merge((array) $matchedCompany, [
                                        'lead_count' => $contactCount, // Using contact count for products
                                        'related_products_count' => $relatedProductsCount
                                    ])],
                                    'product' => $productData,
                                    'company_name' => $matchedCompany->li_company_name,
                                    'related_products' => $relatedProducts,
                                    'related_products_count' => $relatedProductsCount,
                                    'company_id' => $matchedCompany->li_company_id,
                                    'li_smtp' => $matchedCompany->li_smtp,
                                    'product_id' => $productId,
                                    'product_name' => $productName,
                                    'contacts_table_token' => $contactsTableToken,
                                    'companies_table_token' => $companiesTableToken,
                                    'leads_table_token' => $leadsTableToken,
                                    'is_product_view' => true, // Flag to indicate this is a product view
                                ];
                                Developer::info("Matched Company: " . json_encode($matchedCompany));
                                Developer::info("Contact Count for product {$productData->product_id}: {$contactCount}");
                                Developer::info("Related Products Count: {$relatedProductsCount}");
                            } else {
                                Developer::info("No company found in sun.master_accounts for product_id: {$productId}");
                            }
                        } else {
                            Developer::info("No product found for " . ($productId ? "product_id: {$productId}" : "product_name: {$productName}"));
                        }
                    } else {
                        Developer::error("Neither product_id, product_name, nor li_company_id provided in request");
                    }
                    break;

                case 'search.related_products':
                    $pp_id = $request->query('pp_id');
                    Developer::info("Related Products pp_id: " . ($pp_id ?? 'Not provided'));
                    if ($pp_id) {
                        $company = DB::table('sun.master_accounts')
                            ->where('id', $pp_id)
                            ->select('li_smtp', 'li_company_name', 'li_company_id')
                            ->first();

                        $relatedProducts = [];
                        $relatedProductsCount = 0;
                        if ($company) {
                            $relatedProducts = DB::table('products')
                                ->where('pp_name', $company->li_smtp)
                                ->select('product_id', 'pp_name', 'contacts', 'companies')
                                ->get()
                                ->toArray();
                            $relatedProductsCount = count($relatedProducts);
                            Developer::info("Related Products Count: {$relatedProductsCount}");
                        } else {
                            Developer::info("No company found for pp_id: {$pp_id}");
                        }

                        $data = [
                            'pp_id' => $pp_id,
                            'related_products' => $relatedProducts,
                            'related_products_count' => $relatedProductsCount,
                            'company_name' => $company->li_company_name ?? 'Unknown Company',
                            'company_id' => $company->li_company_id ?? null,
                        ];
                    } else {
                        Developer::error("No pp_id provided in request");
                        $data = [
                            'pp_id' => '',
                            'related_products' => [],
                            'related_products_count' => 0,
                            'company_name' => 'Unknown Company',
                            'company_id' => null,
                        ];
                    }
                    break;

                default:
                    Developer::error("No valid case matched for view: {$viewName}");
            }

            if (View::exists($viewPath)) {
                return view($viewPath, compact('data'));
            }

            return response()->view('errors.404', [
                'status' => false,
                'title' => 'Page Not Found',
                'message' => 'The requested page does not exist.'
            ], 404);
        } catch (Exception $e) {
            Developer::error("Exception in NavCtrl: " . $e->getMessage());
            return ResponseHelper::moduleError(
                'Error',
                Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while loading the page.',
                500
            );
        }
    }
}