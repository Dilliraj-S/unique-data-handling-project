@section('title', 'Get LicenseKey')
@section('legal', 'active')
@extends('layouts.landing-app')
@section('content')
<section id="Got-It" class="Got-It section d-flex flex-column align-items-center justify-content-between">
    <!-- Section Title at the Top -->
    <div class="container section-title text-center" data-aos="fade-up">
        <h2>Get Your License Key</h2>
        <p>Retrieve your license key by entering your registered email. If you remember your password, you can view the
            key here. Otherwise, we'll send it to your email.</p>
    </div>
    <!-- Card Positioned at the Bottom -->
    <div class="container d-flex justify-content-center mt-auto">
        <div class="card shadow-lg p-4" data-aos="fade-up" data-aos-delay="300" style="border-radius: 15px; width: 500px;">
            <div class="card-body text-center">
                <h3 class="text-primary">Retrieve License Key</h3>
                <p class="text-muted small alert alert-info">
                    Enter your email below. If you enter only your email, we will send a link to retrieve your license key.  
                    If you also enter your password, the license key will be shown instantly.
                </p>
                <form action="{{ route('website_form') }}" method="post" class="license-key-form mt-3 got-it-form" data-aos="fade-up" data-aos-delay="200">
                    @csrf
                    <input type="hidden" name="form_type" value="get_license_key">
                    <div class="mb-3">
                        <input type="email" name="email" class="form-control" placeholder="Your Email" required="">
                    </div>
                    <div class="mb-3" id="password-field">
                        <input type="password" class="form-control" name="password" placeholder="Your Password (Optional)">
                    </div>
                    <button type="submit" class="btn btn-primary w-100 landing-btn">Get License Key</button>
                </form>
            </div>
            
        </div>
    </div>
</section>
@endsection
