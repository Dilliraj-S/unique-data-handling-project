@extends('layouts.app')

@section('content')
    <main class="main">
        <section class="error-section d-flex align-items-center justify-content-center min-vh-100">
            <div class="container text-center">
                <img src="{{ asset('errors/401.svg') }}" alt="401 Error"
                    class="img-fluid mb-4 w-50">
                <h1 class="h-3 mb-2 fw-bold">401 - Unauthorized</h1>
                <p class="sf-12">You are not authorized to view this page.</p>
                <a href="{{ url()->previous() }}" class="btn btn-primary mx-5 mt-3 rounded-pill">Return Back</a>
            </div>
        </section>
    </main>
@endsection
