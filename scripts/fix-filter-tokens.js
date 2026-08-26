/**
 * Script to check and fix skeleton_tokens for filter pages
 * Each filter token must have the correct 'table' field pointing to its collection
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

const MONGO_URI = process.env.SUN_DATABASE_URL || process.env.MONGODB_URI;

// Expected token -> table mappings
const EXPECTED_TOKEN_TABLES = {
  'central_filters_master_leads': 'master_leads',
  'central_filters_apollo': 'apollo',
  'central_filters_dlslinkedin': 'dlslinkedin',
  'central_filters_karur': 'karur',
  'central_filters_outsourcing': 'outsourcing',
  'central_filters_zoom': 'zoom',
  'central_filters_other': 'other'
};

async function checkAndFixTokens() {
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
    
    log('\nChecking skeleton_tokens for filter pages...\n');
    
    let fixedCount = 0;
    let correctCount = 0;
    let missingCount = 0;
    
    for (const [tokenKey, expectedTable] of Object.entries(EXPECTED_TOKEN_TABLES)) {
      const token = await tokensCollection.findOne({ key: tokenKey });
      
      if (!token) {
        log(`MISSING: ${tokenKey} - Need to create with table: ${expectedTable}`);
        missingCount++;
        continue;
      }
      
      const currentTable = token.table;
      const isCorrect = currentTable === expectedTable;
      
      if (isCorrect) {
        log(`OK: ${tokenKey} -> ${currentTable}`);
        correctCount++;
      } else {
        log(`FIXING: ${tokenKey} from "${currentTable}" to "${expectedTable}"`);
        
        await tokensCollection.updateOne(
          { key: tokenKey },
          { $set: { table: expectedTable } }
        );
        
        fixedCount++;
        log(`  -> Fixed!`);
      }
    }
    
    log(`\n--- SUMMARY ---`);
    log(`Correct: ${correctCount}`);
    log(`Fixed: ${fixedCount}`);
    log(`Missing: ${missingCount}`);
    
    // Write output to file
    fs.writeFileSync('./scripts/token-check-output.txt', output.join('\n'));
    log('\nOutput saved to scripts/token-check-output.txt');
    
  } catch (error) {
    log(`Error: ${error.message}`);
  } finally {
    await client.close();
    log('Disconnected from MongoDB');
  }
}

checkAndFixTokens();
