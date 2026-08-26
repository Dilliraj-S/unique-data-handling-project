# Queue Control Center – How It Works & How to Run

## Part 1: How It Works

### Big picture

You have **two separate things**:

1. **Your Next.js app** – the website and the Queue Control Center UI.
2. **Queue workers** – separate Node processes that **pull jobs from Redis** and run them (CSV import, email sync, etc.).

The **Queue Control Center** is a UI that:

- Shows **status** of every queue (how many jobs waiting, active, completed, failed).
- Lets you **control Bull queues**: Pause, Resume, Clear jobs, Retry failed jobs.
- Lets you **start/stop worker processes** (when using PM2): click Start to run a worker, Stop to kill it.

So: **starting a queue** = starting the **worker process** that runs that queue. The jobs themselves live in **Redis**; your app (or other code) adds jobs to Redis, and workers process them.

---

### Flow (step by step)

```
┌──────────────────────────────────────────────────────────────────┐
│  1. You open "Queue Control Center" in the browser                │
│     Route: /central/queuemanagementmodule/queuecontrolcenter      │
└─────────────────────────────┬────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. The page calls GET /api/queues/status                         │
│     → Next.js API runs → QueueManagerService + ProcessController  │
│     → For each queue: read job counts from Bull (Redis)           │
│     → If PM2 is running: read which worker processes are running  │
│     → Return JSON: list of queues + counts + running/stopped      │
└─────────────────────────────┬────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. You see one card per queue:                                   │
│     - Name (e.g. "CSV Import Processing")                          │
│     - Badges: Running / Stopped, Paused                           │
│     - Counts: Waiting, Active, Completed, Failed                  │
│     - Buttons: Start, Stop, Pause, Resume, Clear, Retry            │
└─────────────────────────────┬────────────────────────────────────┘
                               │
     When you click "Start" (for a queue that is Stopped):
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. Browser sends POST /api/queues/start { queueId: "csv-import" }│
│     → ProcessController.startWorker("csv-import")                  │
│     → PM2 runs: node queue-worker.js (in the background)           │
│     → That worker connects to Redis and starts processing jobs     │
└─────────────────────────────┬────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. Worker process (e.g. queue-worker.js):                        │
│     - Connects to same Redis as your app                          │
│     - Listens to queue "CSV Import Processing"                     │
│     - When a job appears (e.g. from your Import UI), it runs it     │
│     - Updates progress in Redis → status API shows active count   │
└──────────────────────────────────────────────────────────────────┘
```

So:

- **Redis** = storage for jobs (waiting, active, completed, failed).
- **Bull** = library that talks to Redis; both your Next.js app and the workers use Bull with the **same queue name** so they share the same list of jobs.
- **Worker process** = the Node script (e.g. `queue-worker.js`) that runs in the background and processes jobs.
- **Start/Stop in the UI** = start or stop that worker process (via PM2). Pause/Resume = tell Bull to temporarily stop or resume taking new jobs, without killing the process.

---

### What each part does

| Part | Role |
|------|------|
| **Queue Registry** (`config/queueRegistry.js`) | List of all queues: id, Bull queue name, worker file name. The API and UI use this to know which queues exist and which script to start. |
| **QueueManagerService** | Talks to **Bull/Redis**: get job counts, pause queue, resume queue, clear jobs, retry failed jobs. Does **not** start/stop processes. |
| **ProcessController** | When PM2 is available: starts a worker with `pm2.start(workerFile)` and stops it with `pm2.stop(name)`. So "Start" in the UI = run e.g. `node queue-worker.js` under PM2. |
| **API routes** (`/api/queues/*`) | Next.js API: status, start, stop, pause, resume, clear, retry. They call QueueManagerService and ProcessController. |
| **Queue Control Center UI** | React page that calls the APIs and shows cards + buttons. Auto-refreshes status every few seconds. |

---

## Part 2: How to Run Everything

### Supported modes (all are valid)

| Mode | Supported? | Notes |
|------|------------|--------|
| **Run app in dev** | Yes | `npm run dev` – Queue Control Center works; status, Pause/Resume/Clear/Retry work. Start/Stop workers from UI need PM2 daemon (see below). |
| **Run app in production** | Yes | `npm run build` then `npm start` or `pm2 start ecosystem.config.cjs` – same as dev for queue features. |
| **Start queues from terminal (manual)** | Yes | You can always run workers manually, e.g. `npm run queue:work`, `npm run queue:email-sync`, in separate terminals. This is unchanged and fully supported. |
| **Start queues from UI (when app is on PM2)** | Yes | When the **app** is run with PM2 (`pm2 start ecosystem.config.cjs`), the UI can start/stop workers via PM2. Same PM2 daemon manages both the app and the workers you start from the UI. |

So: **dev and production are both supported**. You can **mix** approaches: e.g. run the app with `npm run dev`, and run workers either manually in terminals (`npm run queue:work`) or start them from the UI **if** the PM2 daemon is running (start it once with e.g. `pm2 start ecosystem.config.cjs` or `pm2 list`). For **production**, run the app with PM2; then you can turn queues ON from the UI and they run under PM2.

---

### Prerequisites

1. **Redis** must be running (workers and your app both use it).
   - Example: `redis-server` or start Redis as a service.
2. **Node/npm** – your app and workers run on Node.

---

### Option A: Start workers from the UI (needs PM2)

To use **Start** and **Stop** in the Queue Control Center, PM2 must be installed and your **app** (or at least something that talks to PM2) must run in an environment where PM2 daemon is running.

**Step 1: Install PM2 (if not already)**

```bash
npm install
# pm2 is in optionalDependencies; or install explicitly:
npm install pm2 --save
```

**Step 2: Start your Next.js app with PM2**

So that the API can connect to the PM2 daemon. On Windows, `pm2 start npm -- run start` often fails with "Script not found", so use the ecosystem file instead:

```bash
# Build first
npm run build

# Start the app under PM2 using the ecosystem config (works on Windows and Linux)
npx pm2 start ecosystem.config.cjs
```

This runs the Next.js server directly (same as `npm start`) without passing arguments through npm. To stop or view logs:

```bash
npx pm2 stop nextjs-app
npx pm2 logs nextjs-app
```

**Note:** Use `npx pm2` (not just `pm2`) unless you installed PM2 globally (`npm i -g pm2`). The project has PM2 as an optional dependency, so `npx pm2` runs it from the project.

**For Start/Stop to work:** The app must be run with PM2 (e.g. `pm2 start ecosystem.config.cjs`), not `npm run dev`. When you use `npm run dev`, the PM2 daemon may not be running, so clicking Start will fail with "Could not connect to PM2 daemon". To fix: run `pm2 kill` to stop any old daemon, then `pm2 start ecosystem.config.cjs` to start the app under PM2. After that, Start/Stop in the Queue Control Center will work.

**Global Email Sync (queue:email-sync):** The worker only **processes** jobs. Jobs are **added** by a separate process (the "trigger"): `emails:init-sync:global:daemon`. In the Queue Control Center, for **queue:email-sync**: (1) click **Start** to start the worker, (2) click **Start trigger** to run the job feeder. Once both are running, sync will proceed. Without the trigger, the worker runs but has no jobs to process.

**Step 3: Open the Queue Control Center**

- Go to: **Queue Control Center** in your app (route: `/central/queuemanagementmodule/queuecontrolcenter`).
- You should see all queues. If PM2 is connected, you’ll see **Start** / **Stop** on each card.

**Step 4: Start a queue**

- Find the queue (e.g. **CSV Import Processing**).
- Click **Start**. The API will tell PM2 to run `node queue-worker.js`. The card should show **Running** and job counts will update as jobs are processed.

**Step 5: Add jobs (so the worker has something to do)**

- Jobs are added by your app (e.g. when you upload a CSV in the Import tab). That code adds a job to the Bull queue in Redis. The worker you started will pick it up and process it.

**Stopping a queue**

- Click **Stop** on that queue’s card. PM2 will stop that worker process.

---

### Option B: No PM2 – only Pause / Resume / Clear / Retry

If you **don’t** use PM2:

- **Start** / **Stop** in the UI won’t work (you’ll see a message that process control requires PM2).
- You can still:
  - See **status** (job counts) for all queues.
  - **Pause** / **Resume** queues (Bull-level; useful if workers are started some other way).
  - **Clear** waiting/completed/failed jobs.
  - **Retry** failed jobs.

To actually **run** the workers, you start them yourself in the terminal, e.g.:

```bash
# Terminal 1 – CSV import worker
npm run queue:work

# Terminal 2 – Audience worker (optional)
npm run queue:audience

# etc.
```

Then use the Queue Control Center for monitoring and for Pause/Resume/Clear/Retry.

---

### Option C: Run app normally, start workers manually

1. Start Redis.
2. Start your app: `npm run dev` or `npm run build && npm start`.
3. In **separate** terminals, start whichever workers you need:
   - `npm run queue:work`        → CSV Import
   - `npm run queue:audience`   → Bulk Audience
   - `npm run queue:maintenance` → Maintenance
   - etc.
4. Open the Queue Control Center to see status. If you didn’t start the app with PM2, Start/Stop in the UI won’t start/stop these processes; you’ll use the terminal to start/stop workers and the UI for the rest.

---

## Quick reference

| I want to… | What to do |
|------------|------------|
| **See all queues and job counts** | Open Queue Control Center; it polls `/api/queues/status` automatically. |
| **Start a queue from the UI** | Use PM2 to start the app (`npx pm2 start npm --name "nextjs-app" -- start`), then click **Start** on the queue’s card. |
| **Stop a queue from the UI** | Same PM2 setup; click **Stop** on the queue’s card. |
| **Pause processing (keep worker running)** | Click **Pause** (no PM2 needed; uses Bull). |
| **Resume after pause** | Click **Resume**. |
| **Clear waiting/completed/failed jobs** | Click **Clear**, choose type (Waiting, Completed, Failed, or All), confirm. |
| **Retry failed jobs** | Click **Retry** (or open failed jobs and retry one by one). |
| **Run workers without PM2** | Run e.g. `npm run queue:work` in a terminal; use the UI for status, Pause, Resume, Clear, Retry. |

---

## Summary

- **How it works:** Jobs live in Redis (Bull). Workers are separate Node processes that process those jobs. The Queue Control Center talks to your API to read status (from Bull) and to start/stop workers (via PM2 when available).
- **To start a queue and run everything:** Start Redis, start your app (with PM2 if you want Start/Stop in the UI), then either click **Start** in the Queue Control Center for each queue you need, or start workers manually with `npm run queue:work` etc. and use the UI for monitoring and Bull-level controls.
