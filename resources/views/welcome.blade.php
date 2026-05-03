@extends('layouts.lander-app')
@section('content')
    <main class="main">
        <section id="Got-It" class="Got-It section">
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <div class="row align-items-center">
                    <div class="col-lg-6">
                        <div class="got-it-content" data-aos="fade-up" data-aos-delay="200">
                            <div class="company-badge mb-4">
                                <i class="bi bi-calendar2-check me-2"></i>
                                Effortless Attendance
                            </div>
                            <h1 class="mb-4">
                                Simplify Workforce Management with <span class="accent-text">Got-It</span> HR
                            </h1>
                            <p class="mb-4 mb-md-5">
                                Revolutionize your HR processes with Got-It HR software. From biometric attendance to
                                payroll management, simplify and streamline every step of workforce management.
                            </p>
                            <div class="got-it-buttons">
                                <button class="btn btn-primary me-0 me-sm-2 mx-1 show-modal-popup"
                                    data-type="request_a_quote|Starting Quote">Request a Quote</button>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="got-it-Image" data-aos="zoom-out" data-aos-delay="300">
                            <img src="{{ asset('treasury/company/favicon/favicon.png') }}" alt="Got-It Image"
                                class="img-fluid">
                        </div>
                    </div>
                </div>
                <div class="row stats-row gy-4 mt-5" data-aos="fade-up" data-aos-delay="500">
                    <div class="col-lg-3 col-md-6">
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="bi bi-person-square"></i>
                            </div>
                            <div class="stat-content">
                                <h4>Face Recognition</h4>
                                <p class="mb-0">Unique facial tracking.</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="bi bi-fingerprint"></i>
                            </div>
                            <div class="stat-content">
                                <h4>Fingerprint Scan</h4>
                                <p class="mb-0">Accurate attendance capture.</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="bi bi-geo-alt"></i>
                            </div>
                            <div class="stat-content">
                                <h4>Geolocation</h4>
                                <p class="mb-0">GPS-based tracking.</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="bi bi-credit-card"></i>
                            </div>
                            <div class="stat-content">
                                <h4>Card Access</h4>
                                <p class="mb-0">Smart card logging.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section><!-- /Got-It Section -->
        <!-- Get Got-It Section -->
        <section id="get-got-it" class="get-got-it section">
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <div class="row content justify-content-start align-items-center position-relative">
                    <div class="col-lg-7 col-md-12 text-start">
                        <h3 class="fw-bold text-white mb-4">Download the Got-It HR Software for Windows</h3>
                        <p class="mb-4">Download the Got-It HR Software and streamline your HR processes with
                            features like biometric attendance, payroll management, and more. Get started today!</p>
                        <a href="javascript:void(0)" class="btn btn-cta show-modal-popup"
                            data-type="software_download|Call to Action">
                            <i class="bi bi-download me-2"></i> Download for Windows (<b>v0.1</b>)
                        </a>
                        <div class="setup-steps">
                            <b class="text-white">Easy Setup Steps After Download</b>
                            <ol class="text-white">
                                <li><strong>Step 1:</strong> After downloading and installing the Got-It HR Software,
                                    open the application.</li>
                                <li><strong>Step 2:</strong> Enter the domain <strong>gotit4all.com</strong> in the
                                    required field.</li>
                                <li><strong>Step 3:</strong> Enter your unique license key to activate the software.
                                </li>
                                <li><strong>Step 4:</strong> Click the <strong>"Start"</strong> button to connect with
                                    the server and begin using the software.</li>
                            </ol>
                            <p class="mt-3 text-white">If you encounter any issues, feel free to <a href="#contact"
                                    class="text-cta">contact us</a> for support.</p>
                        </div>
                    </div>
                    <div class="col-lg-5 col-md-12 text-center">
                        <div class="preview-image mt-3">
                            <img src="{{ asset('treasury/img/landing/software/got-it-preview.png') }}"
                                alt="Windows App Preview" class="img-fluid rounded">
                        </div>
                    </div>
                    <!-- Abstract Background Elements -->
                    <div class="shape shape-1">
                        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M47.1,-57.1C59.9,-45.6,68.5,-28.9,71.4,-10.9C74.2,7.1,71.3,26.3,61.5,41.1C51.7,55.9,35,66.2,16.9,69.2C-1.3,72.2,-21,67.8,-36.9,57.9C-52.8,48,-64.9,32.6,-69.1,15.1C-73.3,-2.4,-69.5,-22,-59.4,-37.1C-49.3,-52.2,-32.8,-62.9,-15.7,-64.9C1.5,-67,34.3,-68.5,47.1,-57.1Z"
                                transform="translate(100 100)"></path>
                        </svg>
                    </div>
                    <div class="shape shape-2">
                        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M41.3,-49.1C54.4,-39.3,66.6,-27.2,71.1,-12.1C75.6,3,72.4,20.9,63.3,34.4C54.2,47.9,39.2,56.9,23.2,62.3C7.1,67.7,-10,69.4,-24.8,64.1C-39.7,58.8,-52.3,46.5,-60.1,31.5C-67.9,16.4,-70.9,-1.4,-66.3,-16.6C-61.8,-31.8,-49.7,-44.3,-36.3,-54C-22.9,-63.7,-8.2,-70.6,3.6,-75.1C15.4,-79.6,28.2,-58.9,41.3,-49.1Z"
                                transform="translate(100 100)"></path>
                        </svg>
                    </div>
                    <!-- Dot Pattern Groups -->
                    <div class="dots dots-1">
                        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <pattern id="dot-pattern" x="0" y="0" width="20" height="20"
                                patternUnits="userSpaceOnUse">
                                <circle cx="2" cy="2" r="2" fill="currentColor"></circle>
                            </pattern>
                            <rect width="100" height="100" fill="url(#dot-pattern)"></rect>
                        </svg>
                    </div>
                    <div class="dots dots-2">
                        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <pattern id="dot-pattern-2" x="0" y="0" width="20" height="20"
                                patternUnits="userSpaceOnUse">
                                <circle cx="2" cy="2" r="2" fill="currentColor"></circle>
                            </pattern>
                            <rect width="100" height="100" fill="url(#dot-pattern-2)"></rect>
                        </svg>
                    </div>
                    <div class="shape shape-3">
                        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M43.3,-57.1C57.4,-46.5,71.1,-32.6,75.3,-16.2C79.5,0.2,74.2,19.1,65.1,35.3C56,51.5,43.1,65,27.4,71.7C11.7,78.4,-6.8,78.3,-23.9,72.4C-41,66.5,-56.7,54.8,-65.4,39.2C-74.1,23.6,-75.8,4,-71.7,-13.2C-67.6,-30.4,-57.7,-45.2,-44.3,-56.1C-30.9,-67,-15.5,-74,0.7,-74.9C16.8,-75.8,33.7,-70.7,43.3,-57.1Z"
                                transform="translate(100 100)"></path>
                        </svg>
                    </div>
                </div>
            </div>
        </section>
        <!-- /Get Got-It Section -->
        <!-- About Section -->
        <section id="about" class="about section">
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <div class="row gy-4 align-items-center justify-content-between">
                    <div class="col-xl-5" data-aos="fade-up" data-aos-delay="200">
                        <span class="about-meta">MORE ABOUT GOT-IT</span>
                        <h2 class="about-title">Streamlining HR Like Never Before</h2>
                        <p class="justify-content-center align-items-center position-relative">Got-It HR software is your
                            go-to solution for biometric
                            attendance, payroll management, leave tracking, and workforce efficiency. With advanced
                            features like face recognition, geolocation, and card-based logging. We redefine how
                            businesses handle HR operations.</p>
                        <div class="row feature-list-wrapper">
                            <div class="col-md-6">
                                <ul class="feature-list">
                                    <li><i class="bi bi-check-circle-fill"></i> Face recognition tracking</li>
                                    <li><i class="bi bi-check-circle-fill"></i> Fingerprint authentication</li>
                                    <li><i class="bi bi-check-circle-fill"></i> Geolocation attendance</li>
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <ul class="feature-list">
                                    <li><i class="bi bi-check-circle-fill"></i> Card-based logging</li>
                                    <li><i class="bi bi-check-circle-fill"></i> Payroll automation</li>
                                    <li><i class="bi bi-check-circle-fill"></i> HR analytics tools</li>
                                </ul>
                            </div>
                        </div>
                        <div class="info-wrapper">
                            <div class="row gy-4">
                                <div class="col-lg-12">
                                    <div class="contact-info d-flex align-items-center gap-2">
                                        <i class="bi bi-telephone-fill"></i>
                                        <div>
                                            <p class="contact-label">Contact us anytime</p>
                                            <a href="tel:+919030990395" class="text-dark">+91 90309 90395</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-6" data-aos="fade-up" data-aos-delay="300">
                        <div class="image-wrapper">
                            <div class="images position-relative" data-aos="zoom-out" data-aos-delay="400">
                                <img src="{{ asset('treasury/img/landing/about/team.jpg') }}" alt="HR Management Tools"
                                    class="img-fluid main-image rounded-4">
                                <img src="{{ asset('treasury/img/landing/about/finger.jpg') }}"
                                    alt="Employee Attendance Features" class="img-fluid small-image rounded-4">
                            </div>
                            <div class="experience-badge floating">
                                <h3>5+ <span>Years</span></h3>
                                <p>Of innovation in HR solutions</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section><!-- /About Section -->
        <!-- Features Section -->
        <section id="features" class="features section">
            <div class="container section-title" data-aos="fade-up">
                <h2>Features</h2>
                <p>Explore the powerful features of our system, designed to simplify HR processes and enhance
                    efficiency.</p>
            </div>
            <div class="container">
                <div class="d-flex justify-content-center">
                    <ul class="nav nav-tabs" data-aos="fade-up" data-aos-delay="100">
                        <li class="nav-item">
                            <a class="nav-link active show" data-bs-toggle="tab" data-bs-target="#features-tab-1">
                                <h4>Attendance</h4>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-bs-toggle="tab" data-bs-target="#features-tab-2">
                                <h4>HR Solutions</h4>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-bs-toggle="tab" data-bs-target="#features-tab-3">
                                <h4>Analytics</h4>
                            </a>
                        </li>
                    </ul>
                </div>
                <div class="tab-content" data-aos="fade-up" data-aos-delay="200">
                    <!-- Attendance Features -->
                    <div class="tab-pane fade active show" id="features-tab-1">
                        <div class="row">
                            <div
                                class="col-lg-6 order-2 order-lg-1 mt-3 mt-lg-0 d-flex flex-column justify-content-center align-items-stretch">
                                <h3>Smart Attendance Tracking</h3>
                                <p class="fst-italic">Automate attendance management with multiple cutting-edge options.
                                </p>
                                <ul>
                                    <li><i class="bi bi-check2-all"></i> <span>Biometric-based attendance tracking.</span>
                                    </li>
                                    <li><i class="bi bi-check2-all"></i> <span>Face recognition and geolocation
                                            options.</span></li>
                                    <li><i class="bi bi-check2-all"></i> <span>Card-based logging for quick access.</span>
                                    </li>
                                    <li><i class="bi bi-check2-all"></i> <span>Customizable attendance rules and
                                            shifts.</span></li>
                                </ul>
                            </div>
                            <div class="col-lg-6 order-1 order-lg-2 text-center d-flex align-items-stretch">
                                <img src="{{ asset('treasury/img/landing/features/f-3.png') }}" alt="Attendance Features"
                                    class="img-fluid rounded-3 shadow w-100">
                            </div>
                        </div>
                    </div>
                    <!-- End Attendance Features -->
                    <!-- HR Solutions -->
                    <div class="tab-pane fade" id="features-tab-2">
                        <div class="row">
                            <div
                                class="col-lg-6 order-2 order-lg-1 mt-3 mt-lg-0 d-flex flex-column justify-content-center align-items-stretch">
                                <h3>Comprehensive HR Solutions</h3>
                                <p class="fst-italic">Streamline HR operations for enhanced workforce management.</p>
                                <ul>
                                    <li><i class="bi bi-check2-all"></i> <span>Payroll automation and tax
                                            calculations.</span></li>
                                    <li><i class="bi bi-check2-all"></i> <span>Leave management and approvals.</span></li>
                                    <li><i class="bi bi-check2-all"></i> <span>Employee self-service portals.</span></li>
                                    <li><i class="bi bi-check2-all"></i> <span>Admin panels for efficient HR
                                            management.</span></li>
                                </ul>
                            </div>
                            <div class="col-lg-6 order-1 order-lg-2 text-center d-flex align-items-stretch">
                                <img src="{{ asset('treasury/img/landing/features/f-2.png') }}" alt="Attendance Features"
                                    class="img-fluid rounded-3 shadow w-100">
                            </div>
                        </div>
                    </div>
                    <!-- End HR Solutions -->
                    <!-- Analytics and Reporting -->
                    <div class="tab-pane fade" id="features-tab-3">
                        <div class="row">
                            <div
                                class="col-lg-6 order-2 order-lg-1 mt-3 mt-lg-0 d-flex flex-column justify-content-center align-items-stretch">
                                <h3>Data-Driven Insights</h3>
                                <p class="fst-italic">Make informed decisions with powerful analytics.</p>
                                <ul>
                                    <li><i class="bi bi-check2-all"></i> <span>Real-time dashboards and reports.</span>
                                    </li>
                                    <li><i class="bi bi-check2-all"></i> <span>Employee performance tracking.</span></li>
                                    <li><i class="bi bi-check2-all"></i> <span>Custom analytics for HR and payroll
                                            data.</span></li>
                                    <li><i class="bi bi-check2-all"></i> <span>Exportable reports for audits and
                                            compliance.</span></li>
                                </ul>
                            </div>
                            <div class="col-lg-6 order-1 order-lg-2 text-center d-flex align-items-stretch">
                                <img src="{{ asset('treasury/img/landing/features/f-1.png') }}" alt="Attendance Features"
                                    class="img-fluid rounded-3 shadow w-100">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section><!-- /Features Section -->
        <!-- Features Cards Section -->
        <section id="services" class="features-cards section">
            <div class="container">
                <!-- Section Title -->
                <div class="section-title text-center">
                    <h2 class="fw-bold">Our Services</h2>
                    <p>Explore the range of services we offer to enhance your HR and payroll management. From biometric
                        solutions to advanced analytics, we provide tailored support for all your needs.</p>
                </div>
                <div class="row gy-4">
                    <!-- Service 1: Biometric Installation -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="100">
                        <div class="feature-box orange">
                            <i class="bi bi-tools"></i>
                            <h4>Biometric Installation</h4>
                            <p>Expert setup of biometric systems for optimal performance.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 2: Custom Integration -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="200">
                        <div class="feature-box blue">
                            <i class="bi bi-gear"></i>
                            <h4>Custom Integration</h4>
                            <p>Seamless integration with HR and payroll systems.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 3: Advanced Analytics -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="300">
                        <div class="feature-box green">
                            <i class="bi bi-bar-chart"></i>
                            <h4>Advanced Analytics</h4>
                            <p>Detailed reports and insights to support decision-making.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 4: Security Audits -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="400">
                        <div class="feature-box red">
                            <i class="bi bi-shield-lock"></i>
                            <h4>Security Audits</h4>
                            <p>Regular checks to ensure data safety and system integrity.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 5: Payroll Management -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="500">
                        <div class="feature-box purple">
                            <i class="bi bi-wallet"></i>
                            <h4>Payroll Management</h4>
                            <p>Streamlined payroll processing with tax and compliance management.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 6: Leave Management -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="600">
                        <div class="feature-box yellow">
                            <i class="bi bi-calendar-check"></i>
                            <h4>Leave Management</h4>
                            <p>Efficient tracking and approval of employee leave requests.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 7: Employee Self-Service Portal -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="700">
                        <div class="feature-box teal">
                            <i class="bi bi-person-lines-fill"></i>
                            <h4>Employee Self-Service Portal</h4>
                            <p>Empower employees with access to their records, leave, and payroll.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 8: Performance Management -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="800">
                        <div class="feature-box pink">
                            <i class="bi bi-graph-up"></i>
                            <h4>Performance Management</h4>
                            <p>Track and manage employee performance with customizable KPIs.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 9: Cloud Hosting Solutions -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="900">
                        <div class="feature-box light-blue">
                            <i class="bi bi-cloud"></i>
                            <h4>Cloud Hosting Solutions</h4>
                            <p>Reliable and secure cloud hosting for HR and payroll software.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 10: HR Compliance -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="1000">
                        <div class="feature-box light-green">
                            <i class="bi bi-check-circle"></i>
                            <h4>HR Compliance</h4>
                            <p>Ensure compliance with labor laws and regulations.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 11: Employee Onboarding -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="1100">
                        <div class="feature-box sky-blue">
                            <i class="bi bi-person-add"></i>
                            <h4>Employee Onboarding</h4>
                            <p>Simplified onboarding for new employees, ensuring smooth integration.</p>
                        </div>
                    </div><!-- End Feature Box -->
                    <!-- Service 12: Workforce Scheduling -->
                    <div class="col-xl-3 col-md-6" data-aos="zoom-in" data-aos-delay="1200">
                        <div class="feature-box violet">
                            <i class="bi bi-calendar-week"></i>
                            <h4>Workforce Scheduling</h4>
                            <p>Efficient scheduling and management of employee shifts.</p>
                        </div>
                    </div><!-- End Feature Box -->
                </div>
            </div>
        </section><!-- /Features Cards Section -->
        <!-- Clients Section -->
        <section id="clients" class="clients section">
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <!-- Section Title -->
                <div class="container section-title" data-aos="fade-up">
                    <h2>Our Trusted Clients</h2>
                    <p>We have had the privilege of working with industry-leading companies who trust our solutions to
                        streamline their workforce management and improve productivity.</p>
                </div><!-- End Section Title -->
                <!-- Swiper Slider for Client Logos -->
                <div class="swiper init-swiper">
                    <script type="application/json" class="swiper-config">
            {
                "loop": true,
                "speed": 600,
                "autoplay": {
                    "delay": 5000
                },
                "slidesPerView": "auto",
                "pagination": {
                    "el": ".swiper-pagination",
                    "type": "bullets",
                    "clickable": true
                },
                "breakpoints": {
                    "320": {
                        "slidesPerView": 2,
                        "spaceBetween": 40
                    },
                    "480": {
                        "slidesPerView": 3,
                        "spaceBetween": 60
                    },
                    "640": {
                        "slidesPerView": 4,
                        "spaceBetween": 80
                    },
                    "992": {
                        "slidesPerView": 5,
                        "spaceBetween": 120
                    }
                }
            }
        </script>
                    <div class="swiper-wrapper align-items-center">
                        <div class="swiper-slide"><img src="{{ asset('treasury/img/landing/clients/c1.png') }}"
                                class="img-fluid" alt=""></div>
                        <div class="swiper-slide"><img src="{{ asset('treasury/img/landing/clients/c2.svg') }}"
                                class="img-fluid" alt=""></div>
                        <div class="swiper-slide"><img src="{{ asset('treasury/img/landing/clients/c3.svg') }}"
                                class="img-fluid" alt=""></div>
                        <div class="swiper-slide"><img src="{{ asset('treasury/img/landing/clients/c4.png') }}"
                                class="img-fluid" alt=""></div>
                        <div class="swiper-slide"><img src="{{ asset('treasury/img/landing/clients/c5.svg') }}"
                                class="img-fluid" alt=""></div>
                        <div class="swiper-slide"><img src="{{ asset('treasury/img/landing/clients/c6.svg') }}"
                                class="img-fluid" alt=""></div>
                        <div class="swiper-slide"><img src="{{ asset('treasury/img/landing/clients/c7.svg') }}"
                                class="img-fluid" alt=""></div>
                        <div class="swiper-slide"><img src="{{ asset('treasury/img/landing/clients/c8.svg') }}"
                                class="img-fluid" alt=""></div>
                    </div>
                    <div class="swiper-pagination"></div>
                </div>
            </div>
        </section>
        <!-- /Clients Section -->
        <!-- Testimonials Section -->
        <section id="testimonials" class="testimonials section light-background">
            <!-- Section Title -->
            <div class="container section-title" data-aos="fade-up">
                <h2>What they are saying about us</h2>
                <p>Manage employee data, track attendance, performance, payroll, and leave efficiently with our
                    comprehensive employee management system.</p>
            </div><!-- End Section Title -->
            <div class="container">
                <div class="row g-5">
                    <div class="col-lg-6" data-aos="fade-up" data-aos-delay="100">
                        <div class="testimonial-item">
                            <h3>HR</h3>
                            <h4>Digital Kuppam</h4>
                            <p>
                                <i class="bi bi-quote quote-icon-left"></i>
                                Adding and managing employees is very intuitive. Communication with the system is
                                smooth, making it easy to update and manage accounts.
                                <i class="bi bi-quote quote-icon-right"></i>
                            </p>
                        </div>
                    </div><!-- End testimonial item -->
                    <div class="col-lg-6" data-aos="fade-up" data-aos-delay="200">
                        <div class="testimonial-item">
                            <h3>Operations Manager</h3>
                            <h4>G-Star Elevators</h4>
                            <p>
                                <i class="bi bi-quote quote-icon-left"></i>
                                Viewing salary details and payment history is easy. The system provides clear and
                                accessible information about my earnings.
                                <i class="bi bi-quote quote-icon-right"></i>
                            </p>
                        </div>
                    </div><!-- End testimonial item -->
                    <div class="col-lg-6" data-aos="fade-up" data-aos-delay="300">
                        <div class="testimonial-item">
                            <h3>Finance Manager</h3>
                            <h4>Bajaj & Showroom</h4>
                            <p>
                                <i class="bi bi-quote quote-icon-left"></i>
                                The biometric system is easy to use and set up. It’s been reliable for tracking
                                attendance and managing payroll. Good value for the price.
                                <i class="bi bi-quote quote-icon-right"></i>
                            </p>
                        </div>
                    </div><!-- End testimonial item -->
                    <div class="col-lg-6" data-aos="fade-up" data-aos-delay="400">
                        <div class="testimonial-item">
                            <h3>HR Manager</h3>
                            <h4>BRD Hospital</h4>
                            <p>
                                <i class="bi bi-quote quote-icon-left"></i>
                                Managing employee attendance and payroll has never been easier with GotIt. It’s a
                                powerful tool that has enhanced our administrative efficiency.
                                <i class="bi bi-quote quote-icon-right"></i>
                            </p>
                        </div>
                    </div><!-- End testimonial item -->
                    <div class="col-lg-6" data-aos="fade-up" data-aos-delay="500">
                        <div class="testimonial-item">
                            <h3>Manager</h3>
                            <p>
                                <i class="bi bi-quote quote-icon-left"></i>
                                I appreciate how user-friendly the biometric system is. It’s straightforward to track
                                attendance and handle leave requests. The intuitive interface makes it simple for
                                everyone.
                                <i class="bi bi-quote quote-icon-right"></i>
                            </p>
                        </div>
                    </div><!-- End testimonial item -->
                    <div class='col-lg-6' data-aos='fade-up' data-aos-delay='500'>
                        <div class='testimonial-item'>
                            <h3>HR Director</h3>
                            <p>
                                <i class='bi bi-quote quote-icon-left'></i>
                                The automated payroll integration has been a game-changer for us. It saves hours of manual
                                work and ensures
                                accuracy in salary processing. Highly recommend this system for efficiency!
                                <i class='bi bi-quote quote-icon-right'></i>
                            </p>
                        </div>
                    </div><!-- End testimonial item -->
                </div>
            </div>
        </section><!-- /Testimonials Section -->
        <!-- Stats Section -->
        <section id="stats" class="stats section">
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <!-- Stats Section Heading -->
                <div class="section-title text-center mb-5">
                    <h2 class="fw-bold">Our Achievements</h2>
                    <p>We are proud of the milestones we've reached with our clients and projects. Here are some of the
                        key statistics that showcase our success.</p>
                </div>
                <div class="row gy-4">
                    <!-- Clients Stat -->
                    <div class="col-lg-3 col-md-6">
                        <div class="stats-item text-center w-100 h-100">
                            <span data-purecounter-start="0" data-purecounter-end="232" data-purecounter-duration="1"
                                class="purecounter"></span>
                            <p>Organizations</p>
                        </div>
                    </div><!-- End Stats Item -->
                    <!-- Projects Stat -->
                    <div class="col-lg-3 col-md-6">
                        <div class="stats-item text-center w-100 h-100">
                            <span data-purecounter-start="0" data-purecounter-end="521" data-purecounter-duration="1"
                                class="purecounter"></span>
                            <p>Employees</p>
                        </div>
                    </div><!-- End Stats Item -->
                    <!-- Hours of Support Stat -->
                    <div class="col-lg-3 col-md-6">
                        <div class="stats-item text-center w-100 h-100">
                            <span data-purecounter-start="0" data-purecounter-end="1453" data-purecounter-duration="1"
                                class="purecounter"></span>
                            <p>Requests</p>
                        </div>
                    </div><!-- End Stats Item -->
                    <!-- Workers Stat -->
                    <div class="col-lg-3 col-md-6">
                        <div class="stats-item text-center w-100 h-100">
                            <span data-purecounter-start="0" data-purecounter-end="32898" data-purecounter-duration="1"
                                class="purecounter"></span>
                            <p>Visitors</p>
                        </div>
                    </div><!-- End Stats Item -->
                </div>
            </div>
        </section>
        <section id="get-got-it-2" class="get-got-it-2 section dark-background">
            <div class="container">
                <div class="row justify-content-center" data-aos="zoom-in" data-aos-delay="100">
                    <div class="col-xl-10">
                        <div class="text-center">
                            <h3>Become a Reseller and Boost Your Earnings</h3>
                            <p>Ready to expand your business? Join our Reseller Program and offer high-quality services with
                                attractive commissions. Get exclusive benefits, dedicated support, and more! Sign up today
                                and start earning!</p>
                            <button class="cta-btn btn btn-light show-modal-popup text-dark"
                                data-type="reseller_program|join_now">Join the Reseller Program</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <!-- /Stats Section -->
        <!-- Pricing Section -->
        <section id="pricing" class="pricing section light-background">
            <!-- Section Title -->
            <div class="container section-title" data-aos="fade-up">
                <h2>Pricing</h2>
                <p>Choose the right plan for your business growth. All plans include Advanced Attendance Tracking (with
                    Biometric Integration) and device configuration. Additional features and renewals are based on your
                    business needs.</p>
            </div><!-- End Section Title -->
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <div class="row g-4 justify-content-center">
                    <!-- Seed Plan -->
                    @php
                        $pricingData = \App\Http\classes\SupremeHelper::fetch('PPL', [
                            'where' => ['product_id' => env('SUPREME_PRODUCT_ID')],
                        ]);
                        if ($pricingData instanceof \Illuminate\Http\JsonResponse) {
                            $plan = $pricingData->getData(true); // Convert to array
                        } else {
                            $plan = $pricingData; // Assume it's already an array
                        }
                    @endphp
                    @if (isset($plan['data']) && is_array($plan['data']))
                        @foreach ($plan['data'] as $index => $data)
                            <div class="col-lg-4" data-aos="fade-up" data-aos-delay="100">
                                <div class="pricing-card {{ $index === 1 ? 'popular active' : '' }}">
                                    <!-- Plan Icon -->
                                    <div class="pricing-icon">
                                        <i class="fa-solid {{ $data['icon'] ?? '' }}"></i> <!-- Seed Icon -->
                                    </div>
                                    @if ($index === 1)
                                        <div class="popular-badge">Most Popular</div>
                                    @endif
                                    <h3>{{ ucfirst($data['name'] ?? '') }}</h3>
                                    <div class="price">
                                        <span class="currency">₹</span>
                                        <span class="amount">{{ $data['amount'] ?? '' }}</span>
                                        <span class="period">/ {{ ucfirst($data['duration_type'] ?? '') }}</span>
                                    </div>
                                    <p class="description">{{ $data['description'] ?? '' }}</p>
                                    <p>{!! $data['features'] ?? '' !!}</p>
                                    <p>{!! $data['additional_info'] ?? '' !!}</p>
                                    @php
                                        $clientId = request()->cookie('client_id');
                                        $currentStage = request()->cookie('current_stage');
                                        $plan = request()->cookie('plan');
                                        $dataType =
                                            $clientId && $currentStage && $plan
                                                ? "$currentStage|$plan|$clientId"
                                                : 'plan_confirmation|' . $data['plan_id'] . '';
                                    @endphp
                                    <a href="javascript:void(0)" class="btn btn-light show-modal-popup"
                                        data-type="{{ $dataType }}" value="{{ ucfirst($data['name']) }}">
                                        Buy Now
                                        <i class="bi bi-arrow-right"></i>
                                    </a>
                                </div>
                            </div>
                        @endforeach
                    @else
                        <li><i class="fa-solid fa-angle-right mx-2"></i> No Plans Found</li>
                    @endif
                </div>
            </div>
        </section><!-- /Pricing Section -->
        <!-- Faq Section -->
        <section class="faq-9 faq section light-background" id="faq">
            <div class="container">
                <div class="row">
                    <div class="col-lg-5" data-aos="fade-up">
                        <h2 class="faq-title">Have a question? Check out the FAQ</h2>
                        <p class="faq-description">Got questions about Got-It HR software? Find answers below or reach
                            out to us for more information on how to revolutionize your HR processes with Got-It!</p>
                        <div class="faq-arrow d-none d-lg-block" data-aos="fade-up" data-aos-delay="200">
                            <svg class="faq-arrow" width="200" height="211" viewBox="0 0 200 211" fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M198.804 194.488C189.279 189.596 179.529 185.52 169.407 182.07L169.384 182.049C169.227 181.994 169.07 181.939 168.912 181.884C166.669 181.139 165.906 184.546 167.669 185.615C174.053 189.473 182.761 191.837 189.146 195.695C156.603 195.912 119.781 196.591 91.266 179.049C62.5221 161.368 48.1094 130.695 56.934 98.891C84.5539 98.7247 112.556 84.0176 129.508 62.667C136.396 53.9724 146.193 35.1448 129.773 30.2717C114.292 25.6624 93.7109 41.8875 83.1971 51.3147C70.1109 63.039 59.63 78.433 54.2039 95.0087C52.1221 94.9842 50.0776 94.8683 48.0703 94.6608C30.1803 92.8027 11.2197 83.6338 5.44902 65.1074C-1.88449 41.5699 14.4994 19.0183 27.9202 1.56641C28.6411 0.625793 27.2862 -0.561638 26.5419 0.358501C13.4588 16.4098 -0.221091 34.5242 0.896608 56.5659C1.8218 74.6941 14.221 87.9401 30.4121 94.2058C37.7076 97.0203 45.3454 98.5003 53.0334 98.8449C47.8679 117.532 49.2961 137.487 60.7729 155.283C87.7615 197.081 139.616 201.147 184.786 201.155L174.332 206.827C172.119 208.033 174.345 211.287 176.537 210.105C182.06 207.125 187.582 204.122 193.084 201.144C193.346 201.147 195.161 199.887 195.423 199.868C197.08 198.548 193.084 201.144 195.528 199.81C196.688 199.192 197.846 198.552 199.006 197.935C200.397 197.167 200.007 195.087 198.804 194.488ZM60.8213 88.0427C67.6894 72.648 78.8538 59.1566 92.1207 49.0388C98.8475 43.9065 106.334 39.2953 114.188 36.1439C117.295 34.8947 120.798 33.6609 124.168 33.635C134.365 33.5511 136.354 42.9911 132.638 51.031C120.47 77.4222 86.8639 93.9837 58.0983 94.9666C58.8971 92.6666 59.783 90.3603 60.8213 88.0427Z"
                                    fill="currentColor"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="col-lg-7" data-aos="fade-up" data-aos-delay="300">
                        <div class="faq-container">
                            <div class="faq-item faq-active">
                                <h3>What is Got-It HR software?</h3>
                                <div class="faq-content">
                                    <p>Got-It is an advanced HR software designed to simplify and streamline HR tasks
                                        such as biometric attendance, payroll management, performance tracking, and
                                        leave management. It revolutionizes HR operations for businesses of all sizes.
                                    </p>
                                </div>
                                <i class="faq-toggle bi bi-chevron-right"></i>
                            </div><!-- End Faq item-->
                            <div class="faq-item">
                                <h3>How does Got-It track employee performance?</h3>
                                <div class="faq-content">
                                    <p>Got-It HR software provides a detailed performance tracking module where managers
                                        can set goals, monitor progress, and provide feedback. It also integrates
                                        performance with attendance data for a comprehensive view of an employee's
                                        overall work.</p>
                                </div>
                                <i class="faq-toggle bi bi-chevron-right"></i>
                            </div><!-- End Faq item-->
                            <div class="faq-item">
                                <h3>Can Got-It be customized for different types of businesses?</h3>
                                <div class="faq-content">
                                    <p>Yes, Got-It is highly customizable to fit the unique needs of various businesses.
                                        Whether you're a small business or a large enterprise, you can tailor workflows,
                                        permissions, and reports to suit your organizational needs.</p>
                                </div>
                                <i class="faq-toggle bi bi-chevron-right"></i>
                            </div><!-- End Faq item-->
                            <div class="faq-item">
                                <h3>Is Got-It HR software easy to integrate with other tools?</h3>
                                <div class="faq-content">
                                    <p>Got-It HR software integrates seamlessly with many popular HR and payroll tools,
                                        ensuring your business's systems are connected and data flows smoothly across
                                        platforms.</p>
                                </div>
                                <i class="faq-toggle bi bi-chevron-right"></i>
                            </div><!-- End Faq item-->
                            <div class="faq-item">
                                <h3>What security features are included in Got-It HR software?</h3>
                                <div class="faq-content">
                                    <p>Got-It offers robust security features, including encrypted data storage,
                                        two-factor authentication, and role-based access control, ensuring that your
                                        employee data is always safe and secure.</p>
                                </div>
                                <i class="faq-toggle bi bi-chevron-right"></i>
                            </div><!-- End Faq item-->
                            <div class="faq-item">
                                <h3>Can employees access their own data in Got-It?</h3>
                                <div class="faq-content">
                                    <p>Yes, Got-It includes an employee portal where employees can access their
                                        attendance, payroll details, leave balances, and performance reports. This
                                        provides transparency and empowers employees to manage their own data.</p>
                                </div>
                                <i class="faq-toggle bi bi-chevron-right"></i>
                            </div><!-- End Faq item-->
                        </div>
                    </div>
                </div>
            </div>
        </section><!-- /Faq Section -->
        <!-- Call To Action 2 Section -->
        <section id="get-got-it-2" class="get-got-it-2 section dark-background">
            <div class="container">
                <div class="row justify-content-center" data-aos="zoom-in" data-aos-delay="100">
                    <div class="col-xl-10">
                        <div class="text-center">
                            <h3>Take Your HR Management to the Next Level</h3>
                            <p>Ready to scale your business? Choose the right plan today and start optimizing your HR
                                processes with advanced features like biometric attendance tracking, payroll management,
                                and more. Don't wait, transform your business today!</p>
                            <button class="cta-btn btn btn-light show-modal-popup text-dark"
                                data-type="request_a_quote|hello">Get a Quote</button>
                        </div>
                    </div>
                </div>
            </div>
        </section><!-- /Call To Action 2 Section -->
        <!-- Contact Section -->
        <section id="contact" class="request section light-background">
            <!-- Section Title -->
            <div class="container section-title" data-aos="fade-up">
                <h2>Contact Us</h2>
                <p>Manage employee data, track attendance, performance, payroll, and leave efficiently with our
                    comprehensive employee management system. Get in touch for more details or assistance.</p>
            </div><!-- End Section Title -->
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <div class="row g-4 g-lg-5">
                    <div class="col-lg-5">
                        <div class="info-box" data-aos="fade-up" data-aos-delay="200">
                            <h3>Contact Info</h3>
                            <p>We're here to help! Reach out to us for inquiries, support, or if you need any assistance
                                regarding our HR management solutions.</p>
                            <div class="info-item" data-aos="fade-up" data-aos-delay="300">
                                <div class="icon-box">
                                    <i class="bi bi-geo-alt"></i>
                                </div>
                                <div class="content">
                                    <h4>Our Location</h4>
                                    <p>#8/281/6, 1st Floor,</p>
                                    <p>R.T.C Link Road, Kuppam,</p>
                                    <p>Andhra Pradesh 517425</p>
                                </div>
                            </div>
                            <div class="info-item" data-aos="fade-up" data-aos-delay="400">
                                <div class="icon-box">
                                    <i class="bi bi-telephone"></i>
                                </div>
                                <div class="content">
                                    <h4>Call Us</h4>
                                    <a href="tel:+919030990395" class="text-white">+91 90309 90395</a>
                                </div>
                            </div>
                            <div class="info-item" data-aos="fade-up" data-aos-delay="500">
                                <div class="icon-box">
                                    <i class="bi bi-envelope"></i>
                                </div>
                                <div class="content">
                                    <h4>Email Us</h4>
                                    <a href="mailto:info@gotit4all.com" class="text-white">info@gotit4all.com</a>
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
                                <input type="hidden" name="form_type" value="contact">
                                <div class="row gy-4">
                                    <div class="col-md-6">
                                        <input type="text" name="name" class="form-control"
                                            placeholder="Your Name" required="" pattern="^[A-Za-z\s]{3,50}$"
                                            title="Only letters and spaces, 3-50 characters.">
                                    </div>
                                    <div class="col-md-6">
                                        <input type="text" class="form-control" name="phone"
                                            placeholder="Your Phone Number" required="" minlength="10" maxlength="10"
                                            pattern="^[6-9]\d{9}$" title="Enter a valid 10-digit Indian phone number.">
                                    </div>
                                    <div class="col-md-6">
                                        <input type="email" class="form-control" name="email"
                                            placeholder="Your Email" required=""
                                            pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$"
                                            title="Enter a valid email address (e.g., user@example.com).">
                                    </div>
                                    <div class="col-md-6">
                                        <input type="text" class="form-control" name="subject"
                                            placeholder="Your Subject" required="" pattern=".{3,100}"
                                            title="Subject should be 3 to 100 characters long.">
                                    </div>
                                    <div class="col-12">
                                        <textarea class="form-control" name="message" rows="6" placeholder="Message" required=""
                                            pattern=".{10,1000}" title="Message should be 10 to 1000 characters long."></textarea>
                                    </div>
                                    <div class="d-flex flex-row justify-content-center">
                                        <div class="g-recaptcha" data-sitekey="{{ env('RECAPTCHA_SITE_KEY') }}"></div>
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
        </section><!-- /Contact Section -->
    </main>
@endsection
