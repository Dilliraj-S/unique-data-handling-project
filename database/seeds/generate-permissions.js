/**
 * MongoDB Seed: Generate Permissions for All Modules, Sections, and Items
 * 
 * This script automatically generates permissions for:
 * - Module level: {action}:{module} (e.g., view:developer)
 * - Section level: {action}:{module}::{section} (e.g., view:developer::users)
 * - Item level: {action}:{module}::{section}::{item} (e.g., view:developer::users::user-list)
 * 
 * Permission types: create, view, edit, delete, import, export
 * 
 * Run: node database/seeds/generate-permissions.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';

// Permission types to generate
const permissionTypes = ['create', 'view', 'edit', 'delete', 'import', 'export'];

// Generate unique permission_id
function generatePermissionId(prefix = 'PERM') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}

async function generatePermissions() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';
    const db = client.db(dbName);
    
    console.log(`📦 Using database: ${dbName}\n`);
    
    // Get collections
    const modulesCollection = db.collection('skeleton_modules');
    const sectionsCollection = db.collection('skeleton_sections');
    const itemsCollection = db.collection('skeleton_items');
    const permissionsCollection = db.collection('permissions');
    
    // Fetch all modules, sections, and items
    const allModules = await modulesCollection.find({
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    }).sort({ order: 1 }).toArray();
    
    const allSections = await sectionsCollection.find({
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    }).sort({ order: 1 }).toArray();
    
    const allItems = await itemsCollection.find({
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    }).sort({ order: 1 }).toArray();
    
    console.log(`📊 Found ${allModules.length} modules, ${allSections.length} sections, ${allItems.length} items\n`);
    
    if (allModules.length === 0) {
      console.log('⚠️  No modules found. Please create modules first.');
      return;
    }
    
    const now = new Date();
    const permissionsToInsert = [];
    let permissionCounter = 1;
    
    // Generate permissions for each module
    for (const module of allModules) {
      const moduleName = module.name;
      console.log(`\n📦 Processing module: ${moduleName} (${module.display || moduleName})`);
      
      // Module-level permissions
      for (const permType of permissionTypes) {
        const permName = `${permType}:${moduleName}`;
        
        // Check if permission already exists
        const existing = await permissionsCollection.findOne({ name: permName });
        if (existing) {
          console.log(`   ⏭️  Skipping (exists): ${permName}`);
          continue;
        }
        
        const permissionId = generatePermissionId('PERM');
        permissionsToInsert.push({
          permission_id: permissionId,
          name: permName,
          is_approved: true,
          is_skeleton: 1, // 1 = skeleton permission, 0 = custom
          created_by: 'SYSTEM',
          updated_by: 'SYSTEM',
          created_at: now,
          updated_at: now,
          deleted_at: null
        });
        console.log(`   ✅ Created: ${permName} (${permissionId})`);
        permissionCounter++;
      }
      
      // Section-level permissions
      const moduleSections = allSections.filter(s => s.module_id === module.module_id);
      for (const section of moduleSections) {
        const sectionName = section.name;
        console.log(`   📁 Processing section: ${sectionName}`);
        
        for (const permType of permissionTypes) {
          const permName = `${permType}:${moduleName}::${sectionName}`;
          
          // Check if permission already exists
          const existing = await permissionsCollection.findOne({ name: permName });
          if (existing) {
            console.log(`      ⏭️  Skipping (exists): ${permName}`);
            continue;
          }
          
          const permissionId = generatePermissionId('PERM');
          permissionsToInsert.push({
            permission_id: permissionId,
            name: permName,
            is_approved: true,
            is_skeleton: 1,
            created_by: 'SYSTEM',
            updated_by: 'SYSTEM',
            created_at: now,
            updated_at: now,
            deleted_at: null
          });
          console.log(`      ✅ Created: ${permName} (${permissionId})`);
          permissionCounter++;
        }
        
        // Item-level permissions
        const sectionItems = allItems.filter(i => i.section_id === section.section_id);
        for (const item of sectionItems) {
          const itemName = item.name;
          console.log(`         📄 Processing item: ${itemName}`);
          
          for (const permType of permissionTypes) {
            const permName = `${permType}:${moduleName}::${sectionName}::${itemName}`;
            
            // Check if permission already exists
            const existing = await permissionsCollection.findOne({ name: permName });
            if (existing) {
              console.log(`            ⏭️  Skipping (exists): ${permName}`);
              continue;
            }
            
            const permissionId = generatePermissionId('PERM');
            permissionsToInsert.push({
              permission_id: permissionId,
              name: permName,
              is_approved: true,
              is_skeleton: 1,
              created_by: 'SYSTEM',
              updated_by: 'SYSTEM',
              created_at: now,
              updated_at: now,
              deleted_at: null
            });
            console.log(`            ✅ Created: ${permName} (${permissionId})`);
            permissionCounter++;
          }
        }
      }
    }
    
    // Insert all permissions
    if (permissionsToInsert.length > 0) {
      console.log(`\n💾 Inserting ${permissionsToInsert.length} new permissions...`);
      const result = await permissionsCollection.insertMany(permissionsToInsert, { ordered: false });
      console.log(`✅ Successfully inserted ${result.insertedCount} permissions`);
    } else {
      console.log('\n✅ All permissions already exist. No new permissions to insert.');
    }
    
    // Summary
    const totalPermissions = await permissionsCollection.countDocuments({
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    });
    
    console.log('\n📊 Summary:');
    console.log(`   Total permissions in database: ${totalPermissions}`);
    console.log(`   New permissions created: ${permissionsToInsert.length}`);
    console.log(`   Modules processed: ${allModules.length}`);
    console.log(`   Sections processed: ${allSections.length}`);
    console.log(`   Items processed: ${allItems.length}`);
    
    // Show sample permissions
    console.log('\n📋 Sample permissions created:');
    const samplePermissions = await permissionsCollection.find({
      is_approved: true,
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    }).limit(10).toArray();
    
    samplePermissions.forEach(perm => {
      console.log(`   - ${perm.name} (${perm.permission_id})`);
    });
    
  } catch (error) {
    console.error('❌ Error generating permissions:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the seed
generatePermissions()
  .then(() => {
    console.log('\n✅ Permission generation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Permission generation failed:', error);
    process.exit(1);
  });

