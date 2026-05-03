@section('title', 'Payment Status')
@section('legal', 'active')
@extends('layouts.empty-app')
@section('top-style')
<link rel="stylesheet" href="{{ asset('treasury/landing/pages/payment/page-pay.css') }}" />
@endsection
@section('bottom-script')
<script>
    $(document).ready(function() {
        // Redirection timer
        let countdown = 30;
        setInterval(function() {
            if (countdown > 0) {
                $('#redirectTimer').text(countdown);
                countdown--;
            } else {
                window.location.href = '{{ $data['return_url'] }}';
            }
        }, 1000); 
    }); 
</script>
@endsection
@section('content')
<div class="payment-container">
    <div></div>
    <div class="payment-container-body">
        <div class="payment-initiator">
            <img src="{{ asset('treasury/company/logo/logo.svg') }}" alt="">
        </div>
        <div class="card payment-container-card text-center">
            @if($data['status'] == 'success')
            <div class="text-center">
                <i class="bi display-1 bi-check-circle text-success"></i>
                <h3 class="fw-bold mt-3 text-primary">Payment Successful</h3>
                <h2 class="fw-bold mb-2"><i class="fa fa-inr sf-24 me-1" aria-hidden="true"></i>{{ $data['amount'] }}</h2>
                <h6 class="fw-bold mt-3">Thank You!</h6>
                <p class="text-muted sf-12 mb-2">Payment processed successfully. Check your email for details.</p>
            </div>
            <div class="payment-details">
                <table class="table table-sm mt-3">
                    <tbody>
                        <tr>
                            <td class="pgs-tbr-key text-start">Plan Name</td>
                            <td class="text-muted pgs-tbr-sprtr text-center">:</td>
                            <td class="pgs-tbr-value text-end">Seed</td>
                        </tr>
                        <tr>
                            <td class="pgs-tbr-key text-start">Reference ID</td>
                            <td class="text-muted pgs-tbr-sprtr text-center">:</td>
                            <td class="pgs-tbr-value text-end">{{ $data['reference_id'] }}</td>
                        </tr>
                        <tr>
                            <td class="pgs-tbr-key text-start">Transaction ID</td>
                            <td class="text-muted pgs-tbr-sprtr text-center">:</td>
                            <td class="pgs-tbr-value text-end">{{ $data['transaction_id'] }}</td>
                        </tr>
                        <tr>
                            <td class="pgs-tbr-key text-start">Transaction Date</td>
                            <td class="text-muted pgs-tbr-sprtr text-center">:</td>
                            <td class="pgs-tbr-value text-end">{{ $data['transaction_date'] }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="text-center mt-4">
                <p class="text-muted sf-11">
                    You will be redirected to the product page in <span id="redirectTimer" class="text-primary fw-bold">10</span> seconds.
                </p>
                <p class="small text-muted">
                    If you need any assistance regarding your payment, please contact our support team.
                </p>
            </div>
            <div class="text-center mt-4 mb-2">
                <a href="{{ $data['return_url'] }}" class="btn btn-primary px-4 rounded-pill">Go to Product Page</a>
            </div>
            @elseif($data['status'] == 'failure')
            <div class="text-center">
                <i class="bi display-1 bi-x-circle text-danger"></i>
                <h3 class="fw-bold mt-3">Payment Failed</h3>
                <h2 class="fw-bold mb-2"><i class="fa fa-inr me-2 sf-24" aria-hidden="true"></i>{{ $data['amount'] }}</h2>
                <p class="text-muted sf-12">Payment failed. Check details and try again or contact support.</p>
            </div>
            <div class="payment-details text-start">
                <table class="table table-sm mt-3">
                    <tbody>
                        <tr>
                            <td class="pgs-tbr-key text-start">Plan Name</td>
                            <td class="text-muted pgs-tbr-sprtr text-center">:</td>
                            <td class="pgs-tbr-value text-end">Seed</td>
                        </tr>
                        <tr>
                            <td class="pgs-tbr-key text-start">Reference ID</td>
                            <td class="text-muted pgs-tbr-sprtr text-center">:</td>
                            <td class="pgs-tbr-value text-end">{{ $data['reference_id'] }}</td>
                        </tr>
                        <tr>
                            <td class="pgs-tbr-key text-start">Transaction ID</td>
                            <td class="text-muted pgs-tbr-sprtr text-center">:</td>
                            <td class="pgs-tbr-value text-end">{{ $data['transaction_id'] }}</td>
                        </tr>
                        <tr>
                            <td class="pgs-tbr-key text-start">Transaction Date</td>
                            <td class="text-muted pgs-tbr-sprtr text-center">:</td>
                            <td class="pgs-tbr-value text-end">{{ $data['transaction_date'] }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="text-center mt-4">
                <p class="text-muted sf-11">
                    You will be redirected to the product page in <span id="redirectTimer" class="text-primary fw-bold">10</span> seconds.
                </p>
                <p class="small text-muted">
                    If you need any assistance regarding your payment, please contact our support team.
                </p>
            </div>
            <div class="text-center mt-4 mb-2">
                <a href="{{ $data['return_url'] }}" class="btn btn-primary px-4 rounded-pill">Go to Product Page</a>
                <a href="{{ url('/contact') }}" class="btn btn-outline-secondary px-4 rounded-pill">Contact Support</a>
            </div>
            @elseif($data['status'] == 'wrong')
            <div class="mt-4 text-center">
                <i class="bi display-1 bi-exclamation-triangle text-warning"></i>
                <h3 class="fw-bold mt-3">Something Went Wrong</h3>
                <p class="text-muted sf-12">
                    We encountered an unexpected issue while processing your request. Please try again later. If the problem persists, contact our support team for assistance.
                </p>
            </div>
            <div class="text-center mt-4">
                <p class="text-muted sf-11">
                    You will be redirected to the product page in <span id="redirectTimer" class="text-primary fw-bold">10</span> seconds.
                </p>
                <p class="small text-muted">
                    We apologize for the inconvenience and appreciate your patience.
                </p>
            </div>
            <div class="text-center mt-4 mb-4">
                <a href="{{ $data['return_url'] }}" class="btn btn-primary px-4 rounded-pill me-3">Go to Product Page</a>
                <a href="{{ url('/contact') }}" class="btn btn-outline-secondary px-4 rounded-pill">Contact Support</a>
            </div>
            @elseif($data['status'] == 'already_paid')
            <div class="mt-4 text-center">
                <i class="bi display-1 bi-check-circle text-success"></i>
                <h3 class="fw-bold mt-3">Payment Already Completed</h3>
                <p class="text-muted sf-12">
                    You have already completed this payment. If you believe this is an error or need further assistance, please contact our support team.
                </p>
            </div>
            <div class="text-center mt-4">
                <p class="text-muted sf-11">
                    You will be redirected to your dashboard in <span id="redirectTimer" class="text-primary fw-bold">10</span> seconds.
                </p>
                <p class="small text-muted">
                    If you are not redirected automatically, click the button below.
                </p>
            </div>
            <div class="text-center mt-4 mb-4">
                <a href="{{ $data['return_url'] ?? url('/dashboard') }}" class="btn btn-success px-4 rounded-pill me-3">Go to Dashboard</a>
                <a href="{{ url('/contact') }}" class="btn btn-outline-secondary px-4 rounded-pill">Contact Support</a>
            </div>
        
            <script>
                // Auto-redirect to dashboard after 10 seconds
                let countdown = 10;
                let timer = setInterval(() => {
                    if (countdown <= 1) {
                        clearInterval(timer);
                        window.location.href = "{{ $data['return_url'] ?? url('/dashboard') }}";
                    }
                    document.getElementById("redirectTimer").textContent = --countdown;
                }, 1000);
            </script>

        
            @else
            <div class="text-center">
                <i class="bi bi-clock-history text-warning display-1"></i>
                <h3 class="fw-bold mt-3">Session Expired</h3>
                <p class="text-muted sf-12">Session expired due to inactivity. Refresh or start a new session.</p>
            </div>
            <div class="text-center mt-4">
                <p class="text-muted sf-11">
                    You will be redirected to the product page in <span id="redirectTimer" class="text-primary fw-bold">10</span> seconds.
                </p>
                <p class="small text-muted">
                    If you need assistance, feel free to contact our support team.
                </p>
            </div>
            <div class="text-center mt-4 mb-4">
                <a href="{{ $data['return_url'] }}" class="btn btn-primary px-4 rounded-pill">Go to Product Page</a>
                <a href="{{ url('/contact') }}" class="btn btn-outline-secondary px-4 rounded-pill">Contact Support</a>
            </div>
            @endif
        </div>
    </div>
    <div class="payment-footer">
        <p class="mb-1">&copy; {{ date('Y') }} Digital Kuppam. All Rights Reserved.</p>
        <p class="small">
            <a href="{{ url('/terms') }}" class="text-decoration-none">Terms & Conditions</a> |
            <a href="{{ url('/privacy-policy') }}" class="text-decoration-none">Privacy Policy</a>
        </p>
    </div>
</div>
@endsection
