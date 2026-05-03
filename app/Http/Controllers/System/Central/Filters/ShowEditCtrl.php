<?php

namespace App\Http\Controllers\System\Central\Filters;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};

/**
 * Controller for rendering the edit form for Filters entities.
 */
class ShowEditCtrl extends Controller
{
    /**
     * Renders a popup form for editing Filters entities.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            $reqSet = Skeleton::resolveToken($token);
            Developer::info($reqSet);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => [$reqSet['act'] => $reqSet['id']]]);
            Developer::info($result);
            $dataItem = $result['data'][0] ?? null;
            $data = is_array($dataItem) ? (object) $dataItem : $dataItem;
            if (!$data) {
                return ResponseHelper::moduleError('Record Not Found', 'The requested record was not found.', 404);
            }
            $popup = [];
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'central_sun_master_leads':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'li_company_name', 'label' => 'Name', 'value' => $data->li_company_name, 'required' => true, 'col' => '12'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Filters Entity',
                        'button' => 'Update Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                    case 'central_need_action_contacts':
                        $popup = [
                            'form' => 'builder',
                            'labelType' => 'floating',
                            'fields' => [
                                ['type' => 'text', 'name' => 'li_company_name', 'label' => 'Company Name', 'value' => $data->li_company_name, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_full_name', 'label' => 'Full Name', 'value' => $data->li_full_name, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_first_name', 'label' => 'First Name', 'value' => $data->li_first_name, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_middle_name', 'label' => 'Middle Name', 'value' => $data->li_middle_name, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_last_name', 'label' => 'Last Name', 'value' => $data->li_last_name, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_first_name_initial', 'label' => 'First Initial', 'value' => $data->li_first_name_initial, 'col' => '6'],
                                ['type' => 'text', 'name/snippet', 'name' => 'li_last_name_initial', 'label' => 'Last Initial', 'value' => $data->li_last_name_initial, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_smtp', 'label' => 'SMTP', 'value' => $data->li_smtp, 'col' => '6'],
                                ['type' => 'text', 'name' => 'revenue', 'label' => 'Revenue', 'value' => $data->revenue, 'col' => '6'],
                                ['type' => 'text', 'name' => 'employee_size', 'label' => 'Employee Size', 'value' => $data->employee_size, 'col' => '6'],
                                ['type' => 'text', 'name' => 'industry', 'label' => 'Industry', 'value' => $data->industry, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_company_id', 'label' => 'Company ID', 'value' => $data->li_company_id, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_job_title', 'label' => 'Job Title', 'value' => $data->li_job_title, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_designation', 'label' => 'Designation', 'value' => $data->dls_designation, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_managementlevel', 'label' => 'Management Level', 'value' => $data->dls_managementlevel, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_jobfunction', 'label' => 'Job Function', 'value' => $data->dls_jobfunction, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'li_Contact_summary', 'label' => 'Contact Summary', 'value' => $data->li_Contact_summary, 'col' => '12'],
                                ['type' => 'text', 'name' => 'li_contact_industry', 'label' => 'Contact Industry', 'value' => $data->li_contact_industry, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_duration_in_role', 'label' => 'Duration in Role', 'value' => $data->li_duration_in_role, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_profile_url', 'label' => 'Profile URL', 'value' => $data->li_profile_url, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_salesnav_profile_url', 'label' => 'SalesNav URL', 'value' => $data->li_salesnav_profile_url, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_contact_location', 'label' => 'Contact Location', 'value' => $data->li_contact_location, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_contact_country', 'label' => 'Contact Country', 'value' => $data->li_contact_country, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_contact_query', 'label' => 'Contact Query', 'value' => $data->li_contact_query, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'li_title_description', 'label' => 'Title Description', 'value' => $data->li_title_description, 'col' => '12'],
                                ['type' => 'textarea', 'name' => 'li_skills', 'label' => 'Skills', 'value' => $data->li_skills, 'col' => '12'],
                                ['type' => 'textarea', 'name' => 'li_certifications', 'label' => 'Certifications', 'value' => $data->li_certifications, 'col' => '12'],
                                ['type' => 'text', 'name' => 'li_company_location', 'label' => 'Company Location', 'value' => $data->li_company_location, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_contact_url', 'label' => 'Contact URL', 'value' => $data->li_contact_url, 'col' => '6'],
                                ['type' => 'text', 'name' => 'email', 'label' => 'Email', 'value' => $data->email, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_ooo_status', 'label' => 'OOO Status', 'value' => $data->dls_ooo_status, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_uns_status', 'label' => 'Unsubscribe Status', 'value' => $data->dls_uns_status, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_bounce_status', 'label' => 'Bounce Status', 'value' => $data->dls_bounce_status, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_mail_send_status', 'label' => 'Mail Send Status', 'value' => $data->dls_mail_send_status, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_mailer_status', 'label' => 'Mailer Status', 'value' => $data->dls_mailer_status, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'dls_bounce_reason', 'label' => 'Bounce Reason', 'value' => $data->dls_bounce_reason, 'col' => '12'],
                                ['type' => 'text', 'name' => 'dls_lead_generated_date', 'label' => 'Lead Generated Date', 'value' => $data->dls_lead_generated_date, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_lead_response', 'label' => 'Lead Response', 'value' => $data->dls_lead_response, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_dnd_status', 'label' => 'DND Status', 'value' => $data->dls_dnd_status, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_direct_dial', 'label' => 'Direct Dial', 'value' => $data->dls_direct_dial, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_mobile', 'label' => 'Mobile', 'value' => $data->dls_mobile, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_cell_phone', 'label' => 'Cell Phone', 'value' => $data->dls_cell_phone, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_phone_telephone', 'label' => 'Telephone', 'value' => $data->dls_phone_telephone, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_office_number', 'label' => 'Office Number', 'value' => $data->dls_office_number, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_others_unknown', 'label' => 'Other Numbers', 'value' => $data->dls_others_unknown, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'dls_additional_notes', 'label' => 'Additional Notes', 'value' => $data->dls_additional_notes, 'col' => '12'],
                                ['type' => 'text', 'name' => 'dls_email_number', 'label' => 'Email Number', 'value' => $data->dls_email_number, 'col' => '6'],
                                ['type' => 'text', 'name' => 'dls_fax_number', 'label' => 'Fax Number', 'value' => $data->dls_fax_number, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'gs_company_address', 'label' => 'GS Company Address', 'value' => $data->gs_company_address, 'col' => '12'],
                                ['type' => 'text', 'name' => 'gs_street', 'label' => 'GS Street', 'value' => $data->gs_street, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_city', 'label' => 'GS City', 'value' => $data->gs_city, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_state', 'label' => 'GS State', 'value' => $data->gs_state, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_zipcode', 'label' => 'GS Zipcode', 'value' => $data->gs_zipcode, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_country', 'label' => 'GS Country', 'value' => $data->gs_country, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_zone_region', 'label' => 'GS Zone Region', 'value' => $data->gs_zone_region, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_company_name', 'label' => 'GS Company Name', 'value' => $data->gs_company_name, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_phone_number', 'label' => 'GS Phone Number', 'value' => $data->gs_phone_number, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_country_code', 'label' => 'GS Country Code', 'value' => $data->gs_country_code, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_plus_code', 'label' => 'GS Plus Code', 'value' => $data->gs_plus_code, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_category', 'label' => 'GS Category', 'value' => $data->gs_category, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_place_url', 'label' => 'GS Place URL', 'value' => $data->gs_place_url, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_smtp', 'label' => 'GS SMTP', 'value' => $data->gs_smtp, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_title', 'label' => 'GS Title', 'value' => $data->gs_title, 'col' => '6'],
                                ['type' => 'text', 'name' => 'gs_website', 'label' => 'GS Website', 'value' => $data->gs_website, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_linkedin_contact_url', 'label' => 'LinkedIn URL', 'value' => $data->ap_linkedin_contact_url, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_full_name', 'label' => 'AP Full Name', 'value' => $data->ap_full_name, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_contact_city', 'label' => 'Contact City', 'value' => $data->ap_contact_city, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_contact_state', 'label' => 'Contact State', 'value' => $data->ap_contact_state, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_contact_country', 'label' => 'Contact Country', 'value' => $data->ap_contact_country, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_contact_twitter_url', 'label' => 'Twitter URL', 'value' => $data->ap_contact_twitter_url, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_contact_facebook_url', 'label' => 'Facebook URL', 'value' => $data->ap_contact_facebook_url, 'col' => '6'],
                                ['type' => 'text', 'name' => 'last_contact_date', 'label' => 'Last Contact Date', 'value' => $data->last_contact_date, 'col' => '6'],
                                ['type' => 'text', 'name' => 'reference_1', 'label' => 'Reference 1', 'value' => $data->reference_1, 'col' => '6'],
                                ['type' => 'text', 'name' => 'created_by', 'label' => 'Created By', 'value' => $data->created_by, 'col' => '6', 'readonly' => true],
                                ['type' => 'text', 'name' => 'updated_by', 'label' => 'Updated By', 'value' => $data->updated_by, 'col' => '6', 'readonly' => true],
                                ['type' => 'text', 'name' => 'created_at', 'label' => 'Created At', 'value' => $data->created_at, 'col' => '6', 'readonly' => true],
                                ['type' => 'text', 'name' => 'updated_at', 'label' => 'Updated At', 'value' => $data->updated_at, 'col' => '6', 'readonly' => true],
                                ['type' => 'text', 'name' => 'deleted_at', 'label' => 'Deleted At', 'value' => $data->deleted_at, 'col' => '6', 'readonly' => true],
                            ],
                            'type' => 'modal',
                            'size' => 'modal-xxl',
                            'position' => 'end',
                            'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Contact Entity',
                            'button' => 'Update Entity',
                            'script' => 'window.skeleton.select();window.skeleton.unique();'
                        ];
                        break;


                case 'central_pluto_product_unsubscribe':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'account_email', 'label' => 'Account Email', 'value' => $data->account_email, 'col' => '6'],
                            ['type' => 'text', 'name' => 'from', 'label' => 'From', 'value' => $data->from, 'col' => '6'],
                            ['type' => 'text', 'name' => 'subject', 'label' => 'Subject', 'value' => $data->subject, 'col' => '6'],
                            ['type' => 'text', 'name' => 'received_at', 'label' => 'Received At', 'value' => $data->received_at, 'col' => '6'],
                            ['type' => 'text', 'name' => 'status', 'label' => 'Status', 'value' => $data->status, 'col' => '6'],
                            ['type' => 'text', 'name' => 'campaign_id', 'label' => 'Campaign ID', 'value' => $data->campaign_id, 'col' => '6'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-xxl',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Unsubscribe Entity',
                        'button' => 'Update Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;

                    case 'central_need_action_companies':
                        $popup = [
                            'form' => 'builder',
                            'labelType' => 'floating',
                            'fields' => [
                                ['type' => 'text', 'name' => 'li_smtp', 'label' => 'SMTP', 'value' => $data->li_smtp, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_company_name', 'label' => 'Company Name', 'value' => $data->li_company_name, 'required' => true, 'col' => '12'],
                                ['type' => 'text', 'name' => 'li_company_employee_size', 'label' => 'Employee Size', 'value' => $data->li_company_employee_size, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_company_industry', 'label' => 'Industry', 'value' => $data->li_company_industry, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_industry_relavance', 'label' => 'Industry Relevance', 'value' => $data->li_industry_relavance, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_industry_mapping', 'label' => 'Industry Mapping', 'value' => $data->li_industry_mapping, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_company_id', 'label' => 'Company ID', 'value' => $data->li_company_id, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_company_url', 'label' => 'Company URL', 'value' => $data->li_company_url, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'li_company_specialties', 'label' => 'Specialties', 'value' => $data->li_company_specialties, 'col' => '12'],
                                ['type' => 'textarea', 'name' => 'li_company_description', 'label' => 'Description', 'value' => $data->li_company_description, 'col' => '12'],
                                ['type' => 'text', 'name' => 'li_tag_line', 'label' => 'Tag Line', 'value' => $data->li_tag_line, 'col' => '6'],
                                ['type' => 'text', 'name' => 'employees_on_linked_in', 'label' => 'Employees on LinkedIn', 'value' => $data->employees_on_linked_in, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_company_founded', 'label' => 'Founded Year', 'value' => $data->li_company_founded, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_company_headquarters', 'label' => 'Headquarters', 'value' => $data->li_company_headquarters, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_company_headquarters_country', 'label' => 'HQ Country', 'value' => $data->li_company_headquarters_country, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_hq_number', 'label' => 'HQ Number', 'value' => $data->li_hq_number, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_is_admin', 'label' => 'Is Admin', 'value' => $data->li_is_admin, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_logo', 'label' => 'Logo URL', 'value' => $data->li_logo, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_banner', 'label' => 'Banner URL', 'value' => $data->li_banner, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_follower_count', 'label' => 'Follower Count', 'value' => $data->li_follower_count, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_website', 'label' => 'Website', 'value' => $data->li_website, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_type', 'label' => 'Type', 'value' => $data->li_type, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_hq_address', 'label' => 'HQ Address', 'value' => $data->li_hq_address, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_industry_code', 'label' => 'Industry Code', 'value' => $data->li_industry_code, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_company_query', 'label' => 'Company Query', 'value' => $data->li_company_query, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_timestamp', 'label' => 'Timestamp', 'value' => $data->li_timestamp, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_is_claimable', 'label' => 'Is Claimable', 'value' => $data->li_is_claimable, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'li_error', 'label' => 'Error', 'value' => $data->li_error, 'col' => '12'],
                                ['type' => 'text', 'name' => 'li_location_branch', 'label' => 'Location Branch', 'value' => $data->li_location_branch, 'col' => '6'],
                                ['type' => 'text', 'name' => 'li_location_sub_branch', 'label' => 'Sub Branch', 'value' => $data->li_location_sub_branch, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'li_competitors', 'label' => 'Competitors', 'value' => $data->li_competitors, 'col' => '12'],
                                ['type' => 'textarea', 'name' => 'li_company_about', 'label' => 'About', 'value' => $data->li_company_about, 'col' => '12'],
                                ['type' => 'text', 'name' => 'lic_company_name', 'label' => 'LIC Company Name', 'value' => $data->lic_company_name, 'col' => '6'],
                                ['type' => 'text', 'name' => 'lic_company_id', 'label' => 'LIC Company ID', 'value' => $data->lic_company_id, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_industry', 'label' => 'AP Industry', 'value' => $data->ap_industry, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'ap_company_keywords', 'label' => 'AP Keywords', 'value' => $data->ap_company_keywords, 'col' => '12'],
                                ['type' => 'text', 'name' => 'ap_company_city', 'label' => 'AP City', 'value' => $data->ap_company_city, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_company_state', 'label' => 'AP State', 'value' => $data->ap_company_state, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_company_country', 'label' => 'AP Country', 'value' => $data->ap_company_country, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_company_linkedin_url', 'label' => 'AP LinkedIn', 'value' => $data->ap_company_linkedin_url, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_company_twitter_url', 'label' => 'AP Twitter', 'value' => $data->ap_company_twitter_url, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_company_facebook_url', 'label' => 'AP Facebook', 'value' => $data->ap_company_facebook_url, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'ap_company_phone_numbers', 'label' => 'AP Phone Numbers', 'value' => $data->ap_company_phone_numbers, 'col' => '12'],
                                ['type' => 'text', 'name' => 'ap_company_name', 'label' => 'AP Company Name', 'value' => $data->ap_company_name, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_company_website', 'label' => 'AP Website', 'value' => $data->ap_company_website, 'col' => '6'],
                                ['type' => 'text', 'name' => 'ap_company_smtp', 'label' => 'AP SMTP', 'value' => $data->ap_company_smtp, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'zm_technologies', 'label' => 'Technologies', 'value' => $data->zm_technologies, 'col' => '12'],
                                ['type' => 'text', 'name' => 'zm_revenue_size', 'label' => 'Revenue Size', 'value' => $data->zm_revenue_size, 'col' => '6'],
                                ['type' => 'text', 'name' => 'zm_company', 'label' => 'ZM Company', 'value' => $data->zm_company, 'col' => '6'],
                                ['type' => 'text', 'name' => 'zm_location', 'label' => 'ZM Location', 'value' => $data->zm_location, 'col' => '6'],
                                ['type' => 'text', 'name' => 'zm_industry', 'label' => 'ZM Industry', 'value' => $data->zm_industry, 'col' => '6'],
                                ['type' => 'text', 'name' => 'zm_empyoyee_size', 'label' => 'Employee Size (ZM)', 'value' => $data->zm_empyoyee_size, 'col' => '6'],
                                ['type' => 'text', 'name' => 'zm_website', 'label' => 'ZM Website', 'value' => $data->zm_website, 'col' => '6'],
                                ['type' => 'text', 'name' => 'zm_smtp', 'label' => 'ZM SMTP', 'value' => $data->zm_smtp, 'col' => '6'],
                                ['type' => 'text', 'name' => 'zm_country', 'label' => 'ZM Country', 'value' => $data->zm_country, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'zm_summary', 'label' => 'ZM Summary', 'value' => $data->zm_summary, 'col' => '12'],
                                ['type' => 'text', 'name' => 'zm_sic_codes', 'label' => 'SIC Codes', 'value' => $data->zm_sic_codes, 'col' => '6'],
                                ['type' => 'text', 'name' => 'zm_naics_codes', 'label' => 'NAICS Codes', 'value' => $data->zm_naics_codes, 'col' => '6'],
                                ['type' => 'text', 'name' => 'py_smtp', 'label' => 'PY SMTP', 'value' => $data->py_smtp, 'col' => '6'],
                                ['type' => 'text', 'name' => 'py_title', 'label' => 'PY Title', 'value' => $data->py_title, 'col' => '6'],
                                ['type' => 'textarea', 'name' => 'py_keywords', 'label' => 'PY Keywords', 'value' => $data->py_keywords, 'col' => '12'],
                                ['type' => 'textarea', 'name' => 'py_description', 'label' => 'PY Description', 'value' => $data->py_description, 'col' => '12'],
                                ['type' => 'text', 'name' => 'reference_1', 'label' => 'Reference 1', 'value' => $data->reference_1, 'col' => '6'],
                                ['type' => 'text', 'name' => 'created_at', 'label' => 'Created At', 'value' => $data->created_at, 'col' => '6', 'readonly' => true],
                                ['type' => 'text', 'name' => 'updated_at', 'label' => 'Updated At', 'value' => $data->updated_at, 'col' => '6', 'readonly' => true],
                                ['type' => 'text', 'name' => 'created_by', 'label' => 'Created By', 'value' => $data->created_by, 'col' => '6', 'readonly' => true],
                                ['type' => 'text', 'name' => 'updated_by', 'label' => 'Updated By', 'value' => $data->updated_by, 'col' => '6', 'readonly' => true],
                                ['type' => 'text', 'name' => 'deleted_at', 'label' => 'Deleted At', 'value' => $data->deleted_at, 'col' => '6', 'readonly' => true],
                            ],
                            'type' => 'modal',
                            'size' => 'modal-xxl',
                            'position' => 'end',
                            'label' => '<i class="fa-regular fa-building me-1"></i> Edit Company Entity',
                            'button' => 'Update Entity',
                            'script' => 'window.skeleton.select();window.skeleton.unique();'
                        ];
                        break;
                    case 'central_unique_products':
                    $popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            // ['type' => 'text', 'name' => 'product_id', 'label' => 'Product ID', 'value' => $data->product_id, 'col' => '6'],

                            // ✅ Product Parent fields
                            ['type' => 'text', 'name' => 'pp_id', 'label' => 'Product Parent ID', 'value' => $data->pp_id ?? '', 'col' => '6'],
                            ['type' => 'text', 'name' => 'pp_name', 'label' => 'Product Parent Name', 'value' => $data->pp_name ?? '', 'col' => '6'],

                            // ✅ Existing fields
                            ['type' => 'text', 'name' => 'product_name', 'label' => 'Product Name', 'value' => $data->product_name, 'col' => '6'],
                            ['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $data->description, 'col' => '12'],
                            ['type' => 'textarea', 'name' => 'source_description', 'label' => 'Source Description', 'value' => $data->source_description, 'col' => '12'],
                            ['type' => 'textarea', 'name' => 'companies', 'label' => 'Companies', 'value' => $data->companies, 'col' => '6'],
                            ['type' => 'textarea', 'name' => 'contacts', 'label' => 'Contacts', 'value' => $data->contacts, 'col' => '6'],

                            ['type' => 'number', 'name' => 'contacts_count', 'label' => 'Contacts Count', 'value' => $data->contacts_count, 'col' => '6'],
                            ['type' => 'number', 'name' => 'companies_count', 'label' => 'Companies Count', 'value' => $data->companies_count, 'col' => '6'],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-xxl',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit Product Entity',
                        'button' => 'Update Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;


                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            $content = $popup['form'] === 'builder' ? PopupHelper::generateBuildForm($token, $popup['fields'], $popup['labelType']) : $popup['content'];
            return response()->json([
                'token' => $token,
                'type' => $popup['type'],
                'size' => $popup['size'],
                'position' => $popup['position'],
                'label' => $popup['label'],
                'content' => $content,
                'script' => $popup['script'],
                'button_class' => $popup['button_class'] ?? '',
                'button' => $popup['button'] ?? '',
                'footer' => $popup['footer'] ?? '',
                'header' => $popup['header'] ?? '',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true,
                'title' => 'Form Generated',
                'message' => 'Edit form for ' . $reqSet['key'] . ' generated successfully.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
