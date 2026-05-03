<?php

namespace App\Services;

use App\Facades\{Developer, Skeleton};
use Exception;
use Illuminate\Support\Facades\{Config, DB};
use Illuminate\Database\Connection;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use SplFileObject;
use InvalidArgumentException;
use Illuminate\Database\QueryException;




/**
 * Service for managing dynamic database connections.
 */
class CrudService
{

    /**
     * Create a new database connection dynamically.
     *
     * @param string $database The name of the database to connect to.
     */
    public static function createDatabase($databaseName)
    {
        try {
            // Sanitize the database name to avoid SQL injection
            $databaseName = trim($databaseName);
            if (empty($databaseName)) {
                return ['status' => false, 'message' => "Database name cannot be empty."];
            }

            if (!preg_match('/^[a-zA-Z0-9_]+$/', $databaseName)) {
                return ['status' => false, 'message' => "Invalid database name. Only letters, numbers, and underscores are allowed."];
            }

            Log::info("🛠️ Attempting to create database: $databaseName");

            // Check if the database already exists
            $dbExists = DB::select("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", [$databaseName]);
            if (!empty($dbExists)) {
                return ['status' => false, 'message' => "Database '$databaseName' already exists."];
            }

            // Create the database
            DB::statement("CREATE DATABASE `$databaseName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

            Log::info("✅ Database '$databaseName' created successfully.");

            return [
                'status'  => true,
                'message' => "Database '$databaseName' has been created successfully.",
            ];
        } catch (Exception $e) {
            Log::error("❌ Failed to create database '$databaseName'", ['error' => $e->getMessage()]);
            return [
                'status'  => false,
                'message' => 'Error: ' . $e->getMessage(),
            ];
        }
    }

    /**------------------------------------------------------------------------------------------------------*/




    /**--------------------------------------!!! For Update !!! -----------------------------------------*/

    public static function updateField($database, $table, $column, $matchValues, $updateValues, $function = null)
    {
        try {
            // Normalize input (in case this method is called directly with comma-separated strings)
            if (!is_array($matchValues)) {
                $matchValues = array_map('trim', preg_split('/[\r\n,]+/', $matchValues, -1, PREG_SPLIT_NO_EMPTY));
            }

            if (!is_array($updateValues)) {
                $updateValues = array_map('trim', preg_split('/[\r\n,]+/', $updateValues, -1, PREG_SPLIT_NO_EMPTY));
            }

            Log::info('🔄 Starting batch update process.', [
                'database'     => $database,
                'table'        => $table,
                'column'       => $column,
                'matchValues'  => $matchValues,
                'updateValues' => $updateValues,
                'function'     => $function,
            ]);

            // ✅ Validate database and table
            $dbExists = DB::select("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", [$database]);
            if (empty($dbExists)) {
                return ['status' => false, 'message' => "Database '$database' does not exist."];
            }

            $tableExists = DB::select("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?", [$database, $table]);
            if (empty($tableExists)) {
                return ['status' => false, 'message' => "Table '$table' does not exist in database '$database'."];
            }

            if (count($matchValues) !== count($updateValues)) {
                return ['status' => false, 'message' => "matchValues and updateValues must be the same length."];
            }

            $totalUpdated = 0;
            $messages = [];

            foreach ($matchValues as $index => $matchValue) {
                $newValue = $updateValues[$index];

                // Handle function transformation
                switch (strtoupper($function)) {
                    case 'LOWER':
                    case 'UPPER':
                    case 'LTRIM':
                    case 'RTRIM':
                    case 'TRIM':
                        $transformedValue = "$function(?)";
                        break;
                    default:
                        $transformedValue = "?";
                }

                // Count matches
                $countQuery = "SELECT COUNT(*) AS total FROM `$database`.`$table` WHERE `$column` = ?";
                $matchedRows = DB::select($countQuery, [$matchValue]);
                $foundCount = $matchedRows[0]->total ?? 0;

                // Perform update
                $updateQuery = "UPDATE `$database`.`$table` SET `$column` = $transformedValue WHERE `$column` = ?";
                $updatedCount = DB::update($updateQuery, [$newValue, $matchValue]);

                $messages[] = "Match: \"$matchValue\" → Update: \"$newValue\" — Found: $foundCount, Updated: $updatedCount";
                $totalUpdated += $updatedCount;
            }

            Log::info("✅ Batch update done", [
                'database' => $database,
                'table'    => $table,
                'column'   => $column,
                'updates'  => $messages,
            ]);

            return [
                'title'  => 'Batch Update Successful',
                'status'  => true,
                'message' => implode("<br>", $messages) . "<br>Total updated: $totalUpdated",
            ];
        } catch (Exception $e) {
            Log::error('❌ Batch update failed', ['error' => $e->getMessage()]);
            return [
                'status'  => false,
                'message' => 'Error: ' . $e->getMessage(),
            ];
        }
    }

    public function updateFieldCSV(
        string $mode,
        $csv_file = null,
        $match_columns = null,
        $update_columns = null,
        $src_match_cols = null,
        $src_update_cols = null,
        ?string $source_database = null,
        ?string $source_table = null,
        string $target_database,
        string $target_table,
        $to_columns
    ): array {
        try {
            Log::info('🔄 Starting update process', compact(
                'mode',
                'target_database',
                'target_table',
                'match_columns',
                'update_columns',
                'src_match_cols',
                'src_update_cols',
                'source_database',
                'source_table',
                'to_columns'
            ));

            // Normalize inputs
            $match_columns   = is_string($match_columns) ? array_map('trim', explode(',', $match_columns)) : (array)$match_columns;
            $update_columns  = is_string($update_columns) ? array_map('trim', explode(',', $update_columns)) : (array)$update_columns;
            $src_match_cols  = is_string($src_match_cols) ? array_map('trim', explode(',', $src_match_cols)) : (array)$src_match_cols;
            $src_update_cols = is_string($src_update_cols) ? array_map('trim', explode(',', $src_update_cols)) : (array)$src_update_cols;
            $to_columns      = is_string($to_columns) ? array_map('trim', explode(',', $to_columns)) : (array)$to_columns;

            Log::info('✅ Inputs normalized', compact(
                'match_columns',
                'update_columns',
                'src_match_cols',
                'src_update_cols',
                'to_columns'
            ));

            $srcMatchCols  = $mode === 'csv' ? $match_columns : $src_match_cols;
            $srcUpdateCols = $mode === 'csv' ? $update_columns : $src_update_cols;

            $batch = [];

            if ($mode === 'csv') {
                Log::info('📂 Processing CSV data');

                $fileName = "update_csv_" . now()->format('Ymd_His') . ".csv";
                $csvStorageDir = public_path('crud/csv');

                if (!file_exists($csvStorageDir)) {
                    mkdir($csvStorageDir, 0755, true);
                    Log::info('📂 Created CSV storage directory', ['path' => $csvStorageDir]);
                }

                $filePath = "crud/csv/{$fileName}";
                $csv_file->move($csvStorageDir, $fileName);
                Log::info('📥 CSV file uploaded', ['file_path' => $filePath]);

                $file = new SplFileObject(public_path($filePath), 'r');
                $file->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY);

                $headers = $file->fgetcsv();
                if (empty($headers)) {
                    throw new Exception('CSV file appears to be empty or missing headers.');
                }

                $matchIndexes  = array_map(fn($col) => array_search($col, $headers), $srcMatchCols);
                $updateIndexes = array_map(fn($col) => array_search($col, $headers), $srcUpdateCols);

                if (in_array(false, $matchIndexes, true)) {
                    throw new Exception('Some match columns were not found in CSV headers.');
                }
                if (in_array(false, $updateIndexes, true)) {
                    throw new Exception('Some update columns were not found in CSV headers.');
                }

                while (!$file->eof() && ($row = $file->fgetcsv())) {
                    if (!$row || $row === [null]) continue;

                    $matchValues  = array_map(fn($idx) => $row[$idx] ?? null, $matchIndexes);
                    $updateValues = array_map(fn($idx) => $row[$idx] ?? null, $updateIndexes);

                    if (!empty(array_filter($matchValues))) {
                        $batch[] = [
                            'match_values' => $matchValues,
                            'update_values' => $updateValues,
                        ];
                    }
                }

                if (empty($batch)) {
                    throw new Exception('No valid rows with match values found in CSV.');
                }

                Log::info('✅ Parsed CSV data', ['batch_size' => count($batch)]);
            } else {
                Log::info('🌐 Querying source DB');

                $sourceColumns = array_unique(array_merge($srcMatchCols, $srcUpdateCols));
                $dbRows = DB::select("SELECT `" . implode('`, `', $sourceColumns) . "` FROM `$source_database`.`$source_table`");

                foreach ($dbRows as $row) {
                    $matchValues  = array_map(fn($col) => $row->$col ?? null, $srcMatchCols);
                    $updateValues = array_map(fn($col) => $row->$col ?? null, $srcUpdateCols);

                    if (!empty(array_filter($matchValues))) {
                        $batch[] = [
                            'match_values' => $matchValues,
                            'update_values' => $updateValues,
                        ];
                    }
                }

                if (empty($batch)) {
                    throw new Exception('No valid data found in source table.');
                }

                Log::info('✅ Source DB data loaded', ['batch_size' => count($batch)]);
            }

            if (count($to_columns) !== count($srcUpdateCols)) {
                throw new Exception("Mismatch: expected " . count($srcUpdateCols) . " target columns, got " . count($to_columns));
            }

            // Optional: Match count preview
            $foundCount = null;
            if (count($srcMatchCols) === 1) {
                $matchValues = array_map(fn($row) => $row['match_values'][0], $batch);
                $placeholders = implode(',', array_fill(0, count($matchValues), '?'));
                $matchColumn = $srcMatchCols[0];

                $foundCount = DB::selectOne("
            SELECT COUNT(*) AS total 
            FROM `$target_database`.`$target_table` 
            WHERE `$matchColumn` IN ($placeholders)
        ", $matchValues)->total ?? 0;

                Log::info('🔍 Match count complete', ['found_count' => $foundCount]);
            } else {
                Log::info('⚠️ Skipping match count preview (multi-column match)', ['columns' => $srcMatchCols]);
            }

            // Perform updates
            $updatedCount = 0;
            foreach (array_chunk($batch, 1000) as $chunk) {
                foreach ($chunk as $row) {
                    $setClause = implode(', ', array_map(
                        fn($srcCol, $i) => "`{$to_columns[$i]}` = ?",
                        $srcUpdateCols,
                        array_keys($srcUpdateCols)
                    ));

                    $whereClause = implode(' AND ', array_map(
                        fn($srcCol) => "`$srcCol` = ?",
                        $srcMatchCols
                    ));

                    $params = array_merge($row['update_values'], $row['match_values']);

                    $updatedCount += DB::update("
                UPDATE `$target_database`.`$target_table` 
                SET $setClause 
                WHERE $whereClause
            ", $params);
                }
            }

            Log::info('✅ Updates complete', [
                'updated_count' => $updatedCount,
                'target_table' => "$target_database.$target_table"
            ]);

            $message = $foundCount !== null
                ? "Found $foundCount record" . ($foundCount !== 1 ? 's' : '') . " matching target."
                : "Skipped match count preview (multiple match columns).";

            $message .= $updatedCount > 0
                ? "<br>Updated $updatedCount record" . ($updatedCount !== 1 ? 's' : '') . " in <code>$target_database.$target_table</code>"
                : "<br>No records updated in <code>$target_database.$target_table</code>";

            return [
                'status' => 'success',
                'message' => $message,
                'found_count' => $foundCount,
                'updated_count' => $updatedCount,
            ];
        } catch (Exception $e) {
            Log::error('❌ Exception during updateFieldCSV', [
                'error' => $e->getMessage(),
                'mode' => $mode,
                'target_database' => $target_database,
                'target_table' => $target_table,
            ]);

            return [
                'status' => 'error',
                'message' => 'Error: ' . $e->getMessage(),
                'code' => 500,
            ];
        } catch (Exception $e) {
            Log::error('❌ Exception during updateFieldCSV', [
                'error' => $e->getMessage(),
                'mode' => $mode,
                'target_database' => $target_database,
                'target_table' => $target_table
            ]);

            return [
                'status' => 'error',
                'message' => 'Error: ' . $e->getMessage(),
                'code' => 500,
            ];
        } catch (Exception $e) {
            Log::error('❌ Exception during updateFieldCSV', [
                'error' => $e->getMessage(),
                'mode' => $mode,
                'target_database' => $target_database,
                'target_table' => $target_table
            ]);

            return [
                'status' => 'error',
                'message' => 'Error: ' . $e->getMessage(),
                'code' => 500,
            ];
        }
    }


    /** -------------------------------F!!! For Delete !!!----------------------------------------- */

    public static function deleteRecords(string $deleteType, array $criteria): array
    {
        try {
            if (!in_array($deleteType, ['by_value', 'by_duplicates', 'by_select'])) {
                throw new InvalidArgumentException('Invalid delete type');
            }

            Log::info("🟠 [{$deleteType}] Processing deletion...", $criteria);

            $affectedRecords = 0;
            $message = '';

            switch ($deleteType) {
                case 'by_value':
                    if (
                        empty($criteria['database1']) || empty($criteria['table1']) ||
                        empty($criteria['columns1']) || empty($criteria['matchValue'])
                    ) {
                        throw new InvalidArgumentException('Missing required criteria for delete by value');
                    }

                    $matchValues = array_map('trim', explode('|', $criteria['matchValue']));
                    $query = DB::table("{$criteria['database1']}.{$criteria['table1']}")
                        ->where(function ($q) use ($criteria, $matchValues) {
                            foreach ($criteria['columns1'] as $column) {
                                foreach ($matchValues as $value) {
                                    $q->orWhere($column, '=', $value);
                                }
                            }
                        });
                    $affectedRecords = $query->delete();
                    $message = "Found {$affectedRecords} records! Are you sure you want to proceed? If yes, then deleted.";
                    break;

                case 'by_duplicates':
                    if (
                        empty($criteria['database1']) || empty($criteria['table1']) ||
                        empty($criteria['baseColumns']) || empty($criteria['deleteValue'])
                    ) {
                        throw new InvalidArgumentException('Missing required criteria for delete by duplicates');
                    }

                    $query = DB::table("{$criteria['database1']}.{$criteria['table1']} as t1")
                        ->whereExists(function ($subQuery) use ($criteria) {
                            $subQuery->select(DB::raw(1))
                                ->from("{$criteria['database1']}.{$criteria['table1']} as t2")
                                ->whereColumn('t2.id', '<', 't1.id');
                            foreach ($criteria['baseColumns'] as $column) {
                                $subQuery->whereColumn("t1.{$column}", '=', "t2.{$column}");
                            }
                            if (!empty($criteria['duplicateColumns'])) {
                                $subQuery->where(function ($q) use ($criteria) {
                                    foreach ($criteria['duplicateColumns'] as $column) {
                                        if ($criteria['deleteValue'] === 'empty') {
                                            $q->orWhereNull("t1.{$column}")->orWhere("t1.{$column}", '=', '');
                                        } elseif ($criteria['deleteValue'] === 'non_empty') {
                                            $q->orWhereNotNull("t1.{$column}")->where("t1.{$column}", '!=', '');
                                        }
                                    }
                                });
                            }
                        });
                    $affectedRecords = $query->delete();
                    $message = "Found {$affectedRecords} duplicate records! Are you sure you want to proceed? If yes, then deleted.";
                    break;

                case 'by_select':
                    if (
                        empty($criteria['database1']) || empty($criteria['table1']) || empty($criteria['columns1']) ||
                        empty($criteria['database2']) || empty($criteria['table2']) || empty($criteria['columns2']) ||
                        empty($criteria['deleteAction'])
                    ) {
                        throw new InvalidArgumentException('Missing required criteria for delete by select');
                    }

                    $isMatchField2 = $criteria['deleteAction'] === 'match_field2';
                    $sourceTable = $isMatchField2 ? "{$criteria['database1']}.{$criteria['table1']}" : "{$criteria['database2']}.{$criteria['table2']}";
                    $referenceTable = $isMatchField2 ? "{$criteria['database2']}.{$criteria['table2']}" : "{$criteria['database1']}.{$criteria['table1']}";
                    $sourceColumns = $isMatchField2 ? $criteria['columns1'] : $criteria['columns2'];
                    $referenceColumns = $isMatchField2 ? $criteria['columns2'] : $criteria['columns1'];

                    $query = DB::table($sourceTable);
                    if (count($sourceColumns) > 1) {
                        $affectedRecords = $query->whereIn(
                            DB::raw("CONCAT(" . implode(',', $sourceColumns) . ")"),
                            DB::table($referenceTable)->pluck(DB::raw("CONCAT(" . implode(',', $referenceColumns) . ")"))
                        )->delete();
                    } else {
                        $affectedRecords = $query->whereIn(
                            $sourceColumns[0],
                            DB::table($referenceTable)->select($referenceColumns[0])->distinct()
                        )->delete();
                    }
                    $message = "Found {$affectedRecords} records! Are you sure you want to proceed? If yes, then deleted.";
                    break;
            }

            Log::info("✅ [{$deleteType}] Processed {$affectedRecords} records");

            return [
                'status' => $affectedRecords > 0,
                'message' => $affectedRecords > 0 ? $message : 'No records found to delete.',
                'affectedRecords' => $affectedRecords
            ];
        } catch (QueryException $e) {
            Log::error("❌ [{$deleteType}] Database error: " . $e->getMessage());
            return [
                'status' => false,
                'message' => 'Database error occurred',
                'affectedRecords' => 0
            ];
        } catch (InvalidArgumentException $e) {
            Log::error("❌ [{$deleteType}] Validation error: " . $e->getMessage());
            return [
                'status' => false,
                'message' => $e->getMessage(),
                'affectedRecords' => 0
            ];
        } catch (Exception $e) {
            Log::error("❌ [{$deleteType}] Unexpected error: " . $e->getMessage());
            return [
                'status' => false,
                'message' => 'Unexpected error occurred',
                'affectedRecords' => 0
            ];
        }
    }

    public static function countRecords(string $deleteType, array $criteria): int
    {
        Log::info("🟠 [{$deleteType}] Counting records...");

        switch ($deleteType) {
            case 'by_value':
                if (
                    empty($criteria['database1']) || empty($criteria['table1']) ||
                    empty($criteria['columns1']) || empty($criteria['matchValue'])
                ) {
                    return 0;
                }
                $matchValues = array_map('trim', explode('|', $criteria['matchValue']));
                $query = DB::table("{$criteria['database1']}.{$criteria['table1']}")
                    ->where(function ($q) use ($criteria, $matchValues) {
                        foreach ($criteria['columns1'] as $column) {
                            foreach ($matchValues as $value) {
                                $q->orWhere($column, '=', $value);
                            }
                        }
                    });
                return $query->distinct()->count();

            case 'by_duplicates':
                if (
                    empty($criteria['database1']) || empty($criteria['table1']) ||
                    empty($criteria['baseColumns']) || empty($criteria['deleteValue'])
                ) {
                    return 0;
                }
                $query = DB::table("{$criteria['database1']}.{$criteria['table1']}")
                    ->select($criteria['baseColumns'])
                    ->groupBy($criteria['baseColumns'])
                    ->havingRaw('COUNT(*) > 1');

                if (!empty($criteria['duplicateColumns'])) {
                    $query->where(function ($q) use ($criteria) {
                        foreach ($criteria['duplicateColumns'] as $column) {
                            if ($criteria['deleteValue'] === 'empty') {
                                $q->orWhereNull($column)->orWhere($column, '=', '');
                            } elseif ($criteria['deleteValue'] === 'non_empty') {
                                $q->orWhereNotNull($column)->where($column, '!=', '');
                            }
                        }
                    });
                }
                return $query->distinct()->count();

            case 'by_select':
                if (
                    empty($criteria['database1']) || empty($criteria['table1']) || empty($criteria['columns1']) ||
                    empty($criteria['database2']) || empty($criteria['table2']) || empty($criteria['columns2']) ||
                    empty($criteria['deleteAction'])
                ) {
                    return 0;
                }
                $isMatchField2 = $criteria['deleteAction'] === 'match_field2';
                $sourceTable = $isMatchField2 ? "{$criteria['database1']}.{$criteria['table1']}" : "{$criteria['database2']}.{$criteria['table2']}";
                $referenceTable = $isMatchField2 ? "{$criteria['database2']}.{$criteria['table2']}" : "{$criteria['database1']}.{$criteria['table1']}";
                $sourceColumns = $isMatchField2 ? $criteria['columns1'] : $criteria['columns2'];
                $referenceColumns = $isMatchField2 ? $criteria['columns2'] : $criteria['columns1'];

                $query = DB::table($sourceTable);
                if (count($sourceColumns) > 1) {
                    $query->whereIn(
                        DB::raw("CONCAT(" . implode(',', $sourceColumns) . ")"),
                        DB::table($referenceTable)->pluck(DB::raw("CONCAT(" . implode(',', $referenceColumns) . ")"))
                    );
                } else {
                    $query->whereIn($sourceColumns[0], DB::table($referenceTable)->select($referenceColumns[0])->distinct());
                }
                return $query->distinct()->count();

            default:
                return 0;
        }
    }

        /** -------------------------------F!!! For CREATE TABLE !!!----------------------------------------- */


   /**
 * Create a new table with dynamic columns in specified database
 * 
 * @param string $databaseId Database ID from databases table
 * @param string $tableName Name of the table to create
 * @param array $columns Array of column configurations (from your base_table input)
 * @param array $options Additional table options
 * @return array Result with status and message
 */
  public static function createDynamicTable(string $databaseId, string $tableName, array $columns, array $options = []): array
{
    try {
        // Validate required inputs
        if (empty($databaseId)) return ['status' => false, 'message' => 'Database ID is required.'];
        if (empty($tableName)) return ['status' => false, 'message' => 'Table name is required.'];
        if (empty($columns) || !is_array($columns)) return ['status' => false, 'message' => 'At least one column definition is required.'];

        if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $tableName)) {
            return ['status' => false, 'message' => 'Invalid table name.'];
        }

        $databaseName = DB::table('databases')->where('database_id', $databaseId)->value('name');
        if (!$databaseName) return ['status' => false, 'message' => "Database not found for ID '$databaseId'."];
        
        $mode = strtolower($options['mode'] ?? 'create');
        $tableExists = DB::selectOne(
            "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
            [$databaseName, $tableName]
        );

        if ($mode === 'create' && $tableExists) {
            return ['status' => false, 'message' => "Table '$tableName' already exists in '$databaseName'."];
        }

        if ($mode === 'alter' && !$tableExists) {
            return ['status' => false, 'message' => "Table '$tableName' does not exist in '$databaseName'."];
        }

        $columnDefs = [];
        $uniques = $indexes = [];
        $hasId = false;

        foreach ($columns as $col) {
            $name = $col['name'] ?? '';
            $type = strtoupper($col['type'] ?? '');
            if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $name) || !$type) {
                return ['status' => false, 'message' => "Invalid column definition for '$name'."];
            }

            if (strtolower($name) === 'id') $hasId = true;

            $length = $col['length'] ?? null;
            $def = "`$name` $type" . ($length && in_array($type, ['VARCHAR', 'CHAR', 'TEXT', 'INT', 'BIGINT']) ? "($length)" : '');

            $nullable = (isset($col['validation']) && in_array('null', $col['validation'])) ? ' NULL' : ' NOT NULL';
            $default = $col['default'] ?? null;

            if ($default !== null && strtolower($default) !== 'null') {
                $value = (strtolower($default) === 'current_timestamp') ? "CURRENT_TIMESTAMP" : "'" . addslashes($default) . "'";
                $def .= "$nullable DEFAULT $value";
            } else {
                $def .= $nullable;
            }

            $columnDefs[$name] = $def;

            if (!empty($col['unique'])) $uniques[] = $name;
            if (!empty($col['index'])) $indexes[] = $name;
        }

        // Fetch existing constraints and indexes
        $existingConstraints = [];
        $existingIndexes = [];

        if ($mode === 'alter') {
            $existingConstraints = DB::select(
                "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE IN ('UNIQUE', 'PRIMARY KEY')",
                [$databaseName, $tableName]
            );
            $existingConstraints = array_column($existingConstraints, 'CONSTRAINT_NAME');

            $existingIndexesData = DB::select(
                "SELECT INDEX_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.STATISTICS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
                [$databaseName, $tableName]
            );
            foreach ($existingIndexesData as $idx) {
                $existingIndexes[$idx->COLUMN_NAME][] = $idx->INDEX_NAME;
            }
        }

        $generateConstraintName = function ($prefix, $tableName, $column, $existingNames) {
            $base = "{$prefix}_{$tableName}_{$column}";
            $name = substr($base, 0, 50);
            $i = 0;
            while (in_array($name, $existingNames)) {
                $i++;
                $name = substr("{$base}_$i", 0, 50);
            }
            return $name;
        };

        if ($mode === 'create') {
            if (!$hasId) {
                $columnDefs = array_merge(['id' => "`id` INT UNSIGNED NOT NULL AUTO_INCREMENT"], $columnDefs);
            }

            $defs = array_values($columnDefs);
            $defs[] = "PRIMARY KEY (`id`)";
            foreach ($uniques as $col) {
                $defs[] = "CONSTRAINT `" . $generateConstraintName('unq', $tableName, $col, $existingConstraints) . "` UNIQUE (`$col`)";
            }
            foreach ($indexes as $col) {
                $defs[] = "INDEX `" . $generateConstraintName('idx', $tableName, $col, []) . "` (`$col`)";
            }

            $sql = sprintf(
                "CREATE TABLE `%s`.`%s` (\n%s\n) ENGINE=%s DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
                $databaseName,
                $tableName,
                implode(",\n", $defs),
                $options['engine'] ?? 'InnoDB'
            );
        } else {
            $alterParts = [];

            // Fetch existing columns
            $existingCols = DB::select(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
                [$databaseName, $tableName]
            );
            $existingNames = array_column($existingCols, 'COLUMN_NAME');

            foreach ($columnDefs as $name => $definition) {
                $alterParts[] = in_array($name, $existingNames)
                    ? "MODIFY COLUMN $definition"
                    : "ADD COLUMN $definition";
            }

            $columnsToDrop = array_diff($existingNames, array_keys($columnDefs), ['id']);
            foreach ($columnsToDrop as $col) {
                $alterParts[] = "DROP COLUMN `$col`";
            }

            foreach ($existingConstraints as $con) {
                if ($con !== 'PRIMARY') {
                    $alterParts[] = "DROP CONSTRAINT `$con`";
                }
            }

            foreach ($uniques as $col) {
                $constraintName = $generateConstraintName('unq', $tableName, $col, $existingConstraints);
                $alterParts[] = "ADD CONSTRAINT `$constraintName` UNIQUE (`$col`)";
            }

            foreach ($indexes as $col) {
                $existingForCol = $existingIndexes[$col] ?? [];
                $idxName = $generateConstraintName('idx', $tableName, $col, $existingForCol);
                if (!in_array($idxName, $existingForCol)) {
                    $alterParts[] = "ADD INDEX `$idxName` (`$col`)";
                }
            }

            if (empty($alterParts)) {
                return ['status' => false, 'message' => 'Nothing to alter.'];
            }

            $sql = "ALTER TABLE `$databaseName`.`$tableName` " . implode(", ", $alterParts);
        }

        DB::statement($sql);

        return [
            'status' => true,
            'message' => "Table '$tableName' " . ($mode === 'create' ? 'created' : 'altered') . " successfully in '$databaseName'.",
            'sql' => $sql,
            'database' => $databaseName,
            'table' => $tableName,
            'mode' => $mode,
            'headers' => json_encode($columns)
        ];
    } catch (\Exception $e) {
        Log::error("❌ Error in $mode: " . $e->getMessage(), [
            'sql' => $sql ?? 'N/A',
            'database' => $databaseId,
            'table' => $tableName,
            'trace' => $e->getTraceAsString()
        ]);

        return [
            'status' => false,
            'message' => "Failed to $mode table: " . $e->getMessage(),
            'error_code' => $e->getCode()
        ];
    }
}
}
