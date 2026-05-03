@extends('layouts.system-app')
@section('title', 'Shifts | Gotit HR Management Software')
@section('content')
    <div class="content">
        <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
            <div class="my-auto mb-2">
                <h3 class="mb-1">Shifts</h3>
                <nav>
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Shift Management</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Shifts</a>
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
        <div class="col-xl-12">
            <div class="card">
                <div class="card-body">
                    <!-- Tabs Navigation -->
                    <div class="d-flex justify-content-between">
                        <ul class="nav nav-tabs nav-tabs-solid bg-transparent border-bottom-0 mb-3 data-skl-action"
                            id="skeleton-Shifts" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active" id="Shifts-tab" data-skl-action="b" data-bs-toggle="tab"
                                    href="#Shifts" role="tab" aria-controls="Shifts" aria-selected="true"
                                    data-token="@skeletonToken('business_shifts')_a" data-text="Add Shifts"
                                    data-target="#Shifts-add-btn">Shifts</a>
                            </li>
                        </ul>
                        <div class="action-area">
                            <button class="btn btn-primary skeleton-popup" id="Shifts-add-btn">Default</button>
                        </div>
                    </div>
                    <!-- Tabs Content -->
                    <div class="tab-content" id="skeletonTabsContent">
                        <div class="tab-pane fade show active" id="Shifts" role="tabpanel"
                            aria-labelledby="Shifts-tab">
                            <div data-skeleton-table-set="@skeletonToken('business_shifts')_f"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- /Content Wrap -->
    </div>
@endsection
