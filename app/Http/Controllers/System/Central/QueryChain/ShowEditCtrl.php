<?php

namespace App\Http\Controllers\System\Central\QueryChain;

use App\Facades\{Data, Developer, Random, Skeleton, Select};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};

/**
 * Controller for rendering the edit form for QueryChain entities.
 */
class ShowEditCtrl extends Controller
{
    /**
     * Renders a popup form for editing QueryChain entities.
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
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => [$reqSet['act'] => $reqSet['id']]]);
            $dataItem = $result['data'][0] ?? null;
            $data = is_array($dataItem) ? (object) $dataItem : $dataItem;
            if (!$data) {
                return ResponseHelper::moduleError('Record Not Found', 'The requested record was not found.', 404);
            }
            $popup = [];
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
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'value' => $data->name, 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'name', 'maxlength' => '100', 'readonly' => 'readonly']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'status', 'options' => ['1' => 'Active', '0' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->status]],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $data->description, 'col' => '12', 'attr' => ['data-validate' => 'name',]],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit QueryChain Entity',
                        'button' => 'Update Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                case 'central_unique_workflows':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'value' => $data->name, 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'name', 'maxlength' => '100']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type',  'options' => ['wf' => 'Workflow', 'mf' => 'MasterFlow', 'wmf' => 'Both'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->type]],
                            ['type' => 'textarea', 'name' => 'required_headers', 'label' => 'Required Headers (comma-separated)', 'value' => is_string($data->required_headers) ? implode(', ', json_decode($data->required_headers, true) ?? []) : '', 'required' => false, 'col' => '6', 'attr' => ['rows' => 4, 'placeholder' => 'e.g. first_name, last_name']],
                            ['type' => 'textarea', 'name' => 'mapping_headers', 'label' => 'Mapping Headers (comma-separated)', 'value' => is_string($data->mapping_headers) ? implode(', ', json_decode($data->mapping_headers, true) ?? []) : '', 'required' => false, 'col' => '6', 'attr' => ['rows' => 4, 'placeholder' => 'e.g. company_name, domain']],
                            ['type' => 'textarea', 'name' => 'update_headers', 'label' => 'Update Headers (comma-separated)', 'value' => is_string($data->update_headers) ? implode(', ', json_decode($data->update_headers, true) ?? []) : '', 'required' => false, 'col' => '12', 'attr' => ['rows' => 4, 'placeholder' => 'e.g. street, city, zip']],
                            ['type' => 'checkbox', 'name' => 'mandatory', 'label' => 'Mandatory', 'value' => $data->mandatory ? 1 : 0, 'options' => [1 => 'Mandatory'], 'col' => '8'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Workflow Configuration',
                        'button' => 'Update Config',
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
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Process Name', 'value' => $data->name ?? '', 'required' => true, 'col' => '6', 'attr' => ['maxlength' => '255']],
                            ['type' => 'select', 'name' => 'flows', 'label' => 'Flows', 'required' => true, 'col' => '6', 'options' => $set, 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->flows, 'multiple' => 'multiple']],
                            ['type' => 'select', 'name' => 'input_source', 'label' => 'Input Source', 'value' => $data->input_source ?? '', 'required' => false, 'col' => '6', 'options' => ['csv' => 'CSV (.csv file)', 'db' => 'Database'], 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'output_target', 'label' => 'Output Target', 'value' => $data->output_target ?? '', 'required' => false, 'col' => '6', 'options' => ['csv' => 'CSV (.csv file)', 'excel' => 'Excel (.xlsx file)', 'db' => 'Database'], 'attr' => ['data-select' => 'dropdown']]
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Process',
                        'button' => 'Update Process',
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
                'message' => 'Edit form for ' . $reqSet['key'] . ' generated successfully.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
