<?php
namespace App\Http\Controllers\System\Business\GeofenceManagement;
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
           

            case 'business_geofence':
    $content = '
<div class="row g-3">
    <input type="hidden" name="save_token" value="'.$token.'">

    <div class="col-sm-12 col-md-12 col-lg-8 col-xl-7">
        <div class="card shadow-sm border-0">
            <div class="card-body p-0">
                <div id="locationMap" class="rounded-3" style="height: 450px; width: 100%;"></div>
            </div>
        </div>
    </div>
    <div class="col-sm-12 col-md-12 col-lg-5 col-xl-5">
        <div class="row g-2">

        <div class="col-sm-12 col-md-12 col-lg-4 col-xl-4">
                <div class="float-input-control">
                    <input type="number" class="form-float-input" id="sno" name="sno" placeholder="sno" required>
                    <label for="sno" class="form-float-label">Sno<span class="text-danger">*</span></label>
                </div>
            </div>

            <div class="col-sm-12 col-md-12 col-lg-8 col-xl-8">
                <div class="float-input-control">
                    <input type="text" class="form-float-input" id="name" name="name" placeholder="name" required>
                    <label for="sno" class="form-float-label">Name<span class="text-danger">*</span></label>
                </div>
            </div>

            <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                <div class="float-input-control">
                    <select class="form-float-input" id="company_id" name="company_id" data-select="dropdown" data-target="'.Skeleton::skeletonToken('business_company_branches_select') . '_s" required>
                        <option value=""></option>
                        '.Select::options('companies', 'html', ['company_id' => 'name']).'
                    </select>
                    <label for="company_id" class="form-float-label">Company<span class="text-danger">*</span></label>
                </div>
            </div>

            <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                <div class="float-input-control">
                    <select class="form-float-input" id="branch_id" name="branch_id" data-select="dropdown" data-source="'.Skeleton::skeletonToken('business_company_branches_select') . '_s">
                        <option value=""></option>
                        '.Select::options('branches', 'html', ['branch_id' => 'name']).'
                    </select>
                    <label for="branch_id" class="form-float-label">Branch</label>
                </div>
            </div>

            <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                <div class="float-input-control">
                    <textarea class="form-float-input" id="geofenceName" placeholder=" " aria-describedby="geofenceNameHelp" name="location"></textarea>
                    <label for="geofenceName" class="form-float-label">Location Name</label>
                </div>
                <div class="text-muted small mt-2 ms-2">📍 Select a location on the map — latitude and longitude will auto-fill below.</div>

            </div>

            <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                <div class="float-input-control">
                    <input type="number" class="form-float-input" id="geofenceRadius" value="100" min="1" placeholder=" " aria-describedby="geofenceRadiusHelp" name="radius">
                    <label for="geofenceRadius" class="form-float-label">Radius (meters)</label>
                </div>
                <div class="text-muted small mt-1 ms-1">🧭 Type a radius and click outside the input to see it drawn on the map.</div>
            </div>

            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                <div class="float-input-control">
                    <select class="form-float-input" id="within_radius" name="within_radius" data-select="dropdown">
                        <option value="1">Yes</option>
                        <option value="0">No</option>
                    </select>
                    <label for="within_radius" class="form-float-label">With in Radius</label>
                </div>
            </div>

             <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                <div class="float-input-control">
                    <select class="form-float-input" id="allow_picture" name="allow_picture" data-select="dropdown">
                        <option value="1">Yes</option>
                        <option value="0">No</option>
                    </select>
                    <label for="allow_picture" class="form-float-label">Allow Picture</label>
                </div>
            </div>

          

            <input type="hidden" id="geofenceLatitude" name="latitude">
            <input type="hidden" id="geofenceLongitude" name="longitude">
        </div>
        <button type="submit" class="btn btn-primary w-100 mt-4 mb-2">Save Geofence</button>
    </div>
</div>';
    $popup = [
        'form' => 'content',
        'labelType' => 'floating',
        'content' => $content,
        'type' => 'modal',
        'size' => 'modal-xl',
        'position' => 'center',
        'footer' => 'hide',
        'label' => '<i class="fa-regular fa-map-location-dot me-2"></i>Configure Geofence',
        'button' => 'Save',
        'script' => 'window.skeleton.geofence();window.skeleton.select();'
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
