<?php

namespace App\Http\Controllers\System\Central\MainMenu;

use App\Models\Central\EmailSystem\DriftSequenceLog;


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
                        // Execute independent queries in parallel using Laravel's collection
                        $results = collect([
                            'userCount' => \App\Facades\CentralDB::table('users')
                                ->whereNull('deleted_at')
                                ->count('user_id'),
                            'needToAction' => 
                            DB::table('sun.master_leads')->where('need_to_action', 1)->count() +
                            DB::table('sun.master_accounts')->where('need_to_action', 1)->count(),
                            'productCount' => DB::table('products')->whereNull('deleted_at')->count(),
                            'allDatabases' => DB::connection('central')->select("SHOW DATABASES"),
                            'newsFeed' => DB::connection('central')
                                ->table('news_feeds')
                                ->orderByDesc('created_at')
                                ->get(),
                            'uniqueusers' => DB::connection('central')
                                ->table('users')
                                ->leftJoin('user_data', 'users.user_id', '=', 'user_data.user_id')
                                ->select('users.*', 'user_data.gender')
                                ->orderByDesc('users.created_at')
                                ->get(),
                            'masterlead' => DB::connection('central')
                                ->selectOne("SELECT COUNT(id) as total FROM `sun`.`master_leads`"),
                            'masteraccount' => DB::connection('central')
                                ->selectOne("SELECT COUNT(id) as total FROM `sun`.`master_accounts`"),
                            'emailaccounts' => DB::connection('central')
                                ->selectOne("SELECT COUNT(id) as total FROM `pluto`.`email_accounts`"),
                            'mailssent' => DB::connection('central')
                                ->selectOne("SELECT COUNT(id) as total FROM `pluto`.`drift_sequence_logs` WHERE `sent_at` IS NOT NULL"),
                            'unsubscribe' => DB::connection('central')
                                ->selectOne("SELECT COUNT(id) as total FROM `pluto`.`emails` WHERE `status` = 'unsubscribe'"),
                        ]);

                        // Filter databases once
                        $databaseListRaw = collect($results['allDatabases'])
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
                            });

                        // Process databases with error handling
                        $databaseList = $databaseListRaw->map(function ($dbName) {
                            try {
                                $tables = DB::connection('central')->select("SHOW TABLES FROM `$dbName`");
                                $tableKey = 'Tables_in_' . $dbName;

                                $tableData = collect($tables)->map(function ($tableRow) use ($dbName, $tableKey) {
                                    $tableName = $tableRow->$tableKey;
                                    $columns = DB::connection('central')->select("SHOW COLUMNS FROM `$dbName`.`$tableName`");
                                    $columnNames = collect($columns)->pluck('Field')->toArray();

                                    return [
                                        'name' => $tableName,
                                        'columns' => $columnNames,
                                        'column_count' => count($columnNames)
                                    ];
                                });

                                return [
                                    'name' => $dbName,
                                    'table_count' => $tableData->count(),
                                    'tables' => $tableData->toArray()
                                ];
                            } catch (Exception $e) {
                                return [
                                    'name' => $dbName,
                                    'table_count' => 'Error',
                                    'tables' => []
                                ];
                            }
                        });

                        $sunTableCount = $databaseList
                            ->filter(function ($db) {
                                return str_starts_with($db['name'], 'sun_');
                            })
                            ->sum('table_count');

                        // Integrate quota logic

                        $accounts = DB::connection('pluto')
                            ->table('email_accounts')
                            ->where('status', 'active')
                            ->select('id', 'email', 'daily_send_limit')
                            ->get();

                        $totalLimit = 0;
                        $totalUsed = 0;

                        foreach ($accounts as $account) {
                            $account->sent_in_last_24h = DriftSequenceLog::on('pluto')
                                ->where('email_account_id', $account->id)
                                ->where('sent_at', '>=', now()->subDay())
                                ->count();

                            $totalLimit += $account->daily_send_limit;
                            $totalUsed += $account->sent_in_last_24h;
                        }

                        $data = [
                            'databaseCount' => $databaseList->count(),
                            'userCount' => $results['userCount'],
                            'databaseList' => $databaseList->toArray(),
                            'newsFeed' => $results['newsFeed'],
                            'needtoaction' => $results['needToAction'],
                            'productCount' => $results['productCount'],
                            'sunTableCount' => $sunTableCount,
                            'leadsCount' => $results['masterlead']->total ?? 0,
                            'accountCount' => $results['masteraccount']->total ?? 0,
                            'emailaccounts' => $results['emailaccounts']->total ?? 0,
                            'mailssent' => $results['mailssent']->total ?? 0,
                            'unsubscribe' => $results['unsubscribe']->total ?? 0,
                            'uniqueusers' => $results['uniqueusers'],
                            'total_used' => (int) $totalUsed,
                            'total_limit' => (int) $totalLimit,
                            'accounts' => $accounts->toArray(),
                        ];
                    } else {
                        $data = [
                            'databaseCount' => 0,
                            'userCount' => 0,
                            'databaseList' => [],
                            'newsFeed' => collect(),
                            'needtoaction' => 0,
                            'productCount' => 0,
                            'sunTableCount' => 0,
                            'leadsCount' => 0,
                            'accountCount' => 0,
                            'emailaccounts' => 0,
                            'mailssent' => 0,
                            'unsubscribe' => 0,
                            'users' => collect(),
                            'total_used' => 0,
                            'total_limit' => 0,
                            'accounts' => [],
                        ];
                    }
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
