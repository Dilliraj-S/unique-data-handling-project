{{-- Template: Product Unsubscribe Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Product Unsubscribe')
@section('top-style')
@endsection
@section('bottom-script')
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
                        <li class="breadcrumb-item active fw-bold">Product Unsubscribe</li>
                    </ol>
                </nav>
            </div>
        </div>
        <div class="col-xl-12">
            <div class="card">
                <div class="card-body">
                    <div data-skeleton-table-set="@skeletonToken('central_pluto_product_unsubscribe')_t"></div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection