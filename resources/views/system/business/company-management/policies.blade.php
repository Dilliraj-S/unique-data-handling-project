@extends('layouts.system-app')
@section('title', 'Policies | Gotit HR Management Software')

@section('content')
    <div class="content">
        <!-- Breadcrumb -->
        <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
            <div class="my-auto mb-2">
                <h3 class="mb-1">Policies</h3>
                <nav>
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Company Management</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Policies</a>
                        </li>
                    </ol>
                </nav>
            </div>
            <div class="d-flex my-xl-auto right-content align-items-center flex-wrap">
                <div class="mb-2">
                    <div class="live-time-container head-icons">
                        <span class="live-time-icon me-2">
                            <i class="fa-thin fa-clock"></i>
                        </span>
                        <div class="live-time"></div>
                    </div>
                </div>
                <div class="ms-2 head-icons">
                    <a href="javascript:void(0);" data-bs-toggle="tooltip" data-bs-placement="top"
                        data-bs-original-title="Collapse" id="collapse-header">
                        <i class="ti ti-chevrons-up"></i>
                    </a>
                </div>
            </div>
        </div>

        <div class="d-flex justify-content-between">
            <div class="action-area ms-auto">
                <button class="btn btn-primary skeleton-popup mb-3" id="configs-add-btn" data-token="@skeletonToken('business_policies')_a"
                    data-text="Add policy" data-target="#configs-add-btn">
                    Add policy
                </button>
            </div>
        </div>

        <div class="tab-content" id="skeleton-Companies-Content">
            <div class="tab-pane fade show active" id="policies-pane" role="tabpanel" aria-labelledby="policies-tab">
                <div class="row">
                          <div class="row">
                    @forelse ($policies as $policy)
                        <div class="col-md-6 col-lg-4 mb-3">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h5 class="card-title">{{ $policy->title }}</h5>
                                    <p class="card-text">{{ $policy->description }}</p>
                                </div>
                            </div>
                        </div>
                    @empty
                        <p class="text-muted">No policies available.</p>
                    @endforelse
                </div>
                </div>

            </div>
        </div>
    </div>
@endsection
