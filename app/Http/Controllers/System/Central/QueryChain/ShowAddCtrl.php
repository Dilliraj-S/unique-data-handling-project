<?php

namespace App\Http\Controllers\System\Central\QueryChain;

use App\Facades\{Data, Developer, Random, Skeleton, Select};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, DB};

/**
 * Controller for rendering the add form for QueryChain entities.
 */
class ShowAddCtrl extends Controller
{
    /**
     * Renders a popup form for adding new QueryChain entities.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            $popup = [];
            $system = ['central' => 'Central', 'business' => 'Business'];
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'central_unique_database':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'name', 'maxlength' => '255',]],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['1' => 'Active', '0' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'required' => true, 'col' => '12',],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add QueryChain Entity',
                        'button' => 'Save Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                   

                case 'central_unique_processes':
                    $condition = [
                        'where' => [
                            'moon.workflows.type' => ['mf', 'wmf'],
                        ]
                    ];
                    $set = Select::options('moon.workflows', 'array', ['name' => 'name'], $condition);
                    Developer::info($set);
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Process Name', 'required' => true, 'col' => '6', 'attr' => ['maxlength' => '255']],
                            ['type' => 'select', 'name' => 'flows', 'label' => 'Flows', 'required' => true, 'col' => '6', 'options' => $set, 'attr' => ['data-select' => 'dropdown', 'multiple' => 'multiple']],
                            ['type' => 'select', 'name' => 'input_source', 'label' => 'Input Source', 'required' => false, 'col' => '6', 'options' => ['csv' => 'CSV (.csv file)', 'db' => 'Database'], 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'output_target', 'label' => 'Output Target', 'required' => false, 'col' => '6', 'options' => ['csv' => 'CSV (.csv file)', 'excel' => 'Excel (.xlsx file)', 'db' => 'Database'], 'attr' => ['data-select' => 'dropdown']]
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Process!',
                        'button' => 'Save Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'unique_process_logs':
                    // Follow the reference design pattern (central_skeleton_modules)
                    // Process dropdown should list distinct process_id values from process_logs
                    $processOptions = ['' => 'Select Process'];
                    try {
                        // Query the moon.process_logs table specifically
                        $distinctProcesses = DB::table('moon.process_logs')
                            ->select('process_id')
                            ->distinct()
                            ->whereNotNull('process_id')
                            ->where('process_id', '!=', '')
                            ->get();
                        
                        foreach ($distinctProcesses as $process) {
                            $processOptions[$process->process_id] = $process->process_id;
                        }
                    } catch (Exception $e) {
                        Developer::error('Failed to fetch distinct process IDs from moon.process_logs', ['error' => $e->getMessage()]);
                        $processOptions = [];
                    }
                    
                    // Get user's accessible databases like in delete forms
                    $user = Skeleton::getAuthenticatedUser();
                    $allowedDatabases = $user->access_db ?? '';
                    $databaseOptions = ['' => 'Select Database'];
                    if ($allowedDatabases) {
                        $databases = explode(',', $allowedDatabases);
                        foreach ($databases as $db) {
                            $databaseOptions[trim($db)] = trim($db);
                        }
                    }
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'process_id', 'label' => 'Select Process', 'required' => true, 'col' => '12', 'options' => $processOptions, 'attr' => ['data-select' => 'dropdown', 'data-value' => '']],
                            ['type' => 'select', 'name' => 'database', 'label' => 'Database', 'required' => false, 'col' => '6', 'options' => $databaseOptions, 'attr' => ['data-select' => 'dropdown', 'data-target' => Skeleton::skeletonToken('central_unique_database') . '_s', 'data-value' => '']],
                            ['type' => 'select', 'name' => 'table', 'label' => 'Table', 'required' => false, 'col' => '6', 'options' => ['' => 'Select Table'], 'attr' => ['data-select' => 'dynamic', 'data-source' => Skeleton::skeletonToken('central_unique_database') . '_s', 'data-target' => Skeleton::skeletonToken('central_unique_columns') . '_s', 'data-value' => '']],
                            ['type' => 'select', 'name' => 'database2', 'label' => 'Database 2', 'required' => false, 'col' => '6', 'options' => $databaseOptions, 'attr' => ['data-select' => 'dropdown', 'data-target' => Skeleton::skeletonToken('central_unique_database') . '_s2', 'data-value' => '']],
                            ['type' => 'select', 'name' => 'table2', 'label' => 'Table 2', 'required' => false, 'col' => '6', 'options' => ['' => 'Select Table'], 'attr' => ['data-select' => 'dynamic', 'data-source' => Skeleton::skeletonToken('central_unique_database') . '_s2', 'data-target' => Skeleton::skeletonToken('central_unique_columns') . '_s2', 'data-value' => '']],
                            ['type' => 'label', 'name' => 'label', 'label' => 'Move Data', 'required' => false, 'col' => '4'],
                            ['type' => 'switch', 'name' => 'master_leads', 'label' => 'Master Leads', 'required' => false, 'col' => '4'],
                            ['type' => 'switch', 'name' => 'master_accounts', 'label' => 'Master Accounts', 'required' => false, 'col' => '4'],
                           
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Transfer Data',
                        'button' => 'MoveData',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                    
                    
              
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            $content = $popup['form'] === 'builder' ? PopupHelper::generateBuildForm($token, $popup['fields'], $popup['labelType']) : $popup['content'];
            return response()->json([
                'token' => $token,
                'type' => $popup['type'],
                'size' => $popup['size'],
                'position' => $popup['position'],
                'label' => $popup['label'],
                'content' => $content,
                'script' => $popup['script'],
                'button_class' => $popup['button_class'] ?? '',
                'button' => $popup['button'] ?? '',
                'footer' => $popup['footer'] ?? '',
                'header' => $popup['header'] ?? '',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true,
                'title' => 'Form Generated',
                'message' => 'Add form for ' . $reqSet['key'] . ' generated successfully.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
