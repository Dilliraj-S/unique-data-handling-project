const { MongoClient } = require('mongodb');

/**
 * Migration: Create master_accounts collection
 * Updated to match CSV structure exactly
 */

const migration = {
  name: '002_create_master_accounts_collection',
  
  async up(db) {
    console.log('Creating master_accounts collection...');
    
    // Create the collection with validation matching CSV structure
    const collection = await db.createCollection('master_accounts', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['need_to_action'],
          properties: {
            id: { 
              bsonType: ['string', 'number', 'null'],
              description: 'Original ID from source system'
            },
            company: { 
              bsonType: ['string', 'null'],
              description: 'Company name'
            },
            smtp: { 
              bsonType: ['string', 'null'],
              description: 'SMTP/Email domain'
            },
            industry: { 
              bsonType: ['string', 'null'],
              description: 'Industry type'
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
            location: { 
              bsonType: ['string', 'null'],
              description: 'Location details'
            },
            need_to_action: { 
              bsonType: 'string',
              enum: ['0', '1'],
              description: 'Action required flag: 0 = No, 1 = Yes'
            },
            created_at: { 
              bsonType: ['date', 'string', 'null'],
              description: 'Creation timestamp'
            },
            updated_at: { 
              bsonType: ['date', 'string', 'null'],
              description: 'Last update timestamp'
            },
            deleted_at: { 
              bsonType: ['date', 'string', 'null'],
              description: 'Soft delete timestamp'
            },
            source: { 
              bsonType: ['string', 'null'],
              description: 'Data source identifier'
            }
          }
        }
      }
    });

    // Create indexes for better performance
    await collection.createIndex({ id: 1 }, { sparse: true });
    await collection.createIndex({ company: 1 }, { sparse: true });
    await collection.createIndex({ smtp: 1 }, { sparse: true });
    await collection.createIndex({ industry: 1 }, { sparse: true });
    await collection.createIndex({ need_to_action: 1 });
    await collection.createIndex({ source: 1 }, { sparse: true });
    await collection.createIndex({ created_at: 1 }, { sparse: true });
    await collection.createIndex({ deleted_at: 1 }, { sparse: true });

    console.log('✅ master_accounts collection created with validation and indexes');
  },

  async down(db) {
    console.log('Dropping master_accounts collection...');
    await db.dropCollection('master_accounts');
    console.log('✅ master_accounts collection dropped');
  }
};

module.exports = migration;
