<?php

namespace App\Http\Middleware;

use App\Facades\{Database, Developer, Permission, Skeleton};
use Closure;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware for authentication, account status checks, and skeleton initialization.
 */
class SkeletonMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure $next
     */
    public function handle(Request $request, Closure $next)
    {
        try {
            $user = Auth::guard('web')->check() ? Auth::guard('web')->user() : (Auth::guard('sanctum')->check() ? Auth::guard('sanctum')->user() : null);
            if ($user) {
                if ($user->account_status !== 'active') {
                    Auth::logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();
                    return redirect()->route('login')->withErrors(['error' => 'Account status in-active']);
                }

                if ($request->routeIs('login')) {
                    return redirect('/dashboard');
                }

                if ($user->business_id !== 'CENTRAL') {
                    Database::setupBusinessConnection($user->business_id);
                }
                $response = Skeleton::init();
                if (!$response['status']) {
                    Developer::warning('Failed to initialize token map', [
                        'message' => $response['message'],
                        'path' => $request->path(),
                    ]);
                }
            }

            return $next($request);
        } catch (Exception $e) {
            Developer::error('SkeletonMiddleware error', [
                'error' => $e->getMessage(),
                'path' => $request->path(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}