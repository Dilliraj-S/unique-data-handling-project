/**
 * MongoDB Migration: Update email_accounts schema to support 'starttls'
 * Adds 'starttls' to the enum for incoming_encryption and outgoing_encryption
 */

const { MongoClient } = require('mongodb');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pluto';

async function updateSchema() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const dbName = uri.split('/').pop().split('?')[0] || 'pluto';
    const db = client.db(dbName);
    
    console.log(`📦 Using database: ${dbName}`);
    
    const collection = db.collection('email_accounts');
    
    // Get current schema
    const collectionInfo = await db.command({ listCollections: 1, filter: { name: 'email_accounts' } });
    const currentSchema = collectionInfo.cursor.firstBatch[0]?.options?.validator;
    
    if (!currentSchema) {
      console.log('⚠️ No existing schema found. Creating new schema...');
    }
    
    // Update schema validator to include 'starttls' in enum
    const newSchema = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'user_id', 'used_quota'],
        properties: {
          id: {
            bsonType: 'long',
            description: 'must be NumberLong and is required'
          },
          temp_id: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          user_id: {
            bsonType: 'string',
            description: 'must be string (e.g., "USR_ADMIN_001") and is required'
          },
          type: {
            'enum': ['google', 'manual', null],
            description: 'google/manual/null'
          },
          email: {
            bsonType: ['string', 'null'],
            description: 'unique string or null'
          },
          daily_send_limit: {
            bsonType: ['int', 'null'],
            description: 'int or null'
          },
          used_quota: {
            bsonType: 'int',
            description: 'must be int and is required'
          },
          last_reset_at: {
            bsonType: ['date', 'null'],
            description: 'date or null'
          },
          last_history_id: {
            bsonType: ['long', 'null'],
            description: 'NumberLong or null'
          },
          password: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          incoming_host: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          incoming_port: {
            bsonType: ['int', 'null'],
            description: 'int or null'
          },
          incoming_encryption: {
            'enum': ['tls', 'ssl', 'starttls', 'none', null],
            description: 'tls/ssl/starttls/none/null'
          },
          outgoing_host: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          outgoing_port: {
            bsonType: ['int', 'null'],
            description: 'int or null'
          },
          outgoing_encryption: {
            'enum': ['tls', 'ssl', 'starttls', 'none', null],
            description: 'tls/ssl/starttls/none/null'
          },
          access_token: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          refresh_token: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          first_name: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          last_name: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          extension: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          phone_number: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          designation: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          unsubscribe: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          fax: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          postal_code: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          address: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          status: {
            'enum': ['pending', 'active', 'inactive', null],
            description: 'pending/active/inactive/null'
          },
          created_at: {
            bsonType: ['date', 'null'],
            description: 'date or null'
          },
          updated_at: {
            bsonType: ['date', 'null'],
            description: 'date or null'
          },
          region: {
            bsonType: ['string', 'null'],
            description: 'string or null'
          },
          deleted_at: {
            bsonType: ['date', 'null'],
            description: 'date or null'
          }
        }
      }
    };
    
    // Update collection validator
    await db.command({
      collMod: 'email_accounts',
      validator: newSchema
    });
    
    console.log('✅ Updated email_accounts schema - added "starttls" to encryption enums');
    console.log('📝 incoming_encryption and outgoing_encryption now support: tls, ssl, starttls, none, null');
    
  } catch (error) {
    console.error('❌ Schema update error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

updateSchema()
  .then(() => {
    console.log('✅ Schema update completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema update failed:', error);
    process.exit(1);
  });

