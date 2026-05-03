<?php

namespace App\Http\Controllers\System\Business\ShiftManagement;

use App\Facades\{CentralDB, BusinessDB, Developer, Skeleton};
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
                            ['type' => 'number', 'name' => 'sno', 'label' => 'SNO', 'required' => true, 'value' => $data->sno, 'col' => '6'],
                            ['type' => 'text', 'name' => 'shift_id', 'label' => 'Shift Id', 'required' => true, 'col' => '6', 'value' => $data->shift_id,],

                            // ['type' => 'text', 'name' => 'shift_name', 'label' => 'Shift Name', 'required' => true, 'col' => '6', 'attr' => ['data-validate' => 'shift_name', 'maxlength' => '100', 'data-unique' => Skeleton::skeletonToken('business_shifts_unique_shift_name') . '_u', 'data-unique-msg' => 'This Shift is already Created']],

                            ['type' => 'text', 'name' => 'shift_name', 'label' => 'Shift Name', 'required' => true, 'col' => '6', 'value' => $data->shift_name,],
                             ['type' => 'select', 'name' => 'shift_type', 'label' => 'Shift Type', 'options' => ['day' => 'Day', 'night' => 'Night'], 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown'], 'value' => $data->shift_type,],
                            ['type' => 'time', 'name' => 'min_start_time', 'label' => 'Min Start Time', 'required' => true, 'col' => '4', 'value' => $data->min_start_time,],
                            ['type' => 'time', 'name' => 'start_time', 'label' => 'Start Time', 'required' => true, 'col' => '4', 'value' => $data->start_time,],
                            ['type' => 'time', 'name' => 'max_start_time', 'label' => 'Max Start Time', 'required' => true, 'col' => '4', 'value' => $data->max_start_time,],
                            ['type' => 'time', 'name' => 'min_end_time', 'label' => 'Min End Time', 'required' => true, 'col' => '4', 'value' => $data->min_end_time,],
                            ['type' => 'time', 'name' => 'end_time', 'label' => 'End Time', 'required' => true, 'col' => '4', 'value' => $data->end_time,],
                            ['type' => 'time', 'name' => 'max_end_time', 'label' => 'Max End Time', 'required' => true, 'col' => '4', 'value' => $data->max_end_time,],
                            ['type' => 'text', 'name' => 'working_hours', 'label' => 'Work Hours', 'required' => true, 'col' => '6', 'value' => $data->working_hours,],
                             ['type' => 'select', 'name' => 'is_holiday_shift', 'label' => 'Is Holiday Shift', 'options' => ['0' => 'NO', '1' => 'Yes'], 'required' => true, 'col' => '6', 'attr' => ['data-source' => 'dropdown'], 'value' => $data->is_holiday_shift,],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-business-time"></i> Update Shift',
                        'button' => 'Save Shift',
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
