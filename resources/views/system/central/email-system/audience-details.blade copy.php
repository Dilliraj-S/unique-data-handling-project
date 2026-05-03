{{-- Template: Audience Details Page - Auto-generated --}}
@php
    // Generate timezone options
    $timezones = [];
    foreach (timezone_identifiers_list() as $tz) {
        $datetime = new DateTime('now', new DateTimeZone($tz));
        $offset = $datetime->getOffset() / 3600;
        $offsetStr = sprintf('GMT%+d:%02d', $offset, abs($offset * 60) % 60);
        $timezones[$tz] = "$offsetStr - $tz";
    }
    asort($timezones);
@endphp
@extends('layouts.system-app')
@section('title', 'Audience Details')
@section('top-style')
    <style>
        body {

            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .container {
            max-width: 1200px;
            margin: 20px auto;
            padding: 0 15px;
        }

        .card {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            margin-bottom: 20px;
        }

        .card-header {
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            padding: 10px 15px;
            font-weight: 500;
        }

        .card-body {
            padding: 15px;
        }

        .form-label {
            font-size: 14px;
            margin-bottom: 5px;
        }

        .form-control,
        select {
            height: 38px;
            font-size: 14px;
            border-radius: 5px;
        }

        .nav-tabs .nav-link {
            padding: 8px 15px;
            font-weight: 500;
            color: #495057;
            border: none;
            border-bottom: 2px solid transparent;
        }

        .nav-tabs .nav-link.active {
            background: #f8f9fa;
        }

        .tab-content {
            padding: 15px;
        }

        .sub-tabs .nav-link {
            font-size: 14px;
            padding: 6px 12px;
        }

        .dropdown {
            position: relative;
        }

        .dropdown-menu {
            display: none;
            position: absolute;
            min-width: 120px;
            z-index: 1000;
        }

        .dropdown:hover .dropdown-menu {
            display: block;
        }

        .dropdown-item i {
            margin-right: 5px;
        }

        .loading-spinner {
            display: none;
            margin-left: 10px;
        }

        .progress {
            height: 20px;
            margin-top: 10px;
        }

        .pagination {
            margin-top: 15px;
        }

        .alert {
            margin-top: 10px;
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
                                <a href="javascript:void(0);">Email-System</a>
                            </li>
                            <li class="breadcrumb-item active fw-bold">audience-details</li>
                        </ol>
                    </nav>
                </div>
            </div>

        </div>
        <div class="col-xl-12">
            <div class="action-area">
                <div class="text-end mt-5">
                    <button class="btn btn-primary skeleton-popup mb-2" id="configs-add-btn"
                        data-token="@skeletonToken('central_audience_details')_a">
                        Add&nbsp;subscribers
                    </button>
                    <div id='skeletonContainer' data-skeleton-table-set="@skeletonToken('central_audience_details')_t"></div>
                </div>
                <script>
                    const fragment = window.location.hash.substring(1);
                    document.addEventListener('DOMContentLoaded', () => {
                        if (fragment) {
                            const baseToken = "@skeletonToken('central_audience_details')";
                            const fullTokenSet = `${baseToken}_t_${fragment}`;
                            const fullTokenAdd = `${baseToken}_e_${fragment}`;
                            const container = document.getElementById('skeletonContainer');
                            if (container) {
                                container.setAttribute('data-skeleton-table-set', fullTokenSet);
                            }
                            const addBtn = document.getElementById('configs-add-btn');
                            if (addBtn) {
                                addBtn.setAttribute('data-token', fullTokenAdd);
                            }
                            const fragmentDisplay = document.getElementById('fragment-value');
                            if (fragmentDisplay) {
                                fragmentDisplay.innerText = fragment;
                            }
                        }
                    });
                </script>

            </div>
        </div>
    @endsection
