<?php

namespace App\Http\Controllers\System\Central\Filters;

use App\Facades\Developer;
use App\Http\Controllers\Controller;
use App\Facades\Skeleton;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

/**
 * Custom controller for handling specific Filters module operations.
 */
class CustomCtrl extends Controller
{
    /**
     * Handles custom operations for the Filters module.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters
     * @return JsonResponse Response with operation result
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            // Initialize response data
            $data = [
                'status' => true,
                'title' => 'Operation Successful',
                'message' => 'Custom operation for Filters completed successfully.'
            ];
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add custom logic here
            switch ($reqSet['key']) {
                case 'Filters_custom':
                    // Add custom operation logic
                    break;

                case 'central_unique_products':
                    Developer::log('CustomCtrl', 'Fetching product details for token: ' . $token);

                    $productId = $request->get('product');

                    // If product ID missing, return success with empty rows
                    if (!$productId) {
                        return response()->json([
                            'rows' => [],
                            'message' => 'No product ID provided.'
                        ], 200); // ✅ use 200 so fetch() sees res.ok = true
                    }

                    $product = DB::table('products')
                        ->where('product_id', $productId)
                        ->first();

                    // Always return 200 with data (even if empty)
                    return response()->json([
                        'rows' => $product ? [$product] : [],
                        'message' => $product ? 'Product found.' : 'Product not found.'
                    ], 200); // ✅



                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            return response()->json($data);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
