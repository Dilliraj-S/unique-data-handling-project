<?php

namespace App\Http\Controllers\System\Business\DeviceManagement;

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
                case 'branches':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $modules = CentralDB::table('skeleton_modules')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'company_id', 'label' => 'company_id', 'value' => $data->company_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'branch_id', 'label' => 'branch_id', 'value' => $data->branch_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'value' => $data->name, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'legal_name', 'label' => 'Legal Name', 'value' => $data->legal_name, 'required' => false, 'col' => '12'],
                            ['type' => 'file', 'name' => 'logo', 'label' => 'Logo', 'required' => false, 'col' => '12'],
                            ['type' => 'date', 'name' => 'founded_date', 'label' => 'Founded Date', 'value' => $data->founded_date, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'phone', 'label' => 'Phone', 'value' => $data->phone, 'required' => false, 'col' => '6'],
                            ['type' => 'email', 'name' => 'email', 'label' => 'Email', 'value' => $data->email, 'required' => false, 'col' => '12'],
                            ['type' => 'number', 'name' => 'no_of_employees', 'label' => 'Number of Employees', 'value' => $data->no_of_employees, 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'tax_id', 'label' => 'Tax ID', 'value' => $data->tax_id, 'required' => false, 'col' => '6'],
                            ['type' => 'textarea', 'name' => 'address_json', 'label' => 'Address (JSON)', 'value' => $data->address_json, 'required' => false, 'col' => '12'],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['Active' => 'Active', 'Inactive' => 'Inactive'], 'value' => $data->status, 'required' => true, 'col' => '6'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Token',
                        'button' => 'Update Token',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;

                case 'business_Company_documents':
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
                            ['type' => 'file', 'name' => 'document_file', 'label' => 'Upload File', 'required' => true, 'col' => '6', 'attr' => ['accept' => '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt']],

                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $data->description, 'required' => false, 'col' => '6', 'attr' => ['maxlength' => '255']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'value' => $data->status, 'required' => true, 'col' => '6'],

                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-file-lines me-1"></i> Edit Document',
                        'button' => 'Save Document',
                        'script' => ''
                    ];
                    break;

                case 'business_departments':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'company_id', 'label' => 'Company ID', 'value' => $data->company_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'branch_id', 'label' => 'Branch ID', 'value' => $data->branch_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'department_id', 'label' => 'Department ID', 'value' => $data->department_id, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'department', 'label' => 'Department', 'value' => $data->department, 'required' => true, 'col' => '6'],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $data->description, 'required' => false, 'col' => '6'],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'value' => $data->status, 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-solid fa-sitemap me-1"></i> Edit Department',
                        'button' => 'Save Department',
                        'script' => ''
                    ];
                    break;
                case 'designations':
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
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $data->description, 'required' => false, 'col' => '6'],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['Active' => 'Active', 'Inactive' => 'Inactive'], 'value' => $data->status, 'required' => true, 'col' => '6'],

                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-solid fa-id-badge me-1"></i> Edit Designation',
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
             Developer::emergency('token to save ',['token is'=>$token]);
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
