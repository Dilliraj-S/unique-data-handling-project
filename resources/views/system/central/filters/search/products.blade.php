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
                        <li class="breadcrumb-item active fw-bold">Products</li>
                    </ol>
                </nav>
            </div>
        </div>
        <div class="col-xl-12">
            <div class="row g-3 mb-4">
                <!-- Total Count Card -->
                
            </div>
            <div class="card">
                <div class="card-body">
                         <div class="d-flex justify-content-end align-items-center mb-4">
                            <div class="action-area">
                                <button class="btn btn-primary skeleton-popup" 
                                        data-token="@skeletonToken('central_unique_products')_a" 
                                        data-text="Add database" 
                                        id="configs-add-btn">
                                    Add Product
                                </button>
                            </div>
                        </div>
                    <div class="border-top pt-2"
                    id="skeletonContainer" 
                    data-skeleton-table-set="@skeletonToken('central_unique_products')_t"></div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection