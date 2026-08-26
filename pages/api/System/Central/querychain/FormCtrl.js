/**
 * FormCtrl - Laravel FormCtrl.php equivalent
 * Handles master flow form submissions with file uploads
 */

import SkeletonService from '../../../../../src/services/SkeletonService';
import ProcessFlowHelper from '../../../../../src/application/Services/ProcessFlowHelper.js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../../../src/config/database.js';
import Queue from 'bull';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Generate unique process ID
 */
function generateProcessId() {
  const prefix = 'PROC';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
}

/**
 * Normalize string for comparison
 */
function normalize(str) {
  return str ? str.replace(/[^a-z0-9]/g, '').toLowerCase() : '';
}

/**
 * Main API handler function
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      title: 'Method Not Allowed',
      message: 'Only POST requests are allowed.',
    });
  }

  try {
    console.log('🎯 FormCtrl::handler() called');

    // Use temp directory for formidable uploads (will move to final location)
    const tempUploadDir = path.join(process.cwd(), 'temp', 'form-uploads');
    if (!fs.existsSync(tempUploadDir)) {
      fs.mkdirSync(tempUploadDir, { recursive: true });
    }

    // Parse multipart form data
    const form = formidable({
      uploadDir: tempUploadDir,
      keepExtensions: true,
      maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB (increased from 500MB for large CSV support)
      multiples: true, // Allow multiple fields with the same name (for arrays)
    });

    const [fields, files] = await form.parse(req);

    // Extract token
    const token = Array.isArray(fields.save_token) ? fields.save_token[0] : fields.save_token;
      
      if (!token) {
        return res.status(400).json({
      status: false,
          title: 'Token Missing',
        message: 'No token was provided.',
        });
      }

      // Resolve token
      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.status || !reqSet.key) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
        message: 'The provided token is invalid.',
    });
  }

    let reloadTable = false;
      let title = 'Success';
      let message = 'Data saved successfully.';

      // Handle different configuration keys
      switch (reqSet.key) {
      case 'central_unique_workflows': {
        try {
          console.log('📥 Master Flow Validation Started');
          console.log('📋 Received fields keys:', Object.keys(fields || {}));
          console.log('📋 Received fields:', JSON.stringify(fields, null, 2));
          console.log('📁 Received files:', Object.keys(files || {}));

          // Extract form fields
          // Handle workflows array field - formidable v3 creates array when multiple values with same name
          let workflowsArray = [];
          
          // Check all possible keys for workflows (prioritize 'workflows' without brackets)
          const workflowKeys = ['workflows', 'workflows[]', 'workflow', 'workflow[]'];
          for (const key of workflowKeys) {
            if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') {
              if (Array.isArray(fields[key])) {
                workflowsArray = fields[key].filter(w => w && w.trim()); // Filter out empty values
              } else if (typeof fields[key] === 'string' && fields[key].trim()) {
                workflowsArray = [fields[key].trim()];
              }
              if (workflowsArray.length > 0) {
                console.log(`✅ Found workflows in key '${key}':`, workflowsArray);
          break;
              }
            }
          }
          
          // If still empty, check all fields for array-like patterns
          if (workflowsArray.length === 0) {
            for (const [key, value] of Object.entries(fields)) {
              if (key.toLowerCase().includes('workflow') && value) {
                if (Array.isArray(value)) {
                  workflowsArray = value.filter(w => w && w.trim());
                } else if (typeof value === 'string' && value.trim()) {
                  workflowsArray = [value.trim()];
                }
                if (workflowsArray.length > 0) {
                  console.log(`✅ Found workflows in key '${key}':`, workflowsArray);
                  break;
                }
              }
            }
          }

          const processName = Array.isArray(fields.process_name) ? fields.process_name[0] : fields.process_name;
          const preprocessId = Array.isArray(fields.preprocess_id) ? fields.preprocess_id[0] : fields.preprocess_id;
          const mode = Array.isArray(fields.mode) ? fields.mode[0] : fields.mode;
          const workflows = workflowsArray;
          const inputSource = Array.isArray(fields.input_source) ? fields.input_source[0] : fields.input_source;
          const outputTarget = Array.isArray(fields.output_target) ? fields.output_target[0] : fields.output_target;
          const inputDb = Array.isArray(fields.input_db) ? fields.input_db[0] : fields.input_db;
          const inputTable = Array.isArray(fields.input_table) ? fields.input_table[0] : fields.input_table;
          const outputDb = Array.isArray(fields.output_db) ? fields.output_db[0] : fields.output_db;
          const outputTable = Array.isArray(fields.output_table) ? fields.output_table[0] : fields.output_table;
          const baseInputDb = Array.isArray(fields.base_input_db) ? fields.base_input_db[0] : fields.base_input_db;
          const baseInputTable = Array.isArray(fields.base_input_table) ? fields.base_input_table[0] : fields.base_input_table;
          const addToProcess = Array.isArray(fields.add_to_process) ? fields.add_to_process[0] : fields.add_to_process;

          console.log('🔍 Extracted values:', {
            processName,
            mode,
            workflows,
            inputSource,
            outputTarget,
            inputDb,
            inputTable,
            outputDb,
            outputTable,
            baseInputDb,
            baseInputTable,
          });

          // Validation
          if (!processName || !processName.trim()) {
            console.error('❌ Validation failed: Process name is missing or empty');
            return res.status(422).json({
              status: false,
              title: 'Validation Error',
              message: 'Process name is required.',
            });
          }

          if (!mode || !['flow', 'workflow'].includes(mode)) {
            console.error('❌ Validation failed: Invalid mode:', mode);
            return res.status(422).json({
              status: false,
              title: 'Validation Error',
              message: 'Mode must be either "flow" or "workflow".',
            });
          }

          if (!workflows || workflows.length === 0) {
            console.error('❌ Validation failed: No workflows selected.');
            console.error('📋 All received fields:', Object.keys(fields));
            console.error('📋 Fields with "workflow" in name:', Object.keys(fields).filter(k => k.toLowerCase().includes('workflow')));
            return res.status(422).json({
              status: false,
              title: 'Validation Error',
              message: 'At least one workflow must be selected. Please check that workflows are being sent correctly.',
            });
          }

          if (!inputSource || !['csv', 'db'].includes(inputSource)) {
            console.error('❌ Validation failed: Invalid input source:', inputSource);
            return res.status(422).json({
              status: false,
              title: 'Validation Error',
              message: 'Input source must be either "csv" or "db".',
            });
          }

          if (!outputTarget || !['csv', 'excel', 'db'].includes(outputTarget)) {
            console.error('❌ Validation failed: Invalid output target:', outputTarget);
            return res.status(422).json({
              status: false,
              title: 'Validation Error',
              message: 'Output target must be "csv", "excel", or "db".',
            });
          }

          // Check for Autoflows workflow
          const isAutoflowsSelected = workflows.some(
            (name) =>
              name.toLowerCase() === 'autoflows' ||
              name.toLowerCase() === 'auto flows' ||
              name.toLowerCase() === 'autoflow'
          );

          if (isAutoflowsSelected) {
            if (!baseInputDb || !baseInputTable) {
              return res.status(422).json({
            status: false,
                title: 'Autoflows Configuration Required',
                message: 'Base database and table are required for Autoflows workflow.',
              });
            }
          }

          // Get workflows data
          const workflowResponse = await ProcessFlowHelper.getFlowsData();
          // Convert to array format with name property
          const workflowList = Object.keys(workflowResponse).map((name) => ({
            name: name,
            id: workflowResponse[name].flow_id || name,
            ...workflowResponse[name],
          }));

          // Validate workflow types
          const validTypes = mode === 'flow' ? ['mf', 'wmf'] : ['wf', 'wmf'];
          const invalidWorkflows = workflows.filter((name) => {
            const wf = workflowList.find((w) => w.name === name);
            return !wf || !validTypes.includes(wf.type);
          });

          if (invalidWorkflows.length > 0) {
            return res.status(422).json({
              status: false,
              title: 'Invalid Workflows',
              message: `The following workflows are invalid for ${mode} mode: ${invalidWorkflows.join(', ')}`,
            });
          }

          let csvFileName = null;
          let csvHeaders = [];

          // Handle CSV Input
          if (inputSource === 'csv') {
            // Check if file was pre-uploaded via chunks (transfer_id present)
            const preUploadedTransferId = Array.isArray(fields.transfer_id) ? fields.transfer_id[0] : fields.transfer_id;
            const preUploadedFileName = Array.isArray(fields.csv_file_name) ? fields.csv_file_name[0] : fields.csv_file_name;
            const csvFile = Array.isArray(files.csv_file) ? files.csv_file[0] : files.csv_file;

            let finalPath;

            if (preUploadedTransferId) {
              // Large file was pre-uploaded via chunks - use from temp/imports
              console.log(`📤 Using pre-uploaded file: ${preUploadedTransferId}`);
              const preUploadedPath = path.join(process.cwd(), 'temp', 'imports', `${preUploadedTransferId}.csv`);
              
              if (!fs.existsSync(preUploadedPath)) {
                return res.status(422).json({
                  status: false,
                  title: 'File Not Found',
                  message: 'Pre-uploaded file not found. Please try uploading again.',
                });
              }

              // Move to final location (public/uploads)
              const originalName = preUploadedFileName || 'upload.csv';
              const sanitizedName = originalName.replace(/\s+/g, '_');
              csvFileName = `${Date.now()}_${sanitizedName}`;
              
              const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
              }
              
              finalPath = path.join(uploadsDir, csvFileName);
              
              // Use streaming copy for large files (non-blocking)
              await new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(preUploadedPath);
                const writeStream = fs.createWriteStream(finalPath);
                readStream.on('error', reject);
                writeStream.on('error', reject);
                writeStream.on('finish', resolve);
                readStream.pipe(writeStream);
              });
              
              // Clean up temp file
              fs.unlinkSync(preUploadedPath);
              console.log(`✅ Pre-uploaded file moved to: ${finalPath}`);

            } else if (csvFile) {
              // Small file uploaded with form
              if (!csvFile.filepath || !fs.existsSync(csvFile.filepath)) {
                return res.status(422).json({
                  status: false,
                  title: 'File Upload Error',
                  message: 'Uploaded file could not be found. Please try uploading again.',
                });
              }

              // Generate unique filename
              const originalName = csvFile.originalFilename || csvFile.name || 'upload.csv';
              const sanitizedName = originalName.replace(/\s+/g, '_');
              csvFileName = `${Date.now()}_${sanitizedName}`;
              
              const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
              }
              
              finalPath = path.join(uploadsDir, csvFileName);

              // Move file from temp to final location
              try {
                fs.copyFileSync(csvFile.filepath, finalPath);
                if (fs.existsSync(csvFile.filepath)) {
                  fs.unlinkSync(csvFile.filepath);
                }
              } catch (error) {
                console.error('File move error:', error);
                return res.status(500).json({
                  status: false,
                  title: 'File Upload Error',
                  message: `Failed to save uploaded file: ${error.message}`,
                });
              }
            } else {
              return res.status(422).json({
                status: false,
                title: 'Validation Error',
                message: 'CSV file is required when input source is CSV.',
              });
            }

            // Verify file exists at final location
            if (!fs.existsSync(finalPath)) {
              return res.status(500).json({
                status: false,
                title: 'File Upload Error',
                message: 'File was not saved correctly. Please try again.',
              });
            }

            // Read CSV headers (matching BV project approach)
            const readline = require('readline');
            const fileStream = fs.createReadStream(finalPath);
            const rl = readline.createInterface({
              input: fileStream,
              crlfDelay: Infinity,
            });

            const firstLine = await new Promise((resolve, reject) => {
              rl.once('line', (line) => {
                rl.close();
                resolve(line);
              });
              rl.once('error', reject);
            });

            csvHeaders = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
            
            // Validate headers are not empty
            if (!csvHeaders || csvHeaders.length === 0 || csvHeaders.every(h => !h)) {
              return res.status(422).json({
                status: false,
                title: 'Invalid CSV File',
                message: 'CSV file appears to be empty or has no valid headers.',
              });
            }

            // Validate required headers
            const allRequiredHeaders = [];
            workflows.forEach((workflowName) => {
              const wf = workflowList.find((w) => w.name === workflowName);
              if (wf && wf.required_headers) {
                allRequiredHeaders.push(...wf.required_headers);
              }
            });

            const normalizedHeaders = csvHeaders.map(normalize);
            const missing = allRequiredHeaders.filter(
              (header) => !normalizedHeaders.includes(normalize(header))
            );

            if (missing.length > 0) {
              return res.status(422).json({
                status: false,
                title: 'Missing CSV Headers',
                message: `The CSV file is missing required columns: ${missing.join(', ')}`,
              });
            }
          }

          // Handle DB Input validation
          if (inputSource === 'db') {
            if (!inputTable || !inputTable.includes('.')) {
              return res.status(422).json({
                status: false,
                title: 'Invalid Input Table',
                message: 'Input table must be in "db.table" format.',
              });
            }

            // Validate table exists and has required columns
            // This would require MongoDB connection - simplified for now
          }

          // Handle DB Output validation
          if (outputTarget === 'db') {
            if (!outputTable || !outputTable.includes('.')) {
              return res.status(422).json({
                status: false,
                title: 'Invalid Output Table',
                message: 'Output table must be in "db.table" format.',
              });
            }
          }

          // Determine process ID
          let processId = null;
          let creatingNew = true;

          if (preprocessId && preprocessId !== 'custom') {
            // Check if process exists
            const moonConfig = getConnectionConfig('moon');
            const client = new MongoClient(moonConfig.uri, moonConfig.options);
            await client.connect();
            const db = client.db(moonConfig.database);

            const existingProcess = await db
              .collection('processes')
              .findOne({ process_id: preprocessId });

            if (existingProcess) {
              processId = preprocessId;
              creatingNew = false;
            } else {
              processId = generateProcessId();
            }

            await client.close();
          } else {
            processId = generateProcessId();
          }

          // Build validated object
          const validated = {
            process_name: processName,
            preprocess_id: preprocessId,
            mode: mode,
            workflows: workflows,
            input_source: inputSource,
            output_target: outputTarget,
            input_db: inputDb,
            input_table: inputTable,
            output_db: outputDb,
            output_table: outputTable,
            base_input_db: baseInputDb,
            base_input_table: baseInputTable,
            csv_file_name: csvFileName,
            csv_headers: csvHeaders,
          };

          // Build flow data (async)
          const flowData = await ProcessFlowHelper.buildFlowData(validated, workflowList, processId);
          flowData.process_mode = mode; // Set process mode for worker routing

          // Log flow data for debugging (without sensitive data)
          console.log('📦 Flow Data Created', {
            process_id: processId,
            process_mode: mode,
            input_type: flowData.input?.type,
            input_path: flowData.input?.path || flowData.input?.table,
            output_type: flowData.output?.type,
            workflow_count: Object.keys(flowData.meta?.workflow_map || {}).length,
          });

          // Verify CSV file exists if input is CSV
          if (inputSource === 'csv' && flowData.input?.path) {
            if (!fs.existsSync(flowData.input.path)) {
              return res.status(500).json({
                status: false,
                title: 'File Not Found',
                message: `CSV file not found at expected path. Please try uploading again.`,
              });
            }
            console.log('✅ CSV file verified at:', flowData.input.path);
          }

          // Save/Update Process if checkbox checked
          if (mode === 'flow' && addToProcess === 'true') {
            const moonConfig = getConnectionConfig('moon');
            const client = new MongoClient(moonConfig.uri, moonConfig.options);
            await client.connect();
            const db = client.db(moonConfig.database);

            const processData = {
              name: processName,
              flows: JSON.stringify(Object.values(flowData.meta.workflow_map)),
              mode: mode,
              input_source: inputSource,
              output_target: outputTarget,
              input_db: inputDb || null,
              input_table: inputTable || null,
              output_db: outputDb || null,
              output_table: outputTable || null,
              updated_at: new Date(),
            };

            if (creatingNew) {
              processData.process_id = processId;
              processData.created_at = new Date();
              await db.collection('processes').insertOne(processData);
            } else {
              await db.collection('processes').updateOne(
                { process_id: processId },
                { $set: processData }
              );
            }

            await client.close();
          }

          // Dispatch job to queue
          const processFlowQueue = new Queue('process_flows', {
            redis: { host: 'localhost', port: 6379 },
          });

          await processFlowQueue.add('process-flow', flowData, {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          });

          await processFlowQueue.close();

    return res.status(200).json({
      status: true,
            reload_table: false,
        token: reqSet.key,
            affected: processId,
            title: 'Master Flow Started',
            message:
              'Flow process has been queued successfully and is now processing in the background. Check "Previous Results" to monitor progress.',
          });
        } catch (error) {
          console.error('Master Flow Validation Failed:', error);
          return res.status(500).json({
            status: false,
            reload_table: false,
            token: reqSet.key || '',
        affected: '-',
            title: 'Master Flow Failed',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong. Please try again later.',
          });
        }
      }

      default:
        return res.status(400).json({
          status: false,
          title: 'Invalid Configuration',
          message: 'The configuration key is not supported.',
        });
    }
  } catch (error) {
      console.error('❌ FormCtrl error:', error);
    return res.status(500).json({
      status: false,
        title: 'Error',
      message: error.message || 'An error occurred while saving the data.',
    });
  }
}
