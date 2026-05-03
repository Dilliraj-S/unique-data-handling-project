@section('title', 'Gotit | Biometric HR Management Software | Attendance, Payroll, Leave Tracking')
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
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    class="light-style layout-navbar-fixed layout-menu-fixed layout-compact" dir="ltr" data-theme="theme-default"
    data-template="gotit">
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
    <link rel="canonical" href="https://www.gotit4all.com/">
    <!-- Open Graph for Social Media -->
    <meta property="og:title" content="Biometric HR Management Software | Attendance, Payroll, Leave Tracking | Got-It">
    <meta property="og:description"
        content="Discover Got-It HR software: biometric attendance, payroll management, leave tracking, and workforce optimization. Simplify HR processes for your business.">
    <meta property="og:url" content="https://www.gotit4all.com/">
    <meta property="og:image" content="https://www.gotit4all.com/images/og-image.jpg">
    <meta property="og:type" content="website">
    <!-- Twitter Meta -->
    <meta name="twitter:title" content="Biometric HR Software | Attendance, Payroll, Leave Tracking | Got-It">
    <meta name="twitter:description"
        content="Streamline HR management with Got-It HR software. Manage attendance, payroll, leave tracking, and workforce performance seamlessly.">
    <meta name="twitter:image" content="https://www.gotit4all.com/images/twitter-image.jpg">
    <!-- Fonts and Favicon -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Nunito:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
        rel="stylesheet">
    <link rel="shortcut icon" href="{{ asset('treasury/company/favicon/favicon.svg') }}" type="image/x-icon">
    <!-- Core CSS -->
    <link rel="stylesheet" href="{{ asset('treasury/global/global.min.css') }}" />
    <!-- Landing CSS -->
    <link href="{{ asset('treasury/landing/css/landing.css') }}" rel="stylesheet">
    <style>
        .logo {
            width: 150px !important;
            height: 150px !important;
        }
        .user-profile-header-banner {
            height: 300px;
        }
        .section-py {
            margin-bottom: 200px;
        }
        .card-bg {
            background: linear-gradient(135deg,
                    color-mix(in srgb, var(--accent-color), transparent 95%) 50%,
                    color-mix(in srgb, var(--accent-color), transparent 98%) 25%, transparent 50%);
        }
        .got-it-buttons a {
            background-color: var(--accent-color);
            border-color: var(--accent-color);
            color: var(--contrast-color);
            padding: 0.75rem 2.5rem;
            border-radius: 50px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .social-links a {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid color-mix(in srgb, var(--default-color), transparent 50%);
            font-size: 16px;
            color: color-mix(in srgb, var(--default-color), transparent 20%);
            margin-right: 10px;
            transition: 0.3s;
        }
         .service-image {
            height: 300px;
            aspect-ratio:3/3;
            object-fit:contain;
        }
        .section-py {
            margin-bottom: 250px;
        }
        /* @media (max-width: 780px) {*/
        /*    .section-py {*/
        /*        margin-top: 500px;*/
        /*    }*/
        /*    .company-profile {*/
        /*        margin-top: 170px;*/
        /*    }*/
        /*}*/
        /*@media (max-width: 480px) {*/
        /*    .section-py {*/
        /*        margin-top: 620px;*/
        /*    }*/
        /*} */
    </style>
</head>
@php
$orgInfo = json_decode($org_data->org_info_json, true);
$address_data = json_decode($org_data->address_json ?? '{}', true);
@endphp
<body class="index-page">
    <main class="main">
        <div class="container-fluid" data-aos="fade-up" data-aos-delay="100">
            <!-- Banner -->
            <div class="user-profile-header-banner position-relative section-py"
                style="height: 300px; background: url('https://bslthemes.com/html/mcard/theme_colors/blue/images/slide-bg.jpg') center/cover no-repeat;">
                <div class="position-absolute top-100 start-50 translate-middle w-100 p-3 company-profile">
                    <div class="col-lg-10 col-md-10 col-sm-12 mx-auto ">
                        <div class="card">
                            <div class="card-body">
                                <div class="row">
                                    <!-- Profile Image -->
                                    <div class="col-12 col-md-4 text-center">
                                       <img src="{{ $org_data->logo ? asset($org_data->logo) : asset('treasury/images/common/default/default-s.svg') }}" 
     alt="Profile Picture" 
     class="img-fluid rounded">

                                            <div class="social-links d-flex justify-content-center mt-3 mb-3">
                                                @if(!empty($orgInfo['linkedin_url']))
                                                    <a href="{{ old('linkedin_url', $orgInfo['linkedin_url']) }}" target="_blank"><i class="fab fa-linkedin-in"></i></a>
                                                @endif
                                                @if(!empty($orgInfo['x_url']))
                                                    <a href="{{ old('x_url', $orgInfo['x_url']) }}" target="_blank"><i class="fab fa-x-twitter"></i></a>
                                                @endif
                                                @if(!empty($orgInfo['facebook_url']))
                                                    <a href="{{ old('facebook_url', $orgInfo['facebook_url']) }}" target="_blank"><i class="fab fa-facebook-f"></i></a>
                                                @endif
                                                @if(!empty($orgInfo['instagram_url']))
                                                    <a href="{{ old('instagram_url', $orgInfo['instagram_url']) }}" target="_blank"><i class="fab fa-instagram"></i></a>
                                                @endif
                                                @if(!empty($orgInfo['youtube_url']))
                                                    <a href="{{ old('youtube_url', $orgInfo['youtube_url']) }}" target="_blank"><i class="fab fa-youtube"></i></a>
                                                @endif
                                            </div>
                                    </div>
                                    <!-- Profile Details -->
                                    <div class="col-12 col-md-8">
                                        <h3>{{ $org_data->name }}</h3>
                                        <h5 class="badge bg-success rounded-pill p-2">
                                            {{ \App\Http\Classes\SelectHelper::getValue('OPT', $org_data->org_type) }}
                                        </h5>
                                        <p class="badge bg-success rounded-pill p-2">{{ \App\Http\Classes\SelectHelper::getValue('OPT', $org_data->org_size) }}</p>
                                        <p>
                                            {{ old('description', $orgInfo['description'] ?? '') }}
                                        </p>
                                        <table class="table borderless">
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <h6><i class="fas fa-map-marker-alt fa-lg me-2"></i> Address
                                                        </h6>
                                                    </td>
                                                    <td><small>{{ ($address_data['address'] ?? '') }}</small></td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <h6><i class="fas fa-phone fa-lg me-2"></i> Phone</h6>
                                                    </td>
                                                    <td>
                                                        <small>
                                                            <a href="tel:+91{{ $org_data->phone ?? '' }}">
                                                                {{ '+91 ' . wordwrap($org_data->phone ?? '', 5, ' ', true) }}
                                                            </a>
                                                        </small>
                                                    </td>

                                                </tr>
                                                <tr>
                                                    <td>
                                                        <h6><i class="fas fa-envelope fa-lg me-2"></i> Email</h6>
                                                    </td>
                                                    <td>
                                                        <small>
                                                            <a href="mailto:{{ $org_data->email }}">{{ $org_data->email }}</a>
                                                        </small>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <!-- Contact Button -->
                                    <div class="got-it-buttons text-center">
                                        <a href="#contact" class="btn btn-primary me-0 me-sm-2 mx-1">Contact Us</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
       @php
    $orgInfo = json_decode($org_data->org_info_json, true);
    $services = $orgInfo['services'] ?? [];
@endphp

@if (!empty($services) && count($services) > 0)
    <section id="services" class="testimonials section">
        <div class="container section-title" data-aos="fade-up">
            <h2>Services</h2>
            <p>Reliable Services that Exceed Expectations, Delivering Exceptional Results</p>
        </div>
        <div class="container">
            @foreach ($services as $index => $service)
                <div class="row align-items-center mb-2">
                    @php
                        $isEven = (intval($index) % 2 === 0);
                    @endphp

                    <!-- Image Section -->
                    <div class="col-lg-4 {{ $isEven ? 'order-1 order-lg-2' : 'order-2 order-lg-1' }} text-center">
                        <img src="{{ asset(!empty($service['image']) ? $service['image'] : 'treasury/images/common/default/default-s.svg') }}" 
                             alt="{{ $service['title'] ?? 'Service Image' }}" 
                             class="img-fluid service-image">
                    </div>

                    <!-- Text Section -->
                    <div class="col-lg-8 {{ $isEven ? 'order-2 order-lg-1' : 'order-1 order-lg-2' }} 
                        d-flex flex-column justify-content-center" 
                        data-aos="fade-up" data-aos-delay="{{ 100 * (intval($index) + 1) }}">
                      <h3><?= html_entity_decode($service['title'] ?? 'Service Title') ?></h3>
                       <p class="fst-italic">
                            {!! html_entity_decode($service['description'] ?? 'Service description goes here.') !!}
                        </p>
                    </div>
                </div>
                <hr>
            @endforeach
        </div>
    </section>
@endif


        <section id="contact" class="request section light-background">
            <!-- Section Title -->
            <div class="container section-title" data-aos="fade-up">
                <h2>Contact Us</h2>
                <p>Manage employee data, track attendance, performance, payroll, and leave efficiently with our
                    comprehensive employee management system. Get in touch for more details or assistance.</p>
            </div>
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <div class="row g-4 g-lg-5">
                    <div class="col-lg-5">
                        <div class="info-box" data-aos="fade-up" data-aos-delay="200">
                            <h3>Contact Info</h3>
                            <p>We're here to help! Reach out to us for inquiries, support, or if you need any assistance
                                regarding our Services.</p>
                            <div class="info-item" data-aos="fade-up" data-aos-delay="300">
                                <div class="icon-box">
                                    <i class="bi bi-geo-alt"></i>
                                </div>
                                <div class="content">
                                    <h4>Our Location</h4>
                                    <p>{{ ($address_data['address'] ?? '') }}</p>
                                    <p>{{ $address_data['state'] }} </p>
                                    <p>India</p>
                                </div>
                            </div>
                            <div class="info-item" data-aos="fade-up" data-aos-delay="400">
                                <div class="icon-box">
                                    <i class="bi bi-telephone"></i>
                                </div>
                                <div class="content">
                                    <h4>Call Us</h4>
                                    <p>
                                        <a href="tel:{{ $org_data->phone }}" class="text-white"> {{ '+91 ' . wordwrap($org_data->phone ?? '', 5, ' ', true) }}</a>
                                    </p>
                                </div>
                            </div>
                            <div class="info-item" data-aos="fade-up" data-aos-delay="500">
                                <div class="icon-box">
                                    <i class="bi bi-envelope"></i>
                                </div>
                                <div class="content">
                                    <h4>Email Us</h4>
                                    <p>
                                        <a href="mailto:{{ $org_data->email }}" class="text-white">{{ $org_data->email }}</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-7">
                        <div class="request-form" data-aos="fade-up" data-aos-delay="300">
                            <h3>Get In Touch</h3>
                            <p>Have questions or need more details? Fill out the form below and we'll get back to you
                                shortly.</p>
                            <form action="{{ route('website_form') }}" method="post" class="got-it-form"
                                data-aos="fade-up" data-aos-delay="200">
                                @csrf
                                <input type="hidden" name="form_type" value="org_contact">
                                <input type="hidden" name="org_id" value="{{ $org_data->org_id }}">
                                <div class="row gy-4">
                                    <div class="col-md-6">
                                        <input type="text" name="name" class="form-control"
                                            placeholder="Your Name" required="">
                                    </div>
                                    <div class="col-md-6">
                                        <input type="text" class="form-control" name="phone"
                                            placeholder="Your Phone Number" required="">
                                    </div>
                                    <div class="col-md-6">
                                        <input type="email" class="form-control" name="email"
                                            placeholder="Your Email" required="">
                                    </div>
                                    <div class="col-md-6">
                                        <input type="text" class="form-control" name="subject"
                                            placeholder="Your Subject" required="">
                                    </div>
                                    <div class="col-12">
                                        <textarea class="form-control" name="message" rows="6" placeholder="Message" required=""></textarea>
                                    </div>
                                    <div class="col-12 text-center">
                                        <button type="submit" class="btn landing-btn">Send Message</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
    <footer>
        <div class="container-fluid copyright text-center bg-light p-3">
            <p>© <span>Copyright</span> <strong class="px-1 sitename">Got-it Services Provided by Digital
                    Kuppam</strong> <span>All Rights
                    Reserved</span></p>
        </div>
    </footer>
    <!-- Scroll Top -->
    <a href="#" id="scroll-top" class="scroll-top d-flex align-items-center justify-content-center"><i
            class="bi bi-arrow-up-short"></i></a>
    <script src="{{ asset('treasury/global/global.min.js') }}"></script>
    <!-- Landing JS-->
    <script src="{{ asset('treasury/landing/js/landing.js') }}"></script>
</body>
</html>
