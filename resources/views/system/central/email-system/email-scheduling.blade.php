{{-- @php
    $userRole = App\Http\Classes\UserHelper::getCurrentUser('role');
@endphp --}}

@extends('layouts.system-app')
@section('title', 'Email Scheduling')
@section('top-style')
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="{{ asset('css/custom-datatable-ui.css') }}?v={{ time() }}">
    <style>
        body {
            background-color: #f4f6f9;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #333;
        }

        .container {
            max-width: 1280px;
            margin: 30px auto;
            padding: 0 20px;
        }

        .tab-content {
            background: #ffffff;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        /* Nav Pills Styling - Matching modules.blade.php */
        .nav-pills {
            --bs-nav-pills-border-radius: 0.5rem;
            --bs-nav-pills-link-active-color: #fff;
            --bs-nav-pills-link-active-bg: #1db4cd;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }

        .nav-pills .nav-link {
            border-radius: var(--bs-nav-pills-border-radius);
            padding: 0.5rem 1rem;
            font-weight: 500;
            color: #566a7f;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .nav-pills .nav-link.active,
        .nav-pills .show>.nav-link {
            color: var(--bs-nav-pills-link-active-color);
            background-color: var(--bs-nav-pills-link-active-bg);
        }

        .nav-pills .nav-link:hover:not(.active) {
            color: #1db4cd;
            background-color: rgba(29, 180, 205, 0.1);
        }

        /* No scrollbar for nav-pills */
        .nav-pills::-webkit-scrollbar {
            display: none;
        }

        .nav-pills {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }

        /* Action area styling */
        .action-area {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .action-area .btn {
            padding: 0.5rem 1rem;
            font-weight: 500;
            border-radius: 0.5rem;
        }

        .sub-tabs .nav-link {
            padding: 10px 20px;
            font-size: 14px;
        }

        .card {
            border: none;
            border-radius: 10px;
            background: #ffffff;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 25px;
        }

        .card-header {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }

        /* Campaign Progress Bar Custom Colors */
        #campaign-progress-bar.bg-success {
            --bs-bg-opacity: 1;
            background-color: rgb(29 180 205) !important;
        }
            padding: 15px 20px;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .card-body {
            padding: 20px;
        }

        .form-label {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 8px;
        }

        .form-control,
        select,
        .form-select {
            height: 42px;
            font-size: 14px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 0 12px;
            transition: border-color 0.2s ease;
        }

        .form-control:focus,
        select:focus,
        .form-select:focus {
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            outline: none;
        }

        textarea.form-control {
            height: auto;
            padding: 10px 12px;
        }

        .btn {
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .btn-primary {
            background-color: #1db4cd;
            border: none;
            color: #ffffff;
        }

        .btn-success {
            background-color: #1db4cd;
            border: none;
            color: #ffffff;
        }

        .btn-success:hover {
            background-color: #1a9bb3;
        }

        .btn-danger {
            background-color: #1db4cd;
            border: none;
            color: #ffffff;
        }

        .btn-danger:hover {
            background-color: #1a9bb3;
        }

        .btn-info {
            background-color: #1db4cd;
            border: none;
            color: #ffffff;
        }

        .btn-info:hover {
            background-color: #1a9bb3;
        }

        .btn-outline-primary {
            color: #1db4cd;
            border-color: #1db4cd;
            background-color: transparent;
        }

        .btn-outline-primary:hover {
            color: #ffffff;
            background-color: #1db4cd;
            border-color: #1db4cd;
        }

        .btn-outline-secondary {
            color: #6c757d;
            border-color: #6c757d;
            background-color: transparent;
        }

        .btn-outline-secondary:hover {
            color: #ffffff;
            background-color: #6c757d;
            border-color: #6c757d;
        }

        .btn-secondary {
            background-color: #1db4cd;
            border: none;
            color: #ffffff;
        }

        .btn-secondary:hover {
            background-color: #1a9bb3;
        }

        .btn-warning {
            background-color: #1db4cd;
            border: none;
            color: #ffffff;
        }

        .btn-warning:hover {
            background-color: #1a9bb3;
        }

        .progress {
            height: 20px;
            border-radius: 10px;
            background: #e5e7eb;
            overflow: hidden;
        }

        .progress-bar {
            transition: width 0.5s ease;
        }

        .table {
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 8px;
            overflow: hidden;
            font-size: 14px;
        }

        .table th,
        .table td {
            padding: 12px;
            vertical-align: middle;
        }

        .table thead {
            background: #f1f5f9;
            color: #1f2937;
        }

        .table tbody tr:hover {
            background: #f9fafb;
        }

        .table-striped tbody tr:nth-of-type(odd) {
            background: #ffffff;
        }

        .table-striped tbody tr:nth-of-type(even) {
            background: #f9fafb;
        }

        #email-preview {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            min-height: 250px;
            background: #fafafa;
        }

        .stats-card {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .stats-card div {
            flex: 1;
            min-width: 120px;
            text-align: center;
        }

        .stats-card span {
            display: block;
            font-size: 24px;
            font-weight: 600;
            color: #2563eb;
        }

        .stats-card p {
            margin: 0;
            font-size: 14px;
            color: #6b7280;
        }

        .list-group-item {
            border-color: #e2e8f0;
            font-size: 14px;
        }

        .modal-content {
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }

        .modal-footer {
            border-top: 1px solid #e2e8f0;
        }

        .dropdown-menu {
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }

        .dropdown-item:hover {
            background: #eff6ff;
        }

        .select2-container .select2-selection--single {
            height: auto;
            border: 1px solid #d1d5db;
            border-radius: 8px;
        }

        .select2-container--default .select2-selection--single .select2-selection__rendered {
            line-height: 40px;
            font-size: 14px;
        }

        .select2-container--default .select2-selection--single .select2-selection__arrow {
            height: auto;
        }

        .loading-spinner {
            margin-left: 5px;
        }

        #campaign-details {
            width: 100%;
            overflow: hidden;
        }

        #campaign-details .row {
            flex-wrap: nowrap;
            margin: 0;
        }

        #campaign-details .col-md-6 {
            flex: 0 0 50%;
            max-width: 50%;
            padding: 15px;
            box-sizing: border-box;
        }

        .tab-content .card {
            width: 100%;
            min-width: 100%;
        }

        .container {
            min-width: 100%;
        }

        .tox-promotion {
            display: none !important;
        }

        .tox-statusbar__branding {
            display: none !important;
        }

        @media (max-width: 768px) {
            #campaign-details .row {
                flex-wrap: wrap;
            }

            #campaign-details .col-md-6 {
                flex: 0 0 100%;
                max-width: 100%;
                padding: 10px;
            }

            .container {
                min-width: auto;
                padding: 0 10px;
            }

            .tab-content .card {
                min-width: auto;
            }
        }

        @media (max-width: 768px) {
            .container {
                padding: 0 15px;
            }

            .card-body {
                padding: 15px;
            }

            .nav-tabs .nav-link {
                padding: 10px 15px;
                font-size: 14px;
            }

            .stats-card div {
                min-width: 100%;
            }

            .modal-dialog {
                margin: 10px;
            }
        }

        .select2-selection__choice {
            background-color: #1db4cd !important;
            color: #fff !important;
            border: none !important;
            border-radius: 15px !important;
            padding: 1px 1px !important;
            font-size: 11px;
            margin-top: 7px !important;
        }

        /* TinyMCE-specific styles */
        .tox-tinymce {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            min-height: 200px;
        }
    </style>
@endsection

@section('content')
    <div class="container">
        <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-3 shadow-sm px-4 py-3 mb-2 rounded-top"
            style="background:#1db4cd; border-bottom:2px solid #e0e7ef; border-radius: 0.5rem 0.5rem 0 0;">
            <span style="font-size:1.5rem; font-weight:700; color:#fff; letter-spacing:0.5px;">
                Email Campaigning System
            </span>
            <button class="btn btn-light btn-sm" id="show-quota-btn"
                style="border-radius:6px; font-weight:600; letter-spacing:0.5px; box-shadow:0 1px 4px rgba(0,0,0,0.1); padding:8px 16px; color:#1db4cd; border:1px solid rgba(255,255,255,0.2);"
                data-bs-toggle="modal" data-bs-target="#quotaModal">
                <span id="total-quota-text">Loading quota...</span>
                <i class="bi bi-bar-chart-line ms-2" style="font-size:1.1em;" title="View Daily Quota"></i>
            </button>
        </div>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <ul class="nav nav-pills data-skl-action" id="emailSchedulerTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="audience-tab" data-bs-toggle="tab" data-bs-target="#audience"
                        type="button" role="tab" aria-controls="audience" aria-selected="true" data-skl-action="b"
                        data-token="email_audience_tab" data-target="#email-action-btn" data-type="add"
                        data-text="Add Audience" data-class="btn-primary">Audience</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="templates-tab" data-bs-toggle="tab" data-bs-target="#templates"
                        type="button" role="tab" aria-controls="templates" aria-selected="false" data-skl-action="b"
                        data-token="email_templates_tab" data-target="#email-action-btn" data-type="add"
                        data-text="Add Template" data-class="btn-primary">Templates</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="campaigns-tab" data-bs-toggle="tab" data-bs-target="#campaigns"
                        type="button" role="tab" aria-controls="campaigns" aria-selected="false" data-skl-action="b"
                        data-token="email_campaigns_tab" data-target="#email-action-btn" data-type="add"
                        data-text="Add Campaign" data-class="btn-primary">Campaigns</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="preview-send-tab" data-bs-toggle="tab" data-bs-target="#preview-send"
                        type="button" role="tab" aria-controls="preview-send" aria-selected="false" data-skl-action="b"
                        data-token="email_preview_send_tab" data-target="#email-action-btn" data-type="send">Preview and
                        Send</button>
                </li>
            </ul>
            <div class="action-area d-flex align-items-center gap-2">
                <button class="btn btn-primary" id="email-action-btn">Add Audience</button>
            </div>
        </div>


        <div class="tab-content" id="emailSchedulerTabContent">
            <!-- Audience Tab -->
            <div class="tab-pane fade show active" id="audience" role="tabpanel" aria-labelledby="audience-tab">

                <div class="card-header">
                    Audience Management
                </div>
                <div class="card-body">
                    <div id="audience-table-container"></div>
                </div>

            </div>
            <!-- Templates Tab -->
            <div class="tab-pane fade" id="templates" role="tabpanel" aria-labelledby="templates-tab">

                <div class="card-header">
                    Templates
                </div>
                <div class="card-body">
                    <div id="templates-table-container">
                        <div class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-2 text-muted">Loading templates...</p>
                        </div>
                    </div>
                </div>

            </div>
            <!-- Campaigns Tab -->
            <div class="tab-pane fade" id="campaigns" role="tabpanel" aria-labelledby="campaigns-tab">

                <div class="card-header">
                    Campaigns
                </div>
                <div class="card-body">
                    <div id="campaigns-table-container">
                        <div class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-2 text-muted">Loading campaigns...</p>
                        </div>
                    </div>
                </div>
                <!-- Add/Edit Campaign Modal -->
                <div class="modal fade" id="addCampaignModal" tabindex="-1" aria-labelledby="addCampaignModalLabel"
                    aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="addCampaignModalLabel">Add Campaign</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"
                                    aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="campaign-form">
                                    <input type="hidden" id="campaign-id">

                                    <!-- Campaign Name Floating Input -->
                                    <div class="mb-3">
                                        <div class="float-input-control">
                                            <input type="text" class="form-float-input" id="campaign-name" required
                                                placeholder="Campaign Name" maxlength="255">
                                            <label for="campaign-name" class="form-float-label">Campaign Name</label>
                                        </div>
                                    </div>
                                    <div class="md-3">
                                        <div class="input-group" style="flex-wrap:nowrap; align-items:center;">
                                            <select class="form-float-input" id="campaign-template">
                                                <option value=""></option>
                                            </select>
                                            <label for="campaign-template" class="form-float-label">Select
                                                Template</label>
                                            <button type="button" class="btn btn-outline-primary flex-shrink-0"
                                                id="create-template-btn">
                                                Create Template
                                            </button>
                                        </div>
                                    </div>
                                    <!-- Audience Floating Select -->
                                    <div class="mb-3 mt-4">
                                        <div class="input-group" style="flex-wrap:nowrap; align-items:center;">
                                            <select class="form-float-input" id="campaign-audience">
                                                <option value=""></option>
                                            </select>
                                            <label for="campaign-audience" class="form-float-label">Select
                                                Audience</label>
                                            <button type="button" class="btn btn-outline-primary  flex-shrink-0"
                                                id="create-audience-btn">
                                                Create Audience
                                            </button>
                                        </div>
                                    </div>
                                    <button type="submit" class="btn btn-success" id="save-campaign-btn">
                                        Save Campaign
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Audience Creation Modal -->
                <div class="modal fade" id="createAudienceModal" tabindex="-1"
                    aria-labelledby="createAudienceModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="createAudienceModalLabel">Create Audience</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"
                                    aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <ul class="nav nav-tabs sub-tabs" id="createAudienceTabs" role="tablist">
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link active" id="manual-add-audience-tab" data-bs-toggle="tab"
                                            data-bs-target="#manual-add-audience" type="button" role="tab"
                                            aria-controls="manual-add-audience" aria-selected="true"><i
                                                class="bi bi-person-plus"></i> Manually Add</button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="import-csv-audience-tab" data-bs-toggle="tab"
                                            data-bs-target="#import-csv-audience" type="button" role="tab"
                                            aria-controls="import-csv-audience" aria-selected="false"><i
                                                class="bi bi-file-earmark-arrow-up"></i> Import CSV</button>
                                    </li>
                                </ul>
                                <div class="tab-content" id="createAudienceTabContent">
                                    <div class="tab-pane fade show active" id="manual-add-audience" role="tabpanel"
                                        aria-labelledby="manual-add-audience-tab">
                                        <div class="mb-3">
                                            <label for="audience-name-create" class="form-label">Audience Name</label>
                                            <input type="text" class="form-control" id="audience-name-create"
                                                required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="subscriber-format-create" class="form-label">Select Format</label>
                                            <select class="form-control" id="subscriber-format-create">
                                                <option value="first-email">First Name, Email</option>
                                                <option value="first-last-email">First Name, Last Name, Email</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label for="subscribers-input-create" class="form-label">Enter Subscribers
                                                (one per line, comma-separated)</label>
                                            <textarea class="form-control" id="subscribers-input-create" rows="5"
                                                placeholder="e.g., John, john@example.com\nJane, jane@example.com"></textarea>
                                        </div>
                                        <div class="d-flex align-items-center">
                                            <button class="btn btn-success" id="save-audience-from-campaign-btn">
                                                Save Audience
                                                <span class="spinner-border spinner-border-sm loading-spinner"
                                                    role="status" aria-hidden="true" style="display: none;"></span>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="tab-pane fade" id="import-csv-audience" role="tabpanel"
                                        aria-labelledby="import-csv-audience-tab">
                                        <div class="mb-3">
                                            <label for="audience-name-csv-create" class="form-label">Audience Name</label>
                                            <input type="text" class="form-control" id="audience-name-csv-create"
                                                required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="csv-format-create" class="form-label">Select CSV Format</label>
                                            <select class="form-control" id="csv-format-create">
                                                <option value="first-email">First Name, Email</option>
                                                <option value="first-last-email">First Name, Last Name, Email</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label for="csv-file-create" class="form-label">Upload CSV File</label>
                                            <input type="file" class="form-control" id="csv-file-create"
                                                accept=".csv">
                                        </div>
                                        <div class="d-flex align-items-center">
                                            <button class="btn btn-success" id="upload-csv-campaign-btn">
                                                Upload CSV
                                                <span class="spinner-border spinner-border-sm loading-spinner"
                                                    role="status" aria-hidden="true" style="display: none;"></span>
                                            </button>
                                        </div>
                                        <div class="progress mt-3" id="csv-upload-progress-campaign"
                                            style="display: none;">
                                            <div class="progress-bar" role="progressbar" style="width: 0%;"
                                                aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                                        </div>
                                        <div id="csv-import-error-campaign" class="alert alert-danger mt-3"
                                            style="display: none;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Preview and Send Tab -->
            <div class="tab-pane fade" id="preview-send" role="tabpanel" aria-labelledby="preview-send-tab">
                <!-- Send Content -->
                <div class="pt-3" id="previewSendTabContent">
                    <!-- Send Content -->
                    <div id="send-tab-pane">

                        <div class="card-header mb-4">Send or Schedule Campaign</div>
                        <div class="card-body">
                            <form id="send-immediately-form">
                                <div class="row">
                                    <!-- Select Campaign -->
                                    <div class="float-input-control col-md-6 mb-4">
                                        <select class="form-float-input" id="campaign-select" name="campaign_id">
                                            <option value="">-- Select Campaign --</option>
                                        </select>
                                        <label class="form-float-label"for="campaign-select">Select Campaign</label>
                                    </div>
                                    <div class="float-input-control col-md-6 mb-4">
                                        <input type="text" class="form-float-input" id="subject" name="subject"
                                            maxlength="255" required placeholder="Splunk & IBM QRadar Samples" readonly>
                                        <label for="subject" class="form-float-label">Subject</label>
                                        <div class="invalid-feedback">Subject is required and must be 255 characters or
                                            less.</div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="float-input-control col-md-6 mb-4">
                                        <input type="number" class="form-float-input" id="time-gap" name="time_gap"
                                            min="0" value="1" required>
                                        <label for="time-gap" class="form-float-label">Time Gap Between Emails
                                            (seconds)</label>
                                        <div class="invalid-feedback">Time gap must be a non-negative number.</div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="input-group" style="flex-wrap:nowrap; align-items:center;">
                                            <select class="form-float-input" id="assignment-mode" name="assignment_mode"
                                                style="max-width:300px; min-width:120px; flex-shrink:1;">
                                                <option value="batch_size">Batch Size</option>
                                                <option value="manual_assign">Manual Assign</option>
                                            </select>
                                            <label for="assignment-mode" class="form-float-label">Assignment Mode</label>
                                            <button type="button" class="btn btn-outline-primary configure-assignment" 
                                                style="border-radius:6px; margin-left:8px; white-space:nowrap;">
                                                Configure Assignment
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <!-- Hidden fields for assignment data -->
                                <input type="hidden" id="batch-size" name="batch_size" value="2">
                                <input type="hidden" id="manual-assignments-data" name="manual_assignments">
                                
                                <!-- Assignment Display Section (Total + Warning) -->
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <div id="assignment-total-subscribers" class="alert alert-info py-2 px-3 mb-0" style="display:none;">
                                            <strong>Total Subscribers:</strong> <span id="total-subscribers-count">0</span>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div id="assignment-warning" class="alert alert-warning py-2 px-3 mb-0" style="display:none;">
                                            <strong>Warning:</strong> <span id="unassigned-count">0</span> subscribers are unassigned.
                                        </div>
                                    </div>
                                </div>

                                <!-- From Email (by Region) -->
                                <div class="float-input-control mb-3">
                                    <select class="form-float-input" name="from_email[]" id="fromEmailSelect" multiple>
                                        <option value="">-- Select All --</option>
                                        @php
                                            $regions = DB::connection('pluto')
                                                ->table('email_accounts')
                                                ->where('status', 'active')
                                                ->select('region')
                                                ->distinct()
                                                ->pluck('region')
                                                ->filter();
                                        @endphp
                                        @foreach ($regions as $region)
                                            @php
                                                $regionAccounts = DB::connection('pluto')
                                                    ->table('email_accounts')
                                                    ->where('status', 'active')
                                                    ->where('region', $region)
                                                    ->get();
                                                $accountCount = $regionAccounts->count();
                                            @endphp
                                            <optgroup label="{{ $region }} ({{ $accountCount }} accounts)">
                                                @foreach ($regionAccounts as $account)
                                                    <option value="{{ $account->email }}">{{ $account->email }}
                                                    </option>
                                                @endforeach
                                            </optgroup>
                                        @endforeach
                                    </select>
                                    <label for="fromEmailSelect" class="form-float-label">From Email (by
                                        Region)</label>
                                    <div class="invalid-feedback">Please select at least one email account.</div>
                                </div>
                                <div class="d-flex gap-2">
                                    <button type="button" class="btn btn-info"
                                        id="preview-campaign-btn">Preview</button>
                                    <button type="submit" class="btn btn-primary" id="send-now-btn">Send
                                        Now</button>
                                    <button type="button" class="btn btn-secondary" data-bs-toggle="modal"
                                        data-bs-target="#scheduleModal">Schedule</button>
                                </div>
                        </div>


                        </form>
                        <div id="send-message" class="mt-3"></div>

                        <!-- Schedule Modal -->
                        <div class="modal fade" id="scheduleModal" tabindex="-1" aria-labelledby="scheduleModalLabel"
                            aria-hidden="true">
                            <div class="modal-dialog">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title" id="scheduleModalLabel">Schedule Campaign</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal"
                                            aria-label="Close"></button>
                                    </div>
                                    <form id="schedule-campaign-form">
                                        <div class="modal-body">
                                            <input type="hidden" id="schedule-campaign-id" name="campaign_id">
                                            <div class="mb-3">
                                                <label for="schedule-time" class="form-label">Schedule Time</label>
                                                <input type="datetime-local" class="form-control" id="schedule-time"
                                                    name="scheduled_at" required>
                                            </div>
                                            <div class="mb-3" style="position: relative; z-index: 1055;">
                                                <label for="schedule-timezone" class="form-label">Timezone</label>
                                                <select class="form-select" id="schedule-timezone" name="timezone"
                                                    required>
                                                    <option value="">Select Timezone</option>
                                                    @php
                                                        $timezones = \DateTimeZone::listIdentifiers(\DateTimeZone::ALL);
                                                    @endphp
                                                    @foreach ($timezones as $timezone)
                                                        <option value="{{ $timezone }}">{{ $timezone }}</option>
                                                    @endforeach
                                                </select>
                                            </div>
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-secondary"
                                                data-bs-dismiss="modal">Cancel</button>
                                            <button type="submit" class="btn btn-primary">
                                                <span class="spinner-border spinner-border-sm loading-spinner d-none"
                                                    role="status" aria-hidden="true"></span>
                                                Schedule
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>

                        <!-- Assignment Modal -->
                        <div class="modal fade" id="assignmentModal" tabindex="-1" aria-labelledby="assignmentModalLabel" aria-hidden="true">
                            <div class="modal-dialog">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title" id="assignmentModalLabel">Configure Assignment</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div class="modal-body" id="assignmentModalBody">
                                        <!-- Content will be dynamically populated -->
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                        <button type="button" class="btn btn-primary" id="modal-save-assignment">Save</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Campaign Preview Modal -->
                        <div class="modal fade" id="campaignPreviewModal" tabindex="-1"
                            aria-labelledby="campaignPreviewModalLabel" aria-hidden="true">
                            <div class="modal-dialog modal-xl" style="max-width: 90%;">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title" id="campaignPreviewModalLabel">Campaign Preview</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal"
                                            aria-label="Close"></button>
                                    </div>
                                    <div class="modal-body" style="overflow: visible;">
                                        <!-- Modal Tabs -->
                                        <ul class="nav nav-tabs" id="previewModalTabs" role="tablist">
                                            <li class="nav-item" role="presentation">
                                                <button class="nav-link active" id="campaign-details-tab"
                                                    data-bs-toggle="tab" data-bs-target="#campaign-details-pane"
                                                    type="button" role="tab" aria-controls="campaign-details-pane"
                                                    aria-selected="true">Campaign Details</button>
                                            </li>
                                            <li class="nav-item" role="presentation">
                                                <button class="nav-link" id="campaign-subscribers-tab"
                                                    data-bs-toggle="tab" data-bs-target="#campaign-subscribers-pane"
                                                    type="button" role="tab"
                                                    aria-controls="campaign-subscribers-pane"
                                                    aria-selected="false">Campaign
                                                    Subscribers</button>
                                            </li>
                                        </ul>

                                        <div class="tab-content pt-3" id="previewModalTabContent">
                                            <!-- Campaign Details Tab -->
                                            <div class="tab-pane fade show active" id="campaign-details-pane"
                                                role="tabpanel" aria-labelledby="campaign-details-tab">
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label">Campaign Details</label>
                                                            <ul class="list-group">
                                                                <li class="list-group-item"><strong>Campaign:</strong>
                                                                    <span id="modal-campaign-name"></span>
                                                                </li>
                                                                <li class="list-group-item"><strong>Template:</strong>
                                                                    <span id="modal-template-title"></span>
                                                                </li>
                                                                <li class="list-group-item"><strong>Audience:</strong>
                                                                    <span id="modal-audience-name"></span>
                                                                </li>
                                                                <li class="list-group-item"><strong>Subscribers:</strong>
                                                                    <span id="modal-subscriber-count"></span>
                                                                </li>
                                                                <li class="list-group-item"><strong>Status:</strong> <span
                                                                        id="modal-campaign-status"></span></li>
                                                                <li class="list-group-item"><strong>Subject:</strong> <span
                                                                        id="modal-subject"></span></li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label for="modal-email-preview" class="form-label">Email
                                                                Preview</label>
                                                            <div id="modal-email-preview" class="border p-3"
                                                                style="max-height: 400px; overflow-y: auto;"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Campaign Subscribers Tab -->
                                            <div class="tab-pane fade" id="campaign-subscribers-pane" role="tabpanel"
                                                aria-labelledby="campaign-subscribers-tab">
                                                <div class="mb-3">
                                                    <label class="form-label">Subscribers</label>
                                                    <div id="modal-subscribers-table-container"
                                                        style="min-height: 400px; overflow: visible;"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary"
                                            data-bs-dismiss="modal">Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Campaign Progress -->
                        <div class="mt-4">
                            <h5>Campaign Progress</h5>
                            <div class="progress mb-3">
                                <div id="campaign-progress-bar" class="progress-bar" role="progressbar"
                                    style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                            </div>
                            <div class="stats-card">
                                <div>
                                    <span id="progress-total">0</span>
                                    <p>Total</p>
                                </div>
                                <div>
                                    <span id="progress-sent">0</span>
                                    <p>Sent</p>
                                </div>
                                <div>
                                    <span id="progress-failed">0</span>
                                    <p>Failed</p>
                                </div>
                                <div>
                                    <span id="progress-pending">0</span>
                                    <p>Pending</p>
                                </div>
                                <div>
                                    <span id="progress-sending">0</span>
                                    <p>Sending</p>
                                </div>
                            </div>
                            <div class="mt-4">
                                <h5>Failed Emails</h5>
                                <div class="table-responsive">
                                    <table class="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Email</th>
                                                <th>Error Message</th>
                                                <th>Retry Attempts</th>
                                            </tr>
                                        </thead>
                                        <tbody id="failed-emails-table"></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Add/Edit Audience Modal -->
    <div class="modal fade" id="addAudienceModal" tabindex="-1" aria-labelledby="addAudienceModalLabel"
        aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="addAudienceModalLabel">Add Audience</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <ul class="nav nav-tabs" id="audienceTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="new-tab" data-bs-toggle="tab"
                                data-bs-target="#new-audience" type="button" role="tab">New
                                Audience</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="existing-tab" data-bs-toggle="tab"
                                data-bs-target="#existing-audience" type="button" role="tab">Existing
                                Audience</button>
                        </li>
                    </ul>
                    <div class="tab-content mt-3" id="audienceTabsContent">
                        <!-- New Audience Tab -->
                        <div class="tab-pane fade show active" id="new-audience" role="tabpanel">
                            <form id="audience-form">
                                <input type="hidden" id="audience-id">
                                <div class="mb-3">
                                    <div class="float-input-control">

                                        <input type="text" class="form-float-input" id="audience-name" required=""
                                            placeholder="Name" maxlength="255">
                                        <label for="audience-name" class="form-float-label">Audience Name</label>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-success" id="save-audience-btn">Create</button>
                            </form>
                        </div>
                        <!-- Existing Audience Tab -->
                        <div class="tab-pane fade" id="existing-audience" role="tabpanel">
                            <div class="float-input-control">
                                <select class="form-float-input form-select form-select-lg dyna-select-dropdown  h-auto"
                                    name="audiences" id="editaudience">
                                    @php
                                        $audiences = DB::connection('pluto')
                                            ->table('audiences')
                                            ->whereNotNull('name')
                                            ->get();
                                    @endphp
                                    @foreach ($audiences as $audience)
                                        <option value="{{ $audience->name }}" data-id="{{ $audience->id }}">
                                            {{ $audience->name }}
                                        </option>
                                    @endforeach
                                </select>
                                <label class="form-float-label">Existing
                                    Audience</label>


                            </div>
                            <button type="submit" class="btn btn-success mt-2"
                                id="edit-existing-audience-btn">Edit</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Editor Modal -->
    <div class="modal fade" id="editorModal" tabindex="-1" aria-labelledby="editorModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                
                <div class="modal-header">
                    <h5 class="modal-title" id="editorModalLabel">Add Template</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="template-id">
                    <div class="row">
                        <div class=" col-6 mb-3">
                            <div class="float-input-control">
                                <input type="text" id="editor-title" class="form-float-input" required=""
                                    placeholder="Title" maxlength="255">
                                <label for="editor-title" class="form-float-label">Template Title</label>
                            </div>
                        </div>
                        <div class="col-6 mb-3">
                            <div class="float-input-control">
                                <input type="text" id="editor-subject" class="form-float-input" required=""
                                    placeholder="Subject" maxlength="255">
                                <label for="editor-subject" class="form-float-label">Template Subject</label>
                            </div>
                        </div>
                    </div>
                    <div class="float-input-control mb-4">
                        <select id="editor-switch" class="form-float-input" required>
                            <option value="" disabled selected>Select Editor Type</option>
                            <option value="wysiwyg">WYSIWYG Editor</option>
                            <option value="code">Advanced Code Editor (HTML)</option>
                        </select>
                        <label for="editor-switch" class="form-float-label">Editor Type</label>
                    </div>
                    <div class="mb-3">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="float-input-control">
                                    <select class="form-control form-float-input" id="subscriber-placeholder-select">
                                        <option value=""disabled selected>Select Subscriber Placeholder</option>
                                    </select>
                                    <label class="form-float-label">Subscriber Placeholders</label>
                                </div>
                                <small class="form-text text-muted">Use placeholders like [first_name], [last_name]
                                    to personalize for subscribers.</small>
                            </div>
                            <div class="col-md-6">
                                <div class="float-input-control">
                                    <select class="form-control form-float-input" id="email-account-placeholder-select">
                                        <option value="">Select Email Account Placeholder</option>
                                    </select>
                                    <label class="form-float-label">Sender Placeholders</label>

                                </div>
                                <small class="form-text text-muted">Use placeholders like [account_email],
                                    [account_first_name] for account details.</small>
                            </div>
                        </div>
                    </div>

                    <div id="tinymce-editor-container" style="display: none;">
                        <textarea id="tinymce-editor" class="form-control" style="min-height: 200px;"></textarea>
                    </div>
                    <div id="code-editor-container" style="display: none;">
                        <textarea id="code-editor" class="form-control" rows="10"></textarea>
                    </div>
                </div>
                <!-- TinyMCE Loading Spinner -->
                <div id="tinymce-loading" class="text-center py-4" style="display: none;">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading Editor...</span>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-template-btn">Save</button>
                </div>
            </div>
        </div>
    </div>
    <!-- Preview Modal -->
    <div class="modal fade" id="previewModal" tabindex="-1" aria-labelledby="previewModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="previewModalLabel">Template Preview</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <iframe id="preview-iframe" style="width: 100%; height: 400px; border: none;"></iframe>
                </div>
            </div>
        </div>
    </div>
    </div>
    </div>
    </div>
    </div>
    </div>
    
    <!-- Daily Quota Modal -->
    <div class="modal fade" id="quotaModal" tabindex="-1" aria-labelledby="quotaModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="quotaModalLabel">Email Account Daily Quotas</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" id="quota-modal-body">
                    Loading quota information...
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>
@endsection
@section('bottom-script')
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="{{ asset('js/tinymce/tinymce.min.js') }}"></script> <!-- Self-hosted TinyMCE -->
    <script src="https://cdn.jsdelivr.net/npm/axios@1.1.2/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moment-timezone@0.5.43/builds/moment-timezone-with-data.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>
    <script src="{{ asset('js/system/custom-datatable-ui.js') }}?v={{ time() }}"></script>
    <script>
        // Quota functionality
        function fetchAndDisplayQuota() {
            axios.get('/api/quota-info')
                .then(response => {
                    console.log('Quota response:', response.data);
                    const data = response.data;
                    // Update the button text
                    if (typeof data.total_used !== 'undefined' && typeof data.total_limit !== 'undefined') {
                        $('#total-quota-text').text(`${data.total_used} / ${data.total_limit} used`);
                    } else {
                        $('#total-quota-text').text('Quota info unavailable');
                    }
                    // Store accounts for modal
                    window.emailQuotaAccounts = data.accounts || [];
                })
                .catch((err) => {
                    console.error('Quota error:', err);
                    $('#total-quota-text').text('Failed to load quota');
                    window.emailQuotaAccounts = [];
                });
        }

        // Quota polling
        let quotaPollingInterval = null;

        function startQuotaPolling() {
            if (quotaPollingInterval) clearInterval(quotaPollingInterval);
            fetchAndDisplayQuota();
            quotaPollingInterval = setInterval(fetchAndDisplayQuota, 30000); // 30 seconds
        }

        $(document).ready(function() {
            // Check if CustomDataTableUI is loaded
            console.log('Document ready - checking CustomDataTableUI...');
            console.log('CustomDataTableUI available:', typeof CustomDataTableUI);
            console.log('CustomDataTableUI constructor:', CustomDataTableUI);

            if (typeof CustomDataTableUI === 'undefined') {
                console.error('CustomDataTableUI is not loaded! Check the script path.');
                alert('Custom DataTable UI failed to load. Please refresh the page.');
                return;
            }

            // Initialize quota functionality
            startQuotaPolling();

            // Show quota details in modal when opened
            $('#quotaModal').off('show.bs.modal').on('show.bs.modal', function() {
                const $body = $('#quota-modal-body');
                const accounts = window.emailQuotaAccounts || [];
                if (!accounts.length) {
                    $body.html('<div class="text-danger">No quota data available. Please try again later.</div>');
                    return;
                }
                let html = '<div class="table-responsive"><table class="table table-bordered table-sm"><thead class="table-light"><tr><th>Email Account</th><th>Daily Limit</th><th>Sent (Last 24h)</th><th>Remaining</th><th>Usage %</th></tr></thead><tbody>';
                accounts.forEach(acc => {
                    const dailyLimit = acc.daily_send_limit ?? 0;
                    const sentLast24h = acc.sent_in_last_24h ?? 0;
                    const remaining = Math.max(0, dailyLimit - sentLast24h);
                    const usagePercent = dailyLimit > 0 ? Math.round((sentLast24h / dailyLimit) * 100) : 0;
                    
                    // Color coding based on usage percentage
                    let rowClass = '';
                    if (usagePercent >= 90) rowClass = 'table-danger';
                    else if (usagePercent >= 70) rowClass = 'table-warning';
                    else if (usagePercent >= 50) rowClass = 'table-info';
                    
                    html += `<tr class="${rowClass}">
                        <td><strong>${acc.email}</strong></td>
                        <td>${dailyLimit || 'No Limit'}</td>
                        <td>${sentLast24h}</td>
                        <td>${dailyLimit > 0 ? remaining : '∞'}</td>
                        <td>
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar ${usagePercent >= 90 ? 'bg-danger' : usagePercent >= 70 ? 'bg-warning' : 'bg-success'}" 
                                     role="progressbar" style="width: ${Math.min(100, usagePercent)}%">${usagePercent}%</div>
                            </div>
                        </td>
                    </tr>`;
                });
                html += '</tbody></table></div>';
                $body.html(html);
            });

            let audiences = [];
            let templates = [];
            let campaigns = [];
            let tinymceEditor = null;
            let placeholders = [];
            const $placeholderSelect = $('#placeholder-select');

            let allAudiences = [];
            let allTemplates = [];
            let allCampaigns = [];
            let currentSubscribers = [];

            // Custom DataTable UI instances
            let audienceTable, templatesTable, campaignsTable, subscribersTable;

            window.debugModal = true;



            // Fetch Placeholders
            function fetchPlaceholders() {
                const $loadingIndicator = $('#loading-indicator');
                $loadingIndicator.show();

                $.ajax({
                        url: '/api/email-account-placeholders',
                        method: 'GET',
                        timeout: 10000,
                    })
                    .done(data => {
                        console.log('Fetched placeholders:', data);
                        const subscriberPlaceholders = data.subscriber_placeholders || [];
                        const emailAccountPlaceholders = data.email_account_placeholders || [];
                        renderPlaceholders(subscriberPlaceholders, emailAccountPlaceholders);
                        if (typeof previewEmail === 'function') {
                            previewEmail(data);
                        } else {
                            console.warn('previewEmail function is not defined');
                        }
                    })
                    .fail((jqXHR, textStatus, errorThrown) => {
                        console.error('Error fetching placeholders:', {
                            status: jqXHR.status,
                            response: jqXHR.responseJSON,
                            textStatus,
                            errorThrown
                        });
                        const subscriberPlaceholders = [{
                                value: '[first_name]',
                                text: 'Subscriber First Name'
                            },
                            {
                                value: '[last_name]',
                                text: 'Subscriber Last Name'
                            },
                            {
                                value: '[email]',
                                text: 'Subscriber Email'
                            },
                            {
                                value: '[unsubscribe_link]',
                                text: 'Unsubscribe Link'
                            }
                        ];
                        const emailAccountPlaceholders = [{
                                value: '[sender_email]',
                                text: 'Sender Email'
                            },
                            {
                                value: '[sender_first_name]',
                                text: 'Sender First Name'
                            },
                            {
                                value: '[sender_last_name]',
                                text: 'Sender Last Name'
                            },
                            {
                                value: '[type]',
                                text: 'Account Type'
                            },
                            {
                                value: '[status]',
                                text: 'Account Status'
                            },
                            {
                                value: '[phone_number]',
                                text: 'Phone Number'
                            },
                            {
                                value: '[designation]',
                                text: 'Designation'
                            },
                            {
                                value: '[fax]',
                                text: 'Fax'
                            },
                            {
                                value: '[postal_code]',
                                text: 'Postal Code'
                            },
                            {
                                value: '[address]',
                                text: 'Address'
                            }
                        ];
                        renderPlaceholders(subscriberPlaceholders, emailAccountPlaceholders);
                        if (typeof previewEmail === 'function') {
                            previewEmail({
                                subscriber_placeholders: subscriberPlaceholders,
                                email_account_placeholders: emailAccountPlaceholders
                            });
                        }
                    })
                    .always(() => {
                        $loadingIndicator.hide();
                    });
            }

            function renderPlaceholders(subscriberPlaceholders, emailAccountPlaceholders) {
                console.log('Rendering placeholders:', {
                    subscriber: subscriberPlaceholders,
                    emailAccount: emailAccountPlaceholders
                });

                const $subscriberSelect = $('#subscriber-placeholder-select');
                const $emailAccountSelect = $('#email-account-placeholder-select');

                if (!$subscriberSelect.length || !$emailAccountSelect.length) {
                    console.error('Select elements not found:', {
                        subscriberSelect: $subscriberSelect.length,
                        emailAccountSelect: $emailAccountSelect.length
                    });
                    alert('Placeholder select elements not found. Please check the page setup.');
                    return;
                }

                $subscriberSelect.empty().append('<option value="">Select Subscriber Placeholder</option>');
                subscriberPlaceholders.forEach(ph => {
                    $subscriberSelect.append(
                        `<option value="${ph.value}" data-type="subscriber">${ph.text}</option>`);
                });

                $emailAccountSelect.empty().append('<option value="">Select Email Account Placeholder</option>');
                emailAccountPlaceholders.forEach(ph => {
                    $emailAccountSelect.append(
                        `<option value="${ph.value}" data-type="email_account">${ph.text}</option>`);
                });
            }

            function initializeTinyMCEEditor(content = '') {
                const $spinner = $('#tinymce-loading');
                const $editorContainer = $('#tinymce-editor-container');

                $spinner.show();
                $editorContainer.hide();

                if (!window.tinymce) {
                    console.error('TinyMCE is not loaded.');
                    alert('Editor failed to load. Please check the TinyMCE script path.');
                    return;
                }

                if (tinymceEditor) {
                    tinymce.remove('#tinymce-editor');
                    tinymceEditor = null;
                }

                tinymce.init({
                    selector: '#tinymce-editor',
                    plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table paste help wordcount',
                    toolbar: 'undo redo | formatselect | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table | customlink | code',
                    menubar: 'file edit view insert format tools table help',
                    height: 400,
                    license_key: 'gpl',
                    paste_data_images: true,
                    paste_webkit_styles: 'all',
                    paste_merge_formats: true,
                    // 👇 Notepad-style behavior
                    forced_root_block: false,
                    enter: 'br',
                    // Add options to remove branding and promotions
                    branding: false, // Removes "Built with TinyMCE" branding
                    promotion: false, // Disables promotional dialogs like "Get all features"
                    content_style: `
            body {
                font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.2;
                padding-top: 10px;
                margin: 0;
            }
            br {
                line-height: 1;
            }
            p {
                margin: 0;
                padding-left: 10px;
            }
            table {
                border-collapse: collapse;
                width: 100%;
            }
            table, th, td {
                border: 1px solid #ccc;
                padding: 8px;
            }
            th {
                background-color: #f4f4f4;
            }
        `,
                    setup: function(editor) {
                        tinymceEditor = editor;

                        editor.on('init', function() {
                            editor.setContent(content || '');
                            $spinner.hide();
                            $editorContainer.show();
                        });

                        // Custom smart link button
                        editor.ui.registry.addButton('customlink', {
                            icon: 'link',
                            tooltip: 'Insert smart link',
                            onAction: function() {
                                convertSelectedTextToLink(editor);
                            }
                        });

                        // Ctrl+K shortcut for smart link
                        editor.addShortcut('ctrl+k', 'Insert smart link', function() {
                            convertSelectedTextToLink(editor);
                        });

                        // Smart link click behavior
                        editor.on('click', function(e) {
                            const target = e.target;
                            if (target.tagName === 'A') {
                                e.preventDefault();
                                let href = target.getAttribute('href');
                                const text = target.textContent.trim();

                                if (!href.startsWith('http')) {
                                    if (text.match(/\.[a-z]{2,}$/)) {
                                        href = 'https://' + text;
                                    } else {
                                        href =
                                            `https://www.google.com/search?q=${encodeURIComponent(text)}`;
                                    }
                                }

                                window.open(href, '_blank');
                            }
                        });
                    }
                });


                function convertSelectedTextToLink(editor) {
                    const selectedText = editor.selection.getContent({
                        format: 'text'
                    }).trim();
                    if (!selectedText) {
                        alert('Please select text to convert to a link.');
                        return;
                    }

                    let href = '';
                    if (selectedText.match(/\.[a-z]{2,}$/)) {
                        href = `https://${selectedText}`;
                    } else {
                        href = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`;
                    }

                    const linkHtml = `<a href="${href}" target="_blank">${selectedText}</a>`;
                    editor.selection.setContent(linkHtml);
                }
            }

            // Call this to initialize editor
            $(document).ready(function() {
                initializeTinyMCEEditor(''); // Pass default content here if needed
            });


            // Placeholder dropdown auto-insert
            $('#subscriber-placeholder-select').on('change', function() {
                const value = $(this).val();
                if (value) {
                    insertPlaceholder(value, 'subscriber');
                    $(this).val('');
                }
            });

            $('#email-account-placeholder-select').on('change', function() {
                const value = $(this).val();
                if (value) {
                    insertPlaceholder(value, 'email_account');
                    $(this).val('');
                }
            });

            function insertPlaceholder(value, type) {
                if (tinymceEditor && $('#editor-switch').val() === 'wysiwyg') {
                    tinymceEditor.insertContent(value);
                    console.log(`Inserted ${type} placeholder: ${value}`);
                } else {
                    const $codeEditor = $('#code-editor');
                    if ($codeEditor.length) {
                        const currentContent = $codeEditor.val();
                        $codeEditor.val(currentContent + value);
                        console.log(`Inserted ${type} placeholder in code editor: ${value}`);
                    } else {
                        console.error('Editor not found');
                    }
                }
            }


            // Fetch Audiences
            function fetchAudiences() {
                return $.get('/api/audiences')
                    .done(data => {
                        allAudiences = data || [];
                        console.log('Fetched audiences:', allAudiences);
                        // Initialize audience table immediately since it's the active tab
                        setTimeout(() => {
                            if (!audienceTable) {
                                initializeAudienceTable();
                            }
                        }, 100);
                        populateCampaignDropdowns();
                    })
                    .fail(error => {
                        console.error('Error fetching audiences:', error);
                        allAudiences = [];
                        setTimeout(() => {
                            if (!audienceTable) {
                                initializeAudienceTable();
                            }
                        }, 100);
                    });
            }

            function initializeAudienceTable() {
                console.log('Initializing audience table...');
                console.log('CustomDataTableUI available:', typeof CustomDataTableUI);

                const container = document.querySelector('#audience-table-container');
                console.log('Container exists:', container);

                if (!container) {
                    console.error('Audience table container not found!');
                    return;
                }

                console.log('Audience data:', allAudiences);

                const audienceColumns = [{
                        data: 'sno',
                        title: 'S.No',
                        type: 'sno',
                        className: 'text-center',
                        width: '60px'
                    },
                    {
                        data: 'name',
                        title: 'Name',
                        className: 'fw-bold'
                    },
                    {
                        data: 'subscribers',
                        title: 'Subscribed',
                        className: 'text-center',
                        render: (value, row) => {
                            if (row.subscribers && Array.isArray(row.subscribers)) {
                                const count = row.subscribers.filter(s => s.status === 'subscribed').length;
                                return count || 0;
                            }
                            return 0;
                        }
                    },
                    {
                        data: 'subscribers',
                        title: 'Unsubscribed',
                        className: 'text-center',
                        render: (value, row) => {
                            if (row.subscribers && Array.isArray(row.subscribers)) {
                                const count = row.subscribers.filter(s => s.status === 'unsubscribed')
                                    .length;
                                return count || 0;
                            }
                            return 0;
                        }
                    }
                ];

                const audienceActions = [{
                        label: 'Edit',
                        type: 'view',
                        icon: 'bi bi-pencil'
                    },
                    {
                        label: 'Delete',
                        type: 'delete',
                        icon: 'bi bi-trash'
                    }
                ];

                try {
                    audienceTable = new CustomDataTableUI('#audience-table-container', {
                        columns: audienceColumns,
                        data: allAudiences,
                        showSearch: true,
                        showPagination: true,
                        showLengthControl: true,
                        showCheckboxes: true,
                        idField: 'id',
                        customActions: audienceActions,
                        pageSize: 10,
                        pageSizes: [10, 25, 50],
                        onRowAction: (action, rowData) => {
                            switch (action) {
                                case 'view':
                                    window.location.href = `/audiences/${rowData.id}`;
                                    break;
                                case 'edit':
                                    $('#audience-id').val(rowData.id);
                                    $('#audience-name').val(rowData.name);
                                    $('#save-audience-btn').text('Update').removeClass('btn-success')
                                        .addClass('btn-primary');
                                    $('#addAudienceModalLabel').text('Edit Audience');
                                    $('#addAudienceModal').modal('show');
                                    break;
                                case 'delete':
                                    if (confirm('Are you sure you want to delete this audience?')) {
                                        $.ajax({
                                                url: `/api/audiences/${rowData.id}`,
                                                method: 'DELETE',
                                                headers: {
                                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]')
                                                        .attr(
                                                            'content')
                                                }
                                            })
                                            .done(() => {
                                                // Remove row immediately for better UX
                                                if (audienceTable) {
                                                    audienceTable.removeRowById(rowData.id);
                                                }

                                                // Refresh the table data in background
                                                fetchAudiences().then(() => {
                                                    if (audienceTable) {
                                                        audienceTable.setData(allAudiences);
                                                    }
                                                });

                                                if (typeof toastr !== 'undefined') {
                                                    toastr.success(
                                                        'Audience deleted successfully!');
                                                } else {
                                                    console.log('Audience deleted successfully!');
                                                }
                                            })
                                            .fail(error => {
                                                console.error('Error deleting audience:', error);
                                                if (typeof toastr !== 'undefined') {
                                                    toastr.error('Failed to delete audience.');
                                                } else {
                                                    alert('Failed to delete audience.');
                                                }
                                            });
                                    }
                                    break;
                            }
                        },
                        onSelectionChange: (selectedRows) => {
                            console.log('Selected audiences:', selectedRows);
                            // You can add custom logic here when audiences are selected
                            // For example, enable/disable bulk action buttons
                        },
                        onRefresh: () => {
                            console.log('Refreshing audiences...');
                            return fetchAudiences().then(() => {
                                if (audienceTable) {
                                    audienceTable.setData(allAudiences);
                                }
                            });
                        },
                        onBulkDelete: (selectedIds, selectedData) => {
                            console.log('Bulk deleting audiences:', selectedIds);
                            
                            // Show loading state
                            const deleteBtn = document.querySelector('.delete-selected-btn');
                            if (deleteBtn) {
                                deleteBtn.disabled = true;
                                deleteBtn.innerHTML = '<i class="bi bi-spinner"></i> Deleting...';
                            }
                            
                            // Delete all selected audiences
                            const deletePromises = selectedIds.map(id => {
                                return $.ajax({
                                    url: `/api/audiences/${id}`,
                                    method: 'DELETE',
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                    }
                                });
                            });
                            
                            Promise.all(deletePromises)
                                .then(() => {
                                    // Remove deleted rows from table immediately
                                    selectedIds.forEach(id => {
                                        if (audienceTable) {
                                            audienceTable.removeRowById(id);
                                        }
                                    });
                                    
                                    // Clear selection
                                    if (audienceTable) {
                                        audienceTable.clearSelection();
                                    }
                                    
                                    // Refresh data in background
                                    fetchAudiences().then(() => {
                                        if (audienceTable) {
                                            audienceTable.setData(allAudiences);
                                        }
                                    });
                                    
                                    // Show success message
                                    if (typeof toastr !== 'undefined') {
                                        toastr.success(`Successfully deleted ${selectedIds.length} audience(s)!`);
                                    } else {
                                        console.log(`Successfully deleted ${selectedIds.length} audience(s)!`);
                                    }
                                })
                                .catch(error => {
                                    console.error('Error during bulk delete:', error);
                                    if (typeof toastr !== 'undefined') {
                                        toastr.error('Failed to delete some audiences.');
                                    } else {
                                        alert('Failed to delete some audiences.');
                                    }
                                })
                                .finally(() => {
                                    // Reset button state
                                    if (deleteBtn) {
                                        deleteBtn.disabled = false;
                                        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                                        deleteBtn.title = 'Delete Selected (0)';
                                    }
                                });
                        }
                    });
                    console.log('Audience table initialized successfully');
                } catch (error) {
                    console.error('Error initializing audience table:', error);
                }
            }



            function resetAudienceModal() {
                $('#audience-form')[0].reset();
                $('#audience-id').val('');
                $('#save-audience-btn').text('Create').removeClass('btn-primary').addClass('btn-success');
                $('#addAudienceModalLabel').text('Add Audience');
                $('#new-tab').tab('show');
            }

            $('#audience-form').on('submit', function(e) {
                e.preventDefault();

                const id = $('#audience-id').val();
                const name = $('#audience-name').val().trim();
                const time = $('#audience-time').val(); // optional field
                const timezone = $('#audience-timezone').val(); // optional field

                if (!name) {
                    alert('Audience name is required.');
                    return;
                }

                $.ajax({
                        url: id ? `/api/audiences/${id}` : '/api/audiences',
                        method: id ? 'PUT' : 'POST',
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        data: {
                            name: name,
                            time: time,
                            timezone: timezone
                        }
                    })
                    .done((response) => {
                        console.log('Audience save success, response:', response);

                        // If this is a new audience creation (no ID), redirect to audience details
                        if (!id && response && response.id) {
                            console.log('New audience created, redirecting to audience details...');
                            window.location.href = `/audiences/${response.id}`;
                            return;
                        }

                        // For updates, just refresh the table
                        fetchAudiences().then(() => {
                            console.log('Audiences fetched, updating table...');
                            console.log('audienceTable exists:', !!audienceTable);
                            console.log('allAudiences length:', allAudiences.length);

                            // Update the table if it exists
                            if (audienceTable) {
                                console.log('Calling audienceTable.setData...');
                                audienceTable.setData(allAudiences);
                                console.log('audienceTable.setData called successfully');
                            } else {
                                console.error('audienceTable is not defined!');
                            }
                        });
                        cleanupModal('#addAudienceModal');

                        // Show success message
                        if (typeof toastr !== 'undefined') {
                            toastr.success(id ? 'Audience updated successfully!' :
                                'Audience created successfully!');
                        } else {
                            alert(id ? 'Audience updated successfully!' :
                                'Audience created successfully!');
                        }
                    })
                    .fail(error => {
                        console.error('Error saving audience:', error);
                        if (error.responseJSON && error.responseJSON.error) {
                            alert('Validation failed: ' + JSON.stringify(error.responseJSON.error));
                        } else {
                            alert('Failed to save audience.');
                        }
                    });
            });

            $('#addAudienceModal').on('hidden.bs.modal', function() {
                $(this).removeData('bs.modal');
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open');
                // Reset audience form
                $('#audience-id').val('');
                $('#audience-name').val('');

                // Additional cleanup to prevent glitching
                setTimeout(() => {
                    $('.modal-backdrop').remove();
                    $('body').removeClass('modal-open');
                }, 50);
            });




            $('#edit-existing-audience-btn').on('click', function() {
                const selectedOption = $('#editaudience option:selected');
                const audienceId = selectedOption.data('id');
                if (!audienceId) {
                    alert('Please select an audience.');
                    return;
                }
                window.location.href = `/audiences/${audienceId}`;
            });

            // Templates Functions
            function fetchTemplates() {
                return $.get('/api/templates')
                    .done(data => {
                        allTemplates = data || [];
                        console.log('Fetched templates:', allTemplates);
                        console.log('First template sample:', allTemplates[0]);
                        console.log('Templates with subjects:', allTemplates.filter(t => t.subject));
                        // Table will be initialized when templates tab is shown
                    })
                    .fail(error => {
                        console.error('Error fetching templates:', error);
                        allTemplates = [];
                        // Table will be initialized when templates tab is shown
                    });
            }

            function initializeTemplatesTable() {
                console.log('Initializing templates table...');
                console.log('CustomDataTableUI available:', typeof CustomDataTableUI);

                const container = document.querySelector('#templates-table-container');
                console.log('Container exists:', container);

                if (!container) {
                    console.error('Templates table container not found!');
                    return;
                }

                console.log('Templates data:', allTemplates);

                // If no data available, try to fetch it first
                if (allTemplates.length === 0) {
                    console.log('No templates data available, fetching...');
                    fetchTemplates().then(() => {
                        console.log('Templates fetched, reinitializing table...');
                        initializeTemplatesTable();
                    }).catch(error => {
                        console.error('Failed to fetch templates:', error);
                    });
                    return;
                }

                const templateColumns = [{
                        data: 'sno',
                        title: 'S.No',
                        type: 'sno',
                        className: 'text-center',
                        width: '60px'
                    },
                    {
                        data: 'title',
                        title: 'Title',
                        className: 'fw-bold'
                    },
                    {
                        data: 'last_modified',
                        title: 'Last Modified',
                        type: 'datetime',
                        className: 'text-center'
                    }
                ];

                const templateActions = [{
                        label: 'Edit',
                        type: 'edit',
                        icon: 'bi bi-pencil'
                    },
                    {
                        label: 'Preview',
                        type: 'preview',
                        icon: 'bi bi-eye'
                    },
                    {
                        label: 'Delete',
                        type: 'delete',
                        icon: 'bi bi-trash'
                    }
                ];

                try {
                    // Clear loading indicator
                    container.innerHTML = '';
                    
                    templatesTable = new CustomDataTableUI('#templates-table-container', {
                        columns: templateColumns,
                        data: allTemplates,
                        showSearch: true,
                        showPagination: true,
                        showLengthControl: true,
                        showCheckboxes: true,
                        idField: 'id',
                        customActions: templateActions,
                        pageSize: 10,
                        pageSizes: [10, 25, 50],
                        onRowAction: (action, rowData) => {
                            switch (action) {
                                case 'edit':
                                    const editorType = rowData.content.includes('<html') || rowData
                                        .content
                                        .includes('<div') ? 'code' : 'wysiwyg';
                                    showEditorModal('Edit Template', rowData.title, editorType, rowData
                                        .content, rowData.id, null, rowData.subject || '');
                                    break;
                                case 'preview':
                                    showTemplatePreview(rowData.id, rowData.title);
                                    break;
                                case 'delete':
                                    if (confirm('Are you sure you want to delete this template?')) {
                                        $.ajax({
                                                url: `/api/templates/${rowData.id}`,
                                                method: 'DELETE',
                                                headers: {
                                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]')
                                                        .attr(
                                                            'content')
                                                }
                                            })
                                            .done(() => {
                                                // Remove row immediately for better UX
                                                if (templatesTable) {
                                                    templatesTable.removeRowById(rowData.id);
                                                }

                                                // Refresh the table data in background
                                                fetchTemplates().then(() => {
                                                    if (templatesTable) {
                                                        templatesTable.setData(
                                                            allTemplates);
                                                    }
                                                });

                                                if (typeof toastr !== 'undefined') {
                                                    toastr.success(
                                                        'Template deleted successfully!');
                                                } else {
                                                    console.log('Template deleted successfully!');
                                                }
                                            })
                                            .fail(error => {
                                                console.error('Error deleting template:', error);
                                                if (typeof toastr !== 'undefined') {
                                                    toastr.error('Failed to delete template.');
                                                } else {
                                                    alert('Failed to delete template.');
                                                }
                                            });
                                    }
                                    break;
                            }
                        },
                        onSelectionChange: (selectedRows) => {
                            console.log('Selected templates:', selectedRows);
                            // You can add custom logic here when templates are selected
                            // For example, enable/disable bulk action buttons
                        },
                        onRefresh: () => {
                            console.log('Refreshing templates...');
                            return fetchTemplates().then(() => {
                                if (templatesTable) {
                                    templatesTable.setData(allTemplates);
                                }
                            });
                        },
                        onBulkDelete: (selectedIds, selectedData) => {
                            console.log('Bulk deleting templates:', selectedIds);
                            
                            // Show loading state
                            const deleteBtn = document.querySelector('#templates-table-container .delete-selected-btn');
                            if (deleteBtn) {
                                deleteBtn.disabled = true;
                                deleteBtn.innerHTML = '<i class="bi bi-spinner"></i> Deleting...';
                            }
                            
                            // Delete all selected templates
                            const deletePromises = selectedIds.map(id => {
                                return $.ajax({
                                    url: `/api/templates/${id}`,
                                    method: 'DELETE',
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                    }
                                });
                            });
                            
                            Promise.all(deletePromises)
                                .then(() => {
                                    // Remove deleted rows from table immediately
                                    selectedIds.forEach(id => {
                                        if (templatesTable) {
                                            templatesTable.removeRowById(id);
                                        }
                                    });
                                    
                                    // Clear selection
                                    if (templatesTable) {
                                        templatesTable.clearSelection();
                                    }
                                    
                                    // Refresh data in background
                                    fetchTemplates().then(() => {
                                        if (templatesTable) {
                                            templatesTable.setData(allTemplates);
                                        }
                                    });
                                    
                                    // Show success message
                                    if (typeof toastr !== 'undefined') {
                                        toastr.success(`Successfully deleted ${selectedIds.length} template(s)!`);
                                    } else {
                                        console.log(`Successfully deleted ${selectedIds.length} template(s)!`);
                                    }
                                })
                                .catch(error => {
                                    console.error('Error during bulk delete:', error);
                                    if (typeof toastr !== 'undefined') {
                                        toastr.error('Failed to delete some templates.');
                                    } else {
                                        alert('Failed to delete some templates.');
                                    }
                                })
                                .finally(() => {
                                    // Reset button state
                                    if (deleteBtn) {
                                        deleteBtn.disabled = false;
                                        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                                        deleteBtn.title = 'Delete Selected (0)';
                                    }
                                });
                        }
                    });
                    console.log('Templates table initialized successfully');
                } catch (error) {
                    console.error('Error initializing templates table:', error);
                    container.innerHTML = `
                        <div class="text-center py-4">
                            <div class="text-danger">
                                <i class="bi bi-exclamation-triangle"></i>
                                <p class="mt-2">Failed to load templates. Please refresh the page.</p>
                            </div>
                        </div>
                    `;
                }
            }



            function showEditorModal(modalTitle, title, editorType, content = '', id = null, onHiddenCallback =
                null, subject = '') {
                if (window.debugModal) console.log('Showing editor modal:', {
                    modalTitle,
                    editorType,
                    id,
                    subject
                });
                $('#editorModalLabel').text(modalTitle);
                $('#editor-title').val(title).prop('disabled', false).prop('readonly', false);
                $('#editor-subject').val(subject).prop('disabled', false).prop('readonly', false);
                $('#template-id').val(id || '');
                $('#editor-switch').val(editorType);
                $('#tinymce-editor-container').hide();
                $('#code-editor-container').hide();
                fetchPlaceholders();
                if (editorType === 'wysiwyg') {
                    $('#tinymce-editor-container').show();
                    initializeTinyMCEEditor(content);
                } else {
                    $('#code-editor-container').show();
                    $('#code-editor').val(content);
                }
                $('#editorModal').off('hidden.bs.modal');
                if (onHiddenCallback) {
                    $('#editorModal').on('hidden.bs.modal', onHiddenCallback);
                }
                $('#addCampaignModal').modal('hide');
                $('#editorModal').modal('show');
                $('#editorModal').on('shown.bs.modal', function() {
                    $('#editor-title').focus();
                });
            }

            // Template button handler moved to centralized action button

            $('#editor-switch').on('change', function() {
                const currentContent = tinymceEditor && $('#editor-switch').val() === 'wysiwyg' ?
                    tinymceEditor.getContent() : $('#code-editor').val();
                const title = $('#editor-title').val();
                const subject = $('#editor-subject').val();
                const id = $('#template-id').val();
                showEditorModal('Edit Template', title, $(this).val(), currentContent, id, null, subject);
            });

            $('#insert-subscriber-placeholder').on('click', function() {
                const selectedValue = $('#subscriber-placeholder-select').val();
                if (selectedValue) {
                    insertPlaceholder(selectedValue, 'subscriber');
                }
            });

            $('#insert-email-account-placeholder').on('click', function() {
                const selectedValue = $('#email-account-placeholder-select').val();
                if (selectedValue) {
                    insertPlaceholder(selectedValue, 'email_account');
                }
            });

            $('#save-template-btn').on('click', function() {
                if (window.debugModal) console.log('Save template button clicked');
                const id = $('#template-id').val();
                const title = $('#editor-title').val().trim();
                const subject = $('#editor-subject').val().trim();
                const editorType = $('#editor-switch').val();
                const content = editorType === 'wysiwyg' && tinymceEditor ? tinymceEditor.getContent() : $(
                    '#code-editor').val();
                const triggeredFromCampaign = $('#create-template-btn').data('triggered');

                if (!title || !content) {
                    alert('Title and content are required.');
                    return;
                }
                const templateData = {
                    title,
                    subject,
                    content
                };
                const method = id ? 'PUT' : 'POST';
                const url = id ? `/api/templates/${id}` : '/api/templates';

                $.ajax({
                        url: url,
                        method: method,
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        contentType: 'application/json',
                        data: JSON.stringify(templateData)
                    })
                    .done(response => {
                        if (window.debugModal) console.log('Template saved:', response);
                        console.log('Template save success, fetching templates...');
                        fetchTemplates().then(() => {
                            console.log('Templates fetched, updating table...');
                            console.log('templatesTable exists:', !!templatesTable);
                            console.log('allTemplates length:', allTemplates.length);

                            // Update the table if it exists
                            if (templatesTable) {
                                console.log('Calling templatesTable.setData...');
                                templatesTable.setData(allTemplates);
                                console.log('templatesTable.setData called successfully');
                            } else {
                                console.error('templatesTable is not defined!');
                            }

                            $('#editorModal').modal('hide');
                            $('.modal-backdrop').remove();

                            // Show success message
                            if (typeof toastr !== 'undefined') {
                                toastr.success(id ? 'Template updated successfully!' :
                                    'Template created successfully!');
                            } else {
                                alert(id ? 'Template updated successfully!' :
                                    'Template created successfully!');
                            }

                            if (triggeredFromCampaign) {
                                const campaignState = $('#create-template-btn').data(
                                    'campaign-state') || {};
                                $('#create-template-btn').data('triggered', false);
                                if (window.debugModal) console.log(
                                    'Restoring campaign modal with template ID:', response
                                    .id);
                                populateCampaignDropdowns(response.id, campaignState
                                    .audienceId);
                                $('#addCampaignModal').modal('show');
                            }
                        });
                    })
                    .fail(error => {
                        console.error('Error saving template:', error);
                        alert('Failed to save template.');
                    });
            });



            // Campaigns Functions
            function fetchCampaigns() {
                return $.get('/api/campaigns')
                    .done(data => {
                        allCampaigns = data || [];
                        console.log('Fetched campaigns:', allCampaigns);
                        // Table will be initialized when campaigns tab is shown
                        populateSendSettingsDropdowns();
                    })
                    .fail(error => {
                        console.error('Error fetching campaigns:', error);
                        allCampaigns = [];
                        // Table will be initialized when campaigns tab is shown
                        populateSendSettingsDropdowns();
                    });
            }

            function initializeCampaignsTable() {
                console.log('Initializing campaigns table...');
                console.log('CustomDataTableUI available:', typeof CustomDataTableUI);

                const container = document.querySelector('#campaigns-table-container');
                console.log('Container exists:', container);

                if (!container) {
                    console.error('Campaigns table container not found!');
                    return;
                }

                console.log('Campaigns data:', allCampaigns);

                // If no data available, try to fetch it first
                if (allCampaigns.length === 0) {
                    console.log('No campaigns data available, fetching...');
                    fetchCampaigns().then(() => {
                        console.log('Campaigns fetched, reinitializing table...');
                        initializeCampaignsTable();
                    }).catch(error => {
                        console.error('Failed to fetch campaigns:', error);
                    });
                    return;
                }

                const campaignColumns = [{
                        data: 'sno',
                        title: 'S.No',
                        type: 'sno',
                        className: 'text-center',
                        width: '60px'
                    },
                    {
                        data: 'name',
                        title: 'Name',
                        className: 'fw-bold'
                    },
                    {
                        data: 'template_title',
                        title: 'Template',
                        render: (value, row) => {
                            const template = allTemplates.find(t => t.id == row.template_id);
                            return template ? template.title : 'Unknown';
                        }
                    },
                    {
                        data: 'audience_name',
                        title: 'Audience',
                        render: (value, row) => {
                            const audience = allAudiences.find(a => a.id == row.audience_id);
                            return audience ? audience.name : 'Unknown';
                        }
                    },
                    {
                        data: 'status',
                        title: 'Status',
                        type: 'status',
                        className: 'text-center',
                        render: (value, row) => {
                            return row.status || 'Draft';
                        }
                    }
                ];

                const campaignActions = [{
                        label: 'Edit',
                        type: 'edit',
                        icon: 'bi bi-pencil'
                    },
                    {
                        label: 'Delete',
                        type: 'delete',
                        icon: 'bi bi-trash'
                    }
                ];

                try {
                    // Clear loading indicator
                    container.innerHTML = '';
                    
                    campaignsTable = new CustomDataTableUI('#campaigns-table-container', {
                        columns: campaignColumns,
                        data: allCampaigns,
                        showSearch: true,
                        showPagination: true,
                        showLengthControl: true,
                        showCheckboxes: true,
                        idField: 'id',
                        customActions: campaignActions,
                        pageSize: 10,
                        pageSizes: [10, 25, 50],
                        onRowAction: (action, rowData) => {
                            switch (action) {
                                case 'edit':
                                    // Handle campaign edit
                                    $('#campaign-id').val(rowData.id);
                                    $('#campaign-name').val(rowData.name);

                                    // Populate dropdowns first, then set the values
                                    populateCampaignDropdowns(rowData.template_id, rowData.audience_id);

                                    $('#addCampaignModalLabel').text('Edit Campaign');
                                    $('#save-campaign-btn').text('Update Campaign').removeClass(
                                        'btn-success').addClass('btn-primary');
                                    $('#addCampaignModal').modal('show');
                                    break;
                                case 'delete':
                                    if (confirm('Are you sure you want to delete this campaign?')) {
                                        $.ajax({
                                                url: `/api/campaigns/${rowData.id}`,
                                                method: 'DELETE',
                                                headers: {
                                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]')
                                                        .attr(
                                                            'content')
                                                }
                                            })
                                            .done(() => {
                                                // Remove row immediately for better UX
                                                if (campaignsTable) {
                                                    campaignsTable.removeRowById(rowData.id);
                                                }

                                                // Refresh the table data in background
                                                fetchCampaigns().then(() => {
                                                    if (campaignsTable) {
                                                        campaignsTable.setData(
                                                            allCampaigns);
                                                    }
                                                });

                                                if (typeof toastr !== 'undefined') {
                                                    toastr.success(
                                                        'Campaign deleted successfully!');
                                                } else {
                                                    console.log('Campaign deleted successfully!');
                                                }
                                            })
                                            .fail(error => {
                                                console.error('Error deleting campaign:', error);
                                                if (typeof toastr !== 'undefined') {
                                                    toastr.error('Failed to delete campaign.');
                                                } else {
                                                    alert('Failed to delete campaign.');
                                                }
                                            });
                                    }
                                    break;
                            }
                        },
                        onSelectionChange: (selectedRows) => {
                            console.log('Selected campaigns:', selectedRows);
                            // You can add custom logic here when campaigns are selected
                            // For example, enable/disable bulk action buttons
                        },
                        onRefresh: () => {
                            console.log('Refreshing campaigns...');
                            return fetchCampaigns().then(() => {
                                if (campaignsTable) {
                                    campaignsTable.setData(allCampaigns);
                                }
                            });
                        },
                        onBulkDelete: (selectedIds, selectedData) => {
                            console.log('Bulk deleting campaigns:', selectedIds);
                            
                            // Show loading state
                            const deleteBtn = document.querySelector('#campaigns-table-container .delete-selected-btn');
                            if (deleteBtn) {
                                deleteBtn.disabled = true;
                                deleteBtn.innerHTML = '<i class="bi bi-spinner"></i> Deleting...';
                            }
                            
                            // Delete all selected campaigns
                            const deletePromises = selectedIds.map(id => {
                                return $.ajax({
                                    url: `/api/campaigns/${id}`,
                                    method: 'DELETE',
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                    }
                                });
                            });
                            
                            Promise.all(deletePromises)
                                .then(() => {
                                    // Remove deleted rows from table immediately
                                    selectedIds.forEach(id => {
                                        if (campaignsTable) {
                                            campaignsTable.removeRowById(id);
                                        }
                                    });
                                    
                                    // Clear selection
                                    if (campaignsTable) {
                                        campaignsTable.clearSelection();
                                    }
                                    
                                    // Refresh data in background
                                    fetchCampaigns().then(() => {
                                        if (campaignsTable) {
                                            campaignsTable.setData(allCampaigns);
                                        }
                                    });
                                    
                                    // Show success message
                                    if (typeof toastr !== 'undefined') {
                                        toastr.success(`Successfully deleted ${selectedIds.length} campaign(s)!`);
                                    } else {
                                        console.log(`Successfully deleted ${selectedIds.length} campaign(s)!`);
                                    }
                                })
                                .catch(error => {
                                    console.error('Error during bulk delete:', error);
                                    if (typeof toastr !== 'undefined') {
                                        toastr.error('Failed to delete some campaigns.');
                                    } else {
                                        alert('Failed to delete some campaigns.');
                                    }
                                })
                                .finally(() => {
                                    // Reset button state
                                    if (deleteBtn) {
                                        deleteBtn.disabled = false;
                                        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                                        deleteBtn.title = 'Delete Selected (0)';
  
                                    }
                                });
                        }
                    });
                    console.log('Campaigns table initialized successfully');
                } catch (error) {
                    console.error('Error initializing campaigns table:', error);
                    container.innerHTML = `
                        <div class="text-center py-4">
                            <div class="text-danger">
                                <i class="bi bi-exclamation-triangle"></i>
                                <p class="mt-2">Failed to load campaigns. Please refresh the page.</p>
                            </div>
                        </div>
                    `;
                }
            }



            function populateCampaignDropdowns(currentTemplateId = null, currentAudienceId = null) {
                const $templateSelect = $('#campaign-template');
                const $audienceSelect = $('#campaign-audience');
                $templateSelect.empty().append('<option value="">-- Select Template --</option>');
                allTemplates.forEach(template => {
                    $templateSelect.append(`<option value="${template.id}">${template.title}</option>`);
                });
                $audienceSelect.empty().append('<option value="">-- Select Audience --</option>');
                allAudiences.forEach(audience => {
                    $audienceSelect.append(`<option value="${audience.id}">${audience.name}</option>`);
                });

                $templateSelect.val(currentTemplateId || '');
                $audienceSelect.val(currentAudienceId || '');
                if (window.debugModal) {
                    console.log('After population - Template select value:', $templateSelect.val());
                    console.log('After population - Audience select value:', $audienceSelect.val());
                }

                $.get('/api/campaigns').done(data => {
                    const $sendSelect = $('#send-campaign-select');
                    const $scheduleSelect = $('#schedule-campaign-select');
                    $sendSelect.empty().append('<option value="">-- Select Campaign --</option>');
                    $scheduleSelect.empty().append('<option value="">-- Select Campaign --</option>');
                    data.forEach(campaign => {
                        const option = `<option value="${campaign.id}">${campaign.name}</option>`;
                        $sendSelect.append(option);
                        $scheduleSelect.append(option);
                    });
                });
            }

            function resetCampaignModal() {
                $('#campaign-id').val('');
                $('#campaign-name').val('');
                $('#campaign-template').val('');
                $('#campaign-audience').val('');
                $('#save-campaign-btn').text('Save Campaign').removeClass('btn-primary').addClass(
                    'btn-success');
                $('#addCampaignModalLabel').text('Add Campaign');
            }

            // Populate dropdowns when campaign modal is shown
            $('#addCampaignModal').on('shown.bs.modal', function() {
                const campaignId = $('#campaign-id').val();
                if (!campaignId) {
                    // This is for adding a new campaign, populate dropdowns with empty values
                    populateCampaignDropdowns();
                }
            });

            // Clean up campaign modal when hidden
            $('#addCampaignModal').on('hidden.bs.modal', function() {
                $(this).removeData('bs.modal');
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open');
                resetCampaignModal();

                // Additional cleanup to prevent glitching
                setTimeout(() => {
                    $('.modal-backdrop').remove();
                    $('body').removeClass('modal-open');
                }, 50);
            });

            // Global modal cleanup function
            function cleanupModal(modalId) {
                $(modalId).modal('hide');
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open');
                setTimeout(() => {
                    $('.modal-backdrop').remove();
                    $('body').removeClass('modal-open');
                    // Force remove any remaining modal-related classes
                    $('body').removeClass('modal-open');
                    $('.modal-backdrop').remove();
                }, 100);
            }

            // Enhanced modal opening function with safety checks
            function openModalSafely(modalId) {
                // First, ensure any existing modals are properly closed
                $('.modal').modal('hide');
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open');

                // Wait a bit, then open the target modal
                setTimeout(() => {
                    $(modalId).modal('show');
                }, 150);
            }

            // Centralized action button handler
            $('#email-action-btn').on('click', function() {
                const activeTab = $('#emailSchedulerTabs .nav-link.active');
                const actionType = activeTab.attr('data-type');
                const actionText = activeTab.attr('data-text');

                console.log('Action button clicked:', actionType, actionText);

                switch (actionType) {
                    case 'add':
                        if (actionText === 'Add Audience') {
                            openModalSafely('#addAudienceModal');
                        } else if (actionText === 'Add Template') {
                            showEditorModal('Create Template', '', 'wysiwyg', '', null, function() {
                                // Template creation callback
                            });
                        } else if (actionText === 'Add Campaign') {
                            openModalSafely('#addCampaignModal');
                        }
                        break;
                    case 'send':
                        // Handle send campaign action
                        console.log('Send campaign action triggered');
                        break;
                    default:
                        console.log('Unknown action type:', actionType);
                }
            });

            $('#campaign-form').on('submit', function(e) {
                e.preventDefault();
                const campaignId = $('#campaign-id').val();
                const campaign = {
                    name: $('#campaign-name').val(),
                    template_id: $('#campaign-template').val(),
                    audience_id: $('#campaign-audience').val(),
                    status: 'Draft'
                };

                if (!campaign.name || !campaign.template_id || !campaign.audience_id) {
                    alert('Please fill in all fields.');
                    return;
                }

                const method = campaignId ? 'PUT' : 'POST';
                const url = campaignId ? `/api/campaigns/${campaignId}` : '/api/campaigns';

                $.ajax({
                        url: url,
                        method: method,
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        contentType: 'application/json',
                        data: JSON.stringify(campaign)
                    })
                    .done(() => {
                        cleanupModal('#addCampaignModal');
                        resetCampaignModal();
                        console.log('Campaign save success, fetching campaigns...');
                        fetchCampaigns().then(() => {
                            console.log('Campaigns fetched, updating table...');
                            console.log('campaignsTable exists:', !!campaignsTable);
                            console.log('allCampaigns length:', allCampaigns.length);

                            // Update the table if it exists
                            if (campaignsTable) {
                                console.log('Calling campaignsTable.setData...');
                                campaignsTable.setData(allCampaigns);
                                console.log('campaignsTable.setData called successfully');
                            } else {
                                console.error('campaignsTable is not defined!');
                            }
                        });

                        // Show success message
                        if (typeof toastr !== 'undefined') {
                            toastr.success(campaignId ? 'Campaign updated successfully!' :
                                'Campaign created successfully!');
                        } else {
                            alert(campaignId ? 'Campaign updated successfully!' :
                                'Campaign created successfully!');
                        }
                    })
                    .fail(error => {
                        console.error('Error saving campaign:', error);
                        alert('Failed to save campaign: ' + (error.responseJSON?.message ||
                            'Unknown error'));
                        cleanupModal('#addCampaignModal');
                    });
            });





            // Create Template from Campaign Modal
            $('#create-template-btn').on('click', function() {
                if (window.debugModal) console.log('Create template button clicked');
                const $templateSelect = $('#campaign-template');
                const $audienceSelect = $('#campaign-audience');
                const selectedTemplateId = $templateSelect.val();
                const selectedAudienceId = $audienceSelect.val();

                $(this).data('campaign-state', {
                    templateId: selectedTemplateId,
                    audienceId: selectedAudienceId
                });
                $(this).data('triggered', true);

                showEditorModal('Create Template', '', 'wysiwyg', '', null, function() {
                    fetchTemplates().then(() => {
                        $('#addCampaignModal').modal('show');
                        populateCampaignDropdowns(selectedTemplateId);
                    });
                }, '');
            });

            // Create Audience from Campaign Modal
            $('#create-audience-btn').on('click', function() {
                if (window.debugModal) console.log('Create audience button clicked');
                const $templateSelect = $('#campaign-template');
                const $audienceSelect = $('#campaign-audience');
                const selectedTemplateId = $templateSelect.val();
                const selectedAudienceId = $audienceSelect.val();

                $(this).data('campaign-state', {
                    templateId: selectedTemplateId,
                    audienceId: selectedAudienceId
                });

                $('#audience-name-create').val('').prop('disabled', false).prop('readonly', false);
                $('#subscribers-input-create').val('').prop('disabled', false).prop('readonly', false);
                $('#audience-name-csv-create').val('').prop('disabled', false).prop('readonly', false);
                $('#csv-file-create').val('').prop('disabled', false);

                $('#addCampaignModal').modal('hide');
                $('#createAudienceModal').modal('show').on('hidden.bs.modal', function() {
                    fetchAudiences().then(() => {
                        $('#addCampaignModal').modal('show');
                        populateCampaignDropdowns(selectedTemplateId);
                    });
                });
            });

            $('#createAudienceModal').on('shown.bs.modal', function() {
                if (window.debugModal) console.log('Create audience modal shown');
                const $nameField = $('#audience-name-create');
                const $subscribersField = $('#subscribers-input-create');
                const $csvNameField = $('#audience-name-csv-create');
                const $csvFileField = $('#csv-file-create');

                $nameField.prop('disabled', false).prop('readonly', false).focus();
                $subscribersField.prop('disabled', false).prop('readonly', false);
                $csvNameField.prop('disabled', false).prop('readonly', false);
                $csvFileField.prop('disabled', false);

                if (window.debugModal) {
                    console.log('Audience name field enabled:', !$nameField.prop('disabled'));
                    console.log('Subscribers field enabled:', !$subscribersField.prop('disabled'));
                    console.log('CSV name field enabled:', !$csvNameField.prop('disabled'));
                    console.log('CSV file field enabled:', !$csvFileField.prop('disabled'));
                }
            });

            $('#save-audience-from-campaign-btn').on('click', function() {
                if (window.debugModal) console.log('Save audience button clicked');
                const $btn = $(this);
                const $spinner = $btn.find('.loading-spinner');
                const name = $('#audience-name-create').val().trim();
                const format = $('#subscriber-format-create').val();
                const input = $('#subscribers-input-create').val().trim();
                const lines = input.split('\n').filter(line => line.trim() !== '');
                const currentTemplateId = $('#campaign-template').val();

                const subscribers = lines.map(line => {
                    const parts = line.split(',').map(part => part.trim());
                    if (format === 'first-email' && parts.length === 2) {
                        return {
                            first_name: parts[0],
                            email: parts[1],
                            status: 'subscribed'
                        };
                    } else if (format === 'first-last-email' && parts.length === 3) {
                        return {
                            first_name: parts[0],
                            last_name: parts[1],
                            email: parts[2],
                            status: 'subscribed'
                        };
                    }
                    return null;
                }).filter(sub => sub !== null);

                if (!name || subscribers.length === 0) {
                    alert('Audience name and at least one subscriber are required.');
                    return;
                }

                $spinner.show();
                $btn.prop('disabled', true);

                // Step 1: Create audience (POST only name)
                $.ajax({
                        url: '/api/audiences',
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        contentType: 'application/json',
                        data: JSON.stringify({
                            name
                        })
                    })
                    .done(data => {
                        const audienceId = data.id;
                        // Step 2: POST subscribers to /api/subscribers/bulk
                        const subscribersWithAudience = subscribers.map(sub => ({
                            ...sub,
                            audience_id: audienceId
                        }));
                        $.ajax({
                                url: '/api/subscribers/bulk',
                                method: 'POST',
                                headers: {
                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                },
                                contentType: 'application/json',
                                data: JSON.stringify({
                                    subscribers: subscribersWithAudience
                                })
                            })
                            .done(() => {
                                fetchAudiences().then(() => {
                                    $('#createAudienceModal').modal('hide');
                                    $('#addCampaignModal').modal('show');
                                    populateCampaignDropdowns(currentTemplateId);
                                    $('#subscribers-input-create').val('');
                                    $('#audience-name-create').val('');
                                    $spinner.hide();
                                    $btn.prop('disabled', false);
                                });
                            })
                            .fail(error => {
                                console.error('Error saving subscribers:', error.responseJSON ||
                                    error);
                                alert('Failed to save subscribers: ' + (error.responseJSON
                                    ?.message || 'Unknown error'));
                                $spinner.hide();
                                $btn.prop('disabled', false);
                            });
                    })
                    .fail(error => {
                        console.error('Error saving audience:', error.responseJSON || error);
                        alert('Failed to save audience: ' + (error.responseJSON?.message ||
                            'Unknown error'));
                        $spinner.hide();
                        $btn.prop('disabled', false);
                    });
            });

            // Advanced CSV Import for Campaign
            $('#upload-csv-campaign-btn').on('click', function() {
                const $btn = $(this);
                const $spinner = $btn.find('.loading-spinner');
                const $progress = $('#csv-upload-progress-campaign');
                const $progressBar = $progress.find('.progress-bar');
                const $error = $('#csv-import-error-campaign');
                const name = $('#audience-name-csv-create').val().trim();
                const fileInput = $('#csv-file-create')[0];

                if (!name) {
                    if (typeof toastr !== 'undefined') {
                        toastr.error('Please enter an audience name.');
                    } else {
                        alert('Please enter an audience name.');
                    }
                    return;
                }
                if (!fileInput.files || fileInput.files.length === 0) {
                    if (typeof toastr !== 'undefined') {
                        toastr.error('Please upload a CSV file.');
                    } else {
                        alert('Please upload a CSV file.');
                    }
                    return;
                }

                const file = fileInput.files[0];
                $spinner.show();
                $btn.prop('disabled', true);
                $error.hide();
                $progress.show();
                $progressBar.css('width', '0%').attr('aria-valuenow', 0).text('0%');

                const formData = new FormData();
                formData.append('file', file);

                $.ajax({
                    url: '/campaign/upload-csv',
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    data: formData,
                    processData: false,
                    contentType: false,
                    xhr: function() {
                        const xhr = new window.XMLHttpRequest();
                        xhr.upload.addEventListener('progress', function(evt) {
                            if (evt.lengthComputable) {
                                const percentComplete = Math.round((evt.loaded / evt
                                    .total) * 100);
                                $progressBar.css('width', percentComplete + '%')
                                    .attr('aria-valuenow', percentComplete)
                                    .text(percentComplete + '%');
                            }
                        }, false);
                        return xhr;
                    },
                    success: function(response) {
                        $progress.hide();
                        $spinner.hide();
                        $btn.prop('disabled', false);

                        // Store the token for later use
                        window.campaignCsvToken = response.token;
                        window.campaignCsvName = name;

                        // Show mapping modal
                        showCsvMappingModalCampaign(response.token, response.header, response
                            .sample, response.row_count);
                    },
                    error: function(xhr) {
                        $progress.hide();
                        $spinner.hide();
                        $btn.prop('disabled', false);

                        let errorMsg = 'Upload failed';
                        if (xhr.responseJSON?.message) {
                            errorMsg += ': ' + xhr.responseJSON.message;
                        } else if (xhr.responseJSON?.error) {
                            errorMsg += ': ' + xhr.responseJSON.error;
                        }
                        if (typeof toastr !== 'undefined') {
                            toastr.error(errorMsg);
                        } else {
                            alert(errorMsg);
                        }
                    }
                });
            });

            // Handle CSV import from mapping modal
            $(document).on('click', '#import-mapped-csv-btn-campaign', function() {
                const $btn = $(this);
                const token = window.campaignCsvToken;
                const name = window.campaignCsvName;

                // Get mapping from the new column mapping structure (matching drift-emails)
                const mapping = {};
                $('.csv-map-select-campaign').each(function() {
                    const colIdx = $(this).data('col');
                    const field = $(this).val();
                    if (field) mapping[colIdx] = field;
                });

                const fromRow = $('#csv-row-range-from-campaign').val() || 1;
                const toRow = $('#csv-row-range-to-campaign').val();

                // Check if email field is mapped (matching drift-emails validation)
                let hasEmail = false;
                for (let colIdx in mapping) {
                    if (mapping[colIdx] === 'email') {
                        hasEmail = true;
                        break;
                    }
                }
                if (!hasEmail) {
                    if (typeof toastr !== 'undefined') {
                        toastr.error('Email column is required.');
                    } else {
                        alert('Email column is required.');
                    }
                    return;
                }

                $btn.prop('disabled', true);
                $('#csv-import-progress-campaign').show();
                $('#csv-import-progress-text-campaign').text('Starting import...');

                // Fallback progress counter
                let fallbackProgress = 0;
                let fallbackInterval = setInterval(function() {
                    fallbackProgress += 1;
                    if (fallbackProgress <= 90) {
                        $('#csv-import-progress-text-campaign').text(
                            `Processing... ${fallbackProgress}%`);
                    }
                }, 2000);

                // Start progress tracking
                let progressInterval = setInterval(function() {
                    $.get('/campaign/import-progress', {
                        token: token
                    }, function(progressRes) {
                        if (progressRes.current !== undefined && progressRes.total) {
                            const percent = Math.round((progressRes.current /
                                progressRes.total) * 100);
                            $('#csv-import-progress-text-campaign').text(
                                `${progressRes.current} / ${progressRes.total} (${percent}%)`
                            );
                            fallbackProgress = percent;
                        } else {
                            $('#csv-import-progress-text-campaign').text('Processing...');
                        }
                    }).fail(function(xhr) {
                        $('#csv-import-progress-text-campaign').text('Processing...');
                    });
                }, 500);

                $.ajax({
                    url: '/campaign/process-csv',
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    contentType: 'application/json',
                    data: JSON.stringify({
                        token: token,
                        mapping: mapping,
                        from: parseInt(fromRow),
                        to: parseInt(toRow),
                        name: name,
                        _token: $('meta[name="csrf-token"]').attr('content')
                    }),
                    success: function(res) {
                        clearInterval(progressInterval);
                        clearInterval(fallbackInterval);
                        $('#csv-import-progress-campaign').hide();

                        let message = `Import completed!\n\n`;
                        message +=
                            `✅ Successfully imported: ${res.inserted_count} subscribers\n`;
                        message += `❌ Failed rows: ${res.failed_count}\n`;
                        message += `📄 Remaining rows: ${res.remaining_count}\n`;
                        message += `📊 Total rows in file: ${res.total_rows_in_file}\n`;
                        message += `📋 Imported range: ${res.imported_range}`;

                        if (typeof toastr !== 'undefined') {
                            toastr.success(message);
                        } else {
                            alert(message);
                        }

                        // Show download buttons if needed
                        let downloadHtml = '';
                        if (res.failed_csv) {
                            downloadHtml += `<a href="${res.failed_csv}" class="btn btn-warning btn-sm me-2" onclick="downloadCsvCampaign('${res.failed_csv}')">
                                <i class="bi bi-download"></i> Download Failed Rows (${res.failed_count})
                            </a>`;
                        }
                        if (res.remaining_csv) {
                            downloadHtml += `<a href="${res.remaining_csv}" class="btn btn-info btn-sm" onclick="downloadCsvCampaign('${res.remaining_csv}')">
                                <i class="bi bi-download"></i> Download Remaining Rows (${res.remaining_count})
                            </a>`;
                        }

                        if (downloadHtml) {
                            $('#csv-import-results-campaign').html(`
                                <div class="alert alert-success mt-3">
                                    <h6><i class="bi bi-check-circle"></i> Import Complete - Download Files:</h6>
                                    <p class="mb-2">Your CSV import has been processed. You can download the following files:</p>
                                    ${downloadHtml}
                                    <hr>
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="$('#csvMappingModalCampaign').modal('hide'); $('#csv-import-results-campaign').html('');">
                                        <i class="bi bi-x-circle"></i> Close Modal
                                    </button>
                                </div>
                            `);
                        } else {
                            // Only close modal if no download files
                            setTimeout(() => {
                                $('#csvMappingModalCampaign').modal('hide');
                            }, 3000);
                        }

                        // Refresh audiences and populate dropdowns
                        fetchAudiences().then(() => {
                            const currentTemplateId = $('#campaign-template').val();
                            populateCampaignDropdowns(currentTemplateId, res
                                .audience_id);
                            $('#audience-name-csv-create').val('');
                            $('#csv-file-create').val('');
                        });
                    },
                    error: function(xhr) {
                        clearInterval(progressInterval);
                        clearInterval(fallbackInterval);
                        $('#csv-import-progress-campaign').hide();
                        let errorMsg = 'Import failed';
                        if (xhr.responseJSON?.error) {
                            errorMsg += ': ' + xhr.responseJSON.error;
                        } else if (xhr.responseJSON?.message) {
                            errorMsg += ': ' + xhr.responseJSON.message;
                        }
                        if (typeof toastr !== 'undefined') {
                            toastr.error(errorMsg);
                        } else {
                            alert(errorMsg);
                        }
                    }
                });
            });

            // Handle range input resizing for campaign
            $(document).on('input', '#csv-row-range-from-campaign, #csv-row-range-to-campaign', function() {
                resizeRangeInputsCampaign();
            });





            // Preview and Send Functions
            function populateSendSettingsDropdowns() {
                const $sendSelect = $(
                    '#send-campaign-select, #campaign-select'); // Add #campaign-select for Send tab
                const $scheduleSelect = $('#schedule-campaign-select');

                $sendSelect.empty().append('<option value="">-- Select Campaign --</option>');
                $scheduleSelect.empty().append('<option value="">-- Select Campaign --</option>');

                allCampaigns.forEach(campaign => {
                    const option = `<option value="${campaign.id}">${campaign.name}</option>`;
                    $sendSelect.append(option);
                    $scheduleSelect.append(option);
                });
            }











            // Campaign Progress Functions
            function updateCampaignProgress(data) {
                console.log('Updating campaign progress:', data);

                // Update progress stats
                $('#progress-total').text(data.total || 0);
                $('#progress-sent').text(data.sent || 0);
                $('#progress-failed').text(data.failed || 0);
                $('#progress-pending').text(data.pending || 0);
                $('#progress-sending').text(data.sending || 0);

                // Calculate and update progress bar
                const progress = data.total > 0 ? Math.round((data.sent / data.total) * 100) : 0;
                const $progressBar = $('#campaign-progress-bar');
                $progressBar
                    .css('width', progress + '%')
                    .attr('aria-valuenow', progress)
                    .text(progress + '%');

                // Update progress bar color based on status
                if (data.failed > 0) {
                    $progressBar.removeClass('bg-success bg-warning').addClass('bg-danger');
                } else if (data.sending > 0 || data.pending > 0) {
                    $progressBar.removeClass('bg-success bg-danger').addClass('bg-warning');
                } else if (progress === 100) {
                    $progressBar.removeClass('bg-warning bg-danger').addClass('bg-success');
                }

                // Update failed emails table
                const $failedTable = $('#failed-emails-table');
                $failedTable.empty();
                if (data.failed_details && data.failed_details.length > 0) {
                    data.failed_details.forEach(detail => {
                        $failedTable.append(`
                    <tr>
                        <td>${detail.to_email || 'N/A'}</td>
                        <td>${detail.error_message || 'N/A'}</td>
                        <td>${detail.retry_attempts || 0}</td>
                    </tr>
                `);
                    });
                } else {
                    $failedTable.append('<tr><td colspan="3">No failed emails</td></tr>');
                }

                // Show/hide progress section based on activity
                const $progressSection = $('.mt-4:has(#campaign-progress-bar)');
                if (data.total > 0 || currentCampaignId) {
                    $progressSection.show();
                } else {
                    $progressSection.hide();
                }
                
                // Debug logging
                console.log('Progress section visibility:', {
                    total: data.total,
                    currentCampaignId: currentCampaignId,
                    sectionVisible: data.total > 0 || currentCampaignId
                });
            }

            function fetchCampaignProgress(campaignId) {
                $.ajax({
                    url: `/api/campaigns/${campaignId}/progress`,
                    method: 'GET',
                    success: function(data) {
                        console.log('Fetched campaign progress:', data);
                        updateCampaignProgress(data);
                    },
                    error: function(xhr) {
                        console.error('Error fetching campaign progress:', xhr.responseText);
                    }
                });
            }

            let currentCampaignId = null;
            let pollingInterval = null;

            function startProgressPolling(campaignId) {
                console.log('Starting progress polling for campaign:', campaignId);

                if (pollingInterval) {
                    clearInterval(pollingInterval);
                }
                currentCampaignId = campaignId;

                // Initial progress fetch
                fetchCampaignProgress(campaignId);

                pollingInterval = setInterval(() => {
                    console.log('Polling progress for campaign:', campaignId);
                    $.get(`/api/campaigns/${campaignId}/progress`)
                        .done(data => {
                            console.log('Progress data received:', data);
                            updateCampaignProgress(data);

                            // Stop polling if campaign is complete
                            if (data.total > 0 && data.pending === 0 && data.sending === 0) {
                                console.log('Campaign complete, stopping polling');
                                clearInterval(pollingInterval);
                                pollingInterval = null;
                                currentCampaignId = null;
                            }
                        })
                        .fail(error => {
                            console.error('Error fetching progress:', error);
                        });
                }, 3000); // Poll every 3 seconds for more responsive updates
            }

            function stopProgressPolling() {
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                    currentCampaignId = null;
                }
                updateCampaignProgress({
                    total: 0,
                    sent: 0,
                    failed: 0,
                    pending: 0,
                    sending: 0,
                    failed_details: []
                });
            }

            $('#campaign-select, #schedule-campaign-select').on('change', function() {
                const campaignId = $(this).val();
                if (campaignId) {
                    console.log('Campaign selected for progress:', campaignId);

                    // Show progress section immediately when campaign is selected
                    const $progressSection = $('.mt-4:has(#campaign-progress-bar)');
                    $progressSection.show();

                    // Reset progress display first
                    updateCampaignProgress({
                        total: 0,
                        sent: 0,
                        failed: 0,
                        pending: 0,
                        sending: 0,
                        failed_details: []
                    });

                    // Start polling for the selected campaign
                    startProgressPolling(campaignId);

                    // Populate subject field with template subject
                    const campaign = allCampaigns.find(c => c.id == campaignId);
                    console.log('Found campaign:', campaign);

                    if (campaign) {
                        const template = allTemplates.find(t => t.id == campaign.template_id);
                        console.log('Found template for send:', template);
                        console.log('Template subject for send:', template?.subject);

                        if (template && template.subject) {
                            console.log('Setting send subject to:', template.subject);
                            $('#subject').val(template.subject);
                        } else {
                            console.log('No subject found, clearing field');
                            $('#subject').val('');
                        }

                        // Show total subscribers for selected campaign audience
                        try {
                            const audience = allAudiences.find(a => a.id == campaign.audience_id) || { subscribers: [] };
                            const totalSubscribers = (audience.subscribers || []).filter(s => s.status === 'subscribed').length;
                            $('#total-subscribers-count').text(totalSubscribers);
                            $('#assignment-total-subscribers').show();
                            // Recompute unassigned warning after campaign change
                            updateAssignmentWarning(totalSubscribers);
                        } catch (e) {
                            console.warn('Failed to compute total subscribers for campaign:', e);
                            $('#assignment-total-subscribers').hide();
                        }
                    }
                } else {
                    stopProgressPolling();
                    $('#subject').val('');
                    $('#assignment-total-subscribers').hide();
                    $('#assignment-warning').hide();
                }
            });

            // Preview Campaign Button
            $('#preview-campaign-btn').on('click', function() {
                const campaignId = $('#campaign-select').val();
                if (!campaignId) {
                    alert('Please select a campaign first.');
                    return;
                }
                showCampaignPreviewModal(campaignId);
            });

            function showCampaignPreviewModal(campaignId) {
                $.get(`/api/campaigns/${campaignId}`)
                    .done(data => {
                        const campaign = data;
                        console.log('Campaign data for preview modal:', campaign);

                        const audience = allAudiences.find(a => a.id == campaign.audience_id) || {
                            name: 'Unknown',
                            subscribers: []
                        };
                        const template = allTemplates.find(t => t.id == campaign.template_id) || {
                            title: 'Unknown',
                            content: '',
                            subject: ''
                        };

                        console.log('Found template for modal:', template);
                        console.log('Template subject for modal:', template.subject);

                        // Populate modal with campaign data
                        $('#modal-campaign-name').text(campaign.name);
                        $('#modal-campaign-status').text(campaign.status || 'Draft');
                        $('#modal-audience-name').text(audience.name);
                        $('#modal-subscriber-count').text(audience.subscribers?.length || 0);
                        $('#modal-template-title').text(template.title);
                        $('#modal-subject').text(template.subject || 'No subject available');
                        $('#modal-email-preview').html(template.content || '<p>No content available</p>');

                        // Store subscribers data for later initialization
                        window.modalSubscribersData = audience.subscribers || [];

                        // Show the modal
                        $('#campaignPreviewModal').modal('show');
                    })
                    .fail(error => {
                        console.error('Error fetching campaign for preview:', error);
                        alert('Failed to load campaign preview.');
                    });
            }

            // Initialize subscribers table when subscribers tab is shown
            $('#campaign-subscribers-tab').on('shown.bs.tab', function() {
                if (window.modalSubscribersData) {
                    // Add a delay to ensure the tab content is fully rendered and visible
                    setTimeout(() => {
                        const container = $('#modal-subscribers-table-container');
                        console.log('Tab shown, container visible:', container.is(':visible'));
                        console.log('Container dimensions:', container.width(), 'x', container
                            .height());

                        if (container.is(':visible') && container.width() > 0) {
                            initializeSubscribersTableForModal(window.modalSubscribersData);
                        } else {
                            // If container is not ready, try again after a longer delay
                            setTimeout(() => {
                                initializeSubscribersTableForModal(window
                                    .modalSubscribersData);
                            }, 300);
                        }
                    }, 150);
                }
            });

            function initializeSubscribersTableForModal(subscribers) {
                // Clear existing table
                $('#modal-subscribers-table-container').empty();

                console.log('Initializing modal subscribers table with data:', subscribers);
                console.log('Container exists:', $('#modal-subscribers-table-container').length);

                const subscriberColumns = [{
                        data: 'sno',
                        title: 'S.No',
                        type: 'sno',
                        className: 'text-center',
                        width: '60px'
                    },
                    {
                        data: 'first_name',
                        title: 'First Name'
                    },
                    {
                        data: 'last_name',
                        title: 'Last Name'
                    },
                    {
                        data: 'email',
                        title: 'Email'
                    },
                    {
                        data: 'status',
                        title: 'Status',
                        type: 'status',
                        className: 'text-center'
                    }
                ];

                try {
                    console.log('Creating CustomDataTableUI for modal subscribers...');
                    const modalSubscribersTable = new CustomDataTableUI('#modal-subscribers-table-container', {
                        columns: subscriberColumns,
                        data: subscribers,
                        showSearch: true,
                        showPagination: true,
                        showLengthControl: true,
                        showCheckboxes: false,
                        pageSize: 10,
                        pageSizes: [10, 25, 50, 100]
                    });

                    console.log('Modal subscribers table created successfully');
                    console.log('Table instance:', modalSubscribersTable);

                    // Force update to ensure pagination is rendered
                    setTimeout(() => {
                        if (modalSubscribersTable && modalSubscribersTable.updateTable) {
                            console.log('Forcing table update...');
                            modalSubscribersTable.updateTable();
                        }
                    }, 200);

                } catch (error) {
                    console.error('Error initializing modal subscribers table:', error);
                }
            }

            // Initialize Select2 for both dropdowns
            $('#fromEmailSelect, #schedule-from-email').select2({
                placeholder: "Select regions",
                allowClear: true,
                width: '100%',
                theme: "classic"
            });

            // Handle region selection for Send Immediately
            $('#fromEmailSelect').on('select2:select', function(e) {
                const selectedRegion = e.params.data.id;
                const emailsData = $(e.params.data.element).data('emails');
                if (typeof emailsData === 'undefined' || emailsData === null || emailsData === '') {
                    // Skip if no emails data (e.g., region label or Select All)
                    return;
                }
                const emailAccounts = emailsData.split(',');
                const currentValues = $('#fromEmailSelect').val() || [];
                const newValues = [...new Set([...currentValues, ...emailAccounts])];
                $('#fromEmailSelect').val(newValues).trigger('change');
            });

            // Handle region selection for Schedule Campaign
            $('#schedule-from-email').on('select2:select', function(e) {
                const selectedRegion = e.params.data.id;
                const emailsData = $(e.params.data.element).data('emails');
                if (typeof emailsData === 'undefined' || emailsData === null || emailsData === '') {
                    // Skip if no emails data (e.g., region label or Select All)
                    return;
                }
                const emailAccounts = emailsData.split(',');
                const currentValues = $('#schedule-from-email').val() || [];
                const newValues = [...new Set([...currentValues, ...emailAccounts])];
                $('#schedule-from-email').val(newValues).trigger('change');
            });

            // Clear all selected emails for Send Immediately
            $('#clear-from-email').on('click', function() {
                $('#fromEmailSelect').val(null).trigger('change');
            });

            // Clear all selected emails for Schedule Campaign
            $('#clear-schedule-from-email').on('click', function() {
                $('#schedule-from-email').val(null).trigger('change');
            });

            // Send Immediately Form Submission
            $('#send-immediately-form').on('submit', function(e) {
                e.preventDefault();
                const $form = $(this);
                if (!$form[0].checkValidity()) {
                    $form.addClass('was-validated');
                    $('#send-immediately-message').html(
                        '<div class="alert alert-danger">Please fill all required fields with valid values.</div>'
                    );
                    return;
                }
                $form.addClass('was-validated');

                console.log('Send immediately form submitted');
                const campaignId = $('#send-campaign-select, #campaign-select').val();
                const fromEmails = $('#fromEmailSelect').val() || [];
                const subject = ($('#send-subject, #subject').val() || '').trim();
                const timeGap = parseInt($('#time-gap').val()) || 1;
                const assignmentMode = $('#assignment-mode').val() || 'batch_size';
                let batchSize = 0;
                let manualAssignments = {};

                // Handle assignment mode
                if (assignmentMode === 'batch_size') {
                    batchSize = parseInt($('#batch-size').val()) || 2;
                    if (batchSize < 1) {
                        $('#send-immediately-message').html(
                            '<div class="alert alert-danger">Batch size must be at least 1.</div>'
                        );
                        return;
                    }
                } else {
                    // Manual assignment mode
                    const manualAssignmentsData = $('#manual-assignments-data').val();
                    if (manualAssignmentsData) {
                        try {
                            manualAssignments = JSON.parse(manualAssignmentsData);
                        } catch (e) {
                            console.error('Failed to parse manual assignments:', e);
                        }
                    }
                    
                    // Check if any assignments were made
                    if (Object.keys(manualAssignments).length === 0) {
                        $('#send-immediately-message').html(
                            '<div class="alert alert-danger">Please configure manual assignments for at least one email account.</div>'
                        );
                        return;
                    }
                }

                // Debug: Log all field values before validation
                console.log({
                    campaignId,
                    subject,
                    timeGap,
                    assignmentMode,
                    batchSize,
                    manualAssignments,
                    fromEmails
                });

                if (!campaignId || !subject || timeGap < 0 || fromEmails.length === 0) {
                    console.log('Validation failed');
                    $('#send-immediately-message').html(
                        '<div class="alert alert-danger">Please select at least one region and fill all required fields with valid values.</div>'
                    );
                    return;
                }

                const $btn = $form.find('button[type="submit"]');
                $btn.prop('disabled', true).html(
                    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...'
                );

                $.ajax({
                        url: '/api/send-email',
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        contentType: 'application/json',
                        data: JSON.stringify({
                            campaign_id: campaignId,
                            from_emails: fromEmails,
                            subject: subject,
                            time_gap: timeGap,
                            assignment_mode: assignmentMode,
                            batch_size: batchSize,
                            manual_assignments: manualAssignments
                        })
                    })
                    .done(response => {
                        console.log('Campaign sending started:', response);
                        let message = `
                    <div class="alert alert-success">
                        Campaign started! ID: ${response.campaign_id}<br>
                        Total Subscribers: ${response.total_subscribers}<br>
                        Assigned Subscribers: ${response.assigned_subscribers}<br>
                        Active Accounts: ${response.active_accounts.join(', ') || 'None'}<br>
                        Assignment Mode: ${response.assignment_mode || 'batch_size'}<br>
                        ${response.assignment_mode === 'batch_size' ? `Batch Size: ${response.batch_size}` : 'Manual Assignments: Configured'}
                    </div>
                `;
                        if (response.warning) {
                            message += `
                        <div class="alert alert-warning">
                            <strong>Warning:</strong> ${response.warning}<br>
                            Unassigned Subscribers: ${response.unassigned_subscribers}
                        </div>
                    `;
                        }
                        $('#send-immediately-message').html(message);
                        startProgressPolling(response.campaign_id);
                        $form.removeClass('was-validated');
                        $('#send-campaign-select').val('');
                        $('#fromEmailSelect').val(null).trigger('change');
                        $('#send-subject').val('');
                        $('#time-gap').val('1');
                        $('#assignment-mode').val('batch_size').trigger('change');
                        $('#batch-size').val('2');
                        $('#manual-assignments-data').val('');
                        $('#assignment-display-container').empty();
                    })
                    .fail(error => {
                        console.error('Error starting campaign:', error);
                        let errorMessage = error.responseJSON?.error || 'Unknown error';
                        let details = '';
                        if (error.responseJSON?.details) {
                            details = Object.entries(error.responseJSON.details)
                                .map(([key, messages]) => `${key}: ${messages.join(', ')}`)
                                .join('<br>');
                        }
                        $('#send-immediately-message').html(
                            `<div class="alert alert-danger">
                        Failed to start campaign: ${errorMessage}<br>
                        Details: ${details}
                    </div>`
                        );
                    })
                    .always(() => {
                        $btn.prop('disabled', false).text('Send Now');
                    });
            });

            // Live warning updates
            $(document).on('change input', '#assignment-mode, #batch-size, #fromEmailSelect', function() {
                const campaignId = $('#campaign-select').val();
                const campaign = allCampaigns.find(c => c.id == campaignId) || null;
                if (!campaign) return;
                const audience = allAudiences.find(a => a.id == campaign.audience_id) || { subscribers: [] };
                const total = (audience.subscribers || []).filter(s => s.status === 'subscribed').length;
                updateAssignmentWarning(total);
            });

            // When the assignment modal saves values, re-check warning
            $(document).on('click', '#modal-save-assignment', function() {
                const campaignId = $('#campaign-select').val();
                const campaign = allCampaigns.find(c => c.id == campaignId) || null;
                if (!campaign) return;
                const audience = allAudiences.find(a => a.id == campaign.audience_id) || { subscribers: [] };
                const total = (audience.subscribers || []).filter(s => s.status === 'subscribed').length;
                updateAssignmentWarning(total);
            });

            function updateAssignmentWarning(totalSubscribers) {
                try {
                    const mode = $('#assignment-mode').val() || 'batch_size';
                    const fromEmails = $('#fromEmailSelect').val() || [];
                    let assigned = 0;
                    if (mode === 'batch_size') {
                        const batchSize = parseInt($('#batch-size').val()) || 0;
                        assigned = batchSize * fromEmails.length;
                    } else {
                        const manualAssignmentsData = $('#manual-assignments-data').val();
                        let manual = {};
                        if (manualAssignmentsData) {
                            try { manual = JSON.parse(manualAssignmentsData) || {}; } catch (e) { manual = {}; }
                        }
                        assigned = Object.values(manual).reduce((a, b) => a + (parseInt(b) || 0), 0);
                    }
                    const unassigned = Math.max(0, totalSubscribers - assigned);
                    if (unassigned > 0) {
                        $('#unassigned-count').text(unassigned);
                        $('#assignment-warning').show();
                    } else {
                        $('#assignment-warning').hide();
                    }
                } catch (e) {
                    console.warn('updateAssignmentWarning failed:', e);
                    $('#assignment-warning').hide();
                }
            }

            // Initialize Select2 for timezone dropdown
            $('#schedule-timezone').select2({
                placeholder: "Select a timezone",
                allowClear: true,
                width: '100%'
            });

            $(document).ready(function() {
                $('#schedule-timezone').select2({
                    dropdownParent: $('#scheduleModal'), // Important when inside Bootstrap modal
                    width: '100%',
                    placeholder: 'Select Timezone'
                });

                $('#schedule-timezone').on('change', function() {
                    const selectedTimezone = $(this).val();
                    console.log('Selected timezone:', selectedTimezone);
                    if (selectedTimezone) {
                        let currentTimeInTimezone;
                        if (typeof moment.tz === 'function') {
                            currentTimeInTimezone = moment().tz(selectedTimezone).format('YYYY-MM-DDTHH:mm');
                        } else {
                            console.warn('moment-timezone is not loaded; falling back to local time.');
                            currentTimeInTimezone = moment().format('YYYY-MM-DDTHH:mm');
                        }
                        $('#schedule-time').val(currentTimeInTimezone);
                    } else {
                        $('#schedule-time').val('');
                    }
                });
            });

            // Handle Schedule Campaign Form Submission
            $('#schedule-campaign-form').on('submit', function(e) {
                // Sync from_emails from main select into hidden fields
                $(this).find('input[name="from_emails[]"]').remove();
                const selectedEmails = $('#fromEmailSelect').val() || [];
                for (const email of selectedEmails) {
                    $('<input>').attr({
                        type: 'hidden',
                        name: 'from_emails[]',
                        value: email
                    }).appendTo(this);
                }
                // Sync time_gap and batch_size from main form into hidden fields
                $(this).find('input[name="time_gap"], input[name="batch_size"]').remove();
                $('<input>').attr({
                    type: 'hidden',
                    name: 'time_gap',
                    value: $('#time-gap').val() || 1
                }).appendTo(this);
                $('<input>').attr({
                    type: 'hidden',
                    name: 'batch_size',
                    value: $('#batch-size').val() || 2
                }).appendTo(this);
                e.preventDefault();
                const $form = $(this);
                const $message = $('#schedule-campaign-message');
                $message.empty();

                // Validate form
                if (!$form[0].checkValidity()) {
                    $form[0].reportValidity();
                    $message.html(
                        '<div class="alert alert-danger">Please fill all required fields with valid values.</div>'
                    );
                    return;
                }

                const formData = new FormData($form[0]);
                const data = {};
                formData.forEach((value, key) => {
                    if (key === 'from_emails[]') {
                        data['from_emails'] = data['from_emails'] || [];
                        data['from_emails'].push(value);
                    } else {
                        data[key] = value;
                    }
                });

                // Robust campaign id and subject selection
                data.campaign_id = $('#schedule-campaign-select, #campaign-select').val();
                data.subject = ($('#schedule-subject, #subject').val() || '').trim();

                // Debug: Log key values before validation
                console.log({
                    campaign_id: data.campaign_id,
                    subject: data.subject,
                    scheduled_at: data.scheduled_at,
                    timezone: data.timezone,
                    from_emails: data.from_emails
                });

                if (!data.from_emails || data.from_emails.length === 0) {
                    $message.html(
                        '<div class="alert alert-danger">Please select at least one region.</div>'
                    );
                    return;
                }

                // Validate schedule time (not in the past)
                const scheduleTime = moment(data.scheduled_at);
                let currentTime;
                if (typeof moment.tz === 'function') {
                    currentTime = moment().tz(data.timezone || 'UTC');
                } else {
                    console.warn('moment-timezone is not loaded; falling back to local time.');
                    currentTime = moment();
                }
                if (scheduleTime.isBefore(currentTime)) {
                    $message.html(
                        '<div class="alert alert-danger">Scheduled time cannot be in the past.</div>'
                    );
                    return;
                }

                $.ajax({
                    url: '/api/schedule-email',
                    method: 'POST',
                    data: JSON.stringify(data),
                    contentType: 'application/json',
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    beforeSend: function() {
                        $form.find('button[type="submit"]').prop('disabled', true).append(
                            ' <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
                        );
                    },
                    success: function(response) {
                        $message.html('<div class="alert alert-success">' + response
                            .message +
                            ' Scheduled at: ' + response.scheduled_at + '</div>');
                        $form[0].reset();
                        $('#schedule-from-email').val(null).trigger('change');
                        $('#schedule-timezone').val(null).trigger('change');

                        // Start progress polling for scheduled campaign
                        if (response.campaign_id) {
                            console.log('Starting progress polling for scheduled campaign:',
                                response.campaign_id);
                            startProgressPolling(response.campaign_id);
                        }
                    },
                    error: function(xhr) {
                        const error = xhr.responseJSON?.error || 'An error occurred';
                        const details = xhr.responseJSON?.details || '';
                        $message.html('<div class="alert alert-danger">' + error + ': ' +
                            details + '</div>');
                    },
                    complete: function() {
                        $form.find('button[type="submit"]').prop('disabled', false).find(
                            '.spinner-border').remove();
                    }
                });
            });

            // Data will be loaded in document.ready with Promise.all



            // Ensure Audience tab is active on page load
            $(document).ready(function() {
                // Wait for all data to be loaded before allowing tab switching
                Promise.all([
                    fetchAudiences(),
                    fetchTemplates(),
                    fetchCampaigns()
                ]).then(() => {
                    console.log('All data loaded successfully');
                    
                    // Activate the audience tab
                    $('#audience-tab').tab('show');

                    // Update the action button to match audience tab
                    const audienceTab = $('#audience-tab');
                    const actionText = audienceTab.attr('data-text');
                    const actionClass = audienceTab.attr('data-class');
                    $('#email-action-btn').text(actionText).removeClass().addClass('btn ' + actionClass);
                }).catch(error => {
                    console.error('Error loading initial data:', error);
                    // Still activate the audience tab even if data loading fails
                    $('#audience-tab').tab('show');
                });
            });

            // Initialize tables when tabs are shown
            $('#audience-tab').on('shown.bs.tab', function() {
                if (!audienceTable) {
                    initializeAudienceTable();
                }
            });

            $('#templates-tab').on('shown.bs.tab', function() {
                if (!templatesTable) {
                    // Ensure templates data is loaded before initializing table
                    if (allTemplates.length === 0) {
                        fetchTemplates().then(() => {
                            initializeTemplatesTable();
                        });
                    } else {
                        initializeTemplatesTable();
                    }
                } else if (allTemplates.length === 0) {
                    // Table exists but no data, refresh the data
                    fetchTemplates().then(() => {
                        if (templatesTable && templatesTable.setData) {
                            templatesTable.setData(allTemplates);
                        }
                    });
                }
            });

            $('#campaigns-tab').on('shown.bs.tab', function() {
                if (!campaignsTable) {
                    // Ensure campaigns data is loaded before initializing table
                    if (allCampaigns.length === 0) {
                        fetchCampaigns().then(() => {
                            initializeCampaignsTable();
                        });
                    } else {
                        initializeCampaignsTable();
                    }
                } else if (allCampaigns.length === 0) {
                    // Table exists but no data, refresh the data
                    fetchCampaigns().then(() => {
                        if (campaignsTable && campaignsTable.setData) {
                            campaignsTable.setData(allCampaigns);
                        }
                    });
                }
            });

            $('#preview-send-tab').on('shown.bs.tab', function() {
                // Ensure all data is loaded for preview/send functionality
                if (allTemplates.length === 0) {
                    fetchTemplates();
                }
                if (allCampaigns.length === 0) {
                    fetchCampaigns();
                }
                if (allAudiences.length === 0) {
                    fetchAudiences();
                }
            });

            $('#addCampaignModal').on('show.bs.modal', function() {
                // Only populate dropdowns if not editing (i.e., no campaign ID set)
                if (!$('#campaign-id').val()) {
                    populateCampaignDropdowns();
                }
            });

            $('#addAudienceModal').on('hidden.bs.modal', resetAudienceModal);



            $(document).on('click', '.dropdown-toggle', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $('.dropdown-menu').not($(this).next('.dropdown-menu')).removeClass('show');
                $(this).next('.dropdown-menu').toggleClass('show');
            });

            $(document).on('click', function(e) {
                if (!$(e.target).closest('.dropdown').length) {
                    $('.dropdown-menu').removeClass('show');
                }
            });
        });
        $(document).ready(function() {
            // Function to refresh campaign progress dropdown
            function refreshCampaignProgressDropdown() {
                axios.get('/api/campaign-progress/recent')
                    .then(response => {
                        const campaigns = response.data.campaigns || [];
                        const dropdown = $('.dropdown-campaigns');
                        dropdown.empty();

                        if (campaigns.length === 0) {
                            dropdown.append('<li class="dropdown-item text-muted">No recent campaigns</li>');
                            return;
                        }

                        campaigns.forEach(campaign => {
                            const percentage = campaign.total_emails > 0 ?
                                Math.round((campaign.sent_emails / campaign.total_emails) * 100) :
                                0;
                            const statusClass = {
                                'Completed': 'text-success',
                                'In Progress': 'text-warning',
                                'Failed': 'text-danger'
                            } [campaign.status] || 'text-muted';

                            const item = `
                        <li class="dropdown-item campaign-item" data-progress-id="${campaign.progress_id}">
                            <div class="d-flex align-items-center">
                                <div class="flex-grow-1">
                                    <span class="campaign-name">
                                        ${campaign.campaign_name} (${percentage}%)
                                    </span>
                                    <small class="text-muted d-block">
                                        ${moment(campaign.updated_at).fromNow()}
                                    </small>
                                </div>
                                <div class="ms-3">
                                    <span class="${statusClass}">${campaign.status}</span>
                                </div>
                            </div>
                        </li>`;
                            dropdown.append(item);
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching campaign progress:', error);
                        $('.dropdown-campaigns').html(
                            '<li class="dropdown-item text-muted">Error loading campaigns</li>');
                    });
            }

            // Initial load
            refreshCampaignProgressDropdown();

            // Refresh every 30 seconds
            setInterval(refreshCampaignProgressDropdown, 30000);

            // Optional: Click handler for campaign items
            $(document).on('click', '.campaign-item', function() {
                const progressId = $(this).data('progress-id');
                // Navigate to campaign details or show modal
                console.log('Clicked campaign with progress ID:', progressId);
            });
        });

        // CSV Mapping Modal for Campaign
        function showCsvMappingModalCampaign(token, header, sample, rowCount) {
            // Build mapping UI (auto-map as before)
            const fields = [{
                    key: 'first_name',
                    label: 'First Name',
                    required: false
                },
                {
                    key: 'last_name',
                    label: 'Last Name',
                    required: false
                },
                {
                    key: 'email',
                    label: 'Email',
                    required: true
                }
            ];

            function normalize(str) {
                return (str || '').toLowerCase().replace(/[_\s]/g, '');
            }
            let mappingHtml = '<div class="row mb-3">';
            header.forEach((col, idx) => {
                mappingHtml +=
                    `<div class="col"><label>Column ${idx+1}: <strong>${col}</strong></label><select class="form-select csv-map-select-campaign" data-col="${idx}">`;
                mappingHtml += '<option value="">Ignore</option>';
                fields.forEach(f => {
                    let selected = '';
                    if (normalize(col).includes(normalize(f.key)) || normalize(col).includes(
                            normalize(f.label))) {
                        selected = 'selected';
                    }
                    mappingHtml +=
                        `<option value="${f.key}" ${selected}>${f.label}${f.required ? ' *' : ''}</option>`;
                });
                mappingHtml += '</select></div>';
            });
            mappingHtml += '</div>';

            // Range selection and select all
            mappingHtml += `<div class="csv-range-container mb-3">
                <div class="row align-items-center">
                    <div class="col-md-4">
                        <span class="text-muted"><strong>Total rows:</strong> <span id="csv-total-rows-campaign" class="badge bg-primary">${rowCount.toLocaleString()}</span></span>
                    </div>
                    <div class="col-md-6">
                        <label class="mb-0 d-flex align-items-center gap-2">
                            <span>Import rows from</span>
                            <input type="number" min="1" max="${rowCount}" value="1" id="csv-row-range-from-campaign" 
                                   style="min-width:80px;width:auto;max-width:150px;" 
                                   class="form-control form-control-sm" 
                                   placeholder="1" />
                            <span>to</span>
                            <input type="number" min="1" max="${rowCount}" value="${rowCount}" id="csv-row-range-to-campaign" 
                                   style="min-width:80px;width:auto;max-width:150px;" 
                                   class="form-control form-control-sm" 
                                   placeholder="${rowCount}" />
                        </label>
                    </div>
                    <div class="col-md-2">
                        <button type="button" class="btn btn-outline-primary btn-sm w-100" id="csv-select-all-btn-campaign">
                            <i class="bi bi-check-all"></i> Select All
                        </button>
                    </div>
                </div>
            </div>`;

            // Sample preview
            mappingHtml += '<div id="csv-preview-table-container-campaign" style="max-height:200px;overflow-y:auto;">';
            mappingHtml += '<table class="table table-bordered table-sm"><thead><tr>';
            mappingHtml += '<th>S.No</th>';
            header.forEach(h => {
                mappingHtml += `<th>${h}</th>`;
            });
            mappingHtml += '</tr></thead><tbody>';
            sample.forEach((row, idx) => {
                mappingHtml += `<tr><td>${idx+1}</td>`;
                header.forEach((_, colIdx) => {
                    mappingHtml += `<td>${row[colIdx] || ''}</td>`;
                });
                mappingHtml += '</tr>';
            });
            mappingHtml += '</tbody></table></div>';

            mappingHtml +=
                `<div class="d-flex align-items-center gap-2 mt-3">
                <button type="button" class="btn btn-primary" id="import-mapped-csv-btn-campaign">Import</button>
                <span id="csv-import-progress-campaign" style="display:none;" class="text-muted">
                    <span class="spinner-border spinner-border-sm me-1"></span>
                    <span id="csv-import-progress-text-campaign">Starting...</span>
                </span>
            </div>
            <div id="csv-import-results-campaign"></div>`;

            $('#csv-mapping-section-campaign').html(mappingHtml);
            $('#csvMappingModalCampaign').modal('show');

            // Select All button logic
            $('#csv-select-all-btn-campaign').off('click').on('click', function() {
                $('#csv-row-range-from-campaign').val(1);
                $('#csv-row-range-to-campaign').val(rowCount);
            });

            // Resize range inputs
            resizeRangeInputsCampaign();
        }

        // Resize range inputs for campaign
        function resizeRangeInputsCampaign() {
            const fromInput = document.getElementById('csv-row-range-from-campaign');
            const toInput = document.getElementById('csv-row-range-to-campaign');

            if (fromInput) {
                fromInput.style.width = Math.max(80, fromInput.value.length * 8 + 20) + 'px';
            }
            if (toInput) {
                toInput.style.width = Math.max(80, toInput.value.length * 8 + 20) + 'px';
            }
        }

        // Download CSV function for campaign
        function downloadCsvCampaign(url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = url.split('/').pop() || 'download.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // Enhanced Template Preview Function
        function showTemplatePreview(templateId, templateTitle) {
            // Show loading state
            $('#previewModalLabel').text(`Loading Preview...`);
            const iframe = $('#preview-iframe')[0];
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
                    <div style="text-align: center;">
                        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 0 auto 20px;"></div>
                        <p>Loading template preview...</p>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `);
            doc.close();
            $('#previewModal').modal('show');

            // Fetch template and clean content
            $.get(`/api/templates/${templateId}/preview`)
                .done(data => {
                    // Clean the content to remove extra spaces and replace placeholders
                    const cleanContent = cleanTemplateContent(data.content);
                    
                    // Update iframe with clean content
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    doc.open();
                    doc.write(cleanContent);
                    doc.close();
                    
                    $('#previewModalLabel').text(`Preview: ${templateTitle}`);
                })
                .fail(error => {
                    console.error('Error previewing template:', error);
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    doc.open();
                    doc.write(`
                        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; color: #dc3545;">
                            <div style="text-align: center; max-width: 400px;">
                                <h3>❌ Preview Error</h3>
                                <p>Failed to load template preview. Please try again.</p>
                                <small style="color: #6c757d;">Error: ${error.responseJSON?.message || 'Unknown error'}</small>
                            </div>
                        </div>
                    `);
                    doc.close();
                    $('#previewModalLabel').text(`Preview Error - ${templateTitle}`);
                });
        }

        // Clean Template Content - Remove Extra Spaces
        function cleanTemplateContent(content) {
            let cleanContent = content || '';
            
            // Replace common placeholders with sample data for preview
            cleanContent = cleanContent.replace(/\{\{[\s]*first_name[\s]*\}\}/gi, 'John');
            cleanContent = cleanContent.replace(/\{\{[\s]*last_name[\s]*\}\}/gi, 'Doe');
            cleanContent = cleanContent.replace(/\{\{[\s]*email[\s]*\}\}/gi, 'john.doe@example.com');
            cleanContent = cleanContent.replace(/\{\{[\s]*company[\s]*\}\}/gi, 'Example Company');
            cleanContent = cleanContent.replace(/\{\{[\s]*name[\s]*\}\}/gi, 'John Doe');
            cleanContent = cleanContent.replace(/\{[\s]*first_name[\s]*\}/gi, 'John');
            cleanContent = cleanContent.replace(/\{[\s]*last_name[\s]*\}/gi, 'Doe');
            cleanContent = cleanContent.replace(/\{[\s]*email[\s]*\}/gi, 'john.doe@example.com');
            cleanContent = cleanContent.replace(/\{[\s]*company[\s]*\}/gi, 'Example Company');
            cleanContent = cleanContent.replace(/\{[\s]*name[\s]*\}/gi, 'John Doe');

            // Remove extra whitespace and clean up
            cleanContent = cleanContent
                .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
                .replace(/>\s+</g, '><')        // Remove spaces between HTML tags
                .replace(/\n\s*\n/g, '\n')      // Remove empty lines with only spaces
                .trim();                        // Remove leading/trailing whitespace

            return cleanContent;
        }

        // Toastr configuration
        if (typeof toastr !== 'undefined') {
            toastr.options = {
                "closeButton": true,
                "debug": false,
                "newestOnTop": false,
                "progressBar": true,
                "positionClass": "toast-top-right",
                "preventDuplicates": false,
                "onclick": null,
                "showDuration": "300",
                "hideDuration": "1000",
                "timeOut": "5000",
                "extendedTimeOut": "1000",
                "showEasing": "swing",
                "hideEasing": "linear",
                "showMethod": "fadeIn",
                "hideMethod": "fadeOut"
            };
        }

        // Initialize nav-pills functionality
        $(document).ready(function() {
            // Ensure the data-skl-action functionality is available
            if (typeof window.general !== 'undefined' && window.general.actions) {
                window.general.actions();
            }

            // Set initial action button state
            const activeTab = $('#emailSchedulerTabs .nav-link.active');
            if (activeTab.length) {
                const actionText = activeTab.attr('data-text');
                const actionClass = activeTab.attr('data-class');
                $('#email-action-btn').text(actionText).removeClass().addClass('btn ' + actionClass);
            }

            // Handle tab changes to update action button
            $('#emailSchedulerTabs .nav-link').on('shown.bs.tab', function(e) {
                const actionText = $(e.target).attr('data-text');
                const actionClass = $(e.target).attr('data-class');
                $('#email-action-btn').text(actionText).removeClass().addClass('btn ' + actionClass);
            });

            // Assignment Mode Functionality
            let emailAccountsData = [];

            // Fetch email accounts data
            function fetchEmailAccountsData() {
                $.ajax({
                    url: '/api/email-accounts',
                    method: 'GET',
                    success: function(response) {
                        emailAccountsData = response.data || [];
                    },
                    error: function(xhr, status, error) {
                        console.error('Failed to fetch email accounts:', error);
                        emailAccountsData = [];
                    }
                });
            }

            // Initialize email accounts data
            fetchEmailAccountsData();

            // Handle Assignment Mode toggle
            $(document).on('change', '#assignment-mode', function() {
                const mode = $(this).val();
                $('#assignment-display-section').toggle(mode !== '');
                updateAssignmentDisplay();
                
                // Clear modal data when mode changes
                $('#assignmentModal').removeData('assignment-mode');
                
                // Clear assignments when switching modes
                if (mode === 'batch_size') {
                    $('#manual-assignments-data').val('');
                } else if (mode === 'manual_assign') {
                    $('#batch-size').val('2'); // Reset to default
                }
            });

            // Configure Assignment button click handler
            $(document).on('click', '.configure-assignment', function() {
                const assignmentMode = $('#assignment-mode').val();
                const $fromEmailSelect = $('#fromEmailSelect');
                const fromEmails = ($fromEmailSelect.val() || []).filter(email => email !== '__select_all__');

                console.log('Opening modal with assignment mode:', assignmentMode);

                // Store current mode in modal
                $('#assignmentModal').data('assignment-mode', assignmentMode);

                // Populate modal content based on assignment mode
                const $modalBody = $('#assignmentModalBody');
                $modalBody.empty();

                if (assignmentMode === 'batch_size') {
                    console.log('Loading batch size mode in modal');
                    $modalBody.append(`
                        <div id="modal-batch-size-section">
                            <label for="modal-batch-size-input" class="form-label">Batch Size (emails per account)</label>
                            <input type="number" class="form-control" id="modal-batch-size-input" min="1" value="2">
                            <div id="modal-batch-size-warning" class="alert alert-warning mt-2" style="display: none;">
                                Warning: <span id="modal-batch-size-skipped">0</span> subscribers will be skipped due to batch size configuration.
                            </div>
                        </div>
                    `);
                    // Load current batch size
                    const batchSize = $('#batch-size').val() || '2';
                    $('#modal-batch-size-input').val(batchSize);
                    console.log('Set batch size in modal:', batchSize);
                } else {
                    console.log('Loading manual assign mode in modal');
                    // Manual assignment mode
                    const fromEmailsDisplay = fromEmails.length > 0 ? fromEmails.map(email => {
                        const account = emailAccountsData.find(acc => acc.email === email);
                        return account ? `${email} (${account.daily_send_limit})` : email;
                    }).join(', ') : 'None';
                    $modalBody.append(`
                        <div id="modal-manual-assign-section">
                            <p><strong>Selected From Emails:</strong> <span id="modal-from-emails-list">${fromEmailsDisplay}</span></p>
                            <div id="modal-manual-assignments"></div>
                            <p><strong>Total Assigned:</strong> <span id="modal-total-assigned">0</span></p>
                            <div id="modal-manual-assign-warning" class="alert alert-warning mt-2" style="display: none;">
                                Warning: <span id="modal-manual-assign-skipped">0</span> subscribers are unassigned.
                            </div>
                        </div>
                    `);
                    updateModalAssignments();
                }

                // Show modal
                $('#assignmentModal').modal('show');
                
                // Ensure modal content is properly initialized
                $('#assignmentModal').one('shown.bs.modal', function() {
                    if (assignmentMode === 'manual_assign') {
                        updateModalAssignments();
                    }
                });
            });

            // Update modal assignments for manual mode
            function updateModalAssignments() {
                const $fromEmailSelect = $('#fromEmailSelect');
                const fromEmails = ($fromEmailSelect.val() || []).filter(email => email !== '__select_all__');
                const $container = $('#modal-manual-assignments');
                
                console.log('Updating modal assignments for emails:', fromEmails);
                
                $container.empty();
                
                // Load existing manual assignments
                const manualAssignmentsData = $('#manual-assignments-data').val();
                let existingAssignments = {};
                if (manualAssignmentsData) {
                    try {
                        existingAssignments = JSON.parse(manualAssignmentsData);
                        console.log('Loaded existing assignments:', existingAssignments);
                    } catch (e) {
                        console.error('Failed to parse manual assignments:', e);
                    }
                }
                
                fromEmails.forEach(email => {
                    const account = emailAccountsData.find(acc => acc.email === email);
                    const dailyLimit = account ? account.daily_send_limit : 0;
                    const existingValue = existingAssignments[email] || 0;
                    console.log(`Setting up input for ${email} with value: ${existingValue}`);
                    $container.append(`
                        <div class="mb-3">
                            <label for="modal-assign-${email.replace(/[^a-zA-Z0-9]/g, '_')}" class="form-label">
                                ${email} ${dailyLimit ? `(Daily Limit: ${dailyLimit})` : ''}
                            </label>
                            <input type="number" class="form-control modal-manual-assign-input" 
                                   id="modal-assign-${email.replace(/[^a-zA-Z0-9]/g, '_')}" 
                                   data-email="${email}" min="0" value="${existingValue}">
                        </div>
                    `);
                });
            }

            // Update assignment display for main form
            function updateAssignmentDisplay() {
                const mode = $('#assignment-mode').val();
                const $fromEmailSelect = $('#fromEmailSelect');
                const fromEmails = ($fromEmailSelect.val() || []).filter(email => email !== '__select_all__');
                const $container = $('#assignment-display-container');
                
                $container.empty();
                
                if (mode === 'batch_size') {
                    const batchSize = $('#batch-size').val() || '2';
                    $container.append(`
                        <div class="alert alert-info">
                            <strong>Batch Size Mode:</strong> ${batchSize} emails per account<br>
                            <strong>Total Accounts:</strong> ${fromEmails.length}<br>
                            <strong>Total Assigned:</strong> ${batchSize * fromEmails.length} subscribers
                        </div>
                    `);
                } else if (mode === 'manual_assign') {
                    const manualAssignmentsData = $('#manual-assignments-data').val();
                    let assignments = {};
                    if (manualAssignmentsData) {
                        try {
                            assignments = JSON.parse(manualAssignmentsData);
                        } catch (e) {
                            console.error('Failed to parse manual assignments:', e);
                        }
                    }
                    
                    if (Object.keys(assignments).length > 0) {
                        let totalAssigned = 0;
                        let assignmentsHtml = '<div class="alert alert-info"><strong>Manual Assignment Mode:</strong><br>';
                        
                        Object.entries(assignments).forEach(([email, count]) => {
                            if (count > 0) {
                                assignmentsHtml += `<strong>${email}:</strong> ${count} subscribers<br>`;
                                totalAssigned += parseInt(count);
                            }
                        });
                        
                        assignmentsHtml += `<br><strong>Total Assigned:</strong> ${totalAssigned} subscribers</div>`;
                        $container.append(assignmentsHtml);
                    } else {
                        $container.append(`
                            <div class="alert alert-warning">
                                <strong>Manual Assignment Mode:</strong> No assignments configured yet. Click "Configure Assignment" to set up assignments.
                            </div>
                        `);
                    }
                }
            }

            // Handle manual assignment input changes
            $(document).on('input', '.modal-manual-assign-input', function() {
                updateModalWarnings();
            });

            // Update modal warnings
            function updateModalWarnings() {
                const mode = $('#assignmentModal').data('assignment-mode');
                const $fromEmailSelect = $('#fromEmailSelect');
                const fromEmails = ($fromEmailSelect.val() || []).filter(email => email !== '__select_all__');

                if (mode === 'batch_size') {
                    const batchSize = parseInt($('#modal-batch-size-input').val()) || 0;
                    const totalAssigned = batchSize * fromEmails.length;
                    $('#modal-batch-size-skipped').text(Math.max(0, totalAssigned));
                    $('#modal-batch-size-warning').toggle(totalAssigned > 0);
                } else {
                    let totalAssigned = 0;
                    $('.modal-manual-assign-input').each(function() {
                        totalAssigned += parseInt($(this).val()) || 0;
                    });
                    $('#modal-total-assigned').text(totalAssigned);
                    $('#modal-manual-assign-skipped').text(Math.max(0, totalAssigned));
                    $('#modal-manual-assign-warning').toggle(totalAssigned > 0);
                }
            }

            // Handle modal save assignment
            $(document).on('click', '#modal-save-assignment', function() {
                const mode = $('#assignmentModal').data('assignment-mode');
                
                if (mode === 'batch_size') {
                    const batchSize = $('#modal-batch-size-input').val();
                    $('#batch-size').val(batchSize);
                } else {
                    // Save manual assignments
                    const assignments = {};
                    $('.modal-manual-assign-input').each(function() {
                        const email = $(this).data('email');
                        const value = parseInt($(this).val()) || 0;
                        if (value > 0) {
                            assignments[email] = value;
                        }
                    });
                    
                    // Store assignments in a hidden field
                    $('#manual-assignments-data').val(JSON.stringify(assignments));
                }
                
                $('#assignmentModal').modal('hide');
                updateAssignmentDisplay();
            });
            
            // Clear modal data when modal is hidden
            $(document).on('hidden.bs.modal', '#assignmentModal', function() {
                $('#assignmentModal').removeData('assignment-mode');
                $('#assignmentModalBody').empty();
            });

            // Handle from email change to update assignments
            $(document).on('change', '#fromEmailSelect', function() {
                updateAssignmentDisplay();
                if ($('#assignment-mode').val() === 'manual_assign') {
                    updateModalAssignments();
                }
            });

            // Initialize assignment mode on page load
            $(document).ready(function() {
                const mode = $('#assignment-mode').val();
                $('#assignment-display-section').toggle(mode !== '');
                updateAssignmentDisplay();
                
                // Initialize manual assignments if needed
                if (mode === 'manual_assign') {
                    updateModalAssignments();
                }
            });
        });
    </script>



    <!-- CSV Mapping Modal for Campaign -->
    <div class="modal fade" id="csvMappingModalCampaign" tabindex="-1" aria-labelledby="csvMappingModalCampaignLabel"
        aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="csvMappingModalCampaignLabel">Map CSV Columns & Preview</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div id="csv-mapping-section-campaign"></div>
                    <div id="csv-preview-section-campaign" class="mt-4"></div>
                    <div id="csv-mapping-error-campaign" class="text-danger mt-2"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                </div>
            </div>
        </div>
    </div>

    <style>
        #csv-upload-progress-campaign {
            height: 25px;
            border-radius: 12px;
            overflow: hidden;
        }

        #csv-upload-progress-campaign .progress-bar {
            background: linear-gradient(45deg, #007bff, #0056b3);
            font-size: 12px;
            font-weight: 600;
            line-height: 25px;
        }

        #csv-import-progress-campaign {
            font-size: 14px;
            font-weight: 500;
        }

        #csv-row-range-from-campaign,
        #csv-row-range-to-campaign {
            border: 1px solid #dee2e6;
        }

        .csv-map-select-campaign {
            font-size: 12px;
            padding: 4px 8px;
        }

        #csv-preview-table-container-campaign {
            border: 1px solid #dee2e6;
            border-radius: 4px;
        }

        #csv-preview-table-container-campaign .table {
            margin-bottom: 0;
        }

        #csv-preview-table-container-campaign .table th {
            background-color: #f8f9fa;
            font-size: 12px;
            padding: 6px 8px;
        }

        #csv-preview-table-container-campaign .table td {
            font-size: 11px;
            padding: 4px 6px;
        }

        .csv-range-container {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            border: 1px solid #dee2e6;
        }

        #csv-row-range-from-campaign,
        #csv-row-range-to-campaign {
            transition: width 0.2s ease;
            text-align: center;
            font-weight: 500;
        }

        #csv-row-range-from-campaign:focus,
        #csv-row-range-to-campaign:focus {
            border-color: #0d6efd;
            box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
        }
    </style>
@endsection
