@extends('layouts.app')

@section('content')
    <main class="main">
        <section class="error-section d-flex align-items-center justify-content-center min-vh-100">
            <div class="container text-center">
                <img src="{{ asset('errors/503.svg') }}" alt="503 Error"
                    class="img-fluid mb-4 w-50">
                <h1 class="h-3 mb-2 fw-bold">503 - Service Unavailable</h1>
                <p class="sf-12">The service is temporarily unavailable. Please try again later.</p>
                <a href="{{ url('/') }}" class="btn btn-primary mx-5 mt-3 rounded-pill">Go to Homepage</a>
            </div>
        </section>
    </main>
@endsection
