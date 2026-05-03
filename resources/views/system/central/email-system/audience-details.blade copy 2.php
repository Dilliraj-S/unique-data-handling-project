@php
    // Generate timezone options
    $timezones = [];
    foreach (timezone_identifiers_list() as $tz) {
        $datetime = new DateTime('now', new DateTimeZone($tz));
        $offset = $datetime->getOffset() / 3600;
        $offsetStr = sprintf('GMT%+d:%02d', $offset, abs($offset * 60) % 60);
        $timezones[$tz] = "$offsetStr - $tz";
    }
    asort($timezones);
@endphp

@extends('layouts.system-app')
@section('title', 'Email Scheduling')
@section('top-style')
    <style>
        body {

            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .container {
            max-width: 1200px;
            margin: 20px auto;
            padding: 0 15px;
        }

        .card {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            margin-bottom: 20px;
        }

        .card-header {
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            padding: 10px 15px;
            font-weight: 500;
        }

        .card-body {
            padding: 15px;
        }

        .form-label {
            font-size: 14px;
            margin-bottom: 5px;
        }

        .form-control,
        select {
            height: 38px;
            font-size: 14px;
            border-radius: 5px;
        }

        .nav-tabs .nav-link {
            padding: 8px 15px;
            font-weight: 500;
            color: #495057;
            border: none;
            border-bottom: 2px solid transparent;
        }

        .nav-tabs .nav-link.active {
            background: #f8f9fa;
        }

        .tab-content {
            padding: 15px;
        }

        .sub-tabs .nav-link {
            font-size: 14px;
            padding: 6px 12px;
        }

        .dropdown {
            position: relative;
        }

        .dropdown-menu {
            display: none;
            position: absolute;
            min-width: 120px;
            z-index: 1000;
        }

        .dropdown:hover .dropdown-menu {
            display: block;
        }

        .dropdown-item i {
            margin-right: 5px;
        }

        .loading-spinner {
            display: none;
            margin-left: 10px;
        }

        .progress {
            height: 20px;
            margin-top: 10px;
        }

        .pagination {
            margin-top: 15px;
        }

        .alert {
            margin-top: 10px;
        }
    </style>
@endsection
@section('content')
    <div class="container-xxl flex-grow-1 container-p-y">
        <div class="row gy-2">
            <div class="col-xl-12">
                <div class="container-fluid px-0 d-flex justify-content-between align-items-center">
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item">
                                <a href="javascript:void(0);">Email-System</a>
                            </li>
                            <li class="breadcrumb-item active fw-bold">audience-details</li>
                        </ol>
                    </nav>
                </div>
            </div>
            <div class="container">
                <div class="card">
                    <div class="card-header">
                        <h2>Email Marketing Audience Details</h2>
                        <a href="{{ route('email-scheduler') }}" class="btn btn-secondary btn-sm float-end">Back</a>
                    </div>
                    <div class="card-body">
                        <h3>{{ $audience->name }}</h3>
                        <ul class="nav nav-tabs" id="audienceTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="subscribers-tab" data-bs-toggle="tab"
                                    data-bs-target="#subscribers" type="button" role="tab" aria-controls="subscribers"
                                    aria-selected="true">Subscribers</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="manage-subscribers-tab" data-bs-toggle="tab"
                                    data-bs-target="#manage-subscribers" type="button" role="tab"
                                    aria-controls="manage-subscribers" aria-selected="false">Manage Subscribers</button>
                            </li>
                        </ul>
                        <div class="tab-content" id="audienceTabContent">
                            <div class="tab-pane fade show active" id="subscribers" role="tabpanel"
                                aria-labelledby="subscribers-tab">
                                <div class="d-flex justify-content-between mb-3">
                                    <div>
                                        <button class="btn btn-danger" id="delete-selected-btn" disabled
                                            title="Delete Selected"><i class="bi bi-trash"></i></button>
                                        <button class="btn btn-danger ms-2" id="clear-table-btn" disabled
                                            title="Clear Table">Delete
                                            All</button>
                                        <button class="btn btn-primary ms-2" id="export-subscribers-btn" disabled
                                            title="Export Subscribers"><i
                                                class="bi bi-file-earmark-arrow-down"></i></button>
                                    </div>
                                    <div>
                                        <span>Page Size:</span>
                                        <select id="page-size" class="form-select d-inline-block w-auto">
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="progress mt-3" id="delete-progress" style="display: none;">
                                    <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0"
                                        aria-valuemin="0" aria-valuemax="100">0%</div>
                                </div>
                                <!-- Bootstrap default subscribers table -->
<div class="table-responsive">
    <table class="table table-striped table-bordered align-middle mb-0">
        <thead>
            <tr>
                <th><input type="checkbox" id="select-all"></th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Options</th>
            </tr>
        </thead>
        <tbody id="subscribers-list"></tbody>
    </table>
</div>
                                <nav aria-label="Subscribers pagination">
                                    <ul class="pagination justify-content-center" id="pagination"></ul>
                                </nav>
                            </div>
                            <div class="tab-pane fade" id="manage-subscribers" role="tabpanel"
                                aria-labelledby="manage-subscribers-tab">
                                <ul class="nav nav-tabs sub-tabs" id="manageSubTabs" role="tablist">
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link active" id="manual-add-tab" data-bs-toggle="tab"
                                            data-bs-target="#manual-add" type="button" role="tab"
                                            aria-controls="manual-add" aria-selected="true"><i
                                                class="bi bi-person-plus"></i>
                                            Manually Add</button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="import-csv-tab" data-bs-toggle="tab"
                                            data-bs-target="#import-csv" type="button" role="tab"
                                            aria-controls="import-csv" aria-selected="false"><i
                                                class="bi bi-file-earmark-arrow-up"></i> Import CSV</button>
                                    </li>
                                </ul>
                                <div class="tab-content" id="manageSubTabContent">
                                    <div class="tab-pane fade show active" id="manual-add" role="tabpanel"
                                        aria-labelledby="manual-add-tab">
                                        <div class="mb-3">
                                            <label for="subscriber-format" class="form-label">Select Format</label>
                                            <select class="form-control" id="subscriber-format">
                                                <option value="first-email">First Name, Email</option>
                                                <option value="first-last-email">First Name, Last Name, Email</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label for="subscribers-input" class="form-label">Enter Subscribers (one per
                                                line,
                                                comma-separated)</label>
                                            <textarea class="form-control" id="subscribers-input" rows="5"
                                                placeholder="e.g., John, john@example.com or Jane, Doe, jane@example.com"></textarea>
                                        </div>
                                        <div class="d-flex align-items-center">
                                            <button class="btn btn-success" id="add-subscribers-btn">
                                                Add Subscribers
                                                <span class="spinner-border spinner-border-sm loading-spinner"
                                                    role="status" aria-hidden="true" style="display: none;"></span>
                                            </button>
                                        </div>
                                        <div id="manual-add-error" class="alert alert-danger" style="display: none;">
                                        </div>
                                    </div>
                                    <div class="tab-pane fade" id="import-csv" role="tabpanel"
                                        aria-labelledby="import-csv-tab">
                                        <div class="mb-3">
                                            <label for="csv-format" class="form-label">Select CSV Format</label>
                                            <select class="form-control" id="csv-format">
                                                <option value="first-email">First Name, Email</option>
                                                <option value="first-last-email">First Name, Last Name, Email</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label for="csv-file" class="form-label">Upload CSV File</label>
                                            <input type="file" class="form-control" id="csv-file" accept=".csv">
                                        </div>
                                        <div class="d-flex align-items-center">
                                            <button class="btn btn-success" id="import-csv-btn">Import CSV
                                                <span class="spinner-border spinner-border-sm loading-spinner"
                                                    role="status" aria-hidden="true" style="display: none;"></span>
                                            </button>
                                        </div>
                                        <div class="progress mt-3" id="upload-progress" style="display: none;">
                                            <div class="progress-bar" role="progressbar" style="width: 0%;"
                                                aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                                        </div>
                                        <div id="csv-import-error" class="alert alert-danger" style="display: none;">
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
                                <h5 class="modal-title" id="addAudienceModalLabel">Edit Audience</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"
                                    aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="audience-form">
                                    <input type="hidden" id="audience-id">
                                    <writer: System: <div class="mb-3">
                                        <label for="audience-name" class="form-label">Audience Name</label>
                                        <input type="text" class="form-control" id="audience-name" required>
                            </div>
                            <div class="mb-3">
                                <label for="audience-time" class="form-label">Time of Day</label>
                                <input type="time" class="form-control" id="audience-time" required>
                            </div>
                            <div class="mb-3">
                                <label for="audience-timezone" class="form-label">Time Zone</label>
                                <select class="form-control" id="audience-timezone" required>
                                    @foreach ($timezones as $tz => $label)
                                        <option value="{{ $tz }}">{{ $label }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary" id="save-audience-btn">Update</button>
                            </form>
                        </div>
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
    <script>
        $(document).ready(function() {
            let currentPage = 1;
            let pageSize = 10;
            let allSubscribers = [];

            // Update button states based on selection and data
            function updateButtonStates() {
                $('#delete-selected-btn').prop('disabled', $('.subscriber-checkbox:checked').length === 0);
                $('#clear-table-btn').prop('disabled', allSubscribers.length === 0);
                $('#export-subscribers-btn').prop('disabled', allSubscribers.length === 0);
            }

            // Edit audience
            $('.edit-audience').on('click', function() {
                const id = $(this).data('id');
                $.get(`/api/audiences/${id}`)
                    .done(audience => {
                        $('#audience-id').val(audience.id);
                        $('#audience-name').val(audience.name);
                        $('#audience-time').val(audience.time);
                        $('#audience-timezone').val(audience.timezone);
                        $('#save-audience-btn').text('Update');
                        $('#addAudienceModalLabel').text('Edit Audience');
                        $('#addAudienceModal').modal('show');
                    })
                    .fail(error => {
                        console.error('Error fetching audience:', error);
                        alert('Failed to fetch audience details. Check console for details.');
                    });
            });

            // Save audience
            $('#audience-form').on('submit', function(e) {
                e.preventDefault();
                const audienceId = $('#audience-id').val();
                const audience = {
                    name: $('#audience-name').val(),
                    time: $('#audience-time').val(),
                    timezone: $('#audience-timezone').val()
                };
                $.ajax({
                        url: `/api/audiences/${audienceId}`,
                        method: 'PUT',
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        contentType: 'application/json',
                        data: JSON.stringify(audience)
                    })
                    .done(data => {
                        console.log('Audience updated:', data);
                        $('#addAudienceModal').modal('hide');
                        window.location.reload();
                    })
                    .fail(error => {
                        console.error('Error updating audience:', error);
                        alert('Failed to update audience. Check console for details.');
                    });
            });

            // Reset modal on close
            $('#addAudienceModal').on('hidden.bs.modal', function() {
                $('#audience-id').val('');
                $('#audience-name').val('');
                $('#audience-time').val('');
                $('#audience-timezone').val('');
            });

            // Validate email format
            function isValidEmail(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            }

            // Manually Add Subscribers
            $('#add-subscribers-btn').on('click', function() {
                const $btn = $(this);
                const $spinner = $btn.find('.loading-spinner');
                const $errorDiv = $('#manual-add-error');
                const audienceId = {{ $audience->id }};
                const format = $('#subscriber-format').val();
                const input = $('#subscribers-input').val().trim();
                const lines = input.split('\n').filter(line => line.trim() !== '');

                // Validate input
                if (lines.length === 0) {
                    $errorDiv.text('Please enter at least one subscriber.').show();
                    return;
                }

                const subscribers = lines.map(line => {
                    const parts = line.split(',').map(part => part.trim());
                    if (format === 'first-email' && parts.length === 2 && isValidEmail(parts[1])) {
                        return {
                            first_name: parts[0],
                            email: parts[1],
                            audience_id: audienceId, // Fixed: Use audience_id
                            status: 'subscribed'
                        };
                    } else if (format === 'first-last-email' && parts.length === 3 && isValidEmail(
                            parts[2])) {
                        return {
                            first_name: parts[0],
                            last_name: parts[1],
                            email: parts[2],
                            audience_id: audienceId, // Fixed: Use audience_id
                            status: 'subscribed'
                        };
                    }
                    return null;
                }).filter(sub => sub !== null);

                if (subscribers.length === 0) {
                    $errorDiv.text(
                            'Invalid input format. Use commas, one subscriber per line, and valid emails.')
                        .show();
                    return;
                }

                $spinner.show();
                $btn.prop('disabled', true);
                $errorDiv.hide();

                $.ajax({
                        url: '/api/subscribers/bulk',
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        contentType: 'application/json',
                        data: JSON.stringify({
                            subscribers
                        })
                    })
                    .done(() => {
                        console.log('Subscribers added successfully');
                        $('#subscribers-input').val('');
                        $spinner.hide();
                        $btn.prop('disabled', false);
                        fetchSubscribers();
                    })
                    .fail(error => {
                        console.error('Error adding subscribers:', error.responseText);
                        $errorDiv.text('Failed to add subscribers: ' + (error.responseJSON?.message ||
                            'Unknown error')).show();
                        $spinner.hide();
                        $btn.prop('disabled', false);
                    });
            });

            // Import CSV (Skip Header)
            $('#import-csv-btn').on('click', function() {
                const $btn = $(this);
                const $spinner = $btn.find('.loading-spinner');
                const $progress = $('#upload-progress');
                const $progressBar = $progress.find('.progress-bar');
                const $errorDiv = $('#csv-import-error');
                const audienceId = {{ $audience->id }};
                const format = $('#csv-format').val();
                const fileInput = $('#csv-file')[0];

                if (!fileInput.files || fileInput.files.length === 0) {
                    $errorDiv.text('Please select a CSV file to upload.').show();
                    return;
                }

                const file = fileInput.files[0];
                const reader = new FileReader();

                $spinner.show();
                $btn.prop('disabled', true);
                $progress.show();
                $progressBar.css('width', '0%').text('0%');
                $errorDiv.hide();

                reader.onload = function(e) {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim() !== '');
                    const subscribers = lines.slice(1).map(line => { // Skip first row (header)
                        const parts = line.split(',').map(part => part.trim());
                        if (format === 'first-email' && parts.length >= 2 && isValidEmail(parts[
                                1])) {
                            return {
                                first_name: parts[0],
                                email: parts[1],
                                audience_id: audienceId, // Fixed: Use audience_id
                                status: 'subscribed'
                            };
                        } else if (format === 'first-last-email' && parts.length >= 3 &&
                            isValidEmail(parts[2])) {
                            return {
                                first_name: parts[0],
                                last_name: parts[1],
                                email: parts[2],
                                audience_id: audienceId, // Fixed: Use audience_id
                                status: 'subscribed'
                            };
                        }
                        return null;
                    }).filter(sub => sub !== null);

                    if (subscribers.length === 0) {
                        $errorDiv.text(
                            'No valid data found in CSV (excluding header). Ensure valid email addresses.'
                        ).show();
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
                            url: '/api/subscribers/bulk',
                            method: 'POST',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            },
                            contentType: 'application/json',
                            data: JSON.stringify({
                                subscribers
                            })
                        })
                        .done(() => {
                            clearInterval(interval);
                            $progressBar.css('width', '100%').text('100%');
                            console.log('CSV imported successfully');
                            setTimeout(() => {
                                $spinner.hide();
                                $btn.prop('disabled', false);
                                $progress.hide();
                                fileInput.value = '';
                                fetchSubscribers();
                            }, 500);
                        })
                        .fail(error => {
                            clearInterval(interval);
                            console.error('Error importing CSV:', error.responseText);
                            $errorDiv.text('Failed to import CSV: ' + (error.responseJSON
                                ?.message || 'Unknown error')).show();
                            $spinner.hide();
                            $btn.prop('disabled', false);
                            $progress.hide();
                        });
                };

                reader.readAsText(file);
            });

            // Fetch and render subscribers with pagination
            function fetchSubscribers() {
                const audienceId = {{ $audience->id }};
                return $.get(`/api/audiences/${audienceId}/subscribers`)
                    .done(subscribers => {
                        allSubscribers = subscribers;
                        renderSubscribers(currentPage);
                        renderPagination();
                        updateButtonStates();
                    })
                    .fail(error => {
                        console.error('Error fetching subscribers:', error);
                        alert('Failed to fetch subscribers. Check console for details.');
                    });
            }

            function renderSubscribers(page) {
                const start = (page - 1) * pageSize;
                const end = start + pageSize;
                const paginatedSubscribers = allSubscribers.slice(start, end);
                const $list = $('#subscribers-list');
                $list.empty();

                paginatedSubscribers.forEach(subscriber => {
                    $list.append(`
                        <tr data-id="${subscriber.id}">
                            <td><input type="checkbox" class="subscriber-checkbox" data-id="${subscriber.id}"></td>
                            <td>${subscriber.last_name ? subscriber.first_name + ' ' + subscriber.last_name : subscriber.first_name}</td>
                            <td>${subscriber.email}</td>
                            <td>${subscriber.status.charAt(0).toUpperCase() + subscriber.status.slice(1)}</td>
                            <td>
                                <div class="dropdown">
                                    <button class="btn btn-link" type="button">
                                        <i class="bi bi-three-dots-vertical"></i>
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item unsubscribe-subscriber" href="#" data-id="${subscriber.id}"><i class="bi bi-person-dash"></i> Unsubscribe</a></li>
                                        <li><a class="dropdown-item delete-subscriber" href="#" data-id="${subscriber.id}"><i class="bi bi-trash"></i> Delete</a></li>
                                    </ul>
                                </div>
                            </td>
                        </tr>
                    `);
                });
            }

            function renderPagination() {
                const totalPages = Math.ceil(allSubscribers.length / pageSize);
                const $pagination = $('#pagination');
                $pagination.empty();

                if (totalPages <= 1) return;

                $pagination.append(`
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
                    </li>
                `);

                for (let i = 1; i <= totalPages; i++) {
                    $pagination.append(`
                        <li class="page-item ${currentPage === i ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `);
                }

                $pagination.append(`
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
                    </li>
                `);
            }

            // Pagination controls
            $('#pagination').on('click', '.page-link', function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page && page !== currentPage) {
                    currentPage = page;
                    renderSubscribers(currentPage);
                    renderPagination();
                    updateButtonStates();
                }
            });

            $('#page-size').on('change', function() {
                pageSize = parseInt($(this).val());
                currentPage = 1;
                renderSubscribers(currentPage);
                renderPagination();
                updateButtonStates();
            });

            // Select All and Delete Selected with Progress Bar
            $('#select-all').on('change', function() {
                const isChecked = $(this).is(':checked');
                $('.subscriber-checkbox').prop('checked', isChecked);
                updateButtonStates();
            });

            $('#subscribers-list').on('change', '.subscriber-checkbox', function() {
                const allChecked = $('.subscriber-checkbox').length === $('.subscriber-checkbox:checked')
                    .length;
                $('#select-all').prop('checked', allChecked);
                updateButtonStates();
            });

            $('#delete-selected-btn').on('click', function() {
                const selectedIds = $('.subscriber-checkbox:checked').map((_, el) => $(el).data('id'))
                    .get();
                if (selectedIds.length === 0) return;

                if (confirm(`Are you sure you want to delete ${selectedIds.length} subscriber(s)?`)) {
                    const $progress = $('#delete-progress');
                    const $progressBar = $progress.find('.progress-bar');
                    $progress.show();
                    $progressBar.css('width', '0%').text('0%');
                    $('#delete-selected-btn').prop('disabled', true);
                    $('#clear-table-btn').prop('disabled', true);
                    $('#export-subscribers-btn').prop('disabled', true);

                    let completed = 0;
                    const total = selectedIds.length;
                    const deletePromises = selectedIds.map(id =>
                        $.ajax({
                            url: `/api/subscribers/${id}`,
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        }).then(() => {
                            completed++;
                            const progress = Math.round((completed / total) * 100);
                            $progressBar.css('width', `${progress}%`).text(`${progress}%`);
                        })
                    );

                    Promise.all(deletePromises)
                        .then(() => {
                            setTimeout(() => {
                                $progress.hide();
                                fetchSubscribers();
                            }, 500);
                        })
                        .catch(error => {
                            console.error('Error deleting subscribers:', error);
                            alert('Failed to delete some subscribers. Check console for details.');
                            $progress.hide();
                            fetchSubscribers();
                        });
                }
            });

            // Clear Table with Progress Bar
            $('#clear-table-btn').on('click', function() {
                if (allSubscribers.length === 0) {
                    alert('No subscribers to clear.');
                    return;
                }

                if (confirm(`Are you sure you want to delete all ${allSubscribers.length} subscribers?`)) {
                    const $progress = $('#delete-progress');
                    const $progressBar = $progress.find('.progress-bar');
                    $progress.show();
                    $progressBar.css('width', '0%').text('0%');
                    $('#delete-selected-btn').prop('disabled', true);
                    $('#clear-table-btn').prop('disabled', true);
                    $('#export-subscribers-btn').prop('disabled', true);

                    let completed = 0;
                    const total = allSubscribers.length;
                    const deletePromises = allSubscribers.map(subscriber =>
                        $.ajax({
                            url: `/api/subscribers/${subscriber.id}`,
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        }).then(() => {
                            completed++;
                            const progress = Math.round((completed / total) * 100);
                            $progressBar.css('width', `${progress}%`).text(`${progress}%`);
                        })
                    );

                    Promise.all(deletePromises)
                        .then(() => {
                            setTimeout(() => {
                                $progress.hide();
                                fetchSubscribers();
                            }, 500);
                        })
                        .catch(error => {
                            console.error('Error clearing table:', error);
                            alert('Failed to clear table. Check console for details.');
                            $progress.hide();
                            fetchSubscribers();
                        });
                }
            });

            // Export Subscribers (All or Selected)
            $('#export-subscribers-btn').on('click', function() {
                const selectedIds = $('.subscriber-checkbox:checked').map((_, el) => $(el).data('id'))
                    .get();
                let exportData = allSubscribers;

                if (selectedIds.length > 0) {
                    exportData = allSubscribers.filter(sub => selectedIds.includes(sub.id));
                }

                if (exportData.length === 0) {
                    alert('No subscribers to export.');
                    return;
                }

                const csvContent = [
                    'First Name,Last Name,Email,Status', // CSV Header
                    ...exportData.map(sub =>
                        `${sub.first_name || ''},${sub.last_name || ''},${sub.email},${sub.status}`
                    )
                ].join('\n');

                const blob = new Blob([csvContent], {
                    type: 'text/csv;charset=utf-8;'
                });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `subscribers_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });

            // Unsubscribe Subscriber
            $(document).on('click', '.unsubscribe-subscriber', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                if (confirm('Are you sure you want to unsubscribe this subscriber?')) {
                    $.ajax({
                            url: `/api/subscribers/${id}/unsubscribe`,
                            method: 'PUT',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        })
                        .done(() => fetchSubscribers())
                        .fail(error => {
                            console.error('Error unsubscribing subscriber:', error);
                            alert('Failed to unsubscribe subscriber. Check console for details.');
                        });
                }
            });

            // Delete Subscriber
            $(document).on('click', '.delete-subscriber', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                if (confirm('Are you sure you want to delete this subscriber?')) {
                    $.ajax({
                            url: `/api/subscribers/${id}`,
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        })
                        .done(() => fetchSubscribers())
                        .fail(error => {
                            console.error('Error deleting subscriber:', error);
                            alert('Failed to delete subscriber. Check console for details.');
                        });
                }
            });

            // Initial fetch
            fetchSubscribers();
        });
    </script>
@endsection
