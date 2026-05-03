@section('title', 'Gotit | Biometric HR Management Software | Attendance, Payroll, Leave Tracking')
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    class="light-style layout-navbar-fixed layout-menu-fixed layout-compact" dir="ltr" data-theme="theme-default"
    data-template="gotit">
<head>
    <!-- Meta Essentials -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="index, follow">
    <meta name="author" content="Got-It HR Solutions">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <!-- SEO Meta Tags -->
    <title>@yield('title')</title>
    <meta name="description"
        content="Got-It HR software is your go-to solution for biometric attendance, payroll management, leave tracking, and workforce management. Simplify HR processes and boost efficiency today!">
    <meta name="keywords"
        content="HR management software, biometric attendance system, payroll management software, leave management, HR solutions, workforce management, employee management system, HR automation, attendance tracking, payroll automation, biometric HR, Got-It HR software, HR analytics, employee performance tracking, time tracking software, leave tracking software, workforce efficiency, HR technology, HR payroll, employee attendance system">
    <!-- Geo Location -->
    <meta name="geo.placename" content="Hyderabad, Bengaluru, Chennai">
    <meta name="geo.position" content="17.385044, 78.486671">
    <link rel="canonical" href="{{ url('/') }}">
    <!-- Open Graph for Social Media -->
    <meta property="og:title" content="Biometric HR Management Software | Attendance, Payroll, Leave Tracking | Got-It">
    <meta property="og:description"
        content="Discover Got-It HR software: biometric attendance, payroll management, leave tracking, and workforce optimization. Simplify HR processes for your business.">
    <meta property="og:url" content="{{ url('/') }}">
    <meta property="og:image" content="{{ asset('treasury/company/favicon/favicon.png') }}">
    <meta property="og:type" content="website">
    <!-- Twitter Meta -->
    <meta name="twitter:title" content="Biometric HR Software | Attendance, Payroll, Leave Tracking | Got-It">
    <meta name="twitter:description"
        content="Streamline HR management with Got-It HR software. Manage attendance, payroll, leave tracking, and workforce performance seamlessly.">
    
    <meta name="user-id" content="{{ $authUser ? $authUser->user_id : '' }}">
    <meta name="business-id" content="{{ $authUser ? $authUser->business_id : '' }}">
    <meta name="twitter:image" content="{{ asset('treasury/company/favicon/favicon.png') }}">
    <!-- Fonts and Favicon -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Nunito:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
        rel="stylesheet">
    <link rel="shortcut icon" href="{{ asset('treasury/company/favicon/favicon.svg') }}" type="image/x-icon">
    <!-- Skeleton Pack CSS -->
    @if ((auth()->check() && file_exists(public_path('build/manifest.json'))) || file_exists(public_path('hot')))
        @vite(['resources/css/system.css'])
    @else
        @vite(['resources/css/lander.css'])
    @endif
    <!-- Dynamic Top Scripts -->
    @yield('top-script')
    <!-- Dynamic Top Styles -->
    @yield('top-style')
</head>
<body>
    {{-- <div id="global-loader">
        <div class="page-loader"></div>
    </div> --}}
    <!-- Main Wrapper -->
    <div class="main-wrapper">
        <!-- Header -->
        <div class="header">
            <div class="main-header">
                <div class="header-left">
                    <a href="index.html" class="logo">
                        <img src="{{ asset('treasury/company/logo/logo.svg') }}" alt="Logo">
                    </a>
                    <a href="index.html" class="dark-logo">
                        <img src="{{ asset('treasury/company/logo/logo.svg') }}" alt="Logo">
                    </a>
                </div>
                <a id="mobile_btn" class="mobile_btn" href="#sidebar">
                    <span class="bar-icon">
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                </a>
                <div class="header-user">
                    <div class="nav user-menu nav-list">
                        <div class="me-auto d-flex align-items-center" id="header-search">
                            <a id="toggle_btn" href="javascript:void(0);" class="btn btn-menubar me-1">
                                <i class="ti ti-arrow-bar-to-left"></i>
                            </a>
                            <!-- Search -->
                            <div class="input-group input-group-flat d-inline-flex me-1">
                                <span class="input-icon-addon">
                                    <i class="ti ti-search"></i>
                                </span>
                                <input type="text" class="form-control" placeholder="Search in HRMS">
                                <span class="input-group-text">
                                    <kbd>CTRL + / </kbd>
                                </span>
                            </div>
                            <!-- /Search -->
                            <div class="dropdown crm-dropdown">
                                <a href="#" class="btn btn-menubar me-1" data-bs-toggle="dropdown">
                                    <i class="ti ti-layout-grid"></i>
                                </a>
                                <div class="dropdown-menu dropdown-lg dropdown-menu-start">
                                    <div class="card mb-0 border-0 shadow-none">
                                        <div class="card-header">
                                            <h4>CRM</h4>
                                        </div>
                                        <div class="card-body pb-1">
                                            <div class="row">
                                                <div class="col-sm-6">
                                                    <a href="contacts.html"
                                                        class="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
                                                        <span class="d-flex align-items-center me-3">
                                                            <i class="ti ti-user-shield text-default me-2"></i>Contacts
                                                        </span>
                                                        <i class="ti ti-arrow-right"></i>
                                                    </a>
                                                    <a href="deals-grid.html"
                                                        class="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
                                                        <span class="d-flex align-items-center me-3">
                                                            <i
                                                                class="ti ti-heart-handshake text-default me-2"></i>Deals
                                                        </span>
                                                        <i class="ti ti-arrow-right"></i>
                                                    </a>
                                                    <a href="pipeline.html"
                                                        class="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
                                                        <span class="d-flex align-items-center me-3">
                                                            <i
                                                                class="ti ti-timeline-event-text text-default me-2"></i>Pipeline
                                                        </span>
                                                        <i class="ti ti-arrow-right"></i>
                                                    </a>
                                                </div>
                                                <div class="col-sm-6">
                                                    <a href="companies-grid.html"
                                                        class="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
                                                        <span class="d-flex align-items-center me-3">
                                                            <i class="ti ti-building text-default me-2"></i>Companies
                                                        </span>
                                                        <i class="ti ti-arrow-right"></i>
                                                    </a>
                                                    <a href="leads-grid.html"
                                                        class="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
                                                        <span class="d-flex align-items-center me-3">
                                                            <i class="ti ti-user-check text-default me-2"></i>Leads
                                                        </span>
                                                        <i class="ti ti-arrow-right"></i>
                                                    </a>
                                                    <a href="activity.html"
                                                        class="d-flex align-items-center justify-content-between p-2 crm-link mb-3">
                                                        <span class="d-flex align-items-center me-3">
                                                            <i class="ti ti-activity text-default me-2"></i>Activities
                                                        </span>
                                                        <i class="ti ti-arrow-right"></i>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <a href="profile-settings.html" class="btn btn-menubar">
                                <i class="ti ti-settings-cog"></i>
                            </a>
                        </div>
                        <div class="d-flex align-items-center">
                            <div class="me-1">
                                <a href="#" class="reload-skeleton btn btn-menubar">
                                    <i class="fa ti ti-reload"></i>
                                </a>
                            </div>
                            <div class="me-1">
                                <a href="#" class="btn btn-menubar btnFullscreen">
                                    <i class="ti ti-maximize"></i>
                                </a>
                            </div>
                            <div class="dropdown me-1">
                                <a href="#" class="btn btn-menubar" data-bs-toggle="dropdown">
                                    <i class="ti ti-layout-grid-remove"></i>
                                </a>
                                <div class="dropdown-menu dropdown-menu-end">
                                    <div class="card mb-0 border-0 shadow-none">
                                        <div class="card-header">
                                            <h4>Applications</h4>
                                        </div>
                                        <div class="card-body">
                                            <a href="calendar.html" class="d-block pb-2">
                                                <span class="avatar avatar-md bg-transparent-dark me-2"><i
                                                        class="ti ti-calendar text-gray-9"></i></span>Calendar
                                            </a>
                                            <a href="todo.html" class="d-block py-2">
                                                <span class="avatar avatar-md bg-transparent-dark me-2"><i
                                                        class="ti ti-subtask text-gray-9"></i></span>To Do
                                            </a>
                                            <a href="notes.html" class="d-block py-2">
                                                <span class="avatar avatar-md bg-transparent-dark me-2"><i
                                                        class="ti ti-notes text-gray-9"></i></span>Notes
                                            </a>
                                            <a href="file-manager.html" class="d-block py-2">
                                                <span class="avatar avatar-md bg-transparent-dark me-2"><i
                                                        class="ti ti-folder text-gray-9"></i></span>File Manager
                                            </a>
                                            <a href="kanban-view.html" class="d-block py-2">
                                                <span class="avatar avatar-md bg-transparent-dark me-2"><i
                                                        class="ti ti-layout-kanban text-gray-9"></i></span>Kanban
                                            </a>
                                            <a href="invoices.html" class="d-block py-2 pb-0">
                                                <span class="avatar avatar-md bg-transparent-dark me-2"><i
                                                        class="ti ti-file-invoice text-gray-9"></i></span>Invoices
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="me-1">
                                <a href="chat.html" class="btn btn-menubar position-relative">
                                    <i class="ti ti-brand-hipchat"></i>
                                    <span
                                        class="badge bg-info rounded-pill d-flex align-items-center justify-content-center header-badge">5</span>
                                </a>
                            </div>
                            <div class="me-1">
                                <a href="email.html" class="btn btn-menubar">
                                    <i class="ti ti-mail"></i>
                                </a>
                            </div>
                            <div class="me-1 notification_item">
                                <a href="#" class="btn btn-menubar position-relative me-1"
                                    id="notification_popup" data-bs-toggle="dropdown">
                                    <i class="ti ti-bell"></i>
                                    <span class="notification-status-dot"></span>
                                </a>
                                <div class="dropdown-menu dropdown-menu-end notification-dropdown p-4">
                                    <div
                                        class="d-flex align-items-center justify-content-between border-bottom p-0 pb-3 mb-3">
                                        <h4 class="notification-title">Notifications (2)</h4>
                                        <div class="d-flex align-items-center">
                                            <a href="#" class="text-primary fs-15 me-3 lh-1">Mark all as
                                                read</a>
                                            <div class="dropdown">
                                                <a href="javascript:void(0);" class="bg-white dropdown-toggle"
                                                    data-bs-toggle="dropdown">
                                                    <i class="ti ti-calendar-due me-1"></i>Today
                                                </a>
                                                <ul class="dropdown-menu mt-2 p-3">
                                                    <li>
                                                        <a href="javascript:void(0);" class="dropdown-item rounded-1">
                                                            This Week
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a href="javascript:void(0);" class="dropdown-item rounded-1">
                                                            Last Week
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a href="javascript:void(0);" class="dropdown-item rounded-1">
                                                            Last Month
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="noti-content">
                                        <div class="d-flex flex-column">
                                            <div class="border-bottom mb-3 pb-3">
                                                <a href="activity.html">
                                                    <div class="d-flex">
                                                        <span class="avatar avatar-lg me-2 flex-shrink-0">
                                                            <img src="" alt="Profile">
                                                        </span>
                                                        <div class="flex-grow-1">
                                                            <p class="mb-1"><span
                                                                    class="text-dark fw-semibold">Shawn</span>
                                                                performance in Math is below the threshold.</p>
                                                            <span>Just Now</span>
                                                        </div>
                                                    </div>
                                                </a>
                                            </div>
                                            <div class="border-bottom mb-3 pb-3">
                                                <a href="activity.html" class="pb-0">
                                                    <div class="d-flex">
                                                        <span class="avatar avatar-lg me-2 flex-shrink-0">
                                                            <img src="" alt="Profile">
                                                        </span>
                                                        <div class="flex-grow-1">
                                                            <p class="mb-1"><span
                                                                    class="text-dark fw-semibold">Sylvia</span> added
                                                                appointment on 02:00 PM</p>
                                                            <span>10 mins ago</span>
                                                            <div
                                                                class="d-flex justify-content-start align-items-center mt-1">
                                                                <span class="btn btn-light btn-sm me-2">Deny</span>
                                                                <span class="btn btn-primary btn-sm">Approve</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </a>
                                            </div>
                                            <div class="border-bottom mb-3 pb-3">
                                                <a href="activity.html">
                                                    <div class="d-flex">
                                                        <span class="avatar avatar-lg me-2 flex-shrink-0">
                                                            <img src="" alt="Profile">
                                                        </span>
                                                        <div class="flex-grow-1">
                                                            <p class="mb-1">New student record <span
                                                                    class="text-dark fw-semibold"> George</span> is
                                                                created by <span
                                                                    class="text-dark fw-semibold">Teressa</span></p>
                                                            <span>2 hrs ago</span>
                                                        </div>
                                                    </div>
                                                </a>
                                            </div>
                                            <div class="border-0 mb-3 pb-0">
                                                <a href="activity.html">
                                                    <div class="d-flex">
                                                        <span class="avatar avatar-lg me-2 flex-shrink-0">
                                                            <img src="" alt="Profile">
                                                        </span>
                                                        <div class="flex-grow-1">
                                                            <p class="mb-1">A new teacher record for <span
                                                                    class="text-dark fw-semibold">Elisa</span> </p>
                                                            <span>09:45 AM</span>
                                                        </div>
                                                    </div>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="d-flex p-0">
                                        <a href="#" class="btn btn-light w-100 me-2">Cancel</a>
                                        <a href="activity.html" class="btn btn-primary w-100">View All</a>
                                    </div>
                                </div>
                            </div>
                            <div class="dropdown profile-dropdown">
                                <a href="javascript:void(0);" class="dropdown-toggle d-flex align-items-center"
                                    data-bs-toggle="dropdown">
                                    <span class="avatar avatar-sm online">
                                        <img src="{{ $authUser && $authUser->profile_image ? asset($authUser->profile_image) : asset('default/profile-avatar.svg') }}" alt="User Avatar" class="img-fluid rounded-circle">
                                    </span>
                                </a>
                                <div class="dropdown-menu shadow-none">
                                    <div class="card mb-0">
                                        <div class="card-header">
                                            <div class="d-flex align-items-center">
                                                <span class="avatar avatar-lg me-2 avatar-rounded">
                                                    <img src="{{ $authUser && $authUser->profile_image ? asset($authUser->profile_image) : asset('default/profile-avatar.svg') }}"
                                                        alt="User Avatar">
                                                </span>
                                                <div>
                                                    <h5 class="mb-0">
                                                        {{ $authUser ? $authUser->first_name . ' ' . ($authUser->last_name ?? '') : 'Guest' }}
                                                    </h5>
                                                    <p class="fs-12 fw-medium mb-0">
                                                        {{ $authUser ? $authUser->email : '' }}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="card-body ms-2">
                                            @can('view:Dashboard')
                                                <a class="dropdown-item d-inline-flex align-items-center p-0 py-2"
                                                    href="{{ url('/profile') }}">
                                                    <i class="ti ti-user-circle me-1"></i>My Profile
                                                </a>
                                            @endcan
                                            @can('view:Profile::Settings')
                                                <a class="dropdown-item d-inline-flex align-items-center p-0 py-2"
                                                    href="{{ url('/profile/settings') }}">
                                                    <i class="ti ti-settings me-1"></i>Settings
                                                </a>
                                            @endcan
                                            @can('view:Profile::Account')
                                                <a class="dropdown-item d-inline-flex align-items-center p-0 py-2"
                                                    href="{{ url('/profile/account') }}">
                                                    <i class="ti ti-circle-arrow-up me-1"></i>My Account
                                                </a>
                                            @endcan
                                            @can('view:Profile::KnowledgeBase')
                                                <a class="dropdown-item d-inline-flex align-items-center p-0 py-2"
                                                    href="{{ url('/profile/knowledge-base') }}">
                                                    <i class="ti ti-question-mark me-1"></i>Knowledge Base
                                                </a>
                                            @endcan
                                        </div>
                                        <div class="card-footer">
                                            <a class="dropdown-item d-inline-flex align-items-center p-0 py-2"
                                                href="{{ url('logout') }}">
                                                <i class="ti ti-login me-2"></i>Logout
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Mobile Menu -->
                <div class="dropdown mobile-user-menu">
                    <a href="javascript:void(0);" class="nav-link dropdown-toggle" data-bs-toggle="dropdown"
                        aria-expanded="false"><i class="fa fa-ellipsis-v"></i></a>
                    <div class="dropdown-menu dropdown-menu-end">
                        <a class="dropdown-item" href="profile.html">My Profile</a>
                        <a class="dropdown-item" href="profile-settings.html">Settings</a>
                        <a class="dropdown-item" href="{{ route('logout') }}">Logout</a>
                    </div>
                </div>
                <!-- /Mobile Menu -->
            </div>
        </div>
        <!-- /Header -->
        <!-- Sidebar -->
        @php
            $sidebar = app(\App\Services\SkeletonService::class)->getAuthenticatedUser()['sidebar'];
        @endphp
        <div class="sidebar" id="sidebar">
            <!-- Logo -->
            <div class="sidebar-logo">
                <a href="{{ url('/dashboard') }}" class="logo logo-normal">
                    <img src="{{ asset('treasury/company/logo/logo.svg') }}" alt="Logo">
                </a>
                <a href="{{ url('/dashboard') }}" class="logo-small">
                    <img src="{{ asset('treasury/company/favicon/favicon.svg') }}" alt="Logo">
                </a>
                <a href="{{ url('/dashboard') }}" class="dark-logo">
                    <img src="{{ asset('treasury/company/logo/logo.svg') }}" alt="Logo">
                </a>
            </div>
            <!-- /Logo -->
            <div class="sidebar-inner">
                <div id="sidebar-menu" class="sidebar-menu">
                    @if (empty($sidebar))
                        <div class="text-center p-4">
                            <p>You don't have permissions to view the navigations.</p>
                            <a href="{{ route('logout') }}" class="btn btn-primary">Logout</a>
                        </div>
                    @else
                        <ul>
                            @foreach ($sidebar as $module)
                                <li class="menu-title"><span>{{ $module['name'] }}</span></li>
                                <li>
                                    <ul>
                                        @foreach ($module['sections'] as $section)
                                            @if (!empty($section['items']))
                                                <li class="submenu">
                                                    <a href="javascript:void(0);">
                                                        <i class="{{ $section['icon'] ?? 'ti ti-folder' }}"></i>
                                                        <span>{{ $section['name'] }}</span>
                                                        <span class="menu-arrow"></span>
                                                    </a>
                                                    <ul>
                                                        @foreach ($section['items'] as $item)
                                                            <li>
                                                                <a
                                                                    href="{{ $item['route'] }}">{{ $item['name'] }}</a>
                                                            </li>
                                                        @endforeach
                                                    </ul>
                                                </li>
                                            @else
                                                <li>
                                                    <a href="{{ $section['route'] }}">
                                                        <i class="{{ $section['icon'] ?? 'ti ti-folder' }}"></i>
                                                        <span>{{ $section['name'] }}</span>
                                                    </a>
                                                </li>
                                            @endif
                                        @endforeach
                                    </ul>
                                </li>
                            @endforeach
                        </ul>
                    @endif
                </div>
            </div>
        </div>
        <!-- /Sidebar -->
        <!-- Page Wrapper -->
        <div class="page-wrapper">
            @yield('content')
            <div class="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
                <p class="mb-0">2020 - {{ date('Y') }} &copy; Got It.</p>
                <p>Designed &amp; Developed By <a href="javascript:void(0);" class="text-primary">Digital Kuppam</a>
                </p>
            </div>
        </div>
        <!-- /Page Wrapper -->
    </div>
    <!-- /Main Wrapper -->
    <!-- Skeleton Pack JS -->
    {{-- <script type="text/javascript" src="{{ asset('skeleton/skeleton-pack.min.js') }}"></script> --}}
    @if ((auth()->check() && file_exists(public_path('build/manifest.json'))) || file_exists(public_path('hot')))
        @vite(['resources/js/system.js'])
    @else
        @vite(['resources/js/lander.js'])
    @endif
    <!-- Dynamic Bottom Scripts -->
    @yield('bottom-script')
    <script src="{{asset('skeleton/gotit.min.js')}}"></script>
    <!-- Dynamic Bottom Styles -->
    @yield('bottom-style')
</body>
</html>
