{{-- @php
    $userRole = App\Http\Classes\UserHelper::getCurrentUser('role');
@endphp --}}

@extends('layouts.system-app')
@section('title', 'Drift Emails')

@section('top-style')
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <style>
        .native-multiselect-search {
            margin-bottom: 4px;
            width: 100%;
            padding: 4px 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        .native-multiselect-select {
            min-height: 90px;
        }
    </style>
    <!-- <link href="/css/select2.min.css" rel="stylesheet"> -->
    <!-- Removed missing drift-emails-report-dropdown.css -->
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

        .select2-container {
            width: 100% !important;
        }

        /* Only apply width override to From Email and Select Report Filters dropdowns */
        [id^="sequence-from-email-"]+.select2-container .select2-dropdown,
        [id^="sequence-report-filters-"]+.select2-container .select2-dropdown {
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }

        /* For multi-select dropdowns as well */
        [id^="sequence-from-email-"]+.select2-container--default .select2-selection--multiple .select2-dropdown,
        [id^="sequence-report-filters-"]+.select2-container--default .select2-selection--multiple .select2-dropdown {
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }

        .select2-container--default .select2-selection--multiple {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
        }

        .spin-refresh {
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }

        .glassy-cute-btn {
            border: none;
            background: rgba(255, 255, 255, 0.28);
            border-radius: 50%;
            padding: 0;
            width: 38px;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 12px 0 rgba(30, 180, 205, 0.11), 0 1.5px 4px 0 rgba(80, 170, 255, 0.08);
            backdrop-filter: blur(6px);
            transition: box-shadow 0.2s, background 0.2s, transform 0.16s;
            position: relative;
            outline: none;
        }

        .glassy-cute-btn-inner {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(29, 180, 205, 0.18) 0%, rgba(255, 255, 255, 0.35) 100%);
        }

        .glassy-cute-btn:hover,
        .glassy-cute-btn:focus {
            background: rgba(255, 255, 255, 0.44);
            box-shadow: 0 4px 18px 0 rgba(30, 180, 205, 0.18), 0 2px 8px 0 rgba(80, 170, 255, 0.11);
            transform: translateY(-2px) scale(1.06);
        }

        .cute-refresh-icon {
            font-size: 1.45em;
            color: #1db4cd;
            filter: drop-shadow(0 0 2px #fff) drop-shadow(0 1px 2px #1db4cd33);
            transition: color 0.2s, filter 0.2s;
        }

        .glassy-cute-btn:hover .cute-refresh-icon {
            color: #16a085;
            filter: drop-shadow(0 0 4px #fff) drop-shadow(0 2px 4px #1db4cd44);
        }


        .btn {
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .btn-primary {
            border: none;
            color: #ffffff;
        }



        .btn-success {
            background: #059669;
            border: none;
            color: #ffffff;
        }

        .btn-success:hover {
            background: #047857;
        }

        .btn-warning {
            background: #f59e0b;
            border: none;
            color: #ffffff;
        }

        .btn-warning:hover {
            background: #d97706;
        }

        .btn-danger {
            background: #dc2626;
            border: none;
            color: #ffffff;
        }

        .btn-danger:hover {
            background: #b91c1c;
        }

        /* Modernized set & sequence tabs */
        .nav-tabs {
            border-bottom: none;
            margin-bottom: 0;
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding: 0 8px;
            background: #f7fafc;
            border-radius: 12px 12px 0 0;
            box-shadow: 0 2px 8px rgba(30, 180, 205, 0.06);
            gap: 4px;
        }

        .nav-tabs .nav-item {
            position: relative;
            margin-right: 0;
            background: transparent;
            border-radius: 10px 10px 0 0;
            border: none;
            display: flex;
            align-items: center;
            min-width: 120px;
            max-width: 210px;
            transition: box-shadow 0.2s, background 0.2s;
        }

        .nav-tabs .nav-link {
            color: #5f6368;
            font-weight: 600;
            font-size: 15px;
            padding: 12px 24px;
            border: none;
            border-radius: 10px 10px 0 0;
            background: transparent;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex-grow: 1;
            text-align: left;
            transition: background 0.2s, color 0.2s, box-shadow 0.2s;
            box-shadow: none;
        }

        .nav-tabs .nav-link.active {
            background: #fff;
            color: #1db4cd;
            box-shadow: 0 4px 12px rgba(30, 180, 205, 0.08);
            z-index: 2;
            border-bottom: 2.5px solid #1db4cd;
        }

        .nav-tabs .nav-link:hover:not(.active) {
            background: #e0f7fa;
            color: #1db4cd;
            box-shadow: 0 2px 8px rgba(30, 180, 205, 0.05);
        }

        @media (max-width: 768px) {
            .nav-tabs .nav-link {
                font-size: 13px;
                padding: 10px 14px;
            }

            .nav-tabs .nav-item {
                min-width: 90px;
                max-width: 120px;
            }
        }

        /* Delete button styling for sequence tab */
        .delete-sequence-tab {
            color: #5f6368 !important;
            opacity: 0;
            transition: opacity 0.2s;
            padding: 4px;
            margin-right: 4px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
        }

        .delete-sequence-tab:hover {
            background: rgba(0, 0, 0, 0.1);
        }

        /* Delete button styling for set tab */
        .delete-set-tab {
            color: #e74c3c !important;
            background: transparent;
            opacity: 0;
            transition: opacity 0.2s, background 0.2s, box-shadow 0.2s;
            padding: 4px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            outline: none;
            border: none;
            box-shadow: none;
        }

        .delete-set-tab:focus {
            outline: 2px solid #1db4cd !important;
            box-shadow: 0 0 0 2px #90caf9 !important;
        }

        .delete-set-tab:hover {
            background: rgba(231, 76, 60, 0.08);
            color: #c0392b !important;
            box-shadow: 0 2px 8px rgba(231, 76, 60, 0.08);
        }

        /* Show delete button on tab hover */
        .nav-item:hover .delete-set-tab {
            opacity: 1;
        }


        /* Add new tab button */
        #add-sequence-btn {
            margin-left: 4px;
            background: transparent;
            border: 1px dashed #d1d1d1;
            border-radius: 8px 8px 0 0;
            min-width: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        #add-sequence-btn:hover {
            background: rgba(0, 0, 0, 0.05);
        }

        /* Tab content area */
        .tab-content {
            border: 1px solid #d1d1d1;
            border-top: none;
            border-radius: 0 0 8px 8px;
            background: white;
            padding: 16px;
        }

        /* Active tab indicator */
        .nav-link.active::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
        }

        /* Scrollbar for tabs */
        .nav-tabs::-webkit-scrollbar {
            height: 4px;
        }

        .nav-tabs::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
        }

        .stats-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            margin-bottom: 20px;
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
        }

        .stats-card p {
            margin: 0;
            font-size: 14px;
            color: #6b7280;
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

        .nav-tabs {
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 20px;
        }

        .nav-tabs .nav-link {
            color: #6b7280;
            font-weight: 500;
            border: none;
            border-radius: 0;
            padding: 10px 20px;
        }

        .nav-tabs .nav-link.active {
            background: transparent;
        }

        .nav-tabs .nav-link:hover {}

        .alert-info {
            background-color: #e0f2fe;
            border-color: #bae6fd;
            color: #075985;
        }

        @media (max-width: 768px) {
            .container {
                padding: 0 15px;
            }

            .card-body {
                padding: 15px;
            }

            .stats-card div {
                min-width: 100%;
            }
        }

        .email-pair {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .email-pair:last-child {
            border-bottom: none;
        }

        .email-pair .sender,
        .email-pair .receiver {
            flex: 1;
            font-size: 14px;
        }

        .email-pair .sender {
            text-align: left;
        }

        .email-pair .receiver {
            text-align: end;
        }

        .email-pair .arrow {
            margin: 0 15px;
            color: #6b7280;
        }

        .crazy-loader {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
        }

        .loader-circle {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: linear-gradient(45deg, #1db4cd, #ff6b6b, #4cd137);
            animation: crazySpin 1.2s ease-in-out infinite;
        }

        .loader-circle:nth-child(2) {
            animation-delay: 0.3s;
        }

        .loader-circle:nth-child(3) {
            animation-delay: 0.6s;
        }

        @keyframes crazySpin {
            0% {
                transform: rotate(0deg) scale(1);
                opacity: 1;
                filter: hue-rotate(0deg);
            }

            50% {
                transform: rotate(180deg) scale(1.3);
                opacity: 0.7;
                filter: hue-rotate(180deg);
            }

            100% {
                transform: rotate(360deg) scale(1);
                opacity: 1;
                filter: hue-rotate(360deg);
            }
        }

        @media (max-width: 768px) {
            .email-pair {
                flex-direction: column;
                align-items: flex-start;
            }

            .email-pair .sender,
            .email-pair .receiver {
                text-align: left;
            }

            .email-pair .arrow {
                margin: 5px 0;
            }
        }
    </style>
@endsection

@section('content')
    <div class="container">
        <div class="card">
            <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-3 shadow-sm px-4 py-3"
                style="background:#1db4cd; border-bottom:2px solid #e0e7ef;">
                <span style="font-size:1.5rem; font-weight:700; color:#fff; letter-spacing:0.5px;">Drift Email
                    Campaigns</span>
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-outline-primary btn-sm sharp-btn" id="show-quota-btn"
                            style="border-radius:6px; font-weight:600; letter-spacing:0.5px; box-shadow:0 1px 4px rgba(30,64,175,0.06); padding:8px 20px; background:#fff; color:#1db4cd; border:1.5px solid #fff;"
                            data-bs-toggle="modal" data-bs-target="#quotaModal">
                            <span id="total-quota-text">Loading quota...</span>
                        </button>
                    <button class="btn btn-primary btn-sm sharp-btn" id="save-all-sequences-btn"
                        style="border-radius:6px; font-weight:600; letter-spacing:0.5px; box-shadow:0 1px 4px rgba(30,64,175,0.06); padding:8px 20px; background:#fff; color:#1db4cd; border:1.5px solid #fff;">Save
                        All Sequences</button>
                    <button class="btn btn-outline-primary btn-sm sharp-btn" id="new-set-btn"
                        style="border-radius:6px; font-weight:600; letter-spacing:0.5px; box-shadow:0 1px 4px rgba(30,64,175,0.06); padding:8px 20px; background:#fff; color:#1db4cd; border:1.5px solid #fff;">New
                        Set</button>
                </div>

            </div>
            <style>
                .sharp-btn:focus,
                .sharp-btn:active {
                    outline: none !important;
                    box-shadow: 0 0 0 2px #90caf9 !important;
                }

                .sharp-btn {
                    transition: background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
                }

                .btn-primary.sharp-btn:hover,
                .btn-primary.sharp-btn:focus,
                .btn-outline-primary.sharp-btn:hover,
                .btn-outline-primary.sharp-btn:focus {
                    background: #1db4cd !important;
                    color: #fff !important;
                    border-color: #1db4cd !important;
                }

                #new-set-btn:disabled,
                .sharp-btn:disabled {
                    color: #fff !important;
                    background: #1db4cd !important;
                    border-color: #1db4cd !important;
                }
            </style>
            <div class="card-body">
                <ul class="nav nav-tabs" id="setTabs" role="tablist">
                    <!-- Dynamically populated by JavaScript -->
                </ul>
                <div class="tab-content" id="setTabContent">
                    <div class="tab-pane fade show active" id="set-content-active" role="tabpanel"
                        aria-labelledby="set-tab-active">
                        <h5>Active Set: <span id="active-set-name">Loading...</span> (ID: <span id="active-set-id"></span>)
                        </h5>
                        <ul class="nav nav-tabs" id="sequenceTabs" role="tablist">
                            <!-- Dynamically populated by JavaScript -->
                        </ul>
                        <div class="tab-content" id="sequenceTabContent">
                            <!-- Dynamically populated by JavaScript -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Schedule Modal -->
        <div class="modal fade" id="scheduleModal" tabindex="-1" aria-labelledby="scheduleModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="scheduleModalLabel">Schedule Sequence</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="schedule-form">
                        <div class="modal-body">
                            <input type="hidden" id="schedule-sequence-id" name="sequence_id">
                            <div class="mb-3">
                                <label for="schedule-time" class="form-label">Schedule Time</label>
                                <input type="datetime-local" class="form-control" id="schedule-time" name="scheduled_at"
                                    required>
                            </div>
                            <div class="mb-3">
                                <label for="schedule-timezone" class="form-label">Timezone</label>
                                <select class="form-select" id="schedule-timezone" name="timezone" required>
                                    <!-- Timezone options will be populated dynamically -->
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                <span class="spinner-border spinner-border-sm loading-spinner d-none" role="status"
                                    aria-hidden="true"></span>
                                Schedule
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>


        <!-- Replied Emails Modal -->
        <div class="modal fade" id="repliedEmailsModal" tabindex="-1" aria-labelledby="repliedEmailsModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="repliedEmailsModalLabel">Replied Emails</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="replied-emails-loading" class="text-center" style="display: none;">
                            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            Loading...
                        </div>
                        <div id="replied-emails-content"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Create Audience Modal -->
        <div class="modal fade" id="createAudienceModal" tabindex="-1" aria-labelledby="createAudienceModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="createAudienceModalLabel">Create Audience</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <ul class="nav nav-tabs sub-tabs" id="createAudienceTabs" role="tablist">
                            <li class="nav-item">
                                <button class="nav-link active" id="manual-add-audience-tab" data-bs-toggle="tab"
                                    data-bs-target="#manual-add-audience" type="button" role="tab"
                                    aria-controls="manual-add-audience" aria-selected="true">
                                    <i class="bi bi-person-plus"></i> Manually Add
                                </button>
                            </li>
                            <li class="nav-item">
                                <button class="nav-link" id="import-csv-audience-tab" data-bs-toggle="tab"
                                    data-bs-target="#import-csv-audience" type="button" role="tab"
                                    aria-controls="import-csv-audience" aria-selected="false">
                                    <i class="bi bi-file-earmark-arrow-up"></i> Import CSV
                                </button>
                            </li>
                        </ul>
                        <div class="tab-content" id="createAudienceTabContent">
                            <div class="tab-pane fade show active" id="manual-add-audience" role="tabpanel"
                                aria-labelledby="manual-add-audience-tab">
                                <div class="mb-3">
                                    <label for="audience-name-create" class="form-label">Audience Name</label>
                                    <input type="text" class="form-control" id="audience-name-create" required>
                                </div>
                                <div class="mb-3">
                                    <label for="subscriber-format-create" class="form-label">Select Format</label>
                                    <select class="form-control" id="subscriber-format-create">
                                        <option value="first-email">First Name, Email</option>
                                        <option value="first-last-email">First Name, Last Name, Email</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="subscribers-input-create" class="form-label">Enter Subscribers (one per
                                        line, comma-separated)</label>
                                    <textarea class="form-control" id="subscribers-input-create" rows="5"
                                        placeholder="e.g., John, john@example.com\nJane, jane@example.com"></textarea>
                                </div>
                                <div class="d-flex align-items-center">
                                    <button class="btn btn-success" id="save-audience-from-campaign-btn">
                                        Save Audience
                                        <span class="spinner-border spinner-border-sm loading-spinner" role="status"
                                            aria-hidden="true" style="display: none;"></span>
                                    </button>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="import-csv-audience" role="tabpanel"
                                aria-labelledby="import-csv-audience-tab">
                                <div class="mb-3">
                                    <label for="audience-name-csv-create" class="form-label">Audience Name</label>
                                    <input type="text" class="form-control" id="audience-name-csv-create" required>
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
                                    <input type="file" class="form-control" id="csv-file-create" accept=".csv">
                                </div>
                                <div class="d-flex align-items-center">
                                    <button class="btn btn-success" id="import-csv-from-campaign-btn">
                                        Save Audience
                                        <span class="spinner-border spinner-border-sm loading-spinner" role="status"
                                            aria-hidden="true" style="display: none;"></span>
                                    </button>
                                </div>
                                <div class="progress mt-3" id="upload-progress-create" style="display: none;">
                                    <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0"
                                        aria-valuemin="0" aria-valuemax="100">0%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Editor Modal (TinyMCE version from email-scheduling) -->
        <div class="modal fade" id="editorModal" tabindex="-1" aria-labelledby="editorModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editorModalLabel">Add Template</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="template-id">
                        <div class="mb-3">
                            <label for="editor-title" class="form-label">Template Title</label>
                            <input type="text" class="form-control" id="editor-title">
                        </div>
                        <div class="mb-3">
                            <label for="editor-subject" class="form-label">Subject</label>
                            <input type="text" class="form-control" id="editor-subject"
                                placeholder="Enter email subject">
                        </div>
                        <div class="mb-3">
                            <label for="editor-switch" class="form-label">Editor Type</label>
                            <select class="form-control" id="editor-switch">
                                <option value="wysiwyg">WYSIWYG Editor</option>
                                <option value="code">Advanced Code Editor (HTML)</option>
                            </select>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Subscriber Placeholders</label>
                                <select class="form-control" id="subscriber-placeholder-select">
                                    <option value="">Select Subscriber Placeholder</option>
                                </select>
                                <small class="form-text text-muted">Use placeholders like [first_name], [last_name] to
                                    personalize for subscribers.</small>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Sender Placeholders</label>
                                <select class="form-control" id="email-account-placeholder-select">
                                    <option value="">Select Email Account Placeholder</option>
                                </select>
                                <small class="form-text text-muted">Use placeholders like [account_email],
                                    [account_first_name] for account details.</small>
                            </div>
                        </div>
                        <div id="tinymce-editor-container" style="display: none;">
                            <textarea id="tinymce-editor" class="form-control" style="min-height: 200px;"></textarea>
                        </div>
                        <div id="code-editor-container" style="display: none;">
                            <textarea id="code-editor" class="form-control" rows="10"></textarea>
                        </div>
                        <!-- TinyMCE Loading Spinner -->
                        <div id="tinymce-loading" class="text-center py-4" style="display: none;">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading Editor...</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="save-template-btn">Save</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- New Set Modal -->
        <div class="modal fade" id="newSetModal" tabindex="-1" aria-labelledby="newSetModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="newSetModalLabel">Create New Set</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="new-set-form">
                            @csrf
                            <div class="mb-3">
                                <label for="set-name" class="form-label">Set Name</label>
                                <input type="text" class="form-control" id="set-name" name="set_name" required
                                    placeholder="Enter set name">
                            </div>
                            <div class="mb-3">
                                <label for="sequence-count" class="form-label">Number of Sequences</label>
                                <input type="number" class="form-control" id="sequence-count" name="sequence_count"
                                    min="1" value="1" required>
                            </div>
                            <div id="set-message"></div>
                            <button type="submit" class="btn btn-primary">
                                Create Set
                                <span class="spinner-border spinner-border-sm loading-spinner" role="status"
                                    aria-hidden="true" style="display: none;"></span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        <!-- Preview Email Modal -->
        <div class="modal fade" id="previewModal" tabindex="-1" aria-labelledby="previewModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="previewModalLabel">Email Preview</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="preview-content" class="border p-3" style="min-height: 300px;">
                            <div class="text-center" id="preview-loading" style="display: none;">
                                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Loading preview...
                            </div>
                            <div id="preview-content-inner"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Delete Sequence Confirmation Modal -->
        <div class="modal fade" id="deleteSequenceModal" tabindex="-1" aria-labelledby="deleteSequenceModalLabel"
            aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="deleteSequenceModalLabel">Confirm Delete Sequence</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to permanently delete this sequence? This action cannot be undone.</p>
                        <input type="hidden" id="delete-sequence-id">
                        <input type="hidden" id="delete-tab-index">
                        <input type="hidden" id="delete-set-id">
                        <div id="delete-sequence-message"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirm-delete-sequence-btn">
                            Delete
                            <span class="spinner-border spinner-border-sm loading-spinner" role="status"
                                aria-hidden="true" style="display: none;"></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal fade" id="deleteSetModal" tabindex="-1" aria-labelledby="deleteSetModalLabel"
            aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="deleteSetModalLabel">Confirm Delete Set</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to permanently delete this set and all its sequences? This action cannot be
                            undone.</p>
                        <input type="hidden" id="delete-set-id">
                        <div id="delete-set-message"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirm-delete-set-btn">
                            Delete
                            <span class="spinner-border spinner-border-sm loading-spinner" role="status"
                                aria-hidden="true" style="display: none;"></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal fade" id="quotaModal" tabindex="-1" aria-labelledby="quotaModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="quotaModalLabel">Email Account Quotas</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="quota-modal-body">
                        Loading quota info...
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>

    </div>
@endsection
@section('bottom-script')
    <!-- jQuery must be loaded first and only once -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- Other dependencies -->
    <!-- Bootstrap 5 JS Bundle (for modal support) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios@1.1.2/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="{{ asset('js/tinymce/tinymce.min.js') }}"></script>
    <link rel="stylesheet" href="/treasury/libraries/alerts/toastr/toastr.css">
    <script src="/treasury/libraries/alerts/toastr/toastr.js"></script>
    <script>
        toastr.options = {
            "closeButton": true,
            "progressBar": true,
            "positionClass": "toast-top-right",
            "timeOut": "4000"
        };
        console.log('[DEBUG] Drift Emails JS loaded:', new Date().toISOString());
        console.log('[DEBUG] Test log: If you see this, JS is running.');
        console.log('[DEBUG] window.jQuery:', typeof window.jQuery);
        if (window.jQuery) {
            console.log('[DEBUG] jQuery version:', $.fn.jquery);
        }
        $(document).ready(function() {
            const $fromEmailDropdowns = $('[id^="sequence-from-email-"]');
            console.log('[DEBUG] Found', $fromEmailDropdowns.length,
                'dropdown(s) with id^=sequence-from-email- at DOM ready.');
            $fromEmailDropdowns.each(function() {
                $(this).append('<option value="test">TEST OPTION</option>');
                console.log('[DEBUG] Appended TEST OPTION to:', $(this).attr('id'));
            });
        });
        let tinymceEditor = null;
        let sequenceCount = 0;
        let quill = null;
        let activeSetId = null;
        let activeSetName = '';
        let sequenceIdsMap = {};
        let emailAccountsData = [];

        function fetchAndDisplayQuotass() {
            axios.get('/drift/quota-info')
                .then(response => {
                    console.log('Quota response:', response.data);
                    const data = response.data;
                    // 1. Update the button text
                    if (typeof data.total_used !== 'undefined' && typeof data.total_limit !== 'undefined') {
                        $('#total-quota-text').text(`${data.total_used} / ${data.total_limit} used`);
                    } else {
                        $('#total-quota-text').text('Quota info unavailable');
                    }
                    // 2. Store accounts for modal
                    window.emailQuotaAccounts = data.accounts || [];
                })
                .catch((err) => {
                    console.error('Quota error:', err);
                    $('#total-quota-text').text('Failed to load quota');
                    window.emailQuotaAccounts = [];
                });
        }

        $(document).ready(function() {
            fetchAndDisplayQuotass();
            $('#show-quota-btn').on('click', function() {
                let html = '';
                const accounts = window.emailQuotaAccounts || [];
                if (accounts.length > 0) {
                    html += '<div class="list-group">';
                    accounts.forEach(acc => {
                        html += `<div class="list-group-item d-flex justify-content-between align-items-center">
                        <span><strong>${acc.email}</strong></span>
                        <span>${acc.sent_in_last_24h} / ${acc.daily_send_limit} used</span>
                    </div>`;
                    });
                    html += '</div>';
                } else {
                    html = '<div class="text-danger">No quota data available.</div>';
                }
                $('#quota-modal-body').html(html);
            });
        });

        function initializeTinyMCEEditor(content = '') {
            return new Promise((resolve, reject) => {
                const $spinner = $('#tinymce-loading');
                const $editorContainer = $('#tinymce-editor-container');
                const $errorContainer = $('#editor-error');

                $spinner.show();
                $editorContainer.hide();
                $errorContainer.hide().empty();

                // Ensure TinyMCE script is loaded
                if (!window.tinymce) {
                    console.error('TinyMCE is not loaded.');
                    $spinner.hide();
                    $errorContainer.text('Editor failed to load. Please try again.').show();
                    reject(new Error('TinyMCE not loaded'));
                    return;
                }

                // Remove any existing TinyMCE instance to prevent conflicts
                if (tinymceEditor) {
                    tinymce.remove('#tinymce-editor');
                    tinymceEditor = null;
                }

                // Attempt to initialize TinyMCE
                const attemptInit = (retryCount = 0, maxRetries = 2) => {
                    try {
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
                            // Add options to remove branding and promotions
                            branding: false, // Removes "Built with TinyMCE" branding
                            promotion: false, // Disables promotional dialogs like "Get all features"
                            content_style: `body { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; } table { border-collapse: collapse; width: 100%; } table, th, td { border: 1px solid #ccc; padding: 8px; } th { background-color: #f4f4f4; }`,
                            setup: function(editor) {
                                tinymceEditor = editor;
                                editor.on('init', function() {
                                    editor.setContent(content || '');
                                    $spinner.hide();
                                    $editorContainer.show();
                                    resolve();
                                });
                                editor.ui.registry.addButton('customlink', {
                                    icon: 'link',
                                    tooltip: 'Insert smart link',
                                    onAction: function() {
                                        convertSelectedTextToLink(editor);
                                    }
                                });
                                editor.addShortcut('ctrl+k', 'Insert smart link', function() {
                                    convertSelectedTextToLink(editor);
                                });
                                editor.on('click', function(e) {
                                    const target = e.target;
                                    if (target.tagName === 'A') {
                                        e.preventDefault();
                                        let href = target.getAttribute('href');
                                        const text = target.textContent.trim();
                                        if (!href.startsWith('http')) {
                                            href = text.match(/\.[a-z]{2,}$/) ?
                                                'https://' + text :
                                                `https://www.google.com/search?q=${encodeURIComponent(text)}`;
                                        }
                                        window.open(href, '_blank');
                                    }
                                });
                            },
                            init_instance_callback: function(editor) {
                                editor.focus();
                            },
                            init_error_callback: function(error) {
                                console.error('TinyMCE initialization failed:', error);
                                if (retryCount < maxRetries) {
                                    console.log(
                                        `Retrying TinyMCE initialization (attempt ${retryCount + 1})`
                                    );
                                    setTimeout(() => attemptInit(retryCount + 1), 500);
                                } else {
                                    $spinner.hide();
                                    $errorContainer.text(
                                        'Failed to initialize editor after retries. Please try again.'
                                    ).show();
                                    reject(error);
                                }
                            }
                        });
                    } catch (error) {
                        console.error('TinyMCE initialization error:', error);
                        if (retryCount < maxRetries) {
                            console.log(`Retrying TinyMCE initialization (attempt ${retryCount + 1})`);
                            setTimeout(() => attemptInit(retryCount + 1), 500);
                        } else {
                            $spinner.hide();
                            $errorContainer.text('Failed to initialize editor after retries. Please try again.')
                                .show();
                            reject(error);
                        }
                    }
                };

                attemptInit();
            });
        }

        function convertSelectedTextToLink(editor) {
            const selectedText = editor.selection.getContent({
                format: 'text'
            }).trim();
            if (!selectedText) {
                alert('Please select text to convert to a link.');
                return;
            }
            let href = selectedText.match(/\.[a-z]{2,}$/) ?
                `https://${selectedText}` :
                `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`;
            const linkHtml = `<a href="${href}" target="_blank">${selectedText}</a>`;
            editor.selection.setContent(linkHtml);
        }

        function fetchPlaceholders() {
            $.ajax({
                    url: '/api/email-account-placeholders',
                    method: 'GET',
                    timeout: 10000,
                })
                .done(data => {
                    const subscriberPlaceholders = data.subscriber_placeholders || [];
                    const emailAccountPlaceholders = data.email_account_placeholders || [];
                    renderPlaceholders(subscriberPlaceholders, emailAccountPlaceholders);
                })
                .fail(() => {
                    // fallback
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
                            value: '[account_email]',
                            text: 'Account Email'
                        },
                        {
                            value: '[account_first_name]',
                            text: 'Account First Name'
                        },
                        {
                            value: '[account_last_name]',
                            text: 'Account Last Name'
                        }
                    ];
                    renderPlaceholders(subscriberPlaceholders, emailAccountPlaceholders);
                });
        }

        function renderPlaceholders(subscriberPlaceholders, emailAccountPlaceholders) {
            const $subscriberSelect = $('#subscriber-placeholder-select');
            const $emailAccountSelect = $('#email-account-placeholder-select');
            $subscriberSelect.empty().append('<option value="">Select Subscriber Placeholder</option>');
            subscriberPlaceholders.forEach(ph => {
                $subscriberSelect.append(`<option value="${ph.value}" data-type="subscriber">${ph.text}</option>`);
            });
            $emailAccountSelect.empty().append('<option value="">Select Email Account Placeholder</option>');
            emailAccountPlaceholders.forEach(ph => {
                $emailAccountSelect.append(
                    `<option value="${ph.value}" data-type="email_account">${ph.text}</option>`);
            });
        }
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
            } else {
                const $codeEditor = $('#code-editor');
                if ($codeEditor.length) {
                    const currentContent = $codeEditor.val();
                    $codeEditor.val(currentContent + value);
                }
            }
        }

        function showEditorModal(modalTitle, title, editorType, content = '', id = null, onHiddenCallback = null) {
            const $modal = $('#editorModal');
            const $spinner = $('#tinymce-loading');
            const $editorContainer = $('#tinymce-editor-container');
            const $codeEditorContainer = $('#code-editor-container');
            const $errorContainer = $('#editor-error');

            // Reset modal state
            $('#editorModalLabel').text(modalTitle || 'Create Template');
            $('#editor-title').val(title || '').prop('disabled', false).prop('readonly', false);
            $('#template-id').val(id || '');
            $('#editor-switch').val(editorType || 'wysiwyg');
            $editorContainer.hide();
            $codeEditorContainer.hide();
            $errorContainer.hide().empty();
            $spinner.show();
            fetchPlaceholders();

            // Destroy existing TinyMCE instance
            if (tinymceEditor) {
                tinymce.remove('#tinymce-editor');
                tinymceEditor = null;
            }

            // Initialize editor based on type
            const initializeEditor = () => {
                if ((editorType || 'wysiwyg') === 'wysiwyg') {
                    initializeTinyMCEEditor(content)
                        .then(() => {
                            $editorContainer.show();
                            $spinner.hide();
                            $modal.modal('show').on('shown.bs.modal', function() {
                                $('#editor-title').focus();
                            });
                        })
                        .catch(error => {
                            console.error('Failed to initialize TinyMCE:', error);
                            $spinner.hide();
                            $editorContainer.hide();
                            $errorContainer.text('Failed to load editor. Please try again.').show();
                            $modal.modal('show');
                        });
                } else {
                    $codeEditorContainer.show();
                    $('#code-editor').val(content || '');
                    $spinner.hide();
                    $modal.modal('show').on('shown.bs.modal', function() {
                        $('#editor-title').focus();
                    });
                }
            };

            // Handle modal hide callback
            $modal.off('hidden.bs.modal');
            if (onHiddenCallback) {
                $modal.on('hidden.bs.modal', onHiddenCallback);
            }

            // Initialize editor directly (no unnecessary hide/show cycle)
            initializeEditor();
        }

        // Handle create/add template buttons
        $(document).on('click', '#create-template-btn, #add-template-btn, .create-template', function() {
            showEditorModal('Create Template', '', 'wysiwyg');
        });

        // Handle editor type switch
        $('#editor-switch').on('change', function() {
            const type = $(this).val();
            const title = $('#editor-title').val();
            const id = $('#template-id').val();
            let content = '';

            // Get current content
            if (type === 'wysiwyg' && tinymceEditor) {
                content = tinymceEditor.getContent();
            } else {
                content = $('#code-editor').val();
            }

            const $spinner = $('#tinymce-loading');
            const $editorContainer = $('#tinymce-editor-container');
            const $codeEditorContainer = $('#code-editor-container');
            const $errorContainer = $('#editor-error');

            // Reset editor area
            $editorContainer.hide();
            $codeEditorContainer.hide();
            $errorContainer.hide().empty();
            $spinner.show();

            // Destroy existing TinyMCE instance
            if (tinymceEditor) {
                tinymce.remove('#tinymce-editor');
                tinymceEditor = null;
            }

            // Initialize new editor
            if (type === 'wysiwyg') {
                initializeTinyMCEEditor(content)
                    .then(() => {
                        $editorContainer.show();
                        $spinner.hide();
                    })
                    .catch(error => {
                        console.error('Failed to initialize TinyMCE:', error);
                        $spinner.hide();
                        $editorContainer.hide();
                        $errorContainer.text('Failed to load editor. Please try again.').show();
                    });
            } else {
                $codeEditorContainer.show();
                $('#code-editor').val(content || '');
                $spinner.hide();
            }
        });
        let pendingSendImmediately = null;
        $(document).ready(function() {
            let sequenceCount = 0;
            let quill = null;
            let activeSetId = null;
            let activeSetName = '';
            let sequenceIdsMap = {}; // { [setId]: { [tabIndex]: sequenceId } }
            function validateForm(sequence, tabIndex, setId) {
                const $form = $(`#sequence-${setId}-${tabIndex}-form`);
                let isValid = true;
                let errorMessage = `Please fill all required fields for Sequence ${tabIndex}`;

                $form.find('[required]').each(function() {
                    if ($(this).prop('disabled') || $(this).attr('name') === 'batch_size') return;
                    if (!$(this).val()) {
                        $(this).addClass('is-invalid');
                        isValid = false;
                    } else {
                        $(this).removeClass('is-invalid');
                    }
                });

                if (tabIndex == 1) {
                    const timeGap = parseInt($form.find(`#sequence-time-gap-${setId}-${tabIndex}`).val()) || 0;
                    const assignmentMode = $form.find(`#assignment-mode-${setId}-${tabIndex}`).val() ||
                        'batch_size';
                    const batchSize = parseInt($form.find(`#sequence-batch-size-${setId}-${tabIndex}`).val()) || 0;
                    const manualAssignments = $form.find(`#sequence-manual-assignments-${setId}-${tabIndex}`).val();

                    if (timeGap <= 0) {
                        $form.find(`#sequence-time-gap-${setId}-${tabIndex}`).addClass('is-invalid');
                        isValid = false;
                        errorMessage += ', including a valid Time Gap (> 0 seconds)';
                    } else {
                        $form.find(`#sequence-time-gap-${setId}-${tabIndex}`).removeClass('is-invalid');
                    }

                    if (assignmentMode === 'batch_size' && batchSize <= 0) {
                        $form.find(`#sequence-batch-size-${setId}-${tabIndex}`).addClass('is-invalid');
                        isValid = false;
                        errorMessage += ', including a valid Batch Size (> 0)';
                    } else {
                        $form.find(`#sequence-batch-size-${setId}-${tabIndex}`).removeClass('is-invalid');
                    }

                    if (assignmentMode === 'manual_assign') {
                        let totalAssigned = 0;
                        let assignments = {};
                        try {
                            assignments = manualAssignments ? JSON.parse(manualAssignments) : {};
                            Object.values(assignments).forEach(count => {
                                const num = parseInt(count) || 0;
                                if (num < 0) {
                                    isValid = false;
                                    errorMessage += ', including valid non-negative manual assignments';
                                }
                                totalAssigned += num;
                            });
                        } catch (e) {
                            isValid = false;
                            errorMessage += ', including valid manual assignments format';
                        }

                        const fromEmails = $form.find(`#sequence-from-email-${setId}-${tabIndex}`).val() || [];
                        if (fromEmails.length > 0 && Object.keys(assignments).length === 0) {
                            isValid = false;
                            errorMessage += ', including at least one manual assignment for selected From Emails';
                        }
                    }
                }

                if (!isValid) {
                    console.error(`Validation failed for Sequence ${tabIndex}: ${errorMessage}`);
                    toastr.error(errorMessage);
                }

                return isValid;
            }
            // Setup Axios headers
            axios.defaults.headers.common['X-CSRF-TOKEN'] = $('meta[name="csrf-token"]').attr('content');

            // Modified initializeSelect2 to handle only From Email dropdown for daily_send_limit
            function initializeSelect2(selector, callback = null) {
                // Check for jQuery and Select2 dependencies
                if (typeof $ === 'undefined' || typeof $.fn.select2 === 'undefined') {
                    console.error('[Select2][ERROR] jQuery or Select2 not loaded');
                    if (callback) callback(new Error('jQuery or Select2 not loaded'));
                    return;
                }

                const $select = $(selector);
                const selectId = $select.attr('id');

                // Validate select element
                if (!$select.length || !selectId) {
                    console.error('[Select2][ERROR] Invalid or missing selector/ID');
                    if (callback) callback(new Error('Invalid or missing selector/ID'));
                    return;
                }

                // Destroy existing Select2 instance
                if ($select.hasClass('select2-hidden-accessible')) {
                    $select.select2('destroy');
                }

                // Set default placeholder if undefined
                if ($select.data('placeholder') === undefined) {
                    $select.attr('data-placeholder', 'Select option(s)');
                }

                // Cache initial option values
                const optionValsBeforeInit = $select.find('option').map(function() {
                    return $(this).val();
                }).get();
                console.log(`[Select2][DEBUG] Initializing ${selectId} with options:`, optionValsBeforeInit);
                console.log(`[Select2][DEBUG] data-selected for ${selectId}:`, $select.data('selected'));

                // Initialize Select2
                const theme = $select.data('theme') || 'default';
                $select.select2({
                    placeholder: $select.data('placeholder'),
                    allowClear: true,
                    dropdownParent: $select.parent(),
                    width: '100%',
                    dropdownAutoWidth: false,
                    minimumResultsForSearch: 1,
                    theme: theme
                });

                // Get CSRF token
                const csrfToken = $('meta[name="csrf-token"]').attr('content');
                if (!csrfToken) {
                    console.error('[Select2][ERROR] CSRF token not found');
                    if (callback) callback(new Error('CSRF token not found'));
                    return;
                }

                // Function to set selected options
                function setSelectedOptions($select, selected) {
                    let parsedSelected = [];
                    if (typeof selected === 'string') {
                        try {
                            parsedSelected = JSON.parse(selected);
                        } catch (e) {
                            console.warn(
                                `[Select2][DEBUG] Failed to parse data-selected as JSON for ${$select.attr('id')}:`,
                                selected);
                            parsedSelected = selected.split(',').map(s => s.trim()).filter(Boolean);
                        }
                    } else {
                        parsedSelected = Array.isArray(selected) ? selected : (selected ? [selected] : []);
                    }

                    // Handle nested JSON string
                    if (Array.isArray(parsedSelected) && parsedSelected.length === 1 && typeof parsedSelected[0] ===
                        'string' && parsedSelected[0].trim().startsWith('[')) {
                        try {
                            parsedSelected = JSON.parse(parsedSelected[0]);
                        } catch (e) {
                            console.warn(`[Select2][DEBUG] Failed to parse nested JSON for ${$select.attr('id')}:`,
                                parsedSelected[0]);
                        }
                    }

                    // Ensure parsedSelected is an array
                    parsedSelected = Array.isArray(parsedSelected) ? parsedSelected : (parsedSelected ? [
                        parsedSelected
                    ] : []);

                    // Set values and trigger change
                    const optionValues = $select.find('option').map(function() {
                        return $(this).val();
                    }).get();
                    console.log(`[Select2][DEBUG] Options for ${$select.attr('id')}:`, optionValues);
                    console.log(`[Select2][DEBUG] Selected values to set for ${$select.attr('id')}:`,
                        parsedSelected);
                    $select.val(parsedSelected).trigger('change.select2');

                    // Log current value and check for unmatched values
                    console.log(`[Select2][DEBUG] Current value after set for ${$select.attr('id')}:`, $select
                        .val());
                    const unmatched = parsedSelected.filter(v => !optionValues.includes(v));
                    if (unmatched.length > 0) {
                        console.warn(`[Select2][DEBUG] Unmatched selected values for ${$select.attr('id')}:`,
                            unmatched);
                    }
                }

                // Define fetch logic based on ID
                let fetchPromise = null;

                if (selectId.startsWith('sequence-from-email-')) {
                    fetchPromise = axios.get('/api/email-accounts', {
                            headers: {
                                'X-CSRF-TOKEN': csrfToken
                            }
                    }).then(response => {
                        const accounts = Array.isArray(response.data) ? response.data : [];
                            $select.empty().append(
                                '<option value="">Select Email(s)</option><option value="__select_all__">Select All</option>'
                                );
                            accounts.forEach(account => {
                                const hasLimit = account.daily_send_limit != null && account
                                    .daily_send_limit !== '';
                                const displayText = hasLimit ?
                                    `${account.email} (${account.daily_send_limit})` : account.email;
                                $select.append(
                                    `<option value="${account.email}">${displayText}</option>`);
                            });
                            console.log(`[Select2] Populated email accounts for ${selectId}`, accounts);
                            setSelectedOptions($select, $select.data('selected'));
                    }).catch(error => {
                            console.error(`[Select2] Failed to fetch email accounts for ${selectId}:`, error);
                            $select.empty().append('<option value="">Failed to load emails</option>').trigger(
                                'change.select2');
                        if (callback) callback(new Error('Failed to fetch email accounts'));
                        });
                } else if (selectId.startsWith('sequence-template-')) {
                    fetchPromise = axios.get('/drift/templates', {
                            headers: {
                                'X-CSRF-TOKEN': csrfToken
                            }
                    }).then(response => {
                        const templates = Array.isArray(response.data) ? response.data : [];
                            $select.empty().append('<option value="">-- Select Template --</option>');
                            templates.forEach(template => {
                                $select.append(
                                    `<option value="${template.id}">${template.title || template.id}</option>`
                                    );
                            });
                            console.log(`[Select2] Populated templates for ${selectId}`, templates);
                            setSelectedOptions($select, $select.data('selected'));
                    }).catch(error => {
                            console.error(`[Select2] Failed to fetch templates for ${selectId}:`, error);
                            $select.empty().append('<option value="">Failed to load templates</option>')
                                .trigger('change.select2');
                        if (callback) callback(new Error('Failed to fetch templates'));
                        });
                } else if (selectId.startsWith('sequence-audience-')) {
                    fetchPromise = axios.get('/drift/audiences', {
                            headers: {
                                'X-CSRF-TOKEN': csrfToken
                            }
                    }).then(response => {
                        const audiences = Array.isArray(response.data) ? response.data : [];
                            $select.empty().append('<option value="">-- Select Audience --</option>');
                            audiences.forEach(audience => {
                                $select.append(
                                    `<option value="${audience.id}">${audience.name || audience.id}</option>`
                                    );
                            });
                            console.log(`[Select2] Populated audiences for ${selectId}`, audiences);
                            setSelectedOptions($select, $select.data('selected'));
                    }).catch(error => {
                            console.error(`[Select2] Failed to fetch audiences for ${selectId}:`, error);
                            $select.empty().append('<option value="">Failed to load audiences</option>')
                                .trigger('change.select2');
                        if (callback) callback(new Error('Failed to fetch audiences'));
                        });
                } else if (selectId.startsWith('sequence-report-filters-')) {
                    fetchPromise = axios.get('/drift/report-filters', {
                            headers: {
                                'X-CSRF-TOKEN': csrfToken
                            }
                    }).then(response => {
                        const filters = Array.isArray(response.data) ? response.data : [];
                            $select.empty().append('<option value="">Select Filter(s)</option>');
                            filters.forEach(filter => {
                                $select.append(
                                    `<option value="${filter.id}">${filter.name || filter.id}</option>`
                                    );
                            });
                            $select.data('options', filters);
                        console.log(`[Select2] Populated filters for ${selectId}`, filters);
                            setSelectedOptions($select, $select.data('selected'));
                    }).catch(error => {
                            console.error(`[Select2] Failed to fetch report filters for ${selectId}:`, error);
                        $select.empty().append('<option value="">Failed to load filters</option>').trigger(
                            'change.select2');
                            $select.data('options', []);
                        if (callback) callback(new Error('Failed to fetch report filters'));
                        });
                }

                // Debug dropdown open
                $select.off('.initializeSelect2').on('select2:open.initializeSelect2', function() {
                    console.log(`[Select2] Opened ${selectId}. Current options:`, $select.find('option')
                        .map(function() {
                            return $(this).val();
                        }).get());
                });

                // Handle "Select All" for multi-select
                if ($select.prop('multiple')) {
                    $select.off('select2:select.selectall select2:unselect.selectall').on(
                        'select2:select.selectall select2:unselect.selectall',
                        function() {
                            const vals = $select.val() || [];
                            if (vals.includes('__select_all__')) {
                                const all = $select.find('option').map(function() {
                                    const v = $(this).val();
                                    return v && v !== '__select_all__' && v !== '' ? v : null;
                                }).get().filter(Boolean);
                                $select.val(all).trigger('change.select2');
                            }
                        });
                }

                // Handle callback
                if (fetchPromise && callback) {
                    fetchPromise.then(() => {
                        console.log(`[Select2] Fetch completed for ${selectId}`);
                        callback();
                    }).catch(() => {
                        console.error(`[Select2] Fetch failed for ${selectId}, but running callback.`);
                        callback(new Error('Fetch failed'));
                    });
                } else if (callback && !fetchPromise) {
                    console.log(`[Select2] No fetch required for ${selectId}, running callback.`);
                    setSelectedOptions($select, $select.data('selected'));
                    callback();
                }

                // Initial change trigger if value present
                if ($select.val() && $select.val().length > 0) {
                    console.log(`[Select2] Initial change triggered for ${selectId} with value:`, $select.val());
                    $select.trigger('change.select2');
                }
            }

            // Handle editor type switch
            $('#editor-switch').on('change', function() {
                const type = $(this).val();
                const title = $('#editor-title').val();
                const id = $('#template-id').val();
                let content = '';

                // Get current content
                if (type === 'wysiwyg' && tinymceEditor) {
                    content = tinymceEditor.getContent();
                } else {
                    content = $('#code-editor').val();
                }

                const $spinner = $('#tinymce-loading');
                const $editorContainer = $('#tinymce-editor-container');
                const $codeEditorContainer = $('#code-editor-container');
                const $errorContainer = $('#editor-error');
                const idParts = $select.attr('id').split('-');
                const setId = idParts[2];
                const tabIndex = idParts[3];
                const $subjectInput = $(`#sequence-subject-${setId}-${tabIndex}`);

                // Disable subject field
                $subjectInput.prop('disabled', true);

                if (!templateId) {
                    $subjectInput.val('').prop('disabled', true);
                    return;
                }

                // Fetch template details
                axios.get(`/drift/templates/${templateId}`, {
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        }
                    })
                    .then(response => {
                        const template = response.data;
                        if (template && template.subject) {
                            $subjectInput.val(template.subject).prop('disabled', true);
                        } else {
                            $subjectInput.val('').prop('disabled', true);
                        }
                    })
                    .catch(error => {
                        console.error('Failed to fetch template subject:', error);
                        $subjectInput.val('').prop('disabled', true);
                        toastr.error('Failed to load template subject.');
                    });
            });
            // Populate sequence form with saved data
            function populateSequenceForm(setId, tabIndex, sequence) {
                const $form = $(`#sequence-${setId}-${tabIndex}-form`);
                const $nameInput = $(`#sequence-name-${setId}-${tabIndex}`);
                const $subjectInput = $(`#sequence-subject-${setId}-${tabIndex}`);
                const $templateSelect = $(`#sequence-template-${setId}-${tabIndex}`);
                const $audienceSelect = $(`#sequence-audience-${setId}-${tabIndex}`);
                const $fromEmailSelect = $(`#sequence-from-email-${setId}-${tabIndex}`);
                const $timeGapInput = $(`#sequence-time-gap-${setId}-${tabIndex}`);
                const $batchSizeInput = $(`#sequence-batch-size-${setId}-${tabIndex}`);
                const $waitTimeInput = $(`#sequence-wait-time-${setId}-${tabIndex}`);
                const $waitUnitSelect = $(`#sequence-wait-unit-${setId}-${tabIndex}`);
                const $reportFiltersSelect = $(`#sequence-report-filters-${setId}-${tabIndex}`);

                // Populate non-dropdown fields
                $form.find('input[name="sequence_id"]').val(sequence.sequence_id || sequence.id || '');
                $nameInput.val(sequence.name || `Sequence ${tabIndex}`);
                $timeGapInput.val(sequence.time_gap || '');
                $batchSizeInput.val(sequence.batch_size || '');
                $waitTimeInput.val(sequence.wait_time || 0);
                $waitUnitSelect.val(sequence.wait_unit || 'minutes').trigger('change');

    // Set .data('selected') for dropdowns
    $templateSelect.data('selected', sequence.template_id || '');
    if (tabIndex === 1) {
        $audienceSelect.data('selected', sequence.audience_id || '');
    }
    // From emails
                                let fromEmails = [];
                                if (Array.isArray(sequence.from_emails)) {
                                    fromEmails = sequence.from_emails;
                                } else if (typeof sequence.from_emails === 'string') {
                                    try {
                                        fromEmails = JSON.parse(sequence.from_emails);
            if (!Array.isArray(fromEmails)) fromEmails = [fromEmails];
                                    } catch (e) {
                                        fromEmails = sequence.from_emails.split(',').map(email => email.trim()).filter(Boolean);
                                    }
                                }
    $fromEmailSelect.data('selected', fromEmails);

    // Report filters (tabIndex > 1)
                            if (tabIndex > 1) {
        let filters = [];
        if (Array.isArray(sequence.categories)) {
            filters = sequence.categories;
        } else if (typeof sequence.categories === 'string') {
            try {
                filters = JSON.parse(sequence.categories);
                if (!Array.isArray(filters)) filters = [filters];
            } catch (e) {
                filters = sequence.categories.split(',').map(f => f.trim()).filter(Boolean);
            }
        }
        $reportFiltersSelect.data('selected', filters);
    }

    // --- Assignment Mode and Manual Assignments Population ---
    if (tabIndex === 1) {
        const $assignmentModeSelect = $(`#assignment-mode-${setId}-${tabIndex}`);
        // Only initialize Select2 if not already initialized
        if (!$assignmentModeSelect.data('select2Initialized')) {
            initializeSelect2($assignmentModeSelect, () => {
                $assignmentModeSelect.data('select2Initialized', true);
            });
        }
        // Use the value from the backend, default to 'batch_size' if missing
        const assignmentMode = (sequence.assignment_mode === undefined || sequence.assignment_mode === null || sequence.assignment_mode === '') ? 'batch_size' : sequence.assignment_mode;
        $assignmentModeSelect.val(assignmentMode).trigger('change.select2');

        // Set batch size or manual assignments field
        if (assignmentMode === 'batch_size') {
            $(`#sequence-batch-size-${setId}-${tabIndex}`).val(sequence.batch_size || '');
            $(`#sequence-manual-assignments-${setId}-${tabIndex}`).val('');
        } else if (assignmentMode === 'manual_assign') {
            $(`#sequence-batch-size-${setId}-${tabIndex}`).val('');
            // Accept both stringified and object manual_assignments
            let manualAssignments = sequence.manual_assignments || {};
            if (typeof manualAssignments !== 'string') {
                manualAssignments = JSON.stringify(manualAssignments);
            }
            $(`#sequence-manual-assignments-${setId}-${tabIndex}`).val(manualAssignments);
        }
    }

    // Initialize Select2 for each (except report filters, which is handled in fetchReportCategories)
    initializeSelect2($templateSelect);
    if (tabIndex === 1) initializeSelect2($audienceSelect);
    initializeSelect2($fromEmailSelect);
    // Do NOT call initializeSelect2($reportFiltersSelect) here!
            }
            // Modal HTML (append to the end of the body in drift-emails.blade.php)
            $('body').append(`
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
`);

            // Flag to prevent multiple simultaneous AJAX calls
            let isFetchingSubscriberCount = false;

            // Updated Configure Assignment button click handler
            $(document).on('click', '.configure-assignment', function() {
                const $btn = $(this);
                const setId = String($btn.data('set-id')); // Ensure string
                const tabIndex = String($btn.data('tab-index')); // Ensure string
                const assignmentMode = $(`#assignment-mode-${setId}-${tabIndex}`).val();
                const $fromEmailSelect = $(`#sequence-from-email-${setId}-${tabIndex}`);
                const fromEmails = ($fromEmailSelect.val() || []).filter(email => email !==
                    '__select_all__');

                // Store current setId, tabIndex, and mode in modal
                $('#assignmentModal').data('set-id', setId)
                    .data('tab-index', tabIndex)
                    .data('assignment-mode', assignmentMode);

                // Debug log
                console.log('[DEBUG] Configure Assignment - setId:', setId, 'tabIndex:', tabIndex,
                    'assignmentMode:', assignmentMode, 'fromEmails:', fromEmails);

                // Populate modal content based on assignment mode
                const $modalBody = $('#assignmentModalBody');
                $modalBody.empty();

                if (assignmentMode === 'batch_size') {
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
                    const batchSize = $(`#sequence-batch-size-${setId}-${tabIndex}`).val() || '2';
                    $('#modal-batch-size-input').val(batchSize);
                } else {
                    // Manual assignment mode
                    const fromEmailsDisplay = fromEmails.length > 0 ? fromEmails.map(email => {
                        const account = emailAccountsData.find(acc => acc.email === email);
                        return account ? `${email} (${account.daily_send_limit})` : email;
                    }).join(', ') : 'None';
                    $modalBody.append(`
                    <div id="modal-manual-assign-section">
                        <p><strong>Total Subscribers:</strong> <span id="modal-total-subscribers">0</span></p>
                        <p><strong>Selected From Emails:</strong> <span id="modal-from-emails-list">${fromEmailsDisplay}</span></p>
                        <div id="modal-manual-assignments"></div>
                        <p><strong>Total Assigned:</strong> <span id="modal-total-assigned">0</span></p>
                        <div id="modal-manual-assign-warning" class="alert alert-warning mt-2" style="display: none;">
                            Warning: <span id="modal-manual-assign-skipped">0</span> subscribers are unassigned.
                        </div>
                        <button type="button" class="btn btn-primary mt-3" id="save-assignments-btn">Save Assignments</button>
                    </div>
                `);
                }


                // Show modal and fetch subscriber count after DOM is ready
                $('#assignmentModal').one('shown.bs.modal', function() {
                    const audienceId = $(`#sequence-audience-${setId}-${tabIndex}`).val();
                    console.log('[DEBUG] Modal shown, audienceId from form:', audienceId,
                        'setId:', setId, 'tabIndex:', tabIndex, 'fromEmails:', fromEmails);
                    if (!audienceId) {
                        console.warn('[DEBUG] No audienceId found for setId:', setId,
                            'tabIndex:', tabIndex,
                            'Check if audience is selected or form is populated correctly.');
                    }
                    if ($('#modal-total-subscribers').length) {
                        console.log('[DEBUG] modal-total-subscribers element exists in DOM');
                    } else {
                        console.error('[DEBUG] modal-total-subscribers element not found in DOM');
                    }
                    fetchSubscriberCount(setId, tabIndex, audienceId, 0);
                    if (assignmentMode === 'manual_assign' && fromEmails.length > 0) {
                        updateModalAssignments(setId, tabIndex);
                    }
                });

                // Show modal
                $('#assignmentModal').modal('show');
            });

            // Existing Save Assignments handler (unchanged, included for completeness)
            $(document).on('click', '#save-assignments-btn', function() {
                const $btn = $(this);
                const $modalBody = $('#assignmentModalBody');
                const setId = $('#assignmentModal').data('set-id');
                const tabIndex = $('#assignmentModal').data('tab-index');
                const $form = $(`#sequence-${setId}-${tabIndex}-form`);

                $btn.prop('disabled', true);
                const assignments = {};
                $modalBody.find('input[name^="assignments"]').each(function() {
                    const email = $(this).attr('name').match(/assignments\[(.*)\]/)[1];
                    const value = parseInt($(this).val()) || 0;
                    if (value > 0) {
                        assignments[email] = value;
                    }
                });

                // Save assignments to hidden input
                $form.find(`#sequence-manual-assignments-${setId}-${tabIndex}`).val(JSON.stringify(
                    assignments));
                $('#assignmentModal').modal('hide');
                $btn.prop('disabled', false);
            });
            // Fetch subscriber count for audience with retry mechanism
            function fetchSubscriberCount(setId, tabIndex, audienceId, retryCount = 0, maxRetries = 3) {
                if (isFetchingSubscriberCount) {

                    return;
                }
                isFetchingSubscriberCount = true;

                const $target = $('#modal-total-subscribers');
                if (!$target.length) {

                    isFetchingSubscriberCount = false;
                    if (retryCount < maxRetries) {
                        setTimeout(() => fetchSubscriberCount(setId, tabIndex, audienceId, retryCount + 1), 100);
                    }
                    updateModalWarnings(setId, tabIndex);
                    return;
                }
                if (!audienceId) {

                    $target.text('0');
                    $target.data('count', 0);
                    isFetchingSubscriberCount = false;
                    updateModalWarnings(setId, tabIndex);
                    return;
                }


                $.ajax({
                    url: `/api/audience/${audienceId}/subscriber-count`,
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    beforeSend: function() {

                    },
                    success: function(data, textStatus, jqXHR) {

                        const count = data.count !== undefined ? data.count : 0;
                        $target.text(count);
                        $target.data('count', count);
                        isFetchingSubscriberCount = false;
                        updateModalWarnings(setId, tabIndex);
                    },
                    error: function(xhr) {

                        isFetchingSubscriberCount = false;
                        if (retryCount < maxRetries) {

                            setTimeout(() => fetchSubscriberCount(setId, tabIndex, audienceId,
                                retryCount + 1), 100);
                        } else {
                            $target.text('0');
                            $target.data('count', 0);
                            updateModalWarnings(setId, tabIndex);
                        }
                    },
                    complete: function() {

                        isFetchingSubscriberCount = false;
                    }
                });
            }

            // Update manual assignment inputs in modal with daily_send_limit
            function updateModalAssignments(setId, tabIndex) {
                const $fromEmailSelect = $(`#sequence-from-email-${setId}-${tabIndex}`);
                const fromEmails = ($fromEmailSelect.val() || []).filter(email => email !== '__select_all__');
                const $assignmentsContainer = $('#modal-manual-assignments');
                const $fromEmailsList = $('#modal-from-emails-list');

                console.log('[DEBUG] updateModalAssignments - setId:', setId, 'tabIndex:', tabIndex,
                    'fromEmails:', fromEmails);

                // Update Selected From Emails list with daily_send_limit
                const fromEmailsDisplay = fromEmails.length > 0 ? fromEmails.map(email => {
                    const account = emailAccountsData.find(acc => acc.email === email);
                    return account ? `${email} (${account.daily_send_limit})` : email;
                }).join(', ') : 'None';
                $fromEmailsList.text(fromEmailsDisplay);

                // Populate assignment inputs
                $assignmentsContainer.empty();
                if (fromEmails.length > 0) {
                    fromEmails.forEach(email => {
                        const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '');
                        const account = emailAccountsData.find(acc => acc.email === email);
                        const displayText = account ? `${email} (${account.daily_send_limit})` : email;
                        $assignmentsContainer.append(`
                        <div class="mb-2">
                            <label for="modal-manual-assign-${safeEmail}" class="form-label">${displayText}</label>
                            <input type="number" class="form-control modal-manual-assign-input" 
                                   id="modal-manual-assign-${safeEmail}" 
                                   name="assignments[${email}]" 
                                   data-email="${email}" min="0" value="0">
                        </div>
                    `);
                    });

                    // Load existing assignments
                    const existingAssignments = $(`#sequence-manual-assignments-${setId}-${tabIndex}`).val();
                    if (existingAssignments) {
                        try {
                            const assignments = JSON.parse(existingAssignments || '{}');
                            Object.keys(assignments).forEach(email => {
                                const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '');
                                $(`#modal-manual-assign-${safeEmail}`).val(assignments[email] || 0);
                            });
                        } catch (e) {
                            console.error('[DEBUG] Failed to parse existing assignments:', e);
                        }
                    }
                }

                // Update totals and warnings
                updateModalWarnings(setId, tabIndex);
            }


            // Update warnings in modal
            function updateModalWarnings(setId, tabIndex) {
                const mode = $('#assignmentModal').data('assignment-mode');
                const totalSubscribers = parseInt($('#modal-total-subscribers').text()) || 0;
                const fromEmails = ($(`#sequence-from-email-${setId}-${tabIndex}`).val() || []).filter(email =>
                    email !== '__select_all__');

                console.log('[DEBUG] updateModalWarnings - setId:', setId, 'tabIndex:', tabIndex,
                    'mode:', mode, 'totalSubscribers:', totalSubscribers, 'fromEmails:', fromEmails);

                if (mode === 'batch_size') {
                    const batchSize = parseInt($('#modal-batch-size-input').val()) || 0;
                    const totalAssigned = batchSize * fromEmails.length;
                    const skipped = totalSubscribers - totalAssigned;
                    $('#modal-batch-size-skipped').text(skipped > 0 ? skipped : 0);
                    $('#modal-batch-size-warning').toggle(skipped > 0);
                } else {
                    let totalAssigned = 0;
                    $('.modal-manual-assign-input').each(function() {
                        totalAssigned += parseInt($(this).val()) || 0;
                    });
                    const skipped = totalSubscribers - totalAssigned;
                    $('#modal-total-assigned').text(totalAssigned);
                    $('#modal-manual-assign-skipped').text(skipped > 0 ? skipped : 0);
                    $('#modal-manual-assign-warning').toggle(skipped > 0);
                }
            }

            // Handle modal save
            $(document).on('click', '#modal-save-assignment', function() {
                const setId = $('#assignmentModal').data('set-id');
                const tabIndex = $('#assignmentModal').data('tab-index');
                const mode = $('#assignmentModal').data('assignment-mode');

                console.log('Saving modal, mode:', mode, 'setId:', setId, 'tabIndex:', tabIndex);
                // Update form fields
                $(`#assignment-mode-${setId}-${tabIndex}`).val(mode);
                if (mode === 'batch_size') {
                    const batchSize = $('#modal-batch-size-input').val();
                    $(`#sequence-batch-size-${setId}-${tabIndex}`).val(batchSize);
                    $(`#sequence-manual-assignments-${setId}-${tabIndex}`).val('');
                } else {
                    const assignments = {};
                    $('.modal-manual-assign-input').each(function() {
                        const email = $(this).data('email');
                        const count = parseInt($(this).val()) || 0;
                        assignments[email] = count;
                    });
                    $(`#sequence-batch-size-${setId}-${tabIndex}`).val('');
                    $(`#sequence-manual-assignments-${setId}-${tabIndex}`).val(JSON.stringify(assignments));
                }

                $('#assignmentModal').modal('hide');
            });

            // Handle audience change to fetch subscriber count
            $(document).on('change', '[id^="sequence-audience-"]', function() {
                const $select = $(this);
                const setId = $select.attr('id').split('-')[2];
                const tabIndex = $select.attr('id').split('-')[3];
                const audienceId = $select.val();
                if (tabIndex == 1) {
                    console.log('Audience changed, fetching subscriber count for audienceId:', audienceId);
                    fetchSubscriberCount(setId, tabIndex, audienceId);
                }
            });

            // Handle from email change to update modal assignments
            $(document).on('change', '[id^="sequence-from-email-"]', function() {
                const $select = $(this);
                const setId = $select.attr('id').split('-')[2];
                const tabIndex = $select.attr('id').split('-')[3];
                if (tabIndex == 1 && $('#assignmentModal').is(':visible')) {
                    console.log('From emails changed, updating modal assignments');
                    updateModalAssignments(setId, tabIndex);
                }
            });

            // Handle manual assignment input changes
            $(document).on('input', '.modal-manual-assign-input', function() {
                const setId = $('#assignmentModal').data('set-id');
                const tabIndex = $('#assignmentModal').data('tab-index');
                updateModalWarnings(setId, tabIndex);
            });
            // Handle Assignment Mode toggle
            $(document).on('change', '[id^="assignment-mode-"]', function() {
                const $select = $(this);
                const setId = $select.attr('id').split('-')[2];
                const tabIndex = $select.attr('id').split('-')[3];
                const mode = $select.val();
                $(`#batch-size-section-${setId}-${tabIndex}`).toggle(mode === 'batch_size');
                $(`#manual-assign-section-${setId}-${tabIndex}`).toggle(mode === 'manual_assign');
                $(`#sequence-batch-size-${setId}-${tabIndex}`).prop('required', mode === 'batch_size');
                updateAssignmentWarnings(setId, tabIndex);
            });

            // Update assignment warnings for main form
            function updateAssignmentWarnings(setId, tabIndex) {
                const mode = $(`#assignment-mode-${setId}-${tabIndex}`).val();
                const totalSubscribers = parseInt($(`#total-subscribers-${setId}-${tabIndex}`).text()) || 0;
                const $fromEmailSelect = $(`#sequence-from-email-${setId}-${tabIndex}`);
                const fromEmails = ($fromEmailSelect.val() || []).filter(email => email !== '__select_all__');

                console.log('[DEBUG] updateAssignmentWarnings - setId:', setId, 'tabIndex:', tabIndex,
                    'mode:', mode, 'totalSubscribers:', totalSubscribers, 'fromEmails:', fromEmails);

                if (mode === 'batch_size') {
                    const batchSize = parseInt($(`#sequence-batch-size-${setId}-${tabIndex}`).val()) || 0;
                    const totalAssigned = batchSize * fromEmails.length;
                    const skipped = totalSubscribers - totalAssigned;
                    $(`#batch-size-skipped-${setId}-${tabIndex}`).text(skipped > 0 ? skipped : 0);
                    $(`#batch-size-warning-${setId}-${tabIndex}`).toggle(skipped > 0);
                } else {
                    let totalAssigned = 0;
                    const assignments = JSON.parse($(`#sequence-manual-assignments-${setId}-${tabIndex}`).val() ||
                        '{}');
                    Object.values(assignments).forEach(value => {
                        totalAssigned += parseInt(value) || 0;
                    });
                    const skipped = totalSubscribers - totalAssigned;
                    $(`#total-assigned-${setId}-${tabIndex}`).text(totalAssigned);
                    $(`#manual-assign-skipped-${setId}-${tabIndex}`).text(skipped > 0 ? skipped : 0);
                    $(`#manual-assign-warning-${setId}-${tabIndex}`).toggle(skipped > 0);
                }
            }

            // Update warnings for batch size and manual assign
            // function updateAssignmentWarnings(setId, tabIndex) {
            //     const mode = $(`#assignment-mode-${setId}-${tabIndex}`).val();
            //     const totalSubscribers = parseInt($(`#total-subscribers-${setId}-${tabIndex}`).text()) || 0;
            //     const $fromEmailSelect = $(`#sequence-from-email-${setId}-${tabIndex}`);
            //     const fromEmails = ($fromEmailSelect.val() || []).filter(email => email !== '__select_all__');

            //     console.log('[DEBUG] updateAssignmentWarnings - setId:', setId, 'tabIndex:', tabIndex,
            //         'mode:', mode, 'totalSubscribers:', totalSubscribers, 'fromEmails:', fromEmails);

            //     if (mode === 'batch_size') {
            //         const batchSize = parseInt($(`#sequence-batch-size-${setId}-${tabIndex}`).val()) || 0;
            //         const totalAssigned = batchSize * fromEmails.length;
            //         const skipped = totalSubscribers - totalAssigned;
            //         $(`#batch-size-skipped-${setId}-${tabIndex}`).text(skipped > 0 ? skipped : 0);
            //         $(`#batch-size-warning-${setId}-${tabIndex}`).toggle(skipped > 0);
            //     } else {
            //         let totalAssigned = 0;
            //         const assignments = JSON.parse($(`#sequence-manual-assignments-${setId}-${tabIndex}`).val() ||
            //             '{}');
            //         Object.values(assignments).forEach(value => {
            //             totalAssigned += parseInt(value) || 0;
            //         });
            //         const skipped = totalSubscribers - totalAssigned;
            //         $(`#total-assigned-${setId}-${tabIndex}`).text(totalAssigned);
            //         $(`#manual-assign-skipped-${setId}-${tabIndex}`).text(skipped > 0 ? skipped : 0);
            //         $(`#manual-assign-warning-${setId}-${tabIndex}`).toggle(skipped > 0);
            //     }
            // }
            // Handle audience change to fetch subscriber count
            $(document).on('change', '[id^="sequence-audience-"]', function() {
                const $select = $(this);
                const setId = $select.attr('id').split('-')[2];
                const tabIndex = $select.attr('id').split('-')[3];
                const audienceId = $select.val();
                if (tabIndex == 1) {
                    fetchSubscriberCount(setId, tabIndex, audienceId);
                }
            });

            // Handle from email change to update manual assignments
            $(document).on('change', '[id^="sequence-from-email-"]', function() {
                const $select = $(this);
                const setId = $select.attr('id').split('-')[2];
                const tabIndex = $select.attr('id').split('-')[3];
                if (tabIndex == 1) {
                    updateManualAssignments(setId, tabIndex);
                }
            });

            // Handle manual assignment input changes
            $(document).on('input', '.manual-assign-input', function() {
                const setId = $(this).attr('id').split('-')[2];
                const tabIndex = $(this).attr('id').split('-')[3];
                updateAssignmentWarnings(setId, tabIndex);
            });

            $(document).on('submit', '[id^=sequence-][id$=-form]', function(e) {
                e.preventDefault();
                const $form = $(this);
                const setId = $form.attr('id').split('-')[1];
                const tabIndex = $form.attr('id').split('-')[2];
                const sequenceId = sequenceIdsMap[setId][tabIndex] || null;

                if (!validateForm(sequenceId, tabIndex, setId)) {
                    console.error(`Validation failed for sequence ${tabIndex}, set ${setId}`);
                    return;
                }

                const data = {
                    sequence_id: sequenceId || null,
                    set_id: setId,
                    name: $form.find(`#sequence-name-${setId}-${tabIndex}`).val(),
                    subject: $form.find(`#sequence-subject-${setId}-${tabIndex}`).val(),
                    template_id: $form.find(`#sequence-template-${setId}-${tabIndex}`).val(),
                    from_emails: $form.find(`#sequence-from-email-${setId}-${tabIndex}`).val() || [],
                    time_gap: tabIndex == 1 ? parseInt($form.find(
                        `#sequence-time-gap-${setId}-${tabIndex}`).val()) || null : null,
                    wait_time: parseInt($form.find(`#sequence-wait-time-${setId}-${tabIndex}`).val()) ||
                        0,
                    wait_unit: $form.find(`#sequence-wait-unit-${setId}-${tabIndex}`).val() ||
                        'minutes',
                    sequence_number: parseInt(tabIndex),
                };

                if (tabIndex == 1) {
                    data.audience_id = $form.find(`#sequence-audience-${setId}-${tabIndex}`).val();
                    data.assignment_mode = $form.find(`#assignment-mode-${setId}-${tabIndex}`).val() ||
                        'batch_size';
                    if (data.assignment_mode === 'batch_size') {
                        data.batch_size = parseInt($form.find(`#sequence-batch-size-${setId}-${tabIndex}`)
                            .val()) || null;
                    } else {
                        data.manual_assignments = $form.find(
                            `#sequence-manual-assignments-${setId}-${tabIndex}`).val() ? JSON.parse(
                            $form.find(`#sequence-manual-assignments-${setId}-${tabIndex}`).val()) : {};
                    }
                } else {
                    // For sequence 2+, only send filters, not categories
                    data.filters = $form.find(`#sequence-report-filters-${setId}-${tabIndex}`).val() || [];
                    // Remove any accidental categories property
                    if (data.categories) delete data.categories;
                }

                console.log(`Form fields for sequence ${tabIndex}, set ${setId}:`, {
                    name: $form.find(`#sequence-name-${setId}-${tabIndex}`).val(),
                    subject: $form.find(`#sequence-subject-${setId}-${tabIndex}`).val(),
                    template_id: $form.find(`#sequence-template-${setId}-${tabIndex}`).val(),
                    from_emails: $form.find(`#sequence-from-email-${setId}-${tabIndex}`).val(),
                    time_gap: $form.find(`#sequence-time-gap-${setId}-${tabIndex}`).val(),
                    wait_time: $form.find(`#sequence-wait-time-${setId}-${tabIndex}`).val(),
                    wait_unit: $form.find(`#sequence-wait-unit-${setId}-${tabIndex}`).val(),
                    audience_id: $form.find(`#sequence-audience-${setId}-${tabIndex}`).val(),
                    assignment_mode: $form.find(`#assignment-mode-${setId}-${tabIndex}`).val(),
                    manual_assignments: $form.find(
                        `#sequence-manual-assignments-${setId}-${tabIndex}`).val()
                });

                console.log(`Submitting single sequence ${tabIndex} for set ${setId}:`, {
                    sequences: [data],
                    set_id: setId
                });

                axios.post('/drift/save-sequences', {
                        sequences: [data],
                        set_id: setId,
                        _token: $('meta[name="csrf-token"]').attr('content')
                    })
                    .then(response => {
                        console.log(`Single sequence ${tabIndex} saved successfully:`, response.data);
                        toastr.success('Sequence saved successfully!');
                        if (!sequenceId) {
                            sequenceIdsMap[setId][tabIndex] = response.data.sequences[0].id;
                            $form.find('input[name="sequence_id"]').val(response.data.sequences[0].id);
                            $(`#sequence-${setId}-${tabIndex}`).attr('data-sequence', response.data
                                .sequences[0].id);
                        }
                    })
                    .catch(error => {
                        console.error(`Failed to save sequence ${tabIndex}:`, error);
                        toastr.error('Failed to save sequence: ' + (error.response?.data?.error ||
                            'Unknown error'));
                    });
            });
            // Update wait time fields' enabled/disabled state
            function updateWaitTimeFields(setId) {
                const $tabs = $(`#sequenceTabs-${setId} li.nav-item`).not(`#add-sequence-btn-${setId}`);
                $tabs.each(function(index) {
                    const tabIndex = index + 1;
                    const isLast = index === $tabs.length - 1;
                    const $waitTime = $(`#sequence-wait-time-${setId}-${tabIndex}`);
                    const $waitUnit = $(`#sequence-wait-unit-${setId}-${tabIndex}`);
                    $waitTime.prop('disabled', isLast);
                    $waitUnit.prop('disabled', isLast);
                    if (isLast) {
                        $waitTime.val(0);
                        $waitTime.removeAttr('required');
                    } else {
                        $waitTime.attr('required', 'required');
                    }
                });
            }

            // Create sequence tab
            function createSequenceTab(tabIndex, sequenceId, sequenceName = `Sequence ${tabIndex}`, setId,
                sequenceTabsId = 'sequenceTabs', sequenceTabContentId = 'sequenceTabContent', sequenceCount = 1) {

                if (!sequenceIdsMap[setId]) sequenceIdsMap[setId] = {};
                sequenceIdsMap[setId][tabIndex] = String(sequenceId);
                const seqId = String(sequenceId);
                const isActive = tabIndex === 1 ? 'active' : '';
                const isShowActive = tabIndex === 1 ? 'show active' : '';

                // Remove all existing delete buttons
                // $(`#${sequenceTabsId} .delete-sequence-tab`).remove();

                // No delete button
                const newSequenceTab = `
        <li class="nav-item">
            <button class="nav-link ${isActive}" id="sequence-tab-${setId}-${tabIndex}" data-bs-toggle="tab"
                data-bs-target="#sequence-${setId}-${tabIndex}" type="button" role="tab"
                aria-controls="sequence-${setId}-${tabIndex}" aria-selected="${tabIndex === 1}">
                Sequence ${tabIndex}
            </button>
        </li>
    `;
                if ($(`#add-sequence-btn-${setId}`).length) {
                    $(`#add-sequence-btn-${setId}`).remove();
                }
                $(`#${sequenceTabsId}-${setId}`).append(newSequenceTab);
                if (tabIndex === sequenceCount) {
                    $(`#${sequenceTabsId}-${setId}`).append(`
            <li id="add-sequence-btn-${setId}"
                title="Add New Sequence"
                style="display: flex; align-items: center; justify-content: center; color: #1db4cd; width: 22px; height: 39px; border-radius: 50%; cursor: pointer;">
                <i class="bi bi-plus " style="font-size: 30px;"></i>
            </li>
        `);
                }
                const newSequenceContent = `
        <div class="tab-pane fade drift-sequence-box ${isShowActive}" id="sequence-${setId}-${tabIndex}" 
            role="tabpanel" aria-labelledby="sequence-tab-${setId}-${tabIndex}" data-sequence="${seqId}" data-set="${setId}">
            <div class="card">
                <div class="card-header">
                    Sequence ${tabIndex}
                    <div>
                        <button class="btn btn-danger btn-sm cancel-sequence ms-2" data-sequence="${seqId}" disabled>
                            Cancel
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <form id="sequence-${setId}-${tabIndex}-form">
                        @csrf
                        <input type="hidden" name="set_id" value="${setId}">
                        <input type="hidden" name="sequence_id" value="${seqId}">
                        <input type="hidden" id="sequence-batch-size-${setId}-${tabIndex}" name="batch_size">
                        <input type="hidden" id="sequence-manual-assignments-${setId}-${tabIndex}" name="manual_assignments">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label for="sequence-name-${setId}-${tabIndex}" class="form-label">Sequence Name</label>
                                <input type="text" class="form-control" id="sequence-name-${setId}-${tabIndex}" 
                                    name="name" placeholder="Enter sequence name" value="${sequenceName}" required>
                            </div>
                            <div class="col-md-6">
                                <label for="sequence-subject-${setId}-${tabIndex}" class="form-label">Subject</label>
                                <input type="text" class="form-control" id="sequence-subject-${setId}-${tabIndex}" 
                                    name="subject" maxlength="255" required placeholder="Enter email subject" readonly>
                            </div>
                            <div class="col-md-6">
                                <label for="sequence-template-${setId}-${tabIndex}" class="form-label">Select Template</label>
                                <div class="input-group" style="flex-wrap:nowrap; align-items:center;">
                                    <select class="form-control" id="sequence-template-${setId}-${tabIndex}"
                                        name="template_id" required style="max-width:300px; min-width:120px; flex-shrink:1;">
                                        <option value="">-- Select Template --</option>
                                    </select>
                                    <button type="button" class="btn btn-outline-primary create-template" style="border-radius:6px; margin-left:8px; white-space:nowrap;">
                                        Create Template
                                    </button>
                                </div>
                            </div>
                            ${tabIndex === 1 ? `
                                                                                                                                                                                                                                                                                                                                                            <div class="col-md-6 d-flex align-items-center" style="gap:12px;">
                                                                                                                                                                                                                                                                                                                                                                <div style="width:100%;">
                                                                                                                                                                                                                                                                                                                                                                    <label for="sequence-audience-${setId}-${tabIndex}" class="form-label">Select Audience</label>
                                                                                                                                                                                                                                                                                                                                                                    <div class="d-flex align-items-center" style="gap:8px;">
                                                                                                                                                                                                                                                                                                                                                                        <select class="form-control" id="sequence-audience-${setId}-${tabIndex}"
                                                                                                                                                                                                                                                                                                                                                                            name="audience_id" required style="max-width:300px; min-width:120px; flex-shrink:1;">
                                                                                                                                                                                                                                                                                                                                                                            <option value="">-- Select Audience --</option>
                                                                                                                                                                                                                                                                                                                                                                        </select>
                                                                                                                                                                                                                                                                                                                                                                        <button type="button" class="btn btn-outline-primary create-audience" style="border-radius:6px; white-space:nowrap;">
                                                                                                                                                                                                                                                                                                                                                                            Create Audience
                                                                                                                                                                                                                                                                                                                                                                        </button>
                                                                                                                                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                                                            <div class="col-md-6">
                                                                                                                                                                                                                                                                                                                                                                <label for="sequence-time-gap-${setId}-${tabIndex}" class="form-label">
                                                                                                                                                                                                                                                                                                                                                                    Time Gap Between Batches (seconds)
                                                                                                                                                                                                                                                                                                                                                                    <i class="bi bi-info-circle" data-bs-toggle="tooltip" title="Time gap applies only between batches, not between emails within a batch."></i>
                                                                                                                                                                                                                                                                                                                                                                </label>
                                                                                                                                                                                                                                                                                                                                                                <input type="number" class="form-control" id="sequence-time-gap-${setId}-${tabIndex}" 
                                                                                                                                                                                                                                                                                                                                                                    name="time_gap" min="1" value="5" required>
                                                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                                                            <div class="col-md-6">
                                                                                                                                                                                                                                                                                                                                                                <label for="assignment-mode-${setId}-${tabIndex}" class="form-label">Assignment Mode</label>
                                                                                                                                                                                                                                                                                                                                                                <div class="input-group" style="flex-wrap:nowrap; align-items:center;">
                                                                                                                                                                                                                                                                                                                                                                    <select class="form-control" id="assignment-mode-${setId}-${tabIndex}" name="assignment_mode"
                                                                                                                                                                                                                                                                                                                                                                        style="max-width:300px; min-width:120px; flex-shrink:1;">
                                                                                                                                                                                                                                                                                                                                                                        <option value="batch_size">Batch Size</option>
                                                                                                                                                                                                                                                                                                                                                                        <option value="manual_assign">Manual Assign</option>
                                                                                                                                                                                                                                                                                                                                                                    </select>
                                                                                                                                                                                                                                                                                                                                                                    <button type="button" class="btn btn-outline-primary configure-assignment" 
                                                                                                                                                                                                                                                                                                                                                                        data-set-id="${setId}" data-tab-index="${tabIndex}" 
                                                                                                                                                                                                                                                                                                                                                                        style="border-radius:6px; margin-left:8px; white-space:nowrap;">
                                                                                                                                                                                                                                                                                                                                                                        Configure Assignment
                                                                                                                                                                                                                                                                                                                                                                    </button>
                                                                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                                                        ` : `
                                                                                                                                                                                                                                                                                                                                                            <div class="col-md-6">
                                                                                                                                                                                                                                                                                                                                                                <label for="sequence-report-filters-${setId}-${tabIndex}" class="form-label">Select Report Filters (Sequence ${tabIndex - 1})</label>
                                                                                                                                                                                                                                                                                                                                                                <select class="form-control dyna-select-dropdown" id="sequence-report-filters-${setId}-${tabIndex}"
                                                                                                                                                                                                                                                                                                                                                                    name="categories[]" multiple>
                                                                                                                                                                                                                                                                                                                                                                    <option value="__select_all__">-- Select All --</option>
                                                                                                                                                                                                                                                                                                                                                                </select>
                                                                                                                                                                                                                                                                                                                                                            </div>

                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                        `}
                            <div class="col-md-6">
                                <label for="sequence-from-email-${setId}-${tabIndex}" class="form-label">From Email</label>
                                <select class="form-control dyna-select-dropdown" id="sequence-from-email-${setId}-${tabIndex}"
                                    name="from_emails[]" multiple required>
                                    <option value="__select_all__">-- Select All --</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label for="sequence-wait-time-${setId}-${tabIndex}" class="form-label">Wait Time for Next Sequence</label>
                                <div class="input-group">
                                    <input type="number" class="form-control" id="sequence-wait-time-${setId}-${tabIndex}"
                                        name="wait_time" min="0" required>
                                    <select class="form-select" id="sequence-wait-unit-${setId}-${tabIndex}" name="wait_unit">
                                        <option value="minutes">Minutes</option>
                                        <option value="hours">Hours</option>
                                        <option value="days">Days</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="col-12">
                                    <div class="d-flex gap-2 flex-wrap mb-2">
                                        ${tabIndex === sequenceCount ? `
                                            <button type="button" class="btn btn-primary send-immediately" data-sequence="${seqId}" style="pointer-events:auto;z-index:1000;">Send Immediately</button>
                                            <button type="button" class="btn btn-primary schedule-sequence" data-sequence="${seqId}">Schedule</button>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="d-flex gap-2 justify-content-center">
                                        <button type="button" class="btn btn-outline-secondary prev-sequence" data-sequence="${seqId}" data-tab-index="${tabIndex}" data-set-id="${setId}" ${tabIndex === 1 ? 'disabled' : ''}>Previous</button>
                                        ${tabIndex === sequenceCount ? `
                                            <button type="button" class="btn btn-primary save-sequence-final" data-sequence="${seqId}" data-tab-index="${tabIndex}" data-set-id="${setId}">Save</button>
                                        ` : `<button type="button" class="btn btn-outline-secondary next-sequence" data-sequence="${seqId}" data-tab-index="${tabIndex}" data-set-id="${setId}">Next</button>`}
                                        <button type="button" class="btn btn-primary preview-email" data-sequence="${seqId}">Preview</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <input type="hidden" name="previous_sequence_id" value="${tabIndex === 1 ? '' : seqId}">
                    </form>
                </div>
                <!-- Reports Section with Loader -->
                <div class="reports-section mt-3" id="reports-${seqId}" style="display: none;">
                    <div class="card">
                        <div class="card-header bg-primary text-white d-flex align-items-center" style="font-size: 1.15rem; font-weight: bold;">
                            <span class="d-inline-flex align-items-center">Sequence ${tabIndex} Reports<i class="bi bi-bar-chart-fill ms-2" style="font-size: 1.2em;"></i>
                                <button type="button" class="refresh-reports-btn glassy-cute-btn ms-2" data-sequence="${seqId}" title="Refresh Reports" aria-label="Refresh Reports">
                                    <span class="glassy-cute-btn-inner">
                                        <i class="bi bi-arrow-clockwise cute-refresh-icon"></i>
                                    </span>
                                </button>
                            </span>
                        </div>
                        <div class="card-body">
                            <div id="reports-loading-${seqId}" class="text-center py-4" style="display: none;">
                                <div class="crazy-loader">
                                    <div class="loader-circle"></div>
                                    <div class="loader-circle"></div>
                                    <div class="loader-circle"></div>
                                    <p class="text-muted mt-2">Fetching reports, hold tight!</p>
                                </div>
                            </div>
                            <div id="reports-content-${seqId}" style="display: none;">
                                <div class="d-flex flex-row flex-wrap justify-content-center align-items-stretch gap-3 stats-card mb-3" style="overflow-x:auto;">
                                    <div class="report-category text-center flex-fill py-2 px-3 rounded shadow-sm bg-white border" data-sequence="${seqId}" data-category="sent" style="min-width:120px; cursor:pointer;">
                                        <span id="reports-sent-${seqId}" class="fw-bold fs-5 text-success">0</span>
                                        <div class="small mt-1">Sent</div>
                                    </div>
                                    <div class="report-category text-center flex-fill py-2 px-3 rounded shadow-sm bg-white border" data-sequence="${seqId}" data-category="replied" style="min-width:120px; cursor:pointer;">
                                        <span id="reports-replied-${seqId}" class="fw-bold fs-5 text-primary">0</span>
                                        <div class="small mt-1">Replied</div>
                                    </div>
                                </div>
                                <div class="d-flex flex-row flex-wrap justify-content-center align-items-stretch gap-3 stats-card" style="overflow-x:auto;">
                                    <div class="report-category text-center flex-fill py-2 px-3 rounded shadow-sm bg-white border" data-sequence="${seqId}" data-category="no_longer" style="min-width:120px; cursor:pointer;">
                                        <span id="reports-no_longer-${seqId}" class="fw-bold fs-5 text-secondary">0</span>
                                        <div class="small mt-1">No Longer</div>
                                    </div>
                                    <div class="report-category text-center flex-fill py-2 px-3 rounded shadow-sm bg-white border" data-sequence="${seqId}" data-category="automatic_reply" style="min-width:120px; cursor:pointer;">
                                        <span id="reports-automatic_reply-${seqId}" class="fw-bold fs-5 text-info">0</span>
                                        <div class="small mt-1">Automatic Reply</div>
                                    </div>
                                    <div class="report-category text-center flex-fill py-2 px-3 rounded shadow-sm bg-white border" data-sequence="${seqId}" data-category="unsubscribed" style="min-width:120px; cursor:pointer;">
                                        <span id="reports-unsubscribed-${seqId}" class="fw-bold fs-5 text-warning">0</span>
                                        <div class="small mt-1">Unsubscribed</div>
                                    </div>
                                    <div class="report-category text-center flex-fill py-2 px-3 rounded shadow-sm bg-white border" data-sequence="${seqId}" data-category="softbounce" style="min-width:120px; cursor:pointer;">
                                        <span id="reports-softbounce-${seqId}" class="fw-bold fs-5 text-danger">0</span>
                                        <div class="small mt-1">Softbounce</div>
                                    </div>
                                    <div class="report-category text-center flex-fill py-2 px-3 rounded shadow-sm bg-white border" data-sequence="${seqId}" data-category="hardbounce" style="min-width:120px; cursor:pointer;">
                                        <span id="reports-hardbounce-${seqId}" class="fw-bold fs-5 text-danger">0</span>
                                        <div class="small mt-1">Hardbounce</div>
                                    </div>
                                    <div class="report-category text-center flex-fill py-2 px-3 rounded shadow-sm bg-white border" data-sequence="${seqId}" data-category="unopened" style="min-width:120px; cursor:pointer;">
                                        <span id="reports-unopened-${seqId}" class="fw-bold fs-5 text-muted">0</span>
                                        <div class="small mt-1">Unopened</div>
                                    </div>
                                </div>
                            </div>
                            <div id="reports-message-${seqId}" class="text-info mt-3" style="display: none;">
                                This sequence has not been sent yet. No report data available.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

                $(`#${sequenceTabsId}`).append(newSequenceTab);
                $(`#${sequenceTabContentId}`).append(newSequenceContent);

                $(`#add-sequence-btn-${setId}`);

                if (tabIndex === sequenceCount) {
                    $(`#${sequenceTabsId}`).append(`
            <li id="add-sequence-btn-${setId}" 
                title="Add New Sequence" 
                style="display: flex; align-items: center; justify-content: center; color: #1db4cd; width: 22px; height: 39px; border-radius: 50%; cursor: pointer;">
                <i class="bi bi-plus " style="font-size: 30px;"></i>
            </li>
        `);
                }

                initializeSelect2(`#sequence-from-email-${setId}-${tabIndex}`);

                // if (tabIndex > 1) {
                //     fetchReportCategories(setId, tabIndex, seqId);
                // }

                // Update wait time fields' enabled/disabled state
                updateWaitTimeFields(setId);
            }
            // Save a single sequence (used for navigation)
function saveSequenceAndNavigate(setId, tabIndex, direction) {
    const $form = $(`#sequence-${setId}-${tabIndex}-form`);
    if (!$form.length) return;
    if (!validateForm($form.find('input[name="sequence_id"]').val(), tabIndex, setId)) return;
    const sequenceData = {
        sequence_id: $form.find('input[name="sequence_id"]').val() || null,
        set_id: setId,
        name: $form.find(`#sequence-name-${setId}-${tabIndex}`).val(),
        subject: $form.find(`#sequence-subject-${setId}-${tabIndex}`).val(),
        template_id: $form.find(`#sequence-template-${setId}-${tabIndex}`).val(),
                    audience_id: tabIndex === 1 ? $form.find(`#sequence-audience-${setId}-${tabIndex}`).val() :
                        null,
        from_emails: $form.find(`#sequence-from-email-${setId}-${tabIndex}`).val() || [],
                    time_gap: tabIndex === 1 ? parseInt($form.find(`#sequence-time-gap-${setId}-${tabIndex}`)
                        .val()) || null : null,
        wait_time: parseInt($form.find(`#sequence-wait-time-${setId}-${tabIndex}`).val()) || 0,
        wait_unit: $form.find(`#sequence-wait-unit-${setId}-${tabIndex}`).val() || 'minutes',
        sequence_number: tabIndex,
    };
    if (tabIndex === 1) {
                    const assignmentMode = $form.find(`#assignment-mode-${setId}-${tabIndex}`).val() ||
                        'batch_size';
        sequenceData.assignment_mode = assignmentMode;
        if (assignmentMode === 'batch_size') {
                        sequenceData.batch_size = parseInt($form.find(`#sequence-batch-size-${setId}-${tabIndex}`)
                            .val()) || null;
        } else {
                        const manualAssignments = $form.find(`#sequence-manual-assignments-${setId}-${tabIndex}`)
                            .val();
            sequenceData.manual_assignments = manualAssignments ? JSON.parse(manualAssignments) : {};
        }
    } else {
        sequenceData.filters = $form.find(`#sequence-report-filters-${setId}-${tabIndex}`).val() || [];
    }
    // Show loading spinner on navigation button
                const $navBtn = direction === 'next' ? $(
                    `.next-sequence[data-set-id='${setId}'][data-tab-index='${tabIndex}']`) : $(
                    `.prev-sequence[data-set-id='${setId}'][data-tab-index='${tabIndex}']`);
                $navBtn.prop('disabled', true).append(
                    '<span class="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>'
                );
    axios.post('/drift/save-sequences', {
        sequences: [sequenceData],
        set_id: setId,
        _token: $('meta[name="csrf-token"]').attr('content')
    })
    .then(response => {
        // Optionally update sequence ID in DOM if new
                        if (response.data.sequences && response.data.sequences[0] && response.data.sequences[0]
                            .id) {
            $form.find('input[name="sequence_id"]').val(response.data.sequences[0].id);
                            $(`#sequence-${setId}-${tabIndex}`).attr('data-sequence', response.data.sequences[0]
                                .id);
        }
        // Navigate to next/prev tab
        const newTabIndex = direction === 'next' ? tabIndex + 1 : tabIndex - 1;
                        allowTabSwitch = true;
        $(`#sequence-tab-${setId}-${newTabIndex}`).trigger('click');
                        setTimeout(() => {
                            allowTabSwitch = false;
                        }, 100); // Reset after short delay
    })
    .catch(error => {
                        toastr.error('Failed to save sequence: ' + (error.response?.data?.error ||
                            'Unknown error'));
    })
    .finally(() => {
        $navBtn.prop('disabled', false).find('.spinner-border').remove();
    });
}
// Save on tab navigation
$(document).on('show.bs.tab', '.nav-link[id^="sequence-tab-"]', function(e) {
                if (!allowTabSwitch) {
                    e.preventDefault();
                    toastr.info('Please use Previous/Next to navigate.');
                    // Do NOT call saveSequenceAndNavigate here!
    }
});
// Previous/Next button handlers
$(document).on('click', '.prev-sequence, .next-sequence', function() {
    const setId = $(this).data('set-id');
    const tabIndex = parseInt($(this).data('tab-index'));
    const direction = $(this).hasClass('next-sequence') ? 'next' : 'prev';
    saveSequenceAndNavigate(setId, tabIndex, direction);
});
// Save button handler for last sequence
$(document).on('click', '.save-sequence-final', function() {
    const setId = $(this).data('set-id');
    const tabIndex = parseInt($(this).data('tab-index'));
    // Save the last sequence only, no navigation
    saveSequenceAndNavigate(setId, tabIndex, null);
});
// Save all sequences
$('#save-all-sequences-btn').click(function() {
                if (!activeSetId) {
                    console.error('No active set selected');
                    toastr.error('No active set selected.');
                    return;
                }

                console.log(`Starting save all sequences for set ${activeSetId}`);

                const $sequenceForms = $(`#sequenceTabContent-${activeSetId} form`);
                const sequences = [];
                let allValid = true;

                $sequenceForms.each(function(index) {
                    const tabIndex = index + 1;
                    const $form = $(this);
                    const sequenceId = $form.find('input[name="sequence_id"]').val();

                    // Validation
                    if (!validateForm(sequenceId, tabIndex, activeSetId)) {
                        console.error(
                            `Validation failed for sequence ${tabIndex}, set ${activeSetId}`);
                        allValid = false;
                        return false; // break out of each loop
                    }

                    // Build sequence data
                    const sequenceData = {
                        sequence_id: sequenceId || null,
                        set_id: activeSetId,
                        name: $form.find(`#sequence-name-${activeSetId}-${tabIndex}`).val(),
                        subject: $form.find(`#sequence-subject-${activeSetId}-${tabIndex}`)
                            .val(),
                        template_id: $form.find(`#sequence-template-${activeSetId}-${tabIndex}`)
                            .val(),
                        audience_id: tabIndex === 1 ? $form.find(
                            `#sequence-audience-${activeSetId}-${tabIndex}`).val() : null,
                        from_emails: $form.find(
                            `#sequence-from-email-${activeSetId}-${tabIndex}`).val() || [],
                        time_gap: tabIndex === 1 ? parseInt($form.find(
                                `#sequence-time-gap-${activeSetId}-${tabIndex}`).val()) ||
                            null : null,
                        wait_time: parseInt($form.find(
                            `#sequence-wait-time-${activeSetId}-${tabIndex}`).val()) || 0,
                        wait_unit: $form.find(`#sequence-wait-unit-${activeSetId}-${tabIndex}`)
                            .val() || 'minutes',
                        sequence_number: tabIndex
                    };

                    if (tabIndex === 1) {
                        // Assignment mode handling
                        const assignmentMode = $form.find(
                            `#assignment-mode-${activeSetId}-${tabIndex}`).val() || 'batch_size';
                        sequenceData.assignment_mode = assignmentMode;

                        if (assignmentMode === 'batch_size') {
                            sequenceData.batch_size = parseInt($form.find(
                                    `#sequence-batch-size-${activeSetId}-${tabIndex}`).val()) ||
                                null;
                        } else {
                            const manualAssignments = $form.find(
                                `#sequence-manual-assignments-${activeSetId}-${tabIndex}`).val();
                            sequenceData.manual_assignments = manualAssignments ? JSON.parse(
                                manualAssignments) : {};
                        }
                    } else {
                        // Categories for other sequences
                        sequenceData.filters = $form.find(
                            `#sequence-report-filters-${activeSetId}-${tabIndex}`).val() || [];
                    }

                    console.log(`Prepared sequence ${tabIndex}:`, sequenceData);
                    sequences.push(sequenceData);
                });

                if (!allValid) {
                    console.error('Aborting save due to validation failures.');
                    return;
                }

                // Submit sequences
                console.log(`Submitting sequences for set ${activeSetId}:`, sequences);

                const $btn = $(this);
                $btn.prop('disabled', true).append(
                    '<span class="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>'
                );

                axios.post('/drift/save-sequences', {
                        sequences: sequences,
                        set_id: activeSetId,
                        _token: $('meta[name="csrf-token"]').attr('content')
                    })
                    .then(response => {
                        console.log('Sequences saved successfully:', response.data);
                        toastr.success('All sequences saved successfully!');
                        $(`#sequenceTabContent-${activeSetId} form`).attr('data-saved', 'true');

                        // Update sequence IDs if new (aligning with working copy logic)
                        sequences.forEach((sequence, index) => {
                            const tabIndex = index + 1;
                            const newSequenceId = response.data.sequences?.[index]?.id ||
                                sequence.sequence_id;
                            if (!sequence.sequence_id && newSequenceId) {
                                sequenceIdsMap[activeSetId][tabIndex] = String(newSequenceId);
                                $(`#sequence-${activeSetId}-${tabIndex}`).attr('data-sequence',
                                    newSequenceId);
                                $(`#sequence-${activeSetId}-${tabIndex}-form input[name="sequence_id"]`)
                                    .val(newSequenceId);
                                $(`.delete-sequence-tab[data-tab-index="${tabIndex}"][data-set="${activeSetId}"]`)
                                    .attr('data-sequence', newSequenceId);
                            }
                        });

                    })
                    .catch(error => {
                        console.error('Failed to save sequences:', error);
                        const errorMsg = error.response?.data?.error || 'Unknown error occurred';
                        toastr.error(`Failed to save sequences: ${errorMsg}`);
                    })
                    .finally(() => {
                        $btn.prop('disabled', false).find('.spinner-border').remove();
                    });
            });


            // Create set tab
            function createSetTab(setId, setName, isActive = false) {
                const isActiveClass = isActive ? 'active' : '';
                const isShowActive = isActive ? 'show active' : '';
                const setTab = `
                    <li class="nav-item d-flex align-items-center">
                        <button class="nav-link ${isActiveClass}" id="set-tab-${setId}" data-bs-toggle="tab"
                            data-bs-target="#set-content-${setId}" type="button" role="tab"
                            aria-controls="set-content-${setId}" aria-selected="${isActive}">
                            ${setName}
                        </button>
                        <button class="btn btn-link delete-set-tab ms-1" data-set="${setId}" title="Delete Set" aria-label="Delete Set" tabindex="0">
    <i class="bi bi-trash"></i>
</button>
                    </li>
                `;
                const setContent = `
                    <div class="tab-pane fade ${isShowActive}" id="set-content-${setId}" role="tabpanel" aria-labelledby="set-tab-${setId}">
                        <h5>Active Set: <span id="active-set-name-${setId}">${setName}</span></h5>
                        <ul class="nav nav-tabs" id="sequenceTabs-${setId}" role="tablist">
                            <!-- Dynamically populated by JavaScript -->
                        </ul>
                        <div class="tab-content" id="sequenceTabContent-${setId}">
                            <!-- Dynamically populated by JavaScript -->
                        </div>
                    </div>
                `;
                $('#setTabs').append(setTab);
                $('#setTabContent').append(setContent);
            }

            // Fetch sequences
            function fetchSequences() {
                console.log('Fetching sets from /api/drift/sets');
                axios.get('/drift/sets')
                    .then(response => {
                        console.log('Sets response:', response.data);
                        const sets = response.data.sets;
                        $('#setTabs').empty();
                        $('#setTabContent').empty();

                        // Toggle New Set button based on whether sets exist
                        if (sets.length === 0) {
                            $('#new-set-btn').prop('disabled', false);
                            $('#setTabContent').html(`
                    <div class="alert alert-info">
                        No sets found. Click "New Set" to create a new set.
                    </div>
                `);
                            activeSetId = null;
                            activeSetName = '';
                            sequenceCount = 0;
                            fetchInitialData();
                            return;
                        } else {
                            $('#new-set-btn').prop('disabled', true); // Disable when sets exist
                        }

                        sets.forEach((set, index) => {
                            createSetTab(set.id, set.set_name, index === 0);
                            loadSequencesForSet(set.id, index === 0);
                        });

                        fetchInitialData();
                    })
                    .catch(error => {
                        console.error('Failed to fetch sets:', error);
                        $('#setTabs').empty();
                        $('#setTabContent').html(`
                <div class="alert alert-info">
                    No sets found. Click "New Set" to create a new set.
                </div>
            `);
                        $('#new-set-btn').prop('disabled', false); // Enable when fetch fails (no sets)
                        activeSetId = null;
                        activeSetName = '';
                        sequenceCount = 0;
                        fetchInitialData();
                    });
            }

            // Ensure sequenceTabContentId is always defined
            let sequenceTabContentId;

            function loadSequencesForSet(setId, isActive = false) {
                console.log('Fetching sequences for set:', setId);
                axios.get(`/drift/sequences?set_id=${setId}`)
                    .then(response => {
                        console.log('Sequences response for set', setId, ':', response.data);
                        const {
                            sequences
                        } = response.data;
                        const sequenceTabsId = `sequenceTabs-${setId}`;
                        const sequenceTabContentId = `sequenceTabContent-${setId}`;
                        $(`#${sequenceTabsId}`).empty();
                        $(`#${sequenceTabContentId}`).empty();
                        let localSequenceCount = 0;

                        if (sequences.length === 0) {
                            $(`#${sequenceTabContentId}`).html(`
                                <div class="alert alert-info">
                                    No sequences found for this set. Add sequences using the interface above.
                                </div>
                            `);
                        } else {
                            sequences.forEach((seq, index) => {
                                localSequenceCount = index + 1;
                                createSequenceTab(localSequenceCount, String(seq.id), seq.name, setId,
                                    sequenceTabsId, sequenceTabContentId, sequences.length);
                                populateSequenceForm(setId, localSequenceCount, seq);
                                if (["running", "paused", "scheduled"].includes(seq.status)) {
                                    $(`.pause-sequence[data-sequence="${seq.id}"]`).prop("disabled",
                                        false);
                                    $(`.cancel-sequence[data-sequence="${seq.id}"]`).prop("disabled",
                                        false);
                                }
                                fetchReports(String(seq.id));
                            });
                            // Targeted fix: After all tabs/forms are created and populated, populate report filters for all tabIndex > 1
                            setTimeout(() => {
                                Object.keys(sequenceIdsMap[setId] || {}).forEach(idx => {
                                    const tabIndex = parseInt(idx);
                                    if (tabIndex > 1) {
                                        fetchReportCategories(setId, tabIndex, sequenceIdsMap[
                                            setId][tabIndex]);
                                    }
                                });
                            }, 0);
                        }

                        if (isActive) {
                            activeSetId = setId;
                            activeSetName = response.data.set_name || `Set ${setId}`;
                            sequenceCount = localSequenceCount;
                            $(`#active-set-name-${setId}`).text(activeSetName);
                            $(`#active-set-id-${setId}`).text(setId);
                        }

                        fetchInitialData();
                        updateWaitTimeFields(
                            setId); // Ensure wait time fields are correctly set after loading sequences
                    })
                    .catch(error => {
                        console.error('Failed to fetch sequences for set:', setId, error);
                        $(`#${sequenceTabContentId}`).html(`
                            <div class="alert alert-info">
                                No sequences found for this set.
                            </div>
                        `);
                    });
                // After all tabs are created and sequenceIdsMap is populated
                Object.keys(sequenceIdsMap[setId] || {}).forEach(idx => {
                    const tabIndex = parseInt(idx);
                    if (tabIndex > 1) {
                        fetchReportCategories(setId, tabIndex, sequenceIdsMap[setId][tabIndex]);
                    }
                    });
            }

            // New set button handler
            $('#new-set-btn').click(function() {
                $('#set-name').val('');
                $('#sequence-count').val('1');
                $('#set-message').empty();
                const newSetModalEl = document.getElementById('newSetModal');
                if (newSetModalEl) {
                    const modal = bootstrap.Modal.getOrCreateInstance(newSetModalEl);
                    modal.show();
                }
            });

            // New set form submission
            $('#new-set-form').submit(function(e) {
                e.preventDefault();
                const $btn = $(this).find('button[type="submit"]');
                $btn.prop('disabled', true).find('.loading-spinner').show();

                const formData = {
                    set_name: $('#set-name').val(),
                    sequence_count: parseInt($('#sequence-count').val()),
                    _token: $('meta[name="csrf-token"]').attr('content')
                };

                axios.post('/drift/create-set-with-sequences', formData)
                    .then(response => {
                        console.log('Create set response:', response.data);
                        const newSetModalEl = document.getElementById('newSetModal');
                        if (newSetModalEl) {
                            const modal = bootstrap.Modal.getOrCreateInstance(newSetModalEl);
                            modal.hide();
                        }
                        $('#set-message').html(
                            '<div class="alert alert-success">Set created successfully!</div>'
                        );

                        $('#setTabs').empty();
                        $('#setTabContent').empty();
                        fetchSequences();

                        setTimeout(() => {
                            const setId = response.data.set?.id || activeSetId;
                            if (setId && response.data.sequences?.length > 1) {
                                response.data.sequences.forEach((seq, index) => {
                                    const tabIndex = index + 1;
                                    if (tabIndex > 1) {
                                        fetchReportCategories(setId, tabIndex, seq.id);
                                    }
                                });
                            }
                        }, 1000);

                        setTimeout(() => {
                            $('#set-message').empty();
                        }, 3000);
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                    })
                    .catch(error => {
                        console.error('Failed to create set:', error);
                        let errorMessage = error.response?.data?.error || 'Unknown error';
                        if (error.response?.status === 422) {
                            errorMessage = error.response.data.error || 'Validation failed';
                        }
                        $('#set-message').html(
                            `<div class="alert alert-danger">Failed to create set: ${errorMessage}</div>`
                        );
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                        setTimeout(() => {
                            $('#set-message').empty();
                        }, 5000);
                    });
            });
            // Handle template selection to populate and disable subject field
            $(document).on('change', '[id^=sequence-template-]', function() {
                const $select = $(this);
                const templateId = $select.val();
                const idParts = $select.attr('id').split('-');
                const setId = idParts[2];
                const tabIndex = idParts[3];
                const $subjectInput = $(`#sequence-subject-${setId}-${tabIndex}`);

                // Disable subject field
                $subjectInput.prop('disabled', true);

                if (!templateId) {
                    $subjectInput.val('').prop('disabled', true);
                    return;
                }

                // Fetch template details
                axios.get(`/drift/templates/${templateId}`, {
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        }
                    })
                    .then(response => {
                        const template = response.data;
                        if (template && template.subject) {
                            $subjectInput.val(template.subject || '').prop('disabled',
                                false); // Always enable subject for serialization
                        } else {
                            $subjectInput.val('').prop('disabled', true);
                        }
                    })
                    .catch(error => {
                        console.error('Failed to fetch template subject:', error);
                        $subjectInput.val('').prop('disabled', true);
                        toastr.error('Failed to load template subject.');
                    });
            });
            // Fetch initial data
            function fetchInitialData() {
                // Fetch templates
                axios.get('/drift/templates')
                    .then(response => {
                        const templates = response.data;
                        $('[id^=sequence-template-]').each(function() {
                            const $select = $(this);
                            const currentValue = $select.val() || '';
                            $select.empty().append('<option value="">-- Select Template --</option>');
                            templates.forEach(template => {
                                $select.append(
                                    `<option value="${template.id}">${template.title || template.name || template.id}</option>`
                                );
                            });
                            // Ensure correct selected value for each sequence tab
                            let selected = $select.data('selected');
                            if (selected === undefined || selected === null || selected === '') {
                                selected = currentValue;
                            }
                            $select.val(selected);
                            $select.trigger('change'); // Ensure the value is set and UI updates
                            if ($select.hasClass('select2-hidden-accessible')) {
                                $select.select2('destroy');
                            }
                            $select.select2();
                        });
                        if (templates.length === 0) {
                            console.warn('No templates found.');
                        }
                    })
                    .catch(error => {
                        console.error('Failed to fetch templates:', error);
                        toastr.error('Failed to fetch templates: ' + (error.response?.data?.error ||
                            'Unknown error'));
                    });

                // Fetch audiences
                axios.get('/drift/audiences')
                    .then(response => {
                        const audiences = response.data;
                        $('[id^=sequence-audience-]').each(function() {
                            const $select = $(this);
                            const currentValue = $select.val() || '';
                            $select.empty().append('<option value="">-- Select Audience --</option>');
                            audiences.forEach(audience => {
                                $select.append(
                                    `<option value="${audience.id}">${audience.name || audience.title || audience.id}</option>`
                                );
                            });
                            const selected = $select.data('selected');
                            if (selected !== undefined && selected !== null && selected !== '') {
                                $select.val(selected);
                            } else {
                                $select.val(currentValue);
                            }
                            console.log('Dropdown HTML for', $select.attr('id'), $select.html());
                            console.log('Selected value for', $select.attr('id'), $select.val());
                            if ($select.hasClass('select2-hidden-accessible')) {
                                $select.select2('destroy');
                            }
                            $select.select2();
                            $select.trigger('change.select2');
                        });
                        if (audiences.length === 0) {
                            console.warn('No audiences found.');
                        }
                    })
                    .catch(error => {
                        console.error('Failed to fetch audiences:', error);
                        toastr.error('Failed to fetch audiences: ' + (error.response?.data?.error ||
                            'Unknown error'));
                    });
                axios.get('/drift/email-accounts')
                    .then(response => {
                        const accounts = response.data;
                        $('[id^=sequence-from-email-]').each(function() {
                            const $select = $(this);
                            const currentValues = $select.val() || [];
                            $select.empty().append(
                                '<option value="__select_all__">Select All</option>');
                            accounts.forEach(account => {
                                if (account.status === 'active') {
                                    $select.append(
                                        `<option value="${account.email}">${account.email} (${account.daily_send_limit || 'N/A'})</option>`
                                    );
                                }
                            });
                            const selected = $select.data('selected');
                            if (selected && Array.isArray(selected)) {
                                $select.val(selected).trigger('change.select2');
                            } else {
                                $select.val(currentValues).trigger('change');
                            }
                        });
                    })
                    .catch(error => {
                        console.error('Failed to fetch email accounts:', error);
                        toastr.error('Failed to fetch email accounts: ' + (error.response?.data?.error ||
                            'Unknown error'));
                    });

                axios.get('/drift/timezones')
                    .then(response => {
                        const timezones = response.data;
                        $('#schedule-timezone').empty().append('<option value="">Select Timezone</option>');
                        timezones.forEach(timezone => {
                            $('#schedule-timezone').append(
                                `<option value="${timezone}">${timezone}</option>`
                            );
                        });
                    })
                    .catch(error => {
                        console.error('Failed to fetch timezones:', error);
                        toastr.error('Failed to fetch timezones: ' + (error.response?.data?.error ||
                            'Unknown error'));
                    });

                axios.get('/drift/subscribers')
                    .then(response => {
                        const subscribers = Array.isArray(response.data) ?
                            response.data :
                            (Array.isArray(response.data.subscribers) ? response.data.subscribers : []);
                        $('#preview-subscriber').empty().append('<option value="">Select Subscriber</option>');
                        subscribers.forEach(subscriber => {
                            $('#preview-subscriber').append(
                                `<option value="${subscriber.id}">${subscriber.first_name} ${subscriber.last_name || ''} (${subscriber.email})</option>`
                            );
                        });
                    })
                    .catch(error => {
                        console.error('Failed to fetch subscribers:', error);
                    });
            }

            // Insert subscriber and sender placeholders
            // Placeholder insertion now handled by TinyMCE logic
            $('#save-template-btn').on('click', function() {
                const templateId = $('#template-id').val();
                const title = $('#editor-title').val();
                const subject = $('#editor-subject').val();
                let content;
                const editorType = $('#editor-switch').val();

                if (editorType === 'wysiwyg') {
                    content = tinymceEditor ? tinymceEditor.getContent() : '';
                } else {
                    content = $('#code-editor').val().trim();
                }

                console.log('Cleaned template content before saving:', content); // Debug log

                axios.post('/drift/templates', {
                        id: templateId,
                        title: title,
                        subject: subject,
                        content: content,
                        _token: $('meta[name="csrf-token"]').attr('content')
                    })
                    .then(response => {
                        console.log('Template saved successfully:', response.data);
                        toastr.success('Template saved successfully!');
                        $('#editorModal').modal('hide');
                    })
                    .catch(error => {
                        console.error('Error saving template:', error);
                        toastr.error('Failed to save template: ' + (error.response?.data?.details ||
                            'Unknown error'));
                    });
            });
            // Reset editor modal on hide
            $('#editorModal').on('hidden.bs.modal', function() {
                $('#editor-title').val('');
                $('#editor-subject').val('');
                $('#template-id').val('');
                $('#code-editor').val('');
                $('#editor-switch').val('wysiwyg');
                $('#tinymce-editor-container').show();
                $('#code-editor-container').hide();
            });

            // Other existing functions (unchanged)
            async function updatePreviewSubscribersFromPrevSequence(prevSequenceId, category, $dropdown) {
                $dropdown.empty().append('<option value="">Loading...</option>');
                try {
                    const res = await axios.get('/drift/sequence-category-emails', {
                        params: {
                            prev_sequence_id: prevSequenceId,
                            category: category
                        }
                    });
                    $dropdown.empty();
                    if ((res.data.subscribers || []).length === 0) {
                        $dropdown.append('<option value="">No matching subscribers</option>');
                    } else {
                        $dropdown.append('<option value="">Select Subscriber</option>');
                        (res.data.subscribers || []).forEach(sub => {
                            $dropdown.append(
                                `<option value="${sub.id}">${sub.name} (${sub.email})</option>`);
                        });
                    }
                } catch (err) {
                    $dropdown.empty().append('<option value="">Failed to load</option>');
                    console.error('Failed to load category emails:', err);
                }
            }

            $(document).on('change', '[id^=sequence-report-filters-]', async function() {
                const $select = $(this);
                const selectedCategory = $select.val();
                const idParts = $select.attr('id').split('-');
                if (idParts.length < 4) return;
                const setId = idParts[3 - 1];
                const tabIndex = idParts[4 - 1];
                const sequence2TabPane = $(`#sequence-${setId}-${tabIndex}`);
                const sequence2Id = sequence2TabPane.data('sequence');
                const prevTabIndex = parseInt(tabIndex) - 1;
                if (prevTabIndex < 1) return;
                const prevSequenceTabPane = $(`#sequence-${setId}-${prevTabIndex}`);
                const prevSequenceId = prevSequenceTabPane.data('sequence');
                if (!prevSequenceId) return;
                const $subscriberDropdown = sequence2TabPane.find(
                    '.preview-subscriber-dropdown, #preview-subscriber');
                if (!selectedCategory || selectedCategory === '__select_all__') {
                    $subscriberDropdown.empty().append('<option value="">Select Subscriber</option>');
                    return;
                }
                await updatePreviewSubscribersFromPrevSequence(prevSequenceId, selectedCategory,
                    $subscriberDropdown);
            });
            $(document).on('click', '.preview-email', async function() {
                const $btn = $(this);
                const sequence = $btn.data('sequence');
                const $tabPane = $(`.tab-pane[data-sequence="${sequence}"]`);

                if (!$tabPane.length) {
                    toastr.error('Error: Sequence tab not found.');
                    return;
                }

                const idParts = $tabPane.attr('id').split('-');
                if (idParts.length < 3) {
                    toastr.error('Error: Invalid sequence tab format.');
                    return;
                }

                const setId = idParts[1];
                const tabIndex = idParts[2];

                if (tabIndex != 1) {
                    const previewModalEl = document.getElementById('previewModal');
                    if (previewModalEl) {
                        const previewModal = bootstrap.Modal.getOrCreateInstance(previewModalEl);
                        previewModal.show();
                    }
                    return;
                }

                const audienceId = $(`#sequence-audience-${setId}-${tabIndex}`).val();
                const $templateSelect = $(`#sequence-template-${setId}-${tabIndex}`);
                let templateId = $templateSelect.val();

                console.log('[PREVIEW DEBUG]', {
                    sequence,
                    setId,
                    tabIndex,
                    templateSelectId: $templateSelect.attr('id'),
                    templateId
                });

                // Fallback to Select2 if needed
                if (!templateId && $templateSelect.hasClass('select2-hidden-accessible')) {
                    templateId = $templateSelect.select2('val');
                    console.log('[PREVIEW DEBUG] Fallback Select2 value:', templateId);
                }

                if (!templateId) {
                    toastr.error('Please select a template to preview.');
                    return;
                }

                $('#preview-loading').show();
                $('#preview-content-inner').html('');
                $('#preview-subscriber').empty().append(
                    '<option value="">Loading subscribers...</option>');

                if (audienceId) {
                    try {
                        const subRes = await axios.get(`/drift/audiences/${audienceId}/subscribers`);
                        const subData = subRes.data;
                        const subscribers = Array.isArray(subData) ?
                            subData :
                            (Array.isArray(subData.subscribers) ? subData.subscribers : []);
                        $('#preview-subscriber').empty().append(
                            '<option value="">Select Subscriber</option>');

                        if (subscribers.length === 0) {
                            $('#preview-subscriber').append(
                                '<option value="">No subscribers found</option>');
                        } else {
                            subscribers.forEach(sub => {
                                $('#preview-subscriber').append(
                                    `<option value="${sub.id}">${sub.first_name} ${sub.last_name || ''} (${sub.email})</option>`
                                );
                            });
                        }
                    } catch (error) {
                        $('#preview-subscriber').empty().append(
                            '<option value="">Failed to load subscribers</option>');
                        console.error('Error loading subscribers:', error);
                    }
                } else {
                    $('#preview-subscriber').empty().append(
                        '<option value="">Select an audience</option>');
                }

                // Load template preview
                try {
                    const tplRes = await axios.get(`/drift/templates/${templateId}/preview`);
                    const tplData = tplRes.data;

                    $('#preview-content-inner').html(tplData.content || '<p>No preview available.</p>');
                    $('#previewModalLabel').text(`Preview: ${tplData.title || 'Template'}`);
                } catch (error) {
                    $('#preview-content-inner').html(
                        '<p class="text-danger">Failed to load template preview.</p>');
                    $('#previewModalLabel').text('Email Preview');
                    console.error('Error loading template preview:', error);
                }

                $('#preview-loading').hide();

                // Show modal after content is ready
                const previewModalEl = document.getElementById('previewModal');
                if (previewModalEl) {
                    const previewModal = bootstrap.Modal.getOrCreateInstance(previewModalEl);
                    previewModal.show();
                }
            });

            function updateSequenceIds(oldId, newId) {
                const $sequenceTab = $(`.tab-pane[data-sequence="${oldId}"]`);
                const idAttr = $sequenceTab.attr('id');
                if (!idAttr) {
                    console.error('Sequence tab ID attribute is missing for oldId:', oldId);
                    return;
                }
                const idParts = idAttr.split('-');
                if (idParts.length < 3) {
                    console.error('Invalid sequence tab ID format:', idAttr);
                    return;
                }
                const setId = idParts[1];
                const tabIndex = idParts[2];
                if (sequenceIdsMap[setId]) {
                    sequenceIdsMap[setId][tabIndex] = String(newId);
                }
                const newSequenceId = String(newId);

                $sequenceTab.attr('data-sequence', newSequenceId);

                const buttons = [
                    '.send-immediately',
                    '.schedule-sequence',
                    '.preview-email',
                    '.view-reports',
                    '.pause-sequence',
                    '.cancel-sequence'
                ];
                buttons.forEach(selector => {
                    $(`${selector}[data-sequence="${oldId}"]`).attr('data-sequence', newSequenceId);
                });

                const $reportsSection = $(`#reports-${oldId}`);
                $reportsSection.attr('id', `reports-${newSequenceId}`);

                const stats = ['sent', 'no_longer', 'automatic_reply', 'replied', 'unsubscribed', 'softbounce',
                    'hardbounce', 'unopened'
                ];
                stats.forEach(stat => {
                    $(`#reports-${stat}-${oldId}`).attr('id', `reports-${stat}-${newSequenceId}`);
                    $(`#reports-${stat}-emails-${oldId}`).attr('id',
                        `reports-${stat}-emails-${newSequenceId}`);
                });

                const filters = ['replied', 'unsubscribed', 'softbounce', 'unopened',
                    'hardbounce'
                ];
                filters.forEach(filter => {
                    $(`#filter-${filter}-${oldId}`).attr('id', `filter-${filter}-${newSequenceId}`).attr(
                        'data-sequence', newSequenceId);
                    $(`label[for="filter-${filter}-${oldId}"]`).attr('for',
                        `filter-${filter}-${newSequenceId}`);
                });
            }

            function fetchReports(sequence) {
                const sequenceId = String(sequence);
                const $reportsSection = $(`#reports-${sequenceId}`);
                const $reportContent = $(`#reports-content-${sequenceId}`);
                const $reportLoading = $(`#reports-loading-${sequenceId}`);
                const $reportMessage = $(`#reports-message-${sequenceId}`);
                const $viewReportsBtn = $(`.view-reports[data-sequence="${sequenceId}"]`);

                // Show the reports section and loader, hide content and message
                $reportsSection.show();
                $reportContent.hide();
                $reportLoading.show();
                $reportMessage.hide().text('');

                // Initialize with default values
                const categories = [{
                        key: 'sent',
                        dataKey: 'sent'
                    },
                    {
                        key: 'no_longer',
                        dataKey: 'no_longer'
                    },
                    {
                        key: 'automatic_reply',
                        dataKey: 'automatic_reply'
                    },
                    {
                        key: 'replied',
                        dataKey: 'replied'
                    },
                    {
                        key: 'unsubscribed',
                        dataKey: 'unsubscribed'
                    },
                    {
                        key: 'softbounce',
                        dataKey: 'softbounce'
                    },
                    {
                        key: 'hardbounce',
                        dataKey: 'hardbounce'
                    },
                    {
                        key: 'unopened',
                        dataKey: 'unopened'
                    }
                ];

                // Reset report values to 0
                categories.forEach(cat => {
                    $(`#reports-${cat.key}-${sequenceId}`).text(0);
                });
                $reportMessage.text('This sequence has not been sent yet. No report data available.').hide();

                if (!sequenceId.startsWith('new-')) {
                    console.log('Fetching reports for sequence:', sequenceId, 'with set_id:', activeSetId);
                    axios.get(`/drift/reports/${sequenceId}`)
                        .then(response => {
                            const data = response.data || {};
                            if (Object.values(data).some(val => (val?.count ?? val ?? 0) > 0)) {
                                $reportMessage.hide();
                            } else {
                                $reportMessage.show();
                            }
                            categories.forEach(cat => {
                                const count = data[cat.dataKey]?.count ?? data[cat.dataKey] ?? 0;
                                $(`#reports-${cat.key}-${sequenceId}`).text(count);
                            });

                            // Hide loader, show content
                            $reportLoading.hide();
                            $reportContent.show();
                            $viewReportsBtn.text('Hide Reports');
                        })
                        .catch(error => {
                            console.error('Failed to fetch reports:', error);
                            // Hide loader, show message
                            $reportLoading.hide();
                            $reportContent.hide();
                            $reportMessage.text(
                                error.response?.data?.error || 'No report data available for this sequence.'
                            ).show();
                            $viewReportsBtn.text('Hide Reports');
                        });
                } else {
                    // For new sequences, hide loader, show message
                    $reportLoading.hide();
                    $reportContent.hide();
                    $reportMessage.show();
                    $viewReportsBtn.text('Hide Reports');
                }
            }

            function updateNextSequenceFilters(sequenceId, setId) {
                const $tabPane = $(`.tab-pane[data-sequence='${sequenceId}']`);
                if ($tabPane.length) {
                    const idAttr = $tabPane.attr('id');
                    if (idAttr) {
                        const idParts = idAttr.split('-');
                        if (idParts.length >= 3) {
                            const setId = idParts[1];
                            const tabIndex = parseInt(idParts[2]);
                            const nextTabIndex = tabIndex + 1;
                            if (sequenceIdsMap[setId] && sequenceIdsMap[setId][nextTabIndex]) {
                                fetchReportCategories(setId, nextTabIndex, sequenceIdsMap[setId][nextTabIndex]);
                            }
                        }
                    }
                }
            }

            function fetchReportCategories(setId, tabIndex, sequenceId) {
                const prevTabIndex = tabIndex - 1;
                if (prevTabIndex < 1) return;

                const prevSeqId = sequenceIdsMap[setId]?.[prevTabIndex];
                if (!prevSeqId) {
                    console.warn(`No previous sequence ID found for set ${setId}, tab ${prevTabIndex}`);
                    populateDefaultCategories(setId, tabIndex);
                    return;
                }

                const $select = $(`#sequence-report-filters-${setId}-${tabIndex}`);
                // Use .data('selected') if available, else current value
                let selected = $select.data('selected') || $select.val() || [];

                $select.empty().append('<option value="">Loading...</option>').prop('disabled', true);

                axios.get(`/drift/reports/${prevSeqId}`)
                    .then(response => {
                        const data = response.data || {};
                        $select.empty().append('<option value="__select_all__">-- Select All --</option>');

                        const categories = [{
                                key: 'sent',
                                label: `Sent (${data.sent?.count ?? data.sent ?? 0})`
                            },
                            {
                                key: 'no_longer',
                                label: `No Longer (${data.no_longer?.count ?? data.no_longer ?? 0})`
                            },
                            {
                                key: 'automatic_reply',
                                label: `Automatic Reply (${data.automatic_reply?.count ?? data.automatic_reply ?? 0})`
                            },
                            {
                                key: 'replied',
                                label: `Replied (${data.replied?.count ?? data.replied ?? 0})`
                            },
                            {
                                key: 'unsubscribed',
                                label: `Unsubscribed (${data.unsubscribed?.count ?? data.unsubscribed ?? 0})`
                            },
                            {
                                key: 'softbounce',
                                label: `Softbounce (${data.softbounce?.count ?? data.softbounce ?? 0})`
                            },
                            {
                                key: 'hardbounce',
                                label: `Hardbounce (${data.hardbounce?.count ?? data.hardbounce ?? 0})`
                            },
                            {
                                key: 'unopened',
                                label: `Unopened (${data.unopened?.count ?? data.unopened ?? 0})`
                            }
                        ];

                        categories.forEach(cat => {
                            $select.append(`<option value="${cat.key}">${cat.label}</option>`);
                        });

                        $select.data('selected', selected);

                        if ($select.hasClass('select2-hidden-accessible')) {
                            $select.select2('destroy');
                        }
                        $select.prop('disabled', false);
                        $select.removeAttr('disabled');
                        initializeSelect2($select);

                        $select.val(selected).trigger('change.select2');

                        if (Object.values(data).every(val => (val?.count ?? val ?? 0) === 0)) {
                            $select.after(
                                '<div class="text-info mt-1">Previous sequence has no report data. Showing default categories.</div>'
                            );
                        }
                    })
                    .catch(error => {
                        console.error(`Failed to fetch report categories for set ${setId}, tab ${tabIndex}:`,
                            error);
                        populateDefaultCategories(setId, tabIndex);
                    });
            }

            function populateDefaultCategories(setId, tabIndex, prevSequenceName = `Sequence ${tabIndex - 1}`) {
                const $select = $(`#sequence-report-filters-${setId}-${tabIndex}`);
                let selected = $select.data('selected') || $select.val() || [];

                $select.empty().append('<option value="__select_all__">-- Select All --</option>');

                const categories = [{
                        key: 'sent',
                        label: 'Sent (0)'
                    },
                    {
                        key: 'no_longer',
                        label: 'No Longer (0)'
                    },
                    {
                        key: 'automatic_reply',
                        label: 'Automatic Reply (0)'
                    },
                    {
                        key: 'replied',
                        label: 'Replied (0)'
                    },
                    {
                        key: 'unsubscribed',
                        label: 'Unsubscribed (0)'
                    },
                    {
                        key: 'softbounce',
                        label: 'Softbounce (0)'
                    },
                    {
                        key: 'hardbounce',
                        label: 'Hardbounce (0)'
                    },
                    {
                        key: 'unopened',
                        label: 'Unopened (0)'
                    }
                ];

                categories.forEach(cat => {
                    $select.append(`<option value="${cat.key}">${cat.label}</option>`);
                });

                $select.data('selected', selected);

                if ($select.hasClass('select2-hidden-accessible')) {
                    $select.select2('destroy');
                }
                $select.prop('disabled', false);
                $select.removeAttr('disabled');
                initializeSelect2($select);

                $select.val(selected).trigger('change.select2');

                $select.after(
                    '<div class="text-info mt-1">Previous sequence has no report data. Showing default categories.</div>'
                );
            }
            $(document).on('click', '.view-reports', function() {
                const $btn = $(this);
                const sequenceId = $btn.data('sequence');
                const $tabPane = $(`.tab-pane[data-sequence="${sequenceId}"]`);

                if (!$tabPane.length) {
                    toastr.error('Error: Unable to find sequence tab pane.');
                    return;
                }

                const setId = $tabPane.data('set');
                const $reportSection = $(`#reports-${sequenceId}`);
                const $reportMessage = $(`#reports-message-${sequenceId}`);

                $reportSection.find('span[id^=reports-]').text('0'); // Reset values
                $reportMessage.hide().text('');
                fetchReports(sequenceId); // Loader handled here
            });


            $(document).on('click', '.refresh-reports-btn', function() {
                const $btn = $(this);
                const sequenceId = $btn.data('sequence');
                if (!sequenceId) return;
                $btn.prop('disabled', true);
                const $icon = $btn.find('i');
                const originalIcon = $icon.attr('class');
                $icon.removeClass().addClass('bi bi-arrow-clockwise spin-refresh');
                fetchReports(sequenceId); // Loader handled here
                setTimeout(() => {
                    $btn.prop('disabled', false);
                    $icon.removeClass().addClass(originalIcon);
                }, 1200);
            });

            $(document).on('click', '.send-immediately', function() {
                const $btn = $(this);
                const sequence = $btn.data('sequence');
                const $tabPane = $(`.tab-pane[data-sequence="${sequence}"]`);
                if (!$tabPane.length) {
                    console.error('Tab pane not found for sequence:', sequence);
                    toastr.error('Error: Sequence tab not found.');
                    return;
                }
                const idParts = $tabPane.attr('id').split('-');
                if (idParts.length < 3) {
                    console.error('Invalid tab pane ID format:', $tabPane.attr('id'));
                    toastr.error('Error: Invalid sequence tab format.');
                    return;
                }
                const setId = idParts[1];
                // Always use tabIndex 1 (first sequence) for send/schedule logic
                const tabIndex = 1;
                const $firstForm = $(`#sequence-${setId}-1-form`);
                if (!$firstForm.length) {
                    toastr.error('First sequence form not found.');
                    return;
                }
                if (!validateForm($firstForm.find('input[name="sequence_id"]').val(), 1, setId)) return;

                $btn.prop('disabled', true).append(
                    '<span class="spinner-border spinner-border-sm loading-spinner" role="status" aria-hidden="true"></span>'
                );
                const $saveBtn = $('#save-all-sequences-btn');
                $saveBtn.prop('disabled', true).append(
                    '<span class="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>'
                );

                // Gather all sequence forms for validation and saving
                const $sequenceForms = $(`#sequenceTabContent-${setId} form`);
                let allValid = true;
                const sequences = [];
                $sequenceForms.each(function(index) {
                    const formTabIndex = index + 1;
                    const $form = $(this);
                    const formSequenceId = $form.find('input[name="sequence_id"]').val();
                    if (!validateForm(formSequenceId, formTabIndex, setId)) {
                        allValid = false;
                        return false;
                    }
                    const sequenceData = {
                        sequence_id: formSequenceId || null,
                        set_id: setId,
                        name: $form.find(`#sequence-name-${setId}-${formTabIndex}`).val(),
                        subject: $form.find(`#sequence-subject-${setId}-${formTabIndex}`).val(),
                        template_id: $form.find(`#sequence-template-${setId}-${formTabIndex}`)
                            .val(),
                        audience_id: formTabIndex === 1 ? $form.find(
                            `#sequence-audience-${setId}-${formTabIndex}`).val() : null,
                        from_emails: $form.find(`#sequence-from-email-${setId}-${formTabIndex}`)
                            .val() || [],
                        time_gap: formTabIndex === 1 ? parseInt($form.find(
                                `#sequence-time-gap-${setId}-${formTabIndex}`).val()) ||
                            null : null,
                        batch_size: formTabIndex === 1 ? parseInt($form.find(
                                `#sequence-batch-size-${setId}-${formTabIndex}`).val()) ||
                            null : null,
                        wait_time: parseInt($form.find(
                            `#sequence-wait-time-${setId}-${formTabIndex}`).val()) || 0,
                        wait_unit: $form.find(`#sequence-wait-unit-${setId}-${formTabIndex}`)
                            .val() || 'minutes',
                        categories: formTabIndex > 1 ? ($form.find(
                                `#sequence-report-filters-${setId}-${formTabIndex}`)
                            .val() || []) : []
                    };
                    sequences.push(sequenceData);
                });
                if (!allValid) {
                    $btn.prop('disabled', false).find('.loading-spinner').remove();
                    $saveBtn.prop('disabled', false).find('.spinner-border').remove();
                    return;
                }
                // Debug log for categories
                console.log('[SEND IMMEDIATELY] Sequences payload:', sequences);
                axios.post('/drift/save-sequences', {
                        sequences: sequences,
                        set_id: setId,
                        _token: $('meta[name="csrf-token"]').attr('content')
                    })
                    .then(response => {
                        $(`#sequenceTabContent-${setId} form`).attr('data-saved', 'true');
                        $saveBtn.prop('disabled', false).find('.spinner-border').remove();
                        // Update sequence IDs if needed
                        sequences.forEach((sequence, index) => {
                            const formTabIndex = index + 1;
                            if (!sequence.sequence_id || sequence.sequence_id
                                .startsWith('new-')) {
                                const newSequenceId = response.data.sequences?.[index]?.id ||
                                    sequence.sequence_id;
                                if (newSequenceId && newSequenceId !== sequence.sequence_id) {
                                    sequenceIdsMap[setId][formTabIndex] = String(newSequenceId);
                                    $(`#sequence-${setId}-${formTabIndex}`).attr(
                                        'data-sequence', newSequenceId);
                                    $(`#sequence-${setId}-${formTabIndex}-form input[name="sequence_id"]`)
                                        .val(newSequenceId);
                                    $(`.delete-sequence-tab[data-tab-index="${formTabIndex}"][data-set="${setId}"]`)
                                        .attr('data-sequence', newSequenceId);
                                    if (formTabIndex === 1) {
                                        sequence = newSequenceId;
                                    }
                                }
                            }
                        });
                        // Use first sequence for sending
                        const firstSequenceId = $(`#sequence-${setId}-1-form input[name="sequence_id"]`)
                            .val();
                        const $firstForm = $(`#sequence-${setId}-1-form`);
                        const data = $firstForm.serializeArray();
                        const formData = {
                            sequence_id: firstSequenceId,
                            set_id: setId,
                            _token: $('meta[name="csrf-token"]').attr('content'),
                            is_first: true
                        };
                        data.forEach(item => {
                            if (item.name === 'from_emails[]') {
                                formData['from_emails'] = formData['from_emails'] || [];
                                if (item.value !== '__select_all__') formData['from_emails']
                                    .push(item.value);
                            } else if (item.name === 'time_gap' || item.name === 'batch_size') {
                                formData[item.name] = parseInt(item.value) || 0;
                            } else {
                                formData[item.name] = item.value;
                            }
                        });
                        // Ensure subject is enabled before serialization
                        const $subjectInput = $firstForm.find('input[name="subject"]');
                        const wasSubjectDisabled = $subjectInput.prop('disabled');
                        $subjectInput.prop('disabled', false);
                        // Restore subject disabled state if it was disabled
                        if (wasSubjectDisabled) $subjectInput.prop('disabled', true);
                        // Debug log for categories on send
                        console.log('[SEND IMMEDIATELY] Sending formData:', formData);
                        console.log('[DEBUG] Subject value before send:', formData.subject);
                        axios.post('/api/drift/send', formData)
                            .then(response => {
                                console.log('Send sequence response:', response.data);
                                if (!response.data.sequence || !response.data.sequence.id) {
                                    console.error('Invalid response structure:', response.data);
                                    toastr.error('Error: Invalid server response.');
                                    $btn.prop('disabled', false).find('.loading-spinner').remove();
                                    return;
                                }
                                const newSequenceId = response.data.sequence.id;
                                const newSetId = response.data.sequence.set_id || setId;
                                updateSequenceIds(firstSequenceId, newSequenceId);
                                if (newSetId !== setId) {
                                    activeSetId = newSetId;
                                    $(`#active-set-id-${setId}`).text(activeSetId);
                                }
                                $(`.view-reports[data-sequence="${newSequenceId}"]`).prop(
                                    'disabled', false);
                                $(`.pause-sequence[data-sequence="${newSequenceId}"]`).prop(
                                    'disabled', false);
                                $(`.cancel-sequence[data-sequence="${newSequenceId}"]`).prop(
                                    'disabled', false);
                                toastr.success('Sequence sent successfully!');
                                $btn.prop('disabled', false).find('.loading-spinner').remove();
                                setTimeout(() => {
                                    fetchReports(newSequenceId);
                                    $(`#reports-${newSequenceId}`).show();
                                    $(`.view-reports[data-sequence="${newSequenceId}"]`)
                                        .text('Hide Reports');
                                    startReportsPolling(newSequenceId, newSetId);
                                    // updateNextSequenceFilters(newSequenceId, newSetId);
                                }, 1000);
                            })
                            .catch(error => {
                                console.error('Failed to send sequence:', error);
                                toastr.error('Failed to send sequence: ' + (error.response?.data
                                    ?.details || 'Unknown error'));
                                $btn.prop('disabled', false).find('.loading-spinner').remove();
                            });
                    })
                    .catch(error => {
                        console.error('Failed to save sequences:', error);
                        toastr.error('Failed to save sequences: ' + (error.response?.data?.error ||
                            'Unknown error'));
                        $btn.prop('disabled', false).find('.loading-spinner').remove();
                        $saveBtn.prop('disabled', false).find('.spinner-border').remove();
                    });
            });

            $(document).on('click', '.schedule-sequence', function() {
                const $btn = $(this);
                const sequence = $btn.data('sequence');
                const $tabPane = $(`.tab-pane[data-sequence="${sequence}"]`);
                if (!$tabPane.length) {
                    console.error('Tab pane not found for sequence:', sequence);
                    toastr.error('Error: Sequence tab not found.');
                    return;
                }
                const idParts = $tabPane.attr('id').split('-');
                if (idParts.length < 3) {
                    console.error('Invalid tab pane ID format:', $tabPane.attr('id'));
                    toastr.error('Error: Invalid sequence tab format.');
                    return;
                }
                const setId = idParts[1];
                // Always use tabIndex 1 (first sequence) for schedule logic
                const tabIndex = 1;
                const $firstForm = $(`#sequence-${setId}-1-form`);
                if (!$firstForm.length) {
                    toastr.error('First sequence form not found.');
                    return;
                }
                if (!validateForm($firstForm.find('input[name="sequence_id"]').val(), 1, setId)) return;
                $btn.prop('disabled', true).append(
                    '<span class="spinner-border spinner-border-sm loading-spinner" role="status" aria-hidden="true"></span>'
                );
                const $saveBtn = $('#save-all-sequences-btn');
                $saveBtn.prop('disabled', true).append(
                    '<span class="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>'
                );
                // Gather all sequence forms for validation and saving
                const $sequenceForms = $(`#sequenceTabContent-${setId} form`);
                let allValid = true;
                const sequences = [];
                $sequenceForms.each(function(index) {
                    const formTabIndex = index + 1;
                    const $form = $(this);
                    const formSequenceId = $form.find('input[name="sequence_id"]').val();
                    if (!validateForm(formSequenceId, formTabIndex, setId)) {
                        allValid = false;
                        return false;
                    }
                    const sequenceData = {
                        sequence_id: formSequenceId || null,
                        set_id: setId,
                        name: $form.find(`#sequence-name-${setId}-${formTabIndex}`).val(),
                        subject: $form.find(`#sequence-subject-${setId}-${formTabIndex}`).val(),
                        template_id: $form.find(`#sequence-template-${setId}-${formTabIndex}`)
                            .val(),
                        audience_id: formTabIndex === 1 ? $form.find(
                            `#sequence-audience-${setId}-${formTabIndex}`).val() : null,
                        from_emails: $form.find(`#sequence-from-email-${setId}-${formTabIndex}`)
                            .val() || [],
                        time_gap: formTabIndex === 1 ? parseInt($form.find(
                                `#sequence-time-gap-${setId}-${formTabIndex}`).val()) || null :
                            null,
                        batch_size: formTabIndex === 1 ? parseInt($form.find(
                                `#sequence-batch-size-${setId}-${formTabIndex}`).val()) ||
                            null : null,
                        wait_time: parseInt($form.find(
                            `#sequence-wait-time-${setId}-${formTabIndex}`).val()) || 0,
                        wait_unit: $form.find(`#sequence-wait-unit-${setId}-${formTabIndex}`)
                            .val() || 'minutes',
                        categories: formTabIndex > 1 ? ($form.find(
                                `#sequence-report-filters-${setId}-${formTabIndex}`)
                            .val() || []) : []
                    };
                    sequences.push(sequenceData);
                });
                if (!allValid) {
                    $btn.prop('disabled', false).find('.loading-spinner').remove();
                    $saveBtn.prop('disabled', false).find('.spinner-border').remove();
                    return;
                }
                axios.post('/drift/save-sequences', {
                        sequences: sequences,
                        set_id: setId,
                        _token: $('meta[name="csrf-token"]').attr('content')
                    })
                    .then(response => {
                        $(`#sequenceTabContent-${setId} form`).attr('data-saved', 'true');
                        $saveBtn.prop('disabled', false).find('.spinner-border').remove();
                        $btn.prop('disabled', false).find('.loading-spinner').remove();
                        // Update sequence IDs if needed
                        sequences.forEach((sequenceData, index) => {
                            const formTabIndex = index + 1;
                            if (!sequenceData.sequence_id || sequenceData.sequence_id
                                .startsWith('new-')) {
                                const newSequenceId = response.data.sequences?.[index]?.id ||
                                    sequenceData.sequence_id;
                                if (newSequenceId && newSequenceId !== sequenceData
                                    .sequence_id) {
                                    sequenceIdsMap[setId][formTabIndex] = String(newSequenceId);
                                    $(`#sequence-${setId}-${formTabIndex}`).attr(
                                        'data-sequence', newSequenceId);
                                    $(`#sequence-${setId}-${formTabIndex}-form input[name="sequence_id"]`)
                                        .val(newSequenceId);
                                    $(`.delete-sequence-tab[data-tab-index="${formTabIndex}"][data-set="${setId}"]`)
                                        .attr('data-sequence', newSequenceId);
                                    if (formTabIndex === 1) {
                                        sequenceData.sequence_id = newSequenceId;
                                    }
                                }
                            }
                        });
                        // Use first sequence for scheduling
                        const firstSequenceId = $(`#sequence-${setId}-1-form input[name="sequence_id"]`)
                            .val();
                        const $firstForm = $(`#sequence-${setId}-1-form`);
                        const data = $firstForm.serializeArray();
                        const formData = {
                            sequence_id: firstSequenceId,
                            set_id: setId,
                            scheduled_at: $('#schedule-time').val(),
                            timezone: $('#schedule-timezone').val(),
                            _token: $('meta[name="csrf-token"]').attr('content'),
                            is_first: true
                        };
                        data.forEach(item => {
                            if (item.name === 'from_emails[]') {
                                formData['from_emails'] = formData['from_emails'] || [];
                                if (item.value !== '__select_all__') formData['from_emails']
                                    .push(item.value);
                            } else if (item.name === 'filters[]') {
                                formData['filters'] = formData['filters'] || [];
                                if (item.value !== '__select_all__') formData['filters'].push(
                                    item.value);
                            } else {
                                formData[item.name] = item.value;
                            }
                        });
                        $('#schedule-sequence-id').val(firstSequenceId);
                        // Show the modal as before
                        $('#scheduleModal').modal('show');
                    })
                    .catch(error => {
                        console.error('Failed to save sequences:', error);
                        toastr.error('Failed to save sequences: ' + (error.response?.data?.error ||
                            'Unknown error'));
                        $btn.prop('disabled', false).find('.loading-spinner').remove();
                        $saveBtn.prop('disabled', false).find('.spinner-border').remove();
                    });
            });

            $('#schedule-form').submit(function(e) {
                e.preventDefault();
                const $btn = $(this).find('button[type="submit"]');
                $btn.prop('disabled', true).find('.loading-spinner').show();
                const sequence = $('#schedule-sequence-id').val();
                const $tabPane = $(`.tab-pane[data-sequence="${sequence}"]`);
                if (!$tabPane.length) {
                    console.error('Tab pane not found for sequence:', sequence);
                    toastr.error('Error: Sequence tab not found.');
                    $btn.prop('disabled', false).find('.loading-spinner').hide();
                    return;
                }
                const idParts = $tabPane.attr('id').split('-');
                if (idParts.length < 3) {
                    console.error('Invalid tab pane ID format:', $tabPane.attr('id'));
                    toastr.error('Error: Invalid sequence tab format.');
                    $btn.prop('disabled', false).find('.loading-spinner').hide();
                    return;
                }
                const setId = idParts[1];
                const tabIndex = idParts[2];
                if (!validateScheduleForm()) {
                    $btn.prop('disabled', false).find('.loading-spinner').hide();
                    return;
                }
                const $form = $(`#sequence-${setId}-${tabIndex}-form`);
                const data = $form.serializeArray();
                const formData = {
                    sequence_id: sequence,
                    set_id: setId,
                    scheduled_at: $('#schedule-time').val(),
                    timezone: $('#schedule-timezone').val(),
                    _token: $('meta[name="csrf-token"]').attr('content'),
                    is_first: tabIndex == 1
                };
                data.forEach(item => {
                    if (item.name === 'from_emails[]') {
                        formData['from_emails'] = formData['from_emails'] || [];
                        if (item.value !== '__select_all__') formData['from_emails'].push(item
                            .value);
                    } else if (item.name === 'filters[]') {
                        formData['filters'] = formData['filters'] || [];
                        if (item.value !== '__select_all__') formData['filters'].push(item.value);
                    } else {
                        formData[item.name] = item.value;
                    }
                });
                console.log('Scheduling formData:', formData);
                axios.post(`/api/drift/sequences/${sequence}/schedule`, formData)
                    .then(response => {
                        console.log('Schedule sequence response:', response.data);
                        const newSequenceId = response.data.sequence_id || sequence;
                        if (newSequenceId !== sequence) {
                            updateSequenceIds(sequence, newSequenceId);
                        }
                        $(`.view-reports[data-sequence="${newSequenceId}"]`).prop('disabled', false);
                        $(`.pause-sequence[data-sequence="${newSequenceId}"]`).prop('disabled', false);
                        $(`.cancel-sequence[data-sequence="${newSequenceId}"]`).prop('disabled', false);
                        toastr.success('Sequence scheduled successfully!');
                        $('#scheduleModal').modal('hide');
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                        setTimeout(() => {
                            fetchReports(newSequenceId);
                            $(`#reports-${newSequenceId}`).show();
                            $(`.view-reports[data-sequence="${newSequenceId}"]`).text(
                                'Hide Reports');
                            startReportsPolling(newSequenceId, setId);
                            // updateNextSequenceFilters(newSequenceId, setId);
                        }, 1000);
                    })
                    .catch(error => {
                        console.error('Failed to schedule sequence:', error);
                        const errorMessage = error.response?.data?.details || error.response?.data
                            ?.error || error.message || 'Unknown error';
                        toastr.error('Failed to schedule sequence: ' + errorMessage);
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                    });
            });
            console.log('Bootstrap modal available:', typeof $.fn.modal);

            $(document).on('click', '.preview-email', function() {
                const $btn = $(this);
                let sequenceId = $btn.attr('data-sequence'); // Use attr() to ensure string

                // Ensure sequenceId is a string and not undefined/null
                if (!sequenceId) {
                    console.error('Missing sequenceId on preview button:', $btn);
                    toastr.error('Error: Sequence ID is missing.');
                    return;
                }

                // Convert sequenceId to string if it isn't already
                sequenceId = String(sequenceId);

                const $tabPane = $(`.tab-pane[data-sequence="${sequenceId}"]`);
                if (!$tabPane.length) {
                    console.error('Tab pane not found for sequence:', sequenceId);
                    toastr.error('Error: Sequence tab not found.');
                    return;
                }

                const idParts = $tabPane.attr('id').split('-');
                if (idParts.length < 3) {
                    console.error('Invalid tab pane ID format:', $tabPane.attr('id'));
                    toastr.error('Error: Invalid sequence tab format.');
                    return;
                }

                const setId = idParts[1];
                const tabIndex = idParts[2];
                const $form = $(`#sequence-${setId}-${tabIndex}-form`);
                const templateId = $form.find(`#sequence-template-${setId}-${tabIndex}`).val();
                const subject = $form.find(`#sequence-subject-${setId}-${tabIndex}`).val();

                if (!templateId) {
                    toastr.error('Please select a template to preview.');
                    return;
                }
                if (!subject) {
                    toastr.error('Please enter a subject for the email.');
                    return;
                }
                if (sequenceId.startsWith('new-')) {
                    toastr.error('Cannot preview an unsaved sequence. Please save the sequence first.');
                    return;
                }

                // Check if Bootstrap modal is available
                if (typeof $.fn.modal !== 'function') {
                    console.error(
                        'Bootstrap modal is not available. Ensure Bootstrap JS is loaded after jQuery.');
                    toastr.error(
                        'Error: Modal functionality is not available. Please check if Bootstrap is properly loaded.'
                    );
                    return;
                }

                $('#previewModal').data('sequence', sequenceId).data('set-id', setId).data('tab-index',
                    tabIndex);
                $('#preview-content-inner').empty();
                $('#preview-loading').show();
                $('#preview-subscriber').empty().append('<option value="">Select Subscriber</option>');

                try {
                    $('#previewModal').modal('show');
                } catch (e) {
                    console.error('Failed to show preview modal:', e);
                    toastr.error('Error: Unable to open preview modal.');
                    return;
                }

                const csrfToken = $('meta[name="csrf-token"]').attr('content');
                if (!csrfToken) {
                    console.error('CSRF token is missing');
                    $('#preview-loading').hide();
                    $('#preview-content-inner').html(
                        '<p class="text-danger">Error: CSRF token is missing.</p>');
                    return;
                }

                console.log('Fetching subscribers for sequence:', sequenceId, 'setId:', setId, 'tabIndex:',
                    tabIndex);

                axios.get('/drift/subscribers', {
                        headers: {
                            'X-CSRF-TOKEN': csrfToken
                        },
                        timeout: 10000 // 10-second timeout
                    })
                    .then(response => {
                        console.log('Subscribers response:', response.data);
                        const subscribers = Array.isArray(response.data) ? response.data : response.data
                            .subscribers || [];
                        $('#preview-subscriber').empty().append(
                            '<option value="">Select Subscriber</option>');
                        subscribers.forEach(subscriber => {
                            if (subscriber.id && subscriber.email) {
                                $('#preview-subscriber').append(
                                    `<option value="${subscriber.id}">${subscriber.first_name || 'Unknown'} ${subscriber.last_name || ''} (${subscriber.email})</option>`
                                );
                            }
                        });

                        if (subscribers.length > 0) {
                            $('#preview-subscriber').val(subscribers[0].id).trigger('change');
                        } else {
                            $('#preview-loading').hide();
                            $('#preview-content-inner').html(
                                '<p class="text-info">No subscribers available. Showing generic preview.</p>'
                            );
                            fetchGenericPreview(sequenceId, setId, tabIndex, templateId, subject);
                        }
                    })
                    .catch(error => {
                        console.error('Failed to fetch subscribers:', error);
                        $('#preview-loading').hide();
                        const errorMessage = error.response?.data?.error || error.message ||
                            'Unable to load subscribers. Showing generic preview.';
                        $('#preview-content-inner').html(`<p class="text-danger">${errorMessage}</p>`);
                        fetchGenericPreview(sequenceId, setId, tabIndex, templateId, subject);
                    });
            });

            $('#preview-subscriber').change(function() {
                const subscriberId = $(this).val();
                const sequenceId = $('#previewModal').data('sequence');
                const setId = $('#previewModal').data('set-id');
                const tabIndex = $('#previewModal').data('tab-index');

                if (!sequenceId || !setId || !tabIndex) {
                    console.error('Missing modal data - sequenceId:', sequenceId, 'setId:', setId,
                        'tabIndex:', tabIndex);
                    $('#preview-content-inner').html(
                        '<p class="text-danger">Error: Sequence data missing.</p>');
                    $('#preview-loading').hide();
                    return;
                }

                const templateId = $(`#sequence-template-${setId}-${tabIndex}`).val();
                const subject = $(`#sequence-subject-${setId}-${tabIndex}`).val();

                if (!templateId || !subject) {
                    console.error('Missing templateId or subject:', {
                        templateId,
                        subject
                    });
                    $('#preview-content-inner').html(
                        '<p class="text-info">Please select a template and subject.</p>');
                    $('#preview-loading').hide();
                    return;
                }

                $('#preview-loading').show();
                $('#preview-content-inner').empty();

                const csrfToken = $('meta[name="csrf-token"]').attr('content');
                if (!csrfToken) {
                    console.error('CSRF token is missing');
                    $('#preview-loading').hide();
                    $('#preview-content-inner').html(
                        '<p class="text-danger">Error: CSRF token is missing.</p>');
                    return;
                }

                const previewData = {
                    template_id: templateId,
                    subject: subject,
                    sequence_id: sequenceId,
                    _token: csrfToken
                };

                if (subscriberId) {
                    previewData.subscriber_id = subscriberId;
                }

                console.log('Sending preview request:', previewData);

                axios.post('/drift/preview', previewData, {
                        headers: {
                            'X-CSRF-TOKEN': csrfToken
                        },
                        timeout: 10000 // 10-second timeout
                    })
                    .then(response => {
                        console.log('Preview response:', response.data);
                        $('#preview-loading').hide();
                        if (!response.data || !response.data.subject || !response.data.content) {
                            console.error('Invalid preview response:', response.data);
                            $('#preview-content-inner').html(
                                '<p class="text-danger">Error: Invalid server response.</p>');
                            return;
                        }
                        $('#preview-content-inner').html(`
            <h6>Subject: ${response.data.subject}</h6>
            <hr>
            ${response.data.content}
        `);
                    })
                    .catch(error => {
                        console.error('Failed to load preview:', error);
                        $('#preview-loading').hide();
                        const errorMessage = error.response?.data?.error || error.message ||
                            'Failed to load preview.';
                        $('#preview-content-inner').html(`<p class="text-danger">${errorMessage}</p>`);
                    });
            });

            function fetchGenericPreview(sequenceId, setId, tabIndex, templateId, subject) {
                $('#preview-loading').show();
                $('#preview-content-inner').empty();

                const csrfToken = $('meta[name="csrf-token"]').attr('content');
                if (!csrfToken) {
                    console.error('CSRF token is missing');
                    $('#preview-loading').hide();
                    $('#preview-content-inner').html('<p class="text-danger">Error: CSRF token is missing.</p>');
                    return;
                }

                console.log('Fetching generic preview for sequence:', sequenceId, 'setId:', setId, 'tabIndex:',
                    tabIndex, 'templateId:', templateId, 'subject:', subject);

                axios.post('/drift/preview', {
                        template_id: templateId,
                        subject: subject,
                        sequence_id: sequenceId,
                        _token: csrfToken
                    }, {
                        headers: {
                            'X-CSRF-TOKEN': csrfToken
                        },
                        timeout: 10000 // 10-second timeout
                    })
                    .then(response => {
                        console.log('Generic preview response:', response.data);
                        $('#preview-loading').hide();
                        if (!response.data || !response.data.subject || !response.data.content) {
                            console.error('Invalid generic preview response:', response.data);
                            $('#preview-content-inner').html(
                                '<p class="text-danger">Error: Invalid server response.</p>');
                            return;
                        }
                        $('#preview-content-inner').html(`
            <h6>Subject: ${response.data.subject}</h6>
            <hr>
            ${response.data.content}
        `);
                    })
                    .catch(error => {
                        console.error('Failed to load generic preview:', error);
                        $('#preview-loading').hide();
                        const errorMessage = error.response?.data?.error || error.message ||
                            'Failed to load generic preview.';
                        $('#preview-content-inner').html(`<p class="text-danger">${errorMessage}</p>`);
                    });
            }
            $('#previewModal').on('hidden.bs.modal', function() {
                $('#preview-subscriber').empty().append('<option value="">Select Subscriber</option>');
                $('#preview-content-inner').empty();
                $('#preview-loading').hide();
                $('#previewModal').removeData('sequence').removeData('set-id').removeData('tab-index');
            });

            function validateScheduleForm() {
                const scheduledAt = $('#schedule-time').val();
                const timezone = $('#schedule-timezone').val();

                if (!scheduledAt) {
                    toastr.error('Please select a schedule time.');
                    return false;
                }
                if (!timezone) {
                    toastr.error('Please select a timezone.');
                    return false;
                }

                const now = moment();
                const scheduledTime = moment.tz(scheduledAt, timezone);
                if (scheduledTime.isBefore(now)) {
                    toastr.error('Schedule time must be in the future.');
                    return false;
                }

                return true;
            }

            $(document).on('click', '.create-template', function() {
                $('#editorModal').modal('show');
            });

            // Validate subscriber input based on format
            function validateSubscribers(subscribers, format) {
                if (!subscribers) return false;
                const lines = subscribers.trim().split('\n').filter(line => line.trim());
                const isFirstLastEmail = format === 'first-last-email';

                for (let line of lines) {
                    const parts = line.split(',').map(part => part.trim());
                    if (isFirstLastEmail) {
                        if (parts.length !== 3 || !parts[2].match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                            return false;
                        }
                    } else {
                        if (parts.length !== 2 || !parts[1].match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                            return false;
                        }
                    }
                }
                return true;
            }

            // Handle Manual Add Audience
            $('#save-audience-from-campaign-btn').click(function(e) {
                e.preventDefault();
                const $btn = $(this);
                const name = $('#audience-name-create').val().trim();
                const format = $('#subscriber-format-create').val();
                const subscribers = $('#subscribers-input-create').val();
                $btn.prop('disabled', true).find('.loading-spinner').show();

                // Validation
                if (!name) {
                    toastr.error('Please enter an audience name.');
                    $btn.prop('disabled', false).find('.loading-spinner').hide();
                    return;
                }
                if (!validateSubscribers(subscribers, format)) {
                    toastr.error(
                        `Please enter valid subscribers (one per line, ${format === 'first-last-email' ? 'First Name, Last Name, Email' : 'First Name, Email'}).`
                    );
                    $btn.prop('disabled', false).find('.loading-spinner').hide();
                    return;
                }

                // Prepare data
                const formData = new FormData();
                formData.append('name', name);
                formData.append('subscribers', subscribers);
                formData.append('format', format);
                formData.append('_token', $('meta[name="csrf-token"]').attr('content'));

                // Send API request
                axios.post('/drift/audiences', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    })
                    .then(response => {
                        $('#createAudienceModal').modal('hide');
                        toastr.success('Audience created successfully!');
                        refreshAudienceDropdowns();
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                    })
                    .catch(error => {
                        console.error('Failed to create audience:', error);
                        let errorMessage = error.response?.data?.error || 'Unknown error';
                        if (error.response?.status === 422) {
                            errorMessage = error.response.data.details || 'Invalid input provided.';
                        }
                        toastr.error('Failed to create audience: ' + errorMessage);
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                    });
            });

            // Handle CSV Import Audience
            $('#import-csv-from-campaign-btn').click(function(e) {
                e.preventDefault();
                const $btn = $(this);
                const name = $('#audience-name-csv-create').val().trim();
                const format = $('#csv-format-create').val();
                const csvFile = $('#csv-file-create')[0]?.files[0];
                $btn.prop('disabled', true).find('.loading-spinner').show();
                const $progress = $('#upload-progress-create');
                const $progressBar = $progress.find('.progress-bar');

                // Validation
                if (!name) {
                    toastr.error('Please enter an audience name.');
                    $btn.prop('disabled', false).find('.loading-spinner').hide();
                    return;
                }
                if (!csvFile) {
                    toastr.error('Please upload a CSV file.');
                    $btn.prop('disabled', false).find('.loading-spinner').hide();
                    return;
                }



                // Prepare data
                const formData = new FormData();
                formData.append('name', name);
                formData.append('subscribers', subscribers);
                formData.append('format', format);
                formData.append('_token', $('meta[name="csrf-token"]').attr('content'));

                // Send API request
                axios.post('/drift/audiences', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    })
                    .then(response => {
                        $('#createAudienceModal').modal('hide');
                        toastr.success('Audience created successfully!');
                        refreshAudienceDropdowns();
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                    })
                    .catch(error => {
                        console.error('Failed to create audience:', error);
                        let errorMessage = error.response?.data?.error || 'Unknown error';
                        if (error.response?.status === 422) {
                            errorMessage = error.response.data.details || 'Invalid input provided.';
                        }
                        toastr.error('Failed to create audience: ' + errorMessage);
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                    });
            });

            // Handle CSV Import Audience
            $('#import-csv-from-campaign-btn').click(function(e) {
                e.preventDefault();
                const $btn = $(this);
                const name = $('#audience-name-csv-create').val().trim();
                const format = $('#csv-format-create').val();
                const csvFile = $('#csv-file-create')[0]?.files[0];
                $btn.prop('disabled', true).find('.loading-spinner').show();
                const $progress = $('#upload-progress-create');
                const $progressBar = $progress.find('.progress-bar');

                // Validation
                if (!name) {
                    toastr.error('Please enter an audience name.');
                    $btn.prop('disabled', false).find('.loading-spinner').hide();
                    return;
                }
                if (!csvFile) {
                    toastr.error('Please upload a CSV file.');
                    $btn.prop('disabled', false).find('.loading-spinner').hide();
                    return;
                }

                // Prepare data
                const formData = new FormData();
                formData.append('name', name);
                formData.append('file', csvFile);
                formData.append('format', format);
                formData.append('_token', $('meta[name="csrf-token"]').attr('content'));

                // Show progress bar
                $progress.show();
                $progressBar.css('width', '0%').attr('aria-valuenow', 0).text('0%');

                // Send API request with progress tracking
                axios.post('/drift/audiences', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        },
                        onUploadProgress: progressEvent => {
                            const percentCompleted = Math.round((progressEvent.loaded * 100) /
                                progressEvent.total);
                            $progressBar.css('width', `${percentCompleted}%`)
                                .attr('aria-valuenow', percentCompleted)
                                .text(`${percentCompleted}%`);
                        }
                    })
                    .then(response => {
                        $('#createAudienceModal').modal('hide');
                        $progress.hide();
                        toastr.success('Audience imported successfully!');
                        refreshAudienceDropdowns();
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                    })
                    .catch(error => {
                        console.error('Failed to import audience:', error);
                        $progress.hide();
                        let errorMessage = error.response?.data?.error || 'Unknown error';
                        if (error.response?.status === 422) {
                            errorMessage = error.response.data.details || 'Invalid CSV file or format.';
                        }
                        toastr.error('Failed to import audience: ' + errorMessage);
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                    });
            });

            // Refresh audience dropdowns
            function refreshAudienceDropdowns() {
                axios.get('/drift/audiences')
                    .then(response => {
                        const audiences = response.data;
                        $('[id^=sequence-audience-]').each(function() {
                            const $select = $(this);
                            const currentValue = $select.val() || '';
                            $select.empty().append('<option value="">-- Select Audience --</option>');
                            audiences.forEach(audience => {
                                $select.append(
                                    `<option value="${audience.id}">${audience.name || audience.title || audience.id}</option>`
                                );
                            });
                            $select.val(currentValue);
                            initializeSelect2($select);
                        });
                    })
                    .catch(error => {
                        console.error('Failed to refresh audiences:', error);
                        toastr.error('Failed to refresh audience list.');
                    });
            }

            // Reset modal on hide
            $('#createAudienceModal').on('hidden.bs.modal', function() {
                $('#audience-name-create').val('');
                $('#subscribers-input-create').val('');
                $('#subscriber-format-create').val('first-email');
                $('#audience-name-csv-create').val('');
                $('#csv-file-create').val('');
                $('#csv-format-create').val('first-email');
                $('#upload-progress-create').hide();
            });

            // Open Create Audience modal
            $(document).on('click', '.create-audience', function() {
                $('#createAudienceModal').modal('show');
            });

            $(document).on('click', '.delete-sequence-tab', function() {
                const sequenceId = $(this).data('sequence');
                const tabIndex = $(this).data('tab-index');
                const setId = $(this).data('set');
                $('#delete-sequence-id').val(sequenceId);
                $('#delete-tab-index').val(tabIndex);
                $('#delete-set-id').val(setId);
                $('#delete-sequence-message').empty();
                $('#deleteSequenceModal').modal('show');
            });

            $(document).on('click', '#confirm-delete-sequence-btn', function() {
                const $btn = $(this);
                const sequenceId = $('#delete-sequence-id').val();
                const tabIndex = $('#delete-tab-index').val();
                const setId = $('#delete-set-id').val();
                $btn.prop('disabled', true).find('.loading-spinner').show();

                axios.delete(`/drift/sequences/${sequenceId}`)
                    .then(response => {
                        $(`#sequence-tab-${setId}-${tabIndex}`).parent().remove();
                        $(`#sequence-${setId}-${tabIndex}`).remove();
                        $('#deleteSequenceModal').modal('hide');
                        $('#delete-sequence-message').html(
                            '<div class="alert alert-success">Sequence deleted successfully!</div>');
                        setTimeout(() => {
                            $('#delete-sequence-message').empty();
                        }, 3000);
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                    })
                    .catch(error => {
                        console.error('Failed to delete sequence:', error);
                        $('#delete-sequence-message').html(
                            `<div class="alert alert-danger">Failed to delete sequence: ${error.response?.data?.error || 'Unknown error'}</div>`
                        );
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                        setTimeout(() => {
                            $('#delete-sequence-message').empty();
                        }, 5000);
                    });
            });

            $(document).on('click', '.delete-set-tab', function() {
                const setId = $(this).data('set');
                $('#delete-set-id').val(setId);
                $('#delete-set-message').empty();
                const deleteSetModalEl = document.getElementById('deleteSetModal');
                if (deleteSetModalEl) {
                    const modal = bootstrap.Modal.getOrCreateInstance(deleteSetModalEl);
                    modal.show();
                }
            });

            $('#confirm-delete-set-btn').click(function() {
                const setId = $('#delete-set-id').val();
                const $btn = $(this);
                $btn.prop('disabled', true).find('.loading-spinner').show();

                axios.delete(`/drift/sets/${setId}`)
                    .then(response => {
                        const deleteSetModalEl = document.getElementById('deleteSetModal');
                        if (deleteSetModalEl) {
                            const modal = bootstrap.Modal.getOrCreateInstance(deleteSetModalEl);
                            modal.hide();
                        }
                        $('#delete-set-message').html(
                            '<div class="alert alert-success">Set deleted successfully!</div>'
                        );
                        fetchSequences(); // Refresh sets
                        setTimeout(() => {
                            $('#delete-set-message').empty();
                        }, 3000);
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                    })
                    .catch(error => {
                        console.error('Failed to delete set:', error);
                        const errorMessage = error.response?.data?.error || 'Unknown error';
                        $('#delete-set-message').html(
                            `<div class="alert alert-danger">Failed to delete set: ${errorMessage}</div>`
                        );
                        $btn.prop('disabled', false).find('.loading-spinner').hide();
                        setTimeout(() => {
                            $('#delete-set-message').empty();
                        }, 5000);
                    });
            });
            // --- Sequence State Management ---
            // Store all unsaved sequence data per set
            let sequencesState = {};

            // Collect all current sequence form data for a set
            function collectSequencesState(setId) {
                sequencesState[setId] = {};
                $(`#sequenceTabContent-${setId} form`).each(function(index) {
                    const tabIndex = index + 1;
                    const $form = $(this);
                    sequencesState[setId][tabIndex] = {
                        sequence_id: $form.find('input[name="sequence_id"]').val() || null,
                        set_id: setId,
                        name: $form.find(`#sequence-name-${setId}-${tabIndex}`).val(),
                        subject: $form.find(`#sequence-subject-${setId}-${tabIndex}`).val(),
                        template_id: $form.find(`#sequence-template-${setId}-${tabIndex}`).val(),
                        audience_id: tabIndex === 1 ? $form.find(
                            `#sequence-audience-${setId}-${tabIndex}`).val() : null,
                        from_emails: $form.find(`#sequence-from-email-${setId}-${tabIndex}`).val() ||
                        [],
                        time_gap: parseInt($form.find(`#sequence-time-gap-${setId}-${tabIndex}`)
                            .val()) || null,
                        batch_size: parseInt($form.find(`#sequence-batch-size-${setId}-${tabIndex}`)
                            .val()) || null,
                        wait_time: parseInt($form.find(`#sequence-wait-time-${setId}-${tabIndex}`)
                            .val()) || 0,
                        wait_unit: $form.find(`#sequence-wait-unit-${setId}-${tabIndex}`).val() ||
                            'minutes',
                        categories: tabIndex > 1 ? ($form.find(
                            `#sequence-report-filters-${setId}-${tabIndex}`).val() || []) : []
                    };
                });
            }

            // Repopulate sequence forms from JS state
            function repopulateSequenceFormsFromState(setId) {
                if (!sequencesState[setId]) return;
                Object.keys(sequencesState[setId]).forEach(tabIndex => {
                    const seq = sequencesState[setId][tabIndex];
                    if (seq) {
                        populateSequenceForm(setId, tabIndex, seq);
                    }
                });
            }

            // Add new sequence handler
            $(document).on('click', '[id^=add-sequence-btn-]', function() {
                const $btn = $(this);
                const setId = $btn.attr('id').split('add-sequence-btn-')[1];
                // Collect all current sequence data before adding a new one
                collectSequencesState(setId);
                $btn.prop('disabled', true).append(
                    '<span class="spinner-border spinner-border-sm loading-spinner" role="status" aria-hidden="true"></span>'
                );

                axios.post('/drift/sequences', {
                        set_id: setId,
                        name: `Sequence ${sequenceCount + 1}`,
                        _token: $('meta[name="csrf-token"]').attr('content')
                    })
                    .then(response => {
                        sequenceCount++;
                        const newSequenceId = response.data.sequence.id;
                        createSequenceTab(sequenceCount, newSequenceId, response.data.sequence.name,
                            setId, `sequenceTabs-${setId}`, `sequenceTabContent-${setId}`,
                            sequenceCount);
                        fetchReports(
                            newSequenceId); // Ensure reports tab is initialized for the new sequence
                        fetchInitialData();
                        // Repopulate all previous forms from JS state (preserve unsaved data)
                        repopulateSequenceFormsFromState(setId);
                        // Always update wait time field states after new tab
                        updateWaitTimeFields(setId);
                        // Remove Send Immediately/Schedule buttons from all but last tab
                        const $contents = $(`#sequenceTabContent-${setId} .tab-pane`);
                        $contents.each(function(index) {
                            const isLast = (index === $contents.length - 1);
                            const $btns = $(this).find('.send-immediately, .schedule-sequence');
                            if (!isLast) $btns.remove();
                        });
                        // Activate the new tab
                        const tabTrigger = document.querySelector(
                            `#sequence-tab-${setId}-${sequenceCount}`);
                        if (tabTrigger) {
                            const tab = new bootstrap.Tab(tabTrigger);
                            tab.show();
                        }
                        $btn.prop('disabled', false).find('.loading-spinner').remove();
                    })
                    .catch(error => {
                        console.error('Failed to create sequence:', error);
                        toastr.error('Failed to create sequence: ' + (error.response?.data?.error ||
                            'Unknown error'));
                        $btn.prop('disabled', false).find('.loading-spinner').remove();
                    });
            });

            // Update tab indices after deletion
            function updateTabIndices(setId) {
                const $tabs = $(`#sequenceTabs-${setId} li.nav-item`).not(`#add-sequence-btn-${setId}`);
                const $contents = $(`#sequenceTabContent-${setId} .tab-pane`);
                const tabCount = $tabs.length;

                // Remove any existing add-sequence-btn to prevent duplicates
                $(`#add-sequence-btn-${setId}`);

                $tabs.each(function(index) {
                    const newIndex = index + 1;
                    const $tab = $(this).find('.nav-link');
                    const oldIndex = $tab.attr('id').split('-')[3];
                    const sequenceId = $tab.data('sequence');

                    // Update tab
                    $tab.attr('id', `sequence-tab-${setId}-${newIndex}`)
                        .attr('data-bs-target', `#sequence-${setId}-${newIndex}`)
                        .attr('aria-controls', `sequence-${setId}-${newIndex}`)
                        .attr('aria-selected', index === 0)
                        .text(`Sequence ${newIndex}`);

                    // Update content
                    const $content = $(`#sequence-${setId}-${oldIndex}`);
                    $content.attr('id', `sequence-${setId}-${newIndex}`)
                        .attr('aria-labelledby', `sequence-tab-${setId}-${newIndex}`);

                    // Update form and fields
                    const $form = $content.find('form');
                    $form.attr('id', `sequence-${setId}-${newIndex}-form`);
                    $content.find(`#sequence-name-${setId}-${oldIndex}`).attr('id',
                        `sequence-name-${setId}-${newIndex}`);
                    $content.find(`#sequence-subject-${setId}-${oldIndex}`).attr('id',
                        `sequence-subject-${setId}-${newIndex}`);
                    $content.find(`#sequence-template-${setId}-${oldIndex}`).attr('id',
                        `sequence-template-${setId}-${newIndex}`);
                    $content.find(`#sequence-audience-${setId}-${oldIndex}`).attr('id',
                        `sequence-audience-${setId}-${newIndex}`);
                    $content.find(`#sequence-from-email-${setId}-${oldIndex}`).attr('id',
                        `sequence-from-email-${setId}-${newIndex}`);
                    $content.find(`#sequence-time-gap-${setId}-${oldIndex}`).attr('id',
                        `sequence-time-gap-${setId}-${newIndex}`);
                    $content.find(`#sequence-batch-size-${setId}-${oldIndex}`).attr('id',
                        `sequence-batch-size-${setId}-${newIndex}`);
                    $content.find(`#sequence-wait-time-${setId}-${oldIndex}`).attr('id',
                        `sequence-wait-time-${setId}-${newIndex}`);
                    $content.find(`#sequence-wait-unit-${setId}-${oldIndex}`).attr('id',
                        `sequence-wait-unit-${setId}-${newIndex}`);

                    // Update card header
                    $content.find('.card-header').html(`
            Sequence ${newIndex}: ${$content.find(`#sequence-name-${setId}-${newIndex}`).val() || `Sequence ${newIndex}`}
            <div>
                <button class="btn btn-danger btn-sm cancel-sequence ms-2" data-sequence="${sequenceId}" disabled>
                    Cancel
                </button>
            </div>
        `);

                    // Remove all Send Immediately/Schedule buttons
                    $content.find('.send-immediately, .schedule-sequence').remove();
                    // Only add to last tab
                    if (newIndex === tabCount) {
                        $content.find('.d-flex.gap-2.flex-wrap').prepend(`
                <button type="button" class="btn btn-primary send-immediately" data-sequence="${sequenceId}" style="pointer-events:auto;z-index:1000;">Send Immediately</button>
                <button type="button" class="btn btn-primary schedule-sequence" data-sequence="${sequenceId}">Schedule</button>
            `);
                    }
                });



                // Ensure at least one tab is active
                if ($tabs.length > 0) {
                    $tabs.first().find('.nav-link').addClass('active').attr('aria-selected', true);
                    $contents.first().addClass('show active');
                }

                // Re-initialize Select2 for updated fields
                $(`#sequenceTabContent-${setId} select[id^=sequence-]`).each(function() {
    // Only initialize if not already initialized by populateSequenceForm
    if (!$(this).data('select2Initialized')) {
        initializeSelect2($(this));
        $(this).data('select2Initialized', true);
    }
});

                // Update wait time fields
                updateWaitTimeFields(setId);
            }
            // Function to fetch and update sequence reports
            function fetchSequenceReports(sequenceId, setId) {
                axios.get(`/drift/sequences/${sequenceId}/reports`, {
                        params: {
                            set_id: setId
                        }
                    })
                    .then(response => {
                        const report = response.data;
                        $(`#reports-sent-${sequenceId}`).text(report.sent);
                        $(`#reports-unsubscribed-${sequenceId}`).text(report.unsubscribed);
                        $(`#reports-softbounce-${sequenceId}`).text(report.softbounce);
                        $(`#reports-hardbounce-${sequenceId}`).text(report.hardbounce);
                        $(`#reports-unopened-${sequenceId}`).text(report.unopened);

                        // Show reports section if there are any logs
                        if (report.total > 0) {
                            $(`#reports-${sequenceId}`).show();
                        }

                        // Update status display (e.g., "2 running, 2 done")
                        const pendingCount = report.total - report.sent - report.unsubscribed - report
                            .softbounce - report
                            .hardbounce;
                        const statusText = `${report.sent} done, ${pendingCount} running/pending`;
                        $(`#sequence-status-${sequenceId}`).text(statusText);
                    })
                    .catch(error => {
                        console.error('Failed to fetch reports:', error);
                    });
            }


            // Poll reports every 5 seconds for running sequences
            function startReportsPolling(sequenceId, setId) {
                if (!sequenceId || !setId) {
                    console.error('Invalid sequenceId or setId for polling:', sequenceId, setId);
                    return;
                }
                const interval = setInterval(() => {
                    axios.get(`/drift/sequences/${sequenceId}`)
                        .then(response => {
                            const sequence = response.data.sequence;
                            if (['running', 'scheduled', 'paused'].includes(sequence.status)) {
                                fetchReports(sequenceId); // Loader handled here
                            } else {
                                clearInterval(
                                    interval); // Stop polling if sequence is completed or cancelled
                                fetchReports(sequenceId); // Final update with loader
                            }
                        })
                        .catch(error => {
                            console.error('Failed to check sequence status:', error);
                            clearInterval(interval);
                        });
                }, 5000);
            }
            // Add status display to sequence content
            $(document).on('click', '.nav-tabs .nav-link', function() {
                const sequenceId = $(this).closest('.tab-pane').data('sequence');
                const setId = $(this).closest('.tab-pane').data('set');
                if (sequenceId && setId) {
                    // Add status element if not present
                    if (!$(`#sequence-status-${sequenceId}`).length) {
                        $(`#sequence-${setId}-${$(this).data('tab-index')}`).prepend(
                            `<div id="sequence-status-${sequenceId}" class="alert alert-info mb-3"></div>`
                        );
                    }
                    fetchReports(sequenceId);
                    startReportsPolling(sequenceId, setId);
                }
            });

            // Initialize reports for active sequence on page load
            $(document).ready(function() {
                const activeSequence = $('.tab-pane.active.drift-sequence-box');
                if (activeSequence.length) {
                    const sequenceId = activeSequence.data('sequence');
                    const setId = activeSequence.data('set');
                    fetchReports(sequenceId);
                    startReportsPolling(sequenceId, setId);
                }
            });

            $(document).on('click', '.view-replied-emails', function() {
                const sequenceId = String($(this).data('sequence'));
                $('#replied-emails-content').empty();
                $('#replied-emails-loading').show();
                $('#repliedEmailsModal').modal('show');

                axios.get(`/drift/reports/${sequenceId}`)
                    .then(response => {
                        $('#replied-emails-loading').hide();
                        const data = response.data || {};
                        const repliedEmails = (data.replied && Array.isArray(data.replied.emails)) ?
                            data.replied.emails : [];

                        if (repliedEmails.length === 0) {
                            $('#replied-emails-content').html(
                                '<p class="text-info">No replied emails found.</p>'
                            );
                            return;
                        }

                        let content = '';
                        repliedEmails.forEach(email => {
                            const senderEmail = (typeof email === 'object' && email
                                .account_email) ? email.account_email : 'Unknown';
                            const receiverEmail = (typeof email === 'object' && email
                                .subscriber_email) ? email.subscriber_email : (
                                typeof email === 'string' ? email : 'Unknown');

                            content += `
                    <div class="email-pair p-2 border-bottom text-muted">
                        <span class="text-primary">${senderEmail}</span>
                        <span class="mx-2">→</span>
                        <span class="text-success">${receiverEmail}</span>
                    </div>
                `;
                        });

                        $('#replied-emails-content').html(content);
                    })
                    .catch(error => {
                        console.error('Failed to fetch replied emails:', error);
                        $('#replied-emails-loading').hide();
                        $('#replied-emails-content').html(
                            '<p class="text-danger">Failed to load replied emails.</p>'
                        );
                    });
            });

            // 1. Update the HTML for the report categories to add the eye icon for each category
            // Example for one category (repeat for all):
            // <span id="reports-sent-${seqId}" class="fw-bold fs-5 text-success">0</span>
            // <div class="small mt-1">Sent <i class="bi bi-eye-fill ms-2 view-category-emails" data-sequence="${seqId}" data-category="sent" style="cursor: pointer;" title="View Sent Emails"></i></div>
            // ... repeat for unsubscribed, softbounce, hardbounce, unopened, etc.

            // 2. Update the JS click handler to handle all categories
            $(document).off('click', '.view-category-emails').on('click', '.view-category-emails', function() {
                const sequenceId = String($(this).data('sequence'));
                const category = String($(this).data('category'));
                $('#replied-emails-content').empty();
                $('#replied-emails-loading').show();
                $('#repliedEmailsModal').modal('show');

                axios.get(`/drift/reports/${sequenceId}`)
                    .then(response => {
                        $('#replied-emails-loading').hide();
                        const data = response.data || {};
                        let emails = [];
                        if (data[category] && Array.isArray(data[category].emails)) {
                            emails = data[category].emails;
                        }
                        if (emails.length === 0) {
                            $('#replied-emails-content').html(
                                `<p class="text-info">No emails found for this category.</p>`
                            );
                            return;
                        }
                        let content = '';
                        emails.forEach(email => {
                            const senderEmail = (typeof email === 'object' && email.account_email) ? email.account_email : 'Unknown';
                            const receiverEmail = (typeof email === 'object' && (email.subscriber_email || email.email)) ? (email.subscriber_email || email.email) : (typeof email === 'string' ? email : 'Unknown');
                            content += `
                    <div class="email-pair p-2 border-bottom text-muted">
                        <span class="text-primary">${senderEmail}</span>
                        <span class="mx-2">→</span>
                        <span class="text-success">${receiverEmail}</span>
                    </div>
                `;
                        });
                        $('#replied-emails-content').html(content);
                    })
                    .catch(error => {
                        console.error('Failed to fetch category emails:', error);
                        $('#replied-emails-loading').hide();
                        $('#replied-emails-content').html(
                            '<p class="text-danger">Failed to load emails for this category.</p>'
                        );
                    });
            });

            // 1. Remove the <i> eye icon from each report-category div and make the entire .report-category clickable
            // Example for one category (repeat for all):
            // <div class="report-category ..." data-sequence="${seqId}" data-category="sent" style="...; cursor:pointer;">
            //   <span id="reports-sent-${seqId}" ...>0</span>
            //   <div class="small mt-1">Sent</div>
            // </div>
            // ... repeat for all categories

            // 2. Update the JS click handler
            $(document).off('click', '.report-category').on('click', '.report-category', function() {
                const sequenceId = String($(this).data('sequence'));
                const category = String($(this).data('category'));
                $('#replied-emails-content').empty();
                $('#replied-emails-loading').show();
                $('#repliedEmailsModal').modal('show');

                axios.get(`/drift/reports/${sequenceId}`)
                    .then(response => {
                        $('#replied-emails-loading').hide();
                        const data = response.data || {};
                        let emails = [];
                        if (data[category] && Array.isArray(data[category].emails)) {
                            emails = data[category].emails;
                        }
                        if (emails.length === 0) {
                            $('#replied-emails-content').html(
                                `<p class="text-info">No emails found for this category.</p>`
                            );
                            return;
                        }
                        let content = '';
                        emails.forEach(email => {
                            const senderEmail = (typeof email === 'object' && email.account_email) ? email.account_email : 'Unknown';
                            const receiverEmail = (typeof email === 'object' && (email.subscriber_email || email.email)) ? (email.subscriber_email || email.email) : (typeof email === 'string' ? email : 'Unknown');
                            content += `
                    <div class="email-pair p-2 border-bottom text-muted">
                        <span class="text-primary">${senderEmail}</span>
                        <span class="mx-2">→</span>
                        <span class="text-success">${receiverEmail}</span>
                    </div>
                `;
                        });
                        $('#replied-emails-content').html(content);
                    })
                    .catch(error => {
                        console.error('Failed to fetch category emails:', error);
                        $('#replied-emails-loading').hide();
                        $('#replied-emails-content').html(
                            '<p class="text-danger">Failed to load emails for this category.</p>'
                        );
                    });
            });

            fetchSequences();
        });
    </script>

@endsection
