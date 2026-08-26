/**
 * WorkFlowService
 * Equivalent to bv/app/Services/WorkFlowService.php
 * Handles single workflow processing (workflow mode)
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

class WorkFlowService {
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
   * Main processFlow method - processes a single workflow
   * @param {Object} flows - Map with single workflow name to method name
   * @param {Object} flowData - Flow data structure
   * @returns {Promise<Object>} Processing result
   */
  async processFlow(flows, flowData) {
    // Set memory limit for large file processing
    const memoryLimit = process.env.LARGE_FILE_MEMORY_LIMIT || '2048M';
    const maxExecutionTime = process.env.LARGE_FILE_MAX_EXECUTION_TIME || 7200;

    // Extract workflow name and method
    const workflowName = Object.keys(flows)[0];
    const method = flows[workflowName] || null;

    console.log('✨ Processing Workflow', {
      workflow: workflowName,
      method: method,
      memory_limit: memoryLimit,
      max_execution_time: maxExecutionTime,
    });

    // Extract process details
    const processId = flowData.metadata?.process_id || flowData.meta?.process_id || null;
    const processName = flowData.metadata?.process_name || flowData.meta?.process_name || 'Unknown';
    const processMode = flowData.process_mode || 'workflow';
    const mode = flowData.metadata?.mode || flowData.meta?.mode || 'unknown';
    const input = flowData.input || {};
    const output = flowData.output || {};
    const metadata = flowData.metadata || flowData.meta || {};

    // Validate process_id
    if (!processId || processId === '') {
      const errorMessage = 'Process ID is missing in flowData';
      console.error(`❌ Process failed: ${errorMessage}`, { flow_data: flowData });
      throw new Error(errorMessage);
    }

    // Insert initial log entry
    try {
      await ProcessFlowHelper.updateLogs({
        process_id: processId,
        process_name: processName,
        process_mode: processMode,
        mode: mode,
        status: 'started',
        input: input,
        output: output,
        trace_details: [],
      });
    } catch (e) {
      console.error(`❌ Failed to log process start for "${processName}"`, {
        process_id: processId,
        error: e.message,
      });
      throw new Error(`Failed to log process start: ${e.message}`);
    }

    // Log process start
    console.log(`🚀 Process "${processName}" started`, {
      process_id: processId,
      workflow: workflowName,
      method: method,
    });

    // Validate method
    if (!method || typeof this[method] !== 'function') {
      const errorMessage = `Method "${method}" not found for workflow "${workflowName}"`;
      try {
        await ProcessFlowHelper.updateLogs({
          process_id: processId,
          process_name: processName,
          process_mode: processMode,
          mode: mode,
          status: 'failed',
          input: input,
          output: output,
          trace_details: [
            ProcessFlowHelper.addTraceEntry(
              workflowName,
              'failed',
              { total: 0, affected: 0, rejected: 0, skipped: 0 },
              errorMessage
            ),
          ],
        });
      } catch (e) {
        console.error(`❌ Failed to log method validation failure for "${processName}"`, {
          process_id: processId,
          error: e.message,
        });
      }
      console.error(`❌ Process "${processName}" failed`, {
        process_id: processId,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }

    try {
      // Call the method
      const traceEntry = await this[method](workflowName, input, output, [], metadata);

      // Update log with final details
      try {
        await ProcessFlowHelper.updateLogs({
          process_id: processId,
          process_name: processName,
          process_mode: processMode,
          mode: mode,
          status: traceEntry.status,
          input: input,
          output: output,
          total: traceEntry.metrics?.total || 0,
          affected: traceEntry.metrics?.affected || 0,
          rejected: traceEntry.metrics?.rejected || 0,
          skipped: traceEntry.metrics?.skipped || 0,
          trace_details: [traceEntry],
        });
      } catch (e) {
        console.error(`❌ Failed to log process completion for "${processName}"`, {
          process_id: processId,
          error: e.message,
        });
        throw new Error(`Failed to log process completion: ${e.message}`);
      }

      // Log completion
      console.log(`✅ Process "${processName}" completed`, {
        process_id: processId,
        trace_entry: traceEntry,
      });

      return {
        process_id: processId,
        process_name: processName,
        status: traceEntry.status,
        trace_entry: traceEntry,
      };
    } catch (error) {
      // Update log on failure
      try {
        await ProcessFlowHelper.updateLogs({
          process_id: processId,
          process_name: processName,
          process_mode: processMode,
          mode: mode,
          status: 'failed',
          input: input,
          output: output,
          total: 0,
          affected: 0,
          rejected: 0,
          skipped: 0,
          trace_details: [
            ProcessFlowHelper.addTraceEntry(
              workflowName,
              'failed',
              { total: 0, affected: 0, rejected: 0, skipped: 0 },
              `Error in "${workflowName}": ${error.message}`
            ),
          ],
        });
      } catch (e2) {
        console.error(`❌ Failed to log process failure for "${processName}"`, {
          process_id: processId,
          error: e2.message,
        });
      }

      console.error(`❌ Process "${processName}" failed`, {
        process_id: processId,
        error: error.message,
      });

      throw error;
    } finally {
      // Close all database connections
      for (const [dbName, conn] of Object.entries(this.dbConnections)) {
        if (conn.client) {
          await conn.client.close();
        }
      }
      this.dbConnections = {};
    }
  }

  /**
   * Helper to check if value is empty
   */
  empty(value) {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
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
   * FullnameSplitMethod - Splits full names into first, middle, last names
   */
  async FullnameSplitMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting FullnameSplitMethod', {
      workflow: workflowName,
      input_type: input.type || 'unknown',
      input_source: input.table || input.path || 'unknown',
    });

    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0 };
    const outputRows = [];

    const rowGenerator = function* () {
      for (const row of outputRows) {
        yield row;
      }
    };

    try {
      const workflowMap = metadata.workflow_map || [];
      const workflowConfig = Array.isArray(workflowMap)
        ? workflowMap.find((config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase())
        : Object.values(workflowMap).find((config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase());

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
      const mandatory = Boolean(workflowConfig.mandatory || false);

      // Detect input headers
      const inputHeaders = await this.detectInputHeaders(input);

      const hasStatus = inputHeaders.includes('status');
      const headers = [...new Set([...inputHeaders, ...updateHeaders, ...(hasStatus ? [] : ['status']), 'reason'])];

      // Read input
      await ProcessFlowHelper.readInput(input, (row, index) => {
        metrics.total++;

        // Handle status logic
        const status = (row.status || '').toLowerCase().trim();
        if (status && ['rejected', 'skipped'].includes(status)) {
          row.reason = row.reason || 'Skipped due to status';
          outputRows.push(row);
          metrics.skipped++;
          return;
        }

        if (status && !['pending', 'processed', 'completed'].includes(status)) {
          row.status = 'skipped';
          row.reason = 'Invalid status';
          outputRows.push(row);
          metrics.skipped++;
          return;
        }

        // Validation
        const fullName = row[requiredHeaders[0]] || null;
        if (!fullName || !/^[a-zA-Z\s\-]+$/u.test(fullName)) {
          row.status = 'rejected';
          row.reason = 'Invalid or missing full name';
          outputRows.push(row);
          metrics.rejected++;
          return;
        }

        const parts = fullName.trim().split(/\s+/);
        if (parts.length > 3) {
          row.status = 'rejected';
          row.reason = 'Name has more than 3 words';
          outputRows.push(row);
          metrics.rejected++;
          return;
        }

        if (parts.length < 2) {
          row.status = 'rejected';
          row.reason = 'Name too short';
          outputRows.push(row);
          metrics.rejected++;
          return;
        }

        // Parse name
        const first = parts[0];
        const last = parts[parts.length - 1];
        const middle = parts.length === 3 ? parts[1] : null;

        row.li_first_name = first;
        row.li_last_name = last;
        row.li_middle_name = middle;
        row.li_firstname_initial = first.charAt(0).toUpperCase();
        row.li_lastname_initial = last.charAt(0).toUpperCase();

        row.status = mandatory ? 'processed' : 'completed';
        row.reason = 'Name split successfully';

        metrics.affected++;
        outputRows.push(row);
      });

      await ProcessFlowHelper.writeOutput(output, headers, rowGenerator);
    } catch (error) {
      console.error('❗ Error in FullnameSplitMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(workflowName, 'failed', metrics, `Error in "${workflowName}": ${error.message}`);
    }

    const traceEntry = ProcessFlowHelper.addTraceEntry(workflowName, 'completed', metrics, `Processed "${workflowName}"`);

    console.log('✅ Completed FullnameSplitMethod', {
      workflow: workflowName,
      trace_entry: traceEntry,
    });

    return {
      ...traceEntry,
      rows: outputRows,
    };
  }

  /**
   * DlsDesignationsMethod - Maps job titles to designations
   */
  async DlsDesignationsMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting DlsDesignationsMethod', {
      workflow: workflowName,
      input_type: input.type || 'unknown',
      input_source: input.table || input.path || 'unknown',
    });

    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0, pending: 0 };
    const outputRows = [];

    const rowGenerator = function* () {
      for (const row of outputRows) {
        yield row;
      }
    };

    try {
      const workflowMap = metadata.workflow_map || [];
      const workflowConfig = Array.isArray(workflowMap)
        ? workflowMap.find((config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase())
        : Object.values(workflowMap).find((config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase());

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      // Support table
      let supportTable = workflowConfig.support_table || 'mercury.titles_master';
      if (Array.isArray(supportTable)) {
        supportTable = supportTable[0] || 'mercury.titles_master';
      }

      const requiredHeaders = workflowConfig.required_headers || ['li_job_title'];
      const mappingHeaders = workflowConfig.mapping_headers || ['li_job_title'];
      const updateHeaders = workflowConfig.update_headers || ['dls_designation', 'dls_management_level', 'dls_jobfunction'];
      const mandatory = Boolean(workflowConfig.mandatory || false);

      if (!supportTable || !requiredHeaders.length || !mappingHeaders.length || !updateHeaders.length) {
        throw new Error('Invalid configuration: missing support table, required headers, mapping headers, or update headers.');
      }

      // Detect headers
      const inputHeaders = await this.detectInputHeaders(input);

      const missing = requiredHeaders.filter((h) => !inputHeaders.includes(h));
      if (missing.length > 0) {
        throw new Error(`Missing required headers: ${missing.join(', ')}`);
      }

      const hasStatus = inputHeaders.includes('status');
      const headers = [...new Set([...inputHeaders, ...updateHeaders, ...(hasStatus ? [] : ['status']), 'reason'])];

      // Build support-map in memory
      const [supportDb, supportTableName] = this.parseDbAndTable(supportTable);
      const { db: supportDbConn } = await this.getDbConnection(supportDb);

      const columns = [...new Set([...mappingHeaders, ...updateHeaders])];
      const supportRows = await supportDbConn.collection(supportTableName).find({}).toArray();

      const supportMap = {};
      for (const r of supportRows) {
        const key = mappingHeaders.map((c) => String(r[c] || '').toLowerCase().trim()).join('|');
        supportMap[key] = r;
      }

      // Read input, enrich from supportMap
      await ProcessFlowHelper.readInput(input, (row, index) => {
        metrics.total++;

        if (hasStatus) {
          const status = (row.status || '').toLowerCase().trim();
          if (['skipped', 'rejected'].includes(status)) {
            metrics.skipped++;
            row.reason = 'Ignored status';
            outputRows.push(row);
            return;
          }
          if (status !== '' && !['pending', 'completed', 'processed'].includes(status)) {
            metrics.skipped++;
            row.status = 'skipped';
            row.reason = 'Invalid status (not pending/completed/processed)';
            outputRows.push(row);
            return;
          }
        }

        // Validate required fields
        for (const field of requiredHeaders) {
          if (!(row[field] || '').trim()) {
            metrics.skipped++;
            row.status = 'skipped';
            row.reason = `Missing "${field}"`;
            outputRows.push(row);
            return;
          }
        }

        // Build lookup key
        const key = requiredHeaders.map((c) => String(row[c] || '').toLowerCase().trim()).join('|');
        const match = supportMap[key] || null;

        // Check if match contains valid update data
        const hasValidUpdate =
          match &&
          updateHeaders.some((f) => match[f] !== null && match[f] !== undefined && String(match[f]).trim() !== '');

        if (!match || !hasValidUpdate) {
          if (mandatory) {
            row.status = 'rejected';
            row.reason = 'No valid match in support table';
            metrics.rejected++;
          } else {
            row.status = 'pending';
            row.reason = 'Optional step: no valid match';
            metrics.pending++;
          }
        } else {
          // Copy update fields from support row
          for (const f of updateHeaders) {
            if (match.hasOwnProperty(f)) {
              row[f] = match[f];
            }
          }
          row.status = mandatory ? 'processed' : 'completed';
          row.reason = 'Match found and updated';
          metrics.affected++;
        }

        outputRows.push(row);
      });

      await ProcessFlowHelper.writeOutput(output, headers, rowGenerator);
    } catch (error) {
      console.error('❗ Error in DlsDesignationsMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(workflowName, 'failed', metrics, `Error in "${workflowName}": ${error.message}`);
    }

    const traceEntry = ProcessFlowHelper.addTraceEntry(workflowName, 'completed', metrics, `Processed "${workflowName}"`);

    console.log('✅ Completed DlsDesignationsMethod', {
      workflow: workflowName,
      trace_entry: traceEntry,
    });

    return {
      ...traceEntry,
      rows: outputRows,
    };
  }

  /**
   * SmtpUpdateMethod - Updates SMTP from mars.li_company_info (SmtpBaseMappingMethod in PHP)
   * Full implementation matching PHP version
   */
  async SmtpUpdateMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting SmtpUpdateMethod', {
      workflow: workflowName,
      input_type: input.type || 'unknown',
      input_source: input.table || input.path || 'unknown',
    });

    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0, pending: 0 };
    const outputRows = [];

    const rowGenerator = function* () {
      for (const row of outputRows) {
        yield row;
      }
    };

    try {
      const workflowMap = metadata.workflow_map || [];
      const workflowConfig = Array.isArray(workflowMap)
        ? workflowMap.find((config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase())
        : Object.values(workflowMap).find((config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase());

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      const mandatory = Boolean(workflowConfig.mandatory || true);
      const supportTable = workflowConfig.support_table || 'mars.li_company_info';
      const requiredHeaders = workflowConfig.required_headers || ['lic_smtp'];
      const mappingHeaders = workflowConfig.mapping_headers || ['li_smtp'];
      const updateHeaders = workflowConfig.update_headers || ['lic_smtp', 'lic_company_id', 'lic_company_name'];

      if (!supportTable || !requiredHeaders.length || !mappingHeaders.length || !updateHeaders.length) {
        throw new Error('Invalid configuration: missing support table, required headers, mapping headers, or update headers.');
      }

      if (requiredHeaders.length !== mappingHeaders.length) {
        throw new Error('Required headers and mapping headers must have the same number of elements for proper mapping.');
      }

      // Detect headers
      const inputHeaders = await this.detectInputHeaders(input);

      const missing = requiredHeaders.filter((h) => !inputHeaders.includes(h));
      if (missing.length > 0) {
        throw new Error(`Missing required headers: ${missing.join(', ')}`);
      }

      const hasStatus = inputHeaders.includes('status');
      const headers = [...new Set([...inputHeaders, ...updateHeaders, ...(hasStatus ? [] : ['status']), 'reason'])];

      // Build support-map in memory
      const [supportDb, supportTableName] = this.parseDbAndTable(supportTable);
      const { db: supportDbConn } = await this.getDbConnection(supportDb);

      const columns = [...new Set([...mappingHeaders, ...updateHeaders])];
      const supportRows = await supportDbConn.collection(supportTableName).find({}).toArray();

      const supportMap = {};
      for (const r of supportRows) {
        const key = mappingHeaders.map((c) => String(r[c] || '').toLowerCase().trim()).join('|');
        supportMap[key] = r;
      }

      // Read input, enrich from supportMap
      await ProcessFlowHelper.readInput(input, (row, index) => {
        metrics.total++;

        if (hasStatus) {
          const status = (row.status || '').toLowerCase().trim();
          if (['skipped', 'rejected'].includes(status)) {
            metrics.skipped++;
            row.reason = 'Ignored status';
            outputRows.push(row);
            return;
          }
          if (status !== '' && !['pending', 'completed', 'processed'].includes(status)) {
            metrics.skipped++;
            row.status = 'skipped';
            row.reason = 'Invalid status (not pending/completed/processed)';
            outputRows.push(row);
            return;
          }
        }

        // Validate required fields
        for (const field of requiredHeaders) {
          if (!(row[field] || '').trim()) {
            metrics.skipped++;
            row.status = 'skipped';
            row.reason = `Missing "${field}"`;
            outputRows.push(row);
            return;
          }
        }

        // Build lookup key using requiredHeaders
        const key = requiredHeaders.map((c) => String(row[c] || '').toLowerCase().trim()).join('|');
        const match = supportMap[key] || null;

        if (!match || !updateHeaders.some((f) => match[f] !== null && match[f] !== undefined && String(match[f]).trim() !== '')) {
          if (mandatory) {
            row.status = 'rejected';
            row.reason = 'No valid match in support table';
            metrics.rejected++;
          } else {
            row.status = 'pending';
            row.reason = 'Optional step: no valid match';
            metrics.pending++;
          }
        } else {
          for (const f of updateHeaders) {
            if (match.hasOwnProperty(f)) {
              row[f] = match[f];
            }
          }
          row.status = mandatory ? 'processed' : 'completed';
          row.reason = 'Match found and updated';
          metrics.affected++;
        }

        outputRows.push(row);
      });

      await ProcessFlowHelper.writeOutput(output, headers, rowGenerator);
    } catch (error) {
      console.error('❗ Error in SmtpUpdateMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(workflowName, 'failed', metrics, `Error in "${workflowName}": ${error.message}`);
    }

    const smtpTraceEntry = ProcessFlowHelper.addTraceEntry(workflowName, 'completed', metrics, `Processed "${workflowName}"`);

    console.log('✅ Completed SmtpUpdateMethod', {
      workflow: workflowName,
      trace_entry: smtpTraceEntry,
    });

    return {
      ...smtpTraceEntry,
      rows: outputRows,
    };
  }

  /**
   * CountryMappingMethod - Maps locations to countries
   */
  async CountryMappingMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Received to CountryMappingMethod', {
      workflow: workflowName,
      input: input,
      output: output,
      metadata: metadata,
      tracing: tracing,
    });

    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0 };

    try {
      // Detect input headers
      const inputHeaders = await this.detectInputHeaders(input);

      // Define required and update headers
      const requiredHeaders = ['li_contact_location'];
      const updateHeaders = ['gs_country', 'gs_zone_region', 'li_contact_country', 'status', 'reason'];
      const headers = [...new Set([...inputHeaders, ...updateHeaders])];

      // Validate required headers
      const missing = requiredHeaders.filter((h) => !inputHeaders.includes(h));
      if (missing.length > 0) {
        throw new Error(`Missing required headers: ${missing.join(', ')}`);
      }

      // Load country mappings from mercury.country_mapping
      const { db: mercuryDb } = await this.getDbConnection('mercury');
      const countryMappingsRaw = await mercuryDb.collection('country_mapping').find({ deleted_at: null }).toArray();

      const countryMappings = {};
      for (const item of countryMappingsRaw) {
        countryMappings[item.location] = {
          country: item.country,
          region: item.region,
        };
      }

      // Load country names from moon.countries for fallback detection
      const { db: moonDb } = await this.getDbConnection('moon');
      const countriesRaw = await moonDb.collection('countries').find({}).toArray();
      const countryNames = countriesRaw.map((c) => c.name);

      // Define country detection function for fallback
      const detectCountryFromLocation = (location, countryNames) => {
        const locationLower = location.toLowerCase();
        for (const country of countryNames) {
          if (locationLower.includes(country.toLowerCase())) {
            return country;
          }
        }
        return null;
      };

      // Initialize rows array
      const rows = [];

      // Process input data
      await ProcessFlowHelper.readInput(input, (row, index) => {
        metrics.total++;

        const location = (row.li_contact_location || '').trim();

        let country = '';
        let region = '';
        let status = 'Bad';
        let reason = 'No match found';

        if (location) {
          if (countryMappings[location]) {
            // Direct match found
            country = countryMappings[location].country;
            region = countryMappings[location].region;
            status = 'Good';
            reason = 'Updated';
          } else {
            // Fallback detection
            const detectedCountry = detectCountryFromLocation(location, countryNames);
            if (detectedCountry) {
              country = detectedCountry;
              // Determine region based on most frequent region for the detected country
              const matchingRegions = Object.values(countryMappings).filter(
                (v) => v.country && v.country.toLowerCase() === country.toLowerCase()
              );
              const regions = matchingRegions.map((v) => v.region).filter(Boolean);
              const regionCounts = {};
              for (const r of regions) {
                regionCounts[r] = (regionCounts[r] || 0) + 1;
              }
              const sortedRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]);
              region = sortedRegions.length > 0 ? sortedRegions[0][0] : '';
              status = 'Suggestion';
              reason = 'Country detected using fallback (add to country_mapping for better match)';
            }
          }
        } else {
          reason = 'Empty location';
        }

        // Update row with mapped values
        row.gs_country = country;
        row.gs_zone_region = region;
        row.li_contact_country = country;
        row.status = status;
        row.reason = reason;

        rows.push(row);

        // Update metrics
        if (status === 'Good' || status === 'Suggestion') {
          metrics.affected++;
        } else {
          metrics.rejected++;
        }
      });

      // Define generator for writing output
      const rowGenerator = function* () {
        for (const row of rows) {
          yield row;
        }
      };

      // Write processed data to output
      await ProcessFlowHelper.writeOutput(output, headers, rowGenerator);
    } catch (error) {
      console.error('❌ Error in CountryMappingMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(workflowName, 'failed', metrics, `Error in "${workflowName}": ${error.message}`);
    }

    // Create successful trace entry
    const traceEntry = ProcessFlowHelper.addTraceEntry(workflowName, 'completed', metrics, `Processed "${workflowName}"`);

    // Log completion
    console.log('✅ Completed CountryMappingMethod', {
      workflow: workflowName,
      trace_entry: traceEntry,
    });

    return {
      ...traceEntry,
      rows: rows,
    };
  }

  /**
   * UsAddressSplitMethod - Parses US addresses into structured components
   * Simplified but functionally equivalent to BV's optimized version.
   */
  async UsAddressSplitMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting UsAddressSplitMethod', {
      workflow: workflowName,
      input_type: input.type || 'unknown',
      input_source: input.table || input.path || 'unknown',
    });

    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0 };
    const rows = [];

    const headers = [
      'address',
      'address_old',
      'street',
      'city',
      'state',
      'state_code',
      'pincode',
      'country',
      'status',
      'status_code',
      '__state',
      '__reason',
    ];

    try {
      const { db: moonDb } = await this.getDbConnection('moon');
      const states = await moonDb.collection('states').find({ country_code: 'US' }).toArray();
      const stateCodes = {};
      const stateNames = {};
      states.forEach((s) => {
        if (s.iso_2) stateCodes[s.iso_2.toLowerCase()] = s.name;
        stateNames[s.name.toLowerCase()] = s.name;
      });

      const citiesByState = {};
      const cities = await moonDb.collection('cities').find({ country_code: 'US' }).toArray();
      cities.forEach((c) => {
        const code = c.state_code;
        if (!code) return;
        if (!citiesByState[code]) citiesByState[code] = new Set();
        citiesByState[code].add((c.name || '').toLowerCase());
      });

      const countries = [
        'united states',
        'us',
        'usa',
        'united states of america',
        'u.s.',
        'u.s.a.',
      ];

      await ProcessFlowHelper.readInput(input, (row) => {
        metrics.total++;
        const original = (row.address || '').toString();

        if (!original || original.trim().length < 5) {
          rows.push({
            ...row,
            address_old: original,
            street: '',
            city: '',
            state: '',
            state_code: '',
            pincode: '',
            country: '',
            status: 'Bad',
            status_code: 'Empty or too short address',
            __state: 'rejected',
            __reason: 'Empty or too short address',
          });
          metrics.rejected++;
          return;
        }

        let address = original.replace(/[,]+/g, ' ');
        address = address.replace(/\s+/g, ' ').trim();

        let parts = address.split(' ').filter(Boolean);
        let partsLower = parts.map((p) => p.toLowerCase());

        const components = {
          address_old: original,
          address: address,
          street: '',
          city: '',
          state: '',
          state_code: '',
          pincode: '',
          country: '',
          status: '',
          status_code: '',
        };
        const statusCodes = [];

        // Country detection (US only)
        let hasUsCountry = false;
        for (let i = 0; i < partsLower.length; i++) {
          if (countries.includes(partsLower[i])) {
            hasUsCountry = true;
            parts[i] = null;
            partsLower[i] = null;
          }
        }
        parts = parts.filter((p) => p !== null);
        partsLower = partsLower.filter((p) => p !== null);

        if (hasUsCountry) {
          components.country = 'United States';
        } else {
          statusCodes.push('Non-USA address');
        }

        // ZIP detection
        let zip = '';
        for (let i = parts.length - 1; i >= 0; i--) {
          if (/^\d{5}(-\d{4})?$/.test(parts[i])) {
            zip = parts[i];
            parts[i] = null;
            partsLower[i] = null;
            break;
          }
        }
        parts = parts.filter((p) => p !== null);
        partsLower = partsLower.filter((p) => p !== null);
        if (zip) {
          components.pincode = zip;
        } else {
          statusCodes.push('Missing or invalid pincode');
        }

        // State detection (full name or code)
        let matchedStateName = '';
        let matchedStateCode = '';
        for (let i = partsLower.length - 1; i >= 0; i--) {
          const token = partsLower[i];
          if (stateCodes[token]) {
            matchedStateName = stateCodes[token];
            matchedStateCode = token.toUpperCase();
            parts[i] = null;
            partsLower[i] = null;
            break;
          }
          if (stateNames[token]) {
            matchedStateName = stateNames[token];
            matchedStateCode =
              Object.keys(stateCodes).find((c) => stateCodes[c] === matchedStateName) || '';
            parts[i] = null;
            partsLower[i] = null;
            break;
          }
        }
        parts = parts.filter((p) => p !== null);
        partsLower = partsLower.filter((p) => p !== null);

        if (!matchedStateName) {
          statusCodes.push('Missing or invalid state');
        }

        components.state = matchedStateName;
        components.state_code = matchedStateCode;

        // City detection using mongo cities list
        let matchedCity = '';
        if (matchedStateCode && citiesByState[matchedStateCode]) {
          const citySet = citiesByState[matchedStateCode];
          for (let i = partsLower.length - 1; i >= 0 && !matchedCity; i--) {
            for (let len = Math.min(3, i + 1); len >= 1; len--) {
              if (i - len + 1 < 0) continue;
              const candidate = partsLower.slice(i - len + 1, i + 1).join(' ');
              if (citySet.has(candidate)) {
                matchedCity = parts.slice(i - len + 1, i + 1).join(' ');
                for (let j = i - len + 1; j <= i; j++) {
                  parts[j] = null;
                  partsLower[j] = null;
                }
                break;
              }
            }
          }
        }
        parts = parts.filter((p) => p !== null);
        partsLower = partsLower.filter((p) => p !== null);

        if (!matchedCity) {
          statusCodes.push('Missing or invalid city');
        }

        components.city = matchedCity;

        // Remaining parts as street
        components.street = parts.join(' ').trim();
        if (!components.street) {
          statusCodes.push('Missing street');
        }

        const missingComponents = ['street', 'city', 'state', 'country'].filter(
          (k) => !components[k]
        );
        if (missingComponents.length > 0) {
          statusCodes.push(`Missing required components: ${missingComponents.join(', ')}`);
          components.status = 'Bad';
        } else {
          components.status = statusCodes.length === 0 ? 'Good' : 'Bad';
        }
        components.status_code = statusCodes.join('; ');

        const finalRow = {
          ...row,
          ...components,
          __state: components.status === 'Good' ? 'processed' : 'rejected',
          __reason: components.status === 'Good' ? 'completed' : components.status_code,
        };

        if (components.status === 'Good') {
          metrics.affected++;
        } else {
          metrics.rejected++;
        }
        rows.push(finalRow);
      });

      const rowGenerator = function* () {
        for (const r of rows) {
          yield r;
        }
      };

      await ProcessFlowHelper.writeOutput(output, headers, rowGenerator);
    } catch (error) {
      console.error('❌ Error in UsAddressSplitMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(
        workflowName,
        'failed',
        metrics,
        `Error in "${workflowName}": ${error.message}`
      );
    }

    const traceEntry = ProcessFlowHelper.addTraceEntry(
      workflowName,
      'completed',
      metrics,
      `Processed "${workflowName}"`
    );
    return traceEntry;
  }

  async GlobalAddressSplitMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting GlobalAddressSplitMethod', { workflow: workflowName });
    // For now, treat as pass-through with basic validation and tagging.
    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0 };
    const rows = [];

    const headers = [
      'address',
      'address_old',
      'street',
      'city',
      'state',
      'pincode',
      'country',
      'status',
      'status_code',
      '__state',
      '__reason',
    ];

    try {
      await ProcessFlowHelper.readInput(input, (row) => {
        metrics.total++;
        const original = (row.address || '').toString();
        if (!original || original.trim().length < 5) {
          rows.push({
            ...row,
            address_old: original,
            street: '',
            city: '',
            state: '',
            pincode: '',
            country: '',
            status: 'Incomplete',
            status_code: 'Empty or too short address',
            __state: 'rejected',
            __reason: 'Empty or too short address',
          });
          metrics.rejected++;
          return;
        }
        rows.push({
          ...row,
          address_old: original,
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: '',
          status: 'Incomplete',
          status_code: 'Parsing not implemented - global address',
          __state: 'rejected',
          __reason: 'Parsing not implemented - global address',
        });
        metrics.rejected++;
      });

      const rowGenerator = function* () {
        for (const r of rows) yield r;
      };
      await ProcessFlowHelper.writeOutput(output, headers, rowGenerator);
    } catch (error) {
      console.error('❌ Error in GlobalAddressSplitMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(
        workflowName,
        'failed',
        metrics,
        `Error in "${workflowName}": ${error.message}`
      );
    }

    const traceEntry = ProcessFlowHelper.addTraceEntry(
      workflowName,
      'completed',
      metrics,
      `Processed "${workflowName}"`
    );
    return traceEntry;
  }

  async PhoneCheckMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting PhoneCheckMethod', { workflow: workflowName });
    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0 };
    const rows = [];

    const headers = ['country', 'phone_old', 'phone_new', 'country_code', 'phone_count', 'status', '__state', '__reason'];

    try {
      const { db: moonDb } = await this.getDbConnection('moon');
      const countries = await moonDb.collection('countries').find({}).toArray();
      const countryByName = {};
      countries.forEach((c) => {
        countryByName[(c.name || '').toLowerCase()] = c;
      });

      await ProcessFlowHelper.readInput(input, (row) => {
        metrics.total++;
        const phone = (row.phone || row.phone_number || '').toString().trim();
        const countryName = (row.country || '').toString().trim();

        if (!phone) {
          rows.push({
            ...row,
            country: countryName,
            phone_old: phone,
            phone_new: phone,
            country_code: null,
            phone_count: null,
            status: 'Skipped',
            __state: 'skipped',
            __reason: 'Empty phone number',
          });
          metrics.skipped++;
          return;
        }

        const country = countryByName[countryName.toLowerCase()];
        const phoneCode = country?.phone_code || '';
        let clean = phone.replace(/[^\d+]/g, '');

        if (!clean.startsWith('+') && phoneCode) {
          clean = `+${phoneCode} ${clean}`;
        }

        // simple length check
        const digits = clean.replace(/[^\d]/g, '');
        const len = digits.length;
        const minLen = 7;
        const maxLen = 15;
        const validLen = len >= minLen && len <= maxLen;

        rows.push({
          ...row,
          country: countryName,
          phone_old: phone,
          phone_new: `="${clean}"`,
          country_code: phoneCode ? `="+${phoneCode}"` : null,
          phone_count: len,
          status: validLen ? 'Valid' : 'Invalid length',
          __state: validLen ? 'processed' : 'rejected',
          __reason: validLen ? 'completed' : 'Invalid length',
        });
        if (validLen) metrics.affected++;
        else metrics.rejected++;
      });

      const rowGenerator = function* () {
        for (const r of rows) yield r;
      };
      await ProcessFlowHelper.writeOutput(output, headers, rowGenerator);
    } catch (error) {
      console.error('❌ Error in PhoneCheckMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(
        workflowName,
        'failed',
        metrics,
        `Error in "${workflowName}": ${error.message}`
      );
    }

    const traceEntry = ProcessFlowHelper.addTraceEntry(
      workflowName,
      'completed',
      metrics,
      `Processed "${workflowName}"`
    );
    return traceEntry;
  }

  async SmtpJunkMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting SmtpJunkMethod', { workflow: workflowName });
    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0 };
    const rows = [];

    const headers = ['smtp', 'cleaned_smtp', 'status', '__state', '__reason'];

    try {
      const { db: moonDb } = await this.getDbConnection('moon');
      const junkRules = await moonDb.collection('smtp_junk').find({}).toArray();

      await ProcessFlowHelper.readInput(input, (row, index) => {
        metrics.total++;
        const smtp = (row.smtp || '').toString().trim();
        if (!smtp) {
          rows.push({
            ...row,
            smtp,
            cleaned_smtp: '',
            status: 'Empty SMTP',
            __state: 'skipped',
            __reason: 'Empty SMTP',
          });
          metrics.skipped++;
          return;
        }

        let cleaned = smtp;
        const statusList = [];

        junkRules.forEach((rule) => {
          const pattern = rule.smtp || rule.pattern || '';
          const action = rule.status || rule.action || '';
          if (!pattern || !action || cleaned == null) return;
          switch (action) {
            case 'Remove URL':
              if (/https?:\/\//i.test(cleaned) || /^www\./i.test(cleaned)) {
                cleaned = cleaned.replace(/https?:\/\//gi, '').replace(/^www\./i, '');
                statusList.push('url removed');
              }
              break;
            case 'Remove Symbol':
              if (cleaned.includes(pattern)) {
                cleaned = cleaned.split(pattern).join('');
                statusList.push('symbol removed');
              }
              break;
            case 'Remove Total':
              if (cleaned.includes(pattern)) {
                cleaned = null;
                statusList.push('junk removed');
              }
              break;
            default:
              break;
          }
        });

        if (cleaned != null) {
          cleaned = cleaned.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
          cleaned = cleaned.replace(/^[^a-z0-9]+/i, '').replace(/[^a-z0-9.]+$/i, '');
        }

        const statusString = statusList.length ? Array.from(new Set(statusList)).join(', ') : 'no action';

        if (cleaned && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned)) {
          rows.push({
            ...row,
            smtp,
            cleaned_smtp: cleaned,
            status: statusString,
            __state: 'processed',
            __reason: statusString === 'no action' ? 'completed' : statusString,
          });
          metrics.affected++;
        } else {
          rows.push({
            ...row,
            smtp,
            cleaned_smtp: cleaned || '',
            status: statusString,
            __state: 'rejected',
            __reason: statusString,
          });
          metrics.rejected++;
        }
      });

      const rowGenerator = function* () {
        for (const r of rows) yield r;
      };
      await ProcessFlowHelper.writeOutput(output, headers, rowGenerator);
    } catch (error) {
      console.error('❌ Error in SmtpJunkMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(
        workflowName,
        'failed',
        metrics,
        `Error in "${workflowName}": ${error.message}`
      );
    }

    const traceEntry = ProcessFlowHelper.addTraceEntry(
      workflowName,
      'completed',
      metrics,
      `Processed "${workflowName}"`
    );
    return traceEntry;
  }

  async GenerateEmailsMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting GenerateEmailsMethod', { workflow: workflowName });
    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0 };

    const requiredHeaders = ['li_full_name', 'domain'];
    const headers = [
      ...requiredHeaders,
      'li_first_name',
      'li_last_name',
      'li_firstname_initial',
      'li_lastname_initial',
      'generated_email',
      'format_code',
      'status',
      'reason',
      '__state',
      '__reason',
    ];

    const rows = [];

    try {
      const { db: moonDb } = await this.getDbConnection('moon');
      const emailFormats = await moonDb.collection('email_formats').find({}).toArray();
      const separatorMap = { Dot: '.', Hyphen: '-', Underscore: '_', Space: '', Empty: '' };

      const rowGenerator = async function* () {};// placeholder for typing, we won't use

      await ProcessFlowHelper.readInput(input, (row) => {
        metrics.total++;
        const fullName = (row.li_full_name || '').toString().trim();
        let domain = (row.domain || '').toString().trim().toLowerCase();
        if (domain.startsWith('www.')) domain = domain.slice(4);

        const baseRow = {
          li_full_name: fullName,
          domain,
        };

        if (!fullName || !domain) {
          rows.push({
            ...row,
            ...baseRow,
            li_first_name: '',
            li_last_name: '',
            li_firstname_initial: '',
            li_lastname_initial: '',
            generated_email: '',
            format_code: '',
            status: 'skipped',
            reason: 'Missing full name or domain',
            __state: 'skipped',
            __reason: 'Missing full name or domain',
          });
          metrics.skipped++;
          return;
        }

        const parts = fullName.split(/\s+/);
        const firstName = parts[0] || '';
        const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        const fi = firstName.charAt(0).toUpperCase();
        const li = lastName.charAt(0).toUpperCase();

        if (!firstName || !lastName) {
          rows.push({
            ...row,
            ...baseRow,
            li_first_name: firstName,
            li_last_name: lastName,
            li_firstname_initial: fi,
            li_lastname_initial: li,
            generated_email: '',
            format_code: '',
            status: 'rejected',
            reason: 'Full name must have at least 2 words',
            __state: 'rejected',
            __reason: 'Full name must have at least 2 words',
          });
          metrics.rejected++;
          return;
        }

        if (!emailFormats || emailFormats.length === 0) {
          rows.push({
            ...row,
            ...baseRow,
            li_first_name: firstName,
            li_last_name: lastName,
            li_firstname_initial: fi,
            li_lastname_initial: li,
            generated_email: '',
            format_code: '',
            status: 'rejected',
            reason: 'No email formats configured',
            __state: 'rejected',
            __reason: 'No email formats configured',
          });
          metrics.rejected++;
          return;
        }

        let atLeastOneValid = false;

        emailFormats.forEach((format) => {
          const sep = separatorMap[format.separator] || '';
          const mapField = (field) => {
            switch (field) {
              case 'FirstName':
                return firstName;
              case 'LastName':
                return lastName;
              case 'FirstInitial':
                return fi;
              case 'LastInitial':
                return li;
              default:
                return '';
            }
          };

          const f1 = mapField(format.field_1);
          const f2 = mapField(format.field_2);
          const email = `${f1}${sep}${f2}@${domain}`.toLowerCase();
          const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

          rows.push({
            ...row,
            ...baseRow,
            li_first_name: firstName,
            li_last_name: lastName,
            li_firstname_initial: fi,
            li_lastname_initial: li,
            generated_email: email,
            format_code: String(format.status || ''),
            status: isValid ? 'Good' : 'Bad',
            reason: isValid ? 'Valid email generated' : 'Invalid email format',
            __state: isValid ? 'processed' : 'rejected',
            __reason: isValid ? 'completed' : 'Invalid email format',
          });

          if (isValid) atLeastOneValid = true;
        });

        if (atLeastOneValid) {
          metrics.affected++;
        } else {
          metrics.rejected++;
        }
      });

    const generator = function* () {
      for (const r of rows) yield r;
    };
    await ProcessFlowHelper.writeOutput(output, headers, generator);
    } catch (error) {
      console.error('❌ Error in GenerateEmailsMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(
        workflowName,
        'failed',
        metrics,
        `Error in "${workflowName}": ${error.message}`
      );
    }

    const traceEntry = ProcessFlowHelper.addTraceEntry(
      workflowName,
      'completed',
      metrics,
      `Processed "${workflowName}"`
    );
    return traceEntry;
  }

  async EmailSyntaxMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting EmailSyntaxMethod', { workflow: workflowName });
    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0 };
    const rows = [];

    const headers = ['email', 'domain', 'syntax_status', 'reason', 'suggested_email'];
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    try {
      await ProcessFlowHelper.readInput(input, (row) => {
        metrics.total++;
        const raw = (row.email || '').toString().trim();
        const email = raw.toLowerCase();
        const domain = email.split('@')[1] || '';

        if (!email) {
          rows.push({
            ...row,
            email: raw,
            domain: '',
            syntax_status: 'skipped',
            reason: 'Empty email',
            suggested_email: '',
          });
          metrics.skipped++;
          return;
        }

        const valid = emailRegex.test(email);
        if (valid) {
          rows.push({
            ...row,
            email,
            domain,
            syntax_status: 'Valid',
            reason: 'Valid email syntax',
            suggested_email: '',
          });
          metrics.affected++;
        } else {
          let suggested = '';
          const parts = email.split('@');
          if (parts.length === 2) {
            const local = parts[0].replace(/[^a-zA-Z0-9._%+-]/g, '');
            let dom = parts[1].replace(/[^a-zA-Z0-9.-]/g, '');
            if (!dom.includes('.')) dom += '.com';
            suggested = `${local}@${dom}`;
          }

          rows.push({
            ...row,
            email,
            domain,
            syntax_status: 'Invalid',
            reason: 'Invalid email syntax',
            suggested_email: suggested,
          });
          metrics.rejected++;
        }
      });

      const generator = function* () {
        for (const r of rows) yield r;
      };
      await ProcessFlowHelper.writeOutput(output, headers, generator);
    } catch (error) {
      console.error('❌ Error in EmailSyntaxMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(
        workflowName,
        'failed',
        metrics,
        `Error in "${workflowName}": ${error.message}`
      );
    }

    const traceEntry = ProcessFlowHelper.addTraceEntry(
      workflowName,
      'completed',
      metrics,
      `Processed "${workflowName}"`
    );
    return traceEntry;
  }

  async DomainFormatMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting DomainFormatMethod', { workflow: workflowName });
    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0 };
    const rows = [];

    const headers = ['li_full_name', 'email', 'domain', 'matched_formats', 'status', 'reason'];

    try {
      const { db: moonDb } = await this.getDbConnection('moon');
      const formats = await moonDb.collection('email_formats').find({}).toArray();
      const separatorMap = { Dot: '.', Hyphen: '-', Underscore: '_', Space: '', Empty: '' };
      const domainFormats = {};

      await ProcessFlowHelper.readInput(input, (row) => {
        metrics.total++;
        const fullName = (row.li_full_name || '').toString().trim();
        const emailRaw = (row.email || '').toString().trim().toLowerCase();

        if (!fullName || !emailRaw) {
          rows.push({
            ...row,
            li_full_name: fullName,
            email: emailRaw,
            domain: '',
            matched_formats: '',
            status: 'skipped',
            reason: 'Missing full name or email',
          });
          metrics.skipped++;
          return;
        }

        const nameParts = fullName.split(/\s+/);
        if (nameParts.length < 2) {
          rows.push({
            ...row,
            li_full_name: fullName,
            email: emailRaw,
            domain: '',
            matched_formats: '',
            status: 'rejected',
            reason: 'Incomplete full name',
          });
          metrics.rejected++;
          return;
        }

        const first = nameParts[0];
        const last = nameParts[nameParts.length - 1];
        const fi = first[0]?.toLowerCase() || '';
        const li = last[0]?.toLowerCase() || '';
        const domain = emailRaw.split('@')[1] || '';

        if (!domain) {
          rows.push({
            ...row,
            li_full_name: fullName,
            email: emailRaw,
            domain: '',
            matched_formats: '',
            status: 'skipped',
            reason: 'Email missing domain',
          });
          metrics.skipped++;
          return;
        }

        const matchedStatuses = [];
        formats.forEach((format) => {
          const sep = separatorMap[format.separator] || '';
          const f1 = (() => {
            switch (format.field_1) {
              case 'FirstName':
                return first.toLowerCase();
              case 'LastName':
                return last.toLowerCase();
              case 'FirstInitial':
                return fi;
              case 'LastInitial':
                return li;
              default:
                return '';
            }
          })();
          const f2 = (() => {
            switch (format.field_2) {
              case 'FirstName':
                return first.toLowerCase();
              case 'LastName':
                return last.toLowerCase();
              case 'FirstInitial':
                return fi;
              case 'LastInitial':
                return li;
              default:
                return '';
            }
          })();
          const candidate = `${f1}${sep}${f2}@${domain}`.toLowerCase();
          if (candidate === emailRaw) {
            if (format.status != null) matchedStatuses.push(format.status);
          }
        });

        if (!domainFormats[domain]) domainFormats[domain] = new Set();
        matchedStatuses.forEach((s) => domainFormats[domain].add(s));

        rows.push({
          ...row,
          li_full_name: fullName,
          email: emailRaw,
          domain,
          matched_formats: matchedStatuses.join(','),
          status: matchedStatuses.length ? 'matched' : 'not_matched',
          reason: matchedStatuses.length ? 'Formats identified' : 'No formats matched',
        });
        metrics.affected++;
      });

      // persist domain formats
      for (const [domain, statusSet] of Object.entries(domainFormats)) {
        const list = Array.from(statusSet).join(',');
        await moonDb
          .collection('domain_formats')
          .updateOne({ domain }, { $set: { domain, email_format: list } }, { upsert: true });
      }

      const generator = function* () {
        for (const r of rows) yield r;
      };
      await ProcessFlowHelper.writeOutput(output, headers, generator);
    } catch (error) {
      console.error('❌ Error in DomainFormatMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(
        workflowName,
        'failed',
        metrics,
        `Error in "${workflowName}": ${error.message}`
      );
    }

    const traceEntry = ProcessFlowHelper.addTraceEntry(
      workflowName,
      'completed',
      metrics,
      `Processed "${workflowName}"`
    );
    return traceEntry;
  }

  /**
   * UtoFlowsMethod
   * Some workflow records reference this typo; delegate to AutoflowsMethod to mirror BV behavior.
   */
  async UtoFlowsMethod(workflowName, input, output, tracing, metadata) {
    return this.AutoflowsMethod(workflowName, input, output, tracing, metadata);
  }

  /**
   * AutoflowsMethod
   * Ported from BV WorkflowService::AutoflowsMethod
   * Uses domain mode (dls_email_number) and email/domain formats to auto-generate emails.
   * 
   * OPTIMIZED: Uses streaming processing to handle files up to 2GB without memory overflow.
   * - Uses MongoDB aggregation to compute domain modes (avoids loading entire base table)
   * - Processes rows inline during streaming (no inputBuffer)
   * - Writes output in batches of 10,000 rows (no outputRows array)
   */
  async AutoflowsMethod(workflowName, input, output, tracing, metadata) {
    console.log('📥 Starting AutoflowsMethod (STREAMING MODE)', {
      workflow: workflowName,
      input_type: input.type || 'unknown',
      input_source: input.table || input.path || 'unknown',
    });

    const metrics = { total: 0, affected: 0, rejected: 0, skipped: 0 };
    const BATCH_SIZE = 10000; // Write output in batches
    let outputBatch = [];
    let isFirstBatch = true;
    const fs = require('fs');
    const path = require('path');

    try {
      // Load workflow config
      const workflowMap = metadata.workflow_map || [];
      const workflowConfig = Array.isArray(workflowMap)
        ? workflowMap.find(
            (config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
          )
        : Object.values(workflowMap).find(
            (config) => (config.workflow_name || '').toLowerCase() === workflowName.toLowerCase()
          );

      if (!workflowConfig) {
        throw new Error(`No workflow mapping found for "${workflowName}".`);
      }

      // Get base database and table from metadata
      const baseInputDb = metadata.base_input_db || null;
      let baseInputTable = metadata.base_input_table || null;

      if (!baseInputDb || !baseInputTable) {
        throw new Error('Base database and table are required for AutoflowsMethod.');
      }

      if (baseInputTable.includes('.')) {
        baseInputTable = baseInputTable.split('.')[1];
      }

      console.log('AutoflowsMethod base table analysis', {
        base_table: `${baseInputDb}.${baseInputTable}`,
        workflow: workflowName,
      });

      // === PREFETCH: email_formats and domain_formats from moon (small - OK to keep in memory) ===
      const { db: moonDb } = await this.getDbConnection('moon');

      const emailFormatsDocs = await moonDb
        .collection('email_formats')
        .find({ status: { $ne: null, $gt: 0 } })
        .toArray();
      const emailFormatsByStatus = {};
      emailFormatsDocs.forEach((doc) => {
        if (doc.status != null) {
          emailFormatsByStatus[doc.status] = doc;
        }
      });

      const domainFormatsDocs = await moonDb
        .collection('domain_formats')
        .find({ deleted_at: null, email_format: { $ne: null, $ne: '' } })
        .toArray();
      const domainFormatsMap = {};
      domainFormatsDocs.forEach((doc) => {
        const formats = String(doc.email_format || '')
          .split(',')
          .map((v) => parseInt(v.trim(), 10))
          .filter((n) => Number.isInteger(n) && n > 0);
        domainFormatsMap[doc.domain] = formats;
      });

      // === OPTIMIZED: Use MongoDB aggregation to compute domain modes ===
      // This avoids loading entire base table into memory
      const { db: baseDb } = await this.getDbConnection(baseInputDb);
      const baseCollection = baseDb.collection(baseInputTable);

      console.log('📊 Computing domain modes using aggregation...');
      const domainModesPipeline = [
        { $match: { li_smtp: { $ne: null, $ne: '' }, dls_email_number: { $gt: 0 } } },
        { $project: { 
          domain: { $toLower: { $cond: [
            { $regexMatch: { input: '$li_smtp', regex: /^www\./i } },
            { $substrCP: ['$li_smtp', 4, { $strLenCP: '$li_smtp' }] },
            '$li_smtp'
          ]}},
          dls_email_number: 1
        }},
        { $group: { _id: { domain: '$domain', num: '$dls_email_number' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $group: { _id: '$_id.domain', mode: { $first: '$_id.num' }, maxCount: { $first: '$count' } } }
      ];

      const domainModesResult = await baseCollection.aggregate(domainModesPipeline, { allowDiskUse: true }).toArray();
      const domainModesMap = {};
      domainModesResult.forEach((doc) => {
        if (doc._id && doc.mode) {
          domainModesMap[doc._id] = doc.mode;
        }
      });

      console.log('Autoflows domain modes calculated (via aggregation)', {
        domains_with_modes: Object.keys(domainModesMap).length,
      });

      // === Setup output headers ===
      const headers = [
        'li_full_name',
        'domain',
        'li_first_name',
        'li_last_name',
        'li_firstname_initial',
        'li_lastname_initial',
        'generated_email',
        'format_code',
        'status',
        'reason',
        '__state',
        '__reason',
      ];

      const separatorMap = {
        Dot: '.',
        Hyphen: '-',
        Underscore: '_',
        Space: '',
        Empty: '',
      };

      // === OPTIMIZED: Prepare output file for streaming writes ===
      const outputDir = path.dirname(output.path);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Helper to write batch to CSV
      const writeBatch = (batch, isFirst) => {
        const headerRow = headers.join(',');
        const csvRows = batch.map(row => headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(','));
        
        const csvContent = isFirst 
          ? [headerRow, ...csvRows].join('\n')
          : csvRows.join('\n');
        
        if (isFirst) {
          fs.writeFileSync(output.path, csvContent, 'utf8');
        } else {
          fs.appendFileSync(output.path, '\n' + csvContent, 'utf8');
        }
      };

      // === STREAMING: Process rows inline without buffering ===
      const processRow = (row) => {
        const fullName = (row.li_full_name || '').toString().trim();
        let domain = (row.domain || '').toString().trim();
        let domainNorm = domain.toLowerCase();
        if (domainNorm.startsWith('www.')) {
          domainNorm = domainNorm.slice(4);
        }

        const outputRow = {
          ...row,
          li_full_name: fullName,
          domain: domainNorm,
          li_first_name: '',
          li_last_name: '',
          li_firstname_initial: '',
          li_lastname_initial: '',
          generated_email: '',
          format_code: '',
          status: '',
          reason: '',
          __state: '',
          __reason: '',
        };

        // Basic validation
        if (!fullName || !domainNorm) {
          outputRow.status = 'skipped';
          outputRow.reason = 'Missing full name or domain';
          outputRow.__state = 'skipped';
          outputRow.__reason = 'Missing full name or domain';
          metrics.skipped++;
          return outputRow;
        }

        const modeNumber = domainModesMap[domainNorm] || null;
        if (!modeNumber || modeNumber <= 0) {
          outputRow.status = 'skipped';
          outputRow.reason = 'No base match for domain';
          outputRow.__state = 'skipped';
          outputRow.__reason = 'No base match for domain';
          metrics.skipped++;
          return outputRow;
        }

        const allowedFormats = domainFormatsMap[domainNorm] || [];
        const chosenFormatNum = allowedFormats.includes(modeNumber)
          ? modeNumber
          : allowedFormats.length > 0
          ? allowedFormats[0]
          : modeNumber;

        const formatDef = emailFormatsByStatus[chosenFormatNum] || null;
        if (!formatDef) {
          outputRow.format_code = String(chosenFormatNum);
          outputRow.status = 'rejected';
          outputRow.reason = `Email format not defined for status ${chosenFormatNum}`;
          outputRow.__state = 'rejected';
          outputRow.__reason = outputRow.reason;
          metrics.rejected++;
          return outputRow;
        }

        // Parse name
        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const firstInitial = firstName.charAt(0).toUpperCase();
        const lastInitial = lastName.charAt(0).toUpperCase();

        outputRow.li_first_name = firstName;
        outputRow.li_last_name = lastName;
        outputRow.li_firstname_initial = firstInitial;
        outputRow.li_lastname_initial = lastInitial;

        if (!firstName || !lastName) {
          outputRow.status = 'skipped';
          outputRow.reason = 'Full name must have at least 2 words';
          outputRow.__state = 'skipped';
          outputRow.__reason = 'Full name must have at least 2 words';
          metrics.skipped++;
          return outputRow;
        }

        const sep = separatorMap[formatDef.separator] || '';
        const mapField = (field) => {
          switch (field) {
            case 'FirstName':
              return firstName;
            case 'LastName':
              return lastName;
            case 'FirstInitial':
              return firstInitial;
            case 'LastInitial':
              return lastInitial;
            default:
              return '';
          }
        };

        const f1 = mapField(formatDef.field_1);
        const f2 = mapField(formatDef.field_2);

        if (!f1 && !f2) {
          outputRow.format_code = String(chosenFormatNum);
          outputRow.status = 'Bad';
          outputRow.reason = 'Empty name fields';
          outputRow.__state = 'rejected';
          outputRow.__reason = 'Empty name fields';
          metrics.rejected++;
          return outputRow;
        }

        const email = `${f1}${sep}${f2}@${domainNorm}`.toLowerCase();
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        outputRow.generated_email = email;
        outputRow.format_code = String(chosenFormatNum);
        outputRow.status = isValid ? 'Good' : 'Bad';
        outputRow.reason = isValid
          ? 'Valid email generated using auto-discovered format'
          : 'Invalid email format';
        outputRow.__state = isValid ? 'processed' : 'rejected';
        outputRow.__reason = isValid ? 'completed' : 'Invalid email format';

        if (isValid) {
          metrics.affected++;
        } else {
          metrics.rejected++;
        }

        return outputRow;
      };

      // === STREAMING: Read input and write output in batches ===
      await ProcessFlowHelper.readInput(input, (row) => {
        metrics.total++;
        
        // Process row inline (no buffering)
        const outputRow = processRow(row);
        outputBatch.push(outputRow);

        // Write batch when full (prevents memory buildup)
        if (outputBatch.length >= BATCH_SIZE) {
          writeBatch(outputBatch, isFirstBatch);
          outputBatch = []; // Clear batch immediately
          isFirstBatch = false;
          
          // Force garbage collection hint
          if (global.gc && metrics.total % 100000 === 0) {
            global.gc();
          }
        }
      });

      // Write remaining batch
      if (outputBatch.length > 0) {
        writeBatch(outputBatch, isFirstBatch);
        outputBatch = []; // Clear
      }

      console.log('✅ AutoflowsMethod completed (STREAMING)', {
        total: metrics.total,
        affected: metrics.affected,
        rejected: metrics.rejected,
        skipped: metrics.skipped,
        memory_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
      });

    } catch (error) {
      console.error('❌ Error in AutoflowsMethod', { error: error.message });
      return ProcessFlowHelper.addTraceEntry(
        workflowName,
        'failed',
        metrics,
        `Error in "${workflowName}": ${error.message}`
      );
    }

    const traceEntry = ProcessFlowHelper.addTraceEntry(
      workflowName,
      'completed',
      metrics,
      'Processed AutoflowsMethod'
    );

    return traceEntry;
  }
}

// Export the class
module.exports = WorkFlowService;
module.exports.default = WorkFlowService;

