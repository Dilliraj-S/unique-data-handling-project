@extends('layouts.system-app')
@section('title', 'Skeleton Tokens')
@section('active', 'Tokens')
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
                            <a href="javascript:void(0);">Developer</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="javascript:void(0);">Skeleton</a> 
                        </li>
                        <li class="breadcrumb-item active fw-bold">Tokens</li>
                    </ol>
                </nav>
            </div>
        </div>

    {{-- Main Content Card - Contains tabs and tabbed content --}}
        <div class="col-xl-12">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <ul class="nav nav-pills data-skl-action" id="skeleton-configs" role="tablist">
                            <li class="nav-item"><a class="nav-link active" id="configs-tab" data-skl-action="b" data-bs-toggle="tab" href="#configs" role="tab" aria-controls="configs" aria-selected="true" data-token="@skeletonToken('central_skeleton_tokens')_a" data-text="Add Token" data-target="#configs-add-btn">Tokens</a></li>
                        </ul>
                        <div class="action-area">
                            <button class="btn btn-primary skeleton-popup" id="configs-add-btn">Default</button>
                        </div>
                    </div>
                    <div class="tab-content mt-2 pt-2 border-top">
                        <div class="tab-pane fade show active" id="configs" role="tabpanel" aria-labelledby="configs-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_skeleton_tokens')_t"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection