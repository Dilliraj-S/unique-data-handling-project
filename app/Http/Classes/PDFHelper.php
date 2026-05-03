<?php

namespace App\Http\Classes;

use Exception;
use TCPDF;
use Illuminate\Support\Facades\Auth;
use App\Http\Classes\{
    Helper,
    DataHelper
};
use InvalidArgumentException;
use App\Models\Templates\{
    Template,
    DocumentContent,
};
use App\Models\Creators\{
    Document,
    Quotation,
    Invoice,
    Contract
};

class PDFHelper extends TCPDF
{
    protected $template;
    protected $generated_by;
    protected $pdf_type;
    public function __construct($orientation = 'P', $unit = 'mm', $format = 'A4', $unicode = true, $encoding = 'UTF-8', $diskcache = false, $template, $generated_by, $pdf_type)
    {
        try {
            parent::__construct($orientation, $unit, $format, $unicode, $encoding, $diskcache);
            $this->template = $template;
            $this->generated_by = $generated_by;
            $this->pdf_type = $pdf_type;
        } catch (Exception $e) {
            throw new Exception('Error initializing PDF: ' . $e->getMessage());
        }
    }
    // Page header 
    public function Header()
    {
        try {
            $svgHeader = file_get_contents(public_path($this->template->header_img_url));
            if ($svgHeader === false) {
                throw new Exception('Failed to load header image');
            }
            $contentAreaPos = $this->template->content_area;
            $contentAreaPosArr = explode('|', $contentAreaPos);
            if (count($contentAreaPosArr) !== 4) {
                throw new Exception('Invalid content area format in template');
            }
            [$cLeft, $cRight, $cTop, $cBottom] = $contentAreaPosArr;
            $this->SetMargins(0, $cTop, 0);
            $headerPosArr = $this->parsePosition($this->template->header_pos);
            [$hLeft, $hTop, $hWidth, $hHeight, $hPosition] = $headerPosArr;
            $hWidth = $this->resolveDimension($hWidth, 'width');
            $hHeight = $this->resolveDimension($hHeight, 'height');
            $this->ImageSVG('@' . $svgHeader, $hLeft, $hTop, $hWidth, $hHeight, '', '', $hPosition, 0, true);
            $this->SetY($cTop + 3);
            $this->SetAlpha(1);
            // Backdrop
            $imagePath = public_path($this->template->backdrop_img_url);
            $imageType = strtolower(pathinfo($imagePath, PATHINFO_EXTENSION));
            // Parse position and resolve dimensions
            $backdropPosArr = $this->parsePosition($this->template->backdrop_pos);
            [$bLeft, $bTop, $bWidth, $bHeight] = $backdropPosArr;
            $bWidth = $this->resolveDimension($bWidth, 'width');
            $bHeight = $this->resolveDimension($bHeight, 'height');
            $pageWidth = $this->getPageWidth();
            $pageHeight = $this->getPageHeight();
            $bLeft = ($pageWidth - $bWidth) / 2;
            $bTop = ($pageHeight - $bHeight) / 2;
            $this->SetAlpha(0.05);
            $this->Image($imagePath, $bLeft, $bTop, $bWidth, $bHeight, '', '', '', true, 150, '', false, false, 0, false, false, false);
            $this->SetAlpha(1);
            //Preview Watermark
            if ($this->pdf_type === 'preview') {
                $pageWidth = $this->getPageWidth();
                $pageHeight = $this->getPageHeight();
                // Define the watermark properties
                $xSpacing = 70;
                $ySpacing = 70;
                // Calculate number of watermarks in each direction
                $numXWatermarks = ceil($pageWidth / $xSpacing);
                $numYWatermarks = ceil($pageHeight / $ySpacing);
                $this->SetAlpha(0.08);
                $this->SetFont('helvetica', 'B', 50);
                $this->SetTextColor(150, 150, 150);
                // Loop to cover the entire page
                for ($i = 0; $i < $numXWatermarks; $i++) {
                    for ($j = 0; $j < $numYWatermarks; $j++) {
                        $x = $i * $xSpacing;
                        $y = $j * $ySpacing;
                        $this->StartTransform();
                        $this->Rotate(45, $x, $y);
                        $this->Text($x, $y, 'Preview', false, false, true, 0, 1, 'L');
                        $this->StopTransform();
                    }
                }
                $this->SetAlpha(1);
            }
        } catch (Exception $e) {
            throw new Exception('Error in Header: ' . $e->getMessage());
        }
    }
    // Page footer
    public function Footer()
    {
        try {
            $svgFooter = file_get_contents(public_path($this->template->footer_img_url));
            if ($svgFooter === false) {
                throw new Exception('Failed to load footer image');
            }
            $footerPosArr = $this->parsePosition($this->template->footer_pos);
            [$fLeft, $fTop, $fWidth, $fHeight, $fPosition] = $footerPosArr;
            $fWidth = $this->resolveDimension($fWidth, 'width');
            $fHeight = $this->resolveDimension($fHeight, 'height');
            $this->ImageSVG('@' . $svgFooter, $fLeft - 0.3, $this->getPageHeight() - $fTop, $fWidth + 1, $fHeight, '', '', $fPosition, 0, false);
            $this->SetFont('dejavusans', '', 7);
            $footerContent = $this->generated_by . ' | Page ' . $this->getAliasNumPage() . '/' . $this->getAliasNbPages();
            $footerpgPosArr = $this->parsePosition($this->template->ftr_pgno_pos);
            [$fpLeft, $fpTop, $fpWidth, $fpHeight, $fpPosition] = $footerpgPosArr;
            $fpWidth = $this->resolveDimension($fpWidth, 'width');
            $fpHeight = $this->resolveDimension($fpHeight, 'height');
            $this->writeHTMLCell($fpWidth, $fpHeight, $this->getPageWidth() - $fpLeft, -$fpTop, $footerContent, 0, 0, false, true, $fpPosition, false);
            if (!empty($this->template->ftr_txt)) {
                $footerptPosArr = $this->parsePosition($this->template->ftr_txt_pos);
                [$ftLeft, $ftTop, $ftWidth, $ftHeight, $ftPosition] = $footerptPosArr;
                $ftWidth = $this->resolveDimension($ftWidth, 'width');
                $ftHeight = $this->resolveDimension($ftHeight, 'height');
                $this->writeHTMLCell($ftWidth, $ftHeight, $this->getPageWidth() - $ftLeft, -$ftTop, $this->template->ftr_txt, 0, 0, false, true, $ftPosition, false);
            }
        } catch (Exception $e) {
            throw new Exception('Error in Footer: ' . $e->getMessage());
        }
    }
    // Helper function to parse position string
    private function parsePosition($position)
    {
        try {
            $positionArr = explode('|', $position);
            if (count($positionArr) !== 5) {
                throw new Exception('Invalid position format');
            }
            return $positionArr;
        } catch (Exception $e) {
            throw new Exception('Error parsing position: ' . $e->getMessage());
        }
    }
    // Helper function to resolve dimension
    private function resolveDimension($dimension, $type)
    {
        try {
            if (strpos(strtolower($dimension), 'p') !== false) {
                return $type === 'width' ? $this->getPageWidth() : $this->getPageHeight();
            }
            return $dimension;
        } catch (Exception $e) {
            throw new Exception('Error resolving dimension: ' . $e->getMessage());
        }
    }
    /*----------------------------------------------------------------------------------------
    PDF Styles
    ----------------------------------------------------------------------------------------*/
    public static function style()
    {
        return '<style>
        p, div{
            font-size: 11px;
            line-height: 18px;
        }
        .items-table, .total-table {
            width: 100%;
            border-collapse: collapse;
            color: #143143;
            font-size: 9px;
        }
        .items-table th, .items-table td, .total-table th, .total-table td {
            border: 1px solid #1698ba;
            font-weight:normal;
        }
        .total-table {
            width: 35%;
            color: #143143;
            font-size: 8px;
        }
        .header {
            color: #fff;
            font-weight: bold;
            font-size: 8px;
            text-transform: uppercase;
            background-color: #00aacc;
        }
        .totals-table {
            color: #002f52;
            font-size: 8px !important;
        }
        .items-total {
            color: #ffffff;
            text-transform: uppercase;
            background-color: #00aacc;
        }
        .invoice-table{
            width: 100%;
            border-collapse: collapse;
            color: #143143;
            font-size: 11px;
        }
        .fs-16 { font-size: 16px; }
        .fs-15 { font-size: 15px; }
        .fs-14 { font-size: 14px; }
        .fs-13 { font-size: 13px; }
        .fs-11 { font-size: 11px; }
        .fs-10 { font-size: 10px; }
        .fs-9 { font-size: 9px; }
        .fs-8 { font-size: 8px; }
        .fs-7 { font-size: 7px; }
        .lh-5 { line-height: 5px !important; }
        .lh-10 { line-height: 10px !important; }
        .lh-15 { line-height: 15px !important; }
        .lh-20 { line-height: 20px !important; }
        .fw-bold { font-weight: bold; }
        .heading { border-collapse: collapse !important; }
        .left { text-align: left; }
        .center { text-align: center; }
        .right { text-align: right; }
        .invoice-head{
        font-family: Arial, Helvetica, sans-serif;
        font-weight: bold;
        font-size: 36px;
        color:#002060;
        }
        .error{
        color: #ffffff;
        background-color: #ff0000;
        text-align:center;
        }
        </style>';
    }
    /*----------------------------------------------------------------------------------------
    PDF Items
    ----------------------------------------------------------------------------------------*/
    public static function generateFullTable($data, $style)
    {
        if ($data['state'] !== 'show') {
            return '';
        }
    
        // Initialize tax rates
        $discount = isset($data['tax']['discount']) ? (float) $data['tax']['discount'] : 0;
        $tds_rate = $igst_rate = $sgst_rate = $cgst_rate = 0;


        if ($data['tax']['tax_type'] != 'no-tax'){
            if ($data['tax']['tax_type'] === 'gst') {
                if ($data['tax']['state'] === 'inter') {
                    $igst_rate = isset($data['tax']['igst']) ? (float) $data['tax']['igst'] / 100 : 0;
                } else {
                    $sgst_rate = isset($data['tax']['sgst']) ? (float) $data['tax']['sgst'] / 100 : 0;
                    $cgst_rate = isset($data['tax']['cgst']) ? (float) $data['tax']['cgst'] / 100 : 0;
                }
            } else {
                $tds_rate = isset($data['tax']['tds']) ? (float) $data['tax']['tds'] / 100 : 0;
            }
        }
        $items_table = $style . '<br><table class="heading fs-11 fw-bold left" cellpadding="0"><tr><td>Service Items :</td></tr></table>';
        $items_table .= '<table cellspacing="0" cellpadding="3" border="0" class="items-table"><thead><tr class="header">
                <th class="header" align="center" width="4%"><strong>NO</strong></th>
                <th class="header" align="center" width="16%"><strong>NAME</strong></th>
                <th class="header" align="center" width="43%"><strong>DESCRIPTION</strong></th>
                <th class="header" align="center" width="15%"><strong>UNIT PRICE</strong></th>
                <th class="header" align="center" width="5%"><strong>QTY</strong></th>
                <th class="header" align="center" width="17%"><strong>AMOUNT</strong></th>
            </tr></thead><tbody>';
    
        $subtotal = 0;
        foreach ($data['items'] as $index => $item) {
            $unit_price = isset($item['unit_price']) ? (float) $item['unit_price'] : 0;
            $quantity = isset($item['quantity']) ? (int) $item['quantity'] : 0;
            $item_total = $unit_price * $quantity;
            $subtotal += $item_total;
    
            $items_table .= '<tr>
                <td align="right" width="4%">' . ($index + 1) . '</td>
                <td align="left" width="16%">' . htmlspecialchars($item['name'], ENT_QUOTES, 'UTF-8') . '</td>
                <td align="left" width="43%">' . htmlspecialchars($item['description'], ENT_QUOTES, 'UTF-8') . '</td>
                <td align="right" width="15%">₹ ' . number_format($unit_price, 2) . '</td>
                <td align="right" width="5%">' . $quantity . '</td>
                <td align="right" width="17%">₹ ' . number_format($item_total, 2) . '</td>
            </tr>';
        }
    
        $taxable = $subtotal - $discount;
        $tax_amount = $taxable * ($igst_rate + $sgst_rate + $cgst_rate);
        $total_before_tds = $taxable + $tax_amount;
        $tds = $total_before_tds * $tds_rate;
        $total = $total_before_tds - $tds;
        $round_off = round($total) - $total;
        $grand_total = $total + $round_off;
    
        $totals_table = '<table border="0" cellpadding="3" width="100%" class="totals-table">
            <tr>
                <td align="left" width="54%"><strong>SUB TOTAL</strong></td>
                <td align="center" width="5%"><strong>:</strong></td>
                <td align="right" width="41%">₹ ' . number_format($subtotal, 2) . '</td>
            </tr>';
    
        if ($discount != 0) {
            $totals_table .= '<tr>
                <td align="left" width="54%"><strong>DISCOUNT</strong></td>
                <td align="center" width="5%"><strong>:</strong></td>
                <td align="right" width="41%">₹ -' . number_format($discount, 2) . '</td>
            </tr>';
        }
    
        if ($tax_amount != 0) {
            $tax_details = [];
            if ($cgst_rate != 0 || $sgst_rate != 0) {
                $tax_details[] = 'CGST (' . $data['tax']['cgst'] . '%) + SGST (' . $data['tax']['sgst'] . '%)';
            }
            if ($igst_rate != 0) {
                $tax_details[] = 'IGST (' . $data['tax']['igst'] . '%)';
            }
            $totals_table .= '<tr>
                <td align="left" width="54%"><strong>TAX</strong> [ ' . implode(' + ', $tax_details) . ' ]</td>
                <td align="center" width="5%"><strong>:</strong></td>
                <td align="right" width="41%">₹ ' . number_format($tax_amount, 2) . '</td>
            </tr>';
        }
    
        if ($tds != 0) {
            $totals_table .= '<tr>
                <td align="left" width="54%"><strong>TAX</strong> [ TDS (' . $data['tax']['tds'] . '%) ]</td>
                <td align="center" width="5%"><strong>:</strong></td>
                <td align="right" width="41%">₹ -' . number_format($tds, 2) . '</td>
            </tr>';
        }
    
        $totals_table .= '<tr>
            <td align="left" width="54%"><strong>ROUND OFF</strong></td>
            <td align="center" width="5%"><strong>:</strong></td>
            <td align="right" width="41%">₹ ' . number_format($round_off, 2) . '</td>
            </tr>
            <tr class="items-total">
                <td align="left" width="54%"><strong>GRAND TOTAL</strong></td>
                <td align="center" width="5%"><strong>:</strong></td>
                <td align="right" width="41%">₹ ' . number_format($grand_total, 2) . '</td>
            </tr>
        </table>';
        $items_table .= '<tr><td colspan="6"><table border="0" cellpadding="0" width="100%"><tr><td width="45%" align="left"><table border="0" cellpadding="10" width="100%"><tr><td align="left"><strong class="fs-8"><br>AMOUNT IN WORDS :</strong><br>'. Helper::numberToWords($grand_total) . ' Rupees Only.</td></tr></table></td><td width="55%" align="right">' . $totals_table . '</td></tr></table></td></tr></tbody></table>';
        if($grand_total < 0) {
            return '<center><div class="error">Invalid Items Count. Check Items Once.</div></center>';
        } else {
            return $items_table;
        }
    }
    /*----------------------------------------------------------------------------------------
    PDF Content
    ----------------------------------------------------------------------------------------*/
    public static function writePDFSections($pdf, $data, $style, $full_table, $values = null)
    {
        $values = ["place_service_items_here" => $full_table];
        if ($values !== null) {
            if (is_string($values)) {
                $jsonArray = json_decode($values, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new InvalidArgumentException("Invalid JSON provided: " . json_last_error_msg());
                }
            } elseif (is_array($values)) {
                $jsonArray = $values;
            } else {
                throw new InvalidArgumentException("Invalid data type for values. Expected string or array.");
            }
            $values = array_merge($values, $jsonArray);
        }
        if (!is_string($data['data'])) {
            throw new InvalidArgumentException("Data must be a string.");
        }
        if ($data['state'] == 'show') {
            $html = DataHelper::replaceValues($data['data'], json_encode($values));
        } else {
            $html = '';
        }
        $pdf->writeHTML($html, true, false, true, false, 'J');
    }
    /*----------------------------------------------------------------------------------------
    PDF Preview Generator
    ----------------------------------------------------------------------------------------*/
    public static function document_preview($document, $doc_name = null, $doc_type, $doc_action, $values = null)
    {
        if (is_string($document) && strlen($document) === 15) {
            $columns = [
                'documents.document_id as document_id',
                'documents.ref_id as ref_id',
                'document_contents.template_id as template_id',
                'documents.content_json as json_content',
            ];
            $data = Document::select($columns)
                ->join('document_contents', 'documents.doc_cont_id', '=', 'document_contents.doc_cont_id')
                ->where('documents.document_id', $document)
                ->first();
            if (!$data) {
                throw new Exception('Document not found');
            }
            $data = json_decode($data->json_content, true);
        } else {
            $data = $document;
        }

        if (Auth::check()) {
            $short_role = UserHelper::getCurrentUser('short_role');
            $user_id = UserHelper::getCurrentUser('unique_id');
            $user_name = UserHelper::getCurrentUser('name');
        } else {
            $short_role = 'WB';
            $user_id = $data['info']['doc_cont_id'];
            $user_name = $data['info']['ref_id'];
        }

       

        $doc_cont_arr = DocumentContent::where('doc_cont_id', $data['info']['doc_cont_id'])->first();
        /*--------------Preview Document--------------*/
        $template = Template::where('template_id', $doc_cont_arr['template_id'])->firstOrFail();
        $pdf = new PDFHelper(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false, $template, $short_role, $doc_type);
        $pdf->SetCreator('G Star Elevators Pvt Ltd');
        $pdf->SetAuthor($user_name);
        $pdf->SetTitle($doc_cont_arr['title']);
        $pdf->SetSubject($doc_cont_arr['name']);
        $pdf->SetKeywords(OptionHelper::getValue($doc_cont_arr['doc_type']) . ' | ' . $user_id);
        $pdf->SetFont('dejavusans', '', 11);
        $contentAreaPos = $template->content_area;
        $contentAreaPosArr = explode('|', $contentAreaPos);
        if (count($contentAreaPosArr) !== 4) {
            throw new Exception('Invalid content area format in template');
        }
        [$cLeft, $cRight, $cTop, $cBottom] = $contentAreaPosArr;
        $pdf->SetMargins($cLeft, $cTop, $cRight, true);
        $pdf->SetAutoPageBreak(TRUE, $cBottom);
        $pdf->AddPage();
        $style = PDFHelper::style();
        $full_table = PDFHelper::generateFullTable($data['service_items'], $style);
        /*--------------Invoice Preview--------------*/
        if ($template->type == 'OPTTP2') {
            $invoice_icon = file_get_contents(public_path('treasury/favicon/invoice.svg'));
            if ($invoice_icon === false) {
                throw new Exception('Failed to load Icon image');
            }
            $pdf->ImageSVG('@' . $invoice_icon, $x = 12, $y = 20, $w = 40, $h = 40, $link = '', $align = '', $palign = '', $border = 0, $fitonpage = false);
            $company_address = $style . '<div><span class="fw-bold fs-20 left">G Star Elevator Pvt Ltd</span><br><span class="fs-10">#1, Kempanna Complex, First Floor, Opp Canara Bank, KR Layout Hosakote, Bengaluru, <br>Karnataka - 562 114</span></div>';
            $pdf->writeHTMLCell(90, '', 11, 56, $company_address, 0, 1, 0, true, 'J', true);
            $invoice_text = file_get_contents(public_path('treasury/favicon/invoice-text.svg'));
            $pdf->writeHTMLCell(85, 10, 140, 24, $style . '<div class="fs-12"><span class="fw-bold">GST IN : </span>' . $doc_cont_arr['gst_no'] . '</div>', 0, 1, 0, true, '', true);
            if ($invoice_text === false) {
                throw new Exception('Failed to load Text image');
            }
            $pdf->ImageSVG('@' . $invoice_text, $x = 127, $y = 20, $w = 60, $h = 60, $link = '', $align = '', $palign = '', $border = 0, $fitonpage = false);
            $invoice_table = $style . '<table cellspacing="0" cellpadding="1" border="0" class="invoice-table">
            <tr>
            <td width="40%" align="left">Invoice No.</td>
            <td width="3%" align="center">:</td>
            <td width="57%" align="right">' . $data['info']['document_id'] . '</td>
            </tr>
            <tr>
            <td width="40%" align="left">Due Date</td>
            <td width="3%" align="center">:</td>
            <td width="57%" align="right">' . date('d-m-Y', strtotime($data['info']['due_date'])) . '</td>
            </tr>
            <tr>
            <td width="40%" align="left">Invoice Date</td>
            <td width="3%" align="center">:</td>
            <td width="57%" align="right">' . date('d-m-Y', strtotime($data['info']['date'])) . '</td>
            </tr>
            </table>';
            $pdf->writeHTMLCell(85, 10, 114, 60, $invoice_table, 0, 1, 0, true, '', true);
            PDFHelper::writePDFSections($pdf, $data['content'], $style, $full_table, $values);
        } else if ($template->type == 'OPTTP3') {
            /*--------------Contract Preview--------------*/
            $pdf->writeHTML($style . '<div class="fs-13 fw-bold">' . $doc_cont_arr['title'] . '</div><br>', true, 0, true, 0, 'C');
            $document_date = $style . '<p class="right fs-11"><strong>Ref ID: </strong>' . $data['info']['document_id'] . '</p>';
            $pdf->writeHTML($document_date, true, 0, true, 0, 'R');
            $document_dated = ($data['info']['date'] == '') ? date('d-m-Y') : date('d-m-Y', strtotime($data['info']['date']));
            $document_date = $style . '<p class="right fs-11"><strong>Date: </strong>' . $document_dated . '</p>';
            $pdf->writeHTML($document_date, true, 0, true, 0, 'R');
            PDFHelper::writePDFSections($pdf, $data['content'], $style, $full_table, $values);
        } else {
            /*--------------Quotation Preview--------------*/
            $pdf->writeHTML($style . '<div class="fs-13 fw-bold">' . $doc_cont_arr['title'] . '</div><br>', true, 0, true, 0, 'C');
            $document_date = $style . '<p class="right fs-11"><strong>Ref ID: </strong>' . $data['info']['document_id'] . '</p>';
            $pdf->writeHTML($document_date, true, 0, true, 0, 'R');
            $document_dated = ($data['info']['date'] == '') ? date('d-m-Y') : date('d-m-Y', strtotime($data['info']['date']));
            $document_date = $style . '<p class="right fs-11"><strong>Date: </strong>' . $document_dated . '</p>';
            $pdf->writeHTML($document_date, true, 0, true, 0, 'R');
            PDFHelper::writePDFSections($pdf, $data['content'], $style, $full_table, $values);
        }
        $doc_name = $doc_name ?? $data['info']['document_id'];
        $pdfContent = $pdf->Output($doc_name . '.pdf', 'S');
        if ($doc_action == 'download') {
            return $pdf->Output($doc_name . '.pdf', 'D');
        } elseif ($doc_action == 'email' || $doc_action == 'view') {
            return $pdfContent;
        } else {
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="' . $doc_name . '.pdf"');
        }
    }


    public static function generatePDF($logoPath, $headers, $data, $fileName = 'attendance_report.pdf')
    {
        // Create new PDF instance
        $pdf = new TCPDF('L', PDF_UNIT, 'A4', true, 'UTF-8', false); // 'L' for Landscape

        // Set document information
        $pdf->SetCreator(PDF_CREATOR);
        $pdf->SetAuthor('Your Company Name');
        $pdf->SetTitle('Attendance Report');
        $pdf->SetSubject('Monthly Attendance');
        $pdf->SetKeywords('TCPDF, PDF, attendance, report');

    
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
       
        $pdf->SetFont('helvetica', '', 10);
        $pdf->SetMargins(10, 10, 10); // Adjusted for landscape

        
        $pdf->AddPage();

        // Add logo
        if (file_exists($logoPath)) {
            $pdf->Image($logoPath, 10, 10, 50); // Adjust x, y, and size as needed
            $pdf->Ln(20); // Move cursor down after logo
        }

        $pdf->SetFont('helvetica', 'B', 16);
        $pdf->Cell(0, 10, 'Monthly Attendance Report', 0, 1, 'C');
        $pdf->Ln(5);

       
        $pdf->SetFont('helvetica', '', 12);
        $pdf->Cell(0, 10, 'Attendance Report for ' . date('F Y'), 0, 1, 'C');
        $pdf->Ln(10);

    
        $html = '
        <style>
            table {
                border-collapse: collapse;
                width: 100%;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f4f4f4;
                font-weight: bold;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
        </style>
        <table>';

        // Table headers
        $html .= '<thead><tr>';
        foreach ($headers as $header) {
            $html .= '<th>' . htmlspecialchars($header, ENT_QUOTES) . '</th>';
        }
        $html .= '</tr></thead>';

        // Table data
        $html .= '<tbody>';
        foreach ($data as $row) {
            $html .= '<tr>';
            foreach ($row as $cell) {
                $html .= '<td>' . htmlspecialchars($cell, ENT_QUOTES) . '</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</tbody>';
        $html .= '</table>';

        // Write the HTML content to the PDF
        $pdf->writeHTML($html, true, false, true, false, '');

        // Output the PDF
        $pdf->Output($fileName, 'I'); // 'I' to display in browser; 'D' to force download
    }

}

