<?php
namespace App\Http\Controllers\System\Central\Developer;
use App\Facades\{FileManager, Data, Developer, Skeleton, Database, Helper};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
/**
 * Controller for saving updated developer entities.
 */
class SaveEditCtrl extends Controller
{
    /**
     * Saves updated developer entity data based on validated input.
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
                    $title = 'Token Updated';
                    $message = 'Token configuration updated successfully.';
                    break;
                
                case 'central_skeleton_modules':
                    
                    
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|max:100',
                        'icon' => 'nullable|string|max:100',
                        'system' => 'required|in:central,business,open',
                        'order' => 'required|integer|min:0',
                        'is_navigable' => 'required|boolean',
                        'is_approved' => 'required|boolean',
                        'controllers' => 'nullable',
                        'blades' => 'nullable',
                        'permissions' => 'nullable',
                        'module_id' => 'nullable|string',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $moduleId = $validated['module_id'] ?? '';
                    $system = $validated['system'] ?? '';
                    if ($validated['controllers'] ?? false) {
                        Developer::generateStructure('controller', 'module', $moduleId, $system);
                    }
                    if ($validated['blades'] ?? false) {
                        Developer::generateStructure('blade', 'module', $moduleId, $system);
                    }
                    if ($validated['permissions'] ?? false) {
                        Developer::generateStructure('permission', 'module', $moduleId, $system);
                    }
                    
                    unset($validated['controllers'], $validated['blades'], $validated['permissions']);
                    $reloadTable = true;
                    $title = 'Module Updated';
                    $message = 'Module configuration updated successfully.';
                    break;
                
                case 'central_skeleton_sections':
                    
                    
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|max:100',
                        'icon' => 'nullable|string|max:100',
                        'order' => 'required|integer|min:0',
                        'is_navigable' => 'required|boolean',
                        'is_approved' => 'required|boolean',
                        'blades' => 'nullable',
                        'permissions' => 'nullable',
                        'section_id' => 'nullable|string',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    if ($validated['blades'] ?? false) {
                        Developer::generateStructure('blade', 'section', $validated['section_id']);
                    }
                    if ($validated['permissions'] ?? false) {
                        Developer::generateStructure('permission', 'section', $validated['section_id']);
                    }
                    
                    unset($validated['blades'], $validated['permissions']);
                    $reloadTable = true;
                    $title = 'Section Updated';
                    $message = 'Section configuration updated successfully.';
                    break;
                
                case 'central_skeleton_items':
                    
                    
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|max:100',
                        'icon' => 'nullable|string|max:100',
                        'order' => 'required|integer|min:0',
                        'is_navigable' => 'required|boolean',
                        'is_approved' => 'required|boolean',
                        'blades' => 'nullable',
                        'permissions' => 'nullable',
                        'item_id' => 'nullable|string',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    if ($validated['blades'] ?? false) {
                        Developer::generateStructure('blade', 'item', $validated['item_id']);
                    }
                    if ($validated['permissions'] ?? false) {
                        Developer::generateStructure('permission', 'item', $validated['item_id']);
                    }
                    
                    unset($validated['blades'], $validated['permissions']);
                    $reloadTable = true;
                    $title = 'Item Updated';
                    $message = 'Item configuration updated successfully.';
                    break;
                
                case 'central_skeleton_permissions':
                    
                    $validator = Validator::make($request->all(), [
                        'is_approved' => 'required|boolean',
                        'description' => 'nullable|string|max:255',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $reloadTable = true;
                    $title = 'Permission Updated';
                    $message = 'Permission configuration updated successfully.';
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
                    $reloadTable = true;
                    $title = 'Custom Permission Updated';
                    $message = 'Custom permission configuration updated successfully.';
                    break;
                
                case 'central_skeleton_role_permissions':
                    
                    $validator = Validator::make($request->all(), [
                        'permission_ids' => 'required|json',
                        'business_id'    => 'nullable|string',
                        'role_id'        => 'nullable|string',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    
                    $permissionIds = json_decode($validated['permission_ids'], true);
                    if (!is_array($permissionIds)) {
                        return ResponseHelper::moduleError('Invalid Data', 'Permission IDs must be a valid JSON array.');
                    }
                    
                    $roleId = trim($validated['role_id'] ?? $reqSet['id']);
                    Skeleton::managePermissions('role', $roleId, $permissionIds, null);
                     
                    return response()->json([
                        'status'       => true,
                        'title'        => 'Role Permissions Updated',
                        'message'      => 'Role permissions updated successfully.',
                        'reload_table' => true,
                        'reload_card'  => false,
                        'token'        => $reqSet['token'],
                    ]);
                    
                case 'central_skeleton_user_permissions':
                    
                    $validator = Validator::make($request->all(), [
                        'permission_ids' => 'required|json',
                        'business_id' => 'nullable',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $permissionIds = json_decode($validated['permission_ids'], true);
                    if (!is_array($permissionIds)) {
                        return ResponseHelper::moduleError('Invalid Data', 'Permission IDs must be a valid JSON array.');
                    }
                    $userId = trim($reqSet['id']);
                    if ($validated['business_id'] != '' || $validated['business_id'] != 'CENTRAL') {
                        Skeleton::managePermissions('user', $userId, $permissionIds, $validated['business_id']);
                    } else {
                        Skeleton::managePermissions('user', $userId, $permissionIds, null);
                    }
                    return response()->json([
                        'status' => true,
                        'title' => 'User Permissions Updated',
                        'message' => 'User permissions updated successfully.',
                        'reload_table' => true,
                        'reload_card' => false,
                        'token' => $reqSet['token'],
                    ]);
                    break;
                
                case 'central_skeleton_folderss':
                    
                    $validator = Validator::make($request->all(), [
                        'key'              => 'required|string|max:100',
                        'name'             => 'required|string|max:100',
                        'parent_folder_id' => 'nullable|string',
                        'is_approved'      => 'nullable|boolean',
                        'description'      => 'nullable|string|max:255',
                        'folder_id'        => 'required|string|exists:skeleton_folders,folder_id',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $normalizedName = strtolower(preg_replace('/\s+/', '-', trim($validated['name'])));
                    $validated['path'] = '\\' . $normalizedName;
                    
                    if (!empty($validated['parent_folder_id']) && $validated['parent_folder_id'] != 'Empty') {
                        if (Helper::isCircularReference($validated['parent_folder_id'], $validated['folder_id'])) {
                            return ResponseHelper::moduleError('Validation Error', 'Circular reference detected in folder hierarchy.');
                        }
                        $folderPaths = Helper::getFolderPaths();
                        if (isset($folderPaths[$validated['parent_folder_id']])) {
                            $validated['path'] = $folderPaths[$validated['parent_folder_id']] . '\\' . $normalizedName;
                        } else {
                            return ResponseHelper::moduleError('Validation Error', 'Invalid parent folder ID.');
                        }
                    }
                    
                    $reloadTable = true;
                    $title = 'Folder Updated';
                    $message = 'Folder configuration updated successfully.';
                    break;
                case 'central_skeleton_folders':
                    
                    $profileFile = $request->file('profile');
                    $filename = 'profile_' . now()->format('YmdHis') . '.' . $profileFile->getClientOriginalExtension();
                    
                    
                    $result = FileManager::saveFile(
                        system: 'central',
                        file: $profileFile,
                        options: [
                            'folder_key' => 'ook', 
                            'business_id' => $request->user()->business_id ?? 'BSN0000001', 
                            'filename' => $filename,
                            'action' => 'store',
                            'condition' => [],
                            'is_public' => false, 
                            'is_temporary' => false, 
                            'tokenKey' => 'profile_upload'
                        ]
                    );
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
                    $title = 'Folder Permissions Updated';
                    $message = 'Folder permissions updated successfully.';
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
                    $reloadTable = true;
                    $title = 'File Extension Updated';
                    $message = 'File extension configuration updated successfully.';
                    break;
                case 'central_skeleton_templates':
                    
                    $validator = Validator::make($request->all(), [
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
                    $reloadTable = $validated['type'];
                    $title = 'Template Updated';
                    $message = 'Template updated successfully.';
                    break;
                
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            
            if ($byMeta || $timestampMeta) {
                if ($byMeta) {
                    $validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
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

        /**
     * Saves bulk updated developer entity data based on validated input.
     *
     * @param Request $request HTTP request containing form data and token
     * @return JsonResponse JSON response with status, title, and message
     */
    public function bulk(Request $request): JsonResponse
    {
        try {
            
            $token = $request->input('save_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.');
            }
            
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            
            $ids = explode('@', $request->input('update_ids', ''));
            if (empty($ids)) {
                return response()->json(['status' => false, 'title' => 'Invalid Data', 'message' => 'No valid IDs provided for deletion.']);
            }
            
            $byMeta = $timestampMeta = true;
            $reloadTable = $reloadCard = $hold_popup = false;
            $validated = [];
            $title = 'Success';
            $message = 'Record updated successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            
            switch ($reqSet['key']) {
                
                case 'central_skeleton_modules':
                    
                    
                    $validator = Validator::make($request->all(), [
                        'system' => 'required|in:central,business,open',
                        'order' => 'required|integer|min:0',
                        'is_navigable' => 'required|boolean',
                        'is_approved' => 'required|boolean',
                        'controllers' => 'nullable',
                        'blades' => 'nullable',
                        'permissions' => 'nullable',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $moduleId = $validated['module_id'] ?? '';
                    $system = $validated['system'] ?? '';
                    if ($validated['controllers'] ?? false) {
                        Developer::generateStructure('controller', 'module', $moduleId, $system);
                    }
                    if ($validated['blades'] ?? false) {
                        Developer::generateStructure('blade', 'module', $moduleId, $system);
                    }
                    if ($validated['permissions'] ?? false) {
                        Developer::generateStructure('permission', 'module', $moduleId, $system);
                    }
                    
                    unset($validated['controllers'], $validated['blades'], $validated['permissions']);
                    $reloadTable = true;
                    $title = 'Module Updated';
                    $message = 'Module configuration updated successfully.';
                    break;
                
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            
            if ($byMeta || $timestampMeta) {
                if ($byMeta) {
                    $validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
                if ($timestampMeta) {
                    $validated['updated_at'] = now();
                }
            }
            
            $affected = Data::update('central', $reqSet['table'], $validated, [$reqSet['act'] => ['operator' => 'IN', 'value' => $ids]], $reqSet['key']);
            
            return response()->json(['status' => $affected > 0,'reload_table' => $reloadTable,'reload_card' => $reloadCard,'hold_popup' => $hold_popup,'token' => $reqSet['token'],'affected' => $affected,'title' => $affected > 0 ? $title : 'Failed','message' => $affected > 0 ? $message : 'No changes were made.']);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.');
        }
    }
}
