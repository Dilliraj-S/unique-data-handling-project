class Unique {
  constructor() {
    this.tagifyInstance = null;
    this.init();
  }

  async init() {
    try {
      if (!window.axios) throw new Error('Axios is required but not loaded');
      if (!window.jQuery) throw new Error('jQuery is required but not loaded');
      if (!jQuery.fn.DataTable) throw new Error('DataTables is required but not loaded');
      if (!window.Tagify) throw new Error('Tagify is required but not loaded');
      if (!window.bootstrap) throw new Error('Bootstrap is required but not loaded');

      this.setupEventListeners();
      this.configureToast();
      this.log('Skeleton initialized');
    } catch (e) {
      this.error('Initialization error:', e);
      this.errorToast('Initialization Failed', 'Failed to initialize application');
    }
  }

  setupEventListeners() {
    $(document).on('blur', '.rename-name', (e) => this.handleRenameBlur(e));
    $(document).on('change', '.rename-checkbox', (e) => this.handleRenameCheckbox(e));
    $(document).on('change', '.create-type', (e) => this.handleTypeChange(e));
    $(document).on('change', '.default-type', (e) => this.handleDefaultTypeChange(e));
    $(document).on('change', '#columnsTable input:not(.rename-checkbox), #columnsTable select', () => this.syncJson());
    $(document).on('change', '#csvUpload', (e) => this.handleCsvUpload(e));
    $(document).on('change blur', '#manualColumnCount', (e) => this.handleManualColumnCount(e));
    $(document).on('blur', '#columnsTable input[type="text"], #columnsTable input[type="number"]', () => this.syncJson());
  }

  configureToast() {
    // Toast configuration implementation
  }

 createTable() {
    try {
      const $container = $('[unique-create-table]');
      if (!$container.length) throw new Error('Container not found');
      const tableName = $container.attr('unique-create-table');
      let rules = $container.attr('data-table-rules');
      let existingJsonStr = $container.attr('data-table-values');
      let existingJson = [];
      try {
        existingJson = existingJsonStr ? JSON.parse(existingJsonStr) : [];
      } catch (e) {
        console.error("Failed to parse data-table-values:", e);
      }

      let columns = existingJson ? existingJson.map(col => col.name).join(',') : '';
      console.log(columns);
      $container.html(`
        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="csvUpload" class="form-label">Upload CSV:</label>
            <input type="file" id="csvUpload" accept=".csv" class="form-control" />
          </div>
          <div class="col-md-6 mb-3">
            <label for="manualColumnCount" class="form-label">Number of Columns:</label>
            <input type="number" id="manualColumnCount" min="1" class="form-control" placeholder="e.g., 5" value="${existingJson.length || ''}" />
          </div>
        </div>

        <div class="mb-3">
          <label for="columnNames" class="form-label">Column Names (comma-separated):</label>
          <textarea id="columnNames" class="form-control" rows="2" placeholder="e.g., first_name, email, age">${columns}</textarea>
          <textarea id="createJsonOutput" name="${tableName}" class="form-control d-none"></textarea>
        </div>
        <table class="table table-borderless table-hover table-sm table-striped" id="create-table-view">
          <thead>
            <tr>
              <th rowspan="2" width="3%">Sl</th>
              <th rowspan="2" width="5%">Edit</th>
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
      if (this.tagifyInstance) this.tagifyInstance.destroy();
      this.tagifyInstance = new Tagify(columnInput, {
        pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
        maxTags: 150,
        dropdown: { enabled: 0, maxItems: 10 }
      });

      this.tagifyInstance.on('add', () => {
        this.syncTableToPills(this.tagifyInstance.value, rules, existingJson);
        this.updateColumnCount(); // Update column count on tag add
      });
      this.tagifyInstance.on('remove', () => {
        this.removeColumnsNotInPills(this.tagifyInstance.value);
        this.updateColumnCount(); // Update column count on tag remove
      });

      if (existingJson) {
        existingJson.forEach((col, index) => {
          const rowData = {
            name: col.name || '',
            type: col.type || 'varchar',
            length: col.length !== null ? col.length : (col.type === 'varchar' ? 255 : ''),
            default: col.default || 'none',
            unique: col.unique !== undefined ? col.unique : 0,
            index: col.index !== undefined ? col.index : 0,
            validation: Array.isArray(col.validation) ? col.validation : [0, 'null']
          };
          this.addRow(rowData, rules, index + 1);
        });
      }

      new Sortable(document.getElementById('columnsTable'), {
        animation: 150,
        handle: '.serial',
        onUpdate: () => this.updateSerialNumbers()
      });

      if (existingJson) this.syncJson();

      // Bind input event for column name changes
      $('#columnsTable').on('input', '.create-name', (e) => this.handleColumnNameChange(e));
      // Bind change event for rename checkbox
      $('#columnsTable').on('change', '.rename-checkbox', (e) => this.handleRenameCheckbox(e));
      // Bind input event for manual column count
      $('#manualColumnCount').on('input', (e) => this.handleManualColumnCount(e));
      // Bind change event for CSV upload
      $('#csvUpload').on('change', (e) => this.handleCsvUpload(e));
    } catch (error) {
      this.error('Error initializing table:', error.message);
    }
  }

  handleColumnNameChange(e) {
    const $input = $(e.target);
    const $row = $input.closest('tr');
    const oldName = $row.data('name');
    const newName = $input.val().trim();

    if (newName && !newName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      $input.addClass('is-invalid');
      return;
    }
    $input.removeClass('is-invalid');

    if (newName && oldName !== newName) {
      $row.data('name', newName);
      const tag = this.tagifyInstance.value.find(t => t.value === oldName);
      if (tag) {
        this.tagifyInstance.removeTags([tag]);
        this.tagifyInstance.addTags([newName]);
      }
      this.syncJson();
      this.updateColumnCount(); // Update column count on name change
    }
  }

  handleRenameCheckbox(e) {
    const $row = $(e.target).closest('tr');
    const $nameInput = $row.find('.create-name');

    if ($(e.target).is(':checked')) {
      $nameInput.prop('disabled', false).focus();
    } else {
      $nameInput.prop('disabled', true);
    }
    this.syncJson();
  }

  syncTableToPills(columns, rules, existingJson = null) {
    $('#columnsTable').html('');
    columns.forEach((col, index) => {
      let rowData = { name: col.value };
      if (existingJson) {
        const existingCol = existingJson.find(jsonCol => jsonCol.name === col.value);
        if (existingCol) {
          rowData = {
            name: existingCol.name || col.value,
            type: existingCol.type || 'varchar',
            length: existingCol.length !== null ? existingCol.length : (existingCol.type === 'varchar' ? 255 : ''),
            default: existingCol.default || 'none',
            unique: existingCol.unique !== undefined ? existingCol.unique : 0,
            index: existingCol.index !== undefined ? existingCol.index : 0,
            validation: Array.isArray(existingCol.validation) ? col.validation : [0, 'null']
          };
        }
      }
      this.addRow(rowData, rules, index + 1);
    });
    this.syncJson();
    this.updateColumnCount(); // Update column count after syncing pills
  }

  removeColumnsNotInPills(columns) {
    const columnNames = columns.map(col => col.value);
    $('#columnsTable tr').each(function() {
      const $row = $(this);
      if (!columnNames.includes($row.data('name'))) {
        $row.remove();
      }
    });
    this.updateSerialNumbers();
    this.syncJson();
    this.updateColumnCount(); // Update column count after removing columns
  }

  addRow(col, rules = [], serial = 1) {
    let parsedRules = typeof rules === 'string' ? JSON.parse(rules) : rules;

    const $form = $('[form-type]');
    const formType = $form.attr('form-type');
    const disableName = formType === 'update-form' ? 'disabled' : '';
    const columnData = {
      name: col.name || '',
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
          <input class="form-check-input rename-checkbox" type="checkbox" ${formType === 'save-form' ? 'disabled' : ''}>
        </td>
        <td>
          <input type="text" class="form-control form-create-input create-name" 
            value="${columnData.name}" ${disableName}>
        </td>
        <td>
          <select class="form-control form-create-select create-type" required>
            <option value="varchar" ${columnData.type === 'varchar' ? 'selected' : ''}>Short Text</option>
            <option value="text" ${columnData.type === 'text' ? 'selected' : ''}>Long Text</option>
            <option value="int" ${columnData.type === 'int' ? 'selected' : ''}>Number</option>
           <option value="timestamp" ${columnData.type === 'timestamp' ? 'selected' : ''}>Timestamp</option>
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
          <input type="text" Bose class="form-control mt-2 create-default form-create-input default-value 
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

  handleTypeChange(e) {
    const $length = $(e.target).closest('tr').find('.create-length');
    const type = $(e.target).val();

    $length.prop('disabled', type === 'text');
    if (type === 'text') {
      $length.val('');
    } 
    $length.attr('max', type === 'varchar' ? '65535' : '255');
    this.syncJson();
  }

  handleDefaultTypeChange(e) {
    const $defaultVal = $(e.target).siblings('.default-value');
    $defaultVal.toggleClass('d-none', $(e.target).val() !== 'custom');
    if ($(e.target).val() !== 'custom') {
      $defaultVal.val($(e.target).val());
    }
    this.syncJson();
  }

  updateSerialNumbers() {
    $('#columnsTable tr').each(function(index) {
      $(this).find('.serial').text(index + 1);
    });
    this.syncJson();
  }

  updateColumnCount() {
    const count = this.tagifyInstance.value.length;
    $('#manualColumnCount').val(count);
    $('#columnNames').val(this.tagifyInstance.value.map(tag => tag.value).join(','));
  }

  syncJson() {
    const rows = $('#columnsTable tr');
    const result = [];
    let hasError = false;

    rows.each(function () {
      const $row = $(this);
      const $length = $row.find('.create-length');
      const $nameInput = $row.find('.create-name');

      const name = $nameInput.val().trim();

      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        $nameInput.addClass('is-invalid');
        hasError = true;
        return;
      } else {
        $nameInput.removeClass('is-invalid');
      }

      const type = $row.find('.create-type').val();
      const length = type === 'text' ? null : parseInt($length.val());

      if (type !== 'text' && length && (length < 1 || length > (type === 'varchar' ? 65535 : 255))) {
        $length.addClass('is-invalid');
        hasError = true;
        return;
      }
      $length.removeClass('is-invalid');

      result.push({
        name: name,
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
      console.log('Table JSON updated:', result);
    }
  }

  log(...args) {
    console.log(...args);
  }

  error(...args) {
    console.error(...args);
  }

 handleCsvUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target.result;
    const firstLine = text.split(/\r?\n/)[0] || '';
    const cols = firstLine.split(',').map(c => c.trim()).filter(Boolean);
    if (this.tagifyInstance) {
      this.tagifyInstance.removeAllTags();
      this.tagifyInstance.addTags(cols);
    }
    this.updateColumnCount(); // Update column count after CSV upload
  };
  reader.readAsText(file);
}

handleManualColumnCount(e) {
  const count = parseInt($(e.target).val());
  if (isNaN(count) || count <= 0) {
    $(e.target).val(this.tagifyInstance.value.length || 1);
    return;
  }
  const current = this.tagifyInstance.value.map(t => t.value);
  const needed = count - current.length;
  if (needed > 0) {
    for (let i = 0; i < needed; i++) {
      let name = `col_${current.length + i + 1}`;
      while (current.includes(name)) {
        name = `col_${Math.floor(Math.random() * 1000)}`;
      }
      this.tagifyInstance.addTags([name]);
    }
  } else if (needed < 0) {
    this.tagifyInstance.removeTags(current.slice(count));
  }
  this.updateColumnCount(); // Update column count after manual count change
}

errorToast(title, message) {
  alert(`${title}: ${message}`);
}
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    window.unique = new Unique();
  } catch (e) {
    console.error('Failed to initialize Unique:', e);
  }
});
export default Unique;
