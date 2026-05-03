<?php

namespace App\Http\Controllers\System\Central\Profile;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use App\Http\Helpers\FileHandleHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator, DB};

/**
 * Controller for saving updated Profile entities.
 */
class SaveEditCtrl extends Controller
{
    /**
     * Saves updated Profile entity data based on validated input.
     *
     * @param Request $request HTTP request containing form data and token
     * @return JsonResponse JSON response with status, title, and message
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $token = $request->input('save_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.');
            }
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            $byMeta = $timestampMeta = true;
            $reloadTable = $reloadCard = $reloadPage = $holdPopup = false;
            $validated = [];
            $title = 'Success';
            $message = 'Profile record updated successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'central_unique_profile_data':
                    $validator = Validator::make($request->all(), [

                        'profile' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',

                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    if ($request->hasFile('profile')) {
                        $uploadPath = public_path('storage/user/unq0000001/admin/banner');
                        if (!file_exists($uploadPath)) {
                            mkdir($uploadPath, 0777, true);
                        }
                        $file = $request->file('profile');
                        $filename = time() . '_' . $file->getClientOriginalName();
                        $file->move($uploadPath, $filename);
                        $validated['profile'] = 'storage/user/unq0000001/admin/banner/' . $filename;
                    }
                    $reloadTable = true;
                    $title = 'Profile Updated';
                    $message = 'Profile image uploaded and updated successfully.';

                    break;

                case 'central_update_profile_banner':
                    $validator = Validator::make($request->all(), [
                        'banner' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }

                    $validated = $validator->validated();

                    if ($request->hasFile('banner')) {
                        $uploadPath = public_path('storage/user/unq0000001/admin/banner');
                        if (!file_exists($uploadPath)) {
                            mkdir($uploadPath, 0777, true);
                        }

                        $file = $request->file('banner');
                        $filename = time() . '_' . $file->getClientOriginalName();
                        $file->move($uploadPath, $filename);
                        $bannerPath = 'storage/user/unq0000001/admin/banner/' . $filename;

                        //     // 🔽 Save the banner path to the `user_data` table
                        DB::table('user_data')
                            ->where('user_id', 'unq0000001') // Replace with dynamic user ID if needed
                            ->update(['banner' => $bannerPath]);

                        $validated['banner'] = $bannerPath;
                    }

                    $reloadTable = true;
                    $title = 'Banner Updated';
                    $message = 'Banner image uploaded and updated successfully.';
                    break;

                case 'central_unique_userdata':
                    $validator = Validator::make($request->all(), [
                        'first_name' => 'required|string|max:255',
                        'last_name' => 'required|string|max:255',
                        'email' => 'required|email|max:255',
                        'alt_email' => 'required|email|max:255',
                        'birth_date' => 'required|date',
                        'gender' => 'required|in:Male,Female,Others',
                        'phone' => 'nullable|string|max:20',
                        'phone_alt' => 'required|string|max:20',
                        'address_line1' => 'required|string|max:255',
                        'address_line2' => 'required|string|max:255',
                        'landmark' => 'required|string|max:255',
                        'city' => 'required|string|max:100',
                        'state' => 'required|string|max:100',
                        'pin_code' => 'required|numeric|digits_between:4,10',
                    ]);

                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }

                    $validated = $validator->validated();
                    $user = auth()->user();

                    if (!$user) {
                        return ResponseHelper::moduleError('Auth Error', 'User not authenticated.');
                    }

                    // Save address in JSON format
                    $addressJson = json_encode([
                        'address_line1' => $validated['address_line1'],
                        'address_line2' => $validated['address_line2'],
                        'landmark' => $validated['landmark'],
                        'city' => $validated['city'],
                        'state' => $validated['state'],
                        'pin_code' => $validated['pin_code'],
                    ]);

                    // 1. Update or insert into `users` table
                    DB::table('users')->updateOrInsert(
                        ['user_id' => $user->user_id],
                        [
                            'first_name' => $validated['first_name'],
                            'last_name' => $validated['last_name'],
                            'email' => $validated['email'],
                            'verification' => 'verified',
                            'updated_at' => now(),
                        ]
                    );

                    // 2. Update or insert into `user_data` table
                    DB::table('user_data')->updateOrInsert(
                        ['user_id' => $user->user_id],
                        [
                            'birth_date' => $validated['birth_date'],
                            'gender' => $validated['gender'],
                            'phone' => $validated['phone'],
                            'alt_email' => $validated['alt_email'],
                            'phone_alt' => $validated['phone_alt'],
                            'address_json' => $addressJson,
                            'updated_at' => now(),
                        ]
                    );

                    // Return response or set return values for caller
                    $reloadTable = true;
                    $title = 'Profile Updated';
                    $message = 'Profile updated successfully.';
                    break;

                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            if ($byMeta || $timestampMeta) {
                if ($byMeta) {
                    $validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
                if ($timestampMeta) {
                    $validated['updated_at'] = now();
                }
            }
            $affected = Data::update('central', $reqSet['table'], $validated, [$reqSet['act'] => $reqSet['id']], $reqSet['key']);
            return response()->json(['status' => $affected > 0, 'reload_table' => $reloadTable, 'reload_card' => $reloadCard, 'reload_page' => $reloadPage, 'hold_popup' => $holdPopup, 'token' => $reqSet['token'], 'affected' => $affected, 'title' => $affected > 0 ? $title : 'Failed', 'message' => $affected > 0 ? $message : 'No changes were made.']);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.');
        }
    }
    /**
     * Saves bulk updated Profile entity data based on validated input.
     *
     * @param Request $request HTTP request containing form data and token
     * @return JsonResponse JSON response with status, title, and message
     */
    public function bulk(Request $request): JsonResponse
    {
        try {
            $token = $request->input('save_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.');
            }
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            $ids = array_filter(explode('@', $request->input('update_ids', '')));
            if (empty($ids)) {
                return response()->json(['status' => false, 'title' => 'Invalid Data', 'message' => 'No valid IDs provided for update.']);
            }
            $byMeta = $timestampMeta = true;
            $reloadTable = $reloadCard = $reloadPage = $holdPopup = false;
            $validated = [];
            $title = 'Success';
            $message = 'Profile records updated successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'Profile_entities':
                    $validator = Validator::make($request->all(), [
                        'type' => 'required|in:data,unique,select,other',
                        'status' => 'required|in:active,inactive',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $reloadTable = true;
                    $title = 'Entities Updated';
                    $message = 'Profile entities configuration updated successfully.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            if ($byMeta || $timestampMeta) {
                if ($byMeta) {
                    $validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
                if ($timestampMeta) {
                    $validated['updated_at'] = now();
                }
            }
            $affected = Data::update('central', $reqSet['table'], $validated, [$reqSet['act'] => ['operator' => 'IN', 'value' => $ids]], $reqSet['key']);
            return response()->json(['status' => $affected > 0, 'reload_table' => $reloadTable, 'reload_card' => $reloadCard, 'reload_page' => $reloadPage, 'hold_popup' => $holdPopup, 'token' => $reqSet['token'], 'affected' => $affected, 'title' => $affected > 0 ? $title : 'Failed', 'message' => $affected > 0 ? $message : 'No changes were made.']);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.');
        }
    }
}
