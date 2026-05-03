<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Facade for the EncryptorService.
 *
 * @method static string encrypt(mixed $value, string $bizId)
 * @method static mixed decrypt(string $value, string $bizId, ?string $key = null)
 * @method static array getKey(string $bizId)
 * @method static bool setKey(string $bizId, string $newKey)
 * @method static bool reencrypt(string $bizId, string $table, string $oldVersion, string $newVersion)
 *
 * @throws \RuntimeException
 */
class Encryptor extends Facade
{
    /**
     * Get the registered name of the component.
     *
     * @return string
     */
    protected static function getFacadeAccessor(): string
    {
        return \App\Services\EncryptorService::class;
    }
}