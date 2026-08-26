#!/usr/bin/env node

/**
 * Process Flow Worker
 * Processes master flow and workflow jobs
 * Equivalent to bv/app/Jobs/ProcessFlowJob.php
 */

require('dotenv').config();
const Queue = require('bull');
const { MongoClient } = require('mongodb');

// Dynamic import for ES6 database config (same pattern as ProcessFlowHelper.js)
let getConnectionConfig;
try {
  const dbModule = require('./src/config/database.js');
  getConnectionConfig = dbModule.getConnectionConfig || dbModule.default?.getConnectionConfig;
} catch (e) {
  // Fallback for direct execution
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

console.log('🚀 Starting Process Flow Worker...');

// Create queue for process flows
const processFlowQueue = new Queue('process_flows', {
  redis: { host: 'localhost', port: 6379 }
});

console.log('📊 Process Flow Queue Dashboard: http://localhost:3000/admin/queues');
console.log('⏹️  Press Ctrl+C to stop');

/**
 * Update progress in MongoDB process_logs collection
 * This enables the frontend to poll for real-time progress
 */
async function updateProgress(processId, progressData) {
  let client;
  try {
    const moonConfig = getConnectionConfig('moon');
    client = new MongoClient(moonConfig.uri, moonConfig.options);
    await client.connect();
    const db = client.db(moonConfig.database);

    await db.collection('process_logs').updateOne(
      { process_id: processId },
      {
        $set: {
          ...progressData,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );
  } catch (err) {
    console.error(`⚠️ Progress update failed (non-fatal): ${err.message}`);
  } finally {
    if (client) await client.close();
  }
}

// Set up processor
console.log('🔧 Setting up process flow job processor...');

processFlowQueue.process('process-flow', 1, async (job) => {
  console.log(`\n🎯 ========== PROCESSING FLOW JOB ${job.id} ==========`);
  const processId = job.data.meta?.process_id || job.data.metadata?.process_id || 'N/A';
  const processName = job.data.meta?.process_name || job.data.metadata?.process_name || 'N/A';
  console.log(`📋 Process ID: ${processId}`);
  console.log(`📝 Process Name: ${processName}`);
  
  try {
    await job.progress(0);
    
    // Initialize progress in MongoDB
    await updateProgress(processId, {
      process_name: processName,
      status: 'processing',
      percentage: 0,
      current_workflow: '',
      workflow_index: 0,
      workflow_total: 0,
      started_at: new Date()
    });
    
    const ProcessFlowHelper = require('./src/application/Services/ProcessFlowHelper.js');
    const flowData = job.data;
    const processMode = flowData.process_mode || 'flow'; // 'flow' = master flow, 'workflow' = single workflow
    
    console.log(`🔀 Processing mode: ${processMode}`);
    
    // Get workflow names from flow data
    const workflowMap = flowData.meta?.workflow_map || flowData.metadata?.workflow_map || {};
    const workflowNames = Array.isArray(workflowMap)
      ? workflowMap.map(w => w.workflow_name)
      : Object.values(workflowMap).map(w => w.workflow_name || w);
    
    if (workflowNames.length === 0) {
      throw new Error('No workflows found in flow data');
    }
    
    const totalWorkflows = workflowNames.length;
    
    // Update progress with workflow count
    await updateProgress(processId, {
      workflow_total: totalWorkflows,
      process_mode: processMode
    });
    
    // Get flow definitions
    const flowDefinitions = await ProcessFlowHelper.getFlowsData(workflowNames);
    
    // Build flows map (method names)
    const flows = {};
    workflowNames.forEach((name) => {
      const flow = flowDefinitions[name];
      if (flow) {
        const identifier = flow.identifier || name.replace(/\s+/g, '_').toLowerCase();
        const methodName = identifier
          .replace(/[^a-z0-9_]/g, '')
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('') + 'Method';
        flows[name] = methodName;
      }
    });
    
    let result;
    
    if (processMode === 'workflow') {
      // Single workflow mode - use WorkFlowService
      console.log(`📦 Using WorkFlowService for single workflow processing`);
      const WorkFlowService = require('./src/application/Services/WorkFlowService.js').default;
      const service = new WorkFlowService();
      
      // For workflow mode, only process the first workflow
      const firstWorkflowName = workflowNames[0];
      const singleFlow = { [firstWorkflowName]: flows[firstWorkflowName] };
      
      // Update progress: starting the workflow
      const pct = 10;
      await updateProgress(processId, {
        percentage: pct,
        current_workflow: firstWorkflowName,
        workflow_index: 1,
        workflow_total: 1
      });
      await job.progress(pct);
      
      result = await service.processFlow(singleFlow, flowData);
    } else {
      // Master flow mode - use MasterFlowService
      console.log(`📦 Using MasterFlowService for master flow processing`);
      const MasterFlowService = require('./src/application/Services/MasterFlowService.js').default;
      const service = new MasterFlowService();
      
      // Update progress before starting
      for (let i = 0; i < totalWorkflows; i++) {
        const pct = Math.round(((i) / totalWorkflows) * 90) + 5; // 5-95% range
        await updateProgress(processId, {
          percentage: pct,
          current_workflow: workflowNames[i],
          workflow_index: i + 1,
          workflow_total: totalWorkflows
        });
        await job.progress(pct);
        console.log(`📊 Progress: ${pct}% — Starting workflow ${i + 1}/${totalWorkflows}: ${workflowNames[i]}`);
      }
      
      result = await service.processFlow(flows, flowData);
    }
    
    // Mark as completed
    await updateProgress(processId, {
      status: 'completed',
      percentage: 100,
      current_workflow: '',
      completed_at: new Date()
    });
    await job.progress(100);
    
    console.log(`✅ Process ${processMode} completed: ${processId}`);
    return result;
    
  } catch (error) {
    console.error(`❌ Process flow failed:`, error);
    
    // Mark as failed in progress
    await updateProgress(processId, {
      status: 'failed',
      error_message: error.message,
      failed_at: new Date()
    });
    
    throw error;
  }
});

// Event handlers
processFlowQueue.on('completed', (job, result) => {
  console.log(`🎉 Flow Job ${job.id} completed:`, {
    process_id: job.data.meta?.process_id,
    status: result.status
  });
});

processFlowQueue.on('failed', (job, error) => {
  console.error(`💥 Flow Job ${job.id} failed:`, {
    process_id: job.data.meta?.process_id,
    error: error.message
  });
});

processFlowQueue.on('active', (job) => {
  console.log(`🔄 Flow Job ${job.id} started processing`);
});

console.log('✅ Process flow job processor set up successfully');
console.log('🔄 Waiting for jobs...');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down process flow worker...');
  await processFlowQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down process flow worker...');
  await processFlowQueue.close();
  process.exit(0);
});

