<?php
namespace App\Http\Controllers\Panels\Business\ShiftManagement;
use App\Http\Controllers\Controller;
use Illuminate\Http\{Request, Response};
use Illuminate\Support\Facades\{Auth, Cache, Crypt, DB, Log, Session, Storage, Validator, View};
/* Exceptions */
use Exception;
use App\Http\Exceptions\ExceptionHelper;
/* Helpers */
use App\Http\Helpers\{
UserHelper,
RandomHelper,
SelectHelper,
SkeletonHelper
};
/* Models */
use App\Models\User;
/**
 * Controller for saving new Settings data
 * Handles the creation of new Settings records (e.g., biometric data, payroll)
 */
class FormCtrl extends Controller
{
    /**
     * Save new data for entities.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            // Decode token|
            Log::info('hi');
            $id = $request->input('id') ?? null;
            $uid = $request->input('uid') ?? null;
            $token = $request->input('skeleton_token');

            if (!$token) {
                return response()->json(['status' => false, 'message' => 'Missing token'], 400);
            }

            $config = app('skeleton.token')->resolve($token);
            if (!$config) {
                return response()->json(['status' => false, 'message' => 'Invalid token'], 403);
            }
            // Request settings
            $reqSet = [
                'token' => $token,
                'key' => $config['key'],
                'table' => $config['table'] ?? '',
                'column' => $config['column'] ?? 'id',
            ];
            // Default return title, message and data
            $title = 'Success';
            $message = 'Data Saved';
            $data = [];

            /****************************************************************************************************
             * *
             * >>> MODIFY THIS SECTION (START) <<<                             *
             * *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'sa_categories_custom':
                case 'sa_categories_builder':
                    $validated = $request->validate([
                        'category' => 'required|string|max:255',
                        'description' => 'nullable|string',
                    ]);
                    if($id == null && $uid == null){
                        $message = 'Category created successfully';
                    }
                    else{  
                    $message = 'Category Updated successfully';
                    }
                    $validated['category_id'] = RandomHelper::uniqueId('CTG', 5);
                    
                    break;
                // Additional cases here
                default:
                    return response()->json(['status' => false, 'message' => 'Invalid configuration']);
            }
            /****************************************************************************************************
             * *
             * >>> MODIFY THIS SECTION (END) <<<                              *
             * *
             ****************************************************************************************************/
            $validated['updated_at'] = now();
            $table = DB::table($reqSet['table']);
            $id ? $table->where('id', $id)->update($validated) : ($uid ? $table->where($reqSet['column'], $uid)->update($validated) : $table->insert($validated + ['created_at' => now()]));
            return response()->json([
                'status' => true,   
                'token' => $reqSet['token'],
                'data' => $data,
                'title' => $title,
                'message' => $message,
            ]);

        } catch (Exception $e) {
            return ExceptionHelper::handle($e, true, true);
        }
    }
}