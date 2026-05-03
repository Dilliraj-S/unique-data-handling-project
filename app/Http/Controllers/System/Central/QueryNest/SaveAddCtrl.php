<?php
namespace App\Http\Controllers\System\Central\QueryNest;
use App\Facades\{Data, Developer, Random, Skeleton,Crud};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator,DB};
/**
 * Controller for saving new QueryNest entities.
 */
class SaveAddCtrl extends Controller
{
    /**
     * Saves new QueryNest entity data based on validated input.
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
                    $validated['entity_id'] = Random::unique(6, 'ENT');
                    $reloadTable = true;
                    $title = 'Entity Added';
                    $message = 'Entity configuration added successfully.';
                    break;
                     case 'central_unique_unq_tables':
                $validator = Validator::make($request->all(), [
                    'system_id'   => 'required|string',
                    'name'        => 'required|string',   
                    'base_table'  => 'required|json',     
                    'mode'        => 'in:create,alter'    
                ]);
                if ($validator->fails()) {
                    return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                }
                $validated = $validator->validated();
                $systemName = DB::table('databases')
                    ->where('database_id', $validated['system_id'])
                    ->value('name');
                $systemId = $validated['system_id'];
                if (!$systemName) {
                    return ResponseHelper::moduleError("Database not found.");
                }
                $tableName = strtolower($validated['name']);  
                $columns   = json_decode($validated['base_table'], true);
                $mode      = $validated['mode'] ?? 'create'; 
                $result = Crud::createDynamicTable(
                    $validated['system_id'],     
                    $tableName,                  
                    $columns,                    
                    ['mode' => $mode]            
                );
                if (!$result['status']) {
                    return ResponseHelper::moduleError('Table Operation Failed', $result['message']);
                }
                $validated['table_id']     = Random::unique(8, 'TBL');
                $validated['headers']      = $validated['base_table']; 
                $validated['system']       = $systemName;
                $validated['system_id']    = $systemId;
                $validated['last_active']  = now()->toDateTimeString();
                $validated['name']   = $tableName; 
                unset($validated['base_table']);
                $reloadTable = true;
                $title       = 'Table Created';
                $message     = "✅ Table '$tableName' " . ($mode === 'alter' ? 'altered' : 'created') . " successfully and stored.";
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