<?php
namespace App\Http\Controllers;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Exception;
use App\Models\Enquiry\{
    EnquiryForm,
    Client,
};
use App\Http\Classes\{
    SupremeHelper,
    Helper,
    RandomHelper,
    SwitchingHelper,
};
use App\Models\Organization\Organization;
use App\Models\User;
use App\Models\Helper\OTP;
class ModalSaveController extends Controller
{
    public function save_modal(Request $request)
    {
        try {
            $saveType = $request->input('save_type');
            $saveFor = $request->input('save_for');
            $form_value = $request->input('form_value');
            $client_id = $request->input('client_id');
            if ($saveType === 'plan_confirmation') {
                $clientId = request()->cookie('client_id');
                $response = [
                    'target' => 'new_client|' . $saveFor
                ];
                if (!empty($clientId)) {
                    $response['target'] .= '|' . $clientId;
                }
                $response['modal'] = 'show';
                return response()->json($response);
            } else if ($saveType === 'new_client') {
                $validatedData = $request->validate([
                    'first_name' => 'required|string|max:100',
                    'last_name' => 'required|string|max:100',
                    'phone' => 'required|string|max:20',
                    'email' => 'required|email',
                    'password' => 'required|string|confirmed',
                    'current_stage' => 'nullable',
                    'plan' => 'nullable',
                ]);
                $existingClient = Client::where('email', $validatedData['email'])->first();
                $existingUser = User::where('email', $validatedData['email'])->first();
                if ($existingClient) {
                    if ($existingUser) {
                        Cookie::queue(Cookie::forget('client_id'));
                        Cookie::queue(Cookie::forget('current_stage'));
                        Cookie::queue(Cookie::forget('plan'));
                        return response()->json(['info' => true, 'status' => true, 'title' => 'OOPS!', 'message' => 'This email is already registered. Please log in.', 'redirect_url' => url('/login')]);
                    }
                    // Otherwise, update the existing client
                    $data = array_merge(['id' => $existingClient->client_id], $validatedData);
                    SupremeHelper::send('update', 'GCL', $data);
                    $existingClient->update($validatedData);
                    $clientId = $existingClient->client_id;
                } else {
                    // Create a new client
                    $clientId = 'CLI' . RandomHelper::generateUniqueId(7);
                    $validatedData['client_id'] = $clientId;
                    $validatedData['license_key'] = 'LIC' . RandomHelper::generateUniqueId(10);
                    SupremeHelper::send('create', 'GCL', $validatedData);
                    Client::create($validatedData);
                }
                Cookie::queue('client_id', $clientId, 60 * 24 * 7);
                Cookie::queue('current_stage', $validatedData['current_stage'] ?? '', 60 * 24 * 7);
                Cookie::queue('plan', $validatedData['plan'] ?? '', 60 * 24 * 7);
                return response()->json([
                    'target' => 'company_info|' . $saveFor . '|' . $clientId,
                    'modal' => 'show'
                ]);
            } else if ($saveType === 'company_info') {

                $existingOrg = Organization::where('name', $request->name)->exists();
                if ($existingOrg) {
                    return response()->json([
                        'info' => true,
                        'status' => false,
                        'title' => 'Error!',
                        'message' => 'Organization name already exists. Please use a different name.',
                    ]);
                }

                
                $validatedData = $request->validate([
                    'name' => 'required|string|max:100',
                    'org_type' => 'nullable|string',
                    'org_size' => 'nullable|string',
                    'phone' => 'nullable|string|max:20',
                    'email' => 'nullable|email',
                    'gstin' => 'nullable|string',
                    'no_of_devices' => 'nullable|string',
                    'address' => 'nullable|string',
                    'landmark' => 'nullable|string',
                    'city' => 'nullable|string',
                    'state' => 'nullable|string',
                    'pin_code' => 'nullable|string',
                ]);
                $validatedOutputData['org_info_json'] = json_encode(array_intersect_key($validatedData, array_flip([
                    'name',
                    'phone',
                    'email',
                    'org_type',
                    'org_size',
                    'gstin'
                ])));
                $validatedOutputData['address_json'] = json_encode(array_intersect_key($validatedData, array_flip([
                    'address',
                    'landmark',
                    'city',
                    'state',
                    'pin_code'
                ])));
                $data = array_merge(['id' => $client_id], $validatedOutputData);
                SupremeHelper::send('update', 'GCL', $data);
                $validatedOutputData['current_stage'] = $saveType;
                $validatedOutputData['no_of_devices'] = $validatedData['no_of_devices'] ?? 1;
                Client::where('client_id', $client_id)->update($validatedOutputData);
                Cookie::queue(Cookie::make('current_stage', $saveType ?? '', 60 * 24 * 7));
                return response()->json([
                    'target' => 'device_info_process|' . $saveFor . '|' . $client_id,
                    'modal' => 'show'
                ]);
            } else if ($saveType === 'device_info_process') {
                $validatedData = $request->validate([
                    'ip' => 'required|array',
                    'ip.*' => 'required|string|ip|distinct',
                    'port' => 'required|array',
                    'port.*' => 'required|string',
                ], [
                    'ip.*.distinct' => 'Each device must have a unique IP address.',
                ]);
                $devices = [];
                foreach ($validatedData['ip'] as $index => $ipAddress) {
                    $deviceNumber = $index + 1;
                    $devices["Device $deviceNumber"] = [
                        'ip' => $ipAddress,
                        'port' => $validatedData['port'][$index] ?? '',
                    ];
                }
                $validatedOutputData['device_info_json'] = json_encode($devices, JSON_PRETTY_PRINT);
                $validatedOutputData['current_stage'] = $saveType;
                $data = array_merge(['id' => $client_id], $validatedOutputData);
                SupremeHelper::send('update', 'GCL', $data);
                Client::where('client_id', $client_id)->update($validatedOutputData);
                Cookie::queue(Cookie::make('current_stage', $saveType ?? '', 60 * 24 * 7));
                return response()->json([
                    'target' => 'software_installation|' . $saveFor . '|' . $client_id,
                    'modal' => 'show'
                ]);
            } else if ($saveType === 'software_installation') {
                $validatedOutputData['current_stage'] = $saveType;
                $data = array_merge(['id' => $client_id], $validatedOutputData);
                SupremeHelper::send('update', 'GCL', $data);
                Client::where('client_id', $client_id)->update($validatedOutputData);
                Cookie::queue(Cookie::make('current_stage', $saveType ?? '', 60 * 24 * 7));
                return response()->json([
                    'target' => 'device_compatibility_check|' . $saveFor . '|' . $client_id,
                    'modal' => 'show'
                ]);
            } else if ($saveType === 'device_compatibility_check') {
                $validatedOutputData['current_stage'] = $saveType;
                $data = array_merge(['id' => $client_id], $validatedOutputData);
                SupremeHelper::send('update', 'GCL', $data);
                Client::where('client_id', $client_id)->update($validatedOutputData);
                Cookie::queue(Cookie::make('current_stage', $saveType ?? '', 60 * 24 * 7));
                return response()->json([
                    'target' => 'payment_process|' . $saveFor . '|' . $client_id,
                    'modal' => 'show'
                ]);
            } else if ($saveType === 'payment_process') {
                $validatedOutputData['current_stage'] = $saveType;
                Client::where('client_id', $client_id)->update($validatedOutputData);
                Cookie::queue(Cookie::make('current_stage', $saveType ?? '', 60 * 24 * 7));
                $rawData = Client::where('client_id', $client_id)->first();
                // Ensure rawData exists
                if (!$rawData) {
                    return response()->json(['error' => 'Client not found'], 404);
                }
                // Convert raw data to an array
                $rawDataArray = $rawData->toArray();
                // Convert JSON columns if needed (replace 'json_column_name' with actual column names)
                foreach ($rawDataArray as $key => $value) {
                    if (Helper::isJson($value)) {
                        $rawDataArray[$key] = json_decode($value, true);
                    }
                }
                $token = RandomHelper::generateUniqId(60);
                $expired_at = now()->addMinutes(30)->toDateTimeString();
                $orgData = json_decode($rawData->org_info_json, true);
                $addressData = json_decode($rawData->address_json, true);
                // Prepare final response array
                $data = [
                    'pay_init_id'  => 'PYI' . RandomHelper::generateUniqueId(7),
                    'product_id'   => env('SUPREME_PRODUCT_ID'),
                    'company_id'   => env('SUPREME_COMPANY_ID'),
                    'company_name'   => $orgData['name'] ?? '',
                    'gst_no'   => $orgData['gstin'] ?? '',
                    'phone'   => $rawData->phone ?? '',
                    'email'       => $rawData->email ?? '',
                    'address'       => $addressData['address'] ?? '',
                    'display'   => $rawData->first_name . ' ' . $rawData->last_name ?? '',
                    'plan_id'      => $rawData->plan ?? '',
                    'raw_id'       => $rawData->client_id ?? '',
                    'raw_data'     => json_encode($rawDataArray),
                    'return_to'    => 'away',
                    'return_url' => env('APP_URL'),
                    'token' => $token,
                    'expires_at' => $expired_at,
                    'status' => 'initiated',
                ];
                // Send data using SupremeHelper
                $result = SupremeHelper::send('create', 'PYI', $data);
                $switchingData = [
                    'switch' => 'away',
                    'route_name' => 'payment.initiating',
                    'token' => $token,
                    'expires_at' => $expired_at,
                    'return_type' => 'link'
                ];
                $redirect_link = SwitchingHelper::encodeAndSend($switchingData);
                // Check if request was successful
                if ($result['status']) {
                    Cookie::queue(Cookie::forget('client_id'));
                    Cookie::queue(Cookie::forget('current_stage'));
                    Cookie::queue(Cookie::forget('plan'));
                    return response()->json([
                        'target' => 'payment_redirection|' . $saveFor . '|' . $client_id,
                        'modal' => 'show',
                        'redirect_url' => $redirect_link,
                    ]);
                } else {
                    return response()->json([
                        'target' => 'payment_redirection|' . $saveFor . '|' . $client_id,
                        'modal' => 'show',
                    ]);
                }
            } else if ($saveType === 'request_a_quote' || $saveType === 'software_download') {
                $validatedData = $request->validate([
                    'name' => 'required|string|max:100',
                    'phone' => 'required|string|max:20',
                    'email' => 'required|email',
                    'company' => 'required|string',
                    'employee_count' => 'required|string',
                    'plan' => 'required|string',
                    'message' => 'required|string',
                ]);
                $detail_json = [
                    'company' => $validatedData['company'],
                    'email' => $validatedData['email'],
                    'employee_count' => $validatedData['employee_count'],
                    'plan' => $validatedData['plan'],
                    'message' => $validatedData['message'],
                ];
                $data = [
                    'enq_id' => 'PEQ' . RandomHelper::generateUniqueId(7),
                    'dkc_id' => env('SUPREME_COMPANY_ID'),
                    'dkp_id' => env('SUPREME_PRODUCT_ID'),
                    'type' => ($saveType == 'request_a_quote') ? 'Quote' : 'Download',
                    'from' => env('APP_NAME'),
                    'name' => $validatedData['name'],
                    'phone' => $validatedData['phone'],
                    'email' => $validatedData['email'],
                    'details_json' => json_encode($detail_json),
                ];
                $response = SupremeHelper::send('create', 'PEQ', $data);
                if ($response['status']) {
                    $isQuote = ($saveType == 'request_a_quote');
                    $responseData = [
                        'info' => true,
                        'modal' => 'hide',
                        'status' => true,
                        'title' => 'Success!',
                        'message' => $isQuote
                            ? 'Your request has been submitted successfully. We will reach out to you shortly!'
                            : 'Thank you for downloading our software!',
                    ];
                    $recipient = $validatedData['email'];
                    $values = $isQuote ? [
                        'name' => $validatedData['name'],
                        'company' => $validatedData['company'],
                    ] : [
                        'sender_name' => $validatedData['name'],
                        'sender_email' => $validatedData['email'],
                        'sender_phone' => $validatedData['phone'],
                    ];
                    $options = [
                        'cc' => '',
                        'bcc' => '',
                        'mail_category' => env('SUPREME_PRODUCT_ID'),
                        'mail_type' => $saveType,
                        'ref_id' => env('SUPREME_PRODUCT_ID'),
                    ];
                    $templateId = $isQuote ? 'WE-3JRKYCDI' : 'WE-XS14V7QX';
                    $data = [
                        "we_id" => $templateId,
                        "to" => $recipient,
                        "values" => $values,
                        "options" => $options
                    ];
                    $response = SupremeHelper::send('mail', 'MAL', $data);
                    if (!$isQuote) {
                        $responseData['download'] = asset('software/got-it-installer.exe');
                    }
                    return response()->json($responseData);
                }
            } else if ($saveType === 'reseller_program') {
                $validatedData = $request->validate([
                    'name' => 'required|string|max:100',
                    'phone' => 'required|string|max:20',
                    'email' => 'required|email',
                    'company' => 'nullable|string',
                    'website' => 'nullable|string',
                    'business_experience' => 'required|string',
                    'reseller_interest' => 'required|string',
                    'message' => 'nullable|string',
                ]);
                $detail_json = [
                    'company' => $validatedData['company'],
                    'website' => $validatedData['website'],
                    'business_experience' => $validatedData['business_experience'],
                    'reseller_interest' => $validatedData['reseller_interest'],
                    'message' => $validatedData['message'],
                ];
                $data = [
                    'enq_id' => 'PEQ' . RandomHelper::generateUniqueId(7),
                    'dkc_id' => env('SUPREME_COMPANY_ID'),
                    'dkp_id' => env('SUPREME_PRODUCT_ID'),
                    'type' => 'Reseller',
                    'from' => env('APP_NAME'),
                    'name' => $validatedData['name'],
                    'phone' => $validatedData['phone'],
                    'email' => $validatedData['email'],
                    'details_json' => json_encode($detail_json),
                ];
                $response = SupremeHelper::send('create', 'PEQ', $data);
                if ($response['status']) {
                    $responseData = [
                        'info' => true,
                        'modal' => 'hide',
                        'status' => true,
                        'title' => 'Success!',
                        'message' => 'Your request has been submitted successfully. We will reach out to you shortly!',
                    ];
                    $recipient = $validatedData['email'];
                    $values = [
                        'name' => $validatedData['name']
                    ];
                    $options = [
                        'cc' => '',
                        'bcc' => '',
                        'mail_category' => env('SUPREME_PRODUCT_ID'),
                        'mail_type' => $saveType,
                        'ref_id' => env('SUPREME_PRODUCT_ID'),
                    ];
                    $templateId = 'WE-W4OWHTQ6';
                    $data = [
                        "we_id" => $templateId,
                        "to" => $recipient,
                        "values" => $values,
                        "options" => $options
                    ];
                    $response = SupremeHelper::send('mail', 'MAL', $data);
                    return response()->json($responseData);
                }
            } else if ($saveType === 'forgot_password' || $saveType === 'resend_otp') {
                $validatedData = $request->validate([
                    'email' => 'required|email',
                ]);
                $existingClient = User::where('email', $validatedData['email'])->first();
                if (!$existingClient) {
                    return response()->json([
                        'info' => true,
                        'status'  => false,
                        'title'   => 'Error!',
                        'message' => 'Email not found in our records.'
                    ]);
                }
                if ($saveType === 'resend_otp') {
                    $existingClient = User::where('gotit_id', $saveFor)->first();
                }
                $otp = RandomHelper::generateUniqueNumber(6);
                $token = bin2hex(random_bytes(32));
                $expiresAt = now()->addMinutes(15);
                OTP::create([
                    'gotit_id' => $existingClient->gotit_id,
                    'org_id' => $existingClient->org_id,
                    'otp' => $otp,
                    'sent_for' => 'password_reset',
                    'token' => $token,
                    'expires_at' => $expiresAt,
                    'used' => 0,
                ]);
                $recipient = $validatedData['email'];
                $values = [
                    'otp' => $otp,
                    'name' => $existingClient->first_name . '' . $existingClient->last_name,
                    'username' => $existingClient->email,
                ];
                $options = [
                    'cc' => '',
                    'bcc' => '',
                    'mail_category' => env('SUPREME_PRODUCT_ID'),
                    'mail_type' => $saveType,
                    'ref_id' => env('SUPREME_PRODUCT_ID'),
                ];
                $templateId = 'WE-AFBHBY8W';
                $data = [
                    "we_id" => $templateId,
                    "to" => $recipient,
                    "values" => $values,
                    "options" => $options
                ];
                $response = SupremeHelper::send('mail', 'MAL', $data);
                return response()->json([
                    'target' => 'verify_otp|' . $existingClient->gotit_id,
                    'modal' => 'show'
                ]);
            } else if ($saveType === 'verify_otp') {
                $request->merge(['otp' => implode('', $request->input('otp', []))]);
                $validatedData = $request->validate([
                    'gotit_id' => 'required|string',
                    'otp' => 'required|string|min:6|max:6', // Ensure OTP is exactly 6 digits
                ]);
                $otpRecord = OTP::where('gotit_id', $validatedData['gotit_id'])
                    ->where('otp', $validatedData['otp'])
                    ->where('sent_for', 'password_reset')
                    ->where('used', 0)
                    ->where('expires_at', '>', now())
                    ->first();
                if (!$otpRecord) {
                    return response()->json([
                        'info' => true,
                        'status' => false,
                        'title' => 'Error!',
                        'message' => 'Invalid or expired OTP. Please try again.'
                    ]);
                }
                // Mark OTP as used
                $otpRecord->update(['used' => 1]);
                return response()->json([
                    'target' => 'reset_password|' . $validatedData['gotit_id'],
                    'modal' => 'show'
                ]);
            } else if ($saveType === 'reset_password') {
                $validatedData = $request->validate([
                    'gotit_id' => 'required',
                    'password' => 'required|string|min:6|confirmed',
                ]);
                $user = User::where('gotit_id', $validatedData['gotit_id'])->first();
                if (!$user) {
                    return response()->json([
                        'info' => true,
                        'status'  => false,
                        'title'   => 'Error!',
                        'message' => 'User Not Found.'
                    ]);
                }
                $user->password = bcrypt($validatedData['password']);
                $user->save();
                return response()->json([
                    'target' => 'password_reset_success|' . $validatedData['gotit_id'],
                    'modal' => 'show'
                ]);
            } else {
                return response()->json(['info' => true, 'status' => false, 'title' => 'Error!', 'message' => 'Invalid save type.']);
            }
        } catch (Exception $e) {
            return response()->json(['info' => true, 'status' => false, 'title' => 'Oops!', 'message' => $e->getMessage()]);
        }
    }
}
