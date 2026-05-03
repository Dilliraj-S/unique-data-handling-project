<?php
namespace App\Http\Classes;
use App\Models\Activity\LoginHistory;
use App\Models\User;
use App\Models\UserData;
use setasign\Fpdi\Tcpdf\Fpdi;
use Exception;
class UserResumeHelper extends Fpdi
{
    private static $sectionSpacing = 10;
    private static $cellPadding = 5;
    private static $headerBgColor = [112, 215, 212];
    private static $tableHeaderBgColor = [230, 230, 230];
    private static $tableHeaderTextColor = [0, 0, 0];
    private static $contentTextColor = [0, 0, 0];
    private static $whiteTextColor = [255, 255, 255];
    private static $lightGrayBgColor = [220, 220, 220];
    private static $sectionHeaderFontSize = 13;
    private static $defaultFontSize = 12;
    public function Header()
    {
        $bMargin = $this->getBreakMargin();
        $auto_page_break = $this->AutoPageBreak;
        $this->SetAutoPageBreak(false, 0);
        $backgroundPath = public_path('treasury/company/resume/resume3.png');
        if (file_exists($backgroundPath)) {
            $this->Image($backgroundPath, 0, 0, $this->getPageWidth(), $this->getPageHeight());
        }
        $this->SetAutoPageBreak($auto_page_break, $bMargin);
        $this->SetY(50);
        $this->setPageMark();
    }
    public function Footer()
    {
        $this->SetY(-7);
        $this->SetFont('dejavusans', 'B', 8);
        $this->SetTextColor(...self::$whiteTextColor); // Corrected access
        $this->Cell(222, 5, 'Page ' . $this->getAliasNumPage() . ' of ' . $this->getAliasNbPages(), 0, 0, 'R');
    }
    public static function generateUserResume($userId)
    {
        try {
            $user = User::where('gotit_id', $userId)->firstOrFail();
            $userData = UserData::where('gotit_id', $user->gotit_id)->first();
            $loginHistory = LoginHistory::where('gotit_id', $user->gotit_id)
                ->orderBy('login_time', 'desc')
                ->limit(4)
                ->get();
            $address = json_decode($userData->address_json ?? '{}', true);
            $socialLinks = json_decode($userData->social_links_json ?? '{}', true);
            $documents = json_decode($userData->documents_json ?? '{}', true);
            $pdf = new self('P', 'mm', 'A4', true, 'UTF-8', false);
            $pdf->SetCreator('Got-It :) - Resume Generator');
            $pdf->SetAuthor($user->first_name . ' ' . $user->last_name);
            $pdf->SetTitle('Resume - ' . $user->first_name . ' ' . $user->last_name);
            $pdf->SetMargins(10, 32, 10);
            $pdf->SetAutoPageBreak(true, 20);
            $pdf->AddPage();
            self::addUserInfo($pdf, $user, $userData, $address);
            self::userDeviceDetails($pdf, $user);
            self::addSkillsAndLanguages($pdf, $documents);
            self::addLoginHistory($pdf, $loginHistory);
            self::addSocialLinks($pdf, $socialLinks);
            self::addAadhaarAndPanDetails($pdf, $documents);
            self::addBankDetails($pdf, $documents);
            self::addDocuments($pdf, $documents);
            return $pdf->Output('User_Resume_' . $user->first_name . '.pdf', 'D');
        } catch (Exception $e) {
            return 'Error generating resume PDF: ' . $e->getMessage();
        }
    }
    private static function addDocuments($pdf, $documents)
    {
        $pdf->Ln(10);
        $pdfFiles = [];
        $imageFiles = [];
        foreach ($documents as $docType => $docPath) {
            if (!is_string($docPath) || strpos($docPath, 'storage/') === false) {
                continue;
            }
            $docFilePath = public_path($docPath);
            if (!file_exists($docFilePath)) {
                continue;
            }
            $extension = strtolower(pathinfo($docFilePath, PATHINFO_EXTENSION));
            if (in_array($extension, ['jpg', 'jpeg', 'png'])) {
                $imageFiles[$docType] = $docFilePath;
            } elseif ($extension === 'pdf') {
                $pdfFiles[$docType] = $docFilePath;
            }
        }
        foreach ($pdfFiles as $docType => $pdfFile) {
            $pageCount = $pdf->setSourceFile($pdfFile);
            for ($i = 1; $i <= $pageCount; $i++) {
                $pdf->AddPage();
                self::addSectionHeader($pdf, ucfirst(str_replace('_', ' ', $docType)));
                $pdf->Ln(10);
                $tplIdx = $pdf->importPage($i);
                $pdf->useTemplate($tplIdx, 10, 32, 190);
            }
        }
        foreach ($imageFiles as $docType => $imageFile) {
            $pdf->AddPage();
            self::addSectionHeader($pdf, ucfirst(str_replace('_', ' ', $docType)));
            $pdf->Ln(10);
            list($origWidth, $origHeight) = getimagesize($imageFile);
            $newHeight = 100;
            $newWidth = ($origWidth / $origHeight) * $newHeight;
        
            $xPos = (210 - $newWidth) / 2;
            $pdf->Image($imageFile, $xPos, 50, $newWidth, $newHeight);
        }
        $pdf->Ln(10);
    }
    private static function addSkillsAndLanguages($pdf, $documents)
    {
        self::addSectionHeader($pdf, 'Skills & Languages Known');
        $skills = isset($documents['skills']) ? explode(',', $documents['skills']) : [];
        $languages = isset($documents['languages_known']) ? explode(',', $documents['languages_known']) : [];
        $skillsFormatted = !empty($skills) ? implode(' , ', array_map('trim', $skills)) : 'N/A';
        $languagesFormatted = !empty($languages) ? implode(' , ', array_map(fn($lang) => ucfirst(trim($lang)), $languages)) : 'N/A';
        $pdf->SetFont('helvetica', '', 12);
        $pdf->Cell(50, 8, "Skills", 1, 0, 'L');
        $pdf->MultiCell(140, 8, $skillsFormatted, 1, 'L');
        $pdf->Cell(50, 8, "Languages Known", 1, 0, 'L');
        $pdf->MultiCell(140, 8, $languagesFormatted, 1, 'L');
        $pdf->Ln(5);
    }
    private static function userDeviceDetails($pdf, $user)
    {
        self::addSectionHeader($pdf, 'User Device Details');
        $deviceId = SelectHelper::getValue('DEV', $user['device_ids']) ?? 'N/A';
        $deviceusrId = $user['du_usrid'] ?? 'N/A';
        $deviceRole = isset($user['du_role']) ? ($user['du_role'] == 0 ? 'User' : ($user['du_role'] == 14 ? 'Admin' : 'N/A')) : 'N/A';
        $devicePassword = $user['du_pswd'] ?? 'N/A';
        $pdf->SetFont('helvetica', '', 12);
        $pdf->Cell(50, 8, "Device Name", 1, 0, 'L');
        $pdf->Cell(140, 8, $deviceId, 1, 1, 'L');
        $pdf->Cell(50, 8, "User Id", 1, 0, 'L');
        $pdf->Cell(140, 8, $deviceusrId, 1, 1, 'L');
        $pdf->Cell(50, 8, "Role", 1, 0, 'L');
        $pdf->Cell(140, 8, $deviceRole, 1, 1, 'L');
        $pdf->Cell(50, 8, "Password", 1, 0, 'L');
        $pdf->Cell(140, 8, $devicePassword, 1, 1, 'L');
        $pdf->Ln(5);
    }
    private static function addAadhaarAndPanDetails($pdf, $documents)
    {
        self::addSectionHeader($pdf, 'Aadhaar & PAN Details');
        $aadhaarNo = $documents['aadhaar_no'] ?? 'N/A';
        $panNo = $documents['pan_no'] ?? 'N/A';
        $pdf->SetFont('helvetica', '', 12);
        $pdf->Cell(50, 8, "Aadhaar Number", 1, 0, 'L');
        $pdf->Cell(140, 8, $aadhaarNo, 1, 1, 'L');
        $pdf->Cell(50, 8, "PAN Number", 1, 0, 'L');
        $pdf->Cell(140, 8, $panNo, 1, 1, 'L');
        $pdf->Ln(5);
    }
    private static function addBankDetails($pdf, $documents)
    {
        self::addSectionHeader($pdf, 'Bank Details');
        if (!empty($documents['bank_details']) && is_array($documents['bank_details'])) {
            $bankDetails = $documents['bank_details'];
            $bankName = $bankDetails['bank_name'] ?? 'N/A';
            $ifscCode = $bankDetails['ifsc_code'] ?? 'N/A';
            $accountNumber = $bankDetails['account_number'] ?? 'N/A';
            $pdf->SetFont('helvetica', '', 12);
            $pdf->Cell(50, 8, "Bank Name", 1, 0, 'L');
            $pdf->Cell(140, 8, $bankName, 1, 1, 'L');
            $pdf->Cell(50, 8, "IFSC Code", 1, 0, 'L');
            $pdf->Cell(140, 8, $ifscCode, 1, 1, 'L');
            $pdf->Cell(50, 8, "Account Number", 1, 0, 'L');
            $pdf->Cell(140, 8, $accountNumber, 1, 1, 'L');
            $pdf->Ln(5);
        } else {
            $pdf->Cell(0, 8, "No bank details available", 1, 1, 'L');
        }
    }
    private static function addUserInfo($pdf, $user, $userData, $address)
    {
        $imageWidth = 40;
        $imageHeight = 40;
        $imageX = 10;
        $imageY = 40;
        $textX = $imageX + $imageWidth + 15;
        $textWidth = $pdf->GetPageWidth() - $textX - 10;
        $defaultImagePath = public_path('treasury/images/common/profile/1.png');
        $userImagePath = !empty($user->profile) ? public_path($user->profile) : $defaultImagePath;
        if (file_exists($userImagePath)) {
            $pdf->Image($userImagePath, $imageX, $imageY, $imageWidth, $imageHeight, '', '', '', true, 150);
        }
        $pdf->SetXY($textX, $imageY);
        $deptId = SelectHelper::getValue('DEP', $user->dept_id) ?? 'N/A';
        $desgId = SelectHelper::getValue('DSG', $user->desg_id) ?? 'N/A';
        $shiftId = SelectHelper::getValue('SFT', $user->shift_ids) ?? 'N/A';
        $pdf->SetFont('helvetica', 'B', 32);
        $pdf->Cell($textWidth, 12, $user->first_name . ' ' . $user->last_name, 0, 1, 'L');
        $pdf->SetFont('helvetica', '', 12);
        $pdf->Ln(2);
        $pdf->SetX($textX);
        $pdf->Cell($textWidth, 8, "Email: " . $user->email . "  |  Phone: " . $user->phone, 0, 1, 'L');
        $pdf->Ln(1);
        $pdf->SetX($textX);
        $pdf->Cell($textWidth, 8, "Employee Id: " . $user->gotit_id . "  |  Role: " . $user->role, 0, 1, 'L');
        $pdf->Ln(1);
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->SetX($textX);
        $pdf->Cell($textWidth, 6, "Dept: " . $deptId . "  |  Desg: " . $desgId . "  |  Shift: " . $shiftId, 0, 1, 'L');
        $pdf->Ln(3);
        self::addSectionHeader($pdf, 'Personal Details');
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(30, 7, "DOB", 0, 0, 'L');
        $pdf->SetFont('helvetica', 'I', 11);
        $pdf->Cell(0, 7, ucfirst($userData->birth_date ?? 'N/A'), 0, 1, 'L');
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(30, 7, "Gender", 0, 0, 'L');
        $pdf->SetFont('helvetica', 'I', 11);
        $pdf->Cell(0, 7, ucfirst($userData->gender ?? 'N/A'), 0, 1, 'L'); // Gender on the same line
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(30, 7, "Address", 0, 0, 'L');
        $pdf->SetFont('helvetica', 'I', 11);
        $pdf->Cell(
            0,
            7,
            ($address['address_line1'] ?? 'N/A') . ", " .
                ($address['city'] ?? 'N/A') . ", " .
                ($address['state'] ?? 'N/A') . " - " .
                ($address['pin_code'] ?? 'N/A'),
            0,
            1,
            'L'
        );
        $pdf->Ln(5);
    }
    private static function addLoginHistory($pdf, $loginHistory)
    {
        self::addSectionHeader($pdf, 'Recent Login History');
        if (!empty($loginHistory)) {
            $pdf->SetFont('helvetica', 'B', 12);
            $pdf->SetFillColor(...self::$tableHeaderBgColor);
            $pdf->SetTextColor(...self::$tableHeaderTextColor);
            // Table headers
            $pdf->Cell(50, 10, "Login Time", 1, 0, 'C', true);
            $pdf->Cell(50, 10, "Logout Time", 1, 0, 'C', true);
            $pdf->Cell(40, 10, "Platform", 1, 0, 'C', true);
            $pdf->Cell(50, 10, "Browser", 1, 1, 'C', true);
            $pdf->SetFont('helvetica', '', 12);
            $pdf->SetTextColor(...self::$contentTextColor);
            // Table content
            foreach ($loginHistory as $history) {
                $pdf->Cell(50, 10, $history->login_time, 1, 0, 'C');
                $pdf->Cell(50, 10, $history->logout_time ?? 'N/A', 1, 0, 'C');
                $pdf->Cell(40, 10, ucfirst($history->platform), 1, 0, 'C');
                $pdf->Cell(50, 10, ucfirst($history->browser), 1, 1, 'C');
            }
        } else {
            $pdf->SetFont('helvetica', 'I', 12);
            $pdf->SetTextColor(100, 100, 100); // Subtle gray text
            $pdf->Cell(190, 10, "No login history available", 1, 1, 'C');
        }
        $pdf->Ln(5); // Add some spacing at the end
    }
   private static function addSocialLinks($pdf, $socialLinks)
{
    self::addSectionHeader($pdf, 'Social Links');
    if (!empty($socialLinks)) {
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetFillColor(...self::$lightGrayBgColor);
        
        // Adjusted column widths: 30% (57) for Platform, 70% (133) for Profile Link
        $pdf->Cell(57, 10, "Platform", 1, 0, 'C', true);
        $pdf->Cell(133, 10, "Profile Link", 1, 1, 'C', true);
        
        $pdf->SetFont('helvetica', '', 12);
        foreach ($socialLinks as $platform => $link) {
            $platformName = str_replace('_url', '', $platform);
            $pdf->Cell(57, 10, ucfirst($platformName), 1, 0, 'C');
            $pdf->Cell(133, 10, asset($link), 1, 1, 'C');
        }
    } else {
        $pdf->MultiCell(0, 10, "No social links available", 1, 'C');
    }
    $pdf->Ln(5);
}

    private static function addSectionHeader($pdf, $title)
    {
        $pdf->SetFont('helvetica', 'B', self::$sectionHeaderFontSize);
        $pdf->SetFillColor(...self::$headerBgColor);
        $pdf->SetTextColor(...self::$whiteTextColor);
        $pdf->Cell(0, 10, $title, 0, 1, 'L', true);
        $pdf->SetTextColor(...self::$contentTextColor);
        $pdf->Ln(2);
    }
}
