<?php
namespace App\Http\Controllers\System\Central\Developer;
use App\Facades\{CentralDB, Data, Skeleton, Select, Database, Developer, Helper};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config};
use App\Models\Skeleton\SkeletonModule;
/**
 * Controller for rendering the edit form for developer entities.
 */
class ShowEditCtrl extends Controller
{
    /**
     * Renders a popup form for editing developer entities.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            
            $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => [$reqSet['act'] => $reqSet['id']]]);
            $dataItem = $result['data'][0] ?? null;
            $data = is_array($dataItem) ? (object) $dataItem : $dataItem;
            if (!$data) {
                return ResponseHelper::moduleError('Record Not Found', 'The requested record was not found.', 404);
            }
            
            $popup = [];
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            
            switch ($reqSet['key']) {
                
                case 'central_skeleton_tokens':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'key', 'label' => 'Key', 'value' => $data->key, 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'key', 'maxlength' => '100', 'readonly' => 'readonly', 'data-unique-msg' => 'This key is already registered']],
                            ['type' => 'select', 'name' => 'system', 'label' => 'System', 'options' => ['central' => 'Central', 'business' => 'Business'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->system, 'data-target' => Skeleton::skeletonToken('central_skeleton_tokens_module') . '_s']],
                            ['type' => 'select', 'name' => 'module', 'label' => 'Module', 'options' => Select::options('skeleton_modules', 'array', ['name' => 'name']), 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->module, 'data-source' => Skeleton::skeletonToken('central_skeleton_tokens_module') . '_s']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'value' => $data->type, 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'text', 'name' => 'table', 'label' => 'Table', 'value' => $data->table, 'required' => true, 'col' => '4', 'attr' => ['data-validate' => 'key', 'maxlength' => '100']],
                            ['type' => 'text', 'name' => 'column', 'label' => 'Column', 'value' => $data->column, 'required' => true, 'col' => '4'],
                            ['type' => 'text', 'name' => 'value', 'label' => 'Value', 'value' => $data->value, 'required' => true, 'col' => '4'],
                            ['type' => 'select', 'name' => 'validate', 'label' => 'Validate', 'value' => $data->validate, 'options' => ['0' => 'No', '1' => 'Yes'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'text', 'name' => 'act', 'label' => 'Action Column', 'class' => ['h-auto'], 'value' => $data->act, 'required' => true, 'col' => '4'],
                            [
                                'type' => 'select',
                                'name' => 'actions',
                                'label' => 'Actions',
                                'options' => ['c' => 'Checkbox', 'v' => 'View', 'e' => 'Edit', 'd' => 'Delete'],
                                'col' => '12',
                                'attr' => [
                                    'data-select' => 'dropdown',
                                    'multiple' => 'multiple',
                                    'data-value' => is_string($data->actions) ? json_encode(array_filter(str_split($data->actions), fn($val) => in_array($val, ['c', 'v', 'e', 'd']))) : '[]'
                                ]
                            ],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Skeleton Token',
                        'button' => 'Update Token',
                        'script' => 'window.skeleton.select();window.skeleton.unique();window.skeleton.pills();'
                    ];
                    break;
                
                case 'central_skeleton_modules':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'value' => $data->name, 'attr' => ['readonly' => 'readonly']],
                            ['type' => 'text', 'name' => 'icon', 'label' => 'Icon', 'required' => true, 'col' => '6', 'value' => $data->icon],
                            ['type' => 'number', 'name' => 'order', 'label' => 'Order', 'required' => true, 'col' => '6', 'value' => $data->order],
                            ['type' => 'select', 'name' => 'system', 'label' => 'System', 'options' => ['central' => 'Central', 'business' => 'Business'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->system]],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Approved', '0' => 'Rejected'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->is_approved]],
                            ['type' => 'select', 'name' => 'is_navigable', 'label' => 'Is Navigable', 'options' => ['1' => 'Yes', '0' => 'No'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->is_navigable]],
                            ['type' => 'label', 'name' => 'label', 'label' => 'Create Structures', 'required' => false, 'col' => '12'],
                            ['type' => 'switch', 'name' => 'controllers', 'label' => 'Controllers', 'required' => false, 'col' => '4'],
                            ['type' => 'switch', 'name' => 'blades', 'label' => 'Blades', 'required' => false, 'col' => '4'],
                            ['type' => 'switch', 'name' => 'permissions', 'label' => 'Permissions', 'required' => false, 'col' => '4'],
                            ['type' => 'hidden', 'name' => 'module_id', 'label' => 'Module', 'required' => false, 'col' => '12', 'value' => $data->module_id],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Skeleton Module',
                        'button' => 'Update Module',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_skeleton_sections':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'value' => $data->name, 'attr' => ['readonly' => 'readonly']],
                            ['type' => 'text', 'name' => 'icon', 'label' => 'Icon', 'required' => true, 'col' => '6', 'value' => $data->icon],
                            ['type' => 'number', 'name' => 'order', 'label' => 'Order', 'required' => true, 'col' => '6', 'value' => $data->order],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Approve', '0' => 'Reject'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->is_approved]],
                            ['type' => 'select', 'name' => 'is_navigable', 'label' => 'Is Navigable', 'options' => ['1' => 'Yes', '0' => 'No'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->is_navigable]],
                            ['type' => 'label', 'name' => 'label', 'label' => 'Create Structures', 'required' => false, 'col' => '4'],
                            ['type' => 'switch', 'name' => 'blades', 'label' => 'Blades', 'required' => false, 'col' => '4'],
                            ['type' => 'switch', 'name' => 'permissions', 'label' => 'Permissions', 'required' => false, 'col' => '4'],
                            ['type' => 'hidden', 'name' => 'section_id', 'label' => 'Section', 'required' => false, 'col' => '12', 'value' => $data->section_id],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Skeleton Section',
                        'button' => 'Update Section',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_skeleton_items':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'value' => $data->name, 'attr' => ['readonly' => 'readonly']],
                            ['type' => 'text', 'name' => 'icon', 'label' => 'Icon', 'required' => true, 'col' => '6', 'value' => $data->icon],
                            ['type' => 'number', 'name' => 'order', 'label' => 'Order', 'required' => true, 'col' => '6', 'value' => $data->order],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Approve', '0' => 'Reject'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->is_approved]],
                            ['type' => 'select', 'name' => 'is_navigable', 'label' => 'Is Navigable', 'options' => ['1' => 'Yes', '0' => 'No'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->is_navigable]],
                            ['type' => 'label', 'name' => 'label', 'label' => 'Create Structures', 'required' => false, 'col' => '4'],
                            ['type' => 'switch', 'name' => 'blades', 'label' => 'Blades', 'required' => false, 'col' => '4'],
                            ['type' => 'switch', 'name' => 'permissions', 'label' => 'Permissions', 'required' => false, 'col' => '4'],
                            ['type' => 'hidden', 'name' => 'item_id', 'label' => 'Item', 'required' => false, 'col' => '12', 'value' => $data->item_id],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Skeleton Item',
                        'button' => 'Update Item',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_skeleton_permissions':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Approve', '0' => 'Reject'], 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->is_approved]],
                            ['type' => 'textarea', 'name' => 'description', 'value' => $data->description, 'label' => 'Description', 'required' => false, 'col' => '12'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Permission',
                        'button' => 'Update Permission',
                        'script' => 'window.skeleton.select();'
                    ];
                    break;
                
                case 'central_skeleton_custom_permissions':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'value' => $data->name, 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'permission', 'data-unique-msg' => 'This key is already registered']],
                            ['type' => 'textarea', 'name' => 'description', 'value' => $data->description, 'label' => 'Description', 'required' => false, 'col' => '12'],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Active', '0' => 'Deactive'], 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->is_approved]],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Custom Permission',
                        'button' => 'Update Permission',
                        'script' => 'window.skeleton.select();'
                    ];
                    break;
                
                case 'central_skeleton_role_permissions':
                    
                    $permissions = Skeleton::loadPermissions('all', 'role', 'role-id', $reqSet['id']);
                    $popup = [
                            'form' => 'custom',
                            'labelType' => 'floating',
                            'content' => '
                                <input type="hidden" name="save_token" value="' . $reqSet['token'] . '_e_' . $reqSet['id'] . '">
                                <div data-permissions-container>
                                    <div id="accordion-permissions" class="accordion"></div>
                                    <input type="hidden" id="permission_ids" name="permission_ids" value="[]">
                                    <div id="errorMessage" class="alert alert-danger d-none"></div>
                                </div>
                            ',
                            'type' => 'modal',
                            'size' => 'modal-xl',
                            'position' => 'end',
                            'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Role Permissions',
                            'button' => 'Update Permissions',
                            'script' => '
                                window.skeleton.select();
                                window.skeleton.permissions(' . json_encode($permissions, JSON_UNESCAPED_SLASHES) . ');
                            ',
                        ];
                        break;
                
                case 'central_skeleton_user_permissions':
                    
                    if($data->business_id != 'CENTRAL'){
                        $set = 'all-'.$data->business_id;
                        $permissions = Skeleton::loadPermissions($set, 'user', 'user-id', $reqSet['id']);
                    } else {
                        $permissions = Skeleton::loadPermissions('all', 'user', 'user-id', $reqSet['id']);
                    }
                    
                    $popup = [
                            'form' => 'custom',
                            'labelType' => 'floating',
                            'content' => '
                                <input type="hidden" name="save_token" value="' . $reqSet['token'] . '_e_' . $reqSet['id'] . '">
                                <div class="row justify-content-start mt-3">
                                    <div class="col-md-3">
                                        <div class="float-input-control">
                                            <select class="form-float-input" placeholder="business_id" name="business_id" data-select="dropdown">
                                                ' . Select::options('businesses', 'html', ['business_id' => 'name']) . '
                                            </select>
                                            <label class="form-float-label">
                                                Business <span class="text-danger">*</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div data-permissions-container>
                                    <div id="accordion-permissions" class="accordion"></div>
                                    <input type="hidden" id="permission_ids" name="permission_ids" value="[]">
                                    <div id="errorMessage" class="alert alert-danger d-none"></div>
                                </div>
                            ',
                            'type' => 'modal',
                            'size' => 'modal-xl',
                            'position' => 'end',
                            'label' => '<i class="fa-regular fa-folder me-1"></i> Edit User Permissions',
                            'button' => 'Update Permissions',
                            'script' => '
                                window.skeleton.select();
                                window.skeleton.permissions(' . json_encode($permissions, JSON_UNESCAPED_SLASHES) . ');
                            ',
                        ];
                    break;
                
                case 'central_skeleton_folderss':
                    
                    $folderPaths = Helper::getFolderPaths();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'key', 'label' => 'Key', 'required' => true, 'col' => '12', 'value' => $data->key, 'attr' => ['readonly' => 'readonly']],
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'value' => $data->name, 'attr' => ['data-validate' => 'module']],
                            [
                                'type' => 'select',
                                'name' => 'parent_folder_id',
                                'label' => 'Parent Folder',
                                'options' => ['' => 'None'] + $folderPaths,
                                'required' => false,
                                'col' => '12',
                                'value' => $data->parent_folder_id,
                                'attr' => ['data-select' => 'dropdown', 'data-value' => $data->parent_folder_id]
                            ],
                            ['type' => 'text', 'name' => 'type', 'label' => 'Type', 'required' => true, 'col' => '6', 'value' => $data->type, 'attr' => ['data-validate' => 'type']],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Approve', '0' => 'Reject'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-value' => $data->name]],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'required' => false, 'value' => $data->description, 'col' => '12'],
                            ['type' => 'hidden', 'name' => 'folder_id', 'value' => $data->folder_id],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Folder Key',
                        'button' => 'Update Folder',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                    case 'central_skeleton_folders':
                    
                    $folderPaths = Helper::getFolderPaths();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'file', 'name' => 'profile', 'label' => 'Key', 'required' => true, 'col' => '12'],
                            ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Folder Key',
                        'button' => 'Update Folder',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_folder_permissions':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'folder_id', 'label' => 'Folder', 'options' => Select::options('skeleton_folders', 'array', ['folder_id' => 'name']), 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown'], 'value' => $data->folder_id],
                            ['type' => 'select', 'name' => 'permissions', 'label' => 'Permissions', 'options' => ['view' => 'View', 'edit' => 'Edit'], 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown', 'multiple' => 'multiple'], 'value' => $data->permissions ? explode(',', $data->permissions) : []],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Folder Permission',
                        'button' => 'Update Permission',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_file_extensions':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'extension', 'label' => 'Extension', 'required' => true, 'col' => '12', 'value' => $data->extension],
                            ['type' => 'text', 'name' => 'icon_path', 'label' => 'Icon Path', 'required' => true, 'col' => '12', 'value' => $data->icon_path],
                            ['type' => 'text', 'name' => 'mime_type', 'label' => 'Mime Type', 'required' => true, 'col' => '12', 'value' => $data->mime_type],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit File Extension',
                        'button' => 'Update Extension',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                    
                case 'central_skeleton_templates':
                    $html = $script = $mdlSize = '';
                    $fields = [
                        ['type' => 'text', 'name' => 'key', 'label' => 'Key', 'required' => true, 'col' => '4', 'value' => $data->key, 'attr' => ['data-validate' => 'key', 'maxlength' => '100', 'data-unique' => Skeleton::skeletonToken('central_skeleton_template_unique') . '_u', 'data-unique-msg' => 'This key is already registered']],
                        ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '4', 'value' => $data->name],
                        ['type' => 'text', 'name' => 'purpose', 'label' => 'Purpose', 'required' => true, 'col' => '4', 'value' => $data->purpose],
                        ['type' => 'text', 'name' => 'subject', 'label' => 'Subject', 'required' => true, 'col' => '6', 'value' => $data->subject],
                        ['type' => 'text', 'name' => 'placeholders', 'label' => 'Placeholders', 'class' => ['h-auto'], 'value' => $data->placeholders, 'required' => false, 'col' => '6', 'attr' => ['data-pills' => '']],
                    ];
                    if ($data->type == 'email') {
                        $mdlSize = 'modal-xl';
                        $fields[] = ['type' => 'hidden', 'name' => 'type', 'label' => 'Type', 'value' => 'email', 'value' => $data->type];
                        $html = PopupHelper::generateBuildForm($token, $fields, 'floating');
                        $html .= '<div data-template-id="for-email-template"></div>';
                        if (is_string($data->content) && json_decode($data->content, true)) {
                            $encodedContent = json_encode(json_decode($data->content, true), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                        } else {
                            return ResponseHelper::moduleError('Invalid Content', 'The content field is not a valid JSON string.');
                        }
                        $script = 'window.skeleton.pills();window.skeleton.template("email", "for-email-template", "' . addslashes($data->placeholders) . '", "' . addslashes($encodedContent) . '");';
                        } else {
                        $mdlSize = 'modal-lg';
                        $fields[] = ['type' => 'textarea', 'name' => 'content', 'label' => 'Content', 'required' => true, 'value' => $data->content];
                        $fields[] = ['type' => 'hidden', 'name' => 'type', 'label' => 'Type', 'value' => 'whatsapp', 'value' => $data->type];
                        $html = PopupHelper::generateBuildForm($token, $fields, 'floating');
                        $script = 'window.skeleton.pills();';
                    }
                    $popup = [
                        'form' => 'custom',
                        'labelType' => 'floating',
                        'content' => $html,
                        'type' => 'modal',
                        'size' => $mdlSize ?: 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Template',
                        'button' => 'Edit Template',
                        'script' => $script.'window.skeleton.unique();'
                    ];
                    break;
                
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            
            $content = $popup['form'] === 'builder' ? PopupHelper::generateBuildForm($token, $popup['fields'], $popup['labelType']) : $popup['content'];
            
            return response()->json([
                'token' => $token,
                'type' => $popup['type'],
                'size' => $popup['size'],
                'position' => $popup['position'],
                'label' => $popup['label'],
                'content' => $content,
                'script' => $popup['script'],
                'button_class' => $popup['button_class'] ?? '',
                'button' => $popup['button'] ?? '',
                'footer' => $popup['footer'] ?? '',
                'header' => $popup['header'] ?? '',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true,
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }




    /**
     * Renders a popup to confirm bulk update of records.
     *
     * @param Request $request HTTP request object containing input data.
     * @param array $params Route parameters including token.
     * @return JsonResponse Custom UI configuration for the popup or an error message.
     */
    public function bulk(Request $request, array $params = []): JsonResponse
    {
        try {
            
            $token = $params['token'] ?? $request->input('skeleton_token', '');
            if (empty($token)) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['system']) || !isset($reqSet['table']) || !isset($reqSet['act'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid or missing required data.', 400);
            }
            
            $ids = array_filter(explode('@', $request->input('id', '')));
            if (empty($ids)) {
                return ResponseHelper::moduleError('Invalid Data', 'No records specified for update.', 400);
            }
            
            $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => [
                $reqSet['act'] => ['operator' => 'IN', 'value' => $ids],
            ]], 'all');
            if (!$result['status'] || empty($result['data'])) {
                return ResponseHelper::moduleError('Records Not Found', $result['message'] ?: 'The requested records were not found.', 404);
            }
            $records = $result['data'];
            
            $popup = [];
            $recordCount = count($records);
            $maxDisplayRecords = 5;
            
            $detailsHtml = sprintf('<div class="alert alert-warning" role="alert"><div class="accordion" id="updateAccordion-%s"><div class="accordion-item border-0"><h2 class="accordion-header p-0 my-0"><button class="accordion-button collapsed p-2 text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-%s" aria-expanded="false" aria-controls="collapse-%s">Confirm Bulk Update of %d Record(s)</button></h2><div id="collapse-%s" class="accordion-collapse collapse" data-bs-parent="#updateAccordion-%s"><div class="accordion-body p-2 bg-light"><div class="accordion" id="updateRecords-%s">', $token, $token, $token, $recordCount, $token, $token, $token);
            if ($recordCount > $maxDisplayRecords) {
                $detailsHtml .= sprintf('<div class="d-flex justify-content-between align-items-center"><div class="text-muted">Updating <b>%d</b> records.</div><button class="btn btn-link btn-sm text-decoration-none text-primary sf-12" type="button" data-bs-toggle="collapse" data-bs-target="#details-%s" aria-expanded="false" aria-controls="details-%s">Details</button></div><div class="collapse mt-2" id="details-%s"><div class="table-responsive" style="max-height: 200px;">', $recordCount, $token, $token, $token);
            }
            $detailsHtml .= '<table class="table table-sm table-bordered mb-0">';
            $displayRecords = $recordCount > $maxDisplayRecords ? array_slice($records, 0, 5) : $records;
            foreach ($displayRecords as $index => $record) {
                $recordArray = (array)$record;
                $recordId = htmlspecialchars($recordArray[$reqSet['act']] ?? 'N/A');
                $detailsHtml .= sprintf('<tr><td colspan="2"><b>Record %d (ID: %s)</b></td></tr>', $index + 1, $recordId);
                if (empty($recordArray)) {
                    $detailsHtml .= '<tr><td colspan="2" class="text-muted">No displayable details available</td></tr>';
                } else {
                    foreach ($recordArray as $key => $value) {
                        $detailsHtml .= sprintf('<tr><td>%s</td><td><b>%s</b></td></tr>', htmlspecialchars(ucwords(str_replace('_', ' ', $key))), htmlspecialchars($value ?? ''));
                    }
                }
            }
            $detailsHtml .= $recordCount > $maxDisplayRecords ? sprintf('<tr><td colspan="2" class="text-muted">... and %d more records</td></tr></table></div></div>', $recordCount - count($displayRecords)) : '</table>';
            $detailsHtml .= sprintf('</div><div class="mt-2"><i class="sf-10"><span class="text-danger">Note: </span>Only non-unique fields can be updated in bulk. Changes will apply to all %d selected records. Ensure values are valid to avoid data conflicts.</i></div></div></div></div></div></div>', $recordCount);
            
            $popup = [];
            $detailsHtmlPlacement = 'top';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            
            switch ($reqSet['key']) {
                
                case 'central_skeleton_modules':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'number', 'name' => 'order', 'label' => 'Order', 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'system', 'label' => 'System', 'options' => ['central' => 'Central', 'business' => 'Business'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Approved', '0' => 'Rejected'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'is_navigable', 'label' => 'Is Navigable', 'options' => ['1' => 'Yes', '0' => 'No'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'label', 'name' => 'label', 'label' => 'Create Structures', 'required' => false, 'col' => '12'],
                            ['type' => 'switch', 'name' => 'controllers', 'label' => 'Controllers', 'required' => false, 'col' => '4'],
                            ['type' => 'switch', 'name' => 'blades', 'label' => 'Blades', 'required' => false, 'col' => '4'],
                            ['type' => 'switch', 'name' => 'permissions', 'label' => 'Permissions', 'required' => false, 'col' => '4'],
                            ['type' => 'hidden', 'name' => 'module_id', 'label' => 'Module', 'required' => false, 'col' => '12'],
                        ],
                        'type' => 'offcanvas',
                        'size' => '-',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Bulk Edit Skeleton Module',
                        'button' => 'Update Modules',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            
            $content = '<input type="hidden" name="update_ids" value="'.$request->input('id', '').'">';
            $content .= $popup['form'] === 'builder' ? PopupHelper::generateBuildForm($token, $popup['fields'], $popup['labelType']) : $popup['content'];
            $content = $detailsHtmlPlacement === 'top' ? $detailsHtml . $content : $content . $detailsHtml;
            
            return response()->json([
                'token' => $token,
                'type' => $popup['type'],
                'size' => $popup['size'],
                'position' => $popup['position'],
                'label' => $popup['label'],
                'content' => $content,
                'script' => $popup['script'],
                'button_class' => $popup['button_class'] ?? '',
                'button' => $popup['button'] ?? '',
                'footer' => $popup['footer'] ?? '',
                'header' => $popup['header'] ?? '',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true,
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
    
}
 