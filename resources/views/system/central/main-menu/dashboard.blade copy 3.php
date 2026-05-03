{{-- Template: Dashboard Page - Professional UI --}}
@extends('layouts.system-app')
@section('title', 'Dashboard')
@section('top-style')
    <style>
        :root {
            --primary-color: #3b82f6;
            --primary-hover: #2563eb;
            --secondary-color: #64748b;
            --light-bg: #f8fafc;
            --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
            --card-shadow-hover: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            --border-radius: 0.5rem;
            --transition: all 0.2s ease-in-out;
        }

        /* Welcome Banner with Light Blue Gradient */
        .welcome-banner {
            background: linear-gradient(135deg, #e6f0ff 0%, #cce0ff 100%);
            border-radius: var(--border-radius);
            padding: 1.5rem;
            color: #1a3e72;
            /* Dark blue text for contrast */
        }

        .welcome-banner h5 {
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .welcome-banner p {
            margin-bottom: 1.25rem;
            color: #3a5a92;
            /* Slightly lighter blue for paragraph */
        }

        .welcome-banner .btn-primary {
            background-color: #3b82f6;
            border-color: #3b82f6;
        }

        /* Keep all other existing styles below */
        :root {
            --primary-color: #2563eb;
            --secondary-color: #64748b;
            --light-bg: #f9fafb;
            --card-hover: rgba(0, 0, 0, 0.05);
            --border-radius: 12px;
            --transition-fast: 0.3s ease-in-out;
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
        }

        .dashboard-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--card-shadow-hover);
        }

        /* Stat cards */
        .stat-card {
            position: relative;
            overflow: hidden;
            height: 100%;
        }

        .stat-card .card-body {
            padding: 1.5rem;
            text-align: center;
        }

        .users {
            max-height: 200px;
            overflow-y: auto;
        }

        .stat-card .icon-wrapper {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            background-color: rgba(59, 130, 246, 0.1);
            color: var(--primary-color);
        }

        .stat-card .icon-wrapper i {
            font-size: 1.25rem;
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
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* News slider */
        .news-slider {
            position: relative;
            overflow: hidden;
            height: 180px;
        }

        .slider-track {
            display: flex;
            transition: transform 0.5s ease;
            height: 100%;
        }

        .slider-item {
            flex: 0 0 100%;
            min-width: 100%;
            padding: 1rem;
            background-color: white;
            border-radius: var(--border-radius);
        }

        @keyframes scroll-left {
            0% {
                transform: translateX(0);
            }

            100% {
                transform: translateX(-50%);
            }
        }

        /* Users list */
        .user-list-item {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #f1f5f9;
            transition: var(--transition);
        }

        .user-list-item:hover {
            background-color: #f8fafc;
        }

        .user-list-item:last-child {
            border-bottom: none;
        }

        /* Database tables - Original style */
        .database-list .list-group-item {
            background-color: transparent;
            border-bottom: 1px solid #e5e7eb;
        }

        .database-list .list-group-item:last-child {
            border-bottom: none;
        }

        /* Workflow table */
        .workflow-table {
            font-size: 0.875rem;
        }

        .workflow-table th {
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            color: #64748b;
            background-color: #f8fafc;
        }

        .workflow-table td {
            vertical-align: middle;
        }

        .workflow-table .badge {
            font-weight: 500;
            padding: 0.35em 0.65em;
        }

        /* Responsive adjustments */
        @media (max-width: 767.98px) {
            .stat-card .icon-wrapper {
                width: 36px;
                height: 36px;
            }

            .stat-card .stat-value {
                font-size: 1.5rem;
            }
        }

        .toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1100;
        }

        .toast {
            transition: opacity 0.3s ease;
        }

        .copy-download-group {
            display: flex;
            gap: 0.5rem;
        }
    </style>
@endsection
@section('content')
    <div class="container-fluid px-4 py-3">
        <!-- Breadcrumb -->
        <div class="row mb-3 ">
            <div class="col-12">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb bg-transparent px-0">
                        <li class="breadcrumb-item"><a href="#" class="text-decoration-none">Home</a></li>
                        <li class="breadcrumb-item active" aria-current="page">Dashboard</li>
                    </ol>
                </nav>
            </div>
        </div>
        <div class="welcome-banner mb-6">
            <div class="row align-items-center">
                <div class="col-lg-8">
                    <h5>Welcome, <span class="fw-bold">{{ \App\Http\Classes\UserHelper::getCurrentUser('name') }}</span>
                        👋🏻</h5>
                    <p>Your progress this week is awesome. Let's keep it up!</p>
                    <a href="/profile/profile" class="btn btn-primary btn-sm">View Profile</a>
                </div>
                <div class="col-lg-4 text-lg-end text-center">
                    <img src="{{ asset('treasury/images/common/device/finger-1.svg') }}" alt="Welcome Image"
                        class="img-fluid rounded" style="max-width: 100px;">
                </div>
            </div>
        </div>
        <!-- Stats Cards -->
        <div class="row mb-4 ">
            <h5 class="fw-bold text-primary mb-3">FILTERS OVER VIEW</h5>
            <a href="/filters/search/contacts" class="text-decoration-none text-reset">
                <div class="col-md-6 col-lg-3 mb-3">
                    <div class="card dashboard-card stat-card">
                        <div class="card-body">
                            <div class="icon-wrapper">
                                <i class="bi bi-people-fill"></i>
                            </div>
                            <h3 class="stat-value">{{ $leadsCount }}</h3>
                            <p class="stat-label">Contacts</p>
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
                    </div>
                </div>
        </div>
        </a>
    </div>
    <!-- Content Row -->
    <div class="row mb-4">

        <!-- News & Projects with Slider -->
        <div class="col-md-6 mb-4">
            <a href="/discrete/projects" class="text-decoration-none text-reset">
            <div class="card dashboard-card">
                <div class="card-body">

                    <h5 class="card-title ">Latest News & Projects</h5>
                    @if($newsFeed->isNotEmpty())
                        <div class="news-slider mt-3">
                            <div class="slider-track">
                                @foreach($newsFeed as $feed)
                                    <div class="slider-item">
                                        <h6 class="fw-bold">{{ $feed->title }}</h6>
                                        <p class="text-muted small">{{ Str::limit($feed->content, 150) }}</p>
                                        <!-- @if(!empty($feed->attachment_url))
                                            <a href="{{ $feed->attachment_url }}" target="_blank"
                                                class="btn btn-sm btn-outline-primary">📎 View Attachment</a>
                                        @endif -->
                                        <div class="mt-2">
                                            <small class="text-muted">📅 Posted on
                                                {{ \Carbon\Carbon::parse($feed->created_at)->format('M d, Y') }}</small>
                                        </div>
                                    </div>
                                @endforeach
                            </div>
                        </div>
                    @else
                        <p class="text-muted text-center">No recent news or projects available.</p>
                    @endif
                </div>
            </div>
</a>
        </div>
        <!-- Users List -->
        <div class="col-md-6 mb-4">
            <a href="/discrete/users" class="text-decoration-none text-reset">
                <div class="card dashboard-card">
                    <div class="card-body">
                        <div class="users">
                            <h5 class="card-title ">Users</h5>
                            @if($users->isNotEmpty())
                                <ul class="list-group list-group-flush">
                                    @foreach($users as $user)
                                        <li class="list-group-item">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <strong>{{ $user->username }}</strong>
                                                <span
                                                    class="small {{ $user->account_status === 'active' ? 'text-success' : 'text-danger' }}">
                                                    {{ $user->account_status }}
                                                </span>
                                            </div>
                                        </li>
                                    @endforeach
                                </ul>
                            @else
                                <p class="text-muted text-center">No users found.</p>
                            @endif
                        </div>
                    </div>
                </div>
        </div>
        </a>
    </div>
    <!-- Database Section -->
    <div class="row mb-4">
        <div class="col-12">
            <div class="card dashboard-card">
                <div class="card-body">
                    <h5 class="card-title ">Available Databases: <span class="badge bg-primary">{{ $databaseCount }}</span>
                    </h5>
                    <hr>
                    <ul class="list-unstyled">
                        @foreach($databaseList as $db)
                            <li class="mb-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <strong>{{ $db['name'] }}</strong>
                                    <span class="text-muted">(Tables: {{ $db['table_count'] }})</span>
                                    <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse"
                                        data-bs-target="#collapse-{{ Str::slug($db['name']) }}">
                                        📂 Show Tables
                                    </button>
                                </div>
                                <div class="collapse mt-2" id="collapse-{{ Str::slug($db['name']) }}">
                                    <ul class="list-group list-group-flush">
                                        @foreach($db['tables'] as $table)
                                            <li class="list-group-item">
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <span><strong>{{ $table['name'] }}</strong>
                                                        <span class="text-muted small ms-1">(Columns:
                                                            {{ $table['column_count'] }})</span>
                                                    </span>
                                                    <div class="copy-download-group">
                                                        <button class="btn btn-sm btn-outline-info"
                                                            onclick="copyToClipboard('{{ $table['name'] }}_columns', {{ json_encode($table['columns']) }})">
                                                            <i class="bi bi-clipboard"></i> Copy
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-success"
                                                            onclick="downloadAsCSV('{{ $table['name'] }}_columns', {{ json_encode($table['columns']) }})">
                                                            <i class="bi bi-download"></i> Download
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-secondary" type="button"
                                                            data-bs-toggle="offcanvas" data-bs-target="#offcanvasColumns"
                                                            onclick="showColumnsInOffcanvas('{{ $db['name'] }}', '{{ $table['name'] }}', {{ json_encode($table['columns']) }})">
                                                            <i class="bi bi-list-ul"></i> View
                                                        </button>
                                                    </div>
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
    <div class="row mt-3">
        <div class="col-12">
            <div class="card dashboard-card" style="max-height: 500px;">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 class="card-title text-center"><i class="fas fa-sitemap me-2"></i>Workflow Map</h5>
                    </div>
                    <div class="table-responsive" style="max-height: 380px;">
                        <table class="table table-hover mb-0">
                            <thead class="sticky-top bg-light">
                                <tr class="bg-primary text-white mt-2">
                                    <th style="min-width: 180px;">Workflow Name</th>
                                    <th style="min-width: 100px;">Type</th>
                                    <th style="min-width: 130px;">Support Table</th>
                                    <th style="min-width: 140px;" class="text-end pe-2">Actions</th>
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
                                            {{ $workflow->name }}
                                        </td>
                                        <td><span class="badge bg-info">{{ $workflow->type }}</span></td>
                                        <td class="text-truncate" style="max-width: 130px;"
                                            title="{{ $workflow->support_table }}">{{ $workflow->support_table }}</td>
                                        <td class="text-end pe-2">
                                            <div class="btn-group btn-group-sm" role="group">
                                                <button class="btn btn-outline-primary" title="View"
                                                    onclick="window.location.href='/query-chain/workflows?name={{ urlencode($workflow->name) }}'">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary" title="Copy"
                                                    onclick="copyToClipboard('{{ $workflow->support_table }}_columns', {{ json_encode($columns) }})">
                                                    <i class="fas fa-copy"></i>
                                                </button>
                                                <button class="btn btn-outline-success" title="Download"
                                                    onclick="downloadAsCSV('{{ $workflow->support_table }}_columns', {{ json_encode($columns) }})">
                                                    <i class="fas fa-download"></i>
                                                </button>
                                                <button class="btn btn-outline-primary" title="Upload"
                                                    onclick="window.location.href='/query-nest/insert?name={{ urlencode($workflow->name) }}'">
                                                    <i class="fas fa-upload"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                @empty
                                    <tr>
                                        <td colspan="4" class="text-center py-2 text-muted">No workflows found</td>
                                    </tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Offcanvas for Columns -->
    <div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasColumns" aria-labelledby="offcanvasColumnsLabel">
        <div class="offcanvas-header">
            <div class="w-100">
                <h5 class="offcanvas-title" id="offcanvasColumnsLabel"></h5>
                <div class="btn-group w-100 mb-3">
                </div>
            </div>
            <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body offcanvas-columns">
            <ul class="list-group" id="columnsList">
                <!-- Columns will be inserted here by JavaScript -->
            </ul>
        </div>
    </div>
    <!-- Toast Notification Container -->
    <div class="toast-container"></div>
@endsection
@section('bottom-script')
    <script>
        // Global variables
        let currentColumns = [];
        let currentTableName = '';
        // Main copy function with enhanced compatibility
        function copyToClipboard(name, columns) {
            const text = Array.isArray(columns) ? columns.join(',') : columns;
            // Create a temporary textarea element
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';  // Prevent scrolling to bottom
            document.body.appendChild(textarea);
            textarea.select();
            try {
                // Try modern clipboard API first
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => {
                        showToast('success', `Copied ${name} to clipboard`);
                    }).catch(err => {
                        throw new Error('Clipboard API failed');
                    });
                } else {
                    // Fallback for older browsers
                    const successful = document.execCommand('copy');
                    if (successful) {
                        showToast('success', `Copied ${name} to clipboard (fallback)`);
                    } else {
                        throw new Error('execCommand failed');
                    }
                }
            } catch (err) {
                console.error('Copy failed:', err);
                // Final fallback - show the text and let user copy manually
                const modalText = `Copy these ${name}:\n\n${text}`;
                prompt('Press Ctrl+C to copy', modalText);
                showToast('info', 'Please copy manually from the prompt');
            } finally {
                // Always remove the textarea
                document.body.removeChild(textarea);
            }
        }
        // Main download function
        function downloadAsCSV(name, columns) {
            try {
                const csvContent = Array.isArray(columns) ? columns.join(',') : columns;
                const today = new Date().toISOString().slice(0, 10);
                const filename = `${name.replace(/[^a-z0-9]/gi, '_')}_${today}.csv`;
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
                    showToast('success', `Downloaded ${filename}`);
                }, 100);
            } catch (error) {
                console.error('Download failed:', error);
                showToast('error', 'Download failed. Please try again.');
            }
        }
        // Show columns in offcanvas
        function showColumnsInOffcanvas(dbName, tableName, columns) {
            const offcanvasTitle = document.getElementById('offcanvasColumnsLabel');
            const columnsList = document.getElementById('columnsList');
            currentColumns = Array.isArray(columns) ? columns : [];
            currentTableName = tableName;
            offcanvasTitle.textContent = `${dbName} → ${tableName}`;
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
        // Toast notification function
        function showToast(type, message) {
            const toastContainer = document.querySelector('.toast-container');
            const toast = document.createElement('div');
            toast.className = `toast show align-items-center text-white bg-${type} border-0 mb-2`;
            toast.role = 'alert';
            toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                    onclick="this.parentElement.parentElement.remove()"></button>
            </div>
                `;
            toastContainer.appendChild(toast);
            // Auto-remove after 3 seconds
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', function () {
            // News slider functionality
            const track = document.querySelector('.slider-track');
            const items = Array.from(document.querySelectorAll('.slider-item'));
            if (track && items.length > 0) {
                let index = 0;
                const total = items.length;
                let slideWidth = items[0].getBoundingClientRect().width;
                window.addEventListener('resize', () => {
                    slideWidth = items[0].getBoundingClientRect().width;
                });
                setInterval(() => {
                    index = (index + 1) % total;
                    track.style.transform = `translateX(-${index * slideWidth}px)`;
                }, 4000);
            }
            // Initialize tooltips
            if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
            }
        });
    </script>
@endsection