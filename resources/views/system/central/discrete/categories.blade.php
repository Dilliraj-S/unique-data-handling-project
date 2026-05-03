{{-- Template: Categories Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Categories')

@section('top-style')
<style>
    .page-breadcrumb {
        padding: 15px 15px 10px 15px;
        border-radius: 0.5rem;
        background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(240, 240, 240, 1) 100%);
    }

    /* Live time container */
    .live-time-container {
        display: flex;
        align-items: center; /* vertically center icon + text */
        gap: 6px; /* space between icon and time */
        font-size: 14px; /* adjust size */
        color: #333; /* text color */
        background: #ffffffff; /* light background */
        padding: 10px;
        border-radius: 8px; /* rounded corners */
        margin-top: 5px;
    }

    /* Clock icon */
    .live-time-icon i {
        font-size: 16px; /* slightly bigger than text */
        color: #555; /* icon color */
    }

    /* Time text */
    .live-time {
        font-weight: 500;
        font-size: 14px;
        color: #222;
    }

    /* Remove left padding/margin for table tabs to align with Categories tab */
    #category, #options {
        margin-left: -18px;
        margin-right: -18px;
    }
    
    #category .table-responsive, #options .table-responsive {
        margin-left: 0;
        padding-left: 0;
    }
</style>
@endsection

@section('bottom-script')
@endsection

@section('content')
<div class="container-xxl flex-grow-1 container-p-xy">
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

    <div class="row mt-3">
        <div class="col-xl-12">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <ul class="nav nav-pills data-skl-action" id="skeleton-configs" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active"
                                   id="configs-tab"
                                   data-skl-action="b"
                                   data-bs-toggle="tab"
                                   href="#category"
                                   role="tab"
                                   aria-controls="category"
                                   aria-selected="true"
                                   data-token="@skeletonToken('central_unique_categories')_a"
                                   data-text="Add Category"
                                   data-target="#category-add-btn">
                                    Categories
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link"
                                   id="options-tab"
                                   data-skl-action="b"
                                   data-bs-toggle="tab"
                                   href="#options"
                                   role="tab"
                                   aria-controls="options"
                                   aria-selected="false"
                                   data-token="@skeletonToken('central_unique_options')_a"
                                   data-text="Add Option"
                                   data-target="#category-add-btn">
                                    Option
                                </a>
                            </li>
                        </ul>

                        <div class="action-area">
                            <button class="btn btn-primary skeleton-popup" id="category-add-btn">Default</button>
                        </div>
                    </div>

                    <div class="tab-content mt-2 pt-2 border-top">
                        <div class="tab-pane fade show active" id="category" role="tabpanel" aria-labelledby="category-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_unique_categories')_t"></div>
                        </div>

                        <div class="tab-pane fade" id="options" role="tabpanel" aria-labelledby="options-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_unique_options')_t"></div>
                        </div>
                    </div>
                </div> <!-- /.card-body -->
            </div> <!-- /.card -->
        </div> <!-- /.col-xl-12 -->
    </div> <!-- /.row -->
</div> <!-- /.container-xxl -->
@endsection
