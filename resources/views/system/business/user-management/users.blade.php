@extends('layouts.system-app')
@section('title', 'Skeleton-configs | Gotit HR Management Software')

@section('content')
    <div class="content">
        <!-- Breadcrumb -->
        <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
            <div class="my-auto mb-2">
                <h3 class="mb-1">Users</h3>
                <nav>
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/profile') }}">User Management</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/profile/knowledge-base') }}">Users</a>
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
                    <!-- Tabs Content -->
                    <div class="tab-content" id="skeletonTabsContent">
                        <div class="tab-pane fade show active" id="configs" role="tabpanel" aria-labelledby="configs-tab">
                            <div data-skeleton-table-set="@skeletonToken('users')_f"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

        </div>
        <!-- /Content Wrap -->
    </div>
@endsection
