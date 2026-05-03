<?php
namespace App\Http\Classes;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Exception;
use App\Http\Classes\DataHelper;
use App\Models\Notify\WEContent;
class WEHelper
{
    public static function sendEmail($to, $we_id, $values = [], $attachments = [])
    {

        try {
            $values = is_array($values) ? json_encode($values) : $values;
            $emailContent = WEContent::where('we_id', $we_id)->firstOrFail();
            $subject = $emailContent->subject;
            $mailer = $emailContent->mailer;
            $filename = str_replace(' ', '-', ucfirst($emailContent->service_type));
            $we_content = json_decode($emailContent->we_content, true);
            $html = $we_content['html'] ?? '';
            $css = $we_content['css'] ?? '';
            $js = $we_content['js'] ?? '';
            $placeholder = $we_content['placeholder'] ?? '';
            $tempValues = json_encode(["place_email_content_here" => $placeholder]);
            $finalHtml = DataHelper::replaceValues($html, $tempValues);
            $base = "
            <!DOCTYPE html> 
            <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <meta name=\"description\" content=\"Elevate your buildings vertical transportation with G-Star Elevators Private Limited. We offer expert services including installation, repair, maintenance, modernization, and more. Contact us today for top-notch solutions!\">
                <meta name=\"keywords\" content=\"elevator services, elevator installation, elevator repair, elevator maintenance, elevator modernization, elevator AMC, vertical transportation, building elevators, elevator experts, accessibility solutions\">
                <meta name=\"robots\" content=\"index, follow\">
                <meta name=\"author\" content=\"G-Star Elevators Private Limited\">
                <meta name=\"geo.placename\" content=\"Hyderabad, Bengaluru, Chennai, Mumbai, Delhi\">
                <meta name=\"geo.position\" content=\"20.593684, 78.96288\">
                <meta name=\"robots\" content=\"index, follow\">
                <link rel=\"icon\" href=\"https://gstarelevators.com/treasury/favicon/favicon.png\">
                <!-- Canonical Tag -->
                <link rel=\"canonical\" href=\"https://www.gstarelevators.com/\">
                <style>
                    $css
                </style>
            </head>
            <body>
                $finalHtml
                <script>
                    $js
                </script>
            </body>
            </html>";
            $mailContent = DataHelper::replaceValues($base, $values);
            Mail::mailer($mailer)->send([], [], function ($message) use ($to, $subject, $mailContent, $filename, $attachments) {
                $toAddresses = array_map('trim', explode(',', $to));
                foreach ($toAddresses as $address) {
                    $message->to($address);
                }
                $message->subject($subject)->html($mailContent);

                foreach ($attachments as $type => $attachment) {
                    $mimeType = match ($type) {
                        'image' => 'image/jpeg',
                        'audio' => 'audio/mpeg',
                        'video' => 'video/mp4',
                        'pdf', 'pdf_content' => 'application/pdf',
                        default => null,
                    };
                    if ($mimeType) {
                        $message->attachData($attachment, $filename . '.' . ($type === 'image' ? 'jpg' : $type), ['mime' => $mimeType]);

                    } else {
                    }
                }
            });

            return 'sent';
        } catch (Exception $e) {
            return 'Email sending failed: ' . $e->getMessage();
        }
    }
    public static function sendWhatsapp($to, $we_id, $values = [], $attachments = [])
    {
        try {
            if (is_array($values)) {
                $values = json_encode($values);
            }
            $messageContent = WEContent::where('we_id', $we_id)->firstOrFail();
            $msg = DataHelper::replaceValues($messageContent->content, $values);
            $apiKey = env('WAPI_AUTH_TOKEN');
            if (!$apiKey) {
                throw new Exception('API key not found in environment variables.');
            }
            $apiUrl = "http://wapi.miyamediaz.com/whatsapp/api/send";
            $requestParams = [
                'apikey' => $apiKey,
                'mobile' => $to,
                'msg' => $msg,
            ];
            if (!empty($attachments)) {
                foreach ($attachments as $type => $attachment) {
                    switch ($type) {
                        case 'image':
                            $requestParams['img1'] = $attachment;
                            break;
                        case 'pdf':
                            $requestParams['pdf'] = $attachment;
                            break;
                        default:
                            throw new Exception('Unsupported attachment type: ' . $type);
                    }
                }
            }
            $response = Http::get($apiUrl, $requestParams);
            if ($response->successful()) {
                return 'sent';
            } else {
                throw new Exception('Failed to send WhatsApp message. Response: ' . $response->body());
            }
        } catch (Exception $e) {
            return 'Error: ' . $e->getMessage();
        }
    }
}
