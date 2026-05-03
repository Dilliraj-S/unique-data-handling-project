{{-- Template: Users Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Users')
@section('top-style')
@endsection
@section('bottom-script')
@endsection
@section('content')
    <div class="container-xxl flex-grow-1 container-p-y">
        <div class="row gy-2">
            <div class="row mt-5">
                <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
                    {{-- Page Title and Navigation - Contains breadcrumb links --}}
                    <div class="my-auto mb-2">
                        <h5 class="mb-1">Skeleton Modules</h5>
                        <nav>
                            <ol class="breadcrumb mb-0">
                                <li class="breadcrumb-item">
                                    <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                                </li>
                                <li class="breadcrumb-item">
                                    <a href="{{ url('/developer') }}">Developer</a>
                                </li>
                                <li class="breadcrumb-item active">Skeleton Modules</li>
                            </ol>
                        </nav>
                    </div>

                    {{-- Header Right Controls - Contains live time and collapse button --}}
                    <div class="d-flex my-xl-auto right-content align-items-center flex-wrap">
                        {{-- Live Time Display - Shows current time with clock icon --}}
                        <div class="live-time-container head-icons">
                            <span class="live-time-icon me-2"><i class="fa-thin fa-clock"></i></span>
                            <div class="live-time"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-xl-12">
                <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-end mb-3">
                    <button class="btn btn-primary skeleton-popup " id="configs-add-btn"
                        data-token="@skeletonToken('central_users')_a">Add Users</button>
                    </div>
                <div data-skeleton-table-set="@skeletonToken('central_users')_t"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection