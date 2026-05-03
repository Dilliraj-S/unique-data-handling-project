<?php
namespace App\Http\Controllers\System\Central\MainMenu;
use App\Facades\Developer;
use App\Http\Controllers\Controller;
use App\Facades\Skeleton;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config, View, DB;
/**
 * Controller for rendering navigation views for the MainMenu module.
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
            $baseView = 'system.' . strtolower('central') . '.' . strtolower('Main-Menu');
            $module = $params['module'] ?? 'MainMenu';
            $section = $params['section'] ?? null;
            $item = $params['item'] ?? null;
            $token = $params['token'] ?? null;
            $viewPath = $baseView;
            if ($section) {
                $viewPath .= '.' . $section;
                if ($item) {
                    $viewPath .= '.' . $item;
                }
            } else {
                $viewPath .= '.index';
            }
            $viewName = strtolower(str_replace(' ', '-', str_replace("{$baseView}.", '', $viewPath)));
            $viewPath = strtolower(str_replace(' ', '-', $viewPath));  
            $data = [
                'status' => true,
                'module' => $module,
                'section' => $section,
                'item' => $item,
                'token' => $token,
                'title' => 'Page Loaded',
                'message' => 'MainMenu module page loaded successfully.'
            ];
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($viewName) {
                case 'dashboard':
                    $system = Skeleton::getUserSystem();
                    if ($system === 'central') {
                        $userCount = \App\Facades\CentralDB::table('users')
                            ->whereNull('deleted_at')
                            ->count('user_id');
                        $allDatabases = \DB::connection('central')->select("SHOW DATABASES");
                        $needToAction = \DB::table('need_to_action')->whereNull('deleted_at')->count();
                        $productCount = \DB::table('products')->whereNull('deleted_at')->count();
                        $databaseListRaw = collect($allDatabases)
                            ->pluck('Database')
                            ->reject(function ($db) {
                                return in_array($db, [
                                    'information_schema',
                                    'performance_schema',
                                    'mysql',
                                    'sys',
                                    'phpmyadmin',
                                    'test'
                                ]);
                            })
                            ->values();
                        $databaseList = [];
                        foreach ($databaseListRaw as $dbName) {
                            try {
                                $tables = \DB::connection('central')->select("SHOW TABLES FROM `$dbName`");
                                $tableKey = 'Tables_in_' . $dbName;
                                $tableData = [];
                                foreach ($tables as $tableRow) {
                                    $tableName = $tableRow->$tableKey;
                                    $columns = \DB::connection('central')->select("SHOW COLUMNS FROM `$dbName`.`$tableName`");
                                    $columnNames = collect($columns)->pluck('Field')->toArray();
                                    $tableData[] = [
                                        'name' => $tableName,
                                        'columns' => $columnNames,
                                        'column_count' => count($columnNames)
                                    ];
                                    $masterlead = \DB::connection('central')->selectOne("SELECT COUNT(id) as total FROM `sun`.`master_leads`");
                                    $leadsCount = $masterlead->total;
                                    $masteraccount = \DB::connection('central')->selectOne("SELECT COUNT(id) as total FROM `sun`.`master_accounts`");
                                    $accountCount = $masteraccount->total;
                                }
                                $databaseList[] = [
                                    'name' => $dbName,
                                    'table_count' => count($tableData),
                                    'tables' => $tableData
                                ];
                            } catch (\Exception $e) {
                                $databaseList[] = [
                                    'name' => $dbName,
                                    'table_count' => 'Error',
                                    'tables' => []
                                ];
                            }
                        }
                        $databaseCount = count($databaseList);
                        $sunTableCount = collect($databaseList)
                            ->filter(function ($db) {
                                return str_starts_with($db['name'], 'sun_');
                            })
                            ->sum('table_count');
                        $newsFeed = \DB::connection('central')
                            ->table('news_feeds')
                            ->orderByDesc('created_at')
                            ->get();
                            $users = \DB::connection('central')
                            ->table('users')
                            ->orderByDesc('created_at')
                            ->get();
                    }
                    $data['databaseCount'] = $databaseCount ?? 0;
                    $data['userCount'] = $userCount;
                    $data['databaseList'] = $databaseList ?? [];
                    $data['newsFeed'] = $newsFeed ?? collect();
                    $data['needtoaction'] = $needToAction;
                    $data['productCount'] = $productCount;
                    $data['sunTableCount'] = $sunTableCount;
                    $data['leadsCount'] = $leadsCount;
                    $data['accountCount'] = $accountCount;
                    $data['users'] = $users;
                    break;
                default:
                    break;
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            $data['user'] = Skeleton::getAuthenticatedUser();
            if (View::exists($viewPath)) {
                return view($viewPath, $data);
            }
            return response()->view('errors.404', [
                'status' => false,
                'title' => 'Page Not Found',
                'message' => 'The requested page does not exist.'
            ], 404);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while loading the page.', 500);
        }
    }
}