<?php

namespace App\Http\Controllers\System\Central\QueryChain;

use App\Http\Controllers\Controller;
use App\Facades\Skeleton;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, View, DB};

/**
 * Controller for rendering navigation views for the QueryChain module.
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
            $baseView = 'system.' . strtolower('central') . '.' . strtolower('Query-Chain');
            $module = $params['module'] ?? 'QueryChain';
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
            $viewName = str_replace("{$baseView}.", '', strtolower($viewPath));
            $viewPath = strtolower(str_replace(' ', '-', $viewPath));
            $data = [
                'status' => true,
                'module' => $module,
                'section' => $section,
                'item' => $item,
                'token' => $token,
                'title' => 'Page Loaded',
                'message' => 'QueryChain module page loaded successfully.'
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
                case 'master flows':
                    $data['title'] = 'Master Process';
                    $data['message'] = 'Master Process view loaded successfully.';
                    $rows = DB::select('SELECT * FROM moon.workflows');
                    $data['workflows'] = array_map(function ($workflow) {
                        return [
                            'id' => (int) $workflow->id,
                            'flow_id' => $workflow->flow_id ?? null,
                            'identifier' => $workflow->identifier ?? $workflow->name,
                            'name' => $workflow->name ?? 'Unnamed Workflow',
                            'type' => in_array($workflow->type, ['wf', 'wmf', 'mf']) ? $workflow->type : 'wf',
                            'required_headers' => json_decode($workflow->required_headers, true) ?? [],
                        ];
                    }, $rows);
                    $data['workflows'] = array_values($data['workflows']);
                    $processId = request()->input('process_id');
                    if ($processId) {
                        $processDefs = DB::select('SELECT * FROM moon.processes WHERE process_id = ? AND deleted_at IS NULL', [$processId]);
                    } else {
                        $processDefs = DB::select('SELECT * FROM moon.processes WHERE deleted_at IS NULL');
                    }
                    $data['processDef'] = array_map(function ($process) {
                        return [
                            'id' => (int) $process->id,
                            'process_id' => $process->process_id,
                            'name' => $process->name,
                            'flows' => array_filter(explode(',', $process->flows ?? '')),
                            'mode' => $process->mode ?? 'flow',
                            'input_source' => $process->input_source ?? 'csv',
                            'output_target' => $process->output_target ?? 'csv',
                            'support_table' => array_filter(explode(',', $process->support_table ?? '')),
                        ];
                    }, $processDefs);
                    $data['processDef'] = array_values($data['processDef']);
                    $data['allowed_databases'] = array_filter(explode(',', Skeleton::getAuthenticatedUser()->access_db ?? ''));
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
