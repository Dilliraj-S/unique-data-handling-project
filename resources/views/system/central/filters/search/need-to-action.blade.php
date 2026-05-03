@extends('layouts.system-app')
@section('title', 'Search')
@section('top-style')
<style>
    /* Remove left padding/margin for table tabs to align properly */
    #contacts, #companies {
        margin-left: -18px;
        margin-right: -18px;
    }
    
    #contacts .table-responsive, #companies .table-responsive {
        margin-left: 0;
        padding-left: 0;
    }
</style>
@endsection
@section('bottom-script')
<script>
    document.addEventListener('DOMContentLoaded', function () {
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
<div class="container-xxl flex-grow-1 container-p-y">
    <div class="row gy-2">
        <div class="col-xl-12">
            <div class="container-fluid px-0 d-flex justify-content-between align-items-center">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item">
                            <a href="javascript:void(0);">Filters</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="javascript:void(0);">Search</a>
                        </li>
                        <li class="breadcrumb-item active fw-bold">Need TO Action</li>
                    </ol>
                </nav>
            </div>
        </div>
        <div class="col-xl-12">
            <div class="card">
                <div class="card-header p-3 border-bottom-0 d-flex justify-content-between">
                    <div class="nav-align-top">
                        <ul class="nav nav-pills adt-set" role="tablist" data-adt-tab-id="categories">
                            <li class="nav-item" role="presentation">
                                <button type="button" class="nav-link adt-tab waves-effect adt-refresh-tab active"
                                    role="tab" data-bs-toggle="tab" data-bs-target="#contacts"
                                    aria-controls="contacts" aria-selected="true">
                                    Contacts
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button type="button" class="nav-link adt-tab waves-effect adt-refresh-tab"
                                    role="tab" data-bs-toggle="tab" data-bs-target="#companies"
                                    aria-controls="companies" aria-selected="false">
                                    Companies
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="card-body">
                    <div class="tab-content border-top pt-2 ">
                        <div class="tab-pane fade active show" id="contacts" role="tabpanel">
                            <div data-skeleton-table-set="@skeletonToken('central_need_action_contacts')_t"></div>
                        </div>
                        <div class="tab-pane fade" id="companies" role="tabpanel">
                            <div data-skeleton-table-set="@skeletonToken('central_need_action_companies')_t"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
