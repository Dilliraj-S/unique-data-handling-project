@php
use App\Facades\{BusinessDB, Select};
$isUpdate = isset($company);
$companyData = $company ?? (object)[];
@endphp

<form id="sample-form" action="/submit" method="POST">
    @csrf
    <div data-stepper id="form-stepper" class="mb-4">
        <!-- Stepper Navigation -->
        <ul class="nav nav-pills mb-3" data-stepper-nav>
            <li class="nav-item">
                <a class="nav-link active" href="#" data-step-nav="0">Company Data</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" data-step-nav="1">Employee Data</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" data-step-nav="2">Device Data</a>
            </li>
        </ul>
        <!-- Steps -->
        <!-- Company Data Step -->
        <div data-step class="p-3 border rounded">
            <div class="row">
                <input type="hidden" name="save_token" value="{{ $token ?? '' }}">
                <div class="mb-3 col-md-6">
                    <label for="company_id" class="form-label">Company ID <span class="text-danger">*</span></label>
                    <select class="form-control" id="company_id" name="company_id" data-select="dropdown"
                        data-token="@skeletonToken('business_companies')_a" data-text="Add Companies" required>
                        @foreach (Select::options('companies', 'array', ['company_id' => 'name']) as $value => $label)
                            <option value="{{ $value }}" {{ old('company_id', $companyData->company_id ?? '') == $value ? 'selected' : '' }}>{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="branch_id" class="form-label">Branch ID</label>
                    <select class="form-control" id="branch_id" name="branch_id" data-select="dropdown"
                        data-token="@skeletonToken('company_branch_select')_s" data-text="Add Branch">
                        @foreach (Select::options('branches', 'array', ['branch_id' => 'name']) as $value => $label)
                            <option value="{{ $value }}" {{ old('branch_id', $companyData->branch_id ?? '') == $value ? 'selected' : '' }}>{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="department_id" class="form-label">Department ID</label>
                    <select class="form-control" id="department_id" name="department_id" data-select="dropdown"
                        data-token="@skeletonToken('departments')_d" data-text="Add Department">
                        @foreach (Select::options('departments', 'array', ['department_id' => 'name']) as $value => $label)
                            <option value="{{ $value }}" {{ old('department_id', $companyData->department_id ?? '') == $value ? 'selected' : '' }}>{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="designation_id" class="form-label">Designation ID</label>
                    <select class="form-control" id="designation_id" name="designation_id" data-select="dropdown"
                        data-token="@skeletonToken('designations')_e" data-text="Add Designation">
                        @foreach (Select::options('designations', 'array', ['designation_id' => 'name']) as $value => $label)
                            <option value="{{ $value }}" {{ old('designation_id', $companyData->designation_id ?? '') == $value ? 'selected' : '' }}>{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="shift_id" class="form-label">Shift ID</label>
                    <select class="form-control" id="shift_id" name="shift_id" data-select="dropdown"
                        data-token="@skeletonToken('shifts')_f" data-text="Add Shift">
                        @foreach (Select::options('shifts', 'array', ['shift_id' => 'name']) as $value => $label)
                            <option value="{{ $value }}" {{ old('shift_id', $companyData->shift_id ?? '') == $value ? 'selected' : '' }}>{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="shift_schedule_id" class="form-label">Shift Schedule ID</label>
                    <select class="form-control" id="shift_schedule_id" name="shift_schedule_id" data-select="dropdown"
                        data-token="@skeletonToken('shift_schedules')_g" data-text="Add Shift Schedule">
                        @foreach (Select::options('shift_schedules', 'array', ['shift_schedule_id' => 'name']) as $value => $label)
                            <option value="{{ $value }}" {{ old('shift_schedule_id', $ncompanyData->shift_schedule_id ?? '') == $value ? 'selected' : '' }}>{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
            </div>
        </div>
        <!-- Employee Data Step -->
        <div data-step class="p-3 border rounded d-none">
            <div class="row">
                <div class="mb-3 col-md-6">
                    <label for="employee_id" class="form-label">Employee ID <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="employee_id" name="employee_id"
                        data-validate="employee-id" value="{{ old('employee_id', $companyData->employee_id ?? '') }}"
                        required>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="first_name" class="form-label">First Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="first_name" name="first_name"
                        value="{{ old('first_name', $companyData->first_name ??

 '') }}" required>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="last_name" class="form-label">Last Name</label>
                    <input type="text" class="form-control" id="last_name" name="last_name"
                        value="{{ old('last_name', $companyData->last_name ?? '') }}">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="role_id" class="form-label">Role <span class="text-danger">*</span></label>
                    <input type="number" class="form-control" id="role_id" name="role_id"
                        value="{{ old('role_id', $companyData->role_id ?? '') }}" required>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="birth_date" class="form-label">Birth Date</label>
                    <input type="date" class="form-control" id="birth_date" name="birth_date"
                        value="{{ old('birth_date', $companyData->birth_date ?? '') }}">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="phone" class="form-label">Phone <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="phone" name="phone"
                        value="{{ old('phone', $companyData->phone ?? '') }}" required>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="phone_alt" class="form-label">Alternate Phone</label>
                    <input type="text" class="form-control" id="phone_alt" name="phone_alt"
                        value="{{ old('phone_alt', $companyData->phone_alt ?? '') }}">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="email" class="form-label">Email <span class="text-danger">*</span></label>
                    <input type="email" class="form-control" id="email" name="email"
                        value="{{ old('email', $companyData->email ?? '') }}" required>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="email_alt" class="form-label">Alternate Email</label>
                    <input type="email" class="form-control" id="email_alt" name="email_alt"
                        value="{{ old('email_alt', $companyData->email_alt ?? '') }}">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="username" class="form-label">Username <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="username" name="username"
                        value="{{ old('username', $companyData->username ?? '') }}" required>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="password" class="form-label">Password <span class="text-danger">*</span></label>
                    <input type="password" class="form-control" id="password" name="password" required>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="joined_date" class="form-label">Joined Date</label>
                    <input type="date" class="form-control" id="joined_date" name="joined_date"
                        value="{{ old('joined_date', $companyData->joined_date ?? '') }}">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="allow_authentication" class="form-label">Allow Authentication</label>
                    <select class="form-control" id="allow_authentication" name="allow_authentication"
                        data-source="dropdown">
                        <option value="0" {{ old('allow_authentication', $companyData->allow_authentication ?? '') == '0' ? 'selected' : '' }}>No</option>
                        <option value="1" {{ old('allow_authentication', $companyData->allow_authentication ?? '') == '1' ? 'selected' : '' }}>Yes</option>
                    </select>
                </div>
            </div>
        </div>
        <!-- Device Data Step -->
        <div data-step class="p-3 border rounded d-none">
            <div class="row">
                <div class="mb-3 col-md-6">
                    <label for="pin" class="form-label">PIN <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="pin" name="pin"
                        value="{{ old('pin', $companyData->pin ?? '') }}" required
                        pattern="[A-Za-z0-9_-]{1,50}" maxlength="50"
                        title="Must be alphanumeric, underscores, or dashes, up to 50 characters">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="name" class="form-label">Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="name" name="name"
                        value="{{ old('name', $companyData->name ?? '') }}" required maxlength="255">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="pri" class="form-label">Priority <span class="text-danger">*</span></label>
                    <input type="number" class="form-control" id="pri" name="pri"
                        value="{{ old('pri', $companyData->pri ?? '') }}" required min="0" max="14">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="verify" class="form-label">Verify <span class="text-danger">*</span></label>
                    <select class="form-control" id="verify" name="verify" required>
                        <option value="0" {{ old('verify', $companyData->verify ?? '') == '0' ? 'selected' : '' }}>No</option>
                        <option value="1" {{ old('verify', $companyData->verify ?? '') == '1' ? 'selected' : '' }}>Yes</option>
                    </select>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="card" class="form-label">Card <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="card" name="card"
                        value="{{ old('card', $companyData->card ?? '') }}" required maxlength="50">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="grp" class="form-label">Group <span class="text-danger">*</span></label>
                    <input type="number" class="form-control" id="grp" name="grp"
                        value="{{ old('grp', $companyData->grp ?? '') }}" required min="1">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="passwd" class="form-label">Password <span class="text-danger">*</span></label>
                    <input type="password" class="form-control" id="passwd" name="passwd"
                        value="{{ old('passwd', $companyData->passwd ?? '') }}" required maxlength="50">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="expires" class="form-label">Expires <span class="text-danger">*</span></label>
                    <select class="form-control" id="expires" name="expires" required>
                        <option value="0" {{ old('expires', $companyData->expires ?? '') == '0' ? 'selected' : '' }}>No</option>
                        <option value="1" {{ old('expires', $companyData->expires ?? '') == '1' ? 'selected' : '' }}>Yes</option>
                    </select>
                </div>
                <div class="mb-3 col-md-6">
                    <label for="start_datetime" class="form-label">Start Date <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" id="start_datetime" name="start_datetime"
                        value="{{ old('start_datetime', $companyData->start_datetime ?? '') }}" required
                        pattern="\d{4}-\d{2}-\d{2}">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="end_datetime" class="form-label">End Date <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" id="end_datetime" name="end_datetime"
                        value="{{ old('end_datetime', $companyData->end_datetime ?? '') }}" required
                        pattern="\d{4}-\d{2}-\d{2}">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="username" class="form-label">Username <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="username" name="username"
                        value="{{ old('username', $companyData->username ?? '') }}" required
                        pattern="[A-Z]{3}\d{4}" title="Must be 3 letters followed by 4 digits (e.g., ABC1234)">
                </div>
                <div class="mb-3 col-md-6">
                    <label for="email" class="form-label">Email <span class="text-danger">*</span></label>
                    <input type="email" class="form-control" id="email" name="email"
                        value="{{ old('email', $companyData->email ?? '') }}" required>
                </div>
                <div class="mb-3 col-md-6">
                    <label class="form-label">Add Employee to this Device <span class="text-danger">*</span></label>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="add_device" id="add_device_yes"
                            value="1" {{ old('add_device', $companyData->add_device ?? '') == '1' ? 'checked' : '' }} required>
                        <label class="form-check-label" for="add_device_yes">Yes</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="add_device" id="add_device_no"
                            value="0" {{ old('add_device', $companyData->add_device ?? '') == '0' ? 'checked' : '' }}>
                        <label class="form-check-label" for="add_device_no">No</label>
                    </div>
                </div>
            </div>
        </div>
        <!-- Navigation Buttons -->
        <div class="d-flex justify-content-between mt-3">
            <button type="button" data-stepper-prev class="btn btn-secondary">Previous</button>
            <button type="button" data-stepper-next class="btn btn-primary">Next</button>
            <button type="submit" class="btn btn-success d-none">{{ $isUpdate ? 'Update' : 'Submit' }}</button>
        </div>
    </div>
</form>