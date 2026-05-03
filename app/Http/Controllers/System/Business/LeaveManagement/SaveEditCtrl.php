<?php

namespace App\Http\Controllers\System\Business\LeaveManagement;


use App\Facades\{BusinessDB, CentralDB, Developer, Skeleton};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
use App\Http\Classes\FileHandleHelper;

/**
 * Controller for saving updated developer entities.
 */
class SaveEditCtrl extends Controller
{
    /**
     * Saves updated developer entity data based on validated input.
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
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
            }

            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            $validated = null;
            switch ($reqSet['key']) {
                case 'central_skeleton_tokens':
                    $validator = Validator::make($request->all(), [
                        'key' => 'required|string|regex:/^[a-z_\s]{3,100}$/|max:100',
                        'module' => 'required|string',
                        'system' => 'required|in:business,central',
                        'type' => 'required|in:data,unique,select,other',
                        'table' => 'required|string|regex:/^[a-z_\s]{3,100}$/|max:100',
                        'column' => 'required|string|max:150',
                        'value' => 'required|string|max:150',
                        'act' => 'required|string|max:150',
                        'validate' => 'required|in:0,1',
                        'actions' => 'nullable|array|in:c,v,e,d'
                    ]);

                    if ($validator->fails()) {
                        return response()->json(['status' => false, 'title' => 'Validation Error', 'message' => $validator->errors()->first()]);
                    }

                    $validated = $validator->validated();
                    $validated['actions'] = isset($validated['actions']) ? implode('', $validated['actions']) : null;
                    break;
                case 'business_branches':
                    $validator = Validator::make($request->all(), [
                        'sno' => 'required|string|max:100',
                        'company_id' => 'required|string|max:100',
                        'branch_id' => 'required|string|max:100',
                        'name' => 'required|string|max:150',
                        'legal_name' => 'nullable|string|max:150',
                        'logo' => 'nullable|file|mimes:jpg,png,jpeg|max:2048',
                        'founded_date' => 'nullable|date',
                        'phone' => 'nullable|string|max:20',
                        'email' => 'nullable|email|max:150',
                        'no_of_employees' => 'nullable|integer|min:0',
                        'tax_id' => 'nullable|string|max:50',
                        'address_json' => 'nullable|string|max:500',
                        'status' => 'required|in:Active,Inactive',
                        'secure_version' => 'nullable|string|max:50',
                    ]);

                    if ($validator->fails()) {
                        return response()->json(['status' => false, 'title' => 'Validation Error', 'message' => $validator->errors()->first()]);
                    }

                    $validated = $validator->validated();
                    if (!empty($validated['address_json']) && !json_decode($validated['address_json'], true)) {
                        $validated['address_json'] = json_encode(['location' => $validated['address_json']]);
                    }
                    break;


                case ' business_departments':
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
                        'sno'            => 'required|string|max:50',
                        'company_id'     => 'required|string|max:100',
                        'branch_id'      => 'required|string|max:100',
                        'department_id'  => 'nullable|string|max:50',
                        'designation_id' => 'nullable|string|max:50',
                        'designation'    => 'nullable|string|max:100',
                        'description'    => 'nullable|string|max:255',
                        'status'         => 'required|in:Active,Inactive',
                        'created_by'     => 'nullable|string|max:255',
                        'updated_by'     => 'nullable|string|max:255',
                        'delete_on'      => 'nullable|date',
                        'restored_at'    => 'nullable|date',
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

                case ' business_documents':
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
                case 'business_manage_leave':
                    $validator = Validator::make($request->all(), [
                        'status'      => 'required|in:pending,approved,rejected',
                        'approved_at' => 'required',
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
                case 'business_companies':
                    $validator = Validator::make($request->all(), [
                        'sno' => 'required|integer',
                        'company_id' => 'required|string',
                        'name' => 'required|string',
                        'legal_name' => 'required|string',
                        'manager_name' => 'nullable|string',
                        'manager_email' => 'nullable|email|max:150',
                        'manager_phone' => 'nullable|string|max:150',
                        'founded_date' => 'nullable|date',
                        'industry' => 'required|string|max:150',
                        'website' => 'required|url|max:255',
                        'phone' => 'required|string|max:150',
                        'email' => 'required|email|max:150',
                        'tax_id' => 'nullable|string|max:100',
                        'no_of_employees' => 'nullable|integer|min:0',
                        'address_street' => 'required|string|max:255',
                        'address_city' => 'required|string|max:150',
                        'address_state' => 'nullable|string|max:150',
                        'address_country' => 'required|string|max:150',
                        'address_postal_code' => 'required|string|max:20',
                        'facebook_url' => 'nullable|url|max:255',
                        'x_url' => 'nullable|url|max:255',
                        'linkedin_url' => 'nullable|url|max:255',
                        'instagram_url' => 'nullable|url|max:255',
                        'youtube_url' => 'nullable|url|max:255',
                        'aadhar_number' => 'required|string|max:12',
                        'pan_number' => 'required|string|max:10',
                        'gst_number' => 'nullable|string|max:15',
                        'uan_number' => 'nullable|string|max:14',
                        'aadhar_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048',
                        'pan_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048',
                        'gst_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048',
                        'uan_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048',
                    ]);

                    if ($validator->fails()) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Validation Error',
                            'message' => $validator->errors()->first()
                        ]);
                    }

                    $validated = $validator->validated();
                    $validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
                    $validated['updated_at'] = now();

                    // Prepare JSON fields
                    $validated['address_json'] = json_encode([
                        'street' => $validated['address_street'],
                        'city' => $validated['address_city'],
                        'state' => $validated['address_state'],
                        'country' => $validated['address_country'],
                        'postal_code' => $validated['address_postal_code'],
                    ]);
                    $validated['social_links_json'] = json_encode([
                        'facebook_url' => $validated['facebook_url'],
                        'x_url' => $validated['x_url'],
                        'linkedin_url' => $validated['linkedin_url'],
                        'instagram_url' => $validated['instagram_url'],
                        'youtube_url' => $validated['youtube_url'],
                    ]);

                    // Handle file uploads
                    $imagePath = 'company/' . $validated['company_id'];
                    $files = [
                        'logo' => ['table' => 'companies', 'field' => 'logo'],
                        'manager_profile' => ['table' => 'companies', 'field' => 'manager_profile'],
                        'aadhar_file' => ['table' => 'company_documents', 'field' => 'document', 'type' => 'aadhar_number'],
                        'pan_file' => ['table' => 'company_documents', 'field' => 'document', 'type' => 'pan_number'],
                        'gst_file' => ['table' => 'company_documents', 'field' => 'document', 'type' => 'gst_number'],
                        'uan_file' => ['table' => 'company_documents', 'field' => 'document', 'type' => 'uan_number'],
                    ];

                    foreach ($files as $fileKey => $fileConfig) {
                        if ($request->hasFile($fileKey) && $request->file($fileKey)->isValid()) {
                            $path = $imagePath . '/' . ($fileConfig['table'] === 'companies' ? $fileConfig['field'] : 'docs');
                            $filePath = FileHandleHelper::upload($request, $fileKey, $path, 'public');
                            if ($fileConfig['table'] === 'companies') {
                                $validated[$fileConfig['field']] = $filePath;
                            } else {
                                $documentData[] = [
                                    'company_id' => $validated['company_id'],
                                    'document_type' => $fileConfig['type'],
                                    'document' => $filePath,
                                    'description' => $validated[$fileConfig['type']],
                                    'uploaded_at' => now(),
                                    'updated_at' => now(),
                                ];
                            }
                        }
                    }

                    unset(
                        $validated['address_street'],
                        $validated['address_city'],
                        $validated['address_state'],
                        $validated['address_country'],
                        $validated['address_postal_code'],
                        $validated['facebook_url'],
                        $validated['x_url'],
                        $validated['linkedin_url'],
                        $validated['instagram_url'],
                        $validated['youtube_url'],
                        $validated['aadhar_number'],
                        $validated['pan_number'],
                        $validated['gst_number'],
                        $validated['uan_number'],
                        $validated['aadhar_file'],
                        $validated['pan_file'],
                        $validated['gst_file'],
                        $validated['uan_file']
                    );

                    // Update company record
                    $affected = BusinessDB::table('companies')->where('company_id', $validated['company_id'])->update($validated);

                    // Update or create document records
                    if (!empty($documentData)) {
                        foreach ($documentData as $doc) {
                            BusinessDB::table('company_documents')
                                ->updateOrInsert(
                                    [
                                        'company_id' => $doc['company_id'],
                                        'document_type' => $doc['document_type']
                                    ],
                                    $doc
                                );
                        }
                    }

                    return response()->json([
                        'status' => $affected > 0,
                        'reload_table' => true,
                        'token' => $reqSet['token'],
                        'affected' => $affected > 0 ? $validated['company_id'] : '-',
                        'title' => $affected > 0 ? 'Success' : 'Failed',
                        'message' => $affected > 0 ? 'Company updated successfully' : 'Update failed'
                    ]);
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
            $validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
            $validated['updated_at'] = now();

            // Update data
            $affected = BusinessDB::table($reqSet['table'])->where($reqSet['act'], $reqSet['id'])->update($validated);

            return response()->json(['status' => $affected > 0, 'reload_table' => true, 'token' => $reqSet['token'], 'affected' => $affected, 'title' => $affected > 0 ? 'Success' : 'Failed', 'message' => $affected > 0 ? 'Token updated successfully' : 'No changes were made.']);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.']);
        }
    }
}
