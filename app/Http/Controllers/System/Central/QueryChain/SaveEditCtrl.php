<?php
namespace App\Http\Controllers\System\Central\QueryChain;
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
/**
 * Controller for saving updated QueryChain entities.
 */
class SaveEditCtrl extends Controller
{
    /**
     * Saves updated QueryChain entity data based on validated input.
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
                case 'central_unique_database':
                    $validator = Validator::make($request->all(), [
                        'status' => 'required|boolean',
                        'description' => 'nullable',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $reloadTable = true;
                    $title = 'Entity Updated';
                    $message = 'Entity configuration updated successfully.';
                    break;
                case 'central_unique_workflows':
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|max:100',
                        'type' => 'required|in:wf,mf,wmf',
                        'required_headers' => ['nullable', 'string', 'regex:/^([a-zA-Z0-9_]+)(,\s*[a-zA-Z0-9_]+)*$/'],
                        'mapping_headers' => ['nullable', 'string', 'regex:/^([a-zA-Z0-9_]+)(,\s*[a-zA-Z0-9_]+)*$/'],
                        'update_headers' => ['nullable', 'string'],
                        'mandatory' => 'nullable|boolean',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    foreach (['required_headers', 'mapping_headers', 'update_headers'] as $headerField) {
                        if (isset($validated[$headerField])) {
                            $validated[$headerField] = json_encode(array_map('trim', explode(',', $validated[$headerField])));
                        } else {
                            $validated[$headerField] = json_encode([]);
                        }
                    }
                    Developer::info($validated);
                    $reloadTable = true;
                    $title = 'Entity Updated';
                    $message = 'Entity configuration updated successfully.';
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
                    $title = 'Process Updated';
                    $message = 'Process Configuration Updated Successfully.';
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
