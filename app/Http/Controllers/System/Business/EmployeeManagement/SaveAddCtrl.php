<?php


namespace App\Http\Controllers\System\Business\EmployeeManagement;

use App\Facades\{Adms, BusinessDB, CentralDB, Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator,Hash};
use App\Http\Classes\FileHandleHelper;

/**
 * Controller for saving new developer entities.
 */
class SaveAddCtrl extends Controller
{
    /**
     * Saves new developer entity data based on validated input.
     *
     * @param Request $request HTTP request with form data and token.
     * @return JsonResponse Success or error message.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $request->input('save_token');
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
            $validated = null;
            switch ($reqSet['key']) {
                case 'business_employees':
                    Developer::alert('the request data',['request data'=>$request->all()]);
                    Developer::alert('device_id in request start',['device_ids'=>$request->all()]);
                    $business_id = Skeleton::getAuthenticatedUser()->business_id;
                    $user_id = Skeleton::getAuthenticatedUser()->user_id;
                    Developer::emergency("message",['business_id'=>$business_id]);

                    if ($request->input('allow_authentication') == '1') {
                        Developer::alert('hwelloooo');
                        $randomuser_id = Random::uniqid('USR');
                        $userdata = [
                            'user_id'                    => $randomuser_id,
                            'business_id'                => $business_id,
                            'first_name'                 => $request['first_name'] ?? null,
                            'last_name'                  => $request['last_name'] ?? null,
                            'role_id'                    => $request['role_id'] ?? null,
                            'email'                      => $request['email'] ?? null,
                            'username'                   => $request['username'] ?? null,
                            'provider'                   => $request['provider'] ?? null,
                            'provider_id'                => $request['provider_id'] ?? null,
                            'provider_token'             => $request['provider_token'] ?? null,
                            'provider_refresh_token'     => $request['provider_refresh_token'] ?? null,
                            'two_factor_secret'          => $request['two_factor_secret'] ?? null,
                            'two_factor_recovery_codes'  => $request['two_factor_recovery_codes'] ?? null,
                            'two_factor_confirmed_at'    => $request['two_factor_confirmed_at'] ?? null,
                            'two_factor_method'          => $request['two_factor_method'] ?? null,
                            'device_token'               => $request['device_token'] ?? null,
                            'device_type'                => $request['device_type'] ?? null,
                            'password_updated_at'        => $request['password_updated_at'] ?? null,
                            'profile'                    => $request['profile'] ?? null,
                            'last_login_at'              => $request['last_login_at'] ?? null,
                            'remember_token'             => $request['remember_token'] ?? null,
                            'created_by'                 => $user_id,
                            'updated_by'                 => $user_id,
                            'password'                   => Hash::make($request['password']),
                        ];

                        $result = BusinessDB::table('users')->insert($userdata);
                      
                        Developer::alert('user data created', ['userdata' => $userdata]);
                    }


                    $employeedata = Validator::make($request->all(), [
                        'sno'                 =>'required',
                        'company_id'          => 'nullable|string|max:100',
                        'branch_id'           => 'nullable|string|max:100',
                        'department_id'       => 'nullable|string|max:100',
                        'designation_id'      => 'nullable|string|max:100',
                        'shift_schedule_id'   => 'nullable',
                        'employee_id'         => 'required|string|max:100',
                        'first_name'          => 'required|string|max:100',
                        'last_name'           => 'nullable|string|max:100',
                        'role_id'             => 'required|integer',
                        'phone'               => 'required|string|max:20',
                        'email'               => 'required|email|max:100',
                        'allow_authentication'=> 'nullable|boolean',
                       
                    ]);
                    $data = $employeedata->validated();
                    if (isset($data['shift_schedule_id']) && is_array($data['shift_schedule_id'])) {
                        $data['shift_schedule_id'] = implode(',', $data['shift_schedule_id']);
                    }

                    if ($request->input('allow_authentication') == '1') {
                        $data['user_id'] = $randomuser_id ?? null; // ensure $randomuser_id is set
                    }

                   Developer::emergency('data append',['employeedate'=>$data]);
                    $datasave = BusinessDB::table('employees')->insert($data);
                    Developer::emergency('data saved employee',['employeedate'=>$data]);
                    $employeedetails =Validator::make($request->all(), [
                        'employee_id'         => 'required|string|max:100',
                        'company_id'          => 'nullable|string|max:100',
                        'branch_id'           => 'nullable|string|max:100',
                        'profile'             => 'nullable',
                        'joined_date'         => 'nullable|date',
                        'birth_date'          => 'nullable|date',
                        'gender'              => 'required|string',

                    ]);
                    $details = $employeedetails->validated();
                    
                    if ($request->input('allow_authentication') == '1') {
                      $details['user_id'] = $randomuser_id;
                    }
                    $detailssave = BusinessDB::table('employee_details')->insert($details);
                    Developer::emergency('data saved employeedata',['detailsdata'=>$detailssave]);
                    if ($employeedata->fails()) {
                        return response()->json([
                            'status'  => false,
                            'title'   => 'Validation Error',
                            'message' => $employeedata->errors()->first()
                        ]);
                    }
                   $user_id = Random::uniqueId('USR');

                    
                    Developer::alert('add device', ['add_device' => $request['add_device']]);
                    // If device details need to be added
                   if ($request->add_device == '1') {
                        // Set up parameters for device_users table
                        $deviceuserdata = [
                            'device_user_id' => $request['pin'] ?? '',
                            'name'          => $request['name'] ?? '',
                            'privilege'     => $request['pri'] ?? 0,
                            'password'      => $request['passwd'] ?? '',
                            'card_number'   => $request['card'] ?? '',
                            'group_id'      => $request['grp'] ?? 1,
                            'expires'       => $request['expires'] ?? '0',
                            'start_datetime' => !empty($request['start_datetime']) ? date('Y-m-d', strtotime($request['start_datetime'])) : null,
                            'end_datetime'  => !empty($request['end_datetime']) ? date('Y-m-d', strtotime($request['end_datetime'])) : null,
                        ];

                        // Parameters for Adms::command (keeping original keys)
                        $params = [
                            'PIN'           => $request['pin'],
                            'Name'          => $request['name'],
                            'Pri'           => $request['pri'],
                            'Verify'        => $request['verify'], // Not mapped to device_users; used for Adms::command
                            'Card'          => $request['card'],
                            'Grp'           => $request['grp'],
                            'Passwd'        => $request['passwd'],
                            'Expires'       => $request['expires'],
                            'StartDatetime' => date('Y-m-d', strtotime($request['start_datetime'])),
                            'EndDatetime'   => date('Y-m-d', strtotime($request['end_datetime'])),
                        ];

                        Developer::alert('params', ['params' => $params]);
                        Developer::alert('device_ids in request', ['device_ids' => $request->device_id]);

                        // Insert for each device_id
                        $results = [];
                        foreach ($request->device_id as $deviceId) {
                            $deviceId = trim($deviceId);
                            $serial_num = BusinessDB::table('devices')
                                ->where('device_id', $deviceId)
                                ->value('serial_number');

                            if ($serial_num) {
                                Developer::alert('Sending to device', ['device_id' => $deviceId, 'serial_number' => $serial_num]);

                                // Add device_id to deviceuserdata
                                $deviceuserdata['device_id'] = $deviceId;

                                // Insert into device_users table
                                $insertResult = BusinessDB::table('device_users')->insert($deviceuserdata);
                                $results[] = ['device_id' => $deviceId, 'db_insert' => $insertResult];

                                // Send to ADMS
                                $admsResult = Adms::command($serial_num, $business_id, 'ADD USER', $params);
                                $results[] = ['device_id' => $deviceId, 'adms_result' => $admsResult];

                                Developer::alert('ADMS Result', ['result' => $admsResult]);
                            } else {
                                Developer::error('Serial number not found for device', ['device_id' => $deviceId]);
                                $results[] = ['device_id' => $deviceId, 'error' => 'Serial number not found'];
                            }
                        }

                    
                    }


                    return response()->json([
                        'status'        => true,
                        'reload_table'  => true,
                        'token'         => $reqSet['token'],
                        'affected'      => $data['employee_id'] ?? '-', 
                        'title'         => 'Success',
                        'message'       => 'Employee added successfully',
                    ]);

                    break;
                
                     case 'business_departments':
                    $validator = Validator::make($request->all(), [
                        'company_id'    => 'required|string|max:100',
                        'branch_id'     => 'required|string|max:100',
                        'department_id' => 'required|string|max:50|',
                        'department'    => 'required|string|max:100',
                        'description'   => 'nullable|string|max:255',
                        'status'        => 'required|in:active,inactive',
                    ]);

                    if ($validator->fails()) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Validation Error',
                            'message' => $validator->errors()->first()
                        ]);
                    }

                    $validated = $validator->validated();
                    break;
                      case 'business_designations':
                    $validator = Validator::make($request->all(), [
                        'company_id'     => 'required|string|max:100',
                        'branch_id'      => 'required|string|max:100',
                        'department_id'  => 'required|string|max:50',
                        'designation_id' => 'required|string|max:50',
                        'designation'    => 'required|string|max:100',
                        'description'    => 'nullable|string|max:255',
                        'status'         => 'required|in:active,inactive',

                    ]);

                    if ($validator->fails()) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Validation Error',
                            'message' => $validator->errors()->first()
                        ]);
                    }

                    $validated = $validator->validated();
                    break;
                     case 'business_documents':
                    $validator = Validator::make($request->all(), [
                        'company_id'     => 'required|string|max:100',
                        'branch_id'      => 'required|string|max:100',
                        'document_id'    => 'required|string|max:50',
                        'document_name'  => 'required|string|max:100',
                        'category'       => 'required|string|in:legal,finance,hr,other',
                        'file_type'      => 'required|string|in:pdf,doc,xls,img',
                        'description'    => 'nullable|string|max:255',
                        'status'         => 'required|in:active,inactive',
                    ]);

                    if ($validator->fails()) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Validation Error',
                            'message' => $validator->errors()->first()
                        ]);
                    }

                    $validated = $validator->validated();

                    // Convert file to base64
                    if ($request->hasFile('document_file')) {
                        $file = $request->file('document_file');
                        $fileContent = file_get_contents($file->getRealPath());
                        $base64 = base64_encode($fileContent);
                        $validated['file_base64'] = $base64;
                        $validated['file_name'] = $file->getClientOriginalName();
                        $validated['file_mime'] = $file->getClientMimeType();
                    } else {
                        return response()->json([
                            'status' => false,
                            'title' => 'File Missing',
                            'message' => 'Document file is required.'
                        ]);
                    }

                    // Now you can insert $validated into your infosysdb database
                    // Example: InfosysDB::table('documents')->insert($validated);

                    break;

                default:
                    return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                              >>> MODIFY THIS SECTION (END) <<<                                   *
             *                                                                                                  *
             ****************************************************************************************************/

            // Add metadata
            if (!empty($validated)) {
            $validated['created_by'] = Skeleton::getAuthenticatedUser()->user_id;
            $validated['created_at'] = now();
            $validated['updated_at'] = now();
            Developer::emergency('validated data',['validated'=>$validated]);
                $result = Data::create('business', $reqSet['table'], $validated);
            }
            return response()->json(['status' => $result['status'], 'reload_table' => true, 'token' => $reqSet['token'], 'affected' => $result['status'] ? $result['data']['id'] : '-', 'title' => $result['status'] ? 'Success' : 'Failed', 'message' => $result['status'] ? 'Token added successfully' : $result['message']]);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.']);
        }
    }
}
