<?php


namespace App\Http\Controllers\System\Business\EmployeeManagement;

use App\Facades\{CentralDB, Data, Skeleton};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
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
                    $validator = Validator::make($request->all(), [
                        'company_id'         => 'nullable|string|max:100',
                        'branch_id'          => 'required|string|max:100',
                        'user_id'            => 'nullable|string|max:100',
                        'employee_id'        => 'nullable|string|max:100',
                        'first_name'         => 'required|string|max:100',
                        'last_name'          => 'nullable|string|max:100',
                        'role_id'            => 'required|integer',
                        'birth_date'         => 'nullable|date',
                        'phone'              => 'required|string|max:20',
                        'phone_alt'          => 'nullable|string|max:20',
                        'email'              => 'required|email|max:100',
                        'email_alt'          => 'nullable|email|max:100',
                        'username'           => 'required|string|max:100',
                        'password'           => 'required|string|min:6|max:100',
                        'joined_date'        => 'nullable|date',
                        'allow_authentication' => 'nullable|boolean',
                        'created_by'         => 'nullable|string|max:20',
                        'updated_by'         => 'nullable|string|max:20',
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
            $validated['created_by'] = Skeleton::getAuthenticatedUser()->user_id;
            $validated['created_at'] = now();
            $validated['updated_at'] = now();

            // Insert data
            $result = Data::create('business', $reqSet['table'], $validated);

            return response()->json(['status' => $result['status'], 'reload_table' => true, 'token' => $reqSet['token'], 'affected' => $result['status'] ? $result['data']['id'] : '-', 'title' => $result['status'] ? 'Success' : 'Failed', 'message' => $result['status'] ? 'Token added successfully' : $result['message']]);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.']);
        }
    }
}
