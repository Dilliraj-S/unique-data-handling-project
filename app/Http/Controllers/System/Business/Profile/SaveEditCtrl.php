<?php
namespace App\Http\Controllers\System\Business\Profile;
use App\Facades\{BusinessDB, CentralDB, Developer, Skeleton, FileStorage};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Storage, Validator, Hash};
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
        Developer::info('SaveEditCtrl', ['message' => 'Processing save request for business profile update.']);
        try {
            // Extract and validate token
            $token = $request->input('save_token');
            Developer::info('SaveEditCtrl', ['token' => $token]);
            if (!$token) {
                return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.'], 422);
            }
            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
            }
            switch ($reqSet['key']) {
                case 'business_profile_update':
                    $type = $request->input('type');
                    Developer::log('business_profile_update', 'Saving profile update for type: ' . $type);
                    $userId = Skeleton::getAuthenticatedUser()->user_id;
                    $validationRules = [];
                    // Define validation rules based on type
                    switch ($type) {   
                        case 'main':
                            $validationRules = [
                                'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048', // Ensure valid image types, max 2MB
                                'first_name' => 'required|string|max:255',
                                'last_name' => 'required|string|max:255',
                                'joined_date' => 'required|date',
                            ];

                            Developer::info('SaveEditCtrl', ['validationRules' => $validationRules]);
                            break;
                        case 'basicinfo':
                            $validationRules = [
                                'phone' => 'required|string|regex:/^[0-9]{10,15}$/', // Phone number
                                'email' => 'required|email|max:255',
                                'gender' => 'required|string|in:Male,Female,Others',
                                'birth_date' => 'required|date',
                                'address' => 'required|string|max:1000',
                            ];
                            break;
                        case 'about':
                            $validationRules = [
                                'about' => 'required|string|max:2000',
                            ];
                            break;
                        case 'personalinfo':
                            $validationRules = [
                                'nationality' => 'required|string|max:255',
                                'marital_status' => 'required|string|in:Single,Married,Divorced,Widowed,Separated',
                            ];
                            break;
                        case 'bankdetails':
                            $validationRules = [
                                'bank_accounts' => 'required|array',
                                'bank_accounts.*.account_number' => 'required|string|max:50',
                                'bank_accounts.*.bank_name' => 'required|string|max:255',
                                'bank_accounts.*.ifsc_code' => 'required|string|max:20',
                                'bank_accounts.*.branch' => 'required|string|max:255',
                                'bank_accounts.*.account_type' => 'required|string|in:Savings,Current',
                            ];
                            break;
                        case 'emergencycontact':
                            $validationRules = [
                                'items' => 'required|array|min:1',
                                'items.*.name' => 'required|string|max:255',
                                'items.*.relation' => 'required|string|max:255',
                                'items.*.contact' => 'required|string|regex:/^[0-9]{10,15}$/',
                            ];
                            break;
                        case 'familyinfo':
                            $validationRules = [
                                'items' => 'required|array|min:1',
                                'items.*.name' => 'required|string|max:255',
                                'items.*.relation' => 'required|string|max:255',
                                'items.*.dob' => 'required|date',
                                'items.*.phone' => 'required|string|regex:/^[0-9]{10,15}$/',
                            ];
                            break;
                        case 'educationalinfo':
                            $validationRules = [
                                'items' => 'required|array|min:1',
                                'items.*.degree' => 'required|string|max:255',
                                'items.*.year' => 'required|date',
                                'items.*.institution' => 'required|string|max:255',
                            ];
                            break;
                        case 'experience':
                            $validationRules = [
                                'items' => 'required|array|min:1',
                                'items.*.company' => 'required|string|max:255',
                                'items.*.role' => 'required|string|max:255',
                                'items.*.years' => 'required|numeric|min:0',
                            ];
                            break;
                        case 'summary':
                            $validationRules = [
                                'skills' => 'required|string|max:255',
                                'languages' => 'required|string|max:255',
                                'hobbies' => 'required|string|max:255',
                            ];
                            Developer::info($request);
                            break;
                        case 'deactivate':
                            $validationRules = [
                                'account_status' => 'required',
                            ];
                            break;
                        case 'passwordchange':
                            $validationRules = [
                                'currentPassword' => 'required',
                                'newPassword' => 'required|min:8|regex:/[a-z]/|regex:/[0-9\s\W]/',
                                'confirmPassword' => 'required|same:newPassword',
                            ];
                            break;
                        case 'sociallinks':
                            $validationRules = [
                                'facebook_url' => 'nullable|url|max:255',
                                'instagram_url' => 'nullable|url|max:255',
                                'youtube_url' => 'nullable|url|max:255',
                                'x_url' => 'nullable|url|max:255',
                                'linkedin_url' => 'nullable|url|max:255',
                                'github_url' => 'nullable|url|max:255',
                            ];
                            break;
                        default:
                            return response()->json([
                                'status' => false,
                                'title' => 'Invalid Request',
                                'message' => 'Invalid profile update type'
                            ], 422);
                    }
                    // Validate request
                    $validator = Validator::make($request->all(), $validationRules);
                    if ($validator->fails()) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Validation Error',
                            'message' => $validator->errors()->first()
                        ], 422);
                    }
                    $validated = $validator->validated();
                    Developer::info('Validated input for about case', [
                        'validated' => $validated
                    ]);
                    $affected = 0;
                    // Process data based on type
                    switch ($type) {
                       case 'main':

                            if (!empty($validated['image'])) {
                                $path = FileStorage::upload($request, 'image', 'profile_photos', 'storage');
                               
                            }
                            $employeeData = [
                                'profile'=>$path ?? '',
                                'first_name' => $validated['first_name'],
                                'last_name' => $validated['last_name'],
                                'joined_date' => $validated['joined_date'],
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            Developer::info($employeeData);
                            $affected = BusinessDB::table('employees')->where('user_id', $userId)->update($employeeData);
                           
                            break;
                        case 'basicinfo':
                            // Prepare employee and employee_details data
                            $employeeData = [
                                'phone' => $validated['phone'],
                                'email' => $validated['email'],
                                'birth_date' => $validated['birth_date'],
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            $employeeDetailsData = [
                                'gender' => $validated['gender'],
                                'address' => $validated['address'],
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            // Update tables
                            $affected = BusinessDB::table('employees')->where('user_id', $userId)->update($employeeData);
                            $affected += BusinessDB::table('employee_details')->updateOrInsert(
                                ['user_id' => $userId],
                                $employeeDetailsData
                            );
                            break;
                        case 'about':
                            // Prepare data
                            $employeeDetailsData = [
                                'about' => $validated['about'],
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            $affected = BusinessDB::table('employee_details')->where('user_id', $userId)->update($employeeDetailsData);
                            break;
                        case 'personalinfo':
                            // Prepare data
                            $employeeDetailsData = [
                                'nationality' => $validated['nationality'],
                                'marital_status' => $validated['marital_status'],
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            // Update
                            $affected = BusinessDB::table('employee_details')->updateOrInsert(
                                ['user_id' => $userId],
                                $employeeDetailsData
                            );
                            break;
                        case 'bankdetails':
                            // Prepare data
                            $employeeDetailsData = [
                                'bank_accounts' => json_encode($validated['bank_accounts']),
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            // Update   
                            $affected = BusinessDB::table('employee_details')->updateOrInsert(
                                ['user_id' => $userId],
                                $employeeDetailsData
                            );
                            break;
                        case 'emergencycontact':
                            $employeeDetailsData = [
                                'emergency_contact' => json_encode($validated['items']),
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            $affected = BusinessDB::table('employee_details')->updateOrInsert(
                                ['user_id' => $userId],
                                $employeeDetailsData
                            );
                            break;
                        case 'familyinfo':
                            $employeeDetailsData = [
                                'family_info' => json_encode($validated['items']),
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            $affected = BusinessDB::table('employee_details')->updateOrInsert(
                                ['user_id' => $userId],
                                $employeeDetailsData
                            );
                            break;
                        case 'educationalinfo':
                            $employeeDetailsData = [
                                'educational_info' => json_encode($validated['items']),
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            $affected = BusinessDB::table('employee_details')->updateOrInsert(
                                ['user_id' => $userId],
                                $employeeDetailsData
                            );
                            break;
                        case 'experience':
                            $employeeDetailsData = [
                                'experience' => json_encode($validated['items']),
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            $affected = BusinessDB::table('employee_details')->updateOrInsert(
                                ['user_id' => $userId],
                                $employeeDetailsData
                            );
                            break;
                        case 'summary':
                            $employeeDetailsData = [
                                'skills' => $validated['skills'],
                                'languages' => $validated['languages'],
                                'hobbies' => $validated['hobbies'],
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            $affected = BusinessDB::table('employee_details')->updateOrInsert(
                                ['user_id' => $userId],
                                $employeeDetailsData
                            );
                            break;
                        case 'deactivate':
                            $securityData = [
                                'account_status' => 'inactive',
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            $affected = CentralDB::table('users')->where('user_id', $userId)->update($securityData);
                            break;
                        case 'passwordchange':
                            $user = BusinessDB::table('employees')->where('user_id', $userId)->first();
                            if (!$user) {
                                return response()->json([
                                    'status' => false,
                                    'title' => 'User Not Found',
                                    'message' => 'User account not found.'
                                ], 404);
                            }
                            if (!Hash::check($validated['currentPassword'], $user->password)) {
                                return response()->json([
                                    'status' => false,
                                    'title' => 'Invalid Password',
                                    'message' => 'Current password is incorrect.'
                                ], 422);
                            }
                            $securityData = [
                                'password' => Hash::make($validated['newPassword']),
                                'updated_by' => $userId,
                                'updated_at' => now(),
                            ];
                            CentralDB::table('users')->where('user_id', $userId)->update($securityData);
                            $affected = BusinessDB::table('employees')->where('user_id', $userId)->update($securityData);
                            break;
                        case 'sociallinks':
                            $socialLinks = array_filter([
                                'facebook' => $validated['facebook_url'] ?? null,
                                'instagram' => $validated['instagram_url'] ?? null,
                                'youtube' => $validated['youtube_url'] ?? null,
                                'x' => $validated['x_url'] ?? null,
                                'linkedin' => $validated['linkedin_url'] ?? null,
                                'github' => $validated['github_url'] ?? null,
                            ], fn($value) => !is_null($value) && $value !== '');
                            $affected = BusinessDB::table('employee_details')->updateOrInsert(
                                ['user_id' => $userId],
                                [
                                    'social_links' => json_encode($socialLinks),
                                    'updated_by' => $userId,
                                    'updated_at' => now(),
                                ]
                            );
                            break;
                    }
                    // Return response
                    return response()->json([
                        'status' => $affected > 0,
                        'title' => $affected > 0 ? 'Success' : 'Failed',
                        'message' => $affected > 0 ? 'Profile updated successfully' : 'No changes were made'
                    ], $affected > 0 ? 200 : 422);
                default:
                    return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.'], 422);
            }
        } catch (Exception $e) {
            return response()->json([
                'status' => false,
                'title' => 'Error',
                'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.'
            ], 500);
        }
    }
}
