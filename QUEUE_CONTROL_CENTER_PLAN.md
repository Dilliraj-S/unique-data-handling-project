# Queue Control Center – Architecture & Implementation Plan

## 1. Goal

Manage **all** background queues from the UI: start/stop workers, pause/resume processing, clear jobs, retry failed jobs, and monitor status in real time—**without running any queue commands in the terminal**.

---

## 2. Current State

### 2.1 Queue Commands (package.json)

| npm script | Worker file | Bull queue name |
|------------|-------------|-----------------|
| `queue:work` | queue-worker.js | CSV Import Processing |
| `queue:audience` | audience-queue-worker.js | Bulk Audience Assignment |
| `queue:maintenance` | maintenance-queue-worker.js | Maintenance Operations |
| `queue:email-sync` | email-sync-worker.js | Global Email Sync |
| `queue:user-email-sync` | user-email-sync-worker.js | User Email Sync |
| `queue:email-delivery` | email-delivery-worker.js | Email Delivery |
| `queue:process-flow` | process-flow-worker.js | process_flows |
| `queue:domain-enrichment` | domain-enrichment-worker.js | (poll-based, no Bull) |
| `queue:drift` | drift-worker.js | Drift Email |
| `queue:mapping` | mapping-worker.js | Mapping Lookup |
| `queue:cleanup` | cleanup-worker.js | field-cleanup |
| `queue:deduplicate` | deduplicate-worker.js | deduplication |
| `queue:open-sync` | open-status-sync-worker.js | Open Status Sync |
| (no script) | email-sent-status-worker.js | Email Sent Status Update |
| (no script) | bounce-status-worker.js | Bounce Status Update |

### 2.2 Pain Points

- Each queue is started manually: `npm run queue:work`, `npm run queue:audience`, etc.
- No single place to see which queues are running or how many jobs are waiting/active/failed.
- Pause, resume, clear, and retry require Redis/Bull Board or custom scripts.
- No UI for “turn this queue ON/OFF” or “start/stop this worker”.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Queue Control Center (React)                                    │
│  - List all queues with status                                   │
│  - Start / Stop (process)                                        │
│  - Pause / Resume (Bull)                                         │
│  - Clear (waiting/completed/failed) & Retry failed               │
│  - ON/OFF toggle (desired state)                                 │
│  - Auto-refresh every few seconds                                │
└───────────────────────────┬─────────────────────────────────────┘
                             │ HTTP (REST)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Queue Control API (Next.js API routes)                           │
│  GET  /api/queues/status     → all queues + job counts + worker  │
│  POST /api/queues/start      → start worker process (PM2)         │
│  POST /api/queues/stop       → stop worker process (PM2)        │
│  POST /api/queues/pause      → Bull queue.pause()                │
│  POST /api/queues/resume     → Bull queue.resume()               │
│  POST /api/queues/clear      → clear jobs by type                │
│  POST /api/queues/retry      → retry failed job(s)                │
│  POST /api/queues/toggle     → set enabled ON/OFF (persisted)    │
└───────────────────────────┬─────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Queue Registry   │ │ Queue Manager   │ │ Process Control │
│ (config)         │ │ Service         │ │ (PM2 optional)  │
│                  │ │                 │ │                 │
│ queueName →     │ │ getQueue(name)  │ │ pm2.start()     │
│ worker file,     │ │ getCounts()     │ │ pm2.stop()      │
│ npm script       │ │ pause/resume   │ │ pm2.list()      │
│                  │ │ clear/retry     │ │                 │
└─────────────────┘ └────────┬────────┘ └─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Bull (Redis)     │
                    │ Queue instances │
                    └─────────────────┘
```

- **Queue Registry**: Single source of truth (queue name ↔ worker file, npm script, label).
- **Queue Manager Service**: Resolves queue by name, gets counts, calls Bull `pause`/`resume`/`obliterate`/`getFailed` + `retry`.
- **Process Control**: Start/stop the **process** that runs the worker. Implemented with **PM2** when available: API uses `pm2.start()` / `pm2.stop()` / `pm2.list()`. If PM2 is not installed or not running, the UI still supports Bull-level actions (pause, resume, clear, retry) and shows a clear message that “Process control requires PM2”.

---

## 4. Component Design

### 4.1 Queue Registry (`config/queueRegistry.js`)

- Array (or map) of queue definitions:
  - `id`: stable key for API (e.g. `csv-import`, `audience`).
  - `queueName`: Bull queue name (e.g. `"CSV Import Processing"`).
  - `label`: Display name in UI.
  - `workerFile`: e.g. `queue-worker.js`.
  - `npmScript`: e.g. `queue:work`.
- Used by API and UI to list queues and to resolve which Bull queue and which process to control.

### 4.2 Queue Manager Service (`services/QueueManagerService.js`)

- **getQueue(queueName)**  
  Returns Bull queue instance (require from existing `queues/*.js` or create from registry + shared Redis config). Handle missing queues gracefully.

- **getAllQueuesConfig()**  
  Returns registry entries for UI listing.

- **getQueueStats(queueName)**  
  For a given Bull queue: `getWaitingCount()`, `getActiveCount()`, `getCompletedCount()`, `getFailedCount()`, `getDelayedCount()`, and optionally `isPaused()`.

- **pause(queueName)**  
  Resolve queue, then `await queue.pause()`.

- **resume(queueName)**  
  Resolve queue, then `await queue.resume()`.

- **clear(queueName, jobState)**  
  `jobState` in `waiting` | `completed` | `failed` | `delayed` | `all`. Use Bull’s `clean()` with the appropriate job state (or `obliterate` for `all` with care).

- **retryFailed(queueName)**  
  Get failed jobs, call `job.retry()` for each (or use Bull’s bulk retry if available).

- **getFailedJobs(queueName, limit)**  
  Return recent failed jobs for UI (id, data summary, failedReason).

Process state (is the worker process running?) is handled by a small **Process Controller** (see below), not inside QueueManagerService.

### 4.3 Process Controller (PM2)

- **startWorker(queueId)**  
  Map `queueId` → npm script or worker file from registry; call `pm2.start({ name, script, ... })`. Name could be the npm script name or queue id so that stop can find it.

- **stopWorker(queueId)**  
  Find process by name in PM2, call `pm2.stop(name)`.

- **listWorkers()**  
  `pm2.list()` filtered to our queue worker names; return list of `{ name, pid, status, ... }`.

- If `require('pm2')` fails or PM2 is not running, all process-control APIs return a structured error (e.g. “PM2 not available”) so the UI can show “Start/Stop requires PM2” and still use pause/resume/clear/retry.

### 4.4 State Persistence (Optional)

- **Enabled ON/OFF**: Store in MongoDB or Redis (e.g. `queue_control:enabled:{queueId}`). On load, UI shows ON/OFF; “Start” only starts if ON (or we allow Start to override). Keeps desired state across reloads.
- **Process state**: From PM2 in real time; no need to persist.

---

## 5. API Endpoints

Base path: `/api/queues`.

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/queues/status` | - | List all queues: config + Bull counts + isPaused + process status (from PM2). |
| POST | `/api/queues/start` | `{ queueId }` | Start worker process (PM2). |
| POST | `/api/queues/stop` | `{ queueId }` | Stop worker process (PM2). |
| POST | `/api/queues/pause` | `{ queueId }` | Pause Bull queue. |
| POST | `/api/queues/resume` | `{ queueId }` | Resume Bull queue. |
| POST | `/api/queues/clear` | `{ queueId, type }` | type: `waiting` \| `completed` \| `failed` \| `all`. |
| POST | `/api/queues/retry` | `{ queueId, jobId? }` | Retry one failed job or all failed (if jobId omitted). |
| GET | `/api/queues/failed` | `?queueId=...` | List failed jobs for a queue. |
| POST | `/api/queues/toggle` | `{ queueId, enabled }` | Set ON/OFF (persist in Redis or DB). |
| GET | `/api/queues/config` | - | Return registry (for dropdowns/labels). |

All POST actions return JSON: `{ success, message?, error? }`. GET return `{ success, data }`.

---

## 6. UI Design (Queue Control Center Page)

- **Layout**: One card per queue (or grouped by category: Import, Audience, Email, Maintenance, etc.).
- **Per queue card**:
  - Title (label from registry).
  - Status: process (Running / Stopped) and Bull (Paused / Active).
  - Job counts: Waiting, Active, Completed, Failed (and Delayed if relevant).
  - Buttons: Start, Stop, Pause, Resume, Clear (with type selector), Retry failed.
  - ON/OFF toggle (calls toggle API; optional: disable Start when OFF).
- **Global**: Refresh button; optional auto-refresh every 5–10 seconds.
- **Feedback**: Toasts or inline messages for success/error after each action.
- Reuse existing design system (CoreUI, existing buttons and cards) and, if useful, the existing `QueueStatusBar` concept for counts.

---

## 7. Implementation Order

1. **Queue registry** – `config/queueRegistry.js` with all Bull queues and their worker scripts.
2. **QueueManagerService** – get queue by name, stats, pause, resume, clear, retry (no process control yet).
3. **Queue resolution helper** – from queue id in API to Bull queue name and queue instance (using existing `queues/*.js` where possible).
4. **APIs** – `GET /api/queues/status`, `POST /api/queues/pause`, `resume`, `clear`, `retry`, `failed`, `config`.
5. **Process controller** – optional PM2 integration; `start`/`stop`/`list`; wire into same APIs.
6. **Queue Control Center UI** – single page with cards, buttons, toggle, and polling.
7. **Toggle persistence** – Redis or MongoDB for enabled state.
8. **Documentation** – README or internal doc: how to run with PM2 so that Start/Stop work without terminal.

---

## 8. Security & Production

- Restrict queue control APIs to admin (or authenticated role); reuse existing auth middleware.
- Validate `queueId` against registry so only known queues can be controlled.
- For clear `type: 'all'`, consider confirmation in UI and/or require a flag.
- Rate-limit control endpoints if needed.
- Log start/stop/pause/resume/clear/retry for audit.

---

## 9. How to Run With Process Control (Start/Stop from UI)

- **Option A (recommended):** Install PM2 (included as optional dependency). Run your Next.js app under PM2 so the daemon is alive:
  - `npm install` (installs optional `pm2`)
  - `npx pm2 start npm --name "app" -- start` (or `pm2 start ecosystem.config.js` if you add one)
  - Then open Queue Control Center and use Start/Stop per queue; workers will be started/stopped by PM2.
- **Option B:** Without PM2, Pause/Resume/Clear/Retry and real-time status still work; only Start/Stop are disabled with a clear message in the UI.

---

## 10. Success Criteria

- All queues listed in one UI.
- Pause, resume, clear, retry work without terminal.
- Start/Stop work from UI when PM2 is installed and daemon is running.
- Real-time status (polling) and clear feedback on every action.
- No terminal commands needed for day-to-day queue management once PM2 (or equivalent) is set up once.

This plan is designed to be implemented incrementally and to match how large companies centralize queue and background-job control in a single dashboard.
