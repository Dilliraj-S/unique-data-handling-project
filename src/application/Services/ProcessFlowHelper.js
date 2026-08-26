/**
 * ProcessFlowHelper
 * Equivalent to bv/app/Http/Helpers/ProcessFlowHelper.php
 * Handles workflow data fetching, flow data building, input/output processing, and logging
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Dynamic import for ES6 modules (used in Next.js API routes)
let getConnectionConfig;
try {
  // Try ES6 import first (for Next.js)
  const dbModule = require('../../config/database.js');
  getConnectionConfig = dbModule.getConnectionConfig || dbModule.default?.getConnectionConfig;
} catch (e) {
  // Fallback
  getConnectionConfig = (name) => {
    const connections = {
      moon: {
        uri: process.env.MOON_MONGODB_URI || 'mongodb://localhost:27017/moon',
        database: 'moon',
        options: { maxPoolSize: 10, minPoolSize: 5 }
      }
    };
    return connections[name] || connections.moon;
  };
}

class ProcessFlowHelper {
  /**
   * Get flows data from moon.workflows collection
   * @param {string|array|null} names - Optional workflow name(s) to fetch
   * @returns {Promise<Object>} Object keyed by workflow name
   */
  static async getFlowsData(names = null) {
    try {
      const moonConfig = getConnectionConfig('moon');
      const client = new MongoClient(moonConfig.uri, moonConfig.options);
      await client.connect();
      const db = client.db(moonConfig.database);

      const query = { deleted_at: null };
      const workflows = await db.collection('workflows').find(query).toArray();

      const flows = {};
      workflows.forEach((row) => {
        flows[row.name] = {
          flow_id: row.flow_id || null,
          identifier: row.identifier || null,
          type: row.type || null,
          mandatory: row.mandatory ?? 1,
          required_headers: Array.isArray(row.required_headers)
            ? row.required_headers
            : (row.required_headers ? JSON.parse(row.required_headers) : []),
          update_headers: Array.isArray(row.update_headers)
            ? row.update_headers
            : (row.update_headers ? JSON.parse(row.update_headers) : []),
          mapping_headers: Array.isArray(row.mapping_headers)
            ? row.mapping_headers
            : (row.mapping_headers ? JSON.parse(row.mapping_headers) : []),
          support_table: row.support_table || null,
        };
      });

      await client.close();

      if (names !== null) {
        const nameArray = Array.isArray(names) ? names : [names];
        const filtered = {};
        nameArray.forEach((name) => {
          if (flows[name]) {
            filtered[name] = flows[name];
          }
        });
        return filtered;
      }

      return flows;
    } catch (error) {
      console.error('ProcessFlowHelper.getFlowsData error:', error);
      throw error;
    }
  }

  /**
   * Build flow data structure for processing
   * @param {Object} validated - Validated form data
   * @param {Array} workflowList - List of workflow objects
   * @param {string} processId - Process ID
   * @returns {Promise<Object>} Flow data structure
   */
  static async buildFlowData(validated, workflowList, processId) {
    const processMode = validated.mode;
    const inputSource = validated.input_source;
    const outputTarget = validated.output_target;
    const mode = `${inputSource}-${outputTarget}`;

    let headers = validated.csv_headers || [];

    // Add status column for flow mode
    const includeStatus = processMode === 'flow' && !headers.includes('status');
    if (includeStatus) {
      headers.push('status');
    }

    // Handle CSV input - add status column if needed (matching BV project)
    // NOTE: We do NOT patch the file here as it corrupts multiline CSVs.
    // The status column will be handled during processing and output generation.
    if (inputSource === 'csv' && includeStatus && validated.csv_file_name) {
      // Logic removed to prevent data corruption
    }

    // Handle DB input (matching PHP validation)
    if (inputSource === 'db') {
      // Validate db.table format (matching PHP)
      if (!validated.input_table || !validated.input_table.includes('.')) {
        throw new Error("input_table must be in 'db.table' format like 'db_name.table_name'.");
      }

      const tableName = validated.input_table;
      
      try {
        // Fetch sample row to get actual table columns (matching PHP)
        const config = getConnectionConfig(validated.input_db || 'moon');
        const client = new MongoClient(config.uri, config.options);
        await client.connect();
        const db = client.db(config.database);
        
        const [dbName, collectionName] = tableName.split('.');
        const collection = db.collection(collectionName);
        const sampleRow = await collection.findOne({});
        
        await client.close();

        const tableColumns = sampleRow ? Object.keys(sampleRow) : [];

        // Get required headers from workflows
        const allRequiredHeaders = [];
        validated.workflows.forEach((workflowName) => {
          const workflow = workflowList.find((w) => w.name === workflowName);
          if (workflow && workflow.required_headers) {
            allRequiredHeaders.push(...workflow.required_headers);
          }
        });

        // Intersect with actual table columns (matching PHP)
        headers = tableColumns.filter(col => allRequiredHeaders.includes(col));

        if (headers.length === 0) {
          console.warn('⚠️ No matching columns found between table and required headers', {
            table_columns: tableColumns,
            required_headers: allRequiredHeaders,
          });
          headers = allRequiredHeaders; // Fallback to required headers
        }
      } catch (error) {
        console.error('⚠️ DB input validation error:', error.message);
        // Fallback: use required headers
        const allRequiredHeaders = [];
        validated.workflows.forEach((workflowName) => {
          const workflow = workflowList.find((w) => w.name === workflowName);
          if (workflow && workflow.required_headers) {
            allRequiredHeaders.push(...workflow.required_headers);
          }
        });
        headers = [...new Set(allRequiredHeaders)];
      }
    }

    // Input definition (matching BV project - ensure directories exist)
    let input;
    if (inputSource === 'csv') {
      const inputPath = path.join(process.cwd(), 'public', 'uploads', validated.csv_file_name || '');
      const inputDir = path.dirname(inputPath);
      if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
      }
      // Verify file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`CSV file not found at path: ${inputPath}`);
      }
      input = {
        type: 'csv',
        file_name: validated.csv_file_name || null,
        headers: headers,
        path: inputPath,
      };
    } else {
      input = {
        type: 'db',
        database: validated.input_db,
        table: validated.input_table,
        headers: headers,
      };
    }

    // Output definition (matching BV project - ensure directories exist)
    let output;
    if (outputTarget === 'csv') {
      const outputPath = path.join(
        process.cwd(),
        'public',
        'exports',
        'flow',
        `export_${Date.now()}.csv`
      );
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      output = {
        type: 'csv',
        path: outputPath,
      };
    } else if (outputTarget === 'excel') {
      const outputPath = path.join(
        process.cwd(),
        'public',
        'exports',
        'flow',
        `export_${Date.now()}.xlsx`
      );
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      output = {
        type: 'excel',
        path: outputPath,
      };
    } else {
      output = {
        type: 'db',
        database: validated.output_db,
        table: validated.output_table,
      };
    }

    // Build workflow map (matching BV project structure exactly)
    const workflowMap = {};
    validated.workflows.forEach((name) => {
      const wf = workflowList.find((w) => w.name === name);
      if (wf) {
        // Use workflow.id as key (matching BV project's $wf['id'])
        const workflowId = wf.id || wf.flow_id || name;
        workflowMap[workflowId] = {
          workflow_name: name,
          support_table: wf.support_table || null,
          mandatory: wf.mandatory ?? false,
          update_headers: Array.isArray(wf.update_headers) ? wf.update_headers : [],
          mapping_headers: Array.isArray(wf.mapping_headers) ? wf.mapping_headers : [],
          required_headers: Array.isArray(wf.required_headers) ? wf.required_headers : [],
        };
      }
    });

    return {
      input,
      output,
      meta: {
        process_name: validated.process_name,
        process_id: processId,
        mode: mode,
        workflow_map: workflowMap,
        base_input_db: validated.base_input_db || null,
        base_input_table: validated.base_input_table || null,
      },
    };
  }

  /**
   * Get quick row count from CSV file (matching PHP version)
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<number>} Number of data rows (excluding header)
   */
  static async getQuickRowCount(filePath) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`CSV file not found: ${filePath}`));
      }

      let rowCount = 0;
      let isFirstLine = true;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', () => {
          if (!isFirstLine) {
            rowCount++;
          }
          isFirstLine = false;
        })
        .on('end', () => {
          resolve(rowCount);
        })
        .on('error', (error) => {
          reject(new Error(`Cannot read CSV file: ${filePath} - ${error.message}`));
        });
    });
  }

  /**
   * Read input data (CSV or DB) and process with callback
   * Implements batch processing and progress logging like PHP version
   * @param {Object} input - Input configuration
   * @param {Function} callback - Callback function for each row
   */
  static async readInput(input, callback) {
    const type = input.type || 'csv';
    let idCounter = 1;
    const usedIds = {};
    let processedCount = 0;

    // Configuration matching PHP version
    const batchSize = process.env.CSV_BATCH_SIZE || 1000;
    const maxRows = parseInt(process.env.CSV_MAX_ROWS || 0);

    if (type === 'csv') {
      if (!input.path || !fs.existsSync(input.path)) {
        throw new Error('Invalid or missing CSV file path');
      }

      // Get quick row count for validation (matching PHP)
      let actualRowCount = 0;
      try {
        actualRowCount = await this.getQuickRowCount(input.path);
        
        // Validate against threshold (matching PHP)
        if (maxRows > 0 && actualRowCount > maxRows) {
          throw new Error(`CSV file contains ${actualRowCount} rows, which exceeds the ${maxRows} row limit.`);
        }

        console.log('📊 CSV Processing Started', {
          file_path: input.path,
          row_count: actualRowCount,
          max_allowed: maxRows,
        });
      } catch (error) {
        console.error('⚠️ Row count validation error:', error.message);
        // Continue anyway - will process what we can
      }

      const startTime = Date.now();
      let batch = [];
      let csvHeaders = null;
      let headers = input.headers || [];

      return new Promise((resolve, reject) => {
        fs.createReadStream(input.path)
          .pipe(csv())
          .on('data', (row) => {
            // On first row, detect all CSV headers (matching BV: $headers = $input['headers'] ?? $csv->getHeader())
            if (csvHeaders === null) {
              csvHeaders = Object.keys(row).filter(h => h !== null && h !== ''); // Remove null/empty headers (matching BV)
              // Use CSV headers if input headers not provided (matching BV)
              if (!headers || headers.length === 0) {
                headers = csvHeaders;
              } else {
                // Merge to ensure all CSV columns are included
                const allHeaders = new Set([...csvHeaders, ...headers]);
                headers = Array.from(allHeaders);
              }
            }
            
            const processedRow = {};
            // Process all headers (matching BV: foreach ($headers as $header))
            headers.forEach((header) => {
              // Use the value from CSV row, or null if missing (matching BV: $row[$header] = $record[$header] ?? null)
              processedRow[header] = row.hasOwnProperty(header) ? (row[header] ?? null) : null;
            });

            // Assign unique ID if missing (matching PHP)
            if (!processedRow.id || usedIds[processedRow.id]) {
              while (usedIds[idCounter]) {
                idCounter++;
              }
              processedRow.id = idCounter;
              idCounter++;
            }
            usedIds[processedRow.id] = true;

            batch.push(processedRow);
            processedCount++;

            // Process batch when it reaches batch size (matching PHP)
            if (batch.length >= batchSize) {
              batch.forEach((batchRow, idx) => {
                callback(batchRow, processedCount - batch.length + idx);
              });
              batch = [];

              // Progress logging (matching PHP)
              const logInterval = parseInt(process.env.PROGRESS_LOG_INTERVAL || 100000);
              if (processedCount % logInterval === 0) {
                const elapsedTime = (Date.now() - startTime) / 1000;
                const rowsPerSecond = processedCount / Math.max(1, elapsedTime);
                const estimatedRemaining = (actualRowCount - processedCount) / Math.max(1, rowsPerSecond);

                console.log('📊 CSV processing progress', {
                  processed_rows: processedCount.toLocaleString(),
                  total_rows: actualRowCount.toLocaleString(),
                  progress_pct: ((processedCount / Math.max(1, actualRowCount)) * 100).toFixed(2) + '%',
                  rows_per_sec: rowsPerSecond.toFixed(2),
                  elapsed_time_min: (elapsedTime / 60).toFixed(2),
                  estimated_remaining_min: (estimatedRemaining / 60).toFixed(2),
                  memory_usage_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
                });
              }
            }
          })
          .on('end', () => {
            // Process remaining batch
            if (batch.length > 0) {
              batch.forEach((batchRow, idx) => {
                callback(batchRow, processedCount - batch.length + idx);
              });
            }

            console.log('✅ CSV reading completed', {
              total_rows: processedCount,
              elapsed_time_sec: ((Date.now() - startTime) / 1000).toFixed(2),
            });

            resolve();
          })
          .on('error', (error) => {
            reject(new Error(`CSV reading error: ${error.message}`));
          });
      });
    } else if (type === 'db') {
      // DB input handling (matching PHP)
      if (!input.table) {
        throw new Error('Missing database table name');
      }

      try {
        const config = getConnectionConfig(input.database || 'moon');
        const client = new MongoClient(config.uri, config.options);
        await client.connect();
        const db = client.db(config.database);

        const collection = db.collection(input.table);
        const orderBy = input.order_by || 'id';
        const chunkSize = 1000;

        let skip = 0;
        const startTime = Date.now();

        while (true) {
          const docs = await collection
            .find({})
            .sort({ [orderBy]: 1 })
            .skip(skip)
            .limit(chunkSize)
            .toArray();

          if (docs.length === 0) break;

          docs.forEach((doc, idx) => {
            // Assign unique ID if missing
            if (!doc.id || usedIds[doc.id]) {
              while (usedIds[idCounter]) {
                idCounter++;
              }
              doc.id = idCounter;
              idCounter++;
            }
            usedIds[doc.id] = true;

            callback(doc, skip + idx);
            processedCount++;
          });

          skip += chunkSize;

          // Progress logging
          const logInterval = parseInt(process.env.PROGRESS_LOG_INTERVAL || 100000);
          if (processedCount % logInterval === 0) {
            const elapsedTime = (Date.now() - startTime) / 1000;
            const rowsPerSecond = processedCount / Math.max(1, elapsedTime);

            console.log('📊 DB processing progress', {
              processed_rows: processedCount.toLocaleString(),
              rows_per_sec: rowsPerSecond.toFixed(2),
              elapsed_time_min: (elapsedTime / 60).toFixed(2),
              memory_usage_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
            });
          }
        }

        await client.close();

        console.log('✅ DB reading completed', {
          total_rows: processedCount,
          elapsed_time_sec: ((Date.now() - startTime) / 1000).toFixed(2),
        });
      } catch (error) {
        throw new Error(`DB reading error: ${error.message}`);
      }
    } else {
      throw new Error(`Unsupported input type: ${type}`);
    }
  }

  /**
   * Write output data (CSV, Excel, or DB) with file splitting and ZIP support
   * Matches PHP version with 600K row threshold for splitting
   * @param {Object} output - Output configuration
   * @param {Array} headers - Column headers
   * @param {Function} rowGenerator - Generator function for rows
   */
  static async writeOutput(output, headers, rowGenerator) {
    const type = output.type || 'csv';
    const startTime = Date.now();
    const threshold = 600000; // PHP uses 600K rows threshold
    const batchSize = 10000; // Write in batches of 10K rows

    if (!headers.includes('id')) {
      headers.unshift('id');
    }

    try {
      // Normalize generator: support both sync and async generators
      const getIterator = () => {
        if (typeof rowGenerator !== 'function') {
          throw new Error('rowGenerator must be a function');
        }
        const iter = rowGenerator();
        const isAsync = iter && typeof iter[Symbol.asyncIterator] === 'function';
        const isSync = iter && typeof iter[Symbol.iterator] === 'function';
        if (!isAsync && !isSync) {
          throw new Error('rowGenerator is not a function or its return value is not iterable');
        }
        return { iter, isAsync };
      };
      if (type === 'csv') {
        const dir = path.dirname(output.path);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        let rowCount = 0;
        let fileIndex = 0;
        let batch = [];
        const filePaths = [];
        let currentFilePath = output.path;

        // Helper function to write CSV batch (append mode)
        const writeCsvBatch = (filePath, headerRow, dataRows, isFirstBatch = false) => {
          const csvRows = dataRows.map(row => headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            // UTF-8 validation (matching PHP)
            if (typeof str === 'string' && !ProcessFlowHelper.isValidUtf8(str)) {
              return Buffer.from(str, 'utf8').toString('utf8');
            }
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(','));
          
          const csvContent = isFirstBatch 
            ? [headerRow, ...csvRows].join('\n')
            : csvRows.join('\n');

          // Append to file (or create if first batch)
          if (isFirstBatch) {
            fs.writeFileSync(filePath, csvContent, 'utf8');
          } else {
            fs.appendFileSync(filePath, '\n' + csvContent, 'utf8');
          }
        };

        const headerRow = headers.join(',');
        let isFirstBatch = true;

        const { iter, isAsync } = getIterator();
        const iterate = isAsync ? (async function* () { for await (const r of iter) yield r; })() : (function* () { for (const r of iter) yield r; })();

        for await (const row of iterate) {
          const record = {};
          headers.forEach((header) => {
            // Use null for missing fields (matching BV's behavior)
            record[header] = row.hasOwnProperty(header) ? (row[header] ?? null) : null;
          });

          batch.push(record);
          rowCount++;

          // Split file at threshold (matching PHP)
          if (rowCount % threshold === 0) {
            if (batch.length > 0) {
              writeCsvBatch(currentFilePath, headerRow, batch, isFirstBatch);
              if (isFirstBatch) {
                filePaths.push(currentFilePath);
              }
              batch = [];
              isFirstBatch = false;
            }

            fileIndex++;
            currentFilePath = output.path.replace('.csv', `_part${fileIndex}.csv`);
            isFirstBatch = true; // New file, so first batch again
          }

          // Write batch when it reaches batch size
          if (batch.length >= batchSize) {
            writeCsvBatch(currentFilePath, headerRow, batch, isFirstBatch);
            batch = [];
            isFirstBatch = false;
          }

          // Progress logging (matching PHP)
          const logInterval = parseInt(process.env.PROGRESS_LOG_INTERVAL || 100000);
          if (rowCount % logInterval === 0) {
            const elapsedTime = (Date.now() - startTime) / 1000;
            const rowsPerSecond = rowCount / Math.max(1, elapsedTime);

            console.log('📝 CSV write progress', {
              rows_written: rowCount.toLocaleString(),
              rows_per_sec: rowsPerSecond.toFixed(2),
              elapsed_time_min: (elapsedTime / 60).toFixed(2),
              file_path: path.basename(currentFilePath),
              memory_usage_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
            });
          }
        }

        // Write remaining batch
        if (batch.length > 0) {
          writeCsvBatch(currentFilePath, headerRow, batch, isFirstBatch);
          if (isFirstBatch && !filePaths.includes(currentFilePath)) {
            filePaths.push(currentFilePath);
          }
        }

        // Create ZIP if multiple files (matching PHP)
        if (filePaths.length > 1) {
          const AdmZip = require('adm-zip');
          const zip = new AdmZip();

          for (const filePath of filePaths) {
            zip.addLocalFile(filePath);
          }

          const zipPath = output.path.replace('.csv', '.zip');
          zip.writeZip(zipPath);
          output.path = zipPath;

          console.log('📦 ZIP archive created', {
            zip_path: zipPath,
            file_count: filePaths.length,
          });
        }

        console.log('✅ CSV output written', {
          type: 'csv',
          target: output.path,
          rows: rowCount,
          duration_sec: ((Date.now() - startTime) / 1000).toFixed(2),
        });
      } else if (type === 'excel') {
        // Excel output using ExcelJS for proper .xlsx format
        const ExcelJS = require('exceljs');
        const dir = path.dirname(output.path);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        // Add headers
        worksheet.addRow(headers);

        let rowCount = 0;
        let batch = [];
        const batchSize = 10000;

        const { iter, isAsync } = getIterator();
        const iterate = isAsync ? (async function* () { for await (const r of iter) yield r; })() : (function* () { for (const r of iter) yield r; })();

        for await (const row of iterate) {
          const record = headers.map(h => row[h] || null);
          batch.push(record);
          rowCount++;

          if (batch.length >= batchSize) {
            worksheet.addRows(batch);
            batch = [];

            // Progress logging
            const logInterval = parseInt(process.env.PROGRESS_LOG_INTERVAL || 100000);
            if (rowCount % logInterval === 0) {
              const elapsedTime = (Date.now() - startTime) / 1000;
              console.log('📝 Excel write progress', {
                rows_written: rowCount.toLocaleString(),
                elapsed_time_min: (elapsedTime / 60).toFixed(2),
                memory_usage_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
              });
            }
          }
        }

        if (batch.length > 0) {
          worksheet.addRows(batch);
        }

        await workbook.xlsx.writeFile(output.path);

        console.log('✅ Excel output written', {
          type: 'excel',
          target: output.path,
          rows: rowCount,
          duration_sec: ((Date.now() - startTime) / 1000).toFixed(2),
        });
      } else if (type === 'db') {
        // DB output with upsert (matching PHP)
        if (!output.table) {
          throw new Error('Missing database table name');
        }

        const config = getConnectionConfig(output.database || 'moon');
        const client = new MongoClient(config.uri, config.options);
        await client.connect();
        const db = client.db(config.database);
        const collection = db.collection(output.table);

        let rowCount = 0;
        let batch = [];
        const batchSize = 10000;

        const { iter, isAsync } = getIterator();
        const iterate = isAsync ? (async function* () { for await (const r of iter) yield r; })() : (function* () { for (const r of iter) yield r; })();

        for await (const row of iterate) {
          const record = {};
          headers.forEach((header) => {
            record[header] = row[header] || null;
          });

          batch.push({
            updateOne: {
              filter: { id: record.id },
              update: { $set: record },
              upsert: true,
            },
          });

          rowCount++;

          if (batch.length >= batchSize) {
            await collection.bulkWrite(batch, { ordered: false });
            batch = [];

            // Progress logging
            const logInterval = parseInt(process.env.PROGRESS_LOG_INTERVAL || 100000);
            if (rowCount % logInterval === 0) {
              const elapsedTime = (Date.now() - startTime) / 1000;
              console.log('📝 DB write progress', {
                rows_written: rowCount.toLocaleString(),
                table: output.table,
                elapsed_time_min: (elapsedTime / 60).toFixed(2),
                memory_usage_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
              });
            }
          }
        }

        if (batch.length > 0) {
          await collection.bulkWrite(batch, { ordered: false });
        }

        await client.close();

        console.log('✅ DB output written', {
          type: 'db',
          target: output.table,
          rows: rowCount,
          duration_sec: ((Date.now() - startTime) / 1000).toFixed(2),
        });
      } else {
        throw new Error(`Unsupported output type: ${type}`);
      }
    } catch (error) {
      console.error('❌ Output write failed', {
        type: type,
        error: error.message,
      });
      throw new Error(`Failed to write output (${type}): ${error.message}`);
    }
  }

  /**
   * Check if string is valid UTF-8 (matching PHP)
   * @param {string} str - String to check
   * @returns {boolean} True if valid UTF-8
   */
  static isValidUtf8(str) {
    try {
      return Buffer.from(str, 'utf8').toString('utf8') === str;
    } catch (e) {
      return false;
    }
  }

  /**
   * Update process logs in moon.process_logs
   * @param {Object} data - Process log data
   */
  static async updateLogs(data) {
    try {
      if (!data.process_id) {
        throw new Error('Process ID cannot be null or empty');
      }

      const moonConfig = getConnectionConfig('moon');
      const client = new MongoClient(moonConfig.uri, moonConfig.options);
      await client.connect();
      const db = client.db(moonConfig.database);

      const inputLocation =
        data.input.type === 'db'
          ? `${data.input.database || 'moon'}.${data.input.table}`
          : data.input.path || null;

      const outputLocation =
        data.output.type === 'db'
          ? `${data.output.database || 'moon'}.${data.output.table}`
          : data.output.path || null;

      const traceDetails = (data.trace_details || []).map((trace) => {
        const { rows, ...rest } = trace;
        return rest;
      });

      const logData = {
        process_id: data.process_id,
        process_name: data.process_name || 'Unknown',
        process_mode: data.process_mode || 'workflow',
        mode: data.mode || 'unknown',
        status: data.status || 'pending',
        input_location: inputLocation,
        output_location: outputLocation,
        total: data.total || 0,
        processed: data.processed || 0,
        rejected: data.rejected || 0,
        skipped: data.skipped || 0,
        trace_details: traceDetails.length > 0 ? JSON.stringify(traceDetails) : null,
        created_by: data.created_by || 'System',
        created_at: data.created_at || new Date(),
        updated_at: new Date(),
      };

      await db.collection('process_logs').updateOne(
        { process_id: data.process_id },
        { $set: logData },
        { upsert: true }
      );

      await client.close();
    } catch (error) {
      console.error('ProcessFlowHelper.updateLogs error:', error);
      throw error;
    }
  }

  /**
   * Fetch process logs from moon.process_logs
   * @param {string|null} processId - Optional process ID to filter
   * @returns {Promise<Array>} Array of process log records
   */
  static async fetchLogs(processId = null) {
    try {
      const moonConfig = getConnectionConfig('moon');
      const client = new MongoClient(moonConfig.uri, moonConfig.options);
      await client.connect();
      const db = client.db(moonConfig.database);

      const query = { deleted_at: null };
      if (processId) {
        query.process_id = processId;
      }

      const records = await db.collection('process_logs').find(query).sort({ created_at: -1 }).toArray();

      const toPublicUrl = (filePath) => {
        if (!filePath) return null;
        if (/^https?:\/\//i.test(filePath)) return filePath;
        const normalizedPath = filePath.replace(/\\/g, '/');
        const publicBase = path.join(process.cwd(), 'public').replace(/\\/g, '/');
        
        // Extract the relative path (relative to public/) for the download API
        let relativePath = null;
        
        // If path starts with public base, extract relative path
        if (normalizedPath.startsWith(publicBase)) {
          relativePath = normalizedPath.substring(publicBase.length).replace(/^\//, '');
        }
        // If path contains 'public/', extract relative path
        else if (normalizedPath.includes('/public/')) {
          const publicIndex = normalizedPath.indexOf('/public/');
          relativePath = normalizedPath.substring(publicIndex + '/public/'.length);
        }
        // If path already looks like a web path (starts with /uploads or /exports)
        else if (normalizedPath.startsWith('/uploads/') || normalizedPath.startsWith('/exports/')) {
          relativePath = normalizedPath.replace(/^\//, '');
        }
        // Check for bare uploads/ or exports/ paths
        else if (normalizedPath.startsWith('uploads/') || normalizedPath.startsWith('exports/')) {
          relativePath = normalizedPath;
        }
        
        // If we found a relative path under uploads/ or exports/, use the download API
        // This ensures files work in both dev mode AND production mode (PM2/next start)
        if (relativePath && (relativePath.startsWith('uploads/') || relativePath.startsWith('exports/'))) {
          return `/api/download-file?path=${encodeURIComponent(relativePath)}`;
        }
        
        // Default: return as-is (might be a database reference like "moon.table_name")
        return filePath;
      };

      const mappedRecords = records.map((record) => {
        const traceDetails = record.trace_details ? JSON.parse(record.trace_details) : null;
        return {
          ...record,
          trace_details: traceDetails,
          input_url: toPublicUrl(record.input_location),
          output_url: toPublicUrl(record.output_location),
        };
      });

      await client.close();
      return mappedRecords;
    } catch (error) {
      console.error('ProcessFlowHelper.fetchLogs error:', error);
      throw error;
    }
  }

  /**
   * Add trace entry for workflow processing
   * @param {string} workflowName - Workflow name
   * @param {string} status - Status (completed, failed, skipped)
   * @param {Object} metrics - Metrics object
   * @param {string} details - Details message
   * @returns {Object} Trace entry
   */
  static addTraceEntry(workflowName, status, metrics, details) {
    return {
      workflow: workflowName,
      status: status,
      metrics: metrics,
      details: details,
    };
  }

  /**
   * Normalize columns/rows
   * @param {Array} rows - Array of row objects
   * @param {Object} metrics - Metrics object to update
   * @returns {Array} Normalized rows
   */
  static normalizeCols(rows, metrics = {}) {
    const normalized = [];
    let idCounter = 1;
    const usedIds = {};

    rows.forEach((row) => {
      const status = (row.status || 'pending').toLowerCase().trim();
      const reason = row.reason || '';

      if (!row.hasOwnProperty('status')) {
        row.status = 'pending';
      }

      if (!row.hasOwnProperty('reason')) {
        row.reason = '';
      }

      // Assign unique ID
      if (!row.id || usedIds[row.id]) {
        while (usedIds[idCounter]) {
          idCounter++;
        }
        row.id = idCounter;
        idCounter++;
      }
      usedIds[row.id] = true;

      if (['rejected', 'skipped'].includes(status)) {
        metrics.skipped = (metrics.skipped || 0) + 1;
      } else if (!['pending', 'processed', 'completed'].includes(status)) {
        row.status = 'pending';
        row.reason = 'Invalid status reset to pending';
        metrics.skipped = (metrics.skipped || 0) + 1;
      } else {
        metrics.total = (metrics.total || 0) + 1;
      }

      normalized.push(row);
    });

    return normalized;
  }
}

module.exports = ProcessFlowHelper;

