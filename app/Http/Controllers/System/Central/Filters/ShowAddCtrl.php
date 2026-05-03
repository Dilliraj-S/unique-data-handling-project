<?php

namespace App\Http\Controllers\System\Central\Filters;

use App\Facades\{Data, Developer, Random, Skeleton, Select};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;

/**
 * Controller for rendering the add form for Filters entities.
 */
class ShowAddCtrl extends Controller
{
    /**
     * Renders a popup form for adding new Filters entities.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            $token = $params['token'] ?? $request->input('skeleton_token');
            Developer::info($token);
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
                case 'central_unique_products':

    $content = '
    <div class="col-12">
        <input type="hidden" name="save_token" value="' . $token . '">
        <input type="hidden" name="ids" value="' . $request->id . '">
        <input type="hidden" name="type" value="' . $request->type . '">

        <div class="float-input-control">
            <select class="form-float-input" id="product_mode" name="product_mode"
                onchange="toggleProductFields()" required data-select="dropdown">
                <option value="">-- Select Mode --</option>
                <option value="new">New</option>
                <option value="existing">Existing</option>
            </select>
            <label for="product_mode" class="form-float-label">
                Mode <span class="text-danger">*</span>
            </label>
        </div>
    </div>

    <!-- ✅ Product Parent Section -->
    <div class="col-12 mt-4">
        <div class="float-input-control">
            <select class="form-float-input" id="pp_select"
                onchange="setProductParent()" data-select="dynamic" required
                data-source="sun.master_accounts" data-columns="id|li_smtp">
                <option value="">-- Select Product Parent (Company) --</option>
            </select>
            <label for="pp_select" class="form-float-label">Product Parent (li_smtp)</label>
        </div>
    </div>

    <!-- Hidden fields for ID and Name -->
    <input type="hidden" id="pp_id" name="pp_id">
    <input type="hidden" id="pp_name" name="pp_name">

    <!-- ✅ New Product Section -->
    <div class="col-12 product-new d-none mt-4">
        <div class="float-input-control">
            <input type="text" class="form-float-input" id="product_name"
                placeholder="New Product Name Boss!" name="product_name">
            <label for="product_name" class="form-float-label">New Product Name</label>
        </div>
    </div>

    <div class="col-12 product-new d-none mt-4">
        <div class="float-input-control">
            <textarea class="form-float-input" id="product_desc"
                placeholder="Enter the Product Description!!!"
                name="description" rows="3"></textarea>
            <label for="product_desc" class="form-float-label">Product Description</label>
        </div>
    </div>

    <!-- ✅ Category (New only) -->
    <div class="col-12 product-new d-none mt-4">
        <div class="float-input-control">
            <input type="text" class="form-float-input" id="product_category"
                placeholder="Enter Product Category" name="category">
            <label for="product_category" class="form-float-label">Category</label>
        </div>
    </div>

    <!-- ✅ Vendor (New only) -->
    <div class="col-12 product-new d-none mt-4">
        <div class="float-input-control">
            <input type="text" class="form-float-input" id="product_vendor"
                placeholder="Enter Product Vendor" name="vendor">
            <label for="product_vendor" class="form-float-label">Vendor</label>
        </div>
    </div>

    <!-- ✅ Existing Product Section -->
    <div class="col-12 product-existing d-none mt-4">
        <div class="float-input-control">
            <select class="form-float-input" id="existing_name" name="existing_name" data-select="dynamic"
                data-source="products" data-columns="product_id|product_name">
                <option value=""></option>
            </select>
            <label for="existing_name" class="form-float-label">Existing Product</label>
        </div>
    </div>

    <!-- ✅ Source Description: Always visible -->
    <div class="col-12 mt-4">
        <div class="float-input-control">
            <textarea class="form-float-input" id="source_desc"
                placeholder="Enter the Source Description..."
                name="source_description" rows="3" required></textarea>
            <label for="source_desc" class="form-float-label">Source Description</label>
        </div>
    </div>

    <script>
        function setProductParent() {
            const select = document.getElementById("pp_select");
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) {
                document.getElementById("pp_id").value = select.value; // numeric ID
                document.getElementById("pp_name").value = selectedOption.text; // display name
            }
        }

        function toggleProductFields() {
            const mode = document.getElementById("product_mode")?.value;
            document.querySelectorAll(".product-new")
                .forEach(el => el.classList.toggle("d-none", mode !== "new"));
            document.querySelectorAll(".product-existing")
                .forEach(el => el.classList.toggle("d-none", mode !== "existing"));
        }

        document.addEventListener("DOMContentLoaded", () => {
            toggleProductFields();
        });
    </script>';

    $popup = [
        'form'       => 'content',
        'labelType'  => 'floating',
        'content'    => $content,
        'type'       => 'modal',
        'size'       => 'modal-md',
        'position'   => 'end',
        'label'      => '<i class="fa-regular fa-folder me-1"></i> Add Products',
        'button'     => 'Save Entity',
        'script'     => <<<SCRIPT
            window.skeleton.select();
            window.skeleton.unique();

            window.setProductParent = function() {
                const select = document.getElementById("pp_select");
                const selectedOption = select.options[select.selectedIndex];
                if (selectedOption) {
                    document.getElementById("pp_id").value = select.value;
                    document.getElementById("pp_name").value = selectedOption.text;
                }
            }

            window.toggleProductFields = function() {
                const mode = document.getElementById("product_mode")?.value;
                document.querySelectorAll(".product-new")
                    .forEach(el => el.classList.toggle("d-none", mode !== "new"));
                document.querySelectorAll(".product-existing")
                    .forEach(el => el.classList.toggle("d-none", mode !== "existing"));
            }

            document.addEventListener("DOMContentLoaded", () => {
                toggleProductFields();
            });
        SCRIPT
    ];  
    break;

                case 'central_pluto_audiences':
                    $content = '
                    <div class="col-12">
                        <input type="hidden" name="save_token" value="' . $token . '">
                        <input type="hidden" name="ids" value="' . $request->id . '">
                        <input type="hidden" name="type" value="' . $request->type . '">
                        <div class="float-input-control">
                            <select class="form-float-input" id="audience_mode" name="audience_mode" onchange="toggleAudienceFields()" required data-select="dropdown">
                                <option value="">-- Select Mode --</option>
                                <option value="new">New</option>
                                <option value="existing">Existing</option>  
                            </select>
                            <label for="audience_mode" class="form-float-label">Mode <span class="text-danger">*</span></label>
                        </div>
                    </div>
                    <div class="col-12 audience-new d-none mt-4">
                        <div class="float-input-control">
                            <input type="text" class="form-float-input" id="name" name="name">
                            <label for="name" class="form-float-label">New Audience Name</label>         
                        </div>
                    </div>
                    <div class="col-12 audience-existing d-none mt-4">
                        <div class="float-input-control">
                            <select class="form-float-input" id="existing_audience" name="existing_audience" data-select="dynamic"
                                data-source="pluto.audiences" data-columns="name|name">
                                <option value=""></option>
                            </select>
                            <label for="existing_audience" class="form-float-label">Existing Audience</label>
                        </div>
                    </div>
                    <script>
                    toggleAudienceFields = function () {
                        const mode = document.getElementById("audience_mode")?.value;
                        document.querySelectorAll(".audience-new").forEach(el => el.classList.toggle("d-none", mode !== "new"));
                        document.querySelectorAll(".audience-existing").forEach(el => el.classList.toggle("d-none", mode !== "existing"));
                    };
                    document.addEventListener("DOMContentLoaded", () => {
                        toggleAudienceFields();
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
                        'label' => '<i class="fa-regular fa-users me-1"></i> Add Audience',
                        'button' => 'Save Audience',
                        'script' => <<<SCRIPT
                        window.skeleton.select();
                        window.skeleton.unique();
                        toggleAudienceFields = function () {
                            const mode = document.getElementById("audience_mode")?.value;
                            document.querySelectorAll(".audience-new").forEach(el => el.classList.toggle("d-none", mode !== "new"));
                            document.querySelectorAll(".audience-existing").forEach(el => el.classList.toggle("d-none", mode !== "existing"));
                        };
                        document.addEventListener("DOMContentLoaded", () => {
                            toggleAudienceFields();
                        });
                        SCRIPT
                    ];
                    break;
                case 'central_need_to_action':
                    $content = '
                    <input type="hidden" name="save_token" value="' . $token . '">
                    <input type="hidden" name="id" value="' . $request->id . '">
                    <input type="hidden" name="table" value="' . $request->type . '">
                    <div class="col-12">
                        <div class="float-input-control">
                            <textarea type="text" class="form-float-input" id="name" name="status"></textarea>
                            <label for="name" class="form-float-label">Status</label>         
                        </div>
                    </div>';
                    $popup = [
                        'form' => 'content',
                        'labelType' => 'floating',
                        'content' => $content,
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-users me-1"></i>Move To Action',
                        'button' => 'yes',
                        'script' => ''
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
