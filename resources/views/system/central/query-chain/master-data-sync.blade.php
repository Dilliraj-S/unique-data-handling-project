{{-- Template: Master Data Sync Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Master Data Sync')
@section('top-style')
<style>
    /* Remove left padding/margin for table to align properly */
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
                        <li class="breadcrumb-item active fw-bold">Master Data Sync</li>
                    </ol>
                </nav>
            </div>
        </div>

        <div class="col-xl-12">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-end align-items-center">
                        <div class="action-area">
                            <button class="btn btn-primary skeleton-popup" 
                                    data-token="@skeletonToken('unique_process_logs')_a" 
                                    data-text="Add database" 
                                    id="configs-add-btn">
                                Move MasterData
                            </button>
                        </div>
                    </div>
                    <div class="tab-content mt-2 pt-2 border-top">
                        <div class="tab-pane fade show active" id="configs" role="tabpanel">
                            <div data-skeleton-table-set="@skeletonToken('unique_process_logs')_t"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
