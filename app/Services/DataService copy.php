<?php

namespace App\Services;

use App\Events\{SkeletonEvent, TableEvent};
use App\Facades\{Database, Developer, Skeleton};
use Illuminate\Support\Facades\{Cache, Config, Schema};
use Illuminate\Database\{QueryException, Connection};
use Illuminate\Support\{Arr, Collection, Str};
use Illuminate\Support\Facades\DB;
use Exception;
use InvalidArgumentException;
use App\Jobs\Counts\CountJob;


/**
 * Optimized DataService for handling global CRUD operations and filtering.
 * Designed for minimal time and space complexity with robust error handling and caching.
 */
class DataService
{
    // Cache and chunk configurations
    private const CACHE_TTL = 7200; // Cache time-to-live in seconds (2 hours)
    private const CHUNK_SIZE = 1000; // Chunk size for large dataset processing
    private const SKELETON_TABLES = [
        'skeleton_modules',
        'skeleton_sections',
        'skeleton_items',
        'role_permissions',
        'user_permissions'
    ];
    private const PERMISSION_TABLES = [
        'skeleton_modules',
        'skeleton_sections',
        'skeleton_items',
        'role_permissions',
        'user_permissions'
    ];

    // ----------------------------------- Core CRUD Operations -----------------------------------
    /**
     * Creates a new record in the specified table.
     *
     * @param string $system Database system name (central or business)
     * @param string $table Table name
     * @param array $data Associative array of column-value pairs
     * @param string $tokenKey Optional token key for event dispatching
     * @return array Response: ['status' => bool, 'message' => string, 'data' => array]
     */
    public function create(string $system, string $table, array $data, string $tokenKey = ''): array
    {
        try {
            if (empty($data)) {
                throw new InvalidArgumentException('Data array cannot be empty');
            }
            $schemaColumns = $this->getCachedSchemaColumns($table);
            $insertData = $this->prepareData($data, $table, $schemaColumns, 'create');
            DB::beginTransaction();
            $id = DB::table($table)->insertGetId($insertData);
            DB::commit();
            $this->clearTableCache($table);
            $this->dispatchEvent($system, $table, 'create', [], [], $tokenKey);
            return $this->formatResponse(true, ['id' => $id], 'Record added successfully');
        } catch (QueryException $e) {
            DB::rollBack();
            return $this->handleError($e, $system, $table, 'Add record failed', Arr::except($data, ['password', 'token']));
        } catch (InvalidArgumentException $e) {
            return $this->handleInvalidArgumentException($e, $system, $table, Arr::except($data, ['password', 'token']));
        } catch (Exception $e) {
            DB::rollBack();
            return $this->handleUnexpectedError($e, $system, $table, 'create', Arr::except($data, ['password', 'token']));
        }
    }

    /**
     * Updates records in the specified table.
     *
     * @param string $system Database system name
     * @param string $table Table name
     * @param array $data Associative array of column-value pairs
     * @param array $where Associative array of where conditions
     * @param string $tokenKey Optional token key for event dispatching
     * @return array Response: ['status' => bool, 'message' => string, 'data' => array]
     */
    public function update(string $system, string $table, array $data, array $where, string $tokenKey = ''): array
    {
        try {
            if (empty($data) || empty($where)) {
                throw new InvalidArgumentException('Data and where conditions cannot be empty');
            }
            $schemaColumns = $this->getCachedSchemaColumns($table);
            $this->validateWhereColumns($where, $table);
            $prevRecord = in_array($table, self::SKELETON_TABLES)
                ? DB::table($table)->where($where)->first()
                : null;
            $updateData = $this->prepareData($data, $table, $schemaColumns, 'update');
            DB::beginTransaction();

            $affected = DB::table($table)
                ->where($this->buildWhereClause($where, $table, []))
                ->update($updateData);
            Developer::info($affected);
            if ($affected === 0) {
                DB::rollBack();
                return $this->formatResponse(false, [], 'No records updated');
            }
            DB::commit();

            $this->clearTableCache($table);
            $this->dispatchEvent($system, $table, 'update', $where, $prevRecord ? (array) $prevRecord : [], $tokenKey);

            return $this->formatResponse(true, ['affected_rows' => $affected], 'Records updated successfully');
        } catch (QueryException $e) {
            DB::rollBack();
            return $this->handleError($e, $system, $table, 'Update records failed', Arr::except($data, ['password', 'token']));
        } catch (InvalidArgumentException $e) {
            return $this->handleInvalidArgumentException($e, $system, $table, Arr::except($data, ['password', 'token']));
        } catch (Exception $e) {
            DB::rollBack();
            return $this->handleUnexpectedError($e, $system, $table, 'update', Arr::except($data, ['password', 'token']));
        }
    }

    /**
     * Deletes records from the specified table with soft delete support.
     *
     * @param string $system Database system name
     * @param string $table Table name
     * @param array $where Associative array of where conditions
     * @param string $tokenKey Optional token key for event dispatching
     * @return array Response: ['status' => bool, 'message' => string, 'data' => array]
     */
    public function delete(string $system, string $table, array $where, string $tokenKey = ''): array
    {
        try {
            if (empty($where)) {
                throw new InvalidArgumentException('Where conditions cannot be empty');
            }

            $schemaColumns = $this->getCachedSchemaColumns($table);

            $prevRecord = in_array($table, self::SKELETON_TABLES)
                ? DB::table($table)->where($where)->first()
                : null;

            DB::beginTransaction();

            $query = DB::table($table)->where($this->buildWhereClause($where, $table));

            $affected = $query->delete();

            DB::commit();

            $this->clearTableCache($table);
            $this->dispatchEvent($system, $table, 'delete', $where, $prevRecord ? (array)$prevRecord : [], $tokenKey);

            return $this->formatResponse(true, ['affected_rows' => $affected], 'Records deleted successfully');
        } catch (QueryException $e) {
            DB::rollBack();
            return $this->handleError($e, $system, $table, 'Delete records failed');
        } catch (InvalidArgumentException $e) {
            return $this->handleInvalidArgumentException($e, $system, $table);
        } catch (Exception $e) {
            DB::rollBack();
            return $this->handleUnexpectedError($e, $system, $table, 'delete');
        }
    }


    /**
     * Fetches records with optional columns, joins, and conditions.
     *
     * @param string $system Database system name
     * @param string $table Table name
     * @param array $params Parameters: ['columns' => array|string, 'joins' => array, 'where' => array, 'sort' => array, 'groupBy' => array, 'custom' => array]
     * @param string|null $limit Optional limit for pagination
     * @return array Response: ['status' => bool, 'message' => string, 'data' => array]
     */
    public function get(string $system, string $table, array $params = [], string $limit = ''): array
    {
        try {
            $system = $system === 'open' ? 'central' : $system;

            $query = $this->buildSelectQuery($system, $table, $params, $limit);

            if (!empty($params['groupBy'])) {
                $query->groupBy($this->validateGroupBy($params['groupBy'], $table, $params['joins'] ?? []));
            }

            $records = $this->executeSelectQuery($query, $system, $table, $params);

            return $this->formatResponse(true, $records, empty($records) ? 'No records found' : 'Records fetched successfully');
        } catch (QueryException $e) {
            return $this->handleError($e, $system, $table, 'Fetch records failed');
        } catch (InvalidArgumentException $e) {
            return $this->handleInvalidArgumentException($e, $system, $table);
        } catch (Exception $e) {
            return $this->handleUnexpectedError($e, $system, $table, 'fetch');
        }
    }


    /**
     * Filters records with advanced filtering, sorting, and pagination.
     *
     * @param string $table Table name
     * @param array $params Filter parameters: ['columns' => array|string, 'joins' => array, 'filters' => array, 'draw' => int, 'custom' => array, 'groupBy' => array]
     */
    public function filter(string $table, array $params): array
    {
        $draw = (int)($params['draw'] ?? 1);
        Developer::info($params);
        try {
            $filters = $params['filters'] ?? [];
            $joins = $params['joins'] ?? [];
            $custom = $params['custom'] ?? [];
            $visibleColumns = $filters['visible_columns'] ?? [];
            $qualifiedTable = str_contains($table, '.') ? $table : DB::getTablePrefix() . $table;

            $allColumns = array_values($params['columns']);
            $selectColumns = !empty($visibleColumns) ? array_intersect($visibleColumns, $allColumns) : $allColumns;
            if (empty($selectColumns)) {
                $selectColumns = $allColumns;
            }

            $selectQualified = array_map(fn($col) => str_contains($col, '.') ? $col : "$qualifiedTable.$col", $selectColumns);
            $schemaColumns = $this->getCachedSchemaColumns($table);

            $query = DB::table($qualifiedTable)->select($selectQualified);
            if (in_array('deleted_at', $schemaColumns)) {
                $query->whereNull("{$qualifiedTable}.deleted_at");
            }

            $countQuery = DB::table($qualifiedTable);
            $totalQuery = DB::table($qualifiedTable);

            foreach ($joins as $join) {
                if (isset($join['type'], $join['table'], $join['on']) && is_array($join['on'])) {
                    $method = strtolower($join['type']);
                    if (in_array($method, ['inner', 'left', 'right', 'cross'])) {
                        foreach ([$query, $countQuery] as $q) {
                            $q->{$method . 'Join'}($join['table'], $join['on'][0], '=', $join['on'][1]);
                        }
                        $totalQuery->{$method . 'Join'}($join['table'], $join['on'][0], '=', $join['on'][1]);
                    }
                }
            }

            if (!empty($filters['columns'])) {
                foreach ($filters['columns'] as $column => $filter) {
                    $qualifiedColumn = str_contains($column, '.') ? $column : "$qualifiedTable.$column";
                    $values = $filter['search']['value'] ?? [];
                    if (!is_array($values)) $values = explode(',', $values);
                    $filterType = $filters['FilterType'][$column] ?? 'strict';

                    foreach ([$query, $countQuery] as $q) {
                        $q->where(fn($q2) => self::applyFilter($q2, $qualifiedColumn, $values, $filterType));
                    }
                }
            }

            if (!empty($filters['where']) && is_array($filters['where'])) {
                foreach ($filters['where'] as $cond) {
                    if (isset($cond['column'], $cond['operator']) && array_key_exists('value', $cond)) {
                        $column = $cond['column'];
                        $operator = strtoupper(trim($cond['operator']));
                        $value = $cond['value'];
                        $qualified = str_contains($column, '.') ? $column : "$qualifiedTable.$column";

                        foreach ([$query, $countQuery] as $q) {
                            if (in_array($operator, ['IN', 'NOT IN'])) {
                                $arr = is_array($value) ? $value : explode(',', $value);
                                $q->{$operator === 'IN' ? 'whereIn' : 'whereNotIn'}($qualified, $arr);
                            } else {
                                $q->where($qualified, $operator, $value);
                            }
                        }
                    }
                }
            }

            if (!empty($filters['dateRange']['created_at']['from']) && !empty($filters['dateRange']['created_at']['to'])) {
                $col = $filters['dateRange']['column'] ?? 'created_at';
                $qualifiedDateCol = str_contains($col, '.') ? $col : "$qualifiedTable.$col";
                $from = date('Y-m-d 00:00:00', strtotime($filters['dateRange']['created_at']['from']));
                $to = date('Y-m-d 23:59:59', strtotime($filters['dateRange']['created_at']['to']));

                foreach ([$query, $countQuery] as $q) {
                    $q->whereBetween($qualifiedDateCol, [$from, $to]);
                }
            }

            $globalSearch = trim($filters['search']['value'] ?? '');
            if (!empty($globalSearch)) {
                $searchableColumns = array_filter(
                    $selectQualified,
                    fn($col) =>
                    !str_ends_with($col, '_id') && !str_contains($col, 'status') && !str_contains($col, 'is_')
                );

                foreach ([$query, $countQuery] as $q) {
                    $q->where(function ($q2) use ($globalSearch, $searchableColumns) {
                        foreach ($searchableColumns as $col) {
                            $q2->orWhere($col, 'LIKE', "%{$globalSearch}%");
                        }
                    });
                }
            }

            foreach ((array)($filters['sort'] ?? []) as $sortItem) {
                if (isset($sortItem['column'], $sortItem['direction'])) {
                    $col = $sortItem['column'];
                    $dir = strtolower($sortItem['direction']);
                    $qualified = str_contains($col, '.') ? $col : "$qualifiedTable.$col";
                    if (in_array($qualified, $selectQualified) && in_array($dir, ['asc', 'desc'])) {
                        $query->orderBy($qualified, $dir);
                    }
                }
            }

            if (($custom['mode'] ?? null) === 'fetch_ids') {
                $idColumn = "$qualifiedTable.id";
                $ids = $query->pluck($idColumn)->toArray();

                return [
                    'status' => true,
                    'message' => count($ids) ? 'IDs fetched successfully' : 'No matching records.',
                    'draw' => $draw,
                    'data' => $ids,
                    'recordsTotal' => null,
                    'recordsFiltered' => null,
                    'columns' => [],
                    'key' => $params['key'] ?? $table,
                    'query' => null,
                    'recordsQuery' => null
                ];
            }

            // Pagination
            $page = max(1, (int)($filters['pagination']['page'] ?? 1));
            $limit = max(1, (int)($filters['pagination']['limit'] ?? 10));
            $lastId = $filters['pagination']['last_id'] ?? null;

            if ($lastId && in_array("$qualifiedTable.id", $selectQualified)) {
                $query->where("$qualifiedTable.id", '>', $lastId);
            } else {
                $query->offset(($page - 1) * $limit);
            }
            $query->limit($limit);

            $records = $query->get()->map(fn($item) => (array)$item)->toArray() ?? [];
            $recordsTotal = Cache::remember("{$table}_count_total", 60, fn() => $totalQuery->count());
            $recordsFiltered = $countQuery->count();

            $liCompanyIdCountQueries = [
                'total' => [
                    'sql' => $totalQuery->clone()->selectRaw('COUNT(DISTINCT li_smtp) as count')->toSql(),
                    'bindings' => $totalQuery->getBindings(),
                ],
                'filtered' => [
                    'sql' => $countQuery->clone()->selectRaw('COUNT(DISTINCT li_smtp) as count')->toSql(),
                    'bindings' => $countQuery->getBindings(),
                ]
            ];

            $processedColumns = array_map(fn($column) => [
                'data' => $column,
                'name' => $column,
                'title' => ucfirst(str_replace('_', ' ', $column)),
                'orderable' => true,
                'searchable' => true
            ], $allColumns);

            return [
                'status' => true,
                'message' => count($records) ? 'Filtered successfully' : 'No records found.',
                'draw' => $draw,
                'data' => $records,
                'recordsTotal' => $recordsTotal,
                'recordsFiltered' => $recordsFiltered,
                'columns' => $processedColumns,
                'key' => $params['key'] ?? $table,
                'query' => $params,
                'recordsQuery' => $query,
                'company_queries' => $liCompanyIdCountQueries
            ];
        } catch (\Exception $e) {
            return [
                'status' => false,
                'message' => 'Error: ' . $e->getMessage(),
                'draw' => $draw,
                'data' => [],
                'recordsTotal' => 0,
                'recordsFiltered' => 0,
                'columns' => [],
                'filters' => [],
                'key' => $params['key'] ?? $table,
                'query' => null,
                'recordsQuery' => null
            ];
        }
    }

    private static function applyFilter($q, string $column, array $values, string $type): void
    {
        $values = array_filter(array_map('trim', $values));
        foreach ($values as $value) {
            match ($type) {
                'strict'       => $q->orWhere($column, '=', $value),
                'partial'      => $q->orWhere($column, 'LIKE', "%{$value}%"),
                'starts_with'  => $q->orWhere($column, 'LIKE', "{$value}%"),
                'ends_with'    => $q->orWhere($column, 'LIKE', "%{$value}"),
                'greater_than' => $q->orWhere($column, '>', $value),
                'less_than'    => $q->orWhere($column, '<', $value),
                'not'          => $q->orWhere($column, '!=', $value),
                default        => $q->orWhere($column, '=', $value),
            };
        }
    }




    protected function processCustomView(string $viewTemplate, $rowData, bool $renderHtml = false)
    {
        // Replace placeholders with actual values
        foreach ($rowData as $key => $value) {
            $viewTemplate = str_replace("::{$key}::", $value, $viewTemplate);
        }

        // Process conditional expressions
        $viewTemplate = preg_replace_callback(
            '/::\((.*?)\)::/',
            function ($matches) use ($rowData) {
                try {
                    // Extract the condition and results
                    if (preg_match('/^(.*?) ~ (.*?) \|\| (.*?)$/', $matches[1], $parts)) {
                        $condition = $parts[1];
                        $trueResult = $parts[2];
                        $falseResult = $parts[3];

                        // Replace column references with values
                        foreach ($rowData as $key => $value) {
                            $condition = str_replace($key, var_export($value, true), $condition);
                        }

                        // Evaluate condition
                        $result = eval("return {$condition};");
                        return $result ? $trueResult : $falseResult;
                    }
                    return $matches[0];
                } catch (\Exception $e) {
                    return $matches[0];
                }
            },
            $viewTemplate
        );

        return $renderHtml;
    }

    // ----------------------------------- Query Building Functions -----------------------------------
    /**
     * Builds an optimized select query with columns, joins, and sorting.
     *
     * @param string $system Database system name
     * @param string $table Table name
     * @param array $params Query parameters
     * @param Connection $connection Database connection
     * @param string|null $limit Pagination limit
     * @return \Illuminate\Database\Query\Builder
     */
    protected function buildSelectQuery(string $system, string $table, array $params, ?string $limit)
    {
        $query = DB::table($table);
        $schemaColumns = $this->getCachedSchemaColumns($table);

        $this->applySoftDeleteFilters($query, $schemaColumns, $params, $table);

        $columnMap = [];
        $validColumns = $this->validateAndPrepareColumns(
            $params['columns'] ?? ['*'],
            $table,
            $params['joins'] ?? [],
            $columnMap
        );

        if (!empty($validColumns)) {
            $query->select($validColumns);
        }

        $this->applyJoins($query, $params['joins'] ?? [], $table);

        if (!empty($params['where'])) {
            $query->where($this->buildWhereClause($params['where'], $table, $params['joins'] ?? []));
        }

        if (!empty($params['search']) && is_array($params['search'])) {
            $query->where(
                fn($q) =>
                $this->applyAdvancedSearch($q, $params['search'], $table, $params['joins'] ?? [], $columnMap, $validColumns)
            );
        }

        if (!empty($params['dateRange'])) {
            $this->applyDateRange($query, $params['dateRange'], $table, $params['joins'] ?? []);
        }

        if (!empty($params['columns'])) {
            $this->applyColumnFilters($query, $params['columns'], $table, $params['joins'] ?? [], $columnMap);
        }

        $query = $this->applySorting($query, $params, $validColumns, $table, $columnMap);
        $query = $this->applyPagination($query, $params, $limit);

        $this->logQuery($system, $table, $query->toSql(), $query->getBindings());

        return $query;
    }


    /**
     * Executes a select query and processes records with custom modifications.
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param string $system
     * @param string $table
     * @param array $params
     * @param Connection $connection
     * @return array Processed records
     */
    protected function executeSelectQuery($query, string $system, string $table, array $params): array
    {
        $records = $query->cursor()->map(function ($row) use ($table, $params) {
            $rowData = is_object($row) ? (array) $row : $row;

            if (!is_array($rowData)) {
                Developer::warning('Invalid row data type in executeSelectQuery', [
                    'table' => $table,
                    'row' => $row,
                ]);
                return [];
            }

            $mapped = [];

            foreach ($rowData as $key => $value) {
                $mapped[str_replace('.', '_', $key)] = $value;
            }

            if (!empty($params['custom'])) {
                foreach ($params['custom'] as $modification) {
                    if (
                        isset($modification['type'], $modification['column'], $modification['view']) &&
                        $modification['type'] === 'modify'
                    ) {
                        $colKey = str_replace('.', '_', $modification['column']);
                        if (array_key_exists($colKey, $mapped)) {
                            $mapped[$colKey] = $this->applyCustomModification((object) $mapped, $modification);
                        }
                    }
                }
            }

            return $mapped;
        })->filter()->toArray();

        return $records;
    }


    /**
     * Applies advanced search conditions to a query.
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param array $search Search parameters
     * @param string $table Table name
     * @param array $joins Join configurations
     * @param Connection $connection Database connection
     * @param array $columnMap Column mapping
     * @param array $validColumns Valid columns
     * @return void
     */
    protected function applyAdvancedSearch($query, array $search, string $table, array $joins, array $columnMap, array $validColumns): void
    {
        if (empty($search['value']) && empty($search['columns']) && empty($search['regex'])) {
            return;
        }

        $query->where(function ($q) use ($search, $table, $joins, $columnMap) {
            // Handle LIKE-based search
            if (!empty($search['value']) && is_string($search['value'])) {
                $searchValue = trim($search['value']);
                if (empty($searchValue)) {
                    Developer::info('Empty search value provided', ['table' => $table]);
                    return;
                }

                $searchColumns = !empty($search['columns'])
                    ? array_filter($search['columns'], fn($col) => $this->validateColumn($col, $table, $joins))
                    : array_values($columnMap);

                foreach ($searchColumns as $column) {
                    $qualifiedColumn = array_key_exists($column, $columnMap)
                        ? $columnMap[$column]
                        : (str_contains($column, '.') ? $column : "{$table}.{$column}");

                    $qualifiedColumn = preg_replace('/\s+AS\s+\w+$/i', '', $qualifiedColumn);

                    if ($this->validateColumn($qualifiedColumn, $table, $joins)) {
                        $q->orWhere($qualifiedColumn, 'LIKE', "%{$searchValue}%");
                    } else {
                        Developer::warning('Invalid search column', [
                            'table' => $table,
                            'column' => $qualifiedColumn,
                            'search_value' => $searchValue,
                        ]);
                    }
                }
            }

            // Handle REGEXP search
            if (!empty($search['regex']) && is_array($search['regex'])) {
                foreach ($search['regex'] as $column => $pattern) {
                    $qualifiedColumn = array_key_exists($column, $columnMap)
                        ? $columnMap[$column]
                        : (str_contains($column, '.') ? $column : "{$table}.{$column}");

                    $qualifiedColumn = preg_replace('/\s+AS\s+\w+$/i', '', $qualifiedColumn);

                    if ($this->validateColumn($qualifiedColumn, $table, $joins)) {
                        $q->orWhereRaw("{$qualifiedColumn} REGEXP ?", [$pattern]);
                    } else {
                        Developer::warning('Invalid regex column', [
                            'table' => $table,
                            'column' => $qualifiedColumn,
                            'pattern' => $pattern,
                        ]);
                    }
                }
            }
        });
    }


    /**
     * Applies date range filters to a query.
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param array $dateRange Date range filters
     * @param string $table Table name
     * @param array $joins Join configurations
     * @param Connection $connection Database connection
     * @return void
     */
    protected function applyDateRange($query, array $dateRange, string $table, array $joins): void
    {
        if (empty($dateRange)) {
            Developer::info('No date range filters provided', ['table' => $table]);
            return;
        }

        foreach ($dateRange as $column => $range) {
            if (!is_array($range) || (empty($range['from']) && empty($range['to']))) {
                Developer::warning('Invalid date range format', [
                    'table' => $table,
                    'column' => $column,
                    'range' => $range,
                ]);
                continue;
            }

            $qualifiedColumn = str_contains($column, '.') ? $column : "{$table}.{$column}";
            $qualifiedColumn = preg_replace('/\s+AS\s+\w+$/i', '', $qualifiedColumn);

            if (!$this->validateColumn($qualifiedColumn, $table, $joins)) {
                Developer::warning('Invalid date range column', [
                    'table' => $table,
                    'column' => $qualifiedColumn,
                    'range' => $range,
                ]);
                continue;
            }

            if (!empty($range['from'])) {
                try {
                    $query->where($qualifiedColumn, '>=', $range['from']);
                } catch (Exception $e) {
                    Developer::warning('Invalid date range "from" value', [
                        'table' => $table,
                        'column' => $qualifiedColumn,
                        'value' => $range['from'],
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if (!empty($range['to'])) {
                try {
                    $query->where($qualifiedColumn, '<=', $range['to']);
                } catch (Exception $e) {
                    Developer::warning('Invalid date range "to" value', [
                        'table' => $table,
                        'column' => $qualifiedColumn,
                        'value' => $range['to'],
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }
    }


    /**
     * Applies column-specific filters to a query.
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param array $columnFilters Column filter parameters
     * @param string $table Table name
     * @param array $joins Join configurations
     * @param Connection $connection Database connection
     * @param array $columnMap Column mapping
     * @return void
     */
    protected function applyColumnFilters($query, array $columnFilters, string $table, array $joins, array $columnMap): void
    {
        if (empty($columnFilters)) {
            Developer::info('No column filters provided', ['table' => $table]);
            return;
        }

        foreach ($columnFilters as $column => $filter) {
            $value = $filter['search']['value'] ?? null;

            if (empty($value) && !is_array($value)) {
                continue;
            }

            $qualifiedColumn = array_key_exists($column, $columnMap)
                ? $columnMap[$column]
                : (str_contains($column, '.') ? $column : "{$table}.{$column}");

            $qualifiedColumn = preg_replace('/\s+AS\s+\w+$/i', '', $qualifiedColumn);

            if (!$this->validateColumn($qualifiedColumn, $table, $joins)) {
                Developer::warning('Invalid column filter column', [
                    'table' => $table,
                    'column' => $qualifiedColumn,
                    'filter' => $filter,
                ]);
                continue;
            }

            try {
                if (is_array($value)) {
                    $query->whereIn($qualifiedColumn, $value);
                } elseif (isset($filter['search']['regex']) && $filter['search']['regex']) {
                    $query->whereRaw("{$qualifiedColumn} REGEXP ?", [$value]);
                } else {
                    $query->where($qualifiedColumn, 'LIKE', "%{$value}%");
                }
            } catch (Exception $e) {
                Developer::warning('Failed to apply column filter', [
                    'table' => $table,
                    'column' => $qualifiedColumn,
                    'filter' => $filter,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }


    /**
     * Applies joins to a query.
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param array $joins Join configurations
     * @param string $table Table name
     * @param Connection $connection Database connection
     * @return void
     */
    protected function applyJoins($query, array $joins, string $table): void
    {
        if (empty($joins)) {
            return;
        }

        foreach ($joins as $index => $join) {
            if (
                !isset($join['type'], $join['table'], $join['on']) ||
                !is_array($join['on']) ||
                count($join['on']) !== 2
            ) {
                Developer::warning('Invalid join configuration', [
                    'table' => $table,
                    'join_index' => $index,
                    'join' => $join,
                ]);
                continue;
            }

            $joinType = strtolower($join['type']);
            $joinMethod = match ($joinType) {
                'inner' => 'join',
                'right' => 'rightJoin',
                'left'  => 'leftJoin',
                default => 'leftJoin',
            };

            [$leftCol, $rightCol] = $join['on'];
            $leftCol = preg_replace('/\s+AS\s+\w+$/i', '', $leftCol);
            $rightCol = preg_replace('/\s+AS\s+\w+$/i', '', $rightCol);

            if (!$this->validateColumn($leftCol, $table, $joins)) {
                Developer::warning('Invalid left join column', [
                    'table' => $table,
                    'join_table' => $join['table'],
                    'left_col' => $leftCol,
                    'schema' => $this->getCachedSchemaColumns($table),
                    'join_index' => $index,
                ]);
                continue;
            }

            if (!$this->validateColumn($rightCol, $join['table'], $joins)) {
                Developer::warning('Invalid right join column', [
                    'table' => $table,
                    'join_table' => $join['table'],
                    'right_col' => $rightCol,
                    'schema' => $this->getCachedSchemaColumns($join['table']),
                    'join_index' => $index,
                ]);
                continue;
            }

            $query->$joinMethod($join['table'], fn($q) => $q->on($leftCol, '=', $rightCol));
        }
    }

    /**
     * Builds a where clause for queries.
     *
     * @param array $where Where conditions
     * @param string|null $table Table name
     * @param array $joins Join configurations
     * @param Connection|null $connection Database connection
     * @return \Closure
     */
    protected function buildWhereClause(array $where, ?string $table = null, array $joins = []): \Closure
    {
        return function ($q) use ($where, $table, $joins) {
            foreach ($where as $key => $value) {
                // Handle nested AND/OR groups
                if (is_array($value) && isset($value['condition'])) {
                    $condition = strtoupper($value['condition']);
                    if (!in_array($condition, ['AND', 'OR'])) {
                        Developer::warning('Invalid where condition', [
                            'table' => $table,
                            'condition' => $condition,
                            'clauses' => $value['clauses'],
                        ]);
                        continue;
                    }
                    $method = $condition === 'OR' ? 'orWhere' : 'where';
                    $q->$method(fn($subQuery) => $this->buildWhereClause($value['clauses'], $table, $joins)($subQuery));
                    continue;
                }

                // Qualify column name if not already
                $qualifiedColumn = $table && !str_contains($key, '.') ? "{$table}.{$key}" : $key;
                $qualifiedColumn = preg_replace('/\s+AS\s+\w+$/i', '', $qualifiedColumn);

                // Build condition
                if (is_array($value) && isset($value['operator'], $value['value'])) {
                    $operator = strtoupper($value['operator']);
                    if (!in_array($operator, ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'NOT IN'])) {
                        Developer::warning('Invalid operator in where clause', [
                            'table' => $table,
                            'column' => $qualifiedColumn,
                            'operator' => $operator,
                            'value' => $value['value'],
                        ]);
                        continue;
                    }

                    $method = in_array($operator, ['IN', 'NOT IN'])
                        ? ($operator === 'NOT IN' ? 'whereNotIn' : 'whereIn')
                        : 'where';

                    try {
                        $q->$method(
                            $qualifiedColumn,
                            $operator === 'LIKE' ? 'LIKE' : $operator,
                            $operator === 'LIKE' ? "%{$value['value']}%" : $value['value']
                        );
                    } catch (Exception $e) {
                        Developer::warning('Failed to apply where clause', [
                            'table' => $table,
                            'column' => $qualifiedColumn,
                            'operator' => $operator,
                            'value' => $value['value'],
                            'error' => $e->getMessage(),
                        ]);
                    }
                } elseif (is_array($value)) {
                    try {
                        $q->whereIn($qualifiedColumn, $value);
                    } catch (Exception $e) {
                        Developer::warning('Failed to apply whereIn clause', [
                            'table' => $table,
                            'column' => $qualifiedColumn,
                            'value' => $value,
                            'error' => $e->getMessage(),
                        ]);
                    }
                } else {
                    try {
                        $q->where($qualifiedColumn, '=', $value);
                    } catch (Exception $e) {
                        Developer::warning('Failed to apply where clause', [
                            'table' => $table,
                            'column' => $qualifiedColumn,
                            'value' => $value,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }
        };
    }


    /**
     * Extracts bindings from a where clause.
     *
     * @param array $where Where conditions
     * @return array Bindings
     */
    protected function extractWhereBindings(array $where): array
    {
        $bindings = [];
        foreach ($where as $key => $value) {
            if (is_array($value) && isset($value['condition'])) {
                $bindings = array_merge($bindings, $this->extractWhereBindings($value['clauses']));
            } elseif (is_array($value) && isset($value['value'])) {
                if (is_array($value['value'])) {
                    $bindings = array_merge($bindings, $value['value']);
                } else {
                    $bindings[] = $value['operator'] === 'LIKE' ? "%{$value['value']}%" : $value['value'];
                }
            } elseif (is_array($value)) {
                $bindings = array_merge($bindings, $value);
            } else {
                $bindings[] = $value;
            }
        }
        return $bindings;
    }

    /**
     * Applies sorting to a query.
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param array $filters Filter parameters
     * @param array $columns Valid columns
     * @param string $table Table name
     * @param array $columnMap Column mapping
     * @return \Illuminate\Database\Query\Builder
     */
    protected function applySorting($query, array $filters, array $columns, string $table, array $columnMap = [])
    {
        if (empty($filters['sort'])) {
            return $query->orderBy("{$table}.id", 'asc');
        }
        foreach ($filters['sort'] as $sort) {
            if (!is_array($sort) || !isset($sort['column'], $sort['direction'])) {
                Developer::warning('Invalid sort configuration', [
                    'table' => $table,
                    'sort' => $sort,
                ]);
                continue;
            }
            $column = $sort['column'];
            $order = strtolower(trim($sort['direction']));
            if (!in_array($order, ['asc', 'desc'])) {
                Developer::warning('Invalid sort direction', [
                    'table' => $table,
                    'column' => $column,
                    'direction' => $sort['direction'],
                ]);
                continue;
            }
            $qualifiedColumn = array_key_exists($column, $columnMap) ? $columnMap[$column] : (str_contains($column, '.') ? $column : "{$table}.{$column}");
            $qualifiedColumn = preg_replace('/\s+AS\s+\w+$/i', '', $qualifiedColumn);
            $columnIsValid = collect($columns)->contains(function ($c) use ($qualifiedColumn, $column) {
                return $c === $qualifiedColumn || str_starts_with($c, "{$qualifiedColumn} AS") || str_ends_with($c, "AS {$column}");
            });
            if ($columnIsValid) {
                try {
                    $query->orderBy($qualifiedColumn, $order);
                } catch (Exception $e) {
                    Developer::warning('Failed to apply sorting', [
                        'table' => $table,
                        'column' => $qualifiedColumn,
                        'direction' => $order,
                        'error' => $e->getMessage(),
                    ]);
                }
            } else {
                Developer::warning('Invalid sort column', [
                    'table' => $table,
                    'column' => $qualifiedColumn,
                    'valid_columns' => $columns,
                ]);
            }
        }
        return $query;
    }

    /**
     * Applies pagination to a query.
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param array $filters Filter parameters
     * @param string|null $limit Optional limit
     * @return \Illuminate\Database\Query\Builder
     */
    protected function applyPagination($query, array $filters, ?string $limit): \Illuminate\Database\Query\Builder
    {
        if (!empty($limit) || $limit == 'all') {
            return $query;
        }
        $pagination = $filters['pagination'] ?? ['page' => 1, 'limit' => 10];
        $limit = $pagination['limit'] ?? 10;
        $limit = ($limit === 'all') ? 10000 : max(1, (int)$limit);
        $page = max(1, (int)($pagination['page'] ?? 1));
        $offset = ($page - 1) * $limit;
        try {
            $query = $query->take($limit)->skip($offset);
        } catch (Exception $e) {
            Developer::warning('Failed to apply pagination', [
                'limit' => $limit,
                'page' => $page,
                'offset' => $offset,
                'error' => $e->getMessage(),
            ]);
        }
        return $query;
    }

    // ----------------------------------- Utility Functions -----------------------------------
    /**
     * Prepares data for insertion or update, handling timestamps.
     *
     * @param array $data Input data
     * @param string $table Table name
     * @param array $schemaColumns Table schema columns
     * @param string $system Database system
     * @param Connection $connection Database connection
     * @return array Prepared data
     */
    protected function prepareData(array $data, string $table, array $schemaColumns, string $type): array
    {

        if (in_array('created_at', $schemaColumns) && !isset($data['created_at']) && $type == 'create') {
            $data['created_at'] = now();
        }

        if (in_array('updated_at', $schemaColumns) && !isset($data['updated_at']) && $type == 'update') {
            $data['updated_at'] = now();
        }
        return $data;
    }
    /**
     * Validates columns against the table schema.
     *
     * @param array $columns Columns to validate
     * @param string $table Table name
     * @param Connection $connection Database connection
     * @return array Schema columns
     * @throws InvalidArgumentException
     */
    public function validateColumns(array $columns, string $table, Connection $connection): array
    {
        $schemaColumns = $this->getCachedSchemaColumns($table);
        foreach ($columns as $col) {
            if (!in_array($col, $schemaColumns)) {
                Developer::warning('Invalid column', [
                    'table' => $table,
                    'column' => $col,
                    'schema' => $schemaColumns,
                ]);
                throw new InvalidArgumentException("Invalid column: {$col} in table {$table}");
            }
        }
        return $schemaColumns;
    }

    /**
     * Validates where columns against the table schema.
     *
     * @param array $where Where conditions
     * @param string $table Table name
     * @param Connection $connection Database connection
     * @return array Schema columns
     * @throws InvalidArgumentException
     */
    public function validateWhereColumns(array $where, string $table): array
    {
        $schemaColumns = $this->getCachedSchemaColumns($table);

        foreach (array_keys($where) as $col) {
            // Only validate if column is unqualified (no dot)
            if (!str_contains($col, '.') && !in_array($col, $schemaColumns)) {
                Developer::warning('Invalid where column', [
                    'table' => $table,
                    'column' => $col,
                    'schema' => $schemaColumns,
                ]);
                throw new InvalidArgumentException("Invalid where column: {$col} in table {$table}");
            }
        }

        return $schemaColumns;
    }


    /**
     * Validates a column against the table or joined tables schema.
     *
     * @param string $column Column name
     * @param string $primaryTable Primary table name
     * @param array $joins Join configurations
     * @param Connection $connection Database connection
     * @return bool
     */
    public function validateColumn(string $column, string $primaryTable, array $joins): bool
    {
        $column = preg_replace('/\s+AS\s+\w+$/i', '', $column);
        $qualifiedColumn = str_contains($column, '.') ? $column : "{$primaryTable}.{$column}";

        [$tableName, $colName] = explode('.', $qualifiedColumn) + [1 => null];

        if (!$colName) {
            Developer::warning('Invalid column format', [
                'column' => $column,
                'table' => $primaryTable,
                'joins' => $joins,
            ]);
            return false;
        }

        $allTables = [$primaryTable];
        foreach ($joins as $join) {
            if (isset($join['table'])) {
                $allTables[] = $join['table'];
            }
        }

        if (!in_array($tableName, $allTables)) {
            Developer::warning('Table not found in joins or primary table', [
                'table' => $tableName,
                'primary_table' => $primaryTable,
                'joins' => $joins,
            ]);
            return false;
        }

        // Use schema cache instead of connection
        $columns = $this->getCachedSchemaColumns($tableName);
        $isValid = in_array($colName, $columns);

        if (!$isValid) {
            Developer::warning('Column not found in schema', [
                'table' => $tableName,
                'column' => $colName,
                'available_columns' => $columns,
            ]);
        }

        return $isValid;
    }

    /**
     * Validates and prepares columns for a query.
     *
     * @param array|string $columns Columns to validate
     * @param string $table Table name
     * @param array $joins Join configurations
     * @param Connection $connection Database connection
     * @param array &$columnMap Column mapping
     * @return array Valid columns
     */
    public function validateAndPrepareColumns($columns, string $table, array $joins, array &$columnMap = []): array
    {
        $validColumns = [];

        if (is_array($columns) && !in_array('*', $columns)) {
            foreach ($columns as $alias => $colDef) {
                $colName = is_array($colDef) ? $colDef[0] : $colDef;
                $actualColumn = preg_replace('/\s+AS\s+\w+$/i', '', $colName);

                if ($this->validateColumn($actualColumn, $table, $joins)) {
                    $validColumns[] = $colName . (is_string($alias) ? " AS {$alias}" : '');
                    $columnMap[is_string($alias) ? $alias : $actualColumn] = $actualColumn;
                } else {
                    Developer::warning('Skipping invalid column', [
                        'table' => $table,
                        'column' => $colName,
                        'alias' => $alias,
                    ]);
                }
            }
        } else {
            $validColumns = ['*'];
            $schemaColumns = $this->getCachedSchemaColumns($table);

            foreach ($schemaColumns as $col) {
                $columnMap[$col] = "{$table}.{$col}";
            }

            foreach ($joins as $join) {
                if (isset($join['table'])) {
                    $joinColumns = $this->getCachedSchemaColumns($join['table']);
                    foreach ($joinColumns as $col) {
                        $columnMap["{$join['table']}.{$col}"] = "{$join['table']}.{$col}";
                    }
                }
            }
        }

        return $validColumns;
    }



    /**
     * Validates group by columns.
     *
     * @param array $groupBy Group by columns
     * @param string $table Table name
     * @param array $joins Join configurations
     * @param Connection $connection Database connection
     * @return array Validated group by columns
     */
    public function validateGroupBy(array $groupBy, string $table, array $joins): array
    {
        $validGroupBy = [];

        foreach ($groupBy as $column) {
            $qualifiedColumn = str_contains($column, '.') ? $column : "{$table}.{$column}";
            $qualifiedColumn = preg_replace('/\s+AS\s+\w+$/i', '', $qualifiedColumn);

            if ($this->validateColumn($qualifiedColumn, $table, $joins)) {
                $validGroupBy[] = $qualifiedColumn;
            } else {
                Developer::warning('Invalid groupBy column', [
                    'table' => $table,
                    'column' => $qualifiedColumn,
                ]);
            }
        }

        return $validGroupBy;
    }


    // ----------------------------------- Utility Functions -----------------------------------
    /**
     * Formats a standardized JSON response.
     *
     * @param bool $status Status of operation
     * @param array $data Response data
     * @param string $message Response message
     * @return array
     */
    public function formatResponse(bool $status, array $data, string $message): array
    {
        return [
            'status' => $status,
            'data' => $data,
            'message' => $message
        ];
    }

    /**
     * Dispatches events for skeleton or table operations.
     *
     * @param string $system Database system
     * @param string $table Table name
     * @param string $operation Operation type
     * @param array $where Where conditions
     * @param array $prevRecord Previous record data
     * @param string $tokenKey Token key for event
     * @return void
     */
    public function dispatchEvent(string $system, string $table, string $operation, array $where, array $prevRecord, string $tokenKey): void
    {
        try {
            // if (in_array($table, self::SKELETON_TABLES)) {
            //     \Illuminate\Support\Facades\Queue::push(new SkeletonEvent($system, $table, $operation, $where, $prevRecord, $tokenKey));
            // } else {
            //     \Illuminate\Support\Facades\Queue::push(new TableEvent($tokenKey));
            // }
        } catch (Exception $e) {
            Developer::warning('Failed to dispatch event', [
                'system' => $system,
                'table' => $table,
                'operation' => $operation,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Logs a query for debugging.
     *
     * @param string $system Database system
     * @param string $table Table name
     * @param string $sql SQL query
     * @param array $bindings Query bindings
     * @return void
     */
    public function logQuery(string $system, string $table, string $sql, array $bindings): void
    {
        try {
            Developer::query('Generated SQL Query', [
                'system' => $system,
                'table' => $table,
                'query' => $this->formatQuery($sql, $bindings),
                'bindings' => $bindings,
            ]);
        } catch (Exception $e) {
            Developer::warning('Failed to log query', [
                'system' => $system,
                'table' => $table,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Formats a query for logging.
     *
     * @param string $sql SQL query
     * @param array $bindings Query bindings
     * @return string Formatted query
     */
    protected function formatQuery(string $sql, array $bindings): string
    {
        try {
            return vsprintf(str_replace('?', '%s', $sql), array_map(fn($value) => is_string($value) ? "'$value'" : $value, $bindings));
        } catch (Exception $e) {
            Developer::warning('Failed to format query', [
                'sql' => $sql,
                'bindings' => $bindings,
                'error' => $e->getMessage(),
            ]);
            return $sql;
        }
    }

    /**
     * Applies custom modifications to a record column.
     *
     * @param \stdClass $row Record data
     * @param array $modification Modification parameters
     * @return mixed Modified value
     */
    protected function applyCustomModification(\stdClass $row, array $modification)
    {
        if (!isset($modification['view'])) {
            return $row->{str_replace('.', '_', $modification['column'])} ?? null;
        }
        $view = $modification['view'];
        $renderHtml = $modification['renderHtml'] ?? false;
        if (preg_match('/::\((.*?)\s*~\s*(.*?)\s*\|\|.*?\)::/', $view, $matches)) {
            $condition = $matches[1];
            $trueValue = $matches[2];
            // Handle SQL LIKE syntax
            $condition = preg_replace_callback(
                '/(\w+)\s+LIKE\s+%([^%]+)%/i',
                function ($matches) {
                    $column = $matches[1];
                    $search = $matches[2];
                    return "\\Illuminate\\Support\\Str::contains(strtolower(\${$column}), '" . strtolower($search) . "')";
                },
                $condition
            );
            preg_match_all('/(\w+)/', $condition, $colMatches);
            $evalCondition = $condition;
            foreach ($colMatches[1] as $col) {
                $colKey = str_replace('.', '_', $col);
                if (!property_exists($row, $colKey)) {
                    Developer::warning('Column missing in row for condition', [
                        'column' => $col,
                        'colKey' => $colKey,
                        'condition' => $condition,
                        'validColumns' => array_keys((array)$row),
                    ]);
                    return $row->{str_replace('.', '_', $modification['column'])} ?? null;
                }
                $value = $row->$colKey;
                $evalCondition = str_replace($col, var_export($value, true), $evalCondition);
            }
            try {
                $result = eval("return $evalCondition;");
                return $renderHtml && $result ? $trueValue : ($result ? 1 : 0);
            } catch (Exception $e) {
                Developer::warning('Failed to evaluate custom modification', [
                    'column' => $modification['column'],
                    'condition' => $condition,
                    'error' => $e->getMessage(),
                ]);
                return $row->{str_replace('.', '_', $modification['column'])} ?? null;
            }
        }
        return $renderHtml ? $view : ($row->{str_replace('.', '_', $modification['column'])} ?? null);
    }

    /**
     * Applies soft delete filters to a query.
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param array $schemaColumns Table schema columns
     * @param array $params Query parameters
     * @param string $table Table name
     * @return void
     */
    protected function applySoftDeleteFilters($query, array $schemaColumns, array $params, string $table): void
    {
        if (in_array('deleted_at', $schemaColumns) && !isset($params['where']["{$table}.deleted_at"])) {
            $query->whereNull("{$table}.deleted_at");
        }
        if (in_array('deleted_on', $schemaColumns) && !isset($params['where']["{$table}.deleted_on"])) {
            $query->whereNull("{$table}.deleted_on");
        }
    }


    /**
     * Gets database connection without caching.
     *
     * @param string $system Database system
     * @return Connection
     */
    public function getConnection(string $system): Connection
    {
        try {
            return Database::getConnection($system);
        } catch (Exception $e) {
            Developer::error('Failed to get database connection', [
                'system' => $system,
                'error' => $e->getMessage(),
            ]);
            throw new InvalidArgumentException("Failed to connect to database system: {$system}");
        }
    }

    /**
     * Gets cached schema columns.
     *
     * @param string $table Table name
     * @param Connection $connection Database connection
     * @return array
     */
    public static function getCachedSchemaColumns(string $table): array
    {
        return Cache::remember("schema_{$table}", self::CACHE_TTL, function () use ($table) {
            try {
                // Extract database and table name
                if (str_contains($table, '.')) {
                    [$db, $tableName] = explode('.', $table, 2);
                } else {
                    $db = DB::getDatabaseName(); // default DB
                    $tableName = $table;
                }
                // Fetch columns from information_schema
                $columns = DB::select("
                    SELECT COLUMN_NAME
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = ?
                    AND TABLE_NAME = ?
                ", [$db, $tableName]);

                return array_map(fn($col) => $col->COLUMN_NAME, $columns);
            } catch (Exception $e) {
                Developer::warning('Failed to fetch schema columns', [
                    'table' => $table,
                    'error' => $e->getMessage(),
                ]);
                return [];
            }
        });
    }


    /**
     * Clears table-related cache.
     *
     * @param string $table Table name
     * @return void
     */
    protected function clearTableCache(string $table): void
    {
        try {
            Cache::forget("schema_{$table}");
            Cache::forget("table_exists_*_{$table}");
            Cache::forget("column_exists_{$table}_*");
            Developer::info('Cleared table cache', ['table' => $table]);
        } catch (Exception $e) {
            Developer::warning('Failed to clear table cache', [
                'table' => $table,
                'error' => $e->getMessage(),
            ]);
        }
    }

    // ----------------------------------- Error Handling Functions -----------------------------------
    /**
     * Handles QueryException errors.
     *
     * @param QueryException $e
     * @param string $system
     * @param string $table
     * @param string $message
     * @param array $data
     * @return array
     */
    protected function handleError(QueryException $e, string $system, string $table, string $message, array $data = []): array
    {
        $errorMessage = $this->handleQueryException($e, $system, $table);
        Developer::error($message, [
            'system' => $system,
            'table' => $table,
            'error' => $e->getMessage(),
            'data' => $data,
            'trace' => $e->getTraceAsString(),
        ]);
        return $this->formatResponse(false, [], $errorMessage);
    }

    /**
     * Handles InvalidArgumentException errors.
     *
     * @param InvalidArgumentException $e
     * @param string $system
     * @param string $table
     * @param array $data
     * @return array
     */
    protected function handleInvalidArgumentException(InvalidArgumentException $e, string $system, string $table, array $data = []): array
    {
        Developer::warning('Invalid argument in data operation', [
            'system' => $system,
            'table' => $table,
            'error' => $e->getMessage(),
            'data' => $data,
        ]);
        return $this->formatResponse(false, [], $e->getMessage());
    }

    /**
     * Handles unexpected errors.
     *
     * @param Exception $e
     * @param string $system
     * @param string $table
     * @param string $operation
     * @param array $data
     * @return array
     */
    protected function handleUnexpectedError(Exception $e, string $system, string $table, string $operation, array $data = []): array
    {
        $message = "Unexpected error in {$operation} operation";
        Developer::error($message, [
            'system' => $system,
            'table' => $table,
            'error' => $e->getMessage(),
            'data' => $data,
            'trace' => $e->getTraceAsString(),
        ]);
        return $this->formatResponse(false, [], $message);
    }

    /**
     * Handles filter errors for QueryException.
     *
     * @param QueryException $e
     * @param string $system
     * @param string $table
     * @param int $draw
     * @return array
     */
    protected function handleFilterError(QueryException $e, string $system, string $table, int $draw): array
    {
        $errorMessage = $this->handleQueryException($e, $system, $table);
        Developer::error('Filter records failed', [
            'system' => $system,
            'table' => $table,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
        return [
            'status' => false,
            'message' => $errorMessage,
            'draw' => $draw,
            'data' => [],
            'recordsTotal' => 0,
            'recordsFiltered' => 0,
        ];
    }

    /**
     * Handles filter errors for InvalidArgumentException.
     *
     * @param InvalidArgumentException $e
     * @param string $system
     * @param string $table
     * @param int $draw
     * @return array
     */
    protected function handleFilterInvalidArgument(InvalidArgumentException $e, string $system, string $table, int $draw): array
    {
        Developer::warning('Invalid argument in filter', [
            'system' => $system,
            'table' => $table,
            'error' => $e->getMessage(),
        ]);
        return [
            'status' => false,
            'message' => $e->getMessage(),
            'draw' => $draw,
            'data' => [],
            'recordsTotal' => 0,
            'recordsFiltered' => 0,
        ];
    }

    /**
     * Handles unexpected filter errors.
     *
     * @param Exception $e
     * @param string $system
     * @param string $table
     * @param int $draw
     * @return array
     */
    protected function handleFilterUnexpectedError(Exception $e, string $system, string $table, int $draw): array
    {
        Developer::error('Unexpected error in filter', [
            'system' => $system,
            'table' => $table,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
        return [
            'status' => false,
            'message' => 'Unexpected error filtering records',
            'draw' => $draw,
            'data' => [],
            'recordsTotal' => 0,
            'recordsFiltered' => 0,
        ];
    }

    /**
     * @param string $tableName The table name (with optional database prefix, e.g., 'database.table').
     * @param array $exclude Optional list of column names to exclude.
     * @param array $aliases Optional associative array of column aliases. Format: ['column_name' => 'alias_name'].
     * @return array Associative array of formatted column definitions.
     * @throws Exception If the table does not exist, has no columns, or a database error occurs.
     */
    public function getTableColumns($tableName, array $exclude = [], array $aliases = [])
    {
        try {
            if (Str::contains($tableName, '.')) {
                [$dbName, $pureTable] = explode('.', $tableName, 2);
            } else {
                $dbName = DB::getDatabaseName();
                $pureTable = $tableName;
            }

            $columns = DB::table('information_schema.columns')
                ->select('COLUMN_NAME')
                ->where('TABLE_SCHEMA', $dbName)
                ->where('TABLE_NAME', $pureTable)
                ->pluck('COLUMN_NAME')
                ->toArray();

            if (empty($columns)) {
                throw new Exception("Table `{$dbName}.{$pureTable}` does not exist or has no columns.");
            }

            $result = [];

            foreach ($columns as $col) {
                $alias = $aliases[$col] ?? null;
                $key = $alias ?: Str::snake($col);

                if (in_array($col, $exclude)) {
                    // Excluded but still added with false flag
                    $result[$key] = ["{$pureTable}.{$col}", false];
                    continue;
                }

                if ($alias === false) {
                    // Explicit alias=false: same as exclude but preserved
                    $result[$key] = ["{$pureTable}.{$col}", false];
                    continue;
                }

                if ($alias) {
                    $result[$key] = ["{$pureTable}.{$col} AS {$alias}", true];
                } else {
                    $result[$key] = ["{$pureTable}.{$col}", true];
                }
            }
            return $result;
        } catch (Exception $e) {
            Developer::error("Error getting columns for table `{$tableName}`: " . $e->getMessage());
            throw $e;
        }
    }



    /**
     * Parses QueryException to provide specific error messages.
     *
     * @param QueryException $e
     * @param string $system
     * @param string $table
     * @return string
     */
    protected function handleQueryException(QueryException $e, string $system, string $table): string
    {
        $errorCode = $e->getCode();
        switch ($errorCode) {
            case '23000':
                if (preg_match("/Duplicate entry '(.+?)' for key/", $e->getMessage(), $matches)) {
                    return "Duplicate entry '{$matches[1]}' in {$table}. Record already exists.";
                }
                if (preg_match("/Column '(.+?)' in where clause is ambiguous/", $e->getMessage(), $matches)) {
                    return "Ambiguous column '{$matches[1]}' in {$table}. Specify table name.";
                }
                return "Constraint violation in {$table}. Check unique or foreign key constraints.";
            case '42S22':
                return "Unknown column in {$table}. Verify column names.";
            case '42S02':
                return "Table {$table} does not exist in system {$system}.";
            case '1054':
                return "Unknown column in {$table}. Check schema or join configuration.";
            case '1066':
                return "Ambiguous column in {$table}. Specify table name in joins or where clauses.";
            default:
                return "Database error in {$table}: {$e->getMessage()}";
        }
    }
}
