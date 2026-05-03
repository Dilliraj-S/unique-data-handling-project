<?php

namespace App\Http\Controllers\System\Business\Profile;

use App\Http\Controllers\Controller;
use Illuminate\Http\{Request, Response};
use Illuminate\Support\Facades\{Auth, Cache, Crypt, DB, Log, Session, Storage, Validator, View};

/* Exceptions */
use Exception;
use App\Exceptions\ExceptionHelper;
use App\Facades\{Developer, Skeleton, Data};
/* Helpers */
use App\Http\Classes\{
    UserHelper,
    SelectHelper,
    SkeletonHelper
};
/* Models */
use App\Models\User;

/**
 * Navigation controller for supreme Dashboard module
 * Handles rendering of all dashboard-related views
 */

class NavCtrl extends Controller
{
    /**
     * Renders views for Dashboard module based on route parameters
     *
     * @param Request $request
     * @param array $params Route parameters (module, section, item, token)
     * @return \Illuminate\View\View|\Illuminate\Http\JsonResponse
     */
    public function index(Request $request, array $params)
    {
        try {
            $baseView = 'system.business.profile';
            $module = $params['module'] ?? 'dashboard';
            $section = $params['section'] ?? null;
            $item = $params['item'] ?? null;
            $token = $params['token'] ?? null;

            // Build view path
            $viewPath = $baseView;
            if ($section) {
                $viewPath .= ".{$section}";
                if ($item) {
                    $viewPath .= ".{$item}";
                }
            } else {
                $viewPath .= '.profile';
            }

            // Extract view name without base path
           $viewPath = strtolower(str_replace(' ', '-', $viewPath)); 
           $viewName = str_replace("{$baseView}.", '', $viewPath);  
         Developer::emergency('helloo iam in nav',['view_path'=>$viewPath]);
            Developer::emergency('helloo iam in nav',['view_base'=>$baseView]);
            Developer::emergency('helloo iam in nav',['view_name'=>$viewName]);

            // Base data
            $data = [
                'status' => true,
                'module' => $module,
                'section' => $section,
                'item' => $item,
                'token' => $token,
            ];

            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($viewName) {
                case 'index':
                    $data['dashboard_list'] = [];
                    break;

                       case 'profile':
                    $userId = Skeleton::getAuthenticatedUser()->user_id;

                    // Fetch user_profile data
                    $userProfileResponse = Data::get('business', 'employee_details', [
                        'where' => [
                            ['user_id', '=', $userId]
                        ]
                    ]);
                    $userProfile = null;
                    if ($userProfileResponse['status'] && !empty($userProfileResponse['data'])) {
                        $userProfile = $userProfileResponse['data'][0];
                        // Decode JSON fields
                        $userProfile->bank_accounts = $userProfile->bank_accounts ? json_decode($userProfile->bank_accounts, true) : [];
                        $userProfile->family_info = $userProfile->family_info ? json_decode($userProfile->family_info, true) : [];
                        $userProfile->educational_info = $userProfile->educational_info ? json_decode($userProfile->educational_info, true) : [];
                        $userProfile->experience = $userProfile->experience ? json_decode($userProfile->experience, true) : [];
                        $userProfile->social_links = $userProfile->social_links ? json_decode($userProfile->social_links, true) : [];
                        $userProfile->emergency_contact = $userProfile->emergency_contact ? json_decode($userProfile->emergency_contact, true) : [];
                        $userProfile->skills = $userProfile->skills ? array_map('trim', explode(',', $userProfile->skills)) : [];
                        $userProfile->languages = $userProfile->languages ? array_map('trim', explode(',', $userProfile->languages)) : [];
                        $userProfile->hobbies = $userProfile->hobbies ? array_map('trim', explode(',', $userProfile->hobbies)) : [];
                    }

                    // Fetch employees data
                    $employeeResponse = Data::get('business', 'employees', [
                        'where' => [
                            ['user_id', '=', $userId]
                        ],
                        'columns' => [
                            'first_name',
                            'last_name',
                            'email',
                            'phone',
                            'joined_date',
                            'role_id',
                            'employee_id'
                        ]
                    ]);
                    // $employeeResponse['data']->employee_id=SelectHelper::getValue('business', 'employees', ['employee_id'=>$employeeResponse['data']->employee_id], 'name');
                    //  Developer::info($employeeResponse['data']->employee_id);
                    $employee = null;
                    if ($employeeResponse['status'] && !empty($employeeResponse['data'])) {
                        $employee = $employeeResponse['data'][0];
                    }
                    // Fetch employee_work data (using employee_id from employees if available)
                    $employeeWork = null;
                    if ($employee && !empty($employee->employee_id)) {
                        $employeeWorkResponse = Data::get('business', 'employee_work', [
                            'where' => [
                                ['employee_id', '=', $employee->employee_id]
                            ],
                            'columns' => [
                                'department_id',
                                'designation_id',
                                'max_leaves',
                                'account_status'
                            ]
                        ]);
                        if ($employeeWorkResponse['status'] && !empty($employeeWorkResponse['data'])) {
                            $employeeWork = $employeeWorkResponse['data'][0];
                        }
                    }

                    // Log responses for debugging
                    // Developer::emergency('helloo iam in nav', [
                    //     'user_profile_response' => $userProfileResponse,
                    //     'employee_response' => $employeeResponse,
                    //     'employee_work_response' => $employeeWorkResponse ?? null
                    // ]);

                    // Pass data to view
                    $data['user_profile'] = $userProfile ?: (object) [];
                    $data['employee'] = $employee ?: (object) [];
                    $data['employee_work'] = $employeeWork ?: (object) [];
                    // Overriding the IDs
                    
                    $employee->role_id=SelectHelper::getValue('business', 'roles', ['id' => $employee->role_id], 'name');
                    $employeeWork->department_id=SelectHelper::getValue('business', 'departments', ['department_id'=>$employeeWork->department_id],'department');
                    $employeeWork->designation_id=SelectHelper::getValue('business', 'designations', ['designation_id'=>$employeeWork->designation_id],'designation');


                    break;
                    
          
                default:
                    $data['default_message'] = 'Dashboard section loaded';
                    break;
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                              >>> MODIFY THIS SECTION (END) <<<                                   *
             *                                                                                                  *
             ****************************************************************************************************/

            if (View::exists($viewPath)) {
                return view($viewPath, $data);
            }

            return $this->handleError($request, 'Page not found.', Response::HTTP_NOT_FOUND);
        } catch (Exception $e) {
            Log::error('Error in NavCtrl.', ['error' => $e->getMessage(), 'path' => $request->path()]);
            return $this->handleError($request, config('developer.mode') ? $e->getMessage() : 'Internal server error.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Handles errors with developer mode support.
     *
     * @param Request $request
     * @param string $message
     * @param int $statusCode
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\Response
     */
    private function handleError(Request $request, string $message, int $statusCode)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => $message,
            ], $statusCode);
        }

        // Render error view based on status code
        $errorView = "errors.{$statusCode}";
        if (View::exists($errorView)) {
            return response()->view($errorView, ['error' => $message], $statusCode);
        }

        // Fallback to generic error view
        return response()->view('errors.generic', ['error' => $message, 'status' => $statusCode], $statusCode);
    }
}