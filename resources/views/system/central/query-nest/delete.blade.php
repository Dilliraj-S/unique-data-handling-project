@extends('layouts.system-app')
@section('title', 'Delete')
@section('top-style')
@endsection
@section('bottom-script')
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
                        <li class="breadcrumb-item active fw-bold">Delete</li>
                    </ol>
                </nav>
            </div>
        </div>

        <div class="col-12">
            <ul class="nav nav-pills mb-3" id="deleteTab" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="delete-value-tab" data-bs-toggle="pill"
                        data-bs-target="#delete-value" type="button" role="tab" aria-controls="delete-value"
                        aria-selected="true">Delete by Value</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="delete-duplicates-tab" data-bs-toggle="pill"
                        data-bs-target="#delete-duplicates" type="button" role="tab"
                        aria-controls="delete-duplicates" aria-selected="false">Delete Duplicates</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="delete-select-tab" data-bs-toggle="pill"
                        data-bs-target="#delete-select" type="button" role="tab" aria-controls="delete-select"
                        aria-selected="false">Delete by Select</button>
                </li>
            </ul>
            <div class="card">
                <div class="tab-content p-5" id="deleteTabContent">
                    <!-- Delete by Value -->
                    <div class="tab-pane fade show active" id="delete-value" role="tabpanel"
                        aria-labelledby="delete-value-tab">
                        <div class="row g-3">
                            <div class="col-lg-12 col-md-12 col-sm-12 fs-6">
                                <p><strong>Instructions:</strong></p>
                                <ul class="list-unstyled">
                                    <li>You can <strong>Delete a Record</strong> by specifying a value and clicking the
                                        <button class="btn btn-primary btn-sm disabled">Delete Value</button> button.
                                    </li>
                                    <li>You can delete records by entering a <strong>specific value</strong> in the
                                        designated field.</li>
                                    <li><strong>Caution:</strong> Deletions are permanent. Double-check the value before
                                        proceeding.</li>
                                </ul>
                            </div>
                            <hr class="text-dark">
                            <form action="{{ url('/skeleton-action/') }}/@skeletonToken('central_unique_delete_byvalue')_f" method="POST"
                                class="delete-form" data-type="by_value">

                                @csrf
                                <input type="hidden" name="save_token" value="@skeletonToken('central_unique_delete_byvalue')">
                                <input type="hidden" name="delete_type" value="by_value">
                                <input type="hidden" name="commit" value="0" id="commitInput">
                                <!-- Set default to preview -->

                                <div class="row g-3">
                                    <!-- Database Selection -->
                                    <div class="col-lg-6 col-md-6 col-sm-12">
                                        <div class="form-floating form-floating-outline mb-3">
                                            <select class="form-select border-primary" data-select="dropdown"
                                                data-ctx="primary" data-target="@skeletonToken('central_unique_database')_s"
                                                placeholder="select database" id="databaseField1"
                                                name="database_field1">
                                                <option value="" disabled>select an option</option>
                                                @php
                                                $allowedDatabases = App\Facades\Skeleton::getAuthenticatedUser()
                                                ->access_db;
                                                $options = explode(',', $allowedDatabases);
                                                @endphp
                                                @foreach ($options as $db)
                                                <option value="{{ $db }}">{{ $db }}</option>
                                                @endforeach
                                            </select>
                                            <label for="databaseField1">Pick Database</label>
                                        </div>

                                        <div class="form-floating form-floating-outline mb-3">
                                            <select class="form-select border-primary" data-select="dynamic"
                                                data-source="@skeletonToken('central_unique_database')_s" data-target="@skeletonToken('central_unique_columns')_s"
                                                data-ctx="primary" id="tableField1" name="table_field1">
                                                <option value="" disabled>Select a table</option>
                                            </select>
                                            <label for="tableField1">Select Table</label>
                                        </div>

                                        <div class="form-floating form-floating-outline mb-3">
                                            <select class="form-select border-primary" data-select="dynamic"
                                                data-source="@skeletonToken('central_unique_columns')_s" data-ctx="primary" id="columnField1"
                                                name="columns_field1[]" multiple>
                                                <option value="" disabled selected hidden>Select columns</option>
                                            </select>
                                            <label for="columnField1">Select Field</label>
                                        </div>
                                    </div>

                                    <!-- Value Entry Section -->
                                    <div class="col-lg-6 col-md-6 col-sm-12">
                                        <div class="form-floating form-floating-outline mb-3 mt-1">
                                            <textarea id="matchvalue" name="match_value" class="form-control h-100" rows="6"
                                                placeholder="Eg: Unique|Digital Kuppam" required>{{ old('match_value') }}</textarea>
                                            <label for="matchvalue">Enter Values (separate by '|')</label>
                                        </div>
                                    </div>

                                    <div class="col-6"></div>
                                    <div class="col-6 form-password-toggle fv-plugins-icon-container">
                                        <div class="input-group input-group-merge">
                                            <div class="form-floating form-floating-outline">
                                                <input type="password" class="form-control" id="deleteValuePassword"
                                                    placeholder="User Password" name="password" required>
                                                <label for="deleteValuePassword">User Password</label>
                                            </div>
                                            <span class="input-group-text cursor-pointer"><i
                                                    class="mdi mdi-eye-off-outline me-2"></i></span>
                                        </div>
                                    </div>

                                    <div class="col-12">
                                        <div class="d-flex justify-content-end">
                                            <button class="btn btn-primary btn-sm" type="submit"
                                                onclick="document.getElementById('commitInput').value = 0;">
                                                <span class="spinner-border spinner-border-sm d-none"
                                                    role="status"></span>
                                                Delete Values
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                            @if (session()->has('preview_mode') && session()->has('original_input'))

                            <div class="alert alert-warning mt-4">
                                <h5>⚠ Confirm Deletion</h5>
                                <p>{{ session('preview_count') }} matching record(s) found. This action is
                                    irreversible.</p>

                                <form method="POST" action="{{ url('/skeleton-action/') }}/@skeletonToken('central_unique_delete_byvalue')_f">
                                    @csrf
                                    <input type="hidden" name="save_token"
                                        value="{{ session('original_input.save_token') }}">
                                    <input type="hidden" name="delete_type" value="by_value">
                                    <input type="hidden" name="commit" value="1">
                                    <input type="hidden" name="database_field1"
                                        value="{{ session('original_input.database_field1') }}">
                                    <input type="hidden" name="table_field1"
                                        value="{{ session('original_input.table_field1') }}">

                                    @foreach (session('original_input.columns_field1') ?? [] as $col)
                                    <input type="hidden" name="columns_field1[]"
                                        value="{{ $col }}">
                                    @endforeach

                                    <input type="hidden" name="match_value"
                                        value="{{ session('original_input.match_value') }}">

                                    <div class="form-floating mb-3">
                                        <input type="password" name="password" class="form-control"
                                            placeholder="Re-enter Password" required>
                                        <label>Re-enter Password</label>
                                    </div>

                                    <div class="d-flex justify-content-start gap-2">
                                        <button type="submit" class="btn btn-danger">✅ Yes, Delete</button>
                                        <a href="{{ url()->previous() }}" class="btn btn-secondary">❌ Cancel</a>
                                    </div>
                                </form>
                            </div>
                            @endif



                        </div>
                    </div>

                    <!-- Delete Duplicates -->
                    <div class="tab-pane fade" id="delete-duplicates" role="tabpanel"
                        aria-labelledby="delete-duplicates-tab">
                        <h5 class="mb-4">Delete Duplicates</h5>
                        <div class="row g-3 mb-4">
                            <div class="col-12">
                                <p><strong>Instructions:</strong></p>
                                <ul class="list-unstyled">
                                    <li>You can <strong>Delete Duplicate Records</strong> by clicking the
                                        <button class="btn btn-primary btn-sm disabled">Delete Duplicates</button>
                                        button.
                                    </li>
                                    <li>This action will remove repeated entries while keeping the first occurrence.
                                    </li>
                                    <li><strong>Caution:</strong> Review the data before proceeding to avoid
                                        unintentional loss.</li>
                                </ul>
                            </div>
                        </div>
                        <form action="{{ url('/skeleton-action/') }}/@skeletonToken('central_unique_duplicate')_f" method="POST"
                            class="delete-form" data-type="by_duplicates">
                            @csrf
                            <input type="hidden" name="save_token" value="@skeletonToken('central_unique_duplicate')">
                            <input type="hidden" name="delete_type" value="by_duplicates">
                            <input type="hidden" name="commit" value="0" id="commitDuplicateInput">
                            <!-- Set default to preview -->
                            <div class="row g-3">
                                <div class="col-lg-6 col-md-6 col-sm-12">
                                    <div class="form-floating form-floating-outline mb-3">
                                        <select class="form-select border-primary" data-select="dropdown"
                                            data-target="@skeletonToken('central_unique_database')_s" placeholder="select database"
                                            data-ctx="1" id="databaseField2" name="database_field1">
                                            <option value="" disabled>select an option</option>
                                            @php
                                            $allowedDatabases = App\Facades\Skeleton::getAuthenticatedUser()
                                            ->access_db;
                                            $options = explode(',', $allowedDatabases);
                                            @endphp
                                            @foreach ($options as $db)
                                            <option value="{{ $db }}">{{ $db }}</option>
                                            @endforeach
                                        </select>
                                        <label for="databaseField2">Pick Database</label>
                                    </div>
                                    <div class="form-floating form-floating-outline mb-3">
                                        <select class="form-select border-primary" data-select="dynamic"
                                            data-source="@skeletonToken('central_unique_database')_s" data-target="@skeletonToken('central_unique_columns')_s"
                                            data-ctx="1" id="tableField2" name="table_field1">
                                            <option value="" disabled>Select a table</option>
                                        </select>
                                        <label for="tableField2">Select Table</label>
                                    </div>
                                </div>
                                <div class="col-lg-6 col-md-6 col-sm-12">
                                    <div class="form-floating form-floating-outline mb-3">
                                        <select class="form-select border-primary" data-select="dynamic"
                                            data-source="@skeletonToken('central_unique_columns')_s" data-ctx="1" id="baseColumnField1"
                                            name="base_columns_field[]" multiple>
                                            <option value="">Select a base column</option>
                                        </select>
                                        <label for="baseColumnField1">Select Base Field</label>
                                    </div>
                                    <div class="form-floating form-floating-outline mb-3">
                                        <select class="form-select border-primary" data-select="dynamic"
                                            data-source="@skeletonToken('central_unique_columns')_s" data-ctx="1"
                                            id="duplicateColumnField4" name="duplicate_columns_field[]" multiple>
                                            <option value="">Select a duplicate column</option>
                                        </select>
                                        <label for="duplicateColumnField4">Select Duplicate Field</label>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <h6 class="fw-bold mb-3">Value Selection</h6>
                                    <div class="d-flex flex-row gap-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="delete_value"
                                                id="deleteValueAll" value="all" required>
                                            <label class="form-check-label" for="deleteValueAll">All</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="delete_value"
                                                id="deleteValueEmpty" value="empty" required>
                                            <label class="form-check-label" for="deleteValueEmpty">Empty</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="delete_value"
                                                id="deleteValueNonEmpty" value="non_empty" required>
                                            <label class="form-check-label"
                                                for="deleteValueNonEmpty">Non-Empty</label>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6"></div>
                                <div class="col-6 form-password-toggle fv-plugins-icon-container">
                                    <div class="input-group input-group-merge">
                                        <div class="form-floating form-floating-outline">
                                            <input type="password" class="form-control" id="deletedpPassword"
                                                placeholder="User Password" name="password" required>
                                            <label for="deletedpPassword">User Password</label>
                                        </div>
                                        <span class="input-group-text cursor-pointer"><i
                                                class="mdi mdi-eye-off-outline me-2"></i></span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <button class="btn btn-primary btn-sm" type="submit" id="deleteDuplicatesBtn"
                                        onclick="document.getElementById('commitDuplicateInput').value = 0;">
                                        <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                                        <span class="button-text">Delete Duplicates</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- Delete by Select -->
                    <div class="tab-pane fade" id="delete-select" role="tabpanel"
                        aria-labelledby="delete-select-tab">
                        <h5 class="mb-4">Delete by Select</h5>
                        <p><strong>Instructions:</strong></p>
                        <ul class="list-unstyled">
                            <li>You can <strong>Delete a Record</strong> by selecting the desired entry and clicking the
                                <button class="btn btn-primary btn-sm disabled">Delete Selected</button> button.
                            </li>
                            <li>You can delete records <strong>Individually</strong> or select multiple entries for bulk
                                deletion.</li>
                            <li><strong>Caution:</strong> Ensure to <strong>Review</strong> your selection before
                                deletion to prevent accidental data loss.</li>
                        </ul>
                        <form class="delete-form" action="{{ url('/skeleton-action/') }}/@skeletonToken('central_unique_deleteby')_f"
                            method="POST" data-type="by_select">
                            @csrf
                            <input type="hidden" name="save_token" value="@skeletonToken('central_unique_deleteby')">
                            <input type="hidden" name="delete_type" value="by_select">
                            <input type="hidden" name="commit" value="0" id="commitSelectInput">
                            <!-- Set default to preview -->
                            <div class="row g-3 mt-4">
                                <div class="col-md-6">
                                    <div class="form-floating form-floating-outline mb-3">
                                        <select class="form-select border-primary" data-select="dropdown"
                                            data-target="@skeletonToken('central_unique_database')_s" placeholder="select database"
                                            data-ctx="2" id="databaseField3" name="database_field1">
                                            <option value="" disabled>select an option</option>
                                            @php
                                            $allowedDatabases = App\Facades\Skeleton::getAuthenticatedUser()
                                            ->access_db;
                                            $options = explode(',', $allowedDatabases);
                                            @endphp
                                            @foreach ($options as $db)
                                            <option value="{{ $db }}">{{ $db }}</option>
                                            @endforeach
                                        </select>
                                        <label for="databaseField3">Pick Database (Field 1)</label>
                                    </div>
                                    <div class="form-floating form-floating-outline mb-3">
                                        <select class="form-select border-primary" data-select="dynamic"
                                            data-source="@skeletonToken('central_unique_database')_s" data-target="@skeletonToken('central_unique_columns')_s"
                                            data-ctx="2" id="tableField3" name="table_field1">
                                            <option value="" disabled>Select a table</option>
                                        </select>
                                        <label for="tableField3">Select Table (Field 1)</label>
                                    </div>
                                    <div class="form-floating form-floating-outline mb-3">
                                        <select class="form-select border-primary" data-select="dynamic"
                                            data-source="@skeletonToken('central_unique_columns')_s" data-ctx="2" id="columnField3"
                                            name="columns_field1[]" multiple>
                                            <option value="">Select a column</option>
                                        </select>
                                        <label for="columnField3">Select Field (Field 1)</label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-floating form-floating-outline mb-3">
                                        <select class="form-select border-primary" data-select="dropdown"
                                            data-target="@skeletonToken('central_unique_database')_s" placeholder="select database"
                                            data-ctx="3" id="databaseField4" name="database_field2">
                                            <option value="" disabled>select an option</option>
                                            @php
                                            $allowedDatabases = App\Facades\Skeleton::getAuthenticatedUser()
                                            ->access_db;
                                            $options = explode(',', $allowedDatabases);
                                            @endphp
                                            @foreach ($options as $db)
                                            <option value="{{ $db }}">{{ $db }}</option>
                                            @endforeach
                                        </select>
                                        <label for="databaseField4">Pick Database (Field 2)</label>
                                    </div>
                                    <div class="form-floating form-floating-outline mb-3">
                                        <select class="form-select border-primary" data-select="dynamic"
                                            data-source="@skeletonToken('central_unique_database')_s" data-target="@skeletonToken('central_unique_columns')_s"
                                            data-ctx="3" id="tableField4" name="table_field2">
                                            <option value="">Select a table</option>
                                        </select>
                                        <label for="tableField4">Select Table (Field 2)</label>
                                    </div>
                                    <div class="form-floating form-floating-outline mb-3">
                                        <select class="form-select border-primary" data-select="dynamic"
                                            data-source="@skeletonToken('central_unique_columns')_s" data-ctx="3" id="columnField4"
                                            name="columns_field2[]" multiple>
                                            <option value="">Select a column</option>
                                        </select>
                                        <label for="columnField4">Select Field (Field 2)</label>
                                    </div>
                                </div>
                                <!-- <div class="col-md-12">
                                    <h6><strong>Actions:</strong></h6>
                                    <div class="form-check">
                                        <input
                                            class="form-check-input"
                                            type="radio"
                                            name="delete_action"
                                            id="deleteAction1"
                                            value="match_field2" checked>
                                        <label class="form-check-label" for="deleteAction1">
                                            Delete from (<span class="deleteSelectedMain1Selected"></span>)
                                            where matching (<span class="deleteSelectedMain1Field"></span>)
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input
                                            class="form-check-input"
                                            type="radio"
                                            name="delete_action"
                                            id="deleteAction2"
                                            value="match_field1">
                                        <label class="form-check-label" for="deleteAction2">
                                            Delete from (<span class="deleteSelectedMain2Selected"></span>)
                                            where matching (<span class="deleteSelectedMain2Field"></span>)
                                        </label>
                                    </div>
                                </div> -->
                                <div class="col-md-12">
                                    <h6><strong>Actions:</strong></h6>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="delete_action"
                                            id="deleteAction1" value="match_field2" checked>
                                        <label class="form-check-label" for="deleteAction1">
                                            Delete <strong>from</strong>
                                            <span class="text-primary fw-bold deleteSelectedMain1Selected"></span>
                                            <strong>where</strong>
                                            (<span class="text-danger deleteSelectedMain1Field"></span>)
                                            <strong>matches</strong>
                                            <span class="text-success fw-bold deleteSelectedMain2Selected"></span>
                                            (<span class="text-danger deleteSelectedMain2Field"></span>)
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="delete_action"
                                            id="deleteAction2" value="match_field1">
                                        <label class="form-check-label" for="deleteAction1">
                                            Delete <strong>from</strong>
                                            <span class="text-primary fw-bold deleteSelectedMain2Selected"></span>
                                            <strong>where</strong>
                                            (<span class="text-danger deleteSelectedMain2Field"></span>)
                                            <strong>matches</strong>
                                            <span class="text-success fw-bold deleteSelectedMain1Selected"></span>
                                            (<span class="text-danger deleteSelectedMain1Field"></span>)
                                        </label>
                                    </div>
                                </div>

                                <div class="col-8"></div>
                                <div class="col-4 form-password-toggle fv-plugins-icon-container">
                                    <div class="input-group input-group-merge">
                                        <div class="form-floating form-floating-outline">
                                            <input type="password" class="form-control" id="deleteSelectPassword"
                                                placeholder="User Password" name="password" required>
                                            <label for="deleteSelectPassword">User Password</label>
                                        </div>
                                        <span class="input-group-text cursor-pointer"><i
                                                class="mdi mdi-eye-off-outline me-2"></i></span>
                                    </div>
                                </div>
                                <div class="col-12 d-flex justify-content-end gap-2">
                                    <button class="btn btn-secondary btn-sm submit-btn" type="submit"
                                        onclick="document.getElementById('commitSelectInput').value = 0;">
                                        <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                                        Preview
                                    </button>
                                    <button class="btn btn-primary btn-sm submit-btn" type="submit"
                                        onclick="document.getElementById('commitSelectInput').value = 1;">
                                        <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                                        Delete Selected
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
    function updateSelectDeleteLabels() {
        const $dbSel1 = $('#databaseField3');
        const $tableSel1 = $('#tableField3');
        const $colSel1 = $('#columnField3');
        const dbName1 = $dbSel1.find('option:selected').text().trim() || 'selectdatabasename';
        const tableName1 = $tableSel1.find('option:selected').text().trim() || 'tablename';
        const cols1 = $colSel1.find('option:selected').map((_, opt) => $(opt).text().trim()).get().join(', ') ||
            'nocolumn selected';
        $('.deleteSelectedMain1Selected').html(`<span class="text-primary">${dbName1}.${tableName1}</span>`);
        $('.deleteSelectedMain1Field').html(`<span class="text-primary">${cols1}</span>`);

        const $dbSel2 = $('#databaseField4');
        const $tableSel2 = $('#tableField4');
        const $colSel2 = $('#columnField4');
        const dbName2 = $dbSel2.find('option:selected').text().trim() || 'selectdatabasename';
        const tableName2 = $tableSel2.find('option:selected').text().trim() || 'tablename';
        const cols2 = $colSel2.find('option:selected').map((_, opt) => $(opt).text().trim()).get().join(', ') ||
            'nocolumn selected';
        $('.deleteSelectedMain2Selected').html(`<span class="text-primary">${dbName2}.${tableName2}</span>`);
        $('.deleteSelectedMain2Field').html(`<span class="text-primary">${cols2}</span>`);
    }

    $(function() {
        $('#databaseField3, #tableField3, #columnField3, #databaseField4, #tableField4, #columnField4')
            .on('change', updateSelectDeleteLabels);
        $(document).on('change', '[data-select="dynamic"]', updateSelectDeleteLabels);
        updateSelectDeleteLabels();
    });
</script>
@endsection