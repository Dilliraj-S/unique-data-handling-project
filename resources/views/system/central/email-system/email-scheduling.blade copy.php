{{-- @php
    $userRole = App\Http\Classes\UserHelper::getCurrentUser('role');
@endphp --}}

@extends('layouts.system-app')
@section('title', 'Email Scheduling')
@section('top-style')
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
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

        .nav-tabs {
            margin-bottom: 20px;
        }

        .nav-tabs .nav-link {
            padding: 12px 25px;
            font-size: 16px;
            font-weight: 600;
            color: #4b5563;
            border: none;
            border-radius: 8px 8px 0 0;
            transition: all 0.3s ease;
        }

        .nav-tabs .nav-link.active {
            background: #eff6ff;
        }

        .nav-tabs .nav-link:hover {
            background: #f1f5f9;
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

        .btn-danger {
            background: #dc2626;
            border: none;
            color: #ffffff;
        }

        .btn-danger:hover {
            background: #b91c1c;
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
        <ul class="nav nav-tabs" id="emailSchedulerTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="audience-tab" data-bs-toggle="tab" data-bs-target="#audience"
                    type="button" role="tab" aria-controls="audience" aria-selected="true">Audience</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="templates-tab" data-bs-toggle="tab" data-bs-target="#templates" type="button"
                    role="tab" aria-controls="templates" aria-selected="false">Templates</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="campaigns-tab" data-bs-toggle="tab" data-bs-target="#campaigns" type="button"
                    role="tab" aria-controls="campaigns" aria-selected="false">Campaigns</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="preview-send-tab" data-bs-toggle="tab" data-bs-target="#preview-send"
                    type="button" role="tab" aria-controls="preview-send" aria-selected="false">Preview and
                    Send</button>
            </li>
        </ul>
        <div class="tab-content" id="emailSchedulerTabContent">
            <!-- Audience Tab -->
            <div class="tab-pane fade show active" id="audience" role="tabpanel" aria-labelledby="audience-tab">
                <div class="card">
                    <div class="card-header">
                        Audience Management
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addAudienceModal">Add
                            Audience</button>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-3">
                            <div>
                                <button class="btn btn-danger" id="delete-selected-btn" disabled title="Delete Selected"><i
                                        class="bi bi-trash"></i> Delete Selected</button>
                                <button class="btn btn-danger ms-2" id="clear-table-btn" disabled title="Clear Table">Delete
                                    All</button>
                            </div>
                            <div class="d-flex align-items-center">
                                <span style="margin-right: 10px;">Page Size:</span>
                                <select id="audience-page-size" class="form-select w-auto">
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th><input type="checkbox" id="select-all-audience"></th>
                                        <th>Name</th>
                                        <th>Subscribed</th>
                                        <th>Unsubscribed</th>
                                        <th>Options</th>
                                    </tr>
                                </thead>
                                <tbody id="audience-list"></tbody>
                            </table>
                        </div>
                        <nav aria-label="Audience pagination">
                            <ul class="pagination justify-content-center" id="audience-pagination"></ul>
                        </nav>
                    </div>
                </div>
            </div>
            <!-- Templates Tab -->
            <div class="tab-pane fade" id="templates" role="tabpanel" aria-labelledby="templates-tab">
                <div class="card">
                    <div class="card-header">
                        Templates
                        <button class="btn btn-primary btn-sm" id="add-template-btn">Add Template</button>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-3">
                            <div>
                                <button class="btn btn-danger" id="delete-selected-btn" disabled title="Delete Selected"><i
                                        class="bi bi-trash"></i> Delete Selected</button>
                                <button class="btn btn-danger ms-2" id="clear-table-btn" disabled title="Clear Table">Delete
                                    All</button>
                            </div>
                            <div class="d-flex align-items-center">
                                <span style="margin-right: 10px;">Page Size:</span>
                                <select id="templates-page-size" class="form-select w-auto">
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th><input type="checkbox" id="select-all-templates"></th>
                                        <th>Title</th>
                                        <th>Last Modified</th>
                                        <th>Options</th>
                                    </tr>
                                </thead>
                                <tbody id="templates-list"></tbody>
                            </table>
                        </div>
                        <nav aria-label="Templates pagination">
                            <ul class="pagination justify-content-center" id="templates-pagination"></ul>
                        </nav>
                    </div>
                </div>
            </div>
            <!-- Campaigns Tab -->
            <div class="tab-pane fade" id="campaigns" role="tabpanel" aria-labelledby="campaigns-tab">
                <div class="card">
                    <div class="card-header">
                        Campaigns
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal"
                            data-bs-target="#addCampaignModal">Add
                            Campaign</button>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-3">
                            <div>
                                <button class="btn btn-danger" id="delete-selected-btn" disabled
                                    title="Delete Selected"><i class="bi bi-trash"></i> Delete Selected</button>
                                <button class="btn btn-danger ms-2" id="clear-table-btn" disabled
                                    title="Clear Table">Delete
                                    All</button>
                            </div>
                            <div class="d-flex align-items-center">
                                <span style="margin-right: 10px;">Page Size:</span>
                                <select id="campaigns-page-size" class="form-select w-auto">
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th><input type="checkbox" id="select-all-campaigns"></th>
                                        <th>Name</th>
                                        <th>Template</th>
                                        <th>Audience</th>
                                        <th>Status</th>
                                        <th>Options</th>
                                    </tr>
                                </thead>
                                <tbody id="campaigns-list"></tbody>
                            </table>
                        </div>
                        <nav aria-label="Campaigns pagination">
                            <ul class="pagination justify-content-center" id="campaigns-pagination"></ul>
                        </nav>
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
                                    <div class="mb-3">
                                        <label for="campaign-name" class="form-label">Campaign Name</label>
                                        <input type="text" class="form-control" id="campaign-name" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="campaign-template" class="form-label">Select Template</label>
                                        <div class="input-group">
                                            <select class="form-control" id="campaign-template" required>
                                                <option value="">-- Select Template --</option>
                                            </select>
                                            <button type="button" class="btn btn-outline-primary"
                                                id="create-template-btn">Create Template</button>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="campaign-audience" class="form-label">Select Audience</label>
                                        <div class="input-group">
                                            <select class="form-control" id="campaign-audience" required>
                                                <option value="">-- Select Audience --</option>
                                            </select>
                                            <button type="button" class="btn btn-outline-primary"
                                                id="create-audience-btn">Create Audience</button>
                                        </div>
                                    </div>
                                    <button type="submit" class="btn btn-success" id="save-campaign-btn">Save
                                        Campaign</button>
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
                                            <button class="btn btn-success" id="import-csv-from-campaign-btn">
                                                Save Audience
                                                <span class="spinner-border spinner-border-sm loading-spinner"
                                                    role="status" aria-hidden="true" style="display: none;"></span>
                                            </button>
                                        </div>
                                        <div class="progress mt-3" id="upload-progress-create" style="display: none;">
                                            <div class="progress-bar" role="progressbar" style="width: 0%;"
                                                aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Preview and Send Tab -->
            <div class="tab-pane fade" id="preview-send" role="tabpanel" aria-labelledby="preview-send-tab">
                <ul class="nav nav-tabs sub-tabs" id="previewSendTabs" role="tablist">
                    <li class="nav-item">
                        <button class="nav-link active" id="preview-tab" data-bs-toggle="tab" data-bs-target="#preview"
                            type="button" role="tab" aria-controls="preview" aria-selected="true">Preview</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" id="send-tab" data-bs-toggle="tab" data-bs-target="#send"
                            type="button" role="tab" aria-controls="send" aria-selected="false">Send</button>
                    </li>
                </ul>
                <div class="tab-content" id="previewSendTabContent">
                    <!-- Preview Sub-tab -->
                    <div class="tab-pane fade show active" id="preview" role="tabpanel" aria-labelledby="preview-tab">
                        <div class="card">
                            <div class="card-header">Campaign Preview</div>
                            <div class="card-body">
                                <form id="preview-form">
                                    <div class="mb-3">
                                        <label for="preview-campaign-select" class="form-label">Select Campaign</label>
                                        <select class="form-control" id="preview-campaign-select">
                                            <option value="">-- Select Campaign --</option>
                                        </select>
                                    </div>
                                    <div id="campaign-details" style="display: none;">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label class="form-label">Campaign Details</label>
                                                    <ul class="list-group">
                                                        <li class="list-group-item"><strong>Template:</strong> <span
                                                                id="template-title"></span></li>
                                                        <li class="list-group-item"><strong>Audience:</strong> <span
                                                                id="audience-name"></span></li>
                                                        <li class="list-group-item"><strong>Subscribers:</strong> <span
                                                                id="subscriber-count"></span></li>
                                                        <li class="list-group-item"><strong>Status:</strong> <span
                                                                id="campaign-status"></span></li>
                                                    </ul>
                                                </div>
                                                <div class="mb-3">
                                                    <label for="email-preview" class="form-label">Email Preview</label>
                                                    <div id="email-preview" class="border p-3"></div>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label class="form-label">Subscribers</label>
                                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                                        <div>
                                                            <button class="btn btn-danger" id="delete-selected-btn"
                                                                disabled title="Delete Selected">
                                                                <i class="bi bi-trash"></i> Delete Selected
                                                            </button>
                                                            <button class="btn btn-danger ms-2" id="clear-table-btn"
                                                                disabled title="Clear Table">
                                                                Delete All
                                                            </button>
                                                        </div>
                                                        <div class="d-flex align-items-center">
                                                            <span style="margin-right: 10px;">Page Size:</span>
                                                            <select id="subscribers-page-size" class="form-select w-auto">
                                                                <option value="10">10</option>
                                                                <option value="25">25</option>
                                                                <option value="50">50</option>
                                                                <option value="100">100</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div class="table-responsive">
                                                        <table class="table table-bordered">
                                                            <thead>
                                                                <tr>
                                                                    <th><input type="checkbox"
                                                                            id="select-all-subscribers">
                                                                    </th>
                                                                    <th>ID</th>
                                                                    <th>First Name</th>
                                                                    <th>Last Name</th>
                                                                    <th>Email</th>
                                                                    <th>Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody id="subscribers-table"></tbody>
                                                        </table>
                                                    </div>
                                                    <nav aria-label="Subscribers pagination" class="mt-3">
                                                        <ul class="pagination justify-content-center"
                                                            id="subscribers-pagination"></ul>
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <!-- Send Sub-tab -->
                    <div class="tab-pane fade" id="send" role="tabpanel" aria-labelledby="send-tab">
                        <div class="card">
                            <div class="card-header">Send Campaign</div>
                            <div class="card-body">
                                <ul class="nav nav-tabs sub-tabs" id="sendSubTabs" role="tablist">
                                    <li class="nav-item">
                                        <button class="nav-link active" id="send-campaign-tab" data-bs-toggle="tab"
                                            data-bs-target="#send-campaign" type="button" role="tab"
                                            aria-controls="send-campaign" aria-selected="true">Send Immediately</button>
                                    </li>
                                    <li class="nav-item">
                                        <button class="nav-link" id="schedule-campaign-tab" data-bs-toggle="tab"
                                            data-bs-target="#schedule-campaign" type="button" role="tab"
                                            aria-controls="schedule-campaign" aria-selected="false">Schedule
                                            Campaign</button>
                                    </li>
                                </ul>
                                <div class="tab-content" id="sendSubTabContent">
                                    <!-- Send Immediately Sub-tab -->
                                    <div class="tab-pane fade show active" id="send-campaign" role="tabpanel"
                                        aria-labelledby="send-campaign-tab">
                                        <form id="send-immediately-form" class="mt-4">
                                            <div class="mb-3">
                                                <label for="send-campaign-select" class="form-label">Select
                                                    Campaign</label>
                                                <select class="form-control" id="send-campaign-select" name="campaign_id"
                                                    required>
                                                    <option value="">-- Select Campaign --</option>
                                                </select>
                                                <div class="invalid-feedback">Please select a valid campaign.</div>
                                            </div>
                                            <div class="mb-3">
                                                <label for="send-from-email" class="form-label">From Email (by
                                                    Region)</label>
                                                <select class="form-select form-select-lg dyna-select-dropdown h-auto"
                                                    name="from_email[]" id="fromEmailSelect" multiple required>
                                                    <option value="__select_all__">-- Select All --</option>
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
                                                        <optgroup
                                                            label="{{ $region }} ({{ $accountCount }} accounts)">
                                                            @foreach ($regionAccounts as $account)
                                                                <option value="{{ $account->email }}">{{ $account->email }}
                                                                </option>
                                                            @endforeach
                                                        </optgroup>
                                                    @endforeach
                                                </select>
                                                <div class="invalid-feedback">Please select at least one email account.
                                                </div>
                                            </div>
                                            <div class="mb-3">
                                                <label for="send-subject" class="form-label">Subject</label>
                                                <input type="text" class="form-control" id="send-subject"
                                                    name="subject" maxlength="255" required
                                                    placeholder="Splunk & IBM QRadar Samples">
                                                <div class="invalid-feedback">Subject is required and must be 255
                                                    characters
                                                    or less.</div>
                                            </div>
                                            <div class="mb-3">
                                                <label for="time-gap" class="form-label">Time Gap Between Emails
                                                    (seconds)</label>
                                                <input type="number" class="form-control" id="time-gap"
                                                    name="time_gap" min="0" value="1" required>
                                                <div class="invalid-feedback">Time gap must be a non-negative number.</div>
                                            </div>
                                            <div class="mb-3">
                                                <label for="batch-size" class="form-label">Batch Size (emails per
                                                    account)</label>
                                                <input type="number" class="form-control" id="batch-size"
                                                    name="batch_size" min="1" value="2" required>
                                                <div class="invalid-feedback">Batch size must be an integer of at least 1.
                                                </div>
                                            </div>
                                            <button type="submit" class="btn btn-primary">Send Now</button>
                                        </form>
                                        <div id="send-immediately-message" class="mt-3"></div>
                                    </div>
                                    <!-- Schedule Campaign Sub-tab -->
                                    <div class="tab-pane fade" id="schedule-campaign" role="tabpanel"
                                        aria-labelledby="schedule-campaign-tab">
                                        <div class="card">
                                            <div class="card-header">Schedule Campaign</div>
                                            <div class="card-body">
                                                <form id="schedule-campaign-form" novalidate>
                                                    @csrf
                                                    <div class="mb-3">
                                                        <label for="schedule-campaign-select"
                                                            class="form-label">Campaign</label>
                                                        <select class="form-select" id="schedule-campaign-select"
                                                            name="campaign_id" required>
                                                            <option value="">-- Select Campaign --</option>
                                                        </select>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="schedule-from-email" class="form-label">From Email (by
                                                            Region)</label>
                                                        <select class="form-control dyna-select-dropdown"
                                                            id="schedule-from-email" name="from_emails[]" multiple
                                                            required>
                                                            <option value="__select_all__">-- Select All --</option>
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
                                                                <optgroup
                                                                    label="{{ $region }} ({{ $accountCount }} accounts)">
                                                                    @foreach ($regionAccounts as $account)
                                                                        <option value="{{ $account->email }}">
                                                                            {{ $account->email }}</option>
                                                                    @endforeach
                                                                </optgroup>
                                                            @endforeach
                                                        </select>
                                                        <div class="invalid-feedback">Please select at least one email
                                                            account.</div>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="schedule-timezone" class="form-label">Timezone</label>
                                                        <select class="form-control" id="schedule-timezone"
                                                            name="timezone" required>
                                                            <option value="">Select Timezone</option>
                                                            @php
                                                                $timezones = \DateTimeZone::listIdentifiers(
                                                                    \DateTimeZone::ALL,
                                                                );
                                                            @endphp
                                                            @foreach ($timezones as $timezone)
                                                                <option value="{{ $timezone }}">{{ $timezone }}
                                                                </option>
                                                            @endforeach
                                                        </select>
                                                        <div class="invalid-feedback">Please select a timezone.</div>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="schedule-subject" class="form-label">Subject</label>
                                                        <input type="text" class="form-control" id="schedule-subject"
                                                            name="subject" required>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="schedule-time" class="form-label">Schedule
                                                            Time</label>
                                                        <input type="datetime-local" class="form-control"
                                                            id="schedule-time" name="scheduled_at" required>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="schedule-time-gap" class="form-label">Time Gap Between
                                                            Emails (seconds)</label>
                                                        <input type="number" class="form-control" id="schedule-time-gap"
                                                            name="time_gap" value="1" min="0" required>
                                                    </div>
                                                    <div class="mb-3">
                                                        <label for="schedule-batch-size" class="form-label">Batch
                                                            Size</label>
                                                        <input type="number" class="form-control"
                                                            id="schedule-batch-size" name="batch_size" value="2"
                                                            min="1" required>
                                                    </div>
                                                    <button type="submit" class="btn btn-primary">Schedule
                                                        Campaign</button>
                                                </form>
                                                <div id="schedule-campaign-message" class="mt-3"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Campaign Progress -->
                                <div class="mt-4">
                                    <h5>Campaign Progress</h5>
                                    <div class="progress mb-3">
                                        <div id="campaign-progress-bar" class="progress-bar" role="progressbar"
                                            style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                                            0%</div>
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
                            <button type="button" class="btn-close" data-bs-dismiss="modal"
                                aria-label="Close"></button>
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
                                            <label for="audience-name" class="form-label">Audience Name</label>
                                            <input type="text" class="form-control" id="audience-name" required>
                                        </div>
                                        <button type="submit" class="btn btn-success"
                                            id="save-audience-btn">Create</button>
                                    </form>
                                </div>
                                <!-- Existing Audience Tab -->
                                <div class="tab-pane fade" id="existing-audience" role="tabpanel">
                                    <select class="form-select form-select-lg dyna-select-dropdown h-auto"
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
                                    <button type="submit" class="btn btn-success mt-2"
                                        id="edit-existing-audience-btn">Edit</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Editor Modal -->
            <div class="modal fade" id="editorModal" tabindex="-1" aria-labelledby="editorModalLabel"
                aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editorModalLabel">Add Template</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"
                                aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" id="template-id">

                            <div class="mb-3">
                                <label for="editor-title" class="form-label">Template Title</label>
                                <input type="text" class="form-control" id="editor-title">
                            </div>

                            <div class="mb-3">
                                <label for="editor-switch" class="form-label">Editor Type</label>
                                <select class="form-control" id="editor-switch">
                                    <option value="wysiwyg">WYSIWYG Editor</option>
                                    <option value="code">Advanced Code Editor (HTML)</option>
                                </select>
                            </div>

                            <div class="mb-3">
                                <div class="row">
                                    <div class="col-md-6">
                                        <label class="form-label">Subscriber Placeholders</label>
                                        <select class="form-control" id="subscriber-placeholder-select">
                                            <option value="">Select Subscriber Placeholder</option>
                                        </select>
                                        <small class="form-text text-muted">Use placeholders like [first_name], [last_name]
                                            to personalize for subscribers.</small>
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
            <div class="modal fade" id="previewModal" tabindex="-1" aria-labelledby="previewModalLabel"
                aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="previewModalLabel">Template Preview</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"
                                aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <iframe id="preview-iframe" style="width: 100%; height: 400px; border: none;"></iframe>
                        </div>
                    </div>
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
    <script>
        $(document).ready(function() {
            let audiences = [];
            let templates = [];
            let campaigns = [];
            let tinymceEditor = null;
            let placeholders = [];
            const $placeholderSelect = $('#placeholder-select');

            let audienceCurrentPage = 1,
                audiencePageSize = 10,
                allAudiences = [];
            let templatesCurrentPage = 1,
                templatesPageSize = 10,
                allTemplates = [];
            let campaignsCurrentPage = 1,
                campaignsPageSize = 10,
                allCampaigns = [];
            let subscribersCurrentPage = 1,
                subscribersPageSize = 10,
                currentSubscribers = [];

            window.debugModal = true;

            function updateButtonStates(tabId) {
                const $deleteSelectedBtn = $(`#${tabId} .card-body #delete-selected-btn`);
                const $clearTableBtn = $(`#${tabId} .card-body #clear-table-btn`);
                const checkedCount = $(`#${tabId} .subscriber-checkbox:checked`).length;
                const totalCount = tabId === 'preview' ? currentSubscribers.length : $(`#${tabId}-list tr`).length;
                $deleteSelectedBtn.prop('disabled', checkedCount === 0);
                $clearTableBtn.prop('disabled', totalCount === 0);
            }

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
                        renderAudiences(audienceCurrentPage);
                        renderAudiencesPagination();
                        populateCampaignDropdowns();
                        updateButtonStates('audience');
                    })
                    .fail(error => {
                        console.error('Error fetching audiences:', error);
                        allAudiences = [];
                        renderAudiences(audienceCurrentPage);
                        renderAudiencesPagination();
                        updateButtonStates('audience');
                    });
            }

            function renderAudiences(page) {
                const start = (page - 1) * audiencePageSize;
                const end = start + audiencePageSize;
                const paginatedAudiences = allAudiences.slice(start, end);
                const $list = $('#audience-list');
                $list.empty();
                if (allAudiences.length === 0) {
                    $list.append('<tr><td colspan="5" class="text-center">No audiences available.</td></tr>');
                } else {
                    paginatedAudiences.forEach(audience => {
                        const subscribed = audience.subscribers?.filter(s => s.status === 'subscribed')
                            .length || 0;
                        const unsubscribed = audience.subscribers?.filter(s => s.status === 'unsubscribed')
                            .length || 0;
                        $list.append(`
                            <tr data-id="${audience.id}">
                                <td><input type="checkbox" class="subscriber-checkbox" data-id="${audience.id}"></td>
                                <td>${audience.name}</td>
                                <td>${subscribed}</td>
                                <td>${unsubscribed}</td>
                                <td>
                                    <div class="dropdown">
                                        <button class="btn btn-link dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="bi bi-three-dots-vertical"></i>
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item view-audience" href="#" data-id="${audience.id}"><i class="bi bi-eye"></i> View</a></li>
                                            <li><a class="dropdown-item edit-audience" href="#" data-id="${audience.id}"><i class="bi bi-pencil"></i> Edit</a></li>
                                            <li><a class="dropdown-item delete-audience" href="#" data-id="${audience.id}"><i class="bi bi-trash"></i> Delete</a></li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>
                        `);
                    });
                }
            }

            function renderAudiencesPagination() {
                const totalPages = Math.ceil(allAudiences.length / audiencePageSize);
                const $pagination = $('#audience-pagination');
                $pagination.empty();
                if (totalPages <= 1) return;
                $pagination.append(
                    `<li class="page-item ${audienceCurrentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${audienceCurrentPage - 1}">Previous</a></li>`
                );
                for (let i = 1; i <= totalPages; i++) $pagination.append(
                    `<li class="page-item ${audienceCurrentPage === i ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`
                );
                $pagination.append(
                    `<li class="page-item ${audienceCurrentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${audienceCurrentPage + 1}">Next</a></li>`
                );
            }

            $('#audience-pagination').on('click', '.page-link', function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page && page !== audienceCurrentPage) {
                    audienceCurrentPage = page;
                    renderAudiences(audienceCurrentPage);
                    renderAudiencesPagination();
                    updateButtonStates('audience');
                }
            });

            $('#audience-page-size').on('change', function() {
                audiencePageSize = parseInt($(this).val());
                audienceCurrentPage = 1;
                renderAudiences(audienceCurrentPage);
                renderAudiencesPagination();
                updateButtonStates('audience');
            });

            $('#audience #delete-selected-btn').on('click', function() {
                deleteSelected('audience', '/api/audiences', allAudiences, fetchAudiences);
            });

            $('#audience #clear-table-btn').on('click', function() {
                clearTable('audience', '/api/audiences', allAudiences, fetchAudiences);
            });

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
                        contentType: 'application/json',
                        data: JSON.stringify({
                            name
                        })
                    })
                    .done(() => {
                        fetchAudiences();
                        $('#addAudienceModal').modal('hide');
                        $('.modal-backdrop').remove();
                    })
                    .fail(error => {
                        console.error('Error saving audience:', error);
                        alert('Failed to save audience.');
                    });
            });

            $('#addAudienceModal').on('hidden.bs.modal', function() {
                $(this).removeData('bs.modal');
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open');
            });

            $(document).on('click', '.edit-audience', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                const audience = allAudiences.find(a => a.id == id);
                if (audience) {
                    $('#audience-id').val(audience.id);
                    $('#audience-name').val(audience.name);
                    $('#save-audience-btn').text('Update').removeClass('btn-success').addClass(
                        'btn-primary');
                    $('#addAudienceModalLabel').text('Edit Audience');
                    $('#addAudienceModal').modal('show');
                }
            });

            $(document).on('click', '.delete-audience', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                if (confirm('Are you sure you want to delete this audience?')) {
                    $.ajax({
                            url: `/api/audiences/${id}`,
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        })
                        .done(() => fetchAudiences())
                        .fail(error => {
                            console.error('Error deleting audience:', error);
                            alert('Failed to delete audience.');
                        });
                }
            });

            $(document).on('click', '.view-audience', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                window.location.href = `/audiences/${id}`;
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
                        renderTemplates(templatesCurrentPage);
                        renderTemplatesPagination();
                        updateButtonStates('templates');
                    })
                    .fail(error => {
                        console.error('Error fetching templates:', error);
                        allTemplates = [];
                        renderTemplates(templatesCurrentPage);
                        renderTemplatesPagination();
                        updateButtonStates('templates');
                    });
            }

            function renderTemplates(page) {
                const start = (page - 1) * templatesPageSize;
                const end = start + templatesPageSize;
                const paginatedTemplates = allTemplates.slice(start, end);
                const $list = $('#templates-list');
                $list.empty();
                if (allTemplates.length === 0) {
                    $list.append('<tr><td colspan="4" class="text-center">No templates available.</td></tr>');
                } else {
                    paginatedTemplates.forEach(template => {
                        const lastModified = new Date(template.last_modified).toLocaleString();
                        $list.append(`
                            <tr data-id="${template.id}">
                                <td><input type="checkbox" class="subscriber-checkbox" data-id="${template.id}"></td>
                                <td>${template.title}</td>
                                <td>${lastModified}</td>
                                <td>
                                    <div class="dropdown">
                                        <button class="btn btn-link dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="bi bi-three-dots-vertical"></i>
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item edit-template" href="#" data-id="${template.id}"><i class="bi bi-pencil"></i> Edit</a></li>
                                            <li><a class="dropdown-item preview-template" href="#" data-id="${template.id}"><i class="bi bi-eye"></i> Preview</a></li>
                                            <li><a class="dropdown-item delete-template" href="#" data-id="${template.id}"><i class="bi bi-trash"></i> Delete</a></li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>
                        `);
                    });
                }
            }

            function renderTemplatesPagination() {
                const totalPages = Math.ceil(allTemplates.length / templatesPageSize);
                const $pagination = $('#templates-pagination');
                $pagination.empty();
                if (totalPages <= 1) return;
                $pagination.append(
                    `<li class="page-item ${templatesCurrentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${templatesCurrentPage - 1}">Previous</a></li>`
                );
                for (let i = 1; i <= totalPages; i++) $pagination.append(
                    `<li class="page-item ${templatesCurrentPage === i ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`
                );
                $pagination.append(
                    `<li class="page-item ${templatesCurrentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${templatesCurrentPage + 1}">Next</a></li>`
                );
            }

            $('#templates-pagination').on('click', '.page-link', function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page && page !== templatesCurrentPage) {
                    templatesCurrentPage = page;
                    renderTemplates(templatesCurrentPage);
                    renderTemplatesPagination();
                    updateButtonStates('templates');
                }
            });

            $('#templates-page-size').on('change', function() {
                templatesPageSize = parseInt($(this).val());
                templatesCurrentPage = 1;
                renderTemplates(templatesCurrentPage);
                renderTemplatesPagination();
                updateButtonStates('templates');
            });

            $('#templates #delete-selected-btn').on('click', function() {
                deleteSelected('templates', '/api/templates', allTemplates, fetchTemplates);
            });

            $('#templates #clear-table-btn').on('click', function() {
                clearTable('templates', '/api/templates', allTemplates, fetchTemplates);
            });

            function showEditorModal(modalTitle, title, editorType, content = '', id = null, onHiddenCallback =
                null) {
                if (window.debugModal) console.log('Showing editor modal:', {
                    modalTitle,
                    editorType,
                    id
                });
                $('#editorModalLabel').text(modalTitle);
                $('#editor-title').val(title).prop('disabled', false).prop('readonly', false);
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

            $('#add-template-btn').on('click', function() {
                showEditorModal('Add Template', '', 'wysiwyg');
            });

            $('#editor-switch').on('change', function() {
                const currentContent = tinymceEditor && $('#editor-switch').val() === 'wysiwyg' ?
                    tinymceEditor.getContent() : $('#code-editor').val();
                const title = $('#editor-title').val();
                const id = $('#template-id').val();
                showEditorModal('Edit Template', title, $(this).val(), currentContent, id);
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
                        fetchTemplates().then(() => {
                            $('#editorModal').modal('hide');
                            $('.modal-backdrop').remove();
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

            $(document).on('click', '.edit-template', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                const template = allTemplates.find(t => t.id == id);
                if (!template) return;
                const editorType = template.content.includes('<html') || template.content.includes('<div') ?
                    'code' : 'wysiwyg';
                showEditorModal('Edit Template', template.title, editorType, template.content, id);
            });

            $(document).on('click', '.preview-template', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                $.get(`/api/templates/${id}/preview`)
                    .done(data => {
                        const iframe = $('#preview-iframe')[0];
                        const doc = iframe.contentDocument || iframe.contentWindow.document;
                        doc.open();
                        doc.write(data.content);
                        doc.close();
                        $('#previewModalLabel').text(`Preview: ${data.title}`);
                        $('#previewModal').modal('show');
                    })
                    .fail(error => {
                        console.error('Error previewing template:', error);
                        alert('Failed to preview template.');
                    });
            });

            $(document).on('click', '.delete-template', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                if (confirm('Are you sure you want to delete this template?')) {
                    $.ajax({
                            url: `/api/templates/${id}`,
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        })
                        .done(() => fetchTemplates())
                        .fail(error => {
                            console.error('Error deleting template:', error);
                            alert('Failed to delete template.');
                        });
                }
            });

            // Campaigns Functions
            function fetchCampaigns() {
                return $.get('/api/campaigns')
                    .done(data => {
                        allCampaigns = data || [];
                        console.log('Fetched campaigns:', allCampaigns);
                        renderCampaigns(campaignsCurrentPage);
                        renderCampaignsPagination();
                        populateSendSettingsDropdowns();
                        updateButtonStates('campaigns');
                    })
                    .fail(error => {
                        console.error('Error fetching campaigns:', error);
                        allCampaigns = [];
                        renderCampaigns(campaignsCurrentPage);
                        renderCampaignsPagination();
                        populateSendSettingsDropdowns();
                        updateButtonStates('campaigns');
                    });
            }

            function renderCampaigns(page) {
                const start = (page - 1) * campaignsPageSize;
                const end = start + campaignsPageSize;
                const paginatedCampaigns = allCampaigns.slice(start, end);
                const $list = $('#campaigns-list');
                $list.empty();
                if (allCampaigns.length === 0) {
                    $list.append(
                        '<tr><td colspan="6" class="text-center">No campaigns available.</td></tr>');
                } else {
                    paginatedCampaigns.forEach(campaign => {
                        const template = allTemplates.find(t => t.id == campaign.template_id) || {
                            title: 'Unknown'
                        };
                        const audience = allAudiences.find(a => a.id == campaign.audience_id) || {
                            name: 'Unknown'
                        };
                        $list.append(`
                    <tr data-id="${campaign.id}">
                        <td><input type="checkbox" class="subscriber-checkbox" data-id="${campaign.id}"></td>
                        <td>${campaign.name}</td>
                        <td>${template.title}</td>
                        <td>${audience.name}</td>
                        <td>${campaign.status || 'Draft'}</td>
                        <td>
                            <div class="dropdown">
                                <button class="btn btn-link dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item edit-campaign" href="#" data-id="${campaign.id}"><i class="bi bi-pencil"></i> Edit</a></li>
                                    <li><a class="dropdown-item delete-campaign" href="#" data-id="${campaign.id}"><i class="bi bi-trash"></i> Delete</a></li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                `);
                    });
                }
            }

            function renderCampaignsPagination() {
                const totalPages = Math.ceil(allCampaigns.length / campaignsPageSize);
                const $pagination = $('#campaigns-pagination');
                $pagination.empty();
                if (totalPages <= 1) return;
                $pagination.append(
                    `<li class="page-item ${campaignsCurrentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${campaignsCurrentPage - 1}">Previous</a></li>`
                );
                for (let i = 1; i <= totalPages; i++) $pagination.append(
                    `<li class="page-item ${campaignsCurrentPage === i ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`
                );
                $pagination.append(
                    `<li class="page-item ${campaignsCurrentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${campaignsCurrentPage + 1}">Next</a></li>`
                );
            }

            $('#campaigns-pagination').on('click', '.page-link', function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page && page !== campaignsCurrentPage) {
                    campaignsCurrentPage = page;
                    renderCampaigns(campaignsCurrentPage);
                    renderCampaignsPagination();
                    updateButtonStates('campaigns');
                }
            });

            $('#campaigns-page-size').on('change', function() {
                campaignsPageSize = parseInt($(this).val());
                campaignsCurrentPage = 1;
                renderCampaigns(campaignsCurrentPage);
                renderCampaignsPagination();
                updateButtonStates('campaigns');
            });

            $('#campaigns #delete-selected-btn').on('click', function() {
                deleteSelected('campaigns', '/api/campaigns', allCampaigns, fetchCampaigns);
            });

            $('#campaigns #clear-table-btn').on('click', function() {
                clearTable('campaigns', '/api/campaigns', allCampaigns, fetchCampaigns);
            });

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
                    const $previewSelect = $('#preview-campaign-select');
                    $sendSelect.empty().append('<option value="">-- Select Campaign --</option>');
                    $scheduleSelect.empty().append('<option value="">-- Select Campaign --</option>');
                    $previewSelect.empty().append('<option value="">-- Select Campaign --</option>');
                    data.forEach(campaign => {
                        const option = `<option value="${campaign.id}">${campaign.name}</option>`;
                        $sendSelect.append(option);
                        $scheduleSelect.append(option);
                        $previewSelect.append(option);
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
                        $('#addCampaignModal').modal('hide');
                        $('.modal-backdrop').remove();
                        resetCampaignModal();
                        fetchCampaigns();
                    })
                    .fail(error => {
                        console.error('Error saving campaign:', error);
                        alert('Failed to save campaign: ' + (error.responseJSON?.message ||
                            'Unknown error'));
                        $('#addCampaignModal').modal('hide');
                        $('.modal-backdrop').remove();
                    });
            });

            $(document).on('click', '.edit-campaign', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                const campaign = allCampaigns.find(c => c.id == id);
                if (campaign) {
                    $('#campaign-id').val(campaign.id);
                    $('#campaign-name').val(campaign.name);
                    $('#save-campaign-btn').text('Update Campaign').removeClass('btn-success').addClass(
                        'btn-primary');
                    $('#addCampaignModalLabel').text('Edit Campaign');
                    // Populate dropdowns with current template and audience IDs
                    populateCampaignDropdowns(campaign.template_id, campaign.audience_id);
                    $('#addCampaignModal').modal('show');
                }
            });

            $(document).on('click', '.delete-campaign', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                if (confirm('Are you sure you want to delete this campaign?')) {
                    $.ajax({
                            url: `/api/campaigns/${id}`,
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        })
                        .done(() => fetchCampaigns())
                        .fail(error => {
                            console.error('Error deleting campaign:', error);
                            alert('Failed to delete campaign.');
                        });
                }
            });

            // Common Delete Functions
            function deleteSelected(tabId, apiUrl, dataArray, fetchFunction) {
                const selectedIds = $(`#${tabId} .subscriber-checkbox:checked`).map(function() {
                    return $(this).data('id');
                }).get();

                if (selectedIds.length === 0) return;

                if (confirm(`Are you sure you want to delete ${selectedIds.length} selected item(s)?`)) {
                    const deletePromises = selectedIds.map(id =>
                        $.ajax({
                            url: `${apiUrl}/${id}`,
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        })
                    );

                    Promise.all(deletePromises)
                        .then(() => fetchFunction())
                        .catch(error => {
                            console.error(`Error deleting ${tabId}:`, error);
                            alert(`Failed to delete some ${tabId}.`);
                        });
                }
            }

            function clearTable(tabId, apiUrl, dataArray, fetchFunction) {
                if (dataArray.length === 0) {
                    console.log(`No ${tabId} to delete. Data array is empty.`);
                    alert(`No ${tabId} to delete.`);
                    return;
                }

                if (confirm(`Are you sure you want to delete all ${tabId}?`)) {
                    console.log(`Deleting all ${tabId}. Total items: ${dataArray.length}`);
                    const deletePromises = dataArray.map(item => {
                        console.log(`Sending DELETE request for ${tabId} ID: ${item.id}`);
                        return $.ajax({
                            url: `${apiUrl}/${item.id}`,
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        }).catch(error => {
                            console.error(`Failed to delete ${tabId} ID: ${item.id}`,
                                error);
                            return Promise.reject(error);
                        });
                    });

                    Promise.all(deletePromises)
                        .then(() => {
                            console.log(`All ${tabId} deleted successfully.`);
                            fetchFunction();
                            alert(`All ${tabId} deleted successfully.`);
                        })
                        .catch(error => {
                            console.error(`Error clearing ${tabId}:`, error);
                            alert(`Failed to clear some or all ${tabId}. Check console for details.`);
                        });
                }
            }

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
                });
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
                                    populateCampaignDropdowns(currentTemplateId,
                                        audienceId);
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

            $('#import-csv-from-campaign-btn').on('click', function() {
                if (window.debugModal) console.log('Import CSV button clicked');
                const $btn = $(this);
                const $spinner = $btn.find('.loading-spinner');
                const $progress = $('#upload-progress-create');
                const $progressBar = $progress.find('.progress-bar');
                const name = $('#audience-name-csv-create').val().trim();
                const format = $('#csv-format-create').val();
                const fileInput = $('#csv-file-create')[0];
                const currentTemplateId = $('#campaign-template').val();

                if (!name || !fileInput.files || fileInput.files.length === 0) {
                    alert('Audience name and CSV file are required.');
                    return;
                }

                const file = fileInput.files[0];
                const reader = new FileReader();

                $spinner.show();
                $btn.prop('disabled', true);
                $progress.show();
                $progressBar.css('width', '0%').text('0%');

                reader.onload = function(e) {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim() !== '').slice(1);
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

                    if (subscribers.length === 0) {
                        alert('No valid data found in CSV (excluding header).');
                        $spinner.hide();
                        $btn.prop('disabled', false);
                        $progress.hide();
                        return;
                    }

                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += 10;
                        $progressBar.css('width', `${progress}%`).text(`${progress}%`);
                        if (progress >= 90) clearInterval(interval);
                    }, 100);

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
                            const subscribersWithAudience = subscribers.map(sub => ({
                                ...sub,
                                audience_id: audienceId
                            }));
                            $.ajax({
                                    url: '/api/subscribers/bulk',
                                    method: 'POST',
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr(
                                            'content')
                                    },
                                    contentType: 'application/json',
                                    data: JSON.stringify({
                                        subscribers: subscribersWithAudience
                                    })
                                })
                                .done(() => {
                                    clearInterval(interval);
                                    $progressBar.css('width', '100%').text('100%');
                                    setTimeout(() => {
                                        fetchAudiences().then(() => {
                                            $('#createAudienceModal').modal(
                                                'hide');
                                            $('#addCampaignModal').modal(
                                                'show');
                                            populateCampaignDropdowns(
                                                currentTemplateId,
                                                audienceId);
                                            $('#audience-name-csv-create')
                                                .val(
                                                    '');
                                            $('#csv-file-create').val('');
                                            $spinner.hide();
                                            $btn.prop('disabled', false);
                                            $progress.hide();
                                        });
                                    }, 500);
                                })
                                .fail(error => {
                                    clearInterval(interval);
                                    console.error('Error importing subscribers:', error
                                        .responseJSON || error);
                                    alert('Failed to import subscribers: ' + (error
                                        .responseJSON
                                        ?.message || 'Unknown error'));
                                    $spinner.hide();
                                    $btn.prop('disabled', false);
                                    $progress.hide();
                                });
                        })
                        .fail(error => {
                            clearInterval(interval);
                            console.error('Error saving audience:', error.responseJSON ||
                                error);
                            alert('Failed to save audience: ' + (error.responseJSON?.message ||
                                'Unknown error'));
                            $spinner.hide();
                            $btn.prop('disabled', false);
                            $progress.hide();
                        });
                };
                reader.readAsText(file);
            });

            // Preview and Send Functions
            function populateSendSettingsDropdowns() {
                const $previewSelect = $('#preview-campaign-select');
                const $sendSelect = $('#send-campaign-select');
                const $scheduleSelect = $('#schedule-campaign-select');

                $previewSelect.empty().append('<option value="">-- Select Campaign --</option>');
                $sendSelect.empty().append('<option value="">-- Select Campaign --</option>');
                $scheduleSelect.empty().append('<option value="">-- Select Campaign --</option>');

                allCampaigns.forEach(campaign => {
                    const option = `<option value="${campaign.id}">${campaign.name}</option>`;
                    $previewSelect.append(option);
                    $sendSelect.append(option);
                    $scheduleSelect.append(option);
                });
            }

            function renderSubscribers(page, subscribers) {
                const start = (page - 1) * subscribersPageSize;
                const end = start + subscribersPageSize;
                const paginatedSubscribers = subscribers.slice(start, end);
                const $table = $('#subscribers-table');
                $table.empty();

                if (subscribers.length === 0) {
                    $table.append(
                        '<tr><td colspan="6" class="text-center">No subscribers available.</td></tr>');
                } else {
                    paginatedSubscribers.forEach(subscriber => {
                        $table.append(`
                    <tr data-id="${subscriber.id}">
                        <td><input type="checkbox" class="subscriber-checkbox" data-id="${subscriber.id}"></td>
                        <td>${subscriber.id}</td>
                        <td>${subscriber.first_name || ''}</td>
                        <td>${subscriber.last_name || ''}</td>
                        <td>${subscriber.email}</td>
                        <td>${subscriber.status}</td>
                    </tr>
                `);
                    });
                }

                renderSubscribersPagination(subscribers);
                updateButtonStates('preview');
            }

            function renderSubscribersPagination(subscribers) {
                const totalPages = Math.ceil(subscribers.length / subscribersPageSize);
                const $pagination = $('#subscribers-pagination');
                $pagination.empty();
                if (totalPages <= 1) return;
                $pagination.append(
                    `<li class="page-item ${subscribersCurrentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${subscribersCurrentPage - 1}">Previous</a></li>`
                );
                for (let i = 1; i <= totalPages; i++) $pagination.append(
                    `<li class="page-item ${subscribersCurrentPage === i ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`
                );
                $pagination.append(
                    `<li class="page-item ${subscribersCurrentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${subscribersCurrentPage + 1}">Next</a></li>`
                );
            }

            $('#subscribers-pagination').on('click', '.page-link', function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page && page !== subscribersCurrentPage) {
                    subscribersCurrentPage = page;
                    renderSubscribers(subscribersCurrentPage, currentSubscribers);
                }
            });

            $('#subscribers-page-size').on('change', function() {
                subscribersPageSize = parseInt($(this).val());
                subscribersCurrentPage = 1;
                renderSubscribers(subscribersCurrentPage, currentSubscribers);
            });

            $('#preview #delete-selected-btn').on('click', function() {
                const selectedIds = $('#subscribers-table .subscriber-checkbox:checked').map(
                    function() {
                        return $(this).data('id');
                    }).get();

                if (selectedIds.length === 0) return;

                if (confirm(
                        `Are you sure you want to delete ${selectedIds.length} selected subscriber(s)?`
                    )) {
                    const deletePromises = selectedIds.map(id =>
                        $.ajax({
                            url: `/api/subscribers/${id}`,
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        })
                    );

                    Promise.all(deletePromises)
                        .then(() => {
                            const campaignId = $('#preview-campaign-select').val();
                            if (campaignId) {
                                fetchCampaignPreview(campaignId);
                            }
                        })
                        .catch(error => {
                            console.error('Error deleting subscribers:', error);
                            alert('Failed to delete some subscribers.');
                        });
                }
            });

            $('#preview #clear-table-btn').on('click', function() {
                if (currentSubscribers.length === 0) return;

                if (confirm('Are you sure you want to delete all subscribers?')) {
                    const deletePromises = currentSubscribers.map(subscriber =>
                        $.ajax({
                            url: `/api/subscribers/${subscriber.id}`,
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        })
                    );

                    Promise.all(deletePromises)
                        .then(() => {
                            const campaignId = $('#preview-campaign-select').val();
                            if (campaignId) {
                                fetchCampaignPreview(campaignId);
                            }
                        })
                        .catch(error => {
                            console.error('Error clearing subscribers:', error);
                            alert('Failed to clear subscribers.');
                        });
                }
            });

            function fetchCampaignPreview(campaignId) {
                $.get(`/api/campaigns/${campaignId}`)
                    .done(data => {
                        const campaign = data;
                        const audience = allAudiences.find(a => a.id == campaign.audience_id) || {
                            name: 'Unknown',
                            subscribers: []
                        };
                        const template = allTemplates.find(t => t.id == campaign.template_id) || {
                            title: 'Unknown',
                            content: ''
                        };

                        $('#campaign-details').css('display', 'block');
                        $('#campaign-details')[0].offsetHeight;
                        $('#campaign-name').text(campaign.name);
                        $('#campaign-status').text(campaign.status || 'Draft');
                        $('#audience-name').text(audience.name);
                        $('#subscriber-count').text(audience.subscribers?.length || 0);
                        $('#template-title').text(template.title);
                        currentSubscribers = audience.subscribers || [];
                        subscribersCurrentPage = 1;
                        renderSubscribers(subscribersCurrentPage, currentSubscribers);
                        $('#email-preview').html(template.content || '<p>No content available</p>');
                        $('.tab-content .card').css('width', '100%');
                        $('.container').css('min-width', '100%');
                    })
                    .fail(error => {
                        console.error('Error fetching campaign:', error);
                        $('#campaign-details').hide();
                        alert('Failed to load campaign preview.');
                    });
            }

            $('#preview-campaign-select').on('change', function() {
                const campaignId = $(this).val();
                if (campaignId) {
                    fetchCampaignPreview(campaignId);
                } else {
                    $('#campaign-details').css('display', 'none');
                    $('#email-preview').html('');
                    $('#subscribers-table').empty();
                    $('#subscribers-pagination').empty();
                    $('.container').css('min-width', '100%');
                    $('.tab-content .card').css('width', '100%');
                }
            });

            // Campaign Progress Functions
            function updateCampaignProgress(data) {
                console.log('Updating campaign progress:', data);
                $('#progress-total').text(data.total || 0);
                $('#progress-sent').text(data.sent || 0);
                $('#progress-failed').text(data.failed || 0);
                $('#progress-pending').text(data.pending || 0);
                $('#progress-sending').text(data.sending || 0);
                const progress = data.total > 0 ? Math.round((data.sent / data.total) * 100) : 0;
                $('#campaign-progress-bar')
                    .css('width', progress + '%')
                    .attr('aria-valuenow', progress)
                    .text(progress + '%');
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
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                }
                currentCampaignId = campaignId;
                pollingInterval = setInterval(() => {
                    $.get(`/api/campaigns/${campaignId}/progress`)
                        .done(data => {
                            updateCampaignProgress(data);
                            if (data.total > 0 && data.pending === 0 && data.sending === 0) {
                                clearInterval(pollingInterval);
                                pollingInterval = null;
                                currentCampaignId = null;
                            }
                        })
                        .fail(error => {
                            console.error('Error fetching progress:', error);
                        });
                }, 5000);
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

            $('#send-campaign-select, #schedule-campaign-select').on('change', function() {
                const campaignId = $(this).val();
                if (campaignId) {
                    console.log('Campaign selected for progress:', campaignId);
                    startProgressPolling(campaignId);
                } else {
                    stopProgressPolling();
                }
            });

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
                const emailAccounts = $(e.params.data.element).data('emails').split(',');
                const currentValues = $('#fromEmailSelect').val() || [];
                const newValues = [...new Set([...currentValues, ...emailAccounts])];
                $('#fromEmailSelect').val(newValues).trigger('change');
            });

            // Handle region selection for Schedule Campaign
            $('#schedule-from-email').on('select2:select', function(e) {
                const selectedRegion = e.params.data.id;
                const emailAccounts = $(e.params.data.element).data('emails').split(',');
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
                const campaignId = $('#send-campaign-select').val();
                const fromEmails = $('#fromEmailSelect').val() || [];
                const subject = $('#send-subject').val().trim();
                const timeGap = parseInt($('#time-gap').val()) || 1;
                const batchSize = parseInt($('#batch-size').val()) || 2;

                if (!campaignId || !subject || timeGap < 0 || batchSize < 1 || fromEmails.length ===
                    0) {
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
                            batch_size: batchSize
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
                        Batch Size: ${response.batch_size}
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
                        startProgressPolling(campaignId);
                        $form.removeClass('was-validated');
                        $('#send-campaign-select').val('');
                        $('#fromEmailSelect').val(null).trigger('change');
                        $('#send-subject').val('');
                        $('#time-gap').val('1');
                        $('#batch-size').val('2');
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

            // Initialize Select2 for timezone dropdown
            $('#schedule-timezone').select2({
                placeholder: "Select a timezone",
                allowClear: true,
                width: '100%'
            });

            // Update schedule-time input with current time in selected timezone
            $('#schedule-timezone').on('change', function() {
                const selectedTimezone = $(this).val();
                console.log('Selected timezone:', selectedTimezone);
                if (selectedTimezone) {
                    const currentTimeInTimezone = moment().tz(selectedTimezone).format(
                        'YYYY-MM-DDTHH:mm');
                    $('#schedule-time').val(currentTimeInTimezone);
                    console.log('Set schedule-time to:', currentTimeInTimezone);
                } else {
                    $('#schedule-time').val('');
                    console.log('Cleared schedule-time due to no timezone selected');
                }
            });

            // Handle Schedule Campaign Form Submission
            $('#schedule-campaign-form').on('submit', function(e) {
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

                if (!data.from_emails || data.from_emails.length === 0) {
                    $message.html(
                        '<div class="alert alert-danger">Please select at least one region.</div>'
                    );
                    return;
                }

                // Validate schedule time (not in the past)
                const scheduleTime = moment(data.scheduled_at);
                const currentTime = moment().tz(data.timezone || 'UTC');
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

            // Initialize dropdowns and data
            fetchAudiences();
            fetchTemplates();
            fetchCampaigns();

            $('#addCampaignModal').on('show.bs.modal', function() {
                // Only populate dropdowns if not editing (i.e., no campaign ID set)
                if (!$('#campaign-id').val()) {
                    populateCampaignDropdowns();
                }
            });

            $('#addAudienceModal').on('hidden.bs.modal', resetAudienceModal);

            // Checkbox selection handlers
            $('#select-all-audience').on('change', function() {
                $('#audience-list .subscriber-checkbox').prop('checked', this.checked);
                updateButtonStates('audience');
            });

            $('#select-all-templates').on('change', function() {
                $('#templates-list .subscriber-checkbox').prop('checked', this.checked);
                updateButtonStates('templates');
            });

            $('#select-all-campaigns').on('change', function() {
                $('#campaigns-list .subscriber-checkbox').prop('checked', this.checked);
                updateButtonStates('campaigns');
            });

            $('#select-all-subscribers').on('change', function() {
                $('#subscribers-table .subscriber-checkbox').prop('checked', this.checked);
                updateButtonStates('preview');
            });

            $(document).on('change', '.subscriber-checkbox', function() {
                const tabId = $(this).closest('.tab-pane').attr('id');
                updateButtonStates(tabId);
            });

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
    </script>
@endsection
