/**
 * Migration: Create linkedinproducts, apolloproducts, g2products collections
 * Database: nextjs_stu (central connection)
 */

const migration = {
  // Include "nextjs_stu" so migrate.js knows this migration is for the nextjs_stu database
  name: '022_nextjs_stu_create_product_sources_collections',

  /**
   * @param {import('mongodb').Db} db
   */
  async up(db) {
    console.log('🚀 Creating product source collections in nextjs_stu...');

    // Helper to (re)create a collection with simple schema + indexes
    const ensureCollection = async ({ name, schema, indexes }) => {
      const existing = await db.listCollections({ name }).toArray();
      if (existing.length > 0) {
        console.log(`⚠️ ${name} collection already exists, removing validator and dropping...`);
        
        // First, try to remove any existing validator
        try {
          await db.command({
            collMod: name,
            validator: {}
          });
          console.log(`✅ Removed existing validator from ${name}`);
        } catch (error) {
          console.log(`ℹ️ No validator to remove or error: ${error.message}`);
        }
        
        // Then drop the collection
        await db.dropCollection(name);
        console.log(`✅ Dropped ${name} collection`);
      }

      await db.createCollection(name, { validator: schema });
      console.log(`✅ ${name} collection created with schema validation`);

      const collection = db.collection(name);
      for (const idx of indexes) {
        await collection.createIndex(idx.keys, idx.options || {});
      }
      console.log(`✅ ${name} indexes created`);
    };

    // Common schema bits
    const baseProps = {
      _id: { bsonType: 'objectId' },
      id: { bsonType: ['int', 'long', 'double', 'string'] },
      created_at: { bsonType: ['date', 'string', 'null'] },
      updated_at: { bsonType: ['date', 'string', 'null'] },
      deleted_at: { bsonType: ['date', 'string', 'null'] }
    };

    // A) linkedinproducts
    await ensureCollection({
      name: 'linkedinproducts',
      schema: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'ProductName'],
          properties: {
            ...baseProps,
            // Existing fields (must be preserved)
            TechnologyCategory: { bsonType: ['string', 'null'] },
            UsedBy: { bsonType: ['string', 'null'] },
            ProductName: { bsonType: ['string', 'null'] },
            LinkedinLink: { bsonType: ['string', 'null'] },
            Company: { bsonType: ['string', 'null'] },
            Website: { bsonType: ['string', 'null'] },
            Headquarters: { bsonType: ['string', 'null'] },
            // Extended product-style fields (aligned with central products schema)
            product_id: { bsonType: ['string', 'null'] },
            product_name: { bsonType: ['string', 'null'] },
            description: { bsonType: ['string', 'null'] },
            source_description: { bsonType: ['string', 'null'] },
            pp_id: { bsonType: ['string', 'null'] },
            pp_name: { bsonType: ['string', 'null'] },
            category: { bsonType: ['string', 'null'] },
            vendor: { bsonType: ['string', 'null'] },
            contacts: { bsonType: ['string', 'null'] },
            contacts_count: { bsonType: ['int', 'long', 'double', 'null'] },
            companies: { bsonType: ['string', 'null'] },
            companies_count: { bsonType: ['int', 'long', 'double', 'null'] },
            created_by: { bsonType: ['string', 'null'] }
          },
          additionalProperties: true
        }
      },
      indexes: [
        { keys: { id: 1 }, options: { name: 'pk_id', unique: true } },
        { keys: { ProductName: 1 }, options: { name: 'product_name_index' } },
        { keys: { TechnologyCategory: 1 }, options: { name: 'technology_category_index' } },
        { keys: { Company: 1 }, options: { name: 'company_index' } }
      ]
    });

    // B) apolloproducts
    await ensureCollection({
      name: 'apolloproducts',
      schema: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'Companyname'],
          properties: {
            ...baseProps,
            // Existing fields (must be preserved)
            Companyname: { bsonType: ['string', 'null'] },
            li_smtp: { bsonType: ['string', 'null'] },
            LinkedinUrl: { bsonType: ['string', 'null'] },
            Category: { bsonType: ['string', 'null'] },
            reference_1: { bsonType: ['string', 'null'] },
            reference_2: { bsonType: ['string', 'null'] },
            reference_3: { bsonType: ['string', 'null'] },
            reference_4: { bsonType: ['string', 'null'] },
            reference_5: { bsonType: ['string', 'null'] },
            // Extended product-style fields (aligned with central products schema)
            product_id: { bsonType: ['string', 'null'] },
            product_name: { bsonType: ['string', 'null'] },
            description: { bsonType: ['string', 'null'] },
            source_description: { bsonType: ['string', 'null'] },
            pp_id: { bsonType: ['string', 'null'] },
            pp_name: { bsonType: ['string', 'null'] },
            category: { bsonType: ['string', 'null'] },
            vendor: { bsonType: ['string', 'null'] },
            contacts: { bsonType: ['string', 'null'] },
            contacts_count: { bsonType: ['int', 'long', 'double', 'null'] },
            companies: { bsonType: ['string', 'null'] },
            companies_count: { bsonType: ['int', 'long', 'double', 'null'] },
            created_by: { bsonType: ['string', 'null'] }
          },
          additionalProperties: true
        }
      },
      indexes: [
        { keys: { id: 1 }, options: { name: 'pk_id', unique: true } },
        { keys: { Companyname: 1 }, options: { name: 'companyname_index' } },
        { keys: { li_smtp: 1 }, options: { name: 'li_smtp_index' } },
        { keys: { Category: 1 }, options: { name: 'category_index' } }
      ]
    });

    // C) g2products
    await ensureCollection({
      name: 'g2products',
      schema: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'Companyname'],
          properties: {
            ...baseProps,
            // Existing fields (must be preserved)
            g2_links: { bsonType: ['string', 'null'] },
            Companyname: { bsonType: ['string', 'null'] },
            li_smtp: { bsonType: ['string', 'null'] },
            Category: { bsonType: ['string', 'null'] },
            reference_1: { bsonType: ['string', 'null'] },
            reference_2: { bsonType: ['string', 'null'] },
            reference_3: { bsonType: ['string', 'null'] },
            reference_4: { bsonType: ['string', 'null'] },
            reference_5: { bsonType: ['string', 'null'] },
            // Extended product-style fields (aligned with central products schema)
            product_id: { bsonType: ['string', 'null'] },
            product_name: { bsonType: ['string', 'null'] },
            description: { bsonType: ['string', 'null'] },
            source_description: { bsonType: ['string', 'null'] },
            pp_id: { bsonType: ['string', 'null'] },
            pp_name: { bsonType: ['string', 'null'] },
            category: { bsonType: ['string', 'null'] },
            vendor: { bsonType: ['string', 'null'] },
            contacts: { bsonType: ['string', 'null'] },
            contacts_count: { bsonType: ['int', 'long', 'double', 'null'] },
            companies: { bsonType: ['string', 'null'] },
            companies_count: { bsonType: ['int', 'long', 'double', 'null'] },
            created_by: { bsonType: ['string', 'null'] }
          },
          additionalProperties: true
        }
      },
      indexes: [
        { keys: { id: 1 }, options: { name: 'pk_id', unique: true } },
        { keys: { Companyname: 1 }, options: { name: 'companyname_index' } },
        { keys: { li_smtp: 1 }, options: { name: 'li_smtp_index' } },
        { keys: { Category: 1 }, options: { name: 'category_index' } }
      ]
    });

    console.log('✅ Product source collections created successfully');
  },

  async down(db) {
    const names = ['linkedinproducts', 'apolloproducts', 'g2products'];
    for (const name of names) {
      try {
        const existing = await db.listCollections({ name }).toArray();
        if (existing.length > 0) {
          await db.dropCollection(name);
          console.log(`✅ Dropped collection: ${name}`);
        } else {
          console.log(`ℹ️ Collection ${name} does not exist, skipping drop`);
        }
      } catch (error) {
        console.error(`⚠️ Error dropping collection ${name}:`, error.message);
      }
    }
  }
};

module.exports = migration;


