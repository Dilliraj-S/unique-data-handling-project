<?php
namespace App\Http\Controllers\System\Central\QueryNest;
use App\Facades\{Data, Developer, Random, Skeleton, Crud};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator, DB};
/**
 * Controller for saving updated QueryNest entities.
 */
class SaveEditCtrl extends Controller
{
    /**
     * Saves updated QueryNest entity data based on validated input.
     *
     * @param Request $request HTTP request containing form data and token
     * @return JsonResponse JSON response with status, title, and message
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $token = $request->input('save_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.');
            }
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            $byMeta = $timestampMeta = true;
            $reloadTable = $reloadCard = false;
            $validated = [];
            $title = 'Success';
            $message = 'Record updated successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'QueryNest_entities':
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|regex:/^[a-z_]{3,100}$/|max:100',
                        'type' => 'required|in:data,unique,select,other',
                        'status' => 'required|in:active,inactive',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $reloadTable = true;
                    $title = 'Entity Updated';
                    $message = 'Entity configuration updated successfully.';
                    break;
                case 'central_unique_unq_tables':
                    // 1. Validation
                    $validator = Validator::make($request->all(), [
                        'table_id'    => 'required|string',
                        'system_id'   => 'required|string',
                        'name'        => 'required|string',
                        'base_table'  => 'nullable|json', // Allow nullable but handle it below
                    ]);

                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }

                    $validated = $validator->validated();

                    // 2. Get DB name
                    $systemName = DB::table('databases')
                        ->where('database_id', $validated['system_id'])
                        ->value('name');

                    if (!$systemName) {
                        return ResponseHelper::moduleError("❌ System/database not found.");
                    }

                    // 3. Fetch current table metadata
                    $currentTable = DB::table('unq_tables')
                        ->where('table_id', $validated['table_id'])
                        ->first();

                    if (!$currentTable) {
                        return ResponseHelper::moduleError("Table not found for ID '{$validated['table_id']}'.");
                    }

                    // 4. If base_table (columns) are changed, update actual table
                    if (!empty($validated['base_table'])) {
                        $tableName = strtolower($validated['name']);
                        $columns = json_decode($validated['base_table'], true);

                        if (!is_array($columns) || empty($columns)) {
                            return ResponseHelper::moduleError('Invalid column JSON format or empty columns.');
                        }

                        $alterResult = Crud::createDynamicTable(
                            $validated['system_id'],
                            $tableName,
                            $columns,
                            ['mode' => 'alter']
                        );

                        if (!$alterResult['status']) {
                            return ResponseHelper::moduleError('Table Alter Failed', $alterResult['message']);
                        }

                        // Use headers from createDynamicTable
                        $headers = $alterResult['headers'] ?? json_encode($columns);
                    } else {
                        // If base_table is not provided, keep the existing headers
                        $headers = $currentTable->headers;
                    }

                    // 5. Update metadata in unq_tables
                    $updateData = [
                        'headers'      => $headers, // Use validated headers or current headers
                        'system'       => $systemName,
                        'system_id'    => $validated['system_id'],
                        'name'         => strtolower($validated['name']),
                        'last_active'  => now()->toDateTimeString(),
                    ];

                    // Update the unq_tables record
                    DB::beginTransaction();
                    try {
                        DB::table('unq_tables')
                            ->where('table_id', $validated['table_id'])
                            ->update($updateData);
                        DB::commit();
                    } catch (QueryException $e) {
                        DB::rollBack();
                        Log::error('❌ Query error [unq_tables update]', [
                            'error' => $e->getMessage(),
                            'table_id' => $validated['table_id'],
                            'headers' => $headers,
                            'sql' => 'UPDATE unq_tables SET headers = ?, system = ?, system_id = ?, name = ?, last_active = ? WHERE table_id = ?',
                            'bindings' => array_values($updateData + ['table_id' => $validated['table_id']])
                        ]);
                        return ResponseHelper::moduleError('Query error: ' . $e->getMessage());
                    }

                    // 6. Final response
                    $reloadTable = true;
                    $title = 'Table Updated';
                    $message = '✅ Unique table configuration updated and schema altered if necessary.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            if ($byMeta || $timestampMeta) {
                if ($timestampMeta) {
                    $validated['updated_at'] = now();
                }
            }
            $affected = Data::update('central', $reqSet['table'], $validated, [$reqSet['act'] => $reqSet['id']], $reqSet['key']);
            return response()->json([
                'status' => $affected > 0,
                'reload_table' => $reloadTable,
                'reload_card' => $reloadCard,
                'token' => $reqSet['token'],
                'affected' => $affected,
                'title' => $affected > 0 ? $title : 'Failed',
                'message' => $affected > 0 ? $message : 'No changes were made.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.');
        }
    }
}