<?php
namespace App\Http\Controllers\System\Central\Filters;
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
/**
 * Controller for saving updated Filters entities.
 */
class SaveEditCtrl extends Controller
{
    /**
     * Saves updated Filters entity data based on validated input.
     *
     * @param Request $request HTTP request containing form data and token
     * @return JsonResponse JSON response with status, title, and message
     */
    public function index(Request $request): JsonResponse
    {
        try {

            $token = $request->input('save_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.');
            }

            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }

            $byMeta = $timestampMeta = true;
            $reloadTable = $reloadCard = false;
            $validated = [];
            $title = 'Success';
            $message = 'Record updated successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/

            switch ($reqSet['key']) {
                case 'central_need_action_contacts':
                    $validator = Validator::make($request->all(), [
                        'li_company_name' => 'required|string',
                        'li_full_name' => 'nullable|string',
                        'li_first_name' => 'nullable|string',
                        'li_middle_name' => 'nullable|string',
                        'li_last_name' => 'nullable|string',
                        'li_first_name_initial' => 'nullable|string',
                        'li_last_name_initial' => 'nullable|string',
                        'li_smtp' => 'nullable|string',
                        'revenue' => 'nullable|string',
                        'employee_size' => 'nullable|string',
                        'industry' => 'nullable|string',
                        'li_company_id' => 'nullable|string',
                        'li_job_title' => 'nullable|string',
                        'dls_designation' => 'nullable|string',
                        'dls_managementlevel' => 'nullable|string',
                        'dls_jobfunction' => 'nullable|string',
                        'li_contact_summary' => 'nullable|string',
                        'li_contact_industry' => 'nullable|string',
                        'li_duration_in_role' => 'nullable|string',
                        'li_profile_url' => 'nullable|string',
                        'li_salesnav_profile_url' => 'nullable|string',
                        'li_contact_location' => 'nullable|string',
                        'li_contact_country' => 'nullable|string',
                        'li_contact_query' => 'nullable|string',
                        'li_title_description' => 'nullable|string',
                        'li_skills' => 'nullable|string',
                        'li_certifications' => 'nullable|string',
                        'li_company_location' => 'nullable|string',
                        'li_contact_url' => 'nullable|string',
                        'email' => 'nullable|email',
                        'dls_ooo_status' => 'nullable|string',
                        'dls_uns_status' => 'nullable|string',
                        'dls_bounce_status' => 'nullable|string',
                        'dls_mail_send_status' => 'nullable|string',
                        'dls_mailer_status' => 'nullable|string',
                        'dls_bounce_reason' => 'nullable|string',
                        'dls_lead_generated_date' => 'nullable|date',
                        'dls_lead_response' => 'nullable|string',
                        'dls_dnd_status' => 'nullable|string',
                        'dls_direct_dial' => 'nullable|string',
                        'dls_mobile' => 'nullable|string',
                        'dls_cell_phone' => 'nullable|string',
                        'dls_phone_telephone' => 'nullable|string',
                        'dls_office_number' => 'nullable|string',
                        'dls_others_unknown' => 'nullable|string',
                        'dls_additional_notes' => 'nullable|string',
                        'dls_email_number' => 'nullable|string',
                        'dls_fax_number' => 'nullable|string',
                        'gs_company_address' => 'nullable|string',
                        'gs_street' => 'nullable|string',
                        'gs_city' => 'nullable|string',
                        'gs_state' => 'nullable|string',
                        'gs_zipcode' => 'nullable|string',
                        'gs_country' => 'nullable|string',
                        'gs_zone_region' => 'nullable|string',
                        'gs_company_name' => 'nullable|string',
                        'gs_phone_number' => 'nullable|string',
                        'gs_country_code' => 'nullable|string',
                        'gs_plus_code' => 'nullable|string',
                        'gs_category' => 'nullable|string',
                        'gs_place_url' => 'nullable|string',
                        'gs_smtp' => 'nullable|string',
                        'gs_title' => 'nullable|string',
                        'gs_website' => 'nullable|string',
                        'ap_linkedin_contact_url' => 'nullable|string',
                        'ap_full_name' => 'nullable|string',
                        'ap_contact_city' => 'nullable|string',
                        'ap_contact_state' => 'nullable|string',
                        'ap_contact_country' => 'nullable|string',
                        'ap_contact_twitter_url' => 'nullable|string',
                        'ap_contact_facebook_url' => 'nullable|string',
                        'need_to_action' => 'nullable|in:0,1',
                        'last_contact_date' => 'nullable|date',
                        'reference_1' => 'nullable|string',
                        'reference_2' => 'nullable|string',
                        'reference_3' => 'nullable|string',
                        'reference_4' => 'nullable|string',
                        'reference_5' => 'nullable|string',
                        'reference_6' => 'nullable|string',
                        'reference_7' => 'nullable|string',
                        'reference_8' => 'nullable|string',
                        'reference_9' => 'nullable|string',
                        'reference_10' => 'nullable|string',
                        'created_by' => 'nullable|string',
                        'updated_by' => 'nullable|string',
                        'created_at' => 'nullable|date',
                        'updated_at' => 'nullable|date',
                        'deleted_at' => 'nullable|date',
                    ]);
                
                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }
                
                    $validated = $validator->validated();
                    
                    // Set current date if last_contact_date is not provided
                    if (empty($validated['last_contact_date'])) {
                        $validated['last_contact_date'] = now()->toDateString();
                    }
                    $validated['need_to_action'] = 0;
                    $reloadTable = true;
                    $title = 'Contact';
                    $message = 'updated successfully.';
                    break;



                    case 'central_need_action_companies':
                        $validator = Validator::make($request->all(), [
                            'li_smtp' => 'nullable|string',
                            'li_company_name' => 'required|string',
                            'li_company_employee_size' => 'nullable|string',
                            'li_company_industry' => 'nullable|string',
                            'li_industry_relavance' => 'nullable|string',
                            'li_industry_mapping' => 'nullable|string',
                            'li_company_id' => 'nullable|string',
                            'li_company_url' => 'nullable|string',
                            'li_company_specialties' => 'nullable|string',
                            'li_company_description' => 'nullable|string',
                            'li_tag_line' => 'nullable|string',
                            'employees_on_linked_in' => 'nullable|string',
                            'li_company_founded' => 'nullable|string',
                            'li_company_headquarters' => 'nullable|string',
                            'li_company_headquarters_country' => 'nullable|string',
                            'li_hq_number' => 'nullable|string',
                            'li_is_admin' => 'nullable|string',
                            'li_logo' => 'nullable|string',
                            'li_banner' => 'nullable|string',
                            'li_follower_count' => 'nullable|string',
                            'li_website' => 'nullable|string',
                            'li_type' => 'nullable|string',
                            'li_hq_address' => 'nullable|string',
                            'li_industry_code' => 'nullable|string',
                            'li_company_query' => 'nullable|string',
                            'li_timestamp' => 'nullable|string',
                            'li_is_claimable' => 'nullable|string',
                            'li_error' => 'nullable|string',
                            'li_location_branch' => 'nullable|string',
                            'li_location_sub_branch' => 'nullable|string',
                            'li_competitors' => 'nullable|string',
                            'li_company_about' => 'nullable|string',
                            'lic_company_name' => 'nullable|string',
                            'lic_company_id' => 'nullable|string',
                            'ap_industry' => 'nullable|string',
                            'ap_company_keywords' => 'nullable|string',
                            'ap_company_city' => 'nullable|string',
                            'ap_company_state' => 'nullable|string',
                            'ap_company_country' => 'nullable|string',
                            'ap_company_linkedin_url' => 'nullable|string',
                            'ap_company_twitter_url' => 'nullable|string',
                            'ap_company_facebook_url' => 'nullable|string',
                            'ap_company_phone_numbers' => 'nullable|string',
                            'ap_company_name' => 'nullable|string',
                            'ap_company_website' => 'nullable|string',
                            'ap_company_smtp' => 'nullable|string',
                            'zm_technologies' => 'nullable|string',
                            'zm_revenue_size' => 'nullable|string',
                            'zm_company' => 'nullable|string',
                            'zm_location' => 'nullable|string',
                            'zm_industry' => 'nullable|string',
                            'zm_empyoyee_size' => 'nullable|string',
                            'zm_website' => 'nullable|string',
                            'zm_smtp' => 'nullable|string',
                            'zm_country' => 'nullable|string',
                            'zm_summary' => 'nullable|string',
                            'zm_sic_codes' => 'nullable|string',
                            'zm_naics_codes' => 'nullable|string',
                            'py_smtp' => 'nullable|string',
                            'py_title' => 'nullable|string',
                            'py_keywords' => 'nullable|string',
                            'py_description' => 'nullable|string',
                            'py_fetched_by' => 'nullable|string',
                            'need_to_action' => 'nullable|in:0,1',
                            'reference_1' => 'nullable|string',
                            'reference_2' => 'nullable|string',
                            'reference_3' => 'nullable|string',
                            'reference_4' => 'nullable|string',
                            'reference_5' => 'nullable|string',
                            'reference_6' => 'nullable|string',
                            'reference_7' => 'nullable|string',
                            'reference_8' => 'nullable|string',
                            'reference_9' => 'nullable|string',
                            'reference_10' => 'nullable|string',
                            'created_at' => 'nullable|date',
                            'updated_at' => 'nullable|date',
                            'created_by' => 'nullable|string',
                            'updated_by' => 'nullable|string',
                            'deleted_at' => 'nullable|date',
                        ]);
                    
                        if ($validator->fails()) {
                            return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                        }
                    
                        $validated = $validator->validated();
                    
                       
                        $validated['need_to_action'] = 0;
                        $reloadTable = true;
                        $title = 'Company';
                        $message = 'updated successfully.';
                        break;

                case 'central_pluto_product_unsubscribe':
                    $validator = Validator::make($request->all(), [

                        'account_email' => 'nullable|string',
                        'from' => 'nullable|string',
                        'subject' => 'nullable|string',
                        'received_at' => 'nullable|string',
                        'status' => 'nullable|string',
                        'campaign_id' => 'nullable|string',

                    
                    ]);

                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }

                    $validated = $validator->validated();

                    $reloadTable = true;
                    $title = 'Entity Updated';
                    $message = 'Entity configuration updated successfully.';
                    break;

                    case 'central_unique_products':
                    $validator = Validator::make($request->all(), [
                        'pp_id'              => 'nullable|string|max:50',   // ✅ New
                        'pp_name'            => 'nullable|string|max:255',  // ✅ New
                        'product_id'         => 'nullable|string',
                        'product_name'       => 'nullable|string',
                        'description'        => 'nullable|string',
                        'source_description' => 'nullable|string',
                        'companies'          => 'nullable|string', // or 'nullable|json' if JSON format
                        'contacts'           => 'nullable|string', // or 'nullable|json' if JSON format
                        'contacts_count'     => 'nullable|integer',
                        'companies_count'    => 'nullable|integer',
                    ]);

                    if ($validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                    }

                    $validated = $validator->validated();
                    $reloadTable = true;
                    $title = 'Product "' . ($validated['product_name'] ?? '') . '" Updated';
                    $message = 'successfully.';
                    break;



                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/

            if ($byMeta || $timestampMeta) {
                if ($byMeta) {
                    $validated['updated_by'] = Skeleton::getAuthenticatedUser()->username;
                }
                if ($timestampMeta) {
                    $validated['updated_at'] = now();
                }
            }


            $affected = Data::update('central', $reqSet['table'], $validated, [$reqSet['act'] => $reqSet['id']], $reqSet['key']);

            return response()->json([
                'status' => $affected > 0,
                'reload_table' => $reloadTable,
                'reload_card' => $reloadCard,
                'token' => $reqSet['token'],
                'affected' => $affected,
                'title' => $affected > 0 ? $title : 'Failed',
                'message' => $affected > 0 ? $message : 'No changes were made.'
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.');
        }
    }
}