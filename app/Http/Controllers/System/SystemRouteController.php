<?php

namespace App\Http\Controllers\System;

use App\Facades\{Developer, Skeleton};
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;
use Exception;

/**
 * Dispatches panel routes across all modules dynamically.
 */
class SystemRouteController extends Controller
{
    private const BASE_NAMESPACE = 'App\\Http\\Controllers\\System\\';
    /**
     * Dispatches the request to the appropriate controller.
     *
     * @param Request $request
     * @return mixed
     */
    public function dispatch(Request $request)
    {
        try {
            // Check authentication
            if (!Auth::check()) {
                Developer::warning('Unauthenticated access attempt.', ['path' => $request->path()]);
                return $this->handleError($request, 'Authentication required.', Response::HTTP_UNAUTHORIZED);
            }
            $user = Skeleton::getAuthenticatedUser();
            $system = ucfirst(Skeleton::getUserSystem());
            $userId = $user->id ?? null;
            $segments = $request->segments();
            $module  = isset($segments[0]) ? $this->toCamelCase($segments[0]) : 'Main Menu';
            $section = isset($segments[1]) ? $this->toCamelCase($segments[1]) : null;
            $item    = isset($segments[2]) ? $this->toCamelCase($segments[2]) : null;
            $token = $segments[0] === 'skeleton-action' ? ($segments[1] ?? '') : '';
            // Rate limiting
            $rateLimitKey = "dispatch:{$userId}";
            if (RateLimiter::tooManyAttempts($rateLimitKey, 100, 60)) {
                Developer::warning('Rate limit exceeded.', ['user_id' => $userId, 'path' => $request->path()]);
                return $this->handleError($request, 'Too many requests.', Response::HTTP_TOO_MANY_REQUESTS);
            }
            RateLimiter::hit($rateLimitKey, 60);
            // Validate module, section, and item
            if (!$token) {
                $modules = collect(Skeleton::getModules())->pluck('name')->map(fn($name) => $this->toCamelCase($name))->toArray();
                if (!in_array($module, $modules)) {
                    Developer::warning('Invalid module.', ['module' => $module, 'system' => $system]);
                    return $this->handleError($request, 'Module not found.', Response::HTTP_NOT_FOUND);
                }
                // Check module permission

                if (!Skeleton::hasPermission("view:{$module}", $user)) {
                    Developer::warning('Permission denied for module.', ['module' => $module, 'user_id' => $userId]);
                    return $this->handleError($request, 'Permission denied.', Response::HTTP_FORBIDDEN);
                }
                if ($section) {
                    $sections = collect(Skeleton::getSections())->where('module_id', collect(Skeleton::getModules())->firstWhere('name', $module)['module_id'] ?? null)->pluck('name')->map(fn($name) => $this->toCamelCase($name))->toArray();
                    Developer::info($section);
                    if (!in_array($section, $sections)) {
                        Developer::warning('Invalid section.', ['section' => $section, 'module' => $module]);
                        return $this->handleError($request, 'Section not found.', Response::HTTP_NOT_FOUND);
                    }
                    // Check section permission
                    if (!Skeleton::hasPermission("view:{$module}::{$section}", $user)) {
                        Developer::warning('Permission denied for section.', ['section' => $section, 'module' => $module, 'user_id' => $userId]);
                        return $this->handleError($request, 'Permission denied.', Response::HTTP_FORBIDDEN);
                    }
                }
                if ($item) {
                    $sectionId = collect(Skeleton::getSections())->firstWhere('name', $section)['section_id'] ?? null;
                    $items = collect(Skeleton::getItems())->where('section_id', $sectionId)->pluck('name')->map(fn($name) => $this->toCamelCase($name))->toArray();
                    if (!in_array($item, $items)) {
                        Developer::warning('Invalid item.', ['item' => $item, 'section' => $section, 'module' => $module]);
                        return $this->handleError($request, 'Item not found.', Response::HTTP_NOT_FOUND);
                    }
                    // Check item permission
                    if (!Skeleton::hasPermission("view:{$module}::{$section}::{$item}", $user)) {
                        Developer::warning('Permission denied for item.', ['item' => $item, 'section' => $section, 'module' => $module, 'user_id' => $userId]);
                        return $this->handleError($request, 'Permission denied.', Response::HTTP_FORBIDDEN);
                    }
                }
            }
            // Resolve controller and method
            $controllerInfo = $this->resolveController($system, $module, $token);
            if (!$controllerInfo) {
                Developer::warning('No controller found.', ['system' => $system, 'module' => $module]);
                return $this->handleError($request, 'Route not found.', Response::HTTP_NOT_FOUND);
            }
            [$controllerClass, $method] = $controllerInfo;
            if (!is_string($method) || !method_exists($controllerClass, $method)) {
                Developer::error('Invalid method for controller.', ['controller' => $controllerClass, 'method' => $method, 'user_id' => $userId]);
                return $this->handleError($request, 'Invalid controller method.', Response::HTTP_NOT_FOUND);
            }
            // Execute the controller method with parameters array
            $response = app($controllerClass)->{$method}($request, [
                'module' => $module,
                'section' => $section,
                'item' => $item,
                'token' => $token,
            ]);
            return $response;
        } catch (Exception $e) {
            Developer::error('Error in SystemController.', ['error' => $e->getMessage(), 'path' => $request->path()]);
            return $this->handleError($request, config('developer.mode') ? $e->getMessage() : 'Internal server error.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Resolves the controller class and method for the request.
     *
     * @param string $system
     * @param string $module
     * @param string|null $section
     * @param string|null $item
     * @param string|null $token
     * @return array|null
     */
    private function resolveController(string $system, string $module, ?string $token): ?array
    {
        $controllerName = 'NavCtrl';
        $methodName = 'index';
        $module = trim(str_replace(' ', '', ucwords($module, '-')));
        // Handle token-based action routes (/skeleton-action/{token})
        if ($token) {
            $config = Skeleton::resolveToken($token);
            Developer::info($config);
            $reqSet = ['key' => $config['key'] ?? null];
            $data = collect(Skeleton::getSkeletonData()['tokens'])->where('key', $reqSet['key'])->first();
            if (!$data) {
                Developer::warning('Invalid SkeletonToken key.', ['key' => $reqSet['key'], 'token' => $token]);
                return null;
            }
            $module = ucfirst($this->toCamelCase($data['module']));
            $module = trim(str_replace(' ', '', ucwords($module, '-')));
            $actionInfo = $this->buildActionControllerName($token);
            $actionType = $actionInfo[0];
            $controllerName = $actionInfo[1];
            $methodName = $actionInfo[2];
            $controllerClass = in_array($actionType, ['d', 'ds', 'md', 'mds', 's', 'u', 'db', 'dbs'])
                ? self::BASE_NAMESPACE . "Actions\\{$controllerName}"
                : self::BASE_NAMESPACE . "{$system}\\{$module}\\{$controllerName}";
        } else {
            // Non-token routes
            $controllerClass = self::BASE_NAMESPACE . "{$system}\\{$module}\\NavCtrl";
        }
        if (!class_exists($controllerClass) || !method_exists($controllerClass, $methodName)) {
            Developer::warning('Controller or Method not found.', ['controller' => $controllerClass, 'method' => $methodName]);
            $controllerClass = self::BASE_NAMESPACE . "{$system}\\{$module}\\NavCtrl";
            if (!class_exists($controllerClass)) {
                Developer::warning('Controller not found.', ['controller' => $controllerClass, 'method' => $methodName]);
                return null;
            }
        }
        return [$controllerClass, $methodName];
    }
    /**
     * Builds controller name for skeleton actions.
     *
     * @param string $token
     * @return array{0: string, 1: string, 2: string}
     */
    private function buildActionControllerName(string $token): array
    {
        $parts = explode('_', $token);
        if (count($parts) < 5) {
            Developer::warning('Invalid token format', ['token' => $token]);
            return ['n', 'NavCtrl', 'index'];
        }
        $actionMap = [
            // Add
            'a'  => ['a', 'ShowAddCtrl', 'index'],
            'as' => ['as', 'SaveAddCtrl', 'index'],

            // Edit
            'e'  => ['e', 'ShowEditCtrl', 'index'],
            'es' => ['es', 'SaveEditCtrl', 'index'],
            'be' => ['be', 'SaveEditCtrl', 'bulk'],
            'bes' => ['bes', 'SaveEditCtrl', 'save_bulk'],

            // Delete
            'd'   => ['d', 'DeleteCtrl', 'single'],
            'ds'  => ['ds', 'DeleteCtrl', 'delete_single'],
            'db'  => ['db', 'DeleteCtrl', 'multiple'],
            'dbs' => ['dbs', 'DeleteCtrl', 'confirmed_multiple'],

            //Form
            'f'  => ['f', 'FormCtrl', 'index'],

            // Display/View
            'c'  => ['c', 'CardCtrl', 'index'],
            't'  => ['t', 'TableCtrl', 'index'],
            'v'  => ['v', 'ViewCtrl', 'index'],

            //Dashboard
            // 'db' => ['db', 'DashboardCtrl', 'index'],

            // Utility
            's' => ['s', 'Select', 'index'],
            'u' => ['u', 'Unique', 'index'],
            'm' => ['u', 'Mapping', 'index'],
        ];

        $actionKey = $parts[4]; 
        return $actionMap[$actionKey] ?? ['n', 'NavCtrl', 'index']; 
    }
    /**
     * Converts dashed string to camel case.
     *
     * @param string $input
     * @return string
     */
    private function toCamelCase(string $input): string
    {
        return trim(str_replace('-', ' ', ucwords($input, '-')));
    }
    /**
     * Handles errors with developer mode support.
     *
     * @param Request $request
     * @param string $message
     * @param int $statusCode
     * @return mixed
     */
    private function handleError(Request $request, string $message, int $statusCode)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => $message,
            ], $statusCode);
        }
        if (!Auth::check()) {
            return redirect()->route('login')->withErrors(['error' => $message]);
        }
        // Redirect to error view based on status code
        $errorView = "errors.{$statusCode}";
        if (View::exists($errorView)) {
            return response()->view($errorView, ['error' => $message], $statusCode);
        }
        // Fallback to generic error view if specific one doesn't exist
        return response()->view('errors.generic', ['error' => $message, 'status' => $statusCode], $statusCode);
    }
    /**
     * Reload Skeleton.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function reload_skeleton(Request $request)
    {
        try {
            Skeleton::reloadSkeleton();
            return response()->json([
                'status' => true,
                'title' => 'Success',
                'message' => 'Skeleton reloaded successfully',
                'timestamp' => now()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'title' => 'Error',
                'message' => 'Failed to reload skeleton.',
                'error' => $e->getMessage(),
                'timestamp' => now()
            ], 500);
        }
    }
}
