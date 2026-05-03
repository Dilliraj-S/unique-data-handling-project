<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;
use App\Models\Enquiry\{
    EnquiryForm,
    Client
};
use App\Models\Helper\OTP;
use App\Models\User;
use App\Http\Classes\SelectHelper;
use App\Models\Organization\Organization;

class ModalController extends Controller
{
    public function show_modal(Request $request)
    {
        try {
            $raw = $request->input('data_type');
            $rawArr = explode('|', $raw);
            $clientId = null;
            $type = $rawArr[0] ?? '';
            $saveFor = $rawArr[1] ?? '';
            $data = '';
            if (count($rawArr) > 2) {
                $clientId = $rawArr[2];
                $data = Client::where('client_id', $clientId)->firstOrFail();
            }
            $size = "modal-lg";
            $modal = "hide";
            $heading = $type . "Step Progress";
            $tagline = "Follow the steps to complete onboarding.";
            $content = "<input type='hidden' name='save_type' value='{$type}'>
                        <input type='hidden' name='save_for' value='{$rawArr[1]}'>
                        <input type='hidden' name='client_id' value='{$clientId}'>";
            switch ($type) {
                case 'plan_confirmation':
                    $modal = "show";
                    $heading = "Confirm Your Plan";
                    $tagline = "Review your selected plan.";
                    $content .= $this->getPlanConfirmation($rawArr[1], $data);
                    break;
                case 'new_client':
                    $modal = "show";
                    $heading = "Register as a New Client";
                    $tagline = "Provide your details.";
                    $content .= $this->getNewClientData($rawArr[1], $data);
                    break;
                case 'company_info':
                    $modal = "show";
                    $heading = "Company Details";
                    $tagline = "Enter your company's information.";
                    $content .= $this->getCompanyInfo($data);
                    break;
                case 'device_info_process':
                    $modal = "show";
                    $heading = "Find Your Device IP & Port";
                    $tagline = "Follow these instructions to get device details.";
                    $content .= $this->getDeviceInfoProcess($data);
                    break;
                case 'software_installation':
                    $modal = "show";
                    $heading = "Install the Software";
                    $tagline = "Follow the steps for installation.";
                    $content .= $this->getSoftwareInstallation($data);
                    break;
                case 'device_compatibility_check':
                    $modal = "show";
                    $heading = "Check Device Compatibility";
                    $tagline = "Ensure your device is compatible.";
                    $content .= $this->getDeviceCompatibilityCheck($data);
                    break;
                case 'payment_process':
                    $modal = "show";
                    $heading = "Proceed to Payment";
                    $tagline = "Complete your purchase securely.";
                    $content .= $this->getPaymentProcess($data);
                    break;
                case 'payment_redirection':
                    $modal = "show";
                    $heading = "Secure Payment Processing";
                    $tagline = "You are being redirected to our secure payment gateway. Please wait...";
                    $content .= $this->showRedirectionOfPayment();
                    break;
                case 'request_a_quote':
                    $modal = "hide";
                    $heading = "Request a Quote";
                    $tagline = "Fill out the form below to receive a customized quotation for Got-It HR Solutions.";
                    $content .= $this->getQuoteForm($type);
                    $modal = 'show';
                    break;
                case 'reseller_program':
                    $modal = "hide";
                    $heading = "Join Our Reseller Program";
                    $tagline = "Fill out the form below to apply for our Reseller Program and start earning with us.";
                    $content .= $this->getResellerForm($type);
                    $modal = 'show';
                    break;
                case 'software_download':
                    $modal = "hide";
                    $heading = "Download Got-It HR Software";
                    $tagline = "Fill out the form below to download the latest version of Got-It HR Solutions.";
                    $content .= $this->getQuoteForm($type);
                    $modal = 'show';
                    break;
                case 'forgot_password':
                    $modal = "show";
                    $size = "modal-md";
                    $heading = "Forgot Your Password?";
                    $tagline = "Enter your registered email to reset your password.";
                    if ($rawArr[1] != '-') {
                        $user = User::where('id', $rawArr[1])->first();
                        $email = $user->email ?? '';
                    } else {
                        $email = ''; 
                    }
                    $content .= $this->getForgotPasswordForm($email);
                    break;
                    

                case 'verify_otp':
                    if (!isset($rawArr[1]) || empty($rawArr[1])) {
                        return response()->json([
                            'status' => 'error',
                            'message' => 'Invalid request. Missing user identifier.',
                        ], 400);
                    }
                    $modal = "show";
                    $size = "modal-md";
                    $heading = "Verify Your OTP";
                    $tagline = "Enter the OTP sent to your registered email.";
                    $content .= $this->getEnterOtpForm($rawArr[1]);
                    break;
                case 'reset_password':
                   
                    $modal = "show";
                    $size = "modal-md";
                    $heading = "Set a New Password";
                    $tagline = "Enter and confirm your new password.";
                    $content .= $this->getResetPasswordForm($rawArr[1]);
                    break;
                case 'password_reset_success':
                    $modal = "show";
                    $size = "modal-md";
                    $heading = "Success!";
                    $tagline = "Your password has been updated.";
                    $content .= $this->getPasswordChangeSuccess();
                    break;
                default:
                    $content = "<center><b>No content available! Contact Support!</b></center>";
                    break;
            }
            return response()->json([
                'info' => true,
                'status' => true,
                'modal' => $modal,
                'size' => $size,
                'heading' => $heading,
                'tagline' => $tagline,
                'content' => $content
            ]);
        } catch (Exception $e) {
            return response()->json(['info' => true, 'status' => false, 'message' => $e->getMessage()], 500);
        }
    }
    private function getForgotPasswordForm($email = null)
{
    return "<div class='row gy-4'>
                <div class='px-4'>
                    <div class='col-12'>
                        <label for='email' class='form-label fw-bold'>Email Address</label>
                        <input type='email' id='email' name='email' class='form-control' value='" . htmlspecialchars($email) . "' placeholder='Enter your email' required>
                    </div>
                    <div class='d-flex justify-content-center align-items-center mt-3'>
                        <p class='text-center'>
                            <i class='fa-solid fa-envelope me-1 text-warning'></i>
                            Enter a valid email to receive reset instructions.
                        </p>
                    </div>
                    <div class='col-12 d-flex justify-content-between mt-1'>
                        <a href='" . url('/login') . "' class='btn'>
                            Back to Login
                        </a>
                        <button type='submit' class='btn btn-primary show-popup-modal-form-btn' data-type='enter_otp|-'>
                            Send OTP
                        </button>
                    </div>
                </div>
            </div>";
}

    private function getEnterOtpForm($gotit_id)
    {
        $user = User::where('gotit_id', $gotit_id)->firstOrFail();
        return "
    <div class='row gy-4'>
        <div class='px-4'>
            <input type='hidden' name='gotit_id' value='" . htmlspecialchars($user->gotit_id, ENT_QUOTES) . "'>
            <div class='col-12 text-center'>
                <label for='otp' class='form-label fw-bold'>Enter OTP</label>
                <div class='d-flex justify-content-center gap-2'>
                    <input type='text' class='otp-input' name='otp[]' maxlength='1' required>
                    <input type='text' class='otp-input' name='otp[]' maxlength='1' required>
                    <input type='text' class='otp-input' name='otp[]' maxlength='1' required>
                    <input type='text' class='otp-input' name='otp[]' maxlength='1' required>
                    <input type='text' class='otp-input' name='otp[]' maxlength='1' required>
                    <input type='text' class='otp-input' name='otp[]' maxlength='1' required>
                </div>
            </div>
            <div class='d-flex justify-content-center align-items-center mt-3'>
                <p class='text-center sf-10'>
                    <i class='fa-solid fa-triangle-exclamation me-1 text-danger'></i>
                    OTP is valid for 15 minutes. If not received, check spam or request again.
                </p>
            </div>
             <div class='col-12 d-flex justify-content-center mt-1'>
               <button type='submit' class='btn btn-success show-popup-modal-form-btn' data-type='verify_otp|-'>
                    Verify OTP
                </button>
            </div>
        </div>
    </div>
    <style>
        .otp-input {
            width: 2.5rem;
            height: 3rem;
            font-size: 1.5rem;
            text-align: center;
            border: 2px solid #00b4af;
            border-radius: 5px;
            outline: none;
        }
    </style>
    ";
    }
    private function getResetPasswordForm($gotit_id)
    {
        return "<div class='row gy-4'>
                    <input type='hidden' name='gotit_id' value='" . htmlspecialchars($gotit_id, ENT_QUOTES) . "'>
                    <div class='col-12'>
                        <label for='new_password' class='form-label fw-bold'>New Password</label>
                        <input type='password' id='password' name='password' class='form-control' autocomplete='new-password' placeholder='Enter new password' required>
                    </div>
                    <div class='col-12'>
                        <label for='confirm_password' class='form-label fw-bold'>Confirm Password</label>
                        <input type='password' id='password_confirmation' name='password_confirmation' autocomplete='new-password' class='form-control' placeholder='Confirm new password' required>
                    </div>
                    <div class='d-flex justify-content-center align-items-center mt-3'>
                        <p class='text-center'>
                            <i class='fa-solid fa-triangle-exclamation me-1 text-danger'></i>
                            Make sure your password is at least 8 characters long.
                        </p>
                    </div>
                    <div class='col-12 d-flex justify-content-center'>
                        <button type='submit' class='btn btn-success show-popup-modal-form-btn' data-type='update_password'>
                            Update Password
                        </button>
                    </div>
            </div>";
    }
    private function getPasswordChangeSuccess()
    {
        return "
    <div class='row gy-4'>
        <div class='p-4 text-center'>
            <div class='mb-3'>
                <i class='fa-solid fa-circle-check text-success' style='font-size: 4rem;'></i>
            </div>
            <h4 class='text-success fw-bold'>Password Changed Successfully!</h4>
            <p class='mt-2 text-muted'>
                Your password has been updated successfully. You can now log in with your new password.
            </p>
            <div class='col-12 d-flex justify-content-center mt-4'>
                <a href='" . url('/login') . "' class='btn btn-success px-4 py-2 fw-bold'>
                    Go to Login
                </a>
            </div>
        </div>
    </div>";
    }
    private function showRedirectionOfPayment()
    {
        return "<div class='row g-3 text-center'>
                <div class='col-12 p-4'>
                    <h2 class='text-success fw-bold'>
                        <i class='fa-solid fa-refresh me-2'></i> Payment Processing...
                    </h2>
                    <p class='text-muted'>You are being securely redirected to the payment gateway.</p>
                    <!-- Loading Animation -->
                    <div class='d-flex justify-content-center align-items-center mt-4'>
                        <div class='spinner-border text-primary' role='status' style='width: 3rem; height: 3rem;'>
                            <span class='visually-hidden'>Loading...</span>
                        </div>
                    </div>
                    <p class='text-muted mt-3'>
                        Please do not refresh or close this window.
                    </p>
                </div>
            </div>";
    }
    private function getPaymentProcess($data = null)
    {
        return "<div class='row g-3'>
                    <div class='p-4'>
                        <p class='mb-0'>
                            <h2 class='text-success text-center'>Congratulations!</h2><br>
                            Your device has passed all the test cases and is fully compatible with our software. You can proceed further to complete your payment.
                        </p>
                        <div class='d-flex justify-content-center align-items-center mt-0'>
                            <div>
                                <p class='alert alert-info'>
                                <span class='text-danger fw-bold'>Note:</span>
                                    <i class='fa-solid fa-triangle-exclamation me-1 text-warning'></i>This is a product of <strong>Digital Kuppam</strong>. For payment processing, we are redirecting you to <strong>Digital Kuppam</strong> for security purposes.
                                </p>
                            </div>
                        </div>
                        <div class='col-12 text-center mt-1'>
                            <p class='text-muted'>
                                By proceeding, you agree to our 
                                <a href='https://gotit4all.com/terms-and-conditions' class='text-primary' target='_blank'>Terms and Conditions</a> and 
                                <a href='https://gotit4all.com/privacy-policy' class='text-primary' target='_blank'>Privacy Policy</a>.
                            </p>
                        </div>
                    </div>
                    <div class='col-12 d-flex justify-content-between'>
                        <button type='button' class='btn show-modal-popup' data-type='device_compatibility_check|{$data->plan}|{$data->client_id}'>
                            Previous
                        </button>
                        <button type='submit' class='btn show-popup-modal-form-btn' data-type='payment_redirection|{$data->plan}|{$data->client_id}'>
                            Proceed to Pay
                        </button>
                    </div>
                </div>";
    }
    private function getDeviceCompatibilityCheck($data = null)
    {
        if (empty($data->fetched_data)) {
            return "<div class='row g-3 text-center'>
                <div class='col-12'>
                    <p class='text-warning fw-bold fs-6'>
                        <i class='fa-solid fa-exclamation-triangle me-2'></i> 
                        Please follow the previous steps, place the license key, and start the software to check compatibility.
                    </p>
                </div>
                <div class='col-12'>
                    <button type='button' class='btn btn-lg show-modal-popup' data-type='software_installation|{$data->plan}|{$data->client_id}'>
                        <i class='fa-solid fa-arrow-left me-2'></i> Go Back to Previous Step
                    </button>
                </div>
            </div>";
        }
        // Decode fetched data (Ensure valid JSON array)
        $fetchedData = json_decode("[" . $data->fetched_data . "]", true) ?? [];
        $devices = json_decode($data->device_info_json, true) ?? [];
        // Extract IPs from fetched data
        $fetchedIps = [];
        foreach ($fetchedData as $entry) {
            if (isset($entry['data']['device_info']['network_params']['ip'])) {
                $fetchedIps[] = $entry['data']['device_info']['network_params']['ip'];
            }
        }
        // Extract IPs from registered devices
        $deviceIps = [];
        foreach ($devices as $device) {
            if (isset($device['ip'])) {
                $deviceIps[] = $device['ip'];
            }
        }
        // Identify missing IPs
        $missingIps = array_diff($deviceIps, $fetchedIps);
        $compatible = empty($missingIps);
        // Success message
        if ($compatible) {
            // Generate HTML for compatible device IPs
            $compatibleIpsHtml = "<ul class='list-group text-start mt-3'>";
            foreach ($deviceIps as $ip) {
                $compatibleIpsHtml .= "<li class='list-group-item d-flex justify-content-between align-items-center animate__animated animate__fadeInUp'>
            <span><i class='fa-solid fa-network-wired text-success me-2'></i> Verified Device IP: <strong>{$ip}</strong></span>
            <i class='fa-solid fa-badge-check fa-lg text-info'></i>
        </li>";
            }
            $compatibleIpsHtml .= "</ul>";
            return "<div class='row g-3 text-center'>
        <style>
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .list-group-item { animation: fadeInUp 0.6s ease-in-out; animation-fill-mode: both; }
        </style>
        <div class='col-12 p-4 animate__animated animate__fadeIn'>
            <div class='text-center'>
                <h5 class='text-success fw-bold'>
                    <i class='fa-solid fa-circle-check me-2'></i> Device Successfully Verified!
                </h5>
                <p class='text-muted'>All system checks passed. Your device is ready to go!</p>
            </div>
            <ul class='list-group text-start mt-3'>
                <li class='list-group-item d-flex justify-content-between align-items-center animate__animated animate__fadeInUp'>
                    <span><i class='fa-solid fa-plug text-primary me-2'></i> Connection Established Securely</span>
                    <i class='fa-solid fa-badge-check fa-lg text-info'></i>
                </li>
                <li class='list-group-item d-flex justify-content-between align-items-center animate__animated animate__fadeInUp' style='animation-delay: 0.2s;'>
                    <span><i class='fa-solid fa-microphone text-info me-2'></i> Voice Tested Successfully</span>
                    <i class='fa-solid fa-badge-check text-info fa-lg'></i>
                </li>
                <li class='list-group-item d-flex justify-content-between align-items-center animate__animated animate__fadeInUp' style='animation-delay: 0.4s;'>
                    <span><i class='fa-solid fa-clock text-warning me-2'></i> Device Time Synchronized Successfully</span>
                    <i class='fa-solid fa-badge-check fa-lg text-info'></i>
                </li>
                <li class='list-group-item d-flex justify-content-between align-items-center animate__animated animate__fadeInUp' style='animation-delay: 0.6s;'>
                    <span><i class='fa-solid fa-microchip text-secondary me-2'></i> Device Information Retrieved</span>
                    <i class='fa-solid fa-badge-check fa-lg text-info'></i>
                </li>
            </ul>
            <h6 class='text-success fw-bold mt-4'>
                <i class='fa-solid fa-check-circle me-2'></i> Compatible Devices:
            </h6>
            {$compatibleIpsHtml}
        </div>
        <div class='col-12 d-flex justify-content-between'>
            <button type='button' class='btn show-modal-popup' data-type='software_installation|{$data->plan}|{$data->client_id}'>
                Previous
            </button>
            <button type='submit' class='btn show-popup-modal-form-btn' data-type='payment_process|{$data->plan}|{$data->client_id}'>
                Next
            </button>
        </div>
    </div>";
        }
        // Error message with missing IPs
        $missingIpsHtml = "<ul class='list-group text-start'>";
        foreach ($missingIps as $ip) {
            $missingIpsHtml .= "<li class='list-group-item text-danger'><i class='fa-solid fa-xmark me-2'></i> Missing IP : <strong>{$ip}</strong></li>";
        }
        $missingIpsHtml .= "</ul>";
        return "<div class='row g-3 text-center'>
        <div class='col-12 alert alert-danger p-4'>
            <h4 class='text-danger fw-bold'>
                <i class='fa-solid fa-triangle-exclamation me-2'></i> Device Compatibility Issue Detected!
            </h4>
            <p class='text-muted'>The following device(s) with these IP addresses are <strong>not compatible</strong> with our software:</p>
            {$missingIpsHtml}
            <h6 class='mt-3 text-dark'>For assistance, please contact our support team to resolve this issue.</h6>
        </div>
        <div class='col-12 d-flex justify-content-center mt-3'>
            <button type='button' class='btn show-modal-popup' data-type='software_installation|{$data->plan}|{$data->client_id}'>
                <i class='fa-solid fa-arrow-left me-2'></i> Go Back
            </button>
        </div>
    </div>";
    }
    private function getSoftwareInstallation($data = null)
    {
        return "
                <div class='row g-3'>
                    <script>
                        function copyLicenseKey() {
            const licenseInput = document.getElementById('licenseKey').innerText;
            navigator.clipboard.writeText(licenseInput).then(() => {
                successToast('Success.', 'License Key Copied to your Clipboard.', 3000);
            }).catch(err => {
                warningToast('Warning.', 'Failed to copy link. Try manually.', 3000);
            });
        }
                    </script>
                    <div class='text-center'>
                        <div id='procedureCarousel' class='carousel slide carousel-dark position-relative p-0' data-bs-ride='carousel'>
<div class='position-absolute w-100 d-flex justify-content-between software-dwn-area align-items-center'>
                        <div>
                            <a href='" . asset('software/got-it-installer.exe') . "' class='sw-download-btn' download>
                                <i class='fa-solid fa-download me-1'></i>Download
                            </a>
                        </div>

                        <div class='licence-group'>
  <span id='licenseKey'>" . $data->license_key . "</span>
  <button class='copy-h'  onclick='copyLicenseKey()' type='button'><i class='fas fa-copy'></i></button>
</div>
                    </div>
                            <div class='carousel-inner p-3 pt-65 rounded'>
                                <div class='carousel-item active'>
                                    <img src='" . asset('treasury/images/common/device/installation/1.jpg') . "' 
                                         class='d-block mx-auto rounded img-fluid carousel-img' 
                                         alt='Step 1 - Download Software'>
                                    <div class='p-2 rounded text-white'>
                                        <h5>Step 1: Download the Software</h5>
                                        <p class='p-0 m-0'>Click the download button to get the installer.</p>
                                    </div>
                                </div>
                                <div class='carousel-item'>
                                    <img src='" . asset('treasury/images/common/device/installation/2.jpg') . "' 
                                         class='d-block mx-auto rounded img-fluid carousel-img' 
                                         alt='Step 2 - Create Desktop Icon'>
                                    <div class='p-2 rounded text-white'>
                                        <h5>Step 2: Create a Desktop Icon</h5>
                                        <p class='p-0 m-0'>Choose whether to create a shortcut for quick access.</p>
                                    </div>
                                </div>
                                <div class='carousel-item'>
                                    <img src='" . asset('treasury/images/common/device/installation/3.jpg') . "' 
                                         class='d-block mx-auto rounded img-fluid carousel-img' 
                                         alt='Step 3 - Installation Process'>
                                    <div class='p-2 rounded text-white'>
                                        <h5>Step 3: Installation Process</h5>
                                        <p class='p-0 m-0'>Follow the setup wizard to complete installation.</p>
                                    </div>
                                </div>
                                <div class='carousel-item'>
                                    <img src='" . asset('treasury/images/common/device/installation/4.jpg') . "' 
                                         class='d-block mx-auto rounded img-fluid carousel-img' 
                                         alt='Step 4 - Read Me File'>
                                    <div class='p-2 rounded text-white'>
                                        <h5>Step 4: Read Me File</h5>
                                        <p class='p-0 m-0'>Review the documentation and click 'Finish' to start the application.</p>
                                    </div>
                                </div>
                                <div class='carousel-item'>
                                    <img src='" . asset('treasury/images/common/device/installation/5.png') . "' 
                                         class='d-block mx-auto rounded img-fluid carousel-img' 
                                         alt='Step 5 - Software Showcase'>
                                    <div class='p-2 rounded text-white'>
                                        <h5>Step 5: Software Showcase</h5>
                                        <p class='p-0 m-0'>Explore the software interface and features.</p>
                                    </div>
                                </div>
                                <div class='carousel-item'>
                                    <img src='" . asset('treasury/images/common/device/installation/6.png') . "' 
                                         class='d-block mx-auto rounded img-fluid carousel-img' 
                                         alt='Step 6 - Enter License Key & Domain'>
                                    <div class='p-2 rounded text-white'>
                                        <h5>Step 6: Input License Key & Domain</h5>
                                        <p class='p-0 m-0'>Enter your license key and domain to activate the software.</p>
                                    </div>
                                </div>
                            </div>
                            <!-- Carousel Controls -->
                            <button class='carousel-control-prev custom-carousel-btn' type='button' data-bs-target='#procedureCarousel' data-bs-slide='prev'>
                                <span class='carousel-control-prev-icon' aria-hidden='true'></span>
                                <span class='visually-hidden'>Previous</span>
                            </button>
                            <button class='carousel-control-next custom-carousel-btn' type='button' data-bs-target='#procedureCarousel' data-bs-slide='next'>
                                <span class='carousel-control-next-icon' aria-hidden='true'></span>
                                <span class='visually-hidden'>Next</span>
                            </button>
                        </div>
                    </div>
                    <div class='col-12 d-flex justify-content-between mt-3'>
                        <button type='button' class='btn btn-outline-light show-modal-popup' 
                                data-type='device_info_process|$data->plan|$data->client_id'>
                            Previous
                        </button>
                        <button type='submit' class='btn show-popup-modal-form-btn' 
                                data-type='device_compatibility_check|$data->plan|$data->client_id'>
                            Next
                        </button>
                    </div>
                </div>";
    }
    private function getDeviceInfoProcess($data = null)
    {
        $deviceInfo = [];
        if (!empty($data)) {
            $deviceInfo = json_decode($data->device_info_json, true) ?? [];
        }
        $content = "
        <div class='row g-3 text-center'>
            <div class='col-lg-6'>
                <div id='procedureCarousel' class='carousel slide carousel-dark' data-bs-ride='carousel'>
                    <div class='carousel-inner p-3 rounded'>
                        <div class='carousel-item active'>
                            <img src='" . asset('treasury/images/common/device/ipport-1.jpg') . "' 
                                 class='d-block mx-auto rounded img-fluid carousel-img' 
                                 alt='Step 1 - Switch on the Device'>
                            <div class='p-2 rounded text-white'>
                                <p>Step 1: Switch on the Device & Login</p>
                            </div>
                        </div>
                        <div class='carousel-item'>
                            <img src='" . asset('treasury/images/common/device/ipport-2.jpg') . "' 
                                 class='d-block mx-auto rounded img-fluid carousel-img' 
                                 alt='Step 2 - Navigate to Communication'>
                            <div class='p-2 rounded text-white'>
                                <p>Step 2: Open Apps & Find Communication</p>
                            </div>
                        </div>
                        <div class='carousel-item'>
                            <img src='" . asset('treasury/images/common/device/ipport-3.jpg') . "' 
                                 class='d-block mx-auto rounded img-fluid carousel-img' 
                                 alt='Step 3 - Open Ethernet Settings'>
                            <div class='p-2 rounded text-white'>
                                <p>Step 3: Locate Ethernet</p>
                            </div>
                        </div>
                        <div class='carousel-item'>
                            <img src='" . asset('treasury/images/common/device/ipport-4.jpg') . "' 
                                 class='d-block mx-auto rounded img-fluid carousel-img' 
                                 alt='Step 4 - Find IP Address & Port'>
                            <div class='p-2 rounded text-white'>
                                <p>Step 4: Retrieve IP Address & Port</p>
                            </div>
                        </div>
                    </div>
                    <!-- Carousel Controls -->
                    <button class='carousel-control-prev custom-carousel-btn' type='button' data-bs-target='#procedureCarousel' data-bs-slide='prev'>
                        <span class='carousel-control-prev-icon' aria-hidden='true'></span>
                        <span class='visually-hidden'>Previous</span>
                    </button>
                    <button class='carousel-control-next custom-carousel-btn' type='button' data-bs-target='#procedureCarousel' data-bs-slide='next'>
                        <span class='carousel-control-next-icon' aria-hidden='true'></span>
                        <span class='visually-hidden'>Next</span>
                    </button>
                </div>
            </div>
            <div class='col-lg-6 d-flex justify-content-center flex-column align-items-center'>
            <h5>Confirm device IP and Port</h5>
   <div class='row g-2 mb-0'>";
        $noOfDevices = max(1, $data->no_of_devices);
        for ($i = 0; $i < $noOfDevices; $i++) {
            $deviceKey = "Device " . ($i + 1);
            $ipAddress = $deviceInfo[$deviceKey]['ip'] ?? '192.168.1.201';
            $port = $deviceInfo[$deviceKey]['port'] ?? '4370';
            $content .= "<div class='col-12 text-start d-flex align-items-center mb-0'>
                        <hr class='flex-grow-1 my-2 me-2'>
                        <span class='device-font'> Device " . ($i + 1) . "</span>
                        <hr class='flex-grow-1 my-2 ms-2'>
                     </div>
                     <div class='col-md-6 text-start'>
                        <label for='ip_" . $i . "'>IP Address</label>
                        <input type='text' id='ip_" . $i . "' name='ip[]' placeholder='Device IP' value='" . htmlspecialchars($ipAddress) . "' class='form-control' required>
                     </div>
                     <div class='col-md-6 text-start'>
                        <label for='port_" . $i . "'>Port</label>
                        <input type='text' id='port_" . $i . "' name='port[]' class='form-control' placeholder='Device Port' value='" . htmlspecialchars($port) . "' required>
                     </div>";
        }
        $content .= "</div></div>
            <div class='col-12 d-flex justify-content-between mt-3'>
                <button type='button' class='btn btn-outline-light show-modal-popup' 
                        data-type='company_info|$data->plan|$data->client_id'>
                    Previous
                </button>
                <button type='submit' class='btn show-popup-modal-form-btn' 
                        data-type='software_installation|$data->plan|$data->client_id'>
                    Next
                </button>
            </div>
        </div>";
        return $content;
    }
    private function getCompanyInfo($data = null)
    {
        if (!empty($data)) {
            $orgInfo = json_decode($data->org_info_json, true) ?? [];
            $addressInfo = json_decode($data->address_json, true) ?? [];
        }
        return "<div class='row g-3'>
                    <div class='col-md-4'>
                        <label for='name'>Organization Name <span class='text-danger'>*</span></label>
                        <input type='text' name='name' class='form-control' placeholder='Organization Name' value='" . ($orgInfo['name'] ?? '') . "' required>
                    </div>
                    <div class='col-md-4'>
                        <label for='org_size'>Organization Size <span class='text-danger'>*</span></label>
                        <select class='form-control dyna-select-dropdown' name='org_size' dyna-select-target='org_size' required>
                            " . SelectHelper::getOptions('OPT', 'category_id', 'CTGINDSS', [$orgInfo['org_size'] ?? '']) . "
                        </select>
                    </div>
                    <div class='col-md-4'>
                        <label for='email'>Industry<span class='text-danger'>*</span></label>
                        <select class='form-control dyna-select-dropdown' name='org_type' dyna-select-target='org_type' required>
                            " . SelectHelper::getOptions('OPT', 'category_id', 'CTGINDUS', [$orgInfo['org_type'] ?? '']) . "
                        </select>
                    </div>
                    <div class='col-md-4'>
                        <label for='email'>Email </label>
                        <input type='email' name='email' class='form-control' placeholder='Organization Email' value='" . ($orgInfo['email'] ?? '') . "'>
                    </div>
                     <div class='col-md-4'>
                        <label for='phone'>Phone <span class='text-danger'>*</span></label>
                        <input type='tel' name='phone' class='form-control' minlength='10' maxlength='10' pattern='[6-9][0-9]{9}' placeholder='Organization Phone' value='" . ($orgInfo['phone'] ?? '') . "' required>
                    </div>
                    <div class='col-md-4'>
                        <label for='GSTIN'>GSTIN</label>
                        <input type='text' name='gstin' class='form-control' placeholder='GSTIN' value='" . ($orgInfo['gstin'] ?? '') . "'>
                    </div>
                    <div class='col-sm-12 col-lg-12 col-md-12 text-start d-flex align-items-center'>
                        <hr class='flex-grow-1 my-2 me-2'>
                        <h6 class='m-0'> Address </h6>
                        <hr class='flex-grow-1 my-2 ms-2'>
                    </div>
                    <div class='col-md-4'>
                        <label for='address'>Address</label>
                        <input type='text' name='address' class='form-control' placeholder='Address' value='" . ($addressInfo['address'] ?? '') . "'>
                    </div>
                    <div class='col-md-4'>
                        <label for='landmark'>Landmark</label>
                        <input type='text' name='landmark' class='form-control' placeholder='Landmark' value='" . ($addressInfo['landmark'] ?? '') . "'>
                    </div>
                    <div class='col-md-4'>
                        <label for='city'>City</label>
                        <input type='text' name='city' class='form-control' placeholder='City' value='" . ($addressInfo['city'] ?? '') . "'>
                    </div>
                    <div class='col-md-4'>
                        <label for='State'>State</label>
                        <input type='text' name='state' class='form-control' placeholder='State' value='" . ($addressInfo['state'] ?? '') . "'>
                    </div>
                    <div class='col-md-4'>
                        <label for='pin_code'>Pin Code</label>
                        <input type='text' name='pin_code' class='form-control' placeholder='Pin Code' value='" . ($addressInfo['pin_code'] ?? '') . "'>
                    </div>
                     <div class='col-sm-4'>
                     <label class='text-info'>No. of Devices  <span class='text-danger'>*</span></label>
                        <input type='number' min='1' name='no_of_devices' class='form-control bg-light' placeholder='No Of Devices' value='" . ($data->no_of_devices ?? '') . "' required>
                     </div>
                    <div class='col-12 d-flex justify-content-between'>
                        <button type='button' class='btn show-modal-popup' data-type='new_client|$data->plan|$data->client_id'>
                        Previous
                        </button>
                      <button type='submit' class='btn show-popup-modal-form-btn' data-type='device_info_process|$data->plan|$data->client_id'>
                            Next
                        </button>
                    </div>  
                </div>";
    }
    private function getNewClientData($plan, $data = null)
    {
        $content = "<div class='row g-3'>
                <input type='hidden' name='current_stage' value='new_client'>
                <input type='hidden' name='plan' value='" . $plan . "'>
                <div class='col-md-6'>
                    <label for='first_name'>First Name <span class='text-danger'>*</span></label>
                    <input type='text' name='first_name' class='form-control' placeholder='Your First Name' value='" . ($data->first_name ?? '') . "' pattern='[A-Za-z]+' title='Only alphabets allowed' required>
                </div>
                <div class='col-md-6'>
                    <label for='last_name'>Last Name <span class='text-danger'>*</span></label>
                    <input type='text' name='last_name' class='form-control' placeholder='Your Last Name' value='" . ($data->last_name ?? '') . "' required>
                </div>
                <div class='col-md-6'>
                    <label for='email'>Email <span class='text-danger'>*</span></label>
                    <input type='email' name='email' class='form-control' placeholder='Your Email' value='" . ($data->email ?? '') . "'required>
                </div>
                <div class='col-md-6'>
                    <label for='phone'>Phone <span class='text-danger'>*</span></label>
                    <input type='tel' name='phone' class='form-control' placeholder='Your Phone' minlength='10' maxlength='10' pattern='[6-9][0-9]{9}' value='" . ($data->phone ?? '') . "'required>
                </div>
                <div class='col-md-6'>
                    <label for='password'>Password <span class='text-danger'>*</span></label>
                    <input type='password' id='password' name='password' class='form-control' placeholder='Enter Password' autocomplete='new-password' value='" . ($data->password ?? '') . "' required>
                </div>
                <div class='col-md-6'>
                    <label for='confirm_password'>Confirm Password</label>
                    <input type='password' id='password_confirmation' name='password_confirmation' class='form-control' autocomplete='new-password' placeholder='Confirm Password' value='" . ($data->password ?? '') . "' required>
                </div>
                <div class='col-12 d-flex justify-content-between'>
                <button type='button' class='btn show-modal-popup' data-type='plan_confirmation|" . $plan . "'>
                    Previous
                 </button>";
        if (!empty($data)) {
            $content .= " <button type='submit' class='btn show-popup-modal-form-btn' data-type='company_info|" . $plan . "|" . $data->client_id . "'>
                        Next
                    </button>";
        } else {
            $content .= " <button type='submit' class='btn show-popup-modal-form-btn' data-type='company_info|" . $plan . "'>
                    Next
                </button>";
        }
        $content .= " </div>
            </div>";
        return $content;
    }
   private function getPlanConfirmation($planId)
{
    $pricingData = \App\Http\classes\SupremeHelper::fetch('PPL', [
        'where' => [
            'product_id' => env('SUPREME_PRODUCT_ID'),
            'plan_id' => $planId,
        ],
    ]);

    if ($pricingData instanceof \Illuminate\Http\JsonResponse) {
        $planData = $pricingData->getData(true); // Convert to array
    } else {
        $planData = $pricingData; // Assume it's already an array
    }

    $data = $planData['data'][0] ?? null;

    if (!$data) {
        return "<li><i class='fa-solid fa-angle-right mx-2'></i> No Plan Found</li>";
    }

    $clientId = request()->cookie('client_id');

    $content = "
        <div class='d-flex justify-content-between align-items-center mt-3'>
            <h3 class='text-primary m-0'><i class='fa-solid " . htmlspecialchars($data['icon'] ?? '', ENT_QUOTES, 'UTF-8') . " me-2'></i>" . htmlspecialchars($data['name'] ?? '', ENT_QUOTES, 'UTF-8') . "</h3>
            <div class='price text-success fw-bold'>
                <span class='currency fs-4'>₹</span>
                <span class='amount display-5'>" . htmlspecialchars($data['amount'] ?? '', ENT_QUOTES, 'UTF-8') . "</span>
                <span class='period fs-5'>/ ".$data['duration_type']."</span>
            </div>
        </div>
         <p>" . htmlspecialchars_decode($data['features'] ?? '', ENT_QUOTES) . "</p>
        <p>" . htmlspecialchars_decode($data['additional_info'] ?? '', ENT_QUOTES) . "</p>

        <div class='text-center mt-3'>";

    // Generate button dynamically based on client ID
    $dataType = !empty($clientId) ? "new_client|$planId|$clientId" : "new_client|$planId";

    $content .= " 
        <button type='submit' class='btn show-popup-modal-form-btn' 
            data-type='" . htmlspecialchars($dataType, ENT_QUOTES, 'UTF-8') . "'
            value='" . htmlspecialchars($data['name'] ?? '', ENT_QUOTES, 'UTF-8') . "'>
            Confirm & Continue
        </button>
    </div>";

    return $content;
}

    private function getQuoteForm($type)
    {
        $planInfo = \App\Http\classes\SupremeHelper::fetch('PPL', ['where' => ['product_id' => env('SUPREME_PRODUCT_ID')]]);
 
    if ($planInfo instanceof \Illuminate\Http\JsonResponse) {
        $plan = $planInfo->getData(true); 
    } else {
        $plan = $planInfo; 
    }
                        
        $content = "<div class='row g-3'>
                            <div class='col-6'>
                                <input type='text' name='name' class='form-control' placeholder='Your Name' required=''>
                            </div>
                            <div class='col-6'>
                                <input type='text' class='form-control' name='phone' placeholder='Your Phone Number' minlength='10' maxlength='10' pattern='[6-9][0-9]{9}' required=''>
                            </div>
                            <div class='col-md-6'>
                                <input type='email' class='form-control' name='email' placeholder='Your Email' required=''>
                            </div>
                            <div class='col-md-6'>
                                <input type='text' name='company' class='form-control' placeholder='Company Name' required=''>
                            </div>
                            <div class='col-md-6'>
                                <input type='number' name='employee_count' class='form-control' placeholder='Number of Employees' required=''>
                            </div>";

                            if (isset($plan['data']) && is_array($plan['data'])) {
                                $content .= "<div class='col-md-6'>
                                                <select class='form-select' name='plan' id='plan' required>
                                                    <option value=''>Select Plan</option>";
                            
                                foreach ($plan['data'] as $data) {
                                    $content .= "<option value='{$data['plan_id']}'>
                    🏷️ <strong>{$data['name']}</strong> | 💰 ₹{$data['amount']} | ⏳ {$data['duration_value']} {$data['duration_type']}
                 </option>";
                                }
                            
                                $content .= "</select>
                                            </div>";
                            } else {
                                $content .= "<div class='col-md-6'>
                                                <select class='form-select' name='plan' id='plan' required>
                                                    <option value=''>No plans available</option>
                                                </select>
                                            </div>";
                            }
                            
                           $content .= " 
                            <div class='col-12'>
                                <textarea class='form-control' name='message' rows='4' placeholder='Additional Requirements or Comments' required=''></textarea>
                            </div>";
        if ($type == 'request_a_quote') {
            $content .= "<div class='col-12 text-center'>
                                            <button type='submit' class='btn landing-btn'>Request a Quote</button>
                                        </div>";
        } else {
            $content .= "<div class='col-12 text-center'>
                                              <button type='submit' class='btn landing-btn'>Download Software</button>
                                        </div>";
        }
        $content .= "</div>";
        return $content;
    }

    private function getResellerForm($type)
{
    return "<div class='row g-3'>
                    <div class='col-6'>
                        <input type='text' name='name' class='form-control' placeholder='Your Name' required=''>
                    </div>
                    <div class='col-6'>
                        <input type='tel' class='form-control' name='phone' placeholder='Your Phone Number' minlength='10' maxlength='10' pattern='^[6-9]\d{9}$' required=''>
                    </div>
                    <div class='col-md-6'>
                        <input type='email' class='form-control' name='email' placeholder='Your Email' required=''>
                    </div>
                    <div class='col-md-6'>
                        <input type='text' name='company' class='form-control' placeholder='Company Name (if applicable)'>
                    </div>
                    <div class='col-md-6'>
                        <input type='url' name='website' class='form-control' placeholder='Website (if applicable)'>
                    </div>
                    <div class='col-md-6'>
                        <input type='number' name='business_experience' class='form-control' placeholder='Years of Business Experience' required=''>
                    </div>
                    <div class='col-md-12'>
                        <select class='form-select' name='reseller_interest' id='reseller_interest' required=''>
                            <option value=''>Select Area of Interest</option>
                            <option value='Software Reselling'>Software Reselling</option>
                            <option value='HR & Payroll Solutions'>HR & Payroll Solutions</option>
                            <option value='Marketing & Sales'>Marketing & Sales</option>
                            <option value='Affiliate Partnerships'>Affiliate Partnerships</option>
                            <option value='Other'>Other</option>
                        </select>
                    </div>
                    <div class='col-12'>
                        <textarea class='form-control' name='message' rows='4' placeholder='Tell us why you want to join our Reseller Program'></textarea>
                    </div>
                    <div class='col-12 text-center'>
                        <button type='submit' class='btn landing-btn'>Apply Now</button>
                     </div>
                </div>";
}

}
