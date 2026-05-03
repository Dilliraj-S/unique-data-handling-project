<?php


namespace App\Http\Controllers\System\Business\GeofenceManagement;

use App\Facades\{Adms, CentralDB, Data, Developer, Skeleton, Random};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
use App\Http\Classes\FileHandleHelper;
use App\Models\Skeleton\SkeletonToken;

/**
 * Controller for saving new developer entities.
 */
class SaveAddCtrl extends Controller
{
    /**
     * Saves new developer entity data based on validated input.
     *
     * @param Request $request HTTP request with form data and token.
     * @return JsonResponse Success or error message.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $request->input('save_token');
            if (!$token) {
                return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
            }

            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
            }
            if (isset($reqSet['id'])) {
                $dynamic = $reqSet['id'];
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            $validated = null;
            switch ($reqSet['key']) {
                 case 'business_geofence':
                    $validator = Validator::make($request->all(), [
                        'sno' => 'required|string',
                        'company_id'    => 'required|string|max:100',
                        'branch_id'     => 'required|string|max:100',
                        'name'     => 'required|string|max:100',
                        'longitude' => 'required|string',
                        'latitude' => 'required|string',
                        'radius' => 'required|string',
                        'location' => 'nullable|string',
                        'within_radius' => 'required|string',
                        'allow_picture' => 'required|string',
                    ]);

                    if ($validator->fails()) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Validation Error',
                            'message' => $validator->errors()->first()
                        ]);
                    }

                    $validated = $validator->validated();
                    $validated['geofence_id'] = Random::unique(6, 'GEO');
                    break;

                default:
                    return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                              >>> MODIFY THIS SECTION (END) <<<                                   *
             *                                                                                                  *
             ****************************************************************************************************/

            // Add metadata
            $validated['created_by'] = Skeleton::getAuthenticatedUser()->user_id;
            $validated['created_at'] = now();
            $validated['updated_at'] = now();

            // Insert data
            $result = Data::create('business', $reqSet['table'], $validated);

            return response()->json(['status' => $result['status'], 'reload_table' => true, 'token' => $reqSet['token'], 'affected' => $result['status'] ? $result['data']['id'] : '-', 'title' => $result['status'] ? 'Success' : 'Failed', 'message' => $result['status'] ? 'Token added successfully' : $result['message']]);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.']);
        }
    }
}
