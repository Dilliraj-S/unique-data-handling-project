<?php
namespace App\Http\Controllers\System\Business\ShiftManagement;
use App\Facades\{CentralDB, Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
use App\Http\Classes\FileHandleHelper;
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
                        'min_start_time' => 'required|date_format:H:i',
                        'start_time' => 'required|date_format:H:i',
                        'max_start_time' => 'required|date_format:H:i',
                        'min_end_time' => 'required|date_format:H:i',
                        'end_time' => 'required|date_format:H:i',
                        'max_end_time' => 'required|date_format:H:i',
                        'working_hours' => 'required|integer|min:0',
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
                    Developer::alert('data is ', ['validated' => $validated]);
                    Developer::info($validator);
                    break;
                case 'business_shift_schedules':
                    $validator = Validator::make($request->all(), [
                        'sno' => 'required|integer',
                        'schedule_id' => 'required|string|max:100',
                        'schedule_name' => 'required',
                        'monday_schedule' => 'required|string',
                        'tuesday_schedule' => 'required|string',
                        'wednesday_schedule' => 'required|string',
                        'thursday_schedule' => 'required|string',
                        'friday_schedule' => 'required|string',
                        'saturday_schedule' => 'required|string',
                        'status' => 'required|boolean',
                    ]);
                    if ($validator->fails()) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Validation Error',
                            'message' => $validator->errors()->first()
                        ]);
                    }
                    $validated = $validator->validated();
                    $validated['schedule_json'] = json_encode([
                        'monday' => $validated['monday_schedule'],
                        'tuesday' => $validated['tuesday_schedule'],
                        'wednesday' => $validated['wednesday_schedule'],
                        'thursday' => $validated['thursday_schedule'],
                        'friday' => $validated['friday_schedule'],
                        'saturday' => $validated['saturday_schedule'],
                    ]);
                    $validated['company_id'] = 'CMP0001';
                    unset(
                        $validated['monday_schedule'],
                        $validated['tuesday_schedule'],
                        $validated['wednesday_schedule'],
                        $validated['thursday_schedule'],
                        $validated['friday_schedule'],
                        $validated['saturday_schedule'],
                    );
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
            Developer::alert('reqset is ', ['req set' => $reqSet]);
            Developer::alert('data is ', ['validated' => $validated]);
            // Insert data
            $result = Data::create('business', $reqSet['table'], $validated);
            return response()->json(['status' => $result['status'], 'reload_table' => true, 'token' => $reqSet['token'], 'affected' => $result['status'] ? $result['data']['id'] : '-', 'title' => $result['status'] ? 'Success' : 'Failed', 'message' => $result['status'] ? 'Token added successfully' : $result['message']]);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.']);
        }
    }
}
