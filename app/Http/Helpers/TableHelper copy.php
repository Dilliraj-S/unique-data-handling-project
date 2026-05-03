<?php

namespace App\Http\Helpers;

use App\Facades\{Data, Developer, Select};
use App\Services\DataService;
use Illuminate\Support\Facades\{Cache, Schema, DB};
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Helper class for processing table data and metadata for DataTables.
 */
class TableHelper
{
    /**
     * Processes table data with custom column transformations and action buttons.
     *
     * @param array $data Data rows from DataService::filter (arrays)
     * @param array $columns Column definitions (e.g., ['id' => ['table.id', true], 'name' => ['table.name', false]])
     * @param array $custom Custom column definitions (modify/addon)
     * @param array $reqSet Request settings including actions (e.g., 'cevd')
     * @return array Processed data for DataTables
     * @throws InvalidArgumentException 
     */
    public static function processData(array $data, array $columns, array $custom, array $reqSet): array
    {
        $validColumns = array_keys($columns);
        $modifyColumns = [];
        $addonColumns = [];

        // Parse custom column definitions
        foreach ($custom as $customDef) {
            if (empty($customDef['type']) || empty($customDef['column']) || empty($customDef['view'])) {
                Developer::warning('Invalid custom column definition', ['custom' => $customDef]);
                continue;
            }

            $columnKey = str_replace('.', '_', $customDef['column']);
            if ($customDef['type'] === 'modify' && in_array($customDef['column'], $validColumns, true)) {
                $modifyColumns[$columnKey][] = $customDef;
            } elseif ($customDef['type'] === 'addon') {
                $addonColumns[$columnKey] = $customDef;
            }
        }

        // Action settings
        $action = $reqSet['actions'] ?? '';
        $showCheckboxes = str_contains($action, 'c');
        $actionButtons = [];
        $actionConfig = [
            'e' => ['icon' => '<i class="fa fa-edit"></i>', 'suffix' => '_e_'],
            'v' => ['icon' => '<i class="fa fa-eye"></i>', 'suffix' => '_v_'],
            'd' => ['icon' => '<i class="fa fa-trash"></i>', 'suffix' => '_d_'],
        ];
        foreach (['e', 'v', 'd'] as $act) {
            if (str_contains($action, $act)) {
                $actionButtons[$act] = $actionConfig[$act];
            }
        }

        // Validate token and action column
        if (empty($reqSet['token']) || empty($reqSet['act'])) {
            throw new InvalidArgumentException('Missing token or action column in request settings');
        }

        // Process data rows
        $processedData = array_filter(array_map(function ($row) use (
            $modifyColumns,
            $addonColumns,
            $validColumns,
            $showCheckboxes,
            $actionButtons,
            $reqSet,
            $columns
        ) {
            if (!is_array($row)) {
                Developer::warning('Invalid row data, expected array', ['row' => $row]);
                return null;
            }

            $mappedRow = $row;

            // Apply modify transformations
            foreach ($modifyColumns as $column => $customDefs) {
                $colKey = str_replace('.', '_', $column);
                if (isset($mappedRow[$colKey])) {
                    $value = $mappedRow[$colKey];
                    foreach ($customDefs as $customDef) {
                        $renderedValue = self::renderView($customDef['view'], $mappedRow, $validColumns, $customDef['renderHtml'] ?? false);
                        if (str_contains($renderedValue, '::(')) {
                            Developer::warning('Unparsed ternary condition', [
                                'column' => $column,
                                'view' => $customDef['view'],
                                'rendered' => $renderedValue
                            ]);
                        }
                        $value = $renderedValue;
                    }
                    $mappedRow[$column] = $value;
                }
            }

            // Add addon columns
            foreach ($addonColumns as $column => $customDef) {
                $mappedRow[$column] = self::renderView($customDef['view'], $mappedRow, $validColumns, $customDef['renderHtml'] ?? false);
            }

            // Add selection checkbox
            if ($showCheckboxes) {
                $rowId = $mappedRow[$reqSet['act']] ?? '';
                $mappedRow['selection'] = sprintf(
                    '<input type="checkbox" class="row-select skl-checkbox form-check-input" data-id="%s">',
                    e($rowId)
                );
            }

            // Add action buttons
            if (!empty($actionButtons)) {
                $menuItems = '';
                $baseToken = preg_replace('/^((?:[^_]*_){3}[^_]*)_.*/', '$1', $reqSet['token']);
                foreach ($actionButtons as $act => $config) {
                    $rowId = $mappedRow[$reqSet['act']] ?? '';
                    $menuItems .= sprintf(
                        '<button type="button" class="%s skeleton-popup" data-token="%s">%s</button>',
                        e($act),
                        e($baseToken . $config['suffix'] . $rowId),
                        $config['icon']
                    );
                }
                $mappedRow['actions'] = '<div class="table-actions-group">' . $menuItems . '</div>';
            }

            // Remove hidden columns
            foreach ($columns as $column => $def) {
                if (isset($def[1]) && $def[1] === false) {
                    $colKey = str_replace('.', '_', $column);
                    unset($mappedRow[$colKey]);
                }
            }

            return $mappedRow;
        }, $data));

        return array_values($processedData);
    }
    /**
     * @param array $columns Column definitions
     * @return array Processed data for DataTables
     * @param array $custom Custom column definitions (modify/addon)
     */
    public static function generateColumnMeta(array $columns, array $reqSet, array $custom): array
    {
        $action = $reqSet['actions'] ?? '';
        $showCheckboxes = str_contains($action, 'c');
        $showActions = str_contains($action, 'e') || str_contains($action, 'v') || str_contains($action, 'd');
        $addonColumns = array_filter($custom, fn($c) => ($c['type'] ?? '') === 'addon');
        $modifyColumns = array_filter($custom, fn($c) => ($c['type'] ?? '') === 'modify');
        $meta = [];

        // Add checkbox column
        if ($showCheckboxes) {
            $meta[] = [
                'data' => 'selection',
                'name' => 'selection',
                'title' => '<input type="checkbox" class="form-check-input skl-checkbox select-all-checkbox">',
                'orderable' => false,
                'searchable' => false,
                'visible' => true,
                'width' => 'auto',
                'className' => 'dt-checkbox',
                'isDate' => false,
                'renderHtml' => true
            ];
        }

        // Process defined columns
        foreach ($columns as $displayName => $columnDef) {
            if (!is_array($columnDef) || empty($columnDef[0])) {
                Developer::warning('Invalid column definition', [
                    'displayName' => $displayName,
                    'columnDef' => $columnDef
                ]);
                continue;
            }
            $dbColumn = $columnDef[0];
            $isVisible = $columnDef[1] ?? true;
            if (!$isVisible) {
                continue;
            }

            // Handle database.table.column format
            $colParts = explode('.', $dbColumn);
            $colName = end($colParts);
            if (str_contains($dbColumn, ' AS ')) {
                $colName = explode(' AS ', $dbColumn)[1];
            }

            $renderHtml = false;
            foreach ($modifyColumns as $customDef) {
                if ($customDef['column'] === $displayName && isset($customDef['renderHtml']) && $customDef['renderHtml']) {
                    $renderHtml = true;
                    break;
                }
            }

            $meta[] = [
                'data' => $colName,
                'name' => $dbColumn,
                'title' => Str::title(str_replace('_', ' ', $colName)),
                'orderable' => true,
                'searchable' => true,
                'visible' => true,
                'width' => 'auto',
                'className' => 'dt-left skl-pop',
                'isDate' => in_array($colName, ['created_at', 'updated_at']),
                'renderHtml' => $renderHtml
            ];
        }

        // Add addon columns
        foreach ($addonColumns as $customDef) {
            $col = $customDef['column'] ?? '';
            if ($col && !in_array($col, array_column($meta, 'data'))) {
                $meta[] = [
                    'data' => $col,
                    'name' => $col,
                    'title' => Str::title(str_replace('_', ' ', $col)),
                    'orderable' => false,
                    'searchable' => false,
                    'visible' => true,
                    'width' => 'auto',
                    'className' => 'dt-left',
                    'isDate' => false,
                    'renderHtml' => $customDef['renderHtml'] ?? false
                ];
            }
        }

        // Add actions column
        if ($showActions) {
            $meta[] = [
                'data' => 'actions',
                'name' => 'actions',
                'title' => 'Actions',
                'orderable' => false,
                'searchable' => false,
                'visible' => true,
                'width' => 'auto',
                'className' => 'dt-actions',
                'isDate' => false,
                'renderHtml' => true
            ];
        }

        return $meta;
    }

    /**
     * Renders a view string by replacing placeholders and evaluating conditions.
     *
     * @param string $view View template with placeholders and conditions
     * @param array $row Data row (array)
     * @param array $validColumns Valid column names
     * @param bool $renderHtml Whether to render as HTML (skip escaping)
     * @return string Rendered view
     */
    public static function renderView(string $view, array $row, array $validColumns, bool $renderHtml = false): string
    {
        $output = $view;

        // Handle ternary conditions: ::(condition ~ true_value || false_value)::
        while (preg_match('/::\(([^~]+?)~\s*(.*?)\s*\|\|\s*(.*?)\)::/s', $output, $matches)) {
            $condition = trim($matches[1]);
            $trueResult = trim($matches[2]);
            $falseResult = trim($matches[3]);
            $conditionResult = self::evaluateCondition($condition, $row, $validColumns);
            $result = $conditionResult ? $trueResult : $falseResult;
            $renderedResult = self::renderView($result, $row, $validColumns, $renderHtml);
            $output = str_replace($matches[0], $renderedResult, $output);
        }

        // Replace placeholders: ::column::
        $output = preg_replace_callback(
            '/::([\w\.]+)::/',
            function ($matches) use ($row, $validColumns) {
                $column = $matches[1];
                $colKey = str_replace('.', '_', $column);
                if (in_array($column, $validColumns) && isset($row[$colKey])) {
                    return $row[$colKey] ?? '';
                }
                Developer::warning('Invalid column placeholder', [
                    'column' => $column,
                    'colKey' => $colKey,
                    'validColumns' => $validColumns,
                    'row' => $row
                ]);
                return '';
            },
            $output
        );

        $output = str_replace(' + ', ' ', $output);

        if (str_contains($output, '::(')) {
            Developer::warning('Unparsed ternary condition in final output', [
                'output' => $output,
                'view' => $view,
                'row' => $row,
                'token' => isset($row['token']) ? $row['token'] : 'unknown'
            ]);
        }

        return $renderHtml ? $output : e($output);
    }

    /**
     * Evaluates a condition string for custom column transformations.
     *
     * @param string $condition Condition string (e.g., "column = value", "column IN [val1, val2]")
     * @param array $row Data row (array)
     * @param array $validColumns Valid column names
     * @return bool Result of the condition evaluation
     */
    public static function evaluateCondition(string $condition, array $row, array $validColumns): bool
    {
        $condition = trim($condition);

        // Handle parenthesized conditions
        if (preg_match('/^\((.+)\)$/s', $condition, $matches)) {
            return self::evaluateCondition($matches[1], $row, $validColumns);
        }

        // Handle logical operators (AND, OR)
        if (preg_match('/(.+?)\s+(AND|OR)\s+(.+)/s', $condition, $matches)) {
            $left = trim($matches[1]);
            $operator = $matches[2];
            $right = trim($matches[3]);
            $leftResult = self::evaluateCondition($left, $row, $validColumns);
            $rightResult = self::evaluateCondition($right, $row, $validColumns);
            return $operator === 'AND' ? ($leftResult && $rightResult) : ($leftResult || $rightResult);
        }

        // Handle array condition: column IN [value1, value2, ...]
        if (preg_match('/([\w\.]+)\s*IN\s*\[\s*([^]]*?)\s*\]/i', $condition, $matches)) {
            $column = $matches[1];
            $values = array_filter(array_map('trim', explode(',', $matches[2])), fn($v) => $v !== '');
            $colKey = str_replace('.', '_', $column);
            if (in_array($column, $validColumns) && isset($row[$colKey])) {
                $rowValue = $row[$colKey];
                return $rowValue !== null && in_array((string)$rowValue, $values, false);
            }
            Developer::warning('Invalid column in IN condition', [
                'column' => $column,
                'colKey' => $colKey,
                'condition' => $condition,
                'validColumns' => $validColumns
            ]);
            return false;
        }

        // Handle simple condition: column operator value
        if (preg_match('/([\w\.]+)\s*(=|>|<|!=|LIKE)\s*[\'"]?([^\'"]*)[\'"]?/i', $condition, $matches)) {
            $column = $matches[1];
            $operator = $matches[2];
            $value = $matches[3];
            $colKey = str_replace('.', '_', $column);
            if (in_array($column, $validColumns) && isset($row[$colKey])) {
                $rowValue = $row[$colKey];
                return match (strtoupper($operator)) {
                    '=' => $rowValue == $value,
                    '!=' => $rowValue != $value,
                    '>' => is_numeric($rowValue) && is_numeric($value) && $rowValue > $value,
                    '<' => is_numeric($rowValue) && is_numeric($value) && $rowValue < $value,
                    'LIKE' => stripos((string)$rowValue, str_replace(['%', '_'], '', $value)) !== false,
                    default => false,
                };
            }
            Developer::warning('Column missing in row for condition', [
                'column' => $column,
                'colKey' => $colKey,
                'condition' => $condition,
                'validColumns' => $validColumns
            ]);
            return false;
        }

        Developer::warning('Invalid condition format', [
            'condition' => $condition,
            'row' => $row,
            'validColumns' => $validColumns
        ]);
        return false;
    }

    /**
     * Generates query parameters for database operations with table name parsing.
     
     * @param array $columns Columns to select
     * @param array $joins Join configurations
     * @param array $conditions Where conditions
     * @param array $reqSet Request settings
     * @return array Query parameters
     * @throws InvalidArgumentException
     */
    public static function generateParams(array $columns, array $joins, array $conditions, array $reqSet): array
    {
        // Validate table input
        if (empty($reqSet['table'])) {
            throw new InvalidArgumentException('Table name is required in request settings');
        }
        Developer::info("complete");
        Developer::info($reqSet);
        // Parse table input (database.table or just table)
        $tableInput = $reqSet['table'];
        $tableParts = explode('.', $tableInput);
        $table = end($tableParts); // Just table name

        // Pull filters from request
        $rawFilters = $reqSet['filters'] ?? [];
        Developer::info($rawFilters);
        $search = is_array($rawFilters['search'] ?? null)
            ? $rawFilters['search']
            : ['value' => $rawFilters['search'] ?? ''];

        $dateRange = $rawFilters['dateRange'] ?? [];
        $sortRules = $rawFilters['sort'] ?? [];
        $pagination = $rawFilters['pagination'] ?? ['page' => 1, 'limit' => 10];
        $columnFilterTypes = $rawFilters['columnFilterTypes'] ?? [];

        // Map all columns (assumed valid)
        $mappedColumns = [];
        foreach ($columns as $alias => $colDef) {
            if (!is_array($colDef) || empty($colDef[0])) {
                continue;
            }
            $mappedColumns[$alias] = $colDef[0];
        }

        if (empty($mappedColumns)) {
            throw new InvalidArgumentException("Columns cannot be empty");
        }

        // Build where conditions
        $where = [];
        foreach ($conditions as $condition) {
            if (isset($condition['column'], $condition['value'])) {
                $where[] = [
                    'column' => $condition['column'],
                    'operator' => $condition['operator'] ?? '=',
                    'value' => $condition['value']
                ];
            } elseif (is_array($condition) && isset($condition['condition'])) {
                $where[] = $condition;
            }
        }

        // Build sort
        $sort = [];
        foreach ($sortRules as $column => $direction) {
            $sort[] = [
                'column' => $column,
                'direction' => $direction
            ];
        }

        // Build column filters (parse CSV to array)
        $filteredColumns = [];
        foreach ($rawFilters['columns'] ?? [] as $columnKey => $csvValues) {
            if (!empty($csvValues)) {
                $valueArray = is_array($csvValues) ? $csvValues : array_map('trim', explode(',', $csvValues));
                $filteredColumns[$columnKey] = [
                    'name' => $columnKey,
                    'searchable' => true,
                    'search' => [
                        'value' => $valueArray
                    ]
                ];
            }
        }

        // Final param structure
        $params = [
            'columns' => $mappedColumns,
            'joins' => $joins,
            'custom' => $reqSet['custom'] ?? [],
            'filters' => [
                'where' => $where,
                'search' => $search,
                'dateRange' => $dateRange,
                'columns' => $filteredColumns,
                'FilterType' => $columnFilterTypes,
                'sort' => $sort,
                'pagination' => [
                    'page' => max(1, (int) ($pagination['page'] ?? 1)),
                    'limit' => max(1, (int) ($pagination['limit'] ?? 10))
                ],
            ],
            'draw' => (int) ($reqSet['draw'] ?? 1),
        ];

        Developer::info($params); // Optional logging
        return $params;
    }



    /**
     * Generates filter configuration for the table.
     *
     * @param string $table Database table name
     * @param string $adtTable Frontend table identifier
     * @param array $columns Column names
     * @return array Filter configuration
     */
    protected static function generateFilterConfig(array $reqSet, array $columns): array
{
    $buttons = false;
    $token = $reqSet['token'] . '_t'; // Use consistent token
    
    // ==============================================
    // SET 1: Top filter controls (search, buttons)
    // ==============================================
    $set1 = '<div class="d-flex flex-column align-items-end">
        <div class="d-flex align-items-center flex-wrap">
          <div class="action-icons d-none me-2">
            <button class="skl-filter-btn btn-outline-danger skeleton-delete-selected" title="Delete Selected">
              <i class="fa fa-trash"></i>
            </button>';
    
    // Add additional buttons for specific tables
    if (in_array($reqSet['table'], ['sun.master_leads', 'sun.master_accounts'])) {
        $set1 .= '<button class="skl-filter-btn btn-outline-success adt-select-product-btn-' . $token . ' me-1" 
                    data-table="' . $token . '">
                  <i class="fa fa-add"></i>
                </button>
                <button class="skl-filter-btn btn-outline-warning adt-select-product-btn-' . $token . ' me-1" 
                    data-table="' . $token . '">
                  <i class="fa fa-user"></i>
                </button>';
    }
    
    $set1 .= '</div>
          <div class="d-flex flex-row align-items-end">
            <input type="search" class="skl-filter-search" 
                   placeholder="Search..." 
                   aria-controls="skeleton-table-' . $token . '">
            <button class="skl-filter-btn skl-refresh-btn" type="button" title="Refresh Table">
              <i class="fa fa-refresh"></i>
            </button>
            <button class="skl-filter-btn" type="button" 
                    data-bs-toggle="modal" 
                    data-bs-target="#filter-modal-' . $token . '" 
                    title="Filter Table">
              <i class="fa fa-filter"></i>
            </button>
          </div>
        </div>
      </div>';

    // ==============================================
    // SET 2: Complete Modal with Filter Table
    // ==============================================
    $modalContent = '<div class="container-fluid p-0">
        <!-- Date Range Filter Card -->
        <div class="row mb-3">
            <div class="col-12">
                <div class="card shadow-none p-2" style="background:#00b4af;color:#fff">
                    <div class="d-flex flex-row justify-content-between align-items-center mb-1 p-1">
                        <span class="sf-13 fw-bold text-dark">
                            <i class="fa-duotone fa-solid fa-bars-filter me-2"></i>Filter
                        </span>
                        <button class="btn bg-warning adt-fltr-btn adt-apply-filters-btn" 
                                data-adt-table="' . $token . '">
                            Export
                        </button>
                    </div>
                    <div class="card p-2 mb-2 shadow-none border border-1">
                        <span class="mb-2 fw-semibold">By Date</span>
                        <div class="input-group date-filter-input me-2">
                            <span class="input-group-text">
                                <i class="fa-duotone fa-calendar-days sf-15"></i>
                            </span>
                            <input type="text" class="date-range-picker" data-date-picker="range" data-date-picker-allow="past-range" 
                                   id="adt-date-filter-' . $token . '" 
                                   data-date-picker="date" 
                                   placeholder="Select date range">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <div class="table-responsive">
                    <table class="table table-bordered filter-config-table" 
                           id="filter-config-table-' . $token . '">
                        <thead>
                            <tr>
                                <th class="fs-6" width="30%">Column</th>
                                <th class="fs-6" width="25%">Filter Type</th>
                                <th class="fs-6" width="45%">Value</th>
                            </tr>
                        </thead>
                        <tbody>';

    // Generate filter rows for each column
    foreach ($columns as $column) {
        $columnName = ucwords(str_replace('_', ' ', $column));
        $filterName = $token . '::' . $column;

        $modalContent .= '<tr>
                <td>
                    <label class="fw-semibold">' . $columnName . '</label>
                </td>
                <td>
                    <select class="form-select form-select-sm adt-filter-' . $token . '" 
                            name="filter-type-' . $filterName . '"
                            id="filter-type-' . $filterName . '">
                        <option value="strict">Strict</option>
                        <option value="partial">Partial</option>
                        <option value="starts_with">Starts With</option>
                        <option value="ends_with">Ends With</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                    </select>
                </td>
                <td>';

        // Special handling for dropdown columns
        if (in_array($column, ['dls_designation', 'li_company_industry'])) {
            $modalContent .= '<select class="form-control h-auto adt-filter-' . $token . '" 
                    data-select="dropdown"
                    id="adt-filter-' . $token . '-' . $column . '"
                    name="' . $filterName . '" 
                    multiple>
                ' . Select::options('categories', 'html', ['category' => 'category']) . '
            </select>';
        } else {
            $modalContent .= '<input type="text" class="form-control h-auto tagify-input adt-filter-' . $token . '" 
                   id="adt-filter-' . $token . '-' . $column . '" data-pills    
                   placeholder="Search in ' . $columnName . '" 
                   name="' . $filterName . '">';
        }

        $modalContent .= '</td>
            </tr>';
    }

    $modalContent .= '</tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>';

    // Complete Modal Structure
    $set2 = $modalContent;
            

    return [
        'set_1' => $set1,         // Top filter controls
        'set_2' => $set2,         // Complete modal HTML
        'buttons' => $buttons,    // Buttons configuration
        'columns' => $columns     // Column definitions
    ];
}


    /**
     * Generates response parameters for DataTables.
     *
     * @param array $data Data from DataService
     * @param array $columns Column definitions
     * @param array $custom Custom settings
     * @param array $reqSet Request settings
     * @return array Response parameters
     * @throws InvalidArgumentException
     */
    public static function generateResponse(array $data, array $columns, array $custom, array $reqSet): array
    {
        if (!isset($data['data'], $data['draw'], $data['recordsTotal'], $data['recordsFiltered'])) {
            throw new InvalidArgumentException('Invalid DataService response structure');
        }

        $processedData = self::processData($data['data'], $columns, $custom, $reqSet);
        $processedColumns = self::generateColumnMeta($columns, $reqSet, $custom);
        $filterConfig = self::generateFilterConfig($reqSet, array_keys($columns));

        // Prepare the response with filter configuration
        $response = [
            'status' => $data['status'] ?? true,
            'draw' => (int) ($data['draw'] ?? 1),
            'data' => $processedData,
            'columns' => $processedColumns,
            'recordsTotal' => (int) ($data['recordsTotal'] ?? 0),
            'recordsFiltered' => (int) ($data['recordsFiltered'] ?? 0),
            'message' => $data['message'] ?? (empty($processedData) ? 'No records found' : 'Records fetched successfully'),
            'filters' => $filterConfig,
        ];

        return $response;
    }
}
