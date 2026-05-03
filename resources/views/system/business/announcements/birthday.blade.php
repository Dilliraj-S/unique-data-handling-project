@extends('layouts.system-app')
@section('title', 'Skeleton-configs | Gotit HR Management Software')
@section('content')
    <div class="content">
        <!-- Breadcrumb -->
        <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
            <div class="my-auto mb-2">
                <h3 class="mb-1">Birthday</h3>
                <nav>
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Announcements</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Birthday</a>
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
                            id="skeleton-configs" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active" id="configs-tab" data-skl-action="b" data-bs-toggle="tab"
                                    href="#configs" role="tab" aria-controls="configs" aria-selected="true"
                                    data-token="@skeletonToken('central_skeleton_tokens')_a" data-text="Add Token"
                                    data-target="#configs-add-btn">Tokens</a>
                            </li>
                        </ul>

                        <div class="action-area">
                            <button class="btn btn-primary skeleton-popup" id="configs-add-btn">Default</button>
                        </div>
                    </div>
                    <!-- Tabs Content -->
                    <div class="tab-content" id="skeletonTabsContent">
                        <div class="tab-pane fade show active" id="configs" role="tabpanel" aria-labelledby="configs-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_skeleton_tokens')_f"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- /Content Wrap -->
    </div>
@endsection
