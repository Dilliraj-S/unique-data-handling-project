@extends('layouts.landing-app')
@section('title', $document['page_name'])
@section('help_section', 'active')
@section('content')
    @php
        $productDoc = new stdClass();
        $sections = json_decode($document['sections'], true); // Decode JSON to array
        $productDoc->sections = $sections;
        $productDoc->content = json_decode($document['content']);
    @endphp
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const sidebarLinks = document.querySelectorAll(".nav-link");
            const sections = document.querySelectorAll(".card > div");
            const offset = 100; // Adjust scroll position
            function removeActiveClass() {
                sidebarLinks.forEach(link => link.classList.remove("active", "text-primary"));
            }
            // Smooth scrolling and active link highlight on click
            sidebarLinks.forEach(link => {
                link.addEventListener("click", function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute("href").substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        const elementPosition = targetElement.getBoundingClientRect().top + window
                            .scrollY - offset;
                        window.scrollTo({
                            top: elementPosition,
                            behavior: "smooth"
                        });
                        removeActiveClass();
                        this.classList.add("active", "text-primary");
                    }
                });
            });
            // Auto-highlight active section on scroll
            window.addEventListener("scroll", () => {
                let scrollPosition = window.scrollY + offset;
                sections.forEach(section => {
                    if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop +
                        section.offsetHeight) {
                        const activeLink = document.querySelector(
                            `.nav-link[href="#${section.id}"]`);
                        if (activeLink) {
                            removeActiveClass();
                            activeLink.classList.add("active", "text-primary");
                        }
                    }
                });
            });
        });
    </script>
    <main class="main">
        <section id="Got-It" class="Got-It section">
            <div class="container" data-aos="fade-up" data-aos-delay="100">
                <div class="container section-title" data-aos="fade-up">
                    <h2>{{ Str::title($document['page_name']) }} - Let’s Get You Started!</h2>
                    <p>{{ ($document['description'] ?? "Welcome to your help center! 🚀 Find step-by-step guides, tips, and answers to master your Gotit
                        system effortlessly.") }}</p>
                </div>
                <div class="row">
                    <div class="col-md-3">
                        <div class="sticky-sidebar position-sticky p-3 bg-white shadow rounded-4" style="top: 100px;">
                            <h6 class="text-dark fw-bold text-center mb-4">{{ $document['page_name'] }}</h6>
                            <ul class="nav flex-column nav-pills">
                                @foreach ($productDoc->sections as $section)
                                    @php
                                        $sectionName = key($section); // Get the section name (e.g., "Registrationb")
                                        $iconClass = $section[$sectionName] ?? 'bi-journal-text'; // Get the icon class or default
                                    @endphp
                                    <li class="nav-item mb-2">
                                        <a class="nav-link text-dark bg-light rounded-5 py-2 d-flex align-items-center"
                                            href="#{{ Str::slug($sectionName) }}">
                                            <i class="fa {{ $iconClass }} me-2"></i> {{ $sectionName }}
                                        </a>
                                    </li>
                                @endforeach
                            </ul>
                        </div>
                    </div>
                    <div class="col-md-9">
                        <div class="card shadow-lg p-4 border-0 rounded-4">
                            @foreach ($productDoc->content as $section)
                                <div id="{{ Str::slug($section->name) }}" class="mb-5">
                                    <h5 class="text-primary fw-bold border-bottom pb-2">{{ $section->name }}</h5>
                                    @foreach ($section->fields as $field)
                                        @if ($field->type == 'editor')
                                            <div class="prose text-dark">{!! $field->content !!}</div>
                                        @elseif($field->type == 'image')
                                            <div class="text-center">
                                                <img src="{{ $field->content }}" class="img-fluid rounded-4 shadow-lg border"
                                                    alt="Image">
                                            </div>
                                        @elseif($field->type == 'video')
                                            <div class="text-center my-4">
                                                @if (Str::contains($field->content, 'youtube.com'))
                                                    <iframe class="w-100 rounded-4 shadow-lg" style="height: 400px;"
                                                        src="{{ $field->content }}" frameborder="0"
                                                        allowfullscreen></iframe>
                                                @else
                                                    <video controls class="w-100 rounded-4 shadow-lg border">
                                                        <source src="{{ $field->content }}" type="video/mp4">
                                                        Your browser does not support the video tag.
                                                    </video>
                                                @endif
                                            </div>
                                        @endif
                                    @endforeach
                                </div>
                            @endforeach
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
    <style>
        .nav-link.active {
            background-color: #00b4af !important;
            color: white !important;
        }
    </style>
@endsection
