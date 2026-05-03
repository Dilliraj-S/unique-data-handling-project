<?php

namespace App\Http\Controllers\System\Business\CompanyManagement;

use App\Http\Controllers\Controller;
use App\Facades\{BusinessDB, Select,  CentralDB, Database, Developer, Skeleton};
use App\Http\Helpers\PopupHelper;
use App\Http\Helpers\SelectHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;

/**
 * Controller for rendering the add form for developer entities.
 */
class ShowAddCtrl extends Controller
{
    /**
     * Renders a popup form for adding new developer entities.
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
            if (!isset($reqSet['key'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
            }
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
                            ['type' => 'text', 'name' => 'key', 'label' => 'Key', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'key', 'maxlength' => '100', 'data-unique' => Skeleton::skeletonToken('central_skeleton_tokens_unique') . '_u', 'data-unique-msg' => 'This key is already registered']],
                            ['type' => 'select', 'name' => 'module', 'label' => 'Module', 'options' => $modules, 'required' => true, 'col' => '12', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'select', 'name' => 'system', 'label' => 'System', 'options' => $system, 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'text', 'name' => 'table', 'label' => 'Table', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'key', 'maxlength' => '100']],
                            ['type' => 'text', 'name' => 'column', 'label' => 'Column', 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'value', 'label' => 'Value', 'required' => true, 'col' => '4'],
                            ['type' => 'select', 'name' => 'validate', 'label' => 'Validate', 'options' => ['0' => 'No', '1' => 'Yes'], 'required' => true, 'col' => '4', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'text', 'name' => 'act', 'label' => 'Action Column', 'required' => true, 'col' => '4'],
                            ['type' => 'select', 'name' => 'actions', 'label' => 'Actions', 'options' => ['c' => 'Checkbox', 'v' => 'View', 'e' => 'Edit', 'd' => 'Delete'], 'col' => '12', 'attr' => ['data-source' => 'dropdown', 'multiple' => 'multiple']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Token',
                        'button' => 'Save Token',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;

                case 'departments':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'company_id', 'label' => 'Company ID', 'options' => Select::options('companies', 'array', ['company_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-target' => Skeleton::skeletonToken('company_branch_select') . '_s']],
                            ['type' => 'select', 'name' => 'branch_id', 'label' => 'Branch ID',  'options' => Select::options('branches', 'array', ['branch_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-source' => Skeleton::skeletonToken('company_branch_select') . '_s']],
                            ['type' => 'text', 'name' => 'department_id', 'label' => 'Department ID', 'attr' => ['data-validate' => 'department-code'], 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'department', 'label' => 'Department', 'required' => true, 'col' => '6'],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'required' => false, 'col' => '6'],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],

                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-solid fa-sitemap me-1"></i> Add Department',
                        'button' => 'Save Department',
                        'script' => 'window.skeleton.select();window.skeleton.unique();window.skeleton.applyRandomIdSuggestion();'
                    ];
                    break;

                case 'policies':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'title', 'label' => 'Title', 'required' => true, 'col' => '12'],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'required' => false, 'col' => '12'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-solid fa-file-shield me-1"></i> Add Policy',
                        'button' => 'Save Policy',
                        'script' => ''
                    ];
                    break;

                case 'business_branches':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $modules = CentralDB::table('skeleton_modules')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            [
                                'type' => 'select',
                                'name' => 'company_id',
                                'label' => 'Company',
                                'options' => Select::options('companies', 'array', ['company_id' => 'name']),
                                'required' => true,
                                'col' => '6',
                                'attr' => []
                            ],
                            ['type' => 'text', 'name' => 'branch_id', 'attr' => ['data-validate' => 'branch-code'], 'label' => 'Branch ID', 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12'],
                            ['type' => 'text', 'name' => 'legal_name', 'label' => 'Legal Name', 'required' => false, 'col' => '12'],
                            ['type' => 'file', 'name' => 'logo', 'label' => 'Logo', 'required' => false, 'col' => '12'],
                            ['type' => 'date', 'name' => 'founded_date', 'label' => 'Founded Date', 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'phone', 'label' => 'Phone', 'required' => false, 'col' => '6'],
                            ['type' => 'email', 'name' => 'email', 'label' => 'Email', 'required' => false, 'col' => '12'],
                            ['type' => 'number', 'name' => 'no_of_employees', 'label' => 'Number of Employees', 'required' => false, 'col' => '6'],
                            ['type' => 'text', 'name' => 'tax_id', 'label' => 'Tax ID', 'required' => false, 'col' => '6'],
                            ['type' => 'textarea', 'name' => 'address_json', 'label' => 'Address (JSON)', 'required' => false, 'col' => '12'],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['Active' => 'Active', 'Inactive' => 'Inactive'], 'required' => true, 'col' => '12'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-lg',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-building me-1"></i> Add Branch Info',
                        'button' => 'Save Info',
                        'script' => 'window.skeleton.select();window.skeleton.unique();window.skeleton.applyRandomIdSuggestion();'

                    ];
                    break;
                case 'designations':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $modules = CentralDB::table('skeleton_modules')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'company_id', 'label' => 'Company ID', 'options' => Select::options('companies', 'array', ['company_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-target' => Skeleton::skeletonToken('company_branch_select') . '_s']],
                            ['type' => 'select', 'name' => 'branch_id', 'label' => 'Branch ID',  'options' => Select::options('branches', 'array', ['branch_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-source' => Skeleton::skeletonToken('company_branch_select') . '_s']],
                            ['type' => 'select', 'name' => 'department_id', 'label' => 'Department ID',  'options' => Select::options('	departments', 'array', ['department_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-source' => Skeleton::skeletonToken('company_departments_select') . '_s']],
                            // ['type' => 'text', 'name' => 'department_id', 'label' => 'Department ID','class' => ['random-id-field', 'department_id'], 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'designation_id', 'attr' => ['data-validate' => 'designation-code'], 'label' => 'Designation ID', 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'designation', 'label' => 'Designation', 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6'],

                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'required' => false, 'col' => '6'],

                        ],
                        'type' => 'modal',
                        'size' => 'modal-lg',
                        'position' => 'end',
                        'label' => '<i class="fa-solid fa-id-badge me-1"></i> Add Designation',
                        'button' => 'Save Info',
                        'script' => 'window.skeleton.select();window.skeleton.unique();window.skeleton.applyRandomIdSuggestion();'
                    ];
                    break;

                case 'business_Company_documents':
                    $categories = ['legal' => 'Legal', 'finance' => 'Finance', 'hr' => 'HR', 'other' => 'Other'];
                    $fileTypes = ['pdf' => 'PDF', 'doc' => 'DOC', 'xls' => 'XLS', 'img' => 'Image'];

                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'company_id', 'label' => 'Company ID', 'options' => Select::options('companies', 'array', ['company_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-target' => Skeleton::skeletonToken('company_branch_select') . '_s']],
                            ['type' => 'select', 'name' => 'branch_id', 'label' => 'Branch ID',  'options' => Select::options('branches', 'array', ['branch_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-source' => Skeleton::skeletonToken('company_branch_select') . '_s']],
                            ['type' => 'text', 'name' => 'document_id', 'attr' => ['data-validate' => 'document-code'], 'label' => 'Document ID', 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'document_name', 'label' => 'Document Name', 'required' => true, 'col' => '6', 'attr' => ['maxlength' => '100']],
                            ['type' => 'select', 'name' => 'category', 'label' => 'Category', 'options' => $categories, 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'select', 'name' => 'file_type', 'label' => 'File Type', 'options' => $fileTypes, 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'file', 'name' => 'document_file', 'label' => 'Upload File', 'required' => true, 'col' => '12', 'attr' => ['accept' => '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt']],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'required' => false, 'col' => '6', 'attr' => ['maxlength' => '255']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6'],

                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-file-lines me-1"></i> Add Document',
                        'button' => 'Save Document',
                        'script' => ''
                    ];
                    break;
                      case 'business_policies':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'title', 'label' => 'Title', 'required' => true, 'col' => '12'],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'required' => false, 'col' => '12'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-solid fa-file-shield me-1"></i> Add Policy',
                        'button' => 'Save Policy',
                        'script' => ''
                    ];
                    break;
                case 'business_companies':
                    $popup = [
                        'form' => 'custom',
                        'type' => 'modal',
                        'size' => 'modal-lg',
                        'position' => 'center',
                        'label' => '<i class="fa-solid fa-building-memo me-2"></i>Add Company',
                        'content' => view('system.business.company-management.render.add-company', ['token' => $token])->render(),
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
