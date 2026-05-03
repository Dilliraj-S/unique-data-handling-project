<!-- resources/views/panels/supreme/settings/general/profile.blade.php -->
@extends('layouts.system-app')
@section('title', 'Settings | Gotit HR Management Software')

@section('content')
    <div class="content">
        <!-- Breadcrumb -->
        <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div class="my-auto mb-2">
                <h2 class="mb-1">Settings</h2>
                <nav>
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Settings</a>
                        </li>
                        <li class="breadcrumb-item active" aria-current="page">General</li>
                    </ol>
                </nav>
            </div>
            <div class="d-flex my-xl-auto right-content align-items-center flex-wrap">
                <div class="mb-2">
                    <div class="input-icon w-120 position-relative">
                        <span class="input-icon-addon">
                            <i class="ti ti-calendar text-gray-9"></i>
                        </span>
                        <input type="text" class="form-control yearpicker" value="{{ date('Y') }}">
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
        <div class="col-xl-12">
            <!-- Main Tabs -->
            <ul class="nav nav-tabs nav-tabs-solid bg-transparent border-bottom mb-3">
                <li class="nav-item">
                    <a class="nav-link active" data-bs-toggle="tab" href="#general-settings"><i
                            class="ti ti-settings me-2"></i>General Settings</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#data-settings"><i
                            class="ti ti-device-ipad-horizontal-cog me-2"></i>Data Settings</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#device-settings"><i
                            class="ti ti-server-cog me-2"></i>Device Settings</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#report-settings"><i
                            class="ti ti-settings-dollar me-2"></i>Report Settings</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#software-setting"><i
                            class="ti ti-settings-2 me-2"></i>Software Setting</a>
                </li>
            </ul>
            <div class="tab-content">
                <!-- General Settings Tab -->
                <div class="tab-pane fade show active" id="general-settings">
                    <div class="row">
                        <div class="col-xl-3 theiaStickySidebar">
                            <div class="card">
                                <div class="card-body">
                                    <div class="d-flex flex-column list-group settings-list">
                                        <div class="d-flex flex-column list-group settings-list">
                                            <a href="#Customize"
                                                class="d-inline-flex align-items-center rounded active py-2 px-3"
                                                data-bs-toggle="tab"><i class="ti ti-user me-2"></i>Customize</a>
                                            <a href="#security-settings"
                                                class="d-inline-flex align-items-center rounded py-2 px-3"
                                                data-bs-toggle="tab"><i class="ti ti-lock me-2"></i>Security Settings</a>
                                            <a href="#notification-settings"
                                                class="d-inline-flex align-items-center rounded py-2 px-3"
                                                data-bs-toggle="tab"><i class="ti ti-bell me-2"></i>Notifications</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-9">
                            <div class="tab-content">
                                @php
                                    $token =
                                        app(\App\Services\SkeletonService::class)->getTokenForKey('customize')['data'][
                                            'token'
                                        ] ?? '';
                                @endphp
                                <!-- Profile Settings -->
                                <div class="tab-pane fade show active" id="Customize">
                                    <div class="card">
                                        <div class="card-body">
                                            <div class="border-bottom mb-3 pb-3">
                                                <h4>Customize</h4>
                                            </div>
                                            @php
                                                $customize = $customize ?? null;
                                            @endphp

                                            <form method="POST" enctype="multipart/form-data" class="save-static-form">
                                                @csrf
                                                <input type="hidden" name="save_token" value="{{ $token . '_sf' }}">

                                                <div class="mb-3">
                                                    <label for="copyrightText" class="form-label">Copyright Text:</label>
                                                    <input type="text" name="copyright_text" class="form-control"
                                                        id="copyrightText" value="{{ $customize->copyright_text ?? '' }}">
                                                </div>

                                                <div class="mb-3">
                                                    <label for="designedByText" class="form-label">Designed By
                                                        Text:</label>
                                                    <input type="text" name="designed_by_text" class="form-control"
                                                        id="designedByText"
                                                        value="{{ $customize->designed_by_text ?? '' }}">
                                                </div>

                                                <button type="submit" class="btn btn-primary">
                                                    {{ $customize ? 'Update' : 'Save' }}
                                                </button>
                                            </form>


                                        </div>
                                    </div>
                                </div>
                                <!-- Security Settings -->
                                <div class="tab-pane fade" id="security-settings">
                                    <div class="card">
                                        <div class="card-body">
                                            <div class="border-bottom mb-3 pb-3">
                                                <h4>Security Settings</h4>
                                            </div>
                                            <div>
                                                <div
                                                    class="d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3">
                                                    <div class="mb-3">
                                                        <h5 class="fw-medium mb-1">Password</h5>
                                                        <div class="d-flex align-items-center">
                                                            <p class="mb-0 me-2 pe-2 border-end">Set a unique password to
                                                                protect the account</p>
                                                            <p>Last Changed 03 Jan 2024, 09:00 AM</p>
                                                        </div>
                                                    </div>
                                                    <div class="mb-3">
                                                        <a href="#" class="btn btn-dark btn-sm"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#change-password">Change Pasword</a>
                                                    </div>
                                                </div>
                                                <div
                                                    class="d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3">
                                                    <div class="mb-3">
                                                        <h5 class="fw-medium mb-1">Two Factor Authentication</h5>
                                                        <p>Receive codes via SMS or email every time you login</p>
                                                    </div>
                                                    <div class="mb-3">
                                                        <a href="#" class="btn btn-dark btn-sm">Enable</a>
                                                    </div>
                                                </div>
                                                <div
                                                    class="d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3">
                                                    <div class="mb-3">
                                                        <h5 class="fw-medium d-flex align-items-center mb-1">
                                                            Google Authentication
                                                            <span
                                                                class="badge badge-xs ms-2 bg-outline-success rounded-pill d-flex align-items-center">
                                                                <i class="ti ti-point-filled"></i>Connected
                                                            </span>
                                                        </h5>
                                                        <p>Connect to Google</p>
                                                    </div>
                                                    <div class="mb-3">
                                                        <div class="form-check form-check-md form-switch me-2">
                                                            <input class="form-check-input me-2" type="checkbox"
                                                                role="switch">
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    class="d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3">
                                                    <div class="mb-3">
                                                        <h5 class="fw-medium d-flex align-items-center mb-1">Phone Number
                                                            Verification <span><i
                                                                    class="ti ti-discount-check-filled text-success ms-2"></i></span>
                                                        </h5>
                                                        <div class="d-flex align-items-center">
                                                            <p class="mb-0 me-2 pe-2 border-end">The Phone Number
                                                                associated with the account</p>
                                                            <p>Verified Mobile Number : +99264710583</p>
                                                        </div>
                                                    </div>
                                                    <div class="mb-3">
                                                        <a href="#"
                                                            class="btn btn-outline-light btn-sm border me-2">Remove</a>
                                                        <a href="#" class="btn btn-dark btn-sm"
                                                            data-bs-toggle="modal" data-bs-target="#change-phone">Change
                                                        </a>
                                                    </div>
                                                </div>
                                                <div
                                                    class="d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3">
                                                    <div class="mb-3">
                                                        <h5 class="fw-medium d-flex align-items-center mb-1">Email
                                                            Verification <span><i
                                                                    class="ti ti-discount-check-filled text-success ms-2"></i></span>
                                                        </h5>
                                                        <div class="d-flex align-items-center">
                                                            <p class="mb-0 me-2 pe-2 border-end">The email address
                                                                associated with the account</p>
                                                            <p>Verified Email : info@example.com</p>
                                                        </div>
                                                    </div>
                                                    <div class="mb-3">
                                                        <a href="#"
                                                            class="btn btn-outline-light btn-sm border me-2">Remove</a>
                                                        <a href="#" class="btn btn-dark btn-sm"
                                                            data-bs-toggle="modal" data-bs-target="#change-email">Change
                                                        </a>
                                                    </div>
                                                </div>
                                                <div
                                                    class="d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3">
                                                    <div class="mb-3">
                                                        <h5 class="fw-medium mb-1">Device Management</h5>
                                                        <p>The devices associated with the account</p>
                                                    </div>
                                                    <div class="mb-3">
                                                        <a href="#" class="btn btn-dark btn-sm"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#device_management">Manage</a>
                                                    </div>
                                                </div>
                                                <div
                                                    class="d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3">
                                                    <div class="mb-3">
                                                        <h5 class="fw-medium mb-1">Account Activity</h5>
                                                        <p>The activities of the account</p>
                                                    </div>
                                                    <div class="mb-3">
                                                        <a href="#" class="btn btn-dark btn-sm"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#account_activity">View</a>
                                                    </div>
                                                </div>
                                                <div
                                                    class="d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3">
                                                    <div class="mb-3">
                                                        <h5 class="fw-medium mb-1">Deactivate Account</h5>
                                                        <p>This will shutdown your account. Your account will be reactive
                                                            when you sign in again</p>
                                                    </div>
                                                    <div class="mb-3">
                                                        <a href="#" class="btn btn-dark btn-sm">Deactivate</a>
                                                    </div>
                                                </div>
                                                <div
                                                    class="d-flex justify-content-between align-items-center flex-wrap row-gap-3">
                                                    <div>
                                                        <h5 class="fw-medium mb-1">Delete Account</h5>
                                                        <p>Your account will be permanently deleted</p>
                                                    </div>
                                                    <div>
                                                        <a href="#" class="btn btn-dark btn-sm"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#del-account">Delete</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Notification Settings -->
                                <div class="tab-pane fade" id="notification-settings">
                                    <div class="card">
                                        <div class="card-body">
                                            <div class="border-bottom mb-3 pb-3">
                                                <h4>Notification Settings</h4>
                                            </div>
                                            <form>
                                                <!-- Notification Toggles -->
                                                <div class="border-bottom mb-3">
                                                    <div class="mb-3">
                                                        <div
                                                            class="d-flex justify-content-between align-items-center flex-wrap mb-3">
                                                            <div>
                                                                <h6 class="fw-medium mb-1">WhatsApp Notifications</h6>
                                                                <p class="fs-12">Receive notifications via WhatsApp</p>
                                                            </div>
                                                            <div class="form-check form-check-md form-switch">
                                                                <input class="form-check-input" type="checkbox"
                                                                    role="switch" id="whatsappNotifications">
                                                            </div>
                                                        </div>
                                                        <div id="whatsappOptions" class="ms-4" style="display: none;">
                                                            <h6 class="fw-medium mb-2">Select WhatsApp Notifications</h6>
                                                            <div class="form-check form-switch mb-2">
                                                                <input class="form-check-input" type="checkbox"
                                                                    id="checkinNotification">
                                                                <label class="form-check-label"
                                                                    for="checkinNotification">Check-in</label>
                                                            </div>
                                                            <div class="form-check form-switch mb-2">
                                                                <input class="form-check-input" type="checkbox"
                                                                    id="checkoutNotification">
                                                                <label class="form-check-label"
                                                                    for="checkoutNotification">Check-out</label>
                                                            </div>
                                                            <div class="form-check form-switch mb-2">
                                                                <input class="form-check-input" type="checkbox"
                                                                    id="reportDownloadNotification">
                                                                <label class="form-check-label"
                                                                    for="reportDownloadNotification">Report
                                                                    Download</label>
                                                            </div>
                                                            <div class="form-check form-switch mb-2">
                                                                <input class="form-check-input" type="checkbox"
                                                                    id="deadlineReminderNotification">
                                                                <label class="form-check-label"
                                                                    for="deadlineReminderNotification">Deadline
                                                                    Reminder</label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div
                                                        class="d-flex justify-content-between align-items-center flex-wrap mb-3">
                                                        <div>
                                                            <h6 class="fw-medium mb-1">Email Notifications</h6>
                                                            <p class="fs-12">Receive notifications via Email</p>
                                                        </div>
                                                        <div class="form-check form-check-md form-switch">
                                                            <input class="form-check-input" type="checkbox"
                                                                role="switch" id="emailNotifications">
                                                        </div>
                                                    </div>
                                                </div>
                                                <!-- Email Configuration -->
                                                <div class="border-bottom mb-3">
                                                    <h5 class="fw-medium mb-3">Email Configuration</h5>
                                                    <p class="fs-12 mb-3">Configure SMTP settings for sending email
                                                        notifications.</p>
                                                    <div class="row">
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">SMTP Host</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="text" class="form-control"
                                                                        placeholder="e.g., smtp.gmail.com">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Port</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="number" class="form-control"
                                                                        placeholder="e.g., 587" min="1"
                                                                        max="65535">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Username</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="text" class="form-control"
                                                                        placeholder="e.g., user@example.com">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">App Password</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="password" class="form-control"
                                                                        placeholder="Enter app-specific password">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Encryption</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <select class="form-select">
                                                                        <option value="">Select</option>
                                                                        <option value="tls">TLS</option>
                                                                        <option value="ssl">SSL</option>
                                                                        <option value="none">None</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">From Email</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="email" class="form-control"
                                                                        placeholder="e.g., no-reply@company.com">
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="row mb-3">
                                                        <div class="col-md-12">
                                                            <div class="form-check form-switch">
                                                                <input class="form-check-input" type="checkbox"
                                                                    id="useCustomEmail">
                                                                <label class="form-check-label" for="useCustomEmail">Use
                                                                    this email configuration instead of the software's
                                                                    default email</label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center justify-content-end">
                                                    <button type="button"
                                                        class="btn btn-outline-light border me-3">Cancel</button>
                                                    <button type="submit" class="btn btn-primary">Save</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                                <script>
                                    document.getElementById('whatsappNotifications').addEventListener('change', function() {
                                        document.getElementById('whatsappOptions').style.display = this.checked ? 'block' : 'none';
                                    });
                                </script>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tab-pane fade" id="data-settings">
                    <div class="row">
                        <div class="col-xl-3 theiaStickySidebar">
                            <div class="card">
                                <div class="card-body">
                                    <div class="d-flex flex-column list-group settings-list">
                                        <a href="#data-deletion"
                                            class="d-inline-flex align-items-center rounded active py-2 px-3"
                                            data-bs-toggle="tab"><i class="ti ti-trash me-2"></i>Data Deletion</a>
                                        <a href="#soft-deleted" class="d-inline-flex align-items-center rounded py-2 px-3"
                                            data-bs-toggle="tab"><i class="ti ti-restore me-2"></i>Soft Deleted Data</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-9">
                            <div class="tab-content">
                                <!-- Data Deletion Settings -->
                                <div class="tab-pane fade show active" id="data-deletion">
                                    <div class="card">
                                        <div class="card-body">
                                            <div class="border-bottom mb-3 pb-3">
                                                <h4>Data Deletion Settings</h4>
                                            </div>
                                            <form>
                                                <div class="row mb-3">
                                                    <div class="col-md-12">
                                                        <h6 class="mb-3">Permanent Deletion Period</h6>
                                                        <p class="fs-12">Set the number of days after which soft-deleted
                                                            data will be permanently deleted.</p>
                                                        <div class="row align-items-center">
                                                            <div class="col-md-4">
                                                                <label class="form-label mb-md-0">Days until permanent
                                                                    deletion</label>
                                                            </div>
                                                            <div class="col-md-4">
                                                                <input type="number" class="form-control"
                                                                    name="deletion_days" min="1" max="365"
                                                                    value="30">
                                                            </div>
                                                            <div class="col-md-4">
                                                                <p class="fs-12 mb-0">Range: 1 to 365 days</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="row mb-3">
                                                    <div class="col-md-12">
                                                        <h6 class="mb-3">Auto-Deletion</h6>
                                                        <div class="form-check form-switch">
                                                            <input class="form-check-input" type="checkbox"
                                                                id="autoDeletion">
                                                            <label class="form-check-label" for="autoDeletion">Enable
                                                                automatic permanent deletion of soft-deleted data</label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center justify-content-end">
                                                    <button type="button"
                                                        class="btn btn-outline-light border me-3">Cancel</button>
                                                    <button type="submit" class="btn btn-primary">Save</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                                <!-- Soft Deleted Data -->
                                <div class="tab-pane fade" id="soft-deleted">
                                    <div class="card">
                                        <div class="card-body">
                                            <div
                                                class="border-bottom mb-3 pb-3 d-flex justify-content-between align-items-center">
                                                <h4>Soft Deleted Data</h4>
                                                <div class="input-group w-25">
                                                    <span class="input-group-text"><i class="ti ti-filter"></i></span>
                                                    <input type="text" class="form-control"
                                                        placeholder="Filter tables..." id="tableFilter">
                                                </div>
                                            </div>
                                            <div class="mb-3">
                                                <div class="btn-group">
                                                    <button class="btn btn-sm btn-outline-primary dropdown-toggle"
                                                        type="button" data-bs-toggle="dropdown" disabled
                                                        id="bulkActionButton">
                                                        Bulk Actions
                                                    </button>
                                                    <ul class="dropdown-menu">
                                                        <li><a class="dropdown-item" href="javascript:void(0);"
                                                                id="bulkRestore">Restore Selected</a></li>
                                                        <li><a class="dropdown-item text-danger"
                                                                href="javascript:void(0);" id="bulkDelete">Permanently
                                                                Delete Selected</a></li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div class="table-responsive">
                                                <table class="table table-hover" id="softDeletedTable">
                                                    <thead>
                                                        <tr>
                                                            <th><input type="checkbox" id="selectAll"></th>
                                                            <th>Table Name</th>
                                                            <th>Number of Soft-Deleted Records</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td><input type="checkbox" class="row-checkbox"></td>
                                                            <td>users</td>
                                                            <td>5</td>
                                                            <td>
                                                                <button class="btn btn-sm btn-success restore-btn"
                                                                    data-table="users">Restore All</button>
                                                                <button class="btn btn-sm btn-outline-info preview-btn"
                                                                    data-table="users" data-bs-toggle="modal"
                                                                    data-bs-target="#previewModal">Preview</button>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td><input type="checkbox" class="row-checkbox"></td>
                                                            <td>projects</td>
                                                            <td>3</td>
                                                            <td>
                                                                <button class="btn btn-sm btn-success restore-btn"
                                                                    data-table="projects">Restore All</button>
                                                                <button class="btn btn-sm btn-outline-info preview-btn"
                                                                    data-table="projects" data-bs-toggle="modal"
                                                                    data-bs-target="#previewModal">Preview</button>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td><input type="checkbox" class="row-checkbox" disabled></td>
                                                            <td>tasks</td>
                                                            <td>0</td>
                                                            <td>
                                                                <button class="btn btn-sm btn-success restore-btn"
                                                                    data-table="tasks" disabled>Restore All</button>
                                                                <button class="btn btn-sm btn-outline-info preview-btn"
                                                                    data-table="tasks" disabled>Preview</button>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Preview Modal -->
                    <div class="modal fade" id="previewModal" tabindex="-1" aria-labelledby="previewModalLabel"
                        aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="previewModalLabel">Soft-Deleted Records Preview</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"
                                        aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <table class="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Name</th>
                                                <th>Deleted At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <!-- Example Data -->
                                            <tr>
                                                <td>1</td>
                                                <td>John Doe</td>
                                                <td>2025-05-10 10:00</td>
                                            </tr>
                                            <tr>
                                                <td>2</td>
                                                <td>Jane Smith</td>
                                                <td>2025-05-12 14:30</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-outline-light"
                                        data-bs-dismiss="modal">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tab-pane fade" id="device-settings">
                    <div class="row">
                        <div class="col-xl-3 theiaStickySidebar">
                            <div class="card">
                                <div class="card-body">
                                    <div class="d-flex flex-column list-group settings-list">
                                        <div class="d-flex flex-column list-group settings-list">
                                            <a href="#adms-settings"
                                                class="d-inline-flex align-items-center rounded active py-2 px-3"
                                                data-bs-toggle="tab"><i class="ti ti-recharging me-2"></i>ADMS Server</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-9">
                            <div class="tab-content">
                                <div class="tab-pane fade show active" id="adms-settings">
                                    <div class="card">
                                        <div class="card-body">
                                            <div class="border-bottom mb-3 pb-3">
                                                <h4 class="fw-medium">ADMS Server Configuration</h4>
                                                <p class="fs-12">Configure settings for the biometric device's ADMS
                                                    server.</p>
                                            </div>
                                            <form>
                                                <div class="border-bottom mb-3">
                                                    <div class="row">
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">ATTLOG Stamp</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="number" class="form-control"
                                                                        placeholder="e.g., 0" value="0"
                                                                        min="0">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Error Delay
                                                                        (seconds)</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="number" class="form-control"
                                                                        placeholder="e.g., 60" value="60"
                                                                        min="1">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Poll Delay
                                                                        (seconds)</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="number" class="form-control"
                                                                        placeholder="e.g., 60" value="60"
                                                                        min="1">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Transmission
                                                                        Times</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="text" class="form-control"
                                                                        placeholder="e.g., 09:00;18:30"
                                                                        value="09:00;18:30">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Transmission Interval
                                                                        (minutes)</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="number" class="form-control"
                                                                        placeholder="e.g., 100" value="100"
                                                                        min="1">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Realtime Push</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <div class="form-check form-switch">
                                                                        <input class="form-check-input" type="checkbox"
                                                                            id="realtimePush" checked>
                                                                        <label class="form-check-label"
                                                                            for="realtimePush">Enable
                                                                            real-time data push</label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Timeout
                                                                        (seconds)</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="number" class="form-control"
                                                                        placeholder="e.g., 30" value="30"
                                                                        min="1">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Time Zone
                                                                        (minutes)</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <input type="number" class="form-control"
                                                                        placeholder="e.g., 330" value="330"
                                                                        step="1">
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-4">
                                                                    <label class="form-label mb-md-0">Encryption</label>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <div class="form-check form-switch">
                                                                        <input class="form-check-input" type="checkbox"
                                                                            id="encrypt" checked>
                                                                        <label class="form-check-label"
                                                                            for="encrypt">Enable
                                                                            encryption</label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-12">
                                                            <div class="row align-items-center mb-3">
                                                                <div class="col-md-2">
                                                                    <label class="form-label mb-md-0">Transmission
                                                                        Flags</label>
                                                                </div>
                                                                <div class="col-md-10">
                                                                    <input type="text" class="form-control"
                                                                        placeholder="e.g., 111111111111"
                                                                        value="111111111111">
                                                                    <small class="form-text text-muted">12-digit binary
                                                                        string (e.g.,
                                                                        111111111111 for ATTLOG only)</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center justify-content-end">
                                                    <button type="button"
                                                        class="btn btn-outline-light border me-3">Cancel</button>
                                                    <button type="submit" class="btn btn-primary">Save</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tab-pane fade" id="report-settings">
                    <div class="row">
                        <div class="col-xl-3 theiaStickySidebar">
                            <div class="card border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex flex-column list-group settings-list">
                                        <a href="#column-settings"
                                            class="d-inline-flex align-items-center rounded active py-2 px-3 text-dark"
                                            data-bs-toggle="tab"><i class="ti ti-columns me-2 text-primary"></i>Column
                                            Settings</a>
                                        <a href="#status-color-settings"
                                            class="d-inline-flex align-items-center rounded py-2 px-3 text-dark"
                                            data-bs-toggle="tab"><i class="ti ti-palette me-2 text-primary"></i>Status
                                            Color Settings</a>
                                        <a href="#other-data-settings"
                                            class="d-inline-flex align-items-center rounded py-2 px-3 text-dark"
                                            data-bs-toggle="tab"><i class="ti ti-settings me-2 text-primary"></i>Other
                                            Data Settings</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-9">
                            <div class="tab-content">
                                <!-- Column Settings -->
                                <div class="tab-pane fade show active" id="column-settings">
                                    <div class="card border-0 shadow-sm">
                                        <div class="card-body">
                                            <div class="border-bottom mb-3 pb-3">
                                                <h4 class="fw-medium text-dark">Column Settings</h4>
                                                <p class="fs-12 text-muted">Select columns and set widths for the
                                                    attendance report (total width: 814px).</p>
                                            </div>
                                            <!-- Alerts -->
                                            <div id="alert-container" class="mb-3"></div>
                                            <form>
                                                <div class="row mb-3">
                                                    <div class="col-md-5">
                                                        <div class="row align-items-center">
                                                            <div class="col-md-4">
                                                                <label class="form-label mb-md-0 fw-semibold">Select
                                                                    Column</label>
                                                            </div>
                                                            <div class="col-md-8">
                                                                <select class="form-select border-primary"
                                                                    id="column-select">
                                                                    <option value="" disabled selected>Select a
                                                                        column</option>
                                                                    <option value="SN" data-width="22">SN</option>
                                                                    <option value="Gotit-Id" data-width="64">Gotit-Id
                                                                    </option>
                                                                    <option value="Name" data-width="90">Name</option>
                                                                    <option value="Shift" data-width="47">Shift</option>
                                                                    <option value="Check-In" data-width="50">Check-In
                                                                    </option>
                                                                    <option value="Late-In" data-width="50">Late-In
                                                                    </option>
                                                                    <option value="Check-Out" data-width="57">Check-Out
                                                                    </option>
                                                                    <option value="Early-Out" data-width="57">Early-Out
                                                                    </option>
                                                                    <option value="Breaks" data-width="50">Breaks</option>
                                                                    <option value="Work" data-width="50">Work</option>
                                                                    <option value="Overtime" data-width="50">Overtime
                                                                    </option>
                                                                    <option value="Status" data-width="82">Status</option>
                                                                    <option value="Records" data-width="143">Records
                                                                    </option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center">
                                                            <div class="col-md-4">
                                                                <label class="form-label mb-md-0 fw-semibold">Column Width
                                                                    (px)</label>
                                                            </div>
                                                            <div class="col-md-8">
                                                                <input type="number" class="form-control border-primary"
                                                                    id="column-width" min="10" max="814"
                                                                    placeholder="e.g., 50">
                                                                <small class="form-text text-muted">Remaining width: <span
                                                                        id="remaining-width">814</span>px</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-1">
                                                        <button type="button"
                                                            class="btn btn-primary btn-sm transition-all"
                                                            id="add-column">Add</button>
                                                    </div>
                                                </div>
                                                <!-- Selected Columns as Pills -->
                                                <div class="mb-3" id="selected-columns">
                                                    <!-- Initially empty -->
                                                </div>
                                                <!-- A4 Header Preview -->
                                                <div class="d-flex justify-content-center align-items-center my-5">
                                                    <div class="border p-4 rounded bg-white shadow" style="width: 814px;">
                                                        <h5 class="mb-3 text-center text-primary fw-bold">A4 Header Preview
                                                            (Portrait)</h5>
                                                        <h4 class="text-center">Attendance Report (Detailed View)</h4>
                                                        <p class="text-center">2025-05-13 14:15:37 To 2025-05-13 14:15:37
                                                        </p>
                                                        <div class="d-flex justify-content-between">
                                                            <p><b>Organtization</b>: eg:Gotit</p>
                                                            <p><b>Printed On</b>: 2025-05-13 14:15:37</p>
                                                        </div>
                                                        <div id="preview-header" class="border bg-light rounded mb-3"
                                                            style="display: flex; min-height: 40px;">
                                                        </div>
                                                        <div class="d-flex justify-content-between">
                                                            <p>Generated by <b>Gotit</b></p>
                                                            <p>Powered by <b>Digital Kuppam</b></p>
                                                            <p>Page <b>1/1</b></p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center justify-content-end">
                                                    <button type="button"
                                                        class="btn btn-outline-secondary border me-3 transition-all">Cancel</button>
                                                    <button type="submit"
                                                        class="btn btn-primary transition-all">Save</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                                <!-- Status Color Settings -->
                                <div class="tab-pane fade" id="status-color-settings">
                                    <div class="card border-0 shadow-sm">
                                        <div class="card-body">
                                            <div class="border-bottom mb-3 pb-3">
                                                <h4 class="fw-medium text-dark">Status Color Settings</h4>
                                                <p class="fs-12 text-muted">Customize color codes for attendance report
                                                    statuses in the PDF.</p>
                                            </div>
                                            <form>
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-5">
                                                                <label class="form-label mb-md-0 fw-semibold">Present
                                                                    [PF]</label>
                                                            </div>
                                                            <div class="col-md-7">
                                                                <input type="color"
                                                                    class="form-control form-control-color border-primary"
                                                                    name="present_pf" value="#28a745"
                                                                    title="Choose Present [PF] color">
                                                                <small class="form-text text-muted">Successful
                                                                    check-in/out</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-5">
                                                                <label class="form-label mb-md-0 fw-semibold">Present
                                                                    [OK]</label>
                                                            </div>
                                                            <div class="col-md-7">
                                                                <input type="color"
                                                                    class="form-control form-control-color border-primary"
                                                                    name="present_ok" value="#007bff"
                                                                    title="Choose Present [OK] color">
                                                                <small class="form-text text-muted">Slightly late but
                                                                    acceptable</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-5">
                                                                <label class="form-label mb-md-0 fw-semibold">Present
                                                                    [AB]</label>
                                                            </div>
                                                            <div class="col-md-7">
                                                                <input type="color"
                                                                    class="form-control form-control-color border-primary"
                                                                    name="present_ab" value="#ffc107"
                                                                    title="Choose Present [AB] color">
                                                                <small class="form-text text-muted">Abnormal
                                                                    check-in/out</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-5">
                                                                <label class="form-label mb-md-0 fw-semibold">Present
                                                                    [CONF]</label>
                                                            </div>
                                                            <div class="col-md-7">
                                                                <input type="color"
                                                                    class="form-control form-control-color border-primary"
                                                                    name="present_conf" value="#6c757d"
                                                                    title="Choose Present [CONF] color">
                                                                <small class="form-text text-muted">Missing
                                                                    checkout</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-5">
                                                                <label class="form-label mb-md-0 fw-semibold">Abnormal
                                                                    [CONF]</label>
                                                            </div>
                                                            <div class="col-md-7">
                                                                <input type="color"
                                                                    class="form-control form-control-color border-primary"
                                                                    name="abnormal_conf" value="#dc3545"
                                                                    title="Choose Abnormal [CONF] color">
                                                                <small class="form-text text-muted">Abnormal, no
                                                                    checkout</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-5">
                                                                <label class="form-label mb-md-0 fw-semibold">Present
                                                                    [CINF]</label>
                                                            </div>
                                                            <div class="col-md-7">
                                                                <input type="color"
                                                                    class="form-control form-control-color border-primary"
                                                                    name="present_cinf" value="#17a2b8"
                                                                    title="Choose Present [CINF] color">
                                                                <small class="form-text text-muted">Missing
                                                                    check-in</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-5">
                                                                <label class="form-label mb-md-0 fw-semibold">Abnormal
                                                                    [CINF]</label>
                                                            </div>
                                                            <div class="col-md-7">
                                                                <input type="color"
                                                                    class="form-control form-control-color border-primary"
                                                                    name="abnormal_cinf" value="#fd7e14"
                                                                    title="Choose Abnormal [CINF] color">
                                                                <small class="form-text text-muted">Abnormal, missing
                                                                    check-in</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-5">
                                                                <label
                                                                    class="form-label mb-md-0 fw-semibold">Abnormal</label>
                                                            </div>
                                                            <div class="col-md-7">
                                                                <input type="color"
                                                                    class="form-control form-control-color border-primary"
                                                                    name="abnormal" value="#dc3545"
                                                                    title="Choose Abnormal color">
                                                                <small class="form-text text-muted">Non-aligned with
                                                                    shift</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-5">
                                                                <label
                                                                    class="form-label mb-md-0 fw-semibold">Absent</label>
                                                            </div>
                                                            <div class="col-md-7">
                                                                <input type="color"
                                                                    class="form-control form-control-color border-primary"
                                                                    name="absent" value="#87ceeb"
                                                                    title="Choose Absent color">
                                                                <small class="form-text text-muted">No check-in/out</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-5">
                                                                <label class="form-label mb-md-0 fw-semibold">On
                                                                    Leave</label>
                                                            </div>
                                                            <div class="col-md-7">
                                                                <input type="color"
                                                                    class="form-control form-control-color border-primary"
                                                                    name="on_leave" value="#6f42c1"
                                                                    title="Choose On Leave color">
                                                                <small class="form-text text-muted">Approved leave</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center justify-content-end">
                                                    <button type="button"
                                                        class="btn btn-outline-secondary border me-3 transition-all">Cancel</button>
                                                    <button type="submit"
                                                        class="btn btn-primary transition-all">Save</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                                <!-- Other Data Settings -->
                                <div class="tab-pane fade" id="other-data-settings">
                                    <div class="card border-0 shadow-sm">
                                        <div class="card-body">
                                            <div class="border-bottom mb-3 pb-3">
                                                <h4 class="fw-medium text-dark">Other Data Settings</h4>
                                                <p class="fs-12 text-muted">Customize visibility of additional data in the
                                                    attendance report PDF.</p>
                                            </div>
                                            <form>
                                                <div class="row g-3">
                                                    <div class="col-md-12">
                                                        <div class="row align-items-center">
                                                            <div class="col-md-6">
                                                                <label class="form-label mb-md-0 fw-semibold">Show Valid
                                                                    Data</label>
                                                            </div>
                                                            <div class="col-md-6">
                                                                <div class="form-check form-switch">
                                                                    <input class="form-check-input" type="checkbox"
                                                                        id="showValidData" checked>
                                                                    <label class="form-check-label"
                                                                        for="showValidData">Display only valid data in
                                                                        "Other" column</label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-12">
                                                        <div class="row align-items-center">
                                                            <div class="col-md-6">
                                                                <label class="form-label mb-md-0 fw-semibold">Show Data
                                                                    With Date</label>
                                                            </div>
                                                            <div class="col-md-6">
                                                                <div class="form-check form-switch">
                                                                    <input class="form-check-input" type="checkbox"
                                                                        id="showDataWithDate" checked>
                                                                    <label class="form-check-label"
                                                                        for="showDataWithDate">Include date with
                                                                        data</label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-12">
                                                        <div class="row align-items-center">
                                                            <div class="col-md-6">
                                                                <label class="form-label mb-md-0 fw-semibold">Show Data
                                                                    With Device Name</label>
                                                            </div>
                                                            <div class="col-md-6">
                                                                <div class="form-check form-switch">
                                                                    <input class="form-check-input" type="checkbox"
                                                                        id="showDataWithDevice" checked>
                                                                    <label class="form-check-label"
                                                                        for="showDataWithDevice">Include device name with
                                                                        data</label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center justify-content-end">
                                                    <button type="button"
                                                        class="btn btn-outline-secondary border me-3 transition-all">Cancel</button>
                                                    <button type="submit"
                                                        class="btn btn-primary transition-all">Save</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <script>
                    let totalWidth = 814;
                    let selectedColumns = [];

                    function showAlert(message, type = 'danger') {
                        const alertContainer = document.getElementById('alert-container');
                        const alert = document.createElement('div');
                        alert.className = `alert alert-${type} alert-dismissible fade show`;
                        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
                        alertContainer.appendChild(alert);
                        setTimeout(() => alert.remove(), 3000);
                    }

                    function updateRemainingWidth() {
                        document.getElementById('remaining-width').textContent = totalWidth;
                        document.getElementById('remaining-width').style.color = totalWidth < 50 ? '#dc3545' : '#6c757d';
                    }
                    document.getElementById('add-column').addEventListener('click', function() {
                        const select = document.getElementById('column-select');
                        const widthInput = document.getElementById('column-width');
                        const selectedColumnsDiv = document.getElementById('selected-columns');
                        const headerRow = document.getElementById('preview-header');
                        if (!select.value) {
                            showAlert('Please select a column.');
                            return;
                        }
                        if (!widthInput.value) {
                            showAlert('Please enter a column width.');
                            return;
                        }
                        const column = select.value;
                        const width = parseInt(widthInput.value);
                        if (selectedColumns.includes(column)) {
                            showAlert('This column is already added.');
                            return;
                        }
                        if (width < 10 || width > 814) {
                            showAlert('Width must be between 10 and 814 pixels.');
                            return;
                        }
                        if (width > totalWidth) {
                            showAlert(`Width exceeds remaining ${totalWidth}px.`);
                            return;
                        }
                        // Add pill
                        const pill = document.createElement('span');
                        pill.className = 'badge bg-primary text-white me-2 mb-2';
                        pill.style.fontSize = '0.7rem';
                        pill.dataset.column = column;
                        pill.dataset.width = width;
                        pill.innerHTML = `${column} (${width}px) <i class="ti ti-x ms-1" style="cursor: pointer;"></i>`;
                        selectedColumnsDiv.appendChild(pill);
                        // Add to preview header
                        const headerCell = document.createElement('div');
                        headerCell.style.width = `${width}px`;
                        headerCell.style.padding = '8px';
                        headerCell.style.borderRight = '1px solid #ddd';
                        headerCell.style.fontWeight = '600';
                        headerCell.style.backgroundColor = '#e9ecef';
                        headerCell.textContent = column;
                        headerRow.appendChild(headerCell);
                        // Update state
                        selectedColumns.push(column);
                        totalWidth -= width;
                        updateRemainingWidth();
                        // Clear inputs
                        select.value = '';
                        widthInput.value = '';
                        // Remove pill and header cell
                        pill.querySelector('.ti-x').addEventListener('click', function() {
                            pill.remove();
                            headerRow.removeChild(headerCell);
                            selectedColumns = selectedColumns.filter(c => c !== column);
                            totalWidth += width;
                            updateRemainingWidth();
                        });
                        showAlert('Column added successfully!', 'success');
                    });
                </script>
                <div class="tab-pane fade" id="software-setting">
                    <div class="row">
                        <div class="col-xl-3 theiaStickySidebar">
                            <div class="card">
                                <div class="card-body">
                                    <div class="d-flex flex-column list-group settings-list">
                                        <a href="#auto-sync-settings"
                                            class="d-inline-flex align-items-center rounded active py-2 px-3"
                                            data-bs-toggle="tab"><i class="ti ti-clock me-2"></i>Auto Sync Settings</a>
                                        <a href="#response-color-settings"
                                            class="d-inline-flex align-items-center rounded py-2 px-3"
                                            data-bs-toggle="tab"><i class="ti ti-palette me-2"></i>Response Color
                                            Settings</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-9">
                            <div class="tab-content">
                                <!-- Auto Sync Settings -->
                                <div class="tab-pane fade show active" id="auto-sync-settings">
                                    <div class="card">
                                        <div class="card-body">
                                            <div class="border-bottom mb-3 pb-3">
                                                <h4 class="fw-medium">Auto Sync Settings</h4>
                                                <p class="fs-12">Configure the auto-sync interval for the Python
                                                    application.</p>
                                            </div>
                                            <form>
                                                <div class="row g-3">
                                                    <div class="col-md-12">
                                                        <div class="row align-items-center">
                                                            <div class="col-md-4">
                                                                <label class="form-label mb-md-0">Sync Interval
                                                                    (minutes)</label>
                                                            </div>
                                                            <div class="col-md-8">
                                                                <input type="number" class="form-control"
                                                                    name="sync_interval" min="1" max="1440"
                                                                    value="60" placeholder="e.g., 60">
                                                                <small class="form-text text-muted">Range: 1 to 1440
                                                                    minutes (24 hours)</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-12">
                                                        <div class="row align-items-center">
                                                            <div class="col-md-4">
                                                                <label class="form-label mb-md-0">Enable Auto-Sync</label>
                                                            </div>
                                                            <div class="col-md-8">
                                                                <div class="form-check form-switch">
                                                                    <input class="form-check-input" type="checkbox"
                                                                        id="autoSync" checked>
                                                                    <label class="form-check-label" for="autoSync">Enable
                                                                        automatic synchronization</label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center justify-content-end">
                                                    <button type="button"
                                                        class="btn btn-outline-light border me-3">Cancel</button>
                                                    <button type="submit" class="btn btn-primary">Save</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                                <!-- Response Color Settings -->
                                <div class="tab-pane fade" id="response-color-settings">
                                    <div class="card">
                                        <div class="card-body">
                                            <div class="border-bottom mb-3 pb-3">
                                                <h4 class="fw-medium">Response Color Settings</h4>
                                                <p class="fs-12">Customize colors for software response statuses.</p>
                                            </div>
                                            <form>
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-4">
                                                                <label class="form-label mb-md-0">Success</label>
                                                            </div>
                                                            <div class="col-md-8">
                                                                <input type="color"
                                                                    class="form-control form-control-color"
                                                                    name="success_color" value="#28a745"
                                                                    title="Choose Success color">
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-4">
                                                                <label class="form-label mb-md-0">Error</label>
                                                            </div>
                                                            <div class="col-md-8">
                                                                <input type="color"
                                                                    class="form-control form-control-color"
                                                                    name="error_color" value="#dc3545"
                                                                    title="Choose Error color">
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-4">
                                                                <label class="form-label mb-md-0">Warning</label>
                                                            </div>
                                                            <div class="col-md-8">
                                                                <input type="color"
                                                                    class="form-control form-control-color"
                                                                    name="warning_color" value="#ffc107"
                                                                    title="Choose Warning color">
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-4">
                                                                <label class="form-label mb-md-0">Info</label>
                                                            </div>
                                                            <div class="col-md-8">
                                                                <input type="color"
                                                                    class="form-control form-control-color"
                                                                    name="info_color" value="#17a2b8"
                                                                    title="Choose Info color">
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="row align-items-center mb-3">
                                                            <div class="col-md-4">
                                                                <label class="form-label mb-md-0">Default</label>
                                                            </div>
                                                            <div class="col-md-8">
                                                                <input type="color"
                                                                    class="form-control form-control-color"
                                                                    name="default_color" value="#6c757d"
                                                                    title="Choose Default color">
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center justify-content-end">
                                                    <button type="button"
                                                        class="btn btn-outline-light border me-3">Cancel</button>
                                                    <button type="submit" class="btn btn-primary">Save</button>
                                                </div>
                                            </form>
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
