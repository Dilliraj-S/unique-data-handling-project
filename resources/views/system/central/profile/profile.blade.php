{{-- Template: Profile Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Profile')
@section('top-style')
@endsection
@section('bottom-script')
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const hash = window.location.hash;
        if (hash) {
            const tabTrigger = document.querySelector(`.nav-link[data-bs-target="${hash}"]`);
            if (tabTrigger) {
                const tab = new bootstrap.Tab(tabTrigger);
                tab.show();
            }
        }
    });
</script>
@endsection
@section('content')
<div class="content">
    <div class="container-xxl flex-grow-1 p-4 py-4">
                <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
                    <div class="my-auto mb-2">
                        <div class="col-xl-12">
                    <div class="container-fluid px-0 d-flex justify-content-between align-items-center">
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb">
                                <li class="breadcrumb-item">
                                    <a href="javascript:void(0);">Profile</a>
                                </li>
                                <li class="breadcrumb-item active fw-bold">Profile</li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
           
            <div class="d-flex align-items-center flex-wrap my-xl-auto right-content">
    <!-- Clock -->
    <div class="d-flex align-items-center mb-2 mb-xl-0 head-icons">
        <span class="live-time-icon me-2">
            <i class="fa-thin fa-clock"></i>
        </span>
        <div class="live-time"></div>
    </div>

    <!-- Collapse Icon -->
    <div class="ms-3 head-icons">
        <a href="javascript:void(0);" data-bs-toggle="tooltip" data-bs-placement="top"
            title="Collapse" id="collapse-header">
            <i class="ti ti-chevrons-up"></i>
        </a>
    </div>
</div>

        </div>
        <div class="col-xl-12">
            {{--************************************************************************************************
            * *
            * >>> MODIFY THIS SECTION (START) <<< * * *
                ************************************************************************************************--}}
            <div class="row p-1 mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="user-profile-header-banner position-relative">
                            <a href="#">
                                <img src="{{ !empty($user_data->banner) ? asset($user_data->banner) : asset('treasury/images/common/profile/profile-banner.png') }}"
                                    alt="Profile" class="rounded-top w-100" style="width: 120px; height: 120px; object-fit: cover; background: #fff;" />
                            </a>
                            <button
                                class="btn btn-primary btn-sm p-1 bg-info skeleton-popup position-absolute top-0 end-0 waves-effect waves-light rounded"
                                id="configs-add-btn"
                                data-token="@skeletonToken('central_update_profile_banner')_e_{{ \App\Facades\Skeleton::getAuthenticatedUser()->user_id  }}">
                                <i class="fa-regular fa-pencil "></i>
                            </button>
                        </div>
                        @php
                        $today = \Carbon\Carbon::now()->format('m-d');
                        $birthDate = $user_data->birth_date ? \Carbon\Carbon::parse($user_data->birth_date)->format('m-d') : null;
                        @endphp
                        @if ($today === $birthDate)
                        <div class="position-absolute" style="top: 10px; right: 10px;">
                            <div class="py-2 px-4 text-white fw-bold"
                                style="background-color: #ff6f61; border-radius: 30px; display: inline-block; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
                                🎉 Happy Birthday, {{ ucfirst($user->first_name) }}! 🎂
                            </div>
                        </div>
                        @endif
                        <div class="user-profile-header d-flex flex-column flex-sm-row text-sm-start text-center mb-4 mx-4"
                            style="position:relative;">
                            <div class="profile-img-wrap position-relative" style="margin-top: -20px; margin-left: 10px;">
                                <div class="profile-img flex-grow-1 mt-5">

                                    <a href="#">
                                        <img src="{{ !empty($user->profile) ? asset($user->profile) : asset('treasury/images/common/profile/profile-banner.png') }}"
                                            alt="Profile" class="rounded-circle border border-white shadow"
                                            style="width: 120px; height: 120px; object-fit: cover; background: #fff;" />
                                    </a> <button
                                        class="btn btn-primary btn-sm p-1 bg-info skeleton-popup position-absolute top-0 end-0 waves-effect waves-light rounded"
                                        id="configs-add-btn"
                                        data-token="@skeletonToken('central_unique_profile_data')_e_{{ \App\Facades\Skeleton::getAuthenticatedUser()->user_id  }}">
                                        <i class="fa-regular fa-pencil "></i>
                                    </button>
                                </div>
                                <!-- <button class="btn btn-primary skeleton-popup " id="configs-add-btn"
                                        data-token="@skeletonToken('central_unique_profile_data')_a">Add Users</button> -->
                            </div>
                            <div class="flex-grow-1 mt-3 mt-sm-5">
                                <div
                                    class="d-flex align-items-md-end align-items-sm-start align-items-center justify-content-md-between justify-content-start mx-4 flex-md-row flex-column gap-4">
                                    <div class="user-profile-info">
                                        <h4>{{ $user->first_name }} {{ $user->last_name }}</h4>
                                        <ul
                                            class="list-inline mb-0 d-flex align-items-center flex-wrap justify-content-sm-start justify-content-center gap-2">
                                            <li class="list-inline-item">
                                                <i class="mdi mdi-card-account-details-outline  mdi-20px me-2"></i>
                                                <span
                                                    class="fw-medium">{{ App\Facades\Skeleton::getAuthenticatedUser()->user_id }}</span>
                                            </li>
                                            <li class="list-inline-item">
                                                <i class="mdi mdi-map-marker-outline  mdi-20px me-2"></i>
                                                <span
                                                    class="fw-medium">{{ optional(json_decode($user_data->address_json))->city ?? 'N/A' }}</span>
                                            </li>
                                            <li class="list-inline-item">
                                                <i class="mdi mdi-calendar-blank-outline  mdi-20px me-2"></i>
                                                <span
                                                    class="fw-medium">{{ \Carbon\Carbon::parse($user->created_at)->format('F j, Y') }}</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <div>
                                        <!-- <a href="javascript:void(0)"
                                            class="btn btn-sm btn-primary company-show-update-popup waves-effect waves-light"
                                            data-option="cmp_profile_data|-|-|{{ $user->id }}">
                                            <i class="mdi mdi-account-edit me-1 me-2"></i>Edit Profile
                                        </a> -->
                                        <button class="btn btn-primary skeleton-popup" id="configs-add-btn" data-token="@skeletonToken('central_unique_userdata')_e_{{ \App\Facades\Skeleton::getAuthenticatedUser()->user_id}}">
                                            <i class="mdi mdi-account-edit me-1"></i>
                                            Edit profile
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header p-2 bg-light">
                            <ul class="nav nav-tabs border-0" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button type="button" class="nav-link active" role="tab" data-bs-toggle="tab"
                                        data-bs-target="#tab-profile">
                                        <i class="mdi mdi-card-account-details-outline me-1"></i> Profile
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button type="button" class="nav-link" role="tab" data-bs-toggle="tab"
                                        data-bs-target="#tab-logs">
                                        <i class="mdi mdi-login me-1"></i> Logs
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button type="button" class="nav-link" role="tab" data-bs-toggle="tab"
                                        data-bs-target="#tab-settings">
                                        <i class="fa-regular fa-user-gear me-1"></i> Settings
                                    </button>
                                </li>
                            </ul>
                        </div>
                        <div class="tab-content p-4">
                            <!-- Profile Info -->
                            <div class="tab-pane fade show active" id="tab-profile" role="tabpanel">
                                <div class="row g-4">
                                    <!-- Left Column: Profile Info -->
                                    <div class="col-md-5">
                                        <div class="card h-100 shadow-sm">
                                            <div class="card-body">
                                                <!-- <div class="mb-2 text-uppercase text-muted small fw-bold">Team</div>
                                          <span class="fw-bold">Role :</span> {{ $user->role['name'] ?? 'N/A' }} -->
                                                <div class="mb-2 text-uppercase text-muted small fw-bold">About</div>
                                                <div class="mb-2">
                                                    <i class="mdi mdi-account-outline me-2"></i>
                                                    <span class="fw-bold">Full Name :</span> {{ $user->first_name}} {{ $user->last_name }}
                                                </div>
                                                <div class="mb-2">
                                                    <i class="mdi mdi-map-marker-outline me-2"></i>
                                                    <span class="fw-bold">City :</span>
                                                    {{ optional(json_decode($user_data->address_json))->city ?? 'N/A' }}
                                                </div>
                                                <div class="mb-2">
                                                    <i class="mdi mdi-gender-male-female me-2"></i>
                                                    <span class="fw-bold">Gender :</span>
                                                    {{ ucfirst($user_data->gender ?? 'N/A') }}
                                                </div>
                                                <div class="mb-2">
                                                    <i class="mdi mdi-calendar me-2"></i>
                                                    <span class="fw-bold">DOB :</span> {{ $user_data->birth_date ?? 'N/A' }}
                                                </div>
                                                <div class="mb-2 text-uppercase text-muted small fw-bold">Contacts</div>
                                                <div class="mb-2">
                                                    <i class="mdi mdi-phone me-2"></i>
                                                    <span class="fw-bold">Address:</span>
                                                    {{ optional(json_decode($user_data->address_json))->address_line1 ?? 'N/A' }}
                                                </div>
                                                <div class="mb-2">
                                                    <i class="mdi mdi-email-outline me-2"></i>
                                                    <span class="fw-bold">Email:</span> {{ $user->email ?? 'N/A' }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- Right Column: Notifications/Updates -->
                                    <div class="col-md-7">
                                        <div class="card h-100 shadow-sm">
                                            <div class="card-body">
                                                <ul class="nav nav-tabs mb-3" id="profileTabs" role="tablist">
                                                    <li class="nav-item" role="presentation">
                                                        <button class="nav-link active" id="notifications-tab"
                                                            data-bs-toggle="tab" data-bs-target="#notifications" type="button"
                                                            role="tab">Notifications</button>
                                                    </li>
                                                    <li class="nav-item" role="presentation">
                                                        <button class="nav-link" id="updates-tab" data-bs-toggle="tab"
                                                            data-bs-target="#updates" type="button" role="tab">Updates</button>
                                                    </li>
                                                </ul>
                                                <div class="tab-content" id="profileTabsContent">
                                                    <div class="tab-pane fade show active text-center py-5" id="notifications"
                                                        role="tabpanel">
                                                        <i class="mdi mdi-inbox-outline display-1 text-muted"></i>
                                                        <div class="mt-3 text-muted">You have no notifications yet.</div>
                                                    </div>
                                                    <div class="tab-pane fade text-center py-5" id="updates" role="tabpanel">
                                                        <i class="mdi mdi-update display-1 text-muted"></i>
                                                        <div class="mt-3 text-muted">No updates available.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- Logs -->
                            <div class="tab-pane fade" id="tab-logs" role="tabpanel">
                                <div class="card-body">
                                    <h6 class="card-title mb-3 text-primary">Login History</h6>
                                    <div data-skeleton-table-set="@skeletonToken('central_login_history')_t"></div>
                                </div>
                            </div>
                            <!-- Settings -->
                            <div class="tab-pane fade" id="tab-settings" role="tabpanel">
                                <!-- Change Username -->
                                <div class="card mb-4">
                                    <h5 class="card-header">Change Username</h5>
                                    <div class="card-body">
                                        <form action="{{ url('/skeleton-action/') }}/@skeletonToken('central_change_username')_f" class="update-form" data-type="field">
                                            @csrf
                                            <input type="hidden" name="save_token" value="@skeletonToken('central_change_username')_f">
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <h6 class="text-body mb-3">Username Requirements:</h6>
                                                    <ul class="ps-3 mb-0">
                                                        <li class="mb-1">Maximum 15 characters</li>
                                                        <li class="mb-1">At least one Uppercase</li>
                                                        <li>At least one symbol or whitespace</li>
                                                    </ul>
                                                </div>
                                                <div class="col-md-6">
                                                    <div class="mb-3">
                                                        <div class="input-group">
                                                            <div class="form-floating form-floating-outline">
                                                                <input class="form-control" type="text" name="currentUsername" value="{{ $user->username }}" id="currentUsername" placeholder="Username" readonly>
                                                                <label for="currentUsername">Current Username</label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="mb-3">
                                                        <div class="input-group">
                                                            <div class="form-floating form-floating-outline">
                                                                <input class="form-control" validate="username" type="text" id="newUsername" name="newUsername" placeholder="New Username">
                                                                <label for="newUsername">New Username</label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="mb-3 form-password-toggle">
                                                        <div class="input-group input-group-merge">
                                                            <div class="form-floating form-floating-outline">
                                                                <input class="form-control" type="password" name="confirmPassword" id="confirmPassword" placeholder="············">
                                                                <label for="confirmPassword">Confirm Password</label>
                                                            </div>
                                                            <span class="input-group-text cursor-pointer"><i class="mdi mdi-eye-off-outline"></i></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="mt-4">
                                                <button type="submit" class="btn btn-primary me-2">Save changes</button>
                                                <button type="reset" class="btn btn-outline-secondary">Cancel</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                                <!-- Change Password -->
                                <div class="card mb-4">
                                    <h5 class="card-header">Change Password</h5>
                                    <div class="card-body">
                                        <form action="{{ url('/skeleton-action/') }}/@skeletonToken('central_change_password')_f" class="update-form" data-type="field">
                                            @csrf
                                            <input type="hidden" name="save_token" value="@skeletonToken('central_change_password')_f">
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <h6 class="text-body mb-3">Password Requirements:</h6>
                                                    <ul class="ps-3 mb-0">
                                                        <li class="mb-1">Minimum 8 characters</li>
                                                        <li class="mb-1">At least one lowercase character</li>
                                                        <li>At least one number, symbol, or whitespace</li>
                                                    </ul>
                                                </div>
                                                <div class="col-md-6">
                                                    <div class="mb-3 form-password-toggle">
                                                        <div class="input-group input-group-merge">
                                                            <div class="form-floating form-floating-outline">
                                                                <input class="form-control" type="password" name="currentPassword" id="currentPassword" placeholder="············">
                                                                <label for="currentPassword">Current Password</label>
                                                            </div>
                                                            <span class="input-group-text cursor-pointer"><i class="mdi mdi-eye-off-outline"></i></span>
                                                        </div>
                                                    </div>
                                                    <div class="mb-3 form-password-toggle">
                                                        <div class="input-group input-group-merge">
                                                            <div class="form-floating form-floating-outline">
                                                                <input class="form-control" type="password" id="newPassword" name="newPassword" placeholder="············">
                                                                <label for="newPassword">New Password</label>
                                                            </div>
                                                            <span class="input-group-text cursor-pointer"><i class="mdi mdi-eye-off-outline"></i></span>
                                                        </div>
                                                    </div>
                                                    <div class="mb-3 form-password-toggle">
                                                        <div class="input-group input-group-merge">
                                                            <div class="form-floating form-floating-outline">
                                                                <input class="form-control" type="password" name="confirmPassword" id="confirmPassword" placeholder="············">
                                                                <label for="confirmPassword">Confirm New Password</label>
                                                            </div>
                                                            <span class="input-group-text cursor-pointer"><i class="mdi mdi-eye-off-outline"></i></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="mt-4">
                                                <button type="submit" class="btn btn-primary me-2">Save changes</button>
                                                <button type="reset" class="btn btn-outline-secondary">Cancel</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                                <!-- Delete Account -->
                                <div class="card mb-0">
                                    <h5 class="card-header">Delete Account</h5>
                                    <div class="card-body">
                                        <div class="alert alert-warning">
                                            <h6 class="alert-heading mb-1">Are you sure?</h6>
                                            <p class="mb-0">Deleting your account is irreversible.</p>
                                        </div>
                                        <form action="{{ url('/skeleton-action/') }}/@skeletonToken('central_deactive')_f" id="formAccountDeactivation" method="POST">
                                            @csrf
                                            <input type="hidden" name="save_token" value="@skeletonToken('central_deactive')_f">
                                            <div class="form-check mb-3">
                                                <input class="form-check-input" type="checkbox" name="account_status" id="accountActivation">
                                                <label class="form-check-label" for="accountActivation">I confirm my account deactivation</label>
                                            </div>
                                            <button type="submit" class="btn btn-danger">Deactivate Account</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div> <!-- tab-content -->
                    </div> <!-- card -->
                </div> <!-- Right Column -->
            </div> <!-- row -->
        </div>
        {{--************************************************************************************************
    * *
    * >>> MODIFY THIS SECTION (END) <<< * * *
        ************************************************************************************************--}}
    </div>
</div>
@endsection