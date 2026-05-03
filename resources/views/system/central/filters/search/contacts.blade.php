@extends('layouts.system-app')
@section('title', 'Search')
@section('top-style')
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
     document.addEventListener('DOMContentLoaded', () => {
        const fragment = window.location.hash.substring(1);
        if (fragment) {
            const baseToken = "@skeletonToken('central_sun_master_accounts')";
            const fullTokenSet = `${baseToken}_t_${fragment}`;
            console.log('Full Token Set:', fullTokenSet);
            const container = document.getElementById('skeletonContainer');
            if (container) {
                container.setAttribute('data-skeleton-table-set', fullTokenSet);
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
                        <li class="breadcrumb-item active fw-bold">Contacts</li>
                    </ol>
                </nav>
            </div>
        </div>
        <div class="col-xl-12">
            <div class="row g-3 mb-4">
                <!-- Total Count Card -->
                <div class="col-xl-3 col-md-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1 text-muted small">Total</h6>
                                    <h4 class="mb-0 fw-bold text-primary" id="totalCount">0</h4>
                                </div>
                                <div class="bg-secondary bg-opacity-10 p-3 rounded">
                                    <i class="fas fa-database text-primary"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Total Companies Card -->
                <div class="col-xl-3 col-md-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1 text-muted small">Total Companies</h6>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <form id="total_companies" method="POST" class="static">
                                            @csrf
                                            <input type="hidden" name="save_token" value="@skeletonToken('central_unique_get_count')_f">
                                            <input type="hidden" name="processId">
                                            <input type="hidden" name="type" value="total_companies">
                                            <input type="hidden" name="total_comapanies">
                                            <input type="hidden" name="total_bindings">
                                            <div class="text-end">
                                                <button type="submit" id="btnTotalCompanies" class="btn btn-sm bg-white border-none shadow-none p-0 fw-bold text-success">
                                                    Get Count
                                                </button>
                                                <h4 class="mb-0 fw-bold text-success d-none" id="totalCompanies">0</h4>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                                <div class="bg-success bg-opacity-10 p-3 rounded">
                                    <i class="fas fa-building text-success"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filtered Count Card -->
                <div class="col-xl-3 col-md-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1 text-muted small">Filtered</h6>
                                    <h4 class="mb-0 fw-bold text-info" id="filterRecords">0</h4>
                                </div>
                                <div class="bg-info bg-opacity-10 p-3 rounded">
                                    <i class="fas fa-filter text-info"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filtered Companies Card -->
                <div class="col-xl-3 col-md-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1 text-muted small">Filtered Companies</h6>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <form id="filtered_companies" method="POST" class="static">
                                            @csrf
                                            <input type="hidden" name="save_token" value="@skeletonToken('central_unique_get_count')_f">
                                            <input type="hidden" name="processId">
                                            <input type="hidden" name="type" value="filtered_companies">
                                            <input type="hidden" name="filtered_companies">
                                            <input type="hidden" name="filtered_bindings">
                                            <div class="text-end">
                                                <button type="submit" id="btnFilteredCompanies" class="btn btn-sm bg-white border-none shadow-none p-0 fw-bold text-warning">
                                                    Get Count
                                                </button>
                                                <h4 class="mb-0 fw-bold text-warning d-none" id="filterCompanies">0</h4>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                                <div class="bg-warning bg-opacity-10 p-3 rounded">
                                    <i class="fas fa-building text-warning"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div data-skeleton-table-set="@skeletonToken('central_sun_master_leads')_t"></div>
                </div>
            </div>
            
        </div>
    </div>
</div>
@endsection