<?php

namespace App\Http\Controllers\System\Central\EmailSystem;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;


/**
 * Controller for saving new EmailSystem entities.
 */
class SaveAddCtrl extends Controller
{
    /**
     * Saves new EmailSystem entity data based on validated input.
     *
     * @param Request $request HTTP request containing form data and token
     * @return JsonResponse JSON response with status, title, and message
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $request->input('save_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.');
            }
            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            // Initialize flags and variables
            $byMeta = $timestampMeta = true;
            $reloadTable = $reloadCard = false;
            $validated = [];
            $title = 'Success';
            $message = 'Record added successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch ($reqSet['key']) {
                case 'EmailSystem_entities':
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|regex:/^[a-z_]{3,100}$/|max:100',
                        'type' => 'required|in:data,unique,select,other',
                        'status' => 'required|in:active,inactive',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['entity_id'] = Random::unique(6, 'ENT');
                    $reloadTable = true;
                    $title = 'Entity Added';
                    $message = 'Entity configuration added successfully.';
                    break;
                case 'central_emails_audience':
                    $validator = Validator::make($request->all(), [
                        'name' => 'required|string|',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $reloadTable = true;
                    $title = 'Entity Added';
                    $message = 'Entity configuration added successfully.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             ****************************************************************************************************/
            // Add metadata if required
            if ($byMeta || $timestampMeta) {
                if ($byMeta) {
                    $validated['created_at'] = Skeleton::getAuthenticatedUser()->user_id;
                }
                if ($timestampMeta) {
                    $validated['created_at'] = $validated['updated_at'] = now();
                }
            }
            // Insert data into the database
            $result = Data::create('central', $reqSet['table'], $validated, $reqSet['key']);
            // Return response based on creation success
            return response()->json([
                'status' => $result['status'],
                'reload_table' => $reloadTable,
                'reload_card' => $reloadCard,
                'token' => $reqSet['token'],
                'affected' => $result['status'] ? $result['data']['id'] : '-',
                'title' => $result['status'] ? $title : 'Failed',
                'message' => $result['status'] ? $message : $result['message']
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.');
        }
    }
}