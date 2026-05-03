@section('title', 'unique')
<!--
  /$$$$$$   /$$$$$$  /$$$$$$$$       /$$$$$$ /$$$$$$$$
 /$$__  $$ /$$__  $$|__  $$__/      |_  $$_/|__  $$__/
| $$  \__/| $$  \ $$   | $$           | $$     | $$
| $$ /$$$$| $$  | $$   | $$           | $$     | $$
| $$|_  $$| $$  | $$   | $$           | $$     | $$
| $$  \ $$| $$  | $$   | $$           | $$     | $$
|  $$$$$$/|  $$$$$$/   | $$          /$$$$$$   | $$
 \______/  \______/    |__/         |______/   |__/
-->
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <!-- Meta Essentials -->
    <meta charset="UTF-8">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="index, follow">
    <meta name="author" content="Got-It HR Solutions">
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
    <meta name="twitter:image" content="{{ asset('treasury/company/favicon/favicon.png') }}">
    <!-- Fonts and Favicon -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Nunito:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
        rel="stylesheet">
    <link rel="shortcut icon" href="{{ asset('treasury/company/favicon/favicon.svg') }}" type="image/x-icon">
    <!-- Skeleton Pack CSS -->
    <link rel="stylesheet" href="{{ asset('skeleton/skeleton-pack.min.css') }}" />
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
    @vite(['resources/css/lander.css'])
    @endif
    <!-- Skeleton CSS -->
    <link rel="stylesheet" href="{{ asset('skeleton/skeleton.min.css') }}" />
    <!-- CSS Libraries -->
    <link href="{{ asset('libs/anime/aos/aos.css') }}" rel="stylesheet">
    <link href="{{ asset('libs/sliders/swiper/swiper.css') }}" rel="stylesheet">
    <!-- Theme CSS -->
    <link rel="stylesheet" href="{{ asset('treasury/pack/css/style.css') }}" />
    <link rel="stylesheet" href="{{ asset('treasury/landing/pages/auth/auth.css') }}" />
    <!-- Dynamic Top Scripts -->
    @yield('top-script')
    <!-- Dynamic Top Styles -->
    @yield('top-style')
</head>

<body class="bg-white">
    <div id="global-loader" style="display: none;">
        <div class="page-loader"></div>
    </div>
    <!-- Main Wrapper -->
    <div class="main-wrapper">
        <div class="container-fluid p-0">
            <div class="w-100 overflow-hidden flex-wrap d-block vh-100">
                <div class="row">
                    <!-- <div class="col-lg-5">
                        <div
                            class="auth-background position-relative d-lg-flex align-items-center justify-content-center d-none flex-wrap vh-100">
                            <div class="authentication-card w-100">
                                <div class="authen-overlay-item border w-100">
                                    <h1 class="text-white display-1">
                                        Smart HR & Payroll <br> Made Effortless.
                                    </h1>
                                    <div class="my-4 mx-auto authen-overlay-img">
                                        <img src="{{ asset('treasury/company/favicon/favicon.png') }}"
                                            alt="HR & Payroll Solutions">
                                    </div>
                                    <div>
                                        <p class="text-white fs-20 fw-semibold text-center">
                                            Simplify payroll & workforce management with geofence and biometric
                                            tracking.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> -->
                    <div class="col-lg-12 col-md-12 col-sm-12">
                        @yield('content')
                    </div>
                </div>
            </div>
        </div>
        <!-- /Main Wrapper -->
    </div>
    <!-- Skeleton Pack JS -->
    <script type="text/javascript" src="{{ asset('skeleton/skeleton-pack.min.js') }}"></script>
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
    @vite(['resources/js/lander.js'])
    @endif
    <!-- JS Libraries -->
    <script type="text/javascript" src="{{ asset('libs/anime/aos/aos.js') }}"></script>
    <script type="text/javascript" src="{{ asset('libs/sliders/swiper/swiper.js') }}"></script>
    <!-- Theme JS -->
    <!-- Dynamic Bottom Scripts -->
    @yield('bottom-script')
    <!-- Dynamic Bottom Styles -->
    @yield('bottom-style')
</body>

</html>