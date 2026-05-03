<?php

namespace App\Http\Controllers\System\Central\Profile;

use App\Http\Controllers\Controller;
use App\Facades\Skeleton;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, View, DB};

/**
 * Controller for rendering navigation views for the Profile module.
 */
class NavCtrl extends Controller
{
    /**
     * Renders dashboard-related views based on route parameters.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters (module, section, item, token)
     * @return \Illuminate\View\View|JsonResponse
     */
    public function index(Request $request, array $params)
    {
        try {
            // Extract route parameters
            $baseView = 'system.' . strtolower('central') . '.' . strtolower('Profile');
            $module = $params['module'] ?? 'Profile';
            $section = $params['section'] ?? null;
            $item = $params['item'] ?? null;
            $token = $params['token'] ?? null;
            // Build view path
            $viewPath = $baseView;
            if ($section) {
                $viewPath .= '.' . $section;
                if ($item) {
                    $viewPath .= '.' . $item;
                }
            } else {
                $viewPath .= '.index';
            }
            // Extract view name and normalize path
            $viewName = str_replace($baseView . '.', '', strtolower($viewPath));
            // $viewPath = strtolower(str_replace(' ', '-', $viewPath));
            // Developer::emergency('hello iam in viewName bye ',['viewName'=>$viewName]);
            // Developer::emergency('hello iam in viewPath bye ',['viewPath'=>$viewPath]);
            // Initialize base data
            $data = [
                'status' => true,
                'module' => $module,
                'section' => $section,
                'item' => $item,
                'token' => $token,
                'title' => 'Page Loaded',
                'message' => 'Profile module page loaded successfully.'
            ];
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different view names
            switch ($viewName) {
                case 'index':
                    $data['dashboard_list'] = [];
                    break;
                case 'profile':
                    $userId = Skeleton::getAuthenticatedUser()->user_id;
                    $userData = DB::table('user_data')->where('user_id', $userId)->first();
                    $user = DB::table('users')->where('user_id', $userId)->first();
                    $data['user_data'] = $userData;
                    $data['user'] = $user;

                    break;
                default:
                    $data['default_message'] = 'Dashboard section loaded';
                    break;
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add authenticated user data
            $data['user'] = Skeleton::getAuthenticatedUser();
            // Render view if it exists
            if (View::exists($viewPath)) {
                return view($viewPath, $data);
            }
            // Return 404 view if view does not exist
            return response()->view('errors.404', ['status' => false, 'title' => 'Page Not Found', 'message' => 'The requested page does not exist.'], 404);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while loading the page.', 500);
        }
    }
}
