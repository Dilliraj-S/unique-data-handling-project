<?php

namespace App\Http\Controllers\System\Business\ShiftManagement;

use App\Http\Controllers\Controller;
use App\Facades\{BusinessDB, Select, CentralDB, Database, Developer, Skeleton};
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
            case 'business_shifts':
                    $content = '
                    <input type="hidden" name="save_token" value="'.$token.'">
                    <div class="row g-3" id="form-container">
                            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                            <div class="float-input-control">
                            <select data-select="dropdown" name="company_id" class="form-float-input" required>
                                '.Select::options('companies', 'html', ['company_id' => 'name']).'
                            </select>
                            <label class="form-float-label">Company</label>
                        </div>
                        </div>
                            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                            <div class="float-input-control">
                            <select data-select="dropdown"  name="branch_id" class="form-float-input"required>
                                '.Select::options('branches', 'html', ['branch_id' => 'name']) .'
                            </select>
                            <label class="form-float-label">Branch</label>
                        </div>
                        </div>
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                        <div class="float-input-control">
                            <input type="text" name="sno" class="form-float-input" placeholder="Sno" required>
                            <label class="form-float-label" class="form-float-label">Sno</label>
                        </div>
                       </div> 
                        <div class="col-md-4">
                        <div class="float-input-control">
                            <input type="text" name="shift_name" class="form-float-input"  required placeholder="Shift Name">
                            <label class="form-float-label" class="form-float-label">Shift Name</label>
                        </div>
                        </div>
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <input type="text" name="working_hours" class="form-float-input" required placeholder="Work Hours">
                            <label class="form-float-label">Work Hours</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                                    <select data-select="dropdown"  name="is_active" class="form-float-input"required>
                                        <option value="0" >No</option>
                                        <option value="1">Yes</option>
                                    </select>
                                    <label class="form-float-label">Is Active</label>
                        </div>
                        </div>

                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="has_variable_shift" class="form-float-input"required>
                                <option value="0">No</option>
                                <option value="1">Yes</option>
                            </select>
                            <label class="form-float-label">Has Variable Shift</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                            <div class="float-input-control">
                            <select data-select="dropdown"  name="is_holiday_shift" class="form-float-input" required>
                                <option value="0" >No</option>
                                <option value="1" >Yes</option>
                            </select>
                            <label class="form-float-label">Is Holiday Shift</label>
                        </div>
                        </div>
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                            <div class="float-input-control">
                                <input type="time" name="start_time" class="form-float-input"required>
                                <label class="form-float-label">Start Time</label>
                            </div>
                        </div>
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                          <div class="float-input-control">
                            <input type="time" name="end_time" class="form-float-input"required>
                            <label class="form-float-label">End Time</label>                            
                        </div>
                        </div>
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                            <div class="float-input-control">       
                                <input type="time" name="grace_period" class="form-float-input"required>
                                <label class="form-float-label">Grace Period</label>
                            </div>
                        </div>
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                        <div class="float-input-control">
                            <select data-select="dropdown"  name="allow_shift_termination" class="form-float-input"required>
                                <option value="0">No</option>
                                <option value="1">Yes</option>
                            </select>
                            <label class="form-float-label">Allow Shift Termination</label>
                        </div>
                        </div>
                        </div>
                        <div class="row mt-2 g-3">
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                                    <select data-select="dropdown" name="break_allowed" class="form-float-input" required>
                                        <option value="0" >No</option>
                                        <option value="1">Yes</option>
                                    </select>
                                    <label class="form-float-label">Break Allowed</label> 

                            </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                            <div class="float-input-control">
                            <input type="number" name="break_duration" class="form-float-input" placeholder="Break Duration (minutes)" required>
                            <label class="form-float-label">Break Duration (minutes)</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="include_break" class="form-float-input"required>
                                <option value="0">No</option>
                                <option value="1">Yes</option>
                            </select>
                            <label class="form-float-label">Include Break</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="allow_break_termination" class="form-float-input"required>
                                <option value="0">No</option>
                                <option value="1">Yes</option>
                            </select>
                            <label class="form-float-label">Allow Break Termination</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="allow_multiple_breaks" class="form-float-input"required>
                                <option value="0">No</option>
                                <option value="1">Yes</option>
                            </select>
                            <label class="form-float-label">Allow Multiple Breaks</label>
                        </div>
                        </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="allow_strict_break" class="form-float-input"required>
                                <option value="0">No</option>
                                <option value="1">Yes</option>
                            </select>
                            <label class="form-float-label">Allow Strict Break</label>
                        </div>
                            </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <select data-select="dropdown"  name="has_variable_break" class="form-float-input"required>
                                <option value="0">No</option>
                                <option value="1">Yes</option>
                            </select>
                            <label class="form-float-label">Has Variable Break</label>
                        </div>
                        </div>
                    </div>
                    <div id="breakFieldsContainer"  class="row mt-3 d-none">
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                            <div class="float-input-control">
                            <input type="time" name="break_start_time"  class="form-float-input">
                            <label class="form-float-label">Break Start Time</label>
                        </div>
                            </div>
                            <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                                <div class="float-input-control">
                            <input type="time" name="break_end_time" class="form-float-input">
                            <label class="form-float-label">Break End Time</label>
                        </div>
                        </div>
                        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
                        <div class="float-input-control">
                            <input type="time" name="break_grace_period" class="form-float-input">
                            <label class="form-float-label">Break Grace Period</label>
                        </div>
                        </div>
                        </div>
                    ';
                    
                    $popup = [
                        'form' => 'custom',
                        'type' => 'modal',
                        'size' => 'modal-lg',
                        'position' => 'center',
                        'label' => '<i class="fa-solid fa-clock me-2"></i>Add Shift',
                        'content' => $content,
                        'button' => 'save',
                        'script' => 'window.skeleton.select();window.gotit.shift();',
                        'status' => true,
                    ];
                    break;
                    case 'business_shift_schedules':
                    $content = '
                            <input type="hidden" name="save_token" value="'.$token.'">
                            <div class="row g-3" id="form-container">
                            <div class="col-md-6">
                                <div class="float-input-control">
                                    <input type="text" name="sno" class="form-float-input" required >
                                    <label class="form-float-label">SNO</label> 
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="float-input-control">
                                    <input type="text" name="schedule_name" class="form-float-input" required>
                                    <label class="form-float-label">Shedule name</label>
                                </div>
                            </div>
                            <div class="col-md-12">
                                <div class="float-input-control">
                                <select name="shift_id" class="form-float-input" data-select="dropdown" required>
                                    '.Select::options('shifts', 'html', ['shift_id' => 'shift_name']).'
                                </select>
                                <label class="form-float-label">Shift</label>
                                </div>
                            </div>
                            <div class="col-md-12">
                                <div class="float-input-control">
                                    <select name="type" class="form-float-input" data-id="shift_type" data-select="dropdown" required>
                                        <option value="">Select Type</option>
                                        <option value="day">Day</option>
                                        <option value="week">Week</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                    <label class="form-float-label">Type</label>
                                </div>
                            </div>
                            <div class="col-md-6 d-none" id="day-container">
                                <div class="float-input-control">
                                <select name="day" class="form-float-input" data-select="dropdown" multiple>
                                    <option value="sunday">Sunday</option>
                                    <option value="monday">Monday</option>
                                    <option value="tuesday">Tuesday</option>
                                    <option value="wednesday">Wednesday</option>
                                    <option value="thursday">Thursday</option>
                                    <option value="friday">Friday</option>
                                    <option value="saturday">Saturday</option>
                                </select>
                                <label class="form-float-label">Day</label>
                                </div>
                            </div>

                            <div class="col-md-6 d-none" id="week-container">
                                <div class="float-input-control">
                                <select name="week" class="form-float-input" data-select="dropdown" multiple>
                                    <option value="week-1">Week 1</option>
                                    <option value="week-2">Week 2</option>
                                    <option value="week-3">Week 3</option>
                                    <option value="week-4">Week 4</option>
                                    <option value="week-5">Week 5</option>
                                </select>
                                <label class="form-float-label">Week</label>
                                </div>
                            </div>

                            <div class="col-md-6 d-none" id="from-date-container">
                                <div class="float-input-control">
                                    <input type="date" name="from_date" class="form-float-input">
                                    <label class="form-float-label">From Date</label>
                                </div>
                            </div>

                            <div class="col-md-6 d-none" id="to-date-container">
                                <div class="float-input-control">
                                    <input type="date" name="to_date" class="form-float-input">
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
