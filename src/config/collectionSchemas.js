/**
 * Collection Schemas Registry
 * 
 * Predefined schemas for known collections.
 * Used as fallback when collections are empty (no documents to sample).
 * 
 * This solves the issue where header mapping fails for empty collections.
 */

// Master Leads - 89 columns from MySQL structure
const MASTER_LEADS_COLUMNS = [
  'id',
  'li_company_name',
  'li_full_name',
  'li_first_name',
  'li_middle_name',
  'li_last_name',
  'li_first_name_initial',
  'li_last_name_initial',
  'li_smtp',
  'revenue',
  'employee_size',
  'industry',
  'li_company_id',
  'li_job_title',
  'dls_designation',
  'dls_managementlevel',
  'dls_jobfunction',
  'li_Contact_summary',
  'li_contact_industry',
  'li_duration_in_role',
  'li_profile_url',
  'li_salesnav_profile_url',
  'li_contact_location',
  'li_contact_country',
  'li_contact_query',
  'li_title_description',
  'li_skills',
  'li_certifications',
  'li_company_location',
  'li_contact_url',
  'email',
  'dls_ooo_status',
  'dls_uns_status',
  'dls_bounce_status',
  'dls_mail_send_status',
  'dls_mailer_status',
  'dls_bounce_reason',
  'dls_lead_generated_date',
  'dls_lead_response',
  'dls_dnd_status',
  'dls_direct_dial',
  'dls_mobile',
  'dls_cell_phone',
  'dls_phone_telephone',
  'dls_office_number',
  'dls_others_unknown',
  'dls_additional_notes',
  'dls_email_number',
  'dls_fax_number',
  'gs_company_address',
  'gs_street',
  'gs_city',
  'gs_state',
  'gs_zipcode',
  'gs_country',
  'gs_zone_region',
  'gs_company_name',
  'gs_phone_number',
  'gs_country_code',
  'gs_plus_code',
  'gs_category',
  'gs_place_url',
  'gs_smtp',
  'gs_title',
  'gs_website',
  'ap_linkedin_contact_url',
  'ap_full_name',
  'ap_contact_city',
  'ap_contact_state',
  'ap_contact_country',
  'ap_contact_twitter_url',
  'ap_contact_facebook_url',
  'need_to_action',
  'last_contact_date',
  'reference_1',
  'reference_2',
  'reference_3',
  'reference_4',
  'reference_5',
  'reference_6',
  'reference_7',
  'reference_8',
  'reference_9',
  'reference_10',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
  'deleted_at'
];

// Master Accounts - from existing schema
const MASTER_ACCOUNTS_COLUMNS = [
  'id',
  'li_smtp',
  'li_company_name',
  'li_company_employee_size',
  'li_company_industry',
  'li_industry_relavance',
  'li_industry_mapping',
  'li_company_id',
  'li_company_url',
  'li_company_specialties',
  'li_company_description',
  'li_tag_line',
  'employees_on_linked_in',
  'li_company_founded',
  'li_company_headquarters',
  'li_company_headquarters_country',
  'li_hq_number',
  'li_is_admin',
  'li_logo',
  'li_banner',
  'li_follower_count',
  'li_website',
  'li_type',
  'li_hq_address',
  'li_industry_code',
  'li_company_query',
  'li_timestamp',
  'li_is_claimable',
  'li_error',
  'li_location_branch',
  'li_location_sub_branch',
  'li_competitors',
  'li_company_about',
  'lic_company_name',
  'lic_company_id',
  'ap_industry',
  'ap_company_keywords',
  'ap_company_city',
  'ap_company_state',
  'ap_company_country',
  'ap_company_linkedin_url',
  'ap_company_twitter_url',
  'ap_company_facebook_url',
  'ap_company_phone_numbers',
  'ap_company_name',
  'ap_company_website',
  'ap_company_smtp',
  'zm_technologies',
  'zm_revenue_size',
  'zm_company',
  'zm_location',
  'zm_industry',
  'zm_empyoyee_size',
  'zm_website',
  'zm_smtp',
  'zm_country',
  'zm_summary',
  'zm_sic_codes',
  'zm_naics_codes',
  'py_smtp',
  'py_title',
  'py_keywords',
  'py_description',
  'need_to_action',
  'reference_1',
  'reference_2',
  'reference_3',
  'reference_4',
  'reference_5',
  'reference_6',
  'reference_7',
  'reference_8',
  'reference_9',
  'reference_10',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'deleted_at'
];

/**
 * Registry of predefined collection schemas
 * Key format: "database.collection" or just "collection" for cross-database
 */
const COLLECTION_SCHEMAS = {
  // Master collections in sun database
  'sun.master_leads': MASTER_LEADS_COLUMNS,
  'sun.master_accounts': MASTER_ACCOUNTS_COLUMNS,
  'sun.temp_master_leads': MASTER_LEADS_COLUMNS,
  'sun.temp_master_accounts': MASTER_ACCOUNTS_COLUMNS,
  
  // Cross-database fallbacks (if database not specified)
  'master_leads': MASTER_LEADS_COLUMNS,
  'master_accounts': MASTER_ACCOUNTS_COLUMNS,
  'temp_master_leads': MASTER_LEADS_COLUMNS,
  'temp_master_accounts': MASTER_ACCOUNTS_COLUMNS,
};

/**
 * Get predefined schema for a collection
 * @param {string} database - Database name
 * @param {string} collection - Collection name
 * @returns {string[]|null} Array of column names or null if not found
 */
export function getCollectionSchema(database, collection) {
  // Try database-specific key first
  const dbKey = `${database}.${collection}`;
  if (COLLECTION_SCHEMAS[dbKey]) {
    return COLLECTION_SCHEMAS[dbKey];
  }
  
  // Fall back to collection-only key
  if (COLLECTION_SCHEMAS[collection]) {
    return COLLECTION_SCHEMAS[collection];
  }
  
  return null;
}

/**
 * Check if a collection has a predefined schema
 * @param {string} database - Database name
 * @param {string} collection - Collection name
 * @returns {boolean}
 */
export function hasCollectionSchema(database, collection) {
  return getCollectionSchema(database, collection) !== null;
}

/**
 * Get all registered collection names
 * @returns {string[]}
 */
export function getRegisteredCollections() {
  return Object.keys(COLLECTION_SCHEMAS);
}

// Export column arrays for direct use
export { MASTER_LEADS_COLUMNS, MASTER_ACCOUNTS_COLUMNS };
