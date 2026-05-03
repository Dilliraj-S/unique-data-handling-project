<?php

namespace App\Http\Helpers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Helper class for generating standardized JSON responses.
 */
class ResponseHelper
{
    /**
     * Generates a standardized error response.
     *
     * @param string $title The title of the error
     * @param string $message The detailed error message
     * @param int $statusCode The HTTP status code (default: 400)
     * @return JsonResponse The formatted error response
     */
    public static function moduleError(string $title, string $message, int $statusCode = 400): JsonResponse
    {
        // Validate HTTP status code
        if ($statusCode < 100 || $statusCode > 599) {
            $statusCode = 400;
        }

        return response()->json([
            'status' => false,
            'title' => $title,
            'message' => $message
        ], $statusCode);
    }

    public static function flowError(string $title, array|string $message = '', int $statusCode = 400, array $meta = []): JsonResponse
    {
        // Clamp the status code to 400–599 range (valid error codes)
        if ($statusCode < 400 || $statusCode > 599) {
            $statusCode = 400;
        }

        return response()->json([
            'status' => false,
            'title' => $title,
            'message' => is_array($message) ? $message : [$message],
            'meta' => $meta
        ], $statusCode);
    }

    public static function flowResponse(string $title, array|string $message = '', array $meta = [], int $statusCode = 200): JsonResponse
    {
        return response()->json([
            'status' => true,
            'title' => $title,
            'message' => is_array($message) ? $message : [$message],
            'meta' => $meta
        ], $statusCode);
    }
}
