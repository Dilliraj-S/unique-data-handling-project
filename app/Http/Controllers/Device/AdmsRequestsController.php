<?php
namespace App\Http\Controllers\Device;
use App\Http\Controllers\Controller;
use App\Services\AdmsService;
use App\Facades\{Database, Developer};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Cache, Config, Validator, Log};
use Illuminate\Validation\ValidationException;
use Illuminate\Database\QueryException;
use InvalidArgumentException;
use Exception;
/**
 * Controller for handling ADMS device requests.
 * Supports endpoints: ping, cdata, fdata, devicecmd, getrequest.
 * Optimized for 100,000 devices and 10M requests/hour.
 */
class AdmsRequestsController extends Controller
{
    protected AdmsService $admsService;
    /**
     * Constructor with dependency injection.
     *
     * @param AdmsService $admsService
     */
    public function __construct(AdmsService $admsService)
    {
        $this->admsService = $admsService;
    }
    /**
     * Handle incoming ADMS requests and route to appropriate endpoint.
     *
     * @param Request $request
     * @param string $endpoint
     * @return \Illuminate\Http\Response
     */
    public function handle(Request $request, string $endpoint)
    {
        $logData = [
            'timestamp' => now()->toDateTimeString(),
            'method' => $request->method(),
            'endpoint' => $endpoint,
            'url' => $request->fullUrl(),
            'ip' => $request->ip(),
            'headers' => collect($request->headers->all())->except(['authorization'])->toArray(),
            'query_params' => $request->query(),
            'post_data' => $request->post(),
            'content_length' => $request->getContent(),
        ];
        // Developer::info('ADMS Incoming Request', $logData);
        $method = strtolower(str_replace(['.aspx', '.php'], '', $endpoint));
        $routes = ['ping', 'cdata', 'fdata', 'devicecmd', 'getrequest'];
        if (!in_array($method, $routes)) {
            Developer::warning('Invalid endpoint accessed', ['endpoint' => $endpoint]);
            return $this->plain('Error Occurred');
        }
        return $this->executeRequest(function () use ($request, $method) {
            $serialNumber = $request->query('SN', $request->input('SN', ''));
            // Generate unique request ID for deduplication
            $requestId = md5($request->getContent() . $serialNumber . microtime(true));
            $cacheKey = "adms:request:{$serialNumber}:{$requestId}";
            $cacheTtl = Config::get('adms.cache.ttl.request', 60); // 60 seconds
            $lock = Cache::lock($cacheKey, $cacheTtl);
            if (!$lock->get()) {
                return $this->plain('OK');
            }
            try {
                $device = $this->admsService->getDevice($serialNumber);
                if (!$device) {
                    Developer::warning('Device not found', ['serialNumber' => $serialNumber]);
                    return $this->plain('Error Occurred');
                }
                return match ($method) {
                    'ping' => $this->ping($request, $device['device_id'], $device['business_id'], $serialNumber),
                    'cdata' => $this->cdata($request, $device['device_id'], $device['business_id'], $serialNumber),
                    'fdata' => $this->fdata($request, $device['device_id'], $device['business_id'], $serialNumber),
                    'devicecmd' => $this->devicecmd($request, $device['device_id'], $device['business_id'], $serialNumber),
                    'getrequest' => $this->getrequest($request, $device['device_id'], $device['business_id'], $serialNumber),
                };
            } finally {
                $lock->release();
            }
        }, "Handle {$method} request", $serialNumber ?? null);
    }
    /**
     * Handle ping endpoint to check device connectivity.
     *
     * @param Request $request
     * @param string $deviceId
     * @param string $businessId
     * @param string $serialNumber
     * @return \Illuminate\Http\Response
     */
    protected function ping(Request $request, string $deviceId, string $businessId, string $serialNumber)
    {
        $this->validateRequest($request, [
            'SN' => 'required|string|max:50|alpha_dash',
        ]);
        $this->admsService->pingDevice($serialNumber);
        return $this->plain('OK');
    }
    /**
     * Handle cdata endpoint for configuration or data upload.
     *
     * @param Request $request
     * @param string $deviceId
     * @param string $businessId
     * @param string $serialNumber
     * @return \Illuminate\Http\Response
     */
    protected function cdata(Request $request, string $deviceId, string $businessId, string $serialNumber)
    {
        if ($request->isMethod('GET')) {
            $this->validateRequest($request, [
                'SN' => 'required|string|max:50|alpha_dash',
            ]);
            $settings = $this->admsService->getDeviceSettings($deviceId, $businessId) ?? [];
            $response = "GET OPTION FROM: {$serialNumber}\r" .
                "Stamp={$settings['trans_stamp']}\r" .
                "ATTLOGStamp={$settings['attlog_stamp']}\r" .
                "OpStamp={$settings['op_stamp']}\r" .
                "OPERLOGStamp={$settings['operlog_stamp']}\r" .
                "PhotoStamp={$settings['photo_stamp']}\r" .
                "ATTPHOTOStamp={$settings['attphoto_stamp']}\r" .
                "ErrorDelay={$settings['error_delay']}\r" .
                "Delay={$settings['delay']}\r" .
                "TransTimes={$settings['trans_times']}\r" .
                "TransInterval={$settings['trans_interval']}\r" .
                "TransFlag={$settings['trans_flag']}\r" .
                "Realtime={$settings['realtime']}\r" .
                "TimeOut={$settings['timeout']}\r" .
                "TimeZone={$settings['timezone']}\r" .
                "Encrypt={$settings['encrypt']}\r\r" .
                "OK";
            return $this->plain($response);
        }
        // Handle POST
        $this->validateRequest($request, [
            'SN' => 'required|string|max:50|alpha_dash',
        ]);
        $meta = $request->query();
        $data = trim($request->getContent());
        if (empty($data)) {
            Developer::warning('Empty cdata payload', compact('deviceId', 'businessId', 'serialNumber'));
            return $this->plain('ERROR Occured');
        }
        $this->admsService->queueDataProcess($deviceId, $businessId, 'cdata', $data, $meta);
        return $this->plain('OK');
    }
    /**
     * Handle fdata endpoint for biometric or user data upload.
     *
     * @param Request $request
     * @param string $deviceId
     * @param string $businessId
     * @param string $serialNumber
     * @return \Illuminate\Http\Response
     */
    protected function fdata(Request $request, string $deviceId, string $businessId, string $serialNumber)
    {
        $this->validateRequest($request, [
            'SN' => 'required|string|max:50|alpha_dash',
        ]);
        $meta = [
            'table' => $request->input('table'),
            'stamp' => $request->input('Stamp', 0),
            'batch_size' => Config::get('adms.batch_size', 500),
        ];
        $data = trim($request->input('data'));
        if (empty($data)) {
            Developer::warning('Empty fdata payload', compact('deviceId', 'businessId', 'serialNumber'));
            return $this->plain('Error Occurred');
        }
        $this->admsService->queueDataProcess($deviceId, $businessId, 'fdata', $data, $meta);
        return $this->plain('OK');
    }
    /**
     * Handle devicecmd endpoint for command execution.
     *
     * @param Request $request
     * @param string $deviceId
     * @param string $businessId
     * @param string $serialNumber
     * @return \Illuminate\Http\Response
     */
protected function devicecmd(Request $request, string $deviceId, string $businessId, string $serialNumber)
{
    $this->validateRequest($request, [
        'SN' => 'required|string|max:50|alpha_dash',
    ]);

    $data = trim($request->getContent());

    if (!empty($data)) {
        parse_str($data, $respArr);
        $commandId = $respArr['ID'] ?? null;

        if (!empty($commandId)) {
            dispatch(function () use ($commandId, $businessId, $data) {
                $this->admsService->updateStatus($businessId, $commandId, 'devicecmd', $data);
            })->onQueue(Config::get('adms.queue.prefix', 'adms:') . $businessId);
        }
    }

    return $this->plain("OK");
}

    /**
     * Handle getrequest endpoint to retrieve pending commands.
     *
     * @param Request $request
     * @param string $deviceId
     * @param string $businessId
     * @param string $serialNumber
     * @return \Illuminate\Http\Response
     */
    protected function getrequest(Request $request, string $deviceId, string $businessId, string $serialNumber)
    {
        $this->validateRequest($request, [
            'SN' => 'required|string|max:50|alpha_dash',
        ]);
        $commands = $this->admsService->getPendingCommands($deviceId, $businessId);
        if (empty($commands)) {
            return $this->plain('OK');
        }
        $response = collect($commands)->map(function ($command) {
            $params = !empty($command['params'])
                ? ' ' . collect($command['params'])->map(fn($v, $k) => "$k=" . (string)$v)->implode("\t")
                : '';
            return "C:{$command['command_id']}:{$command['command']}{$params}\r\n";
        })->implode('');
        $data = trim($request->getContent());
        // dispatch(function () use ($commands, $businessId, $data) {
        //     foreach ($commands as $command) {
        //         $this->admsService->updateStatus($businessId, $command['command_id'], 'getrequest', $data);
        //     }
        // })->onQueue(Config::get('adms.queue.prefix', 'adms:') . $businessId);
        return $this->plain($response);
    }
    /**
     * Validate incoming request data.
     *
     * @param Request $request
     * @param array $rules
     * @return void
     * @throws ValidationException
     */
    protected function validateRequest(Request $request, array $rules): void
    {
        $validator = Validator::make($request->all(), $rules, [
            'SN.required' => 'Serial number is required',
            'SN.max' => 'Serial number must not exceed 50 characters',
            'SN.alpha_dash' => 'Serial number must contain only letters, numbers, dashes, or underscores',
            'table.in' => 'Invalid table specified',
        ]);
        if ($validator->fails()) {
            Developer::warning('Validation failed', [
                'errors' => $validator->errors()->toArray(),
                'input' => $request->except(['data']),
            ]);
            throw new ValidationException($validator);
        }
    }
    /**
     * Execute a request with retry logic and error handling.
     *
     * @param callable $callback
     * @param string $action
     * @param string|null $serialNumber
     * @return \Illuminate\Http\Response
     */
    protected function executeRequest(callable $callback, string $action, ?string $serialNumber = null)
    {
        $maxRetries = Config::get('adms.retry.max_attempts', 3);
        $delay = Config::get('adms.retry.initial_delay_ms', 200);
        $backoff = Config::get('adms.retry.backoff_factor', 2);
        $attempts = $maxRetries;
        while ($attempts-- > 0) {
            try {
                return $callback();
            } catch (ValidationException $e) {
                Developer::warning("{$action} validation error", [
                    'serialNumber' => $serialNumber,
                    'errors' => $e->errors(),
                ]);
                return $this->plain('ERROR: Invalid input');
            } catch (InvalidArgumentException $e) {
                Developer::warning("{$action} invalid input", [
                    'serialNumber' => $serialNumber,
                    'message' => $e->getMessage(),
                ]);
                return $this->plain('ERROR: Invalid input');
            } catch (QueryException $e) {
                $context = [
                    'serialNumber' => $serialNumber,
                    'sqlErrorCode' => $e->getCode(),
                    'sql' => $e->getSql(),
                ];
                if ($e->getCode() === '23000' && str_contains($e->getMessage(), 'Duplicate entry')) {
                    Developer::info("Duplicate entry in {$action}, skipping", $context);
                    return $this->plain('OK');
                }
                if (in_array($e->getCode(), ['40001', 'HY000']) && $attempts > 0) {
                    usleep($delay * 1000);
                    $delay *= $backoff;
                    continue;
                }
                Developer::error("{$action} database error: {$e->getMessage()}", $context);
                return $this->plain('ERROR: Database error');
            } catch (Exception $e) {
                Developer::error("{$action} unexpected error: {$e->getMessage()}", [
                    'serialNumber' => $serialNumber,
                ]);
                return $this->plain('Error Occurred');
            }
        }
        Developer::error("{$action} failed after {$maxRetries} retries", ['serialNumber' => $serialNumber]);
        return $this->plain('Error Occurred');
    }
    /**
     * Return a plain text response with proper formatting.
     *
     * @param string $text
     * @return \Illuminate\Http\Response
     */
    protected function plain(string $text)
    {
        return response(trim($text) . "\r", 200)->header('Content-Type', 'text/plain');
    }
}
