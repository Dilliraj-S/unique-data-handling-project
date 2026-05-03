<?php

namespace App\Http\Controllers\System\Business\EmployeeManagement;

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
                // case 'business_employees':
                //     $popup = [
                //         'form' => 'builder',
                //         'labelType' => 'floating',
                //         'fields' => [
                //             ['type' => 'select', 'name' => 'company_id', 'label' => 'Company ID', 'options' => Select::options('companies', 'array', ['company_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-target' => Skeleton::skeletonToken('company_branch_select') . '_s']],
                //             ['type' => 'select', 'name' => 'branch_id', 'label' => 'Branch ID',  'options' => Select::options('branches', 'array', ['branch_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-source' => Skeleton::skeletonToken('company_branch_select') . '_s']],
                //             ['type' => 'text', 'name' => 'user_id', 'label' => 'User ID','attr' => ['data-validate' => 'user-code'], 'required' => true, 'col' => '6'],
                //             ['type' => 'text', 'name' => 'employee_id','label' => 'Employee ID','attr' => ['data-validate' => 'employee-code'], 'required' => true, 'col' => '6'],
                //             ['type' => 'text', 'name' => 'first_name', 'label' => 'First Name', 'required' => true, 'col' => '6'],
                //             ['type' => 'text', 'name' => 'last_name', 'label' => 'Last Name', 'required' => false, 'col' => '6'],
                //             ['type' => 'number', 'name' => 'role_id', 'label' => 'Role', 'required' => true, 'col' => '6'],
                //             ['type' => 'date', 'name' => 'birth_date', 'label' => 'Birth Date', 'required' => false, 'col' => '6'],
                //             ['type' => 'text', 'name' => 'phone', 'label' => 'Phone', 'required' => true, 'col' => '6'],
                //             ['type' => 'text', 'name' => 'phone_alt', 'label' => 'Alternate Phone', 'required' => false, 'col' => '6'],
                //             ['type' => 'email', 'name' => 'email', 'label' => 'Email', 'required' => true, 'col' => '6'],
                //             ['type' => 'email', 'name' => 'email_alt', 'label' => 'Alternate Email', 'required' => false, 'col' => '6'],
                //             ['type' => 'text', 'name' => 'username', 'label' => 'Username', 'required' => true, 'col' => '6'],
                //             ['type' => 'password', 'name' => 'password', 'label' => 'Password', 'required' => true, 'col' => '6',],
                //             ['type' => 'date', 'name' => 'joined_date', 'label' => 'Joined Date', 'required' => false, 'col' => '6'],
                //             ['type' => 'select', 'name' => 'allow_authentication', 'label' => 'Allow Authentication', 'options' => ['0' => 'No', '1' => 'Yes'], 'required' => false, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                //         ],
                //         'type' => 'modal',
                //         'size' => 'modal-md',
                //         'position' => 'end',
                //         'label' => '<i class="fa-regular fa-folder me-1"></i> Add employee',
                //         'button' => 'Save employee',
                //         'script' => 'window.skeleton.select();window.skeleton.unique();window.skeleton.applyRandomIdSuggestion();'
                //     ];
                //     break;
                    case 'business_designations':
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
                      case 'business_departments':
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
                    case 'business_documents':
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

                    case 'business_employees':
                      $content = '
                        <div data-stepper id="form-stepper" class="mb-4">
                            <ul class="nav nav-pills mb-3" data-stepper-nav>
                                <li class="nav-item">
                                    <a class="nav-link active" href="#" data-step-nav="0">
                                        <i class="fas fa-building me-2"></i> Company Data
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" href="#" data-step-nav="1">
                                        <i class="fas fa-users me-2"></i> Employee Data
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" href="#" data-step-nav="2">
                                        <i class="fas fa-mobile-alt me-2"></i> Device Data
                                    </a>
                                </li>
                            </ul>


                            
                            <div data-step class="p-3">
                                <div class="row gy-3">
                                    <input type="hidden" name="save_token" value="'.$token.'">

                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="number" class="form-float-input" id="sno" name="sno" min="1" required>
                                            <label for="sno" class="form-float-label">SNO <span class="text-danger">*</span></label>
                                        </div>
                                    </div>

                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="company_id" name="company_id" data-select="dropdown" data-target="'.Skeleton::skeletonToken('business_company_branches_select') . '_s" required>
                                                <option value=""></option>
                                               '.Select::options('companies', 'html', ['company_id' => 'name']).'
                                            </select>
                                            <label for="company_id" class="form-float-label">Company<span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="branch_id" name="branch_id" data-select="dropdown" data-source="'.Skeleton::skeletonToken('business_company_branches_select') . '_s">
                                                <option value=""></option>
                                               '.Select::options('branches', 'html', ['branch_id' => 'name']).'
                                            </select>
                                            <label for="branch_id" class="form-float-label">Branch</label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="department" name="department_id" data-select="dropdown" data-target="'.Skeleton::skeletonToken('business_company_branches_select') . '_s">
                                                <option value=""></option>
                                                 '.Select::options('departments', 'html', ['department_id' => 'department']).'
                                            </select>
                                            <label for="department" class="form-float-label">Department</label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="designation" name="designation_id" data-select="dropdown" data-source="'.Skeleton::skeletonToken('business_company_branches_select') . '_s">
                                                <option value=""></option>
                                                 '.Select::options('designations', 'html', ['designation_id' => 'designation']).'
                                            </select>
                                            <label for="designation" class="form-float-label">Designation</label>
                                        </div>
                                    </div>
                                
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="shift_schedule_id" name="shift_schedule_id[]" data-select="dropdown" multiple required>
                                                <option value=""></option>
                                                 '.Select::options('shift_schedules', 'html', ['schedule_id' => 'schedule_name']).'
                                               
                                            </select>
                                            <label for="shift_schedules" class="form-float-label">Shift Schedules<span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Employee Data Step -->
                            <div data-step class="p-3 d-none">
                                <div class="row gy-3">

                                <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                                        <div class="float-input-control">
                                            <input type="file" class="form-float-input" id="profile" name="profile">
                                            <label for="profile" class="form-float-label">Profile</label>
                                        </div>
                                    </div>

                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="employee_id" name="employee_id" required>
                                            <label for="employee_id" class="form-float-label">Employee ID <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="first_name" name="first_name" required>
                                            <label for="first_name" class="form-float-label">First Name <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="last_name" name="last_name">
                                            <label for="last_name" class="form-float-label">Last Name</label>
                                        </div>
                                    </div>

                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="gender" name="gender" data-select="dropdown">
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Others">Others</option>
                                            </select>
                                            <label for="gender" class="form-float-label">Gender</label>
                                        </div>
                                    </div>

                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" name="role_id" data-select="dropdown">
                                                <option value=""></option>
                                                 '.Select::options('roles', 'html', ['id' => 'name']).'
                                            </select>
                                            <label for="role" class="form-float-label">Role</label>
                                        </div>
                                    </div>

                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="date" class="form-float-input" id="joined_date" name="joined_date" data-date-picker="date">
                                            <label for="joined_date" class="form-float-label">Joined Date</label>
                                        </div>
                                    </div>

                                                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="date" class="form-float-input" id="birth_date" name="birth_date" data-date-picker="date" data-date-picker-allow="past">
                                            <label for="birth_date" class="form-float-label">Birth Date</label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="phone" name="phone" data-validate="indian-phone" required>
                                            <label for="phone" class="form-float-label">Phone <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="email" class="form-float-input" id="email" name="email" data-validate="email" required>
                                            <label for="email" class="form-float-label">Email <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                 
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="username" name="username" data-unique="'. Skeleton::skeletonToken('business_unique_username') . '_u"  data-unique-msg="This username is already registered" required>
                                            <label for="username" class="form-float-label">Username <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="password" class="form-float-input" id="password" name="password" data-validate="password" required>
                                            <label for="password" class="form-float-label">Password <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="allow_authentication" name="allow_authentication" data-select="dropdown">
                                                <option value="0">No</option>
                                                <option value="1">Yes</option>
                                            </select>
                                            <label for="allow_authentication" class="form-float-label">Allow Authentication</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Device Data Step -->
                            <div data-step class="p-3 d-none">
                                <div class="row gy-3">
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="pin" name="pin" required  data-validate="usrid">
                                            <label for="pin" class="form-float-label">PIN <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="name" name="name" required maxlength="255">
                                            <label for="name" class="form-float-label">Name <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="number" class="form-float-input" id="pri" name="pri" required min="0" max="14">
                                            <label for="pri" class="form-float-label">Priority <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="verify" name="verify" data-select="dropdown" required>
                                                <option value="0">No</option>
                                                <option value="1">Yes</option>
                                            </select>
                                            <label for="verify" class="form-float-label">Verify <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="card" name="card" required maxlength="50">
                                            <label for="card" class="form-float-label">Card <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="number" class="form-float-input" id="grp" name="grp" required min="1">
                                            <label for="grp" class="form-float-label">Group <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="password" class="form-float-input" id="passwd" name="passwd" required maxlength="50">
                                            <label for="passwd" class="form-float-label">Password <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="expires" name="expires" data-select="dropdown" required>
                                                <option value="0">No</option>
                                                <option value="1">Yes</option>
                                            </select>
                                            <label for="expires" class="form-float-label">Expires <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="date" class="form-float-input" id="start_datetime" name="start_datetime" data-date-picker="datetime" required>
                                            <label for="start_datetime" class="form-float-label">Start Date <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="date" class="form-float-input" id="end_datetime" name="end_datetime" data-date-picker="datetime" required>
                                            <label for="end_datetime" class="form-float-label">End Date <span class="text-danger">*</span></label>
                                        </div>
                                    </div>

                                    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="device_id" name="device_id[]" data-select="dropdown" multiple>
                                                <option value=""></option>
                                                 '.Select::options('devices', 'html', ['device_id' => 'name']).'
                                            </select>
                                            <label for="devices" class="form-float-label">Devices</label>
                                        </div>
                                    </div>
                                    <div class="col-12 mb-3">
                                        <label class="form-label d-block mb-2">Add Employee to this Device <span class="text-danger">*</span></label>
                                        <div class="form-check form-check-inline">
                                            <input class="form-check-input" type="radio" name="add_device" id="add_device_yes" value="1" required>
                                            <label class="form-check-label" for="add_device_yes">Yes</label>
                                        </div>
                                        <div class="form-check form-check-inline">
                                            <input class="form-check-input" type="radio" name="add_device" id="add_device_no" value="0">
                                            <label class="form-check-label" for="add_device_no">No</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Navigation Buttons -->
                            <div class="d-flex justify-content-between mt-3">
                                <button type="button" data-stepper-prev class="btn btn-secondary">Previous</button>
                                <button type="button" data-stepper-next class="btn btn-primary">Next</button>
                                <button type="submit" class="btn btn-success d-none">Submit</button>
                            </div>
                        </div>';
                 $popup = [
                            'form' => 'content',
                            'labelType' => 'floating',
                            'content' => $content,
                            'type' => 'modal',
                            'size' => 'modal-lg',
                            'position' => 'end',
                            'footer' => 'hide',
                            'label' => '<i class="fa-solid fa-address-card"></i> Educational Details',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();window.skeleton.stepper();window.skeleton.datePicker();window.gotit.setupEmployeeNameAutoFill()'
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
