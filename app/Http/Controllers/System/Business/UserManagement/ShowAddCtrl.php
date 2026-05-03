<?php

namespace App\Http\Controllers\System\Business\UserManagement;

use App\Http\Controllers\Controller;
use App\Facades\{BusinessDB, CentralDB, Database, Developer, Skeleton};
use App\Http\Helpers\PopupHelper;
use App\Http\Helpers\SelectHelper;
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
                case 'business_users':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $modules = CentralDB::table('skeleton_modules')->pluck('name', 'name')->map('ucfirst')->toArray();
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            [ 'type' => 'select', 'name' => 'give_access', 'label' => 'Give Access to Login', 'required' => false,'col' => '6', 'options' => ['1' => 'Yes', '0' => 'No']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add employee',
                        'button' => 'Save employee',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                     case 'business_news_feed':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                                ['type' => 'textarea','name' => 'post_content',   'label' => 'Create Post', 'required' => false, 'col' => '12', 'placeholder' => 'What\'s on your mind?', 'maxlength' => '1000','class' => 'form-control post-textarea', 'rows' => '3' ],
                                ['type' => 'file',  'name' => 'photo',  'label' => 'Upload Photo', 'required' => false, 'col' => '2', 'accept' => 'image/jpeg,image/png,image/jpg,image/gif',  'multiple' => true,  'class' => 'form-control', 'id' => 'photo-input', 'hidden' => true ],
                                ['type' => 'file','name' => 'video', 'label' => 'Upload Video',  'required' => false,  'col' => '2','accept' => 'video/mp4,video/mpeg,video/quicktime', 'multiple' => true,   'class' => 'form-control','id' => 'video-input',  'hidden' => true],
                                ['type' => 'file','name' => 'file', 'label' => 'Upload File', 'required' => false,'col' => '2', 'accept' => '.pdf,.doc,.docx,.txt','multiple' => true,'class' => 'form-control', 'id' => 'file-input', 'hidden' => true ],
                                ['type' => 'text', 'name' => 'hashtags',  'label' => 'Hashtags',  'required' => false, 'col' => '6','placeholder' => '#hashtags (separated by spaces)', 'maxlength' => '255','class' => 'form-control mt-2','id' => 'hashtag-input','hidden' => true],
                                ['type' => 'text', 'name' => 'location', 'label' => 'Location',  'required' => false, 'col' => '6','placeholder' => 'Enter location', 'maxlength' => '255','class' => 'form-control mt-2', 'id' => 'location-input', 'hidden' => true],
                                ['type' => 'text', 'name' => 'emoji', 'label' => 'Emoji',  'required' => false, 'col' => '6', 'placeholder' => 'Selected emoji','maxlength' => '10', 'class' => 'form-control mt-2', 'id' => 'emoji-input','readonly' => true, 'hidden' => true ],
                                ['type' => 'select', 'name' => 'give_access','label' => 'Give Access to Login','required' => false, 'col' => '6','options' => ['1' => 'Yes','0' => 'No' ]],
                                ['type' => 'submit', 'name' => 'share_post','label' => 'Share Post', 'class' => 'btn btn-primary d-inline-flex align-items-center ms-2','id' => 'share-post','icon' => 'ti ti-circle-plus fs-16 me-2','col' => '12']
                            ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add employee',
                        'button' => 'Share Post',
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
                'footer' => $popup['footer'] ?? 'show',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.']);
        }
    }
}
