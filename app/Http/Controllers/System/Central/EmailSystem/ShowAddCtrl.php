<?php

namespace App\Http\Controllers\System\Central\EmailSystem;

use App\Facades\{Data, Developer, Random, Skeleton, Select};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;

/**
 * Controller for rendering the add form for EmailSystem entities.
 */
class ShowAddCtrl extends Controller
{
    /**
     * Renders a popup form for adding new EmailSystem entities.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            // Initialize popup configuration and system options
            $popup = [];
            $system = ['central' => 'Central', 'business' => 'Business'];
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
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'name', 'maxlength' => '255', 'data-unique' => Skeleton::skeletonToken('EmailSystem_entities_unique') . '_u', 'data-unique-msg' => 'This name is already registered']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add EmailSystem Entity',
                        'button' => 'Save Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                case 'central_emails_audience':
                    $content = '<div class="col-12">
                    <input type="hidden" name="save_token" value="' . $token  . '">
                    
                    <div class="float-input-control">
                        <select class="form-float-input" id="product_mode" name="product_mode" onchange="toggleProductFields()" required data-select="dropdown">
                            <option value="">-- Select Mode --</option>
                            <option value="new">New</option>
                            <option value="existing">Existing</option>  
                        </select>
                        <label for="product_mode" class="form-float-label">Mode <span class="text-danger">*</span></label>
                    </div>
                </div>

                <div class="col-12 product-new d-none mt-4">
                    <div class="float-input-control">
                        <input type="text" class="form-float-input" id="product_name" name="name">
                        <label for="product_name" class="form-float-label">New Audience Name</label>         
                    </div>
                </div>

                <div class="col-12 product-existing d-none mt-4">
                    <div class="float-input-control">
                        <select class="form-float-input" id="existing_name" name="existing_name" data-select="dropdown">
                            <option value=""></option>
                            ' . Select::options('pluto.audiences', 'html', ['name' => 'name']) . '
                        </select>
                        <label for="existing_name" class="form-float-label">Existing audience</label>
                    </div>
                </div>
                <script>
                toggleProductFields = function () {
                    const mode = document.getElementById("product_mode")?.value;
                    document.querySelectorAll(".product-new").forEach(el => el.classList.toggle("d-none", mode !== "new"));
                    document.querySelectorAll(".product-existing").forEach(el => el.classList.toggle("d-none", mode !== "existing"));
                };

                document.addEventListener("DOMContentLoaded", () => {
                    toggleProductFields();
                }); 
                </script>
                ';
                    $popup = [
                        'form' => 'content',
                        'labelType' => 'floating',
                        'content' => $content,
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add Products',
                        'button' => 'Save Entity',
                        'script' => <<<SCRIPT
                    window.skeleton.select();
                    window.skeleton.unique();

                        toggleProductFields = function () {
                    const mode = document.getElementById("product_mode")?.value;
                    document.querySelectorAll(".product-new").forEach(el => el.classList.toggle("d-none", mode !== "new"));
                    document.querySelectorAll(".product-existing").forEach(el => el.classList.toggle("d-none", mode !== "existing"));
                };

                document.addEventListener("DOMContentLoaded", () => {
                    toggleProductFields();
                }); 

                SCRIPT
                    ];
                    break;
                case 'central_emails_templates':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'name', 'maxlength' => '255', 'data-unique' => Skeleton::skeletonToken('EmailSystem_entities_unique') . '_u', 'data-unique-msg' => 'This name is already registered']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add EmailSystem Entity',
                        'button' => 'Save Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                case 'central_emails_campaigns':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'name', 'maxlength' => '255', 'data-unique' => Skeleton::skeletonToken('EmailSystem_entities_unique') . '_u', 'data-unique-msg' => 'This name is already registered']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add EmailSystem Entity',
                        'button' => 'Save Entity',
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
                'message' => 'Add form for ' . $reqSet['key'] . ' generated successfully.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}