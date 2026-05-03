    @extends('layouts.system-app')
    @section('title', 'Skeleton-configs | Gotit HR Management Software')

  

    @section('content')
        <div class="content">
            <!-- Breadcrumb -->
            <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
                <div class="my-auto mb-2">
                    <h3 class="mb-1">Branches</h3>
                    <nav>
                        <ol class="breadcrumb mb-0">
                            <li class="breadcrumb-item">
                                <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                            </li>
                            <li class="breadcrumb-item"><a href="{{ url('/dashboard') }}">Company info</a></li>
                            <li class="breadcrumb-item"><a href="{{ url('/dashboard') }}">Branches</a></li>
                        </ol>
                    </nav>
                </div>
                <div class="d-flex my-xl-auto right-content align-items-center flex-wrap">
                    <div class="mb-2">
                        <div class="live-time-container head-icons">
                            <span class="live-time-icon me-2"><i class="fa-thin fa-clock"></i></span>
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
            <!-- /Breadcrumb -->

            <!-- Content Wrap -->
            <div class="col-xl-12">
                <div class="card">
                    <div class="card-body">
                        <!-- Tabs Header -->
                        <div class="d-flex justify-content-between">
                            <ul class="nav nav-tabs nav-tabs-solid bg-transparent border-bottom-0 mb-3 data-skl-action"
                                id="skeleton-Companies" role="tablist">
                                @foreach($companies as $index => $company)
                                    <li class="nav-item">
                                        <a class="nav-link @if($loop->first) active @endif"
                                        id="company-tab-{{ $company->id }}"
                                        data-bs-toggle="tab"
                                        href="#company-{{ $company->id }}"
                                        role="tab"
                                        aria-controls="company-{{ $company->id }}"
                                        aria-selected="{{ $loop->first ? 'true' : 'false' }}">
                                        {{ $company->name }}
                                        </a>
                                    </li>
                                @endforeach
                            </ul>

                        </div>
                        <!-- Tabs Content -->
                        <div class="tab-content" id="skeleton-CompaniesContent">
                            @foreach($companies as $index => $company)
                                <div class="tab-pane fade @if($loop->first) show active @endif"
                                    id="company-{{ $company->id }}"
                                    role="tabpanel"
                                    aria-labelledby="company-tab-{{ $company->id }}">
                                    <!-- Optional: Add Branch button specific to this company -->
                                    <div class="text-end mt-3">
                                        <button class="btn btn-primary skeleton-popup"
                                                data-token="@skeletonToken('business_branches')_a_{{$company->company_id}}"
                                                data-text="Add branches"
                                                data-target="#configs-add-btn">
                                            Add Branches
                                        </button>
                                    </div>
                                    <!-- Dynamic table per company -->
                                    <div data-skeleton-table-set="@skeletonToken('business_branches')_f_{{$company->company_id}}"></div>
                                </div>
                            @endforeach
                        </div>

                    </div>
                </div>
            </div>
            <!-- /Content Wrap -->
        </div>
    @endsection
