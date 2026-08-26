# MongoDB Migration System

This directory contains the MongoDB migration system for converting MySQL tables to MongoDB collections in the **sun** database.

## 📁 Directory Structure

```
database/
├── migrations/
│   ├── 001_create_master_accounts_collection.js
│   └── 002_create_master_leads_collection.js
├── seeds/
│   └── seed-master-collections.js
├── migrate.js
└── README.md
```

## 🎯 Collections Created

### 1. master_accounts
Equivalent to MySQL `master_accounts` table:
- **Fields**: company, smtp, industry, website, address fields, location, need_to_action, timestamps
- **Indexes**: company, smtp, industry, need_to_action, created_at, deleted_at
- **Validation**: Schema validation with field types and constraints

### 2. master_leads  
Equivalent to MySQL `master_leads` table:
- **Fields**: name fields, email, phone fields, address fields, location, company_id, designation, industry, timestamps
- **Indexes**: email, phone, company_id, smtp, name, location fields, timestamps
- **Validation**: Required email and phone, email pattern validation
- **References**: company_id links to master_accounts collection

## 🚀 Usage Commands

### Migration Commands
```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback last migration
npm run db:migrate:rollback
```

### Seeding Commands
```bash
# Seed master collections with sample data
npm run db:seed-master
```

### Direct Commands
```bash
# Run migrations directly
node database/migrate.js up
node database/migrate.js status
node database/migrate.js down

# Run seeder directly
node database/seeds/seed-master-collections.js
```

## 📊 Migration Features

### Schema Validation
- **Field Types**: Enforced bsonType validation
- **Required Fields**: email, phone, need_to_action
- **String Lengths**: maxLength constraints matching MySQL
- **Email Validation**: Regex pattern for email format
- **Numeric Ranges**: need_to_action (0 or 1)

### Indexing Strategy
- **Primary Indexes**: Frequently queried fields
- **Compound Indexes**: Multi-field queries (email + deleted_at)
- **Sparse Indexes**: Optional fields (deleted_at, company_id)
- **Performance**: Optimized for common query patterns

### Migration Tracking
- **Migrations Collection**: Tracks executed migrations
- **Timestamps**: Records execution time
- **Rollback Support**: Undo migrations safely
- **Status Reporting**: View pending/completed migrations

## 🔧 Configuration

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017
```

### Database Settings
- **Target Database**: `sun`
- **Connection**: MongoDB client with automatic retry
- **Collections**: Auto-created with validation rules

## 📝 Sample Data

The seeder creates realistic sample data:

### Master Accounts (5 records)
- Tech Solutions Inc. (Technology)
- Marketing Pro Ltd. (Marketing)  
- Healthcare Systems (Healthcare)
- Financial Advisors Group (Finance)
- Education Excellence (Education)

### Master Leads (6 records)
- John Smith (Tech Solutions)
- Sarah Johnson (Marketing Pro)
- Michael Brown (Healthcare)
- Emily Davis (Financial Advisors)
- David Wilson (Education Excellence)
- Lisa Anderson (Freelancer - no company)

## 🔄 Migration Process

1. **Connect** to MongoDB sun database
2. **Create** migrations tracking collection
3. **Check** executed migrations
4. **Run** pending migrations in order
5. **Validate** schema and create indexes
6. **Track** completion status
7. **Report** results

## 🛡️ Data Integrity

### Validation Rules
- **Email Format**: Regex validation for proper email structure
- **Phone Numbers**: Required primary phone, optional secondary
- **References**: company_id validates ObjectId format
- **Timestamps**: Proper date type validation
- **Soft Deletes**: deleted_at field for soft deletion support

### Constraints
- **Unique Constraints**: Can be added via unique indexes
- **Foreign Keys**: Handled via application logic and ObjectId references
- **NOT NULL**: Enforced via required field validation
- **Defaults**: Set via application logic during insertion

## 🔍 Querying Examples

### Find Active Leads
```javascript
db.master_leads.find({ deleted_at: null })
```

### Find Leads by Company
```javascript
db.master_leads.find({ 
  company_id: ObjectId("..."),
  deleted_at: null 
})
```

### Find Leads Needing Action
```javascript
db.master_leads.find({ 
  need_to_action: 1,
  deleted_at: null 
})
```

### Search by Email Domain
```javascript
db.master_leads.find({ 
  email: /gmail\.com$/,
  deleted_at: null 
})
```

## 🚨 Important Notes

1. **Backup First**: Always backup existing data before running migrations
2. **Test Environment**: Run migrations in development first
3. **Index Performance**: Monitor query performance after migration
4. **Schema Evolution**: Add new migrations for schema changes
5. **Rollback Plan**: Test rollback procedures before production

## 🔄 Adding New Migrations

1. Create new migration file: `003_your_migration_name.js`
2. Follow the migration template structure
3. Include both `up` and `down` methods
4. Add proper validation and indexes
5. Test thoroughly before deployment

## 📈 Performance Considerations

- **Indexes**: Created for all frequently queried fields
- **Compound Indexes**: Optimize multi-field queries
- **Sparse Indexes**: Save space on optional fields
- **Connection Pooling**: MongoDB driver handles connections efficiently
- **Batch Operations**: Use for large data migrations

This migration system provides a robust foundation for converting your MySQL tables to MongoDB collections while maintaining data integrity and query performance.
