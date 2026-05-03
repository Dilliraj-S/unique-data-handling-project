<?php

namespace App\Http\Helpers;

use App\Facades\{Data, Developer, Select, Skeleton};
use App\Services\DataService;
use Illuminate\Support\Facades\{Cache, Schema, DB};
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use InvalidArgumentException;
use App\Jobs\Export\ExportJob;

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
        if (empty($reqSet['table'])) {
            throw new InvalidArgumentException('Table name is required in request settings');
        }
        $tableInput = $reqSet['table'];
        $tableParts = explode('.', $tableInput);
        $table = end($tableParts);

        $rawFilters = $reqSet['filters'] ?? [];
        $search = is_array($rawFilters['search'] ?? null)
            ? $rawFilters['search']
            : ['value' => $rawFilters['search'] ?? ''];

        $dateRange = $rawFilters['dateRange'] ?? [];
        $sortRules = $rawFilters['sort'] ?? [];
        $pagination = $rawFilters['pagination'] ?? ['page' => 1, 'limit' => 10];
        $filterType = $rawFilters['filterType'] ?? [];
        $visible_columns = $rawFilters['visible_columns'] ?? [];
        $export = $rawFilters['export'] ?? [];
        $processId = $rawFilters['processId'] ?? null;
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

        $sort = [];
        foreach ($sortRules as $column => $direction) {
            $sort[] = [
                'column' => $column,
                'direction' => $direction
            ];
        }

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

        $params = [
            'columns' => $mappedColumns,
            'joins' => $joins,
            'custom' => $reqSet['custom'] ?? [],
            'filters' => [
                'where' => $where,
                'search' => $search,
                'dateRange' => $dateRange,
                'columns' => $filteredColumns,
                'FilterType' => $filterType,
                'sort' => $sort,
                'pagination' => [
                    'page' => max(1, (int) ($pagination['page'] ?? 1)),
                    'limit' => max(1, (int) ($pagination['limit'] ?? 10))
                ],
                'visible_columns' => $visible_columns,
                'export' => $export,
                'processId' => $processId ?? null
            ],
            'draw' => (int) ($reqSet['draw'] ?? 1),
            'key' => $reqSet['key'] ?? $table
        ];
        if (!empty($export['export']) && !empty($export['columns']) && is_array($export['columns'])) {
            $export_limit = Skeleton::getAuthenticatedUser()->export_limit;
            $user_id = Skeleton::getAuthenticatedUser()->id;
            ExportJob::dispatch($reqSet['table'], $params, $export['processId'], $user_id, $export_limit);
        }
        return $params;
    }



    /**
     * Generates filter configuration for the table.
     * 
     * @param array $columns Column names
     * @param array $reqSet configuration
     * @return array Filters
     */
    protected static function generateFilterConfig(array $reqSet, array $columns): array
    {
        $buttons = false;
        if (!empty($reqSet['id'])) {
            $token = $reqSet['token'] . '_t_' . $reqSet['id'];
        } else {
            $token = $reqSet['token'] . '_t';
        }
        $set1 = '<div class="d-flex flex-column align-items-end">
            <div class="d-flex align-items-center flex-wrap gap-2">
                <div class="action-icons d-none p-0">
                    <button class="skl-filter-btn text-danger border border-1 border-danger skeleton-delete-selected skeleton-popup ms-0 me-1" title="Delete Selected">
                        <i class="fa fa-trash"></i>
                    </button>';

        if (in_array($reqSet['table'], ['sun.master_leads', 'sun.master_accounts'])) {
            $set1 .= '<button class="skl-filter-btn skeleton-product-selected skeleton-popup ms-0 me-1" data-bs-toggle="tooltip" title="Add To Product" data-type="' . $reqSet['table'] . '" data-token="' . Skeleton::skeletonToken('central_unique_products') . '_a">
                        <i class="fa fa-add"></i>
                    </button>';

            if ($reqSet['table'] === 'sun.master_leads') {
                $set1 .= '<button class="skl-filter-btn skeleton-audience-selected ms-0 skeleton-popup me-1" data-bs-toggle="tooltip" title="Add To Audience" data-type="' . $reqSet['table'] . '" data-token="' . Skeleton::skeletonToken('central_pluto_audiences') . '_a">
                            <i class="fa fa-user"></i>
                        </button>';
            }
            $set1 .= '<button class="skl-filter-btn skeleton-needToAction-selected ms-0 skeleton-popup" data-bs-toggle="tooltip" title="Need To Action" data-type="' . $reqSet['table'] . '" data-token="' . Skeleton::skeletonToken('central_need_to_action') . '_a">
                        <i class="fa-solid fa-wrench"></i>
                    </button>';
        }

        $set1 .= '</div> <!-- end .action-icons -->
            <div class="d-flex flex-row align-items-end">
                <input type="search" class="skl-filter-search" 
                    placeholder="Search..." 
                    aria-controls="skeleton-table-' . $token . '">
                <button class="skl-filter-btn skl-refresh-btn" type="button" title="Refresh Table">
                    <i class="fa fa-refresh"></i>
                </button>
                <button class="skl-filter-btn skl-date-range-btn" type="button" data-bs-toggle="modal" data-bs-target="#date-range-modal-' . $token . '" title="Date Range Filter">
                    <i class="fa fa-calendar"></i>
                </button>
                <button class="skl-filter-btn" type="button" data-bs-toggle="modal" data-bs-target="#filter-modal-' . $token . '" title="Filter Table">
                    <i class="fa fa-filter"></i>
                </button>
            </div>
        </div>
        </div>';

        // Modal Content Begins
        $modalContent = '
        <div class="modal fade skeleton-modal skeleton-modal-skeleton-' . $token . '" id="filter-modal-' . $token . '" tabindex="-1" aria-labelledby="filterModalLabel-' . $token . '">
            <div class="modal-dialog modal-dialog-centered modal-xl resizable-modal">
            <div class="modal-content draggable-modal">
                <div class="modal-header skeleton-modal-header">
                <div class="skeleton-mdl-hdr-lbl-grp">
                    <button type="button" class="btn modal-drag-handle"><span>⋮⋮</span></button>
                    <h5 class="modal-title skeleton-modal-label m-0"><i class="fa-regular fa-folder me-1"></i>Filters & Export</h5>
                </div>
                <div class="skeleton-mdl-hdr-btn-grp">
                    <button type="button" class="download-btn d-none modal-download-btn"><i class="fa-light fa-download"></i></button>
                    <button type="button" data-bs-dismiss="modal" aria-label="Close"><i class="fa fa-times"></i></button>
                </div>
                </div>
                <div class="modal-body py-1" id="filter-modal-body-' . $token . '">
                    <div class="container-fluid p-0">
                        <div class="row">
                            <div class="col-md-7 border-end pe-3">
                                <div class="card shadow-none p-2 mb-3" style="background-color: #1db4cd;color:#fff">
                                    <div class="d-flex flex-row justify-content-between align-items-center mb-1 p-1">
                                        <span class="sf-13 fw-bold text-white">
                                            <i class="fa-duotone fa-solid fa-bars-filter me-2"></i>Filters
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="card p-3 mb-3 shadow-none border border-1 rounded">
                                    <div class="row g-3 align-items-center">
                                        <div class="col-md-12">
                                            <label for="from-date-' . $token . '" class="form-label fw-semibold">Date Range</label>
                                            <input type="text" 
                                                class="form-control date-range-picker" data-date-picker="range" data-date-picker-allow="past-range" 
                                                id="date-range-' . $token . '" 
                                                placeholder="Select date range">
                                        </div>
                                    </div>
                                </div>

                                <div class="table-responsive" style="max-height:400px">
                                    <table class="table table-sm table-bordered filter-config-table" id="filter-config-table-' . $token . '">
                                        <thead>
                                            <tr>
                                                <th width="30%">Column</th>
                                                <th width="25%">Filter Type</th>
                                                <th width="45%">Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>';

        foreach ($columns as $column) {
            $columnName = ucwords(str_replace('_', ' ', $column));
            $filterName = $token . '::' . $column;
            if (!in_array($column,  ['created_at', 'updated_at', 'deleted_at'])) {
                $modalContent .= '<tr class="filter-row-' . $column . ' col-toggle-' . $column . '">
                <td><label class="fw-semibold sf-15 ">' . $columnName . '</label></td>
                <td>
                    <select class="form-select form-select-sm adt-filter-' . $token . '" data-select="dropdown" 
                            name="filter-type-' . $filterName . '" id="filter-type-' . $filterName . '">
                        <option value="strict">Strict</option>';
                if (!in_array($column, ['dls_designation', 'dls_managementlevel', 'dls_jobfunction', 'li_contact_industry', 'li_industry_relavance', 'li_industry_mapping', 'li_company_employee_size', 'li_contact_location', 'li_contact_country', 'gs_zone_region', 'zm_revenue_size', 'zm_sic_codes', 'zm_naics_codes'])) {
                    $modalContent .= '<option value="partial">Partial</option>';
                }

                $modalContent .= '<option value="starts_with">Starts With</option>
                        <option value="ends_with">Ends With</option>';
                if (in_array($column, ['id', 'company_id'])) {
                    $modalContent .= '<option value="greater_than">Greater Than</option>
                            <option value="less_than">Less Than</option>';
                }
                $modalContent .= '<option value="not">Not</option>
                </select>
                </td>
                <td>';

                if (in_array($column, ['dls_designation', 'dls_managementlevel', 'dls_jobfunction', 'li_contact_industry', 'li_industry_relavance', 'li_industry_mapping', 'li_company_employee_size', 'li_contact_location', 'li_contact_country', 'gs_zone_region', 'zm_revenue_size', 'zm_sic_codes', 'zm_naics_codes'])) {
                    $modalContent .= '<select class="form-control h-auto adt-filter-' . $token . '" 
                        id="adt-filter-' . $token . '-' . $column . '" data-select="dropdown"
                        name="' . $filterName . '" multiple>
                    ' . Select::options('options', 'html', ['option' => 'option'], ['where' => ['category' => $column]]) . '
                </select>';
                } else if (in_array($column, ['created_at', 'updated_at', 'deleted_at'])) {
                    $modalContent .= '<input type="date" class="form-control h-auto adt-filter-' . $token . '"
                    id="adt-filter-' . $token . '-' . $column . '" placeholder="Search in ' . $column . '" name="' . $filterName . '">';
                } else {
                    $modalContent .= '<input type="text" class="form-control h-auto tagify-input adt-filter-' . $token . '"
                    id="adt-filter-' . $token . '-' . $column . '" data-pills placeholder="Search in ' . $column . '" name="' . $filterName . '">';
                }
                $modalContent .= '</td></tr>';
            }
        }

        $modalContent .= '</tbody>
                            </table>
                            </div>
                        </div>
                        
                        <!-- Right Side - Export Configuration -->
                        <div class="col-md-5 ps-3">
                            <div class="card shadow-none p-2 mb-3" style="background-color: #1db4cd;color:#fff">
                                <div class="d-flex flex-row justify-content-between align-items-center mb-1 p-1">
                                    <span class="sf-13 fw-bold text-white">
                                        <i class="fa-duotone fa-file-export me-2"></i>Export Configuration
                                    </span>
                                </div>
                            </div>
                            
                            <div class="card p-3 mb-3 shadow-none border border-1 rounded">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Columns to Export</label>
                                    <select class="form-select choice-select" multiple size="8" id="export-columns-' . $token . '" data-token="' . $token . '">';
        foreach ($columns as $column) {
            $label = ucwords(str_replace('_', ' ', $column));
            $modalContent .= '<option value="' . $column . '">' . $label . '</option>';
        }
        $modalContent .= '</select>
                                    <small class="text-muted">Hold CTRL to select multiple columns</small>
                                </div>
                                <div class="form-check form-switch mb-3">
                                    <input class="form-check-input" type="checkbox" id="apply-export-' . $token . '">
                                    <label class="form-check-label" for="apply-filters-export-' . $token . '">Enable export</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer mt-0 border border-top-0 pt-2">
                    <button type="button" class="btn btn-secondary skeleton-clear-filters" data-bs-dismiss="modal">Clear</button>
                    <button type="button" class="btn btn-primary skeleton-form-btn skeleton-apply-filters">Apply Filters</button>
                </div>
            </div>
            </div>
        </div>
    </div>';

        // Date Range Modal
        $dateRangeModal = '
        <div class="modal fade skeleton-modal" id="date-range-modal-' . $token . '" tabindex="-1" aria-labelledby="dateRangeModalLabel-' . $token . '">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header skeleton-modal-header">
                        <div class="skeleton-mdl-hdr-lbl-grp">
                            <h5 class="modal-title skeleton-modal-label m-0">
                                <i class="fa fa-calendar me-1"></i>Date Range Filter
                            </h5>
                        </div>
                        <div class="skeleton-mdl-hdr-btn-grp">
                            <button type="button" data-bs-dismiss="modal" aria-label="Close">
                                <i class="fa fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="date-column-select-' . $token . '" class="form-label fw-semibold">Select Date Column</label>
                            <select class="form-select" id="date-column-select-' . $token . '">
                                <option value="created_at">Created Date</option>
                                <option value="updated_at">Updated Date</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="external-date-range-' . $token . '" class="form-label fw-semibold">Date Range</label>
                            <input type="text" 
                                class="form-control date-range-picker" 
                                data-date-picker="range" 
                                data-date-picker-allow="past-range" 
                                id="external-date-range-' . $token . '" 
                                placeholder="Select date range">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="clear-date-range-' . $token . '">Clear</button>
                        <button type="button" class="btn btn-primary" id="apply-date-range-' . $token . '">Apply</button>
                    </div>
                </div>
            </div>
        </div>';
        return [
            'set_1' => $set1,
            'set_2' => $modalContent . $dateRangeModal,
            'buttons' => $buttons,
            'columns' => $columns
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
            'reqSet' => $reqSet,
            'query' => $data['query'],
            'company_queries' => $data['company_queries']
        ];
        return $response;
    }
}
