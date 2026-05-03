<?php

namespace App\Http\Controllers\System\Business\EmployeeManagement;

use App\Facades\{BusinessDB, Select,  CentralDB, Database, Developer, Skeleton};
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
            $parts = explode('_', $token);
            $reqSet['id'] = end($parts);
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
            Developer::emergency('this is reqset',['reqset'=>$reqSet]);
            Developer::emergency('this is token',['token'=>$token]);

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
                    $isSelected = fn($value, $array) => in_array($value, $array) ? 'selected' : '';
                    $employeedata = BusinessDB::table('employees')->where('sno', $reqSet['id'])->first();
                    Developer::emergency('the employeeeid',['employeeid'=>$employeedata->employee_id]);
                    if ($employeedata) {
                        $employeedetails = BusinessDB::table('employee_details')
                            ->where('employee_id', $employeedata->employee_id)
                            ->first();
                         Developer::emergency('the user_id',['user_id'=>$employeedetails->user_id]);

                        $userdata = BusinessDB::table('users')
                            ->where('user_id', $employeedetails->user_id)
                            ->first();
                        Developer::emergency('the employee_id',['employee_id'=>$employeedata->employee_id]);
                        $deviceuser = BusinessDB::table('device_users')
                            ->where('employee_id', $employeedata->employee_id)
                            ->first();
                        Developer::emergency('the device_user',['device_user'=>$deviceuser]);

                    } else {
                        // Handle not found case
                        $employeedetails = null;
                        $userdata = null;
                    }
                    Developer::emergency('the employeedata',['employeedata'=>$employeedata]);
                    Developer::emergency('the employeedata',['employeedata'=>$employeedetails]);
                    Developer::emergency('the userdata',['userdata'=>$userdata]);
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
                                            <input type="number" class="form-float-input" id="sno" name="sno" min="1" value="'.$employeedata->sno.'" required>
                                            <label for="sno" class="form-float-label">SNO <span class="text-danger">*</span></label>
                                        </div>
                                    </div>

                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="company_id" name="company_id" data-select="dropdown" data-target="'.Skeleton::skeletonToken('business_company_branches_select') . '_s" required>
                                                <option value="CMP001"></option>
                                               '.Select::options('companies', 'html', ['company_id' => 'name'],[],[$employeedata->company_id]).'
                                            </select>
                                            <label for="company_id" class="form-float-label">Company<span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="branch_id" name="branch_id" data-select="dropdown" data-source="'.Skeleton::skeletonToken('business_company_branches_select') . '_s">
                                                <option value=""></option>
                                               '.Select::options('branches', 'html', ['branch_id' => 'name'],[],[$employeedata->branch_id]).'
                                            </select>
                                            <label for="branch_id" class="form-float-label">Branch</label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="department" name="department_id" data-select="dropdown" data-target="'.Skeleton::skeletonToken('business_company_branches_select') . '_s">
                                                <option value=""></option>
                                                 '.Select::options('departments', 'html', ['department_id' => 'department'],[],[$employeedata->department_id]).'
                                            </select>
                                            <label for="department" class="form-float-label">Department</label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="designation" name="designation_id" data-select="dropdown" data-source="'.Skeleton::skeletonToken('business_company_branches_select') . '_s">
                                                <option value=""></option>
                                                 '.Select::options('designations', 'html', ['designation_id' => 'designation'],[],[$employeedata->designation_id]).'
                                            </select>
                                            <label for="designation" class="form-float-label">Designation</label>
                                        </div>
                                    </div>
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="shift_schedule_id" name="shift_schedule_id[]" data-select="dropdown" multiple>
                                                <option value=""></option>
                                                 '.Select::options('shift_schedules', 'html', ['schedule_id' => 'schedule_name'],[],[$employeedata->shift_schedule_id]).'
                                            </select>
                                            <label for="shift_schedules" class="form-float-label">Shift Schedules</label>
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
                                            <input type="text" class="form-float-input" id="employee_id" name="employee_id" value="'.$employeedata->employee_id.'" required>
                                            <label for="employee_id" class="form-float-label">Employee ID <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="first_name" name="first_name" value="'.$employeedata->first_name.'" required>
                                            <label for="first_name" class="form-float-label">First Name <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="last_name" name="last_name" value="'.$employeedata->last_name.'">
                                            <label for="last_name" class="form-float-label">Last Name</label>
                                        </div>
                                    </div>

                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" id="gender" name="gender" data-select="dropdown">
                                                <option value="Male" ' . ($employeedetails->gender === 'Male' ? 'selected' : '') . '>Male</option>
                                                <option value="Female" ' . ($employeedetails->gender === 'Female' ? 'selected' : '') . '>Female</option>
                                                <option value="Others" ' . ($employeedetails->gender === 'Others' ? 'selected' : '') . '>Others</option>
                                            </select>
                                            <label for="gender" class="form-float-label">Gender</label>
                                        </div>
                                    </div>

                                   

                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <select class="form-float-input" name="role_id" data-select="dropdown">
                                                <option value=""></option>
                                                 '.Select::options('roles', 'html', ['id' => 'name'],[],[$employeedata->role_id]).'
                                            </select>
                                            <label for="role" class="form-float-label">Role</label>
                                        </div>
                                    </div>

                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="date" class="form-float-input" id="joined_date" name="joined_date" value="'.$employeedetails->joined_date.'" data-date-picker="date">
                                            <label for="joined_date" class="form-float-label">Joined Date</label>
                                        </div>
                                    </div>

                                                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="date" class="form-float-input" id="birth_date" name="birth_date" value="'.$employeedetails->birth_date.'" data-date-picker="date" data-date-picker-allow="past">
                                            <label for="birth_date" class="form-float-label">Birth Date</label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="phone" name="phone" value="'.$employeedata->phone.'" data-validate="indian-phone" required>
                                            <label for="phone" class="form-float-label">Phone <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="email" class="form-float-input" id="email" name="email" value="'.$employeedata->email.'" data-validate="email" required>
                                            <label for="email" class="form-float-label">Email <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                 
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="username" name="username" value="'.$userdata->username.'" data-unique="'. Skeleton::skeletonToken('business_unique_username') . '_u"  data-unique-msg="This username is already registered" required>
                                            <label for="username" class="form-float-label">Username <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="password" class="form-float-input" id="password" name="password" value="'.$userdata->password.'" data-validate="password" required>
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
                                            <input type="text" class="form-float-input" id="pin" name="pin" value="'.$deviceuser->device_user_id.'" required  data-validate="usrid">
                                            <label for="pin" class="form-float-label">PIN <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="name" name="name" value="'.$deviceuser->name.'"  required maxlength="255">
                                            <label for="name" class="form-float-label">Name <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="number" class="form-float-input" id="pri" name="pri" value="'.$deviceuser->privilege.'" required min="0" max="14">
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
                                            <input type="text" class="form-float-input" id="card" name="card" value="'.$deviceuser->card_number.'" required maxlength="50">
                                            <label for="card" class="form-float-label">Card <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="number" class="form-float-input" id="grp" name="grp" value="'.$deviceuser->group_id.'" required min="1">
                                            <label for="grp" class="form-float-label">Group <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="password" class="form-float-input" id="passwd" name="passwd" value="'.$deviceuser->password.'" required maxlength="50">
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
                                            <input type="date" class="form-float-input" id="start_datetime" name="start_datetime" value="'.$deviceuser->start_datetime.'" data-date-picker="datetime" required>
                                            <label for="start_datetime" class="form-float-label">Start Date <span class="text-danger">*</span></label>
                                        </div>
                                    </div>
                                    
                                    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                        <div class="float-input-control">
                                            <input type="date" class="form-float-input" id="end_datetime" name="end_datetime" value="'.$deviceuser->end_datetime.'" data-date-picker="datetime" required>
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
                        'label' => '<i class="fa-regular fa-file me-1"></i> Add Document',
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
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Department',
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
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Token',
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
