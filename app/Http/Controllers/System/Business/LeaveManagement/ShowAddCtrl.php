<?php

namespace App\Http\Controllers\System\Business\LeaveManagement;

use App\Http\Controllers\Controller;
use App\Facades\{BusinessDB, Select,  CentralDB, Database, Developer, Skeleton};
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
                case 'business_leave_requests':
                    $system = ['central' => 'Central', 'business' => 'Business'];
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'sno', 'label' => 'SNO', 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'company_id', 'label' => 'Company ID', 'options' => Select::options('companies', 'array', ['company_id' => 'name']), 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'branch_id', 'label' => 'Branch ID', 'options' => Select::options('branches', 'array', ['branch_id' => 'name']), 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'leave_id', 'label' => 'Leave ID', 'attr' => ['data-validate' => 'leave-code'], 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'employee_id', 'label' => 'Employee ID', 'required' => true, 'col' => '6', 'options' => Select::options('employees', 'array', ['employee_id' => 'first_name'])],
                            ['type' => 'date', 'name' => 'start_date', 'label' => 'Start Date', 'required' => true, 'col' => '6'],
                            ['type' => 'date', 'name' => 'end_date', 'label' => 'End Date', 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'leave_type', 'label' => 'Leave Type', 'options' => ['sick' => 'Sick', 'casual' => 'Casual', 'earned' => 'Earned'], 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => [
                                'pending' => 'Pending',
                            ], 'col' => '12'],
                            ['type' => 'textarea', 'name' => 'reason', 'label' => 'Reason', 'required' => true, 'col' => '12'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-paper-plane me-1"></i> Add Leave Request',
                        'button' => 'Save Leave Request',
                        'script' => 'window.skeleton.select();window.skeleton.unique();window.skeleton.applyRandomIdSuggestion();'
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
