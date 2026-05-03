{{-- Template: Mail Config Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Mail Config')
@section('top-style')
    {{-- <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"> --}}
    {{-- <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"> --}}
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/css/intlTelInput.css">
    <link rel="stylesheet" href="{{ asset('treasury/libraries/visuals/datatables/datatables.min.css') }}">
    <style>
        /* Core styles for card-based layout */
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }

        .container {
            max-width: 1280px;
            margin: 2rem auto;
            padding: 0 1rem; 
        }

        .card {

            background: #ffffff;
            border-radius: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }



        .card-header {
            background: #1db4cd;
            border-bottom: 2px solid #e0e7ef;
            font-size: 1.5rem;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.5px;
        }

        .card-body {
            padding: 2rem;
        }

        .form-control {
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .form-control:focus {
            outline: none;
            border-color: #1db4cd;
            box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.2);
        }

        .form-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
            margin-bottom: 0.5rem;
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 500;
            transition: background-color 0.2s ease, transform 0.2s ease;
        }

        .btn-primary {
            background: #1db4cd;
            color: #ffffff;
            border: none;
        }

        .btn-primary:hover {
            background: #1e3a8a;
            transform: translateY(-2px);
        }

        .btn-secondary {
            background: #6b7280;
            color: #ffffff;
            border: none;
        }

        .btn-secondary:hover {
            background: #4b5563;
            transform: translateY(-2px);
        }

        .btn-outline-primary {
            border: 1px solid #1db4cd;
            color: #1db4cd;
            background: transparent;
        }

        .btn-outline-primary:hover {
            background: #1db4cd;
            color: #ffffff;
            transform: translateY(-2px);
        }

        .alert {
            padding: 1rem;
            border-radius: 0.5rem;
            margin-top: 1rem;
            font-size: 0.875rem;
            animation: slideIn 0.3s ease;
        }

        .alert-success {
            background: #dcfce7;
            color: #166534;
        }

        .alert-danger {
            background: #fee2e2;
            color: #991b1b;
        }

        .fade-in {
            animation: fadeIn 0.5s ease;
        }

        /* intl-tel-input styles */
        .iti {
            width: 100%;
        }

        .iti__tel-input {
            width: 100%;
            height: 38px;
            font-size: 14px;
            padding-left: 50px;
            border: 1px solid #ced4da;
            border-radius: 4px;
        }

        .iti__flag-container {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            left: 8px;
            z-index: 1;
        }

        .iti__country-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #ccc;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .iti__country-list.above {
            bottom: 100%;
            top: auto;
            box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
        }

        .iti--container {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 2000;
        }

        .iti__dropdown-content {
            z-index: 2000 !important;
            max-height: 200px;
            overflow-y: auto;
        }

        /* Additional styles */
        .select2-container--default .select2-selection--single {
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            height: 44px;
            padding: 0.5rem;
        }

        .select2-container--default .select2-selection--single .select2-selection__rendered {
            line-height: 30px;
            font-size: 0.875rem;
        }

        .select2-container--default .select2-selection--single .select2-selection__arrow {
            height: 40px;
        }

        .table-responsive {
            border-radius: 0.5rem;
            overflow: hidden;
        }

        .table th,
        .table td {
            padding: 1rem;
            font-size: 0.875rem;
        }

        .table th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
        }

        .config-icon {
            cursor: pointer;
            color: #1db4cd;
            transition: color 0.2s ease;
        }

        .config-icon:hover {
            color: #1e3a8a;
        }

        .popover {
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .setup-card {
            background: #f9fafb;
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .setup-card h6 {
            font-size: 1rem;
            font-weight: 600;
            color: #374151;
            margin-bottom: 1rem;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }

        @keyframes slideIn {
            from {
                transform: translateY(-10px);
                opacity: 0;
            }

            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @media (max-width: 768px) {
            .card-body {
                padding: 1.5rem;
            }

            .btn {
                padding: 0.5rem 1rem;
            }

            .form-control {
                font-size: 0.75rem;
            }
        }
    </style>
@endsection

@section('content')
    <div class="container">
        <!-- Account Details Card -->
        <div class="card fade-in">
            <div class="card-header">
                Add Email Account - Personal Details
            </div>
            <div class="card-body">
                <form id="account-details-form">
                    <div class="row mb-5 mt-5">
                        <div class="col-12 col-md-6 mb-4 mb-md-0">
                            <div class="float-input-control">
                                <input type="text" id="first-name" name="first-name" class="form-float-input" required
                                    placeholder="First Name">
                                <label for="first-name" class="form-float-label">First Name <span
                                        class="text-danger">*</span></label>
                            </div>
                        </div>
                        <div class="col-12 col-md-6">
                            <div class="float-input-control">
                                <input type="text" id="last-name" name="last-name" class="form-float-input" required
                                    placeholder="Last Name">
                                <label for="last-name" class="form-float-label">Last Name <span
                                        class="text-danger">*</span></label>
                            </div>
                        </div>
                    </div>
                    <div class="row mb-4">
                        <div class="col-12 col-md-6 mb-4 mb-md-0">
                            <div class="float-input-control">
                                <input type="tel" id="extension" name="extension" class="form-float-input"
                                    placeholder="Phone Number">
                                <label for="extension" class="form-float-label"></label>
                            </div>
                        </div>
                        <div class="col-12 col-md-6">
                            <div class="float-input-control">
                                <input type="text" id="designation" name="designation" class="form-float-input" required
                                    placeholder="Designation">
                                <label for="designation" class="form-float-label">Designation <span
                                        class="text-danger">*</span></label>
                            </div>
                        </div>
                    </div>
                    <div class="row mb-4">
                        <div class="col-12 col-md-6 mb-4 mb-md-0">
                            <div class="float-input-control">
                                <input type="url" id="unsubscribe" name="unsubscribe" class="form-float-input"
                                    placeholder="Unsubscribe URL">
                                <label for="unsubscribe" class="form-float-label">Unsubscribe URL</label>
                            </div>
                        </div>
                        <div class="col-12 col-md-6">
                            <div class="float-input-control">
                                <input type="text" id="fax" name="fax" class="form-float-input"
                                    placeholder="Fax">
                                <label for="fax" class="form-float-label">Fax</label>
                            </div>
                        </div>
                    </div>
                    <div class="row mb-4">
                        <div class="col-12 col-md-6 mb-4 mb-md-0">
                            <div class="float-input-control">
                                <select id="region" name="region" class="form-float-input">
                                    <option value="">Select a region</option>
                                    <option value="North America">North America</option>
                                    <option value="South America">South America</option>
                                    <option value="APJ & APAC">APJ & APAC</option>
                                    <option value="EMEA">EMEA</option>
                                    <option value="MENA">MENA</option>
                                    <option value="DACH">DACH</option>
                                    <option value="Oceania">Oceania</option>
                                    <option value="NORDICS">NORDICS</option>
                                </select>
                                <label for="region" class="form-float-label">Region <span
                                        class="text-danger">*</span></label>
                            </div>
                        </div>
                        <div class="col-12 col-md-6">
                            <div class="float-input-control">
                                <input type="text" id="postal-code" name="postal-code" class="form-float-input" required
                                    placeholder="Postal Code">
                                <label for="postal-code" class="form-float-label">Postal Code <span
                                        class="text-danger">*</span></label>
                            </div>
                        </div>
                    </div>
                    <div class="row mb-4">
                        <div class="col-12 col-md-6 mb-4 mb-md-0">
                            <div class="float-input-control">
                                <textarea id="address" name="address" class="form-float-input" rows="4" required placeholder="Address"></textarea>
                                <label for="address" class="form-float-label">Address <span
                                        class="text-danger">*</span></label>
                            </div>
                        </div>
                        <div class="col-12 col-md-6">
                            <div class="float-input-control">
                                <input type="number" id="daily-send-limit" name="daily_send_limit"
                                    class="form-float-input" min="1" required placeholder="Daily Send Limit">
                                <label for="daily-send-limit" class="form-float-label">Daily Send Limit <span
                                        class="text-danger">*</span></label>

                            </div>
                            <small class="text-muted">Maximum emails this account can send per rolling 24
                                hours.</small>
                        </div>
                    </div>
                    <div class="d-flex justify-content-end">
                        <button type="submit" class="btn btn-primary">Next</button>
                    </div>
                </form>
                <div id="account-details-message" class="alert" style="display: none;"></div>
            </div>
        </div>



        <!-- Setup Choice Card -->
        <div class="card fade-in" id="setup-choice-card" style="display: none;">
            <div class="card-header">
                Choose Setup Method
            </div>
            <div class="card-body">
                <div class="d-flex flex-column align-items-center gap-3">
                    <button type="button" class="btn btn-primary w-100" style="max-width: 300px;" id="google-auth-btn">
                        <i class="bi bi-google mr-2"></i> Add Google Account
                    </button>
                    <button type="button" class="btn btn-outline-primary w-100" style="max-width: 300px;"
                        id="manual-setup-btn">
                        <i class="bi bi-gear mr-2"></i> Manual Setup
                    </button>
                </div>
                <div class="d-flex justify-content-start mt-4">
                    <button type="button" class="btn btn-secondary" id="back-to-account-details">Back</button>
                </div>
                <div id="setup-choice-message" class="alert mt-4" style="display: none;"></div>
            </div>
        </div>

        <!-- Manual Setup Card -->
        <div class="card fade-in" id="manual-setup-card" style="display: none;">
            <div class="card-header">
                Manual Email Configuration
            </div>
            <div class="card-body">
                <form id="manual-setup-form">
                    <div class="row mb-4">
                        <div class="col-12 col-md-6 mb-4 mb-md-0">
                            <div class="float-input-control">
                                <input type="email" class="form-float-input" id="manual-email" required
                                    placeholder="Email Address">
                                <label for="manual-email" class="form-float-label">Email Address <span
                                        class="text-danger">*</span></label>
                            </div>
                        </div>
                        <div class="col-12 col-md-6">
                            <div class="float-input-control">
                                <input type="password" class="form-float-input" id="manual-password" required
                                    placeholder="Password">
                                <label for="manual-password" class="form-float-label">Password <span
                                        class="text-danger">*</span></label>
                            </div>
                        </div>
                    </div>

                    <div class="mb-4">
                        <button type="button" class="btn btn-outline-primary" id="auto-detect-btn">
                            <i class="bi bi-magic mr-2"></i> Auto-Detect Settings
                        </button>
                    </div>

                    <div class="row">
                        <!-- IMAP Card -->
                        <div class="col-12 col-md-6 mb-4">
                            <div class="setup-card">
                                <h6>Receive (IMAP)</h6>
                                <div class="mb-4">
                                    <div class="float-input-control">
                                        <input type="email" class="form-float-input" id="imap-email" disabled
                                            placeholder="Email Address">
                                        <label for="imap-email" class="form-float-label">Email Address</label>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <div class="float-input-control">
                                        <input type="password" class="form-float-input" id="imap-password" disabled
                                            placeholder="Password">
                                        <label for="imap-password" class="form-float-label">Password</label>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <div class="float-input-control">
                                        <input type="text" class="form-float-input" id="incoming-host" required
                                            placeholder="IMAP Host">
                                        <label for="incoming-host" class="form-float-label">IMAP Host <span
                                                class="text-danger">*</span></label>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <div class="float-input-control">
                                        <input type="number" class="form-float-input" id="incoming-port" required
                                            placeholder="IMAP Port">
                                        <label for="incoming-port" class="form-float-label">IMAP Port <span
                                                class="text-danger">*</span></label>
                                    </div>
                                </div>
                                <div>
                                    <div class="float-input-control">
                                        <select class="form-float-input" id="incoming-encryption">
                                            <option value="">Select Encryption</option>
                                            <option value="ssl">SSL</option>
                                            <option value="tls">TLS</option>
                                            <option value="starttls">STARTTLS</option>
                                            <option value="none">None</option>
                                        </select>
                                        <label for="incoming-encryption" class="form-float-label">IMAP Encryption <span
                                                class="text-danger">*</span></label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- SMTP Card -->
                        <div class="col-12 col-md-6">
                            <div class="setup-card">
                                <h6>Send (SMTP)</h6>
                                <div class="mb-4">
                                    <div class="float-input-control">
                                        <input type="email" class="form-float-input" id="smtp-email" disabled
                                            placeholder="Email Address">
                                        <label for="smtp-email" class="form-float-label">Email Address</label>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <div class="float-input-control">
                                        <input type="password" class="form-float-input" id="smtp-password" disabled
                                            placeholder="Password">
                                        <label for="smtp-password" class="form-float-label">Password</label>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <div class="float-input-control">
                                        <input type="text" class="form-float-input" id="outgoing-host" required
                                            placeholder="SMTP Host">
                                        <label for="outgoing-host" class="form-float-label">SMTP Host <span
                                                class="text-danger">*</span></label>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <div class="float-input-control">
                                        <input type="number" class="form-float-input" id="outgoing-port" required
                                            placeholder="SMTP Port">
                                        <label for="outgoing-port" class="form-float-label">SMTP Port <span
                                                class="text-danger">*</span></label>
                                    </div>
                                </div>
                                <div>
                                    <div class="float-input-control">
                                        <select class="form-float-input" id="outgoing-encryption">
                                            <option value="">Select Encryption</option>
                                            <option value="ssl">SSL</option>
                                            <option value="tls">TLS</option>
                                            <option value="starttls">STARTTLS</option>
                                            <option value="none">None</option>
                                        </select>
                                        <label for="outgoing-encryption" class="form-float-label">SMTP Encryption <span
                                                class="text-danger">*</span></label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between gap-3 mt-4">
                        <button type="button" class="btn btn-secondary" id="back-to-setup-choice">Back</button>
                        <div class="d-flex gap-3">
                            <button type="button" class="btn btn-secondary" id="test-connection-btn">Test
                                Connection</button>
                            <button type="submit" class="btn btn-primary" id="save-manual-account-btn">Save
                                Account</button>
                        </div>
                    </div>
                </form>
                <div id="manual-form-message" class="alert mt-4" style="display: none;"></div>
            </div>
        </div>


        <!-- Email Accounts Table -->
        <div class="card mt-5">
            <div class="card-body">
                <script>
                    // Example: populate table dynamically (replace with your actual data loading logic)
                    function renderEmailAccountsTable(accounts) {
                        const tbody = document.getElementById('email-accounts-table-body');
                        tbody.innerHTML = '';
                        accounts.forEach(account => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
            <td>${account.email}</td>
            <td>${account.first_name}</td>
            <td>${account.last_name}</td>
            <td>${account.region}</td>
            <td>${account.daily_send_limit || '-'}</td>
            <td>${account.status}</td>
            <td>
                <!-- Actions: Edit/Delete buttons here -->
                <button class="btn btn-sm btn-primary edit-account" data-id="${account.id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-account" data-id="${account.id}">Delete</button>
            </td>
        `;
                            tbody.appendChild(row);
                        });
                    }
                    // Call renderEmailAccountsTable() after fetching data from your API/backend.
                </script>

                <div data-skeleton-table-set="@skeletonToken('central_email_config')_t"></div>

            </div>
        </div>
    </div>
@endsection

@section('bottom-script')
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0/dist/js/select2.min.js"></script>
    <script src="{{ asset('treasury/libraries/visuals/datatables/datatables.min.js') }}"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/intlTelInput.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/utils.js"></script>
    <script>
        $(document).ready(function() {
            let accountDetailsFilled = false;
            let accountDetailsData = {};

            // Dependency checks
            console.log('jQuery:', typeof jQuery !== 'undefined' ? 'Loaded' : 'Not Loaded');
            console.log('Bootstrap:', typeof bootstrap !== 'undefined' ? 'Loaded' : 'Not Loaded');
            console.log('intlTelInput:', typeof intlTelInput !== 'undefined' ? 'Loaded' : 'Not Loaded');
            console.log('Select2:', typeof $.fn.select2 !== 'undefined' ? 'Loaded' : 'Not Loaded');

            if (typeof intlTelInput === 'undefined') {
                alert('intl-tel-input not loaded. Check network or CDN.');
                return;
            }

            let phoneIti = null;

            function initializePhoneInput(inputId, initialCountry = 'in') {
                const input = document.querySelector(inputId);
                if (!input) {
                    console.error(`Input ${inputId} not found`);
                    return null;
                }
                console.log(`Initializing intl-tel-input for ${inputId}`);
                // Destroy existing instance if any
                if (input.intlTelInput) {
                    input.intlTelInput.destroy();
                }
                const iti = window.intlTelInput(input, {
                    initialCountry: initialCountry,
                    separateDialCode: true,
                    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/utils.js",
                    preferredCountries: ['in', 'us', 'gb'],
                    nationalMode: false,
                    autoPlaceholder: 'aggressive',
                    dropdownContainer: document.body,
                    customContainer: 'intl-tel-input'
                });
                console.log('intl-tel-input initialized:', iti);
                // Ensure dropdown is styled correctly
                $('.iti__country-list').css('z-index', '2000');
                if ($('.iti--container').length === 0) {
                    $('body').append('<div class="iti--container"></div>');
                }
                return iti;
            }

            // Initialize phone input on page load
            phoneIti = initializePhoneInput('#extension');

            // Debug dropdown click
            $('#extension').on('click', function() {
                console.log('Phone input clicked');
            });

            function showMessage(containerId, message, type = 'success') {
                const $message = $(`#${containerId}`);
                $message.removeClass('alert-success alert-danger')
                    .addClass(`alert-${type}`).text(message).show();
                setTimeout(() => $message.hide(), 5000);
            }

            const portSettings = {
                imap: {
                    ssl: 993,
                    tls: 143,
                    starttls: 143,
                    none: 143
                },
                smtp: {
                    ssl: 465,
                    tls: 587,
                    starttls: 587,
                    none: 25
                }
            };

            $('#incoming-encryption').on('change', function() {
                const encryption = $(this).val();
                $('#incoming-port').val(portSettings.imap[encryption]);
            });

            $('#outgoing-encryption').on('change', function() {
                const encryption = $(this).val();
                $('#outgoing-port').val(portSettings.smtp[encryption]);
            });

            $('#manual-email').on('input', function() {
                $('#imap-email').val($(this).val());
                $('#smtp-email').val($(this).val());
            });

            $('#manual-password').on('input', function() {
                $('#imap-password').val($(this).val());
                $('#smtp-password').val($(this).val());
            });

            $('#account-details-form').on('submit', function(e) {
                e.preventDefault();
                if (!phoneIti) {
                    showMessage('account-details-message', 'Phone field not initialized.', 'danger');
                    return;
                }

                const phoneData = getPhoneNumberData(phoneIti);
                const $form = $(this);
                if (!$form[0].checkValidity()) {
                    $form.addClass('was-validated');
                    showMessage('account-details-message', 'Please fill all required fields.', 'danger');
                    return;
                }

                accountDetailsData = {
                    first_name: $('#first-name').val().trim(),
                    last_name: $('#last-name').val().trim(),
                    extension: phoneData.extension,
                    phone_number: phoneData.phone_number,
                    designation: $('#designation').val().trim(),
                    postal_code: $('#postal-code').val().trim(),
                    address: $('#address').val().trim(),
                    fax: $('#fax').val().trim(),
                    unsubscribe: $('#unsubscribe').val().trim(),
                    region: $('#region').val().trim(),
                    daily_send_limit: $('#daily-send-limit').val().trim()
                };

                sessionStorage.setItem('accountDetailsData', JSON.stringify(accountDetailsData));
                accountDetailsFilled = true;
                showMessage('account-details-message', 'Details saved. Please choose setup method.',
                    'success');
                $('.card').eq(0).hide();
                $('#setup-choice-card').show();
            });

            $('#google-auth-btn').on('click', function(e) {
                e.preventDefault();
                if (!accountDetailsFilled) {
                    showMessage('setup-choice-message', 'Please fill and submit account details first.',
                        'danger');
                    $('.card').eq(0).show();
                    $('#setup-choice-card').hide();
                    return;
                }

                $.ajax({
                    url: '/pre-save-google-account',
                    method: 'POST',
                    data: accountDetailsData,
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    success: function(response) {
                        sessionStorage.removeItem('accountDetailsData');
                        accountDetailsFilled = false;
                        window.location.href = response.redirect;
                    },
                    error: function(xhr) {
                        showMessage('setup-choice-message', 'Failed to pre-save data: ' + (xhr
                            .responseJSON?.error || 'Unknown error'), 'danger');
                    }
                });
            });

            $('#manual-setup-btn').on('click', function(e) {
                e.preventDefault();
                if (!accountDetailsFilled) {
                    showMessage('setup-choice-message', 'Please fill and submit account details first.',
                        'danger');
                    $('.card').eq(0).show();
                    $('#setup-choice-card').hide();
                    return;
                }

                $('#setup-choice-card').hide();
                $('#manual-setup-card').show();
            });

            $('#manual-setup-form').on('submit', function(e) {
                e.preventDefault();
                if (!accountDetailsFilled) {
                    showMessage('manual-form-message', 'Please fill and submit account details first.',
                        'danger');
                    $('.card').eq(0).show();
                    $('#manual-setup-card').hide();
                    return;
                }

                const $form = $(this);
                if (!$form[0].checkValidity()) {
                    $form.addClass('was-validated');
                    showMessage('manual-form-message', 'Please fill all required fields.', 'danger');
                    return;
                }

                const formData = {
                    type: 'manual',
                    email: $('#manual-email').val().trim(),
                    password: $('#manual-password').val().trim(),
                    incoming_host: $('#incoming-host').val().trim(),
                    incoming_port: $('#incoming-port').val().trim(),
                    incoming_encryption: $('#incoming-encryption').val().trim(),
                    outgoing_host: $('#outgoing-host').val().trim(),
                    outgoing_port: $('#outgoing-port').val().trim(),
                    outgoing_encryption: $('#outgoing-encryption').val().trim(),
                    status: 'active',
                    ...JSON.parse(sessionStorage.getItem('accountDetailsData') || '{}')
                };

                $('#save-manual-account-btn').prop('disabled', true).text('Saving...');

                $.ajax({
                    url: '/api/email-accounts',
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    contentType: 'application/json',
                    data: JSON.stringify(formData),
                    success: function(response) {
                        showMessage('manual-form-message', 'Manual account saved successfully!',
                            'success');
                        sessionStorage.setItem(`emailConfig_${response.account.email}`, JSON
                            .stringify({
                                limit: 1450,
                                priority: 1
                            }));
                        fetchEmailAccounts();
                        $('#manual-setup-form')[0].reset();
                        $('#account-details-form')[0].reset();
                        sessionStorage.removeItem('accountDetailsData');
                        accountDetailsFilled = false;
                        $('.card').eq(0).show();
                        $('#manual-setup-card').hide();
                    },
                    error: function(xhr) {
                        let errorMessage = xhr.responseJSON?.error ||
                            'Failed to save manual account.';
                        showMessage('manual-form-message', errorMessage, 'danger');
                    },
                    complete: function() {
                        $('#save-manual-account-btn').prop('disabled', false).text(
                            'Save Account');
                    }
                });
            });

            $('#auto-detect-btn').on('click', function() {
                const email = $('#manual-email').val().trim();
                if (!email) {
                    showMessage('manual-form-message', 'Please enter an email address first.', 'danger');
                    return;
                }

                $.ajax({
                    url: '/api/email-autodetect',
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    data: {
                        email
                    },
                    success: function(response) {
                        if (response.settings) {
                            $('#incoming-host').val(response.settings.imap_host || '');
                            $('#incoming-port').val(response.settings.imap_port || '');
                            $('#incoming-encryption').val(response.settings.imap_encryption ||
                                'ssl');
                            $('#outgoing-host').val(response.settings.smtp_host || '');
                            $('#outgoing-port').val(response.settings.smtp_port || '');
                            $('#outgoing-encryption').val(response.settings.smtp_encryption ||
                                'ssl');
                            showMessage('manual-form-message',
                                'Settings auto-detected successfully!', 'success');
                        } else {
                            showMessage('manual-form-message',
                                'Could not auto-detect settings. Please enter manually.',
                                'warning');
                        }
                    },
                    error: function() {
                        showMessage('manual-form-message', 'Failed to auto-detect settings.',
                            'danger');
                    }
                });
            });

            $('#test-connection-btn').on('click', function() {
                const data = {
                    email: $('#manual-email').val().trim(),
                    password: $('#manual-password').val().trim(),
                    incoming_host: $('#incoming-host').val().trim(),
                    incoming_port: $('#incoming-port').val().trim(),
                    incoming_encryption: $('#incoming-encryption').val().trim(),
                    outgoing_host: $('#outgoing-host').val().trim(),
                    outgoing_port: $('#outgoing-port').val().trim(),
                    outgoing_encryption: $('#outgoing-encryption').val().trim()
                };

                if (!data.email || !data.password || !data.incoming_host || !data.incoming_port ||
                    !data.incoming_encryption || !data.outgoing_host || !data.outgoing_port ||
                    !data.outgoing_encryption) {
                    showMessage('manual-form-message', 'Please fill all fields before testing.', 'danger');
                    return;
                }

                $('#test-connection-btn').prop('disabled', true).text('Testing...');

                $.ajax({
                    url: '/api/email-test-connection',
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    contentType: 'application/json',
                    data: JSON.stringify(data),
                    success: function(response) {
                        showMessage('manual-form-message', response.message, 'success');
                    },
                    error: function(xhr) {
                        let errorMessage = xhr.responseJSON?.error ||
                            'Connection test failed. Please check your settings.';
                        if (errorMessage.includes('IMAP extension')) {
                            errorMessage =
                                'Server configuration error: IMAP is not enabled. Contact support.';
                        } else if (errorMessage.includes('SMTP')) {
                            errorMessage +=
                                ' (Check SMTP host, port, credentials, or firewall)';
                        }
                        showMessage('manual-form-message', errorMessage, 'danger');
                    },
                    complete: function() {
                        $('#test-connection-btn').prop('disabled', false).text(
                            'Test Connection');
                    }
                });
            });

            function getPhoneNumberData(itiInstance) {
                if (!itiInstance || !itiInstance.getNumber) {
                    return {
                        extension: null,
                        phone_number: null,
                        full_number: null
                    };
                }

                const fullNumber = itiInstance.getNumber();
                const selectedCountryData = itiInstance.getSelectedCountryData();

                return {
                    extension: selectedCountryData ? selectedCountryData.dialCode : null,
                    phone_number: fullNumber ? fullNumber.replace(`+${selectedCountryData.dialCode}`, '').trim() :
                        null,
                    full_number: fullNumber
                };
            }

            function fetchEmailAccounts() {
                $.get('/api/email-accounts').done(data => {
                    console.log('Email accounts response:', data);
                    const $list = $('#email-accounts-list');
                    $list.empty();
                    if (!data || data.length === 0) {
                        $list.append(
                            '<tr><td colspan="4" class="text-center">No email accounts configured.</td></tr>'
                        );
                    } else {
                        data.forEach(account => {
                            $list.append(`
                                <tr data-id="${account.id}">
                                    <td>${account.email} <i class="bi bi-eye config-icon" data-bs-toggle="popover" data-bs-html="true" data-bs-content="Type: ${account.type}<br>Email: ${account.email}" data-bs-trigger="hover"></i></td>
                                    <td>${account.type}</td>
                                    <td>${account.status}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary edit-account" data-id="${account.id}">Edit</button>
                                        <button class="btn btn-sm btn-danger delete-account" data-id="${account.id}">Delete</button>
                                    </td>
                                </tr>
                            `);
                        });
                        $('[data-bs-toggle="popover"]').popover();
                    }
                }).fail(error => {
                    console.error('Error fetching email accounts:', error);
                });
            }

            $(document).on('click', '.edit-account', function() {
                const id = $(this).data('id');
                const $row = $(this).closest('tr');
                $.get(`/api/email-accounts/${id}`).done(account => {
                    $row.html(`
                        <td colspan="4">
                            <div class="edit-form p-4 bg-gray-50 rounded-lg">
                                <input type="email" class="form-control mb-2" id="edit-email" value="${account.email}" required>
                                <label class="form-label">Phone Number</label>
                                <input type="tel" class="form-control mb-2" id="edit-phone" value="${account.extension ? '+' + account.extension + (account.phone_number || '') : ''}">
                                <input type="text" class="form-control mb-2" id="edit-first-name" value="${account.first_name || ''}">
                                <input type="text" class="form-control mb-2" id="edit-last-name" value="${account.last_name || ''}">
                                <input type="text" class="form-control mb-2" id="edit-designation" value="${account.designation || ''}">
                                <input type="text" class="form-control mb-2" id="edit-postal-code" value="${account.postal_code || ''}">
                                <input type="text" class="form-control mb-2" id="edit-fax" value="${account.fax || ''}">
                                <input type="url" class="form-control mb-2" id="edit-unsubscribe" value="${account.unsubscribe || ''}">
                                <select class="form-control mb-2" id="edit-region">
                                    <option value="" disabled>Select a region</option>
                                    <option value="North America" ${account.region === 'North America' ? 'selected' : ''}>North America</option>
                                    <option value="South America" ${account.region === 'South America' ? 'selected' : ''}>South America</option>
                                    <option value="APJ & APAC" ${account.region === 'APJ & APAC' ? 'selected' : ''}>APJ & APAC</option>
                                    <option value="EMEA" ${account.region === 'EMEA' ? 'selected' : ''}>EMEA</option>
                                    <option value="MENA" ${account.region === 'MENA' ? 'selected' : ''}>MENA</option>
                                    <option value="DACH" ${account.region === 'DACH' ? 'selected' : ''}>DACH</option>
                                    <option value="Oceania" ${account.region === 'Oceania' ? 'selected' : ''}>Oceania</option>
                                    <option value="NORDICS" ${account.region === 'NORDICS' ? 'selected' : ''}>NORDICS</option>
                                </select>
                                <textarea class="form-control mb-2" id="edit-address">${account.address || ''}</textarea>
                                <select class="form-control mb-2" id="edit-status">
                                    <option value="active" ${account.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${account.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                                <div class="flex space-x-2">
                                    <button class="btn btn-primary save-edit" data-id="${account.id}">Save</button>
                                    <button class="btn btn-secondary cancel-edit">Cancel</button>
                                </div>
                            </div>
                        </td>
                    `);
                    let editIti = initializePhoneInput('#edit-phone', account.extension ? account
                        .extension.replace('+', '') : 'in');
                    $('.save-edit').on('click', function() {
                        if (!editIti) {
                            showMessage('manual-form-message',
                                'Phone field not initialized.', 'danger');
                            return;
                        }

                        const phoneData = editIti.getNumber();
                        const countryData = editIti.getSelectedCountryData();

                        const data = {
                            email: $('#edit-email').val(),
                            status: $('#edit-status').val(),
                            first_name: $('#edit-first-name').val() || null,
                            last_name: $('#edit-last-name').val() || null,
                            extension: countryData.dialCode,
                            phone_number: phoneData.replace(`+${countryData.dialCode}`,
                                ''),
                            designation: $('#edit-designation').val() || null,
                            postal_code: $('#edit-postal-code').val() || null,
                            address: $('#edit-address').val() || null,
                            fax: $('#edit-fax').val() || null,
                            unsubscribe: $('#edit-unsubscribe').val() || null,
                            region: $('#edit-region').val() || null
                        };

                        $.ajax({
                            url: `/api/email-accounts/${id}`,
                            method: 'PUT',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr(
                                    'content')
                            },
                            contentType: 'application/json',
                            data: JSON.stringify(data),
                            success: function() {
                                showMessage('manual-form-message',
                                    'Account updated!', 'success');
                                fetchEmailAccounts();
                            },
                            error: function() {
                                showMessage('manual-form-message',
                                    'Failed to update account.', 'danger');
                            }
                        });
                    });
                });
            });

            $('#back-to-account-details').on('click', function() {
                $('#setup-choice-card').hide();
                $('.card').eq(0).show();
            });

            $('#back-to-setup-choice').on('click', function() {
                $('#manual-setup-card').hide();
                $('#setup-choice-card').show();
            });

            $(document).on('click', '.delete-account', function() {
                const id = $(this).data('id');
                if (confirm('Are you sure?')) {
                    $.ajax({
                        url: `/api/email-accounts/${id}`,
                        method: 'DELETE',
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        success: function() {
                            showMessage('manual-form-message', 'Account deleted!', 'success');
                            fetchEmailAccounts();
                        },
                        error: function() {
                            showMessage('manual-form-message', 'Failed to delete account.',
                                'danger');
                        }
                    });
                }
            });

            $(document).on('click', '.cancel-edit', function() {
                fetchEmailAccounts();
            });

            fetchEmailAccounts();
        });
    </script>
@endsection
