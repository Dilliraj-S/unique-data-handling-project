<?php
namespace App\Http\Controllers\System\Central\Dashboard;
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, View};

/**
 * Controller for rendering navigation views for the Dashboard module.
 */
class NavCtrl extends Controller
{
    /**
     * Renders dashboard-related views based on route parameters.
     *
     * @param Request $request HTTP request object.
     * @param array $params Route parameters (module, section, item, token).
     * @return \Illuminate\View\View
     */
    public function index(Request $request, array $params)
    {
        try {
            // Extract route parameters
            $baseView = 'system.central.dashboard';
            $module = $params['module'] ?? 'Dashboard';
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
                $viewPath .= '.index';
            }

            // Extract view name and normalize path
            $viewName = str_replace("{$baseView}.", '', $viewPath);
            $viewPath = strtolower($viewPath);
            $viewPath = str_replace(' ', '-', $viewPath);

            // Base data
            $data = ['status' => true, 'module' => $module, 'section' => $section, 'item' => $item, 'token' => $token];

            /****************************************************************************************************
             *                                                                                                  *
             *                              >>> MODIFY THIS SECTION (START) <<<                                   *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($viewName) {
                case 'index':
                    $data['dashboard_list'] = [];
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

            // Render view if it exists
            if (View::exists($viewPath)) {
                return view($viewPath, $data);
            }

            // Return 404 view if view does not exist
            return response()->view('errors.404', []);

        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while loading the page.']);
        }
    }
}