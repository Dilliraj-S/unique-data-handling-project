<?php

namespace App\Http\Controllers\System\Central\Discrete;

use App\Facades\{Data, Developer, Random, Skeleton, Select};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};

/**
 * Controller for rendering the edit form for Discrete entities.
 */
class ShowEditCtrl extends Controller
{
    /**
     * Renders a popup form for editing Discrete entities.
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
                case 'central_unique_categories':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'category', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'name', 'maxlength' => '255', 'data-unique' => Skeleton::skeletonToken('central_unique_categories') . '_u', 'data-unique-msg' => 'This name is already registered'], 'value' => $data->category],
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
                        // Get the category_id for the current option's category
                        $categoryResult = Data::get('central', 'categories', [
                            'select' => ['category_id'],
                            'where' => ['category' => $data->category]
                        ], $reqSet['key']);
                        
                        $categoryId = $categoryResult['status'] && !empty($categoryResult['data']) 
                            ? $categoryResult['data'][0]['category_id'] 
                            : '';
                        
                        $popup = [
                            'form' => 'builder',
                            'labelType' => 'floating',
                            'fields' => [
                                ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => Select::options('categories', 'array', ['category_id' => 'category']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown'], 'value' => $categoryId],
                                ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'name', 'maxlength' => '255', 'data-unique' => Skeleton::skeletonToken('central_unique_options') . '_u', 'data-unique-msg' => 'This name is already registered'], 'value' => $data->option],
                            ],
                            'type' => 'modal',
                            'size' => 'modal-md',
                            'position' => 'end',
                            'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Discrete Entity',
                            'button' => 'Update Entity',
                            'script' => 'window.skeleton.select();window.skeleton.unique();'
                        ];
                        break;
                        
                case 'central_users':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'account_status', 'value' => $data->account_status, 'label' => 'Status', 'options' => ['active' => 'Active', 'deactive' => 'Deactive'], 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'role', 'value' => $data->role, 'label' => 'Role', 'options' => ['user' => 'User', 'admin' => 'Admin'], 'required' => true, 'col' => '6', 'attr' => ['onchange' => 'updateUsername(this.value)']],
                            ['type' => 'text', 'name' => 'username', 'value' => $data->username, 'label' => 'User Name', 'required' => true, 'col' => '6', 'attr' => ['onchange' => 'updateUsername(this.value)']],
                            [
                                'type' => 'select',
                                'name' => 'access_db',
                                'label' => 'Access DB',
                                'options' => [
                                    'sun' => 'Sun',
                                    'moon' => 'Moon',
                                    'earth' => 'Earth',
                                    'mars' => 'Mars',
                                    'jupiter' => 'Jupiter',
                                    'saturn' => 'Saturn',
                                    'uranus' => 'Uranus',
                                    'neptune' => 'Neptune',
                                    'pluto' => 'Pluto',
                                    'venus' => 'Venus'
                                ],
                                'required' => true,
                                'col' => '6',
                                'attr' => ['data-select' => 'dropdown', 'multiple' => 'multiple', 'data-comma-separated' => 'true', 'data-value' => $data->access_db]
                            ],
                            ['type' => 'text', 'name' => 'export_limit', 'label' => 'Export Limit', 'value' => $data->export_limit, 'required' => true, 'col' => '6'],

                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Discrete Entity',
                        'button' => 'Update Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                case 'news_feeds':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'title', 'label' => 'Title', 'value' => $data->title, 'required' => true, 'col' => '6'],
                            ['type' => 'textarea', 'name' => 'content', 'value' => $data->content, 'label' => 'Content', 'required' => true, 'col' => '12'],
                            ['type' => 'file', 'name' => 'attachment_url', 'label' => 'Upload Image', 'accept' => 'image/*', 'required' => false, 'col' => '6'],
                            [
                                'type' => 'select',
                                'name' => 'category_id',
                                'label' => 'Category',
                                'value' => $data->category_id,
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
                                'value' => $data->priority,
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
                                'value' => $data->status,
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
                'message' => 'Edit form for ' . $reqSet['key'] . ' generated successfully.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
