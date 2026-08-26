/**
 * Script to check for existence of _t tokens for filter pages
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

const MONGO_URI = process.env.SUN_DATABASE_URL || process.env.MONGODB_URI;

// Token bases to check
const TOKEN_BASES = [
  'central_filters_master_leads',
  'central_filters_apollo',
  'central_filters_dlslinkedin',
  'central_filters_karur',
  'central_filters_outsourcing',
  'central_filters_zoom',
  'central_filters_other'
];

async function checkTokens() {
  const output = [];
  const log = (msg) => {
    console.log(msg);
    output.push(msg);
  };
  
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    log('Connected to MongoDB');
    
    // skeleton_tokens are in the central database
    const centralDb = client.db('nextjs_stu');
    const tokensCollection = centralDb.collection('skeleton_tokens');
    
    log('\nChecking tokens and their _t variants...\n');
    
    for (const base of TOKEN_BASES) {
      const tVariant = `${base}_t`;
      
      const baseToken = await tokensCollection.findOne({ key: base });
      const tToken = await tokensCollection.findOne({ key: tVariant });
      
      log(`BASE: ${base}`);
      if (baseToken) {
        log(`  ✅ Exists. Table: ${baseToken.table}`);
      } else {
        log(`  ❌ MISSING`);
      }
      
      log(`VARIANT: ${tVariant}`);
      if (tToken) {
        log(`  ⚠️ Exists. Table: ${tToken.table}`);
      } else {
        log(`  ℹ️ Does not exist (Will fallback to base)`);
      }
      log('---');
    }
    
    // Write output to file
    fs.writeFileSync('./scripts/content-check-output.txt', output.join('\n'));
    log('\nOutput saved to scripts/content-check-output.txt');
    
  } catch (error) {
    log(`Error: ${error.message}`);
  } finally {
    await client.close();
    log('Disconnected from MongoDB');
  }
}

checkTokens();
