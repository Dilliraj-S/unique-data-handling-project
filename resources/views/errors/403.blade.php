@extends('layouts.app')

@section('content')
    <main class="main">
        <section class="error-section d-flex align-items-center justify-content-center min-vh-100">
            <div class="container text-center">
                <img src="{{ asset('errors/403.svg') }}" alt="403 Error"
                    class="img-fluid mb-4 w-50">
                <h1 class="h-3 mb-2 fw-bold">403 - Forbidden</h1>
                <p class="sf-12">You do not have permission to access this resource.</p>
                <a href="{{ url('/dashboard') }}" class="btn btn-primary mx-5 mt-3 rounded-pill">Return to Dashboard</a>
            </div>
        </section>
    </main>
@endsection
