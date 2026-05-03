@extends('layouts.system-app')
@section('title', 'Skeleton-configs | Gotit HR Management Software')

@section('content')
    <div class="content">
        <!-- Breadcrumb -->
        <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
            <div class="my-auto mb-2">
                <h3 class="mb-1">Profile</h3>
                <nav>
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Profile</a>
                        </li>
                    </ol>
                </nav>
            </div>
            <div class="d-flex my-xl-auto right-content align-items-center flex-wrap">
                <div class="mb-2">
                    <div class="live-time-container head-icons">
                        <span class="live-time-icon me-2">
                            <i class="fa-thin fa-clock"></i>
                        </span>
                        <div class="live-time"></div>
                    </div>
                </div>
                <div class="ms-2 head-icons">
                    <a href="javascript:void(0);" data-bs-toggle="tooltip" data-bs-placement="top"
                        data-bs-original-title="Collapse" id="collapse-header">
                        <i class="ti ti-chevrons-up"></i>
                    </a>
                </div>
            </div>
        </div>
        <!-- /Breadcrumb -->
        <div class="row">
            <div class="col-xl-4 theiaStickySidebar">
                <div class="card card-bg-1">
                    <div class="card-body p-0">
                        <span class="avatar avatar-xl avatar-rounded border border-2 border-white m-auto d-flex mb-2">
                            <img src="{{ $user_profile->profile_picture_url ?? asset('assets/img/users/default-user.jpg') }}"
                                class="w-auto h-auto" alt="Img">
                        </span>
                        <div class="text-center px-3 pb-3 border-bottom">
                            <div class="mb-3">
                                <h5 class="d-flex align-items-center justify-content-center mb-1">
                                    {{ $employee->first_name ?? 'N/A' }} {{ $employee->last_name ?? '' }}<i
                                        class="ti ti-discount-check-filled text-success ms-1"></i></h5>
                                <span class="badge badge-soft-dark fw-medium me-2">
                                    <i class="ti ti-point-filled me-1"></i>{{ $employee->role_id ?? 'N/A' }}
                                </span>
                                <span
                                    class="badge badge-soft-secondary fw-medium">{{ !empty($user_profile->experience) ? array_sum(array_column($user_profile->experience, 'years')) . '+ years of Experience' : 'N/A' }}</span>
                            </div>
                            <div>
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="d-inline-flex align-items-center">
                                        <i class="ti ti-id me-2"></i>
                                        Employee ID
                                    </span>
                                    <p class="text-dark">{{ $employee->employee_id ?? 'N/A' }}</p>
                                </div>
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="d-inline-flex align-items-center">
                                        <i class="ti ti-star me-2"></i>
                                        Department
                                    </span>
                                    <p class="text-dark">{{ $employee_work->department_id ?? 'N/A' }}</p>
                                </div>
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="d-inline-flex align-items-center">
                                        <i class="ti ti-star me-2"></i>
                                        Designation
                                    </span>
                                    <p class="text-dark">{{ $employee_work->designation_id ?? 'N/A' }}</p>
                                </div>
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="d-inline-flex align-items-center">
                                        <i class="ti ti-calendar-check me-2"></i>
                                        Date Of Join
                                    </span>
                                    <p class="text-dark">
                                        {{ $employee->joined_date ? \Carbon\Carbon::parse($employee->joined_date)->format('jS M Y') : 'N/A' }}
                                    </p>
                                </div>
                                <div class="row gx-2 mt-3">
                                    <div class="col-12">
                                        <div>
                                            <button type="button" class="btn btn-dark skeleton-popup w-100"
                                                data-token="@skeletonToken('business_profile_update')_e_main"><i class="ti ti-edit me-2"></i>Edit
                                                Info</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="p-3 border-bottom">
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <h6>Basic information</h6>
                                <a href="javascript:void(0);" class="btn btn-icon btn-sm skeleton-popup"
                                    data-token="@skeletonToken('business_profile_update')_e_basicinfo"><i class="ti ti-edit"></i></a>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="d-inline-flex align-items-center">
                                    <i class="ti ti-phone me-2"></i>Phone
                                </span>
                                <p class="text-dark">{{ $employee->phone ?? 'N/A' }}</p>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="d-inline-flex align-items-center">
                                    <i class="ti ti-mail-check me-2"></i>Email
                                </span>
                                <a href="javascript:void(0);" class="text-info d-inline-flex align-items-center">
                                    {{ $employee->email ?? 'N/A' }}<i class="ti ti-copy text-dark ms-2"></i>
                                </a>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="d-inline-flex align-items-center">
                                    <i class="ti ti-gender-male me-2"></i>Gender
                                </span>
                                <p class="text-dark text-end">{{ $user_profile->gender ?? 'N/A' }}</p>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="d-inline-flex align-items-center">
                                    <i class="ti ti-cake me-2"></i>Birthday
                                </span>
                                <p class="text-dark text-end">{{ $user_profile->date_of_birth ?? 'N/A' }}</p>
                            </div>
                            <div class="d-flex align-items-center justify-content-between">
                                <span class="d-inline-flex align-items-center">
                                    <i class="ti ti-map-pin-check me-2"></i>Address
                                </span>
                                <p class="text-dark text-end">{{ $user_profile->address ?? 'N/A' }}</p>
                            </div>
                        </div>
                        <div class="p-3 border-bottom">
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <h6>Personal Information</h6>
                                <a href="javascript:void(0);" class="btn btn-icon btn-sm skeleton-popup"
                                    data-token="@skeletonToken('business_profile_update')_e_personalinfo"><i class="ti ti-edit"></i></a>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="d-inline-flex align-items-center">
                                    <i class="ti ti-gender-male me-2"></i>Nationality
                                </span>
                                <p class="text-dark text-end">{{ $user_profile->nationality ?? 'N/A' }}</p>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="d-inline-flex align-items-center">
                                    <i class="ti ti-hotel-service me-2"></i>Marital Status
                                </span>
                                <p class="text-dark text-end">{{ $user_profile->marital_status ?? 'N/A' }}</p>
                            </div>
                        </div>
                        <div class="p-3 border-bottom">
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <h6>Social Network</h6>
                                <a href="javascript:void(0);" class="btn btn-icon btn-sm skeleton-popup"
                                    data-token="@skeletonToken('business_profile_update')_e_sociallinks"><i class="ti ti-edit"></i></a>
                            </div>
                            @if (!empty($user_profile->social_links))
                                <div class="d-flex align-items-center justify-content-center mb-0">
                                    @foreach ($user_profile->social_links as $platform => $url)
                                        @if (!empty($url))
                                            <a href="{{ $url }}" class="avatar avatar-md me-2 avatar-rounded"
                                                target="_blank">
                                                <img src="{{ asset('treasury/social/' . strtolower($platform) . '.svg') }}"
                                                    alt="{{ $platform }}">
                                            </a>
                                        @endif
                                    @endforeach
                                </div>
                            @else
                                <p class="text-center">No social links added.</p>
                            @endif
                        </div>
                    </div>
                </div>
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <h6 class="mb-0">Emergency Contact Number</h6>
                    <a href="#" class="btn btn-sm btn-icon ms-auto skeleton-popup"
                        data-token="@skeletonToken('business_profile_update')_e_emergencycontact">
                        <i class="ti ti-edit"></i>
                    </a>
                </div>
                <div class="card">
                    <div class="card-body p-0">
                        @if (!empty($user_profile->emergency_contact))
                            @foreach ($user_profile->emergency_contact as $index => $emergency)
                                <div class="p-3 border-bottom">
                                    <div
                                        class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                                        <div>
                                            <span
                                                class="badge bg-primary mb-1">{{ $index === 0 ? 'Primary' : 'Contact ' . ($index + 1) }}</span>
                                            <h6 class="mb-0 fw-semibold">
                                                {{ $emergency['name'] ?? 'N/A' }}
                                                <span class="mx-1"><i class="ti ti-point-filled text-danger"></i></span>
                                                {{ $emergency['relation'] ?? 'N/A' }}
                                            </h6>
                                        </div>
                                        <div class="text-muted mt-2 mt-md-0">
                                            <p class="mb-0">{{ $emergency['contact'] ?? 'N/A' }}</p>
                                        </div>
                                    </div>
                                </div>
                            @endforeach
                        @else
                            <div class="p-3">
                                <p class="mb-0 text-muted">No Emergency details added.</p>
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        
            <div class="col-xl-8">
                <div>
                    <div class="rounded">
                        <ul class="nav nav-underline border-bottom-0 mb-1" role="tablist">
                            <li class="nav-item" role="presentation">
                                <a class="nav-link active fw-medium d-flex align-items-center justify-content-center"
                                    href="#bottom-justified-tab1" data-bs-toggle="tab" aria-selected="false"
                                    role="tab">
                                    <i class="ti ti-activity me-1"></i>
                                    Profile
                                </a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link fw-medium d-flex align-items-center justify-content-center"
                                    href="#bottom-justified-tab2" data-bs-toggle="tab" aria-selected="false"
                                    role="tab">
                                    <i class="ti ti-file-description me-1"></i>
                                    Notifications
                                </a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link fw-medium d-flex align-items-center justify-content-center"
                                    href="#bottom-justified-tab3" data-bs-toggle="tab" aria-selected="true"
                                    role="tab">
                                    <i class="ti ti-phone-call me-1"></i>
                                    Log History
                                </a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link fw-medium d-flex align-items-center justify-content-center"
                                    href="#bottom-justified-tab4" data-bs-toggle="tab" aria-selected="true"
                                    role="tab">
                                    <i class="ti ti-files me-1"></i>
                                    Documents
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div class="tab-content">
                        <div class="tab-pane active show" id="bottom-justified-tab1" role="tabpanel">
                            <div class="tab-content custom-accordion-items">
                                <div class="tab-pane active show" id="bottom-justified-tab1" role="tabpanel">
                                    <div class="accordion accordions-items-seperate" id="accordionExample">
                                        <div class="accordion-item">
                                            <div class="accordion-header" id="headingOne">
                                                <div class="accordion-button">
                                                    <div class="d-flex align-items-center flex-fill">
                                                        <h5>About Employee</h5>
                                                        <a href="#"
                                                            class="btn btn-sm btn-icon ms-auto skeleton-popup"
                                                            data-token="@skeletonToken('business_profile_update')_e_about"><i
                                                                class="ti ti-edit"></i></a>
                                                        <a href="#"
                                                            class="d-flex align-items-center collapsed collapse-arrow"
                                                            data-bs-toggle="collapse" data-bs-target="#primaryBorderOne"
                                                            aria-expanded="false" aria-controls="primaryBorderOne">
                                                            <i class="ti ti-chevron-down fs-18"></i>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="primaryBorderOne" class="accordion-collapse collapse show border-top"
                                                aria-labelledby="headingOne" data-bs-parent="#accordionExample">
                                                <div class="accordion-body mt-2">
                                                    {{ $user_profile->about ?? 'No bio available' }}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="accordion-item">
                                            <div class="accordion-header" id="headingTwo">
                                                <div class="accordion-button">
                                                    <div class="d-flex align-items-center flex-fill">
                                                        <h5>Bank Information</h5>
                                                        <a href="#"
                                                            class="btn btn-sm btn-icon ms-auto skeleton-popup"
                                                            data-token="@skeletonToken('business_profile_update')_e_bankdetails"><i
                                                                class="ti ti-edit"></i></a>
                                                        <a href="#"
                                                            class="d-flex align-items-center collapsed collapse-arrow"
                                                            data-bs-toggle="collapse" data-bs-target="#primaryBorderTwo"
                                                            aria-expanded="false" aria-controls="primaryBorderTwo">
                                                            <i class="ti ti-chevron-down fs-18"></i>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="primaryBorderTwo" class="accordion-collapse collapse border-top"
                                                aria-labelledby="headingTwo" data-bs-parent="#accordionExample">
                                                <div class="accordion-body">
                                                    <div class="row">
                                                        @if (!empty($user_profile->bank_accounts) && count($user_profile->bank_accounts))
                                                            {{-- Headers --}}
                                                            <div class="col-md-1 fw-bold">S.No.</div>
                                                            <div class="col-md-3 fw-bold">Bank Name</div>
                                                            <div class="col-md-3 fw-bold">Bank Account No</div>
                                                            <div class="col-md-2 fw-bold">IFSC Code</div>
                                                            <div class="col-md-3 fw-bold">Branch</div>
                                                            {{-- Data rows --}}
                                                            @foreach ($user_profile->bank_accounts as $index => $bank)
                                                                <div class="w-100 d-flex mb-1">
                                                                    <div class="col-md-1">
                                                                        <h6 class="fw-medium mt-1">{{ $index + 1 }}
                                                                        </h6>
                                                                    </div>
                                                                    <div class="col-md-3">
                                                                        <h6 class="fw-medium mt-1">
                                                                            {{ $bank['bank_name'] ?? 'N/A' }}</h6>
                                                                    </div>
                                                                    <div class="col-md-3">
                                                                        <h6 class="fw-medium mt-1">
                                                                            {{ $bank['account_number'] ?? 'N/A' }}</h6>
                                                                    </div>
                                                                    <div class="col-md-2">
                                                                        <h6 class="fw-medium mt-1">
                                                                            {{ $bank['ifsc_code'] ?? 'N/A' }}</h6>
                                                                    </div>
                                                                    <div class="col-md-3">
                                                                        <h6 class="fw-medium mt-1">
                                                                            {{ $bank['branch'] ?? 'N/A' }}
                                                                        </h6>
                                                                    </div>
                                                                </div>
                                                            @endforeach
                                                        @else
                                                            <p>No bank accounts added.</p>
                                                        @endif
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="accordion-item">
                                            <div class="accordion-header" id="headingThree">
                                                <div class="accordion-button">
                                                    <div
                                                        class="d-flex align-items-center justify-content-between flex-fill">
                                                        <h5>Family Information</h5>
                                                        <div class="d-flex">
                                                            <a href="#"
                                                                class="btn btn-sm btn-icon ms-auto skeleton-popup"
                                                                data-token="@skeletonToken('business_profile_update')_e_familyinfo"><i
                                                                    class="ti ti-edit"></i></a>
                                                            <a href="#"
                                                                class="d-flex align-items-center collapsed collapse-arrow"
                                                                data-bs-toggle="collapse"
                                                                data-bs-target="#primaryBorderThree" aria-expanded="false"
                                                                aria-controls="primaryBorderThree">
                                                                <i class="ti ti-chevron-down fs-18"></i>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="primaryBorderThree" class="accordion-collapse collapse border-top"
                                                aria-labelledby="headingThree" data-bs-parent="#accordionExample">
                                                <div class="accordion-body">
                                                    <div class="row">
                                                        @if (!empty($user_profile->family_info) && count($user_profile->family_info))
                                                            {{-- Headers --}}
                                                            <div class="col-md-1 fw-bold">S.No.</div>
                                                            <div class="col-md-3 fw-bold">Name</div>
                                                            <div class="col-md-3 fw-bold">Relationship</div>
                                                            <div class="col-md-3 fw-bold">Date of Birth</div>
                                                            <div class="col-md-2 fw-bold">Phone</div>
                                                            {{-- Data Rows --}}
                                                            @foreach ($user_profile->family_info as $index => $family)
                                                                <div class="w-100 d-flex mb-1">
                                                                    <div class="col-md-1">
                                                                        <h6 class="fw-medium mt-1">{{ $index + 1 }}
                                                                        </h6>
                                                                    </div>
                                                                    <div class="col-md-3">
                                                                        <h6 class="fw-medium mt-1">
                                                                            {{ $family['name'] ?? 'N/A' }}
                                                                        </h6>
                                                                    </div>
                                                                    <div class="col-md-3">
                                                                        <h6 class="fw-medium mt-1">
                                                                            {{ $family['relation'] ?? 'N/A' }}</h6>
                                                                    </div>
                                                                    <div class="col-md-3">
                                                                        <h6 class="fw-medium mt-1">
                                                                            {{ $family['dob'] ? \Carbon\Carbon::parse($family['dob'])->format('jS M Y') : 'N/A' }}
                                                                        </h6>
                                                                    </div>
                                                                    <div class="col-md-2">
                                                                        <h6 class="fw-medium mt-1">
                                                                            {{ $family['phone'] ?? 'N/A' }}
                                                                        </h6>
                                                                    </div>
                                                                </div>
                                                            @endforeach
                                                        @else
                                                            <p>No family information added.</p>
                                                        @endif
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="accordion-item">
                                                    <div class="row">
                                                        <div class="accordion-header" id="headingFour">
                                                            <div class="accordion-button">
                                                                <div
                                                                    class="d-flex align-items-center justify-content-between flex-fill">
                                                                    <h5>Education Details</h5>
                                                                    <div class="d-flex">
                                                                        <a href="#"
                                                                            class="btn btn-sm btn-icon ms-auto skeleton-popup"
                                                                            data-token="@skeletonToken('business_profile_update')_e_educationalinfo"><i
                                                                                class="ti ti-edit"></i></a>
                                                                        <a href="#"
                                                                            class="d-flex align-items-center collapsed collapse-arrow"
                                                                            data-bs-toggle="collapse"
                                                                            data-bs-target="#primaryBorderFour"
                                                                            aria-expanded="false"
                                                                            aria-controls="primaryBorderFour">
                                                                            <i class="ti ti-chevron-down fs-18"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div id="primaryBorderFour"
                                                            class="accordion-collapse collapse border-top"
                                                            aria-labelledby="headingFour"
                                                            data-bs-parent="#accordionExample">
                                                            <div class="accordion-body">
                                                                @if (!empty($user_profile->educational_info))
                                                                    @foreach ($user_profile->educational_info as $education)
                                                                        <div class="mb-3">
                                                                            <div
                                                                                class="d-flex align-items-center justify-content-between">
                                                                                <div>
                                                                                    <span
                                                                                        class="d-inline-flex align-items-center fw-normal">
                                                                                        {{ $education['institution'] ?? 'N/A' }}
                                                                                    </span>
                                                                                    <h6
                                                                                        class="d-flex align-items-center mt-1">
                                                                                        {{ $education['degree'] ?? 'N/A' }}
                                                                                    </h6>
                                                                                </div>
                                                                                <p class="text-dark">
                                                                                    {{ $education['year'] ?? 'N/A' }}</p>
                                                                            </div>
                                                                        </div>
                                                                    @endforeach
                                                                @else
                                                                    <p>No education details added.</p>
                                                                @endif
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="accordion-item">
                                                    <div class="row">
                                                        <div class="accordion-header" id="headingFive">
                                                            <div class="accordion-button collapsed">
                                                                <div
                                                                    class="d-flex align-items-center justify-content-between flex-fill">
                                                                    <h5>Experience</h5>
                                                                    <div class="d-flex">
                                                                        <a href="#"
                                                                            class="btn btn-sm btn-icon ms-auto skeleton-popup"
                                                                            data-token="@skeletonToken('business_profile_update')_e_experience"><i
                                                                                class="ti ti-edit"></i></a>
                                                                        <a href="#"
                                                                            class="d-flex align-items-center collapsed collapse-arrow"
                                                                            data-bs-toggle="collapse"
                                                                            data-bs-target="#primaryBorderFive"
                                                                            aria-expanded="false"
                                                                            aria-controls="primaryBorderFive">
                                                                            <i class="ti ti-chevron-down fs-18"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div id="primaryBorderFive"
                                                            class="accordion-collapse collapse border-top"
                                                            aria-labelledby="headingFive"
                                                            data-bs-parent="#accordionExample">
                                                            <div class="accordion-body">
                                                                @if (!empty($user_profile->experience))
                                                                    @foreach ($user_profile->experience as $exp)
                                                                        <div class="mb-3">
                                                                            <div
                                                                                class="d-flex align-items-center justify-content-between">
                                                                                <div>
                                                                                    <h6
                                                                                        class="d-inline-flex align-items-center fw-medium">
                                                                                        {{ $exp['company'] ?? 'N/A' }}
                                                                                    </h6>
                                                                                    <span
                                                                                        class="d-flex align-items-center badge bg-secondary-transparent mt-1">
                                                                                        <i
                                                                                            class="ti ti-point-filled me-1"></i>{{ $exp['role'] ?? 'N/A' }}
                                                                                    </span>
                                                                                </div>
                                                                                <p class="text-dark">
                                                                                    {{ $exp['years'] ? $exp['years'] . ' years' : 'N/A' }}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    @endforeach
                                                                @else
                                                                    <p>No experience added.</p>
                                                                @endif
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <!-- Hobbies, Languages, Skills -->
                                        <div class="card">
                                            <div class="card-body">
                                                <div class="contact-grids-tab p-0 mb-3">
                                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                                        <ul class="nav nav-tabs nav-tabs-solid bg-transparent border-bottom-0 mb-1 data-skl-action"
                                                            id="myTab" role="tablist">
                                                            <li class="nav-item" role="presentation">
                                                                <a class="nav-link active" id="hobbies-tab"
                                                                    data-bs-toggle="tab" data-bs-target="#hobbies"
                                                                    type="button" role="tab"
                                                                    aria-selected="true">Hobbies</a>
                                                            </li>
                                                            <li class="nav-item" role="presentation">
                                                                <a class="nav-link" id="languages-tab"
                                                                    data-bs-toggle="tab" data-bs-target="#languages"
                                                                    type="button" role="tab"
                                                                    aria-selected="false">Languages</a>
                                                            </li>
                                                            <li class="nav-item" role="presentation">
                                                                <a class="nav-link" id="skills-tab" data-bs-toggle="tab"
                                                                    data-bs-target="#skills" type="button"
                                                                    role="tab" aria-selected="false">Skills</a>
                                                            </li>
                                                        </ul>
                                                        <div class="text-end ms-3">
                                                            <a href="#" class="btn btn-sm btn-icon skeleton-popup"
                                                                data-token="@skeletonToken('business_profile_update')_e_summary">
                                                                <i class="ti ti-edit"></i>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="tab-content" id="myTabContent">
                                                    <div class="tab-pane fade show active" id="hobbies" role="tabpanel"
                                                        aria-labelledby="hobbies-tab" tabindex="0">
                                                        <div class="row">
                                                            <div class="col-md-12">
                                                                @if (!empty($user_profile->hobbies))
                                                                    <ul class="list-group">
                                                                        @foreach ($user_profile->hobbies as $hobby)
                                                                            <li class="list-group-item">
                                                                                {{ $hobby }}</li>
                                                                        @endforeach
                                                                    </ul>
                                                                @else
                                                                    <p>No hobbies added.</p>
                                                                @endif
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="tab-pane fade" id="languages" role="tabpanel"
                                                        aria-labelledby="languages-tab" tabindex="0">
                                                        <div class="row">
                                                            <div class="col-md-12">
                                                                @if (!empty($user_profile->languages))
                                                                    <ul class="list-group">
                                                                        @foreach ($user_profile->languages as $language)
                                                                            <li class="list-group-item">
                                                                                {{ $language }}</li>
                                                                        @endforeach
                                                                    </ul>
                                                                @else
                                                                    <p>No languages added.</p>
                                                                @endif
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="tab-pane fade" id="skills" role="tabpanel"
                                                        aria-labelledby="skills-tab" tabindex="0">
                                                        <div class="row">
                                                            <div class="col-md-12">
                                                                @if (!empty($user_profile->skills))
                                                                    <ul class="list-group">
                                                                        @foreach ($user_profile->skills as $skill)
                                                                            <li class="list-group-item">
                                                                                {{ $skill }}</li>
                                                                        @endforeach
                                                                    </ul>
                                                                @else
                                                                    <p>No skills added.</p>
                                                                @endif
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="card">
                                            <div class="card-body">
                                                <div class="border-bottom mb-3 pb-3">
                                                    <h5>Security Settings</h5>
                                                </div>
                                                <div>
                                                    <div
                                                        class="d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3">
                                                        <div class="mb-3">
                                                            <h6 class="fw-medium mb-1">Password</h6>
                                                            <div class="d-flex align-items-center">
                                                                <p class="mb-0 me-2 pe-2 border-end">Set a unique password
                                                                    to
                                                                    protect the account</p>
                                                                <p>Last Changed 03 Jan 2024, 09:00 AM</p>
                                                            </div>
                                                        </div>
                                                        <div class="mb-3">
                                                            <a href="#" class="btn btn-dark btn-sm skeleton-popup"
                                                                data-token="@skeletonToken('business_profile_update')_e_passwordchange">Change
                                                                Pasword</a>
                                                        </div>
                                                    </div>
                                                    <div
                                                        class="d-flex justify-content-between align-items-center flex-wrap">
                                                        <div class="mb-3">
                                                            <h6 class="fw-medium mb-1">Deactivate Account</h6>
                                                            <p>This will shutdown your account. Your account will be
                                                                reactive when
                                                                you sign in again</p>
                                                        </div>
                                                        <div class="mb-3">
                                                            <a href="#" class="btn btn-dark btn-sm skeleton-popup"
                                                                data-token="@skeletonToken('business_profile_update')_e_deactivate">Deactivate</a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane" id="bottom-justified-tab2" role="tabpanel">
                            <div class="card border-0">
                                <div class="card-header">
                                    <div class="d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                                        <h5>Notifications</h5>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="border rounded p-3 mb-3">
                                        <div class="d-flex align-items-center justify-content-between mb-3">
                                            <div class="d-flex align-items-center">
                                                <span class="avatar avatar-md avatar-rounded flex-shrink-0 me-2">
                                                    <img src="assets/img/profiles/avatar-02.jpg" alt="Img">
                                                </span>
                                                <div>
                                                    <h6 class="fw-medium mb-1">Darlee Robertson</h6>
                                                    <span>15 Sep 2023, 12:10 pm</span>
                                                </div>
                                            </div>
                                            <div class="d-flex align-items-center">
                                                <a href="javascript:void(0);" class="btn btn-icon btn-sm"><i
                                                        class="ti ti-trash"></i></a>
                                            </div>
                                        </div>
                                        <div>
                                            <h6 class="fw-medium mb-2">Notes added by Antony</h6>
                                            <p class="mb-3">A project review evaluates the success of an initiative and
                                                identifies areas for improvement.
                                                It can also evaluate a current project to determine whether
                                                it's on the right track. Or, it can determine the success of a completed
                                                project.
                                            </p>
                                        </div>
                                    </div>
                                    <div class="border rounded p-3 mb-3">
                                        <div class="d-flex align-items-center justify-content-between mb-3">
                                            <div class="d-flex align-items-center">
                                                <span class="avatar avatar-md avatar-rounded flex-shrink-0 me-2">
                                                    <img src="assets/img/profiles/avatar-03.jpg" alt="Img">
                                                </span>
                                                <div>
                                                    <h6 class="fw-medium mb-1">Sharon Roy</h6>
                                                    <span>18 Sep 2023, 09:52 am</span>
                                                </div>
                                            </div>
                                            <div class="d-flex align-items-center">
                                                <a href="javascript:void(0);" class="btn btn-icon btn-sm"><i
                                                        class="ti ti-trash"></i></a>
                                            </div>
                                        </div>
                                        <div>
                                            <h6 class="fw-medium mb-2">Notes added by Antony</h6>
                                            <p class="mb-3">
                                                A project plan typically contains a list of the essential elements of a
                                                project,
                                                such as stakeholders, scope, timelines, estimated cost and communication
                                                methods.
                                                The project manager typically lists the information based on the assignment.
                                            </p>
                                        </div>
                                    </div>
                                    <div class="border rounded p-3 mb-3">
                                        <div class="d-flex align-items-center justify-content-between mb-3">
                                            <div class="d-flex align-items-center">
                                                <span class="avatar avatar-md avatar-rounded flex-shrink-0 me-2">
                                                    <img src="assets/img/profiles/avatar-04.jpg" alt="Img">
                                                </span>
                                                <div>
                                                    <h6 class="fw-medium mb-1">Vaughan Lewis</h6>
                                                    <span>20 Sep 2023, 10:26 pm</span>
                                                </div>
                                            </div>
                                            <div class="d-flex align-items-center">
                                                <a href="javascript:void(0);" class="btn btn-icon btn-sm"><i
                                                        class="ti ti-edit"></i></a>
                                                <a href="javascript:void(0);" class="btn btn-icon btn-sm"><i
                                                        class="ti ti-trash"></i></a>
                                            </div>
                                        </div>
                                        <div>
                                            <h6 class="fw-medium mb-2">Notes added by Antony</h6>
                                            <p class="mb-3">
                                                Projects play a crucial role in the success of organizations, and their
                                                importance cannot
                                                be overstated. Whether it's launching a new product, improving an existing
                                            </p>
                                            <div class="notes-editor">
                                                <div class="note-edit-wrap">
                                                    <div class="mb-3">
                                                        <div class="summernote">Write a new comment, send your team
                                                            notification by typing @ followed by their name</div>
                                                    </div>
                                                    <div class="d-flex align-items-center justify-content-end mb-3">
                                                        <a href="javascript:void(0);"
                                                            class="btn btn-outline-light border add-cancel me-3">Cancel</a>
                                                        <a href="javascript:void(0);" class="btn btn-primary">Save</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane" id="bottom-justified-tab3" role="tabpanel">
                            <div class="card border-0">
                                <div class="card-header">
                                    <div class="d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                                        <h5>Login History</h5>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="table table-responsive">
                                        <table class="table">
                                            <thead class="thead-light">
                                                <tr>
                                                    <th>Device</th>
                                                    <th>Date</th>
                                                    <th>Location</th>
                                                    <th>IP Address</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>Chrome - Windows</td>
                                                    <td>15 May 2025, 10:30 AM</td>
                                                    <td>New York / USA</td>
                                                    <td>232.222.12.72</td>
                                                    <td>
                                                        <span><i class="ti ti-trash text-gray-6"></i></span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>Safari Macos</td>
                                                    <td>10 Apr 2025, 05:15 PM</td>
                                                    <td>New York / USA</td>
                                                    <td>224.111.12.75</td>
                                                    <td>
                                                        <span><i class="ti ti-trash text-gray-6"></i></span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>Firefox Windows</td>
                                                    <td>15 Mar 2025, 02:40 PM</td>
                                                    <td>New York / USA</td>
                                                    <td>111.222.13.28</td>
                                                    <td>
                                                        <span><i class="ti ti-trash text-gray-6"></i></span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>Safari Macos</td>
                                                    <td>15 May 2025, 10:30 AM</td>
                                                    <td>New York / USA</td>
                                                    <td>333.555.10.54</td>
                                                    <td>
                                                        <span><i class="ti ti-trash text-gray-6"></i></span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane" id="bottom-justified-tab4" role="tabpanel">
                            <div class="card border-0">
                                <div class="card-header">
                                    <div class="d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                                        <h5>Files</h5>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div
                                        class="row row-cols-xxl-5 row-cols-xl-3 row-cols-sm-3 row-cols-1 justify-content-center">
                                        <div class="col d-flex">
                                            <div class="card access-wrap border-0 flex-fill">
                                                <div class="card-body text-center">
                                                    <img src="{{ asset('treasury/default/default.svg') }}" alt="img"
                                                        class="mb-3">
                                                    <h6 class="mb-2 fw-medium"><a href="javascript:void(0);"
                                                            data-bs-toggle="offcanvas" data-bs-target="#preview">Final
                                                            Change.doc</a></h6>
                                                    <span class="badge badge-dark-transparent">2.4 GB</span>
                                                </div>
                                                <span class="access-rate rating-select"><i
                                                        class="ti ti-star-filled filled"></i></span>
                                            </div>
                                        </div>
                                        <div class="col d-flex">
                                            <div class="card access-wrap border-0 flex-fill">
                                                <div class="card-body text-center">
                                                    <img src="{{ asset('treasury/default/default.svg') }}" alt="img"
                                                        class="mb-3">
                                                    <h6 class="mb-2 fw-medium"><a href="javascript:void(0);"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#preview">Marklist.pdf</a></h6>
                                                    <span class="badge badge-dark-transparent">2.4 GB</span>
                                                </div>
                                                <span class="access-rate rating-select"><i class="ti ti-star"></i></span>
                                            </div>
                                        </div>
                                        <div class="col d-flex">
                                            <div class="card access-wrap border-0 flex-fill">
                                                <div class="card-body text-center">
                                                    <img src="{{ asset('treasury/default/default.svg') }}" alt="img"
                                                        class="mb-3">
                                                    <h6 class="mb-2 fw-medium"><a href="javascript:void(0);"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#preview">Nature.png</a></h6>
                                                    <span class="badge badge-dark-transparent">2.4 GB</span>
                                                </div>
                                                <span class="access-rate rating-select"><i
                                                        class="ti ti-star-filled filled"></i></span>
                                            </div>
                                        </div>
                                        <div class="col d-flex">
                                            <div class="card access-wrap border-0 flex-fill">
                                                <div class="card-body text-center">
                                                    <img src="{{ asset('treasury/default/default.svg') }}" alt="img"
                                                        class="mb-3">
                                                    <h6 class="mb-2 fw-medium"><a href="javascript:void(0);"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#preview">List.xlsx</a></h6>
                                                    <span class="badge badge-dark-transparent">2.4 GB</span>
                                                </div>
                                                <span class="access-rate rating-select"><i class="ti ti-star"></i></span>
                                            </div>
                                        </div>
                                        <div class="col d-flex">
                                            <div class="card access-wrap border-0 flex-fill">
                                                <div class="card-body text-center">
                                                    <img src="{{ asset('treasury/default/default.svg') }}" alt="img"
                                                        class="mb-3">
                                                    <h6 class="mb-2 fw-medium"><a href="javascript:void(0);"
                                                            data-bs-toggle="offcanvas" data-bs-target="#preview">Group
                                                            Photos</a></h6>
                                                    <span class="badge badge-dark-transparent">2.4 GB</span>
                                                </div>
                                                <span class="access-rate rating-select"><i class="ti ti-star"></i></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
