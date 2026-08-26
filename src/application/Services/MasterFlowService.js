/**
 * MasterFlowService
 * Equivalent to bv/app/Services/MasterFlowService.php
 * Handles master flow processing with multiple workflow methods
 * CommonJS for queue worker compatibility
 */

const { MongoClient } = require('mongodb');
const ProcessFlowHelper = require('./ProcessFlowHelper.js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Database connection helper
let getConnectionConfig;
try {
  const dbModule = require('../../config/database.js');
  getConnectionConfig = dbModule.getConnectionConfig || dbModule.default?.getConnectionConfig;
} catch (e) {
  getConnectionConfig = (name) => {
    const envMap = {
      moon: { uri: process.env.MOON_MONGODB_URI || 'mongodb://localhost:27017/moon', database: 'moon' },
      mars: { uri: process.env.MARS_MONGODB_URI || 'mongodb://localhost:27017/mars', database: 'mars' },
      jupiter: { uri: process.env.JUPITER_MONGODB_URI || 'mongodb://localhost:27017/jupiter', database: 'jupiter' },
      earth: { uri: process.env.EARTH_MONGODB_URI || 'mongodb://localhost:27017/earth', database: 'earth' },
      mercury: { uri: process.env.MERCURY_MONGODB_URI || 'mongodb://localhost:27017/mercury', database: 'mercury' },
      saturn: { uri: process.env.SATURN_MONGODB_URI || 'mongodb://localhost:27017/saturn', database: 'saturn' },
      neptune: { uri: process.env.NEPTUNE_MONGODB_URI || 'mongodb://localhost:27017/neptune', database: 'neptune' },
      sun: { uri: process.env.SUN_MONGODB_URI || 'mongodb://localhost:27017/sun', database: 'sun' },
      central: { uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu', database: 'nextjs_stu' },
    };
    return envMap[name] || envMap.moon;
  };
}

// Hardcoded master columns to ensure schema consistency (matching migration 015)


class MasterFlowService {
  constructor() {
    this.dbConnections = {};
  }

  /**
   * Get database connection
   */
  async getDbConnection(dbName) {
    if (this.dbConnections[dbName]) {
      return this.dbConnections[dbName];
    }

    const config = getConnectionConfig(dbName);
    const client = new MongoClient(config.uri, { maxPoolSize: 10, minPoolSize: 5 });
    await client.connect();
    const db = client.db(config.database);
    this.dbConnections[dbName] = { client, db };
    return { client, db };
  }

  /**
   * Get columns from collection schema validator
   */
  async getCollectionSchema(db, collectionName) {
    try {
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) return [];
      
      const validator = collections[0].options?.validator;
      if (!validator || !validator.$jsonSchema || !validator.$jsonSchema.properties) {
        // Fallback: try to find one document and get keys
        const doc = await db.collection(collectionName).findOne({});
        return doc ? Object.keys(doc).filter(k => k !== '_id') : [];
      }
      
      const properties = validator.$jsonSchema.properties;
      // Get keys
      let columns = Object.keys(properties);
      
      // Filter out _id if present
      columns = columns.filter(c => c !== '_id');
      
      // Ensure id is first if present
      if (columns.includes('id')) {
        columns = columns.filter(c => c !== 'id');
        columns.unshift('id');
      }
      
      return columns;
    } catch (error) {
      console.error(`Error fetching schema for ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * Parse database and table from qualified name
   */
  parseDbAndTable(qualified) {
    if (!qualified) return [null, null];
    const parts = qualified.split('.');
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    return [null, qualified];
  }

  /**
   * Main processFlow method - orchestrates workflow processing
   * Uses a cloned working collection in moon: master_<processId>
   * similar to BV's MasterFlowService (master_copy → master_<processId>).
   *
   * @param {Object} flows - Map of workflow names to method names
   * @param {Object} flowData - Flow data structure
   * @returns {Promise<Object>} Processing result
   */
  async processFlow(flows, flowData) {
    const processId = flowData.meta?.process_id;
    const processName = flowData.meta?.process_name || 'Unknown Master Flow';
    const processMode = flowData.process_mode || 'flow';
    const mode = flowData.meta?.mode || 'unknown';
    const input = flowData.input || {};
    const output = flowData.output || {};
    const metadata = flowData.meta || {};
    const workflowMap = metadata.workflow_map || {};

    if (!processId) {
      throw new Error('Process ID is missing in master flowData');
    }
    if (!flows || Object.keys(flows).length === 0) {
      throw new Error('No workflows provided in flows array');
    }
    if (!workflowMap || Object.keys(workflowMap).length === 0) {
      throw new Error('Workflow map is missing in metadata');
    }

    console.log(`🚦 Starting MasterFlow "${processName}"`, {
      process_id: processId,
      process_mode: processMode,
      mode: mode,
      flows: Object.keys(flows),
    });

    const traceDetails = [];
    let status = 'completed';
    const pipelineMetrics = { total: 0, processed: 0, rejected: 0, skipped: 0 };

    // Name of the working collection in moon (equivalent to master_<processId> table)
    const clonedCollectionName = `master_${processId}`;

    try {
      // Get moon database connection
      const { db: moonDb } = await this.getDbConnection('moon');

      // 1) Prepare cloned working collection in moon: master_<processId>
      const collections = await moonDb.listCollections({ name: clonedCollectionName }).toArray();
      if (collections.length > 0) {
        console.log(`🧹 Dropping existing working collection moon.${clonedCollectionName}`);
        await moonDb.collection(clonedCollectionName).drop();
      }

      console.log(`🧬 Creating working collection moon.${clonedCollectionName} from master_copy template...`);

      await moonDb.createCollection(clonedCollectionName);
      const masterCopyExists = (await moonDb.listCollections({ name: 'master_copy' }).toArray()).length > 0;

      if (masterCopyExists) {
        const baseColl = moonDb.collection('master_copy');
        const clonedColl = moonDb.collection(clonedCollectionName);

        const baseIndexes = await baseColl.indexes();
        for (const idx of baseIndexes) {
          if (idx.name === '_id_') continue;
          const { key, name, unique, sparse } = idx;
          await clonedColl.createIndex(key, {
            name,
            unique: !!unique,
            sparse: !!sparse,
          });
        }
        console.log(`✅ Cloned indexes from master_copy to ${clonedCollectionName}`);
      } else {
        console.log('ℹ️ master_copy collection not found in moon, creating minimal indexes');
        const clonedColl = moonDb.collection(clonedCollectionName);
        await clonedColl.createIndex({ id: 1 }, { name: 'pk_id' });
        await clonedColl.createIndex({ status: 1 }, { name: 'status_index' });
      }

      const clonedColl = moonDb.collection(clonedCollectionName);

      // Get all columns from master_copy structure (matching BV: $tableColumns from SHOW COLUMNS)
      // This ensures every document has ALL columns, even if null
      let masterCopyColumns = await this.getCollectionSchema(moonDb, 'master_copy');
      
      // Fallback if schema not found (should not happen if migration ran)
      if (masterCopyColumns.length === 0) {
        console.warn('⚠️ master_copy schema not found, using minimal columns');
        masterCopyColumns = ['id', 'status', 'reason'];
      }
      
      console.log(`📋 Using ${masterCopyColumns.length} columns from master_copy schema`);

      // 2) Load input into working collection (streaming) and avoid keeping all rows in memory
      if (input.type === 'csv') {
        console.log('📖 Streaming CSV input into working collection...');
        const batch = [];
        const batchSize = 5000;
        let csvHeaders = null;

        await ProcessFlowHelper.readInput(input, (row) => {
          // On first row, detect CSV headers
          if (csvHeaders === null) {
            csvHeaders = Object.keys(row).filter(h => h !== '_id');
            
            // Merge CSV headers with master_copy columns to ensure all columns are present for processing
            const allColumns = new Set([...masterCopyColumns, ...csvHeaders]);
            masterCopyColumns = Array.from(allColumns).sort();
            console.log(`📋 Using ${masterCopyColumns.length} total columns (${csvHeaders.length} from CSV + ${masterCopyColumns.length - csvHeaders.length} from master_copy)`);
          }

          // Create document with ALL columns initialized to null (matching BV: array_fill_keys($tableColumns, null))
          const insertRow = {};
          masterCopyColumns.forEach((col) => {
            insertRow[col] = null;
          });

          // Map CSV values to columns (matching BV: foreach ($row as $key => $value))
          Object.keys(row).forEach((key) => {
            if (key === '_id') return; // Skip MongoDB _id
            
            if (masterCopyColumns.includes(key)) {
              const value = row[key];
              // Convert empty strings to null (matching BV: $value === '' ? null : $value)
              if (value === '' || value === undefined) {
                insertRow[key] = null;
              } else {
                insertRow[key] = value;
              }
            }
          });

          // Ensure id field exists (matching BV: auto-increment handling)
          if (!insertRow.id || insertRow.id === null) {
            // Will be assigned by MongoDB or use row index
            insertRow.id = pipelineMetrics.total + batch.length + 1;
          }

          batch.push(insertRow);
          
          if (batch.length >= batchSize) {
            const toInsert = batch.splice(0, batch.length);
            clonedColl.insertMany(toInsert, { ordered: false }).catch((err) => {
              console.error('Error inserting batch into working collection:', err.message);
            });
            pipelineMetrics.total += toInsert.length;
          }
        });

        if (batch.length > 0) {
          await clonedColl.insertMany(batch, { ordered: false });
          pipelineMetrics.total += batch.length;
        }

        console.log(`✅ Loaded ${pipelineMetrics.total} rows into moon.${clonedCollectionName} with ${masterCopyColumns.length} columns each`);
      } else if (input.type === 'db') {
        console.log('⚠️ DB input for master flows not yet implemented; using empty working collection');
      }

      // 3) Process each workflow sequentially on the working collection (batching)
      for (const [workflowName, methodName] of Object.entries(flows)) {
        console.log(`🔄 Starting workflow "${workflowName}" via "${methodName}" on working collection ${clonedCollectionName}`);

        if (!this[methodName]) {
          console.error(`❌ Method "${methodName}" not found for workflow "${workflowName}"`);
          traceDetails.push(
            ProcessFlowHelper.addTraceEntry(
              workflowName,
              'failed',
              { total: 0, processed: 0, rejected: 0, skipped: 0 },
              `Method "${methodName}" not found`
            )
          );
          status = 'pending';
          continue;
        }

        // Per-workflow metrics similar to BV
        const workflowMetrics = { total: 0, processed: 0, rejected: 0, skipped: 0 };

        try {
          const batchSize = 5000;
          let lastId = null;

          // Iterate through working collection in batches sorted by _id
          // For very large datasets this keeps memory bounded.
          // We always re-read from clonedColl so each workflow sees the latest data.
          while (true) {
            const query = lastId ? { _id: { $gt: lastId } } : {};
            const docs = await clonedColl
              .find(query)
              .sort({ _id: 1 })
              .limit(batchSize)
              .toArray();

            if (docs.length === 0) break;
            lastId = docs[docs.length - 1]._id;

            const inputForWorkflow = {
              ...input,
              type: 'db',
              table: clonedCollectionName,
              rows: docs,
            };

            const workflowRows = await this[methodName](workflowName, inputForWorkflow, output, metadata);

            if (!Array.isArray(workflowRows)) {
              console.error(`❌ Workflow "${workflowName}" did not return valid rows`);
              traceDetails.push(
                ProcessFlowHelper.addTraceEntry(
                  workflowName,
                  'failed',
                  workflowMetrics,
                  `Workflow "${workflowName}" missing or invalid rows`
                )
              );
              status = 'pending';
              break;
            }

            // Update metrics & persist changes back to working collection
            // IMPORTANT: Only update fields in update_headers (matching PHP array_intersect_key)
            const bulkOps = [];
            workflowRows.forEach((row) => {
              workflowMetrics.total++;

              if (!row._id) return;
              const { _id, workflow_status, workflow_reason, ...rest } = row;
              
              // Track metrics based on workflow_status (matching PHP line 624-627)
              const status = (workflow_status || 'processed').toLowerCase();
              if (status === 'processed') {
                workflowMetrics.processed++;
              } else if (status === 'rejected') {
                workflowMetrics.rejected++;
              } else if (status === 'skipped') {
                workflowMetrics.skipped++;
              } else if (status === 'pending') {
                workflowMetrics.pending = (workflowMetrics.pending || 0) + 1;
              }
              
              // Get update_headers from workflow config (matching PHP line 644)
              const methodLevelConfig = Object.values(metadata.workflow_map || {}).find(
                (cfg) => (cfg.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
              ) || {};
              const updateHeaders = methodLevelConfig.update_headers || [];
              
              // Only include fields that are in update_headers (matching PHP array_intersect_key)
              const updateData = {};
              updateHeaders.forEach((header) => {
                if (header in rest) {
                  updateData[header] = rest[header];
                }
              });
              
              // ALWAYS update status and reason (matching BV logic)
              updateData.status = workflow_status || 'processed';
              updateData.reason = workflow_reason || 'Match found and updated';
              
              bulkOps.push({
                updateOne: {
                  filter: { _id },
                  update: { $set: updateData },
                },
              });
            });

            if (bulkOps.length > 0) {
              await clonedColl.bulkWrite(bulkOps, { ordered: false });
            }
          }

          // Merge workflow metrics into pipeline metrics
          pipelineMetrics.processed += workflowMetrics.processed;
          pipelineMetrics.rejected += workflowMetrics.rejected;
          pipelineMetrics.skipped += workflowMetrics.skipped;

          traceDetails.push(
            ProcessFlowHelper.addTraceEntry(
              workflowName,
              workflowMetrics.rejected > 0 || workflowMetrics.skipped > 0 ? 'pending' : 'completed',
              workflowMetrics,
              `Processed "${workflowName}"`
            )
          );

          console.log(`✅ Completed workflow "${workflowName}"`, { metrics: workflowMetrics });
        } catch (error) {
          console.error(`❌ Error in workflow "${workflowName}":`, error);
          traceDetails.push(
            ProcessFlowHelper.addTraceEntry(
              workflowName,
              'failed',
              pipelineMetrics,
              `Error in "${workflowName}": ${error.message}`
            )
          );
          status = 'pending';
        }
      }

      // 4) Write final output from working collection if in flow mode
      if (processMode === 'flow') {
        console.log(`📝 Writing final output from moon.${clonedCollectionName} to file/DB...`);

        // IMPORTANT: Get ALL columns from working collection (matching PHP SHOW COLUMNS)
        // We use the same schema as master_copy
        let headers = [...masterCopyColumns];
        
        // Ensure status and reason are in headers
        if (!headers.includes('status')) headers.push('status');
        if (!headers.includes('reason')) headers.push('reason');
        
        console.log(`📋 Using ${headers.length} headers for output (from schema + status/reason)`);

        const rowGenerator = async function* () {
          const batchSize = 5000;
          let lastId = null;
          while (true) {
            const query = lastId ? { _id: { $gt: lastId } } : {};
            const docs = await clonedColl
              .find(query)
              .sort({ _id: 1 })
              .limit(batchSize)
              .toArray();
            if (docs.length === 0) break;
            lastId = docs[docs.length - 1]._id;
            for (const doc of docs) {
              const { _id, workflow_status, workflow_reason, ...rest } = doc;
              
              // Map workflow_status to status if present (matching BV)
              const outputRow = {
                ...rest,
              };
              
              // Ensure status field exists (from workflow_status or existing status)
              if (workflow_status && !outputRow.status) {
                outputRow.status = workflow_status;
              }
              
              // Ensure reason field exists (from workflow_reason or existing reason)
              if (workflow_reason && !outputRow.reason) {
                outputRow.reason = workflow_reason;
              }
              
              yield outputRow;
            }
          }
        };

        await ProcessFlowHelper.writeOutput(output, headers, rowGenerator);
      }

      console.log(`🏁 MasterFlow "${processName}" completed`, {
        process_id: processId,
        metrics: pipelineMetrics,
      });
    } catch (error) {
      status = 'failed';
      console.error(`MasterFlow "${processName}" failed:`, error);
      traceDetails.push(
        ProcessFlowHelper.addTraceEntry(
          'MasterFlow',
          'failed',
          pipelineMetrics,
          `MasterFlow failed: ${error.message}`
        )
      );
    } finally {
      // Update logs
      await ProcessFlowHelper.updateLogs({
        process_id: processId,
        process_name: processName,
        process_mode: processMode,
        mode: mode,
        status: status,
        input: input,
        output: output,
        total: pipelineMetrics.total,
        processed: pipelineMetrics.processed,
        rejected: pipelineMetrics.rejected,
        skipped: pipelineMetrics.skipped,
        trace_details: traceDetails,
      });

      // Close all database connections
      for (const [dbName, conn] of Object.entries(this.dbConnections)) {
        if (conn.client) {
          await conn.client.close();
        }
      }
      this.dbConnections = {};
    }

    return {
      status: status,
      metrics: pipelineMetrics,
      rows: [],
    };
  }

  /**
   * FullnameSplitMethod - Splits full names into first, middle, last names
   * Equivalent to bv MasterFlowService::FullnameSplitMethod
   */
  async FullnameSplitMethod(workflowName, input, output, metadata) {
    console.log(`📥 Starting FullnameSplitMethod`, {
      workflow: workflowName,
      input_row_count: (input.rows || []).length,
    });

    const metrics = { total: 0, processed: 0, rejected: 0, skipped: 0 };
    const outputRows = [];
    const processId = metadata.process_id || 'unknown';

    try {
      const workflowConfig = Object.values(metadata.workflow_map || {}).find(
        (config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
      );

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      const requiredHeaders = workflowConfig.required_headers || ['li_full_name'];
      const updateHeaders = workflowConfig.update_headers || [
        'li_first_name',
        'li_middle_name',
        'li_last_name',
        'li_firstname_initial',
        'li_lastname_initial',
      ];

      // Load junk removal rules from moon.fullname_junk
      const { db: moonDb } = await this.getDbConnection('moon');
      const junkRules = await moonDb
        .collection('fullname_junk')
        .find({})
        .toArray();

      const removeJunk = (name) => {
        let cleaned = name;
        junkRules.forEach((rule) => {
          const keyword = (rule.Junk_Keyword || '').trim();
          const type = (rule.Junk_Type || '').toLowerCase();
          const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          switch (type) {
            case 'beginswith':
              cleaned = cleaned.replace(new RegExp(`^${pattern}\\b\\s*`, 'i'), '');
              break;
            case 'endswith':
              cleaned = cleaned.replace(new RegExp(`\\s*\\b${pattern}$`, 'i'), '');
              break;
            case 'both':
            case 'contains':
              cleaned = cleaned.replace(new RegExp(`\\b${pattern}\\b`, 'i'), '');
              break;
          }
        });
        return cleaned.replace(/\s+/g, ' ').trim();
      };

      // Process each row
      (input.rows || []).forEach((row) => {
        metrics.total++;
        const outputRow = { ...row };

        if (!row.id) {
          outputRow.workflow_status = 'skipped';
          outputRow.workflow_reason = 'Missing ID';
          metrics.skipped++;
          outputRows.push(outputRow);
          return;
        }

        let fullName = (row[requiredHeaders[0]] || '').trim();
        if (!fullName) {
          outputRow.workflow_status = 'rejected';
          outputRow.workflow_reason = 'Missing full name';
          metrics.rejected++;
          outputRows.push(outputRow);
          return;
        }

        // Step 1: Remove junk
        fullName = removeJunk(fullName);
        if (!fullName) {
          outputRow.workflow_status = 'rejected';
          outputRow.workflow_reason = 'Name empty after junk removal';
          metrics.rejected++;
          outputRows.push(outputRow);
          return;
        }

        // Step 2: Punctuation cleanup
        fullName = fullName.replace(/,/g, ' ');
        const tokens = fullName.split(' ').filter((t) => t);
        const cleanTokens = [];
        let valid = true;

        tokens.forEach((tok) => {
          if (/^[A-Z]\.$/i.test(tok)) {
            cleanTokens.push(tok.replace(/\.$/, ''));
          } else if (/^[A-Za-z]+$/.test(tok)) {
            cleanTokens.push(tok);
          } else {
            const cleaned = tok.replace(/\./g, '');
            if (/^[A-Za-z]+$/.test(cleaned)) {
              cleanTokens.push(cleaned);
            } else {
              valid = false;
            }
          }
        });

        if (!valid || cleanTokens.length < 2 || cleanTokens.length > 3) {
          outputRow.workflow_status = 'rejected';
          outputRow.workflow_reason =
            cleanTokens.length < 2
              ? 'Only one word in name'
              : 'More than three words in name';
          metrics.rejected++;
          outputRows.push(outputRow);
          return;
        }

        // Step 3: Assign names
        const first = cleanTokens[0].charAt(0).toUpperCase() + cleanTokens[0].slice(1).toLowerCase();
        const last =
          cleanTokens[cleanTokens.length - 1].charAt(0).toUpperCase() +
          cleanTokens[cleanTokens.length - 1].slice(1).toLowerCase();
        const middle = cleanTokens.length === 3 ? cleanTokens[1].charAt(0).toUpperCase() + cleanTokens[1].slice(1).toLowerCase() : null;

        outputRow.li_first_name = first;
        outputRow.li_middle_name = middle;
        outputRow.li_last_name = last;
        outputRow.li_firstname_initial = first.charAt(0).toUpperCase();
        outputRow.li_lastname_initial = last.charAt(0).toUpperCase();

        outputRow.workflow_status = 'processed';
        outputRow.workflow_reason = 'Name cleaned and split successfully';
        metrics.processed++;
        outputRows.push(outputRow);
      });

      console.log(`✅ Completed FullnameSplitMethod`, {
        workflow: workflowName,
        metrics: metrics,
      });

      return outputRows;
    } catch (error) {
      console.error(`❌ Error in FullnameSplitMethod:`, error);
      throw error;
    }
  }

  /**
   * Helper to detect input headers from CSV or DB
   */
  async detectInputHeaders(input) {
    if (input.type === 'csv') {
      if (!input.path || !fs.existsSync(input.path)) {
        throw new Error(`CSV file not found: ${input.path}`);
      }
      return new Promise((resolve, reject) => {
        const file = fs.createReadStream(input.path);
        const parser = csv();
        let headers = [];
        parser.on('headers', (h) => {
          headers = h;
          parser.destroy();
          resolve(headers);
        });
        parser.on('error', reject);
        file.pipe(parser);
      });
    } else if (input.type === 'db') {
      const [dbName, tableName] = this.parseDbAndTable(input.table);
      const { db } = await this.getDbConnection(dbName);
      const sample = await db.collection(tableName).findOne({});
      return sample ? Object.keys(sample) : [];
    } else {
      throw new Error(`Unsupported input type: ${input.type}`);
    }
  }

  /**
   * DlsDesignationsMethod - Maps job titles to designations
   * For master flow, processes rows directly
   */
  async DlsDesignationsMethod(workflowName, input, output, metadata) {
    console.log(`📥 DlsDesignationsMethod called for ${workflowName}`);
    const rows = input.rows || [];
    const outputRows = [];

    try {
      const workflowMap = metadata.workflow_map || [];
      const workflowConfig = Array.isArray(workflowMap)
        ? workflowMap.find((config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase())
        : Object.values(workflowMap).find((config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase());

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      let supportTable = workflowConfig.support_table || 'mercury.titles_master';
      if (Array.isArray(supportTable)) {
        supportTable = supportTable[0] || 'mercury.titles_master';
      }

      const requiredHeaders = workflowConfig.required_headers || ['li_job_title'];
      const mappingHeaders = workflowConfig.mapping_headers || ['li_job_title'];
      const updateHeaders = workflowConfig.update_headers || ['dls_designation', 'dls_management_level', 'dls_jobfunction'];
      const mandatory = Boolean(workflowConfig.mandatory || false);

      // Build support-map
      const [supportDb, supportTableName] = this.parseDbAndTable(supportTable);
      const { db: supportDbConn } = await this.getDbConnection(supportDb);

      const columns = [...new Set([...mappingHeaders, ...updateHeaders])];
      const supportRows = await supportDbConn.collection(supportTableName).find({}).toArray();

      const supportMap = {};
      for (const r of supportRows) {
        const key = mappingHeaders.map((c) => String(r[c] || '').toLowerCase().trim()).join('|');
        supportMap[key] = r;
      }

      // Process rows
      for (const row of rows) {
        const outputRow = { ...row };

        // Build lookup key
        const key = requiredHeaders.map((c) => String(row[c] || '').toLowerCase().trim()).join('|');
        const match = supportMap[key] || null;

        const hasValidUpdate =
          match &&
          updateHeaders.some((f) => match[f] !== null && match[f] !== undefined && String(match[f]).trim() !== '');

        if (!match || !hasValidUpdate) {
          if (mandatory) {
            outputRow.workflow_status = 'rejected';
            outputRow.workflow_reason = 'No valid match in support table';
          } else {
            outputRow.workflow_status = 'pending';
            outputRow.workflow_reason = 'Optional step: no valid match';
          }
        } else {
          for (const f of updateHeaders) {
            if (match.hasOwnProperty(f)) {
              outputRow[f] = match[f];
            }
          }
          outputRow.workflow_status = mandatory ? 'processed' : 'completed';
          outputRow.workflow_reason = 'Match found and updated';
        }

        outputRows.push(outputRow);
      }

      return outputRows;
    } catch (error) {
      console.error(`❌ Error in DlsDesignationsMethod:`, error);
      throw error;
    }
  }

  /**
   * CountryMappingMethod - Maps locations to countries using multi-table lookup (BV Logic)
   */
  async CountryMappingMethod(workflowName, input, output, metadata) {
    console.log(`📥 CountryMappingMethod called for ${workflowName}`);
    const rows = input.rows || [];
    const outputRows = [];

    try {
      const { db: mercuryDb } = await this.getDbConnection('mercury');
      const { db: moonDb } = await this.getDbConnection('moon');

      // 1. Collect unique normalized locations from the batch
      const locationSet = new Set();
      for (const row of rows) {
        const loc = String(row.li_contact_location || '').toLowerCase().trim();
        if (loc) locationSet.add(loc);
      }
      const locations = Array.from(locationSet);
      
      if (locations.length === 0) {
        return rows.map(r => ({ ...r, workflow_status: 'skipped', workflow_reason: 'Empty location' }));
      }

      // 2. Batch lookup across all tables (Priority: Mapping > Country > State > City)
      // We fetch all potential matches for these locations
      const [mappings, countries, states, cities] = await Promise.all([
        mercuryDb.collection('country_mapping').find({ location: { $in: locations }, deleted_at: null }).toArray(),
        moonDb.collection('countries').find({ name: { $in: locations } }).toArray(),
        moonDb.collection('states').aggregate([
          { $match: { name: { $in: locations } } },
          { $lookup: { from: 'countries', localField: 'country_id', foreignField: 'id', as: 'country' } },
          { $unwind: '$country' }
        ]).toArray(),
        moonDb.collection('cities').aggregate([
          { $match: { name: { $in: locations } } },
          { $lookup: { from: 'countries', localField: 'country_id', foreignField: 'id', as: 'country' } },
          { $unwind: '$country' }
        ]).toArray()
      ]);

      // 3. Build a consolidated map
      const locationMap = {};

      // Helper to set map if not exists (Priority order ensures first writer wins if we process in reverse priority? 
      // No, we process in priority order and overwrite? No, we want Mapping > Country > State > City.
      // So we should populate in reverse order of priority: City -> State -> Country -> Mapping.
      
      // Cities
      for (const c of cities) {
        locationMap[c.name.toLowerCase()] = { country: c.country.name, region: c.country.region, type: 'city' };
      }
      // States
      for (const s of states) {
        locationMap[s.name.toLowerCase()] = { country: s.country.name, region: s.country.region, type: 'state' };
      }
      // Countries
      for (const c of countries) {
        locationMap[c.name.toLowerCase()] = { country: c.name, region: c.region, type: 'country' };
      }
      // Mappings (Highest Priority)
      for (const m of mappings) {
        locationMap[m.location.toLowerCase()] = { country: m.country, region: m.region, type: 'mapping' };
      }

      // 4. Fallback: Load ALL country names for substring matching (only if needed)
      // Optimization: Only load if we have unmatched locations? 
      // For now, let's keep the existing logic of loading country names but maybe cache it?
      // To be safe and "pin-to-pin", BV does a complex SQL query. 
      // We will stick to the map we built. If no match, we can try the substring fallback.
      const allCountries = await moonDb.collection('countries').find({}, { projection: { name: 1, region: 1 } }).toArray();
      
      const detectCountryFromLocation = (location) => {
        const locLower = location.toLowerCase();
        for (const c of allCountries) {
          if (locLower.includes(c.name.toLowerCase())) {
            return { country: c.name, region: c.region, type: 'fallback' };
          }
        }
        return null;
      };

      // 5. Process rows
      for (const row of rows) {
        const outputRow = { ...row };
        const location = String(row.li_contact_location || '').toLowerCase().trim();

        let match = null;
        if (location) {
          match = locationMap[location];
          if (!match) {
            match = detectCountryFromLocation(location);
          }
        }

        if (match) {
          outputRow.gs_country = match.country;
          outputRow.gs_zone_region = match.region;
          outputRow.li_contact_country = match.country;
          outputRow.workflow_status = 'processed';
          outputRow.workflow_reason = `Matched via ${match.type}`;
        } else {
          outputRow.workflow_status = 'pending'; // or rejected depending on mandatory
          outputRow.workflow_reason = location ? 'No match found' : 'Empty location';
        }

        outputRows.push(outputRow);
      }

      return outputRows;
    } catch (error) {
      console.error(`❌ Error in CountryMappingMethod:`, error);
      throw error;
    }
  }

  /**
   * SmtpUpdateMethod - Updates SMTP from mars.li_company_info support table
   */
  async SmtpUpdateMethod(workflowName, input, output, metadata) {
    console.log(`📥 Starting SmtpUpdateMethod`, {
      workflow: workflowName,
      input_row_count: (input.rows || []).length,
    });

    const metrics = { total: 0, processed: 0, rejected: 0, skipped: 0, pending: 0 };
    const outputRows = [];
    const processId = metadata.process_id || 'unknown';

    try {
      const workflowConfig = Object.values(metadata.workflow_map || {}).find(
        (config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
      );

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      const mandatory = Boolean(workflowConfig.mandatory || false);
      const supportTable = workflowConfig.support_table || 'mars.li_company_info';
      const requiredHeaders = workflowConfig.required_headers || ['li_company_id', 'li_company_name'];
      const mappingHeaders = workflowConfig.mapping_headers || ['li_company_id', 'li_company_name'];
      const updateHeaders = workflowConfig.update_headers || ['li_smtp', 'lic_smtp'];

      // Build support map (ONLY for keys present in current input batch to avoid loading entire table)
      const [supportDb, supportTableName] = this.parseDbAndTable(supportTable);
      const { db: supportDbConn } = await this.getDbConnection(supportDb);

      const rows = input.rows || [];

      // Collect unique key parts from current batch
      const idSet = new Set();
      const nameSet = new Set();
      for (const row of rows) {
        const idVal = String(row.li_company_id || '').trim();
        const nameVal = String(row.li_company_name || '').trim();
        if (idVal) {
           idSet.add(idVal); // String version
           if (!isNaN(Number(idVal))) idSet.add(Number(idVal)); // Number version
        }
        if (nameVal) nameSet.add(nameVal);
      }

      const idList = Array.from(idSet);
      const nameList = Array.from(nameSet);

      console.log(`🔍 SmtpUpdateMethod Debug:`, {
        input_ids_sample: idList.slice(0, 5),
        input_names_sample: nameList.slice(0, 5),
        total_input_ids: idList.length,
        total_input_names: nameList.length
      });

      let supportQuery = {};
      const orConditions = [];
      if (idList.length > 0) {
        orConditions.push({ lic_company_id: { $in: idList } });
      }
      if (nameList.length > 0) {
        orConditions.push({ lic_company_name: { $in: nameList } });
      }
      if (orConditions.length > 0) {
        supportQuery = { $or: orConditions };
      } else {
        supportQuery = { _id: null }; // no keys, no matches
      }

      const supportRows = await supportDbConn.collection(supportTableName).find(supportQuery).toArray();
      console.log(`🔍 SmtpUpdateMethod Support Rows Found: ${supportRows.length}`);
      
      // Build support map with fallback support (ID -> Row, Name -> Row)
      const supportMapById = {};
      const supportMapByName = {};

      for (const r of supportRows) {
        // Store by String ID
        const idKeyStr = String(r.lic_company_id || '').toLowerCase().trim();
        if (idKeyStr) supportMapById[idKeyStr] = r;
        
        // Store by Number ID (if applicable)
        if (r.lic_company_id !== null && r.lic_company_id !== undefined) {
             supportMapById[r.lic_company_id] = r;
        }

        const nameKey = String(r.lic_company_name || '').toLowerCase().trim();
        if (nameKey) supportMapByName[nameKey] = r;
      }

      // Process rows
      for (const row of rows) {
        metrics.total++;
        const outputRow = { ...row };

        const idVal = String(row.li_company_id || '').toLowerCase().trim();
        const nameVal = String(row.li_company_name || '').toLowerCase().trim();
        
        // Fallback lookup: ID -> Name
        let match = null;
        if (idVal) match = supportMapById[idVal];
        // Try Number lookup if string failed
        if (!match && idVal && !isNaN(Number(idVal))) match = supportMapById[Number(idVal)];
        
        if (!match && nameVal) match = supportMapByName[nameVal];

        const hasValidUpdate =
          match &&
          updateHeaders.some((f) => match[f] !== null && match[f] !== undefined && String(match[f]).trim() !== '');

        if (!match || !hasValidUpdate) {
          if (mandatory) {
            outputRow.workflow_status = 'rejected';
            outputRow.workflow_reason = 'No valid match found for company in support table';
            metrics.rejected++;
          } else {
            outputRow.workflow_status = 'pending';
            outputRow.workflow_reason = 'Optional step: no valid match found';
            metrics.pending++;
          }
        } else {
          // Explicitly map critical fields (matching BV logic)
          if (match.lic_smtp) {
             outputRow.li_smtp = match.lic_smtp;
             outputRow.lic_smtp = match.lic_smtp;
          }
          // Also fill in missing ID keys if found
          if (match.lic_company_id) {
             if (!outputRow.li_company_id) outputRow.li_company_id = match.lic_company_id;
             if (!outputRow.lic_company_id) outputRow.lic_company_id = match.lic_company_id;
          }

          for (const f of updateHeaders) {
            if (match.hasOwnProperty(f)) {
              outputRow[f] = match[f];
            }
          }

          outputRow.workflow_status = 'processed';
          outputRow.workflow_reason = 'Match found and updated';
          metrics.processed++;
        }

        outputRows.push(outputRow);
      }

      console.log(`✅ Completed SmtpUpdateMethod`, {
        workflow: workflowName,
        metrics: metrics,
      });

      return outputRows;
    } catch (error) {
      console.error(`❌ Error in SmtpUpdateMethod:`, error);
      throw error;
    }
  }

  /**
   * SmtpBaseMappingMethod - Base SMTP mapping (delegates to DlsDesignationsMethod)
   */
  async SmtpBaseMappingMethod(workflowName, input, output, metadata) {
    console.log(`📥 Starting SmtpBaseMappingMethod`, {
      workflow: workflowName,
      input_row_count: (input.rows || []).length,
    });

    const metrics = { total: 0, processed: 0, rejected: 0, skipped: 0, pending: 0 };
    const outputRows = [];
    const processId = metadata.process_id || 'unknown';

    try {
      const workflowConfig = Object.values(metadata.workflow_map || {}).find(
        (config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
      );

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      const mandatory = Boolean(workflowConfig.mandatory || false);
      const supportTable = workflowConfig.support_table || 'mars.li_company_info';
      // Force requiredHeaders to be ['lic_smtp'] because this method is specifically for SMTP mapping
      // and the config might be incorrectly pointing to li_company_id
      const requiredHeaders = ['lic_smtp'];
      const mappingHeaders = workflowConfig.mapping_headers || ['lic_smtp'];
      const updateHeaders = workflowConfig.update_headers || ['lic_smtp', 'lic_company_id', 'lic_company_name'];

      // Build support map ONLY for SMTPs present in this batch (memory-safe)
      const [supportDb, supportTableName] = this.parseDbAndTable(supportTable);
      const { db: supportDbConn } = await this.getDbConnection(supportDb);

      const rows = input.rows || [];
      const smtpSet = new Set();
      for (const row of rows) {
        const smtpVal = String(row[requiredHeaders[0]] || '').toLowerCase().trim();
        if (smtpVal) smtpSet.add(smtpVal);
      }
      const smtpList = Array.from(smtpSet);

      console.log(`🔍 SmtpBaseMappingMethod Debug:`, {
        input_smtps_sample: smtpList.slice(0, 5),
        total_input_smtps: smtpList.length,
        required_header: requiredHeaders[0],
        mapping_header: mappingHeaders[0]
      });

      let supportQuery = {};
      if (smtpList.length > 0) {
        supportQuery = { [mappingHeaders[0]]: { $in: smtpList } };
      } else {
        supportQuery = { _id: null }; // no keys, no matches
      }

      const supportRows = await supportDbConn.collection(supportTableName).find(supportQuery).toArray();
      console.log(`🔍 SmtpBaseMappingMethod Support Rows Found: ${supportRows.length}`);
      const supportMap = {};
      for (const r of supportRows) {
        const key = mappingHeaders.map((c) => String(r[c] || '').toLowerCase().trim()).join('|');
        supportMap[key] = r;
      }

      // Process rows
      for (const row of rows) {
        metrics.total++;
        const outputRow = { ...row };

        if (mandatory && (String(row[requiredHeaders[0]] || '').trim() === '' || !row[requiredHeaders[0]])) {
          outputRow.workflow_status = 'skipped';
          outputRow.workflow_reason = `Missing or NULL \`${requiredHeaders[0]}\``;
          metrics.skipped++;
          outputRows.push(outputRow);
          continue;
        }

        const keyParts = requiredHeaders.map((c) => String(row[c] || '').toLowerCase().trim());
        const lookupKey = keyParts.join('|');
        const match = supportMap[lookupKey] || null;

        const hasValidUpdate =
          match &&
          updateHeaders.some((f) => match[f] !== null && match[f] !== undefined && String(match[f]).trim() !== '');

        if (mandatory) {
          if (!hasValidUpdate) {
            outputRow.workflow_status = 'rejected';
            outputRow.workflow_reason = `No valid match found for ${mappingHeaders[0]} in support table`;
            metrics.rejected++;
          } else {
            for (const field of updateHeaders) {
              if (match.hasOwnProperty(field)) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'Match found and updated';
            metrics.processed++;
          }
        } else {
          if (!hasValidUpdate) {
            outputRow.workflow_status = 'pending';
            outputRow.workflow_reason = `Optional step: no valid match found for ${mappingHeaders[0]}`;
            metrics.pending++;
          } else {
            for (const field of updateHeaders) {
              if (match.hasOwnProperty(field)) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'Match found and updated';
            metrics.processed++;
          }
        }

        outputRows.push(outputRow);
      }

      console.log(`✅ Completed SmtpBaseMappingMethod`, {
        workflow: workflowName,
        metrics: metrics,
      });

      return outputRows;
    } catch (error) {
      console.error(`❌ Error in SmtpBaseMappingMethod:`, error);
      throw error;
    }
  }

  /**
   * GmseMappingMethod - GMSE company info mapping with optimized lookup
   */
  async GmseMappingMethod(workflowName, input, output, metadata) {
    console.log(`📥 Starting GmseMappingMethod (HYPER-OPTIMIZED)`, {
      workflow: workflowName,
      input_row_count: (input.rows || []).length,
    });

    const metrics = { total: 0, processed: 0, rejected: 0, skipped: 0, pending: 0 };
    const outputRows = [];
    const processId = metadata.process_id || 'unknown';
    const startTime = Date.now();

    try {
      const workflowConfig = Object.values(metadata.workflow_map || {}).find(
        (config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
      );

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      const mandatory = Boolean(workflowConfig.mandatory || false);
      const supportTable = workflowConfig.support_table || 'mars.gmse_company_info';
      const updateHeaders = workflowConfig.update_headers || [
        'gs_place_url', 'gs_category', 'gs_phone_number', 'gs_company_address',
        'gs_street', 'gs_city', 'gs_state', 'gs_zipcode', 'gs_country',
        'gs_zone_region', 'gs_country_code', 'gs_plus_code', 'gs_website',
        'gs_smtp', 'gs_company_name', 'gs_title'
      ];

      // Build support map only for smtp+country pairs in current batch
      const [gmseDb, gmseTbl] = this.parseDbAndTable(supportTable);
      const { db: gmseDbConn } = await this.getDbConnection(gmseDb);

      const rows = input.rows || [];
      const keySet = new Set();
      for (const row of rows) {
        const smtp = String(row.lic_smtp || row.li_smtp || '').toLowerCase().trim();
        const country = String(row.li_contact_country || '').toLowerCase().trim();
        if (!smtp || !country) continue;
        keySet.add(`${smtp}|${country}`);
      }

      const keyList = Array.from(keySet);
      
      console.log(`🔍 GmseMappingMethod Debug:`, {
        input_keys_sample: keyList.slice(0, 5),
        total_input_keys: keyList.length
      });

      const orConditions = keyList.map((k) => {
        const [smtp, country] = k.split('|');
        return { gs_smtp: smtp }; // Query by SMTP only to avoid case sensitivity issues with country
      });

      const supportQuery = orConditions.length > 0 ? { $or: orConditions } : { _id: null };
      const supportRows = await gmseDbConn.collection(gmseTbl).find(supportQuery).toArray();
      console.log(`🔍 GmseMappingMethod Support Rows Found: ${supportRows.length}`);

      const supportMap = {};
      for (const r of supportRows) {
        // Create keys for both exact match and case-insensitive match
        const smtp = String(r.gs_smtp || '').toLowerCase().trim();
        const country = String(r.gs_country || '').toLowerCase().trim();
        const key = `${smtp}|${country}`;
        supportMap[key] = r;
      }

      // Process rows
      for (const row of rows) {
        metrics.total++;
        const outputRow = { ...row };

        const smtp = String(row.lic_smtp || row.li_smtp || '').toLowerCase().trim();
        const country = String(row.li_contact_country || '').toLowerCase().trim();

        if (mandatory && (!smtp || !country)) {
          outputRow.workflow_status = 'skipped';
          outputRow.workflow_reason = 'Missing SMTP or country';
          metrics.skipped++;
          outputRows.push(outputRow);
          continue;
        }

        const lookupKey = `${smtp}|${country}`;
        const match = supportMap[lookupKey] || null;

        if (mandatory) {
          if (!match) {
            outputRow.workflow_status = 'rejected';
            outputRow.workflow_reason = 'No GMSE match found';
            metrics.rejected++;
          } else {
            for (const field of updateHeaders) {
              if (match[field] !== null && match[field] !== undefined) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'GMSE match found';
            metrics.processed++;
          }
        } else {
          if (!match) {
            outputRow.workflow_status = 'pending';
            outputRow.workflow_reason = 'Optional: no GMSE match';
            metrics.pending++;
          } else {
            for (const field of updateHeaders) {
              if (match[field] !== null && match[field] !== undefined) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'GMSE match found';
            metrics.processed++;
          }
        }

        outputRows.push(outputRow);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ GMSE Method Complete (HYPER-OPTIMIZED)`, {
        workflow: workflowName,
        metrics: metrics,
        duration_seconds: duration,
        rows_per_second: metrics.total > 0 ? (metrics.total / duration).toFixed(2) : 0,
      });

      return outputRows;
    } catch (error) {
      console.error(`❌ GMSE Method Error`, { process_id: processId, error: error.message });
      throw error;
    }
  }

  /**
   * CompanyAboutMappingMethod - Maps company about text from earth.lic_company_extr
   */
  async CompanyAboutMappingMethod(workflowName, input, output, metadata) {
    console.log(`📥 Starting CompanyAboutMappingMethod (HYPER-OPTIMIZED)`, {
      workflow: workflowName,
      input_row_count: (input.rows || []).length,
    });

    const metrics = { total: 0, processed: 0, rejected: 0, skipped: 0, pending: 0 };
    const outputRows = [];
    const processId = metadata.process_id || 'unknown';
    const startTime = Date.now();

    try {
      const workflowConfig = Object.values(metadata.workflow_map || {}).find(
        (config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
      );

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      const mandatory = Boolean(workflowConfig.mandatory || false);
      const supportTable = workflowConfig.support_table || 'earth.lic_company_extr';
      const updateHeaders = workflowConfig.update_headers || ['lic_company_id', 'lic_company_name', 'lic_company_about'];

      // Build support map only for company IDs present in current batch
      const [earthDb, earthTbl] = this.parseDbAndTable(supportTable);
      const { db: earthDbConn } = await this.getDbConnection(earthDb);

      const rows = input.rows || [];
      const idSet = new Set();
      for (const row of rows) {
        const idVal = String(row.lic_company_id || '').toLowerCase().trim();
        if (idVal) {
             idSet.add(idVal);
             if (!isNaN(Number(idVal))) idSet.add(Number(idVal));
        }
      }

      const idList = Array.from(idSet);
      

      
      const supportQuery = idList.length > 0 ? { lic_company_id: { $in: idList } } : { _id: null };
      const supportRows = await earthDbConn.collection(earthTbl).find(supportQuery).toArray();
      console.log(`🔍 CompanyAboutMappingMethod Support Rows Found: ${supportRows.length}`);

      const supportMapById = {};
      const supportMapByName = {};
      
      for (const r of supportRows) {
        const idKeyStr = String(r.lic_company_id || '').toLowerCase().trim();
        if (idKeyStr) supportMapById[idKeyStr] = r;
        
        if (r.lic_company_id !== null && r.lic_company_id !== undefined) {
             supportMapById[r.lic_company_id] = r;
        }

        const nameKey = String(r.lic_company_name || '').toLowerCase().trim();
        if (nameKey) supportMapByName[nameKey] = r;
      }

      console.log(`📊 Company About unique keys`, { 
        byId: Object.keys(supportMapById).length, 
        byName: Object.keys(supportMapByName).length 
      });

      // Process rows
      for (const row of rows) {
        metrics.total++;
        const outputRow = { ...row };

        const companyId = String(row.lic_company_id || '').toLowerCase().trim();
        const companyName = String(row.lic_company_name || '').toLowerCase().trim();

        if (mandatory && !companyId && !companyName) {
          outputRow.workflow_status = 'skipped';
          outputRow.workflow_reason = 'Missing company ID and name';
          metrics.skipped++;
          outputRows.push(outputRow);
          continue;
        }

        // Fallback lookup: ID -> Name
        let match = null;
        if (companyId) match = supportMapById[companyId];
        if (!match && companyId && !isNaN(Number(companyId))) match = supportMapById[Number(companyId)];
        
        if (!match && companyName) match = supportMapByName[companyName];

        if (mandatory) {
          if (!match) {
            outputRow.workflow_status = 'rejected';
            outputRow.workflow_reason = 'No company about found';
            metrics.rejected++;
          } else {
            for (const field of updateHeaders) {
              if (match[field] !== null && match[field] !== undefined) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'Company about mapped';
            metrics.processed++;
          }
        } else {
          if (!match) {
            outputRow.workflow_status = 'pending';
            outputRow.workflow_reason = 'Optional: no about found';
            metrics.pending++;
          } else {
            for (const field of updateHeaders) {
              if (match[field] !== null && match[field] !== undefined) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'Company about mapped';
            metrics.processed++;
          }
        }

        outputRows.push(outputRow);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ CompanyAbout Complete (HYPER-OPTIMIZED)`, {
        workflow: workflowName,
        metrics: metrics,
        duration_seconds: duration,
        rows_per_second: metrics.total > 0 ? (metrics.total / duration).toFixed(2) : 0,
      });

      return outputRows;
    } catch (error) {
      console.error(`❌ CompanyAbout Error`, { process_id: processId, error: error.message });
      throw error;
    }
  }

  /**
   * ApolloMappingMethod - Apollo data mapping with multi-field lookup
   */
  async ApolloMappingMethod(workflowName, input, output, metadata) {
    console.log(`📥 Starting ApolloMappingMethod (SQL-Optimized)`, {
      workflow: workflowName,
      input_row_count: (input.rows || []).length,
    });

    const metrics = { total: 0, processed: 0, rejected: 0, skipped: 0, pending: 0 };
    const outputRows = [];
    const processId = metadata.process_id || 'unknown';

    try {
      const workflowConfig = Object.values(metadata.workflow_map || {}).find(
        (config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
      );

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      const mandatory = Boolean(workflowConfig.mandatory || false);
      const supportTable = workflowConfig.support_table || 'jupiter.apollo_data';
      const requiredHeaders = workflowConfig.required_headers || ['lic_smtp', 'lic_company_name', 'li_full_name', 'li_job_title'];
      const mappingHeaders = workflowConfig.mapping_headers || ['ap_company_smtp', 'ap_company_name', 'ap_full_name', 'ap_job_title'];
      const updateHeaders = workflowConfig.update_headers || [
        'ap_linkedin_contact_url', 'ap_full_name', 'ap_contact_city', 'ap_contact_country',
        'ap_contact_twitter_url', 'ap_contact_facebook_url', 'last_contact_date', 'ap_industry',
        'ap_company_keywords', 'ap_company_city', 'ap_company_state', 'ap_company_country',
        'ap_company_linkedin_url', 'ap_company_twitter_url', 'ap_company_facebook_url',
        'ap_company_phone_numbers', 'ap_company_name', 'ap_company_website', 'ap_company_smtp'
      ];

      // Build support map only for keys present in current batch
      const [apolloDb, apolloTbl] = this.parseDbAndTable(supportTable);
      const { db: apolloDbConn } = await this.getDbConnection(apolloDb);

      const rows = input.rows || [];
      const keySet = new Set();
      
      // FIX: Find the SMTP column dynamically or default to 'lic_smtp'
      const smtpHeader = requiredHeaders.find(h => h.includes('smtp')) || 'lic_smtp';
      
      for (const row of rows) {
        // Use SMTP only for lookup key
        const smtp = String(row[smtpHeader] || '').toLowerCase().trim();
        if (smtp) keySet.add(smtp);
      }
      const keyList = Array.from(keySet);

      const orConditions = keyList.map((smtp) => {
        return {
          ap_company_smtp: smtp
        };
      });

      const supportQuery = orConditions.length > 0 ? { $or: orConditions } : { _id: null };
      const supportRows = await apolloDbConn.collection(apolloTbl).find(supportQuery).toArray();
      console.log(`🔍 ApolloMappingMethod Support Rows Found: ${supportRows.length}`);

      const supportMap = {};
      for (const r of supportRows) {
        const smtp = String(r.ap_company_smtp || '').toLowerCase().trim();
        if (smtp) supportMap[smtp] = r;
      }

      console.log(`🔍 Apollo Lookup Results`, {
        unique_keys: keyList.length,
        matched_records: Object.keys(supportMap).length,
        match_rate: keyList.length > 0 ? ((Object.keys(supportMap).length / keyList.length) * 100).toFixed(2) + '%' : '0%'
      });

      // Process rows
      for (const row of rows) {
        metrics.total++;
        const outputRow = { ...row };

        // FIX: Find the SMTP column dynamically or default to 'lic_smtp'
        const smtpHeader = requiredHeaders.find(h => h.includes('smtp')) || 'lic_smtp';
        const smtp = String(row[smtpHeader] || '').toLowerCase().trim();

        if (!smtp) {
          outputRow.workflow_status = 'skipped';
          outputRow.workflow_reason = 'Missing required mapping fields';
          metrics.skipped++;
          outputRows.push(outputRow);
          continue;
        }

        const match = supportMap[smtp] || null;

        const hasValidUpdate =
          match &&
          updateHeaders.some((f) => match[f] !== null && match[f] !== undefined && String(match[f]).trim() !== '');

        if (mandatory) {
          if (!hasValidUpdate) {
            outputRow.workflow_status = 'rejected';
            outputRow.workflow_reason = 'No valid Apollo match found';
            metrics.rejected++;
          } else {
            for (const field of updateHeaders) {
              if (match.hasOwnProperty(field)) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'Apollo match found and updated';
            metrics.processed++;
          }
        } else {
          if (!hasValidUpdate) {
            outputRow.workflow_status = 'pending';
            outputRow.workflow_reason = 'Optional: no Apollo match found';
            metrics.pending++;
          } else {
            for (const field of updateHeaders) {
              if (match.hasOwnProperty(field)) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'Apollo match found and updated';
            metrics.processed++;
          }
        }

        outputRows.push(outputRow);
      }

      console.log(`✅ Completed ApolloMappingMethod`, {
        workflow: workflowName,
        metrics: metrics,
      });

      return outputRows;
    } catch (error) {
      console.error(`❌ Error in ApolloMappingMethod:`, error);
      throw error;
    }
  }

  /**
   * ZoomInfoMappingMethod - ZoomInfo data mapping from saturn.zm_data
   */
  async ZoominfoMappingMethod(workflowName, input, output, metadata) {
    console.log(`📥 Starting ZoomInfoMappingMethod (ULTRA-OPTIMIZED)`, {
      workflow: workflowName,
      input_row_count: (input.rows || []).length,
    });

    const metrics = { total: 0, processed: 0, rejected: 0, skipped: 0, pending: 0 };
    const outputRows = [];
    const processId = metadata.process_id || 'unknown';
    const startTime = Date.now();

    try {
      const workflowConfig = Object.values(metadata.workflow_map || {}).find(
        (config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
      );

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      const mandatory = Boolean(workflowConfig.mandatory || false);
      const supportTable = workflowConfig.support_table || 'saturn.zm_data';
      const requiredHeaders = workflowConfig.required_headers || ['lic_smtp', 'lic_company_name'];
      const mappingHeaders = workflowConfig.mapping_headers || ['zm_smtp', 'zm_company'];
      const updateHeaders = workflowConfig.update_headers || [
        'zm_smtp', 'zm_company', 'zm_technologies', 'zm_revenue_size', 'zm_location',
        'zm_industry', 'zm_employee_size', 'zm_website', 'zm_country', 'zm_summary',
        'zm_sic_codes', 'zm_naics_codes'
      ];

      // Build support map only for keys present in current batch
      const [zmDb, zmTbl] = this.parseDbAndTable(supportTable);
      const { db: zmDbConn } = await this.getDbConnection(zmDb);

      const rows = input.rows || [];
      const keySet = new Set();

      // FIX: Find the SMTP column dynamically or default to 'lic_smtp'
      const smtpHeader = requiredHeaders.find(h => h.includes('smtp')) || 'lic_smtp';

      for (const row of rows) {
        // Use SMTP only for lookup key
        const smtp = String(row[smtpHeader] || '').toLowerCase().trim();
        if (smtp) keySet.add(smtp);
      }

      const keyList = Array.from(keySet);
      const orConditions = keyList.map((smtp) => {
        return {
          zm_smtp: smtp
        };
      });

      const supportQuery = orConditions.length > 0 ? { $or: orConditions } : { _id: null };
      const supportRows = await zmDbConn.collection(zmTbl).find(supportQuery).toArray();
      console.log(`🔍 ZoomInfoMappingMethod Support Rows Found: ${supportRows.length}`);
      
      const supportMap = {};
      for (const r of supportRows) {
        const smtp = String(r.zm_smtp || '').toLowerCase().trim();
        if (smtp) supportMap[smtp] = r;
      }

      console.log(`🔍 ZoomInfo Lookup Results`, {
        unique_keys: keyList.length,
        matched_records: Object.keys(supportMap).length,
        match_rate: keyList.length > 0 ? ((Object.keys(supportMap).length / keyList.length) * 100).toFixed(2) + '%' : '0%'
      });

      // Process rows
      for (const row of rows) {
        metrics.total++;
        const outputRow = { ...row };

        // FIX: Find the SMTP column dynamically or default to 'lic_smtp'
        const smtpHeader = requiredHeaders.find(h => h.includes('smtp')) || 'lic_smtp';
        const smtp = String(row[smtpHeader] || '').toLowerCase().trim();
        
        if (!smtp) {
          outputRow.workflow_status = 'skipped';
          outputRow.workflow_reason = `Missing or NULL \`${smtpHeader}\``;
          metrics.skipped++;
          outputRows.push(outputRow);
          continue;
        }

        const match = supportMap[smtp] || null;

        const hasValidUpdate =
          match &&
          updateHeaders.some((f) => match[f] !== null && match[f] !== undefined && String(match[f]).trim() !== '');

        if (mandatory) {
          if (!hasValidUpdate) {
            outputRow.workflow_status = 'rejected';
            outputRow.workflow_reason = `No valid match found for ${mappingHeaders[0]} in support table`;
            metrics.rejected++;
          } else {
            for (const field of updateHeaders) {
              if (match.hasOwnProperty(field)) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'Match found and updated';
            metrics.processed++;
          }
        } else {
          if (!hasValidUpdate) {
            outputRow.workflow_status = 'pending';
            outputRow.workflow_reason = `Optional step: no valid match found for ${mappingHeaders[0]}`;
            metrics.pending++;
          } else {
            for (const field of updateHeaders) {
              if (match.hasOwnProperty(field)) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'Match found and updated';
            metrics.processed++;
          }
        }

        outputRows.push(outputRow);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Completed ZoomInfoMappingMethod (ULTRA-OPTIMIZED)`, {
        workflow: workflowName,
        metrics: metrics,
        duration_seconds: duration,
        rows_per_second: metrics.total > 0 ? (metrics.total / duration).toFixed(2) : 0,
      });

      return outputRows;
    } catch (error) {
      console.error(`❌ Error in ZoomInfoMappingMethod:`, error);
      throw error;
    }
  }

  /**
   * PySmtpMappingMethod - Python SMTP mapping from neptune.py_smtp
   */
  async PysmtpMappingMethod(workflowName, input, output, metadata) {
    console.log(`📥 Starting PySmtpMappingMethod (SMTP-Style)`, {
      workflow: workflowName,
      input_row_count: (input.rows || []).length,
    });

    const metrics = { total: 0, processed: 0, rejected: 0, skipped: 0, pending: 0 };
    const outputRows = [];
    const processId = metadata.process_id || 'unknown';

    try {
      const workflowConfig = Object.values(metadata.workflow_map || {}).find(
        (config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
      );

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      const mandatory = Boolean(workflowConfig.mandatory || false);
      const supportTable = workflowConfig.support_table || 'neptune.py_smtp';
      const requiredHeaders = workflowConfig.required_headers || ['lic_smtp'];
      const mappingHeaders = workflowConfig.mapping_headers || ['py_smtp'];
      const updateHeaders = workflowConfig.update_headers || ['py_smtp', 'py_title', 'py_keywords', 'py_description', 'py_fetched_by'];

      // Build support map only for SMTPs present in current batch
      const [pyDb, pyTbl] = this.parseDbAndTable(supportTable);
      const { db: pyDbConn } = await this.getDbConnection(pyDb);

      const rows = input.rows || [];
      const smtpSet = new Set();
      for (const row of rows) {
        const v = String(row[requiredHeaders[0]] || '').toLowerCase().trim();
        if (v) smtpSet.add(v);
      }
      const smtpList = Array.from(smtpSet);

      const supportQuery = smtpList.length > 0 ? { [mappingHeaders[0]]: { $in: smtpList } } : { _id: null };
      const supportRows = await pyDbConn.collection(pyTbl).find(supportQuery).toArray();

      const supportMap = {};
      for (const r of supportRows) {
        const key = mappingHeaders.map((c) => String(r[c] || '').toLowerCase().trim()).join('|');
        supportMap[key] = r;
      }

      // Process rows
      for (const row of rows) {
        metrics.total++;
        const outputRow = { ...row };

        if (mandatory && (!row[requiredHeaders[0]] || String(row[requiredHeaders[0]]).trim() === '')) {
          outputRow.workflow_status = 'skipped';
          outputRow.workflow_reason = `Missing or NULL \`${requiredHeaders[0]}\``;
          metrics.skipped++;
          outputRows.push(outputRow);
          continue;
        }

        const lookupKey = mappingHeaders.map((c) => String(row[requiredHeaders[mappingHeaders.indexOf(c)]] || '').toLowerCase().trim()).join('|');
        const match = supportMap[lookupKey] || null;

        const hasValid =
          match &&
          updateHeaders.some((f) => match[f] !== null && match[f] !== undefined && String(match[f]).trim() !== '');

        if (mandatory) {
          if (!hasValid) {
            outputRow.workflow_status = 'rejected';
            outputRow.workflow_reason = `No valid match found for ${mappingHeaders[0]} in support table`;
            metrics.rejected++;
          } else {
            for (const field of updateHeaders) {
              if (match.hasOwnProperty(field)) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'Match found and updated';
            metrics.processed++;
          }
        } else {
          if (!hasValid) {
            outputRow.workflow_status = 'pending';
            outputRow.workflow_reason = `Optional step: no valid match found for ${mappingHeaders[0]}`;
            metrics.pending++;
          } else {
            for (const field of updateHeaders) {
              if (match.hasOwnProperty(field)) {
                outputRow[field] = match[field];
              }
            }
            outputRow.workflow_status = 'processed';
            outputRow.workflow_reason = 'Match found and updated';
            metrics.processed++;
          }
        }

        outputRows.push(outputRow);
      }

      console.log(`✅ Completed PySmtpMappingMethod`, {
        workflow: workflowName,
        metrics: metrics,
      });

      return outputRows;
    } catch (error) {
      console.error(`❌ Error in PySmtpMappingMethod:`, error);
      throw error;
    }
  }

 
}

module.exports = MasterFlowService;
module.exports.default = MasterFlowService;

