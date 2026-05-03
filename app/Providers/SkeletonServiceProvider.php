<?php

namespace App\Providers;

use App\Facades\Developer;
use App\Facades\Skeleton;
use Illuminate\Support\Arr;
use Illuminate\Support\ServiceProvider;
use App\Services\{DatabaseService, SkeletonService};
use App\Observers\Skeleton\SkeletonObserver;
use Illuminate\Support\Facades\{Auth, Blade, DB, Gate, Event, View};

/**
 * Service provider for SkeletonService and related services, optimized for authenticated users.
 */
class SkeletonServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     *
     * @return void
     */
    public function register()
    {
        // Singleton for SkeletonService, injecting DatabaseService
        $this->app->singleton(SkeletonService::class, function ($app) {
            return new SkeletonService(
                $app->make(DatabaseService::class)
            );
        });

        // Singleton for centraldb connection
        $this->app->singleton('centraldb', function () {
            $service = new DatabaseService();
            $service->setupCentralConnection();
            return DB::connection('central');
        });

        // Singleton for businessdb, prioritizing authenticated users
        $this->app->singleton('businessdb', function ($app) {
            $user = Auth::guard('web')->check()
                ? Auth::guard('web')->user()
                : (Auth::guard('sanctum')->check() ? Auth::guard('sanctum')->user() : null);
            if ($user && $user->business_id !== 'CENTRAL') {
                $service = new DatabaseService();
                $connectionName = $service->setupBusinessConnection($user->business_id);
                return DB::connection($connectionName);
            }
            // Default to central connection for unauthenticated users or CENTRAL business_id
            return DB::connection('central');
        });

        // Singleton for dynamic database connection access
        $this->app->singleton('database', function () {
            return new class {
                public function on($connection)
                {
                    return DB::connection($connection);
                }
            };
        });
    }

    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot()
    {
        // Register @skeletonToken directive
        Blade::directive('skeletonToken', function ($expression) {
            return "<?php echo app(\\App\\Services\\SkeletonService::class)->getTokenForKey({$expression})['data']['token'] ?? ''; ?>";
        });

        // Permission-related Blade directives
        Blade::directive('can', function ($expression) {
            // Ensure expression is passed as-is to avoid escaping issues
            return "<?php
                \$user = auth()->user();
                \$canResult = auth()->check() && app(\\App\\Services\\SkeletonService::class)->hasPermission({$expression}, \$user);
                if (\$canResult): ?>";
        });

        Blade::directive('endcan', function () {
            return '<?php endif; ?>';
        });

        // Define Gates for permission checks
        Gate::define('can', function ($user, $ability) {
            return app(SkeletonService::class)->hasPermission($ability, $user);
        });

        Gate::define('hasAnyPermission', function ($user, $permissions, $resource) {
            return app(SkeletonService::class)->hasAnyPermission($permissions, $resource, $user);
        });

        Gate::define('hasAllPermissions', function ($user, $permissions, $resource) {
            return app(SkeletonService::class)->hasAllPermissions($permissions, $resource, $user);
        });

        // Register event listener for table changes
        Event::listen('App\Events\SkeletonEvent', function ($event) {
            SkeletonObserver::ManageSkeletonAction($event->system, $event->table, $event->operation, $event->condition, $event->preVal);
            Developer::info('Handled SkeletonEvent event', [
                'table' => $event->table,
            ]);
        });
    }

}