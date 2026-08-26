/**
 * Migration: Predefined Filter Options
 * 
 * Creates categories and options collections with example data
 * for predefined filter suggestions system.
 * 
 * Run: node database/migrations/005_predefined_filter_options.js
 */

import { getCollection } from '../../src/lib/mongodb.js';
import { ObjectId } from 'mongodb';

async function runMigration() {
  console.log('🚀 Starting predefined filter options migration...');

  try {
    const categoriesCollection = await getCollection('categories', 'central');
    const optionsCollection = await getCollection('options', 'central');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await categoriesCollection.deleteMany({});
    // await optionsCollection.deleteMany({});

    // STEP 1: Insert Categories
    // category_id MUST equal MongoDB field name used in filters
    console.log('📋 Inserting categories...');
    
    const categories = [
      {
        _id: new ObjectId(),
        category: 'Company Name',
        category_id: 'li_company_name', // MUST match MongoDB field name
        created_at: new Date(),
        created_by: null,
        deleted_at: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'Full Name',
        category_id: 'li_full_name',
        created_at: new Date(),
        created_by: null,
        deleted_at: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'Job Title',
        category_id: 'li_job_title',
        created_at: new Date(),
        created_by: null,
        deleted_at: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'Job Function',
        category_id: 'dls_jobfunction',
        created_at: new Date(),
        created_by: null,
        deleted_at: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'Designation',
        category_id: 'dls_designation',
        created_at: new Date(),
        created_by: null,
        deleted_at: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'First Name',
        category_id: 'li_first_name',
        created_at: new Date(),
        created_by: null,
        deleted_at: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'Last Name',
        category_id: 'li_last_name',
        created_at: new Date(),
        created_by: null,
        deleted_at: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'Email',
        category_id: 'email',
        created_at: new Date(),
        created_by: null,
        deleted_at: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'SMTP',
        category_id: 'li_smtp',
        created_at: new Date(),
        created_by: null,
        deleted_at: null,
        updated_at: new Date(),
        updated_by: null
      }
    ];

    // Insert categories (skip duplicates)
    for (const category of categories) {
      const existing = await categoriesCollection.findOne({ category_id: category.category_id });
      if (!existing) {
        await categoriesCollection.insertOne(category);
        console.log(`✅ Inserted category: ${category.category_id}`);
      } else {
        console.log(`⏭️  Category already exists: ${category.category_id}`);
      }
    }

    // STEP 2: Insert Predefined Options
    // category MUST match categories.category_id
    console.log('📦 Inserting predefined options...');

    const options = [
      // li_company_name options
      {
        _id: new ObjectId(),
        category: 'li_company_name', // MUST match categories.category_id
        option_id: 'company_001',
        option: 'Microsoft Corporation',
        color: '#0078d4',
        class: 'tech-company',
        description: 'Technology company',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_company_name',
        option_id: 'company_002',
        option: 'Google LLC',
        color: '#4285f4',
        class: 'tech-company',
        description: 'Technology company',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_company_name',
        option_id: 'company_003',
        option: 'Amazon.com Inc',
        color: '#ff9900',
        class: 'tech-company',
        description: 'E-commerce and cloud computing',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_company_name',
        option_id: 'company_004',
        option: 'Apple Inc',
        color: '#a8a8a8',
        class: 'tech-company',
        description: 'Technology company',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_company_name',
        option_id: 'company_005',
        option: 'Meta Platforms Inc',
        color: '#1877f2',
        class: 'tech-company',
        description: 'Social media and technology',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },

      // li_job_title options
      {
        _id: new ObjectId(),
        category: 'li_job_title',
        option_id: 'job_001',
        option: 'Chief Executive Officer',
        color: '#d32f2f',
        class: 'c-level',
        description: 'C-level executive',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_job_title',
        option_id: 'job_002',
        option: 'Chief Technology Officer',
        color: '#d32f2f',
        class: 'c-level',
        description: 'C-level executive',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_job_title',
        option_id: 'job_003',
        option: 'Vice President',
        color: '#f57c00',
        class: 'vp-level',
        description: 'VP level executive',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_job_title',
        option_id: 'job_004',
        option: 'Director',
        color: '#1976d2',
        class: 'director-level',
        description: 'Director level',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_job_title',
        option_id: 'job_005',
        option: 'Manager',
        color: '#388e3c',
        class: 'manager-level',
        description: 'Management level',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_job_title',
        option_id: 'job_006',
        option: 'Software Engineer',
        color: '#7b1fa2',
        class: 'individual-contributor',
        description: 'Individual contributor',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_job_title',
        option_id: 'job_007',
        option: 'Product Manager',
        color: '#0288d1',
        class: 'product',
        description: 'Product management role',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'li_job_title',
        option_id: 'job_008',
        option: 'Sales Manager',
        color: '#c2185b',
        class: 'sales',
        description: 'Sales management role',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },

      // dls_jobfunction options
      {
        _id: new ObjectId(),
        category: 'dls_jobfunction',
        option_id: 'function_001',
        option: 'Engineering',
        color: '#1976d2',
        class: 'engineering',
        description: 'Engineering function',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'dls_jobfunction',
        option_id: 'function_002',
        option: 'Sales',
        color: '#c2185b',
        class: 'sales',
        description: 'Sales function',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'dls_jobfunction',
        option_id: 'function_003',
        option: 'Marketing',
        color: '#7b1fa2',
        class: 'marketing',
        description: 'Marketing function',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'dls_jobfunction',
        option_id: 'function_004',
        option: 'Product',
        color: '#0288d1',
        class: 'product',
        description: 'Product function',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'dls_jobfunction',
        option_id: 'function_005',
        option: 'Operations',
        color: '#388e3c',
        class: 'operations',
        description: 'Operations function',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'dls_jobfunction',
        option_id: 'function_006',
        option: 'Finance',
        color: '#f57c00',
        class: 'finance',
        description: 'Finance function',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      },
      {
        _id: new ObjectId(),
        category: 'dls_jobfunction',
        option_id: 'function_007',
        option: 'Human Resources',
        color: '#d32f2f',
        class: 'hr',
        description: 'HR function',
        deleted_at: null,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null
      }
    ];

    // Insert options (skip duplicates)
    for (const option of options) {
      const existing = await optionsCollection.findOne({ 
        category: option.category,
        option_id: option.option_id 
      });
      if (!existing) {
        await optionsCollection.insertOne(option);
        console.log(`✅ Inserted option: ${option.option_id} (${option.category})`);
      } else {
        console.log(`⏭️  Option already exists: ${option.option_id}`);
      }
    }

    // STEP 3: Create Indexes for Performance
    console.log('📊 Creating indexes...');
    
    // Index on categories.category_id (for validation lookup)
    await categoriesCollection.createIndex({ category_id: 1 }, { unique: true, name: 'idx_category_id' });
    await categoriesCollection.createIndex({ deleted_at: 1 }, { name: 'idx_deleted_at' });
    
    // Index on options.category + option (for query performance)
    await optionsCollection.createIndex({ category: 1, option: 1 }, { name: 'idx_category_option' });
    await optionsCollection.createIndex({ category: 1, deleted_at: 1 }, { name: 'idx_category_deleted' });
    await optionsCollection.createIndex({ option_id: 1 }, { unique: true, name: 'idx_option_id' });

    console.log('✅ Migration completed successfully!');
    console.log(`📊 Categories: ${await categoriesCollection.countDocuments({ deleted_at: null })}`);
    console.log(`📊 Options: ${await optionsCollection.countDocuments({ deleted_at: null })}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default runMigration;

