/**
 * Migration: Add Performance Indexes for Large Collections
 * 
 * This migration adds compound indexes optimized for common filter combinations
 * in master_accounts and master_leads collections to improve query performance
 * for large datasets (millions of records).
 * 
 * Run: node database/migrate.js up
 */

module.exports = {
  name: '016_add_performance_indexes',
  
  async up(db) {
    console.log('🚀 Adding performance indexes for large collections...');
    
    // Indexes for master_accounts collection
    const masterAccountsCollection = db.collection('master_accounts');
    
    try {
      console.log('📊 Creating indexes for master_accounts...');
      
      // Compound index for common filter: deleted_at + company name search
      await masterAccountsCollection.createIndex(
        { deleted_at: 1, li_company_name: 1 },
        { 
          name: 'idx_deleted_company_name',
          background: true,
          sparse: true
        }
      );
      
      // Compound index for deleted_at + industry filter
      await masterAccountsCollection.createIndex(
        { deleted_at: 1, li_company_industry: 1 },
        { 
          name: 'idx_deleted_industry',
          background: true,
          sparse: true
        }
      );
      
      // Compound index for deleted_at + SMTP filter
      await masterAccountsCollection.createIndex(
        { deleted_at: 1, li_smtp: 1 },
        { 
          name: 'idx_deleted_smtp',
          background: true,
          sparse: true
        }
      );
      
      // Compound index for deleted_at + created_at (for date range filters)
      await masterAccountsCollection.createIndex(
        { deleted_at: 1, created_at: -1 },
        { 
          name: 'idx_deleted_created',
          background: true,
          sparse: true
        }
      );
      
      // Compound index for deleted_at + _id (for default sorting)
      // Check if similar index exists first
      try {
        await masterAccountsCollection.createIndex(
          { deleted_at: 1, _id: -1 },
          { 
            name: 'idx_deleted_id_desc',
            background: true,
            sparse: true
          }
        );
      } catch (indexError) {
        // Index might already exist with different name, skip
        if (indexError.code !== 85 && indexError.codeName !== 'IndexOptionsConflict') {
          throw indexError;
        }
        console.warn('⚠️ Index idx_deleted_id_desc already exists or conflicts, skipping');
      }
      
      // Text index for global search (if not exists)
      try {
        await masterAccountsCollection.createIndex(
          { 
            li_company_name: 'text',
            li_company_description: 'text',
            ap_company_name: 'text',
            zm_company: 'text'
          },
          { 
            name: 'idx_text_search',
            background: true,
            default_language: 'none'
          }
        );
      } catch (textIndexError) {
        // Text index might already exist or collection might not support it
        console.warn('⚠️ Text index creation skipped:', textIndexError.message);
      }
      
      console.log('✅ master_accounts indexes created');
    } catch (error) {
      console.error('❌ Error creating master_accounts indexes:', error);
      // Don't throw - continue with other collections
    }
    
    // Indexes for master_leads collection
    const masterLeadsCollection = db.collection('master_leads');
    
    try {
      console.log('📊 Creating indexes for master_leads...');
      
      // Compound index for deleted_at + email (common filter)
      await masterLeadsCollection.createIndex(
        { deleted_at: 1, email: 1 },
        { 
          name: 'idx_deleted_email',
          background: true,
          sparse: true
        }
      );
      
      // Compound index for deleted_at + company name
      await masterLeadsCollection.createIndex(
        { deleted_at: 1, li_company_name: 1 },
        { 
          name: 'idx_deleted_company_name',
          background: true,
          sparse: true
        }
      );
      
      // Compound index for deleted_at + full name
      await masterLeadsCollection.createIndex(
        { deleted_at: 1, li_full_name: 1 },
        { 
          name: 'idx_deleted_full_name',
          background: true,
          sparse: true
        }
      );
      
      // Compound index for deleted_at + job title
      await masterLeadsCollection.createIndex(
        { deleted_at: 1, li_job_title: 1 },
        { 
          name: 'idx_deleted_job_title',
          background: true,
          sparse: true
        }
      );
      
      // Compound index for deleted_at + designation
      await masterLeadsCollection.createIndex(
        { deleted_at: 1, dls_designation: 1 },
        { 
          name: 'idx_deleted_designation',
          background: true,
          sparse: true
        }
      );
      
      // Compound index for deleted_at + created_at (for date range filters)
      await masterLeadsCollection.createIndex(
        { deleted_at: 1, created_at: -1 },
        { 
          name: 'idx_deleted_created',
          background: true,
          sparse: true
        }
      );
      
      // Compound index for deleted_at + _id (for default sorting)
      await masterLeadsCollection.createIndex(
        { deleted_at: 1, _id: -1 },
        { 
          name: 'idx_deleted_id_desc',
          background: true,
          sparse: true
        }
      );
      
      // Text index for global search (if not exists)
      try {
        await masterLeadsCollection.createIndex(
          { 
            li_full_name: 'text',
            li_company_name: 'text',
            email: 'text',
            li_job_title: 'text',
            dls_designation: 'text'
          },
          { 
            name: 'idx_text_search',
            background: true,
            default_language: 'none'
          }
        );
      } catch (textIndexError) {
        // Text index might already exist or collection might not support it
        console.warn('⚠️ Text index creation skipped:', textIndexError.message);
      }
      
      console.log('✅ master_leads indexes created');
    } catch (error) {
      console.error('❌ Error creating master_leads indexes:', error);
      // Don't throw - migration should continue
    }
    
    console.log('✅ Performance indexes migration completed');
  },
  
  async down(db) {
    console.log('🔄 Dropping performance indexes...');
    
    const indexesToDrop = {
      master_accounts: [
        'idx_deleted_company_name',
        'idx_deleted_industry',
        'idx_deleted_smtp',
        'idx_deleted_created',
        'idx_deleted_id_desc',
        'idx_text_search'
      ],
      master_leads: [
        'idx_deleted_email',
        'idx_deleted_company_name',
        'idx_deleted_full_name',
        'idx_deleted_job_title',
        'idx_deleted_designation',
        'idx_deleted_created',
        'idx_deleted_id_desc',
        'idx_text_search'
      ]
    };
    
    for (const [collectionName, indexNames] of Object.entries(indexesToDrop)) {
      try {
        const collection = db.collection(collectionName);
        for (const indexName of indexNames) {
          try {
            await collection.dropIndex(indexName);
            console.log(`✅ Dropped index ${indexName} from ${collectionName}`);
          } catch (error) {
            console.warn(`⚠️ Index ${indexName} not found in ${collectionName}, skipping`);
          }
        }
      } catch (error) {
        console.error(`❌ Error dropping indexes from ${collectionName}:`, error);
      }
    }
    
    console.log('✅ Performance indexes dropped');
  }
};

