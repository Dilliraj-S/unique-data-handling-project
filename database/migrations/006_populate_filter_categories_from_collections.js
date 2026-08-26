/**
 * Migration: Populate Filter Categories from Collections
 * 
 * Reads all fields from master_leads and master_accounts collections
 * and creates categories and options for predefined filter suggestions.
 * 
 * Run: node database/migrations/006_populate_filter_categories_from_collections.js
 */

import { getCollection, getDb } from '../../src/lib/mongodb.js';
import { ObjectId } from 'mongodb';

/**
 * Generate display name from field name
 * li_company_name -> Company Name
 * dls_jobfunction -> Job Function
 */
function generateDisplayName(fieldName) {
  // Remove prefixes (li_, dls_, gs_, ap_, etc.)
  let displayName = fieldName
    .replace(/^(li_|dls_|gs_|ap_|zm_|py_)/, '')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return displayName;
}

/**
 * Get all unique field names from a collection by sampling documents
 * Falls back to schema-based field list if collection is empty
 */
async function getAllFieldsFromCollection(collection, schemaFields = []) {
  const fields = new Set();
  
  // First, try to get fields from actual documents
  try {
    // Try without deleted_at filter first (in case collection uses different soft delete field)
    const sampleDocs = await collection
      .find({})
      .limit(100)
      .toArray();
    
    if (sampleDocs.length > 0) {
      // Extract all field names (excluding MongoDB internal fields)
      sampleDocs.forEach(doc => {
        Object.keys(doc).forEach(key => {
          // Skip MongoDB internal fields and common metadata
          if (!key.startsWith('_') && 
              key !== 'deleted_at' && 
              key !== 'created_at' && 
              key !== 'updated_at' &&
              key !== 'created_by' &&
              key !== 'updated_by') {
            fields.add(key);
          }
        });
      });
      
      console.log(`  📄 Found ${sampleDocs.length} documents in ${collection.collectionName}`);
      return Array.from(fields).sort();
    }
  } catch (error) {
    console.error(`  ⚠️  Error sampling fields from ${collection.collectionName}:`, error.message);
  }
  
  // Fallback: Use schema fields if provided
  if (schemaFields.length > 0) {
    console.log(`  📋 Using schema fields for ${collection.collectionName} (collection appears empty)`);
    schemaFields.forEach(field => {
      if (!field.startsWith('_') && 
          field !== 'deleted_at' && 
          field !== 'created_at' && 
          field !== 'updated_at' &&
          field !== 'created_by' &&
          field !== 'updated_by') {
        fields.add(field);
      }
    });
    return Array.from(fields).sort();
  }
  
  return Array.from(fields).sort();
}

/**
 * Create default options for common fields
 */
function getDefaultOptionsForField(fieldName) {
  const defaultOptions = {
    'li_company_name': [
      { option: 'Microsoft Corporation', color: '#0078d4', class: 'tech-company', description: 'Technology company' },
      { option: 'Google LLC', color: '#4285f4', class: 'tech-company', description: 'Technology company' },
      { option: 'Amazon.com Inc', color: '#ff9900', class: 'tech-company', description: 'E-commerce and cloud computing' },
      { option: 'Apple Inc', color: '#a8a8a8', class: 'tech-company', description: 'Technology company' },
      { option: 'Meta Platforms Inc', color: '#1877f2', class: 'tech-company', description: 'Social media and technology' }
    ],
    'li_job_title': [
      { option: 'Chief Executive Officer', color: '#d32f2f', class: 'c-level', description: 'C-level executive' },
      { option: 'Chief Technology Officer', color: '#d32f2f', class: 'c-level', description: 'C-level executive' },
      { option: 'Vice President', color: '#f57c00', class: 'vp-level', description: 'VP level executive' },
      { option: 'Director', color: '#1976d2', class: 'director-level', description: 'Director level' },
      { option: 'Manager', color: '#388e3c', class: 'manager-level', description: 'Management level' },
      { option: 'Software Engineer', color: '#7b1fa2', class: 'individual-contributor', description: 'Individual contributor' },
      { option: 'Product Manager', color: '#0288d1', class: 'product', description: 'Product management role' },
      { option: 'Sales Manager', color: '#c2185b', class: 'sales', description: 'Sales management role' }
    ],
    'dls_jobfunction': [
      { option: 'Engineering', color: '#1976d2', class: 'engineering', description: 'Engineering function' },
      { option: 'Sales', color: '#c2185b', class: 'sales', description: 'Sales function' },
      { option: 'Marketing', color: '#7b1fa2', class: 'marketing', description: 'Marketing function' },
      { option: 'Product', color: '#0288d1', class: 'product', description: 'Product function' },
      { option: 'Operations', color: '#388e3c', class: 'operations', description: 'Operations function' },
      { option: 'Finance', color: '#f57c00', class: 'finance', description: 'Finance function' },
      { option: 'Human Resources', color: '#d32f2f', class: 'hr', description: 'HR function' }
    ],
    'dls_designation': [
      { option: 'C-Level', color: '#d32f2f', class: 'c-level', description: 'C-level executive' },
      { option: 'VP', color: '#f57c00', class: 'vp-level', description: 'Vice President' },
      { option: 'Director', color: '#1976d2', class: 'director-level', description: 'Director level' },
      { option: 'Manager', color: '#388e3c', class: 'manager-level', description: 'Management level' },
      { option: 'Individual Contributor', color: '#7b1fa2', class: 'individual-contributor', description: 'Individual contributor' }
    ],
    'li_full_name': [],
    'li_first_name': [],
    'li_last_name': [],
    'li_smtp': [],
    'email': [],
    'gs_title': [],
    'li_duration_in_role': [],
    'li_title_description': []
  };
  
  return defaultOptions[fieldName] || [];
}

async function runMigration() {
  console.log('🚀 Starting filter categories migration from collections...');
  console.log('📊 Reading fields from master_leads and master_accounts...');

  try {
    const db = await getDb('central');
    const categoriesCollection = await getCollection('categories', 'central');
    const optionsCollection = await getCollection('options', 'central');
    const masterLeadsCollection = await getCollection('master_leads', 'central');
    const masterAccountsCollection = await getCollection('master_accounts', 'central');

    // STEP 1: Get all fields from both collections
    console.log('\n📋 Step 1: Extracting fields from collections...');
    
    // Schema fields from provided schemas (fallback if collections are empty)
    const masterLeadsSchemaFields = [
      'ap_contact_city', 'ap_contact_country', 'ap_contact_facebook_url', 'ap_contact_state',
      'ap_contact_twitter_url', 'ap_full_name', 'ap_linkedin_contact_url', 'dls_additional_notes',
      'dls_bounce_reason', 'dls_bounce_status', 'dls_cell_phone', 'dls_designation',
      'dls_direct_dial', 'dls_dnd_status', 'dls_email_number', 'dls_fax_number',
      'dls_jobfunction', 'dls_lead_generated_date', 'dls_lead_response', 'dls_mail_send_status',
      'dls_mailer_status', 'dls_managementlevel', 'dls_mobile', 'dls_office_number',
      'dls_ooo_status', 'dls_others_unknown', 'dls_phone_telephone', 'dls_uns_status',
      'email', 'employee_size', 'gs_category', 'gs_city', 'gs_company_address',
      'gs_company_name', 'gs_country', 'gs_country_code', 'gs_phone_number',
      'gs_place_url', 'gs_plus_code', 'gs_smtp', 'gs_state', 'gs_street',
      'gs_title', 'gs_website', 'gs_zipcode', 'gs_zone_region', 'id', 'industry',
      'last_contact_date', 'li_certifications', 'li_company_id', 'li_company_location',
      'li_company_name', 'li_contact_country', 'li_contact_industry', 'li_contact_location',
      'li_contact_query', 'li_Contact_summary', 'li_contact_url', 'li_duration_in_role',
      'li_first_name', 'li_first_name_initial', 'li_full_name', 'li_job_title',
      'li_last_name', 'li_last_name_initial', 'li_middle_name', 'li_profile_url',
      'li_salesnav_profile_url', 'li_skills', 'li_smtp', 'li_title_description',
      'need_to_action', 'reference_1', 'reference_10', 'reference_2', 'reference_3',
      'reference_4', 'reference_5', 'reference_6', 'reference_7', 'reference_8',
      'reference_9', 'revenue'
    ];
    
    const masterAccountsSchemaFields = [
      'ap_company_city', 'ap_company_country', 'ap_company_facebook_url', 'ap_company_keywords',
      'ap_company_linkedin_url', 'ap_company_name', 'ap_company_phone_numbers', 'ap_company_smtp',
      'ap_company_state', 'ap_company_twitter_url', 'ap_company_website', 'ap_industry',
      'employees_on_linked_in', 'id', 'li_banner', 'li_company_about', 'li_company_description',
      'li_company_employee_size', 'li_company_founded', 'li_company_headquarters',
      'li_company_headquarters_country', 'li_company_id', 'li_company_industry', 'li_company_name',
      'li_company_query', 'li_company_specialties', 'li_company_url', 'li_competitors',
      'li_error', 'li_follower_count', 'li_hq_address', 'li_hq_number', 'li_industry_code',
      'li_industry_mapping', 'li_industry_relavance', 'li_is_admin', 'li_is_claimable',
      'li_location_branch', 'li_location_sub_branch', 'li_logo', 'li_smtp', 'li_tag_line',
      'li_timestamp', 'li_type', 'li_website', 'lic_company_id', 'lic_company_name',
      'need_to_action', 'py_description', 'py_keywords', 'py_smtp', 'py_title',
      'reference_1', 'reference_10', 'reference_2', 'reference_3', 'reference_4',
      'reference_5', 'reference_6', 'reference_7', 'reference_8', 'reference_9',
      'zm_company', 'zm_country', 'zm_empyoyee_size', 'zm_industry', 'zm_location',
      'zm_naics_codes', 'zm_revenue_size', 'zm_sic_codes', 'zm_smtp', 'zm_summary',
      'zm_technologies', 'zm_website'
    ];
    
    const leadsFields = await getAllFieldsFromCollection(masterLeadsCollection, masterLeadsSchemaFields);
    console.log(`✅ Found ${leadsFields.length} fields in master_leads:`, leadsFields.slice(0, 10).join(', '), leadsFields.length > 10 ? '...' : '');
    
    const accountsFields = await getAllFieldsFromCollection(masterAccountsCollection, masterAccountsSchemaFields);
    console.log(`✅ Found ${accountsFields.length} fields in master_accounts:`, accountsFields.slice(0, 10).join(', '), accountsFields.length > 10 ? '...' : '');
    
    // Combine and deduplicate
    const allFields = Array.from(new Set([...leadsFields, ...accountsFields])).sort();
    console.log(`\n📊 Total unique fields: ${allFields.length}`);

    // STEP 2: Create categories for all fields
    console.log('\n📋 Step 2: Creating categories...');
    
    let categoriesCreated = 0;
    let categoriesSkipped = 0;
    
    for (const fieldName of allFields) {
      const displayName = generateDisplayName(fieldName);
      
      // Check if category already exists
      const existing = await categoriesCollection.findOne({ 
        category_id: fieldName,
        deleted_at: null 
      });
      
      if (!existing) {
        const category = {
          _id: new ObjectId(),
          category: displayName,
          category_id: fieldName, // MUST match MongoDB field name
          created_at: new Date(),
          created_by: null,
          deleted_at: null,
          updated_at: new Date(),
          updated_by: null
        };
        
        await categoriesCollection.insertOne(category);
        categoriesCreated++;
        console.log(`  ✅ Created category: ${fieldName} → "${displayName}"`);
      } else {
        categoriesSkipped++;
        console.log(`  ⏭️  Category already exists: ${fieldName}`);
      }
    }
    
    console.log(`\n✅ Categories: ${categoriesCreated} created, ${categoriesSkipped} skipped`);

    // STEP 3: Create default options for common fields
    console.log('\n📦 Step 3: Creating default options...');
    
    let optionsCreated = 0;
    let optionsSkipped = 0;
    
    // Fields that should have default options
    const fieldsWithOptions = [
      'li_company_name',
      'li_job_title',
      'dls_jobfunction',
      'dls_designation',
      'li_full_name',
      'li_first_name',
      'li_last_name',
      'li_smtp',
      'email',
      'gs_title',
      'li_duration_in_role',
      'li_title_description'
    ];
    
    for (const fieldName of fieldsWithOptions) {
      // Check if category exists
      const category = await categoriesCollection.findOne({ 
        category_id: fieldName,
        deleted_at: null 
      });
      
      if (!category) {
        console.log(`  ⚠️  Category not found for ${fieldName}, skipping options`);
        continue;
      }
      
      const defaultOptions = getDefaultOptionsForField(fieldName);
      
      if (defaultOptions.length === 0) {
        console.log(`  ℹ️  No default options defined for ${fieldName}`);
        continue;
      }
      
      for (let i = 0; i < defaultOptions.length; i++) {
        const opt = defaultOptions[i];
        const optionId = `${fieldName}_${String(i + 1).padStart(3, '0')}`;
        
        // Check if option already exists
        const existing = await optionsCollection.findOne({
          category: fieldName,
          option_id: optionId,
          deleted_at: null
        });
        
        if (!existing) {
          const option = {
            _id: new ObjectId(),
            category: fieldName, // MUST match categories.category_id
            option_id: optionId,
            option: opt.option,
            color: opt.color || null,
            class: opt.class || null,
            description: opt.description || null,
            deleted_at: null,
            created_at: new Date(),
            created_by: null,
            updated_at: new Date(),
            updated_by: null
          };
          
          await optionsCollection.insertOne(option);
          optionsCreated++;
          console.log(`  ✅ Created option: ${fieldName} → "${opt.option}"`);
        } else {
          optionsSkipped++;
        }
      }
    }
    
    console.log(`\n✅ Options: ${optionsCreated} created, ${optionsSkipped} skipped`);

    // STEP 4: Create indexes for performance
    console.log('\n📊 Step 4: Creating indexes...');
    
    try {
      await categoriesCollection.createIndex({ category_id: 1 }, { unique: true, name: 'idx_category_id' });
      console.log('  ✅ Index created: categories.category_id');
    } catch (e) {
      if (e.code !== 85) { // Index already exists
        console.log('  ⚠️  Index creation skipped (may already exist)');
      }
    }
    
    try {
      await categoriesCollection.createIndex({ deleted_at: 1 }, { name: 'idx_deleted_at' });
      console.log('  ✅ Index created: categories.deleted_at');
    } catch (e) {
      console.log('  ⚠️  Index creation skipped (may already exist)');
    }
    
    try {
      await optionsCollection.createIndex({ category: 1, option: 1 }, { name: 'idx_category_option' });
      console.log('  ✅ Index created: options.category + option');
    } catch (e) {
      console.log('  ⚠️  Index creation skipped (may already exist)');
    }
    
    try {
      await optionsCollection.createIndex({ category: 1, deleted_at: 1 }, { name: 'idx_category_deleted' });
      console.log('  ✅ Index created: options.category + deleted_at');
    } catch (e) {
      console.log('  ⚠️  Index creation skipped (may already exist)');
    }
    
    try {
      await optionsCollection.createIndex({ option_id: 1 }, { unique: true, name: 'idx_option_id' });
      console.log('  ✅ Index created: options.option_id');
    } catch (e) {
      console.log('  ⚠️  Index creation skipped (may already exist)');
    }

    // STEP 5: Summary
    console.log('\n📊 Migration Summary:');
    const totalCategories = await categoriesCollection.countDocuments({ deleted_at: null });
    const totalOptions = await optionsCollection.countDocuments({ deleted_at: null });
    
    console.log(`  ✅ Total Categories: ${totalCategories}`);
    console.log(`  ✅ Total Options: ${totalOptions}`);
    console.log(`  ✅ Categories Created: ${categoriesCreated}`);
    console.log(`  ✅ Options Created: ${optionsCreated}`);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('  1. Test API: GET /api/filter-options?category=li_company_name');
    console.log('  2. Add more options via MongoDB shell or admin UI');
    console.log('  3. Use Filter Sidebar in Contacts/Companies pages');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('006_populate_filter_categories_from_collections')) {
  runMigration()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default runMigration;

