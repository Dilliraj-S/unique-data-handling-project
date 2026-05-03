{{-- Template: Unique Tables Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Unique Tables')
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
                            <a href="javascript:void(0);">Query Chain</a>
                        </li>
                        <li class="breadcrumb-item active fw-bold">Unique Tables</li>
                    </ol>
                </nav>
            </div>
        </div>
        <div class="tab-content mt-2 pt-2 border-top">
            <div class="tab-pane fade show active" id="configs" role="tabpanel">
                <div class="card">
                    <div class="card-body">
                        <div data-skeleton-table-set="@skeletonToken('central_unique_unq_tables')_t"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</div>
@endsection