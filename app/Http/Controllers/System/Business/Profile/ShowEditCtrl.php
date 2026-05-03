<?php
namespace App\Http\Controllers\System\Business\Profile;
use App\Facades\{CentralDB, BusinessDB, Developer, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\PopupHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};
use Nette\Utils\Html;
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
            // $data = BusinessDB::table($reqSet['table'])->where($reqSet['act'], $reqSet['id'])->first();
            //  Developer::info('hellllloo');
            // if (!$data) {
            //     return response()->json(['status' => false, 'title' => 'Record Not Found', 'message' => 'The requested record was not found.']);
            // }
            // Log user activity and field values for debugging
            // Developer::info(Skeleton::getAuthenticatedUser()->user_id);
            Developer::info('profile');
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            $popup = null;
            switch ($reqSet['key']) {
                case 'business_profile_update':
                     $employeeData = BusinessDB::table('employees')->where('user_id', Skeleton::getAuthenticatedUser()->user_id)->first();
                        $employeeDetailsData = BusinessDB::table('employee_details')->where('user_id', Skeleton::getAuthenticatedUser()->user_id)->first();
                    $type = $reqSet['id'];
                    if ($type === 'main') {
                        $popup = [
                            'form' => 'builder',
                            'labelType' => 'floating',
                            'fields' => [
                                ['type' => 'hidden', 'name' => 'type', 'value' => $type],
                                ['type' => 'image', 'image_type' => 'image', 'name' => 'profile', 'label' => 'Profile Photo', 'id' => 'profile_photo_field', 'col' => '12', 'accept' => 'image/*', 'required' => true, 'attr' => ['data-source' => 'profile'], 'value'=> $employeeData->profile ? : 'asset(treasury/img/common/background/bday.jpg)'],
                                ['type' => 'text', 'name' => 'first_name', 'label' => 'First Name', 'value' => $employeeData->first_name, 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'name']],
                                ['type' => 'text', 'name' => 'last_name', 'label' => 'Last Name', 'value' => $employeeData->last_name, 'required' => true, 'col' => '6'],
                                ['type' => 'date', 'name' => 'joined_date', 'label' => 'Joined Date', 'value' => $employeeData->joined_date, 'required' => true, 'col' => '6'],
                            ],
                            'type' => 'modal',
                            'size' => 'modal-md',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-address-card"></i> Profile Information',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();window.skeleton.unique();window.skeleton.image();'
                        ];
                    } else if ($type === 'basicinfo') {
                       
                        $popup = [
                            'form' => 'builder',
                            'labelType' => 'floating',
                            'fields' => [
                                ['type' => 'hidden', 'name' => 'type', 'value' => $type],
                                ['type' => 'tel', 'name' => 'phone', 'label' => 'Phone', 'value' => $employeeData->phone, 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'indian-phone']],
                                ['type' => 'email', 'name' => 'email', 'label' => 'Email', 'value' => $employeeData->email, 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'email']],
                                ['type' => 'select', 'name' => 'gender', 'label' => 'Gender', 'options' => ['Male' => 'Male', 'Female' => 'Female', 'Others' => 'Others'], 'value' => (string)$employeeDetailsData->gender, 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                                ['type' => 'date', 'name' => 'birth_date', 'label' => 'DOB', 'value' => $employeeData->birth_date, 'required' => true, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'address', 'label' => 'Address', 'value' => $employeeDetailsData->address, 'required' => true, 'col' => '12'],
                            ],
                            'type' => 'modal',
                            'size' => 'modal-md',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-address-card"></i> Basic Information',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();'
                        ];
                    } else if ($type === 'about') {
                        $popup = [
                            'form' => 'builder',
                            'labelType' => 'floating',
                            'fields' => [
                                ['type' => 'hidden', 'name' => 'type', 'value' => $type],
                                ['type' => 'textarea', 'name' => 'about', 'label' => 'About', 'value' => $employeeDetailsData->about, 'required' => true, 'col' => '12'],
                            ],
                            'type' => 'modal',
                            'size' => 'modal-md',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-address-card"></i> Introduce Yourself',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();window.skeleton.unique();'
                        ];
                    } else if ($type === 'personalinfo') {
                        $popup = [
                            'form' => 'builder',
                            'labelType' => 'floating',
                            'fields' => [
                                ['type' => 'hidden', 'name' => 'type', 'value' => $type],
                                ['type' => 'text', 'name' => 'nationality', 'label' => 'Nationality', 'value' => $employeeDetailsData->nationality, 'required' => true, 'col' => '12'],
                                [
                                    'type' => 'select',
                                    'name' => 'marital_status',
                                    'label' => 'Marital Status',
                                    'options' => [
                                        'Single' => 'Single',
                                        'Married' => 'Married',
                                        'Divorced' => 'Divorced',
                                        'Widowed' => 'Widowed',
                                        'Separated' => 'Separated',
                                    ],
                                    'value' => (string)$employeeDetailsData->marital_status,
                                    'required' => true,
                                    'col' => '12',
                                    'attr' => [
                                        'data-source' => 'dropdown'
                                    ]
                                ]
                            ],
                            'type' => 'modal',
                            'size' => 'modal-md',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-address-card"></i> Personal Information',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();window.skeleton.unique();'
                        ];
                    } else if ($type === 'passwordchange') {
                        $popup = [
                            'form' => 'builder',
                            'labelType' => 'floating',
                            'fields' => [
                                ['type' => 'hidden', 'name' => 'type', 'value' => $type],
                                ['type' => 'password', 'name' => 'currentPassword', 'label' => 'Current Password',  'required' => true, 'col' => '12'],
                                ['type' => 'password', 'name' => 'newPassword', 'label' => 'New Password', 'required' => true, 'col' => '12'],
                                ['type' => 'password', 'name' => 'confirmPassword', 'label' => 'Confirm Password', 'required' => true, 'col' => '12'],
                            ],
                            'type' => 'modal',
                            'size' => 'modal-md',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-shield-quartered"></i> Change Password',
                            'button' => 'Update Password',
                            'script' => 'window.skeleton.select();'
                        ];
                    } else if ($type === 'summary') {
                        $popup = [
                            'form' => 'builder',
                            'labelType' => 'floating',
                            'fields' => [
                                ['type' => 'hidden', 'name' => 'type', 'value' => $type],
                                ['type' => 'text', 'name' => 'skills', 'label' => 'Skills', 'col' => '12', 'attr'=>['data-pills'=>'normal'], 'value'=>$employeeDetailsData->skills],
                                ['type' => 'text', 'name' => 'languages', 'label' => 'Languages', 'col' => '12','attr'=>['data-pills'=>'normal'], 'value'=>$employeeDetailsData->languages],
                                ['type' => 'text', 'name' => 'hobbies', 'label' => 'Hobbies', 'col' => '12','attr'=>['data-pills'=>'normal'], 'value'=>$employeeDetailsData->hobbies],
                            ],
                            'type' => 'modal',
                            'size' => 'modal-md',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-list"></i>Summary',
                            'button' => 'Update Summary',
                            'script' => 'window.skeleton.select();window.skeleton.pills();'
                        ];
                    } else if ($type === 'bankdetails') {
                        $bankAccounts = json_decode($employeeDetailsData->bank_accounts, true) ?? [];
                        $content = '
                        <input type="hidden" name="save_token" value="' . $token .'">
                        <input type="hidden" name="type" value="' . $type . '">
                        <div class="repeater-container">
                            <div class="repeater" data-repeater-list="bank_accounts">';
                        if (empty($bankAccounts)) {
                            $bankAccounts = [[]]; 
                        }

                        foreach ($bankAccounts as $index => $account) {
                            $content .= '
                                <div data-repeater-item class="repeater-item">
                                    <div class="card shadow-none">
                                        <div class="card-body p-2">
                                            <div class="d-flex justify-content-between">
                                                <h6 class="mb-2">Bank Details</h6>
                                                <button type="button" class="btn btn-sm" data-repeater-delete>
                                                    <i class="far fa-trash-alt text-danger"></i>
                                                </button>
                                                
                                            </div>
                                            <div class="row gy-2">
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="account_number" placeholder="Account Number" value="' . htmlspecialchars($account['account_number'] ?? '') . '" data-validate ="bank-account" required>
                                                        <label for="account_number" class="form-float-label">Account Number</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="bank_name" placeholder="Bank Name" value="' . htmlspecialchars($account['bank_name'] ?? '') . '" required>
                                                        <label for="bank_name" class="form-float-label">Bank Name</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="ifsc_code" placeholder="IFSC Code" value="' . htmlspecialchars($account['ifsc_code'] ?? '') . '" data-validate ="ifsc" required>
                                                        <label for="ifsc_code" class="form-float-label">IFSC Code</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="branch" placeholder="Branch" value="' . htmlspecialchars($account['branch'] ?? '') . '" required>
                                                        <label for="branch" class="form-float-label">Branch</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <select class="form-float-input " name="account_type" required>
                                                            <option value="" disabled ' . (empty($account['account_type']) ? 'selected' : '') . '>Select Account Type</option>
                                                            <option value="Savings"' . (($account['account_type'] ?? '') === 'Savings' ? ' selected' : '') . '>Savings</option>
                                                            <option value="Current"' . (($account['account_type'] ?? '') === 'Current' ? ' selected' : '') . '>Current</option>
                                                        </select>
                                                        <label for="account_type" class="form-float-label">Account Type</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>';
                        }
                        $content .= '
                            </div>
                            <div class="col-12 text-end">
                                <button type="button" class="btn btn-primary mb-3" data-repeater-create>
                                    <i class="fa-solid fa-plus"></i> Add Bank Account
                                </button>
                            </div>
                        </div>';
                        $popup = [
                            'form' => 'content',
                            'labelType' => 'floating',
                            'content' => $content,
                            'type' => 'modal',
                            'size' => 'modal-lg',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-address-card"></i> Bank Details',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();window.skeleton.repeater();'
                        ];
                    } else if ($type === 'emergencycontact') {
                        $emergencyContact = json_decode($employeeDetailsData->emergency_contact, true) ?? [];
                        $content = '
                        <input type="hidden" name="save_token" value="' . $token .'">
                        <input type="hidden" name="type" value="' . $type . '">
                        <div class="repeater-container">
                            <div class="repeater" data-repeater-list="items">';
                             if (empty($emergencyContact)) {
                            $emergencyContact = [[]]; 
                        }
                        foreach ($emergencyContact as $index => $contact) {
                            $content .= '
                                <div data-repeater-item class="repeater-item mb-1">
                                    <div class="card">
                                        <div class="card-body p-2">
                                            <div class="d-flex justify-content-between">
                                                <h6 class="mb-2">Emergency Contact</h6>
                                                <button type="button" class="btn btn-sm" data-repeater-delete>
                                                    <i class="far fa-trash-alt text-danger"></i>
                                                </button>
                                            </div>
                                            <div class="row g-2">
                                                <div class="col-md-4">
                                                    <input type="hidden" name="type" value="' . $type . '">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="name" placeholder="Name" value="' . htmlspecialchars($contact['name'] ?? '') . '" data-validate ="name" required>
                                                        <label for="name" class="form-float-label">Name</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="relation" placeholder="Relation" value="' . htmlspecialchars($contact['relation'] ?? '') . '" required>
                                                        <label for="relation" class="form-float-label">Relation</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="contact" placeholder="Contact" value="' . htmlspecialchars($contact['contact'] ?? '') . '" data-validate ="indian-phone" required>
                                                        <label for="contact" class="form-float-label">Contact</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>';
                        }
                        $content .= '
                            </div>
                            <div class="col-12 text-end">
                                <button type="button" class="btn btn-primary mb-3" data-repeater-create>
                                    <i class="fa-solid fa-plus"></i> Add Emergency Contact
                                </button>
                            </div>
                        </div>';
                        $popup = [
                            'form' => 'content',
                            'labelType' => 'floating',
                            'content' => $content,
                            'type' => 'modal',
                            'size' => 'modal-lg',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-address-card"></i> Emergency Contact',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();window.skeleton.repeater();'
                        ];
                    } else if ($type === 'familyinfo') {
                        $familyInfo = json_decode($employeeDetailsData->family_info, true) ?? [];
                        $content = '
                        <input type="hidden" name="save_token" value="' . $token .'">
                        <input type="hidden" name="type" value="' . $type . '">
                        <div class="repeater-container">
                            <div class="repeater" data-repeater-list="items">';
                             if (empty($familyInfo)) {
                            $familyInfo = [[]]; 
                        }
                        foreach ($familyInfo as $index => $info) {
                            $content .= '
                                <div data-repeater-item class="repeater-item">
                                    <div class="card shadow-none">
                                        <div class="card-body p-2">
                                            <div class="d-flex justify-content-between">
                                                <h6 class="mb-2">Family Member</h6>
                                                <button type="button" class="btn btn-sm" data-repeater-delete>
                                                    <i class="far fa-trash-alt text-danger"></i>
                                                </button>
                                            </div>
                                            <div class="row g-2">
                                                <div class="col-md-4">
                                                    <input type="hidden" name="type" value="' . $type . '">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="name" placeholder="Name" value="' . htmlspecialchars($info['name'] ?? '') . '" required>
                                                        <label for="name" class="form-float-label">Name</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="relation" placeholder="Relation" value="' . htmlspecialchars($info['relation'] ?? '') . '" required>
                                                        <label for="relation" class="form-float-label">Relation</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-2">
                                                    <div class="float-input-control">
                                                        <input type="date" class="form-float-input" name="dob" placeholder="DOB" value="' . htmlspecialchars($info['dob'] ?? '') . '" required>
                                                        <label for="dob" class="form-float-label">DOB</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <div class="float-input-control">
                                                        <input type="tel" class="form-float-input" name="phone" placeholder="Phone" value="' . htmlspecialchars($info['phone'] ?? '') . '" data-validate ="indian-phone" required>
                                                        <label for="phone" class="form-float-label">Phone</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>';
                        }
                        $content .= '
                            </div>
                            <div class="col-12 text-end">
                                <button type="button" class="btn btn-primary mb-3" data-repeater-create>
                                    <i class="fa-solid fa-plus"></i> Add Bank Account
                                </button>
                            </div>
                        </div>';
                        $popup = [
                            'form' => 'content',
                            'labelType' => 'floating',
                            'content' => $content,
                            'type' => 'modal',
                            'size' => 'modal-lg',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-address-card"></i> Bank Details',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();window.skeleton.repeater();'
                        ];
                    }  else if ($type === 'educationalinfo') {
                        $educationalInfo = json_decode($employeeDetailsData->educational_info, true) ?? [];
                        $content = '
                        <input type="hidden" name="save_token" value="' . $token .'">
                        <input type="hidden" name="type" value="' . $type . '">
                        <div class="repeater-container">
                            <div class="repeater" data-repeater-list="items">';
                             if (empty($educationalInfo)) {
                            $educationalInfo = [[]]; 
                        }
                        foreach ($educationalInfo as $index => $edu) {
                            $content .= '
                                <div data-repeater-item class="repeater-item mb-1">
                                    <div class="card">
                                        <div class="card-body p-2">
                                            <div class="d-flex justify-content-between">
                                                <h6 class="mb-2">Education Details</h6>
                                                <button type="button" class="btn btn-sm" data-repeater-delete>
                                                    <i class="far fa-trash-alt text-danger"></i>
                                                </button>
                                            </div>
                                            <div class="row g-2">
                                                <div class="col-md-4">
                                                    <input type="hidden" name="type" value="' . $type . '">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="degree" placeholder="Degree" value="' . htmlspecialchars($edu['degree'] ?? '') . '"  required>
                                                        <label for="degree" class="form-float-label">Degree</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="date" class="form-float-input" name="year" placeholder="Year" value="' . htmlspecialchars($edu['year'] ?? '') . '" required>
                                                        <label for="year" class="form-float-label">Paased Out Year</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="institution" placeholder="Institution" value="' . htmlspecialchars($edu['institution'] ?? '') . '" required>
                                                        <label for="institution" class="form-float-label">Institution</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>';
                        }
                        $content .= '
                            </div>
                            <div class="col-12 text-end">
                                <button type="button" class="btn btn-primary mb-3" data-repeater-create>
                                    <i class="fa-solid fa-plus"></i> Add Educational Info
                                </button>
                            </div>
                        </div>';
                        $popup = [
                            'form' => 'content',
                            'labelType' => 'floating',
                            'content' => $content,
                            'type' => 'modal',
                            'size' => 'modal-lg',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-address-card"></i>  Educational Details',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();window.skeleton.repeater();'
                        ];
                    }  else if ($type === 'experience') {
                        $experience = json_decode($employeeDetailsData->experience, true) ?? [];
                        $content = '
                        <input type="hidden" name="save_token" value="' . $token .'">
                        <input type="hidden" name="type" value="' . $type . '">
                        <div class="repeater-container">
                            <div class="repeater" data-repeater-list="items">';
                             if (empty($experience)) {
                            $experience = [[]]; 
                        }
                        foreach ($experience as $index => $exp) {
                            $content .= '
                                <div data-repeater-item class="repeater-item mb-1">
                                    <div class="card">
                                        <div class="card-body p-2">
                                            <div class="d-flex justify-content-between">
                                                <h6 class="mb-2">Experience Details</h6>
                                                <button type="button" class="btn btn-sm" data-repeater-delete>
                                                    <i class="far fa-trash-alt text-danger"></i>
                                                </button>
                                            </div>
                                            <div class="row g-2">
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="company" placeholder="Company" value="' . htmlspecialchars($exp['company'] ?? '') . '"  required>
                                                        <label for="company" class="form-float-label">Company</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="text" class="form-float-input" name="role" placeholder="Role" value="' . htmlspecialchars($exp['role'] ?? '') . '" required>
                                                        <label for="role" class="form-float-label">Role</label>
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <div class="float-input-control">
                                                        <input type="number" class="form-float-input" name="years" placeholder="Institution" value="' . htmlspecialchars($exp['years'] ?? '') . '" required>
                                                        <label for="years" class="form-float-label">Years of Experience</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>';
                        }
                        $content .= '
                            </div>
                            <div class="col-12 text-end">
                                <button type="button" class="btn btn-primary mb-3" data-repeater-create>
                                    <i class="fa-solid fa-plus"></i> Add Experience
                                </button>
                            </div>
                        </div>';
                        $popup = [
                            'form' => 'content',
                            'labelType' => 'floating',
                            'content' => $content,
                            'type' => 'modal',
                            'size' => 'modal-lg',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-address-card"></i>  Experience Details',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();window.skeleton.repeater();'
                        ];
                    } else if ($type === 'sociallinks') {
                        $socialLinks = json_decode($employeeDetailsData->social_links, true) ?? [];
                        $content = '
                            <input type="hidden" name="save_token" value="' . $token .'">
                            <input type="hidden" name="type" value="' . $type . '">
                            <div class="row p-4">';
                        foreach ([
                            'facebook' => ['label' => 'Facebook', 'icon' => 'facebook.svg', 'db_key' => 'facebook'],
                            'instagram' => ['label' => 'Instagram', 'icon' => 'instagram.svg', 'db_key' => 'instagram'],
                            'youtube' => ['label' => 'YouTube', 'icon' => 'youtube.svg', 'db_key' => 'youtube'],
                            'x' => ['label' => 'X', 'icon' => 'x.svg', 'db_key' => 'x'],
                            'linkedin' => ['label' => 'LinkedIn', 'icon' => 'linkedin.svg', 'db_key' => 'linkedin'],
                            'github' => ['label' => 'GitHub', 'icon' => 'github.svg', 'db_key' => 'github'],
                        ] as $platform => $data) {
                            $content .= '
                                <div class="row g-0 align-items-center mb-3">
                                    <div class="d-flex align-items-center gap-3 col-lg-5">
                                        <img src="' . asset('treasury/social/' . $data['icon']) . '" alt="' . $data['label'] . '"
                                            class="img-fluid rounded-circle" style="width: 30px; height: 30px;">
                                        <div>
                                            <p class="fw-bold sf-16 mb-1">' . $data['label'] . '</p>
                                            <p class="sf-10">Integrate your ' . $data['label'] . ' account</p>
                                        </div>
                                    </div>
                                    <div class="col-lg-7">
                                        <div class="float-input-control">
                                            <input type="text" id="' . $platform . '_url" name="' . $platform . '_url"
                                                value="' . htmlspecialchars($socialLinks[$data['db_key']] ?? '') . '" 
                                                class="form-float-input" placeholder="none">
                                            <label for="' . $platform . '_url" class="form-float-label">' . $data['label'] . '</label>
                                        </div>
                                    </div>
                                </div>';
                        }
                        $content .= '
                            </div>';
                        $popup = [
                            'form' => 'content',
                            'labelType' => 'floating',
                            'content' => $content,
                            'type' => 'modal',
                            'size' => 'modal-lg',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-link"></i> Social Links',
                            'button' => 'Update',
                            'script' => 'window.skeleton.select();'
                        ];
                    } else if ($type === 'deactivate') {
                        $content = '
                            <div class="row">
                                <div class="col-12">
                                           <input type="hidden" name="save_token" value="' . $token .'">
                                            <input type="hidden" name="type" value="deactivate">
                                            <div class="alert alert-warning" role="alert">
                                                Are you sure you want to deactivate your account?
                                            </div>
                                            <div class="form-check ms-3">
                                                <input type="checkbox" class="form-check-input" id="deactivate_confirm" name="account_status" required>
                                                <label class="form-check-label" for="deactivate_confirm">I confirm I want to deactivate my account</label>
                                            </div>
                                </div>
                            </div>';
                        $popup = [
                            'form' => 'content',
                            'labelType' => 'floating',
                            'content' => $content,
                            'type' => 'modal',
                            'size' => 'modal-sm',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-user-slash"></i> Deactivate Account',
                            'button' => 'Deactivate',
                            'script' => 'window.skeleton.select();'
                        ];
                    }
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
            Developer::emergency('token to save ', ['token is' => $token]);
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
