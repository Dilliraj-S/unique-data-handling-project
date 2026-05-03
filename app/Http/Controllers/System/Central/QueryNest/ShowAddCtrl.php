<?php
namespace App\Http\Controllers\System\Central\QueryNest;
use App\Facades\{Data, Developer, Random, Skeleton, select};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;
/**
 * Controller for rendering the add form for QueryNest entities.
 */
class ShowAddCtrl extends Controller
{
    /**
     * Renders a popup form for adding new QueryNest entities.
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
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            $popup = [];
            $system = ['central' => 'Central', 'business' => 'Business'];
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
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'name', 'maxlength' => '255', 'data-unique' => Skeleton::skeletonToken('QueryNest_entities_unique') . '_u', 'data-unique-msg' => 'This name is already registered']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add QueryNest Entity',
                        'button' => 'Save Entity',
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
                $content = '
                <div class="modal-body p-4">
                    <input type="hidden" name="save_token" value="'.$token.'">
                    <div class="row g-4">
                        <div class="col-md-6">
                            <div class="form-floating form-floating-outline">
                                <select class="form-select dyna-select-dropdown" name="system_id" required>
                                    ' . Select::options('databases', 'html', ['database_id' => 'name']) . '
                                </select>
                                <label>Database</label>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-floating form-floating-outline">
                                <input type="text" class="form-control" name="name" placeholder="Table Name" required>
                                <label>Table Name</label>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="card shadow-sm p-3">
                                <div unique-create-table="base_table" data-table-rules="'.$rules.'" data-table-values=""  form-type="save-form"></div>
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
                    'button' => 'Save Entity',
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
                'message' => 'Add form for ' . $reqSet['key'] . ' generated successfully.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}