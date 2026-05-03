@extends('layouts.app')

@section('content')
    <main class="main">
        <section class="error-section d-flex align-items-center justify-content-center min-vh-100">
            <div class="container text-center">
                <img src="{{ asset('errors/500.svg') }}" alt="500 Error"
                    class="img-fluid mb-4 w-50">
                <h1 class="h-3 mb-2 fw-bold">500 - Internal Server Error</h1>
                <p class="sf-12">Something went wrong on our side. We're working on it.</p>
                <a href="{{ url('/dashboard') }}" class="btn btn-primary mx-5 mt-3 rounded-pill">Return to Dashboard</a>
            </div>
        </section>
    </main>
@endsection
