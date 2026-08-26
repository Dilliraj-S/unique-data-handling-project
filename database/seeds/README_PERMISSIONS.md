# Permissions Seed File

## Overview

The `generate-permissions.js` script automatically generates permissions for all modules, sections, and items in your database.

## Permission Naming Convention

Permissions follow this hierarchical structure:

- **Module Level**: `{action}:{module}`
  - Example: `view:developer`, `create:developer`, `edit:developer`

- **Section Level**: `{action}:{module}::{section}`
  - Example: `view:developer::users`, `create:developer::users`

- **Item Level**: `{action}:{module}::{section}::{item}`
  - Example: `view:developer::users::user-list`

## Permission Types

Each level gets 6 permission types:
- `create` - Create new records
- `view` - View records (required for visibility)
- `edit` - Edit existing records
- `delete` - Delete records
- `import` - Import data
- `export` - Export data

## How to Run

### Option 1: Using npm script
```bash
npm run db:generate-permissions
```

### Option 2: Direct node command
```bash
node database/seeds/generate-permissions.js
```

## What It Does

1. **Reads from database**:
   - Fetches all modules from `skeleton_modules`
   - Fetches all sections from `skeleton_sections`
   - Fetches all items from `skeleton_items`

2. **Generates permissions**:
   - Creates module-level permissions for each module
   - Creates section-level permissions for each section
   - Creates item-level permissions for each item

3. **Checks for duplicates**:
   - Skips permissions that already exist
   - Only inserts new permissions

4. **Inserts into database**:
   - Inserts all new permissions into `permissions` collection

## Example Output

```
✅ Connected to MongoDB
📦 Using database: nextjs_stu

📊 Found 2 modules, 5 sections, 0 items

📦 Processing module: developer (Developer Mode)
   ✅ Created: create:developer (PERM_ABC123)
   ✅ Created: view:developer (PERM_ABC124)
   ✅ Created: edit:developer (PERM_ABC125)
   ...
   📁 Processing section: users
      ✅ Created: create:developer::users (PERM_ABC130)
      ✅ Created: view:developer::users (PERM_ABC131)
      ...

💾 Inserting 72 new permissions...
✅ Successfully inserted 72 permissions

📊 Summary:
   Total permissions in database: 72
   New permissions created: 72
   Modules processed: 2
   Sections processed: 5
   Items processed: 0
```

## Permission Structure in Database

Each permission document has this structure:

```javascript
{
  permission_id: "PERM_ABC123",        // Unique ID
  name: "view:developer",              // Permission name
  is_approved: true,                    // Approval status
  is_skeleton: 1,                      // 1 = skeleton, 0 = custom
  created_by: "SYSTEM",
  updated_by: "SYSTEM",
  created_at: ISODate("2025-01-XX"),
  updated_at: ISODate("2025-01-XX"),
  deleted_at: null                     // Soft delete
}
```

## When to Run

Run this script:
- **After creating new modules** - To generate permissions for new modules
- **After creating new sections** - To generate permissions for new sections
- **After creating new items** - To generate permissions for new items
- **Initial setup** - To generate all permissions for existing modules/sections/items

## Notes

- The script is **idempotent** - safe to run multiple times
- It will **skip existing permissions** - won't create duplicates
- It only processes **non-deleted** modules/sections/items
- All permissions are marked as `is_skeleton: 1` (system permissions)
- All permissions are marked as `is_approved: true`

## Troubleshooting

### No permissions created
- Check if modules exist: `db.skeleton_modules.find({})`
- Check if sections exist: `db.skeleton_sections.find({})`
- Verify database connection in `.env` file

### Duplicate key errors
- Permissions already exist - this is normal, script will skip them
- Check existing permissions: `db.permissions.find({ name: "view:developer" })`

### Missing permissions
- Run the script again after creating new modules/sections/items
- Check console output for any skipped permissions

## Related Files

- `database/migrations/001_create_collections.js` - Creates collections and indexes
- `database/seeds/seed-all-collections.js` - Seeds other collections
- `pages/api/System/Central/Developer/ShowEditCtrl.js` - Uses permissions for user permissions modal

