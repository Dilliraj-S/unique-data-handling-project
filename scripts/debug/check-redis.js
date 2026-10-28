#!/usr/bin/env node

/**
 * Redis Connection Checker
 * Checks if Redis is running and accessible
 */

const Redis = require('ioredis');

async function checkRedis() {
  console.log('🔍 Checking Redis connection...');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout: 3000,
  });

  try {
    await redis.connect();
    console.log('✅ Redis is running and accessible');
    
    // Test basic operations
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    await redis.del('test_key');
    
    if (value === 'test_value') {
      console.log('✅ Redis read/write operations working');
    }
    
    await redis.disconnect();
    console.log('🎉 Redis check completed successfully');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('\n💡 Solutions:');
    console.log('1. Install Redis: https://redis.io/download');
    console.log('2. Start Redis server: redis-server');
    console.log('3. Or use Docker: docker run -d -p 6379:6379 redis:alpine');
    console.log('4. Check if Redis is running: redis-cli ping');
    
    process.exit(1);
  }
}

checkRedis();
