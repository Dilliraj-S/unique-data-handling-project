@extends('layouts.system-app')
@section('title', 'Skeleton-configs | Gotit HR Management Software')
@section('top-style')

@endsection
@section('bottom-script')

@endsection
@section('content')
<div class="content">
    <!-- Breadcrumb -->
    <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
        <div class="my-auto mb-2">
            <h3 class="mb-1">Skeleton Configs</h3>
            <nav>
                <ol class="breadcrumb mb-0">
                    <li class="breadcrumb-item">
                        <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                    </li>
                    <li class="breadcrumb-item">
                        <a href="{{ url('/dashboard') }}">Settings</a>
                    </li>
                    <li class="breadcrumb-item">
                        <a href="{{ url('/dashboard') }}">Developer</a>
                    </li>
                    <li class="breadcrumb-item active" aria-current="page">Skeleton Configs</li>
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
                <a href="javascript:void(0);" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-original-title="Collapse" id="collapse-header">
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
                    <ul class="nav nav-tabs nav-tabs-solid bg-transparent border-bottom-0 mb-3 data-skl-action" id="skeleton-configs" role="tablist">
                        <li class="nav-item">
                            <a class="nav-link" id="modules-tab" data-skl-action="b" data-bs-toggle="tab" href="#modules" role="tab" aria-controls="modules" aria-selected="false" data-prefix="settings" data-type="add" data-token="@skeletonToken('central_folders')_a" data-text="Add Folder" data-target="#configs-add-btn">Folders</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" id="sections-tab" data-skl-action="b" data-bs-toggle="tab" href="#sections" role="tab" aria-controls="sections" aria-selected="false" data-prefix="settings" data-type="add" data-token="@skeletonToken('central_folder_permissions')_a" data-text="Add Permission" data-target="#configs-add-btn">Folder Permissions</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" id="items-tab" data-skl-action="b" data-bs-toggle="tab" href="#items" role="tab" aria-controls="items" aria-selected="false" data-prefix="settings" data-type="add" data-token="@skeletonToken('central_file_extensions')_a" data-text="Add Extention" data-target="#configs-add-btn">File Extensions</a>
                        </li>
                    </ul>

                    <div class="action-area">
                        <button class="btn btn-primary skeleton-popup" id="configs-add-btn">Default</button>
                    </div>
                </div>

                <!-- Tabs Content -->
                <div class="tab-content" id="skeletonTabsContent">

                    <div class="tab-pane fade" id="modules" role="tabpanel" aria-labelledby="modules-tab">
                        <div data-skeleton-table-set="@skeletonToken('central_folders')_t" ></div>
                    </div>
                    <div class="tab-pane fade" id="sections" role="tabpanel" aria-labelledby="sections-tab">
                        <div data-skeleton-table-set="@skeletonToken('central_folder_permissions')_t"></div>
                    </div>
                    <div class="tab-pane fade" id="items" role="tabpanel" aria-labelledby="items-tab">
                        <div data-skeleton-table-set="@skeletonToken('central_file_extensions')_t"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- /Content Wrap -->  
</div>
@endsection
