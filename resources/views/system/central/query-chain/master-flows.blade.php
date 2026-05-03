@extends('layouts.system-app')
@section('title', 'Master Flows')

@section('bottom-script')
<script src="https://code.jquery.com/jquery-3.7.1.min.js" crossorigin="anonymous"></script>

<script>
    const workflows = @json($workflows ?? []);
    const processDef = @json($processDef ?? []);
    const allowedDatabases = @json($allowed_databases ?? []);

    $(document).ready(function() {
        
        const $workflowList = $('#workflow-list');
        const $modeInputs = $('input[name="mode"]');
        const $checkboxes = () => $('.workflow-checkbox');
        const $selectAll = $('#select-all');
        const $inputSource = $('#input-source');
        const $headerActions = $('#header-actions');
        const $processSection = $('#process-section');
        const $processSelect = $('#process-select');
        const $processNameInput = $('#process-name');
        const $addToPredefined = $('#add-to-predefined');
        const $outputTarget = $('#output-target');

        // Populate workflow list based on mode
        function populateWorkflowList(selectedWorkflows = []) {
            const mode = $modeInputs.filter(':checked').val();
            $workflowList.empty();

            if (!workflows.length) {
                $workflowList.append('<div class="text-muted p-2">No workflows available</div>');
                console.log('No workflows available in workflows array');
                return;
            }

            const allowedTypes = mode === 'workflow' ? ['wf', 'wmf'] : ['mf', 'wmf'];
            const hasWorkflows = workflows.some(w => allowedTypes.includes(w.type));

            if (!hasWorkflows) {
                $workflowList.append('<div class="text-muted p-2">No workflows available for this mode</div>');
                console.log(`No workflows of types ${allowedTypes.join(', ')} found for mode: ${mode}`);
                return;
            }

            if (mode === 'flow') {
                $workflowList.append(`
                <div id="select-all-wrapper" class="d-flex justify-content-between border-bottom">
                    <h6 class="text-dark fw-semibold">Choose Your Spell🪄</h6>
                    <div class="form-check">
                        <input type="checkbox" id="select-all" class="form-check-input">
                        <label for="select-all" class="form-check-label fw-medium">Select All</label>
                    </div>
                </div>
            `);
            }

            const selectedWorkflowNames = selectedWorkflows;
            console.log('Selected workflow names:', selectedWorkflowNames);

            workflows.forEach(w => {
                if (!allowedTypes.includes(w.type)) return;
                const isChecked = selectedWorkflowNames.includes(w.name) ? 'checked' : '';
                if (isChecked) {
                    console.log(`Checking workflow: ${w.name} (ID: ${w.id})`);
                }
                $workflowList.append(`
                <div class="form-check mt-2">
                    <input class="form-check-input workflow-checkbox" type="checkbox" name="workflows[]"
                        value="${w.name}" id="workflow_${w.id}"
                        data-headers='${JSON.stringify(w.required_headers || [])}'
                        data-type="${w.type}" data-flow-id="${w.id}" ${isChecked}>
                    <label class="form-check-label" for="workflow_${w.id}">
                        ${w.name} <small class="text-muted fw-medium text-primary">(${w.type.toUpperCase()})</small>
                    </label>
                </div>
            `);
            });

            updateHeaderActionsVisibility();
            updateDatabaseBaseVisibility();
        }

        function updateHeaderActionsVisibility() {
            const hasChecked = $checkboxes().filter(':checked').length > 0;
            $headerActions.toggleClass('d-none', $inputSource.val() !== 'csv' || !hasChecked);
        }

        function updateDatabaseBaseVisibility() {
            // Check if AutoFlow is selected
            const isAutoFlowSelected = $checkboxes().filter(':checked').filter(function() {
                return $(this).val().toLowerCase().includes('auto flow') || 
                       $(this).val().toLowerCase().includes('autoflow') ||
                       $(this).val().toLowerCase() === 'auto flows';
            }).length > 0;
            
            // Show Database Base section if AutoFlow is selected, regardless of input source
            $('#database-base-section').toggleClass('d-none', !isAutoFlowSelected);
            
            // Show Database Source section logic
            if (isAutoFlowSelected) {
                // When AutoFlow is selected, show Database Source only when input source is Database
                $('#db-input-section').toggleClass('d-none', $inputSource.val() !== 'db');
            } else {
                // Use original logic based on input source only
                $('#db-input-section').toggleClass('d-none', $inputSource.val() !== 'db');
            }
        }

        function getSelectedHeaders() {
            const mode = $modeInputs.filter(':checked').val();
            let headers = [];

            if (mode === 'workflow') {
                const $checked = $checkboxes().filter(':checked');
                if ($checked.length === 1) {
                    try {
                        headers = JSON.parse($checked.attr('data-headers')) || [];
                    } catch (e) {
                        console.error('Failed to parse headers:', e);
                    }
                }
            } else {
                $checkboxes().filter(':checked').each(function() {
                    if (['mf', 'wmf'].includes($(this).data('type'))) {
                        try {
                            const workflowHeaders = JSON.parse($(this).attr('data-headers')) || [];
                            headers = [...new Set([...headers, ...workflowHeaders])];
                        } catch (e) {
                            console.error('Failed to parse headers:', e);
                        }
                    }
                });
            }

            return headers;
        }

        $('.copy-headers-btn').on('click', function() {
            const headers = getSelectedHeaders();
            if (headers.length) {
                const textToCopy = headers.join(',');

                if (navigator.clipboard && window.isSecureContext) {
                    // Use Clipboard API
                    navigator.clipboard.writeText(textToCopy)
                        .then(() => alert('Headers copied to clipboard!'))
                        .catch(() => alert('Failed to copy headers'));
                } else {
                    // Fallback using textarea
                    const textarea = document.createElement('textarea');
                    textarea.value = textToCopy;
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                        document.execCommand('copy');
                        alert('Headers copied to clipboard!');
                    } catch (err) {
                        alert('Failed to copy headers');
                    }
                    document.body.removeChild(textarea);
                }
            } else {
                alert('No headers available for selected workflows');
            }
        });

        $('.download-headers-btn').on('click', function() {
            const headers = getSelectedHeaders();
            if (headers.length) {
                const csvContent = headers.join(',') + '\n';
                const blob = new Blob([csvContent], {
                    type: 'text/csv;charset=utf-8;'
                });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'workflow_headers.csv';
                link.click();
                URL.revokeObjectURL(link.href);
            } else {
                alert('No headers available for selected workflows');
            }
        });

        function populateFormWithProcess(processId) {
            console.log(`Selected process ID: ${processId}`);
            // Reset base state
            $processNameInput.val('').prop('disabled', false).removeClass('d-none');
            $processSelect.val(processId || 'custom').closest('.input-group').removeClass('d-none');
            $addToPredefined.closest('.form-check').removeClass('d-none');

            $modeInputs.prop('disabled', false).prop('checked', false);
            $inputSource.val('csv').prop('disabled', false);
            $outputTarget.val('csv').prop('disabled', false);
            $workflowList.find('input').prop('disabled', false);

            $('#inputDatabaseSelect').val('');
            $('#inputTableSelect').val('');
            $('select[name="input_columns[]"]').val([]);
            $('#outputDatabaseSelect').val('');
            $('#outputTableSelect').val('');

            // Handle Custom
            if (processId === 'custom' || !processId) {
                $processNameInput
                    .val('')
                    .prop('readonly', false)
                    .prop('disabled', false)
                    .focus();

                $addToPredefined
                    .prop('disabled', false)
                    .prop('checked', false);

                $modeInputs.filter('#mode-flow').prop('checked', true);
                console.log('Custom process selected, initializing with flow mode');
                populateWorkflowList();
                updateHeaderActionsVisibility();
                updateDatabaseBaseVisibility();
                return;
            }

            // Handle Predefined process
            const process = processDef.find(p => p.process_id == processId);
            if (!process) {
                console.log(`No process found for process_id: ${processId}`);
                return;
            }

            console.log(`Found process: ${process.name}, flows: ${JSON.stringify(process.flows || [])}`);

            $processNameInput
                .val(process.name || '')
                .prop('readonly', true)
                .prop('disabled', false);

            $addToPredefined
                .prop('checked', false)
                .prop('disabled', true);

            $modeInputs.filter(`[value="${process.mode}"]`).prop('checked', true).trigger('change');
            $inputSource.val(process.input_source).prop('disabled', false).trigger('change');
            $outputTarget.val(process.output_target).prop('disabled', false).trigger('change');

            if (process.input_source === 'db') {
                $('#inputDatabaseSelect').val(process.input_db || '');
                $('#inputTableSelect').val(process.input_table || '');
                $('select[name="input_columns[]"]').val(process.input_columns || []);
            }

            if (process.output_target === 'db') {
                $('#outputDatabaseSelect').val(process.output_db || '');
                $('#outputTableSelect').val(process.output_table || '');
            }

            populateWorkflowList(process.flows || []);
            updateHeaderActionsVisibility();
            updateDatabaseBaseVisibility();
        }

        function updateWorkflowMode() {
            const mode = $modeInputs.filter(':checked').val();
            const isFlowMode = mode === 'flow';
            console.log(`Switching to mode: ${mode}`);

            populateWorkflowList();

            const $newCheckboxes = $('.workflow-checkbox');

            if (mode === 'workflow') {
                $newCheckboxes.on('change', function() {
                    if (this.checked) {
                        $newCheckboxes.not(this).prop('checked', false);
                    }
                    updateHeaderActionsVisibility();
                    updateDatabaseBaseVisibility();
                });

                // Hide process dropdown, keep process name and predefined checkbox
                $processSelect.addClass('d-none');
                $addToPredefined.closest('.form-check').addClass('d-none');
                $addToPredefined.prop('checked', false);
                console.log('Workflow mode: Hiding process dropdown and predefined checkbox');
            } else {
                $newCheckboxes.off('change');
                $newCheckboxes.on('change', function() {
                    updateHeaderActionsVisibility();
                    updateDatabaseBaseVisibility();
                });

                // Show process dropdown and predefined checkbox
                $processSelect.removeClass('d-none');
                $addToPredefined.closest('.form-check').removeClass('d-none');
                console.log('Flow mode: Showing process dropdown and predefined checkbox');
            }

            // Ensure process name input is always visible
            $processNameInput.removeClass('d-none').prop('disabled', false);
        }

        $(document).on('change', '#select-all', function() {
            const isChecked = this.checked;
            $checkboxes().each(function() {
                if ($(this).is(':visible') && ['mf', 'wmf'].includes($(this).data('type'))) {
                    $(this).prop('checked', isChecked);
                }
            });
            updateHeaderActionsVisibility();
            updateDatabaseBaseVisibility();
        });

        $workflowList.on('change', '.workflow-checkbox', function() {
            if ($modeInputs.filter('#mode-flow:checked').length) {
                const totalMasterFlows = $checkboxes().filter('[data-type="mf"], [data-type="wmf"]').length;
                const checkedMasterFlows = $checkboxes().filter('[data-type="mf"], [data-type="wmf"]').filter(':checked').length;
                $('#select-all').prop('checked', totalMasterFlows > 0 && checkedMasterFlows === totalMasterFlows);
            }
            updateHeaderActionsVisibility();
            updateDatabaseBaseVisibility();
        });

        $inputSource.on('change', function() {
            $('#csv-upload-section').toggleClass('d-none', this.value !== 'csv');
            updateHeaderActionsVisibility();
            updateDatabaseBaseVisibility();
        }).trigger('change');

        $outputTarget.on('change', function() {
            $('#db-output-section').toggleClass('d-none', this.value !== 'db');
        }).trigger('change');

        $processSelect.on('change', function() {
            const value = this.value;
            populateFormWithProcess(value);
        });

        $modeInputs.on('change', updateWorkflowMode);

        // File upload validation
        $('#csv-file-input').on('change', function() {
            const file = this.files[0];
            const $fileInfo = $('#file-info');
            const $fileDetails = $('#file-details');
            
            if (file) {
                const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
                const maxSizeMB = 500;
                
                let infoHtml = `
                    <div><strong>File:</strong> ${file.name}</div>
                    <div><strong>Size:</strong> ${fileSizeMB} MB</div>
                `;
                
                if (fileSizeMB > maxSizeMB) {
                    infoHtml += `<div class="text-danger"><strong>Warning:</strong> File size exceeds ${maxSizeMB}MB limit</div>`;
                    $fileInfo.removeClass('d-none').find('.alert').removeClass('alert-info').addClass('alert-warning');
                } else if (fileSizeMB > 50) {
                    infoHtml += `<div class="text-warning"><strong>Note:</strong> Large file detected - will be processed in background</div>`;
                    $fileInfo.removeClass('d-none').find('.alert').removeClass('alert-warning').addClass('alert-info');
                } else {
                    $fileInfo.removeClass('d-none').find('.alert').removeClass('alert-warning').addClass('alert-info');
                }
                
                $fileDetails.html(infoHtml);
            } else {
                $fileInfo.addClass('d-none');
            }
        });

        $processSelect.trigger('change');
    });
</script>
@endsection


@section('content')
<div class="container-xxl flex-grow-1 py-4">
    <div class="row g-3">
        <div class="col-12">
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item">
                        <a href="javascript:void(0);">Query Chain</a>
                    </li>
                    <li class="breadcrumb-item active fw-bold">Master Flow</li>
                </ol>
            </nav>
        </div>

      

        <div class="col-12">
            <form id="process-form" method="POST" action="{{ url('/skeleton-action/') }}/@skeletonToken('central_unique_workflows')_f" enctype="multipart/form-data">
                @csrf
                <input type="hidden" name="save_token" value="@skeletonToken('central_unique_workflows')">
                <div class="card shadow-sm">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0"><i class="fa fa-arrow-progress me-2"></i>Start a New Process</h5>
                    </div>

                    <div class="card-body p-4">
                        <div class="row g-4">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Execution Mode</label>
                                    <div class="d-flex flex-column mt-1 gap-2">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="mode" id="mode-flow" value="flow" checked>
                                            <label class="form-check-label" for="mode-flow">
                                                <span class="fw-medium">Master Process</span> - Multiple workflows in sequence
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="mode" id="mode-workflow" value="workflow">
                                            <label class="form-check-label" for="mode-workflow">
                                                <span class="fw-medium">Workflows</span> - Runs only one workflow
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div id="process-section" class="mb-3">
                                    <label class="form-label fw-bold">Process Name</label>
                                    <div class="input-group mt-1">
                                        <select class="form-select process-select" id="process-select" name="preprocess_id">
                                            <option value="custom" selected>Custom</option> <!-- ✅ This is required -->
                                            @foreach($processDef as $process)
                                            <option value="{{ $process['process_id'] }}">{{ $process['name'] }}</option>
                                            @endforeach
                                        </select>
                                        <input type="text" id="process-name" name="process_name" class="form-control" placeholder="Enter new process name" required>
                                    </div>
                                    <div class="form-check ms-2 mt-2">
                                        <input class="form-check-input" type="checkbox" id="add-to-predefined" name="save_as_predefined">
                                        <label class="form-check-label" for="add-to-predefined">Add to Process</label>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label fw-bold">Select Workflows</label>
                                    <div id="workflow-list" class="border rounded p-4 pb-0 overflow-auto mt-2">
                                        <!-- Workflows will be populated here dynamically -->
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Input Source</label>
                                    <div class="card shadow-sm mt-2">
                                        <div class="card-body p-3">
                                            <div class="form-floating form-floating-outline mb-3">
                                                <select class="form-select" name="input_source" id="input-source">
                                                    <option value="csv">CSV Upload</option>
                                                    <option value="db">Database</option>
                                                </select>
                                                <label for="input-source">Input Source</label>
                                            </div>

                                            <div id="csv-upload-section" class="p-2 bg-white rounded">
                                                <div class="mb-3">
                                                    <label class="form-label">Upload CSV File</label>
                                                    <input type="file" name="csv_file" class="form-control" accept=".csv" id="csv-file-input">
                                                    <div class="form-text">
                                                        <small class="text-muted">
                                                            Maximum file size: 500MB | Maximum rows: 600,000 | 
                                                            Files with 50,000+ rows will be processed in the background
                                                        </small>
                                                    </div>
                                                    <div id="file-info" class="mt-2 d-none">
                                                        <div class="alert alert-info">
                                                            <strong>File Analysis:</strong>
                                                            <div id="file-details"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div id="header-actions" class="d-flex gap-2 d-none">
                                                    <button type="button" class="btn btn-sm btn-outline-primary copy-headers-btn">Copy Headers</button>
                                                    <button type="button" class="btn btn-sm btn-outline-secondary download-headers-btn">Download CSV</button>
                                                </div>
                                            </div>

                                            <div id="database-base-section" class="mt-3 d-none">
                                                <label class="form-label fw-bold">Database Base</label>
                                                <div class="row g-3 mt-1">
                                                    <div class="col-lg-6">
                                                        <div class="form-floating form-floating-outline">
                                                            <select class="form-select" name="base_input_db" id="baseInputDatabaseSelect" data-select="dropdown" data-target="@skeletonToken('central_unique_database')_s" data-ctx="3">
                                                                <option value="" selected disabled>Select Database</option>
                                                                @foreach($allowed_databases as $db)
                                                                <option value="{{ $db }}">{{ $db }}</option>
                                                                @endforeach
                                                            </select>
                                                            <label for="baseInputDatabaseSelect">Input Database</label>
                                                        </div>
                                                    </div>

                                                    <div class="col-lg-6">
                                                        <div class="form-floating form-floating-outline">
                                                            <select class="form-select" name="base_input_table" id="baseInputTableSelect" data-select="dynamic" data-source="@skeletonToken('central_unique_database')_s" data-target="@skeletonToken('central_unique_columns')_s" data-ctx="3">
                                                                <option value="" selected disabled>Select Table</option>
                                                            </select>
                                                            <label for="baseInputTableSelect">Input Table</label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div id="db-input-section" class="mt-3 d-none">
                                                <label class="form-label fw-bold">Database Source</label>
                                                <div class="row g-3 mt-1">
                                                    <div class="col-lg-6">
                                                        <div class="form-floating form-floating-outline">
                                                            <select class="form-select" name="input_db" id="inputDatabaseSelect" data-select="dropdown" data-target="@skeletonToken('central_unique_database')_s" data-ctx="1">
                                                                <option value="" selected disabled>Select Database</option>
                                                                @foreach($allowed_databases as $db)
                                                                <option value="{{ $db }}">{{ $db }}</option>
                                                                @endforeach
                                                            </select>
                                                            <label for="inputDatabaseSelect">Input Database</label>
                                                        </div>
                                                    </div>

                                                    <div class="col-lg-6">
                                                        <div class="form-floating form-floating-outline">
                                                            <select class="form-select" name="input_table" id="inputTableSelect" data-select="dynamic" data-source="@skeletonToken('central_unique_database')_s" data-target="@skeletonToken('central_unique_columns')_s" data-ctx="1">
                                                                <option value="" selected disabled>Select Table</option>
                                                            </select>
                                                            <label for="inputTableSelect">Input Table</label>
                                                        </div>
                                                    </div>
                                                  

                                                    <div class="col-12 text-end">
                                                        <button class="btn btn-primary create-table-btn skeleton-popup"
                                                            data-token="@skeletonToken('central_unique_unq_tables')_a"
                                                            data-text="Add database"
                                                            id="configs-add-btn">
                                                            <i class="bi bi-plus-circle me-2"></i>Create Table
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label fw-bold">Output Format</label>
                                    <div class="card shadow-sm mt-2">
                                        <div class="card-body p-3">
                                            <div class="form-floating form-floating-outline mb-3">
                                                <select class="form-select" name="output_target" id="output-target">
                                                    <option value="csv">CSV File</option>
                                                    <option value="excel">Excel File</option>
                                                    <option value="db">Database</option>
                                                </select>
                                                <label for="output-target">Output Format</label>
                                            </div>

                                            <div id="db-output-section" class="mt-3 d-none">
                                                <label class="form-label fw-bold">Output Target</label>
                                                <div class="row g-3 mt-1">
                                                    <div class="col-lg-6">
                                                        <div class="form-floating form-floating-outline">
                                                            <select class="form-select" name="output_db" id="outputDatabaseSelect" data-select="dropdown" data-target="@skeletonToken('central_unique_database')_s" data-ctx="2">
                                                                <option value="" selected disabled>Select Target Database</option>
                                                                @foreach($allowed_databases as $db)
                                                                <option value="{{ $db }}">{{ $db }}</option>
                                                                @endforeach
                                                            </select>
                                                            <label for="outputDatabaseSelect">Target Database</label>
                                                        </div>
                                                    </div>

                                                    <div class="col-lg-6">
                                                        <div class="form-floating form-floating-outline">
                                                            <select class="form-select" name="output_table" id="outputTableSelect" data-select="dynamic" data-source="@skeletonToken('central_unique_database')_s" data-ctx="2">
                                                                <option value="" selected disabled>Select Target Table</option>
                                                            </select>
                                                            <label for="outputTableSelect">Target Table</label>
                                                        </div>
                                                    </div>

                                                    <div class="col-12 text-end">
                                                        <button class="btn btn-primary create-table-btn skeleton-popup"
                                                            data-token="@skeletonToken('central_unique_unq_tables')_a"
                                                            data-text="Add database"
                                                            id="table-create-btn">
                                                            <i class="bi bi-plus-circle me-2"></i>Create Table
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex justify-content-end mt-4 gap-3">
                            <button class="btn btn-primary skeleton-popup" data-token="@skeletonToken('central_unique_process_logs')_v_1">
                                 <i class="bi bi-clock-history me-2"></i>Previous Results
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-play-circle me-2"></i>Start Process
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection