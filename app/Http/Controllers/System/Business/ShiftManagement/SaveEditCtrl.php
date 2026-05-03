<?php

namespace App\Http\Controllers\System\Business\ShiftManagement;


use App\Facades\{BusinessDB, CentralDB, Developer, Skeleton, Random};
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
                            'sno' => 'required|string|max:100',
                            'shift_name' => 'required|string|max:255',
                            'start_time' => 'required',
                            'end_time' => 'required|date_format:H:i:s',
                            'grace_period' => 'required|date_format:H:i:s',
                            'break_allowed' => 'required|boolean',
                            'working_hours' => 'required|numeric|min:0',
                            'is_holiday_shift' => 'required|boolean',
                            'break_start_time' => 'nullable|date_format:H:i:s',
                            'break_end_time' => 'nullable|date_format:H:i:s',
                            'break_grace_period' => 'nullable|date_format:H:i:s',
                            'is_active' => 'required|boolean',
                            'break_duration' => 'required|integer|min:0',
                            'include_break' => 'required|boolean',
                            'allow_shift_termination' => 'required|boolean',
                            'allow_break_termination' => 'required|boolean',
                            'allow_multiple_breaks' => 'required|boolean',
                            'allow_strict_break' => 'required|boolean',
                            'has_variable_shift' => 'required|boolean',
                            'has_variable_break' => 'required|boolean',
                        ]);
                    if ($validator->fails()) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Validation Error',
                            'message' => $validator->errors()->first()
                        ]);
                    }
                    $validated = $validator->validated();
                    $validated['company_id'] = Skeleton::getAuthenticatedUser()['employee']->company_id;
                    $validated['branch_id'] = Skeleton::getAuthenticatedUser()['employee']->branch_id;
                    Developer::alert('data is ', ['validated' => $validated]);
                    Developer::info($validator);
                    break;
                case 'business_shift_schedules':
                    $validator = Validator::make($request->all(), [
                        'sno' => 'required|string|max:100',
                        'schedule_name' => 'required|string',
                        'shift_id' => 'required|string',
                        'type' => 'required|string|in:day,week,custom',
                    ]);
                    if ($validator->fails()) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Validation Error',
                            'message' => $validator->errors()->first()
                        ]);
                    }
                    $validated = $validator->validated();
                    $rules = [];
                    switch ($validated['type']) {
                        case 'day':
                            $rules['days'] = $request->input('day', []);
                            break;

                        case 'week':
                            $rules['weeks'] = $request->input('week', []);
                            $rules['days'] = $request->input('day', []);
                            break;

                        case 'custom':
                            $rules['from_date'] = $request->input('from_date');
                            $rules['to_date'] = $request->input('to_date');
                            $rules['days'] = $request->input('day', []);
                            break;
                    }
                    $validated['rules'] = json_encode($rules);
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
