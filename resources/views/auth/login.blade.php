@extends('layouts.app')

@section('title', 'UniQue :: Login')

@section('content')
<!-- Main container with light blue gradient -->
<div class="auth-content" style="
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
">
    <!-- Floating card (same dimensions as before) -->
    <div class="col-md-4 col-sm-8 mx-auto">
        <!-- Card with floating effect -->
        <form method="POST" action="{{ route('login') }}" class="card" style="
            border: none;
            border-radius: 12px;
            overflow: hidden;
            transform: translateY(0);
            animation: float 6s ease-in-out infinite;
            box-shadow: 0 12px 24px rgba(0, 120, 180, 0.1);
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(6px);
            border: 1px solid rgba(149, 209, 255, 0.2);
        ">
            @csrf
            <div class="card-body p-4">
                <div class="text-center mb-4">
                    <a href="{{ url('/') }}">
                        <img src="{{ asset('treasury/company/logo/unq logo.png') }}"
                            style="width: 50%; height: auto; filter: drop-shadow(0 2px 4px rgba(0, 100, 150, 0.1));"
                            alt="UniQue Logo">
                    </a>
                </div>

                <!-- Header -->
                <div class="text-center mb-3">
                    <h4 class="mb-1" style="color: #0369a1;">Welcome Back!</h4>
                    <p class="text-muted small mb-0">Sign in to continue your session</p>
                </div>

                <!-- Username Input -->
                <div class="mb-3">
                    <div class="float-input-control">
                        <span class="float-group-end" style="color: #38bdf8;"><i class="ti ti-user"></i></span>
                        <input type="text" id="username" name="username" class="form-float-input"
                            placeholder="User name" value="{{ old('username') }}" required
                            autocomplete="username" autofocus>
                        <label for="username" class="form-float-label">User Name</label>
                        @error('username')
                        <span class="invalid-feedback d-block small" role="alert">
                            {{ $message }}
                        </span>
                        @enderror
                    </div>
                </div>

                <!-- Password Input -->
                <div class="mb-3">
                    <div class="float-input-control">
                        <span class="float-group-end toggle-password" style="color: #38bdf8;"><i class="ti ti-eye-off"></i></span>
                        <input type="password" id="password" name="password" class="form-float-input"
                            placeholder="Password" required autocomplete="current-password">
                        <label for="password" class="form-float-label">Password</label>
                        @error('password')
                        <span class="invalid-feedback d-block small" role="alert">
                            {{ $message }}
                        </span>
                        @enderror
                    </div>
                </div>

                <!-- Remember Me & Forgot Password -->
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <div class="form-check form-check-sm mb-0 ms-2 d-flex align-items-center">
                        <input class="form-check-input rounded-circle p-2" id="remember_me" type="checkbox"
                            name="remember" value="1" {{ old('remember') ? 'checked' : '' }}>
                        <label for="remember_me" class="form-check-label ms-1 small mt-1" style="color: #64748b;">Remember Me</label>
                    </div>
                    <div class="text-end">
                        <a href="{{ route('password.request') }}" class="small" style="color: #0ea5e9;">Forgot Password?</a>
                    </div>
                </div>

                <!-- Submit Button -->
                <button type="submit" class="btn w-100 py-2 rounded-lg mb-2 border-0"
                    style="
                        background: linear-gradient(to right, #0ea5e9, #22d3ee);
                        color: white;
                        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
                        transition: all 0.2s ease;
                    ">
                    Login
                </button>

                <!-- Authentication ID -->
                <div class="mt-3 pt-2 border-top text-center" style="border-color: rgba(0, 180, 216, 0.1) !important;">
                    <small class="text-muted">
                        <span style="
                            font-family: monospace;
                            padding: 2px 8px;
                            border-radius: 4px;
                            color: #0e7490;
                        ">
                            Authentication Id : {{ request()->ip() }}
                        </span>
                    </small>
                </div>
            </div>
        </form>

        <!-- Footer -->
        <div class="text-center mt-5">
            <p class="mb-0 small" style="color: #64748b;">© {{ date('Y') }} - <b>UniQue</b> Made with 💖 by
                <a href="https://digitalkuppam.com" target="_blank" style="color: #0ea5e9;" class="text-decoration-none">Digital Kuppam</a>
            </p>
        </div>
    </div>
</div>

<style>
    /* Floating animation */
    @keyframes float {

        0%,
        100% {
            transform: translateY(0px);
        }

        50% {
            transform: translateY(-6px);
        }
    }

    /* Input focus effects */
    .form-float-input:focus {
        border-color: #7dd3fc !important;
        box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.3) !important;
    }

    /* Button hover effect */
    button[type="submit"]:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4) !important;
        background: linear-gradient(to right, #0ea5e9, #06b6d4) !important;
    }

    /* Toggle password button */
    .toggle-password {
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .toggle-password:hover {
        color: #0284c7 !important;
    }

    /* Link hover effect */
    a:hover {
        opacity: 0.8;
        text-decoration: underline;
    }
</style>

<script>
    // Toggle password visibility
    document.querySelector('.toggle-password').addEventListener('click', function() {
        const passwordInput = document.getElementById('password');
        const icon = this.querySelector('i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('ti-eye-off');
            icon.classList.add('ti-eye');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('ti-eye');
            icon.classList.add('ti-eye-off');
        }
    });
</script>
@endsection