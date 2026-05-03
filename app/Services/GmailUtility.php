<?php

namespace App\Services;

use Google_Client;
use Google_Service_Gmail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class GmailUtility
{
    /**
     * Create a Google_Client using access_token and refresh_token from the database
     * @param object|array $account Email account record (must have access_token, refresh_token, email fields)
     * @return Google_Client
     * @throws InvalidArgumentException
     * @throws \Exception
     */
    public static function getGoogleClient($account): Google_Client
    {
        // Validate input
        if (!is_object($account) && !is_array($account)) {
            throw new InvalidArgumentException('Account must be an object or array');
        }

        $client = new Google_Client();
        $client->setApplicationName('Gmail Email Client');
        $client->setScopes([
            Google_Service_Gmail::GMAIL_MODIFY,
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ]);
        
        // Verify client secret file exists
        $clientSecretPath = storage_path('app/client_secret.json');
        if (!file_exists($clientSecretPath)) {
            throw new \Exception('Client secret file not found');
        }
        $client->setAuthConfig($clientSecretPath);
        
        $client->setAccessType('offline');
        $client->setPrompt('select_account consent');

        // Accept both array and object for token access
        if (is_array($account)) {
            $accessToken = $account['access_token'] ?? null;
            $refreshToken = $account['refresh_token'] ?? null;
            $email = $account['email'] ?? null;
        } elseif (is_object($account)) {
            $accessToken = $account->access_token ?? null;
            $refreshToken = $account->refresh_token ?? null;
            $email = $account->email ?? null;
        } else {
            throw new InvalidArgumentException('Account must be an object or array');
        }

        // Validate required fields
        if (!$accessToken || !$email) {
            throw new InvalidArgumentException('Missing required account fields');
        }

        // Compose token array for Google_Client
        $tokenArr = [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'created' => time() - 3600, // force check for expiration
            'expires_in' => 3600,
            'token_type' => 'Bearer',
        ];
        $client->setAccessToken($tokenArr);

        if ($client->isAccessTokenExpired()) {
            Log::info("Access token expired for {$email}, refreshing...");
            if (!$refreshToken) {
                Log::error("No refresh token available for {$email}");
                throw new \Exception("No refresh token available for {$email}");
            }

            $newAccessToken = $client->fetchAccessTokenWithRefreshToken($refreshToken);
            if (isset($newAccessToken['error'])) {
                Log::error("Failed to refresh token for {$email}: " . $newAccessToken['error']);
                throw new \Exception("Failed to refresh token: " . $newAccessToken['error']);
            }

            $newAccessToken['refresh_token'] = $refreshToken;
            $newAccessToken['created'] = time();
            $client->setAccessToken($newAccessToken);

            // Update DB with new access_token
            try {
                if (is_object($account) && method_exists($account, 'update')) {
                    $account->update(['access_token' => $newAccessToken['access_token']]);
                } elseif (is_array($account) && isset($account['id'])) {
                    \DB::connection('pluto')->table('email_accounts')->where('id', $account['id'])->update([
                        'access_token' => $newAccessToken['access_token'],
                    ]);
                }
            } catch (\Exception $e) {
                Log::error("Failed to update access token for {$email}: " . $e->getMessage());
            }
        }

        return $client;
    }

    /**
     * Extract the message body from a Gmail message
     * @param \Google\Service\Gmail\Message $message
     * @return string
     */
    public static function getMessageBody($message): string
    {
        $payload = $message->getPayload();
        if (!$payload) {
            return '';
        }

        $content = self::extractAllContent($payload);
        
        // Gmail-like: Only return HTML part if present, otherwise fallback to plain text
        if (!empty($content['html'])) {
            return $content['html'];
        }
        if (!empty($content['plain'])) {
            return nl2br(e($content['plain'])); // Convert plain text to HTML if no HTML part
        }
        return '';
    }

    /**
     * Extract all content from a message payload
     * @param \Google\Service\Gmail\MessagePart $payload
     * @return array
     */
    /**
     * Extract all content from a message payload
     * @param object $payload Google\Service\Gmail\MessagePart
     * @return array
     */
    public static function extractAllContent($payload): array
    {
        $content = [
            'plain' => '',
            'html' => '',
            'images' => [],
            'attachments' => []
        ];

        $parts = $payload->getParts();
        
        if (empty($parts)) {
            // Single part message
            $body = self::decodeBody($payload->getBody()->getData());
            $mimeType = $payload->getMimeType();
            
            if ($mimeType === 'text/plain') {
                $content['plain'] = $body;
            } elseif ($mimeType === 'text/html') {
                $content['html'] = $body;
            } else {
                $content['plain'] = $body;
            }
        } else {
            // Multipart message
            self::processParts($parts, $content);
        }

        return $content;
    }

    /**
     * Process message parts recursively
     * @param array $parts Array of \Google\Service\Gmail\MessagePart objects
     * @param array &$content
     * @return void
     */
    /**
     * Process message parts recursively
     * @param array $parts Array of Google\Service\Gmail\MessagePart objects
     * @param array &$content
     * @return void
     */
    public static function processParts(array $parts, array &$content): void
    {
        foreach ($parts as $part) {
            $mimeType = $part->getMimeType();
            $body = $part->getBody();
            
            if (!$body) {
                continue;
            }
            
            $data = self::decodeBody($body->getData());
            
            switch ($mimeType) {
                case 'text/plain':
                    if (empty($content['plain'])) {
                        $content['plain'] = $data;
                    }
                    break;
                    
                case 'text/html':
                    if (empty($content['html'])) {
                        $content['html'] = $data;
                    }
                    break;
                    
                case 'multipart/alternative':
                case 'multipart/mixed':
                case 'multipart/related':
                    // Recursively process nested parts
                    $nestedParts = $part->getParts();
                    if ($nestedParts) {
                        self::processParts($nestedParts, $content);
                    }
                    break;
                    
                default:
                    // Handle images and other attachments
                    if (strpos($mimeType, 'image/') === 0) {
                        $headers = $part->getHeaders();
                        $contentId = self::getHeaderValue($headers, 'Content-ID');
                        $contentDisposition = self::getHeaderValue($headers, 'Content-Disposition');
                        
                        if ($contentDisposition && strpos($contentDisposition, 'inline') !== false) {
                            // Embedded image
                            $content['images'][] = [
                                'name' => self::getHeaderValue($headers, 'Content-Name') ?: 'embedded_image',
                                'type' => $mimeType,
                                'content_id' => $contentId,
                                'data' => $data
                            ];
                        } else {
                            // Regular attachment
                            $content['attachments'][] = [
                                'name' => self::getHeaderValue($headers, 'Content-Name') ?: 'attachment',
                                'type' => $mimeType,
                                'size' => strlen($data)
                            ];
                        }
                    } else {
                        // Other attachment types
                        $headers = $part->getHeaders();
                        $content['attachments'][] = [
                            'name' => self::getHeaderValue($headers, 'Content-Name') ?: 'attachment',
                            'type' => $mimeType,
                            'size' => strlen($data)
                        ];
                    }
                    break;
            }
        }
    }

    /**
     * Get header value by name
     * @param array $headers
     * @param string $name
     * @return string|null
     */
    private static function getHeaderValue(array $headers, string $name): ?string
    {
        foreach ($headers as $header) {
            if ($header->getName() === $name) {
                return $header->getValue();
            }
        }
        return null;
    }

    /**
     * Decode base64 encoded body data
     * @param string|null $data
     * @return string
     */
    private static function decodeBody(?string $data): string
    {
        if (!$data) {
            return '';
        }
        
        // Handle URL-safe base64 encoding
        $data = str_replace(['-', '_'], ['+', '/'], $data);
        
        // Add padding if needed
        $padding = strlen($data) % 4;
        if ($padding) {
            $data .= str_repeat('=', 4 - $padding);
        }
        
        $decoded = base64_decode($data, true);
        
        if ($decoded === false) {
            Log::warning("Failed to decode base64 data");
            return $data;
        }
        
        return $decoded;
    }
}