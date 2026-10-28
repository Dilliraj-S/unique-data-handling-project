# B2B Lead Intelligence & Cold Outreach Platform: Master Architecture & Technical Documentation

---

## 1. Executive Summary & Core Mission

This project is an **Enterprise-Grade B2B Lead Intelligence, Data Enrichment, Audience Segmentation, and Multi-Account Cold Outreach Automation Platform** (built with Next.js, Node.js, MongoDB, Redis/Bull Queues, OpenSearch, Playwright/Puppeteer, and LLMs).

### Core Problem It Solves:
1. **Massive-Scale B2B Lead Aggregation**: Ingests, validates, cleans, deduplicates, and manages millions of B2B company and contact records across isolated multi-database shards.
2. **AI & Headless Web Enrichment**: Automatically extracts verified company addresses, contact information, phone numbers, and Gmail profile photos using multi-tiered web scrapers and OpenRouter LLMs.
3. **High-Throughput Multi-Account Cold Outreach**: Manages cold email sequences, multi-inbox rotation (Google OAuth & Mailcow SMTP/IMAP), distributed rate limiting, real-time open/click tracking, and Pub/Sub incoming reply processing.
4. **Autonomous Sequence Logic (Drift / MasterFlows)**: Executes multi-step drip automation workflows with conditional branching (e.g., *if opened*, *if replied*, *wait 2 days*, *send step 2*).
5. **No-CLI Background Worker Orchestration**: Provides a centralized UI Queue Control Center to monitor, start, stop, pause, resume, and retry 15+ Redis/Bull background worker processes.

---

## 2. Technology Stack & Architectural Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             PRESENTATION LAYER (UI)                              │
│   Next.js 16 • React 19 • Redux • CoreUI 5 • Bootstrap 5 • DataTables • TinyMCE  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTP / Dynamic Token Flow / WebSockets
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                          DYNAMIC DISPATCH & API LAYER                            │
│  - Token Routing: SkeletonService -> TableHelper -> SystemRouteController        │
│  - Controller Registry: Developer, Dashboard, Querynest, Filters, Email, Auto   │
│  - APIs: /api/queues, /api/drift, /api/campaigns, /api/import, /api/track       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
       ┌─────────────────────────────────┼─────────────────────────────────┐
       ▼                                 ▼                                 ▼
┌───────────────────────┐ ┌─────────────────────────────┐ ┌───────────────────────┐
│   DATABASE LAYER      │ │    QUEUE & WORKER LAYER     │ │   AI & SCRAPING ENGINE│
│ - Multi-DB Shards:    │ │ - Redis + Bull (15+ Queues) │ │ - Playwright/Puppet   │
│   Moon, Mars, Jupiter,│ │ - QueueManagerService       │ │ - Jina AI Reader      │
│   Earth, Mercury,     │ │ - ProcessController (PM2)   │ │ - OpenRouter LLM      │
│   Saturn, Neptune,    │ │ - 15+ Dedicated Workers     │ │ - OpenSearch Client   │
│   Pluto, Central      │ │                             │ │                       │
└───────────────────────┘ └─────────────────────────────┘ └───────────────────────┘
```

### Key Technologies:
* **Frontend**: Next.js 16 (`pages` directory), React 19, Redux, CoreUI React (`@coreui/react`), DataTables (`datatables.net-bs5`), TinyMCE Editor, Chart.js & Nivo Charts (`@nivo/pie`, `@nivo/geo`).
* **Backend & Routing**: Next.js API Routes, dynamic Laravel-style MVC dispatcher (`SystemRouteController`, `ControllerRegistry`), `pino` logger.
* **Databases & Storage**: MongoDB 6.3 (Native driver connection pooling with multi-tenant planetary routing), OpenSearch 2.11 (profile indexing), Redis (ioredis & redis).
* **Asynchronous Jobs**: Bull 4.16 queue system, `@bull-board` monitoring, Node.js child processes / PM2 process management.
* **Email Protocols & Cloud APIs**: Google APIs (`googleapis` OAuth2, Gmail API), Google Cloud Pub/Sub (`@google-cloud/pubsub`), `nodemailer`, `imap`, `imapflow`, `mailparser`.
* **Scraping & Intelligence**: Playwright, Puppeteer, Jina Reader API, OpenRouter LLM API.

---

## 3. Sidebar Navigation & Feature Reference

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MAIN SIDEBAR NAVIGATION                         │
├────────────────────────────────────────────────────────────────────────┤
│  📊 DASHBOARD                                                          │
│                                                                        │
│  🔍 FILTERS & LEAD DISCOVERY                                           │
│     ├── 👥 Contacts                ├── 🏢 Companies                    │
│     ├── 📦 Products                ├── 📋 Product List                 │
│     ├── 🎯 Apollo DB               ├── 🔎 ZoomInfo DB                  │
│     ├── 🛒 Apollo Product          ├── 🔗 LinkedIn Product             │
│     ├── 🌟 G2 Product              ├── 🗄️ DLSLI DB                     │
│     ├── 🏛️ Karur DB                ├── 🌐 Outsourcing DB               │
│     ├── 🛡️ MSPs / MSSPs            ├── ⚡ Need To Action               │
│     └── ➕ Add To Product          └── 🔀 Related Products             │
│                                                                        │
│  ✉️ EMAIL SYSTEM & OUTREACH                                            │
│     ├── ⚙️ Mail Config             ├── 📈 Engage (Campaigns)           │
│     ├── 🔄 Drift Sequences         ├── ⏰ Email Scheduling             │
│     ├── 📤 Email Delivery          ├── 🎯 Audience Details             │
│     ├── 📬 Sent Status             ├── ⚠️ Bounce Update                │
│     └── 📊 Bounce Reports                                              │
│                                                                        │
│  📥 QUERYNEST (DATA INGESTION & OPS)                                   │
│     ├── 📤 Insert (CSV Import)     ├── 🗺️ Mapping                      │
│     ├── ✏️ Bulk Update             └── 👤 Add Users                    │
│                                                                        │
│  🔗 QUERYCHAIN (WORKFLOW AUTOMATION)                                   │
│     ├── ⚡ MasterFlows             └── 📜 Process Logs                 │
│                                                                        │
│  🤖 AUTOMATIONS & SCRAPERS                                             │
│     ├── 🌐 Domain Enrichment       ├── 📸 Gmail Photo Scraper          │
│     └── 💼 LinkedIn Automation                                         │
│                                                                        │
│  🎛️ QUEUE MANAGEMENT                                                  │
│     └── 🚦 Queue Control Center                                        │
│                                                                        │
│  🛠️ CRUD OPERATIONS                                                    │
│     ├── ➕ Create                  ├── ✏️ Update                       │
│     └── 🗑️ Delete                                                      │
│                                                                        │
│  👨‍💻 DEVELOPER MODE (SKELETON & RBAC)                                  │
│     ├── 🔑 Tokens                  ├── 🧩 Modules                      │
│     ├── 📁 Sections                ├── 🛡️ Permissions                  │
│     └── 👥 Users                                                       │
│                                                                        │
│  👤 PROFILE & SETTINGS                                                 │
│     ├── 👤 User Profile            └── ⚙️ Account Settings             │
└────────────────────────────────────────────────────────────────────────┘
```

### Module 1: Dashboard (`/dashboard`)
* **What it does**: Central command center providing real-time metrics across all datasets, active outreach campaigns (sent, opens, replies, bounces), Bull queue job counters, and delivery activity.

### Module 2: Filters & Lead Discovery (`/central/filters/...`)
* `contacts.js`: Filter decision-makers by Name, Title, Email, Company, Seniority, and Location.
* `companies.js`: Search companies by Industry, Headcount, Revenue, Tech Stack, and Country.
* `products.js` & `productlist.js`: Manage and explore B2B software products mapped to accounts.
* `apollo.js` & `zoom.js`: Query interfaces for Apollo and ZoomInfo datasets.
* `g2product.js` & `linkedinprodcut.js`: Software buyer-intent and LinkedIn decision-maker profiles.
* `dlslidb.js`, `karurdb.js`, `outsourcingdb.js`: Specialized datasets for unverified profiles, regional Indian businesses, and IT outsourcing agencies.
* `msps.js` & `mssps.js`: Filterable directories of Managed Service & Security Providers.
* `needtoaction.js`: High-intent leads needing manual SDR action (e.g. 3+ opens or positive replies).
* `addtoproduct.js` & `relatedproducts.js`: Mass lead mapping to product campaigns and competitor discovery.

### Module 3: Email System & Outreach (`/central/emailsystem/...`)
* `mailconfig.js`: Connect unlimited Google Workspace inboxes (OAuth2) and custom SMTP/IMAP (Mailcow). Configure warmup curves and daily quotas.
* `engage.js`: Outreach campaign control center tracking open rates, click rates, reply counts, and inbox health.
* `driftemail.js`: Visual sequence builder for automated drip sequences with step delays and auto-stop on reply.
* `emailscheduling.js`: Timezone-aware sending schedules (e.g., Mon–Fri 9 AM–5 PM).
* `emaildelivery.js`: Real-time delivery worker monitor and throughput graph.
* `audience-details.js`: Subscriber list management, tag assignment, and exclusions.
* `emailsentstatus.js`: Granular log of every single email dispatched with RFC Message-ID and server responses.
* `bounceupdate.js` & `emailbouncereports.js`: Deliverability monitor parsing 5xx/4xx SMTP codes to protect domain reputation.

### Module 4: Querynest (`/central/querynest/...`)
* `insert.js`: High-speed chunked CSV uploader for up to 1Cr+ records.
* `mapping.js`: Visual header-to-database column mapping interface.
* `bulkupdate.js`: Mass data transformation engine.
* `addusers.js`: User invitation and role setup.

### Module 5: Querychain (`/central/querychain/...`)
* `masterflows.js`: Multi-step pipeline orchestration (e.g., *Import $\rightarrow$ Deduplicate $\rightarrow$ Enrich $\rightarrow$ Launch Campaign*).
* `process-logs.js`: Step-by-step audit logs and timing statistics.

### Module 6: Automations & AI Scrapers (`/central/automations/...`)
* `domain.js`: Multi-tier domain enrichment (Static $\rightarrow$ Puppeteer $\rightarrow$ OpenRouter LLM).
* `emailphotoscraper.js`: Playwright scraper that queries Google profiles for email avatars and indexes them into OpenSearch.
* `linkedin.js`: LinkedIn company and employee profile scraper.

### Module 7: Queue Management (`/central/queuemanagementmodule/...`)
* `queuecontrolcenter.js`: Centralized No-CLI web dashboard to Start, Stop, Pause, Resume, Clear, and Retry all 15+ Redis/Bull worker queues.

### Module 8: CRUD Operations (`/central/crudoperations/...`)
* Dynamic entity creation (`create.js`), modification (`update.js`), and soft/hard deletion (`delete.js`).

### Module 9: Developer Mode (Skeleton & RBAC) (`/central/developer/...`)
* `tokens.js`: Manage system tokens mapping routes to database tables and controller actions.
* `modules.js` & `sections.js`: Register and reorder sidebar modules and sections.
* `permissions.js`: Granular role-based access matrix (`can_view`, `can_add`, `can_edit`, `can_delete`, `can_export`).
* `users.js`: User profile, role assignment, and password reset manager.

---

## 4. Deep Technical Analysis: Core Engines

### A. Dynamic Token Routing System
Instead of rigid static URLs, the UI talks to the backend via **Skeleton Tokens**:
1. User interacts with table $\rightarrow$ frontend requests `central_filters_contacts_t`.
2. `SkeletonService.js` parses `[system]_[module]_[table]_[action]` and fetches metadata from `skeleton_tokens`.
3. `SystemRouteController.js` routes the request through `ControllerRegistry.js` to the appropriate class (`TableCtrl`, `ShowAddCtrl`, `SaveAddCtrl`, `ViewCtrl`, `Delete`).
4. `TableHelper.js` applies server-side sorting, pagination, and HTML action button generation.

### B. Planetary Multi-Database Sharding
The platform isolates datasets across dedicated MongoDB instances:
* `central` / `nextjs_stu`: Users, skeleton tokens, permissions, module configurations.
* `pluto`: Cold email campaigns, sending accounts, drift sequences, subscribers, sent logs, tracking pixels.
* `moon`, `mars`, `jupiter`, `earth`, `mercury`, `saturn`, `neptune`: Sharded stores for lead sources (Apollo, ZoomInfo, G2, etc.).
* `automation`: Scraping results, domain enrichment staging, and LLM entity caches.
* **Migration Runner** (`migrate.js`): Runs versioned migrations with JSON schema validators per planetary database (`npm run db:migrate:moon`, `npm run db:migrate:mars`).

### C. O(1) Memory-Optimized Deduplication Engine
* Implemented in `DuplicateRemovalService.js` and executed by `deduplicate-worker.js`.
* Capable of processing **1 Crore (10M) to 5 Crore (50M) records** in ~1–2 GB RAM.
* Uses streaming cursors (`batchSize: 50000`), in-memory Maps with normalized composite match keys (e.g. `fullName + companyName`, `email`, `fullName + li_smtp`), and batch deletions (10,000/batch).

### D. 4-Tier AI Domain Enrichment Engine
* Implemented in `DomainEnrichmentAgent.js`:
  * **Tier 1 (Fast Static Extraction)**: Concurrently scrapes homepages/contact pages via regex, Meta Tags, and Schema.org JSON-LD (solves 85–90% of domains).
  * **Tier 2 (Headless Puppeteer Fallback)**: Renders dynamic JavaScript, closes popups, and extracts hidden contact info.
  * **Tier 3 (Jina AI & OpenRouter LLM)**: Converts complex pages to Markdown and uses LLMs to disambiguate company names, addresses, and phone numbers.
  * **Tier 4 (Address Validation)**: `AddressValidator.js` validates zip codes, states, and postal patterns.

### E. Email Sending, Deliverability & Reply Loop
* **Multi-Account Dispatcher** (`EmailDeliveryService.js`, `email-delivery-worker.js`):
  * Injects custom Message-IDs (`<cmp_ID_sub_ID@domain.com>`) for 100% deterministic bounce and reply attribution.
  * Enforces per-account rate limits and randomized delays via `RedisRateLimiter.js`.
  * Embeds zero-pixel tracking images (`/api/track/open`) and rewrites click URLs.
* **Real-Time Reply & Bounce Attribution**:
  * `gmail-pubsub-worker.js`: Consumes Google Cloud Pub/Sub push webhooks for immediate reply detection.
  * `mailcow-imap-worker.js`: Background IMAP listener for custom SMTP/IMAP inboxes.
  * `SmartClassifier.js`: Differentiates between human replies, Out-of-Office auto-replies, and spam complaints.
  * `BounceDetector.js` & `SuppressionService.js`: Parses SMTP 5xx codes and auto-adds dead emails to the global suppression list.

---

## 5. Background Worker & Queue Matrix

All background operations run through **15+ dedicated Bull queues** orchestrated via `QueueManagerService.js` and the **Queue Control Center UI**:

| Worker File | Queue Name | Priority | Concurrency | Primary Function |
|---|---|---|---|---|
| `queue-worker.js` | CSV Import Processing | 5 (Highest) | 3 | Streaming CSV ingestion and schema validation |
| `email-delivery-worker.js` | Email Delivery | 4 (High) | Variable | Multi-inbox cold email dispatching |
| `gmail-pubsub-worker.js` | Gmail Pub/Sub | 4 (High) | 5 | Inbound Google Cloud reply webhook consumer |
| `email-sync-worker.js` | Global Email Sync | 4 (High) | 5 | Periodic multi-account inbox sync |
| `audience-queue-worker.js` | Bulk Audience Assignment | 3 (Medium) | 1 | Mass audience tag and list assignments |
| `drift-worker.js` | Drift Email | 2 (Medium) | 50 | Timezone-aware sequence step execution |
| `domain-enrichment-worker.js` | Domain Enrichment | 2 (Medium) | Variable | Web crawling and LLM entity extraction |
| `gmail-photo-scraper-worker.js` | Gmail Photo Scraper | 2 (Medium) | Variable | Playwright avatar scraping & OpenSearch indexing |
| `export-worker.js` | CSV Export | 3 (Medium) | Variable | Background filtered CSV generation |
| `dbtransfer-worker.js` | DB Transfer | 3 (Medium) | Variable | Cross-planetary database collection migrations |
| `bounce-status-worker.js` | Bounce Status | 3 (Medium) | Variable | Parsing SMTP bounce logs & suppression updating |
| `open-status-sync-worker.js` | Open Status Sync | 3 (Medium) | Variable | Email open event syncing |
| `deduplicate-worker.js` | Deduplicate | 1 (Lowest) | 1 | O(1) memory duplicate lead removal |
| `bulkupdate-worker.js` | Bulk Update | 1 (Lowest) | 1 | Mass field updates |
| `cleanup-worker.js` | Cleanup | 1 (Lowest) | 1 | Field formatting & data sanitation |

---

## 6. End-to-End Execution Flows

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     FLOW 1: LEAD INGESTION & ENRICHMENT                          │
│                                                                                  │
│  CSV Upload ──► importQueue ──► SimpleImportService ──► Planetary MongoDB        │
│                                                              │                   │
│                                                              ▼                   │
│  Enriched Data ◄── OpenRouter LLM ◄── Puppeteer/Static ◄── DomainEnrichmentAgent │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                     FLOW 2: COLD OUTREACH & ENGAGEMENT LOOP                      │
│                                                                                  │
│  Audience Selection ──► Drift / MasterFlows ──► email-delivery-worker            │
│                                                        │                         │
│                                                        ▼                         │
│  Suppression Check ◄── Smart Classifier ◄── PubSub/IMAP ◄── Recipient Inbox      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

1. **Lead Ingestion Flow**: User uploads CSV $\rightarrow$ File validated against target schema $\rightarrow$ Dispatched to `importQueue` $\rightarrow$ Worker splits data into chunks $\rightarrow$ Writes to selected planet DB $\rightarrow$ Duplicate keys checked and merged $\rightarrow$ Enters searchable Filter views.
2. **Automated Enrichment Flow**: Domain entered or imported $\rightarrow$ `DomainEnrichmentAgent` executes Tier 1 static fetch $\rightarrow$ If needed, launches Puppeteer / Playwright $\rightarrow$ Markdown generated $\rightarrow$ OpenRouter LLM extracts company name, address, phone $\rightarrow$ Validated and updated in MongoDB.
3. **Outreach & Sequence Flow**: User defines campaign & audience $\rightarrow$ Drift sequence scheduled $\rightarrow$ `email-delivery-worker` checks `SuppressionService` and `RedisRateLimiter` $\rightarrow$ Selects sending inbox (OAuth / SMTP) $\rightarrow$ Injects tracking ID and sends $\rightarrow$ Recipient opens (tracked via `/api/track/open`) $\rightarrow$ Recipient replies $\rightarrow$ `gmail-pubsub-worker` receives event $\rightarrow$ `SmartClassifier` marks lead as replied $\rightarrow$ Next sequence step paused.

---

## 7. Competitor Benchmark: Platform vs. Market Leaders

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                COMPETITOR MATRIX                                         │
├──────────────────────────────┬──────────────────────────────┬────────────────────────────┤
│   B2B DATA & ENRICHMENT      │     COLD OUTREACH ENGINES    │    ALL-IN-ONE HYBRIDS      │
├──────────────────────────────┼──────────────────────────────┼────────────────────────────┤
│ • Clay.com (AI Enrichment)   │ • Smartlead.ai (Multi-Inbox) │ • Apollo.io (Data + Mail)  │
│ • ZoomInfo (Enterprise Data) │ • Instantly.ai (Scale Send)  │ • Lemlist (Personalization)│
│ • Clearbit / FullContact     │ • Woodpecker.co (Sequences)  │ • Close / Outreach         │
└──────────────────────────────┴──────────────────────────────┴────────────────────────────┘
```

| Feature / Capability | Apollo.io | Smartlead.ai | Clay.com | Your Platform |
|---|---|---|---|---|
| **B2B Filter Views** | Proprietary DB | External/None | Waterfall APIs | **Multi-Source Sharded DBs** (Apollo, Zoom, G2, etc.) |
| **Data Ingestion Scale**| Proprietary | Moderate CSVs | Table Imports | **1Cr+ Chunked Stream Ingestion** |
| **Deduplication Engine**| Automatic | Basic | Formula-based | **O(1) Composite Match Rules** |
| **AI Web Enrichment** | Standard Data | None | Deep Web Scraping| **4-Tier Scraper + OpenRouter LLM** |
| **Avatar Scraping** | Partial | None | Partial | **Playwright Gmail + OpenSearch** |
| **Multi-Inbox Rotation**| Yes | Yes (Core Focus) | None | **Google OAuth2 + Mailcow SMTP/IMAP** |
| **Sequence Automation**| Yes | Yes | Webhook-based | **Drift Sequences & MasterFlows** |
| **Queue Lifecycle UI** | Hidden | Basic Metrics | Hidden | **Queue Control Center (Start/Stop/Retry)**|

---

## 8. Operational Scripts & CLI Commands

```bash
# 1. Database Migrations
npm run db:migrate          # Migrate all planetary databases
npm run db:migrate:moon     # Migrate Moon database
npm run db:migrate:status   # Check migration status across all shards

# 2. Starting the Application
npm run dev                 # Start Next.js Development Server (0.0.0.0:3000)
npm run build && npm start  # Production Build & Run

# 3. Running Queue Workers (or control via UI Queue Control Center)
npm run queue:work          # Start Main CSV Import Worker (8GB RAM allocated)
npm run queue:drift         # Start Drift Email Sequence Worker
npm run queue:email-delivery# Start Cold Email Sending Dispatcher
npm run queue:gmail-scraper # Start Playwright Gmail Avatar Scraper
npm run queue:domain-enrichment # Start AI Domain Enrichment Worker
npm run queue:deduplicate   # Start Deduplication Worker
npm run queue:export        # Start CSV Export Worker

# 4. Email Sync Daemons
npm run emails:init-sync:global:daemon # Start persistent background email sync for all inboxes
```
