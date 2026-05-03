<?php

namespace App\Http\Controllers\System\Business\ShiftManagement;

use App\Facades\{Developer, Skeleton};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log, View};

/**
 * Controller for rendering navigation views for the Developer module.
 */
class NavCtrl extends Controller
{
    /**
     * Renders dashboard-related views based on route parameters.
     *
     * @param Request $request HTTP request object.
     * @param array $params Route parameters (module, section, item, token).
     * @return \Illuminate\View\View|JsonResponse
     */
    public function index(Request $request, array $params)
    {
        try {
            // Extract route parameters
            $baseView = 'system.business.shift-management';
            $module = $params['module'] ?? 'shift-management';
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
                $viewPath .= '.shifts';
            }

            // Extract view name and normalize path
            $viewName = str_replace("{$baseView}.", '', $viewPath);
            $viewPath = strtolower($viewPath);
            $viewPath = str_replace(' ', '-', $viewPath);


            // Log navigation details for debugging
            if (Config::get('skeleton.developer_mode')) {
                Log::debug('NavCtrl: Navigation details', [
                    'module' => $module,
                    'section' => $section,
                    'item' => $item,
                    'token' => $token,
                    'viewPath' => $viewPath
                ]);
            }

            // Base data
            $data = ['status' => true, 'module' => $module, 'section' => $section, 'item' => $item, 'token' => $token];

            /****************************************************************************************************
             *                              >>> MODIFY THIS SECTION (START) <<<                                 *
             ****************************************************************************************************/
            switch ($viewName) {
                case 'index':
                    $data['dashboard_list'] = [];
                    break;
                default:
                    $data['default_message'] = 'Developer section loaded';
                    break;
            }
            /****************************************************************************************************
             *                               >>> MODIFY THIS SECTION (END) <<<                                  *
             ****************************************************************************************************/

            // Render view if it exists
            if (View::exists($viewPath)) {
                return view($viewPath, $data);
            }

            // Handle view not found
            if (Config::get('skeleton.developer_mode')) {
                Log::info('NavCtrl: View not found', ['viewPath' => $viewPath]);
            }
            return response()->json(['status' => false, 'title' => 'Page Not Found', 'message' => 'The requested page was not found.']);
        } catch (Exception $e) {
            if (Config::get('skeleton.developer_mode')) {
                Log::error('NavCtrl: Error', [
                    'error' => $e->getMessage(),
                    'path' => $request->path(),
                    'params' => $params
                ]);
            }
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while loading the page.']);
        }
    }
}
