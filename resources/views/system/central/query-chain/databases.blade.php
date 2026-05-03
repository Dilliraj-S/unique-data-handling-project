{{-- Template: Databases Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Databases')
@section('top-style')
<style>

    #configs {
        margin-left: -18px;
        margin-right: -18px;
    }
    
    #configs .table-responsive {
        margin-left: 0;
        padding-left: 0;
    }
</style>
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
                            <a href="javascript:void(0);">Query Chain</a>
                        </li>
                        <li class="breadcrumb-item active fw-bold">Databases</li>
                    </ol>
                </nav>
            </div>
        </div>


        <div class="col-xl-12">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-end align-items-center">
                        <div class="action-area">
                            <button class="btn btn-primary skeleton-popup" data-token="@skeletonToken('central_unique_database')_a" data-text="Add database" id="configs-add-btn">Add database</button>
                        </div>
                    </div>
                    <div class="tab-content mt-2 pt-2 border-top">
                        <div class="tab-pane fade show active" id="configs" role="tabpanel" aria-labelledby="configs-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_unique_database')_t"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
                               