<?php

namespace App\Http\Controllers\System\Business\UserManagement;

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
                case 'business_users':
                    $validator = Validator::make($request->all(), [
                        'user_id'            => 'nullable|string|max:100',
                        'business_id'        => 'nullable|string|max:100',
                        'first_name'         => 'nullable|string|max:100',
                        'last_name'          => 'nullable|string|max:100',
                        'role_id'            => 'nullable|integer',
                        'email'              => 'nullable|email|max:100',
                        'username'           => 'nullable|string|max:100',
                        'password'           => 'nullable|string|min:6|max:100',
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

                    // Fetch employee data from BusinessDB based on user_id or sno
                    $employeeQuery = BusinessDB::table('employees');
                    if (isset($validated['sno'])) {
                        $employeeQuery->where('sno', $validated['sno']);
                    } else {
                        $employeeQuery->where('user_id', $validated['user_id']);
                    }
                    $employee = $employeeQuery->first();

                    if (!$employee) {
                        return response()->json([
                            'status' => false,
                            'title' => 'Employee Not Found',
                            'message' => 'No employee found for the provided ID.'
                        ]);
                    }

                    // Merge or map employee data into validated data
                    $validated['user_id'] = $employee->user_id ?? $validated['user_id'];
                    $validated['first_name'] = $employee->first_name ?? $validated['first_name'];
                    $validated['last_name'] = $employee->last_name ?? $validated['last_name'];
                    $validated['role_id'] = $employee->role_id ?? $validated['role_id'];
                    $validated['email'] = $employee->email ?? $validated['email'];
                    $validated['username'] = $employee->username ?? $validated['username'];
                    $validated['password'] = $employee->password ?? bcrypt($validated['password']);
                    $validated['business_id'] = $employee->business_id ?? $validated['business_id'] ?? 'BIZ0002'; 
                    $validated['created_by'] = $employee->created_by ?? $validated['created_by'] ?? null;
                    $validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
                    $validated['updated_at'] = now();

                    // Check if user exists in CentralDB users table
                    $existingUser = CentralDB::table('users')
                        ->where('user_id', $validated['user_id'])
                        ->first();

                    if ($existingUser) {
                        // Update existing user
                        $affected = CentralDB::table('users')
                            ->where('user_id', $validated['user_id'])
                            ->update($validated);
                    } else {
                        // Insert new user
                        $validated['created_at'] = now();
                     
                    }

                    break;

                default:
                    return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                              >>> MODIFY THIS SECTION (END) <<<                                   *
             *                                                                                                  *
             ****************************************************************************************************/
            $affected = CentralDB::table('users')->insert($validated);
            return response()->json(['status' => $affected > 0, 'reload_table' => true, 'token' => $reqSet['token'], 'affected' => $affected, 'title' => $affected > 0 ? 'Success' : 'Failed', 'message' => $affected > 0 ? 'Token updated successfully' : 'No changes were made.']);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.']);
        }
    }
}
