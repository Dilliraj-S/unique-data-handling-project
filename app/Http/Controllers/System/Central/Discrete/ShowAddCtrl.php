<?php
namespace App\Http\Controllers\System\Central\Discrete;
use App\Facades\{Data, Developer, Random, Skeleton, Select};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, DB};
/**
 * Controller for rendering the add form for Discrete entities.
 */
class ShowAddCtrl extends Controller
{
    /**
     * Renders a popup form for adding new Discrete entities.
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

            switch (
                $reqSet['key']
            ) {
                case 'central_unique_categories':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'category', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'name', 'maxlength' => '255', 'data-unique' => Skeleton::skeletonToken('central_unique_categories') . '_u', 'data-unique-msg' => 'This name is already registered']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Discrete Entity',
                        'button' => 'Save Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                    case 'central_unique_options':
                        $popup = [
                            'form' => 'builder',
                            'labelType' => 'floating',
                            'fields' => [
                                ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => Select::options('categories', 'array', ['category_id' => 'category']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                                ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'name', 'maxlength' => '255', 'data-unique' => Skeleton::skeletonToken('central_unique_options') . '_u', 'data-unique-msg' => 'This name is already registered']],
                            ],
                            'type' => 'modal',
                            'size' => 'modal-md',
                            'position' => 'end',
                            'label' => '<i class="fa-regular fa-folder me-1"></i> Add Discrete Entity',
                            'button' => 'Save Entity',
                            'script' => 'window.skeleton.select();window.skeleton.unique();'
                        ];
                        break;



                case 'news_feeds':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'title', 'label' => 'Title', 'required' => true, 'col' => '6'],
                            ['type' => 'textarea', 'name' => 'content', 'label' => 'Content', 'required' => true, 'col' => '12'],
                            ['type' => 'file', 'name' => 'attachment_url', 'label' => 'Upload Image', 'accept' => 'image/*', 'required' => false, 'col' => '6'],
                            [
                                'type' => 'select',
                                'name' => 'category_id',
                                'label' => 'Category',
                                'options' => [
                                    'projects' => 'Projects',
                                    'news' => 'News'
                                ],
                                'required' => true,
                                'col' => '6'
                            ],
                            [
                                'type' => 'select',
                                'name' => 'priority',
                                'label' => 'Priority',
                                'options' => [
                                    'low' => 'Low',
                                    'medium' => 'Medium',
                                    'high' => 'High'
                                ],
                                'required' => true,
                                'col' => '6'
                            ],
                            [
                                'type' => 'select',
                                'name' => 'status',
                                'label' => 'Status',
                                'options' => [
                                    'draft' => 'Draft',
                                    'published' => 'Published',
                                    'archived' => 'Archived'
                                ],
                                'required' => true,
                                'col' => '6'
                            ]
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Discrete Entity',
                        'button' => 'Save Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;

                case 'central_users':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'account_status', 'label' => 'Status', 'options' => ['active' => 'Active', 'deactive' => 'Deactive'], 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'role', 'label' => 'Role', 'options' => ['user' => 'User', 'admin' => 'Admin'], 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'username', 'label' => 'User Name', 'value' => 'user@' . substr(md5(uniqid()), 0, 5), 'required' => true, 'col' => '6'],
                            ['type' => 'password', 'name' => 'password', 'label' => 'Password', 'value' => '12345678', 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'access_db', 'label' => 'Access DB', 'options' => ['sun' => 'Sun', 'moon' => 'Moon', 'earth' => 'Earth', 'mars' => 'Mars', 'jupiter' => 'Jupiter', 'saturn' => 'Saturn', 'uranus' => 'Uranus', 'neptune' => 'Neptune', 'pluto' => 'Pluto', 'venus' => 'Venus'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown', 'multiple' => 'multiple', 'data-comma-separated' => 'true']],
                            ['type' => 'text', 'name' => 'export_limit', 'label' => 'Export Limit', 'required' => true, 'col' => '6'],

                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add New User',
                        'button' => 'Add User',
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