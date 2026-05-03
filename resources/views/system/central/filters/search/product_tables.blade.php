@extends('layouts.system-app')
@section('title', 'Product Tables')

@section('top-style')
<style>
    :root {
        --linkedin-blue: #0a66c2;
        --linkedin-light-blue: #70b5f9;
        --linkedin-dark-gray: #333333;
        --linkedin-gray: #666666;
        --linkedin-light-gray: #eef3f8;
        --linkedin-border: #d0d8e0;
        --linkedin-background: #f3f2ef;
    }
    
    body {
        background-color: var(--linkedin-background);
    }
    
    .container-xxl {
        max-width: 1200px;
    }

    .company-header {
        background: white;
        border-radius: 12px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.1);
        margin-bottom: 24px;
        overflow: hidden;
        position: relative;
    }

    .company-banner {
        height: 220px;
        background: url('https://plus.unsplash.com/premium_photo-1701590725747-ac131d4dcffd?w=1200&auto=format&fit=crop&q=60') center/cover no-repeat;
        position: relative;
    }

    .company-logo-container {
        position: absolute;
        top: 150px;
        left: 30px;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 4px solid #fff;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .company-logo {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }

    .company-content {
        margin-top: 70px;
        padding: 20px;
    }
    
    .company-name { 
        font-size: 34px; 
        font-weight: 600; 
        color: var(--linkedin-dark-gray); 
        margin-bottom: 6px; 
        line-height: 1.2;
    }
    
    .company-tagline { 
        font-size: 20px; 
        color: var(--linkedin-gray); 
        margin-bottom: 20px; 
        line-height: 1.4;
    }

    .company-stats { 
        display: flex; 
        gap: 48px; 
        margin-bottom: 24px; 
        flex-wrap: wrap;
    }
    
    .stat-item { 
        display: flex; 
        align-items: center; 
        gap: 12px; 
        min-width: 160px; 
    }
    
    .stat-icon { 
        font-size: 24px; 
        color: var(--linkedin-blue); 
        flex-shrink: 0; 
        background: var(--linkedin-light-gray);
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .stat-text { 
        display: flex; 
        flex-direction: column; 
        line-height: 1.3; 
    }
    
    .stat-value { 
        font-weight: 700; 
        color: var(--linkedin-dark-gray); 
        font-size: 20px; 
        cursor: pointer;
        transition: color 0.2s ease;
    }
    
    .stat-value:hover {
        color: var(--linkedin-blue);
    }
    
    .stat-label { 
        color: var(--linkedin-gray); 
        font-size: 15px; 
    }

    .company-actions { 
        display: flex; 
        gap: 12px; 
        margin-bottom: 28px; 
        flex-wrap: wrap;
    }
    
    .btn-linkedin { 
        background-color: var(--linkedin-blue); 
        color: white; 
        border-radius: 24px; 
        padding: 10px 24px; 
        font-weight: 600; 
        border: none;
        transition: all 0.2s ease;
    }
    
    .btn-linkedin:hover {
        background-color: #004182;
        transform: translateY(-1px);
    }
    
    .btn-outline-linkedin { 
        color: var(--linkedin-blue); 
        border: 2px solid var(--linkedin-blue); 
        border-radius: 24px; 
        padding: 8px 22px; 
        font-weight: 600; 
        transition: all 0.2s ease;
        background: transparent;
    }
    
    .btn-outline-linkedin:hover { 
        background-color: #e2f0fe; 
        color: var(--linkedin-blue);
        transform: translateY(-1px);
    }

    .company-details { 
        border-top: 1px solid var(--linkedin-border); 
        padding-top: 24px; 
        margin-top: 16px;
    }
    
    .detail-row {
        display: flex;
        margin-bottom: 16px;
        align-items: flex-start;
    }
    
    .detail-label {
        flex: 0 0 160px;
        font-weight: 600;
        color: var(--linkedin-dark-gray);
        font-size: 16px;
    }
    
    .detail-value {
        flex: 1;
        color: var(--linkedin-gray);
        font-size: 16px;
        line-height: 1.5;
    }
    
    .about-section { 
        margin-top: 32px; 
    }
    
    .section-title { 
        font-size: 22px; 
        font-weight: 600; 
        color: var(--linkedin-dark-gray); 
        margin-bottom: 16px; 
        padding-bottom: 8px;
        border-bottom: 1px solid var(--linkedin-border);
    }

    .tables-container {
        background: white;
        border-radius: 12px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.1);
        padding: 24px;
        margin-top: 32px;
    }

    .breadcrumb {
        background: transparent;
        padding: 0;
        margin-bottom: 24px;
    }
    
    .breadcrumb-item a {
        color: var(--linkedin-blue);
        text-decoration: none;
    }
    
    .breadcrumb-item.active {
        color: var(--linkedin-dark-gray);
        font-weight: 600;
    }
    
    .card-header {
        background: white;
        border-bottom: 1px solid var(--linkedin-border);
    }
    
    .description-container {
        position: relative;
    }
    
    .description-text {
        margin: 0;
        line-height: 1.6;
    }
    
    .read-more-btn {
        color: var(--linkedin-blue);
        text-decoration: none;
        font-weight: 500;
        cursor: pointer;
        transition: color 0.2s ease;
    }
    
    .read-more-btn:hover {
        color: #004182;
        text-decoration: underline;
    }
    
    .description-toggle {
        margin-left: 4px;
    }
    
    @media (max-width: 992px) {
        .company-stats {
            gap: 24px;
        }
        
        .stat-item {
            min-width: 140px;
        }
    }
    
    @media (max-width: 768px) {
        .company-content {
            padding: 80px 20px 24px 20px;
        }
        
        .company-name {
            font-size: 28px;
        }
        
        .company-tagline {
            font-size: 18px;
        }
        
        .company-stats {
            gap: 16px;
        }
        
        .stat-item {
            min-width: calc(50% - 16px);
        }
        
        .company-actions {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .detail-row {
            flex-direction: column;
            margin-bottom: 20px;
        }
        
        .detail-label {
            flex: none;
            margin-bottom: 6px;
        }
        
        .company-logo-container {
            left: 24px;
            width: 100px;
            height: 100px;
            top: 120px;
        }
        
        .company-logo {
            max-width: 90px;
            max-height: 90px;
        }
    }
    
    @media (max-width: 576px) {
        .company-banner {
            height: 160px;
        }
        
        .stat-item {
            min-width: 100%;
        }
        
        .company-logo-container {
            left: 16px;
            width: 90px;
            height: 90px;
            top: 110px;
        }
        
        .company-logo {
            max-width: 80px;
            max-height: 80px;
        }
    }
</style>
@endsection

@section('content')
<div class="container-fluid flex-grow-1 container-p-y px-3">
    <div class="row gy-2">
        <div class="col-xl-12">
            <div class="container-fluid px-0 d-flex justify-content-between align-items-center">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item active fw-bold">
                            <a href="javascript:void(0);">Filters</a>
                        </li>
                        <li class="breadcrumb-item active fw-bold">
                            <a href="javascript:void(0);">Search</a>
                        </li>
                        <li class="breadcrumb-item active fw-bold" id="breadcrumb-product-name">
                            Product Tables / {{ $data['company_name'] ?? 'Unknown Company' }}
                        </li>
                    </ol>
                </nav>
            </div>
        </div>
        <div class="col-xl-12">
            @php 
                $companies = collect($data['company'] ?? []); 
                $product = $data['product'] ?? null; 
                $companyId = $data['company_id'] ?? null; 
                $liSmtp = $data['li_smtp'] ?? null; 
                
                // Define table tokens based on product or company
                $contactsTableToken = $product 
                    ? "central_product_contacts_t_" . $product->product_id 
                    : "central_sun_clients_t_" . $companyId;
                $companiesTableToken = $product 
                    ? "central_product_companies_t_" . $product->product_id 
                    : "central_sun_master_accounts_t_" . $companyId;
            @endphp

            @if($companies->isNotEmpty())
                @foreach($companies as $company)
                <div class="company-header mb-4">
                    <div class="company-banner">  
                    </div>

                    <div class="company-logo-container">
                        <img id="company-logo" 
                            src="{{ $company->li_logo ?? 'https://via.placeholder.com/120' }}" 
                            class="company-logo" 
                            alt="{{ $company->li_company_name ?? 'Company Logo' }}">
                    </div>

                    <div class="company-content">
                        <h1 id="company-name" class="company-name">{{ $product->product_name ?? ($company->li_company_name ?? 'Product Name') }}</h1>
                        <p id="company-tagline" class="company-tagline">{{ $company->li_tag_line ?? 'No description available' }}</p>

                        <div class="company-stats">
                            <div class="stat-item">
                                <span class="stat-icon"><i class="bx bx-user"></i></span>
                                <div class="stat-text">
                                    <div id="lead-count" class="stat-value">{{ number_format($company->lead_count ?? 0) }}</div>
                                    <div class="stat-label">{{ isset($data['is_product_view']) && $data['is_product_view'] ? 'Contacts' : 'Leads' }}</div>
                                </div>
                            </div>
                            <div class="stat-item">
                                <span class="stat-icon"><i class="bx bx-cog"></i></span>
                                <div class="stat-text">
                                    <div id="related-products-count" class="stat-value">{{ number_format($company->related_products_count ?? 0) }}</div>
                                    <div class="stat-label">Technologies</div>
                                </div>
                            </div>
                        </div>

                        <div class="company-actions">
                            <button id="toggleTablesBtn" class="btn btn-linkedin">
                                <i class="bx bx-table me-1"></i> Show Tables
                            </button>

                            @if($companyId || ($product && $product->product_id))
                                <a href="{{ url('/filters/search/related_products?pp_id=' . urlencode($company->id ?? $product->product_id)) }}" class="btn btn-outline-linkedin">
                                    <i class="bx bx-table me-1"></i> Related Products
                                </a>
                            @endif
                        </div>

                        <div class="company-details">
                            <div class="detail-row">
                                <div class="detail-label">Industry</div>
                                <div class="detail-value" id="industry">{{ $company->li_company_industry ?? 'Not specified' }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Headquarters</div>
                                <div class="detail-value" id="headquarters">{{ $company->li_company_headquarters ?? 'Not specified' }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Employee Size</div>
                                <div class="detail-value" id="employee-size">{{ $company->employees_on_linked_in ?? 'Not specified' }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Website</div>
                                <div class="detail-value">
                                    <a id="website" href="{{ $company->li_website ?? '#' }}" target="_blank">
                                        {{ $company->li_website ? preg_replace('#^https?://#', '', $company->li_website) : 'Not specified' }}
                                    </a>
                                </div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Specialties</div>
                                <div class="detail-value" id="specialties">{{ $company->li_company_specialties ?? 'Not specified' }}</div>
                            </div>
                        </div>

                        @if(!empty($company->li_company_description))
                            <div id="about-section" class="about-section">
                                <h3 class="section-title">About</h3>
                                <div class="description-container">
                                    <p id="company-description" class="description-text">
                                        <span class="description-preview">{{ Str::limit($company->li_company_description, 200, '') }}</span>
                                        <span class="description-full" style="display: none;">{{ $company->li_company_description }}</span>
                                        @if(strlen($company->li_company_description) > 200)
                                            <span class="description-toggle">
                                                <a href="javascript:void(0);" class="read-more-btn" onclick="toggleDescription()">... Read more</a>
                                            </span>
                                        @endif
                                    </p>
                                </div>
                            </div>
                        @endif
                    </div>
                </div>
                @endforeach
            @else
                <div class="card mb-4">
                    <div class="card-body text-center py-5">
                        <i class="bx bx-building-house bx-lg text-warning mb-3"></i>
                        <p class="text-warning mb-0">No associated company found for this product or company ID.</p>
                    </div>
                </div>
            @endif

            <!-- Tables -->
            <div class="card" id="tablesContainer">
                <div class="card-header p-3 border-bottom-0">
                    <ul class="nav nav-pills" role="tablist">
                        <li class="nav-item"><button type="button" class="nav-link active" data-bs-toggle="tab" data-bs-target="#companies"><i class="bx bx-building me-1"></i> Companies</button></li>
                        <li class="nav-item"><button type="button" class="nav-link" data-bs-toggle="tab" data-bs-target="#contacts"><i class="bx bx-user me-1"></i> Contacts</button></li>
                    </ul>
                </div>
                <div class="card-body">
                    <div class="tab-content p-0">
                        <div class="tab-pane fade show active" id="companies">
                            @if(request('product_id'))
                                <div data-skeleton-table-set="@skeletonToken('central_product_companies')_t_{{ request('product_id') }}"></div>
                            @elseif(request('li_company_id'))
                                <div data-skeleton-table-set="@skeletonToken('central_sun_master_accounts')_t_{{ request('li_company_id') }}"></div>
                            @endif
                        </div>
                        <div class="tab-pane fade" id="contacts">
                            @if(request('product_id'))
                                <div data-skeleton-table-set="@skeletonToken('central_product_contacts')_t_{{ request('product_id') }}"></div>
                            @elseif(request('li_company_id'))
                                <div data-skeleton-table-set="@skeletonToken('central_sun_clients')_t_{{ request('li_company_id') }}"></div>
                            @endif
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@section('bottom-script')
<script>
    // Toggle description read more/less functionality
    function toggleDescription() {
        const preview = document.querySelector('.description-preview');
        const full = document.querySelector('.description-full');
        const toggle = document.querySelector('.read-more-btn');
        
        if (full.style.display === 'none') {
            // Show full description
            preview.style.display = 'none';
            full.style.display = 'inline';
            toggle.textContent = ' Read less';
        } else {
            // Show preview
            preview.style.display = 'inline';
            full.style.display = 'none';
            toggle.textContent = '... Read more';
        }
    }

    // Handle leads count click to redirect to contacts tab
    document.addEventListener('DOMContentLoaded', function() {
        const leadCountElement = document.getElementById('lead-count');
        if (leadCountElement) {
            leadCountElement.addEventListener('click', function() {
                // Switch to contacts tab
                const contactsTab = document.querySelector('[data-bs-target="#contacts"]');
                const contactsPane = document.getElementById('contacts');
                const companiesTab = document.querySelector('[data-bs-target="#companies"]');
                const companiesPane = document.getElementById('companies');
                
                if (contactsTab && contactsPane && companiesTab && companiesPane) {
                    // Remove active from companies tab
                    companiesTab.classList.remove('active');
                    companiesPane.classList.remove('show', 'active');
                    
                    // Add active to contacts tab
                    contactsTab.classList.add('active');
                    contactsPane.classList.add('show', 'active');
                    
                    // Scroll to the tables container
                    document.getElementById('tablesContainer').scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }

        // Handle technologies count click to redirect to related products
        const relatedProductsCountElement = document.getElementById('related-products-count');
        if (relatedProductsCountElement) {
            relatedProductsCountElement.addEventListener('click', function() {
                @if($companyId || ($product && $product->product_id))
                    const relatedProductsUrl = "{{ url('/filters/search/related_products?pp_id=' . urlencode($company->id ?? $product->product_id)) }}";
                    window.location.href = relatedProductsUrl;
                @endif
            });
        }

        // Handle show/hide tables button
        const toggleTablesBtn = document.getElementById('toggleTablesBtn');
        const tablesContainer = document.getElementById('tablesContainer');
        
        if (toggleTablesBtn && tablesContainer) {
            // Initially show tables and set button to "Hide Tables"
            tablesContainer.style.display = 'block';
            toggleTablesBtn.innerHTML = '<i class="bx bx-table me-1"></i> Hide Tables';
            
            toggleTablesBtn.addEventListener('click', function() {
                if (tablesContainer.style.display === 'none') {
                    tablesContainer.style.display = 'block';
                    toggleTablesBtn.innerHTML = '<i class="bx bx-table me-1"></i> Hide Tables';
                    // Scroll to tables
                    tablesContainer.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                } else {
                    tablesContainer.style.display = 'none';
                    toggleTablesBtn.innerHTML = '<i class="bx bx-table me-1"></i> Show Tables';
                }
            });
        }
    });
</script>
@endsection
