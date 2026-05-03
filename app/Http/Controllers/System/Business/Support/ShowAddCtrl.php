<?php
namespace App\Http\Controllers\System\Central\Developer;
use App\Http\Controllers\Controller;
use App\Facades\{BusinessDB, CentralDB, Database, Developer, Skeleton};
use App\Http\Helpers\PopupHelper;
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
     * @param Request $request HTTP request object.
     * @param array $params Route parameters with token.
     * @return JsonResponse Form configuration or error message.
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
            }
            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            $popup = null;
            switch ($reqSet['key']) {
                case 'central_skeleton_tokens':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $modules = CentralDB::table('skeleton_modules')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'key', 'label' => 'Key', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'key', 'maxlength' => '100', 'data-unique' => Skeleton::skeletonToken('central_skeleton_tokens_unique') . '_u', 'data-unique-msg' => 'This key is already registered']],
                            ['type' => 'select', 'name' => 'module', 'label' => 'Module', 'options' => $modules, 'required' => true, 'col' => '12', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'select', 'name' => 'system', 'label' => 'System', 'options' => $system, 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'text', 'name' => 'table', 'label' => 'Table', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'key', 'maxlength' => '100']],
                            ['type' => 'text', 'name' => 'column', 'label' => 'Column', 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'value', 'label' => 'Value', 'required' => true, 'col' => '4'],
                            ['type' => 'select', 'name' => 'validate', 'label' => 'Validate', 'options' => ['0' => 'No', '1' => 'Yes'], 'required' => true, 'col' => '4', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'text', 'name' => 'act', 'label' => 'Action Column', 'required' => true, 'col' => '4'],
                            ['type' => 'select', 'name' => 'actions', 'label' => 'Actions', 'options' => ['c' => 'Checkbox', 'v' => 'View', 'e' => 'Edit', 'd' => 'Delete'], 'col' => '12', 'attr' => ['data-source' => 'dropdown', 'multiple' => 'multiple']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Token',
                        'button' => 'Save Token',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                default:
                    return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                              >>> MODIFY THIS SECTION (END) <<<                                   *
             *                                                                                                  *
             ****************************************************************************************************/
            // Generate content based on form type
            $content = $popup['form'] === 'builder' ? PopupHelper::generateBuildForm($token, $popup['fields'], $popup['labelType']) : $popup['content'];
            // Generate response
            return response()->json([
                'token' => $token,
                'type' => $popup['type'],
                'size' => $popup['size'],
                'position' => $popup['position'],
                'label' => $popup['label'],
                'content' => $content,
                'script' => $popup['script'],
                'button' => $popup['button'],
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.']);
        }
    }
}
