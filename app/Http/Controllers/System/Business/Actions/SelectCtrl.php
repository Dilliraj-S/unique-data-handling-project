<?php

namespace App\Http\Controllers\System\Business\Action;

use App\Facades\Skeleton;
use App\Http\Controllers\Controller;
use Illuminate\Http\{Request, Response};
use Illuminate\Support\Facades\{DB, Log, View};
use App\Http\Helpers\PopupHelper;
use Exception;

/**
 * Controller for displaying add form for Settings
 * Renders the form to add new Settings records
 */
class SelectCtrl extends Controller
{
    /**
     * Display popup for adding new entities.
     *
     * @param Request $request
     * @param array $params Route parameters (module, section, item, token)
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\Response
     */
    public function index(Request $request, array $params)
    {
        try {
            // Validate token from params (passed by SystemController)
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return $this->handleError($request, 'Missing token.', Response::HTTP_BAD_REQUEST);
            }

            $resolveToken = Skeleton::resolveToken($token);
            if (!$resolveToken['status'] || !isset($resolveToken['data']['config'])) {
                return $this->handleError($request, 'Invalid token.', Response::HTTP_FORBIDDEN);
            }

            // Request settings
            $reqSet = PopupHelper::set($resolveToken['data']['config']);
            if (!isset($reqSet['key'])) {
                return $this->handleError($request, 'Invalid configuration.', Response::HTTP_BAD_REQUEST);
            }
            $save_token = base64_encode(json_encode($reqSet));
            $popup = [];

            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/

            switch ($reqSet['key']) {
                case 'central_skeleton_tokens':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $modules = DB::table('skeleton_modules')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'key', 'label' => 'Key', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'key', 'maxlength' => '100']],
                            ['type' => 'select', 'name' => 'module', 'label' => 'Module', 'options' => $modules, 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'system', 'label' => 'System', 'options' => $system, 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'text', 'name' => 'table', 'label' => 'Table', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'key', 'maxlength' => '100']],
                            ['type' => 'text', 'name' => 'column', 'label' => 'Column', 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'value', 'label' => 'Value', 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'validate', 'label' => 'Validate', 'options' => ['0' => 'No', '1' => 'Yes'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'actions', 'label' => 'Actions', 'options' => ['c' => 'Checkbox', 'v' => 'View', 'e' => 'Edit', 'd' => 'Delete'], 'col' => '12', 'attr' => ['data-select' => 'dropdown', 'multiple' => 'multiple']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Token',
                        'button' => 'Save Token',
                        'script' => 'window.skeleton.select();',
                    ];
                    break;

                case 'supreme_modules':
                    $roles = DB::table('roles')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'module', 'label' => 'Module', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'module', 'maxlength' => '50']],
                            ['type' => 'text', 'name' => 'icon', 'label' => 'Icon', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'text-50', 'maxlength' => '50']],
                            ['type' => 'select', 'name' => 'role', 'label' => 'Role', 'options' => $roles, 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'number', 'name' => 'order', 'label' => 'Order', 'required' => true, 'col' => '12', 'attr' => ['min' => '0', 'max' => '9999']],
                            ['type' => 'select', 'name' => 'is_active', 'label' => 'Is Active', 'options' => ['1' => 'Active', '0' => 'Inactive'], 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'center',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Module',
                        'button' => 'Save Module',
                        'script' => 'window.skeleton.select();',
                    ];
                    break;

                case 'supreme_sections':
                    $modules = DB::table('skeleton_modules')->pluck('module', 'module_id')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'module_id', 'label' => 'Module', 'options' => $modules, 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'text', 'name' => 'section', 'label' => 'Section', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'text-50', 'maxlength' => '50']],
                            ['type' => 'text', 'name' => 'icon', 'label' => 'Icon', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'text-50', 'maxlength' => '50']],
                            ['type' => 'number', 'name' => 'order', 'label' => 'Order', 'required' => true, 'col' => '6', 'attr' => ['min' => '0', 'max' => '9999']],
                            ['type' => 'select', 'name' => 'is_active', 'label' => 'Is Active', 'options' => ['1' => 'Active', '0' => 'Inactive'], 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'center',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Section',
                        'button' => 'Save Section',
                        'script' => 'window.skeleton.select();',
                    ];
                    break;

                case 'supreme_items':
                    $sections = DB::table('skeleton_sections')->pluck('section', 'section_id')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'section_id', 'label' => 'Section', 'options' => $sections, 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'text', 'name' => 'item', 'label' => 'Item', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'text-50', 'maxlength' => '50']],
                            ['type' => 'text', 'name' => 'icon', 'label' => 'Icon', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'text-50', 'maxlength' => '50']],
                            ['type' => 'number', 'name' => 'order', 'label' => 'Order', 'required' => true, 'col' => '6', 'attr' => ['min' => '0', 'max' => '9999']],
                            ['type' => 'select', 'name' => 'is_active', 'label' => 'Is Active', 'options' => ['1' => 'Active', '0' => 'Inactive'], 'required' => true, 'col' => '12', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'center',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Item',
                        'button' => 'Save Item',
                        'script' => 'window.skeleton.select();',
                    ];
                    break;

                case 'sa_categories_custom':
                    $popup = [
                        'form' => 'custom',
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'center',
                        'label' => 'Add Category',
                        'content' => view('system.central.developer.popups.add_category', ['save_token' => $save_token])->render(),
                        'button' => 'Save Category',
                        'script' => '',
                        'status' => true,
                    ];
                    break;

                default:
                    return $this->handleError($request, 'Invalid configuration.', Response::HTTP_BAD_REQUEST);
            }

            // Generate response based on form type
            $response = [
                'type' => $popup['type'],
                'size' => $popup['size'],
                'position' => $popup['position'],
                'label' => $popup['label'],
                'content' => $popup['form'] === 'builder'
                    ? PopupHelper::generateBuildForm($reqSet, $popup['fields'], $popup['labelType'])
                    : $popup['content'],
                'script' => $popup['script'],
                'button' => $popup['button'],
                'validate' => $reqSet['validate'] ?? '0',
                'status' => $popup['status'] ?? true,
            ];

            return response()->json($response);

            /****************************************************************************************************
             *                                                                                                  *
             *                              >>> MODIFY THIS SECTION (END) <<<                                   *
             *                                                                                                  *
             ****************************************************************************************************/
        } catch (Exception $e) {
            Log::error('Error in ShowAddCtrl.', ['error' => $e->getMessage(), 'path' => $request->path()]);
            return $this->handleError($request, config('skeleton.developer_mode') ? $e->getMessage() : 'Internal server error.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Handles errors with developer mode support.
     *
     * @param Request $request
     * @param string $message
     * @param int $statusCode
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\Response
     */
    private function handleError(Request $request, string $message, int $statusCode)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => $message,
            ], $statusCode);
        }

        // Render error view based on status code
        $errorView = "errors.{$statusCode}";
        if (View::exists($errorView)) {
            return response()->view($errorView, ['error' => $message], $statusCode);
        }

        // Fallback to generic error view
        return response()->view('errors.generic', ['error' => $message, 'status' => $statusCode], $statusCode);
    }
}