#!/bin/bash
# ═══════════════════════════════════════════════════════════
# OpenSearch Index Creation Commands
# Run these ONCE to create the 3 indexes before starting sync.
# ═══════════════════════════════════════════════════════════
#
# Usage:
#   bash scripts/create-opensearch-indexes.sh
#   OR run each curl command individually
#
# Prerequisites:
#   - OpenSearch must be running at ${OPENSEARCH_HOST:-localhost:9200}
# ═══════════════════════════════════════════════════════════

HOST="${OPENSEARCH_HOST:-localhost:9200}"

echo "🚀 Creating OpenSearch indexes on $HOST ..."

# ─── 1. sun_master_leads ───
echo ""
echo "📦 Creating sun_master_leads index..."
curl -s -X PUT "http://$HOST/sun_master_leads" \
  -H 'Content-Type: application/json' \
  -d '{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "30s",
    "index.max_result_window": 10000
  },
  "mappings": {
    "dynamic": false,
    "properties": {
      "id":                            { "type": "keyword" },
      "email":                         { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_smtp":                       { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_full_name":                  { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_first_name":                 { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_last_name":                  { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_middle_name":                { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_first_name_initial":         { "type": "keyword" },
      "li_last_name_initial":          { "type": "keyword" },
      "li_company_name":               { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_company_id":                 { "type": "keyword" },
      "li_job_title":                  { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_contact_industry":           { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "industry":                      { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "revenue":                       { "type": "keyword" },
      "employee_size":                 { "type": "keyword" },
      "dls_designation":               { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "dls_managementlevel":           { "type": "keyword" },
      "dls_jobfunction":               { "type": "keyword" },
      "dls_mailer_status":             { "type": "keyword" },
      "dls_bounce_status":             { "type": "keyword" },
      "dls_mail_send_status":          { "type": "keyword" },
      "dls_ooo_status":                { "type": "keyword" },
      "dls_uns_status":                { "type": "keyword" },
      "dls_dnd_status":                { "type": "keyword" },
      "dls_bounce_reason":             { "type": "keyword" },
      "dls_lead_response":             { "type": "keyword" },
      "dls_lead_generated_date":       { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "dls_direct_dial":               { "type": "keyword" },
      "dls_mobile":                    { "type": "keyword" },
      "dls_cell_phone":                { "type": "keyword" },
      "dls_phone_telephone":           { "type": "keyword" },
      "dls_office_number":             { "type": "keyword" },
      "dls_others_unknown":            { "type": "keyword" },
      "dls_additional_notes":          { "type": "text" },
      "dls_email_number":              { "type": "integer" },
      "dls_fax_number":                { "type": "keyword" },
      "dls_bounce_count":              { "type": "integer" },
      "dls_mail_send_count":           { "type": "integer" },
      "dls_bounce_last_date":          { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "dls_mail_send_last_date":       { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "dls_bounce_last_campaign_id":   { "type": "integer" },
      "dls_mail_send_last_campaign_id":{ "type": "integer" },
      "dls_bounce_history":            { "type": "text" },
      "dls_mail_send_history":         { "type": "text" },
      "li_Contact_summary":            { "type": "text" },
      "li_title_description":          { "type": "text" },
      "li_skills":                     { "type": "text" },
      "li_certifications":             { "type": "text" },
      "li_duration_in_role":           { "type": "keyword" },
      "li_contact_location":           { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_contact_country":            { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_contact_query":              { "type": "keyword" },
      "li_profile_url":                { "type": "keyword" },
      "li_salesnav_profile_url":       { "type": "keyword" },
      "li_contact_url":                { "type": "keyword" },
      "li_company_location":           { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_company_name":               { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_company_address":            { "type": "text" },
      "gs_street":                     { "type": "keyword" },
      "gs_city":                       { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_state":                      { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_zipcode":                    { "type": "keyword" },
      "gs_country":                    { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_zone_region":                { "type": "keyword" },
      "gs_phone_number":               { "type": "keyword" },
      "gs_country_code":               { "type": "integer" },
      "gs_plus_code":                  { "type": "keyword" },
      "gs_category":                   { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_place_url":                  { "type": "keyword" },
      "gs_smtp":                       { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_title":                      { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_website":                    { "type": "keyword" },
      "ap_linkedin_contact_url":       { "type": "keyword" },
      "ap_full_name":                  { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_contact_city":               { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_contact_state":              { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_contact_country":            { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_contact_twitter_url":        { "type": "keyword" },
      "ap_contact_facebook_url":       { "type": "keyword" },
      "need_to_action":                { "type": "integer" },
      "last_contact_date":             { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "source":                        { "type": "keyword" },
      "reference_2":                   { "type": "keyword" },
      "reference_3":                   { "type": "keyword" },
      "reference_4":                   { "type": "keyword" },
      "reference_5":                   { "type": "keyword" },
      "reference_6":                   { "type": "keyword" },
      "reference_7":                   { "type": "keyword" },
      "reference_8":                   { "type": "keyword" },
      "reference_9":                   { "type": "keyword" },
      "reference_10":                  { "type": "keyword" },
      "created_by":                    { "type": "keyword" },
      "updated_by":                    { "type": "keyword" },
      "created_at":                    { "type": "date", "format": "strict_date_optional_time||epoch_millis||date_time_no_millis" },
      "updated_at":                    { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "deleted_at":                    { "type": "date", "format": "strict_date_optional_time||epoch_millis" }
    }
  }
}' && echo " ✅ sun_master_leads created"

# ─── 2. sun_temp_master_leads (identical mapping to master_leads) ───
echo ""
echo "📦 Creating sun_temp_master_leads index..."
curl -s -X PUT "http://$HOST/sun_temp_master_leads" \
  -H 'Content-Type: application/json' \
  -d '{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "30s",
    "index.max_result_window": 10000
  },
  "mappings": {
    "dynamic": false,
    "properties": {
      "id":                            { "type": "keyword" },
      "email":                         { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_smtp":                       { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_full_name":                  { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_first_name":                 { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_last_name":                  { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_middle_name":                { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_first_name_initial":         { "type": "keyword" },
      "li_last_name_initial":          { "type": "keyword" },
      "li_company_name":               { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_company_id":                 { "type": "keyword" },
      "li_job_title":                  { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_contact_industry":           { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "industry":                      { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "revenue":                       { "type": "keyword" },
      "employee_size":                 { "type": "keyword" },
      "dls_designation":               { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "dls_managementlevel":           { "type": "keyword" },
      "dls_jobfunction":               { "type": "keyword" },
      "dls_mailer_status":             { "type": "keyword" },
      "dls_bounce_status":             { "type": "keyword" },
      "dls_mail_send_status":          { "type": "keyword" },
      "dls_ooo_status":                { "type": "keyword" },
      "dls_uns_status":                { "type": "keyword" },
      "dls_dnd_status":                { "type": "keyword" },
      "dls_bounce_reason":             { "type": "keyword" },
      "dls_lead_response":             { "type": "keyword" },
      "dls_lead_generated_date":       { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "dls_direct_dial":               { "type": "keyword" },
      "dls_mobile":                    { "type": "keyword" },
      "dls_cell_phone":                { "type": "keyword" },
      "dls_phone_telephone":           { "type": "keyword" },
      "dls_office_number":             { "type": "keyword" },
      "dls_others_unknown":            { "type": "keyword" },
      "dls_additional_notes":          { "type": "text" },
      "dls_email_number":              { "type": "integer" },
      "dls_fax_number":                { "type": "keyword" },
      "dls_bounce_count":              { "type": "integer" },
      "dls_mail_send_count":           { "type": "integer" },
      "dls_bounce_last_date":          { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "dls_mail_send_last_date":       { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "dls_bounce_last_campaign_id":   { "type": "integer" },
      "dls_mail_send_last_campaign_id":{ "type": "integer" },
      "dls_bounce_history":            { "type": "text" },
      "dls_mail_send_history":         { "type": "text" },
      "li_Contact_summary":            { "type": "text" },
      "li_title_description":          { "type": "text" },
      "li_skills":                     { "type": "text" },
      "li_certifications":             { "type": "text" },
      "li_duration_in_role":           { "type": "keyword" },
      "li_contact_location":           { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_contact_country":            { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_contact_query":              { "type": "keyword" },
      "li_profile_url":                { "type": "keyword" },
      "li_salesnav_profile_url":       { "type": "keyword" },
      "li_contact_url":                { "type": "keyword" },
      "li_company_location":           { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_company_name":               { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_company_address":            { "type": "text" },
      "gs_street":                     { "type": "keyword" },
      "gs_city":                       { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_state":                      { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_zipcode":                    { "type": "keyword" },
      "gs_country":                    { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_zone_region":                { "type": "keyword" },
      "gs_phone_number":               { "type": "keyword" },
      "gs_country_code":               { "type": "integer" },
      "gs_plus_code":                  { "type": "keyword" },
      "gs_category":                   { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_place_url":                  { "type": "keyword" },
      "gs_smtp":                       { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_title":                      { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "gs_website":                    { "type": "keyword" },
      "ap_linkedin_contact_url":       { "type": "keyword" },
      "ap_full_name":                  { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_contact_city":               { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_contact_state":              { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_contact_country":            { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_contact_twitter_url":        { "type": "keyword" },
      "ap_contact_facebook_url":       { "type": "keyword" },
      "need_to_action":                { "type": "integer" },
      "last_contact_date":             { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "source":                        { "type": "keyword" },
      "reference_2":                   { "type": "keyword" },
      "reference_3":                   { "type": "keyword" },
      "reference_4":                   { "type": "keyword" },
      "reference_5":                   { "type": "keyword" },
      "reference_6":                   { "type": "keyword" },
      "reference_7":                   { "type": "keyword" },
      "reference_8":                   { "type": "keyword" },
      "reference_9":                   { "type": "keyword" },
      "reference_10":                  { "type": "keyword" },
      "created_by":                    { "type": "keyword" },
      "updated_by":                    { "type": "keyword" },
      "created_at":                    { "type": "date", "format": "strict_date_optional_time||epoch_millis||date_time_no_millis" },
      "updated_at":                    { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "deleted_at":                    { "type": "date", "format": "strict_date_optional_time||epoch_millis" }
    }
  }
}' && echo " ✅ sun_temp_master_leads created"

# ─── 3. sun_master_accounts ───
echo ""
echo "📦 Creating sun_master_accounts index..."
curl -s -X PUT "http://$HOST/sun_master_accounts" \
  -H 'Content-Type: application/json' \
  -d '{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "30s",
    "index.max_result_window": 10000
  },
  "mappings": {
    "dynamic": false,
    "properties": {
      "id":                              { "type": "keyword" },
      "li_smtp":                         { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_company_name":                 { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_company_employee_size":        { "type": "keyword" },
      "li_company_industry":             { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_industry_relavance":           { "type": "keyword" },
      "li_industry_mapping":             { "type": "keyword" },
      "li_company_id":                   { "type": "keyword" },
      "li_company_url":                  { "type": "keyword" },
      "li_company_specialties":          { "type": "text" },
      "li_company_description":          { "type": "text" },
      "li_tag_line":                     { "type": "text" },
      "employees_on_linked_in":          { "type": "keyword" },
      "li_company_founded":              { "type": "keyword" },
      "li_company_headquarters":         { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_company_headquarters_country": { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_hq_number":                    { "type": "keyword" },
      "li_is_admin":                     { "type": "keyword" },
      "li_logo":                         { "type": "keyword" },
      "li_banner":                       { "type": "keyword" },
      "li_follower_count":               { "type": "keyword" },
      "li_website":                      { "type": "keyword" },
      "li_type":                         { "type": "keyword" },
      "li_hq_address":                   { "type": "text" },
      "li_industry_code":                { "type": "keyword" },
      "li_company_query":                { "type": "keyword" },
      "li_timestamp":                    { "type": "date", "format": "strict_date_optional_time||epoch_millis||date_time_no_millis" },
      "li_is_claimable":                 { "type": "keyword" },
      "li_error":                        { "type": "keyword" },
      "li_location_branch":              { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_location_sub_branch":          { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "li_competitors":                  { "type": "text" },
      "li_company_about":                { "type": "text" },
      "lic_company_name":                { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "lic_company_id":                  { "type": "keyword" },
      "ap_industry":                     { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_company_keywords":             { "type": "text" },
      "ap_company_city":                 { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_company_state":                { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_company_country":              { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_company_linkedin_url":         { "type": "keyword" },
      "ap_company_twitter_url":          { "type": "keyword" },
      "ap_company_facebook_url":         { "type": "keyword" },
      "ap_company_phone_numbers":        { "type": "keyword" },
      "ap_company_name":                 { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "ap_company_website":              { "type": "keyword" },
      "ap_company_smtp":                 { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "zm_technologies":                 { "type": "text" },
      "zm_revenue_size":                 { "type": "keyword" },
      "zm_company":                      { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "zm_location":                     { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "zm_industry":                     { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "zm_empyoyee_size":                { "type": "keyword" },
      "zm_website":                      { "type": "keyword" },
      "zm_smtp":                         { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "zm_country":                      { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "zm_summary":                      { "type": "text" },
      "zm_sic_codes":                    { "type": "keyword" },
      "zm_naics_codes":                  { "type": "keyword" },
      "py_smtp":                         { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "py_title":                        { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "py_keywords":                     { "type": "text" },
      "py_description":                  { "type": "text" },
      "need_to_action":                  { "type": "integer" },
      "reference_1":                     { "type": "keyword" },
      "reference_2":                     { "type": "keyword" },
      "reference_3":                     { "type": "keyword" },
      "reference_4":                     { "type": "keyword" },
      "reference_5":                     { "type": "keyword" },
      "reference_6":                     { "type": "keyword" },
      "reference_7":                     { "type": "keyword" },
      "reference_8":                     { "type": "keyword" },
      "reference_9":                     { "type": "keyword" },
      "reference_10":                    { "type": "keyword" },
      "created_at":                      { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "updated_at":                      { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "created_by":                      { "type": "keyword" },
      "updated_by":                      { "type": "keyword" },
      "deleted_at":                      { "type": "date", "format": "strict_date_optional_time||epoch_millis" }
    }
  }
}' && echo " ✅ sun_master_accounts created"

# ═══════════════════════════════════════════════════════════
# PRODUCT INDEXES (central database)
# All 6 product collections share the same mapping.
# 1 shard, 0 replicas — small collections (10K-77K docs)
# ═══════════════════════════════════════════════════════════

PRODUCT_MAPPING='{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "refresh_interval": "5s",
    "index.max_result_window": 10000
  },
  "mappings": {
    "dynamic": false,
    "properties": {
      "id":                 { "type": "keyword" },
      "product_id":         { "type": "keyword" },
      "product_name":       { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "description":        { "type": "text" },
      "source_description": { "type": "text" },
      "pp_id":              { "type": "keyword" },
      "pp_name":            { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "category":           { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "vendor":             { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "companies":          { "type": "text" },
      "companies_count":    { "type": "integer" },
      "contacts_count":     { "type": "integer" },
      "created_at":         { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "updated_at":         { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "deleted_at":         { "type": "date", "format": "strict_date_optional_time||epoch_millis" },
      "created_by":         { "type": "keyword" },
      "updated_by":         { "type": "keyword" },
      "Category":           { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "Companyname":        { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "LinkedinUrl":        { "type": "text" },
      "reference_1":        { "type": "text" },
      "reference_2":        { "type": "text" },
      "reference_3":        { "type": "text" },
      "reference_4":        { "type": "text" },
      "reference_5":        { "type": "text" }
    }
  }
}'

PRODUCT_INDEXES=(
  "central_products"
  "central_apolloproduct"
  "central_g2product"
  "central_linkedinprodcut"
  "central_mspsproduct"
  "central_msspsproduct"
)

for idx in "${PRODUCT_INDEXES[@]}"; do
  echo ""
  echo "📦 Creating ${idx} index..."
  curl -s -X PUT "http://$HOST/${idx}" \
    -H 'Content-Type: application/json' \
    -d "$PRODUCT_MAPPING" && echo " ✅ ${idx} created"
done

echo ""
echo "🎉 All 9 indexes created successfully! (3 leads/accounts + 6 products)"
echo ""
echo "Verify with:"
echo "  curl http://$HOST/_cat/indices?v"
