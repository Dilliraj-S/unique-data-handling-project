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
                    $popup = [

                      
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'number', 'name' => 'sno', 'label' => 'SNO', 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'shift_id', 'label' => 'Shift Id', 'required' => true, 'col' => '6'],

                            // ['type' => 'text', 'name' => 'shift_name', 'label' => 'Shift Name', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'shift_name', 'maxlength' => '100', 'data-unique' => Skeleton::skeletonToken('business_shifts_unique_shift_name') . '_u', 'data-unique-msg' => 'This Shift is already Created']],

                            ['type' => 'text', 'name' => 'shift_name', 'label' => 'Shift Name', 'required' => true, 'col' => '6'],
                             ['type' => 'select', 'name' => 'shift_type', 'label' => 'Shift Type', 'options' => ['day' => 'Day', 'night' => 'Night'], 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                            ['type' => 'time', 'name' => 'min_start_time', 'label' => 'Min Start Time', 'required' => true, 'col' => '4'],
                            ['type' => 'time', 'name' => 'start_time', 'label' => 'Start Time', 'required' => true, 'col' => '4'],
                            ['type' => 'time', 'name' => 'max_start_time', 'label' => 'Max Start Time', 'required' => true, 'col' => '4'],
                            ['type' => 'time', 'name' => 'min_end_time', 'label' => 'Min End Time', 'required' => true, 'col' => '4'],
                            ['type' => 'time', 'name' => 'end_time', 'label' => 'End Time', 'required' => true, 'col' => '4'],
                            ['type' => 'time', 'name' => 'max_end_time', 'label' => 'Max End Time', 'required' => true, 'col' => '4'],
                            ['type' => 'text', 'name' => 'working_hours', 'label' => 'Work Hours', 'required' => true, 'col' => '6'],
                             ['type' => 'select', 'name' => 'is_holiday_shift', 'label' => 'Is Holiday Shift', 'options' => ['0' => 'NO', '1' => 'Yes'], 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-business-time"></i> Add Shift',
                        'button' => 'Save Shift',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;

                    case 'business_shift_schedules':
                    $popup = [

                      
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'number', 'name' => 'sno', 'label' => 'SNO', 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'schedule_id', 'label' => 'Schedule Id', 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'schedule_name', 'label' => 'Schedule Name', 'required' => true, 'col' => '12'],

                            ['type' => 'select', 'name' => 'monday_schedule', 'label' => 'Monday Shift', 'options' => Select::options('shifts', 'array', ['shift_id' => 'shift_name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],

                             ['type' => 'select', 'name' => 'tuesday_schedule', 'label' => 'Tuesday Shift', 'options' => Select::options('shifts', 'array', ['shift_id' => 'shift_name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],

                            ['type' => 'select', 'name' => 'wednesday_schedule', 'label' => 'Wednesday Shift', 'options' => Select::options('shifts', 'array', ['shift_id' => 'shift_name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],

                            ['type' => 'select', 'name' => 'thursday_schedule', 'label' => 'Thursday Shift', 'options' => Select::options('shifts', 'array', ['shift_id' => 'shift_name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],

                            ['type' => 'select', 'name' => 'friday_schedule', 'label' => 'Friday Shift', 'options' => Select::options('shifts', 'array', ['shift_id' => 'shift_name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],

                            ['type' => 'select', 'name' => 'saturday_schedule', 'label' => 'saturday Shift', 'options' => Select::options('shifts', 'array', ['shift_id' => 'shift_name']), 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],

                             ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['0' => 'Deactive', '1' => 'Active'], 'required' => true, 'col' => '12', 'attr' => ['data-source' => 'dropdown']],


                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-business-time"></i> Add Schedule',
                        'button' => 'Save Schedule',
                        'script' => 'window.skeleton.select();'
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
