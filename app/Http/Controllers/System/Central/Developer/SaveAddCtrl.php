<?php
namespace App\Http\Controllers\System\Central\Developer;
use App\Facades\{Data, Developer, Random, Skeleton, Helper};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
/**
 * Controller for saving new developer entities.
 */
class SaveAddCtrl extends Controller
{
    /**
     * Saves new developer entity data based on validated input.
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
                
                case 'central_skeleton_tokens':
                    
                    $validator = Validator::make($request->all(), [
                        'key' => 'required|string|regex:/^[a-z_]{3,100}$/|max:100',
                        'module' => 'required|string|max:100',
                        'system' => 'required|in:business,central',
                        'type' => 'required|in:data,unique,select,other',
                        'table' => 'required|string|regex:/^[a-z_.]{3,100}$/|max:100',
                        'column' => 'required|string|max:150',
                        'value' => 'required|string|max:150',
                        'act' => 'required|string|max:150',
                        'validate' => 'required|boolean',
                        'actions' => 'nullable|array|in:c,v,e,d'
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['actions'] = isset($validated['actions']) ? implode('', $validated['actions']) : null;
                    $reloadTable = true;
                    $title = 'Token Added';
                    $message = 'Token configuration added successfully.';
                    break;
                
                case 'central_skeleton_modules':
                    
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|max:100',
                        'icon' => 'nullable|string|max:100',
                        'system' => 'required|in:central,business,open',
                        'order' => 'required|integer|min:0',
                        'is_navigable' => 'required|boolean',
                        'is_approved' => 'required|boolean',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['module_id'] = Random::unique(6, 'MOD');
                    $reloadTable = true;
                    $title = 'Module Added';
                    $message = 'Module configuration added successfully.';
                    break;
                
                case 'central_skeleton_sections':
                    
                    $validator = Validator::make($request->all(), [
                        'module_id' => 'required|string',
                        'name' => 'required|string|max:100',
                        'icon' => 'nullable|string|max:100',
                        'order' => 'required|integer|min:0',
                        'is_navigable' => 'required|boolean',
                        'is_approved' => 'required|boolean',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['section_id'] = Random::unique(6, 'SEC');
                    $reloadTable = true;
                    $title = 'Section Added';
                    $message = 'Section configuration added successfully.';
                    break;
                
                case 'central_skeleton_items':
                    
                    $validator = Validator::make($request->all(), [
                        'section_id' => 'required|string',
                        'name' => 'required|string|max:100',
                        'icon' => 'nullable|string|max:100',
                        'order' => 'required|integer|min:0',
                        'is_navigable' => 'required|boolean',
                        'is_approved' => 'required|boolean',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['item_id'] = Random::unique(6, 'ITM');
                    $reloadTable = true;
                    $title = 'Item Added';
                    $message = 'Item configuration added successfully.';
                    break;
                
                case 'central_skeleton_custom_permissions':
                    
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|max:100',
                        'description' => 'nullable|string|max:255',
                        'is_approved' => 'required|boolean',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['permission_id'] = Random::unique(6, 'PRMC');
                    $reloadTable = true;
                    $title = 'Custom Permission Added';
                    $message = 'Custom permission configuration added successfully.';
                    break;
                
                case 'central_skeleton_folders':
                    
                    $validator = Validator::make($request->all(), [
                        'key'              => 'required|string|max:100',
                        'name'             => 'required|string|max:100',
                        'parent_folder_id' => 'nullable|string',
                        'type'             => 'nullable|string|max:100',
                        'is_approved'      => 'nullable|boolean',
                        'description'      => 'nullable|string|max:255',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $normalizedName = strtolower(preg_replace('/\s+/', '-', trim($validated['name'])));
                    $validated['path'] = '\\' . $normalizedName;
                    
                    if (!empty($validated['parent_folder_id']) && $validated['parent_folder_id'] != 'Empty') {
                        if (Helper::isCircularReference($validated['parent_folder_id'], null)) {
                            return ResponseHelper::moduleError('Validation Error', 'Circular reference detected in folder hierarchy.');
                        }
                        $folderPaths = Helper::getFolderPaths();
                        if (isset($folderPaths[$validated['parent_folder_id']])) {
                            $validated['path'] = $folderPaths[$validated['parent_folder_id']] . '\\' . $normalizedName;
                        } else {
                            return ResponseHelper::moduleError('Validation Error', 'Invalid parent folder ID.');
                        }
                    }
                    
                    $validated['folder_id'] = Random::unique(6, 'FLDR');
                    
                    $reloadTable = true;
                    $title = 'Folder Key Added';
                    $message = 'Folder configuration added successfully.';
                    break;
                
                case 'central_folder_permissions':
                    
                    $validator = Validator::make($request->all(), [
                        'folder_id' => 'required|string',
                        'permissions' => 'nullable|array',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['permission_type'] = isset($validated['permissions']) ? implode(',', $validated['permissions']) : null;
                    $reloadTable = true;
                    $title = 'Folder Permissions Added';
                    $message = 'Folder permissions added successfully.';
                    break;
                
                case 'central_file_extensions':
                    
                    $validator = Validator::make($request->all(), [
                        'extension' => 'required|string|max:50',
                        'icon_path' => 'required|string|max:100',
                        'mime_type' => 'nullable|string|max:100',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['extension_id'] = Random::unique(6, 'EXT');
                    $reloadTable = true;
                    $title = 'File Extension Added';
                    $message = 'File extension configuration added successfully.';
                    break;
                case 'central_skeleton_templates':
                    
                    $validator = Validator::make($request->all(), [
                        'key' => 'required|string|max:50',
                        'type' => 'required|string|max:100',
                        'name' => 'required|string|max:100',
                        'purpose' => 'required|string|max:250',
                        'subject' => 'required|string|max:250',
                        'placeholders' => 'required|string|max:250',
                        'content' => 'required',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    
                    if (is_array($validated['content']) || is_object($validated['content'])) {
                        $validated['content'] = json_encode($validated['content']);
                    }
                    $validated['content'] = json_encode(json_decode($validated['content'], true));
                    $reloadTable = $reqSet['id'];
                    $title = 'Template Added';
                    $message = 'Template added successfully.';
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
                if ($byMeta) {
                    $validated['created_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
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
