{{-- Template: Product_Tables Page - LinkedIn Style --}}
@extends('layouts.system-app')
@section('title', 'Product Tables')
@section('top-style')
<style>
    /* LinkedIn-inspired styles */
    .company-header {
        background: white;
        border-radius: 8px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 16px;
        overflow: hidden;
    }
    
    .company-banner {
        height: 200px;
        background: linear-gradient(135deg, #0077b5 0%, #00a0dc 100%);
        position: relative;
    }
    
    .company-logo-container {
        position: absolute;
        bottom: -60px;
        left: 24px;
        width: 140px;
        height: 140px;
        border-radius: 50%;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 4px white;
        border: 1px solid #e0e0e0;
    }
    
    .company-logo {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        object-fit: contain;
    }
    
    .company-content {
        padding: 80px 24px 24px 24px;
    }
    
    .company-name {
        font-size: 32px;
        font-weight: 600;
        color: #000000e6;
        margin-bottom: 4px;
    }
    
    .company-tagline {
        font-size: 18px;
        color: #00000099;
        margin-bottom: 16px;
    }
    
    .company-stats {
    display: flex;
    gap: 40px; /* equal spacing between items */
    margin-bottom: 16px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 140px; /* ensures both items align evenly */
}

.stat-icon {
    font-size: 22px;
    color: #666666;
    flex-shrink: 0;
}

.stat-text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}

.stat-value {
    font-weight: 600;
    color: #000000e6;
    font-size: 18px;
}

.stat-label {
    color: #00000099;
    font-size: 14px;
}

    
    .company-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
    }
    
    .btn-linkedin {
        background-color: #00a0dc;
        color: white;
        border-radius: 16px;
        padding: 6px 16px;
        font-weight: 600;
    }
    
    .btn-outline-linkedin {
        color: #00a0dc;
        border: 1px solid #00a0dc;
        border-radius: 16px;
        padding: 6px 16px;
        font-weight: 600;
    }
    
    .company-details {
        border-top: 1px solid #e0e0e0;
        padding-top: 16px;
    }
    
    .detail-row {
        margin-bottom: 12px;
    }
    
    .detail-label {
        font-weight: 600;
        color: #00000099;
        display: inline-block;
        width: 120px;
    }
    
    .detail-value {
        color: #000000e6;
    }
    
    .about-section {
        margin-top: 24px;
    }
    
    .section-title {
        font-size: 20px;
        font-weight: 600;
        color: #000000e6;
        margin-bottom: 12px;
    }
    
    .tables-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.1);
        padding: 16px;
        margin-top: 24px;
    }
    
    .nav-pills .nav-link.active {
        background-color: #00a0dc;
    }
    
    .nav-pills .nav-link {
        color: #00a0dc;
    }

    .btn-outline-linkedin {
    color: #00a0dc;
    border: 1px solid #00a0dc;
    border-radius: 16px;
    padding: 6px 16px;
    font-weight: 600;
    transition: 0.2s;
}

.btn-outline-linkedin:hover {
    background-color: #00a0dc;
    color: #fff;
}

</style>
@endsection

@section('bottom-script')
<script>
    document.addEventListener('DOMContentLoaded', () => {
        const fragment = window.location.hash.substring(1);
        if (fragment) {
            // Load product details
            const productToken = "@skeletonToken('central_unique_products')";
            const fullTokenSet3 = `${productToken}_cu_${fragment}`;
            
            fetch(fullTokenSet3)
                .then(res => {
                    if (!res.ok) throw new Error('Network response was not ok');
                    return res.json();
                })
                .then(data => {
                    if (data.rows && data.rows.length > 0) {
                        const product = data.rows[0];
                        document.getElementById('breadcrumb-product-name').textContent = 
                            'Product Tables / ' + product.product_name;
                    }
                })
                .catch(err => console.error('Error fetching product:', err));

            // Load company overview data
            const companyToken = "@skeletonToken('master_accounts')";
            const companyTokenSet = `${companyToken}_t_${fragment}`;
            
            fetch(companyTokenSet)
                .then(res => {
                    if (!res.ok) throw new Error('Network response was not ok');
                    return res.json();
                })
                .then(data => {
                    if (data.rows && data.rows.length > 0) {
                        const company = data.rows[0];
                        updateCompanyOverview(company);
                    }
                })
                .catch(err => console.error('Error fetching company data:', err));

            // Initialize table tokens
            const baseToken1 = "@skeletonToken('central_product_contacts')";
            const baseToken2 = "@skeletonToken('central_product_companies')";
            const fullTokenSet1 = `${baseToken1}_t_${fragment}`;
            const fullTokenSet2 = `${baseToken2}_t_${fragment}`;
            
            const container1 = document.getElementById('set1');
            const container2 = document.getElementById('set2');
            container1.setAttribute('data-skeleton-table-set', fullTokenSet1);
            container2.setAttribute('data-skeleton-table-set', fullTokenSet2);
        }

        // Toggle tables visibility
        document.getElementById('toggleTablesBtn').addEventListener('click', function() {
            const tablesContainer = document.getElementById('tablesContainer');
            tablesContainer.classList.toggle('d-none');
            this.innerHTML = tablesContainer.classList.contains('d-none') 
                ? '<i class="bx bx-table me-1"></i> Show Tables' 
                : '<i class="bx bx-hide me-1"></i> Hide Tables';
        });

        function updateCompanyOverview(company) {
            // Update header
            if (company.li_company_name) {
                document.getElementById('company-name').textContent = company.li_company_name;
            }
            
            if (company.li_tag_line) {
                document.getElementById('company-tagline').textContent = company.li_tag_line;
            } else {
                document.getElementById('company-tagline').style.display = 'none';
            }
            
            // Update logo
            if (company.li_logo) {
                document.getElementById('company-logo').src = company.li_logo;
            } else {
                document.getElementById('company-logo').src = 'https://via.placeholder.com/120';
            }
            
            // Update stats
            if (company.li_follower_count) {
                document.getElementById('follower-count').textContent = 
                    parseInt(company.li_follower_count).toLocaleString();
            }
            
            if (company.employees_on_linked_in) {
                document.getElementById('employee-count').textContent = 
                    parseInt(company.employees_on_linked_in).toLocaleString();
            }
            
            // Update details
            const setDetail = (id, value, fallback = 'Not specified') => {
                const element = document.getElementById(id);
                if (value) {
                    element.textContent = value;
                    element.closest('.detail-row').style.display = 'flex';
                } else {
                    element.textContent = fallback;
                }
            };
            
            setDetail('industry', company.li_company_industry);
            setDetail('headquarters', company.li_company_headquarters);
            setDetail('founded', company.li_company_founded);
            setDetail('company-type', company.li_type);
            setDetail('specialties', company.li_company_specialties);
            
            if (company.li_website) {
                document.getElementById('website').href = company.li_website;
                document.getElementById('website').textContent = 
                    company.li_website.replace(/^https?:\/\//, '');
                document.getElementById('website').closest('.detail-row').style.display = 'flex';
            }
            
            if (company.li_company_description) {
                document.getElementById('company-description').textContent = company.li_company_description;
                document.getElementById('about-section').style.display = 'block';
            } else {
                document.getElementById('about-section').style.display = 'none';
            }
        }
         const relatedProductsBtn = document.getElementById('relatedProductsBtn');
        if (relatedProductsBtn) {
            relatedProductsBtn.addEventListener('click', function () {
                const productName = this.dataset.productName;
                if (productName) {
                    // Redirect to filtered products page
                    const url = `/filters/search/products?pp_name=${encodeURIComponent(productName)}`;
                    window.location.href = url;
                } else {
                    alert('Product name not found.');
                }
            });
        }
    });
</script>
@endsection
@section('content')
<div class="container-xxl flex-grow-1 container-p-y">

    <!-- Breadcrumb -->
    <div class="row mb-3">
        <div class="col-12">
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item"><a href="#">Filters</a></li>
                    <li class="breadcrumb-item"><a href="#">Search</a></li>
                    <li class="breadcrumb-item active fw-bold">Product Tables</li>
                </ol>
            </nav>
        </div>
    </div>

    @php
        $companies = collect($data['company'] ?? []);
    @endphp

    @if($companies->isNotEmpty())
        @foreach($companies as $company)
            <!-- LinkedIn-style Company Header -->
<div class="company-header mb-4">
    <div class="company-banner"></div>
                <div class="company-logo-container">
                    <img id="company-logo" 
                        src="{{ $company->li_logo ?? 'https://via.placeholder.com/120' }}" 
                        class="company-logo" 
                        alt="Company Logo">
                </div>
    
            <div class="company-content">
                <h1 id="company-name" class="company-name">{{ $company->li_company_name ?? 'Company Name' }}</h1>
                <p id="company-tagline" class="company-tagline">
                    {{ $company->li_tag_line ?? 'No tagline available' }}
                </p>

                <div class="company-stats">
                    <div class="stat-item">
                        <span class="stat-icon"><i class="bx bx-group"></i></span>
                        <div class="stat-text">
                            <div id="employee-count" class="stat-value">{{ number_format($company->employees_on_linked_in ?? 0) }}</div>
                            <div class="stat-label">employees</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon"><i class="bx bx-user-plus"></i></span>
                        <div class="stat-text">
                            <div id="follower-count" class="stat-value">{{ number_format($company->li_follower_count ?? 0) }}</div>
                            <div class="stat-label">followers</div>
                        </div>
                    </div>
                </div>



                    <div class="company-actions">
                        @if(!empty($company->li_website))
                            <a href="{{ $company->li_website }}" target="_blank" class="btn btn-linkedin">
                                <i class="bx bx-link-external me-1"></i> Visit Website
                            </a>
                        @endif
                        <button id="toggleTablesBtn" class="btn btn-outline-linkedin">
                            <i class="bx bx-table me-1"></i> Show Tables
                        </button>
                    </div>

                    <div class="company-details row g-3 mt-3">
                    <!-- Left Column -->
                    <div class="col-md-6">
                        <div class="d-flex">
                            <div class="flex-shrink-0 fw-bold" style="width: 120px;">Industry</div>
                            <div class="flex-grow-1">{{ $company->li_company_industry ?? 'Not specified' }}</div>
                        </div>
                        <div class="d-flex">
                            <div class="flex-shrink-0 fw-bold" style="width: 120px;">Headquarters</div>
                            <div class="flex-grow-1">{{ $company->li_company_headquarters ?? 'Not specified' }}</div>
                        </div>
                        <div class="d-flex">
                            <div class="flex-shrink-0 fw-bold" style="width: 120px;">Founded</div>
                            <div class="flex-grow-1">{{ $company->li_company_founded ?? 'Not specified' }}</div>
                        </div>
                    </div>

                    <!-- Right Column -->
                    <div class="col-md-6">
                        <div class="d-flex">
                            <div class="flex-shrink-0 fw-bold" style="width: 120px;">Company type</div>
                            <div class="flex-grow-1">{{ $company->li_type ?? 'Not specified' }}</div>
                        </div>
                        <div class="d-flex">
                            <div class="flex-shrink-0 fw-bold" style="width: 120px;">Website</div>
                            <div class="flex-grow-1">
                                <a href="{{ $company->li_website ?? '#' }}" target="_blank">
                                    {{ $company->li_website ?? 'Not specified' }}
                                </a>
                            </div>
                        </div>
                        <div class="d-flex">
                            <div class="flex-shrink-0 fw-bold" style="width: 120px;">Specialties</div>
                            <div class="flex-grow-1">{{ $company->li_company_specialties ?? 'Not specified' }}</div>
                        </div>
                    </div>
                </div>
                    @if(!empty($company->li_company_description))
                        <div class="about-section">
                            <h3 class="section-title">About</h3>
                            <p>{{ $company->li_company_description }}</p>
                        </div>
                    @endif
                    
                    <div class="d-flex justify-content-end mt-3">
                    <a href="{{ url('/filters/search/related_products?pp_id=' . urlencode($company->id)) }}" 
                        class="btn btn-linkedin">
                            <i class="bx bx-table me-1"></i> Related Products
                    </a>

                    </div>
            </div>
</div>
        @endforeach
    @else
        <p>No companies found.</p>
    @endif
    


    <!-- Tables Container (hidden by default) -->
        <div class="card" id="tablesContainer" class="tables-container d-none">
            <div class="card-header p-3 border-bottom-0">
                <ul class="nav nav-pills" role="tablist">
                    <li class="nav-item">
                        <button type="button" class="nav-link active" data-bs-toggle="tab" data-bs-target="#companies">
                            <i class="bx bx-building me-1"></i> Companies
                        </button>
                    </li>
                    <li class="nav-item">
                        <button type="button" class="nav-link" data-bs-toggle="tab" data-bs-target="#contacts">
                            <i class="bx bx-user me-1"></i> Contacts
                        </button>
                    </li>
                </ul>
            </div>

            <div class="card-body">
                <div class="tab-content p-0">
                    <div class="tab-pane fade show active" id="companies">
                        <div id="set2" data-skeleton-table-set="@skeletonToken('central_product_companies')_t"></div>
                    </div>
                    <div class="tab-pane fade" id="contacts">
                        <div id="set1" data-skeleton-table-set="@skeletonToken('central_product_contacts')_t"></div>
                    </div>
                </div>
            </div>
        </div>
</div>

@endsection