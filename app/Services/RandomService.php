<?php

namespace App\Services;

use Exception;
use InvalidArgumentException;

class RandomService
{
    /**
     * Create a random string from a character set.
     *
     * @param string $chars Character set to use.
     * @param int $length Length of the string.
     * @return string Random string. Example: 'aB2x9'
     * @throws InvalidArgumentException If length < 1 or chars empty.
     */
    protected function randomString(string $chars, int $length): string
    {
        if ($length < 1) {
            throw new InvalidArgumentException('Length must be at least 1.');
        }
        if (empty($chars)) {
            throw new InvalidArgumentException('Character set cannot be empty.');
        }

        $str = '';
        $charsLength = strlen($chars);
        for ($i = 0; $i < $length; $i++) {
            $str .= $chars[random_int(0, $charsLength - 1)];
        }
        return $str;
    }

    /**
     * Create a random string by type.
     *
     * @param string $type Type ('alnum', 'num', 'alpha', 'special').
     * @param int $length Length of the string.
     * @param bool $uppercase Return in uppercase.
     * @return string Random string. Example: 'aB2x9' or 'AB2X9' (uppercase)
     * @throws InvalidArgumentException If type invalid or length < 1.
     */
    public function string(string $type, int $length, bool $uppercase = false): string
    {
        $charSets = [
            'alnum' => '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            'num' => '0123456789',
            'alpha' => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            'special' => '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()-_=+',
        ];

        if (!isset($charSets[$type])) {
            throw new InvalidArgumentException("Invalid type: $type. Valid types: " . implode(', ', array_keys($charSets)));
        }

        $result = $this->randomString($charSets[$type], $length);
        return $uppercase ? strtoupper($result) : $result;
    }

    /**
     * Create a random single-digit number (0-9).
     *
     * @return int Random digit. Example: 7
     */
    public function number(): int
    {
        return random_int(0, 9);
    }

    /**
     * Create a random string with special characters.
     *
     * @param int $length Length of the string.
     * @param bool $uppercase Return in uppercase.
     * @return string Random string with special characters. Example: 'aB2@x' or 'AB2@X' (uppercase)
     * @throws InvalidArgumentException If length < 1.
     */
    public function special(int $length, bool $uppercase = false): string
    {
        return $this->string('special', $length, $uppercase);
    }

    /**
     * Create a random ID with prefix and length.
     *
     * @param string $prefix Prefix for the ID.
     * @param int $length Length of random part.
     * @param bool $uppercase Return in uppercase.
     * @return string Random ID. Example: 'ID-123abc' or 'ID-123ABC' (uppercase)
     * @throws InvalidArgumentException If length < 1.
     */
    public function uniqueId(string $prefix, int $length = 7, bool $uppercase = false): string
    {
        if ($length < 1) {
            throw new InvalidArgumentException('Length must be at least 1.');
        }

        return $prefix . $this->string('alnum', $length, $uppercase);
    }

    /**
     * Create a random user ID (10000-60000).
     *
     * @return int Random user ID. Example: 54321
     */
    public function userId(): int
    {
        return random_int(10000, 60000);
    }

    /**
     * Create a random token with underscores and a random character.
     *
     * @param int $length Total length of the token.
     * @param bool $uppercase Return in uppercase.
     * @return string Random token. Example: 'ab_X_cd' or 'AB_X_CD' (uppercase)
     * @throws InvalidArgumentException If length < 4.
     */
    public function token(int $length, bool $uppercase = false): string
    {
        if ($length < 4) {
            throw new InvalidArgumentException('Token length must be at least 4.');
        }

        $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $baseLength = $length - 4; // For _X_ and extra _
        $token = str_split($this->randomString($chars, max(0, $baseLength)));

        // Insert _X_ at random position
        $randChar = $chars[random_int(0, strlen($chars) - 1)];
        $pos = random_int(0, max(0, count($token) - 1));
        array_splice($token, $pos, 0, ['_', $randChar, '_']);

        // Track occupied positions
        $occupied = [$pos, $pos + 1, $pos + 2];

        // Insert extra underscore
        if ($baseLength >= 0) {
            do {
                $extraPos = random_int(0, count($token));
            } while (in_array($extraPos, $occupied));
            array_splice($token, $extraPos, 0, '_');
        }

        // Trim to exact length
        $result = implode('', array_slice($token, 0, $length));
        return $uppercase ? strtoupper($result) : $result;
    }

    /**
     * Create a random alphanumeric ID with optional prefix and separator.
     *
     * @param int $length Length of random part.
     * @param string $prefix Optional prefix (default '').
     * @param string $separator Optional separator (default '').
     * @param bool $uppercase Return in uppercase.
     * @return string Random ID. Example: 'EMP-123abc' or 'EMP-123ABC' (uppercase)
     * @throws InvalidArgumentException If length < 1.
     */
    public function unique(int $length, string $prefix = '', string $separator = '', bool $uppercase = false): string
    {
        if ($length < 1) {
            throw new InvalidArgumentException('Length must be at least 1.');
        }

        $randomPart = $this->string('alnum', $length, $uppercase);
        return $prefix . $separator . $randomPart;
    }

    /**
     * Create a secure random password with mixed characters.
     *
     * @param int $length Length of the password (min 8).
     * @param bool $uppercase Return in uppercase.
     * @return string Random password. Example: 'aB2@x9k$' or 'AB2@X9K$' (uppercase)
     * @throws InvalidArgumentException If length < 8.
     */
    public function password(int $length, bool $uppercase = false): string
    {
        if ($length < 8) {
            throw new InvalidArgumentException('Password length must be at least 8.');
        }

        $password = $this->string('special', $length);
        $password = $this->ensurePasswordStrength($password);
        return $uppercase ? strtoupper($password) : $password;
    }

    /**
     * Ensure password contains at least one digit, letter, and special character.
     *
     * @param string $password Password to check/modify.
     * @return string Strengthened password. Example: 'aB2@x9k$'
     */
    protected function ensurePasswordStrength(string $password): string
    {
        $hasDigit = preg_match('/\d/', $password);
        $hasLetter = preg_match('/[a-zA-Z]/', $password);
        $hasSpecial = preg_match('/[!@#$%^&*()-_=+]/', $password);

        if (!$hasDigit || !$hasLetter || !$hasSpecial) {
            $chars = [
                'digit' => '0123456789',
                'letter' => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
                'special' => '!@#$%^&*()-_=+',
            ];
            $password = str_split($password);

            if (!$hasDigit) {
                $pos = random_int(0, count($password) - 1);
                $password[$pos] = $chars['digit'][random_int(0, strlen($chars['digit']) - 1)];
            }
            if (!$hasLetter) {
                $pos = random_int(0, count($password) - 1);
                $password[$pos] = $chars['letter'][random_int(0, strlen($chars['letter']) - 1)];
            }
            if (!$hasSpecial) {
                $pos = random_int(0, count($password) - 1);
                $password[$pos] = $chars['special'][random_int(0, strlen($chars['special']) - 1)];
            }

            $password = implode('', $password);
        }

        return $password;
    }

    /**
     * Create a random employee code with department prefix.
     *
     * @param string $deptPrefix Department prefix (e.g., 'HR').
     * @param int $length Length of random part.
     * @param bool $uppercase Return in uppercase.
     * @return string Random employee code. Example: 'HR-123abc' or 'HR-123ABC' (uppercase)
     * @throws InvalidArgumentException If length < 1.
     */
    public function employeeCode(string $deptPrefix, int $length = 6, bool $uppercase = false): string
    {
        if ($length < 1) {
            throw new InvalidArgumentException('Length must be at least 1.');
        }

        return $deptPrefix . '-' . $this->string('alnum', $length, $uppercase);
    }

    /**
     * Create a random session ID for user authentication.
     *
     * @param int $length Length of the session ID (min 16).
     * @param bool $uppercase Return in uppercase.
     * @return string Random session ID. Example: 'aB2x9kLmNpQrStUv' or 'AB2X9KLMNPQRSTUV' (uppercase)
     * @throws InvalidArgumentException If length < 16.
     */
    public function sessionId(int $length = 32, bool $uppercase = false): string
    {
        if ($length < 16) {
            throw new InvalidArgumentException('Session ID length must be at least 16.');
        }

        return $this->string('alnum', $length, $uppercase);
    }

    /**
     * Create a random API key for secure access.
     *
     * @param int $length Length of the API key (min 32).
     * @param bool $uppercase Return in uppercase.
     * @return string Random API key. Example: 'aB2x9kLmNpQrStUvWxYz1234567890ab' or uppercase
     * @throws InvalidArgumentException If length < 32.
     */
    public function apiKey(int $length = 32, bool $uppercase = false): string
    {
        if ($length < 32) {
            throw new InvalidArgumentException('API key length must be at least 32.');
        }

        return $this->string('alnum', $length, $uppercase);
    }

    /**
     * Create a random ticket ID for support requests.
     *
     * @param int $length Length of random part.
     * @param bool $uppercase Return in uppercase.
     * @return string Random ticket ID. Example: 'TCK-xyz123' or 'TCK-XYZ123' (uppercase)
     * @throws InvalidArgumentException If length < 1.
     */
    public function ticket(int $length = 6, bool $uppercase = false): string
    {
        if ($length < 1) {
            throw new InvalidArgumentException('Length must be at least 1.');
        }

        return 'TCK-' . $this->string('alnum', $length, $uppercase);
    }

    /**
     * Create a random host ID for hosting resources.
     *
     * @param int $length Length of random part.
     * @param bool $uppercase Return in uppercase.
     * @return string Random host ID. Example: 'SRV-abc123' or 'SRV-ABC123' (uppercase)
     * @throws InvalidArgumentException If length < 1.
     */
    public function hostId(int $length = 6, bool $uppercase = false): string
    {
        if ($length < 1) {
            throw new InvalidArgumentException('Length must be at least 1.');
        }

        return 'SRV-' . $this->string('alnum', $length, $uppercase);
    }

    /**
     * Create a random numeric one-time password (OTP).
     *
     * @param int $length Length of the OTP (min 4).
     * @return string Random OTP. Example: '123456'
     * @throws InvalidArgumentException If length < 4.
     */
    public function otp(int $length = 6): string
    {
        if ($length < 4) {
            throw new InvalidArgumentException('OTP length must be at least 4.');
        }

        return $this->string('num', $length);
    }

    /**
     * Create a random URL-friendly slug.
     *
     * @param int $length Length of the slug.
     * @param bool $uppercase Return in uppercase.
     * @return string Random slug. Example: 'abc-123-def' or 'ABC-123-DEF' (uppercase)
     * @throws InvalidArgumentException If length < 1.
     */
    public function slug(int $length, bool $uppercase = false): string
    {
        if ($length < 1) {
            throw new InvalidArgumentException('Length must be at least 1.');
        }

        $chars = 'abcdefghijklmnopqrstuvwxyz0123456789-';
        $slug = $this->randomString($chars, $length);
        // Ensure no leading/trailing hyphens
        $slug = trim($slug, '-');
        // Replace multiple hyphens with single
        $slug = preg_replace('/-+/', '-', $slug);
        return $uppercase ? strtoupper($slug) : $slug;
    }
}