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
    <link rel="stylesheet" href="{{ asset('css/custom-datatable-ui.css') }}?v={{ time() }}">
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
                                <div id="subscribers-table-container"></div>
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
                                                <option value="first-last-email">First Name, Last Name (Optional), Email</option>
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
                                            <label for="csv-format-audience" class="form-label">Select CSV Format</label>
                                            <select class="form-control" id="csv-format-audience">
                                                <option value="first-email">First Name, Email</option>
                                                <option value="first-last-email">First Name, Last Name (Optional), Email</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label for="csv-file-audience" class="form-label">Upload CSV File</label>
                                            <input type="file" class="form-control" id="csv-file-audience"
                                                accept=".csv">
                                        </div>
                                        <div class="d-flex align-items-center">
                                            <button class="btn btn-success" id="upload-csv-audience-btn">Upload CSV
                                                <span class="spinner-border spinner-border-sm loading-spinner"
                                                    role="status" aria-hidden="true" style="display: none;"></span>
                                            </button>
                                        </div>
                                        <div class="progress mt-3" id="csv-upload-progress-audience"
                                            style="display: none;">
                                            <div class="progress-bar" role="progressbar" style="width: 0%;"
                                                aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                                        </div>
                                        <div id="csv-import-error-audience" class="alert alert-danger"
                                            style="display: none;">
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

        <!-- CSV Mapping Modal for Audience Import -->
        <div class="modal fade" id="csvMappingModalAudience" tabindex="-1"
            aria-labelledby="csvMappingModalAudienceLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="csvMappingModalAudienceLabel">Map CSV Columns & Preview</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="csv-mapping-section-audience"></div>
                        <div id="csv-preview-section-audience" class="mt-4"></div>
                        <div id="csv-mapping-error-audience" class="text-danger mt-2"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
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
    <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>
    <script src="{{ asset('js/system/custom-datatable-ui.js') }}?v={{ time() }}"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css">
    <script>
        // Configure toastr
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

        $(document).ready(function() {
            let allSubscribers = [];
            let subscribersTable = null;

            // Initialize subscribers table
            function initializeSubscribersTable() {
                console.log('Initializing subscribers table...');
                console.log('CustomDataTableUI available:', typeof CustomDataTableUI);

                const container = document.querySelector('#subscribers-table-container');
                console.log('Container exists:', container);

                if (!container) {
                    console.error('Subscribers table container not found!');
                    return;
                }

                console.log('Subscribers data:', allSubscribers);

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

                const subscriberActions = [{
                        label: 'Edit',
                        type: 'edit',
                        icon: 'bi bi-pencil'
                    },
                    {
                        label: 'Subscribe',
                        type: 'subscribe',
                        icon: 'bi bi-person-plus',
                        condition: (row) => row.status === 'unsubscribed'
                    },
                    {
                        label: 'Unsubscribe',
                        type: 'unsubscribe',
                        icon: 'bi bi-person-dash',
                        condition: (row) => row.status === 'subscribed'
                    },
                    {
                        label: 'Delete',
                        type: 'delete',
                        icon: 'bi bi-trash'
                    }
                ];

                try {
                    subscribersTable = new CustomDataTableUI('#subscribers-table-container', {
                        columns: subscriberColumns,
                        data: allSubscribers,
                        showSearch: true,
                        showPagination: true,
                        showLengthControl: true,
                        showCheckboxes: true,
                        idField: 'id',
                        customActions: subscriberActions,
                        pageSize: 10,
                        pageSizes: [10, 25, 50, 100],
                        onRowAction: (action, rowData) => {
                            switch (action) {
                                case 'subscribe':
                                    if (confirm(
                                            'Are you sure you want to subscribe this subscriber?')) {
                                        $.ajax({
                                                url: `/api/subscribers/${rowData.id}/subscribe`,
                                                method: 'PUT',
                                                headers: {
                                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]')
                                                        .attr('content')
                                                }
                                            })
                                            .done(() => {
                                                // Update the row data immediately
                                                rowData.status = 'subscribed';

                                                // Refresh the table data in background
                                                fetchSubscribers().then(() => {
                                                    if (subscribersTable) {
                                                        subscribersTable.setData(
                                                            allSubscribers);
                                                    }
                                                });

                                                if (typeof toastr !== 'undefined') {
                                                    toastr.success(
                                                        'Subscriber subscribed successfully!');
                                                } else {
                                                    console.log(
                                                        'Subscriber subscribed successfully!');
                                                }
                                            })
                                            .fail(error => {
                                                console.error('Error subscribing subscriber:',
                                                    error);
                                                if (typeof toastr !== 'undefined') {
                                                    toastr.error('Failed to subscribe subscriber.');
                                                } else {
                                                    alert('Failed to subscribe subscriber.');
                                                }
                                            });
                                    }
                                    break;
                                case 'edit':
                                    // Populate the edit modal with subscriber data
                                    $('#editSubscriberId').val(rowData.id);
                                    $('#editFirstName').val(rowData.first_name);
                                    $('#editLastName').val(rowData.last_name);
                                    $('#editEmail').val(rowData.email);
                                    $('#editSubscriberModal').modal('show');
                                    break;
                                case 'unsubscribe':
                                    if (confirm(
                                            'Are you sure you want to unsubscribe this subscriber?')) {
                                        $.ajax({
                                                url: `/api/subscribers/${rowData.id}/unsubscribe`,
                                                method: 'PUT',
                                                headers: {
                                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]')
                                                        .attr('content')
                                                }
                                            })
                                            .done(() => {
                                                // Update the row data immediately
                                                rowData.status = 'unsubscribed';

                                                // Refresh the table data in background
                                                fetchSubscribers().then(() => {
                                                    if (subscribersTable) {
                                                        subscribersTable.setData(
                                                            allSubscribers);
                                                    }
                                                });

                                                if (typeof toastr !== 'undefined') {
                                                    toastr.success(
                                                        'Subscriber unsubscribed successfully!');
                                                } else {
                                                    console.log(
                                                        'Subscriber unsubscribed successfully!');
                                                }
                                            })
                                            .fail(error => {
                                                console.error('Error unsubscribing subscriber:',
                                                    error);
                                                if (typeof toastr !== 'undefined') {
                                                    toastr.error(
                                                        'Failed to unsubscribe subscriber.');
                                                } else {
                                                    alert('Failed to unsubscribe subscriber.');
                                                }
                                            });
                                    }
                                    break;
                                case 'delete':
                                    if (confirm('Are you sure you want to delete this subscriber?')) {
                                        $.ajax({
                                                url: `/api/subscribers/${rowData.id}`,
                                                method: 'DELETE',
                                                headers: {
                                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]')
                                                        .attr('content')
                                                }
                                            })
                                            .done(() => {
                                                // Remove row immediately for better UX
                                                if (subscribersTable) {
                                                    subscribersTable.removeRowById(rowData.id);
                                                }

                                                // Refresh the table data in background
                                                fetchSubscribers().then(() => {
                                                    if (subscribersTable) {
                                                        subscribersTable.setData(
                                                            allSubscribers);
                                                    }
                                                });

                                                if (typeof toastr !== 'undefined') {
                                                    toastr.success(
                                                        'Subscriber deleted successfully!');
                                                } else {
                                                    console.log('Subscriber deleted successfully!');
                                                }
                                            })
                                            .fail(error => {
                                                console.error('Error deleting subscriber:', error);
                                                if (typeof toastr !== 'undefined') {
                                                    toastr.error('Failed to delete subscriber.');
                                                } else {
                                                    alert('Failed to delete subscriber.');
                                                }
                                            });
                                    }
                                    break;
                            }
                        },
                        onSelectionChange: (selectedRows) => {
                            console.log('Selected subscribers:', selectedRows);
                            // You can add custom logic here when subscribers are selected
                            // For example, enable/disable bulk action buttons
                        },
                        onRefresh: () => {
                            console.log('Refreshing subscribers...');
                            return fetchSubscribers().then(() => {
                                if (subscribersTable) {
                                    subscribersTable.setData(allSubscribers);
                                }
                            });
                        },
                        onBulkDelete: (selectedIds, selectedData) => {
                            console.log('Bulk deleting subscribers:', selectedIds);
                            
                            // Show loading state
                            const deleteBtn = document.querySelector('#subscribers-table-container .delete-selected-btn');
                            if (deleteBtn) {
                                deleteBtn.disabled = true;
                                deleteBtn.innerHTML = '<i class="bi bi-spinner"></i> Deleting...';
                            }
                            
                            // Delete all selected subscribers
                            const deletePromises = selectedIds.map(id => {
                                return $.ajax({
                                    url: `/api/subscribers/${id}`,
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
                                        if (subscribersTable) {
                                            subscribersTable.removeRowById(id);
                                        }
                                    });
                                    
                                    // Clear selection
                                    if (subscribersTable) {
                                        subscribersTable.clearSelection();
                                    }
                                    
                                    // Refresh data in background
                                    fetchSubscribers().then(() => {
                                        if (subscribersTable) {
                                            subscribersTable.setData(allSubscribers);
                                        }
                                    });
                                    
                                    // Show success message
                                    if (typeof toastr !== 'undefined') {
                                        toastr.success(`Successfully deleted ${selectedIds.length} subscriber(s)!`);
                                    } else {
                                        console.log(`Successfully deleted ${selectedIds.length} subscriber(s)!`);
                                    }
                                })
                                .catch(error => {
                                    console.error('Error during bulk delete:', error);
                                    if (typeof toastr !== 'undefined') {
                                        toastr.error('Failed to delete some subscribers.');
                                    } else {
                                        alert('Failed to delete some subscribers.');
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
                    console.log('Subscribers table initialized successfully');
                } catch (error) {
                    console.error('Error initializing subscribers table:', error);
                }
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
                            last_name: null, // Allow null last name
                            email: parts[1],
                            audience_id: audienceId, // Fixed: Use audience_id
                            status: 'subscribed'
                        };
                    } else if (format === 'first-last-email' && parts.length === 3 && isValidEmail(
                            parts[2])) {
                        return {
                            first_name: parts[0],
                            last_name: parts[1] || null, // Allow empty last name
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

            // Advanced CSV Import for Audience
            $('#upload-csv-audience-btn').on('click', function() {
                const $btn = $(this);
                const $spinner = $btn.find('.loading-spinner');
                const $progress = $('#csv-upload-progress-audience');
                const $progressBar = $progress.find('.progress-bar');
                const $errorDiv = $('#csv-import-error-audience');
                const fileInput = $('#csv-file-audience')[0];

                if (!fileInput.files || fileInput.files.length === 0) {
                    $errorDiv.text('Please select a CSV file to upload.').show();
                    return;
                }

                const file = fileInput.files[0];
                const formData = new FormData();
                formData.append('file', file);

                $spinner.show();
                $btn.prop('disabled', true);
                $progress.show();
                $progressBar.css('width', '0%').attr('aria-valuenow', 0).text('0%');
                $errorDiv.hide();

                $.ajax({
                    url: '/audience/upload-csv',
                    method: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    xhr: function() {
                        var xhr = new window.XMLHttpRequest();
                        xhr.upload.addEventListener('progress', function(evt) {
                            if (evt.lengthComputable) {
                                var percent = Math.round((evt.loaded / evt.total) *
                                    100);
                                $('#csv-upload-progress-audience').show();
                                $('#csv-upload-progress-audience .progress-bar')
                                    .css('width', percent + '%')
                                    .attr('aria-valuenow', percent)
                                    .text(percent + '%');
                            }
                        }, false);
                        return xhr;
                    },
                    beforeSend: function() {
                        $('#csv-upload-progress-audience').show();
                        $('#csv-upload-progress-audience .progress-bar').css('width', '0%')
                            .attr(
                                'aria-valuenow', 0).text('0%');
                    },
                    success: function(res) {
                        $('#csv-upload-progress-audience').hide();
                        $btn.prop('disabled', false);
                        showCsvMappingModalAudience(res.header, res.sample, res.row_count, res
                            .token);
                    },
                    error: function(xhr) {
                        $('#csv-upload-progress-audience').hide();
                        $btn.prop('disabled', false);
                        console.error('Upload error:', xhr);
                        console.error('Response:', xhr.responseText);
                        console.error('Status:', xhr.status);
                        console.error('Response JSON:', xhr.responseJSON);

                        let errorMsg = 'Failed to read CSV';
                        if (xhr.responseJSON?.error) {
                            errorMsg += ': ' + xhr.responseJSON.error;
                        } else if (xhr.responseJSON?.message) {
                            errorMsg += ': ' + xhr.responseJSON.message;
                        } else if (xhr.status === 422) {
                            errorMsg += ': Validation failed - check file format and size';
                        } else if (xhr.status === 404) {
                            errorMsg += ': Route not found';
                        } else if (xhr.status === 419) {
                            errorMsg += ': CSRF token mismatch';
                        } else {
                            errorMsg += ': ' + (xhr.responseText || 'Unknown error');
                        }

                        toastr.error(errorMsg);
                    }
                });
            });

            // CSV Mapping Modal for Audience
            function showCsvMappingModalAudience(header, sample, rowCount, token) {
                const fields = [{
                        key: 'first_name',
                        label: 'First Name',
                        required: true
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
                        `<div class="col"><label>Column ${idx+1}: <strong>${col}</strong></label><select class="form-select csv-map-select-audience" data-col="${idx}">`;
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
                            <span class="text-muted"><strong>Total rows:</strong> <span id="csv-total-rows-audience" class="badge bg-primary">${rowCount.toLocaleString()}</span></span>
                        </div>
                        <div class="col-md-6">
                            <label class="mb-0 d-flex align-items-center gap-2">
                                <span>Import rows from</span>
                                <input type="number" min="1" max="${rowCount}" value="1" id="csv-row-range-from-audience" 
                                       style="min-width:80px;width:auto;max-width:150px;" 
                                       class="form-control form-control-sm" 
                                       placeholder="1" />
                                <span>to</span>
                                <input type="number" min="1" max="${rowCount}" value="${rowCount}" id="csv-row-range-to-audience" 
                                       style="min-width:80px;width:auto;max-width:150px;" 
                                       class="form-control form-control-sm" 
                                       placeholder="${rowCount}" />
                            </label>
                        </div>
                        <div class="col-md-2">
                            <button type="button" class="btn btn-outline-primary btn-sm w-100" id="csv-select-all-btn-audience">
                                <i class="bi bi-check-all"></i> Select All
                            </button>
                        </div>
                    </div>
                </div>`;

                // Sample preview
                mappingHtml += '<div class="mb-3"><h6>Sample Data Preview:</h6>';
                mappingHtml +=
                    '<div id="csv-preview-table-container-audience" style="max-height:350px;overflow-y:auto;">';
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
                    <button type="button" class="btn btn-primary" id="import-mapped-csv-btn-audience">Import</button>
                    <span id="csv-import-progress-audience" style="display:none;" class="text-muted">
                        <span class="spinner-border spinner-border-sm me-1"></span>
                        <span id="csv-import-progress-text-audience">Starting...</span>
                    </span>
                </div>
                <div id="csv-import-results-audience"></div>`;

                $('#csv-mapping-section-audience').html(mappingHtml);
                $('#csvMappingModalAudience').modal('show');

                // Select All button logic
                $('#csv-select-all-btn-audience').off('click').on('click', function() {
                    $('#csv-row-range-from-audience').val(1);
                    $('#csv-row-range-to-audience').val(rowCount);
                });

                // Auto-resize range inputs based on content
                function resizeRangeInputsAudience() {
                    $('#csv-row-range-from-audience, #csv-row-range-to-audience').each(function() {
                        const input = $(this);
                        const value = input.val();
                        const tempSpan = $('<span>').text(value).css({
                            'position': 'absolute',
                            'visibility': 'hidden',
                            'white-space': 'pre',
                            'font-family': input.css('font-family'),
                            'font-size': input.css('font-size'),
                            'padding': input.css('padding')
                        });
                        $('body').append(tempSpan);
                        const width = tempSpan.width() + 20; // Add some padding
                        tempSpan.remove();

                        const minWidth = 80;
                        const maxWidth = 150;
                        const newWidth = Math.max(minWidth, Math.min(maxWidth, width));
                        input.css('width', newWidth + 'px');
                    });
                }

                // Resize on input change
                $('#csv-row-range-from-audience, #csv-row-range-to-audience').off('input').on('input',
                    resizeRangeInputsAudience);

                // Initial resize
                setTimeout(resizeRangeInputsAudience, 100);

                // Add CSS for better input styling
                if (!$('#csv-range-inputs-style-audience').length) {
                    $('head').append(`
                        <style id="csv-range-inputs-style-audience">
                            #csv-row-range-from-audience, #csv-row-range-to-audience {
                                transition: width 0.2s ease;
                                text-align: center;
                                font-weight: 500;
                            }
                            #csv-row-range-from-audience:focus, #csv-row-range-to-audience:focus {
                                border-color: #0d6efd;
                                box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
                            }
                            .csv-range-container {
                                background: #f8f9fa;
                                border-radius: 8px;
                                padding: 15px;
                                border: 1px solid #dee2e6;
                            }
                            #csv-upload-progress-audience {
                                height: 25px;
                                border-radius: 12px;
                                overflow: hidden;
                            }
                            #csv-upload-progress-audience .progress-bar {
                                background: linear-gradient(45deg, #007bff, #0056b3);
                                font-size: 12px;
                                font-weight: 600;
                                line-height: 25px;
                            }
                            #csv-import-progress-audience {
                                font-size: 14px;
                                font-weight: 500;
                            }
                        </style>
                    `);
                }

                // On import
                $('#import-mapped-csv-btn-audience').off('click').on('click', function() {
                    const mapping = {};
                    $('.csv-map-select-audience').each(function() {
                        const colIdx = $(this).data('col');
                        const field = $(this).val();
                        if (field) mapping[colIdx] = field;
                    });
                    const from = parseInt($('#csv-row-range-from-audience').val());
                    const to = parseInt($('#csv-row-range-to-audience').val());
                    const format = $('#csv-format-audience').val();
                    const audienceId = {{ $audience->id }};

                    $('#csv-import-progress-audience').show();
                    $('#csv-import-progress-text-audience').text('Starting import...');

                    // Fallback progress counter
                    let fallbackProgress = 0;
                    let fallbackInterval = setInterval(function() {
                        fallbackProgress += 1;
                        if (fallbackProgress <= 90) { // Don't go to 100% until we get real progress
                            $('#csv-import-progress-text-audience').text(
                                `Processing... ${fallbackProgress}%`);
                        }
                    }, 2000); // Update every 2 seconds

                    // Start progress tracking
                    let progressInterval = setInterval(function() {
                        $.get('/audience/import-progress', {
                            token: token
                        }, function(progressRes) {
                            if (progressRes.current !== undefined && progressRes.total) {
                                const percent = Math.round((progressRes.current /
                                    progressRes.total) * 100);
                                $('#csv-import-progress-text-audience').text(
                                    `${progressRes.current} / ${progressRes.total} (${percent}%)`
                                );
                                // Reset fallback progress when we get real progress
                                fallbackProgress = percent;
                            } else {
                                $('#csv-import-progress-text-audience').text(
                                    'Processing...');
                            }
                        }).fail(function(xhr) {
                            // If progress endpoint fails, just show indeterminate progress
                            $('#csv-import-progress-text-audience').text('Processing...');
                        });
                    }, 500); // Check every 500ms for more responsive updates

                    $.ajax({
                        url: '/audience/process-csv',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            token,
                            mapping,
                            from,
                            to,
                            audience_id: audienceId,
                            format,
                            _token: $('meta[name="csrf-token"]').attr('content')
                        }),
                        success: function(res) {
                            clearInterval(progressInterval);
                            clearInterval(fallbackInterval);
                            $('#csv-import-progress-audience').hide();

                            // Show detailed results
                            let message = `Import completed!\n\n`;
                            message +=
                                `✅ Successfully imported: ${res.inserted_count} subscribers\n`;
                            message += `❌ Failed rows: ${res.failed_count}\n`;
                            message += `📄 Remaining rows: ${res.remaining_count}\n`;
                            message += `📊 Total rows in file: ${res.total_rows_in_file}\n`;
                            message += `📋 Imported range: ${res.imported_range}`;

                            toastr.success(message);

                            // Show download buttons if needed
                            let downloadHtml = '';
                            if (res.failed_csv) {
                                downloadHtml += `<a href="${res.failed_csv}" class="btn btn-warning btn-sm me-2" onclick="downloadCsvAudience('${res.failed_csv}')">
                                    <i class="bi bi-download"></i> Download Failed Rows (${res.failed_count})
                                </a>`;
                            }
                            if (res.remaining_csv) {
                                downloadHtml += `<a href="${res.remaining_csv}" class="btn btn-info btn-sm" onclick="downloadCsvAudience('${res.remaining_csv}')">
                                    <i class="bi bi-download"></i> Download Remaining Rows (${res.remaining_count})
                                </a>`;
                            }

                            if (downloadHtml) {
                                $('#csv-import-results-audience').html(`
                                    <div class="alert alert-success mt-3">
                                        <h6><i class="bi bi-check-circle"></i> Import Complete - Download Files:</h6>
                                        <p class="mb-2">Your CSV import has been processed. You can download the following files:</p>
                                        ${downloadHtml}
                                        <hr>
                                        <button type="button" class="btn btn-secondary btn-sm" onclick="$('#csvMappingModalAudience').modal('hide'); $('#csv-import-results-audience').html('');">
                                            <i class="bi bi-x-circle"></i> Close Modal
                                        </button>
                                    </div>
                                `);
                            } else {
                                // Only close modal if no download files
                                setTimeout(() => {
                                    $('#csvMappingModalAudience').modal('hide');
                                }, 3000);
                            }

                            // Refresh subscriber list
                            fetchSubscribers();
                        },
                        error: function(xhr) {
                            clearInterval(progressInterval);
                            clearInterval(fallbackInterval);
                            $('#csv-import-progress-audience').hide();

                            console.error('CSV Import Error:', {
                                status: xhr.status,
                                statusText: xhr.statusText,
                                responseText: xhr.responseText,
                                responseJSON: xhr.responseJSON
                            });

                            let errorMsg = 'Import failed';
                            if (xhr.responseJSON?.error) {
                                errorMsg += ': ' + xhr.responseJSON.error;
                            } else if (xhr.responseJSON?.message) {
                                errorMsg += ': ' + xhr.responseJSON.message;
                            } else if (xhr.responseJSON?.details) {
                                errorMsg += ': ' + JSON.stringify(xhr.responseJSON.details);
                            } else if (xhr.status === 422) {
                                errorMsg += ': Validation error - check your input data';
                            } else if (xhr.status === 404) {
                                errorMsg += ': Route not found';
                            } else if (xhr.status === 419) {
                                errorMsg += ': CSRF token mismatch - please refresh the page';
                            } else {
                                errorMsg += ': ' + (xhr.responseText || 'Unknown error');
                            }
                            toastr.error(errorMsg);
                        }
                    });
                });
            }

            // Download CSV function for audience
            function downloadCsvAudience(url) {
                // Create a temporary link element
                const link = document.createElement('a');
                link.href = url;
                link.download = url.split('/').pop() || 'download.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            // Fetch subscribers
            function fetchSubscribers() {
                const audienceId = {{ $audience->id }};
                return $.get(`/api/audiences/${audienceId}/subscribers`)
                    .done(subscribers => {
                        allSubscribers = subscribers || [];
                        console.log('Fetched subscribers:', allSubscribers);

                        // Initialize table if not already done
                        if (!subscribersTable) {
                            initializeSubscribersTable();
                        } else {
                            // Update existing table
                            subscribersTable.setData(allSubscribers);
                        }
                    })
                    .fail(error => {
                        console.error('Error fetching subscribers:', error);
                        allSubscribers = [];
                        if (typeof toastr !== 'undefined') {
                            toastr.error('Failed to fetch subscribers.');
                        } else {
                            alert('Failed to fetch subscribers. Check console for details.');
                        }
                    });
            }

            // Save subscriber changes
            $('#saveSubscriberChanges').on('click', function() {
                const subscriberId = $('#editSubscriberId').val();
                const firstName = $('#editFirstName').val().trim();
                const lastName = $('#editLastName').val().trim();
                const email = $('#editEmail').val().trim();
                
                // Validate required fields
                if (!firstName) {
                    if (typeof toastr !== 'undefined') {
                        toastr.error('First name is required.');
                    } else {
                        alert('First name is required.');
                    }
                    return;
                }
                
                if (!email) {
                    if (typeof toastr !== 'undefined') {
                        toastr.error('Email is required.');
                    } else {
                        alert('Email is required.');
                    }
                    return;
                }
                
                // Validate email format
                if (!isValidEmail(email)) {
                    if (typeof toastr !== 'undefined') {
                        toastr.error('Please enter a valid email address.');
                    } else {
                        alert('Please enter a valid email address.');
                    }
                    return;
                }
                
                const subscriberData = {
                    first_name: firstName,
                    last_name: lastName || null, // Allow null/empty last name
                    email: email
                };

                $.ajax({
                        url: `/api/subscribers/${subscriberId}`,
                        method: 'PUT',
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
                            'Content-Type': 'application/json'
                        },
                        data: JSON.stringify(subscriberData)
                    })
                    .done(response => {
                        // Close the modal
                        $('#editSubscriberModal').modal('hide');

                        // Update the row data immediately
                        const subscriber = allSubscribers.find(s => s.id == subscriberId);
                        if (subscriber) {
                            subscriber.first_name = subscriberData.first_name;
                            subscriber.last_name = subscriberData.last_name || '';
                            subscriber.email = subscriberData.email;
                        }

                        // Refresh the table data in background
                        fetchSubscribers().then(() => {
                            if (subscribersTable) {
                                subscribersTable.setData(allSubscribers);
                            }
                        });

                        if (typeof toastr !== 'undefined') {
                            toastr.success('Subscriber updated successfully!');
                        } else {
                            alert('Subscriber updated successfully!');
                        }
                    })
                    .fail(error => {
                        console.error('Error updating subscriber:', error);
                        let errorMessage = 'Failed to update subscriber.';
                        
                        // Try to extract error message from response
                        if (error.responseJSON && error.responseJSON.message) {
                            errorMessage = error.responseJSON.message;
                        } else if (error.responseJSON && error.responseJSON.errors) {
                            const errors = Object.values(error.responseJSON.errors).flat();
                            errorMessage = errors.join(', ');
                        }
                        
                        if (typeof toastr !== 'undefined') {
                            toastr.error(errorMessage);
                        } else {
                            alert(errorMessage);
                        }
                    });
            });



            // Initial fetch
            fetchSubscribers();
        });
    </script>

    <!-- Edit Subscriber Modal -->
    <div class="modal fade" id="editSubscriberModal" tabindex="-1" aria-labelledby="editSubscriberModalLabel"
        aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="editSubscriberModalLabel">Edit Subscriber</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="editSubscriberForm">
                        <input type="hidden" id="editSubscriberId">
                        <div class="mb-3">
                            <label for="editFirstName" class="form-label">First Name</label>
                            <input type="text" class="form-control" id="editFirstName" required>
                        </div>
                        <div class="mb-3">
                            <label for="editLastName" class="form-label">Last Name</label>
                            <input type="text" class="form-control" id="editLastName">
                        </div>
                        <div class="mb-3">
                            <label for="editEmail" class="form-label">Email</label>
                            <input type="email" class="form-control" id="editEmail" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="saveSubscriberChanges">Save Changes</button>
                </div>
            </div>
        </div>
    </div>
@endsection
