<?php
namespace App\Http\Controllers\System\Business\UserManagement;

use App\Facades\Developer;
use App\Http\Controllers\Controller;
use Illuminate\Http\{Request, Response};
use Illuminate\Support\Facades\{Auth, Cache, Crypt, DB, Log, Session, Storage, Validator, View, Config};
/* Exceptions */
use Exception;
use App\Http\Exceptions\ExceptionHelper;

use App\Facades\{Skeleton,Random,Data,};
/* Helpers */
use App\Http\Helpers\{
UserHelper,
RandomHelper,
SelectHelper,
SkeletonHelper
};
/* Models */
use App\Models\User;
/**
 * Controller for saving new Settings data
 * Handles the creation of new Settings records (e.g., biometric data, payroll)
 */
class FormCtrl extends Controller
{
    /**
     * Save new data for entities.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */

     
    public function index(Request $request)
    {
        try {

                       
        $token = $request->input('save_token');
            if (!$token) {
                return response()->json([
                    'status' => false,
                    'title' => 'Token Missing',
                    'message' => 'No token was provided.'
                ]);
            }

            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key'])) {
                return response()->json([
                    'status' => false,
                    'title' => 'Invalid Token',
                    'message' => 'The provided token is invalid.'
                ]);
            }

            if (isset($reqSet['id'])) {
                $dynamic = $reqSet['id'];
            }

            /****************************************************************************************************
             * *
             * >>> MODIFY THIS SECTION (START) <<<                             *
             * *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'sa_categories_custom':
                case 'sa_categories_builder':
                    $validated = $request->validate([
                        'category' => 'required|string|max:255',
                        'descriptio' => 'nullable|string',
                    ]);
                    $message = 'Category Updated successfully';
                 
                    $validated['category_id'] = Random::uniqueId('CTG', 5);
                    
                    break;
                    case 'business_comments':
                    $validated = $request->validate([
                        'content' => 'required|string|max:1000',
                         'post_id' => 'nullable|string',
                    ]);
                    $validated['comment_id'] = Random::uniqueId('COM', 4);
                    $validated['company_id']= Skeleton::getAuthenticatedUser()['employee']->company_id;
                    $validated['branch_id']= Skeleton::getAuthenticatedUser()['employee']->branch_id;
                    $validated['user_id']= Skeleton::getAuthenticatedUser()->user_id;
                    $message = 'Comment Updated successfully';

                    break;
                      case 'business_reply':
                    $validated = $request->validate([
                         'content' => 'required|string|max:1000',
                         'post_id' => 'nullable|string',
                         'parent_id' => 'nullable|string',
                    ]);
                    
                    $validated['comment_id'] = Random::uniqueId('COM', 4);
                    $validated['company_id']= Skeleton::getAuthenticatedUser()['employee']->company_id;
                    $validated['branch_id']= Skeleton::getAuthenticatedUser()['employee']->branch_id;
                    $validated['user_id'] = $validated['created_by'] = Skeleton::getAuthenticatedUser()->user_id;
                    $message = 'Reply Updated successfully';

                    break;
                // Additional cases here
                default:
                    return response()->json(['status' => false, 'message' => 'Invalid configuration']);
            }
            /****************************************************************************************************
             * *
             * >>> MODIFY THIS SECTION (END) <<<                              *
             * *
             ****************************************************************************************************/
            $validated['created_at'] = now();
            $validated['updated_at'] = now();

            $result = Data::create('business', $reqSet['table'], $validated);

            return response()->json([
                'status' => $result['status'],
                'token' => $reqSet['token'],
                'affected' => $result['status'] ? $result['data']['id'] : '-',
                'title' => $result['status'] ? 'Success' : 'Failed',
                'message' => $result['status'] ? 'Token added successfully' : $result['message']
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => false,
                'title' => 'Error',
                'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.'
            ]);
        }
    }
}