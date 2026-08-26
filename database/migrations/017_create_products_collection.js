/**
 * Migration: Create products collection in the nextjs_stu database
 * Mirrors the MySQL products table structure with equivalent indexes.
 */

const migration = {
  // Include "nextjs_stu" so migrate.js knows this migration is for the nextjs_stu database
  name: '017_nextjs_stu_create_products_collection',

  /**
   * @param {import('mongodb').Db} db - Mongo DB instance
   */
  async up(db) {
    console.log('Creating products collection with schema validation...');

    const collections = await db.listCollections({ name: 'products' }).toArray();
    if (collections.length > 0) {
      console.log('⚠️ products collection already exists, dropping and recreating...');
      await db.dropCollection('products');
    }

    // Define the JSON schema validator for products collection
    const schemaValidator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'product_name'],
        properties: {
          _id: { bsonType: 'objectId' },
          
          // id (Primary Key in MySQL)
          id: { bsonType: ['int', 'long', 'double', 'string'] },
          
          // product_id (varchar(20))
          product_id: { bsonType: ['string', 'null'] },
          
          // product_name (varchar(255) Unique)
          product_name: { bsonType: ['string', 'null'] },
          
          // description (text)
          description: { bsonType: ['string', 'null'] },
          
          // source_description (text)
          source_description: { bsonType: ['string', 'null'] },
          
          // pp_id (bigint(20) unsigned)
          pp_id: { bsonType: ['int', 'long', 'double', 'string', 'null'] },
          
          // pp_name (varchar(50))
          pp_name: { bsonType: ['string', 'null'] },
          
          // category (text)
          category: { bsonType: ['string', 'null'] },
          
          // vendor (text)
          vendor: { bsonType: ['string', 'null'] },
          
          // companies (longtext)
          companies: { bsonType: ['string', 'null'] },
          
          // contacts (longtext)
          contacts: { bsonType: ['string', 'null'] },
          
          // companies_count (int)
          companies_count: { bsonType: ['int', 'long', 'double', 'null'] },
          
          // contacts_count (int)
          contacts_count: { bsonType: ['int', 'long', 'double', 'null'] },
          
          // Timestamps
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          
          // User tracking
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] }
        },
        additionalProperties: true
      }
    };

    // Create collection with schema validation
    await db.createCollection('products', { validator: schemaValidator });
    console.log('✅ products collection created with schema validation');

    const collection = db.collection('products');

    // Create indexes equivalent to MySQL indexes
    
    // PRIMARY KEY (`id`)
    await collection.createIndex({ id: 1 }, { name: 'pk_id', unique: true });

    // KEY `product_name` (`product_name`) — regular index (not unique, multiple products can share names)
    await collection.createIndex({ product_name: 1 }, { name: 'product_name_index' });

    // KEY `pp_id` (`pp_id`)
    await collection.createIndex({ pp_id: 1 }, { name: 'pp_id_index' });

    // KEY `pp_name` (`pp_name`)
    await collection.createIndex({ pp_name: 1 }, { name: 'pp_name_index' });
    
    // Performance indexes (optional but good for lookups)
    await collection.createIndex({ product_id: 1 }, { name: 'product_id_index' });

    console.log('✅ products indexes created/ensured');
  },

  async down(db) {
    console.log('Rolling back: Dropping products collection (if exists)...');
    try {
      const collections = await db.listCollections({ name: 'products' }).toArray();
      if (collections.length > 0) {
        await db.dropCollection('products');
        console.log('✅ products collection dropped');
      } else {
        console.log('ℹ️ products collection does not exist, nothing to drop');
      }
    } catch (error) {
      console.error('⚠️ Error dropping products collection:', error.message);
    }
  }
};

module.exports = migration;
