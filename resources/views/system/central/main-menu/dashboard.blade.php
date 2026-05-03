@extends('layouts.system-app')
@section('title', 'Dashboard')
@section('top-style')
<style>
    :root {
        --primary-color: #1db4cd;
        --primary-hover: #2563eb;
        --secondary-color: #64748b;
        --light-bg: #f8fafc;
        --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        --card-shadow-hover: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
        --border-radius: 0.5rem;
        --transition: all 0.2s ease-in-out;
    }

    /* Welcome Banner */
    .welcome-banner {
        background: linear-gradient(135deg, #e6f0ff 0%, #cce0ff 100%);
        border-radius: var(--border-radius);
        padding: 1.5rem;
        color: #1a3e72;
        margin-bottom: 1.5rem;
    }

    .welcome-banner h5 {
        font-weight: 600;
        margin-bottom: 0.5rem;
    }

    .welcome-banner p {
        margin-bottom: 1rem;
        color: #3a5a92;
    }

    .welcome-banner .btn-primary {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
    }

    .welcome-banner .btn-primary:hover {
        background-color: var(--primary-hover);
        border-color: var(--primary-hover);
    }

    /* Card Styling */
    .dashboard-card {
        border: none;
        border-radius: var(--border-radius);
        background: white;
        box-shadow: var(--card-shadow);
        transition: var(--transition);
        min-height: 100%;
    }

    .dashboard-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--card-shadow-hover);
    }

    /* Stat Cards */
    .stat-card .card-body {
        padding: 1.25rem;
        text-align: center;
    }

    .stat-card .icon-wrapper {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        display: grid;
        place-items: center;
        margin: 0 auto 0.75rem;
        background-color: rgba(59, 130, 246, 0.1);
        color: var(--primary-color);
    }

    .stat-card .icon-wrapper i {
        font-size: 1.125rem;
    }

    .stat-card .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1e293b;
    }

    .stat-card .stat-label {
        font-size: 0.75rem;
        color: var(--secondary-color);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* News Slider */
    .news-slider {
        overflow: hidden;
        height: 10rem;
    }

    .slider-track {
        display: flex;
        transition: transform 0.5s ease;
    }

    .slider-item {
        flex: 0 0 100%;
        padding: 1rem;
        border-radius: var(--border-radius);
    }

    /* Users List */
    .users {
        max-height: 12rem;
        overflow-y: auto;
    }

    .user-list-item {
        padding: 0.5rem 1rem;
        border-bottom: 1px solid #f1f5f9;
        transition: var(--transition);
    }

    .user-list-item:hover {
        background-color: var(--light-bg);
    }

    .user-list-item:last-child {
        border-bottom: none;
    }

    /* Database List */
    .database-list .list-group-item {
        border-bottom: 1px solid #e5e7eb;
        padding: 0.5rem 1rem;
    }

    .database-list .list-group-item:last-child {
        border-bottom: none;
    }

    /* Workflow Table */
    .workflow-table th {
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        color: var(--secondary-color);
        background: var(--light-bg);
        padding: 0.5rem;
    }

    .workflow-table td {
        vertical-align: middle;
        padding: 0.5rem;
        font-size: 0.875rem;
    }

    .workflow-table .badge {
        font-weight: 500;
        padding: 0.25rem 0.5rem;
    }

    /* Button Group */
    .copy-download-group {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
    }

    .btn-group-sm .btn {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
    }

    /* Toast */
    .toast-container {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        z-index: 1100;
    }

    /* Responsive */
    @media (max-width: 767.98px) {
        .welcome-banner .img-fluid {
            max-width: 4rem;
        }

        .stat-card .icon-wrapper {
            width: 2rem;
            height: 2rem;
        }

        .stat-card .stat-value {
            font-size: 1.25rem;
        }

        .copy-download-group {
            flex-wrap: wrap;
            justify-content: center;
        }

        .workflow-table th,
        .workflow-table td {
            font-size: 0.7rem;
            padding: 0.4rem;
        }
    }
</style>
@endsection
@section('content')
@if (Auth::user()->verification === 'pending')
@include('auth.verification-modal')
@endif
<div class="container-fluid px-3 py-2">
    <!-- Breadcrumb -->
    <div class="col-xl-12">
            <div class="container-fluid px-0 d-flex justify-content-between align-items-center">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item">
                            <a href="javascript:void(0);">Main Menu</a>
                        </li>
                        <li class="breadcrumb-item active fw-bold">Dashboard</li>
                    </ol>
                </nav>
            </div>
        </div>
    <!-- Welcome Banner -->
    <section class="welcome-banner">
        <div class="row align-items-center">
            <div class="col-lg-8 mb-3 mb-lg-0">
                <h5>Welcome, <span class="fw-bold">{{ \App\Http\Classes\UserHelper::getCurrentUser('name') }}</span> 👋
                </h5>
                <p>Your progress this week is awesome. Let's keep it up!</p>
                <a href="/profile/profile" class="btn btn-primary btn-sm">View Profile</a>
            </div>
            <div class="col-lg-4 text-lg-end text-center">
                <img src="{{ asset('treasury/images/common/device/finger-1.svg') }}" alt="Welcome Image"
                    class="img-fluid rounded" style="max-width: 5rem;">
            </div>
        </div>
    </section>
    <section class="row mb-4">
        <h5 class="fw-bold text-primary mb-3">Filters Overview</h5>
        @php
        $mainStats = [
        [
        'href' => '/filters/search/contacts',
        'icon' => 'bi-people-fill',
        'value' => $leadsCount,
        'label' => 'Contacts',
        ],
        [
        'href' => '/filters/search/companies',
        'icon' => 'bi-building',
        'value' => $accountCount,
        'label' => 'Companies',
        ],
        [
        'href' => '/filters/search/products',
        'icon' => 'bi-box-seam',
        'value' => $productCount,
        'label' => 'Products',
        ],
        [
        'href' => '/filters/search/need-to-action',
        'icon' => 'bi-box-seam',
        'value' => $needtoaction,
        'label' => 'Need To Action',
        ],
        ];

        $emailStats = [
        [
        'href' => '/email-system/mail-config',
        'icon' => 'bi bi-envelope-at-fill',
        'value' => $emailaccounts,
        'label' => 'Total email accounts',
        ],
        [
        'href' => '/email-system/drift-emails',
        'icon' => 'bi bi-database-fill',
        'value' =>
        isset($total_used) && isset($total_limit) ? "$total_used / $total_limit " : 'Loading...',
        'label' => 'Mail Quota',
        'id' => 'total-quota-text',
        ],
        [
        'href' => '/email-system/drift-emails',
        'icon' => 'bi bi-send-fill',
        'value' => $mailssent,
        'label' => 'Total Mails sent',
        ],
        [
        'href' => '/filters/product-unsubscribe',
        'icon' => 'bi bi-person-x-fill',
        'value' => $unsubscribe,
        'label' => 'Unsubscribers',
        ],
        ];
        @endphp
        {{-- First set of cards --}}
        @foreach ($mainStats as $stat)
        <div class="col-md-6 col-lg-3 mb-3">
            <a href="{{ $stat['href'] }}" class="text-decoration-none text-reset">
                <div class="card dashboard-card stat-card">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="bi {{ $stat['icon'] }}"></i>
                        </div>
                        <h3 class="stat-value">{{ $stat['value'] }}</h3>
                        <p class="stat-label">{{ $stat['label'] }}</p>
                    </div>
                </div>
            </a>
        </div>
        @endforeach
        <h5 class="fw-bold text-primary mb-3">Email Systems Overview</h5>
        @foreach ($emailStats as $stat)
        <div class="col-md-6 col-lg-3 mb-3">
            <a href="{{ $stat['href'] }}" class="text-decoration-none text-reset">
                <div class="card dashboard-card stat-card">
                    <div class="card-body">
                        <div class="icon-wrapper">
                            <i class="bi {{ $stat['icon'] }}"></i>
                        </div>
                        <h3 class="stat-value" @if (isset($stat['id'])) id="{{ $stat['id'] }}" @endif>
                            {{ $stat['value'] }}
                        </h3>
                        <p class="stat-label">{{ $stat['label'] }}</p>
                    </div>
                </div>
            </a>
        </div>
        @endforeach
    </section>

    <!-- News & Users -->
    <section class="row mb-4">
        <!-- News Feeds-->
        <div class="col-md-6 mb-4">
            <a href="/discrete/projects" class="text-decoration-none text-reset">
                <div class="card dashboard-card">
                    <div class="card-body">
                        <h5 class="card-title">Latest News & Projects</h5>
                        @if ($newsFeed->isNotEmpty())
                        <div class="news-slider mt-2">
                            <div class="slider-track">
                                @foreach ($newsFeed as $feed)
                                <div class="slider-item card mb-3">
                                    <div class="row g-0 align-items-center">
                                        <!-- Image on Left -->
                                        @if ($feed->attachment_url)
                                        <div class="col-5 text-center">
                                            <img src="{{ asset($feed->attachment_url) }}"
                                                class="img-fluid rounded-start"
                                                style="max-height: 130px; object-fit:cover;"
                                                alt="News Image">
                                        </div>
                                        @endif

                                        <!-- Content on Right -->
                                        <div class="col-7">
                                            <div class="card-body p-2">
                                                <h6 class="fw-bold mb-1">{{ $feed->title }}</h6>
                                                <p class="text-muted small mb-1">
                                                    {{ Str::limit($feed->content, 120) }}
                                                </p>
                                                <small class="text-muted d-block">
                                                    📅
                                                    {{ \Carbon\Carbon::parse($feed->created_at)->format('M d, Y') }}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                @endforeach
                            </div>
                        </div>
                        @else
                        <p class="text-muted text-center">No recent news or projects.</p>
                        @endif
                    </div>
                </div>

            </a>
        </div>

        <!-- Users List -->
        <div class="col-md-6 mb-4">
            <div class="card dashboard-card h-100">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">Users</h5>
                    <div class="users flex-grow-1">
                        @if ($uniqueusers->isNotEmpty())
                        <ul class="list-group list-group-flush">
                            @foreach ($uniqueusers as $users)
                            <li class="list-group-item position-relative">
                                @php
                                $mImages = ['1.png', '3.png','5.png','7.png'];
                                $fImages = ['2.png', '4.png','6.png', '8.png'];
                                if ($users->profile) {
                                $profileImage = asset($users->profile);
                                } else {
                                $profileImage =
                                strtolower($users->gender) === 'male'
                                ? asset(
                                'treasury/images/common/profile/' .
                                $mImages[array_rand($mImages)],
                                )
                                : asset(
                                'treasury/images/common/profile/' .
                                $fImages[array_rand($fImages)],
                                );
                                }
                                @endphp

                                <!-- Entire list item is now clickable -->
                                <a href="/discrete/users" class="stretched-link"></a>
                                <div class="d-flex justify-content-between align-items-center">
                                    <img src="{{ $profileImage }}" class="rounded-circle me-3" width="40"
                                        height="40" alt="Profile">
                                    <div class="d-flex flex-column">
                                        <strong class="mb-1">{{ $users->username }}</strong>
                                        <span
                                            class="badge rounded-pill small {{ $users->account_status === 'active' ? 'bg-success' : 'bg-danger' }}">
                                            {{ ucfirst($users->account_status) }}
                                        </span>
                                    </div>
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






    </section>
    <!-- Database AND WorkflowMap Section -->
    <section class="row mb-4">
        <div class="col-6">
            <div class="card dashboard-card h-100" style="max-height: 30rem;">
                <div class="card-header d-flex justify-content-between align-items-center sticky-top bg-white">
                    <h5 class="mb-0">Available Databases</h5>
                    <span class="badge bg-primary">{{ $databaseCount }}</span>
                </div>
                <div class="card-body overflow-auto p-2">
                    <ul class="list-unstyled database-list m-0 p-3">
                        @foreach ($databaseList as $db)
                        <li class="mb-3">
                            <div class="d-flex justify-content-between align-items-center p-2 rounded">
                                <strong>{{ $db['name'] }}</strong>
                                <span class="text-muted small">Tables: {{ $db['table_count'] }}</span>
                                <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="collapse"
                                    data-bs-target="#collapse-{{ Str::slug($db['name']) }}" aria-expanded="false">
                                    <i class="bi bi-folder"></i> Tables
                                </button>
                            </div>
                            <div class="collapse mt-2" id="collapse-{{ Str::slug($db['name']) }}">
                                <ul class="list-group list-group-flush">
                                    @foreach ($db['tables'] as $table)
                                    <li class="list-group-item">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span>
                                                <strong>{{ $table['name'] }}</strong>
                                                <span class="text-muted small">({{ $table['column_count'] }}
                                                    columns)</span>
                                            </span>
                                            <div class="btn-group btn-group-sm" role="group">
                                                <button class="btn btn-outline-info"
                                                    onclick="copyToClipboard('{{ $table['name'] }}_columns', {{ json_encode($table['columns']) }})">
                                                    <i class="bi bi-clipboard"></i>
                                                </button>
                                                <button class="btn btn-outline-success"
                                                    onclick="downloadAsCSV('{{ $table['name'] }}_columns', {{ json_encode($table['columns']) }})">
                                                    <i class="bi bi-download"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary"
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasColumns"
                                                    onclick="showColumns('{{ $db['name'] }}', '{{ $table['name'] }}', {{ json_encode($table['columns']) }})">
                                                    <i class="bi bi-list-ul"></i>
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

        <div class="col-6">
            <div class="card dashboard-card" style="max-height: 30rem;">
                <div class="card-body p-2">
                    <h5 class="card-title "><i class="bi bi-diagram-3 me-1"></i>Workflow Map</h5>
                    <div class="table-responsive" style="max-height: 24rem;">
                        <table class="table table-hover workflow-table mb-0">
                            <thead class="sticky-top bg-light">
                                <tr class="bg-primary text-white">
                                    <th style="min-width: 10rem;">Workflow Name</th>
                                    <th style="min-width: 6rem;">Type</th>
                                    <th style="min-width: 8rem;">Support Table</th>
                                    <th style="min-width: 8rem;" class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                @forelse(DB::table('moon.workflows')->select('name', 'type', 'support_table')->get() as $workflow)
                                <tr>
                                    <td class="text-truncate" style="max-width: 10rem;"
                                        title="{{ $workflow->name }}">
                                        {{ $workflow->name }}
                                    </td>
                                    <td><span class="badge bg-info">{{ $workflow->type }}</span></td>
                                    <td class="text-truncate" style="max-width: 8rem;"
                                        title="{{ $workflow->support_table }}">{{ $workflow->support_table }}
                                    </td>
                                    <td class="text-end">
                                        <div class="btn-group btn-group-sm">
                                            <button class="btn btn-outline-primary" title="View"
                                                onclick="window.location.href='/query-chain/workflows?name={{ urlencode($workflow->name) }}'">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                            <button class="btn btn-outline-secondary" title="Copy"
                                                onclick="copyToClipboard('{{ $workflow->support_table }}_columns', {{ json_encode(Schema::getColumnListing($workflow->support_table)) }})">
                                                <i class="bi bi-clipboard"></i>
                                            </button>
                                            <button class="btn btn-outline-success" title="Download"
                                                onclick="downloadAsCSV('{{ $workflow->support_table }}_columns', {{ json_encode(Schema::getColumnListing($workflow->support_table)) }})">
                                                <i class="bi bi-download"></i>
                                            </button>
                                            <button class="btn btn-outline-primary" title="Upload"
                                                onclick="window.location.href='/query-nest/insert?name={{ urlencode($workflow->name) }}'">
                                                <i class="bi bi-upload"></i>
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
    </section>

    <!-- Offcanvas for Columns -->
    <div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasColumns"
        aria-labelledby="offcanvasColumnsLabel">
        <div class="offcanvas-header">
            <h5 class="offcanvas-title" id="offcanvasColumnsLabel"></h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body">
            <ul class="list-group" id="columnsList"></ul>
        </div>
    </div>
    <!-- Toast Container -->
    <div class="toast-container"></div>
    <!-- Verification Modal -->

    @endsection
    @section('bottom-script')

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const modal = document.getElementById('verificationModal');
            if (modal) new bootstrap.Modal(modal).show();
            const track = document.querySelector('.slider-track');
            if (track) {
                const items = track.querySelectorAll('.slider-item');
                if (items.length > 1) {
                    let index = 0;
                    const slideWidth = () => items[0].getBoundingClientRect().width;
                    const slide = () => {
                        index = (index + 1) % items.length;
                        track.style.transform = `translateX(-${index * slideWidth()}px)`;
                    };
                    window.addEventListener('resize', () => track.style.transform =
                        `translateX(-${index * slideWidth()}px)`);
                    setInterval(slide, 4000);
                }
            }
            if (bootstrap?.Tooltip) {
                document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
            }
        });
        let currentColumns = [];
        let currentTableName = '';

        function copyToClipboard(name, columns) {
            const text = Array.isArray(columns) ? columns.join(',') : columns;
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => {
                        showToast('success', `Copied ${name} to clipboard`);
                    }).catch(err => {
                        throw new Error('Clipboard API failed');
                    });
                } else {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        showToast('success', `Copied ${name} to clipboard`);
                    } else {
                        throw new Error('execCommand failed');
                    }
                }
            } catch (err) {
                console.error('Copy failed:', err);
                const modalText = `Copy these ${name}:\n\n${text}`;
                prompt('Press Ctrl+C to copy', modalText);
                showToast('info', 'Please copy manually from the prompt');
            } finally {
                document.body.removeChild(textarea);
            }
        }

        function downloadAsCSV(name, columns) {
            const csv = Array.isArray(columns) ? columns.join(',') : columns;
            const filename = `${name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([csv], {
                type: 'text/csv;charset=utf-8;'
            }));
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('success', `Downloaded ${filename}`);
        }

        function showColumns(dbName, tableName, columns) {
            currentColumns = Array.isArray(columns) ? columns : [];
            currentTableName = tableName;
            document.getElementById('offcanvasColumnsLabel').textContent = `${dbName} → ${tableName}`;
            const columnsList = document.getElementById('columnsList');
            columnsList.innerHTML = currentColumns.map(col => `<li class="list-group-item">${col}</li>`).join('');
        }

        function showToast(type, message, fallbackText) {
            const toast = document.createElement('div');
            toast.className = `toast show align-items-center text-white bg-${type} border-0 mb-2`;
            toast.role = 'alert';
            toast.innerHTML = `
                                                <div class="d-flex">
                                                    <div class="toast-body">${message}</div>
                                                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                                                </div>
                                            `;
            document.querySelector('.toast-container').appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
            if (fallbackText) prompt('Copy manually', fallbackText);
        }
    </script>
    @endsection