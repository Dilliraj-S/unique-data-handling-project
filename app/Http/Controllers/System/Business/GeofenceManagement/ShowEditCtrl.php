<?php

namespace App\Http\Controllers\System\Business\GeofenceManagement;

use App\Facades\{CentralDB, BusinessDB, Select, Developer, Skeleton};
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

            Developer::info("request set");
            Developer::info($reqSet);

         
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
            }
            // Fetch existing data
             
            // if (!$data) {
            //     return response()->json(['status' => false, 'title' => 'Record Not Found', 'message' => 'The requested record was not found.']);
            // }

            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            $popup = null;
            switch ($reqSet['key']) {

                case 'business_geofence':
                    $data = BusinessDB::table($reqSet['table'])->where($reqSet['act'], $reqSet['id'])->first();

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
                                    <input type="number" class="form-float-input" id="sno" name="sno" placeholder="sno" value="'.$data->sno.'" required>
                                    <label for="sno" class="form-float-label">Sno<span class="text-danger">*</span></label>
                                </div>
                            </div>

                            <div class="col-sm-12 col-md-12 col-lg-8 col-xl-8">
                                <div class="float-input-control">
                                    <input type="text" class="form-float-input" id="name" name="name" placeholder="name" value="'.$data->name.'" required>
                                    <label for="sno" class="form-float-label">Name<span class="text-danger">*</span></label>
                                </div>
                            </div>

                            <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                                <div class="float-input-control">
                                    <select class="form-float-input" id="company_id" name="company_id" data-select="dropdown" data-target="'.Skeleton::skeletonToken('business_company_branches_select') . '_s" required>
                                        <option value=""></option>
                                        '.Select::options('companies', 'html', ['company_id' => 'name'], [], [$data->company_id]).'
                                    </select>
                                    <label for="company_id" class="form-float-label">Company<span class="text-danger">*</span></label>
                                </div>
                            </div>

                            <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                                <div class="float-input-control">
                                    <select class="form-float-input" id="branch_id" name="branch_id" data-select="dropdown" data-source="'.Skeleton::skeletonToken('business_company_branches_select') . '_s">
                                        <option value=""></option>
                                        '.Select::options('branches', 'html', ['branch_id' => 'name'], [], [$data->branch_id]).'
                                    </select>
                                    <label for="branch_id" class="form-float-label">Branch</label>
                                </div>
                            </div>

                            <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                                <div class="float-input-control">
                                    <textarea class="form-float-input" id="geofenceName" placeholder=" " aria-describedby="geofenceNameHelp" name="location">'.$data->location.'</textarea>
                                    <label for="geofenceName" class="form-float-label">Location Name</label>
                                </div>
                                <div class="text-muted small mt-2 ms-2">📍 Select a location on the map — latitude and longitude will auto-fill below.</div>

                            </div>

                            <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                                <div class="float-input-control">
                                    <input type="number" class="form-float-input" id="geofenceRadius" min="1" placeholder=" " name="radius" value="'.$data->radius.'">
                                    <label for="geofenceRadius" class="form-float-label">Radius (meters)</label>
                                </div>
                                <div class="text-muted small mt-1 ms-1">🧭 Type a radius and click outside the input to see it drawn on the map.</div>
                            </div>

                            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                <div class="float-input-control">
                                    <select class="form-float-input" id="within_radius" name="within_radius" data-select="dropdown">
                                        <option value="1"' . (($data->within_radius == "1") ? ' selected' : '') . '>Yes</option>
                                        <option value="0"' . (($data->within_radius == "0") ? ' selected' : '') . '>No</option>
                                    </select>
                                    <label for="within_radius" class="form-float-label">Within Radius</label>
                                </div>
                            </div>


                            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                <div class="float-input-control">
                                    <select class="form-float-input" id="allow_picture" name="allow_picture" data-select="dropdown">
                                        <option value="1"' . (($data->within_radius == "1") ? ' selected' : '') . '>Yes</option>
                                        <option value="0"' . (($data->within_radius == "0") ? ' selected' : '') . '>No</option>
                                    </select>
                                    <label for="allow_picture" class="form-float-label">Allow Picture</label>
                                </div>
                            </div>

                        

                            <input type="hidden" id="geofenceLatitude" name="latitude" value="'.$data->latitude.'">
                            <input type="hidden" id="geofenceLongitude" name="longitude" value="'.$data->longitude.'">
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

case 'business_geofence_attendance':
    $tokenParts = explode('-', $reqSet['id']);
    $checkType = $tokenParts[0] === 'in' ? 'Check-In' : 'Check-Out';
    $geofenceId = $tokenParts[1] ?? null;

    $content = '
    <div class="row g-3" id="geofenceModal">
        <input type="hidden" name="save_token" value="' . $token . '">
        <input type="hidden" id="geofenceId" value="' . $geofenceId . '">
        <input type="hidden" id="checkType" value="' . $checkType . '">
        <div class="col-12">
            <div id="verificationMap" class="rounded-3" style="height: 300px; width: 100%;"></div>
            <div id="videoContainer" class="mt-3" style="text-align: center;">
                <video id="attendanceVideo" autoplay style="width: 150px; height: 150px; object-fit: cover; margin: 0 auto; display: block;"></video>
            </div>
            <div id="capturedImageContainer" class="captured-image-container mt-3" style="display: none; text-align: center;">
                <img id="capturedImage" alt="Captured Photo" style="width: 150px; height: 150px; object-fit: cover; margin: 0 auto; display: block;">
            </div>
            <canvas id="attendanceCanvas" style="display: none;"></canvas>
            <div id="faceDetectionMessage" class="mt-2" style="text-align: center;"></div>
            <div id="attendanceStatus" class="mt-2" style="text-align: center;">Verifying your location...</div>
            <div class="mt-3">
                <button type="button" class="btn btn-primary" id="capturePhoto" disabled>Capture Photo</button>
                <button type="button" class="btn btn-warning" id="retakePhoto" style="display: none;">Retake Photo</button>
                <button type="button" class="btn btn-primary" id="submitAttendance" disabled>Submit</button>
            </div>
        </div>
    </div>';

    $popup = [
        'form' => 'content',
        'labelType' => 'floating',
        'content' => $content,
        'type' => 'modal',
        'size' => 'modal-lg',
        'position' => 'center',
        'button' => 'Save',
        'footer' => 'false',
        'label' => '<i class="fa-solid fa-fingerprint me-2"></i>' . $checkType,
        'script' => 'window.skeleton.AttendanceTracker();' // Updated to call via Skeleton instance
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
             Developer::emergency('token to save ',['token is'=>$token]);
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
