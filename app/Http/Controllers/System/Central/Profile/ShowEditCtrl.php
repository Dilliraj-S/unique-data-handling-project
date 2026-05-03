<?php
namespace App\Http\Controllers\System\Central\Profile;
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Controllers\DB;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config};
/**
 * Controller for rendering the edit form for Profile entities.
 */
class ShowEditCtrl extends Controller
{
    /**
     * Renders a popup form for editing Profile entities.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => [$reqSet['act'] => $reqSet['id']]]);
            $dataItem = $result['data'][0] ?? null;
            $data = is_array($dataItem) ? (object) $dataItem : $dataItem;
            if (!$data) {
                return ResponseHelper::moduleError('Record Not Found', 'The requested record was not found.', 404);
            }
            $popup = [];
            $holdPopup = false;
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'central_unique_profile_data':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            [
                                'type' => 'file',
                                'name' => 'profile',
                                'label' => 'Upload Profile Image',
                                'required' => false,
                                'col' => '12',
                                'value' => $data->profile ?? null, 
                                'attr' => [
                                    'accept' => 'image/*',
                                    'class' => 'form-control preview-upload', 
                                ]
                            ],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Update Profile ',
                        'button' => 'Save Changes',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                case 'central_update_profile_banner':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            [
                                'type' => 'file',
                                'name' => 'banner',
                                'label' => 'Upload banner Image',
                                'required' => false,
                                'col' => '12',
                                'value' => $data->banner ?? null,
                                'attr' => [
                                    'accept' => 'image/*',
                                    'class' => 'form-control',
                                ],
                            ],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Update Banner ',
                        'button' => 'Save Changes',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                case 'central_unique_userdata':
    $user = Data::get($reqSet['system'], 'users', ['where' => [$reqSet['act'] => $reqSet['id']]]);
    $userData = Data::get($reqSet['system'], 'user_data', ['where' => [$reqSet['act'] => $reqSet['id']]]);
    $userItem = $user['data'][0] ?? null;
    $userDataItem = $userData['data'][0] ?? null;

    if (!$userItem || !$userDataItem) {
        return ResponseHelper::moduleError('Record Not Found', 'The requested record was not found.', 404);
    }

    $user = is_array($userItem) ? (object) $userItem : $userItem;
    $userData = is_array($userDataItem) ? (object) $userDataItem : $userDataItem;
    $address = json_decode($userData->address_json ?? '{}', true);

    $popup = [
        'form' => 'builder',
        'labelType' => 'floating',
        'fields' => [
            ['type' => 'text', 'name' => 'first_name', 'label' => 'First Name', 'value' => $user->first_name ?? '', 'col' => '6'],
            ['type' => 'text', 'name' => 'last_name', 'label' => 'Last Name', 'value' => $user->last_name ?? '', 'col' => '6'],
            ['type' => 'text', 'name' => 'email', 'label' => 'Email', 'value' => $user->email ?? '', 'col' => '6'],
            ['type' => 'text', 'name' => 'alt_email', 'label' => 'Alternative Email', 'value' => $userData->alt_email ?? '', 'col' => '6'],
            ['type' => 'date', 'name' => 'birth_date', 'label' => 'Birth Date', 'value' => $userData->birth_date ?? '', 'col' => '6'],
            [
                'type' => 'select',
                'name' => 'gender',
                'label' => 'Gender',
                'value' => $userData->gender ?? '',
                'options' => [
                    '' => 'Select Gender',
                    'Male' => 'Male',
                    'Female' => 'Female',
                    'Others' => 'Others'
                ],
                'col' => '6'
            ],
            ['type' => 'text', 'name' => 'phone', 'label' => 'Phone Number', 'value' => $userData->phone ?? '', 'col' => '6'],
            ['type' => 'text', 'name' => 'phone_alt', 'label' => 'Alternate Phone Number', 'value' => $userData->phone_alt ?? '', 'col' => '6'],
            ['type' => 'text', 'name' => 'address_line1', 'label' => 'Address Line 1', 'value' => $address['address_line1'] ?? '', 'col' => '6'],
            ['type' => 'text', 'name' => 'address_line2', 'label' => 'Address Line 2', 'value' => $address['address_line2'] ?? '', 'col' => '6'],
            ['type' => 'text', 'name' => 'landmark', 'label' => 'Landmark', 'value' => $address['landmark'] ?? '', 'col' => '6'],
            ['type' => 'text', 'name' => 'city', 'label' => 'City', 'value' => $address['city'] ?? '', 'col' => '6'],
            ['type' => 'text', 'name' => 'state', 'label' => 'State', 'value' => $address['state'] ?? '', 'col' => '6'],
            ['type' => 'number', 'name' => 'pin_code', 'label' => 'Pin Code', 'value' => $address['pin_code'] ?? '', 'col' => '6'],
        ],
        'type' => 'modal',
        'size' => 'modal-lg',
        'position' => 'end',
        'label' => '<i class="fa-solid fa-address-card"></i> User Details',
        'button' => 'Update',
        'script' => 'window.skeleton.select();'
    ];
    break;

                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            $content = $popup['form'] === 'builder' ? PopupHelper::generateBuildForm($token, $popup['fields'], $popup['labelType']) : $popup['content'];
            return response()->json(['token' => $token, 'type' => $popup['type'], 'size' => $popup['size'], 'position' => $popup['position'], 'label' => $popup['label'], 'content' => $content, 'script' => $popup['script'], 'button_class' => $popup['button_class'] ?? '', 'button' => $popup['button'] ?? '', 'footer' => $popup['footer'] ?? '', 'header' => $popup['header'] ?? '', 'validate' => $reqSet['validate'] ?? '0', 'hold_popup' => $holdPopup, 'status' => true]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
    /**
     * Renders a popup to confirm bulk update of records.
     *
     * @param Request $request HTTP request object containing input data.
     * @param array $params Route parameters including token.
     * @return JsonResponse Custom UI configuration for the popup or an error message.
     */
    public function bulk(Request $request, array $params = []): JsonResponse
    {
        try {
            $token = $params['token'] ?? $request->input('skeleton_token', '');
            if (empty($token)) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['system']) || !isset($reqSet['table']) || !isset($reqSet['act'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid or missing required data.', 400);
            }
            $ids = array_filter(explode('@', $request->input('id', '')));
            if (empty($ids)) {
                return ResponseHelper::moduleError('Invalid Data', 'No records specified for update.', 400);
            }
            $result = Data::get($reqSet['system'], $reqSet['table'], [
                'where' => [
                    $reqSet['act'] => ['operator' => 'IN', 'value' => $ids],
                ]
            ], 'all');
            if (!$result['status'] || empty($result['data'])) {
                return ResponseHelper::moduleError('Records Not Found', $result['message'] ?: 'The requested records were not found.', 404);
            }
            $records = $result['data'];
            $popup = [];
            $holdPopup = false;
            $recordCount = count($records);
            $maxDisplayRecords = 5;
            $detailsHtml = sprintf('<div class="alert alert-warning" role="alert"><div class="accordion" id="updateAccordion-%s"><div class="accordion-item border-0"><h2 class="accordion-header p-0 my-0"><button class="accordion-button collapsed p-2 text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-%s" aria-expanded="false" aria-controls="collapse-%s">Confirm Bulk Update of %d Record(s)</button></h2><div id="collapse-%s" class="accordion-collapse collapse" data-bs-parent="#updateAccordion-%s"><div class="accordion-body p-2 bg-light"><div class="accordion" id="updateRecords-%s">', $token, $token, $token, $recordCount, $token, $token, $token);
            if ($recordCount > $maxDisplayRecords) {
                $detailsHtml .= sprintf('<div class="d-flex justify-content-between align-items-center"><div class="text-muted">Updating <b>%d</b> records.</div><button class="btn btn-link btn-sm text-decoration-none text-primary sf-12" type="button" data-bs-toggle="collapse" data-bs-target="#details-%s" aria-expanded="false" aria-controls="details-%s">Details</button></div><div class="collapse mt-2" id="details-%s"><div class="table-responsive" style="max-height: 200px;">', $recordCount, $token, $token, $token);
            }
            $detailsHtml .= '<table class="table table-sm table-bordered mb-0">';
            $displayRecords = $recordCount > $maxDisplayRecords ? array_slice($records, 0, 5) : $records;
            foreach ($displayRecords as $index => $record) {
                $recordArray = (array) $record;
                $recordId = htmlspecialchars($recordArray[$reqSet['act']] ?? 'N/A');
                $detailsHtml .= sprintf('<tr><td colspan="2"><b>Record %d (ID: %s)</b></td></tr>', $index + 1, $recordId);
                if (empty($recordArray)) {
                    $detailsHtml .= '<tr><td colspan="2" class="text-muted">No displayable details available</td></tr>';
                } else {
                    foreach ($recordArray as $key => $value) {
                        $detailsHtml .= sprintf('<tr><td>%s</td><td><b>%s</b></td></tr>', htmlspecialchars(ucwords(str_replace('_', ' ', $key))), htmlspecialchars($value ?? ''));
                    }
                }
            }
            $detailsHtml .= $recordCount > $maxDisplayRecords ? sprintf('<tr><td colspan="2" class="text-muted">... and %d more records</td></tr></table></div></div>', $recordCount - count($displayRecords)) : '</table>';
            $detailsHtml .= sprintf('</div><div class="mt-2"><i class="sf-10"><span class="text-danger">Note: </span>Only non-unique fields can be updated in bulk. Changes will apply to all %d selected records. Ensure values are valid to avoid data conflicts.</i></div></div></div></div></div></div>', $recordCount);
            $popup = [];
            $detailsHtmlPlacement = 'top';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'Profile_entities':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'offcanvas',
                        'size' => '-',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Bulk Edit Profile Entities',
                        'button' => 'Update Entities',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            $content = '<input type="hidden" name="update_ids" value="' . $request->input('id', '') . '">';
            $content .= $popup['form'] === 'builder' ? PopupHelper::generateBuildForm($token, $popup['fields'], $popup['labelType']) : $popup['content'];
            $content = $detailsHtmlPlacement === 'top' ? $detailsHtml . $content : $content . $detailsHtml;
            return response()->json(['token' => $token, 'type' => $popup['type'], 'size' => $popup['size'], 'position' => $popup['position'], 'label' => $popup['label'], 'content' => $content, 'script' => $popup['script'], 'button_class' => $popup['button_class'] ?? '', 'button' => $popup['button'] ?? '', 'footer' => $popup['footer'] ?? '', 'header' => $popup['header'] ?? '', 'validate' => $reqSet['validate'] ?? '0', 'hold_popup' => $holdPopup, 'status' => true]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}