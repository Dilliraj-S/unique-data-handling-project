{{-- Template: Mail Config Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Mail Config')
@section('top-style')
    @livewireStyles
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/css/intlTelInput.css">
@endsection

@section('content')
   <livewire:email-auto-fetch />
@endsection

@section('bottom-script')
    @livewireScripts
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/intlTelInput.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/utils.js"></script>
   <script>
    document.addEventListener('DOMContentLoaded', function () {
        const phoneInput = document.querySelector("#phone_number");
        const livewireInput = document.querySelector("#livewire_phone_number");

        if (phoneInput) {
            const iti = window.intlTelInput(phoneInput, {
                initialCountry: "auto",
                separateDialCode: false,
                nationalMode: false,
                autoPlaceholder: "polite",
                formatOnDisplay: true,
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/utils.js",
                geoIpLookup: function (callback) {
                    fetch('https://ipapi.co/json/')
                        .then(response => response.json())
                        .then(data => callback(data.country_code))
                        .catch(() => callback('us'));
                }
            });

            function updatePhoneNumberToLivewire() {
                const fullNumber = iti.getNumber();
                livewireInput.value = fullNumber;
                livewireInput.dispatchEvent(new Event('input')); // notify Livewire
            }

            phoneInput.addEventListener('blur', updatePhoneNumberToLivewire);
            phoneInput.addEventListener('change', updatePhoneNumberToLivewire);
            phoneInput.addEventListener('keyup', updatePhoneNumberToLivewire);
        }
    });
</script>

@endsection