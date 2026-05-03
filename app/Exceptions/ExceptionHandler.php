<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Eloquent\RelationNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Queue\InvalidPayloadException;
use Illuminate\Queue\MaxAttemptsExceededException;
use Illuminate\Routing\Exceptions\UrlGenerationException;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use LengthException;
use LogicException;
use OutOfBoundsException;
use OverflowException;
use PDOException;
use RuntimeException;
use Symfony\Component\HttpFoundation\Exception\SuspiciousOperationException;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\Mailer\Exception\TransportException;
use UnderflowException;
use UnexpectedValueException;
use Illuminate\Http\JsonResponse;

class ExceptionHandler
{
    /**
     * Handle exceptions and return response in array or JSON format
     *
     * @param Exception $e
     * @param bool $returnJson
     * @return array|JsonResponse
     */
    public static function handle(Exception $e, bool $returnJson = false): array|JsonResponse
    {
        $developerMode = true;
        $title = 'Internal Server Error';
        $message = 'An unexpected error occurred. Please try again later.';
        $developer = [
            'exception' => get_class($e),
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ];
        $code = 500;

        switch (true) {
            case $e instanceof ValidationException:
                $title = 'Validation Error';
                $message = 'Invalid input provided. Please check your data.';
                $developer['errors'] = $e->errors();
                $code = 422;
                break;

            case $e instanceof ModelNotFoundException:
                $title = 'Not Found';
                $message = 'Requested item not found.';
                $developer['model'] = $e->getModel();
                $code = 404;
                break;

            case $e instanceof RelationNotFoundException:
                $title = 'Relation Error';
                $message = 'Requested relationship not available.';
                $developer['details'] = 'Check model relation definitions.';
                $code = 400;
                break;

            case $e instanceof MassAssignmentException:
                $title = 'Data Error';
                $message = 'Invalid data assignment.';
                $developer['details'] = 'Verify fillable properties in model.';
                $code = 400;
                break;

            case $e instanceof QueryException:
            case $e instanceof PDOException:
                $title = 'Database Error';
                $message = 'Database issue occurred. Please try again.';
                $developer = array_merge($developer, self::handleDatabaseError($e->getMessage()));
                $message = $developer['message'];
                $code = 400;
                break;

            case $e instanceof NotFoundHttpException:
                $title = 'Not Found';
                $message = 'Requested resource not found.';
                $developer['details'] = 'Check route or resource existence.';
                $code = 404;
                break;

            case $e instanceof MethodNotAllowedHttpException:
                $title = 'Method Error';
                $message = 'Unsupported action attempted.';
                $developer['details'] = 'Verify HTTP method for route.';
                $code = 405;
                break;

            case $e instanceof AccessDeniedHttpException:
            case $e instanceof AuthorizationException:
                $title = 'Access Denied';
                $message = 'You lack permission for this action.';
                $developer['details'] = 'Check user permissions.';
                $code = 403;
                break;

            case $e instanceof UnauthorizedHttpException:
            case $e instanceof AuthenticationException:
                $title = 'Unauthorized';
                $message = 'Please log in to continue.';
                $developer['details'] = 'Verify authentication setup.';
                $code = 401;
                break;

            case $e instanceof TokenMismatchException:
                $title = 'Session Error';
                $message = 'Session expired. Please refresh.';
                $developer['details'] = 'Ensure CSRF token is included.';
                $code = 419;
                break;

            case $e instanceof ServiceUnavailableHttpException:
                $title = 'Unavailable';
                $message = 'Service temporarily unavailable.';
                $developer['details'] = 'Check server status.';
                $code = 503;
                break;

            case $e instanceof ThrottleRequestsException:
                $title = 'Rate Limit';
                $message = 'Too many requests. Please wait.';
                $developer['details'] = 'Adjust rate limit settings.';
                $code = 429;
                break;

            case $e instanceof PostTooLargeException:
                $title = 'Data Too Large';
                $message = 'Uploaded data exceeds limit.';
                $developer['details'] = 'Check max upload size.';
                $code = 413;
                break;

            case $e instanceof UrlGenerationException:
                $title = 'Route Error';
                $message = 'Invalid action requested.';
                $developer['details'] = 'Verify route parameters.';
                $code = 404;
                break;

            case $e instanceof FileNotFoundException:
                $title = 'File Missing';
                $message = 'Requested file not found.';
                $developer['details'] = 'Check file path/storage.';
                $code = 404;
                break;

            case $e instanceof FileException:
                $title = 'File Error';
                $message = 'File upload failed.';
                $developer['details'] = self::handleFileError($e->getMessage());
                $message = $developer['details']['message'];
                $code = strpos($e->getMessage(), 'permissions') !== false ? 403 : 400;
                break;

            case $e instanceof SuspiciousOperationException:
                $title = 'Security Error';
                $message = 'Invalid request detected.';
                $developer['details'] = self::handleSuspiciousOperation($e->getMessage());
                $message = $developer['details']['message'];
                $code = strpos($e->getMessage(), 'expired') !== false ? 419 : 400;
                break;

            case $e instanceof MaxAttemptsExceededException:
                $title = 'Retry Limit';
                $message = 'Operation failed after retries.';
                $developer['details'] = 'Check queue retry settings.';
                $code = 503;
                break;

            case $e instanceof InvalidPayloadException:
                $title = 'Payload Error';
                $message = 'Invalid data format.';
                $developer['details'] = 'Verify queue payload.';
                $code = 400;
                break;

            case $e instanceof TransportException:
                $title = 'Email Error';
                $message = 'Email delivery failed.';
                $developer['details'] = self::handleTransportError($e->getMessage());
                $message = $developer['details']['message'];
                $code = strpos($e->getMessage(), 'SMTP') !== false ? 500 : 503;
                break;

            case $e instanceof BindingResolutionException:
                $title = 'Dependency Error';
                $message = 'System issue occurred.';
                $developer['details'] = 'Check container bindings.';
                $code = 500;
                break;

            case $e instanceof LockTimeoutException:
                $title = 'Lock Timeout';
                $message = 'Operation timed out.';
                $developer['details'] = 'Adjust cache lock timeout.';
                $code = 503;
                break;

            case $e instanceof DecryptException:
                $title = 'Encryption Error';
                $message = 'Data processing failed.';
                $developer['details'] = 'Verify encryption key.';
                $code = 400;
                break;

            case $e instanceof BroadcastException:
                $title = 'Broadcast Error';
                $message = 'Action failed.';
                $developer['details'] = 'Check broadcasting setup.';
                $code = 500;
                break;

            case $e instanceof InvalidArgumentException:
                $title = 'Argument Error';
                $message = 'Invalid data provided.';
                $developer['details'] = 'Check function arguments.';
                $code = 400;
                break;

            case $e instanceof RuntimeException:
                $title = 'Runtime Error';
                $message = 'Processing error occurred.';
                $developer['details'] = 'Runtime issue: ' . $e->getMessage();
                $code = 500;
                break;

            case $e instanceof LogicException:
                $title = 'Logic Error';
                $message = 'Invalid operation attempted.';
                $developer['details'] = 'Check application logic.';
                $code = 400;
                break;

            case $e instanceof LengthException:
                $title = 'Length Error';
                $message = 'Input too long.';
                $developer['details'] = 'Validate input length.';
                $code = 400;
                break;

            case $e instanceof OutOfBoundsException:
                $title = 'Bounds Error';
                $message = 'Invalid data access.';
                $developer['details'] = 'Check array/object bounds.';
                $code = 400;
                break;

            case $e instanceof OverflowException:
                $title = 'Overflow Error';
                $message = 'System limit exceeded.';
                $developer['details'] = 'Check data capacity.';
                $code = 500;
                break;

            case $e instanceof UnderflowException:
                $title = 'Underflow Error';
                $message = 'Invalid operation attempted.';
                $developer['details'] = 'Check empty data structures.';
                $code = 400;
                break;

            case $e instanceof UnexpectedValueException:
                $title = 'Value Error';
                $message = 'Incorrect data provided.';
                $developer['details'] = 'Validate input values.';
                $code = 400;
                break;
        }

        $response = [
            'status' => false,
            'title' => $title,
            'message' => $message,
            'code' => $code
        ];

        if ($developerMode) {
            $response['developer'] = $developer;
        }

        return $returnJson ? response()->json($response, $code) : $response;
    }

    /**
     * Handle database-specific errors
     *
     * @param string $errors
     * @return array
     */
    private static function handleDatabaseError(string $errors): array
    {
        $developer = ['message' => 'Database issue occurred.'];
        if (preg_match("/Table '(.+?)'/", $errors, $tableMatch)) {
            $developer['table'] = $tableMatch[1] ?? 'unknown';
        }
        if (preg_match("/Column '(.+?)'/", $errors, $columnMatch)) {
            $developer['column'] = $columnMatch[1] ?? 'unknown';
        }

        switch (true) {
            case strpos($errors, 'SQLSTATE[42S02]') !== false:
                $developer['message'] = 'Data unavailable.';
                $developer['details'] = 'Table not found.';
                break;
            case strpos($errors, 'SQLSTATE[42S22]') !== false:
                $developer['message'] = 'Invalid request.';
                $developer['details'] = 'Column not found.';
                break;
            case strpos($errors, 'SQLSTATE[23000]') !== false:
                $developer['message'] = 'Data conflict.';
                $developer['details'] = 'Constraint violation.';
                break;
            case strpos($errors, 'SQLSTATE[22001]') !== false:
                $developer['message'] = 'Input too long.';
                $developer['details'] = 'Value exceeds column limit.';
                break;
            case strpos($errors, 'SQLSTATE[22003]') !== false:
                $developer['message'] = 'Invalid number.';
                $developer['details'] = 'Numeric value out of range.';
                break;
            case strpos($errors, 'SQLSTATE[22007]') !== false:
                $developer['message'] = 'Invalid date/time.';
                $developer['details'] = 'Incorrect datetime format.';
                break;
            case strpos($errors, 'SQLSTATE[22004]') !== false:
                $developer['message'] = 'Missing required data.';
                $developer['details'] = 'Null value not allowed.';
                break;
            case strpos($errors, 'SQLSTATE[23503]') !== false:
                $developer['message'] = 'Data conflict.';
                $developer['details'] = 'Foreign key violation.';
                break;
            case strpos($errors, 'SQLSTATE[23505]') !== false:
                $developer['message'] = 'Duplicate data.';
                $developer['details'] = 'Unique constraint violation.';
                break;
            case strpos($errors, 'SQLSTATE[40001]') !== false:
                $developer['message'] = 'Operation failed.';
                $developer['details'] = 'Deadlock detected.';
                break;
            case strpos($errors, 'SQLSTATE[55P03]') !== false:
                $developer['message'] = 'Operation timed out.';
                $developer['details'] = 'Lock wait timeout.';
                break;
            case strpos($errors, 'SQLSTATE[HY000] [2002]') !== false:
                $developer['message'] = 'Service unavailable.';
                $developer['details'] = 'Database server not found.';
                break;
            case strpos($errors, 'SQLSTATE[HY000] [1045]') !== false:
                $developer['message'] = 'Access issue.';
                $developer['details'] = 'Invalid database credentials.';
                break;
            case strpos($errors, 'SQLSTATE[HY000] [1205]') !== false:
                $developer['message'] = 'Operation timed out.';
                $developer['details'] = 'Lock wait timeout.';
                break;
            case strpos($errors, 'SQLSTATE[HY000] [1040]') !== false:
                $developer['message'] = 'Service overloaded.';
                $developer['details'] = 'Too many connections.';
                break;
            default:
                $developer['details'] = 'Unknown database error.';
        }
        return $developer;
    }

    /**
     * Handle file-specific errors
     *
     * @param string $errors
     * @return array
     */
    private static function handleFileError(string $errors): array
    {
        $developer = ['message' => 'File upload failed.'];
        switch (true) {
            case strpos($errors, 'too large') !== false:
                $developer['message'] = 'File too large.';
                $developer['details'] = 'Check file size limits.';
                break;
            case strpos($errors, 'invalid file type') !== false:
                $developer['message'] = 'Invalid file type.';
                $developer['details'] = 'Verify allowed file types.';
                break;
            case strpos($errors, 'temporary directory') !== false:
                $developer['message'] = 'Upload issue.';
                $developer['details'] = 'Check temporary directory permissions.';
                break;
            case strpos($errors, 'interrupted') !== false:
                $developer['message'] = 'Upload interrupted.';
                $developer['details'] = 'Ensure stable connection.';
                break;
            case strpos($errors, 'permissions') !== false:
                $developer['message'] = 'Permission denied.';
                $developer['details'] = 'Check file system permissions.';
                break;
            default:
                $developer['details'] = 'Unknown file error.';
        }
        return $developer;
    }

    /**
     * Handle suspicious operation errors
     *
     * @param string $errors
     * @return array
     */
    private static function handleSuspiciousOperation(string $errors): array
    {
        $developer = ['message' => 'Invalid request.'];
        switch (true) {
            case strpos($errors, 'cookie') !== false:
                $developer['message'] = 'Session issue.';
                $developer['details'] = 'Corrupted session cookie.';
                break;
            case strpos($errors, 'missing cookie') !== false:
                $developer['message'] = 'Session error.';
                $developer['details'] = 'Missing session cookie.';
                break;
            case strpos($errors, 'expired') !== false:
                $developer['message'] = 'Session expired.';
                $developer['details'] = 'Session cookie expired.';
                break;
            case strpos($errors, 'invalid signature') !== false:
                $developer['message'] = 'Invalid session.';
                $developer['details'] = 'Invalid cookie signature.';
                break;
            default:
                $developer['details'] = 'Suspicious request detected.';
        }
        return $developer;
    }

    /**
     * Handle email transport errors
     *
     * @param string $errors
     * @return array
     */
    private static function handleTransportError(string $errors): array
    {
        $developer = ['message' => 'Email delivery failed.'];
        switch (true) {
            case strpos($errors, 'SMTP') !== false:
                $developer['message'] = 'Email service issue.';
                $developer['details'] = 'Check SMTP configuration.';
                break;
            case strpos($errors, 'transport') !== false:
                $developer['message'] = 'Email service unavailable.';
                $developer['details'] = 'Verify transport settings.';
                break;
            default:
                $developer['details'] = 'Unknown email error.';
        }
        return $developer;
    }
}