/**
 * Test OpenRouter API - Run this to verify your API key works
 * Usage: node test-openrouter.js
 */

import 'dotenv/config';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

console.log('='.repeat(60));
console.log('OpenRouter API Test');
console.log('='.repeat(60));

// Check API key
if (!OPENROUTER_API_KEY) {
  console.error('❌ ERROR: OPENROUTER_API_KEY not found in .env');
  process.exit(1);
}

console.log(`✅ API Key found: ${OPENROUTER_API_KEY.substring(0, 20)}...`);
console.log();

// Models to test
const models = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

async function testModel(model) {
  console.log(`🧪 Testing: ${model}`);
  
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://example.com',
        'X-Title': 'API Test',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Reply with just the word "OK"' }
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    const status = response.status;
    const data = await response.json();

    if (status === 200) {
      const reply = data?.choices?.[0]?.message?.content || 'No content';
      console.log(`   ✅ SUCCESS! Response: "${reply.trim()}"`);
      return { success: true, model, reply };
    } else if (status === 429) {
      console.log(`   ⚠️ RATE LIMITED (429) - ${data?.error?.message || 'Too many requests'}`);
      return { success: false, model, error: 'rate_limited' };
    } else if (status === 401) {
      console.log(`   ❌ UNAUTHORIZED (401) - Invalid API key`);
      return { success: false, model, error: 'invalid_key' };
    } else if (status === 404) {
      console.log(`   ❌ NOT FOUND (404) - Model doesn't exist`);
      return { success: false, model, error: 'model_not_found' };
    } else {
      console.log(`   ❌ ERROR (${status}): ${JSON.stringify(data)}`);
      return { success: false, model, error: `http_${status}` };
    }
  } catch (err) {
    console.log(`   ❌ NETWORK ERROR: ${err.message}`);
    return { success: false, model, error: err.message };
  }
}

async function runTests() {
  console.log('Testing models with 5-second delay between each...\n');
  
  const results = [];
  
  for (const model of models) {
    const result = await testModel(model);
    results.push(result);
    
    // Wait 5 seconds between tests
    if (models.indexOf(model) < models.length - 1) {
      console.log('   ⏳ Waiting 5 seconds...\n');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const rateLimited = results.filter(r => r.error === 'rate_limited');
  const invalidKey = results.filter(r => r.error === 'invalid_key');
  
  if (successful.length > 0) {
    console.log(`✅ ${successful.length}/${models.length} models work`);
    console.log('   Working models:', successful.map(r => r.model).join(', '));
  }
  
  if (rateLimited.length > 0) {
    console.log(`⚠️ ${rateLimited.length}/${models.length} models rate limited`);
    console.log('   This is a FREE tier limitation. You need to:');
    console.log('   1. Wait ~1 minute between batches OR');
    console.log('   2. Add credits to your OpenRouter account');
  }
  
  if (invalidKey.length > 0) {
    console.log(`❌ API key is INVALID. Check your .env file.`);
  }

  console.log('\n' + '='.repeat(60));
  
  if (successful.length === 0 && rateLimited.length === models.length) {
    console.log('💡 TIP: All models are rate limited.');
    console.log('   FREE tier has ~10-20 requests/minute GLOBAL limit.');
    console.log('   This is shared across ALL free models.');
    console.log('   Wait 1-2 minutes and try running this test again.');
  }
}

runTests();
