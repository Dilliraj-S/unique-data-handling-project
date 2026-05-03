{{-- Template: Workflows Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Workflows Config')
@section('top-style')
<style>
   
    #workflow, #processes {
        margin-left: -18px;
        margin-right: -18px;
    }
    
    #workflow .table-responsive, #processes .table-responsive {
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
                        <li class="breadcrumb-item active fw-bold">Workflows Config</li>
                    </ol>
                </nav>
            </div>
        </div>

       <div class="col-xl-12">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <ul class="nav nav-pills data-skl-action" id="skeleton-configs" role="tablist">
                            <li class="nav-item"><a class="nav-link active" id="configs-tab" data-skl-action="b" data-bs-toggle="tab" href="#workflow" role="tab" aria-controls="workflow" aria-selected="true" data-token="@skeletonToken('central_unique_workflows')_v_1" data-text="Add Workflow" data-target="#workflow-add-btn">Workflows Config</a></li>
                            <li class="nav-item"><a class="nav-link" id="configs-tab" data-skl-action="b" data-bs-toggle="tab" href="#processes" role="tab" aria-controls="processes" aria-selected="true" data-token="@skeletonToken('central_unique_processes')_a" data-text="Add Process" data-target="#workflow-add-btn">Process Config</a></li>
                        </ul>
                        <div class="action-area">
                            <button class="btn btn-primary skeleton-popup" id="workflow-add-btn">Default</button>
                        </div>
                    </div>
                    <div class="tab-content mt-2 pt-2 border-top">
                        <div class="tab-pane fade show active" id="workflow" role="tabpanel" aria-labelledby="workflow-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_unique_workflows')_t"></div>
                        </div>
                        <div class="tab-pane fade" id="processes" role="tabpanel" aria-labelledby="processes-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_unique_processes')_t"></div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>
@endsection