$(document).ready(function () {
    let tagifyInstance;

    function createTable(rules = [], existingJson = null) {
        try {
            rules = typeof rules === 'string' ? JSON.parse(rules) : rules;
            const $container = $('[unique-create-table]');
            if (!$container.length) throw new Error('Container not found');
            const tableName = $container.attr('unique-create-table');
            let columns = existingJson ? existingJson.map(col => col.name).join(',') : '';
    
            $container.html(`
                <div class="mb-3">
                    <label for="columnNames" class="form-label">Column Names (comma-separated):</label>
                    <textarea id="columnNames" class="form-control" rows="2" placeholder="e.g., first_name, email, age">${columns}</textarea>
                    <textarea id="createJsonOutput" name="${tableName}" class="form-control d-none"></textarea>
                </div>
                <table class="table table-borderless table-hover table-sm table-striped" id="create-table-view">
                    <thead>
                        <tr>
                            <th rowspan="2" width="3%">Sl</th>
                            <th rowspan="2" width="5%">Rename</th>
                            <th rowspan="2" width="20%">Name</th>
                            <th rowspan="2" width="20%">Type</th>
                            <th rowspan="2" width="15%">Length</th>
                            <th rowspan="2" width="17%">Default</th>
                            <th rowspan="2" width="5%">Unique</th>
                            <th rowspan="2" width="5%">Index</th>
                            <th colspan="2" width="15%">Validation</th>
                        </tr>
                        <tr>
                            <th width="5%">Ignore</th>
                            <th width="10%">Rule</th>
                        </tr>
                    </thead>
                    <tbody id="columnsTable"></tbody>
                </table>
            `);
    
            const columnInput = document.querySelector('#columnNames');
            if (tagifyInstance) tagifyInstance.destroy();
            tagifyInstance = new Tagify(columnInput, {
                pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                maxTags: 150,
                dropdown: { enabled: 0, maxItems: 10 }
            });
            tagifyInstance.on('add', () => syncTableToPills(tagifyInstance.value, rules, existingJson));
            tagifyInstance.on('remove', () => removeColumnsNotInPills(tagifyInstance.value));
            
            if (existingJson) {
                existingJson.forEach((col, index) => {
                    const rowData = {
                        name: col.name || '',
                        rename: col.rename || '',
                        type: col.type || 'varchar',
                        length: col.length !== null ? col.length : (col.type === 'varchar' ? 255 : ''),
                        default: col.default || 'none',
                        unique: col.unique !== undefined ? col.unique : 0,
                        index: col.index !== undefined ? col.index : 0,
                        validation: Array.isArray(col.validation) ? col.validation : [0, 'null']
                    };
                    console.log("Passing to addRow:", JSON.stringify(rowData, null, 2)); 
                    addRow(rowData, rules, index + 1);
                });
            }
    
            new Sortable(document.getElementById('columnsTable'), {
                animation: 150,
                handle: '.serial',
                onUpdate: updateSerialNumbers
            });
    
            if (existingJson) syncJson();
        } catch (error) {
            console.error('Error initializing table:', error.message);
        }
    }

    $(document).on('blur', '.rename-name', function () {
        const $renameInput = $(this);
        let newName = $renameInput.val().trim();

        if (newName && !newName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
            $renameInput.addClass('is-invalid');
        } else {
            $renameInput.removeClass('is-invalid');
            syncJson();
        }
    });

    function syncTableToPills(columns, rules, existingJson = null) {
        $('#columnsTable').html('');
        columns.forEach((col, index) => {
            let rowData = { name: col.value }; 
            if (existingJson) {
                const existingCol = existingJson.find(jsonCol => jsonCol.name === col.value);
                if (existingCol) {
                    rowData = {
                        name: existingCol.name || col.value,
                        rename: existingCol.rename || '',
                        type: existingCol.type || 'varchar',
                        length: existingCol.length !== null ? existingCol.length : (existingCol.type === 'varchar' ? 255 : ''),
                        default: existingCol.default || 'none',
                        unique: existingCol.unique !== undefined ? existingCol.unique : 0,
                        index: existingCol.index !== undefined ? existingCol.index : 0,
                        validation: Array.isArray(existingCol.validation) ? existingCol.validation : [0, 'null']
                    };
                }
            }
            
            console.log("syncTableToPills passing to addRow:", JSON.stringify(rowData, null, 2));
            addRow(rowData, rules, index + 1);
        });
        syncJson();
    }

    function removeColumnsNotInPills(columns) {
        const columnNames = columns.map(col => col.value);
        $('#columnsTable tr').each(function() {
            const $row = $(this);
            if (!columnNames.includes($row.data('name'))) {
                $row.remove();
            }
        });
        updateSerialNumbers();
        syncJson();
    }

    function addRow(col, rules = [], serial = 1) {
        // Parse rules if they're a string
        let parsedRules = typeof rules === 'string' ? JSON.parse(rules) : rules;
        
        const $form = $('[form-type]');
        const formType = $form.attr('form-type');
        const disableRename = formType === 'save-form' ? 'disabled' : '';
        const disableName = formType === 'update-form' ? 'disabled' : '';
        const columnData = {
            name: col.name || '',
            rename: col.rename || '',
            type: col.type || 'text',
            length: col.length !== null && col.length !== undefined ? col.length : '',
            default: col.default || 'null',
            unique: col.unique || 0,
            index: col.index || 0,
            validation: Array.isArray(col.validation) ? col.validation : [0, 'null']
        };
    
        const validationOptions = Object.entries(parsedRules).map(([rule, label]) => {
            const isSelected = columnData.validation[1] === rule ? 'selected' : '';
            return `<option value="${rule}" ${isSelected}>${label}</option>`;
        }).join('');
    
        const isCustomDefault = columnData.default !== 'none' && columnData.default !== 'null';
    
        $('#columnsTable').append(`
            <tr data-name="${columnData.name}">
                <td class="serial" style="cursor: grab;">${serial}</td>
                <td align="center">
                    <input class="form-check-input rename-checkbox" type="checkbox" ${disableRename}>
                </td>
                <td>
                    <input type="text" class="form-control form-create-input create-name" 
                        value="${columnData.name}" ${disableName}>
                    <input type="text" class="form-control form-create-input rename-name d-none mt-2" 
                        placeholder="Enter new name">
                </td>
                <td>
                    <select class="form-control form-create-select create-type" required>
                        <option value="varchar" ${columnData.type === 'varchar' ? 'selected' : ''}>Short Text</option>
                        <option value="text" ${columnData.type === 'text' ? 'selected' : ''}>Long Text</option>
                        <option value="int" ${columnData.type === 'int' ? 'selected' : ''}>Number</option>
                        <option value="date" ${columnData.type === 'date' ? 'selected' : ''}>Date</option>
                    </select>
                </td>
                <td>
                    <input type="number" class="form-control form-create-input create-length" 
                        value="${columnData.length}" 
                        min="1" 
                        max="${columnData.type === 'varchar' ? '65535' : '190'}">
                </td>
                <td>
                    <select class="form-control form-create-select default-type">
                        <option value="null" ${columnData.default === 'null' ? 'selected' : ''}>Nullable</option>
                        <option value="none" ${columnData.default === 'none' ? 'selected' : ''}>Required</option>
                        <option value="custom" ${isCustomDefault ? 'selected' : ''}>Custom</option>
                    </select>
                    <input type="text" class="form-control mt-2 create-default form-create-input default-value 
                        ${isCustomDefault ? '' : 'd-none'}" 
                        value="${isCustomDefault ? columnData.default : ''}" 
                        placeholder="Custom value">
                </td>
                <td align="center"><input class="form-check-input create-unique" type="checkbox" ${columnData.unique ? 'checked' : ''}></td>
                <td align="center"><input class="form-check-input create-index" type="checkbox" ${columnData.index ? 'checked' : ''}></td>
                <td align="center"><input class="form-check-input create-validation" type="checkbox" ${columnData.validation[0] ? 'checked' : ''}></td>
                <td>
                    <select class="form-control form-create-select create-rule">
                        <option value="null">Select Rule</option>
                        ${validationOptions}
                    </select>
                </td>
            </tr>
        `);
    }

    $(document).on('change', '.rename-checkbox', function () {
        const $row = $(this).closest('tr');
        const $renameInput = $row.find('.rename-name');
        
        if ($(this).is(':checked')) {
            $renameInput.removeClass('d-none').focus();
        } else {
            $renameInput.addClass('d-none').val('');
        }
        syncJson();
    });

    $(document).on('change', '.create-type', function() {
        const $length = $(this).closest('tr').find('.create-length');
        const type = $(this).val();
        
        $length.prop('disabled', type === 'text');
        if (type === 'text') {
            $length.val('');
        } 
        $length.attr('max', type === 'varchar' ? '65535' : '255');
        syncJson();
    });

    $(document).on('change', '.default-type', function() {
        const $defaultVal = $(this).siblings('.default-value');
        $defaultVal.toggleClass('d-none', $(this).val() !== 'custom');
        if ($(this).val() !== 'custom') {
            $defaultVal.val($(this).val());
        }
        syncJson();
    });

    // Only sync JSON on specific changes
    $(document).on('change', '#columnsTable input:not(.rename-checkbox), #columnsTable select', syncJson);
    $(document).on('blur', '#columnsTable input[type="text"], #columnsTable input[type="number"]', syncJson);

    function updateSerialNumbers() {
        $('#columnsTable tr').each(function(index) {
            $(this).find('.serial').text(index + 1);
        });
        syncJson();
    }

    function syncJson() {
        const rows = $('#columnsTable tr');
        const result = [];
        let hasError = false;
    
        rows.each(function () {
            const $row = $(this);
            const $length = $row.find('.create-length');
            const $nameInput = $row.find('.create-name');
            const $renameInput = $row.find('.rename-name');
            const renameChecked = $row.find('.rename-checkbox').is(':checked');
    
            const name = $nameInput.val().trim();
            let rename = renameChecked ? $renameInput.val().trim() : '';
    
            const type = $row.find('.create-type').val();
            const length = type === 'text' ? null : parseInt($length.val());
    
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
                $nameInput.addClass('is-invalid');
                hasError = true;
                return;
            } else {
                $nameInput.removeClass('is-invalid');
            }
    
            if (renameChecked && rename && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rename)) {
                $renameInput.addClass('is-invalid');
                hasError = true;
                return;
            } else {
                $renameInput.removeClass('is-invalid');
            }
    
            if (type !== 'text' && length && (length < 1 || length > (type === 'varchar' ? 65535 : 255))) {
                $length.addClass('is-invalid');
                hasError = true;
                return;
            }
            $length.removeClass('is-invalid');
    
            result.push({
                name: name,
                rename: rename && rename !== name ? rename : null,
                type: type,
                length: length,
                default: $row.find('.create-default').val() || $row.find('.default-type').val(),
                unique: $row.find('.create-unique').is(':checked') ? 1 : 0,
                index: $row.find('.create-index').is(':checked') ? 1 : 0,
                validation: [
                    $row.find('.create-validation').is(':checked') ? 1 : 0,
                    $row.find('.create-rule').val()
                ]
            });
        });
    
        if (!hasError) {
            $('#createJsonOutput').val(JSON.stringify(result, null, 2));
            console.log(JSON.stringify(result, null, 2));
        }
    }
    window.createTable = createTable;
});