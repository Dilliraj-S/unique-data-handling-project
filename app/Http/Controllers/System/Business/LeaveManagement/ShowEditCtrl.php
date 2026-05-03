<?php

namespace App\Http\Controllers\System\Business\LeaveManagement;

use App\Facades\{CentralDB, BusinessDB, Select, Developer, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\PopupHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};

/**
 * Controller for rendering the edit form for developer entities.
 */
class ShowEditCtrl extends Controller
{
    /**
     * Renders a popup form for editing developer entities.
     *
     * @param Request $request HTTP request object.
     * @param array $params Route parameters with token.
     * @return JsonResponse Form configuration or error message.
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
           
            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
            }
            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
            }

            // Fetch existing data
            Developer::alert('reqset in lve',['reqset'=>$reqSet['id']]);

            $data = BusinessDB::table($reqSet['table'])->where($reqSet['act'], $reqSet['id'])->first();

            if (!$data) {
                return response()->json(['status' => false, 'title' => 'Record Not Found', 'message' => 'The requested record was not found.']);
            }
            // Log user activity and field values for debugging
            Developer::info(Skeleton::getAuthenticatedUser()->user_id);

            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            $popup = null;
            switch ($reqSet['key']) {
                case 'central_skeleton_tokens':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $modules = CentralDB::table('skeleton_modules')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'key', 'label' => 'Key', 'value' => $data->key, 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'key', 'maxlength' => '100', 'data-unique' => Skeleton::skeletonToken('central_skeleton_tokens_unique') . '_u', 'data-unique-msg' => 'This key is already registered']],
                            ['type' => 'select', 'name' => 'module', 'label' => 'Module', 'options' => $modules, 'value' => (string)$data->module, 'required' => true, 'col' => '12', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'select', 'name' => 'system', 'label' => 'System', 'options' => $system, 'value' => (string)$data->system, 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'value' => (string)$data->type, 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'text', 'name' => 'table', 'label' => 'Table', 'value' => $data->table, 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'key', 'maxlength' => '100']],
                            ['type' => 'text', 'name' => 'column', 'label' => 'Column', 'value' => $data->column, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'value', 'label' => 'Value', 'value' => $data->value, 'required' => true, 'col' => '4'],
                            ['type' => 'select', 'name' => 'validate', 'label' => 'Validate', 'options' => ['0' => 'No', '1' => 'Yes'], 'value' => (string)$data->validate, 'required' => true, 'col' => '4', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'text', 'name' => 'act', 'label' => 'Action Column', 'value' => $data->act, 'required' => true, 'col' => '4'],
                            ['type' => 'select', 'name' => 'actions', 'label' => 'Actions', 'options' => ['c' => 'Checkbox', 'v' => 'View', 'e' => 'Edit', 'd' => 'Delete'], 'value' => $data->actions ? str_split($data->actions) : [], 'col' => '12', 'attr' => ['data-source' => 'dropdown', 'multiple' => 'multiple']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Token',
                        'button' => 'Update Token',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                case 'business_manage_leave':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => [
                                'pending' => 'Pending',
                                'approved' => 'Approved',
                                'rejected' => 'Rejected',
                            ], 'required' => true, 'col' => '6'],
                            ['type' => 'date', 'name' => 'approved_at', 'label' => 'Approved At', 'required' => false, 'col' => '6'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Update Leave Status',
                        'button' => 'Save Status',
                        'script' => 'window.skeleton.select();window.skeleton.unique()'
                    ];
                    break;
                    case 'business_leave_requests':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'sno', 'label' => 'SNO', 'required' => true, 'col' => '6','value' => $data->sno],
                            ['type' => 'select', 'name' => 'company_id', 'label' => 'Company ID', 'options' => Select::options('companies', 'array', ['company_id' => 'name']), 'required' => true, 'col' => '6','value' => $data->company_id],
                            ['type' => 'select', 'name' => 'branch_id', 'label' => 'Branch ID', 'options' => Select::options('branches', 'array', ['branch_id' => 'name']), 'required' => true, 'col' => '6','value' => $data->branch_id],
                            ['type' => 'select', 'name' => 'employee_id', 'label' => 'Employee ID', 'required' => true, 'col' => '6', 'options' => Select::options('employees', 'array', ['employee_id' => 'first_name']),'value' => $data->employee_id],
                            ['type' => 'date', 'name' => 'start_date', 'label' => 'Start Date', 'required' => true, 'col' => '6','value' => $data->start_date],
                            ['type' => 'date', 'name' => 'end_date', 'label' => 'End Date', 'required' => true, 'col' => '6','value' => $data->end_date],
                            ['type' => 'select', 'name' => 'leave_type', 'label' => 'Leave Type', 'options' => ['sick' => 'Sick', 'casual' => 'Casual', 'earned' => 'Earned'], 'required' => true, 'col' => '6','value' => $data->leave_type],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => [
                                'pending' => 'Pending',
                            ], 'col' => '6','value' => $data->status],
                            ['type' => 'textarea', 'name' => 'reason', 'label' => 'Reason', 'required' => true, 'col' => '12','value' => $data->reason],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-paper-plane me-1"></i> Update Leave Request',
                        'button' => 'Save Leave Request',
                        'script' => 'window.skeleton.select();window.skeleton.unique();window.skeleton.applyRandomIdSuggestion();'
                    ];
                    break;

                case 'business_companies':

                    $popup = [
                        'form' => 'custom',
                        'type' => 'modal',
                        'size' => 'modal-lg',
                        'position' => 'center',
                        'label' => '<i class="fa-solid fa-building-memo me-2"></i>Update Company',
                        'content' => view('system.business.company-management.render.add-company', ['company' => $data, 'token' => $token])->render(),
                        'button' => 'save',
                        'footer' => 'hide',
                        'script' => 'window.skeleton.stepper();window.skeleton.image()',
                        'status' => true,
                    ];
                    break;

                default:
                    return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                              >>> MODIFY THIS SECTION (END) <<<                                   *
             *                                                                                                  *
             ****************************************************************************************************/
            // Generate content based on form type
            $content = $popup['form'] === 'builder' ? PopupHelper::generateBuildForm($token, $popup['fields'], $popup['labelType']) : $popup['content'];
            // Generate response
            return response()->json([
                'token' => $token,
                'type' => $popup['type'],
                'size' => $popup['size'],
                'position' => $popup['position'],
                'label' => $popup['label'],
                'content' => $content,
                'script' => $popup['script'],
                'button' => $popup['button'],
                'footer' => $popup['footer'] ?? 'show',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.']);
        }
    }
}
