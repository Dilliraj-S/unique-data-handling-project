<?php
namespace App\Http\Controllers\System\Central\EmailSystem;
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};
/**
 * Controller for rendering the view form for EmailSystem entities.
 */
class ViewCtrl extends Controller
{
    /**
     * Renders a popup form for viewing EmailSystem entities.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            // Fetch existing data
            $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => [$reqSet['act'] => $reqSet['id']]]);
            $data = $result['data'][0] ?? null;
            if (!$data) {
                return ResponseHelper::moduleError('Record Not Found', 'The requested record was not found.', 404);
            }
            // Initialize popup configuration
            $popup = [];
            $title = 'View Form Loaded';
            $message = 'View form loaded successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch ($reqSet['key']) {
                case 'EmailSystem_entities':
                    $popup = [
                        'type' => 'modal',
                        'size' => 'lg',
                        'position' => 'center',
                        'label' => 'View EmailSystem Entity',
                        'form' => 'builder',
                        'labelType' => 'above',
                        'content' => '
                            <div class="mb-3"><label class="font-bold">Name:</label> <input type="text" name="name" value="' . htmlspecialchars($data->name) . '" readonly class="form-control"></div>
                            <div class="mb-3"><label class="font-bold">Type:</label> <input type="text" name="type" value="' . htmlspecialchars($data->type) . '" readonly class="form-control"></div>
                            <div class="mb-3"><label class="font-bold">Status:</label> <input type="text" name="status" value="' . htmlspecialchars($data->status) . '" readonly class="form-control"></div>
                        ',
                        'button' => 'Close',
                        'button_class' => 'btn btn-secondary',
                        'footer' => true,
                        'header' => true
                    ];
                    $title = 'View Entity Form';
                    $message = 'EmailSystem entity view form loaded successfully.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Generate response
            return response()->json([
                'token' => $token,
                'type' => $popup['type'],
                'size' => $popup['size'],
                'position' => $popup['position'],
                'label' => $popup['label'],
                'content' => $popup['content'],
                'script' => $popup['script'] ?? '',
                'button_class' => $popup['button_class'] ?? '',
                'button' => $popup['button'] ?? '',
                'footer' => $popup['footer'] ?? '',
                'header' => $popup['header'] ?? '',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true,
                'title' => $title,
                'message' => $message
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}