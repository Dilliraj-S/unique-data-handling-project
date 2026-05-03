<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for the SkeletonService.
 *
 * @method static string getUserSystem()
 * @method static array getData()
 * @method static array getNavigationData()
 * @method static array getNavigationByToken(string $token)
 * @method static array getModules()
 * @method static array getSections()
 * @method static array getItems()
 * @method static array getTokens()
 * @method static void invalidateCache(int $userId, string $businessId)
 * @method static void invalidateGlobalModulesCache()
 * @method static array init(string $system = 'business')
 * @method static array getTokenForToken(string $configKey)
 * @method static array generateNewTokenForToken(string $configKey)
 * @method static array regenerate(string $configKey)
 * @method static array reupdateCache(string $system = 'business')
 * @method static array resolve(string $generatedToken)
 */
class Skeleton extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \App\Services\SkeletonService::class;
    }
}