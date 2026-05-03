{{-- Template: Dashboard Page - Professional UI --}}
@extends('layouts.system-app')
@section('title', 'Dashboard')
@section('top-style')
<style>
    :root {
        --primary-color: #4361ee;
        --primary-light: #e6f0ff;
        --secondary-color: #64748b;
        --success-color: #10b981;
        --info-color: #3b82f6;
        --warning-color: #f59e0b;
        --danger-color: #ef4444;
        --light-bg: #f8fafc;
        --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        --card-shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        --border-radius: 0.75rem;
        --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Welcome Banner with Gradient */
    .welcome-banner {
        background: linear-gradient(135deg, #e6f0ff 0%, #4361ee 100%);
        border-radius: var(--border-radius);
        padding: 2rem;
        color: #1a3e72;
        position: relative;
        overflow: hidden;
    }

    .welcome-banner::before {
        content: '';
        position: absolute;
        top: -50px;
        right: -50px;
        width: 200px;
        height: 200px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 50%;
    }

    .welcome-banner::after {
        content: '';
        position: absolute;
        bottom: -80px;
        right: -30px;
        width: 250px;
        height: 250px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
    }

    .welcome-banner h5 {
        font-weight: 700;
        margin-bottom: 0.75rem;
        font-size: 1.5rem;
        position: relative;
        z-index: 1;
    }

    .welcome-banner p {
        margin-bottom: 1.5rem;
        color: #3a5a92;
        font-size: 1.05rem;
        max-width: 600px;
        position: relative;
        z-index: 1;
    }

    .welcome-banner .btn-primary {
        background-color: var(--primary-color);
        border: none;
        padding: 0.5rem 1.5rem;
        font-weight: 500;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        position: relative;
        z-index: 1;
    }

    .welcome-banner .welcome-image {
        position: relative;
        z-index: 1;
        filter: drop-shadow(0 5px 10px rgba(67, 97, 238, 0.3));
    }

    /* Modern card styling */
    .dashboard-card {
        border: none;
        border-radius: var(--border-radius);
        background-color: white;
        box-shadow: var(--card-shadow);
        transition: var(--transition);
        overflow: hidden;
        height: 100%;
        position: relative;
    }

    .dashboard-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--card-shadow-hover);
    }

    .dashboard-card .card-header {
        background-color: white;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        padding: 1rem 1.5rem;
        font-weight: 600;
        color: #1e293b;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .dashboard-card .card-header i {
        color: var(--primary-color);
        margin-right: 0.5rem;
    }

    /* Stat cards */
    .stat-card {
        position: relative;
        overflow: hidden;
        height: 100%;
        border-left: 4px solid var(--primary-color);
    }

    .stat-card .card-body {
        padding: 1.5rem;
    }

    .stat-card .icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1rem;
        background-color: var(--primary-light);
        color: var(--primary-color);
    }

    .stat-card .icon-wrapper i {
        font-size: 1.5rem;
    }

    .stat-card .stat-value {
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1;
        margin-bottom: 0.25rem;
        color: #1e293b;
    }

    .stat-card .stat-label {
        font-size: 0.875rem;
        color: var(--secondary-color);
        font-weight: 500;
    }

    .stat-card .stat-change {
        font-size: 0.75rem;
        margin-top: 0.5rem;
        display: flex;
        align-items: center;
    }

    .stat-card .stat-change.positive {
        color: var(--success-color);
    }

    .stat-card .stat-change.negative {
        color: var(--danger-color);
    }

    /* User list items */
    .user-list {
        padding: 0;
        margin: 0;
        list-style: none;
    }

    .user-list-item {
        padding: 1rem;
        display: flex;
        align-items: center;
        transition: var(--transition);
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .user-list-item:last-child {
        border-bottom: none;
    }

    .user-list-item:hover {
        background-color: var(--light-bg);
        transform: translateX(5px);
    }

    .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        margin-right: 1rem;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .user-info {
        flex: 1;
    }

    .user-name {
        font-weight: 600;
        margin-bottom: 0.1rem;
        color: #1e293b;
    }

    .user-email {
        font-size: 0.75rem;
        color: var(--secondary-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
    }

    .user-status {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .status-badge {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 0.5rem;
    }

    .status-badge.active {
        background-color: var(--success-color);
    }

    .status-badge.inactive {
        background-color: var(--secondary-color);
    }

    .status-badge.suspended {
        background-color: var(--danger-color);
    }

    .user-id {
        font-size: 0.7rem;
        color: var(--secondary-color);
        background: #f1f5f9;
        padding: 0.2rem 0.5rem;
        border-radius: 10px;
        margin-top: 0.3rem;
    }

    /* Database tables */
    .database-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .database-item {
        padding: 1rem 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .database-item:last-child {
        border-bottom: none;
    }

    .database-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        padding: 0.5rem 0;
    }

    .database-name {
        font-weight: 600;
        color: #1e293b;
    }

    .database-meta {
        color: var(--secondary-color);
        font-size: 0.875rem;
    }

    .table-list {
        list-style: none;
        padding: 0;
        margin: 0.5rem 0 0 0;
    }

    .table-item {
        padding: 0.75rem 1rem;
        background-color: var(--light-bg);
        border-radius: 8px;
        margin-bottom: 0.5rem;
    }

    .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .table-name {
        font-weight: 500;
        color: #1e293b;
    }

    .table-meta {
        color: var(--secondary-color);
        font-size: 0.75rem;
    }

    .table-actions {
        display: flex;
        gap: 0.5rem;
    }

    /* Workflow table */
    .workflow-table {
        font-size: 0.875rem;
        border-collapse: separate;
        border-spacing: 0;
    }

    .workflow-table th {
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.05em;
        color: var(--secondary-color);
        background-color: #f8fafc;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .workflow-table td {
        vertical-align: middle;
        padding: 1rem 0.75rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .workflow-table tr:last-child td {
        border-bottom: none;
    }

    .workflow-table tr:hover td {
        background-color: var(--primary-light);
    }

    .workflow-table .badge {
        font-weight: 500;
        padding: 0.35em 0.65em;
        font-size: 0.75rem;
    }

    /* Action buttons */
    .btn-action {
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: var(--transition);
    }

    .btn-action:hover {
        transform: translateY(-2px);
    }

    /* Offcanvas */
    .offcanvas-columns {
        padding: 0;
    }

    .column-item {
        padding: 0.75rem 1.25rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        font-family: monospace;
        display: flex;
        align-items: center;
    }

    .column-item::before {
        content: "→";
        color: var(--primary-color);
        margin-right: 0.75rem;
        font-size: 0.875rem;
    }

    /* Toast notifications */
    .toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1100;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .toast {
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border: none;
        overflow: hidden;
    }

    /* Responsive adjustments */
    @media (max-width: 767.98px) {
        .welcome-banner {
            text-align: center;
        }

        .welcome-banner .btn-primary {
            width: 100%;
        }

        .stat-card .icon-wrapper {
            width: 36px;
            height: 36px;
        }

        .stat-card .stat-value {
            font-size: 1.5rem;
        }

        .table-actions {
            flex-direction: column;
        }
    }

    /* Animations */
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }

        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-fade-in {
        animation: fadeIn 0.3s ease-out forwards;
    }

    /* Section headers */
    .section-header {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
    }

    .section-header h5 {
        font-weight: 700;
        color: var(--primary-color);
        margin: 0;
    }

    .section-header .divider {
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, var(--primary-color), rgba(67, 97, 238, 0.1));
        margin-left: 1rem;
    }
</style>
@endsection
@section('content')
<div class="container-fluid px-4 py-3">
    <!-- Welcome Banner -->
    <div class="row mb-4 animate-fade-in">
        <div class="col-12">
            <div class="welcome-banner">
                <div class="row align-items-center">
                    <div class="col-lg-8">
                        <h5>Welcome back, <span class="fw-bold">{{ \App\Http\Classes\UserHelper::getCurrentUser('name') }}</span> 👋</h5>
                        <p>Here's what's happening with your account today. You have 3 new notifications and 2 pending tasks to complete.</p>
                        <a href="/profile/profile" class="btn btn-primary">View Profile</a>
                    </div>
                    <div class="col-lg-4 text-lg-end text-center">
                        <img src="{{ asset('treasury/images/common/device/finger-1.svg') }}" alt="Welcome Image"
                            class="welcome-image img-fluid" style="max-width: 120px;">
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Filters Overview Section -->
    <div class="row mb-4 animate-fade-in">
        <div class="col-12">
            <div class="section-header">
                <h5><i class="fas fa-filter me-2"></i>Filters Overview</h5>
                <div class="divider"></div>
            </div>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
            <a href="/filters/search/contacts" class="text-decoration-none text-reset">
                <div class="card dashboard-card stat-card">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="bi bi-people-fill"></i>
                        </div>
                        <h3 class="stat-value">{{ $leadsCount }}</h3>
                        <p class="stat-label">Contacts</p>
                        <div class="stat-change positive">
                            <i class="bi bi-arrow-up"></i> 12% from last week
                        </div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
            <a href="/filters/search/companies" class="text-decoration-none text-reset">
                <div class="card dashboard-card stat-card">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="bi bi-building"></i>
                        </div>
                        <h3 class="stat-value">{{ $accountCount }}</h3>
                        <p class="stat-label">Companies</p>
                        <div class="stat-change positive">
                            <i class="bi bi-arrow-up"></i> 5% from last week
                        </div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
            <a href="/filters/search/products" class="text-decoration-none text-reset">
                <div class="card dashboard-card stat-card">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="bi bi-box-seam"></i>
                        </div>
                        <h3 class="stat-value">{{ $productCount }}</h3>
                        <p class="stat-label">Products</p>
                        <div class="stat-change negative">
                            <i class="bi bi-arrow-down"></i> 2% from last week
                        </div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
            <a href="/filters/search/need-to-action" class="text-decoration-none text-reset">
                <div class="card dashboard-card stat-card">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="bi bi-person-badge"></i>
                        </div>
                        <h3 class="stat-value">{{ $needtoaction }}</h3>
                        <p class="stat-label">Need To Action</p>
                        <div class="stat-change positive">
                            <i class="bi bi-arrow-up"></i> 8% from last week
                        </div>
                    </div>
                </div>
            </a>
        </div>
    </div>

    <!-- Emails Section -->
    <div class="row mb-4 animate-fade-in">
        <div class="col-12">
            <div class="section-header">
                <h5><i class="fas fa-envelope me-2"></i>Email Metrics</h5>
                <div class="divider"></div>
            </div>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
            <a href="/filters/search/contacts" class="text-decoration-none text-reset">
                <div class="card dashboard-card stat-card">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="bi bi-envelope-at-fill"></i>
                        </div>
                        <h3 class="stat-value">24</h3>
                        <p class="stat-label">Total Email Accounts</p>
                        <div class="stat-change positive">
                            <i class="bi bi-arrow-up"></i> 3 new this month
                        </div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
            <a href="/filters/search/companies" class="text-decoration-none text-reset">
                <div class="card dashboard-card stat-card">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="bi bi-database-fill"></i>
                        </div>
                        <h3 class="stat-value">85%</h3>
                        <p class="stat-label">Mail Quota Used</p>
                        <div class="stat-change negative">
                            <i class="bi bi-exclamation-triangle"></i> 15% remaining
                        </div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
            <a href="/filters/search/products" class="text-decoration-none text-reset">
                <div class="card dashboard-card stat-card">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="bi bi-send-fill"></i>
                        </div>
                        <h3 class="stat-value">1,248</h3>
                        <p class="stat-label">Total Mails Sent</p>
                        <div class="stat-change positive">
                            <i class="bi bi-arrow-up"></i> 42 today
                        </div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-3 mb-3">
            <a href="/filters/search/need-to-action" class="text-decoration-none text-reset">
                <div class="card dashboard-card stat-card">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="bi bi-person-x-fill"></i>
                        </div>
                        <h3 class="stat-value">18</h3>
                        <p class="stat-label">Unsubscribers</p>
                        <div class="stat-change negative">
                            <i class="bi bi-arrow-down"></i> 2 this week
                        </div>
                    </div>
                </div>
            </a>
        </div>
    </div>

    <!-- Users Section -->
    <div class="row mb-4 animate-fade-in">
        <div class="col-md-6 mb-4">
            <div class="card dashboard-card h-100">
                <div class="card-header">
                    <i class="bi bi-people-fill"></i> Available Users
                </div>
                <div class="card-body p-0">
                    <ul class="user-list">
                        @if($users->isNotEmpty())
                        @foreach($users->take(6) as $user)
                        <li class="user-list-item">
                            <img src="https://ui-avatars.com/api/?name={{ urlencode($user->username) }}&background=random&color=fff"
                                alt="{{ $user->username }}" class="user-avatar">
                            <div class="user-info">
                                <div class="user-name">{{ $user->username }}</div>
                                <div class="user-email">{{ $user->email ?? 'No email provided' }}</div>
                            </div>
                            <div class="user-status">
                                <span class="d-flex align-items-center">
                                    <span class="status-badge {{ $user->account_status === 'active' ? 'active' : ($user->account_status === 'suspended' ? 'suspended' : 'inactive') }}"></span>
                                    <span class="text-capitalize">{{ $user->account_status }}</span>
                                </span>
                                <span class="user-id">ID: {{ $user->id }}</span>
                            </div>
                        </li>
                        @endforeach
                        @else
                        <li class="user-list-item text-center py-4 text-muted">
                            No users found
                        </li>
                        @endif
                    </ul>
                </div>
                <div class="card-footer bg-transparent border-top-0 text-end">
                    <a href="/discrete/users" class="btn btn-sm btn-outline-primary">View All Users</a>
                </div>
            </div>
        </div>

        <div class="col-md-6 mb-4">
            <div class="card dashboard-card h-100">
                <div class="card-header">
                    <i class="bi bi-envelope-at"></i> Sender Mail IDs
                </div>
                <div class="card-body p-0">
                    <ul class="user-list">
                        @if($users->isNotEmpty())
                        @foreach($users->take(6) as $user)
                        <li class="user-list-item">
                            <img src="https://ui-avatars.com/api/?name={{ urlencode($user->username) }}&background=random&color=fff"
                                alt="{{ $user->username }}" class="user-avatar">
                            <div class="user-info">
                                <div class="user-name">{{ $user->email ?? 'No email configured' }}</div>
                                <div class="user-email">Assigned to {{ $user->username }}</div>
                            </div>
                            <div class="user-status">
                                <span class="d-flex align-items-center">
                                    <span class="status-badge {{ $user->account_status === 'active' ? 'active' : ($user->account_status === 'suspended' ? 'suspended' : 'inactive') }}"></span>
                                    <span class="text-capitalize">{{ $user->account_status }}</span>
                                </span>
                                <span class="user-id">ID: {{ $user->id }}</span>
                            </div>
                        </li>
                        @endforeach
                        @else
                        <li class="user-list-item text-center py-4 text-muted">
                            No sender emails configured
                        </li>
                        @endif
                    </ul>
                </div>
                <div class="card-footer bg-transparent border-top-0 text-end">
                    <a href="/discrete/users" class="btn btn-sm btn-outline-primary">Manage Emails</a>
                </div>
            </div>
        </div>
    </div>

    <!-- Database Section -->
    <div class="row mb-4 animate-fade-in">
        <div class="col-6">
            <div class="card dashboard-card">
                <div class="card-header">
                    <i class="bi bi-database-fill"></i> Available Databases
                    <span class="badge bg-primary rounded-pill">{{ $databaseCount }}</span>
                </div>
                <div class="card-body">
                    <ul class="database-list">
                        @foreach($databaseList as $db)
                        <li class="database-item">
                            <div class="database-header" data-bs-toggle="collapse"
                                data-bs-target="#collapse-{{ Str::slug($db['name']) }}"
                                aria-expanded="false">
                                <span class="database-name">
                                    <i class="bi bi-folder-fill text-warning me-2"></i>
                                    {{ $db['name'] }}
                                </span>
                                <span class="database-meta">
                                    {{ $db['table_count'] }} tables
                                </span>
                            </div>
                            <div class="collapse mt-2" id="collapse-{{ Str::slug($db['name']) }}">
                                <ul class="table-list">
                                    @foreach($db['tables'] as $table)
                                    <li class="table-item">
                                        <div class="table-header">
                                            <span class="table-name">
                                                <i class="bi bi-table text-secondary me-2"></i>
                                                {{ $table['name'] }}
                                            </span>
                                            <span class="table-meta">
                                                {{ $table['column_count'] }} columns
                                            </span>
                                        </div>
                                        <div class="table-actions mt-2">
                                            <button class="btn btn-sm btn-outline-primary"
                                                onclick="copyToClipboard('{{ $table['name'] }}_columns', {{ json_encode($table['columns']) })">
                                                    <i class="bi bi-clipboard"></i> Copy
                                                </button>
                                                <button class="btn btn-sm btn-outline-success"
                                                    onclick="downloadAsCSV('{{ $table['name'] }}_columns', {{ json_encode($table['columns']) })">
                                                    <i class="bi bi-download"></i> Download
                                                </button>
                                                <button class="btn btn-sm btn-outline-secondary"
                                                    data-bs-toggle="offcanvas" data-bs-target="#offcanvasColumns"
                                                    onclick="showColumnsInOffcanvas('{{ $db['name'] }}', '{{ $table['name'] }}', {{ json_encode($table['columns']) })">
                                                    <i class="bi bi-list-ul"></i> View
                                                </button>
                                            </div>
                                        </li>
                                        @endforeach
                                    </ul>
                                </div>
                            </li>
                            @endforeach
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- Workflow Section -->
        <div class="row animate-fade-in">
            <div class="col-6">
                <div class="card dashboard-card">
                    <div class="card-header">
                        <i class="bi bi-diagram-3-fill"></i> Workflow Map
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover workflow-table mb-0">
                                <thead>
                                    <tr>
                                        <th style="min-width: 180px;">Workflow Name</th>
                                        <th style="min-width: 100px;">Type</th>
                                        <th style="min-width: 130px;">Support Table</th>
                                        <th style="min-width: 140px;" class="text-end pe-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @php
                                        $workflows = DB::table('moon.workflows')
                                            ->select('name', 'type', 'support_table')
                                            ->get();
                                    @endphp
                                    @forelse($workflows as $workflow)
                                        @php
                                            $columns = Schema::getColumnListing($workflow->support_table);
                                        @endphp
                                        <tr>
                                            <td class="text-truncate" style="max-width: 180px;" title="{{ $workflow->name }}">
                                                <i class="bi bi-diagram-2 text-primary me-2"></i>
                                                {{ $workflow->name }}
                                                </td>
                                                <td><span class="badge bg-info">{{ $workflow->type }}</span></td>
                                                <td class="text-truncate" style="max-width: 130px;"
                                                    title="{{ $workflow->support_table }}">{{ $workflow->support_table }}</td>
                                                <td class="text-end pe-3">
                                                    <div class="btn-group" role="group">
                                                        <button class="btn-action btn btn-outline-primary" title="View"
                                                            onclick="window.location.href='/query-chain/workflows?name={{ urlencode($workflow->name) }}'">
                                                            <i class="fas fa-eye"></i>
                                                        </button>
                                                        <button class="btn-action btn btn-outline-secondary" title="Copy"
                                                            onclick="copyToClipboard('{{ $workflow->support_table }}_columns', {{ json_encode($columns) }})">
                                                            <i class="fas fa-copy"></i>
                                                        </button>
                                                        <button class="btn-action btn btn-outline-success" title="Download"
                                                            onclick="downloadAsCSV('{{ $workflow->support_table }}_columns', {{ json_encode($columns) }})">
                                                            <i class="fas fa-download"></i>
                                                        </button>
                                                        <button class="btn-action btn btn-outline-primary" title="Upload"
                                                            onclick="window.location.href='/query-nest/insert?name={{ urlencode($workflow->name) }}'">
                                                            <i class="fas fa-upload"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                                </tr>
                                                @empty
                                                <tr>
                                                    <td colspan="4" class="text-center py-4 text-muted">
                                                        <i class="bi bi-exclamation-circle me-2"></i>No workflows found
                                                    </td>
                                                </tr>
                                                @endforelse
                                                </tbody>
                                                </table>
                                        </div>
                            </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Offcanvas for Columns -->
    <div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasColumns" aria-labelledby="offcanvasColumnsLabel">
        <div class="offcanvas-header border-bottom">
            <div>
                <h5 class="offcanvas-title" id="offcanvasColumnsLabel"></h5>
                <p class="text-muted small mb-0" id="offcanvasColumnsSubtitle"></p>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body p-0">
            <div class="d-flex p-3 border-bottom">
                <button class="btn btn-sm btn-outline-primary me-2" id="offcanvasCopyBtn">
                    <i class="bi bi-clipboard me-1"></i> Copy All
                </button>
                <button class="btn btn-sm btn-outline-success" id="offcanvasDownloadBtn">
                    <i class="bi bi-download me-1"></i> Download CSV
                </button>
            </div>
            <ul class="list-group list-group-flush" id="columnsList">
                <!-- Columns will be inserted here by JavaScript -->
            </ul>
        </div>
    </div>

    <!-- Toast Notification Container -->
    <div class="toast-container"></div>
    @endsection

    @section('bottom-script')
    <script>
        // Enhanced copy function with modern clipboard API
        async function copyToClipboard(name, columns) {
            try {
                const text = Array.isArray(columns) ? columns.join(', ') : columns;
                await navigator.clipboard.writeText(text);
                showToast('success', `Copied ${name} to clipboard`, 'check-circle');
            } catch (err) {
                console.error('Failed to copy:', err);
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = Array.isArray(columns) ? columns.join(', ') : columns;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    showToast('success', `Copied ${name} to clipboard`, 'check-circle');
                } catch (e) {
                    console.error('Fallback copy failed:', e);
                    showToast('error', 'Failed to copy. Please try manually.', 'exclamation-triangle');
                }
                document.body.removeChild(textarea);
            }
        }

        // Enhanced download function
        function downloadAsCSV(name, columns) {
            try {
                const csvContent = Array.isArray(columns) ? columns.join(',') : columns;
                const today = new Date().toISOString().slice(0, 10);
                const filename = `${name.replace(/[^a-z0-9]/gi, '_')}_${today}.csv`;

                const blob = new Blob([csvContent], {
                    type: 'text/csv;charset=utf-8;'
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();

                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showToast('success', `Downloaded ${filename}`, 'download');
                }, 100);
            } catch (error) {
                console.error('Download failed:', error);
                showToast('error', 'Download failed. Please try again.', 'exclamation-triangle');
            }
        }

        // Show columns in offcanvas with enhanced UI
        function showColumnsInOffcanvas(dbName, tableName, columns) {
            const offcanvasTitle = document.getElementById('offcanvasColumnsLabel');
            const offcanvasSubtitle = document.getElementById('offcanvasColumnsSubtitle');
            const columnsList = document.getElementById('columnsList');

            currentColumns = Array.isArray(columns) ? columns : [];
            currentTableName = tableName;

            offcanvasTitle.textContent = tableName;
            offcanvasSubtitle.textContent = `Database: ${dbName} • ${currentColumns.length} columns`;

            columnsList.innerHTML = '';
            currentColumns.forEach(column => {
                const li = document.createElement('li');
                li.className = 'list-group-item column-item';
                li.textContent = column;
                columnsList.appendChild(li);
            });

            // Setup offcanvas buttons
            document.getElementById('offcanvasCopyBtn').onclick = () => {
                copyToClipboard(`${currentTableName}_columns`, currentColumns);
            };

            document.getElementById('offcanvasDownloadBtn').onclick = () => {
                downloadAsCSV(`${currentTableName}_columns`, currentColumns);
            };
        }

        // Enhanced toast notification function with icons
        function showToast(type, message, icon) {
            const toastContainer = document.querySelector('.toast-container');
            const toast = document.createElement('div');

            // Icon mapping
            const icons = {
                'success': 'check-circle',
                'error': 'exclamation-triangle',
                'info': 'info-circle',
                'warning': 'exclamation-circle'
            };

            const toastIcon = icon || icons[type] || 'info-circle';

            toast.className = `toast show align-items-center text-white bg-${type} border-0`;
            toast.role = 'alert';
            toast.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body d-flex align-items-center">
                        <i class="bi bi-${toastIcon} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-3 m-auto" 
                        onclick="this.parentElement.parentElement.remove()"></button>
                </div>
            `;

            toastContainer.appendChild(toast);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                toast.remove();
            }, 5000);
        }

        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            // Add animation classes
            const elements = document.querySelectorAll('.animate-fade-in');
            elements.forEach((el, index) => {
                el.style.animationDelay = `${index * 0.1}s`;
            });

            // Initialize tooltips
            if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function(tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
            }

            // Smooth scroll for page anchors
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    e.preventDefault();
                    document.querySelector(this.getAttribute('href')).scrollIntoView({
                        behavior: 'smooth'
                    });
                });
            });
        });
    </script>
    @endsection