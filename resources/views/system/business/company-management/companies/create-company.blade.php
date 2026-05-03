@extends('layouts.system-app')
@section('title', 'Companies | Gotit HR Management Software')
@section('top-style')
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bs-stepper/dist/css/bs-stepper.min.css">
@endsection
@section('bottom-script')
    <script src="https://cdn.jsdelivr.net/npm/bs-stepper/dist/js/bs-stepper.min.js"></script>
@endsection
@section('content')
    <div class="content">
        <!-- Breadcrumb -->
        <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
            <div class="my-auto mb-2">
                <h3 class="mb-1">Company</h3>
                <nav>
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Company</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Companies</a>
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
        <!-- Content Wrap -->
        <div class="row">
            <!-- Total Companies -->
            <div class="col-lg-3 col-md-6 d-flex">
                <div class="card flex-fill">
                    <div class="card-body d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center overflow-hidden">
                            <span class="avatar avatar-lg bg-primary flex-shrink-0">
                                <i class="ti ti-building fs-16"></i>
                            </span>
                            <div class="ms-2 overflow-hidden">
                                <p class="fs-12 fw-medium mb-1 text-truncate">Total Companies</p>
                                <h4>950</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- /Total Companies -->
            <!-- Total Companies -->
            <div class="col-lg-3 col-md-6 d-flex">
                <div class="card flex-fill">
                    <div class="card-body d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center overflow-hidden">
                            <span class="avatar avatar-lg bg-success flex-shrink-0">
                                <i class="ti ti-building fs-16"></i>
                            </span>
                            <div class="ms-2 overflow-hidden">
                                <p class="fs-12 fw-medium mb-1 text-truncate">Active Companies</p>
                                <h4>920</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- /Total Companies -->
            <!-- Inactive Companies -->
            <div class="col-lg-3 col-md-6 d-flex">
                <div class="card flex-fill">
                    <div class="card-body d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center overflow-hidden">
                            <span class="avatar avatar-lg bg-danger flex-shrink-0">
                                <i class="ti ti-building fs-16"></i>
                            </span>
                            <div class="ms-2 overflow-hidden">
                                <p class="fs-12 fw-medium mb-1 text-truncate">Inactive Companies</p>
                                <h4>30</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- /Inactive Companies -->
            <!-- Company Location -->
            <div class="col-lg-3 col-md-6 d-flex">
                <div class="card flex-fill">
                    <div class="card-body d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center overflow-hidden">
                            <span class="avatar avatar-lg bg-skyblue flex-shrink-0">
                                <i class="ti ti-map-pin-check fs-16"></i>
                            </span>
                            <div class="ms-2 overflow-hidden">
                                <p class="fs-12 fw-medium mb-1 text-truncate">Company Location</p>
                                <h4>180</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- /Company Location -->
        </div>
        <div class="col-xl-12">
            <div class="card">
                <div class="card-body">
                    <!-- Tabs Navigation -->
                    <div class="d-flex justify-content-between">
                        <ul class="nav nav-tabs nav-tabs-solid bg-transparent border-bottom-0 mb-3 data-skl-action"
                            id="skeleton-Companies" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active" id="Companies-tab" data-skl-action="b" data-bs-toggle="tab"
                                    href="#Companies" role="tab" aria-controls="Companies" aria-selected="true"
                                    data-token="@skeletonToken('business_companies')_a" data-text="Add Companies"
                                    data-target="#Companies-add-btn">Companies</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="branches-tab" data-skl-action="b" data-bs-toggle="tab"
                                    href="#branches" role="tab" aria-controls="branches" aria-selected="true"
                                    data-token="@skeletonToken('business_branches')_a" data-text="Add branches"
                                    data-target="#Companies-add-btn">branches</a>
                            </li>

                            <button class="btn btn-primary skeleton-popup" id="configs-add-btn"
                                data-token="@skeletonToken('business_company_onboarding')_a">
                                Company Onboarding
                            </button>   
                        </ul>
                        <div class="action-area">
                            <button class="btn btn-primary skeleton-popup" id="Companies-add-btn">Default</button>
                        </div>
                    </div>
                    <!-- Tabs Content -->
                    <div class="tab-content" id="skeletonTabsContent">
                        <div class="tab-pane fade show active" id="Companies" role="tabpanel"
                            aria-labelledby="Companies-tab">
                            <div data-skeleton-table-set="@skeletonToken('business_companies')_f"></div>
                        </div>
                        <div class="tab-pane fade" id="branches" role="tabpanel" aria-labelledby="branches-tab">
                            <div data-skeleton-table-set="@skeletonToken('business_branches')_f"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- /Content Wrap -->
    </div>
@endsection
