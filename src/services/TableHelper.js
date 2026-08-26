/**
 * TableHelper - Equivalent to Laravel TableHelper.php
 * Processes table data and metadata for DataTables
 */

class TableHelper {
  /**
   * Processes table data with custom column transformations and action buttons
   * @param {Array} data - Data rows from DataService.filter
   * @param {Object} columns - Column definitions
   * @param {Array} custom - Custom column definitions (modify/addon)
   * @param {Object} reqSet - Request settings including actions
   * @returns {Array} Processed data for DataTables
   */
  static processData(data, columns, custom, reqSet) {
    const validColumns = Object.keys(columns);
    const modifyColumns = {};
    const addonColumns = {};

    // Parse custom column definitions
    if (Array.isArray(custom)) {
      custom.forEach(customDef => {
        if (!customDef.type || !customDef.column || !customDef.view) {
          console.warn('Invalid custom column definition', customDef);
          return;
        }
        const columnKey = customDef.column.replace(/\./g, '_');
        if (customDef.type === 'modify' && validColumns.includes(customDef.column)) {
          if (!modifyColumns[columnKey]) modifyColumns[columnKey] = [];
          modifyColumns[columnKey].push(customDef);
        } else if (customDef.type === 'addon') {
          addonColumns[columnKey] = customDef;
        }
      });
    }

    // Action settings
    const action = reqSet.actions || '';
    const showCheckboxes = action.includes('c');
    const actionButtons = {};
    const actionConfig = {
      'e': { icon: '<i class="fa fa-edit"></i>', suffix: '_e_' },
      'v': { icon: '<i class="fa fa-eye"></i>', suffix: '_v_' },
      'd': { icon: '<i class="fa fa-trash"></i>', suffix: '_d_' },
    };
    
    ['e', 'v', 'd'].forEach(act => {
      if (action.includes(act)) {
        actionButtons[act] = actionConfig[act];
      }
    });

    // Validate token and action column
    if (!reqSet.token || !reqSet.act) {
      throw new Error('Missing token or action column in request settings');
    }

    // Process data rows
    const processedData = data
      .map(row => {
        if (!Array.isArray(row) && typeof row !== 'object') {
          console.warn('Invalid row data, expected object', row);
          return null;
        }

        const mappedRow = { ...row };

        // Apply modify transformations
        Object.keys(modifyColumns).forEach(column => {
          const colKey = column.replace(/\./g, '_');
          if (mappedRow[colKey] !== undefined) {
            let value = mappedRow[colKey];
            modifyColumns[column].forEach(customDef => {
              const renderedValue = this.renderView(
                customDef.view,
                mappedRow,
                validColumns,
                customDef.renderHtml || false
              );
              value = renderedValue;
            });
            mappedRow[column] = value;
          }
        });

        // Add addon columns
        Object.keys(addonColumns).forEach(column => {
          mappedRow[column] = this.renderView(
            addonColumns[column].view,
            mappedRow,
            validColumns,
            addonColumns[column].renderHtml || false
          );
        });

        // Add selection checkbox (for React, we'll just store the ID, not HTML)
        if (showCheckboxes) {
          const rowId = mappedRow[reqSet.act] || mappedRow.id || mappedRow._id || '';
          mappedRow.selection = rowId; // Store ID for React to render checkbox
        }

        // Add action buttons (for React, we'll store action data, not HTML)
        // The React component will render the buttons
        if (Object.keys(actionButtons).length > 0) {
          const baseToken = reqSet.token.replace(/^((?:[^_]*_){3}[^_]*)_.*/, '$1');
          const rowId = mappedRow[reqSet.act] || mappedRow.id || mappedRow._id || '';
          // Store action data for React component to use
          mappedRow._actionData = {
            rowId: rowId,
            baseToken: baseToken,
            buttons: Object.keys(actionButtons).map(act => ({
              type: act,
              token: baseToken + actionButtons[act].suffix + rowId,
              icon: actionButtons[act].icon
            }))
          };
          // Keep actions field for backward compatibility but don't use HTML
          mappedRow.actions = 'actions'; // Placeholder - React will render actual buttons
        }

        // Remove hidden columns
        Object.keys(columns).forEach(column => {
          const def = columns[column];
          if (Array.isArray(def) && def[1] === false) {
            const colKey = column.replace(/\./g, '_');
            delete mappedRow[colKey];
          }
        });

        return mappedRow;
      })
      .filter(row => row !== null);

    return processedData;
  }

  /**
   * Generates column metadata for DataTables
   * @param {Object} columns - Column definitions
   * @param {Object} reqSet - Request settings
   * @param {Array} custom - Custom column definitions
   * @returns {Array} Column metadata
   */
  static generateColumnMeta(columns, reqSet, custom) {
    const action = reqSet.actions || '';
    const showCheckboxes = action.includes('c');
    const showActions = action.includes('e') || action.includes('v') || action.includes('d');
    const addonColumns = Array.isArray(custom) ? custom.filter(c => c.type === 'addon') : [];
    const modifyColumns = Array.isArray(custom) ? custom.filter(c => c.type === 'modify') : [];
    const meta = [];

    // Add checkbox column
    if (showCheckboxes) {
      meta.push({
        data: 'selection',
        name: 'selection',
        title: '', // Empty title - checkbox will be rendered by React component
        orderable: false,
        searchable: false,
        visible: true,
        width: 'auto',
        className: 'dt-checkbox',
        isDate: false,
        renderHtml: false // Don't render HTML for checkbox column
      });
    }

    // Process defined columns
    Object.keys(columns).forEach(displayName => {
      const columnDef = columns[displayName];
      if (!Array.isArray(columnDef) || !columnDef[0]) {
        console.warn('Invalid column definition', { displayName, columnDef });
        return;
      }
      const dbColumn = columnDef[0];
      const isVisible = columnDef[1] !== false;
      if (!isVisible) return;

      // Handle database.table.column format
      const colParts = dbColumn.split('.');
      let colName = colParts[colParts.length - 1];
      if (dbColumn.includes(' AS ')) {
        colName = dbColumn.split(' AS ')[1].trim();
      }

      let renderHtml = false;
      modifyColumns.forEach(customDef => {
        if (customDef.column === displayName && customDef.renderHtml) {
          renderHtml = true;
        }
      });

      meta.push({
        data: colName,
        name: dbColumn,
        title: colName, // Use actual field name from schema (e.g., li_company_name) instead of titleCase
        orderable: true,
        searchable: true,
        visible: true,
        width: 'auto',
        className: 'dt-left skl-pop',
        isDate: ['created_at', 'updated_at'].includes(colName),
        renderHtml: renderHtml
      });
    });

    // Add addon columns
    addonColumns.forEach(customDef => {
      const col = customDef.column || '';
      if (col && !meta.find(m => m.data === col)) {
        meta.push({
          data: col,
          name: col,
          title: col, // Use actual field name from schema instead of titleCase
          orderable: false,
          searchable: false,
          visible: true,
          width: 'auto',
          className: 'dt-left',
          isDate: false,
          renderHtml: customDef.renderHtml || false
        });
      }
    });

    // Add actions column
    if (showActions) {
      meta.push({
        data: 'actions',
        name: 'actions',
        title: 'Actions',
        orderable: false,
        searchable: false,
        visible: true,
        width: 'auto',
        className: 'dt-actions text-center',
        isDate: false,
        renderHtml: false // React will render the buttons
      });
    }

    return meta;
  }

  /**
   * Renders a view string by replacing placeholders and evaluating conditions
   * @param {string} view - View template with placeholders
   * @param {Object} row - Data row
   * @param {Array} validColumns - Valid column names
   * @param {boolean} renderHtml - Whether to render as HTML
   * @returns {string} Rendered view
   */
  static renderView(view, row, validColumns, renderHtml = false) {
    let output = view;

    // Handle ternary conditions: ::(condition ~ true_value || false_value)::
    const ternaryRegex = /::\(([^~]+?)~\s*(.*?)\s*\|\|\s*(.*?)\)::/s;
    let match;
    while ((match = ternaryRegex.exec(output)) !== null) {
      const condition = match[1].trim();
      const trueResult = match[2].trim();
      const falseResult = match[3].trim();
      const conditionResult = this.evaluateCondition(condition, row, validColumns);
      const result = conditionResult ? trueResult : falseResult;
      const renderedResult = this.renderView(result, row, validColumns, renderHtml);
      output = output.replace(match[0], renderedResult);
    }

    // Replace placeholders: ::column::
    output = output.replace(/::([\w\.]+)::/g, (match, column) => {
      const colKey = column.replace(/\./g, '_');
      if (validColumns.includes(column) && row[colKey] !== undefined) {
        return row[colKey] ?? '';
      }
      console.warn('Invalid column placeholder', { column, colKey, validColumns, row });
      return '';
    });

    output = output.replace(/\s+\+\s+/g, ' ');

    return renderHtml ? output : this.escapeHtml(output);
  }

  /**
   * Evaluates a condition string for custom column transformations
   * @param {string} condition - Condition string
   * @param {Object} row - Data row
   * @param {Array} validColumns - Valid column names
   * @returns {boolean} Result of condition evaluation
   */
  static evaluateCondition(condition, row, validColumns) {
    condition = condition.trim();

    // Handle parenthesized conditions
    const parenMatch = condition.match(/^\((.+)\)$/s);
    if (parenMatch) {
      return this.evaluateCondition(parenMatch[1], row, validColumns);
    }

    // Handle logical operators (AND, OR)
    const logicalMatch = condition.match(/(.+?)\s+(AND|OR)\s+(.+)/s);
    if (logicalMatch) {
      const left = logicalMatch[1].trim();
      const operator = logicalMatch[2];
      const right = logicalMatch[3].trim();
      const leftResult = this.evaluateCondition(left, row, validColumns);
      const rightResult = this.evaluateCondition(right, row, validColumns);
      return operator === 'AND' ? (leftResult && rightResult) : (leftResult || rightResult);
    }

    // Handle array condition: column IN [value1, value2, ...]
    const inMatch = condition.match(/([\w\.]+)\s*IN\s*\[\s*([^\]]*?)\s*\]/i);
    if (inMatch) {
      const column = inMatch[1];
      const values = inMatch[2].split(',').map(v => v.trim()).filter(v => v);
      const colKey = column.replace(/\./g, '_');
      if (validColumns.includes(column) && row[colKey] !== undefined) {
        const rowValue = String(row[colKey]);
        return values.includes(rowValue);
      }
      return false;
    }

    // Handle simple condition: column operator value
    const simpleMatch = condition.match(/([\w\.]+)\s*(=|>|<|!=|LIKE)\s*['"]?([^'"]*)['"]?/i);
    if (simpleMatch) {
      const column = simpleMatch[1];
      const operator = simpleMatch[2].toUpperCase();
      const value = simpleMatch[3];
      const colKey = column.replace(/\./g, '_');
      if (validColumns.includes(column) && row[colKey] !== undefined) {
        const rowValue = row[colKey];
        switch (operator) {
          case '=':
            return rowValue == value;
          case '!=':
            return rowValue != value;
          case '>':
            return !isNaN(rowValue) && !isNaN(value) && Number(rowValue) > Number(value);
          case '<':
            return !isNaN(rowValue) && !isNaN(value) && Number(rowValue) < Number(value);
          case 'LIKE':
            return String(rowValue).toLowerCase().includes(value.toLowerCase());
          default:
            return false;
        }
      }
      return false;
    }

    console.warn('Invalid condition format', { condition, row, validColumns });
    return false;
  }

  /**
   * Generates query parameters for database operations
   * @param {Object} columns - Columns to select
   * @param {Array} joins - Join configurations
   * @param {Array} conditions - Where conditions
   * @param {Object} reqSet - Request settings
   * @returns {Object} Query parameters
   */
  static generateParams(columns, joins, conditions, reqSet) {
    if (!reqSet.table) {
      throw new Error('Table name is required in request settings');
    }

    const tableInput = reqSet.table;
    const tableParts = tableInput.split('.');
    const table = tableParts[tableParts.length - 1];

    const rawFilters = reqSet.filters || {};
    const search = typeof rawFilters.search === 'object' 
      ? rawFilters.search 
      : { value: rawFilters.search || '' };
    const dateRange = rawFilters.dateRange || {};
    const sortRules = rawFilters.sort || {};
    const pagination = rawFilters.pagination || { page: 1, limit: 10 };
    // Handle both lowercase and uppercase FilterType (for consistency between frontend and backend)
    // Frontend sends filterType (lowercase), but after generateParams it becomes FilterType (capital F)
    // So when called again on backend, we need to check both
    let filterType = rawFilters.filterType || rawFilters.FilterType || {};
    
    // CRITICAL: Ensure filterType is always an object (not null, undefined, or other types)
    if (!filterType || typeof filterType !== 'object' || Array.isArray(filterType)) {
      filterType = {};
    }
    
    // Debug logging
    if (Object.keys(filterType).length > 0) {
      console.log('📋 TableHelper.generateParams - FilterType:', filterType);
      console.log('📋 TableHelper.generateParams - FilterType entries:', Object.entries(filterType));
    } else {
      console.log('📋 TableHelper.generateParams - No FilterType provided or empty');
    }
    
    const visibleColumns = rawFilters.visible_columns || [];
    const exportConfig = rawFilters.export || {};
    const selectAll = rawFilters.selectAll || false; // Preserve selectAll flag

    const mappedColumns = {};
    Object.keys(columns).forEach(alias => {
      const colDef = columns[alias];
      if (Array.isArray(colDef) && colDef[0]) {
        mappedColumns[alias] = colDef[0];
      }
    });

    if (Object.keys(mappedColumns).length === 0) {
      throw new Error('Columns cannot be empty');
    }

    const where = [];
    if (Array.isArray(conditions)) {
      conditions.forEach(condition => {
        if (condition.column && condition.value !== undefined) {
          where.push({
            column: condition.column,
            operator: condition.operator || '=',
            value: condition.value
          });
        } else if (condition.condition) {
          where.push(condition);
        }
      });
    }

    const sort = [];
    Object.keys(sortRules).forEach(column => {
      sort.push({
        column: column,
        direction: sortRules[column]
      });
    });

    const filteredColumns = {};
    if (rawFilters.columns) {
      Object.keys(rawFilters.columns).forEach(columnKey => {
        const csvValues = rawFilters.columns[columnKey];
        if (csvValues) {
          let valueArray = [];
          
          // Handle different data types
          if (Array.isArray(csvValues)) {
            valueArray = csvValues;
          } else if (typeof csvValues === 'string') {
            valueArray = csvValues.split(',').map(v => v.trim()).filter(v => v);
          } else if (csvValues.search && csvValues.search.value) {
            // Handle object format: { search: { value: [...] } }
            const searchValue = csvValues.search.value;
            valueArray = Array.isArray(searchValue) 
              ? searchValue 
              : (typeof searchValue === 'string' ? searchValue.split(',').map(v => v.trim()).filter(v => v) : []);
          } else if (typeof csvValues === 'object') {
            // Try to extract value from object
            const objValue = csvValues.value || csvValues;
            if (Array.isArray(objValue)) {
              valueArray = objValue;
            } else if (typeof objValue === 'string') {
              valueArray = objValue.split(',').map(v => v.trim()).filter(v => v);
            }
          } else {
            // Fallback: convert to string and split
            valueArray = String(csvValues).split(',').map(v => v.trim()).filter(v => v);
          }
          
          if (valueArray.length > 0) {
            filteredColumns[columnKey] = {
              name: columnKey,
              searchable: true,
              search: {
                value: valueArray
              }
            };
          }
        }
      });
    }

    const params = {
      columns: mappedColumns,
      joins: joins || [],
      custom: reqSet.custom || [],
      filters: {
        where: where,
        search: search,
        dateRange: dateRange,
        columns: filteredColumns,
        FilterType: filterType || {}, // This is critical - must be passed to DataService
        sort: sort,
        pagination: {
          page: Math.max(1, parseInt(pagination.page) || 1),
          limit: Math.max(1, parseInt(pagination.limit) || 10)
        },
        visible_columns: visibleColumns,
        export: exportConfig,
        processId: rawFilters.processId || null,
        selectAll: selectAll, // Pass selectAll flag to backend
        idsOnly: rawFilters.idsOnly || false // Pass idsOnly flag to backend
      },
      draw: parseInt(reqSet.draw || 1),
      key: reqSet.key || table,
      system: reqSet.system || 'central', // Ensure system is passed for database selection
      act: reqSet.act || 'id' // Pass act field for ID projection
    };

    return params;
  }

  /**
   * Generates response parameters for DataTables
   * @param {Object} data - Data from DataService
   * @param {Object} columns - Column definitions
   * @param {Array} custom - Custom settings
   * @param {Object} reqSet - Request settings
   * @returns {Object} Response parameters
   */
  static generateResponse(data, columns, custom, reqSet) {
    // Validate required fields - data.data can be an empty array (which is truthy)
    if (data.data === undefined || data.data === null || 
        data.draw === undefined || data.draw === null ||
        data.recordsTotal === undefined || data.recordsTotal === null || 
        data.recordsFiltered === undefined || data.recordsFiltered === null) {
      console.error('❌ TableHelper.generateResponse validation failed:', {
        hasData: data.data !== undefined && data.data !== null,
        dataType: typeof data.data,
        isArray: Array.isArray(data.data),
        hasDraw: data.draw !== undefined && data.draw !== null,
        drawType: typeof data.draw,
        hasRecordsTotal: data.recordsTotal !== undefined && data.recordsTotal !== null,
        recordsTotalType: typeof data.recordsTotal,
        hasRecordsFiltered: data.recordsFiltered !== undefined && data.recordsFiltered !== null,
        recordsFilteredType: typeof data.recordsFiltered,
        fullData: data
      });
      throw new Error('Invalid DataService response structure');
    }

    const processedData = this.processData(data.data, columns, custom, reqSet);
    const processedColumns = this.generateColumnMeta(columns, reqSet, custom);
    const filterConfig = this.generateFilterConfig(reqSet, Object.keys(columns));

    return {
      status: data.status !== false,
      draw: parseInt(data.draw || 1),
      data: processedData,
      columns: processedColumns,
      recordsTotal: parseInt(data.recordsTotal || 0),
      recordsFiltered: parseInt(data.recordsFiltered || 0),
      message: data.message || (processedData.length === 0 ? 'No records found' : 'Records fetched successfully'),
      filters: filterConfig,
      reqSet: reqSet,
      query: data.query || null,
      company_queries: data.company_queries || null
    };
  }

  /**
   * Generates filter configuration for the table
   * @param {Object} reqSet - Request settings
   * @param {Array} columns - Column names
   * @returns {Object} Filter configuration
   */
  static generateFilterConfig(reqSet, columns) {
    const token = reqSet.id 
      ? `${reqSet.token}_t_${reqSet.id}` 
      : `${reqSet.token}_t`;

    // Filter UI HTML (set_1)
    const set1 = `
      <div class="d-flex flex-column align-items-end" style="background-color: var(--cui-body-bg); color: var(--cui-body-color); border: 1px solid var(--cui-border-color-translucent); border-radius: 8px; padding: 8px 10px;">
        <div class="d-flex align-items-center flex-wrap gap-2">
          <div class="action-icons d-none p-0">
            <button class="skl-filter-btn text-danger border border-1 border-danger skeleton-delete-selected skeleton-popup ms-0 me-1" title="Delete Selected">
              <i class="fa fa-trash"></i>
            </button>
          </div>
          <div class="d-flex flex-row align-items-end gap-2">
            <input type="search" class="skl-filter-search form-control" 
              placeholder="Search..." 
              aria-controls="skeleton-table-${token}"
              style="background-color: var(--cui-body-bg); color: var(--cui-body-color); border: 1px solid var(--cui-border-color-translucent);">
            <button class="skl-filter-btn skl-refresh-btn" type="button" title="Refresh Table">
              <i class="fa fa-refresh"></i>
            </button>
            <button class="skl-filter-btn skl-date-range-btn" type="button" data-bs-toggle="modal" data-bs-target="#date-range-modal-${token}" title="Date Range Filter">
              <i class="fa fa-calendar"></i>
            </button>
            <button class="skl-filter-btn" type="button" data-bs-toggle="modal" data-bs-target="#filter-modal-${token}" title="Filter Table">
              <i class="fa fa-filter"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Modal Content (set_2) - This will be generated by React component
    const set2 = null; // Will be handled by React component

    return {
      set_1: set1,
      set_2: set2,
      buttons: false,
      columns: columns
    };
  }

  // Utility functions
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static titleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
}

export default TableHelper;

