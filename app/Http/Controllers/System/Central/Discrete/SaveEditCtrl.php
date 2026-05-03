<?php

namespace App\Http\Controllers\System\Central\Discrete;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator, DB};

/**
 * Controller for saving updated Discrete entities.
 */
class SaveEditCtrl extends Controller
{
    /**
     * Saves updated Discrete entity data based on validated input.
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
            $reloadTable = $reloadCard = false;
            $validated = [];
            $title = 'Success';
            $message = 'Record updated successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'central_unique_categories':
                    $validator = Validator::make($request->all(), [
                        'category' => 'required|string|regex:/^[a-z_]{3,100}$/|max:100',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $reloadTable = true;
                    $title = 'Category Updated';
                    $message = 'Category configuration updated successfully.';
                    break;
                case 'central_unique_options':
                    $validator = Validator::make($request->all(), [
                        'type' => 'required|string|max:50',
                        'name' => 'required|string|max:200',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    
                    // Fetch the category name based on the selected category_id
                    $categoryResult = Data::get('central', 'categories', [
                        'select' => ['category'],
                        'where' => ['category_id' => $validated['type']]
                    ], $reqSet['key']);

                    if (!$categoryResult['status'] || empty($categoryResult['data'])) {
                        return ResponseHelper::moduleError('Error', 'Selected category not found.');
                    }

                    $categoryName = $categoryResult['data'][0]['category'] ?? '';
                    
                    // Map form fields to table columns
                    $validated['category'] = $categoryName;
                    $validated['option'] = $validated['name'];
                    unset($validated['type'], $validated['name']);
                    
                    // Check for duplicate option in the same category (excluding current record)
                    $normalize = fn($name) => strtolower(preg_replace('/\s+/', '', $name));
                    $inputNameNormalized = $normalize($validated['option']);

                    $allOptions = Data::get('central', 'options', [
                        'select' => ['option', 'category', $reqSet['act']],
                        'where_not' => [$reqSet['act'] => $reqSet['id']]
                    ], $reqSet['key']);

                    if ($allOptions['status'] && !empty($allOptions['data'])) {
                        foreach ($allOptions['data'] as $option) {
                            $existingName = $option['option'] ?? '';
                            $existingCat = $option['category'] ?? '';
                            if ($inputNameNormalized === $normalize($existingName) && $validated['category'] === $existingCat) {
                                return ResponseHelper::moduleError('Duplicate Entry', 'An option with this name in the selected category already exists.');
                            }
                        }
                    }

                    $reloadTable = true;
                    $title = 'Option Updated';
                    $message = 'Option "' . $validated['option'] . '" updated successfully.';
                    break;
                case 'central_users':
                    $validator = Validator::make($request->all(), [
                        'account_status' => 'nullable|in:active,deactive',
                        'role' => 'nullable|in:user,admin',
                        'username' => 'nullable|string|min:3|max:50',
                        'access_db' => 'nullable|array',
                        'export_limit' => 'nullable|string',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    if (isset($validated['access_db']) && is_array($validated['access_db'])) {
                        $validated['access_db'] = implode(',', $validated['access_db']);
                    }
                    $data = DB::table('users')->where('username', $validated['username'])->first();
                    if ($data && isset($validated['role'])) {
                        $roleId = $validated['role'] === 'admin' ? 2 : 3;
                        DB::table('user_roles')
                            ->where('user_id', $data->user_id)
                            ->update([
                                'role_id' => $roleId,
                                'updated_at' => now(),
                            ]);
                    }
                    $reloadTable = true;
                    $title = 'User Updated';
                    $message = 'User configuration updated successfully.';
                    break;
                case 'news_feeds':
                    $validator = Validator::make($request->all(), [
                        'title' => 'nullable|string|max:200',
                        'content' => 'nullable|string',
                        'attachment_url' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
                        'category_id' => 'required|in:projects,news',
                        'priority' => 'nullable|in:low,medium,high',
                        'status' => 'nullable|in:draft,published,archived',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    if ($request->hasFile('attachment_url')) {
                        $uploadPath = public_path('storage/user/unq0000001/admin/banner');
                        if (!file_exists($uploadPath)) {
                            mkdir($uploadPath, 0777, true);
                        }
                        $file = $request->file('attachment_url');
                        $filename = time() . '_' . $file->getClientOriginalName();
                        $file->move($uploadPath, $filename);
                        $validated['attachment_url'] = 'storage/user/unq0000001/admin/banner/' . $filename;
                    }
                    $reloadTable = true;
                    $reloadCard = true;
                    $title = 'News Feed Updated';
                    $message = 'News feed entry updated successfully.';
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
