@extends('layouts.system-app')
@section('title', 'Skeleton Modules')
@section('top-style')
@endsection
@section('bottom-script')
@endsection
@section('content')
    <div class="content">
        <!-- Breadcrumb -->
        <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
            <div class="my-auto mb-2">
                <h3 class="mb-1">Skeleton Modules</h3>
                <nav>
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/developer') }}">Developer</a>
                        </li>
                        <li class="breadcrumb-item active" aria-current="page">Skeleton Modules</li>
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
        <!-- Content Wrap -->
        <div class="col-xl-12">
            <div class="card">
                <div class="card-body">
                    <!-- Tabs Navigation -->
                    <div class="d-flex justify-content-between align-items-center">
                        <ul class="nav nav-links nav-tabs-solid bg-transparent border-bottom-0 data-skl-action"
                            id="skeleton-configs" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link" id="modules-tab" data-skl-action="b" data-bs-toggle="tab"
                                    href="#modules" role="tab" aria-controls="modules" aria-selected="false"
                                    data-prefix="settings" data-type="add" data-token="@skeletonToken('central_skeleton_modules')_a"
                                    data-text="Add Modules" data-target="#configs-add-btn">Modules</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="sections-tab" data-skl-action="b" data-bs-toggle="tab"
                                    href="#sections" role="tab" aria-controls="sections" aria-selected="false"
                                    data-prefix="settings" data-type="add" data-token="@skeletonToken('central_skeleton_sections')_a"
                                    data-text="Add Sections" data-target="#configs-add-btn">Sections</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="items-tab" data-skl-action="b" data-bs-toggle="tab" href="#items"
                                    role="tab" aria-controls="items" aria-selected="false" data-prefix="settings"
                                    data-type="add" data-token="@skeletonToken('central_skeleton_items')_a" data-text="Add Items"
                                    data-target="#configs-add-btn">Items</a>
                            </li>
                        </ul>
                        <div class="action-area">
                            <button class="btn btn-primary skeleton-popup" id="configs-add-btn">Default</button>
                        </div>
                    </div>
                    <!-- Tabs Content -->
                    <div class="tab-content" id="skeletonTabsContent">
                        <div class="tab-pane fade" id="modules" role="tabpanel" aria-labelledby="modules-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_skeleton_modules')_t"></div>
                        </div>
                        <div class="tab-pane fade" id="sections" role="tabpanel" aria-labelledby="sections-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_skeleton_sections')_t"></div>
                        </div>
                        <div class="tab-pane fade" id="items" role="tabpanel" aria-labelledby="items-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_skeleton_items')_t"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {{-- <div data-skeleton-card-set="@skeletonToken('central_skeleton_modules')_c" data-placeholder="card|10" data-type="paging" data-limit="10" data-filters="sort|date|search|counts" data-container="row"></div>
        <div data-skeleton-card-set="@skeletonToken('central_skeleton_items')_c" data-placeholder="list|4" data-type="scroll" data-limit="10" data-filters="sort|date|search|counts" data-container="row"></div> --}}

        <!-- /Content Wrap -->
        <!-- resources/views/components/hrm-form.blade.php -->
        {{-- <div class="container">
    <form id="hrm-form">
        <!-- Stepper 1 (Direct Columns) -->
        <div class="stepper" data-stepper="personal_steps" data-storage="columns" data-value='{"first_name":"Alice","role":"dev","salary":50000}'>
            <div class="stepper-nav mb-3 d-flex justify-content-between">
                <div class="stepper-step active text-primary" data-step="0">Basic Info</div>
                <div class="stepper-step text-muted" data-step="1">Job Details</div>
            </div>
            <div class="stepper-content" data-step-content="0" style="display: block;">
                <div class="row g-2">
                    <div class="col-md-12 float-input-control">
                        <input type="text" id="first_name" name="first_name" class="form-float-input" required>
                        <label for="first_name" class="form-float-label">First Name<span class="text-danger">*</span></label>
                    </div>
                </div>
            </div>
            <div class="stepper-content" data-step-content="1" style="display: none;">
                <div class="row g-2">
                    <div class="col-md-6 float-input-control">
                        <select id="role" name="role" class="form-select" data-select="dropdown">
                            <option value="dev">Developer</option>
                            <option value="mgr">Manager</option>
                        </select>
                        <label for="role" class="form-label">Role</label>
                    </div>
                    <div class="col-md-6 float-input-control">
                        <input type="number" id="salary" name="salary" class="form-float-input">
                        <label for="salary" class="form-float-label">Salary</label>
                    </div>
                </div>
            </div>
            <div class="stepper-controls mt-3">
                <button type="button" class="btn btn-secondary stepper-prev" disabled>Previous</button>
                <button type="button" class="btn btn-primary stepper-next">Next</button>
            </div>
        </div>
        <!-- Stepper 2 (JSON) -->
        <div class="stepper" data-stepper="training_steps" data-storage="json" data-value='[{"course":"PHP Basics","date":"2025-01-01"},{"certification":"PHP Certified","score":85}]'>
            <div class="stepper-nav mb-3 d-flex justify-content-between">
                <div class="stepper-step active text-primary" data-step="0">Course Details</div>
                <div class="stepper-step text-muted" data-step="1">Certification</div>
            </div>
            <div class="stepper-content" data-step-content="0" style="display: block;">
                <div class="row g-2">
                    <div class="col-md-6 float-input-control">
                        <input type="text" id="course-0" name="training_steps[0][course]" class="form-float-input" required>
                        <label for="course-0" class="form-float-label">Course Name<span class="text-danger">*</span></label>
                    </div>
                    <div class="col-md-6 float-input-control">
                        <input type="date" id="date-0" name="training_steps[0][date]" class="form-float-input">
                        <label for="date-0" class="form-float-label">Course Date</label>
                    </div>
                </div>
            </div>
            <div class="stepper-content" data-step-content="1" style="display: none;">
                <div class="row g-2">
                    <div class="col-md-6 float-input-control">
                        <input type="text" id="certification-1" name="training_steps[1][certification]" class="form-float-input">
                        <label for="certification-1" class="form-float-label">Certification Name</label>
                    </div>
                    <div class="col-md-6 float-input-control">
                        <input type="number" id="score-1" name="training_steps[1][score]" class="form-float-input">
                        <label for="score-1" class="form-float-label">Score</label>
                    </div>
                </div>
            </div>
            <div class="stepper-controls mt-3">
                <button type="button" class="btn btn-secondary stepper-prev" disabled>Previous</button>
                <button type="button" class="btn btn-primary stepper-next">Next</button>
            </div>
        </div>
        <!-- Repeater 1 -->
        <div class="repeater-group" data-repeater="emergency_contacts" data-value='[{"contact_name":"John Doe","contact_phone":"1234567890"},{"contact_name":"Jane Smith","contact_phone":"0987654321"}]'>
            <div class="repeater-item" data-repeater-index="0">
                <div class="row g-2">
                    <div class="col-md-6 float-input-control">
                        <input type="text" id="contact_name-0" name="emergency_contacts[0][contact_name]" class="form-float-input" required>
                        <label for="contact_name-0" class="form-float-label">Contact Name<span class="text-danger">*</span></label>
                    </div>
                    <div class="col-md-6 float-input-control">
                        <input type="tel" id="contact_phone-0" name="emergency_contacts[0][contact_phone]" class="form-float-input" required>
                        <label for="contact_phone-0" class="form-float-label">Contact Phone<span class="text-danger">*</span></label>
                    </div>
                </div>
                <button type="button" class="btn btn-danger repeater-remove mt-2">Remove Contact</button>
            </div>
            <button type="button" class="btn btn-primary repeater-add mt-2">Add Contact</button>
        </div>
        <!-- Repeater 2 -->
        <div class="repeater-group" data-repeater="certifications" data-value='[{"name":"AWS","year":"2023"},{"name":"Scrum","year":"2024"}]'>
            <div class="repeater-item" data-repeater-index="0">
                <div class="row g-2">
                    <div class="col-md-6 float-input-control">
                        <input type="text" id="cert_name-0" name="certifications[0][name]" class="form-float-input" required>
                        <label for="cert_name-0" class="form-float-label">Certification Name<span class="text-danger">*</span></label>
                    </div>
                    <div class="col-md-6 float-input-control">
                        <input type="number" id="cert_year-0" name="certifications[0][year]" class="form-float-input">
                        <label for="cert_year-0" class="form-float-label">Year</label>
                    </div>
                </div>
                <button type="button" class="btn btn-danger repeater-remove mt-2">Remove Certification</button>
            </div>
            <button type="button" class="btn btn-primary repeater-add mt-2">Add Certification</button>
        </div>
        <button type="submit" class="btn btn-primary mt-3">Submit</button>
    </form>
</div> --}}
        {{-- <script>
    document.addEventListener('DOMContentLoaded', () => {
        window.skeleton.select();
        window.skeleton.unique();
        window.skeleton.imagePreview();
        window.skeleton.repeater();
        window.skeleton.stepper();
        // Simulate dynamic data-value update for testing
        setTimeout(() => {
            document.querySelector('[data-repeater="emergency_contacts"]').dataset.value = JSON.stringify([
                { contact_name: 'Bob Johnson', contact_phone: '5551234567' },
                { contact_name: 'Alice Brown', contact_phone: '5559876543' }
            ]);
            document.querySelector('[data-stepper="personal_steps"]').dataset.value = JSON.stringify({
                first_name: 'Bob',
                role: 'mgr',
                salary: 60000
            });
        }, 3000);
    });
</script> --}}
    </div>
@endsection
