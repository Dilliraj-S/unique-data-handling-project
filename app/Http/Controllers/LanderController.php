<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
/* Helpers */
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
/* Exceptions */
use Exception;
use Illuminate\Validation\ValidationException;
/* Classes */
use App\Http\Classes\{
    SupremeHelper,
    RandomHelper,
    ExceptionHelper
};
/* Models */
use App\Models\User;
use App\Models\Enquiry\{
    Legal
};
use App\Models\Gateway\Payment;
use App\Models\Helper\LicenceKey;
use App\Models\Organization\Organization;
use App\Models\Organization\OrgContact;
class LanderController extends Controller
{
    /*----------------------------------------------------------------------------------------
    Welcome Page
    ----------------------------------------------------------------------------------------*/
    public function welcome($page = null)
    {
        return view('welcome');
    }
    /*----------------------------------------------------------------------------------------
    Help Page
    ----------------------------------------------------------------------------------------*/
    public function dyn_doc_page()
    {
        try {
            $routeName = Route::currentRouteName();
            $routeArr = explode('.', $routeName);
            $docId = end($routeArr); // Extract doc_id from route name
            $documentationData = SupremeHelper::fetch('PDC', ['where' => ['product_id' => env('SUPREME_PRODUCT_ID')]]);
            if ($documentationData instanceof \Illuminate\Http\JsonResponse) {
                $docs = $documentationData->getData(true);
            } else {
                $docs = $documentationData;
            }
            // Find the specific document by doc_id
            $document = collect($docs['data'])->firstWhere('doc_id', $docId);
            if (!$document) {
                abort(404, "Documentation not found");
            }
            return view('landing.help.documentation', compact('document')); // Pass only required document
        } catch (Exception $e) {
            return ExceptionHelper::handle($e);
        }
    }
    public function help(Request $request)
    {
        return view('landing.help.home');
    }
    /*-----------------------------------------------------------------------------------------------
    Legal
    -----------------------------------------------------------------------------------------------*/
    public function dyn_legal_page()
    {
        try {
            $routeName = Route::currentRouteName();
            $routeArr = explode('.', $routeName);
            $legalData = SupremeHelper::fetch('PPG', [
                'join' => ['product_page_contents' => ['product_pages.page_id', '=', 'product_page_contents.page_id']],
                'where' => ['product_pages.page_id' => $routeArr[1]],
                'select' => [
                    'product_pages.title as page_title',
                    'product_pages.description as page_description',
                    'product_page_contents.heading',
                    'product_page_contents.tagline',
                    'product_page_contents.content',
                    'product_page_contents.updated_at',
                ]
            ]);
            $title = $legalData[0]->page_title ?? '';
            return view('landing.legal', compact('legalData', 'title'));
        } catch (Exception $e) {
            return ExceptionHelper::handle($e);
        }
    }
    /*-----------------------------------------------------------------------------------------------
    Organization
    -----------------------------------------------------------------------------------------------*/
    public function organization($org_name = null)
    {
        if (is_null($org_name) || strtolower($org_name) === 'organization') {
            abort(404, 'Page not found');
        }
        $org = str_replace('-', ' ', $org_name);
        $org_data = DB::table('organizations')
            ->where('name', 'like', '%' . $org . '%')
            ->first();
        if (!$org_data) {
            abort(404, 'Organization not found');
        }
        $view = 'landing.organization';
        if (view()->exists($view)) {
            return view($view, compact('org_data'));
        }
        abort(404, 'Page not found');
    }
    /*----------------------------------------------------------------------------------------
    Website Forms
    ----------------------------------------------------------------------------------------*/
    public function website_form(Request $request)
    {
        try {
            $formType = $request->input('form_type');
            if ($formType == 'contact') {
                $recaptchaResponse = $request->input('g-recaptcha-response');
                $recaptchaSecretKey = env('RECAPTCHA_SECRET_KEY');
                $response = Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => $recaptchaSecretKey,
                    'response' => $recaptchaResponse,
                ]);
                if (!$response->json('success')) {
                    return response()->json([
                        'status' => false,
                        'title' => 'Error!',
                        'message' => 'reCAPTCHA verification failed!',
                    ]);
                } else {
                    $validatedData = $request->validate([
                        'name' => 'required|string|max:100',
                        'email' => 'required|email',
                        'phone' => 'required|string|max:20',
                        'subject' => 'required|string',
                        'message' => 'required|string',
                    ]);
                    $detail_json = [
                        'subject' => $validatedData['subject'],
                        'message' => $validatedData['message'],
                    ];
                    $data = [
                        'enq_id' => 'PEQ' . RandomHelper::generateUniqueId(7),
                        'dkc_id' => env('SUPREME_COMPANY_ID'),
                        'dkp_id' => env('SUPREME_PRODUCT_ID'),
                        'type' => 'Contact',
                        'from' => env('APP_NAME'),
                        'name' => $validatedData['name'],
                        'phone' => $validatedData['phone'],
                        'email' => $validatedData['email'],
                        'details_json' => json_encode($detail_json),
                    ];
                    SupremeHelper::send('create', 'PEQ', $data);
                    $recipient = $validatedData['email'];
                    $values =  [
                        'recipient_name' => $validatedData['name'],
                        'sender_name' => $validatedData['name'],
                        'sender_email' => $validatedData['email'],
                        'sender_phone' => $validatedData['phone'],
                        'sender_message' => $validatedData['message']
                    ];
                    $options = [
                        'cc' => '',
                        'bcc' => '',
                        'mail_category' => env('SUPREME_PRODUCT_ID'),
                        'mail_type' => $formType,
                        'ref_id' => env('SUPREME_PRODUCT_ID'),
                    ];
                    $templateId = 'WE-CNV4QI1W';
                    $data = [
                        "we_id" => $templateId,
                        "to" => $recipient,
                        "values" => $values,
                        "options" => $options
                    ];
                    SupremeHelper::send('mail', 'MAL', $data);
                    return response()->json([
                        'status' => true,
                        'title' => 'Success!',
                        'message' => 'Your request has been submitted successfully. We will get back to you shortly!',
                    ]);
                }
            } else if ($formType == 'org_contact') {
                $validatedData = $request->validate([
                    'name' => 'required|string|max:100',
                    'email' => 'required|email',
                    'phone' => 'required|string|max:20',
                    'subject' => 'required|string',
                    'message' => 'required|string',
                ]);
                $detail_json = [
                    'name' => $validatedData['name'],
                    'email' => $validatedData['email'],
                    'phone' => $validatedData['phone'],
                    'subject' => $validatedData['subject'],
                    'message' => $validatedData['message'],
                ];
                $data = [
                    'contact_id' => 'ORC' . RandomHelper::generateUniqueId(7),
                    'org_id' => $request->input('org_id'),
                    'data_json' => json_encode($detail_json),
                ];
                OrgContact::create($data);
                $org_email = Organization::where('org_id', $request->input('org_id'))->firstOrFail()->value('email');
                $recipient = $org_email;
                $values =  [
                    'recipient_name' => $validatedData['name'],
                    'sender_name' => $validatedData['name'],
                    'sender_email' => $validatedData['email'],
                    'sender_phone' => $validatedData['phone'],
                    'sender_message' => $validatedData['message']
                ];
                $options = [
                    'cc' => '',
                    'bcc' => '',
                    'mail_category' => env('SUPREME_PRODUCT_ID'),
                    'mail_type' => $formType,
                    'ref_id' => env('SUPREME_PRODUCT_ID'),
                ];
                $templateId = 'WE-CNV4QI1W';
                $data = [
                    "we_id" => $templateId,
                    "to" => $recipient,
                    "values" => $values,
                    "options" => $options
                ];
                SupremeHelper::send('mail', 'MAL', $data);
                return response()->json([
                    'status' => true,
                    'title' => 'Success!',
                    'message' => 'Your request has been submitted successfully. We will get back to you shortly!',
                ]);
            } else if ($formType == 'get_license_key') {
                $validatedData = $request->validate([
                    'email' => 'required|email',
                    'password' => 'nullable|string',
                ]);
                $email = trim($validatedData['email']);
                $password = trim($validatedData['password']);
                $user = User::where('email', $email)->first();
                if (!$user) {
                    return response()->json(['status' => false, 'title' => 'Error!', 'message' => 'Email not found.']);
                }
                if ($user->role !== 'admin' && empty($password)) {
                    return response()->json([
                        'status' => false,
                        'title' => 'Error!',
                        'message' => 'You do not have credentials to get the license key without a password.'
                    ]);
                }
                if ($user->role === 'admin' && empty($password)) {
                    $orgId = $user->org_id;
                    $license = LicenceKey::where('org_id', $orgId)
                        ->where('status', 'active')
                        ->first();
                    if ($license) {
                        $recipient = $email;
                        $values = [
                            'name' => $user->first_name . '' . $user->last_name,
                            'license_key' => $license->lic_id,
                        ];
                        $options = [
                            'cc' => '',
                            'bcc' => '',
                            'mail_category' => env('SUPREME_PRODUCT_ID'),
                            'mail_type' => $formType,
                            'ref_id' => env('SUPREME_PRODUCT_ID'),
                        ];
                        $templateId = 'WE-29B8KZJW';
                        $data = [
                            "we_id" => $templateId,
                            "to" => $recipient,
                            "values" => $values,
                            "options" => $options
                        ];
                        $response = SupremeHelper::send('mail', 'MAL', $data);
                        return response()->json([
                            'status' => true,
                            'title' => 'Success!',
                            'message' => 'Your license key has been sent to your email.',
                        ]);
                    } else {
                        return response()->json([
                            'status' => false,
                            'title' => 'Error!',
                            'message' => 'No active license key found for your organization.'
                        ]);
                    }
                }
                if (!Hash::check($password, $user->password)) {
                    return response()->json([
                        'status' => false,
                        'title' => 'Error!',
                        'message' => 'Invalid password.'
                    ]);
                }
                $orgId = $user->org_id;
                $license = LicenceKey::where('org_id', $orgId)
                    ->where('status', 'active')
                    ->first();
                if ($license) {
                    $recipient = $email;
                    $values = [
                        'name' => $user->first_name . '' . $user->last_name,
                        'license_key' => $license->lic_id,
                    ];
                    $options = [
                        'cc' => '',
                        'bcc' => '',
                        'mail_category' => env('SUPREME_PRODUCT_ID'),
                        'mail_type' => $formType,
                        'ref_id' => env('SUPREME_PRODUCT_ID'),
                    ];
                    $templateId = 'WE-29B8KZJW';
                    $data = [
                        "we_id" => $templateId,
                        "to" => $recipient,
                        "values" => $values,
                        "options" => $options
                    ];
                    $response = SupremeHelper::send('mail', 'MAL', $data);
                    return response()->json([
                        'status' => true,
                        'title' => 'Success!',
                        'key' => $license->lic_id,
                        'message' => 'Your License Key <br>
                                      <label id="license-key" style="font-size: 18px; font-weight: bold; color: #28a745; border: 1.5px solid #00b4af; border-radius: 5px; padding: 5px 12px; margin: 7px 0px !important;">' . $license->lic_id . '</label>
                                      <br><div style="color: #6c757d;">Keep it safe and do not share it with others!</div>',
                    ]);
                } else {
                    return response()->json([
                        'status' => false,
                        'title' => 'Error!',
                        'message' => 'No active license key found for your organization.'
                    ]);
                }
            } else if ($formType == 'unsubscribe') {
                $validatedData = $request->validate([
                    'value' => 'nullable|string|max:255', // Used for WhatsApp or email individually
                    'whatsapp' => 'nullable|string|max:255', // Used when both fields are present
                    'email' => 'nullable|string|max:255',
                    'type' => 'required|string|in:whatsapp,email,both'
                ]);
                $unsubId = 'UNS' . RandomHelper::generateUniqueId(7);
                if ($validatedData['type'] === 'both') {
                    $finalValue = $validatedData['whatsapp'] . '|' . $validatedData['email'];
                } else {
                    $finalValue = $validatedData['value']; // For single type unsubscribe
                }
                $data = [
                    'unsub_id' => $unsubId,
                    'dkc_id' => env('SUPREME_COMPANY_ID'),
                    'dkp_id' => env('SUPREME_PRODUCT_ID'),
                    'type' => $validatedData['type'],
                    'value' => $finalValue
                ];
                SupremeHelper::send('create', 'UNS', $data);
                return response()->json([
                    'status' => true,
                    'title' => 'Success!',
                    'message' => 'You have been unsubscribed successfully. If you have any further concerns, please contact support.',
                ]);
            } else {
                return response()->json(['status' => false, 'message' => 'Invalid form type.'], 400);
            }
        } catch (ValidationException $e) {
            return response()->json(['status' => false, 'message' => $e->errors()], 422);
        } catch (Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
    public function get_license_key(Request $request)
    {
        return view('landing.get-license-key');
    }
    public function unsubscribe(Request $request)
    {
        return view('landing.unsubscribe');
    }

    /*-----------------------------------------------------------------------------------------------
    Organization News Feed
    -----------------------------------------------------------------------------------------------*/
    public function news_feed($org_name = null, $feed_id = null)
    {
        // Ensure org_name is provided and is not 'organization'
        if (!$org_name || strtolower($org_name) === 'organization') {
            abort(404, 'Page not found');
        }
        // Ensure feed_id is provided
        if (!$feed_id) {
            abort(404, 'Feed not found');
        }
        // Fetch the news feed
        $data = collect(DB::select("
        SELECT * FROM `news_feeds`
        WHERE `feed_id` = ? 
        AND `status` = 'Approved'
        AND `deleted_at` IS NULL
        ORDER BY `created_at` DESC
    ", [$feed_id]));
        // Check if data is empty
        if ($data->isEmpty()) {
            abort(404, 'Feed not found');
        }
        // Define the view
        $view = 'landing.news-feed';
        if (view()->exists($view)) {
            return view($view, compact('data'));
        }
        abort(404, 'Page not found');
    }
}
