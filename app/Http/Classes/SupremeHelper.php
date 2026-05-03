<?php
namespace App\Http\Classes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;
use App\Http\Classes\{Helper, RandomHelper, ExceptionHelper};
class SupremeHelper
{
    protected static $appName;
    protected static $appUrl;
    protected static $supremeName;
    protected static $supremeUrl;
    protected static $supremeKey;
    protected static $supremeProductId;
    protected static $supremeCompanyId;
    /**
     * Initialize Supreme Configuration for a given Company
     * @throws Exception
     */
    public static function init()
    {
        try {
            self::$appName = env('APP_NAME');
            self::$appUrl = env('APP_URL');
            self::$supremeName = env('SUPREME_NAME');
            self::$supremeUrl = env('SUPREME_URL') . '/api/supreme/product/handler';
            self::$supremeKey = env('SUPREME_PRODUCT_KEY');
            self::$supremeProductId = env('SUPREME_PRODUCT_ID');
            self::$supremeCompanyId = env('SUPREME_COMPANY_ID');
        } catch (Exception $e) {
            throw new Exception("Initialization failed: " . $e->getMessage());
        }
    }
    /**
     * Hash the Supreme Key for secure transmission
     * @param string $key
     * @param string $secret
     * @return string
     */
    private static function hashKey($key, $secret)
    {
        return hash_hmac('sha256', $key, $secret);
    }
    /**
     * Send Data to Remote Server (Create, Update, Delete)
     * @param string $preKey
     * @param string $action
     * @param array $data
     * @return array
     */
    public static function send($action, $preKey, $data = [])
    {
        self::init();
        try {
            $payload = [
                'action' => $action,
                'prefix' => $preKey,
                'data' => $data,
            ];
            $response = Http::withHeaders(self::headers(self::$supremeKey, self::$supremeProductId))
                ->post(self::$supremeUrl, $payload);
            return self::handleResponse($response);
        } catch (Exception $e) {
            return ExceptionHelper::handle($e);
        }
    }
    /**
     * Fetch Data from Remote Server
     * @param string|array $preKey
     * @param array $filters
     * @return array
     */
    public static function fetch($preKey, $filters = [])
    {
        self::init();
        try {
            $payload = [
                'action' => 'fetch',
                'prefix' => $preKey,
                'filters' => $filters
            ];
            $response = Http::withHeaders(self::headers(self::$supremeKey, self::$supremeProductId))
                ->post(self::$supremeUrl, $payload);
            return self::handleResponse($response);
        } catch (Exception $e) {
            return ExceptionHelper::handle($e);
        }
    }
    /**
     * Handle Incoming API Requests
     * @param Request $request
     * @return array
     */
    public static function handleRequest(Request $request)
    {
        try {
            Log::info('Incoming request:', [
                'headers' => $request->headers->all(),
                'body' => $request->all(),
                'ip' => $request->ip(),
            ]);
            $authKey = self::hashKey(env('SUPREME_PRODUCT_KEY'), env('SUPREME_PRODUCT_ID'));
            if ($request->header('Authorization') !== "Bearer {$authKey}") {
                throw new Exception("Unauthorized request");
            }
            $preKey = $request->input('prefix') ?? '';
            $action = $request->input('action') ?? '';
            $data = $request->input('data', []);
            $filters = $request->input('filters', []);
            if (!$preKey) throw new Exception("Prefix name is required.");
            if (in_array($action, ['create', 'update', 'delete'])) {
                return self::processData($preKey, $action, $data);
            } else {
                return self::fetchData($preKey, $filters);
            }
        } catch (Exception $e) {
            return ExceptionHelper::handle($e);
        }
    }
    /**
     * Process Incoming Data (Create, Update, Delete)
     */
    private static function processData($preKey, $action, $data)
    {
        try {
            $tableArr = Helper::tableFinder($preKey);
            switch ($action) {
                case 'create':
                    $data[$tableArr[1]] = RandomHelper::uniqueId($preKey, 7);
                    $data['created_at'] = now();
                    $data['updated_at'] = now();
                    DB::table($tableArr[0])->insert($data);
                    return response()->json([
                        'status' => true,
                        'title' => 'Success!',
                        'message' => 'Data inserted successfully',
                    ]);
                case 'update':
                    if (!isset($tableArr[1])) throw new Exception("" . $tableArr[1] . " is required for update.");
                    $data['updated_at'] = now();
                    DB::table($tableArr[0])->where($tableArr[1], $data['id'])->update($data);
                    return response()->json([
                        'status' => true,
                        'title' => 'Success!',
                        'message' => 'Data updated successfully',
                    ]);
                case 'delete':
                    if (!isset($tableArr[1])) throw new Exception("" . $tableArr[1] . " is required for delete.");
                    $data['deleted_at'] = now();
                    DB::table($tableArr[0])->where($tableArr[1], $data['id'])->update($data);
                    return response()->json([
                        'status' => true,
                        'title' => 'Success!',
                        'message' => 'Data deleted successfully',
                    ]);
                default:
                    throw new Exception("Invalid action.");
            }
        } catch (Exception $e) {
            return ExceptionHelper::handle($e);
        }
    }
    /**
     * Fetch Data from Local Database
     */
    private static function fetchData($preKey, $filters)
    {
        try {
            $tableArr = Helper::tableFinder($preKey);
            if (isset($filters['select'])) {
                $query = DB::table($tableArr[0])->select($filters['select'])->whereNull($tableArr[0] . '.deleted_at');
            } else {
                $query = DB::table($tableArr[0])->whereNull($tableArr[0] . '.deleted_at');
            }
            if (isset($filters['join'])) {
                foreach ($filters['join'] as $joinTable => $condition) {
                    $query->join($joinTable, ...$condition);
                }
            }
            if (isset($filters['where'])) {
                foreach ($filters['where'] as $column => $val) {
                    $query->where($column, $val);
                }
            }
            if (isset($filters['whereIn'])) {
                foreach ($filters['whereIn'] as $column => $valArr) {
                    $query->whereIn($column, $valArr);
                }
            }
            if (isset($filters['sort'])) {
                foreach ($filters['sort'] as $column => $direction) {
                    $query->orderBy($column, $direction);
                }
            }
            if (isset($filters['groupBy'])) {
                $query->groupBy($filters['groupBy']);
            }
            if (isset($filters['having'])) {
                foreach ($filters['having'] as $column => $val) {
                    $query->having($column, $val);
                }
            }
            if (isset($filters['count']) && $filters['count'] === true) {
                return response()->json([
                    'status' => true,
                    'title' => 'Success!',
                    'message' => 'Count retrieved successfully',
                    'data' => $query->count()
                ]);
            }
            return response()->json([
                'status' => true,
                'title' => 'Success!',
                'message' => 'Data retrieved successfully',
                'data' => $query->get()
            ]);
        } catch (Exception $e) {
            return ExceptionHelper::handle($e);
        }
    }
    private static function headers($key, $secret)
    {
        return [
            'Authorization' => 'Bearer ' . self::hashKey($key, $secret),
            'App-Name' => self::$appName,
            'Content-Type' => 'application/json',
            'Supreme-Name' => self::$supremeName,
            'Supreme-Product-ID' => self::$supremeProductId,
            'Supreme-Company-ID' => self::$supremeCompanyId,
        ];
    }
    private static function handleResponse($response)
    {
        return $response->failed() ? ['status' => false, 'title' => 'API request failed', 'message' => $response->body()] : $response->json();
    }
}
