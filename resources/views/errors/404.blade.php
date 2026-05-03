@extends('layouts.app')

@section('content')
    <main class="main">
        <section class="error-section d-flex align-items-center justify-content-center min-vh-100">
            <div class="container text-center">
                <img src="{{ asset('errors/404.svg') }}" alt="404 Error"
                    class="img-fluid mb-4 w-50">
                <h1 class="h-3 mb-2 fw-bold">404 - Page Not Found</h1>
                <p class="sf-12">The page you are looking for could not be found.</p>
                <a href="{{ url()->previous() }}" class="btn btn-primary mx-5 mt-3 rounded-pill">Return Back</a>
            </div>
        </section>
    </main>
@endsection
