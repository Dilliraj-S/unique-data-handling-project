{{-- Template: Update Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Update')
@section('top-style')
<style>
    /* Remove left padding/margin for better alignment */
    .container {
        margin-left: -18px;
        margin-right: -18px;
    }
    
    .card {
        margin-left: 0;
        margin-right: 0;
    }
</style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/chosen/1.8.7/chosen.min.css" crossorigin="anonymous" />
    <!-- Select2 CSS (add to head or CSS file if not global) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/css/select2.min.css"
        crossorigin="anonymous">

@endsection
@section('bottom-script')
    <!-- jQuery CDN (already included globally) -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js" crossorigin="anonymous"></script>
    <!-- Select2 CDN (already included globally) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/js/select2.min.js" crossorigin="anonymous">
    </script>
    <script>
        $(document).ready(function() {

            // Re-initialize select2 for all dropdowns
            window.select = function() {
                $('[data-select="dropdown"]').each(function() {
                    const $select = $(this);

                    if ($select.hasClass('select2-hidden-accessible')) {
                        $select.select2('destroy');
                    }

                    $select.select2({
                        width: '100%',
                        placeholder: $select.find('option:first').text(),
                        allowClear: true
                    });
                });
            };



            // Show/hide sections based on radio selection
            $('input[name="mode"]').on('click', function() {
                const selectedMode = $('input[name="mode"]:checked').val();
                if (selectedMode === 'csv') {
                    $('#csvSection').removeClass('d-none').show();
                    $('#dbSection').addClass('d-none').hide();
                } else if (selectedMode === 'db') {
                    $('#dbSection').removeClass('d-none').show();
                    $('#csvSection').addClass('d-none').hide();
                }
            }).filter(':checked').trigger('click');

            // CSV upload change handler
            $('.csv-file-input').on('change', function() {
                const file = this.files[0];
                const $dropdowns = $('.csv-dropdown');

                console.log(' File selected:', file ? file.name : 'No file');

                if (!file || !file.name.toLowerCase().endsWith('.csv')) {
                    console.warn(' Invalid file type or no file selected.');
                    $dropdowns.each(function() {
                        $(this).html('<option value="">Upload a CSV</option>').val('');
                        if ($(this).hasClass('select2-hidden-accessible')) {
                            $(this).select2('destroy');
                        }
                    });
                    window.select();
                    return;
                }

                const reader = new FileReader();

                reader.onload = function(e) {
                    const content = e.target.result;
                    const lines = content.split(/\r?\n/);
                    const headerLine = lines[0] || '';

                    const headers = headerLine
                        .split(',')
                        .map(h => h.trim().replace(/^"|"$/g, ''))
                        .filter(Boolean);

                    console.log('Parsed Headers:', headers);

                    if (!headers.length) {
                        console.error('No valid headers found in the first row.');
                        $dropdowns.each(function() {
                            $(this).html('<option value="">No valid headers</option>').val('');
                            if ($(this).hasClass('select2-hidden-accessible')) {
                                $(this).select2('destroy');
                            }
                        });
                        window.select();
                        return;
                    }

                    const optionsHtml = headers.map(h => `<option value="${h}">${h}</option>`).join('');
                    const optionsList = headers.map(h => ({
                        value: h,
                        view: h
                    }));

                    $dropdowns.each(function() {
                        const $select = $(this);
                        $select.html(
                            `<option  disabled value="">Select columns</option>${optionsHtml}`
                        );
                        $select.data('options-list', optionsList);
                        if ($select.hasClass('select2-hidden-accessible')) {
                            $select.select2('destroy');
                        }
                    });
                    console.log('Dropdowns populated with CSV headers.');
                    window.select();
                };
                reader.onerror = function() {
                    console.error('File read failed:', reader.error);
                    alert('Failed to read the CSV file.');
                };
                reader.readAsText(file);
            });
        });
    </script>
@endsection

@section('content')
<div class="container-xxl flex-grow-1 container-p-y">
    <div class="row gy-2">
        <div class="col-xl-12">
            <div class="container-fluid px-0 d-flex justify-content-between align-items-center">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item">
                            <a href="javascript:void(0);">Query Nest</a>
                        </li>
                        <li class="breadcrumb-item active fw-bold">Update</li>
                    </ol>
                </nav>
            </div>
        </div>

        <div class="col-xl-12">
            <div class="row g-4">
                        <!-- Update by Select -->
                        <div class="col-lg-6 col-md-6 col-sm-12 ">
                            <div class="card border-light shadow-lg rounded flex-fill">
                                <div class="card-header bg-primary text-white text-center rounded-top">
                                    <h5 class="mb-0 text-white">Update by Select</h5>
                                </div>
                                <div class="card-body p-5">
                                    <div class="row g-4 mb-4">
                                        <div class="col-12">
                                            <p class="fs-6"><strong>Instructions:</strong></p>
                                            <ul class="list-styled">
                                                <li>You can <strong>Update Fields</strong> by selecting the table, match
                                                    field,
                                                    and update field.</li>
                                                <li>Enter the match value and update value in the provided text areas.</li>
                                                <li><strong>Caution:</strong> Any updates may affect existing data. Proceed
                                                    with
                                                    <strong>care</strong>.
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <form action="{{ url('/skeleton-action/') }}/@skeletonToken('central_unique_update_byselect')_f" class="update-form"
                                        data-type="field">
                                        @csrf
                                        <input type="hidden" name="save_token" value="@skeletonToken('central_unique_update_byselect')">
                                        <div class="row g-3">
                                            <div class="col-lg-6 col-md-6 col-sm-12">
                                                <div class="form-floating form-floating-outline">
                                                    <select class="form-select border-primary unique-select-dropdown"
                                                        id="selectDatabase" data-select="dropdown"
                                                        data-target="@skeletonToken('central_unique_database')_s" data-ctx="1" name="database">
                                                        <option value="" selected disabled>Select Database</option>
                                                        @php
                                                            $allowedDatabases = App\Facades\Skeleton::getAuthenticatedUser()
                                                                ->access_db;
                                                            $options = explode(',', $allowedDatabases);
                                                        @endphp
                                                        @foreach ($options as $db)
                                                            <option value="{{ $db }}">{{ $db }}</option>
                                                        @endforeach
                                                    </select>
                                                    <label for="selectDatabase">Database</label>
                                                </div>
                                            </div>
                                            <div class="col-lg-6 col-md-6 col-sm-12">
                                                <div class="form-floating form-floating-outline">
                                                    <select class="form-select border-primary unique-select-dropdown"
                                                        id="selectTable" name="table" data-select="dynamic"
                                                        data-source="@skeletonToken('central_unique_database')_s" data-ctx="1"
                                                        data-target="@skeletonToken('central_unique_columns')_s">
                                                        <option value="" selected disabled>Select Table</option>
                                                    </select>
                                                    <label for="selectTable">Table</label>
                                                </div>
                                            </div>
                                            <div class="col-lg-6 col-md-6 col-sm-12">
                                                <div class="form-floating form-floating-outline">
                                                    <select class="form-select border-primary unique-select-dropdown"
                                                        id="headersDropdown" name="header" data-select="dynamic"
                                                        data-source="@skeletonToken('central_unique_columns')_s" data-ctx="1">

                                                        <option value="" selected disabled>Select Header</option>
                                                    </select>
                                                    <label for="headersDropdown">Header</label>
                                                </div>
                                            </div>
                                            <div class="col-lg-6 col-md-6 col-sm-12">
                                                <div class="form-floating form-floating-outline">
                                                    <select class="form-select border-primary" id="functionDropdown"
                                                        name="function">
                                                        <option value="">Select Function</option>
                                                        <option value="LOWER">LOWER</option>
                                                        <option value="LTRIM">LTRIM</option>
                                                        <option value="RTRIM">RTRIM</option>
                                                        <option value="TRIM">TRIM</option>
                                                        <option value="UPPER">UPPER</option>
                                                    </select>
                                                    <label for="functionDropdown">Function</label>
                                                </div>
                                            </div>
                                            <div class="col-lg-6 col-md-6 col-sm-12">
                                                <div class="form-floating form-floating-outline">
                                                    <textarea class="form-control border-primary" name="matchvalue" id="matchValue" rows="2"
                                                        placeholder="Enter comma-separated match values"></textarea>
                                                    <label for="matchValue">Match Value</label>
                                                    <small class="text-muted">Use comma to separate multiple match
                                                        values</small>
                                                </div>
                                            </div>

                                            <div class="col-lg-6 col-md-6 col-sm-12">
                                                <div class="form-floating form-floating-outline">
                                                    <textarea class="form-control border-primary" id="updateValue" name="updatevalue" rows="2"
                                                        placeholder="Enter comma-separated update values"></textarea>
                                                    <label for="updateValue">Update Value</label>
                                                    <small class="text-muted">Use comma to separate multiple update
                                                        values</small>
                                                </div>
                                            </div>

                                            <div class="text-center my-4 col-12" id="data-loading" style="display: none;">
                                                <div class="spinner-grow text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                                <p class="mt-2 text-primary">Fetching data... Please hold tight!</p>
                                            </div>
                                            <!-- Result Messages -->
                                            <div id="resultMessages" class="mt-4 h-100 col-12"></div>
                                            <!-- Submit Button -->
                                            <div class="col-12 text-end">
                                                <button type="submit" class="btn btn-primary btn-sm">
                                                    <i class="fa-solid fa-pen-to-square me-2"></i> Update
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>




                        <!-- Update with CSV -->
                        <div class="col-lg-6 col-md-6 col-sm-12">
                            <div class="card border-primary flex-fill">
                                <div class="card-header text-center bg-primary text-white mb-4">
                                    <h5 class="mb-0 text-white">Update with CSV</h5>
                                </div>
                                <div class="card-body p-4">
                                    <div class="row g-4 mb-4">
                                        <div class="col-12">
                                            <p class="fs-6"><strong>Instructions:</strong></p>
                                            <ul class="list-styled">
                                                <li>You can <strong>Update Fields</strong> by Uploading the csv, choose
                                                    match field,
                                                    and choose update field.</li>
                                                <li>You can <strong>Update Fields</strong> by Selecting the Source form
                                                    Database, choose match field,
                                                    and choose update field.</li>
                                                <li><strong>Enter/Choose</strong> the match value and update value in the
                                                    provided text areas.</li>
                                                <li><strong>Caution:</strong> Any updates may affect existing data. Proceed
                                                    with
                                                    <strong>care</strong>.
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <form action="{{ url('/skeleton-action/') }}/@skeletonToken('central_unique_update_bycsv')_f" class="update-form"
                                        data-type="csv" enctype="multipart/form-data">
                                        @csrf
                                        <input type="hidden" name="save_token" value="@skeletonToken('central_unique_update_bycsv')">
                                        <div class="row mb-4">
                                            <div class="col-6">
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="mode"
                                                        value="csv" id="modeCsv" checked>
                                                    <label for="modeCsv" class="form-check-label">📂 CSV to
                                                        Database</label>
                                                </div>
                                            </div>
                                            <div class="col-6">
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="mode"
                                                        value="db" id="modeDb">
                                                    <label for="modeDb" class="form-check-label">🔁 Database to
                                                        Database</label>
                                                </div>
                                            </div>
                                        </div>

                                        <div id="csvSection" class="row">
                                            <!-- CSV Upload Section -->
                                            <div class="col-12">
                                                <div class="form-floating form-floating-outline mb-3">
                                                    <input type="file"
                                                        class="form-control border-primary csv-file-input" id="csvFile"
                                                        name="csv_file" accept=".csv">
                                                    <label for="csvFile">Upload CSV File</label>
                                                </div>
                                            </div>

                                            <!-- Match Columns with Select -->
                                            <div class="col-12 col-md-6">
                                                <div class="form-floating form-floating-outline mb-3">
                                                    <select class="form-select border-primary csv-dropdown p-1"
                                                        id="csvMColumns" name="match_columns[]" data-select="dropdown"
                                                        multiple height="38px">
                                                        <option value="" disabled>Select Match Columns</option>
                                                    </select>
                                                    <label for="csvMColumns">Choose Match Columns</label>
                                                </div>
                                            </div>

                                            <!-- Update Columns with Select -->
                                            <div class="col-12 col-md-6">
                                                <div class="form-floating form-floating-outline mb-3">
                                                    <select class="form-select border-primary csv-dropdown p-1"
                                                        id="csvUColumns" name="update_columns[]" data-select="dropdown"
                                                        multiple height="38px">
                                                        <option value="" disabled>Select Update Columns</option>
                                                    </select>
                                                    <label for="csvUColumns">Choose Update Columns</label>
                                                </div>
                                            </div>
                                        </div>


                                        <!-- Database Section -->
                                        <div id="dbSection" class="d-none">
                                            <div class="row">
                                                <div class="col-12 col-md-6 col-lg-6">
                                                    <div class="form-floating form-floating-outline mb-3">
                                                        <select class="form-select border-primary" data-select="dropdown"
                                                            id="sourceDatabase" data-target="@skeletonToken('central_unique_database')_s"
                                                            data-ctx="2" name="source_database"
                                                            aria-placeholder="select database">
                                                            <option value="" selected disabled>Select Database
                                                            </option>
                                                            @php
                                                                $allowedDatabases = App\Facades\Skeleton::getAuthenticatedUser()
                                                                    ->access_db;
                                                                $options = explode(',', $allowedDatabases);
                                                            @endphp
                                                            @foreach ($options as $db)
                                                                <option value="{{ $db }}">{{ $db }}
                                                                </option>
                                                            @endforeach >
                                                        </select>
                                                        <label for="sourceDatabase">Source Database</label>
                                                    </div>
                                                </div>
                                                <div class="col-12 col-md-6 col-lg-6">
                                                    <div class="form-floating form-floating-outline mb-3">
                                                        <select class="form-select border-primary" data-select="dynamic"
                                                            data-source="@skeletonToken('central_unique_database')_s"
                                                            data-target="@skeletonToken('central_unique_columns')_s" data-ctx="2"
                                                            id="sourceTable" name="source_table">
                                                            <option value="">Select a table</option>
                                                        </select>
                                                        <label for="sourceTable">Source Table</label>
                                                    </div>
                                                </div>
                                                <div class="col-12 col-md-6 col-lg-6">
                                                    <div class="form-floating form-floating-outline mb-3">
                                                        <select class="form-select border-primary unique-select-dropdown"
                                                            data-select="dynamic" data-ctx="2"
                                                            data-source="@skeletonToken('central_unique_columns')_s" id="fromMColumn"
                                                            name="src_match_cols[]" multiple
                                                            aria-placeholder="Select Matching columns">
                                                            <option value="" disabled>Select a column</option>
                                                        </select>
                                                        <label for="fromMColumn">Source Match Columns</label>
                                                    </div>
                                                </div>
                                                <div class="col-12 col-md-6 col-lg-6">
                                                    <div class="form-floating form-floating-outline mb-3">
                                                        <select class="form-select border-primary unique-select-dropdown"
                                                            data-select="dynamic" data-ctx="2"
                                                            data-source="@skeletonToken('central_unique_columns')_s" id="fromUColumn"
                                                            name="src_update_cols[]" multiple
                                                            aria-placeholder="Select Update columns">
                                                            <option disabled value="">Select a column</option>
                                                        </select>
                                                        <label for="fromUColumn">Source Update Columns</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>


                                        <!-- Target Section -->
                                        <hr class="my-4">
                                        <h5 class="mb-4"> Target Database Details</h5>

                                        <!-- Target Section Row -->
                                        <div class="row">
                                            <div class="col-12 col-md-12 col-lg-12">
                                                <div class="row">
                                                    <div class="col-12 col-md-6 col-lg-6">
                                                        <div class="form-floating form-floating-outline mb-3">
                                                            <select
                                                                class="form-select border-primary unique-select-dropdown"
                                                                data-select="dropdown" data-ctx="3"
                                                                data-target="@skeletonToken('central_unique_database')_s" id="targetDatabase"
                                                                name="target_database">
                                                                <option value="" selected disabled>Select Database
                                                                </option>
                                                                @php
                                                                    $allowedDatabases = App\Facades\Skeleton::getAuthenticatedUser()
                                                                        ->access_db;
                                                                    $options = explode(',', $allowedDatabases);
                                                                @endphp
                                                                @foreach ($options as $db)
                                                                    <option value="{{ $db }}">{{ $db }}
                                                                    </option>
                                                                @endforeach
                                                            </select>
                                                            <label for="targetDatabase"> Target Database</label>
                                                        </div>
                                                    </div>
                                                    <div class="col-12 col-md-6 col-lg-6">
                                                        <div class="form-floating form-floating-outline mb-3">
                                                            <select
                                                                class="form-select border-primary unique-select-dropdown"
                                                                data-select="dynamic" data-ctx="3"
                                                                data-source="@skeletonToken('central_unique_database')_s"
                                                                data-target="@skeletonToken('central_unique_columns')_s" id="targetTable"
                                                                name="target_table"></select>
                                                            <label for="targetTable">Target Table</label>
                                                        </div>
                                                    </div>
                                                    <div class="col-12 col-md-12 col-lg-12">
                                                        <div class="form-floating form-floating-outline mb-3">
                                                            <select
                                                                class="form-select border-primary unique-select-dropdown"
                                                                data-select="dynamic" data-ctx="3"
                                                                data-source="@skeletonToken('central_unique_columns')_s" id="toColumn"
                                                                name="to_columns[]" multiple>
                                                                <option disabled value="">Select Target column
                                                                </option>
                                                            </select>
                                                            <label for="toColumn">To (Target Columns)</label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Submit Button -->
                                        <div class="col-12 text-end">
                                            <button type="submit" class="btn btn-primary btn-sm update-form-btn">
                                                <i class="fa-solid fa-pen-to-square me-2"></i> Update
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
            </div>
        </div>
    </div>
</div>
@endsection
