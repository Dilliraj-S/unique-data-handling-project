{{-- Template: Workflowtest Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Workflowtest')
@section('top-style')
@endsection
@section('bottom-script')
@endsection
@section('content')
<div class="content">
    <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
        <div class="my-auto mb-2">
            <h3 class="mb-1">Workflowtest</h3>
            <nav>
                <ol class="breadcrumb mb-0">
                    <li class="breadcrumb-item"><a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a></li>
                    <li class="breadcrumb-item "><a href="{{ url('/query-chain') }}">Query Chain</a></li>
                    <li class="breadcrumb-item active" aria-current="page"><a href="#">Workflowtest</a></li>
                </ol>
            </nav>
        </div>
        <div></div>
        <div class="d-flex my-xl-auto right-content align-items-center flex-wrap">
                <div class="live-time-container head-icons">
                    <span class="live-time-icon me-2"><i class="fa-thin fa-clock"></i></span>
                    <div class="live-time"></div>
                </div>
            <div class="ms-2 head-icons">
                <a href="javascript:void(0);" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-original-title="Collapse" id="collapse-header"><i class="ti ti-chevrons-up"></i></a>
            </div>
        </div>
    </div>
    <div class="col-xl-12">
        {{--************************************************************************************************
        *                                                                                                  *
        *                             >>> MODIFY THIS SECTION (START) <<<                                  *
        *                                                                                                  *
        ************************************************************************************************--}}
        <div class="d-flex flex-column align-items-center justify-content-center text-center w-100" style="height:calc(100vh - 200px) !important;">
            <img src="{{ asset('errors/empty.svg') }}" alt="Empty Page" class="img-fluid mb-2 w-25">
            <h1 class="h3 mb-2 fw-bold">Just a Display Page</h1>
            <p class="text-muted mb-2" style="max-width: 600px;">
                This page is intentionally left empty and serves only as a display case or placeholder.<br>
                There's no content here to interact with right now.
            </p>
            <p class="text-muted" style="max-width: 600px;">
                You can explore other sections of the application to find working features and full content.
            </p>
            <div class="d-flex flex-wrap justify-content-center gap-3 mt-2">
                <a href="{{ url()->previous() }}" class="btn btn-outline-secondary rounded-pill">Go Back</a>
                <a href="{{ url('/dashboard') }}" class="btn btn-primary rounded-pill">Explore Dashboard</a>
            </div>
        </div>
        {{--************************************************************************************************
        *                                                                                                  *
        *                             >>> MODIFY THIS SECTION (END) <<<                                    *
        *                                                                                                  *
        ************************************************************************************************--}}
    </div>
</div>
@endsection