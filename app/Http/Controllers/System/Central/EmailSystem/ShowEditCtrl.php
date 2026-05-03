<?php

namespace App\Http\Controllers\System\Central\EmailSystem;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};
use Illuminate\Support\Facades\DB;

/**
 * Controller for rendering the edit form for EmailSystem entities.
 */
class ShowEditCtrl extends Controller
{
    /**
     * Renders a popup form for editing EmailSystem entities.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request $request, array $params): JsonResponse
    {
        Developer::emergency('hello im in edit');
        try {
            Developer::emergency('this is the reqst data', ['the key is' => $request->all()]);

            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            Developer::emergency('this is the reqst data', ['the key is' => $reqSet]);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            $id = $reqSet['id'];
            $result = DB::connection('pluto')->select("SELECT * FROM email_accounts WHERE id = ?", [$id]);
            $data = $result[0] ?? null;
            if ($data) {
                Developer::emergency('this is the  data', ['data' => $data->type]);
            } else {
                Developer::emergency('No record found in email_accounts', ['id' => $id]);
            }
            // Initialize popup configuration
            $popup = [];
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch ($reqSet['key']) {
                case 'EmailSystem_entities':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'value' => $data->name, 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'name', 'maxlength' => '100', 'readonly' => 'readonly']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'value' => $data->type, 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'value' => $data->status, 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit EmailSystem Entity',
                        'button' => 'Update Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                case 'central_email_config':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'first_name', 'label' => 'First Name', 'value' => $data->first_name, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'last_name', 'label' => 'Last Name', 'value' => $data->last_name, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'extension', 'label' => 'Extension',  'value' => $data->extension, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'phone_number', 'label' => 'Phone Number', 'value' => $data->phone_number, 'required' => true,  'col' => '6'],
                            ['type' => 'text', 'name' => 'fax', 'label' => 'Fax', 'value' => $data->fax, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'designation', 'label' => 'Designation', 'value' => $data->designation, 'required' => true, 'col' => '6'],
                            ['type' => 'text', 'name' => 'postal_code', 'label' => 'Postal Code', 'value' => $data->postal_code, 'required' => true, 'col' => '6'],
                            ['type' => 'select', 'name' => 'unsubscribe', 'label' => 'Unsubscribe',  'options' => ['yes' => 'Yes', 'no' => 'No'], 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status',  'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'region', 'label' => 'Region', 'value' => $data->region, 'required' => true, 'options' => ['North America' => 'North America', 'South America' => 'South America', 'APJ & APAC' => 'APJ & APAC',  'EMEA' => 'EMEA', 'MENA' => 'MENA', 'DACH' => 'DACH', 'Oceania' => 'Oceania', 'NORDICS' => 'NORDICS',], 'col' => '6',  'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'textarea', 'name' => 'address', 'label' => 'Address', 'value' => $data->address, 'required' => true, 'col' => '12'],

                        ],
                        'type' => 'modal',
                        'size' => 'modal-xl',
                        'position' => 'end',
                        'label' => '<i class="fa-solid fa-envelope me-1"></i> Edit Email Account',
                        'button' => 'Update Email Account',
                        'script' => 'window.skeleton.select();'
                    ];
                    break;
                case 'central_audience_details':
                    $content = '<div class="col-12">
                    <input type="hidden" name="save_token" value="' . $request->token . '">

                    <div class="float-input-control">
                        <select class="form-float-input" id="subscriber_mode" name="subscriber_mode" onchange="toggleSubscriberFields()" required data-select="dropdown">
                            <option value="">-- Select Mode --</option>
                            <option value="manual">Manually Add</option>
                            <option value="csv">Import CSV</option>
                        </select>
                        <label for="subscriber_mode" class="form-float-label">Mode <span class="text-danger">*</span></label>
                    </div>
                </div>

                <div class="col-12 subscriber-manual d-none mt-4">
                    <div class="mb-3">
                        <label for="subscriber-format" class="form-label">Select Format</label>
                        <select class="form-control" id="subscriber-format" name="subscriber_format">
                            <option value="first-email">First&nbsp;Name, Email</option>
                            <option value="first-last-email">First&nbsp;Name, Last&nbsp;Name, Email</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="subscribers-input" class="form-label">
                            Enter Subscribers (one&nbsp;per&nbsp;line, comma-separated)
                        </label>
                        <textarea class="form-control" id="subscribers-input" name="subscribers_input" rows="5"
                            placeholder="e.g.,John, john@example.com&#10;Jane, jane@example.com"></textarea>
                    </div>
                </div>

                <div class="col-12 subscriber-csv d-none mt-4">
                    <div class="mb-3">
                        <label for="csv-format" class="form-label">Select CSV Format</label>
                        <select class="form-control" id="csv-format" name="csv_format">
                            <option value="first-email">First&nbsp;Name, Email</option>
                            <option value="first-last-email">First&nbsp;Name, Last&nbsp;Name, Email</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="csv-file" class="form-label">Upload CSV File</label>
                        <input type="file" class="form-control" id="csv-file" name="csv_file" accept=".csv">
                    </div>
                    <div class="progress mt-3 d-none" id="upload-progress">
                        <div class="progress-bar" role="progressbar" style="width:0%;" aria-valuenow="0"
                            aria-valuemin="0" aria-valuemax="100">0%</div>
                    </div>
                </div>

                <script>
                toggleSubscriberFields = function () {
                    const mode = document.getElementById("subscriber_mode")?.value;
                    document.querySelectorAll(".subscriber-manual").forEach(el =>
                        el.classList.toggle("d-none", mode !== "manual")
                    );
                    document.querySelectorAll(".subscriber-csv").forEach(el =>
                        el.classList.toggle("d-none", mode !== "csv")
                    );
                };

                document.addEventListener("DOMContentLoaded", () => {
                    toggleSubscriberFields();
                });
                </script>';
                    $popup = [
                        'form'       => 'content',
                        'labelType'  => 'floating',
                        'content'    => $content,
                        'type'       => 'modal',
                        'size'       => 'modal-lg',
                        'position'   => 'end',
                        'label'      => '<i class="bi bi-people-fill me-1"></i> Manage Subscribers',
                        'button'     => 'Save',
                        'script'     => <<<SCRIPT
                            window.skeleton.select();
                            toggleSubscriberFields = function () {
                                const mode = document.getElementById("subscriber_mode")?.value;
                                document.querySelectorAll(".subscriber-manual").forEach(el =>
                                    el.classList.toggle("d-none", mode !== "manual")
                                );
                                document.querySelectorAll(".subscriber-csv").forEach(el =>
                                    el.classList.toggle("d-none", mode !== "csv")
                                );
                            };

                            document.addEventListener("DOMContentLoaded", () => {
                                toggleSubscriberFields();
                            });
                    SCRIPT
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
                'button_class' => $popup['button_class'] ?? '',
                'button' => $popup['button'] ?? '',
                'footer' => $popup['footer'] ?? '',
                'header' => $popup['header'] ?? '',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true,
                'title' => 'Form Generated',
                'message' => 'Edit form for ' . $reqSet['key'] . ' generated successfully.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
