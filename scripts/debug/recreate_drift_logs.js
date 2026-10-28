
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function recreateCollection() {
  const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('pluto');
    console.log('✅ Connected to MongoDB (pluto)');

    // 1. Drop existing collection
    const collections = await db.listCollections({ name: 'drift_sequence_logs' }).toArray();
    if (collections.length > 0) {
      await db.collection('drift_sequence_logs').drop();
      console.log('🗑️  Dropped existing drift_sequence_logs collection.');
    } else {
      console.log('ℹ️  Collection drift_sequence_logs does not exist, skipping drop.');
    }

    // 2. Create collection with JSON Schema Validation
    // Mapping MySQL types to MongoDB BSON types
    // Note: We allow "long", "int", "string", "objectId" for IDs to handle legacy data migration + new data.
    const validator = {
      $jsonSchema: {
        bsonType: "object",
        required: ["set_id", "sequence_id", "subscriber_id", "email_account_id", "status"],
        properties: {
          id: {
             bsonType: ["long", "int", "double", "null"],
             description: "Legacy auto-increment ID"
          },
          set_id: {
            bsonType: ["long", "int", "double", "string", "objectId"],
            description: "must be a valid set identifier"
          },
          sequence_id: {
            bsonType: ["long", "int", "double", "string", "objectId"],
            description: "must be a valid sequence identifier"
          },
          subscriber_id: {
            bsonType: ["long", "int", "double", "string", "objectId"],
            description: "must be a valid subscriber identifier"
          },
          email_account_id: {
            bsonType: ["long", "int", "double", "string", "objectId"],
            description: "must be a valid email account identifier"
          },
          template_id: {
            bsonType: ["long", "int", "double", "string", "objectId", "null"],
            description: "must be a valid template identifier"
          },
          message_id: {
            bsonType: ["string", "null"],
            description: "Message-ID header from the sent email"
          },
          batch_size: {
            bsonType: ["int", "long", "null"],
            description: "Batch size use for sending"
          },
          status: {
            enum: ["pending", "sending", "sent", "failed", "bounced", "replied", "unsubscribed", "skipped"],
            description: "Current status of the email"
          },
          tracking_open: {
            bsonType: ["bool", "int"],
            description: "Whether open tracking is enabled"
          },
          tracking_clicks: {
            bsonType: ["array", "object", "string", "null"], 
            description: "Click tracking data"
          },
          tracking_id: {
            bsonType: ["string", "null"],
            description: "Unique tracking identifier"
          },
          sent_at: {
            bsonType: ["date", "null"],
            description: "Date when email was sent"
          },
          opened_at: {
            bsonType: ["date", "null"],
            description: "Date when email was opened"
          },
          clicked_at: {
            bsonType: ["date", "null"],
            description: "Date when link was clicked"
          },
          replied_at: {
            bsonType: ["date", "null"],
            description: "Date when reply was received"
          },
          unsubscribed_at: {
             bsonType: ["date", "null"],
             description: "Date when unsubscribed"
          },
          bounced_at: {
            bsonType: ["date", "null"],
            description: "Date when bounce was detected"
          },
          failed_at: {
            bsonType: ["date", "null"],
            description: "Date when sending failed"
          },
          created_at: {
            bsonType: ["date", "null"],
            description: "Creation timestamp"
          },
          updated_at: {
            bsonType: ["date", "null"],
            description: "Update timestamp"
          },
          error_message: {
            bsonType: ["string", "null"],
            description: "Error message if failed"
          }
        }
      }
    };

    await db.createCollection('drift_sequence_logs', { validator });
    console.log('✨ Created drift_sequence_logs collection with Schema Validation (MySQL Compatible).');

    // 3. Create Indexes
    const collection = db.collection('drift_sequence_logs');
    
    // MySQL Indexes
    await collection.createIndex({ sequence_id: 1 }, { name: "sequence_id_idx" });
    await collection.createIndex({ subscriber_id: 1 }, { name: "subscriber_id_idx" });
    await collection.createIndex({ email_account_id: 1 }, { name: "email_account_id_idx" });
    await collection.createIndex({ template_id: 1 }, { name: "template_id_idx" });
    await collection.createIndex({ set_id: 1 }, { name: "fk_drift_sequence_logs_set_id" }); // Matching generic FK naming often used
    
    // Additional helpful indexes
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ message_id: 1 }); 
    await collection.createIndex({ sequence_id: 1, status: 1 });

    console.log('✅ Created Indexes matching MySQL structure.');

  } catch (error) {
    console.error('❌ Error executing script:', error);
  } finally {
    await client.close();
  }
}

recreateCollection();
