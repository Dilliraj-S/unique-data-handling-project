<?php
namespace App\Http\Controllers\System\Central\Discrete;
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator,DB};
/**
 * Controller for saving new Discrete entities.
 */
class SaveAddCtrl extends Controller
{
    /**
     * Saves new Discrete entity data based on validated input.
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
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            
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
            
            switch ($reqSet['key']) {
                case 'central_unique_categories':
                    $validator = Validator::make($request->all(), [
                        'category' => 'required|string|min:3|max:100',
                    ]);
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                    $validated = $validator->validated();
                    $validated['category_id'] = Random::unique(6, 'CTG');
                    $reloadTable = true;
                    $title = 'Category Added';
                    $message = 'Category configuration added successfully.';
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
                    $validated['feed_id'] = Random::unique(8, 'FED');
                    
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
                    
                    $validated['author_id'] = auth()->user()->id ?? null;
                    $validated['org_id'] = auth()->user()->org_id ?? null;
                    $reloadTable = true;
                    $title = 'News Feed Added';
                    $message = 'News feed entry added successfully.';
                    break;
                case 'central_users':
                    $validator = Validator::make($request->all(), [
                        'account_status' => 'nullable|in:active,deactive',
                        'role' => 'required|in:user,admin',
                        'username' => 'nullable|string|min:3|max:50',
                        'password' => 'nullable|string|min:8|max:100',
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
                    if (!empty($validated['password'])) {
                        $validated['password'] = bcrypt($validated['password']);
                    }
                    $validated['user_id'] = 'USR' . str_pad(Random::string('num', 4), 4, '0', STR_PAD_LEFT); 

                    $roleId = ($validated['role'] ?? '') === 'admin' ? 2 : 3;

                    DB::table('user_roles')->insert([
                        'user_id' => $validated['user_id'],
                        'role_id' => $roleId,
                        'valid_from' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                     DB::table(table: 'user_data')->insert([
                        'user_id' => $validated['user_id'],
                        'created_at' => now(),

                        
                    ]);

                    $validated['business_id'] = 'CENTRAL';
                    $reloadTable = true;
                    $title = 'User Added';
                    $message = 'User configuration added successfully.';
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

    // Check for duplicate option in the same category
    $normalize = fn($name) => strtolower(preg_replace('/\s+/', '', $name));
    $inputNameNormalized = $normalize($validated['option']);

    $allOptions = Data::get('central', 'options', [
        'select' => ['option', 'category']
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

    try {
        $validated['option_id'] = Random::unique(10, 'OPT');
        $validated['created_by'] = Skeleton::getAuthenticatedUser()->username;

        $result = Data::create('central', 'options', $validated, $reqSet['key']);

        $title = 'Option "' . $validated['option'] . '" Created';
        $message = 'successfully';

        return response()->json([
            'status' => $result['status'],
            'reload_table' => true,
            'affected' => $result['status'] ? ($result['data']['id'] ?? $result['data']['affected_rows'] ?? '-') : '-',
            'title' => $result['status'] ? $title : 'Failed',
            'message' => $result['status'] ? $message : $result['message']
        ]);
    } catch (Exception $e) {
        return ResponseHelper::moduleError('Error', 'Unexpected error: ' . $e->getMessage());
    }

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
                if ($timestampMeta) {
                    $validated['created_at'] = $validated['updated_at'] = now();
                }
            }
            
            $result = Data::create('central', $reqSet['table'], $validated, $reqSet['key']);
            
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