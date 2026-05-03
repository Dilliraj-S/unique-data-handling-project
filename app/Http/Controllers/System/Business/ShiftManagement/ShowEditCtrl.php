<?php

namespace App\Http\Controllers\System\Business\ShiftManagement;

use App\Facades\{CentralDB, BusinessDB, Developer, Skeleton, Select};
use App\Http\Controllers\Controller;
use App\Http\Helpers\PopupHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};

/**
 * Controller for rendering the edit form for developer entities.
 */
class ShowEditCtrl extends Controller
{
    /**
     * Renders a popup form for editing developer entities.
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
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
            }
            // Fetch existing data
            $data = BusinessDB::table($reqSet['table'])->where($reqSet['act'], $reqSet['id'])->first();
            if (!$data) {
                return response()->json(['status' => false, 'title' => 'Record Not Found', 'message' => 'The requested record was not found.']);
            }
            // Log user activity and field values for debugging
            Developer::info(Skeleton::getAuthenticatedUser()->user_id);
            Developer::info("here it is ");

            Developer::info($data);
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            $popup = null;
            switch ($reqSet['key']) {

                     case 'business_shifts':
                    $content = '
                    <input type="hidden" name="save_token" value="'.$token.'">
                    <div class="row g-3" id="form-container">

                            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                            <div class="float-input-control">
                            <select data-select="dropdown" name="company_id" class="form-float-input" value="' . $data->company_id .'" required>
                                '.Select::options('companies', 'html', ['company_id' => 'name']).'
                            </select>
                            <label class="form-float-label">Company</label>
                        </div>
                        </div>
                            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                            <div class="float-input-control">
                            <select data-select="dropdown"  name="branch_id" class="form-float-input" value="' . $data->branch_id .'" required>
                                '.Select::options('branches', 'html', ['branch_id' => 'name']) .'
                            </select>
                            <label class="form-float-label">Branch</label>
                        </div>
                        </div>
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                        <div class="float-input-control">
                            <input type="text" name="sno" class="form-float-input" value="' .$data->sno .'" placeholder="Sno" required readonly>
                            <label class="form-float-label" class="form-float-label">Sno</label>
                        </div>
                       </div> 
                        <div class="col-md-4">
                        <div class="float-input-control">
                            <input type="text" name="shift_name" class="form-float-input" value="' . $data->shift_name .'"  required placeholder="Shift Name">
                            <label class="form-float-label" class="form-float-label">Shift Name</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                            <div class="float-input-control">
                            <input type="time" name="start_time" class="form-float-input" value="' . $data->start_time .'"  required>
                            <label class="form-float-label">Start Time</label>
                        </div>
                        </div>
                       <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                            <div class="float-input-control">
                                <input type="time" name="end_time" class="form-float-input" value="'. $data->end_time .'"  required>
                                <label class="form-float-label">End Time</label>                            
                            </div>
                        </div>
 
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                            <div class="float-input-control">       
                                <input type="time" name="grace_period" class="form-float-input" value="'. $data->grace_period .'"required>
                                <label class="form-float-label">Grace Period</label>
                            </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                                    <select data-select="dropdown" name="break_allowed" class="form-float-input"   required>
                                        <option value="0" '.($data->break_allowed == '0' ? 'selected' : '') .'>No</option>
                                        <option value="1" '.( $data->break_allowed == '1' ? 'selected' : '' ).'>Yes</option>
                                    </select>
                                    <label class="form-float-label">Break Allowed</label> 
                            </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <input type="text" name="working_hours" class="form-float-input" value="'.$data->working_hours .'"  required placeholder="Work Hours">
                            <label class="form-float-label">Work Hours</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="is_holiday_shift" class="form-float-input"   required>
                                <option  value="0" '.( $data->is_holiday_shift == '0' ? 'selected' : '').'>No</option>
                                <option value="1" '.($data->is_holiday_shift == '1' ? 'selected' : '' ).'>Yes</option>
                            </select>
                            <label class="form-float-label">Is Holiday Shift</label>
                        </div>
                        </div>
                        </div>
                        <div id="breakFieldsContainer"  class="row mt-3 d-none">
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                            <div class="float-input-control">
                            <input type="time" name="break_start_time"  class="form-float-input" value="' . $data->break_start_time .'">
                            <label class="form-float-label">Break Start Time</label>
                        </div>
                            </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <input type="time" name="break_end_time" class="form-float-input" value="' . $data->break_end_time .'">
                            <label class="form-float-label">Break End Time</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <input type="time" name="break_grace_period" class="form-float-input" value="' . $data->break_grace_period .'">
                            <label class="form-float-label">Break Grace Period</label>
                        </div>
                        </div>
                        </div>
                        <div class="row mt-2 g-3">
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                                    <select data-select="dropdown"  name="is_active" class="form-float-input"  required>
                                        <option value="0" '.($data->is_active == '0' ? 'selected' : '').'>No</option>
                                        <option value="1" '.($data->is_active == '1' ? 'selected' : '' ).'>Yes</option>
                                    </select>
                                    <label class="form-float-label">Is Active</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <input type="number" name="break_duration" class="form-float-input" value="'.$data->break_duration .'"  placeholder="Break Duration (minutes)" required>
                            <label class="form-float-label">Break Duration (minutes)</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="include_break" class="form-float-input"  required>
                                <option value="0" '.($data->include_break == '0' ? 'selected' : '' ).'>No</option>
                                <option value="1" '.($data->include_break == '1' ? 'selected' : '' ).'>Yes</option>
                            </select>
                            <label class="form-float-label">Include Break</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="allow_shift_termination" class="form-float-input"  required>
                                <option value="0" '.($data->allow_shift_termination == '0' ? 'selected' : '' ).'>No</option>
                                <option value="1" '.($data->allow_shift_termination == '1' ? 'selected' : '' ).'>Yes</option>
                            </select>
                            <label class="form-float-label">Allow Shift Termination</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="allow_break_termination" class="form-float-input"  required>
                                <option value="0" '.($data->allow_break_termination == '0' ? 'selected' : '' ).'>No</option>
                                <option value="1" '.($data->allow_break_termination == '1' ? 'selected' : '' ).'>Yes</option>
                            </select>
                            <label class="form-float-label">Allow Break Termination</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="allow_multiple_breaks" class="form-float-input"  required>
                                <option value="0" '.($data->allow_multiple_breaks == '0' ? 'selected' : '' ).'>No</option>
                                <option value="1" '.($data->allow_multiple_breaks == '1' ? 'selected' : '' ).'>Yes</option>
                            </select>
                            <label class="form-float-label">Allow Multiple Breaks</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="allow_strict_break" class="form-float-input"  required>
                                <option value="0" '.($data->allow_strict_break == '0' ? 'selected' : '' ).'>No</option>
                                <option value="1" '.($data->allow_strict_break == '1' ? 'selected' : '' ).'>Yes</option>
                            </select>
                            <label class="form-float-label">Allow Strict Break</label>
                        </div>
                            </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="has_variable_shift" class="form-float-input"  required>
                                <option value="0" '.($data->has_variable_shift == '0' ? 'selected' : '' ).'>No</option>
                                <option value="1" '.($data->has_variable_shift == '1' ? 'selected' : '' ).'>Yes</option>
                            </select>
                            <label class="form-float-label">Has Variable Shift</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="has_variable_break" class="form-float-input"  required>
                                <option value="0" '.($data->has_variable_break == '0' ? 'selected' : '' ).'>No</option>
                                <option value="1" '.($data->has_variable_break == '1' ? 'selected' : '' ).'>Yes</option>
                            </select>
                            <label class="form-float-label">Has Variable Break</label>
                        </div>
                        </div>
                    </div>
                    ';
                    
                    $popup = [
                        'form' => 'custom',
                        'type' => 'modal',
                        'size' => 'modal-lg',
                        'position' => 'center',
                        'label' => '<i class="fa-solid fa-clock me-2"></i>Update Shift',
                        'content' => $content,
                        'button' => 'save',
                        'script' => 'window.skeleton.select();window.gotit.shift();',
                        'status' => true,
                    ];
                    break;
                     case 'business_shift_schedules':
                    $rules = json_decode($data->rules, true); // decode JSON rules
                    $selectedDays = $rules['days'] ?? [];
                    $selectedWeeks = $rules['weeks'] ?? [];
                    $fromDate = $rules['from_date'] ?? '';
                    $toDate = $rules['to_date'] ?? '';
                    $selectedType = $data->type ?? '';

                    function isSelected($value, $array) {
                        return in_array($value, $array) ? 'selected' : '';
                    }

                    $content = '
                    <input type="hidden" name="save_token" value="'.$token.'">
                    <div class="row g-3" id="form-container">
                        <div class="col-md-6">
                            <div class="float-input-control">
                                <input type="text" name="sno" class="form-float-input" required value="'.$data->sno.'">
                                <label class="form-float-label">SNO</label> 
                            </div>
                        </div>

                        <div class="col-md-6">
                            <div class="float-input-control">
                                <input type="text" name="schedule_name" class="form-float-input" required value="'.$data->schedule_name.'">
                                <label class="form-float-label">Schedule Name</label>
                            </div>
                        </div>
                        <div class="col-md-12">
                            <div class="float-input-control">
                                <select name="shift_id" class="form-float-input" data-select="dropdown" required>
                                    '.Select::options('shifts', 'html', ['shift_id' => 'shift_name'], '', '', $data->shift_id).'
                                </select>
                                <label class="form-float-label">Shift</label>
                                </div>
                        </div>

                        <div class="col-md-12">
                            <div class="float-input-control">
                                <select name="type" class="form-float-input" data-id="shift_type" data-select="dropdown" required>
                                    <option value="">Select Type</option>
                                    <option value="day" '.($selectedType === 'day' ? 'selected' : '').'>Day</option>
                                    <option value="week" '.($selectedType === 'week' ? 'selected' : '').'>Week</option>
                                    <option value="custom" '.($selectedType === 'custom' ? 'selected' : '').'>Custom</option>
                                </select>
                                <label class="form-float-label">Type</label>
                            </div>
                        </div>

                        <div class="col-md-6 '.(empty($selectedDays) ? 'd-none' : '').'" id="day-container">
                            <div class="float-input-control">
                                <select name="days[]" class="form-float-input" data-select="dropdown" multiple>
                                    <option value="sunday" '.isSelected("sunday", $selectedDays).'>Sunday</option>
                                    <option value="monday" '.isSelected("monday", $selectedDays).'>Monday</option>
                                    <option value="tuesday" '.isSelected("tuesday", $selectedDays).'>Tuesday</option>
                                    <option value="wednesday" '.isSelected("wednesday", $selectedDays).'>Wednesday</option>
                                    <option value="thursday" '.isSelected("thursday", $selectedDays).'>Thursday</option>
                                    <option value="friday" '.isSelected("friday", $selectedDays).'>Friday</option>
                                    <option value="saturday" '.isSelected("saturday", $selectedDays).'>Saturday</option>
                                </select>
                                <label class="form-float-label">Day</label>
                            </div>
                        </div>

                        <div class="col-md-6 '.(empty($selectedWeeks) ? 'd-none' : '').'" id="week-container">
                            <div class="float-input-control">
                                <select name="weeks[]" class="form-float-input" data-select="dropdown" multiple>
                                    <option value="week-1" '.isSelected("week-1", $selectedWeeks).'>Week 1</option>
                                    <option value="week-2" '.isSelected("week-2", $selectedWeeks).'>Week 2</option>
                                    <option value="week-3" '.isSelected("week-3", $selectedWeeks).'>Week 3</option>
                                    <option value="week-4" '.isSelected("week-4", $selectedWeeks).'>Week 4</option>
                                    <option value="week-5" '.isSelected("week-5", $selectedWeeks).'>Week 5</option>
                                </select>
                                <label class="form-float-label">Week</label>
                            </div>
                        </div>

                        <div class="col-md-6 '.($selectedType === "custom" ? '' : 'd-none').'" id="from-date-container">
                            <div class="float-input-control">
                                <input type="date" name="from_date" class="form-float-input" value="'.$fromDate.'">
                                <label class="form-float-label">From Date</label>
                            </div>
                        </div>

                        <div class="col-md-6 '.($selectedType === "custom" ? '' : 'd-none').'" id="to-date-container">
                            <div class="float-input-control">
                                <input type="date" name="to_date" class="form-float-input" value="'.$toDate.'">
                                <label class="form-float-label">To Date</label>
                            </div>
                        </div>
                    </div>';

                    $popup = [
                        'form' => 'custom',
                        'type' => 'modal',
                        'size' => 'modal-lg',
                        'position' => 'center',
                        'label' => '<i class="fa-solid fa-clock me-2"></i>Edit Shift',
                        'content' => $content,
                        'button' => 'save',
                        'script' => 'window.skeleton.select();window.gotit.ShiftScheduleForm();',
                        'status' => true,
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