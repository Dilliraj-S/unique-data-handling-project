@section('title', ucfirst($legalData['data'][0]['page_title'] ?? 'Legal'))
@section('legal', 'active')
@extends('layouts.landing-app')
@section('content')
    <section class="Got-It section testimonials section light-background">
        <!-- Section Title -->
        <div class="container section-title" data-aos="fade-up">
            <h2>{{ ucfirst($legalData['data'][0]['page_title']) ?? 'Expert Legal Solutions' }}</h2>
            <p>
                {{ $legalData['data'][0]['page_description'] ?? 'We provide expert legal services tailored to your business needs. Our team is dedicated to assisting you with legal updates, compliance, and advisory services to ensure smooth operations.' }}
            </p>
        </div>
        <!-- End Section Title -->
        <div class="container">
            <div class="row g-4">
                @foreach ($legalData['data'] as $legal)
                    <div class="col-lg-12" data-aos="fade-up" data-aos-delay="100">
                        <div class="testimonial-item position-relative">
                            <h3>{{ $loop->iteration }} . {{ $legal['heading'] }}</h3>
                            <p> {!! $legal['content'] !!}</p>
                            <p class="text-end text-muted bottom-1" style="font-size: 12px;">
                                Last updated :
                                {{ $legal['updated_at'] ? \Carbon\Carbon::parse($legal['updated_at'])->format('F j, Y, g:i a') : 'N/A' }}
                            </p>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    </section>
@endsection
