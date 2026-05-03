<?php

namespace App\Http\Controllers\System\Central\EmailSystem;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Validation\Rule;
use App\Models\Central\EmailSystem\EmailAccount;
use App\Models\Central\EmailSystem\Subscriber;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};

/**
 * Controller for saving updated EmailSystem entities.
 */
class SaveEditCtrl extends Controller
{
    /**
     * Saves updated EmailSystem entity data based on validated input.
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
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            // Initialize flags and variables
            $byMeta = $timestampMeta = true;
            $reloadTable = $reloadCard = false;
            $validated = [];
            $title = 'Success';
            $message = 'Record updated successfully.';
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
                    $reloadTable = true;
                    $title = 'Entity Updated';
                    $message = 'Entity configuration updated successfully.';
                    break;
                case 'central_email_config':
                    $allowedRegions = [
                        'North America',
                        'South America',
                        'APJ & APAC',
                        'EMEA',
                        'MENA',
                        'DACH',
                        'Oceania',
                        'NORDICS',
                    ];
                    Developer::emergency('Starting validation for central_email_config', ['request_data' => $request->all()]);
                    $validator = Validator::make($request->all(), [
                        'first_name'   => 'required|string|',
                        'last_name'    => 'required|string|',
                        'extension'    => 'nullable|numeric',
                        'phone_number' => 'required|string|',
                        'fax'          => 'nullable|numeric',
                        'designation'  => 'nullable|string|',
                        'postal_code'  => 'nullable|string|',
                        'unsubscribe'  => 'required|in:yes,no',
                        'status'       => 'required|in:active,inactive',
                        'region'       => ['required', Rule::in($allowedRegions)],
                        'address'      => 'nullable|string|max:255',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $reloadTable = true;
                    $title = 'Email account Updated';
                    $message = 'updated successfully.';
                    break;


                case 'central_audience_details':
                    Developer::emergency('central_audience_details START', ['request_data' => $request->all()]);

                    $validator = Validator::make($request->all(), [
                        'subscriber_mode' => 'required|in:manual,csv',
                    ]);

                    if ($validator->fails()) {
                        Developer::emergency('Validation failed for central_email_config', ['errors' => $validator->errors()->toArray()]);
                        return ResponseHelper::moduleError(
                            'Validation Error',
                            $validator->errors()->first()
                        );
                    }

                    $validated = $validator->validated();
                    $validated['audience_id'] = $reqSet['id'];

                    // ------------------- MANUAL MODE -------------------
                    if ($validated['subscriber_mode'] === 'manual') {
                        $formate = explode(',', $request->subscribers_input);

                        if ($request->subscriber_format == "first-email") {
                            $firstName = trim($formate[0] ?? '');
                            $email     = trim($formate[1] ?? '');

                            if ($firstName && $email) {
                                Subscriber::create([
                                    'first_name'  => $firstName,
                                    'email'       => $email,
                                    'audience_id' => $validated['audience_id'],
                                ]);
                            }
                        } else { // first-last-email
                            $firstName = trim($formate[0] ?? '');
                            $lastName  = trim($formate[1] ?? '');
                            $email     = trim($formate[2] ?? '');

                            if ($firstName && $lastName && $email) {
                                Subscriber::create([
                                    'first_name'  => $firstName,
                                    'last_name'   => $lastName,
                                    'email'       => $email,
                                    'audience_id' => $validated['audience_id'],
                                ]);
                            }
                        }

                        Data::create('central', $reqSet['table'], $validated, $reqSet['key']);
                    }

                    // ------------------- CSV MODE -------------------
                    elseif ($validated['subscriber_mode'] === 'csv' && $request->hasFile('csv_file')) {
                        // Read and convert file to UTF-8
                        $raw  = file_get_contents($request->file('csv_file')->getRealPath());
                        $utf8 = mb_convert_encoding($raw, 'UTF-8', 'UTF-8, ISO-8859-1, UTF-16');
                        $lines = array_filter(array_map('trim', explode(PHP_EOL, $utf8)));
                        $csv = array_map('str_getcsv', $lines);

                        // Detect and remove header
                        $header = array_map('strtolower', $csv[0]);
                        if (in_array('firstname', $header) || in_array('email', $header)) {
                            unset($csv[0]);
                        }

                        foreach ($csv as $i => $row) {
                            try {
                                if ($request->csv_format == "first-email") {
                                    $firstName = trim($row[0] ?? '');
                                    $email     = trim($row[1] ?? '');

                                    if ($firstName && $email) {
                                        Subscriber::create([
                                            'first_name'  => $firstName,
                                            'email'       => $email,
                                            'audience_id' => $validated['audience_id'],
                                        ]);
                                    } else {
                                        Developer::warning("Skipped CSV row #$i: Missing first_name or email", $row);
                                    }
                                } else { // first-last-email
                                    $firstName = trim($row[0] ?? '');
                                    $lastName  = trim($row[1] ?? '');
                                    $email     = trim($row[2] ?? '');

                                    if ($firstName && $email) {
                                        Subscriber::create([
                                            'first_name'  => $firstName,
                                            'last_name'   => $lastName ?: null,
                                            'email'       => $email,
                                            'audience_id' => $validated['audience_id'],
                                        ]);
                                    } else {
                                        Developer::warning("Skipped CSV row #$i: Missing values", $row);
                                    }
                                }
                            } catch (\Throwable $e) {
                                Developer::error("CSV row insert failed at row #$i", [
                                    'row' => $row,
                                    'error' => $e->getMessage(),
                                ]);
                            }
                        }

                        // No Data::create needed for CSV mode
                    }

                    return response()->json([
                        'status'       => true,
                        'message'      => "Added subscribers",
                        'reload_table' => true,
                        'reload_card'  => true,
                        'token'        => $token,
                        'title'        => 'Added',
                        'message'      => 'Added Successfully'
                    ]);

                    break;




                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add metadata if required
            if ($byMeta || $timestampMeta) {
                if ($byMeta) {
                    $validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
                if ($timestampMeta) {
                    $validated['updated_at'] = now();
                }
            }
            // Update data in the database
            $affected = Data::update('central', $reqSet['table'], $validated, [$reqSet['act'] => $reqSet['id']], $reqSet['key']);
            // Return response based on update success
            return response()->json([
                'status' => $affected > 0,
                'reload_table' => $reloadTable,
                'reload_card' => $reloadCard,
                'token' => $reqSet['token'],
                'affected' => $affected,
                'title' => $affected > 0 ? $title : 'Failed',
                'message' => $affected > 0 ? $message : 'No changes were made.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.');
        }
    }
}
