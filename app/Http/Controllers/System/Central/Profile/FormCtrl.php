<?php

namespace App\Http\Controllers\System\Central\Profile;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;


/**
 * Controller for saving new Profile entities.
 */
class FormCtrl extends Controller
{
    /**
     * Saves new Profile entity data based on validated input.
     *
     * @param Request $request HTTP request with form data and token
     * @return JsonResponse Success or error message
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $request->input('save_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            // Initialize variables
            $byMeta = $timestampMeta = true;
            $reloadTable = $reloadCard = $reloadPage = $holdPopup = false;
            $validated = [];
            $title = 'Success';
            $message = 'Profile data saved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch ($reqSet['key']) {
                case 'central_change_password':
                    $USER_ID = Skeleton::getAuthenticatedUser()->user_id;

                    $validator = Validator::make($request->all(), [
                        'currentPassword' => 'required',
                        'newPassword' => [
                            'required',
                            'string',
                            'min:8',
                            'same:confirmPassword'
                        ],
                    ], [
                        'newPassword.same' => 'New password and confirmation do not match.',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    // Get current user
                    $user = auth()->user();
                    if (!$user) {
                        return ResponseHelper::moduleError('User Error', 'User not authenticated.');
                    }
                    // Check current password
                    if (!Hash::check($request->input('currentPassword'), $user->password)) {
                        return ResponseHelper::moduleError('Validation Error', 'Current password is incorrect.');
                    }
                    // Update password using raw SQL
                    $hashedPassword = Hash::make($request->input('newPassword'));
                    $updated = DB::update(
                        'UPDATE users SET password = ?, password_updated_at = NOW() WHERE id = ?',
                        [$hashedPassword, $user->id]
                    );
                    if ($updated) {
                        return response()->json([
                            'status' => true,
                            'reload_table' => false,
                            'affected' => $user->id,
                            'title' => 'Password Updated!!',
                            'message' => 'Your Password has been updated successfully. Please log in!.',
                            'script' => "window.location.href = '" . route('logout') . "';"
                        ]);
                    } else {
                        return ResponseHelper::moduleError('Save Error', 'Failed to update password.');
                    }
                    break;

                case 'central_change_username':
                    $validator = Validator::make($request->all(), [
                        'currentUsername' => 'required|string',
                        'newUsername' => [
                            'required',
                            'string',
                            'max:15',
                            'regex:/^(?=.*[A-Z])(?=.*[\s\W]).+$/', // At least 1 uppercase + 1 symbol/space
                            Rule::unique('users', 'username')->ignore(auth()->id()),
                        ],
                        'confirmPassword' => 'required|string',
                    ], [
                        'newUsername.required' => 'New username is required.',
                        'newUsername.max' => 'Username cannot exceed 15 characters.',
                        'newUsername.regex' => 'Username must include at least one uppercase letter and one symbol or space.',
                        'newUsername.unique' => 'This username is already taken.',
                        'confirmPassword.required' => 'Please confirm your password.',
                    ]);

                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }

                    $user = auth()->user();
                    if (!$user) {
                        return ResponseHelper::moduleError('User Error', 'User not authenticated.');
                    }


                    // Check that the current username matches
                    if ($request->input('currentUsername') !== $user->username) {
                        return ResponseHelper::moduleError('Validation Error', 'Current username does not match our records.');
                    }

                    // Check password confirmation
                    if (!Hash::check($request->input('confirmPassword'), $user->password)) {
                        return ResponseHelper::moduleError('Validation Error', 'Password confirmation is incorrect.');
                    }

                    $newUsername = $request->input('newUsername');

                    // Ignore if the username is unchanged
                    if ($user->username === $newUsername) {
                        return response()->json([
                            'status' => false,
                            'reload_table' => false,
                            'token' => $reqSet['token'] ?? null,
                            'title' => 'No Change',
                            'message' => 'The new username is the same as the current one.',
                        ]);
                    }

                    // Update username
                    $updated = DB::update(
                        'UPDATE users SET username = ?, updated_at = NOW() WHERE id = ?',
                        [$newUsername, $user->id]
                    );

                    if ($updated) {
                        // Auth::logout();
                        return response()->json([
                            'status' => true,
                            'reload_table' => false,
                            'affected' => $user->id,
                            'title' => 'Username Changed',
                            'message' => 'Your username has been updated successfully. Please log in again.',
                            'script' => "window.location.href = '" . route('logout') . "';"
                        ]);
                    } else {
                        return ResponseHelper::moduleError('Save Error', 'Failed to update username.');
                    }
                    break;


                case 'central_deactive':
                    $user = auth()->user();
                    if (!$user) {
                        return ResponseHelper::moduleError('User Error', 'User not authenticated.');
                    }
                    // Check if already deactive
                    if ($user->account_status === 'deactive') {
                        return response()->json([
                            'status' => false,
                            'reload_table' => false,
                            'token' => $reqSet['token'],
                            'affected' => $user->id,
                            'title' => 'Already Deactivated',
                            'message' => 'Your account is already in deactive state.'
                        ]);
                    }
                    // Deactivate the account
                    $updated = DB::update(
                        'UPDATE users SET account_status = ?, updated_at = NOW() WHERE id = ?',
                        ['deactive', $user->id]
                    );
                    if ($updated) {
                        return response()->json([
                            'status' => true,
                            'reload_table' => false,
                            'token' => $reqSet['token'],
                            'affected' => $user->id,
                            'title' => 'Account Deactivated',
                            'message' => 'Your account has been deactivated successfully.'
                        ]);
                    } else {
                        return ResponseHelper::moduleError('Save Error', 'Failed to deactivate account.');
                    }
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add metadata
            if ($byMeta || $timestampMeta) {
                if ($byMeta) {
                    $validated['created_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
                if ($timestampMeta) {
                    $validated['created_at'] = $validated['updated_at'] = now();
                }
            }
            // Insert data
            $result = Data::create('central', $reqSet['table'], $validated);
            // Generate response
            return response()->json(['status' => $result['status'], 'reload_table' => $reloadTable, 'reload_card' => $reloadCard, 'reload_page' => $reloadPage, 'hold_popup' => $holdPoup, 'token' => $reqSet['token'], 'affected' => $result['status'] ? $result['data']['id'] : '-', 'title' => $result['status'] ? $title : 'Failed', 'message' => $result['status'] ? $message : $result['message']]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.', 500);
        }
    }
}
