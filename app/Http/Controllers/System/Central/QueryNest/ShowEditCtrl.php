<?php
namespace App\Http\Controllers\System\Central\QueryNest;
use App\Facades\{Data, Developer, Random, Skeleton, select};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};
/**
 * Controller for rendering the edit form for QueryNest entities.
 */
class ShowEditCtrl extends Controller
{
    /**
     * Renders a popup form for editing QueryNest entities.
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
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'QueryNest_entities':
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
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit QueryNest Entity',
                        'button' => 'Update Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                case 'central_unique_unq_tables':
                        $rules = [
                            "^[a-zA-Z]+[a-zA-Z\\s-]*$" => "Name",
                            "^[0-9]+$" => "Number",
                            "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" => "Email",
                            "^[0-9]{10}$" => "Phone",
                            "^[a-zA-Z0-9]+$" => "Username",
                            "^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}$" => "IP"
                        ];

                        $rules = htmlspecialchars(json_encode($rules), ENT_QUOTES);
                        // Ensure headers is properly encoded
                        $headers = htmlspecialchars(json_encode(json_decode($data->headers, true)), ENT_QUOTES);

                        $content = '
                        <div class="modal-body p-4">
                            <input type="hidden" name="save_token" value="' . $token . '">
                            <input type="hidden" name="table_id" value="' . $data->table_id . '">
                            <div class="row g-4">
                                <div class="col-md-6">
                                    <div class="form-floating form-floating-outline">
                                        <select class="form-select dyna-select-dropdown" name="system_id" required>
                                            ' . Select::options('databases', 'html', ['database_id' => 'name'], [], [$data->system_id]) . '
                                        </select>
                                        <label>Database</label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-floating form-floating-outline">
                                        <input type="text" class="form-control" name="name" value="' . htmlspecialchars($data->name, ENT_QUOTES) . '" placeholder="Table Name" required>
                                        <label>Table Name</label>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="card shadow-sm p-3">
                                        <div unique-create-table="base_table" data-table-rules="' . $rules . '" data-table-values="' . $headers . '" form-type="update-form" name="base_table"></div>
                                    </div>
                                </div>
                            </div>
                        </div>';

                        $popup = [
                            'form' => 'content',
                            'labelType' => 'floating',
                            'content' => $content,
                            'type' => 'modal',
                            'size' => 'modal-xl',
                            'position' => 'end',
                            'label' => '<i class="fa-solid fa-address-card"></i> Educational Details',
                            'button' => 'Update Entity',
                            'script' => 'window.skeleton.select();window.unique.createTable()'
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