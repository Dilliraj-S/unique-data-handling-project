const { MongoClient } = require('mongodb');

/**
 * Migration: Create master_leads collection
 * Equivalent to master_leads MySQL table
 */

const migration = {
  name: '003_create_master_leads_collection',
  
  async up(db) {
    console.log('Creating master_leads collection...');
    
    // Create the collection
    const collection = await db.createCollection('master_leads', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'phone', 'need_to_action'],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            first_name: {
              bsonType: ['string', 'null'],
              maxLength: 255,
              description: 'First name'
            },
            last_name: {
              bsonType: ['string', 'null'],
              maxLength: 255,
              description: 'Last name'
            },
            full_name: {
              bsonType: ['string', 'null'],
              maxLength: 101,
              description: 'Full name (computed field)'
            },
            email: {
              bsonType: 'string',
              maxLength: 157,
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
              description: 'Email address (required)'
            },
            phone: {
              bsonType: 'string',
              maxLength: 20,
              description: 'Primary phone number (required)'
            },
            phone1: {
              bsonType: ['string', 'null'],
              maxLength: 20,
              description: 'Secondary phone number'
            },
            phone2: {
              bsonType: ['string', 'null'],
              maxLength: 20,
              description: 'Tertiary phone number'
            },
            website: {
              bsonType: ['string', 'null'],
              description: 'Website URL'
            },
            address: {
              bsonType: ['string', 'null'],
              description: 'Primary address'
            },
            address1: {
              bsonType: ['string', 'null'],
              description: 'Address line 1'
            },
            address2: {
              bsonType: ['string', 'null'],
              description: 'Address line 2'
            },
            address3: {
              bsonType: ['string', 'null'],
              description: 'Address line 3'
            },
            address4: {
              bsonType: ['string', 'null'],
              description: 'Address line 4'
            },
            city: {
              bsonType: ['string', 'null'],
              maxLength: 150,
              description: 'City name'
            },
            district: {
              bsonType: ['string', 'null'],
              maxLength: 150,
              description: 'District name'
            },
            state: {
              bsonType: ['string', 'null'],
              maxLength: 50,
              description: 'State name'
            },
            pincode: {
              bsonType: ['string', 'null'],
              maxLength: 20,
              description: 'Postal/ZIP code'
            },
            location: {
              bsonType: ['string', 'null'],
              description: 'Location details'
            },
            company_id: {
              bsonType: ['objectId', 'null'],
              description: 'Reference to master_accounts collection'
            },
            smtp: {
              bsonType: ['string', 'null'],
              maxLength: 150,
              description: 'SMTP configuration'
            },
            designation: {
              bsonType: ['string', 'null'],
              maxLength: 255,
              description: 'Job designation'
            },
            industry: {
              bsonType: ['string', 'null'],
              maxLength: 255,
              description: 'Industry type'
            },
            source: {
              bsonType: ['string', 'null'],
              description: 'Data source'
            },
            need_to_action: {
              bsonType: 'int',
              minimum: 0,
              maximum: 1,
              description: 'Action required flag (0 or 1)'
            },
            created_at: {
              bsonType: ['date', 'null'],
              description: 'Creation timestamp'
            },
            updated_at: {
              bsonType: ['date', 'null'],
              description: 'Last update timestamp'
            },
            deleted_at: {
              bsonType: ['date', 'null'],
              description: 'Soft delete timestamp'
            }
          }
        }
      }
    });

    // Create indexes - equivalent to MySQL indexes
    await collection.createIndex({ email: 1 }, { name: 'idx_email', unique: false }); // MUL in MySQL
    await collection.createIndex({ phone: 1 }, { name: 'idx_phone' });
    await collection.createIndex({ company_id: 1 }, { name: 'idx_company_id', sparse: true }); // MUL in MySQL
    await collection.createIndex({ smtp: 1 }, { name: 'idx_smtp', sparse: true }); // MUL in MySQL
    await collection.createIndex({ first_name: 1, last_name: 1 }, { name: 'idx_name' });
    await collection.createIndex({ city: 1 }, { name: 'idx_city' });
    await collection.createIndex({ state: 1 }, { name: 'idx_state' });
    await collection.createIndex({ industry: 1 }, { name: 'idx_industry' });
    await collection.createIndex({ need_to_action: 1 }, { name: 'idx_need_to_action' });
    await collection.createIndex({ created_at: 1 }, { name: 'idx_created_at' });
    await collection.createIndex({ updated_at: 1 }, { name: 'idx_updated_at' });
    await collection.createIndex({ deleted_at: 1 }, { name: 'idx_deleted_at', sparse: true });

    // Compound indexes for common queries
    await collection.createIndex({ email: 1, deleted_at: 1 }, { name: 'idx_email_active' });
    await collection.createIndex({ company_id: 1, deleted_at: 1 }, { name: 'idx_company_active', sparse: true });

    console.log('✅ master_leads collection created successfully');
  },

  async down(db) {
    console.log('Dropping master_leads collection...');
    await db.dropCollection('master_leads');
    console.log('✅ master_leads collection dropped successfully');
  }
};

module.exports = migration;
