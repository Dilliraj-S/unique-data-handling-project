const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * MongoDB Migration Runner
 * Runs migrations to create collections in the sun database
 */

class MigrationRunner {
  constructor(databaseName = 'sun') {
    // Support multiple databases
    const dbConfig = {
      sun: {
        uri: process.env.SUN_MONGODB_URI || 'mongodb://localhost:27017/sun',
        name: 'sun'
      },
      moon: {
        uri: process.env.MOON_MONGODB_URI || 'mongodb://localhost:27017/moon',
        name: 'moon'
      },
      pluto: {
        uri: process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto',
        name: 'pluto'
      },
      mars: {
        uri: process.env.MARS_MONGODB_URI || 'mongodb://localhost:27017/mars',
        name: 'mars'
      },
      jupiter: {
        uri: process.env.JUPITER_MONGODB_URI || 'mongodb://localhost:27017/jupiter',
        name: 'jupiter'
      },
      earth: {
        uri: process.env.EARTH_MONGODB_URI || 'mongodb://localhost:27017/earth',
        name: 'earth'
      },
      mercury: {
        uri: process.env.MERCURY_MONGODB_URI || 'mongodb://localhost:27017/mercury',
        name: 'mercury'
      },
      saturn: {
        uri: process.env.SATURN_MONGODB_URI || 'mongodb://localhost:27017/saturn',
        name: 'saturn'
      },
      neptune: {
        uri: process.env.NEPTUNE_MONGODB_URI || 'mongodb://localhost:27017/neptune',
        name: 'neptune'
      },
      central: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu',
        name: 'nextjs_stu'
      }
    };

    const config = dbConfig[databaseName] || dbConfig.sun;
    this.mongoUrl = config.uri;
    this.databaseName = config.name;
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.client = null;
    this.db = null;
  }

  async connect() {
    console.log('🔗 Connecting to MongoDB...');
    this.client = new MongoClient(this.mongoUrl);
    await this.client.connect();
    this.db = this.client.db(this.databaseName);
    console.log(`✅ Connected to database: ${this.databaseName}`);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  async ensureMigrationsCollection() {
    const collections = await this.db.listCollections({ name: 'migrations' }).toArray();
    if (collections.length === 0) {
      await this.db.createCollection('migrations');
      console.log('📋 Created migrations tracking collection');
    }
  }

  async getExecutedMigrations() {
    const migrationsCollection = this.db.collection('migrations');
    const executed = await migrationsCollection.find({}).toArray();
    return executed.map(m => m.name);
  }

  async markMigrationAsExecuted(migrationName) {
    const migrationsCollection = this.db.collection('migrations');
    await migrationsCollection.insertOne({
      name: migrationName,
      executed_at: new Date()
    });
  }

  async removeMigrationRecord(migrationName) {
    const migrationsCollection = this.db.collection('migrations');
    await migrationsCollection.deleteOne({ name: migrationName });
  }

  async loadMigrations() {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort();

    const migrations = [];
    for (const file of files) {
      const filePath = path.join(this.migrationsPath, file);
      
      // Clear require cache to avoid issues
      delete require.cache[require.resolve(filePath)];
      
      try {
        const migration = require(filePath);
        
        // Validate migration structure
        if (!migration || typeof migration.up !== 'function') {
          console.error(`❌ Invalid migration file: ${file}`);
          console.error('Migration must export an object with up() and down() functions');
          continue;
        }
        
        migrations.push(migration);
        console.log(`✅ Loaded migration: ${migration.name || file}`);
      } catch (error) {
        console.error(`❌ Failed to load migration: ${file}`);
        console.error(`Error: ${error.message}`);
      }
    }

    return migrations;
  }

  async runMigrations() {
    console.log('🚀 Starting migration process...\n');

    await this.connect();
    await this.ensureMigrationsCollection();

    const migrations = await this.loadMigrations();
    const executedMigrations = await this.getExecutedMigrations();

    console.log(`📁 Found ${migrations.length} migration files`);
    console.log(`✅ ${executedMigrations.length} migrations already executed\n`);

    let executed = 0;
    for (const migration of migrations) {
      // Skip migrations that are not for the current database
      // Check migration name for database-specific migrations
      const migrationDbMap = {
        'moon': 'moon',
        'mars': 'mars',
        'jupiter': 'jupiter',
        'earth': 'earth',
        'mercury': 'mercury',
        'saturn': 'saturn',
        'neptune': 'neptune',
        'nextjs_stu': 'nextjs_stu',
      };
      
      let migrationDb = null;
      for (const [dbName, dbKey] of Object.entries(migrationDbMap)) {
        if (migration.name.includes(dbKey)) {
          migrationDb = dbName;
          break;
        }
      }
      
      // If migration is database-specific
      if (migrationDb) {
        // Only run if it matches the current database
        if (migrationDb !== this.databaseName) {
          console.log(`⏭️  Skipping ${migration.name} (not for ${this.databaseName} database)`);
          continue;
        }
      } else {
        // Migration doesn't have a database name - assume it's for sun database
        // Only run for sun database
        if (this.databaseName !== 'sun') {
          console.log(`⏭️  Skipping ${migration.name} (defaults to sun database, current: ${this.databaseName})`);
          continue;
        }
      }
      
      if (!executedMigrations.includes(migration.name)) {
        console.log(`⏳ Running migration: ${migration.name}`);
        
        try {
          await migration.up(this.db);
          await this.markMigrationAsExecuted(migration.name);
          executed++;
          console.log(`✅ Migration completed: ${migration.name}\n`);
        } catch (error) {
          console.error(`❌ Migration failed: ${migration.name}`);
          console.error(`Error: ${error.message}\n`);
          break;
        }
      } else {
        console.log(`⏭️  Skipping already executed: ${migration.name}`);
      }
    }

    console.log(`\n🎉 Migration process completed!`);
    console.log(`📊 Executed ${executed} new migrations`);

    await this.disconnect();
  }

  async rollbackLastMigration() {
    console.log('🔄 Starting rollback process...\n');

    await this.connect();
    await this.ensureMigrationsCollection();

    const migrations = await this.loadMigrations();
    const executedMigrations = await this.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('ℹ️  No migrations to rollback');
      await this.disconnect();
      return;
    }

    // Get the last executed migration
    const lastExecuted = executedMigrations[executedMigrations.length - 1];
    const migration = migrations.find(m => m.name === lastExecuted);

    if (!migration) {
      console.error(`❌ Migration file not found for: ${lastExecuted}`);
      await this.disconnect();
      return;
    }

    console.log(`⏳ Rolling back migration: ${migration.name}`);

    try {
      await migration.down(this.db);
      await this.removeMigrationRecord(migration.name);
      console.log(`✅ Rollback completed: ${migration.name}`);
    } catch (error) {
      console.error(`❌ Rollback failed: ${migration.name}`);
      console.error(`Error: ${error.message}`);
    }

    await this.disconnect();
  }

  async showStatus() {
    console.log('📊 Migration Status\n');

    await this.connect();
    await this.ensureMigrationsCollection();

    const migrations = await this.loadMigrations();
    const executedMigrations = await this.getExecutedMigrations();

    console.log('Available Migrations:');
    console.log('====================');
    
    for (const migration of migrations) {
      const status = executedMigrations.includes(migration.name) ? '✅ Executed' : '⏳ Pending';
      console.log(`${status} - ${migration.name}`);
    }

    console.log(`\nTotal: ${migrations.length} migrations`);
    console.log(`Executed: ${executedMigrations.length}`);
    console.log(`Pending: ${migrations.length - executedMigrations.length}`);

    await this.disconnect();
  }
}

// CLI Interface
async function main() {
  // Support database parameter: node migrate.js up moon
  const command = process.argv[2];
  const databaseName = process.argv[3] || 'sun';
  
  const runner = new MigrationRunner(databaseName);

  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await runner.runMigrations();
        break;
      
      case 'down':
      case 'rollback':
        await runner.rollbackLastMigration();
        break;
      
      case 'status':
        await runner.showStatus();
        break;
      
      default:
        console.log('MongoDB Migration Runner');
        console.log('========================');
        console.log('');
        console.log('Usage:');
        console.log('  node migrate.js up [database]       - Run pending migrations (default: sun)');
        console.log('  node migrate.js down [database]      - Rollback last migration (default: sun)');
        console.log('  node migrate.js status [database]    - Show migration status (default: sun)');
        console.log('');
        console.log('Available databases: sun, moon, pluto, mars, jupiter, earth, mercury, saturn, neptune, central');
        console.log('');
        console.log('Examples:');
        console.log('  node migrate.js up sun      - Run migrations for sun database');
        console.log('  node migrate.js up moon     - Run migrations for moon database');
        console.log('  node migrate.js up mars     - Run migrations for mars database');
        console.log('  node migrate.js up jupiter - Run migrations for jupiter database');
        console.log('  node migrate.js up earth    - Run migrations for earth database');
        console.log('  node migrate.js up mercury  - Run migrations for mercury database');
        console.log('  node migrate.js up saturn   - Run migrations for saturn database');
        console.log('  node migrate.js up neptune  - Run migrations for neptune database');
        console.log('');
        console.log('Current Environment:');
        console.log(`  Database: ${databaseName}`);
        console.log(`  MongoDB URI: ${runner.mongoUrl}`);
        break;
    }
  } catch (error) {
    console.error('❌ Migration process failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = MigrationRunner;
