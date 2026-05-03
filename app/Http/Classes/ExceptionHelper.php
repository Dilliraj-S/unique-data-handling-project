<?php
namespace App\Http\Classes;
use Exception;
use PDOException;
use InvalidArgumentException;
use RuntimeException;
use LogicException;
use LengthException;
use OutOfBoundsException;
use OverflowException;
use UnderflowException;
use UnexpectedValueException;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\RelationNotFoundException;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Queue\MaxAttemptsExceededException;
use Illuminate\Queue\InvalidPayloadException;
use Illuminate\Mail\Mailer;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Routing\Exceptions\UrlGenerationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\HttpFoundation\Exception\SuspiciousOperationException;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\Mailer\Exception\TransportException;
class ExceptionHelper
{
    /**
     * Handle exceptions and return JSON response
     *
     * @param Exception $e
     * @return \Illuminate\Http\JsonResponse
     */
    public static function handle(Exception $e)
    {
        $errors = $e->getMessage();
        $title = 'Internal Server Error';
        $message = 'An unexpected error occurred [NC]: ' . $errors;
        $code = 500;
        switch (true) {
            case $e instanceof QueryException:
                $message = 'A database error occurred.';
                // Extract column/table name if available
                preg_match("/Column '(.+?)'/", $errors, $columnMatch);
                preg_match("/Table '(.+?)'/", $errors, $tableMatch);
                $column = isset($columnMatch[1]) ? $columnMatch[1] : 'unknown column';
                $table = isset($tableMatch[1]) ? $tableMatch[1] : 'unknown table';
                // SQL Syntax Errors
                if (strpos($errors, 'SQLSTATE[42000]') !== false)
                    $message = 'SQL syntax error or access violation. Please check the query structure.';
                // Table or Column Issues
                if (strpos($errors, 'SQLSTATE[42S02]') !== false)
                    $message = "Table '{$table}' not found in the database.";
                if (strpos($errors, 'SQLSTATE[42S22]') !== false)
                    $message = "Column '{$column}' not found in the table.";
                // Data Type Issues
                if (strpos($errors, 'SQLSTATE[22001]') !== false)
                    $message = "Value too long for column '{$column}'.";
                if (strpos($errors, 'SQLSTATE[22003]') !== false)
                    $message = "Numeric value out of range for column '{$column}'.";
                if (strpos($errors, 'SQLSTATE[22007]') !== false)
                    $message = "Invalid datetime format for column '{$column}'.";
                if (strpos($errors, 'SQLSTATE[22012]') !== false)
                    $message = "Division by zero error in column '{$column}'.";
                if (strpos($errors, 'SQLSTATE[22004]') !== false)
                    $message = "Null value not allowed for column '{$column}'.";
                // Constraint Violations
                if (strpos($errors, 'SQLSTATE[23000]') !== false)
                    $message = 'Integrity constraint violation (e.g., foreign key, unique, or not null constraint).';
                if (strpos($errors, 'SQLSTATE[23502]') !== false)
                    $message = "Not null constraint violated: '{$column}' cannot be null.";
                if (strpos($errors, 'SQLSTATE[23503]') !== false)
                    $message = "Foreign key constraint violation: A referenced record is missing.";
                if (strpos($errors, 'SQLSTATE[23505]') !== false)
                    $message = "Unique constraint violation: Duplicate entry for '{$column}'.";
                // Deadlocks & Transaction Errors
                if (strpos($errors, 'SQLSTATE[40001]') !== false)
                    $message = 'Deadlock detected: Two transactions are waiting on each other.';
                if (strpos($errors, 'SQLSTATE[40P01]') !== false)
                    $message = 'Deadlock condition detected, transaction aborted.';
                if (strpos($errors, 'SQLSTATE[25006]') !== false)
                    $message = 'Read-only transaction error: Cannot modify data.';
                if (strpos($errors, 'SQLSTATE[25P02]') !== false)
                    $message = 'Transaction aborted due to an error in processing.';
                // Locking & Timeout Issues
                if (strpos($errors, 'SQLSTATE[55P03]') !== false)
                    $message = 'Lock wait timeout exceeded. Try again later.';
                if (strpos($errors, 'SQLSTATE[40002]') !== false)
                    $message = 'Transaction rolled back due to serialization failure.';
                // Authentication & Privileges
                if (strpos($errors, 'SQLSTATE[28000]') !== false)
                    $message = 'Invalid database credentials (user authentication failed).';
                if (strpos($errors, 'SQLSTATE[42000]') !== false)
                    $message = 'Insufficient privileges to execute this SQL statement.';
                // Connection Issues
                if (strpos($errors, 'SQLSTATE[08S01]') !== false)
                    $message = 'Communication link failure: The database connection was lost.';
                if (strpos($errors, 'SQLSTATE[08001]') !== false)
                    $message = 'Database connection failed. Ensure the database is running.';
                if (strpos($errors, 'SQLSTATE[08003]') !== false)
                    $message = 'Database connection does not exist.';
                if (strpos($errors, 'SQLSTATE[08006]') !== false)
                    $message = 'Connection failure during transaction.';
                // Miscellaneous Errors
                if (strpos($errors, 'SQLSTATE[0A000]') !== false)
                    $message = 'Feature not supported by the database engine.';
                if (strpos($errors, 'SQLSTATE[42P01]') !== false)
                    $message = "Undefined table '{$table}'.";
                if (strpos($errors, 'SQLSTATE[42P02]') !== false)
                    $message = 'Undefined parameter in the query.';
                if (strpos($errors, 'SQLSTATE[42P07]') !== false)
                    $message = "Duplicate table name '{$table}' already exists.";
                if (strpos($errors, 'SQLSTATE[2200G]') !== false)
                    $message = "Invalid binary data for column '{$column}'.";
                // General SQL Error
                if (strpos($errors, 'SQLSTATE[HY000]') !== false)
                    $message = 'General SQL error occurred.';
                if (strpos($errors, 'SQLSTATE[HY001]') !== false)
                    $message = 'Memory allocation error while executing the query.';
                $title = 'Database Error';
                $code = 400;
                break;
            case $e instanceof ModelNotFoundException:
                $title = 'Record Not Found';
                $message = 'The requested record could not be found.';
                $code = 404;
                break;
            case $e instanceof PDOException:
                $title = 'Database Error';
                if (strpos($errors, 'SQLSTATE[08001]') !== false)
                    $message = 'Unable to connect to the database server.';
                if (strpos($errors, 'SQLSTATE[28000]') !== false)
                    $message = 'Invalid database username or password.';
                if (strpos($errors, 'SQLSTATE[HY000] [2002]') !== false)
                    $message = 'MySQL server not found.';
                if (strpos($errors, 'SQLSTATE[HY000] [1045]') !== false)
                    $message = 'Access denied for database user.';
                if (strpos($errors, 'SQLSTATE[42000] [1049]') !== false)
                    $message = 'Unknown database.';
                $code = 500;
                break;
            case strpos($errors, 'SQLSTATE[42S22]') !== false:
                $title = 'Database Error';
                $message = 'Column not found.';
                $code = 400;
                break;
            case strpos($errors, 'SQLSTATE[42S02]') !== false:
                $title = 'Database Error';
                $message = 'Table not found.';
                $code = 400;
                break;
            case strpos($errors, 'SQLSTATE[23000]') !== false:
                $title = 'Database Error';
                $message = 'Duplicate entry or constraint violation.';
                $code = 400;
                break;
            case strpos($errors, 'SQLSTATE[40001]') !== false:
                $title = 'Database Error';
                $message = 'Deadlock detected.';
                $code = 500;
                break;
            case strpos($errors, 'SQLSTATE[HY000] [1205]') !== false:
                $title = 'Database Error';
                $message = 'Lock wait timeout exceeded.';
                $code = 500;
                break;
            case strpos($errors, 'SQLSTATE[HY000] [1040]') !== false:
                $title = 'Database Error';
                $message = 'Too many connections to the database.';
                $code = 500;
                break;
            case strpos($errors, 'SQLSTATE[HY000] [1153]') !== false:
                $title = 'Database Error';
                $message = 'Packet too large.';
                $code = 500;
                break;
            case strpos($errors, 'SQLSTATE[HY000] [1036]') !== false:
                $title = 'Database Error';
                $message = 'The table is read-only.';
                $code = 500;
                break;
            case strpos($errors, 'SQLSTATE[HY000] [1053]') !== false:
                $title = 'Database Error';
                $message = 'Server shutdown in progress.';
                $code = 500;
                break;
            case strpos($errors, 'SQLSTATE[HY000] [2059]') !== false:
                $title = 'Database Error';
                $message = 'Unknown authentication plugin.';
                $code = 500;
                break;
            case strpos($errors, 'SQLSTATE[HY000] [5]') !== false:
                $title = 'Database Error';
                $message = 'Out of memory.';
                $code = 500;
                break;
            case strpos($errors, 'SQLSTATE[22001]') !== false:
                $title = 'Database Error';
                $message = 'Data too long for column.';
                $code = 400;
                break;
            case $e instanceof NotFoundHttpException:
                $title = 'Resource Not Found';
                $message = 'The requested resource could not be found.';
                $code = 404;
                break;
            case $e instanceof MethodNotAllowedHttpException:
                $title = 'Method Not Allowed';
                $message = 'The HTTP method used is not allowed for this route.';
                $code = 405;
                break;
            case $e instanceof AccessDeniedHttpException:
                $title = 'Access Denied';
                $message = 'You do not have permission to access this resource.';
                $code = 403;
                break;
            case $e instanceof UnauthorizedHttpException:
                $title = 'Unauthorized Access';
                $message = 'You are not authorized to perform this action.';
                $code = 401;
                break;
            case $e instanceof TokenMismatchException:
                $title = 'CSRF Token Mismatch';
                $message = 'Your session has expired. Please refresh the page.';
                $code = 419;
                break;
            case $e instanceof ServiceUnavailableHttpException:
                $title = 'Service Unavailable';
                $message = 'The server is temporarily unavailable.';
                $code = 503;
                break;
            case $e instanceof AuthenticationException:
                $title = 'Authentication Error';
                $message = 'You are not authenticated. Please log in.';
                $code = 401;
                break;
            case $e instanceof TokenMismatchException:
                $title = 'Authentication Error';
                $message = 'Your session has expired. Please log in again.';
                $code = 401;
                break;
            case $e instanceof AuthorizationException:
                $title = 'Authorization Error';
                $message = 'You do not have permission to perform this action.';
                $code = 403;
                break;
            case $e instanceof FileNotFoundException:
                if (strpos($errors, 'local') !== false) {
                    $title = 'File Not Found';
                    $message = 'The requested file could not be found in local storage.';
                    $code = 404;
                } elseif (strpos($errors, 'cloud') !== false) {
                    $title = 'File Not Found';
                    $message = 'The requested file could not be found in cloud storage (e.g., S3).';
                    $code = 404;
                } else {
                    $title = 'File Not Found';
                    $message = 'The requested file does not exist at the given path.';
                    $code = 404;
                }
                break;
            case $e instanceof FileException:
                if (strpos($errors, 'too large') !== false) {
                    $title = 'File Upload Error';
                    $message = 'The uploaded file is too large. Please reduce the file size and try again.';
                    $code = 400;
                } elseif (strpos($errors, 'invalid file type') !== false) {
                    $title = 'File Upload Error';
                    $message = 'The file type is invalid. Please upload a valid file type (e.g., .jpg, .png).';
                    $code = 400;
                } elseif (strpos($errors, 'temporary directory') !== false) {
                    $title = 'File Upload Error';
                    $message = 'There was an issue with the temporary directory during the file upload. Please try again.';
                    $code = 500;
                } elseif (strpos($errors, 'interrupted') !== false) {
                    $title = 'File Upload Error';
                    $message = 'The file upload was interrupted. Please try uploading the file again.';
                    $code = 500;
                } elseif (strpos($errors, 'permissions') !== false) {
                    $title = 'File Upload Error';
                    $message = 'Insufficient permissions to upload the file. Please check the file permissions.';
                    $code = 403;
                }
                break;
            case $e instanceof TokenMismatchException:
                if (strpos($errors, 'CSRF token mismatch') !== false) {
                    $title = 'CSRF Token Mismatch';
                    $message = 'Your session has expired. Please refresh the page and try again.';
                    $code = 419;
                } elseif (strpos($errors, 'Missing CSRF token') !== false) {
                    $title = 'CSRF Token Missing';
                    $message = 'No CSRF token was found in the request. Ensure the form includes the token.';
                    $code = 400;
                } else {
                    $title = 'CSRF Token Mismatch';
                    $message = 'The CSRF token does not match the one stored in the session.';
                    $code = 419;
                }
                break;
            case $e instanceof SuspiciousOperationException:
                if (strpos($errors, 'cookie') !== false) {
                    $title = 'Malformed Session Cookie';
                    $message = 'The session cookie seems to be corrupted. Please log out and log back in.';
                    $code = 400;
                } elseif (strpos($errors, 'missing cookie') !== false) {
                    $title = 'Missing Session Cookie';
                    $message = 'The session cookie was not sent. Please enable cookies in your browser.';
                    $code = 400;
                } elseif (strpos($errors, 'expired') !== false) {
                    $title = 'Expired Session Cookie';
                    $message = 'Your session cookie has expired. Please log in again.';
                    $code = 419;
                } elseif (strpos($errors, 'invalid signature') !== false) {
                    $title = 'Invalid Session Cookie';
                    $message = 'The session cookie signature is invalid. Please log out and log back in.';
                    $code = 400;
                }
                break;
            case $e instanceof MaxAttemptsExceededException:
                $title = 'Max Attempts Exceeded';
                $message = 'The job has exceeded the maximum number of retry attempts.';
                $code = 503;
                break;
            case $e instanceof InvalidPayloadException:
                $title = 'Invalid Job Payload';
                $message = 'The payload provided for the job is invalid or improperly formatted.';
                $code = 400;
                break;
            case $e instanceof MaxAttemptsExceededException:
                $title = 'Max Attempts Exceeded';
                $message = 'The job has failed too many times.';
                $code = 500;
                break;
            case $e instanceof InvalidPayloadException:
                $title = 'Invalid Payload';
                $message = 'The payload for the queued job is invalid.';
                $code = 400;
                break;
            case $e instanceof Mailer:
                $title = 'Mailer Error';
                $message = 'There was an error sending the email. Please verify the email service configuration.';
                $code = 500;
                break;
            case $e instanceof TransportException:
                if (strpos($errors, 'transport') !== false) {
                    $title = 'Email Transport Error';
                    $message = 'There was an error with the email transport mechanism. Please try again later.';
                    $code = 503;
                } elseif (strpos($errors, 'SMTP') !== false) {
                    $title = 'SMTP Connection Error';
                    $message = 'There was an issue connecting to the SMTP server. Please check the server configuration.';
                    $code = 500;
                } else {
                    $title = 'Email Transport Failure';
                    $message = 'There was a general issue with the email transport. Please try again later.';
                    $code = 500;
                }
                break;
            case $e instanceof BindingResolutionException:
                if (strpos($errors, 'not found') !== false) {
                    $title = 'Dependency Not Found';
                    $message = 'The required dependency could not be resolved. Please check the configuration.';
                    $code = 400;
                } else {
                    $title = 'Dependency Resolution Error';
                    $message = 'There was an issue resolving a dependency from the container.';
                    $code = 500;
                }
                break;
            case $e instanceof LockTimeoutException:
                $title = 'Cache Lock Timeout';
                $message = 'A cache lock operation timed out. Please try again later.';
                $code = 503;
                break;
            case $e instanceof DecryptException:
                $title = 'Invalid Encryption Key';
                $message = 'The provided encryption key is invalid or has been tampered with.';
                $code = 400;
                break;
            case $e instanceof BroadcastException:
                if (strpos($errors, 'configuration') !== false) {
                    $title = 'Broadcasting Configuration Error';
                    $message = 'There was an issue with the broadcasting configuration. Please check your settings.';
                    $code = 500;
                } else {
                    $title = 'Broadcasting Error';
                    $message = 'An error occurred while broadcasting the event.';
                    $code = 500;
                }
                break;
            case $e instanceof ThrottleRequestsException:
                $title = 'Rate Limit Exceeded';
                $message = 'You have exceeded the number of allowed API requests. Please try again later.';
                $code = 429;
                break;
            case $e instanceof PostTooLargeException:
                $title = 'Request Payload Too Large';
                $message = 'The request payload is too large. Please reduce the size of the data and try again.';
                $code = 413;
                break;
            case $e instanceof UrlGenerationException:
                $title = 'Route Generation Error';
                $message = 'The specified route action does not exist or is incorrectly defined.';
                $code = 404;
                break;
            case $e instanceof BindingResolutionException:
                $title = 'Dependency Not Found';
                $message = 'The required dependency could not be resolved.';
                $code = 400;
                break;
            case $e instanceof ValidationException:
                $title = 'Validation Error';
                $message = 'The given data was invalid.';
                $code = 422;
                $errors = $e->errors();
                // InvalidArgumentException Handling
            case $e instanceof InvalidArgumentException:
                $title = 'Invalid Argument';
                $message = 'An invalid argument was passed to the function.';
                $code = 400;
                break;
                // RuntimeException Handling
            case $e instanceof RuntimeException:
                $title = 'Runtime Error';
                $message = 'An error occurred during the runtime execution.';
                $code = 500;
                break;
                // LogicException Handling
            case $e instanceof LogicException:
                $title = 'Logic Error';
                $message = 'A logical error occurred, such as calling a method at the wrong time.';
                $code = 400;
                break;
                // LengthException Handling
            case $e instanceof LengthException:
                $title = 'Length Exceeded';
                $message = 'The given length exceeds the allowed limit.';
                $code = 400;
                break;
                // OutOfBoundsException Handling
            case $e instanceof OutOfBoundsException:
                $title = 'Out of Bounds';
                $message = 'An invalid index was accessed, or the value is out of the valid range.';
                $code = 400;
                break;
                // OverflowException Handling
            case $e instanceof OverflowException:
                $title = 'Overflow Error';
                $message = 'The container or data structure has overflowed.';
                $code = 500;
                break;
                // UnderflowException Handling
            case $e instanceof UnderflowException:
                $title = 'Underflow Error';
                $message = 'Attempted to remove an element from an empty container.';
                $code = 400;
                break;
                // UnexpectedValueException Handling
            case $e instanceof UnexpectedValueException:
                $title = 'Unexpected Value';
                $message = 'An unexpected value was provided.';
                $code = 400;
                break;
                // MassAssignmentException Handling
            case $e instanceof MassAssignmentException:
                $title = 'Mass Assignment Error';
                $message = 'Attributes that are not fillable were attempted to be assigned.';
                $code = 400;
                break;
                // RelationNotFoundException Handling
            case $e instanceof RelationNotFoundException:
                $title = 'Relation Not Found';
                $message = 'The specified relation does not exist.';
                $code = 400;
                break;
                // ThrottleRequestsException Handling
            case $e instanceof ThrottleRequestsException:
                $title = 'Rate Limit Exceeded';
                $message = 'You have exceeded the allowed API request rate.';
                $code = 429;
                break;
                // PostTooLargeException Handling
            case $e instanceof PostTooLargeException:
                $title = 'Payload Too Large';
                $message = 'The request payload is too large to process.';
                $code = 413;
                break;
                // BroadcastException Handling
            case $e instanceof BroadcastException:
                $title = 'Broadcast Error';
                $message = 'An error occurred while broadcasting the event.';
                $code = 500;
                break;
            default:
                $title = 'Internal Server Error';
                $message = 'An unexpected error occurred: ' . $errors;
                $code = 500;
        }
        return response()->json([
            'status' => false,
            'title' => $title,
            'message' => $message,
            'errors' => $errors,
            'code' => $code,
        ]);
    }
}
