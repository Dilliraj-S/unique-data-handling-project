<?php

namespace App\Http\Helpers;

use App\Facades\{Data, Developer};
use InvalidArgumentException;

/**
 * Helper class for generating card data parameters and responses.
 */
class CardHelper
{
    /**
     * Generates query parameters for card data retrieval.
     *
     * @param array $columns Column definitions
     * @param array $joins Join clauses
     * @param array $conditions Additional conditions
     * @param array $reqSet Request settings including filters
     * @param string $system System identifier (default: 'central')
     * @return array Query parameters
     */
    public static function generateParams(array $columns, array $joins, array $conditions, array $reqSet, string $system = 'central'): array
    {
        if (empty($reqSet['table'])) {
            throw new InvalidArgumentException('Table name is required in request settings');
        }
        $table = $reqSet['table'];
        $filters = $reqSet['filters'] ?? [];
        $search = is_array($filters['search']) ? $filters['search'] : ['value' => $filters['search'] ?? ''];
        $dateRange = $filters['dateRange'] ?? [];
        $sortRules = $filters['sort'] ?? [];
        $pagination = $filters['pagination'] ?? ['page' => 1, 'limit' => 12];

        try {
            Data::validateTable($system, $table);
        } catch (InvalidArgumentException $e) {
            Developer::warning('Invalid table in generateParams', [
                'system' => $system,
                'table' => $table,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        // Validate join columns
        $validJoins = [];
        $connection = Data::getConnection($system);
        foreach ($joins as $join) {
            if (!isset($join['type'], $join['table'], $join['on']) || !is_array($join['on']) || count($join['on']) !== 2) {
                Developer::warning('Invalid join configuration', [
                    'system' => $system,
                    'table' => $table,
                    'join' => $join,
                ]);
                continue;
            }
            [$leftCol, $rightCol] = $join['on'];
            if (
                Data::validateColumn($leftCol, $table, $joins, $connection) &&
                Data::validateColumn($rightCol, $join['table'], $joins, $connection)
            ) {
                $validJoins[] = $join;
            } else {
                Developer::warning('Invalid join columns', [
                    'system' => $system,
                    'table' => $table,
                    'join' => $join,
                    'left_col' => $leftCol,
                    'right_col' => $rightCol,
                ]);
            }
        }

        // Validate columns
        $mappedColumns = [];
        foreach ($columns as $alias => $dbColumn) {
            if (Data::validateColumn($dbColumn, $table, $validJoins, $connection)) {
                $mappedColumns[$alias] = $dbColumn;
            } else {
                Developer::warning('Invalid column in generateParams', [
                    'alias' => $alias,
                    'dbColumn' => $dbColumn,
                    'system' => $system,
                    'table' => $table,
                ]);
            }
        }

        // Build where clause
        $where = [];
        foreach ($conditions as $condition) {
            if (isset($condition['column'], $condition['value'])) {
                $column = $condition['column'];
                if (Data::validateColumn($column, $table, $validJoins, $connection)) {
                    $operator = $condition['operator'] ?? '=';
                    $where[$column] = ['operator' => $operator, 'value' => $condition['value']];
                } else {
                    Developer::warning('Invalid where column in generateParams', [
                        'column' => $column,
                        'system' => $system,
                        'table' => $table,
                    ]);
                }
            } elseif (is_array($condition) && isset($condition['condition'])) {
                $where[] = $condition;
            }
        }

        // Map sort rules
        $sort = [];
        foreach ($sortRules as $column => $direction) {
            if (Data::validateColumn($column, $table, $validJoins, $connection)) {
                $sort[] = [
                    'column' => $column,
                    'direction' => $direction
                ];
            } else {
                Developer::warning('Invalid sort column in generateParams', [
                    'column' => $column,
                    'direction' => $direction,
                    'system' => $system,
                    'table' => $table,
                ]);
            }
        }

        // Build date range filter
        $dateFilter = [];
        if (!empty($dateRange['created_at']) && isset($dateRange['created_at']['from'], $dateRange['created_at']['to'])) {
            if (Data::validateColumn('created_at', $table, $validJoins, $connection)) {
                $dateFilter = [
                    'column' => 'created_at',
                    'from' => $dateRange['created_at']['from'],
                    'to' => $dateRange['created_at']['to']
                ];
            } else {
                Developer::warning('Invalid date range column in generateParams', [
                    'column' => 'created_at',
                    'system' => $system,
                    'table' => $table,
                ]);
            }
        }

        $params = [
            'columns' => $mappedColumns,
            'joins' => $validJoins,
            'custom' => $reqSet['custom'] ?? [],
            'filters' => [
                'where' => $where,
                'search' => $search,
                'dateRange' => $dateFilter,
                'sort' => $sort,
                'pagination' => [
                    'page' => max(1, (int) ($pagination['page'] ?? 1)),
                    'limit' => max(1, (int) ($pagination['limit'] ?? 12)),
                ],
            ],
            'draw' => (int) ($reqSet['draw'] ?? 1),
        ];

        return $params;
    }

    /**
     * Generates JSON response for card data.
     *
     * @param array $result Data query result
     * @param array $columns Column definitions
     * @param array $custom Custom rendering rules
     * @param array $reqSet Request settings
     * @param string $view Card HTML template
     * @return array Response data
     */
    public static function generateResponse(array $result, array $columns, array $custom, array $reqSet, string $view): array
    {
        $data = [];
        foreach ($result['data'] as $row) {
            $card = $view;
            // Replace ::skeletonToken:: with resolved token
            $card = str_replace('::skeletonToken::', $reqSet['token'] ?? '', $card);
            // Replace column placeholders
            foreach ($row as $key => $value) {
                $card = str_replace("::$key::", $value ?? '', $card);
            }
            // Apply custom rules
            foreach ($custom as $rule) {
                if ($rule['type'] === 'modify' && isset($rule['column'], $rule['view'])) {
                    $parsed = self::parseCustomView($rule['view'], $row, array_keys($columns));
                    $card = str_replace("::$rule[column]::", $parsed, $card);
                }
            }
            $data[] = $card;
        }

        return [
            'status' => true,
            'data' => $data,
            'recordsTotal' => $result['recordsTotal'] ?? 0,
            'recordsFiltered' => $result['recordsFiltered'] ?? 0,
            'columns' => array_map(fn($key) => [
                'data' => $key,
                'title' => ucfirst(str_replace('_', ' ', $key)),
                'searchable' => true,
                'orderable' => true,
                'renderHtml' => in_array($key, array_column($custom, 'column'))
            ], array_keys($columns)),
            'draw' => $reqSet['draw']
        ];
    }

    /**
     * Evaluates a condition string against a data row.
     *
     * @param string $condition The condition to evaluate
     * @param array $row Data row
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
     * Parses custom view expressions for ternary operations.
     * Supports conditions like ::(condition ~ trueValue || falseValue)::.
     *
     * @param string $view Custom view expression
     * @param array $row Data row
     * @param array $validColumns Valid column names
     * @return string Parsed result
     */
    private static function parseCustomView(string $view, array $row, array $validColumns): string
    {
        if (!preg_match('/::\((.+?) ~ (.+?) \|\| (.+?)\)::/', $view, $matches)) {
            Developer::warning('Invalid custom view format', ['view' => $view]);
            return '';
        }

        $condition = $matches[1];
        $trueValue = $matches[2];
        $falseValue = $matches[3];

        // Replace column placeholders in trueValue and falseValue
        $trueValue = self::replaceColumnPlaceholders($trueValue, $row, $validColumns);
        $falseValue = self::replaceColumnPlaceholders($falseValue, $row, $validColumns);

        // Evaluate the condition using evaluateCondition
        $result = self::evaluateCondition($condition, $row, $validColumns);

        return $result ? $trueValue : $falseValue;
    }

    /**
     * Replaces column placeholders in a string with their corresponding row values.
     *
     * @param string $string String containing column placeholders (e.g., ::column::)
     * @param array $row Data row
     * @param array $validColumns Valid column names
     * @return string String with placeholders replaced
     */
    private static function replaceColumnPlaceholders(string $string, array $row, array $validColumns): string
    {
        return preg_replace_callback(
            '/::([\w\.]+)::/',
            function ($matches) use ($row, $validColumns) {
                $column = $matches[1];
                $colKey = str_replace('.', '_', $column);
                if (in_array($column, $validColumns) && isset($row[$colKey])) {
                    return $row[$colKey] ?? '';
                }
                Developer::warning('Invalid column in placeholder replacement', [
                    'column' => $column,
                    'colKey' => $colKey,
                    'validColumns' => $validColumns
                ]);
                return '';
            },
            $string
        );
    }
}
