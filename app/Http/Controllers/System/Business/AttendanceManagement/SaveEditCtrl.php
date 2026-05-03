<?php

namespace App\Http\Controllers\System\Business\ShiftManagement;


use App\Facades\{BusinessDB, CentralDB, Developer, Skeleton};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
use App\Http\Classes\FileHandleHelper;

/**
 * Controller for saving updated developer entities.
 */
class SaveEditCtrl extends Controller
{
    /**
     * Saves updated developer entity data based on validated input.
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
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
            }

            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            $validated = null;
            switch ($reqSet['key']) {
               case 'business_shifts':
                    $validator = Validator::make($request->all(), [
                        'sno' => 'required|integer',
                        'shift_id' => 'required|string|max:100',
                        'shift_name' => 'required',
                        'shift_type' => 'required|in:day,night',
                        'min_start_time' => 'required',
                        'start_time' => 'required',
                        'max_start_time' => 'required',
                        'min_end_time' => 'required',
                        'end_time' => 'required',
                        'max_end_time' => 'required',
                        'working_hours' => 'required',
                        'is_holiday_shift' => 'required|boolean',
                    ]);

                    if ($validator->fails()) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Validation Error',
                            'message' => $validator->errors()->first()
                        ]);
                    }

                    $validated = $validator->validated();

                    // Add custom data after validation
                    // $validated['company_id'] = Skeleton::getAuthenticatedUser()->company_id;
                    $validated['company_id'] = 'CMP0001';
                    // $validated['branch_id'] = Skeleton::getAuthenticatedUser()->branch_id;

                
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
            $validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
            $validated['updated_at'] = now();

            // Update data
            $affected = BusinessDB::table($reqSet['table'])->where($reqSet['act'], $reqSet['id'])->update($validated);

            return response()->json(['status' => $affected > 0, 'reload_table' => true, 'token' => $reqSet['token'], 'affected' => $affected, 'title' => $affected > 0 ? 'Success' : 'Failed', 'message' => $affected > 0 ? 'Token updated successfully' : 'No changes were made.']);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.']);
        }
    }
}
