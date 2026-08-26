const { MongoClient } = require('mongodb');
const MasterFlowService = require('./src/application/Services/MasterFlowService');
const path = require('path');

async function run() {
  console.log('🚀 Starting schema verification...');
  const service = new MasterFlowService();
  
  try {
    const { db } = await service.getDbConnection('moon');
    console.log('✅ Connected to moon database.');
    
    console.log('🔍 Fetching schema for master_copy...');
    const columns = await service.getCollectionSchema(db, 'master_copy');
    
    console.log(`📊 Found ${columns.length} columns.`);
    
    if (columns.length > 0) {
      console.log('First 5 columns:', columns.slice(0, 5));
      console.log('Last 5 columns:', columns.slice(-5));
    }
    
    let success = true;
    
    if (columns.length === 135) {
      console.log('✅ SUCCESS: Found exactly 135 columns.');
    } else {
      console.error(`❌ FAILURE: Expected 135 columns, found ${columns.length}.`);
      success = false;
    }
    
    if (columns[0] === 'id') {
      console.log('✅ SUCCESS: First column is "id".');
    } else {
      console.error(`❌ FAILURE: First column is "${columns[0]}", expected "id".`);
      success = false;
    }
    
    // Check for status and reason
    if (columns.includes('status')) {
      console.log('✅ SUCCESS: "status" column found.');
    } else {
      console.error('❌ FAILURE: "status" column NOT found.');
      success = false;
    }
    
    if (columns.includes('reason')) {
      console.log('✅ SUCCESS: "reason" column found.');
    } else {
      console.error('❌ FAILURE: "reason" column NOT found.');
      success = false;
    }

    if (success) {
      console.log('🎉 Verification passed!');
    } else {
      console.error('💥 Verification failed.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    // Close connections
    for (const key in service.dbConnections) {
      await service.dbConnections[key].client.close();
    }
    process.exit(0);
  }
}

run();
