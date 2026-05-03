{{-- Template: Global Unsubscribe Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Global Unsubscribe')
@section('top-style')
@endsection
@section('bottom-script')
<script>
    document.addEventListener('DOMContentLoaded', () => {
        const fragment = window.location.hash.substring(1);
        if (fragment) {
            const baseToken1 = "@skeletonToken('central_product_contacts')";
            const baseToken2 = "@skeletonToken('central_product_companies')";
            const fullTokenSet1 = `${baseToken1}_t_${fragment}`;
            const fullTokenSet2 = `${baseToken2}_t_${fragment}`;
            console.log('Full Token Set:', fullTokenSet1);
            console.log('Full Token Set:', fullTokenSet2);
            const container1 = document.getElementById('set1');
            const container2 = document.getElementById('set2');
                container1.setAttribute('data-skeleton-table-set', fullTokenSet1);
                container2.setAttribute('data-skeleton-table-set', fullTokenSet2);

            
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
                        <li class="breadcrumb-item active fw-bold">Global Unsubscribe</li>
                    </ol>
                </nav>
            </div>
        </div>
        <div class="col-xl-12">
            <div class="card">
                <div class="card-body">
                    <div data-skeleton-table-set="@skeletonToken('central_pluto_product_unsubscribe')_t"></div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
