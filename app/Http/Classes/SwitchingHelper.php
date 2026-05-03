<?php
namespace App\Http\Classes;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Cache;
use Exception;
use App\Http\Classes\ExceptionHelper;
class SwitchingHelper
{
    /**
     * Encrypt the given data using base64 encoding.
     *
     * @param mixed $data
     * @return string|null
     */
    private static function encryptData($data)
    {
        try {
            return base64_encode(json_encode($data));
        } catch (Exception $e) {
            return null;
        }
    }
    /**
     * Decrypt the given token from base64 encoding.
     *
     * @param string $token
     * @return mixed|null
     */
    private static function decryptData($token)
    {
        try {
            return json_decode(base64_decode($token), true);
        } catch (Exception $e) {
            return null;
        }
    }
    /**
     * Decode and process the incoming token, then redirect.
     *
     * @param string $token
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public static function decodeAndSend($token)
    {
        try {
            $decoded = self::decryptData($token);
            // Ensure valid data
            if (!$decoded || !isset($decoded['route_name'])) {
                throw new Exception('Invalid token: Missing route_name.');
            }
            // Generate a unique cache key
            $cacheKey = uniqid();
            Cache::put($cacheKey, $decoded, now()->addMinutes(5));
            // Check if return type is "redirect"
            if (isset($decoded['return']) && $decoded['return'] === "url") {
                return response()->json([
                    'status'  => true,
                    'return_url'   => route($decoded['route_name'], ['id' => $cacheKey]),
                ]);
            }
            // Otherwise, return the redirect URL
            return Redirect::route($decoded['route_name'], ['id' => $cacheKey]);
        } catch (Exception $e) {
            return response()->json([
                'status'  => false,
                'title'   => 'Invalid Encryption Key',
                'message' => 'The provided encryption key is invalid or has been tampered with.',
                'errors'  => $e->getMessage(),
            ]);
        }
    }
    /**
     * Encode the switching data and redirect.
     *
     * @param array $data
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public static function encodeAndSend($data)
    {
        try {
            $encodedToken = self::encryptData($data);
            if (!$encodedToken) {
                throw new Exception("Encryption failed.");
            }
            // Redirect externally if 'switch' is set to 'away'
            if (isset($data['switch']) && $data['switch'] === 'away') {
                if ($data['return_type'] === 'link') {
                    return env('SUPREME_URL') . '/api/switching/' . $encodedToken;
                } else {
                    return redirect()->away(env('SUPREME_URL') . '/api/switching/' . $encodedToken);
                }
            } else {
                return redirect()->away(env('APP_URL') . '/api/switching/' . $encodedToken);
            }
        } catch (Exception $e) {
            return ExceptionHelper::handle($e);
        }
    }
    /**
     * Retrieve cached switching data and delete it after fetching.
     *
     * @param \Illuminate\Http\Request $request
     * @return mixed|\Illuminate\Http\JsonResponse
     */
    public static function getCache($request)
    {
        try {
            $key = $request->query('id');
            if (!$key) {
                throw new Exception("Cache key is missing in request.");
            }
            $cacheData = Cache::get($key);
            if (!$cacheData) {
                throw new Exception("No data found for the given cache key.");
            }
            // Initialize or update refresh count
            $refreshCount = $cacheData['refresh_count'] ?? 0;
            $refreshCount++;
            // Forget cache if accessed 3 times
            if ($refreshCount >= 30) {
                Cache::forget($key);
            } else {
                // Update the cache with new refresh count and reset expiration time
                $cacheData['refresh_count'] = $refreshCount;
                Cache::put($key, $cacheData, now()->addSeconds(30000));
            }
            return $cacheData;
        } catch (Exception $e) {
            return null;
        }
    }
}
