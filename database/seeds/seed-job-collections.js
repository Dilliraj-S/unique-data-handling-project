#!/usr/bin/env node

/**
 * Job Collections Seeder
 * Creates job management collections similar to BV project Laravel queue tables
 * Collections: jobs, job_batches, failed_jobs, process_logs
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const collections = [
  {
    name: 'jobs',
    description: 'Laravel-style job queue collection',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['queue', 'payload', 'attempts', 'available_at', 'created_at'],
        properties: {
          id: {
            bsonType: 'objectId',
            description: 'Auto-generated MongoDB ObjectId'
          },
          queue: {
            bsonType: 'string',
            maxLength: 255,
            description: 'Queue name (e.g., high, default, low)'
          },
          payload: {
            bsonType: 'string',
            description: 'Serialized job data and class information'
          },
          attempts: {
            bsonType: 'int',
            minimum: 0,
            maximum: 255,
            description: 'Number of attempts made'
          },
          reserved_at: {
            bsonType: ['int', 'null'],
            description: 'Unix timestamp when job was reserved'
          },
          available_at: {
            bsonType: 'int',
            description: 'Unix timestamp when job becomes available'
          },
          created_at: {
            bsonType: 'int',
            description: 'Unix timestamp when job was created'
          }
        }
      }
    },
    indexes: [
      { queue: 1 },
      { available_at: 1 },
      { reserved_at: 1 },
      { created_at: 1 }
    ]
  },
  {
    name: 'job_batches',
    description: 'Job batch tracking collection',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'name', 'total_jobs', 'pending_jobs', 'failed_jobs', 'failed_job_ids', 'created_at'],
        properties: {
          id: {
            bsonType: 'string',
            maxLength: 255,
            description: 'Batch ID (string primary key)'
          },
          name: {
            bsonType: 'string',
            maxLength: 255,
            description: 'Batch name'
          },
          total_jobs: {
            bsonType: 'int',
            minimum: 0,
            description: 'Total number of jobs in batch'
          },
          pending_jobs: {
            bsonType: 'int',
            minimum: 0,
            description: 'Number of pending jobs'
          },
          failed_jobs: {
            bsonType: 'int',
            minimum: 0,
            description: 'Number of failed jobs'
          },
          failed_job_ids: {
            bsonType: 'string',
            description: 'JSON array of failed job IDs'
          },
          options: {
            bsonType: ['string', 'null'],
            description: 'Batch options as JSON'
          },
          cancelled_at: {
            bsonType: ['int', 'null'],
            description: 'Unix timestamp when batch was cancelled'
          },
          created_at: {
            bsonType: 'int',
            description: 'Unix timestamp when batch was created'
          },
          finished_at: {
            bsonType: ['int', 'null'],
            description: 'Unix timestamp when batch finished'
          }
        }
      }
    },
    indexes: [
      { id: 1 },
      { name: 1 },
      { created_at: 1 },
      { finished_at: 1 }
    ]
  },
  {
    name: 'failed_jobs',
    description: 'Failed job tracking collection',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['uuid', 'connection', 'queue', 'payload', 'exception', 'failed_at'],
        properties: {
          id: {
            bsonType: 'objectId',
            description: 'Auto-generated MongoDB ObjectId'
          },
          uuid: {
            bsonType: 'string',
            maxLength: 255,
            description: 'Unique job identifier'
          },
          connection: {
            bsonType: 'string',
            description: 'Queue connection name'
          },
          queue: {
            bsonType: 'string',
            description: 'Queue name where job failed'
          },
          payload: {
            bsonType: 'string',
            description: 'Serialized job data'
          },
          exception: {
            bsonType: 'string',
            description: 'Exception details and stack trace'
          },
          failed_at: {
            bsonType: 'date',
            description: 'Timestamp when job failed'
          },
          created_at: {
            bsonType: ['date', 'null'],
            description: 'Record creation timestamp'
          },
          updated_at: {
            bsonType: ['date', 'null'],
            description: 'Record update timestamp'
          },
          deleted_at: {
            bsonType: ['date', 'null'],
            description: 'Soft delete timestamp'
          },
          created_by: {
            bsonType: ['string', 'null'],
            maxLength: 20,
            description: 'User who created the record'
          },
          updated_by: {
            bsonType: ['string', 'null'],
            maxLength: 20,
            description: 'User who updated the record'
          }
        }
      }
    },
    indexes: [
      { uuid: 1 },
      { queue: 1 },
      { failed_at: 1 },
      { created_at: 1 }
    ]
  },
  {
    name: 'process_logs',
    description: 'Import process tracking collection (main import log)',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['process_id', 'user_id', 'table', 'progress', 'status'],
        properties: {
          id: {
            bsonType: 'objectId',
            description: 'Auto-generated MongoDB ObjectId'
          },
          process_id: {
            bsonType: 'string',
            maxLength: 255,
            description: 'Unique process identifier (UUID)'
          },
          user_id: {
            bsonType: 'string',
            maxLength: 20,
            description: 'User ID who initiated the process'
          },
          file: {
            bsonType: ['string', 'null'],
            maxLength: 150,
            description: 'Uploaded file name'
          },
          database: {
            bsonType: ['string', 'null'],
            maxLength: 20,
            description: 'Target database name'
          },
          table: {
            bsonType: 'string',
            maxLength: 30,
            description: 'Target collection/table name'
          },
          type: {
            bsonType: ['string', 'null'],
            maxLength: 20,
            description: 'Process type (import, export, etc.)'
          },
          progress: {
            bsonType: 'string',
            description: 'JSON progress data (total, inserted, rejected counts)'
          },
          status: {
            bsonType: 'string',
            maxLength: 50,
            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
            description: 'Process status'
          },
          created_at: {
            bsonType: ['date', 'null'],
            description: 'Record creation timestamp'
          },
          updated_at: {
            bsonType: ['date', 'null'],
            description: 'Record update timestamp'
          },
          deleted_at: {
            bsonType: ['date', 'null'],
            description: 'Soft delete timestamp'
          },
          created_by: {
            bsonType: ['string', 'null'],
            maxLength: 20,
            description: 'User who created the record'
          },
          updated_by: {
            bsonType: ['string', 'null'],
            maxLength: 20,
            description: 'User who updated the record'
          }
        }
      }
    },
    indexes: [
      { process_id: 1 },
      { user_id: 1 },
      { status: 1 },
      { created_at: 1 },
      { database: 1, table: 1 }
    ]
  }
];

async function createJobCollections() {
  const client = new MongoClient(process.env.SUN_MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB (nextjs_stu database)');
    
    const db = client.db('nextjs_stu');
    
    for (const collectionConfig of collections) {
      const { name, description, validator, indexes } = collectionConfig;
      
      console.log(`\n📦 Creating collection: ${name}`);
      console.log(`📝 Description: ${description}`);
      
      // Drop collection if exists
      try {
        await db.collection(name).drop();
        console.log(`🗑️  Dropped existing ${name} collection`);
      } catch (error) {
        // Collection doesn't exist, that's fine
      }
      
      // Create collection with validation
      await db.createCollection(name, { validator });
      console.log(`✅ Created ${name} collection with validation`);
      
      // Create indexes
      const collection = db.collection(name);
      for (const index of indexes) {
        await collection.createIndex(index);
        console.log(`📊 Created index: ${JSON.stringify(index)}`);
      }
      
      console.log(`🎉 ${name} collection setup complete`);
    }
    
    console.log('\n🎯 Summary:');
    console.log('✅ jobs - Laravel-style job queue');
    console.log('✅ job_batches - Batch job tracking');
    console.log('✅ failed_jobs - Failed job logging');
    console.log('✅ process_logs - Import process tracking (main)');
    
    console.log('\n📊 Collection Stats:');
    for (const { name } of collections) {
      try {
        const count = await db.collection(name).countDocuments();
        console.log(`   ${name}: ${count} documents`);
      } catch (error) {
        console.log(`   ${name}: 0 documents`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating job collections:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the seeder
if (require.main === module) {
  createJobCollections()
    .then(() => {
      console.log('\n🎉 Job collections seeded successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { createJobCollections };
