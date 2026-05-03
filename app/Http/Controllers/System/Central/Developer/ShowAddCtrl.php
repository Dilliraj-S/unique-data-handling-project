<?php
namespace App\Http\Controllers\System\Central\Developer;
use App\Facades\{Select, Developer, Skeleton, Helper};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;
/**
 * Controller for rendering the add form for developer entities.
 */
class ShowAddCtrl extends Controller
{
    /**
     * Renders a popup form for adding new developer entities.
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
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            
            $popup = [];
            $system = ['central' => 'Central', 'business' => 'Business'];
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
                            ['type' => 'text', 'name' => 'key', 'label' => 'Key', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'key', 'maxlength' => '100', 'data-unique' => Skeleton::skeletonToken('central_skeleton_tokens_unique') . '_u', 'data-unique-msg' => 'This key is already registered']],
                            ['type' => 'select', 'name' => 'system', 'label' => 'System', 'options' => $system, 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-target' => Skeleton::skeletonToken('central_skeleton_tokens_module') . '_s']],
                            ['type' => 'select', 'name' => 'module', 'label' => 'Module', 'options' => Select::options('skeleton_modules', 'array', ['name' => 'name']), 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-source' => Skeleton::skeletonToken('central_skeleton_tokens_module') . '_s']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'text', 'name' => 'table', 'label' => 'Table', 'required' => true, 'col' => '4', 'attr' => ['data-validate' => 'key', 'maxlength' => '100']],
                            ['type' => 'text', 'name' => 'column', 'label' => 'Column', 'required' => true, 'col' => '4'],
                            ['type' => 'text', 'name' => 'value', 'label' => 'Value', 'required' => true, 'col' => '4'],
                            ['type' => 'select', 'name' => 'validate', 'label' => 'Validate', 'options' => ['0' => 'No', '1' => 'Yes'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'text', 'name' => 'act', 'label' => 'Action Column', 'required' => true, 'col' => '4'],
                            ['type' => 'select', 'name' => 'actions', 'label' => 'Actions', 'options' => ['c' => 'Checkbox', 'v' => 'View', 'e' => 'Edit', 'd' => 'Delete'], 'col' => '12', 'attr' => ['data-select' => 'dropdown', 'multiple' => 'multiple']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Skeleton Token',
                        'button' => 'Save Token',
                        'script' => 'window.skeleton.select();window.skeleton.unique();window.skeleton.pills();'
                    ];
                    break;
                
                case 'central_skeleton_modules':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['data-unique' => Skeleton::skeletonToken('central_skeleton_module_unique') . '_u', 'data-unique-msg' => 'This key is already registered']],
                            ['type' => 'text', 'name' => 'icon', 'label' => 'Icon', 'required' => true, 'col' => '6'],
                            ['type' => 'number', 'name' => 'order', 'label' => 'Order', 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'system', 'label' => 'System', 'options' => $system + ['open' => 'Open'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Approve', '0' => 'Reject'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'is_navigable', 'label' => 'Is Navigable', 'options' => ['1' => 'Yes', '0' => 'No'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Skeleton Module',
                        'button' => 'Save Module',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_skeleton_sections':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12'],
                            ['type' => 'text', 'name' => 'icon', 'label' => 'Icon', 'required' => true, 'col' => '6'],
                            ['type' => 'number', 'name' => 'order', 'label' => 'Order', 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'module_id', 'label' => 'Module', 'options' => Select::options('skeleton_modules', 'array', ['module_id' => 'name']), 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Active', '0' => 'Deactive'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'is_navigable', 'label' => 'Is Navigable', 'options' => ['1' => 'Yes', '0' => 'No'], 'required' => true, 'col' => '4', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Skeleton Section',
                        'button' => 'Save Section',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_skeleton_items':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12'],
                            ['type' => 'text', 'name' => 'icon', 'label' => 'Icon', 'required' => true, 'col' => '6'],
                            ['type' => 'number', 'name' => 'order', 'label' => 'Order', 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'module_id', 'label' => 'Module', 'options' => Select::options('skeleton_modules', 'array', ['module_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-target' => Skeleton::skeletonToken('central_skeleton_item_sections_select') . '_s']],
                            ['type' => 'select', 'name' => 'section_id', 'label' => 'Section', 'options' => Select::options('skeleton_sections', 'array', ['section_id' => 'name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'data-source' => Skeleton::skeletonToken('central_skeleton_item_sections_select') . '_s']],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Active', '0' => 'Deactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'is_navigable', 'label' => 'Is Navigable', 'options' => ['1' => 'Yes', '0' => 'No'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Skeleton Item',
                        'button' => 'Save Item',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_skeleton_custom_permissions':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'permission', 'data-unique-msg' => 'This key is already registered']],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'required' => false, 'col' => '12'],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Active', '0' => 'Deactive'], 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Custom Permission',
                        'button' => 'Save Permission',
                        'script' => 'window.skeleton.select();'
                    ];
                    break;
                
                case 'central_skeleton_role_permissions':
                    
                    $permissions = Skeleton::loadPermissions('self', 'USR0001', 'role');
                    $popup = [
                        'form' => 'custom',
                        'labelType' => 'floating',
                        'content' => '<div data-permissions-container>
                                            <div id="accordion-permissions" class="accordion"></div>
                                                <input type="hidden" id="permission_ids" name="permission_ids" value="[]">
                                            <div id="errorMessage" class="alert alert-danger d-none"></div>
                                        </div>',
                        'type' => 'modal',
                        'size' => 'modal-xl',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Assign Permissions',
                        'button' => 'Save Permissions',
                        'script' => 'window.skeleton.permissions(' . json_encode($permissions, JSON_UNESCAPED_SLASHES) . ');'
                    ];
                    break;
                
                case 'central_skeleton_folders':
                    
                    $folderPaths = Helper::getFolderPaths();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'key', 'label' => 'Key', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'key', 'data-unique' => Skeleton::skeletonToken('central_skeleton_folder_unique') . '_u', 'data-unique-msg' => 'This key is already registered']],
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'module']],
                            [
                                'type' => 'select',
                                'name' => 'parent_folder_id',
                                'label' => 'Parent Folder',
                                'options' => ['' => 'None'] + $folderPaths,
                                'required' => false,
                                'col' => '12',
                                'attr' => ['data-select' => 'dropdown']
                            ],
                            ['type' => 'text', 'name' => 'type', 'label' => 'Type', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'type']],
                            ['type' => 'select', 'name' => 'is_approved', 'label' => 'Approval', 'options' => ['1' => 'Approve', '0' => 'Reject'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'required' => false, 'col' => '12'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Folder Key',
                        'button' => 'Add Folder',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_folder_permissions':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'folder_id', 'label' => 'Folder', 'options' => Select::options('skeleton_folders', 'array', ['folder_id' => 'name']), 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'permissions', 'label' => 'Permissions', 'options' => ['view' => 'View', 'edit' => 'Edit'], 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown', 'multiple' => 'multiple']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Permission',
                        'button' => 'Add Permission',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_file_extensions':
                    
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'extension', 'label' => 'Extension', 'required' => true, 'col' => '12'],
                            ['type' => 'text', 'name' => 'icon_path', 'label' => 'Icon Path', 'required' => true, 'col' => '12'],
                            ['type' => 'text', 'name' => 'mime_type', 'label' => 'Mime Type', 'required' => true, 'col' => '12'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Extension',
                        'button' => 'Add Extension',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                
                case 'central_skeleton_templates':
                    $html = $script = $mdlSize = '';
                    $fields = [
                        ['type' => 'text', 'name' => 'key', 'label' => 'Key', 'required' => true, 'col' => '4', 'attr' => ['data-validate' => 'key', 'maxlength' => '100', 'data-unique' => Skeleton::skeletonToken('central_skeleton_template_unique') . '_u', 'data-unique-msg' => 'This key is already registered']],
                        ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '4'],
                        ['type' => 'text', 'name' => 'purpose', 'label' => 'Purpose', 'required' => true, 'col' => '4'],
                        ['type' => 'text', 'name' => 'subject', 'label' => 'Subject', 'required' => true, 'col' => '6'],
                        ['type' => 'text', 'name' => 'placeholders', 'label' => 'Placeholders', 'class' => ['h-auto'], 'required' => false, 'col' => '6', 'attr' => ['data-pills' => '']],
                    ];
                    if ($reqSet['id'] == 'email') {
                        $mdlSize = 'modal-xl';
                        $fields[] = ['type' => 'hidden', 'name' => 'type', 'label' => 'Type', 'value' => 'email'];
                        $html = PopupHelper::generateBuildForm($token, $fields, 'floating');
                        $html .= '<div data-template-id="for-email-template"></div>';
                        $script = 'window.skeleton.pills();window.skeleton.template("email", "for-email-template", "", "");';
                    } else {
                        $mdlSize = 'modal-lg';
                        $fields[] = ['type' => 'textarea', 'name' => 'content', 'label' => 'Content', 'required' => true];
                        $fields[] = ['type' => 'hidden', 'name' => 'type', 'label' => 'Type', 'value' => 'whatsapp'];
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
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Template',
                        'button' => 'Add Template',
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
                'title' => 'Form Generated',
                'message' => 'Add form for ' . $reqSet['key'] . ' generated successfully.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
