@section('title', 'Help')
@extends('layouts.landing-app')
@section('help_section', 'active')
@section('content')
    <style>
        #searchInput {
            border-radius: 8px;
            font-size: 16px;
        }
        .search-input {
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="%23888888" d="M505 442.7L405.3 343a208 208 0 10-62.6 62.6L442.7 505a21 21 0 0029.7 0l32.6-32.6a21 21 0 000-29.7zM208 384a176 176 0 11176-176 176 176 0 01-176 176z"/></svg>') no-repeat;
            background-position: right 15px center;
            background-size: 18px;
            padding-right: 40px;
        }
    </style>
    <section id="help" class="Got-It services section light-background">
        <!-- Section Title -->
        <div class="container section-title" data-aos="fade-up">
            <h2>Explore Documentation</h2>
            <p>Search and browse our comprehensive documentation to find guides, tutorials, and resources that help you make
                the most of our platform. Whether you're looking for setup instructions, best practices, or troubleshooting
                steps, you'll find everything you need here.</p>
        </div>
        <!-- End Section Title -->
        <div class="container aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
            <div class="row justify-content-center mb-4">
                <div class="col-md-8">
                    <input type="text" id="searchInput" class="form-control p-3 search-input border-primary border-2"
                        placeholder="Search documentation..." onkeyup="filterHelp()">
                </div>
            </div>
            <div class="row g-4">
                @php
                    $documentationData = \App\Http\classes\SupremeHelper::fetch('PDC', [
                        'where' => ['product_id' => env('SUPREME_PRODUCT_ID')],
                    ]);
                    $docs =
                        $documentationData instanceof \Illuminate\Http\JsonResponse
                            ? $documentationData->getData(true)
                            : $documentationData;
                @endphp
                @if (!empty($docs['data']) && is_array($docs['data']))
                    @foreach ($docs['data'] as $data)
                    <div class="col-lg-6 aos-init aos-animate help-item" data-aos="fade-up" data-aos-delay="100">
                        <a href="{{ route('dyn_doc_page.' . $data['doc_id']) }}" class="service-card d-flex text-decoration-none shadow">
                            <div class="icon flex-shrink-0">
                                <i class="fa {{ $data['icon'] }}"></i>
                            </div>
                            <div>
                                <h3 class="text-dark">{{ Str::title($data['page_name']) ?? 'Untitled' }}</h3>
                                <p class="text-muted">{{ \Illuminate\Support\Str::limit($data['description'] ?? 'Untitled', 100) }}</p>
                                <span class="read-more text-primary">Read More <i class="bi bi-arrow-right"></i></span>
                            </div>
                        </a>
                    </div>
                    
                    @endforeach
                @endif
            </div>
            <div class="row justify-content-center mt-4" id="noResults" style="display: none;">
                <div class="col-md-12 text-center">
                    <img src="{{ asset('treasury/images/common/no-data/nothing.svg') }}" alt="No Results Found"
                        class="img-fluid" width="300">
                    <p class="mt-3 text-muted">No documentation found. Try a different keyword.</p>
                </div>
            </div>
        </div>
    </section>
    <script>
        function filterHelp() {
            let input = document.getElementById("searchInput").value.toLowerCase();
            let items = document.querySelectorAll(".help-item");
            let noResults = document.getElementById("noResults");
            let found = false;
            items.forEach(item => {
                let titleElement = item.querySelector("h3"); // Select the title inside .help-item
                let title = titleElement ? titleElement.textContent.toLowerCase() : ""; // Ensure title exists
                if (title.includes(input)) {
                    item.style.display = "block";
                    found = true;
                } else {
                    item.style.display = "none";
                }
            });
            noResults.style.display = found ? "none" : "block";
        }
    </script>
@endsection
