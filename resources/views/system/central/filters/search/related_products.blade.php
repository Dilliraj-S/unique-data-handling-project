@extends('layouts.system-app')
@section('title', 'Related Products')

@section('top-style')
<style>
    .related-products-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.1);
        padding: 16px;
        margin-top: 24px;
    }
    .products-table {
        width: 100%;
        border-collapse: collapse;
    }
    .products-table th, .products-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
    }
    .products-table th {
        background-color: #f5f5f5;
        font-weight: 600;
    }
</style>
@endsection

@section('bottom-script')
<script>
document.addEventListener('DOMContentLoaded', function() {
    const hash = window.location.hash;
    if (hash) {
        const tabTrigger = document.querySelector(`.nav-link[data-bs-target="${hash}"]`);
        if (tabTrigger) {
            const tab = new bootstrap.Tab(tabTrigger);
            tab.show();
        }
    }

    // Fetch related products count to display in header
    const ppId = "{{ $data['pp_id'] ?? '' }}";
    if (ppId) {
        const productToken = "@skeletonToken('central_unique_products')";
        const productTokenSet = `${productToken}_t_${ppId}`;
        fetch(productTokenSet)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log('Related Products Data:', data);
                if (data.recordsTotal) {
                    document.getElementById('related-products-count').textContent = data.recordsTotal;
                }
            })
            .catch(err => console.error('Error fetching related products:', err));
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
                        <li class="breadcrumb-item active fw-bold">Related Products ({{ $data['company_name'] ?? 'Unknown Company' }})</li>
                    </ol>
                </nav>
            </div>
        </div>
        <div class="col-xl-12">
            <div class="related-products-container">
                {{-- <h3>Related Products (<span id="related-products-count">{{ $data['related_products_count'] ?? 0 }}</span>)</h3> --}}
                <div data-skeleton-table-set="@skeletonToken('central_unique_products')_t_{{ $data['pp_id'] ?? '' }}"></div>
            </div>
        </div>
    </div>
</div>
@endsection