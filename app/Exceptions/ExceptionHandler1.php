<?php

namespace App\Exceptions;

use App\Facades\Developer;
use Illuminate\Foundation\Exceptions\Handler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * Custom exception handler for the application.
 */
class ExceptionHandler extends Handler
{
    protected $dontReport = [
        \Illuminate\Auth\AuthenticationException::class,
        \Illuminate\Auth\Access\AuthorizationException::class,
        \Symfony\Component\HttpKernel\Exception\HttpException::class,
        \Illuminate\Database\Eloquent\ModelNotFoundException::class,
        \Illuminate\Validation\ValidationException::class,
    ];

    /**
     * Report or log an exception.
     *
     * @param Throwable $exception
     * @return void
     * @throws Throwable
     */
    public function report(Throwable $exception)
    {
        if ($this->shouldReport($exception)) {
            Developer::error('Unhandled exception', [
                'exception' => get_class($exception),
                'message' => $exception->getMessage(),
                'trace' => $exception->getTraceAsString(),
            ]);
        }

        parent::report($exception);
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param Request $request
     * @param Throwable $exception
     * @return \Illuminate\Http\Response|JsonResponse
     */
    public function render($request, Throwable $exception)
    {
        if ($exception instanceof ValidationException) {
            return $this->handleValidationException($request, $exception);
        }

        if ($exception instanceof HttpException) {
            return $this->handleHttpException($request, $exception);
        }

        if ($request->expectsJson()) {
            return $this->prepareJsonResponse($request, $exception);
        }

        return parent::render($request, $exception);
    }

    /**
     * Handle validation exceptions.
     *
     * @param Request $request
     * @param ValidationException $exception
     * @return JsonResponse|\Illuminate\Http\RedirectResponse
     */
    protected function handleValidationException(Request $request, ValidationException $exception)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'error' => true,
                'message' => 'Validation failed',
                'errors' => $exception->errors(),
            ], 422);
        }

        return redirect()->back()->withErrors($exception->errors())->withInput();
    }

    /**
     * Handle HTTP exceptions.
     *
     * @param Request $request
     * @param HttpException $exception
     * @return \Illuminate\Http\Response|JsonResponse
     */
    protected function handleHttpException(Request $request, HttpException $exception)
    {
        $status = $exception->getStatusCode();
        $message = $exception->getMessage() ?: 'An error occurred';

        if ($request->expectsJson()) {
            return response()->json([
                'error' => true,
                'message' => $message,
            ], $status);
        }

        return response()->view("errors.{$status}", ['exception' => $exception], $status);
    }

    /**
     * Prepare a JSON response for the exception.
     *
     * @param Request $request
     * @param Throwable $exception
     * @return JsonResponse
     */
    protected function prepareJsonResponse($request, Throwable $exception)
    {
        return response()->json([
            'error' => true,
            'message' => config('app.debug') ? $exception->getMessage() : 'Internal server error',
        ], 500);
    }
}