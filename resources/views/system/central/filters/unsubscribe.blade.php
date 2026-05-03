{{-- Template: Unsubscribe Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Unsubscribe')
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
                        <li class="breadcrumb-item active fw-bold">Unsubscribe</li>
                    </ol>
                </nav>
            </div>
        </div>
        <div class="col-xl-12">
            <div class="card">
                <div class="card-header p-3 border-bottom-0 d-flex justify-content-between">
                    <div class="nav-align-top">
                        <ul class="nav nav-pills adt-set" role="tablist" data-adt-tab-id="categories">
                            <li class="nav-item" role="presentation">
                                <button type="button" class="nav-link adt-tab waves-effect adt-refresh-tab active"
                                    role="tab" data-bs-toggle="tab" data-bs-target="#contacts"
                                    aria-controls="contacts" aria-selected="true">
                                    Contacts
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button type="button" class="nav-link adt-tab waves-effect adt-refresh-tab"
                                    role="tab" data-bs-toggle="tab" data-bs-target="#companies"
                                    aria-controls="companies" aria-selected="false">
                                    Companies
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="card-body">
                    <div class="tab-content p-0">
                        <div class="tab-pane fade active show" id="contacts" role="tabpanel">
                            <div id="set1" data-skeleton-table-set="@skeletonToken('central_product_contacts')_t"></div>
                        </div>
                        <div class="tab-pane fade" id="companies" role="tabpanel">
                            <div id="set2" data-skeleton-table-set="@skeletonToken('central_product_companies')_t"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
