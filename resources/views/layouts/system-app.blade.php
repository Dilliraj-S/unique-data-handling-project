@section('title', 'UniQue | Unlock powerful data handling capabilities today!')
<!--
  /$$$$$$        /$$               /$$
 /$$__  $$      | $$              |__/
| $$  \ $$  /$$$$$$$ /$$$$$$/$$$$  /$$ /$$$$$$$
| $$$$$$$$ /$$__  $$| $$_  $$_  $$| $$| $$__  $$
| $$__  $$| $$  | $$| $$ \ $$ \ $$| $$| $$  \ $$
| $$  | $$| $$  | $$| $$ | $$ | $$| $$| $$  | $$
| $$  | $$|  $$$$$$$| $$ | $$ | $$| $$| $$  | $$
|__/  |__/ \_______/|__/ |__/ |__/|__/|__/  |__/
-->
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    class="light-style layout-navbar-fixed layout-menu-fixed layout-compact" dir="ltr" data-theme="theme-default"
    data-template="UniQue">

<head>
    <!-- Meta Essentials -->
    <meta charset="UTF-8">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="index, follow">
    <meta name="author" content="UniQue Data Solutions">
    <!-- SEO Meta Tags -->
    <title>@yield('title')</title>
    <meta name="description"
        content="UniQue is the ultimate application for managing massive datasets, intricate mappings, and complex workflows. Unlock powerful data handling capabilities today!">
    <meta name="keywords"
        content="data management software, big data solutions, complex mapping tools, data workflow automation, UniQue application, enterprise data handling, data processing platform, large-scale data analytics, workflow optimization, complex data mappings, UniQue software, data pipeline management, scalable data solutions, enterprise-grade data management, advanced data mapping, data transformation tools, automated data workflows">
    <!-- Geo Location -->
    <meta name="geo.placename" content="Global">
    <meta name="geo.position" content="0.000000, 0.000000">

    <link rel="canonical" href="http://localhost/">
    <!-- Open Graph for Social Media -->
    <meta property="og:title" content="Powerful Data Management & Mapping Software | UniQue">
    <meta property="og:description"
        content="Experience UniQue: the application designed for massive data handling, advanced mappings, and automated workflows. Empower your business with cutting-edge data solutions.">
    <meta property="og:url" content="http://localhost/">
    <meta property="og:image" content="http://localhost/images/og-image.jpg">
    <meta property="og:type" content="website">
    <!-- Twitter Meta -->
    <meta name="twitter:title" content="Advanced Data Solutions | UniQue Application">
    <meta name="twitter:description"
        content="UniQue provides unparalleled capabilities for handling massive datasets, intricate mappings, and workflow automation. Streamline your data processes now.">
    <meta name="twitter:image" content="http://localhost/images/twitter-image.jpg">
    <!-- Fonts and Favicon -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap" rel="stylesheet">
    <link rel="shortcut icon" href="{{ asset('treasury/company/favicon/favicon.jpg') }}" type="image/x-icon">
    <!-- Logged User Data -->
    <script>
        window.userId = {{ auth()->id() }};
    </script>

    <!-- Dynamic Styles -->
    @if ((auth()->check() && file_exists(public_path('build/manifest.json'))) || file_exists(public_path('hot')))
    @vite(['resources/css/system.css'])
    @else
    @vite(['resources/css/lander.css'])
    @endif
    @yield('top-style')
    @yield('top-script')

</head>

<body>
    <div class="layout-wrapper layout-content-navbar">
        <div class="layout-container">
            <!-- Menu -->
            <aside id="layout-menu" class="layout-menu menu-vertical menu bg-menu-theme">
                <div class="app-brand">
                    <a href="#" class="app-brand-link">
                        <span class="app-brand-logo">
                            <img src="{{ asset('treasury/company/favicon/favicon.png') }}" width="">
                        </span>
                        <span class="app-brand-flow">
                            <img src="{{ asset('treasury/company/logo/unq logo.png') }}">
                        </span>
                    </a>
                    <a href="javascript:void(0);" class="layout-menu-toggle menu-link text-large ms-auto">
                        <i class="mdi mdi-chevron-double-left"></i>
                    </a>
                </div>
                <ul class="menu-inner py-1 mt-2">
                    <li class="text-center w-100 mt-2 menu-profile">                                    
                        <a href="/profile/profile" class="text-dark">
                            <div>
                                <img src="{{ !empty(App\Facades\Skeleton::getAuthenticatedUser()->profile) ? asset(App\Facades\Skeleton::getAuthenticatedUser()->profile) : asset('treasury/images/common/profile/profile-banner.png') }}"
                                    alt
                                    class="w-px-100 h-px-100 rounded-circle border border-3" />
                            </div>
                            <div class="mt-1 fw-bold" data-i18n="Unique">
                                {{ App\Facades\Skeleton::getAuthenticatedUser()->first_name . ' ' . App\Facades\Skeleton::getAuthenticatedUser()->last_name }}
                            </div>
                            <div class="mt-1 mx-auto border border-primary bg-white text-primary rounded-pill fw-semibold py-1 px-3 text-center" style="width: fit-content;" data-i18n="Unique">
                                {{ App\Facades\Skeleton::getAuthenticatedUser()->user_id }}
                            </div>

                            <div class="mt-1 badge bg-primary px-3 sf-10 rounded-pill" data-i18n="Unique"></div>
                        </a>
                    </li>
                    @php
                    $sidebar = app(\App\Services\SkeletonService::class)->getAuthenticatedUser()['sidebar'];
                    @endphp
                    @if (!$sidebar)
                    <div class="mt-1 px-3 sf-10">
                        <h6>No Modules Found for you 😨</h6>
                    </div>
                    @endif
                    @foreach ($sidebar as $module)
                    <li class="menu-header fw-medium mt-2">
                        <span class="menu-header-text fw-bold text-primary"
                            data-i18n="{{ $module['name'] }}">{{ $module['name'] }}</span>
                    </li>

                    @foreach ($module['sections'] as $section)
                    @if (!empty($section['items']))
                    <li class="menu-item">
                        <a href="javascript:void(0);" class="menu-link menu-toggle">
                            <i class="{{ $section['icon'] ?? 'ti ti-folder' }} me-1"></i>
                            <div data-i18n="{{ $section['name'] }}">{{ $section['name'] }}</div>
                        </a>
                        <ul class="menu-sub">
                            @foreach ($section['items'] as $item)
                            <li class="menu-item">
                                <a href="{{ $item['route'] }}" class="menu-link">
                                    <div data-i18n="{{ $item['name'] }}">{{ $item['name'] }}</div>
                                </a>
                            </li>
                            @endforeach
                        </ul>
                    </li>
                    @else
                    <li class="menu-item">
                        <a href="{{ $section['route'] }}" class="menu-link">
                            <i class="{{ $section['icon'] ?? 'ti ti-folder' }} me-1"></i>
                            <div data-i18n="{{ $section['name'] }}">{{ $section['name'] }}</div>
                        </a>
                    </li>
                    @endif
                    @endforeach
                    @endforeach
                </ul>
            </aside>
            <!-- / Menu -->


            <!-- Layout container -->
            <div class="layout-page">
                <!-- Navbar -->
                <nav class="layout-navbar container-xxl navbar navbar-expand-xl navbar-detached align-items-center bg-navbar-theme"
                    id="layout-navbar">
                    <div class="layout-menu-toggle navbar-nav align-items-xl-center me-4 me-xl-0   d-xl-none ">
                        <a class="nav-item nav-link px-0 me-xl-6" href="javascript:void(0)">
                            <i class="ri-menu-fill ri-22px"></i>
                        </a>
                    </div>
                    <div class="navbar-nav-right d-flex align-items-center" id="navbar-collapse">
                        <!-- Search -->
                        <div class="navbar-nav align-items-center">
                            <div class="nav-item navbar-search-wrapper mb-0">
                                <a class="nav-item nav-link search-toggler fw-normal px-0" href="javascript:void(0);">
                                    <i class="ri-search-line ri-22px scaleX-n1-rtl me-3"></i>
                                    <span class="d-none d-md-inline-block text-muted">Search (Ctrl+/)</span>
                                </a>
                            </div>
                        </div>
                        <!-- /Search -->

                        <ul class="navbar-nav flex-row align-items-center ms-auto">
                            <!-- Style Switcher -->
                            <li class="nav-item dropdown-style-import dropdown-toggle-import dropdown me-1 me-xl-0">
                                <a class="nav-link btn btn-text-secondary rounded-pill btn-icon dropdown-toggle hide-arrow waves-effect waves-light"
                                    href="javascript:void(0);" data-bs-toggle="dropdown">
                                    <i class="ri-22px ri-upload-line"></i>
                                </a>
                                <ul class="dropdown-menu dropdown-menu-end dropdown-menu-import dropdown-styles">
                                    <li class="active-imports-placeholder"></li>

                                    {{-- @foreach($logs as $log)
            @php
                $progress = json_decode($log->progress, true) ?? [];
            @endphp

            <li class="mb-2">
                <div class="border rounded border border-1 p-2 ">
                    <div class="d-flex justify-content-between align-items-center ">
                        <div>
                                <span class="badge bg-white text-dark border border-1 rounded-pill sf-10 me-2">{{ $log->file}}</span>

                                    <span class="badge bg-warning text-white border border-1 rounded-pill sf-10 me-2">{{ $log->type }}</span>
                    </div>
                    <div>
                        <span class="import-status sf-10">{{ $log->status }}</span>
                    </div>
            </div>

            @if ($log->type=="import")
            <div class="d-flex justify-content-between py-1 px-1">
                <div>
                    <small>inserted: {{ $progress['inserted_count'] ?? 0 }}/{{ $progress['total'] ?? 0 }}</small><br>
                    <small>rejected: {{ $progress['rejected_count'] ?? 0 }}</small>
                </div>
            </div>
            @endif
        </div>
        </li>
        @endforeach --}}

        <li class="dropdown-divider"></li>
        </ul>

        </li>

        <li class="nav-item">
            <div class="me-1">
                <a href="#" class="reload-skeleton btn btn-text-secondary">
                    <i class="ri-refresh-line"></i>

                </a>
            </div>
        </li>

        <!-- Notification -->
        <li class="nav-item dropdown-notifications navbar-dropdown dropdown me-4 me-xl-1">
            <ul class="navbar-nav flex-row align-items-center ms-auto">
                <!-- Notification -->
                <li class="nav-item dropdown-notifications navbar-dropdown dropdown me-3 me-xl-1">
                    <a class="nav-link btn btn-text-secondary rounded-pill btn-icon dropdown-toggle hide-arrow"
                        href="javascript:void(0);" data-bs-toggle="dropdown"
                        data-bs-auto-close="outside" aria-expanded="false">
                        <i class="mdi mdi-bell-outline mdi-24px"></i>
                        <span
                            class="position-absolute top-0 start-50 translate-middle-y badge badge-dot bg-danger mt-2 border"></span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end py-0">
                        <li class="dropdown-menu-header border-bottom">
                            <div class="dropdown-header d-flex align-items-center py-3">
                                <h6 class="mb-0 me-auto">Notification</h6>
                                <span class="notify-count"></span>
                            </div>
                        </li>
                        <li class="dropdown-notifications-list scrollable-container">
                            <ul class="list-group list-group-flush notify-list">
                                <li
                                    class="list-group-item list-group-item-action dropdown-notifications-item">
                                    <div class="text-center fw-bold">
                                        <span><i
                                                class="fa-duotone fa-face-fearful sf-28"></i></span>
                                        <p class="m-0">Nothing to Show...!</p>
                                    </div>
                                </li>
                            </ul>
                        </li>
                        {{-- <li class="dropdown-menu-footer border-top p-2">
                                                <a href="{{ route('company.user.page', ['page' => 'profile#notifications']) }}"
                        class="btn btn-primary d-flex justify-content-center">
                        Go to Notifications
                        </a>
                </li> --}}
            </ul>
        </li>
        <!--/ Notification -->
        </ul>
        </li>
        <!--/ Notification -->
        <!-- User -->
        <li class="nav-item navbar-dropdown dropdown-user dropdown">
            <a class="nav-link dropdown-toggle hide-arrow" href="javascript:void(0);"
                data-bs-toggle="dropdown">
                <div class="avatar avatar-online">
                    <img src="{{ !empty(App\Facades\Skeleton::getAuthenticatedUser()->profile) ? asset(App\Facades\Skeleton::getAuthenticatedUser()->profile) : asset('treasury/images/common/profile/profile-banner.png') }}"
                        alt class="w-px-40 h-auto rounded-circle" />
                </div>
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
                <li>
                    <a class="dropdown-item" href="/profile/profile  ">
                        <div class="d-flex">
                            <div class="flex-shrink-0 me-3">
                                <div class="avatar avatar-online">
                                    <img src="{{ !empty(App\Facades\Skeleton::getAuthenticatedUser()->profile) ? asset(App\Facades\Skeleton::getAuthenticatedUser()->profile) : asset('treasury/images/common/profile/profile-banner.png') }}"
                                        alt class="w-px-40 h-auto rounded-circle" />
                                </div>
                            </div>
                            <div class="flex-grow-1">
                                <span
                                    class="fw-medium d-block"> {{ App\Facades\Skeleton::getAuthenticatedUser()->first_name . ' ' . App\Facades\Skeleton::getAuthenticatedUser()->last_name }}
                                </span>
                                <small
                                    class="text-muted">{{ ucfirst(App\Facades\Skeleton::getAuthenticatedUser()->role['name']) }}
                                </small>
                            </div>
                        </div>
                    </a>
                </li>
                <li>
                    <div class="dropdown-divider"></div>
                </li>
                <li>

                    <a class="dropdown-item" href="{{ url('/profile/profile') }}">
                        <i class="mdi mdi-account-outline me-2"></i>
                        <span class="align-middle">My Profile</span>
                    </a>
                </li>
                <li>
                    <a class="dropdown-item" href="{{ url('/profile/activity') }}">
                        <i class="mdi mdi-sitemap-outline me-2"></i>
                        <span class="align-middle">Activity</span>
                    </a>
                </li>
                <li>
                    <a class="dropdown-item" href="{{ url('/profile/profile#tab-logs') }}">
                        <i class="mdi mdi-login-variant me-2"></i>
                        <span class="align-middle">Log History</span>
                    </a>
                </li>
                <li>
                    <a class="dropdown-item" href="{{ url('/profile/profile#tab-settings') }}">
                        <i class="mdi mdi-lock-reset me-2"></i>
                        <span class="align-middle">Change Password</span>
                    </a>
                </li>

                <li>
                    <div class="dropdown-divider"></div>
                </li>
                <li>
                    <a href="{{ route('logout') }}" class="dropdown-item p-0 m-0">
                        <button type="button" class="btn btn-sm btn-danger w-100">
                            <i class="fa-solid fa-power-off me-2"></i>Logout
                        </button>
                    </a>
                </li>
            </ul>
        </li>
        <!--/ User -->
        </ul>
    </div>
    <!-- Search Small Screens -->
    <div class="navbar-search-wrapper search-input-wrapper d-none">
        <span class="twitter-typeahead" style="position: relative; display: inline-block;">
            <input type="text" class="form-control search-input container-xxl border-0 tt-input"
                placeholder="Search..." style="position: absolute; vertical-align: top;" />
            <div class="tt-menu navbar-search-suggestion ps tt-open"
                style="position: absolute; top: 100%; left: 0px; z-index: 100; display: block; width: 100%; background: #fff; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding:0px !important">
                <div class="gt-suggestions-container">
                    <div class="gt-src-container">
                        <div class="no-src-res-fnd">Start typing and results will appear automatically
                            after 3 characters...</div>
                    </div>
                </div>
                <div class="ps__rail-x" style="left: 0px; bottom: 0px;">
                    <div class="ps__thumb-x" tabindex="0" style="left: 0px; width: 0px;"></div>
                </div>
                <div class="ps__rail-y" style="top: 0px; right: 0px; height: 448px;">
                    <div class="ps__thumb-y" tabindex="0" style="top: 0px; height: 251px;"></div>
                </div>
            </div>
        </span>
        <i class="ri-close-fill search-toggler cursor-pointer"></i>
    </div>
    </nav>
    <!-- / Navbar -->
    <!-- Content wrapper -->
    <div class="content-wrapper">
        <!-- Content -->
        @yield('content')
        <!-- Cropper Modal -->
        <div class="modal fade" id="cropper-img-crop-modal" tabindex="-1"
            aria-labelledby="cropModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered show-popup-modal-size modal-md">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="cropModalLabel">Crop Image</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="crop-container"></div>
                        <div class="ms-3" style="max-width: 200px;">
                            <h6>Preview:</h6>
                            <div class="cropper-crop-preview-area" id="cropper-crop-preview-area"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="cropper-crop-save-btn"
                            class="btn btn-success">Save</button>
                        <button type="button" class="btn btn-secondary"
                            data-bs-dismiss="modal">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
        {{-- @include('panels.includes.popup') --}}
        <!-- / Content -->
        <!-- Footer -->
        <a href="javascript:void(0)" class="add-new-feed-open-btn company-show-popup"
            data-option="cmp_show_latest_news|news_feeds|cmp_show_latest_news_table|-">
            <span class="btn-icon"><i class="fa-solid fa-newspaper"></i></span>
            <span class="btn-text">New Updates</span>
        </a>
        <footer class="content-footer footer bg-footer-theme">
            <div class="container-xxl">
                <div
                    class="footer-container d-flex align-items-center justify-content-between py-4 flex-md-row flex-column">
                    <div class="d-none d-lg-inline-block text-secondary">
                        Unlock powerful data handling capabilities today! - <b
                            class="text-primary">UniQue</b>
                    </div>
                    <div class="text-body mb-2 mb-md-0">
                        ©
                        <script>
                            document.write(new Date().getFullYear());
                        </script>
                        Made with 💖 by
                        <a href="https://digitalkuppam.com/" target="_blank"
                            class="footer-link fw-medium">Digital Kuppam</a>
                    </div>
                </div>
            </div>
        </footer>
        <!-- / Footer -->
        <div class="content-backdrop fade"></div>
    </div>
    <!-- Content wrapper -->
    </div>
    <!-- / Layout page -->
    </div>
    <!-- Overlay -->
    <div class="layout-overlay layout-menu-toggle"></div>
    <div class="drag-target"></div>
    </div>



    @if ((auth()->check() && file_exists(public_path('build/manifest.json'))) || file_exists(public_path('hot')))
    @vite(['resources/js/system.js'])
    @else
    @vite(['resources/js/lander.js'])
    @endif
     {{-- <script src="{{ asset('treasury/panel/js/Unique.js') }}"></script>  --}}
    <!-- Dynamic Bottom Scripts -->
    @yield('bottom-script')
    @yield('bottom-style')
</body>

</html>