<?php
namespace App\Http\Controllers\System\Actions;

use App\Facades\{Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};

/**
 * Controller for validating unique values in a specified table and column.
 */
class Unique extends Controller
{
    /**
     * Validates if a value is unique in the specified table and column.
     *
     * @param Request $request HTTP request with token and value.
     * @param array $params Route parameters with token and value.
     * @return JsonResponse Validation result or error message.
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            // Extract and validate token and value
            $token = $params['token'] ?? $request->input('skeleton_token');
            $value = $params['value'] ?? $request->input('skeleton_value');
            if (!$token) {
                return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
            }
            if (!$value) {
                return response()->json(['status' => false, 'title' => 'Value Missing', 'message' => 'No value was provided to validate.']);
            }

            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['system']) || !isset($reqSet['table']) || !isset($reqSet['column'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid or lacks required configuration.']);
            }

            // Check if value exists using Data facade
            $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => [$reqSet['column'] => $value]]);
            if (!$result['status']) {
                return response()->json(['status' => false, 'title' => 'Validation Failed', 'message' => $result['message'] ?: 'Failed to validate unique value.']);
            }

            // Determine uniqueness
            $isUnique = empty($result['data']);

            // Log uniqueness check for debugging
            if (Config::get('skeleton.developer_mode')) {
                Developer::debug('UniqueCtrl@index: Uniqueness check', [
                    'system' => $reqSet['system'],
                    'table' => $reqSet['table'],
                    'column' => $reqSet['column'],
                    'value' => $value,
                    'isUnique' => $isUnique
                ]);
            }

            return response()->json(['status' => true, 'isUnique' => $isUnique]);
        } catch (Exception $e) {
            Developer::error('UniqueCtrl@index: Error validating unique value', ['token' => $token ?? 'undefined', 'value' => $value ?? 'undefined', 'error' => $e->getMessage()]);
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'Failed to validate unique value.']);
        }
    }
}