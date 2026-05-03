{{-- Template: Clients Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Clients')
@section('top-style')
@endsection
@section('bottom-script')
<script>
    document.addEventListener('DOMContentLoaded', () => {
        const fragment = window.location.hash.substring(1);
        if (fragment) {
            const baseToken = "@skeletonToken('central_sun_clients')";
            const fullTokenSet = `${baseToken}_t_${fragment}`;
            console.log('Full Token Set:', fullTokenSet);
            const container = document.getElementById('skeletonContainer');
            if (container) {
                container.setAttribute('data-skeleton-table-set', fullTokenSet);
            }
        }
    });
</script>
@endsection
@section('content')
<div class="container-xxl flex-grow-1 container-p-y">
        <div class="row gy-2">
            <div class="col-xl-12">
                <div class="container-fluid px-0 d-flex justify-content-between align-items-center">
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item">
                                <a href="javascript:void(0);">Filters</a>
                            </li>
                            <li class="breadcrumb-item">
                                <a href="javascript:void(0);">Search</a>
                            </li>
                            <li class="breadcrumb-item active fw-bold">Clients</li>
                        </ol>
                    </nav>
                </div>
            </div>
            <div class="col-xl-12">
                <div class="card">
                    <div class="card-body">
                        <div id= "skeletonContainer" data-skeleton-table-set="@skeletonToken('central_sun_clients')_t"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
