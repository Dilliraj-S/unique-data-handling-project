@extends('layouts.system-app')
@section('title', 'Skeleton-configs | Gotit HR Management Software')


@section('content')
    <div class="content">
        <!-- Breadcrumb -->
        <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
            <div class="my-auto mb-2">
                <h3 class="mb-1">Manage Leave</h3>
                <nav>
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Leave Management</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}">Manage Leave</a>
                        </li>
                    </ol>
                </nav>
            </div>
        </div>

        <!-- Tabs Header -->
        <div class="d-flex justify-content-between">
            <ul class="nav nav-tabs nav-tabs-solid bg-transparent border-bottom-0 mb-3 data-skl-action"
                id="skeleton-Companies" role="tablist">
                @foreach ($leave_requests as $index => $leave)
                    <li class="nav-item">
                        <a class="nav-link @if ($loop->first) active @endif"
                            id="leave-tab-{{ $leave->id }}" data-bs-toggle="tab" href="#leave-{{ $leave->id }}"
                            role="tab" aria-controls="leave-{{ $leave->id }}"
                            aria-selected="{{ $loop->first ? 'true' : 'false' }}">
                            {{ $leave->status }}
                        </a>
                    </li>
                @endforeach
            </ul>
        </div>

        <!-- Tabs Content -->
        <div class="tab-content" id="skeleton-CompaniesContent">
            @foreach ($leave_requests as $index => $leave)
                <div class="tab-pane fade @if ($loop->first) show active @endif"
                    id="leave-{{ $leave->id }}" role="tabpanel" aria-labelledby="leave-tab-{{ $leave->id }}">
                    <!-- Dynamic table per leave -->
                    <div data-skeleton-table-set="@skeletonToken('business_manage_leave')_f_{{ $leave->status }}"></div>
                </div>
            @endforeach
        </div>
    </div>
@endsection
