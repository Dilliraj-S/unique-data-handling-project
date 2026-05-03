<?php

namespace App\Http\Controllers\System\Business\EmployeeManagement;

use App\Facades\{CentralDB, BusinessDB, Developer, Skeleton};
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
                case 'business_employees':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $modules = CentralDB::table('skeleton_modules')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'number', 'name' => 'sno', 'label' => 'Serial Number', 'value' => $data->sno, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'company_id', 'label' => 'Company ID', 'value' => $data->company_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'branch_id', 'label' => 'Branch ID', 'value' => $data->branch_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'user_id', 'label' => 'User ID', 'value' => $data->user_id, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'employee_id', 'label' => 'Employee ID', 'value' => $data->employee_id, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'first_name', 'label' => 'First Name', 'value' => $data->first_name, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'last_name', 'label' => 'Last Name', 'value' => $data->last_name, 'required' => false, 'col' => '6'],
                            ['type' => 'number', 'name' => 'role_id', 'label' => 'Role', 'value' => $data->role_id, 'required' => true, 'col' => '6'],
                            ['type' => 'date', 'name' => 'birth_date', 'label' => 'Birth Date', 'value' => $data->birth_date, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'phone', 'label' => 'Phone', 'value' => $data->phone, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'phone_alt', 'label' => 'Alternate Phone', 'value' => $data->phone_alt, 'required' => false, 'col' => '6'],
                            ['type' => 'email', 'name' => 'email', 'label' => 'Email', 'value' => $data->email, 'required' => true, 'col' => '6'],
                            ['type' => 'email', 'name' => 'email_alt', 'label' => 'Alternate Email', 'value' => $data->email_alt, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'username', 'label' => 'Username', 'value' => $data->username, 'required' => true, 'col' => '6'],
                            ['type' => 'password', 'name' => 'password', 'label' => 'Password', 'value' => $data->password, 'required' => true, 'col' => '6'],
                            ['type' => 'date', 'name' => 'joined_date', 'label' => 'Joined Date', 'value' => $data->joined_date, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'secure_version', 'label' => 'Secure Version', 'value' => $data->secure_version, 'required' => false, 'col' => '6'],
                            ['type' => 'select', 'name' => 'allow_authentication', 'label' => 'Allow Authentication', 'options' => ['0' => 'No', '1' => 'Yes'], 'value' => $data->allow_authentication, 'required' => false, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'text', 'name' => 'created_by', 'label' => 'Created By', 'value' => $data->created_by, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'updated_by', 'label' => 'Updated By', 'value' => $data->updated_by, 'required' => false, 'col' => '6'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Update Employee',
                        'button' => 'Update employee',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;

                case 'business_documents':
                    $categories = ['legal' => 'Legal', 'finance' => 'Finance', 'hr' => 'HR', 'other' => 'Other'];
                    $fileTypes = ['pdf' => 'PDF', 'doc' => 'DOC', 'xls' => 'XLS', 'img' => 'Image'];

                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'company_id', 'label' => 'Company ID', 'value' => $data->company_id, 'required' => true, 'col' => '6', 'attr' => ['maxlength' => '100']],
                            ['type' => 'text', 'name' => 'branch_id', 'label' => 'Branch ID', 'value' => $data->branch_id, 'required' => true, 'col' => '6', 'attr' => ['maxlength' => '100']],
                            ['type' => 'text', 'name' => 'document_id', 'label' => 'Document ID', 'value' => $data->branch_id,  'required' => true, 'col' => '6', 'attr' => ['maxlength' => '50']],
                            ['type' => 'text', 'name' => 'document_name', 'label' => 'Document Name', 'value' => $data->document_name,  'required' => true, 'col' => '6', 'attr' => ['maxlength' => '100']],
                            ['type' => 'select', 'name' => 'category', 'label' => 'Category', 'options' => $categories, 'value' => $data->category, 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'select', 'name' => 'file_type', 'label' => 'File Type', 'options' => $fileTypes,  'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'file', 'name' => 'document_file', 'label' => 'Upload File', 'required' => true, 'col' => '12', 'attr' => ['accept' => '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt']],

                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $data->description, 'required' => false, 'col' => '12', 'attr' => ['maxlength' => '255']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'value' => $data->status, 'required' => true, 'col' => '6'],

                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-file me-1"></i> Update Document',
                        'button' => 'Save Document',
                        'script' => ''
                    ];
                    break;
                case 'business_departments':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    CentralDB::table('skeleton_modules')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'company_id', 'label' => 'Company ID', 'value' => $data->company_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'branch_id', 'label' => 'Branch ID', 'value' => $data->branch_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'department_id', 'label' => 'Department ID', 'value' => $data->department_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'department', 'label' => 'Department', 'value' => $data->department, 'required' => true, 'col' => '6'],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $data->description, 'required' => false, 'col' => '12'],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'value' => $data->status, 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Update Department',
                        'button' => 'Save Department',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                case 'business_designations':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $modules = CentralDB::table('skeleton_modules')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'sno', 'label' => 'S.No', 'value' => $data->sno, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'company_id', 'label' => 'Company ID', 'value' => $data->company_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'branch_id', 'label' => 'Branch ID', 'value' => $data->branch_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'department_id', 'label' => 'Department ID', 'value' => $data->department_id, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'designation_id', 'label' => 'Designation ID', 'value' => $data->designation_id, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'designation', 'label' => 'Designation', 'value' => $data->designation, 'required' => false, 'col' => '6'],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $data->description, 'required' => false, 'col' => '12'],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['Active' => 'Active', 'Inactive' => 'Inactive'], 'value' => $data->status, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'created_by', 'label' => 'Created By', 'value' => $data->created_by, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'updated_by', 'label' => 'Updated By', 'value' => $data->updated_by, 'required' => false, 'col' => '6'],
                            ['type' => 'date', 'name' => 'delete_on', 'label' => 'Delete On', 'value' => $data->delete_on, 'required' => false, 'col' => '6'],
                            ['type' => 'date', 'name' => 'restored_at', 'label' => 'Restored At', 'value' => $data->restored_at, 'required' => false, 'col' => '6'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Update Designation',
                        'button' => 'Update Token',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
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
