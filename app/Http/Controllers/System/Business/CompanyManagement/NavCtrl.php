<?php

namespace App\Http\Controllers\System\Business\CompanyManagement;

use App\Facades\{Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use App\Models\Business\Company;
use Illuminate\Support\Facades\DB;
use App\Models\Business\Branches;
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
            $baseView = 'system.business.company-management';
            $module = $params['module'] ?? 'company-management';
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
                $viewPath .= '.companies';
            }

            // Extract view name and normalize path
            $viewPath = strtolower($viewPath);
            $viewPath = str_replace(' ', '-', $viewPath);
            $viewName = str_replace("{$baseView}.", '', $viewPath);



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
            $viewparts = explode('.', $viewName);
            $blade = end($viewparts);
            switch ($blade) {
                case 'index':
                    $data['dashboard_list'] = [];
                    break;

                case 'branches':
                    $params = [
                        'columns' => ['id', 'company_id', 'name'],
                    ];
                    $response = Data::get('business', 'companies', $params);
                    $data['companies'] = $response['status'] ? $response['data'] : [];
                    break;


                case 'business_departments':
                    $params = [
                        'columns' => ['id', 'branch_id', 'name'],
                    ];
                    $response = Data::get('business', 'branches', $params);
                    $data['branches'] = $response['status'] ? $response['data'] : [];
                    break;

                case 'business_designations':
                    $params = [
                        'columns' => ['id', 'department_id', 'department'],
                    ];
                    $response = Data::get('business', 'departments', $params);
                    $data['departments'] = $response['status'] ? $response['data'] : [];
                    break;
                    
                case 'policies':
                    $params = [
                        'columns' => ['id', 'title', 'description'],
                    ];
                    $response = Data::get('business', 'policies', $params);
                    $data['policies'] = $response['status'] ? $response['data'] : [];
                    Developer::info($data['policies']);
                    break;

                case 'business_customize':
                    $row = DB::select("SELECT id, copyright_text, designed_by_text FROM infosysdb.customize LIMIT 1");
                    $data['customize'] = count($row) > 0 ? (object) $row[0] : null;
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
