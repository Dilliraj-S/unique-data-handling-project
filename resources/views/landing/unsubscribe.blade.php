@extends('layouts.empty-app')
@section('title', 'Got It :: Unsubscribe')
@section('content')
    <div class="auth-container">
        <div class="container p-5">
            <div class="card mx-auto shadow-lg" style="max-width: 500px;">
                <div class="card-body p-5 text-center">
                    <div class="logo-container text-center mb-3">
                        <a href="{{ url('/') }}" class="btn btn-primary"><i class="fa-solid fa-chevrons-left"></i></a>
                        <img src="{{ asset('treasury/company/logo/logo.svg') }}" alt="Logo" class="logo img-fluid">
                    </div>
                    <h4 class="text-primary">Unsubscribe</h4>
                    <p class="text-muted">We’re sorry to see you go. Please choose how you’d like to unsubscribe below.</p>
                    <!-- Subscription Type Selection -->
                    <div class="d-flex justify-content-center gap-3 my-3">
                        <button class="btn btn-outline-success rounded-circle p-3" onclick="showSection('whatsapp', this)">
                            <i class="fab fa-whatsapp fa-lg"></i>
                        </button>
                        <button class="btn btn-outline-primary rounded-circle p-3 active" onclick="showSection('email', this)">
                            <i class="fas fa-envelope fa-lg"></i>
                        </button>
                        <button class="btn btn-outline-warning rounded-circle p-3" onclick="showSection('both', this)">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    <!-- Unsubscribe Form -->
                    <form method="POST" action="{{ route('website_form') }}" class="got-it-form">
                        @csrf
                        <input type="hidden" name="form_type" value="unsubscribe">
                        <input type="hidden" id="type" name="type" value="email">
                        <!-- WhatsApp Section -->
                        <div id="whatsapp-section" class="form-section d-none">
                            <p>Enter your WhatsApp number to unsubscribe.</p>
                            <div class="input-group mb-3">
                                <span class="input-group-text"><i class="fab fa-whatsapp"></i></span>
                                <input type="text" class="form-control" name="value" placeholder="+1234567890" required>
                            </div>
                            <button type="submit" class="btn btn-danger w-100">Unsubscribe</button>
                        </div>
                        <!-- Email Section -->
                        <div id="email-section" class="form-section">
                            <p>Enter your email to unsubscribe.</p>
                            <div class="input-group mb-3">
                                <span class="input-group-text"><i class="fas fa-envelope"></i></span>
                                <input type="email" class="form-control" name="value" placeholder="your@email.com" required>
                            </div>
                            <button type="submit" class="btn btn-danger w-100">Unsubscribe</button>
                        </div>
                        <!-- Both Section -->
                        <div id="both-section" class="form-section d-none">
                            <p>Enter your details to unsubscribe from both.</p>
                            <div class="input-group mb-3">
                                <span class="input-group-text"><i class="fab fa-whatsapp"></i></span>
                                <input type="text" class="form-control" name="whatsapp" placeholder="+1234567890" required>
                            </div>
                            <div class="input-group mb-3">
                                <span class="input-group-text"><i class="fas fa-envelope"></i></span>
                                <input type="email" class="form-control" name="email" placeholder="your@email.com" required>
                            </div>
                            <button type="submit" class="btn btn-danger w-100 landing-btn">Unsubscribe</button>
                        </div>
                    </form>
                    <p class="mt-4 text-muted">Need help? <a href="mailto:info@gotit4all.com" class="text-primary">Contact us</a></p>
                </div>
            </div>
        </div>
    </div>
    <script>
        function showSection(section, element) {
            document.querySelectorAll('.form-section').forEach(el => {
                el.classList.add('d-none');
                el.querySelectorAll('input').forEach(input => input.removeAttribute('required'));
            });
            let selectedSection = document.getElementById(`${section}-section`);
            selectedSection.classList.remove('d-none');
            selectedSection.querySelectorAll('input').forEach(input => input.setAttribute('required', 'required'));
            document.getElementById('type').value = section;
            document.querySelectorAll('.btn-outline-success, .btn-outline-primary, .btn-outline-warning').forEach(el => el.classList.remove('active'));
            element.classList.add('active');
        }
    </script>
@endsection
