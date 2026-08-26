# Queue Orchestration Architecture - Production-Ready Design

## Executive Summary

This document outlines a production-ready architecture for centralized queue management, enabling full UI-based control of all background job queues without requiring terminal commands. The system is designed following enterprise-grade patterns used by companies like Laravel Horizon, AWS SQS Console, and Google Cloud Tasks.

---

## 1. Current State Analysis

### 1.1 Identified Queues (15 Total)

| Queue Name | Worker File | Priority | Concurrency | Purpose |
|------------|------------|----------|-------------|---------|
| CSV Import Processing | `queue-worker.js` | 5 (Highest) | 3 | CSV imports, DB transfers |
| Bulk Audience Assignment | `audience-queue-worker.js` | 3 (Medium) | 1 | Bulk audience operations |
| Maintenance Operations | `maintenance-queue-worker.js` | 1 (Lowest) | 1 | Duplicate removal, cleanup |
| Global Email Sync | `email-sync-worker.js` | 4 | 5 | System-wide email sync |
| Email Delivery | `email-delivery-worker.js` | 4 | Variable | Email sending |
| Process Flow | `process-flow-worker.js` | 3 | Variable | Workflow automation |
| Domain Enrichment | `domain-enrichment-worker.js` | 2 | Variable | Data enrichment |
| Drift | `drift-worker.js` | 2 | Variable | Data drift detection |
| Mapping | `mapping-worker.js` | 3 | Variable | Data mapping |
| Cleanup | `cleanup-worker.js` | 1 | 1 | Field cleanup |
| Deduplicate | `deduplicate-worker.js` | 1 | 1 | Deduplication |
| Open Status Sync | `open-status-sync-worker.js` | 3 | Variable | Email open tracking |
| Email Sent Status | `email-sent-status-worker.js` | 3 | Variable | Sent status updates |
| Bounce Status | `bounce-status-worker.js` | 3 | Variable | Bounce tracking |
| User Email Sync | `user-email-sync-worker.js` | 4 | Variable | Per-user email sync |

### 1.2 Current Pain Points

1. **Manual Process Management**: Each worker requires separate terminal window
2. **No Visibility**: Cannot see queue status without checking Redis/Bull Board
3. **No Control**: Cannot start/stop/pause queues from UI
4. **No Persistence**: Worker state lost on server restart
5. **No Monitoring**: No real-time metrics or alerts
6. **No Recovery**: Failed workers don't auto-restart

---

## 2. Architecture Overview

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Queue Control Center UI                   │
│  (React Component - Real-time Dashboard & Controls)         │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/WebSocket
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Queue Management API Layer                      │
│  - /api/queues/status      (GET)                            │
│  - /api/queues/start       (POST)                           │
│  - /api/queues/stop        (POST)                           │
│  - /api/queues/pause       (POST)                           │
│  - /api/queues/resume      (POST)                           │
│  - /api/queues/clear       (POST)                           │
│  - /api/queues/retry       (POST)                           │
│  - /api/queues/metrics     (GET)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Queue Manager │ │ Process       │ │ State         │
│ Service       │ │ Controller    │ │ Persistence   │
│               │ │               │ │               │
│ - Lifecycle   │ │ - PM2/        │ │ - MongoDB     │
│ - Health      │ │   Child       │ │ - Redis       │
│ - Monitoring  │ │   Process     │ │               │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        └─────────┬───────┴─────────────────┘
                  │
        ┌─────────▼─────────┐
        │   Worker Processes │
        │  (15 Queue Workers)│
        └────────────────────┘
```

### 2.2 Technology Stack

- **Process Management**: PM2 (Production Process Manager)
- **Queue Backend**: Bull (Redis-based)
- **State Storage**: MongoDB (`queue_workers` collection)
- **Real-time Updates**: WebSocket (Socket.io) or Server-Sent Events
- **Monitoring**: Custom metrics + Bull Queue stats
- **API**: Next.js API Routes

---

## 3. Detailed Component Design

### 3.1 Queue Manager Service (`services/QueueManagerService.js`)

**Purpose**: Central service for managing all queue worker lifecycles.

**Responsibilities**:
- Start/stop/pause/resume workers
- Monitor worker health
- Track worker state
- Handle graceful shutdowns
- Auto-recovery on failures

**Key Methods**:
```javascript
class QueueManagerService {
  async startWorker(queueName, options)
  async stopWorker(queueName, graceful = true)
  async pauseWorker(queueName)
  async resumeWorker(queueName)
  async restartWorker(queueName)
  async getWorkerStatus(queueName)
  async getAllWorkersStatus()
  async clearQueue(queueName, jobType = 'all')
  async retryFailedJob(queueName, jobId)
  async getQueueMetrics(queueName)
  async updateWorkerConfig(queueName, config)
}
```

### 3.2 Process Controller (`services/ProcessController.js`)

**Purpose**: Manages actual Node.js process execution using PM2.

**Why PM2?**
- Production-grade process management
- Auto-restart on crashes
- Log management
- Resource monitoring
- Cluster mode support
- Zero-downtime restarts

**Key Methods**:
```javascript
class ProcessController {
  async spawnWorker(queueName, workerFile, options)
  async killWorker(queueName, signal = 'SIGTERM')
  async getProcessInfo(queueName)
  async getAllProcesses()
  async setAutoRestart(queueName, enabled)
}
```

### 3.3 Queue State Persistence (`services/QueueStateService.js`)

**Purpose**: Persist worker state to MongoDB for recovery.

**Schema** (`queue_workers` collection):
```javascript
{
  queue_name: String,           // e.g., "CSV Import Processing"
  worker_file: String,          // e.g., "queue-worker.js"
  status: String,              // 'running', 'stopped', 'paused', 'error'
  enabled: Boolean,            // Manual ON/OFF toggle
  auto_restart: Boolean,       // Auto-restart on crash
  concurrency: Number,         // Worker concurrency
  priority: Number,            // Queue priority
  last_started: Date,
  last_stopped: Date,
  pid: Number,                 // Process ID
  memory_usage: Number,        // MB
  cpu_usage: Number,           // %
  uptime: Number,              // seconds
  restart_count: Number,
  error_count: Number,
  config: Object,              // Worker-specific config
  created_at: Date,
  updated_at: Date
}
```

### 3.4 Queue Metrics Service (`services/QueueMetricsService.js`)

**Purpose**: Collect and aggregate real-time queue metrics.

**Metrics Collected**:
- Jobs waiting/active/completed/failed
- Processing rate (jobs/sec)
- Average job duration
- Error rate
- Worker CPU/memory usage
- Queue depth
- Throughput

---

## 4. API Endpoints Design

### 4.1 Queue Status & Control

```javascript
// GET /api/queues/status
// Returns: All queues with current status
{
  queues: [
    {
      name: "CSV Import Processing",
      status: "running",
      enabled: true,
      jobs: {
        waiting: 5,
        active: 2,
        completed: 1000,
        failed: 3
      },
      worker: {
        pid: 12345,
        memory: 512,
        cpu: 15.5,
        uptime: 3600
      }
    }
  ]
}

// POST /api/queues/:queueName/start
// Body: { concurrency?, priority?, auto_restart? }
// Starts worker process

// POST /api/queues/:queueName/stop
// Body: { graceful: true }
// Stops worker process

// POST /api/queues/:queueName/pause
// Pauses job processing (keeps worker alive)

// POST /api/queues/:queueName/resume
// Resumes job processing

// POST /api/queues/:queueName/toggle
// Toggles enabled state (ON/OFF)

// POST /api/queues/:queueName/clear
// Body: { type: 'waiting' | 'completed' | 'failed' | 'all' }
// Clears jobs from queue

// POST /api/queues/:queueName/jobs/:jobId/retry
// Retries a failed job

// GET /api/queues/:queueName/metrics
// Returns: Detailed metrics for queue
```

### 4.2 Real-time Updates

```javascript
// WebSocket: /api/queues/stream
// Streams real-time queue status updates
{
  type: 'status_update',
  queue: 'CSV Import Processing',
  data: { ... }
}
```

---

## 5. UI Component Design

### 5.1 Queue Control Center Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Queue Control Center                    [Refresh] [Settings]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ CSV Import Processing          [🟢 Running] [⚙️]   │    │
│  │ ────────────────────────────────────────────────── │    │
│  │ Status: Running | Enabled: ON | Auto-restart: ON  │    │
│  │ Jobs: 5 waiting, 2 active, 1000 completed, 3 failed│ │
│  │ Worker: PID 12345 | Memory: 512MB | CPU: 15.5%    │    │
│  │                                                    │    │
│  │ [⏸️ Pause] [⏹️ Stop] [🔄 Restart] [🗑️ Clear]      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Bulk Audience Assignment      [🔴 Stopped] [⚙️]   │    │
│  │ ────────────────────────────────────────────────── │    │
│  │ Status: Stopped | Enabled: OFF | Auto-restart: ON │    │
│  │ Jobs: 0 waiting, 0 active, 500 completed, 1 failed│   │
│  │                                                    │    │
│  │ [▶️ Start] [⚙️ Configure] [🗑️ Clear]              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ... (13 more queues)                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Features

1. **Queue Cards**: Each queue displayed as a card with:
   - Status indicator (🟢 Running / 🔴 Stopped / 🟡 Paused)
   - ON/OFF toggle switch
   - Real-time job counts
   - Worker metrics (CPU, memory, uptime)
   - Action buttons (Start/Stop/Pause/Resume/Clear)

2. **Real-time Updates**: WebSocket connection for live status

3. **Bulk Operations**: Select multiple queues, perform bulk actions

4. **Metrics Dashboard**: Charts showing:
   - Jobs processed over time
   - Error rates
   - Worker resource usage
   - Queue depth trends

5. **Job Management**: 
   - View waiting/active/failed jobs
   - Retry failed jobs
   - Clear job history

6. **Configuration Panel**: 
   - Adjust concurrency
   - Set priority
   - Configure auto-restart
   - Set resource limits

---

## 6. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create QueueManagerService
- [ ] Create ProcessController (PM2 integration)
- [ ] Create QueueStateService (MongoDB persistence)
- [ ] Create queue_workers collection schema
- [ ] Implement basic start/stop APIs

### Phase 2: API Layer (Week 1-2)
- [ ] Implement all queue control endpoints
- [ ] Add queue metrics collection
- [ ] Implement WebSocket streaming
- [ ] Add error handling & validation

### Phase 3: UI Components (Week 2)
- [ ] Create QueueControlCenter component
- [ ] Build queue status cards
- [ ] Add real-time updates (WebSocket)
- [ ] Implement action buttons
- [ ] Add metrics charts

### Phase 4: Advanced Features (Week 3)
- [ ] Auto-recovery system
- [ ] Health checks & alerts
- [ ] Configuration management
- [ ] Job retry UI
- [ ] Bulk operations

### Phase 5: Testing & Polish (Week 3-4)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Error handling improvements

---

## 7. Security Considerations

1. **Authentication**: All API endpoints require admin authentication
2. **Authorization**: Role-based access (admin-only for queue control)
3. **Rate Limiting**: Prevent abuse of control endpoints
4. **Audit Logging**: Log all queue control actions
5. **Input Validation**: Sanitize all inputs

---

## 8. Scalability Considerations

1. **Horizontal Scaling**: Multiple workers per queue type
2. **Load Balancing**: Distribute workers across servers
3. **Resource Limits**: Set memory/CPU limits per worker
4. **Queue Prioritization**: Smart job scheduling
5. **Auto-scaling**: Scale workers based on queue depth

---

## 9. Monitoring & Alerting

1. **Health Checks**: Periodic worker health verification
2. **Metrics Dashboard**: Real-time performance metrics
3. **Alerts**: Notify on:
   - Worker crashes
   - High error rates
   - Queue backlog
   - Resource exhaustion
4. **Logging**: Centralized logging for all workers

---

## 10. Migration Strategy

1. **Backward Compatibility**: Keep existing npm scripts working
2. **Gradual Migration**: Migrate queues one by one
3. **State Migration**: Import existing worker states
4. **Testing**: Test each queue type before full migration
5. **Rollback Plan**: Ability to revert to manual control

---

## 11. Success Metrics

- ✅ Zero terminal commands required
- ✅ 100% UI-based queue management
- ✅ < 1 second response time for control actions
- ✅ 99.9% worker uptime
- ✅ Real-time status updates (< 500ms latency)
- ✅ Auto-recovery within 30 seconds of failure

---

## Next Steps

1. Review and approve architecture
2. Set up development environment
3. Begin Phase 1 implementation
4. Create detailed technical specifications for each component

