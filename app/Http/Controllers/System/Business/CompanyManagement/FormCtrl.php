<?php

namespace App\Http\Controllers\System\Business\CompanyManagement;

use App\Facades\{CentralDB, Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
use App\Http\Classes\FileHandleHelper;
use App\Models\Skeleton\SkeletonToken;

/**
 * Controller for saving new developer entities.
 */
class FormCtrl extends Controller
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
                return response()->json([
                    'status' => false,
                    'title' => 'Token Missing',
                    'message' => 'No token was provided.'
                ]);
            }

            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key'])) {
                return response()->json([
                    'status' => false,
                    'title' => 'Invalid Token',
                    'message' => 'The provided token is invalid.'
                ]);
            }

            if (isset($reqSet['id'])) {
                $dynamic = $reqSet['id'];
            }

            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            $validated = null;
            Developer::alert('hello static save', ['key' => $reqSet['key']]);

            switch ($reqSet['key']) {
                case 'customize':
                    // Fetch form data
                    $copyrightText = $request->input('copyright_text');
                    $designedByText = $request->input('designed_by_text');

                    // Use raw SQL to check if a row exists in infosysdb.customize
                    $existing = DB::select("SELECT * FROM infosysdb.customize LIMIT 1");

                    if ($existing) {
                        $id = $existing[0]->id;

                        // Update existing record
                        DB::update("UPDATE infosysdb.customize SET 
                            copyright_text = ?, 
                            designed_by_text = ?, 
                            updated_at = NOW() 
                            WHERE id = ?", [
                            $copyrightText,
                            $designedByText,
                            $id
                        ]);
                    } else {
                        // Insert new record
                        DB::insert("INSERT INTO infosysdb.customize 
                            (copyright_text, designed_by_text, created_at, updated_at) 
                            VALUES (?, ?, NOW(), NOW())", [
                            $copyrightText,
                            $designedByText
                        ]);
                    }

                    // ✅ Prevent fall-through: Return immediately after saving
                    return response()->json([
                        'status' => true,
                        'token' => $reqSet['token'],
                        'affected' => 'customize',
                        'title' => 'Success',
                        'message' => 'Customization saved successfully.'
                    ]);
                    break;

                default:
                    return response()->json([
                        'status' => false,
                        'title' => 'Invalid Configuration',
                        'message' => 'The configuration key is not supported.'
                    ]);
            }

            /****************************************************************************************************
             *                                                                                                  *
             *                              >>> MODIFY THIS SECTION (END) <<<                                   *
             *                                                                                                  *
             ****************************************************************************************************/

            // This part no longer runs for 'customize', so no empty/null records will be inserted
            $validated['created_at'] = now();
            $validated['updated_at'] = now();

            $result = Data::create('business', $reqSet['table'], $validated);

            return response()->json([
                'status' => $result['status'],
                'token' => $reqSet['token'],
                'affected' => $result['status'] ? $result['data']['id'] : '-',
                'title' => $result['status'] ? 'Success' : 'Failed',
                'message' => $result['status'] ? 'Token added successfully' : $result['message']
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => false,
                'title' => 'Error',
                'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.'
            ]);
        }
    }
}
