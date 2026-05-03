<?php
namespace App\Http\Controllers\System\Central\Developer;

use App\Facades\{Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{CardHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;

/**
 * Controller for handling AJAX card data requests in the central system with clean UI.
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
            
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (empty($token)) {
                Developer::warning('CardCtrl: No token provided', [
                    'params' => $params,
                    'request' => $request->except(['password', 'token'])
                ]);
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }

            
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['table'])) {
                Developer::warning('CardCtrl: Invalid token configuration', [
                    'token' => $token,
                    'reqSet' => $reqSet
                ]);
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid or lacks required configuration.', 400);
            }

            
            $reqSet['view'] = 'card';
            $reqSet['draw'] = (int) $request->input('draw', 1);
            $filters = $request->input('skeleton_filters', []);
            $reqSet['filters'] = [
                'search' => $filters['search'] ?? '',
                'dateRange' => $filters['dateRange'] ?? [],
                'sort' => $filters['sort'] ?? [],
                'pagination' => $filters['pagination'] ?? ['page' => 1, 'limit' => 12],
            ];

            if (!is_array($reqSet['filters'])) {
                Developer::warning('CardCtrl: Invalid filters format', [
                    'filters' => $reqSet['filters'],
                    'token' => $token
                ]);
                return ResponseHelper::moduleError('Invalid Filters', 'The filters format is invalid.', 400);
            }

            $columns = $conditions = $joins = $custom = [];
            $view = '';
            $title = 'Success';
            $message = 'Card data retrieved successfully.';

            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            
            switch ($reqSet['key']) {
                
                case 'central_skeleton_modules':
                    
                    $columns = [
                        'id' => 'skeleton_modules.id',
                        'name' => 'skeleton_modules.name',
                        'description' => 'skeleton_modules.description',
                        'is_active' => 'skeleton_modules.is_active',
                        'created_at' => 'skeleton_modules.created_at',
                        'updated_at' => 'skeleton_modules.updated_at',
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'is_active',
                            'view' => '::(is_active == 1 ~ "<span class=\"text-green-600 font-semibold\">Active</span>" || "<span class=\"text-red-600 font-semibold\">Inactive</span>")::',
                            'renderHtml' => true
                        ]
                    ];
                    $view = '<div class="card flex-fill">
							<div class="card-header d-flex align-items-center justify-content-between">
								<a href="student-details.html" class="link-primary">AD9892433</a>
								<div class="d-flex align-items-center">
									<span class="badge badge-soft-success d-inline-flex align-items-center me-1"><i class="ti ti-circle-filled fs-5 me-1"></i>Active</span>
									<div class="dropdown">
										<a href="#" class="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0" data-bs-toggle="dropdown" aria-expanded="false">
											<i class="ti ti-dots-vertical fs-14"></i>
										</a>
										<ul class="dropdown-menu dropdown-menu-right p-3">
											<li>
												<a class="dropdown-item rounded-1" href="student-details.html"><i class="ti ti-menu me-2"></i>View Student</a>
											</li>
											<li>
												<a class="dropdown-item rounded-1" href="edit-student.html"><i class="ti ti-edit-circle me-2"></i>Edit</a>
											</li>
											<li>
												<a class="dropdown-item rounded-1" href="student-promotion.html"><i class="ti ti-arrow-ramp-right-2 me-2"></i>Promote Student</a>
											</li>
											<li>
												<a class="dropdown-item rounded-1" href="#" data-bs-toggle="modal" data-bs-target="#delete-modal"><i class="ti ti-trash-x me-2"></i>Delete</a>
											</li>
										</ul>	
									</div>
								</div>
							</div>
							<div class="card-body">
								<div class="bg-light-300 rounded-2 p-3 mb-3">
									<div class="d-flex align-items-center">
										<a href="student-details.html" class="avatar avatar-lg flex-shrink-0"><img src="assets/img/students/student-02.jpg" class="img-fluid rounded-circle" alt="img"></a> 
										<div class="ms-2">
											<h6 class="mb-0"><a href="student-details.html">::name::</a></h6>
											<p>IV, B</p>
										</div>
									</div>	
								</div>
								<div class="d-flex align-items-center justify-content-between gx-2">
									<div>
										<p class="mb-0">Roll No</p>
										<p class="text-dark">35012</p>
									</div>
									<div>
										<p class="mb-0">Gender</p>
										<p class="text-dark">Male</p>
									</div>
									<div>
										<p class="mb-0">Joined On</p>
										<p class="text-dark">19 Aug 2014</p>
									</div>
								</div>
							</div>
							<div class="card-footer d-flex align-items-center justify-content-between">
								<div class="d-flex align-items-center">
									<a href="#" class="btn btn-outline-light bg-white btn-icon d-flex align-items-center justify-content-center rounded-circle  p-0 me-2"><i class="ti ti-brand-hipchat"></i></a>
									<a href="#" class="btn btn-outline-light bg-white btn-icon d-flex align-items-center justify-content-center rounded-circle  p-0 me-2"><i class="ti ti-phone"></i></a>
									<a href="#" class="btn btn-outline-light bg-white btn-icon d-flex align-items-center justify-content-center rounded-circle p-0 me-3"><i class="ti ti-mail"></i></a>
								</div>
								<a href="#" data-bs-toggle="modal" data-bs-target="#add_fees_collect" class="btn btn-light btn-sm fw-semibold">Add Fees</a>
							</div>
						</div>';
                    $title = 'Modules Retrieved';
                    $message = 'Module card data retrieved successfully.';
                    break;

                
                case 'central_skeleton_sections':
                    
                    $columns = [
                        'id' => 'skeleton_sections.id',
                        'module_id' => 'skeleton_sections.module_id',
                        'module_name' => 'skeleton_modules.name AS module_name',
                        'name' => 'skeleton_sections.name',
                        'is_active' => 'skeleton_sections.is_active',
                        'created_at' => 'skeleton_sections.created_at',
                        'updated_at' => 'skeleton_sections.updated_at',
                    ];
                    $joins = [
                        [
                            'type' => 'left',
                            'table' => 'skeleton_modules',
                            'on' => ['skeleton_sections.module_id', 'skeleton_modules.id']
                        ]
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'is_active',
                            'view' => '::(is_active == 1 ~ "<span class=\"text-green-600 font-semibold\">Active</span>" || "<span class=\"text-red-600 font-semibold\">Inactive</span>")::',
                            'renderHtml' => true
                        ]
                    ];
                    $view = '<div class="card h-100 bg-white shadow-md rounded-lg hover:shadow-lg transition-shadow duration-300"><div class="card-body p-4"><h5 class="card-title text-lg font-bold text-gray-800 mb-2">::name::</h5><p class="card-text text-gray-600 text-sm mb-3">Module: ::module_name::<br>Status: ::is_active::<br>Created: ::created_at::<br>Updated: ::updated_at::</p><a href="#" class="btn bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200">View Section ::id::</a></div></div>';
                    $title = 'Sections Retrieved';
                    $message = 'Section card data retrieved successfully.';
                    break;

                
                case 'central_skeleton_items':
                    
                    $columns = [
                        'id' => 'skeleton_items.id',
                        'section_id' => 'skeleton_items.section_id',
                        'section_name' => 'skeleton_sections.name AS section_name',
                        'module_name' => 'skeleton_modules.name AS module_name',
                        'name' => 'skeleton_items.name',
                        'is_active' => 'skeleton_items.is_active',
                        'created_at' => 'skeleton_items.created_at',
                        'updated_at' => 'skeleton_items.updated_at',
                    ];
                    $joins = [
                        [
                            'type' => 'left',
                            'table' => 'skeleton_sections',
                            'on' => ['skeleton_items.section_id', 'skeleton_sections.id']
                        ],
                        [
                            'type' => 'left',
                            'table' => 'skeleton_modules',
                            'on' => ['skeleton_sections.module_id', 'skeleton_modules.id']
                        ]
                    ];
                    $custom = [
                        [
                            'type' => 'modify',
                            'column' => 'is_active',
                            'view' => '::(is_active == 1 ~ "<span class=\"text-green-600 font-semibold\">Active</span>" || "<span class=\"text-red-600 font-semibold\">Inactive</span>")::',
                            'renderHtml' => true
                        ]
                    ];
                    $view = '<div class="card h-100 bg-white shadow-md rounded-lg hover:shadow-lg transition-shadow duration-300"><div class="card-body p-4"><h5 class="card-title text-lg font-bold text-gray-800 mb-2">::name::</h5><p class="card-text text-gray-600 text-sm mb-3">Module: ::module_name::<br>Section: ::section_name::<br>Status: ::is_active::<br>Created: ::created_at::<br>Updated: ::updated_at::</p><a href="#" class="btn bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200">View Item ::id::</a></div></div>';
                    $title = 'Items Retrieved';
                    $message = 'Item card data retrieved successfully.';
                    break;

                
                default:
                    Developer::warning('CardCtrl: Unsupported configuration key', [
                        'key' => $reqSet['key'],
                        'token' => $token
                    ]);
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/

            
            $params = CardHelper::generateParams($columns, $joins, $conditions, $reqSet);
            $result = Data::filter('central', $reqSet['table'], $params);

            
            if (!$result['status']) {
                Developer::warning('CardCtrl: Data fetch failed', [
                    'message' => $result['message'],
                    'token' => $token,
                    'params' => $params
                ]);
                return ResponseHelper::moduleError('Data Fetch Failed', $result['message'], 500);
            }

            
            return response()->json(array_merge(
                CardHelper::generateResponse($result, $columns, $custom, $reqSet, $view),
                ['title' => $title, 'message' => $message]
            ));
        } catch (Exception $e) {
            Developer::error('CardCtrl: Exception occurred', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'token' => $token ?? 'unknown',
                'request' => $request->except(['password', 'token'])
            ]);
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Failed to retrieve card data.', 500);
        }
    }
}