<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\DB;
use App\Services\SkeletonService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // You can bind SkeletonService here if needed
        // $this->app->singleton(SkeletonService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Share $authUser and recent process logs with all Blade views
        View::composer('*', function ($view) {
            $authUser = null;
            $recentProcessLogs = collect();

            try {
                // Resolve the SkeletonService from the service container
                $skeletonService = app(SkeletonService::class);

                // Get the authenticated user (null if not logged in)
                $authUser = $skeletonService->getAuthenticatedUser(null, false);

                // Fetch last 5 process logs (optionally filter by user ID)
                $recentProcessLogs = DB::table('process_logs')
                    ->where('user_id', $authUser?->id ?? null) // Optional: only logs for logged-in user
                    ->orderByDesc('created_at')
                    ->limit(5)
                    ->get();
            } catch (\Throwable $e) {
                // Optionally log error
                // logger()->error('View composer failed', ['error' => $e->getMessage()]);
            }

            // Share both variables to all views
            $view->with([
                'authUser' => $authUser,
                'logs' => $recentProcessLogs,
            ]);
        });
    }
}
