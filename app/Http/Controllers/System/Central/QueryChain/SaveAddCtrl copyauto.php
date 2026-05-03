<?php

namespace App\Http\Controllers\System\Central\QueryChain;

use App\Facades\{Data, Developer, Random, Skeleton, Crud};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};

/**
 * Controller for saving new QueryChain entities.
 */
class SaveAddCtrl extends Controller
{
    /**
     * Saves new QueryChain entity data based on validated input.
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
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            $byMeta = $timestampMeta = true;
            $reloadTable = $reloadCard = false;
            $validated = [];
            $title = 'Success';
            $message = 'Record added successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'central_unique_database':
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|regex:/^[a-z_]{3,100}$/|max:100',
                        'status' => 'required|boolean',
                        'description' => 'nullable|string',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['database_id'] = Random::unique(6, 'DB');
                    $reloadTable = true;
                    $title = 'Entity Added';
                    $message = 'Entity configuration added successfully.';
                    $dbCreate = Crud::createDatabase($validated['name']);
                    if (!$dbCreate['status'] == true) {
                        return ResponseHelper::moduleError('Database Creation Failed', $dbCreate['message']);
                    }
                    break;
                case 'central_unique_processes':
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|max:100',
                        'flows' => 'required|array',
                        'input_source' => 'required|in:csv,db',
                        'output_target' => 'required|in:csv,excel,db',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['flows'] = isset($validated['flows']) ? implode(',', $validated['flows']) : null;
                    Developer::info('Validated Process Data: ', $validated);
                    $validated['process_id'] = Random::unique(5, 'PRC');
                    $reloadTable = true;
                    $title = 'Process Added';
                    $message = 'Process Configuration Added Successfully.';
                    break;

                case 'unique_process_logs':
                    // Normalize toggle inputs to 0/1 and validate payload from ShowAddCtrl unique_process_logs
                    $normalizeToggle = function ($value) {
                        $v = is_string($value) ? strtolower(trim($value)) : $value;
                        $truthy = ['1', 1, true, 'true', 'on', 'yes'];
                        return in_array($v, $truthy, true) ? 1 : 0;
                    };
                    $request->merge([
                        'master_leads' => $normalizeToggle($request->input('master_leads', 0)),
                        'master_accounts' => $normalizeToggle($request->input('master_accounts', 0)),
                    ]);
                    $validator = Validator::make($request->all(), [
                        'process_id' => 'required|string|max:50',
                        // Leads target required only when leads toggle is on
                        'master_leads' => 'nullable|in:0,1',
                        'database' => 'required_if:master_leads,1|nullable|string',
                        'table' => 'required_if:master_leads,1|nullable|string',
                        // Accounts target required only when accounts toggle is on
                        'master_accounts' => 'nullable|in:0,1',
                        'database2' => 'required_if:master_accounts,1|nullable|string',
                        'table2' => 'required_if:master_accounts,1|nullable|string',
                        'batch_size' => 'nullable|integer|min:100|max:10000',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $payload = $validator->validated();
                    // Normalize db/table strings and split qualified table (e.g., venus.master_leads)
                    $clean = function (?string $v): ?string {
                        if (!is_string($v)) return $v;
                        $v = trim($v);
                        return trim($v, "` ");
                    };
                    $splitQualified = function (?string $db, ?string $table) use ($clean): array {
                        $db = $clean($db);
                        $table = $clean($table);
                        if (is_string($table) && strpos($table, '.') !== false) {
                            [$dbPart, $tblPart] = explode('.', $table, 2);
                            $db = $clean($dbPart) ?: $db;
                            $table = $clean($tblPart);
                        }
                        return [$db, $table];
                    };
                    // Clean raw values
                    foreach (['database','table','database2','table2'] as $k) {
                        if (array_key_exists($k, $payload)) {
                            $payload[$k] = $clean($payload[$k]);
                        }
                    }
                    // If table includes schema, override database with that schema
                    [$payload['database'], $payload['table']] = $splitQualified($payload['database'] ?? null, $payload['table'] ?? null);
                    [$payload['database2'], $payload['table2']] = $splitQualified($payload['database2'] ?? null, $payload['table2'] ?? null);

                    $toggleLeads = (bool)($payload['master_leads'] ?? false);
                    $toggleAccounts = (bool)($payload['master_accounts'] ?? false);
                    if (!$toggleLeads && !$toggleAccounts) {
                        return ResponseHelper::moduleError('Selection Missing', 'Select at least one target (Master Leads or Master Accounts).');
                    }

                    // Configuration
                    $DELETE_MODE = false; // false => mark as 'moved', true => delete moved rows
                    $BATCH_SIZE = (int)($payload['batch_size'] ?? 1000);

                    // Define header sets (keep concise core identifiers; can be externalized later)
                    $LEADS_HEADERS = [
                        'li_full_name','li_first_name','li_last_name','email','dls_mobile','dls_direct_dial',
                        'ap_full_name','ap_contact_city','ap_contact_country','li_company_name','li_job_title'
                    ];
                    $ACCOUNTS_HEADERS = [
                        'li_company_name','li_company_id','li_company_url','li_company_industry','li_company_employee_size',
                        'ap_company_name','ap_company_website','ap_company_city','ap_company_country'
                    ];

                    // Resolve cloned table in moon database based on MasterFlowService convention: master_<process_id>
                    $processId = $payload['process_id'];
                    $moonDb = 'moon';
                    $candidateTables = [
                        "master_{$processId}",
                        'master_' . strtolower($processId),
                        $processId, // fallback
                    ];
                    $clonedTable = null;
                    foreach ($candidateTables as $tbl) {
                        $exists = \DB::select(
                            "SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1",
                            [$moonDb, $tbl]
                        );
                        if (!empty($exists)) { $clonedTable = $tbl; break; }
                    }
                    if (!$clonedTable) {
                        return response()->json([
                            'status' => 'error',
                            'message' => "Cloned table for process_id {$processId} not found.",
                        ], 404);
                    }

                    // Get columns of cloned table
                    $columns = collect(\DB::select(
                        "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?",
                        [$moonDb, $clonedTable]
                    ))->pluck('column_name')->map(fn($c)=>strtolower($c))->toArray();

                    // Use only headers that actually exist on the cloned table to avoid SQL errors
                    $leadHeaderCols = array_values(array_intersect(array_map('strtolower',$LEADS_HEADERS), $columns));
                    $accountHeaderCols = array_values(array_intersect(array_map('strtolower',$ACCOUNTS_HEADERS), $columns));

                    $hasLeadHeaders = count($leadHeaderCols) > 0;
                    $hasAccountHeaders = count($accountHeaderCols) > 0;

                    Developer::info('UniqueProcessLogs: setup', [
                        'process_id' => $processId,
                        'cloned_table' => "$moonDb.$clonedTable",
                        'columns' => $columns,
                        'lead_headers_used' => $leadHeaderCols,
                        'account_headers_used' => $accountHeaderCols,
                        'toggle_leads' => $toggleLeads,
                        'toggle_accounts' => $toggleAccounts,
                    ]);

                    $skippedTargets = [];
                    if ($toggleLeads && !$hasLeadHeaders) { $skippedTargets[] = 'master_leads (required headers missing)'; $toggleLeads = false; }
                    if ($toggleAccounts && !$hasAccountHeaders) { $skippedTargets[] = 'master_accounts (required headers missing)'; $toggleAccounts = false; }
                    if (!$toggleLeads && !$toggleAccounts) {
                        return response()->json([
                            'status' => 'error',
                            'message' => 'Required headers not found in cloned table for the selected targets.',
                            'skipped_targets' => $skippedTargets,
                        ], 422);
                    }

                    // Ensure target tables exist and get their columns
                    $targets = [];
                    if ($toggleLeads) {
                        $targets['leads'] = [
                            'db' => $payload['database'],
                            'table' => $payload['table'],
                        ];
                    }
                    if ($toggleAccounts && !empty($payload['database2']) && !empty($payload['table2'])) {
                        $targets['accounts'] = [
                            'db' => $payload['database2'],
                            'table' => $payload['table2'],
                        ];
                    } elseif ($toggleAccounts) {
                        return ResponseHelper::moduleError('Validation Error', 'Database 2 and Table 2 are required for Master Accounts.');
                    }

                    $targetMeta = [];
                    foreach ($targets as $key => $t) {
                        $qualified = "`{$t['db']}`.`{$t['table']}`";
                        // Robust existence/columns check using SHOW COLUMNS (works across schemas)
                        try {
                            $columnsResult = \DB::select("SHOW COLUMNS FROM $qualified");
                        } catch (\Throwable $e) {
                            return response()->json([
                                'status' => 'error',
                                'message' => "Target table {$t['db']}.{$t['table']} does not exist or cannot be accessed.",
                                'details' => $e->getMessage(),
                            ], 404);
                        }
                        if (empty($columnsResult)) {
                            return response()->json([
                                'status' => 'error',
                                'message' => "Target table {$t['db']}.{$t['table']} does not exist.",
                            ], 404);
                        }
                        $cols = array_map(fn($r) => strtolower($r->Field ?? ''), $columnsResult);
                        $targetMeta[$key] = [ 'qualified' => $qualified, 'columns' => $cols ];
                    }

                    // Helper to fetch a batch filtered by header set condition
                    $fetchBatch = function(array $headerSet) use ($moonDb, $clonedTable, $BATCH_SIZE) {
                        $query = \DB::table(\DB::raw("`{$moonDb}`.`{$clonedTable}`"))
                            ->whereIn('status', ['processed', 'completed'])
                            ->orderBy('id')
                            ->limit($BATCH_SIZE)
                            ->lockForUpdate();
                        // Build OR where for any header non-empty
                        if (!empty($headerSet)) {
                            $query->where(function($q) use ($headerSet) {
                                foreach ($headerSet as $h) {
                                    $q->orWhereRaw("COALESCE(NULLIF(TRIM(`$h`), ''), '') <> ''");
                                }
                            });
                        }
                        return $query->get();
                    };

                    // Insert rows helper
                    $insertRows = function($key, $rows) use ($targetMeta) {
                        if (empty($rows)) { return 0; }
                        $meta = $targetMeta[$key];
                        $allowedCols = $meta['columns'];
                        $payload = [];
                        foreach ($rows as $row) {
                            $mapped = [];
                            foreach ($row as $col => $val) {
                                $lc = strtolower($col);
                                if (in_array($lc, $allowedCols, true)) {
                                    $mapped[$lc] = $val;
                                }
                            }
                            if (!empty($mapped)) { $payload[] = $mapped; }
                        }
                        if (empty($payload)) { return 0; }
                        // Use raw qualified table name
                        \DB::table(\DB::raw($meta['qualified']))->insert($payload);
                        return count($payload);
                    };

                    $movedLeads = 0; $movedAccounts = 0; $errors = [];
                    $movedLeadIds = []; $movedAccountIds = [];
                    $deferMarkMoved = ($toggleLeads && $toggleAccounts);

                    // Deterministic rule if both toggles ON: prioritize leads first, then accounts with remaining rows
                    try {
                        if ($toggleLeads) {
                            while (true) {
                                \DB::beginTransaction();
                                try {
                                    $batch = $fetchBatch($leadHeaderCols);
                                    if ($batch->isEmpty()) { \DB::rollBack(); Developer::info('UniqueProcessLogs: leads batch empty'); break; }
                                    $countInserted = $insertRows('leads', $batch);
                                    Developer::info('UniqueProcessLogs: leads moved', ['batch' => $batch->count(), 'inserted' => $countInserted]);
                                    $ids = $batch->pluck('id')->all();
                                    $movedLeadIds = array_merge($movedLeadIds, $ids);
                                    if (!$deferMarkMoved) {
                                        if ($DELETE_MODE) {
                                            \DB::table(\DB::raw("`{$moonDb}`.`{$clonedTable}`"))->whereIn('id', $ids)->delete();
                                        } else {
                                            \DB::table(\DB::raw("`{$moonDb}`.`{$clonedTable}`"))->whereIn('id', $ids)->update(['status' => 'moved']);
                                        }
                                    }
                                    \DB::commit();
                                    $movedLeads += $countInserted;
                                    if ($batch->count() < $BATCH_SIZE) { break; }
                                } catch (\Throwable $te) {
                                    \DB::rollBack();
                                    $errors[] = 'Leads move failed: ' . $te->getMessage();
                                    break;
                                }
                            }
                        }

                        if ($toggleAccounts) {
                            while (true) {
                                \DB::beginTransaction();
                                try {
                                    $batch = $fetchBatch($accountHeaderCols);
                                    if ($batch->isEmpty()) { \DB::rollBack(); Developer::info('UniqueProcessLogs: accounts batch empty'); break; }
                                    $countInserted = $insertRows('accounts', $batch);
                                    Developer::info('UniqueProcessLogs: accounts moved', ['batch' => $batch->count(), 'inserted' => $countInserted]);
                                    $ids = $batch->pluck('id')->all();
                                    $movedAccountIds = array_merge($movedAccountIds, $ids);
                                    // Accounts loop always marks moved when not deferring (if leads-only)
                                    if (!$deferMarkMoved) {
                                        if ($DELETE_MODE) {
                                            \DB::table(\DB::raw("`{$moonDb}`.`{$clonedTable}`"))->whereIn('id', $ids)->delete();
                                        } else {
                                            \DB::table(\DB::raw("`{$moonDb}`.`{$clonedTable}`"))->whereIn('id', $ids)->update(['status' => 'moved']);
                                        }
                                    }
                                    \DB::commit();
                                    $movedAccounts += $countInserted;
                                    if ($batch->count() < $BATCH_SIZE) { break; }
                                } catch (\Throwable $te) {
                                    \DB::rollBack();
                                    $errors[] = 'Accounts move failed: ' . $te->getMessage();
                                    break;
                                }
                            }
                        }
                        // If both toggles were on, mark all moved rows at the end
                        if ($deferMarkMoved) {
                            $finalIds = array_values(array_unique(array_merge($movedLeadIds, $movedAccountIds)));
                            if (!empty($finalIds)) {
                                if ($DELETE_MODE) {
                                    \DB::table(\DB::raw("`{$moonDb}`.`{$clonedTable}`"))->whereIn('id', $finalIds)->delete();
                                } else {
                                    \DB::table(\DB::raw("`{$moonDb}`.`{$clonedTable}`"))->whereIn('id', $finalIds)->update(['status' => 'moved']);
                                }
                            }
                        }
                    } catch (\Throwable $e) {
                        return response()->json([
                            'status' => 'error',
                            'message' => 'Move operation failed.',
                            'details' => $e->getMessage(),
                        ], 500);
                    }

                    return response()->json([
                        'status' => 'success',
                        'moved_leads' => $movedLeads,
                        'moved_accounts' => $movedAccounts,
                        'skipped_targets' => $skippedTargets,
                        'errors' => $errors,
                    ]);
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
                    $validated['created_at'] = $validated['updated_at'] = now();
                }
                if ($byMeta) {
                    $validated['created_by'] = Skeleton::getAuthenticatedUser();
                }
            }
            $result = Data::create('central', $reqSet['table'], $validated, $reqSet['key']);
            return response()->json([
                'status' => $result['status'],
                'reload_table' => $reloadTable,
                'reload_card' => $reloadCard,
                'token' => $reqSet['token'],
                'affected' => $result['status'] ? $result['data']['id'] : '-',
                'title' => $result['status'] ? $title : 'Failed',
                'message' => $result['status'] ? $message : $result['message']
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.');
        }
    }
}
