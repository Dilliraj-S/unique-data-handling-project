import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MongoClient } from 'mongodb';
import csv from 'csv-parser';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Get database URI based on database name
 */
function getMongoUri(database) {
  switch(database) {
    case 'sun':
      return process.env.SUN_MONGODB_URI || 'mongodb://localhost:27017/sun';
    case 'moon':
      return process.env.MOON_MONGODB_URI || 'mongodb://localhost:27017/moon';
    case 'pluto':
      return process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
    case 'unique':
      return process.env.UNIQUE_MONGODB_URI || 'mongodb://localhost:27017/unique';
    case 'testing':
      return process.env.TESTING_MONGODB_URI || 'mongodb://localhost:27017/testing';
    default:
      return process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';
  }
}

/**
 * Dynamically determine field category and priority based on field name patterns
 */
function getFieldCategory(fieldName, fieldSchema = null) {
  const field = fieldName.toLowerCase();
  
  // Identity fields (highest priority)
  if (field.match(/^(id|uuid|_id)$/)) return { category: 'identity', priority: 1 };
  
  // Required/Primary fields (from schema)
  // These get high priority regardless of name
  
  // Name-related fields
  if (field.match(/(name|title|label)$/)) return { category: 'name', priority: 10 };
  if (field.match(/^(first|last|full|display)_?(name|title)/)) return { category: 'name', priority: 10 };
  
  // Contact fields
  if (field.match(/(email|mail)/)) return { category: 'contact', priority: 20 };
  if (field.match(/(phone|mobile|tel|fax)/)) return { category: 'contact', priority: 21 };
  
  // Company/Organization fields
  if (field.match(/(company|organization|org|business)/)) return { category: 'company', priority: 30 };
  if (field.match(/(designation|position|role|job_title)/)) return { category: 'company', priority: 31 };
  if (field.match(/(industry|sector|department)/)) return { category: 'company', priority: 32 };
  
  // Address fields
  if (field.match(/^address/)) return { category: 'address', priority: 40 };
  if (field.match(/(city|town|village)/)) return { category: 'address', priority: 45 };
  if (field.match(/(state|province|region)/)) return { category: 'address', priority: 46 };
  if (field.match(/(district|county)/)) return { category: 'address', priority: 47 };
  if (field.match(/(pincode|zipcode|postal|zip)/)) return { category: 'address', priority: 48 };
  if (field.match(/(location|coordinates|lat|lng|longitude|latitude)/)) return { category: 'address', priority: 49 };
  
  // Web/Digital fields
  if (field.match(/(website|url|domain)/)) return { category: 'web', priority: 50 };
  if (field.match(/(smtp|server|host)/)) return { category: 'web', priority: 51 };
  
  // Status/Action fields
  if (field.match(/(status|active|enabled|disabled)/)) return { category: 'status', priority: 60 };
  if (field.match(/(action|need_to_action|flag)/)) return { category: 'status', priority: 61 };
  if (field.match(/(source|origin|channel)/)) return { category: 'status', priority: 62 };
  
  // Numeric/Measurement fields
  if (field.match(/(amount|price|cost|value|count|quantity)/)) return { category: 'numeric', priority: 65 };
  
  // Timestamp fields (lowest priority)
  if (field.match(/(created_at|created_date|date_created)/)) return { category: 'timestamp', priority: 90 };
  if (field.match(/(updated_at|modified_at|last_modified)/)) return { category: 'timestamp', priority: 91 };
  if (field.match(/(deleted_at|deleted_date|date_deleted)/)) return { category: 'timestamp', priority: 92 };
  
  // Default category for unknown fields
  return { category: 'other', priority: 70 };
}

/**
 * Sort fields dynamically based on patterns and schema information
 */
function sortFieldsLogically(fields, requiredFields = [], schema = null) {
  return fields.sort((a, b) => {
    const categoryA = getFieldCategory(a, schema?.properties?.[a]);
    const categoryB = getFieldCategory(b, schema?.properties?.[b]);
    
    // Boost priority for required fields
    const isRequiredA = requiredFields.includes(a);
    const isRequiredB = requiredFields.includes(b);
    
    let priorityA = categoryA.priority;
    let priorityB = categoryB.priority;
    
    // Required fields get a boost (subtract 5 from priority to make them higher)
    if (isRequiredA) priorityA -= 5;
    if (isRequiredB) priorityB -= 5;
    
    // Primary sort by priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Secondary sort: required fields first within same priority
    if (isRequiredA && !isRequiredB) return -1;
    if (!isRequiredA && isRequiredB) return 1;
    
    // Tertiary sort: alphabetical within same category
    return a.localeCompare(b);
  });
}

/**
 * Dynamically get table columns from MongoDB collection schema
 * Samples MULTIPLE documents to capture all fields in schemaless collections
 */
async function getDynamicTableColumns(database, table) {
  let client;
  try {
    const mongoUri = getMongoUri(database);
    client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db(database);
    const collection = db.collection(table);
    let fields = new Set();  // Use Set to collect unique field names
    let requiredFields = [];
    let schema = null;
    
    // Method 1: Try to get collection validator schema (if exists) - adds to Set
    try {
      const collectionInfo = await db.listCollections({ name: table }).toArray();
      if (collectionInfo.length > 0 && collectionInfo[0].options?.validator?.$jsonSchema?.properties) {
        schema = collectionInfo[0].options.validator.$jsonSchema;
        const properties = schema.properties;
        requiredFields = schema.required || [];
        
        Object.keys(properties)
          .filter(field => field !== '_id')
          .forEach(field => fields.add(field));
        
        console.log(`📋 Schema fields for ${database}.${table}:`, fields.size);
        console.log(`🔒 Required fields:`, requiredFields);
      }
    } catch (schemaError) {
      console.log(`⚠️  No validator schema found for ${database}.${table}`);
    }
    
    // Method 2: ALWAYS sample MULTIPLE documents to capture all fields (schemaless DB support)
    // This is essential because different documents may have different fields in MongoDB
    const sampleSize = 100; // Sample 100 documents for comprehensive field discovery
    const sampleDocs = await collection.find({}).limit(sampleSize).toArray();
    
    if (sampleDocs.length > 0) {
      // Aggregate all unique field names across all sampled documents
      sampleDocs.forEach(doc => {
        Object.keys(doc)
          .filter(field => field !== '_id')
          .forEach(field => fields.add(field));
      });
      console.log(`📋 Aggregated fields from ${sampleDocs.length} documents for ${database}.${table}:`, fields.size);
    }
    
    // Convert Set to array for sorting
    const fieldsArray = Array.from(fields);
    console.log(`📋 Total unique fields for ${database}.${table}:`, fieldsArray.length);
    
    // Sort fields in logical order
    const sortedFields = sortFieldsLogically(fieldsArray, requiredFields, schema);
    console.log(`📋 Sorted fields for ${database}.${table}:`, sortedFields);
    
    // Log the final ordering with categories
    const finalOrder = sortedFields.map((field, index) => ({
      position: index + 1,
      field,
      category: getFieldCategory(field, schema?.properties?.[field]).category,
      required: requiredFields.includes(field)
    }));
    console.log(`📊 Final field order:`, finalOrder);
    
    return sortedFields;
    
  } catch (error) {
    console.error(`❌ Error fetching schema for ${database}.${table}:`, error.message);
    return [];
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Upload CSV file for import - equivalent to uploadCsv in bv project
 * POST /api/import/upload
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uploadDir = path.join(process.cwd(), 'temp', 'imports');
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 1024 * 1024 * 1024, // 1GB (increased from 100MB)
      maxTotalFileSize: 1024 * 1024 * 1024, // 1GB total
      filter: ({ mimetype }) => {
        return mimetype && (mimetype.includes('csv') || mimetype.includes('text'));
      },
    });

    const [fields, files] = await form.parse(req);
    
    if (!files.file || !files.file[0]) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = files.file[0];
    const transferId = uuidv4();
    const newFileName = `${transferId}.csv`;
    const newFilePath = path.join(uploadDir, newFileName);
    
    // Move file to new location with transfer ID
    fs.renameSync(file.filepath, newFilePath);

    // OPTIMIZED: Extract headers and estimate row count without reading entire file
    // This is critical for large files (300MB - 2GB)
    const headers = [];
    const sampleRows = [];
    let totalRecords = 0;
    let totalBytesInSample = 0;
    const MAX_SAMPLE_ROWS = 100; // Only read first 100 rows for estimation

    await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(newFilePath);
      let rowCount = 0;
      
      readStream
        .pipe(csv())
        .on('headers', (parsedHeaders) => {
          headers.splice(0, headers.length, ...parsedHeaders.map(h => h.replace(/"/g, '').trim()));
        })
        .on('data', (row) => {
          rowCount++;
          
          // Track bytes for estimation (first 100 rows)
          if (rowCount <= MAX_SAMPLE_ROWS) {
            const rowStr = Object.values(row).join(',');
            totalBytesInSample += Buffer.byteLength(rowStr, 'utf8') + 1;
          }
          
          // Store sample (first 5 rows)
          if (sampleRows.length < 5) {
            const ordered = headers.length > 0
              ? headers.map(h => (row[h] ?? '').toString().trim())
              : Object.values(row).map(v => (v ?? '').toString().trim());
            sampleRows.push(ordered);
          }
          
          // Stop reading after sample is collected (for very large files)
          if (rowCount >= MAX_SAMPLE_ROWS) {
            readStream.destroy();
            resolve();
          }
        })
        .on('end', () => {
          totalRecords = rowCount;
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });

    // Estimate total records from file size if we stopped early
    const fileStats = fs.statSync(newFilePath);
    if (totalRecords >= MAX_SAMPLE_ROWS && totalBytesInSample > 0) {
      const avgRowSize = totalBytesInSample / MAX_SAMPLE_ROWS;
      const estimatedRecords = Math.floor(fileStats.size / avgRowSize);
      console.log(`📊 Large file detected: Estimated ${estimatedRecords} records (avg row: ${avgRowSize.toFixed(0)} bytes, file: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB)`);
      totalRecords = estimatedRecords;
    }

    if (!headers.length) {
      fs.unlinkSync(newFilePath);
      return res.status(400).json({ error: 'Empty or invalid CSV file' });
    }

    // Get table columns dynamically from database schema
    const database = fields.database?.[0];
    const table = fields.table?.[0];
    
    let tableColumns = [];
    if (database && table) {
      tableColumns = await getDynamicTableColumns(database, table);
      console.log(`📊 Final ordered columns for ${database}.${table}:`, tableColumns);
    }

    return res.status(200).json({
      transfer_id: transferId,
      csv_headers: headers,
      table_columns: tableColumns,
      sample_data: sampleRows,
      total_records: totalRecords,
      file_name: file.originalFilename
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
}
