<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use Exception;
use Kreait\Firebase\Messaging\CloudMessage;

/**
 * Job to process notifications asynchronously via WhatsApp, Email, and FCM.
 */
class NotifierJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $data;

    /**
     * Create a new job instance.
     *
     * @param array $data Notification data
     */
    public function __construct(array $data)
    {
        $this->data = $data;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $results = $this->execute($this->data);
        Log::info('Notification Job Results', $results);
    }

    /**
     * Handle a job failure.
     *
     * @param \Exception $exception
     * @return void
     */
    public function failed(\Exception $exception)
    {
        Log::error('Notification Job Failed', [
            'data' => $this->data,
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Execute notification logic for all channels.
     *
     * @param array $data Notification data
     * @return array Results for each channel
     */
    private function execute(array $data): array
    {
        $results = [];
        foreach ($data['via'] as $channel) {
            switch ($channel) {
                case 'whatsapp':
                    if (isset($data['to']['whatsapp'])) {
                        $results['whatsapp'] = $this->sendWhatsapp($data);
                    }
                    break;
                case 'email':
                    if (isset($data['to']['email'])) {
                        $results['email'] = $this->sendEmail($data);
                    }
                    break;
                case 'fcm':
                    if (isset($data['to']['fcm'])) {
                        $results['fcm'] = $this->sendFCM($data);
                    }
                    break;
            }
        }
        return $results;
    }

    /**
     * Send WhatsApp notification.
     *
     * @param array $data Notification data
     * @return string Result message
     */
    private function sendWhatsapp(array $data): string
    {
        try {
            $msg = $this->replaceValues(
                $data['template']['content']['placeholder'] ?? $data['template']['content']['text'] ?? 'No content',
                $data['values']
            );
            $apiKey = env('WAPI_AUTH_TOKEN');
            if (!$apiKey) {
                throw new Exception('WhatsApp API key missing.');
            }

            $phones = array_map('trim', explode(',', $data['to']['whatsapp']));
            $apiUrl = "http://wapi.miyamediaz.com/whatsapp/api/send";
            $responses = [];

            foreach ($phones as $phone) {
                $params = [
                    'apikey' => $apiKey,
                    'mobile' => $phone,
                    'msg' => $msg,
                ];

                foreach ($data['attachments'] as $type => $attachment) {
                    if ($type === 'image' && isset($attachment['url'])) {
                        $params['img1'] = $attachment['url'];
                    } elseif ($type === 'pdf' && isset($attachment['file_data'])) {
                        $params['pdf'] = $attachment['file_data'];
                    }
                }

                $response = Http::get($apiUrl, $params);
                $responses[$phone] = $response->successful() ? 'sent' : 'failed: ' . $response->body();
            }

            return implode(', ', array_map(fn($k, $v) => "$k: $v", array_keys($responses), $responses));
        } catch (Exception $e) {
            return 'WhatsApp failed: ' . $e->getMessage();
        }
    }

    /**
     * Send Email notification.
     *
     * @param array $data Notification data
     * @return string Result message
     */
    private function sendEmail(array $data): string
    {
        try {
            $html = $this->replaceValues(
                $data['template']['content']['html'] ?? 'No content',
                $data['values']
            );
            $css = $data['template']['content']['css'] ?? '';
            $subject = $data['template']['subject'];
            $mailer = $data['template']['mailer'];
            $filename = str_replace(' ', '-', ucfirst($data['template']['id']));

            $emailHtml = "
                <!DOCTYPE html>
                <html lang=\"en\">
                <head>
                    <meta charset=\"UTF-8\">
                    <style>$css</style>
                </head>
                <body>$html</body>
                </html>";

            Mail::mailer($mailer)->send([], [], function ($message) use ($data, $subject, $emailHtml, $filename) {
                $emails = array_map('trim', explode(',', $data['to']['email']));
                $message->to($emails)->subject($subject)->html($emailHtml);

                foreach ($data['attachments'] as $type => $attachment) {
                    $mime = match ($type) {
                        'image' => 'image/' . ($attachment['extension'] ?? 'png'),
                        'pdf' => 'application/pdf',
                        default => null,
                    };
                    if ($mime && isset($attachment['file_data'])) {
                        $message->attachData(base64_decode($attachment['file_data']), "{$attachment['file_name']}.{$attachment['extension']}", ['mime' => $mime]);
                    }
                }
            });

            return 'sent';
        } catch (Exception $e) {
            return 'Email failed: ' . $e->getMessage();
        }
    }

    /**
     * Send FCM notification.
     *
     * @param array $data Notification data
     * @return string Result message
     */
    private function sendFCM(array $data): string
    {
        try {
            $title = $data['template']['subject'];
            $body = $this->replaceValues(
                $data['template']['content']['placeholder'] ?? $data['template']['content']['text'] ?? 'No content',
                $data['values']
            );
            $additionalData = [];

            foreach ($data['attachments'] as $type => $attachment) {
                if ($type === 'image' && isset($attachment['url'])) {
                    $additionalData['image'] = $attachment['url'];
                }
            }

            $recipients = array_map('trim', explode(',', $data['to']['fcm']));
            $messaging = app('firebase.messaging');
            $responses = [];

            foreach ($recipients as $recipient) {
                $deviceToken = null;
                if (is_numeric($recipient)) {
                    $user = User::find($recipient);
                    if ($user && $user->device_token && $user->fcm_enabled) {
                        $deviceToken = $user->device_token;
                    }
                } else {
                    $deviceToken = $recipient; // Direct token
                }

                if ($deviceToken) {
                    $message = CloudMessage::withTarget('token', $deviceToken)
                        ->withNotification([
                            'title' => $title,
                            'body' => $body,
                        ])
                        ->withData($additionalData);

                    try {
                        $messaging->send($message);
                        $responses[$recipient] = 'sent';
                        $this->storeInDatabase($recipient, $title, $body, $additionalData);
                    } catch (Exception $e) {
                        $responses[$recipient] = 'failed: ' . $e->getMessage();
                    }
                } else {
                    $responses[$recipient] = 'skipped: no valid token';
                }
            }

            return implode(', ', array_map(fn($k, $v) => "$k: $v", array_keys($responses), $responses));
        } catch (Exception $e) {
            return 'FCM failed: ' . $e->getMessage();
        }
    }

    /**
     * Store notification in database for offline users.
     *
     * @param string $recipient User ID or token
     * @param string $title Notification title
     * @param string $body Notification body
     * @param array $data Additional data
     * @return void
     */
    private function storeInDatabase(string $recipient, string $title, string $body, array $data)
    {
        if (is_numeric($recipient)) {
            $user = User::find($recipient);
            if ($user) {
                $user->notifications()->create([
                    'id' => \Illuminate\Support\Str::uuid(),
                    'type' => 'App\Notifications\PushNotification',
                    'data' => json_encode(['title' => $title, 'body' => $body, 'data' => $data]),
                ]);
            }
        }
    }

    /**
     * Replace placeholders in content with values.
     *
     * @param string $content Template content
     * @param array $values Key-value pairs
     * @return string Processed content
     */
    private function replaceValues(string $content, array $values): string
    {
        foreach ($values as $key => $value) {
            $content = str_replace("{{{$key}}}", $value, $content);
        }
        return $content;
    }
}