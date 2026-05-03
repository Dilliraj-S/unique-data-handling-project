<!-- resources/views/panels/supreme/settings/developer/skeletonconfigs.blade.php -->
@extends('layouts.system-app')
@section('title', 'Skeleton-configs | Gotit HR Management Software')

@section('content')
<div class="content">
    <!-- Breadcrumb -->
    <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
        <div class="my-auto mb-2">
            <h3 class="mb-1">Skeleton Configs</h3>
            
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
                            <a class="nav-link active" id="configs-tab" data-skl-action="b" data-bs-toggle="tab" href="#configs" role="tab" aria-controls="configs" aria-selected="true" data-prefix="settings" data-type="add" data-token="@skeletonToken('supreme_tokens')" data-text="Add Token" data-target="#configs-add-btn">Tokens</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" id="modules-tab" data-skl-action="b" data-bs-toggle="tab" href="#modules" role="tab" aria-controls="modules" aria-selected="false" data-prefix="settings" data-type="add" data-token="@skeletonToken('supreme_modules')" data-text="Add Modules" data-target="#configs-add-btn">Modules</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" id="sections-tab" data-skl-action="b" data-bs-toggle="tab" href="#sections" role="tab" aria-controls="sections" aria-selected="false" data-prefix="settings" data-type="add" data-token="@skeletonToken('supreme_section')" data-text="Add Sections" data-target="#configs-add-btn">Sections</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" id="items-tab" data-skl-action="b" data-bs-toggle="tab" href="#items" role="tab" aria-controls="items" aria-selected="false" data-prefix="settings" data-type="add" data-token="@skeletonToken('supreme_items')" data-text="Add Items" data-target="#configs-add-btn">Items</a>
                        </li>
                    </ul>

                    <div class="action-area">
                        <button class="btn btn-primary skeleton-popup" id="configs-add-btn">Default</button>
                    </div>
                </div>
<h1 class="text-3xl font-bold mb-4">Welcome to the Dashboard @skeletonToken('kiran')</h1>
                <!-- Tabs Content -->
                <div class="tab-content" id="skeletonTabsContent">
                    <div class="tab-pane fade show active" id="configs" role="tabpanel" aria-labelledby="configs-tab">
                        <div data-skeleton-table-set="@skeletonToken('supreme_tokens')" data-prefix="settings"></div>
                    </div>
                    <div class="tab-pane fade" id="modules" role="tabpanel" aria-labelledby="modules-tab">
                        <div data-skeleton-table-set="@skeletonToken('supreme_modules')" data-prefix="settings"></div>
                    </div>
                    <div class="tab-pane fade" id="sections" role="tabpanel" aria-labelledby="sections-tab">
                        <div data-skeleton-table-set="@skeletonToken('supreme_sections')" data-prefix="settings"></div>
                    </div>
                    <div class="tab-pane fade" id="items" role="tabpanel" aria-labelledby="items-tab">
                        <div data-skeleton-table-set="@skeletonToken('supreme_items')" data-prefix="settings"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- /Content Wrap -->
</div>
@endsection
{{-- 



<!-- Single permission check -->
@can('view:Dashboard')
    <a href="{{ route('dashboard') }}" class="nav-link">Dashboard</a>
@endcan

<!-- Multiple permissions check (all required) -->
@can('view:Dashboard,edit:Profile')
    <a href="{{ route('dashboard') }}" class="nav-link">Dashboard & Profile Edit</a>
@endcan --}}



