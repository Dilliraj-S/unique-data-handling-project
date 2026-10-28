# RevenueOS — Sidebar Modules, Sections & Tech Stack
**Version 2.0 | September 2026**

---

## SECTION 1 — SIDEBAR MODULES & WHAT EACH DOES

---

### 1. DASHBOARD
The central command center. Shows real-time health of your entire revenue operation.

| Section | What It Does |
|---|---|
| Overview | Live stats: emails sent today, open rate, reply rate, active campaigns, meetings booked |
| Revenue Dashboard | Pipeline value, opportunities created, revenue closed, attribution by campaign |
| Campaign Performance | Per-campaign breakdown: sent, opened, clicked, replied, bounced, unsubscribed |
| Activity Feed | Real-time stream of all events: opens, replies, bounces, new leads added, agent completions |
| Tasks / Action Center | Leads that need manual follow-up, positive replies waiting for response, flagged actions |

---

### 2. SUPERSEARCH
Your B2B data acquisition engine. Find, filter, and discover prospects from 100Cr+ lead records.

| Section | What It Does |
|---|---|
| People | Search individual contacts by name, title, seniority, location, company, industry. 20+ filters. Sub-second results from OpenSearch on 100Cr records |
| Companies | Search companies by industry, size, revenue, tech stack, location, domain. Full firmographic filtering |
| Advanced Search | Cross-source multi-filter search combining contacts + companies + intent + technology signals in one query |
| Intent | Shows companies actively researching your category based on content consumption signals. Prioritize warm targets |
| Technologies | Find companies using specific tech stacks (e.g. "companies using Salesforce + HubSpot + Slack"). Technology detection via scraping |
| Job Changes | Feed of decision-makers who recently changed jobs. High-intent signal — new job = new budget |
| Lookalikes | Input your best customer domain → system finds 100+ companies with matching firmographic profile |
| Saved Searches | Save any filter combination as a Smart List that auto-refreshes daily with new matching leads |
| Enrichment | Bulk enrich domains/emails with company info, social profiles, phone numbers via 4-tier waterfall agent |
| Verification | Bulk verify email addresses via live SMTP handshake. Returns: valid / risky / catch-all / invalid |
| Credits | Credit balance, usage history, per-operation costs (enrichment, verification, export all cost credits) |

---

### 3. PROSPECTS
Your working list of people already in your pipeline. Different from SuperSearch (which finds new people).

| Section | What It Does |
|---|---|
| All Prospects | Master list of every contact added to your workspace. Full profile: enrichment data, activity timeline, ICP score |
| My Prospects | Filtered view of prospects assigned to the current logged-in user |
| Replied | All prospects who replied to any email in any campaign. Sorted by latest reply date |
| Positive | Prospects whose reply was classified as interested/positive by the AI ReplyAgent |
| Meetings | Prospects who have a meeting booked. Shows meeting date, type, outcome |
| Bounced | All emails that hard or soft bounced. Shows bounce reason and email health status |
| Unsubscribed | Prospects who clicked unsubscribe. Permanently suppressed from all future sends |
| Suppression List | Global suppression: unsubscribes + manual adds + bounces + competitor domains |

---

### 4. COMPANIES
Company-level view of your prospecting data. Aggregates all contacts under each company.

| Section | What It Does |
|---|---|
| All Companies | Full list of companies in your database. Firmographic data: industry, size, revenue, location, website |
| Company Technologies | Tech stack per company detected via scraping. Filter: companies using Stripe, Salesforce, AWS, etc. |
| Enrichment | Trigger bulk domain enrichment for companies missing data. Uses 4-tier AI enrichment agent |

---

### 5. LISTS
Manage collections of leads for targeting in campaigns.

| Section | What It Does |
|---|---|
| Lead Lists | Static lists of contacts manually added or imported via CSV. Used as campaign audience |
| Smart Lists | Dynamic lists defined by saved search filters. Auto-updates daily as new leads match criteria |
| Suppression Lists | Lists of domains/emails that should never receive emails from this workspace |

---

### 6. CAMPAIGNS
Your outbound email campaign management system. Build, launch, and monitor cold email campaigns.

| Section | What It Does |
|---|---|
| All Campaigns | Full list of campaigns with status (draft/active/paused/completed) and performance summary |
| Sequence Builder | Visual step-by-step email sequence builder. Add steps: Email, Wait, Condition, Branch. Drag and drop nodes |
| Email Editor | Rich text editor (TipTap/TinyMCE) with variable insertion (firstName, company, icebreaker), preview, and spam score check |
| A/B Tests | Create email variants (different subject line or body). System auto-splits audience. Picks winner by open/reply rate |
| Templates | Saved email templates for quick campaign creation. Organized by type: Cold Intro, Follow-up, Breakup |
| Scheduling | Set sending window (days + hours + timezone). System delivers emails only in recipient's business hours |

---

### 7. AUTOMATIONS
Visual workflow builder for triggered multi-step automation sequences beyond simple email sequences.

| Section | What It Does |
|---|---|
| All Workflows | List of all automation workflows with status and trigger count |
| Workflow Builder | React Flow visual canvas. Drag and drop trigger → condition → action nodes. Example: "If lead opens email 3 times → move to Hot list + notify team" |
| Triggers | Configure what starts a workflow: New lead added, Email opened, Link clicked, Reply received, Meeting booked, Stage changed |
| Logs | Full execution log of every workflow run. Shows each node: success/fail/skipped. Debug automation failures |

---

### 8. INBOX (UNIBOX)
Unified inbox that aggregates all email replies across all connected mailboxes into one threaded view.

| Section | What It Does |
|---|---|
| All | Every reply received across all campaigns and all mailboxes in one view. Threaded conversation format |
| Unread | Replies not yet read or actioned by any team member |
| Assigned | Replies assigned to specific team members for follow-up |
| Positive | Replies classified as interested by ReplyAgent. Highest priority — these are your hot leads |
| AI Reply Assistant | For each reply, ReplyAgent generates a suggested response draft. One-click edit and send from inbox |

---

### 9. DELIVERABILITY
Protect your sender reputation and ensure your emails land in inbox, not spam.

| Section | What It Does |
|---|---|
| Mailbox Dashboard | Health overview of all connected mailboxes. Shows send volume, bounce rate, spam rate, warmup status per mailbox |
| Warmup | P2P email warmup network. Auto-sends and replies to warmup emails between pool accounts to build domain reputation |
| Domains | Manage sending domains. Add new domains, view connected mailboxes per domain |
| DNS Config | Automated SPF, DKIM, DMARC validation per domain. Shows current DNS record status + exact fix instructions |
| Spam Tests | Pre-send content analysis. Detects spam trigger words, missing unsubscribe links, image-to-text ratio issues |
| Blacklists | Monitor if your sending domain or IP is listed on Spamhaus, Barracuda, SORBS, MXToolbox, or other DNSBLs |
| Inbox Placement | Send test emails to seed accounts across Gmail, Outlook, Yahoo. Shows which tab they land in: Primary/Spam/Promotions |
| Reputation | Composite sender score per domain (0-100). Aggregated from bounce rate, spam complaints, blacklist status, warmup health |

---

### 10. ANALYTICS
Data and reporting across every part of your revenue operation.

| Section | What It Does |
|---|---|
| Overview | Top-level metrics: total leads, active campaigns, emails sent, reply rate, meetings booked this month |
| Campaign Analytics | Per-campaign deep dive: sent, delivered, opens (unique + total), clicks, replies, bounces, unsubscribes, over time |
| Email Analytics | Per-mailbox breakdown: daily send volume, delivery rate, bounce rate, spam complaints |
| Mailbox Analytics | Mailbox-level health trends over time. Spot declining reputation early |
| Revenue Analytics | Campaign → Replies → Meetings → Opportunities → Closed Revenue full attribution funnel |
| Automation Analytics | Workflow execution rates, drop-off by node, success vs error counts per workflow |

---

### 11. MEETINGS
Calendar booking system integrated with your prospect pipeline.

| Section | What It Does |
|---|---|
| Calendar | Connect Google Calendar or Outlook. View all upcoming booked meetings |
| Bookings | Your public booking page link. Prospects click link from email → choose slot → meeting auto-created |
| Meeting Types | Configure meeting durations: 15-min intro, 30-min demo, 60-min deep-dive. Each gets a unique booking URL |
| Availability | Set your available days, hours, and buffer between meetings. Timezone-aware |

---

### 12. AI
All AI-powered tools in one place. Each tool is powered by a specialized AI agent.

| Section | What It Does |
|---|---|
| AI Assistant | Chat interface. Ask anything: "Find me 50 CTOs at fintech companies in Singapore" or "Write a cold email for my ICP" |
| Email Writer | CopywriterAgent UI. Input your ICP and value prop → generates full multi-step email sequence with subject lines and CTAs |
| Personalization | PersonalizationAgent bulk runner. Select a lead list → agent researches each lead → generates 1:1 icebreaker line per lead |
| Lead Research | ResearchAgent UI. Input a company or person → agent scrapes website, news, LinkedIn → returns structured intelligence brief |
| Lead Scoring | ScoringAgent dashboard. Shows ICP score (0–100) per lead based on title, company size, tech stack, intent signals, engagement |
| Campaign Generator | CampaignGeneratorAgent. Input plain text brief: "Target VP Sales at B2B SaaS in USA under 200 employees" → outputs full campaign: audience filter + sequence steps + subject lines |
| Reply Assistant | ReplyAgent results. Shows all incoming replies with AI-generated response drafts. One-click to send or edit |
| AI Settings | Choose LLM model (GPT-4o, Claude, Gemini). Set token budget per workspace per month. Enable human approval before AI sends |

---

### 13. DATA ACQUISITION (SCRAPERS)
New module. Pull fresh leads directly from external sources via automated scrapers.

| Section | What It Does |
|---|---|
| Google Maps Scraper | Search any keyword + location on Google Maps. Extracts: business name, phone, website, address, category, rating. Deduplicates and inserts into your lead database |
| Website Scraper | Input domain list or URL pattern. Scraper visits each website and extracts: company description, contact email, phone, LinkedIn URL, team page data |
| LinkedIn Follow-up Agent | For leads with LinkedIn URLs: sends connection request with personalized note. After connection accepted: sends follow-up DM. Tracks connection status per lead |
| Gmail Photo Enrichment | Bulk fetch Gmail profile photos for all leads with email addresses. Attaches photo to lead profile. Improves personalization data quality |
| Scraper Scheduler | Configure which scraper runs on what schedule. Google Maps: daily by city. Website: weekly. All jobs visible in Queue Control Center |

---

### 14. INTEGRATIONS
Connect RevenueOS to your existing tools.

| Section | What It Does |
|---|---|
| CRM | Two-way sync with HubSpot or Salesforce. Prospects, activities, and deals sync automatically |
| Calendar | Connect Google Calendar or Outlook for meeting booking and availability sync |
| Automation | Connect Zapier or Make.com. Trigger external workflows when leads reply, meetings are booked, or stages change |
| API and Webhooks | REST API access for custom integrations. Configure inbound webhooks to receive external data into RevenueOS |

---

### 15. TEAM
Manage workspace members, roles, and permissions.

| Section | What It Does |
|---|---|
| Members | List of all users in workspace. Invite new members via email. Assign roles |
| Roles and Permissions | Define what each role can see and do. Default roles: Admin, Manager, SDR, Viewer. Custom roles supported |
| Activity | Audit log of all actions by all team members. Who imported leads, who launched a campaign, who changed settings |

---

### 16. BILLING
Manage your subscription, usage, and credits.

| Section | What It Does |
|---|---|
| Plan | Current subscription plan, features included, upgrade/downgrade options |
| Usage | Current month usage vs plan limits: emails sent, leads enriched, verifications run, AI tokens used |
| Credits | Credit balance and transaction history. Credits used for enrichment, verification, and export operations |
| Invoices | Past invoices with download links. Stripe-powered billing |

---

### 17. SETTINGS
Workspace and account configuration.

| Section | What It Does |
|---|---|
| Workspace | Workspace name, logo, timezone, default sender name, custom domain for booking pages |
| Profile | Personal name, email, password, profile photo |
| Notifications | Configure which events trigger email or in-app notifications for each team member |
| Security | Enable 2-Factor Authentication (2FA), manage SSO (SAML/OIDC), view and rotate API keys |

---

### 18. DEVELOPER (Internal Only)
Internal system management. Not visible to end customers.

| Section | What It Does |
|---|---|
| Tokens | View and manage dynamic routing tokens that map URLs to controllers |
| Modules and Sections | Add/edit/remove sidebar modules and permission-controlled sections |
| Permissions | Grant or revoke feature-level access per role |
| Queue Control Center | Real-time view of all BullMQ worker queues. See job count, failed jobs, active jobs. Pause, resume, retry any queue |


---

## SECTION 2 — COMPLETE TECH STACK

---

### FRONTEND

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR, SEO, fast page loads, API routes as thin proxy |
| UI Components | shadcn/ui + Radix UI | Accessible, unstyled, fully customizable |
| Styling | Tailwind CSS v4 | Utility-first, no runtime cost, fast builds |
| State Management | Zustand | Lightweight global state (auth, workspace, sidebar) |
| Server State | TanStack Query | API data fetching, caching, background refresh |
| Real-time | Socket.io client | Live inbox updates, queue progress, activity feed |
| Workflow Canvas | React Flow | Visual sequence builder and automation workflow canvas |
| Email Editor | TipTap | Rich text editor with variable insertion and formatting |
| Charts | Recharts | Campaign analytics and revenue charts |
| Tables | TanStack Table | Server-side paginated data tables for 100Cr lead views |

---

### BACKEND API

| Layer | Technology | Why |
|---|---|---|
| Framework | NestJS (TypeScript) | Modular, decorator-based, enterprise-grade Node.js |
| Architecture | Modular Monolith | 18 domain modules, clean separation, no microservice overhead |
| Auth | Passport.js + JWT | NestJS-native auth, access and refresh token strategy |
| OAuth | Google + Microsoft OAuth2 | Gmail connection, Calendar sync, SSO login |
| Validation | class-validator + Zod | Request validation at API layer |
| Real-time | Socket.io server | Bi-directional events to frontend |
| API Versioning | /api/v1/ prefix | All routes versioned from day one |
| Process Manager | PM2 Cluster | Zero-downtime reload, multi-core utilization |
| Reverse Proxy | Nginx | SSL termination, route Next.js and NestJS, gzip |

---

### EVENT STREAMING (BACKBONE)

| Layer | Technology | Why |
|---|---|---|
| Event Backbone | Apache Kafka | All system events flow through Kafka. Industry standard |
| Kafka Client | kafkajs (Node.js) | NestJS Kafka consumer/producer integration |
| Topics | email.sent, email.opened, email.bounced, lead.enriched, lead.scored, reply.received, meeting.booked | One topic per domain event |
| Purpose | Decouples all services. Spark reads from Kafka. Workers write to Kafka. No direct service-to-service calls |

---

### BATCH PROCESSING

| Layer | Technology | Why |
|---|---|---|
| Engine | Apache Spark (PySpark) | Industry standard for 100Cr+ batch processing |
| Trigger | Apache Livy REST API | Submit Spark jobs from Node.js BullMQ worker |
| MongoDB Connector | mongo-spark-connector | Spark reads/writes directly to MongoDB shards |
| Language | Python (PySpark) | Easier than Scala, same performance |
| Use Cases | Deduplication (100Cr), Collection mapping, Lead scoring batch, Analytics aggregation, Bulk export |
| Schedule | BullMQ Cron job calls Livy API nightly or on-demand |

---

### SEARCH AND FILTERING

| Layer | Technology | Why |
|---|---|---|
| Engine | OpenSearch (3-node cluster) | All search and filter queries on 100Cr leads |
| Sync | Background worker syncs MongoDB writes to OpenSearch index in real-time | |
| Use Cases | People search, Company search, 20+ filter combinations, Autocomplete, Saved search execution |
| Rule | MongoDB is NEVER queried for user-facing search. OpenSearch only |

---

### DATABASES

| Database | Technology | What It Stores |
|---|---|---|
| Lead Database | MongoDB (Sharded) | 100Cr leads and contacts across planetary shards (moon, mars, jupiter, earth, mercury, saturn, neptune) |
| MongoDB Read | Read Replicas per shard | Export, dedup, mapping jobs read from replica only. Primary stays fast |
| Operational DB | PostgreSQL + Prisma | Auth, workspaces, campaigns, sequences, mailboxes, inbox, CRM, billing, audit logs |
| Analytics DB | ClickHouse | Campaign daily stats, email event aggregations, revenue reports (Phase 7+) |
| Cache + Queues | Redis (64GB) | BullMQ queues, rate limiters per mailbox, Bloom filter for dedup (100Cr hashes) |
| File Storage | MinIO (self-hosted S3) | Exported CSVs, email attachments, scraped file storage |

---

### BACKGROUND WORKERS (PM2 PROCESSES)

| Worker | Technology | Job |
|---|---|---|
| email-delivery-worker | Node.js + BullMQ | Sends campaign emails via Gmail OAuth2 or SMTP (Mailcow) |
| drift-worker | Node.js + BullMQ | Dispatches drip sequence steps on schedule |
| email-sync-worker | Node.js + IMAP | Syncs replies and thread updates from all mailboxes |
| gmail-pubsub-worker | Node.js + BullMQ | Processes Google Cloud PubSub push notifications for replies and bounces |
| bounce-detection-worker | Node.js + BullMQ | Classifies bounces (hard/soft), triggers suppression |
| dedup-worker | Node.js + BullMQ | Triggers Spark dedup job via Livy API, monitors progress |
| mapping-worker | Node.js + BullMQ | Triggers Spark mapping job via Livy API |
| export-worker | Node.js + BullMQ | Triggers Spark export job, uploads result to MinIO, notifies user |
| enrichment-worker | Node.js + BullMQ | Runs 4-tier domain enrichment agent (Static, Playwright, Jina, LLM) |
| google-maps-scraper-worker | Node.js + Playwright | Scrapes Google Maps results by query and location |
| website-scraper-worker | Node.js + Playwright | Scrapes company websites for contact and firmographic data |
| linkedin-followup-worker | Node.js + Playwright + stealth | Sends LinkedIn connection requests and follow-up DMs |
| gmail-photo-scraper-worker | Node.js + BullMQ | Fetches Gmail profile photos for leads |
| verification-worker | Node.js + BullMQ | SMTP handshake email verification |
| warmup-worker | Node.js + BullMQ | P2P warmup email send and reply automation |
| ai-research-worker | Node.js + BullMQ | Runs ResearchAgent, PersonalizationAgent, ScoringAgent jobs |
| ai-campaign-worker | Node.js + BullMQ | Runs CampaignGeneratorAgent and CopywriterAgent jobs |
| analytics-worker | Node.js + BullMQ | Triggers Spark analytics aggregation jobs nightly |
| audience-queue-worker | Node.js + BullMQ | Bulk audience assignment to campaigns |
| spark-job-trigger-worker | Node.js + BullMQ | Master Spark job launcher. Calls Livy API, monitors status, notifies completion |

---

### AI AGENTS

| Agent | Model | Job |
|---|---|---|
| ResearchAgent | OpenRouter (Claude / GPT-4o) | Scrapes company website, news, Crunchbase. Returns structured intelligence brief |
| CopywriterAgent | OpenRouter (Claude 3.5 Sonnet) | Generates multi-step email sequences with subject lines, body, CTAs, A/B variants |
| PersonalizationAgent | OpenRouter (GPT-4o mini) | Bulk 1:1 icebreaker generation per lead using ResearchAgent output |
| ScoringAgent | Custom ML model + OpenRouter | Scores leads 0-100 based on ICP fit, intent, title, tech stack, engagement history |
| ReplyAgent | OpenRouter (GPT-4o) | Classifies reply intent + generates suggested reply draft for each incoming email |
| EnrichmentAgent | OpenRouter + Jina + Playwright | 4-tier waterfall enrichment: Static lookup, Playwright scrape, Jina Reader, LLM extraction |
| VerificationAgent | SMTP TCP handshake (no LLM) | Live email verification via SMTP handshake and MX record lookup |
| CampaignGeneratorAgent | OpenRouter (Claude 3.5 Sonnet) | Converts plain text brief into full campaign: audience filter + sequence + subjects |
| AI Orchestrator | AgentOrchestrator.js | Routes jobs to correct agent, manages retry, caching (ai_research table), cost tracking |
| LLM Router | OpenRouter | Multi-model fallback. Primary model fails, automatically falls back to next |
| AI Cache | PostgreSQL ai_research table | Caches LLM output per domain/lead. Same domain never charged twice |

---

### EMAIL INFRASTRUCTURE

| Component | Technology | Job |
|---|---|---|
| Gmail Sending | Gmail OAuth2 + googleapis | Primary sending via connected Gmail/Google Workspace accounts |
| SMTP Sending | Mailcow + Nodemailer | SMTP sending for custom domains and non-Google mailboxes |
| IMAP Sync | node-imap + mailparser | Read replies, sync email threads across all mailboxes |
| Reply Detection | Google Cloud PubSub + Gmail Watch API | Real-time push notification on new Gmail replies |
| Rate Limiting | Redis per-mailbox limiter | Enforces max emails per day per mailbox (500/day default) |
| Bounce Detection | BounceDetector.js + IMAP | Parses bounce headers, classifies hard vs soft bounce |
| Suppression | SuppressionService.js | Maintains global suppression list. Checked before every send |
| Message Attribution | RFC Message-ID tracking | Links every reply back to original campaign step using Message-ID headers |
| Open Tracking | 1x1 pixel + /api/track/open | Embedded in every email HTML. Logs open event to Kafka |
| Click Tracking | Redirect URL + /api/track/click | Wraps all links. Logs click event to Kafka |

---

### SCRAPING INFRASTRUCTURE

| Component | Technology | Job |
|---|---|---|
| Browser Automation | Playwright (Node.js) | Headless Chromium for Maps, LinkedIn, Website scraping |
| Anti-Detection | puppeteer-extra-plugin-stealth | Bypasses bot detection for LinkedIn |
| Content Extraction | Jina Reader API | Converts web pages to clean text for LLM processing |
| LLM Extraction | OpenRouter + structured output | Extracts structured JSON from unstructured scraped text |
| Proxy Management | Rotating proxy pool | Avoids IP blocks during high-volume scraping |
| Browser Pool | Max 5 concurrent per worker | Prevents OOM crash from too many Playwright instances |

---

### DELIVERABILITY INFRASTRUCTURE

| Component | Technology | Job |
|---|---|---|
| DNS Validation | dns.resolve() + node DNS | Checks SPF, DKIM, DMARC records per domain |
| Blacklist Monitor | DNSBL API lookup | Checks Spamhaus, Barracuda, SORBS, MXToolbox |
| Spam Analysis | SpamAssassin rules + custom | Pre-send content scoring against spam trigger patterns |
| Warmup Pool | Internal P2P network | Sends warmup emails between pool accounts and auto-replies |
| Inbox Placement | Seed account network | Routes test email through seed Gmail/Outlook/Yahoo accounts and reports placement |
| Reputation Score | Composite algorithm | Aggregates bounce rate, spam rate, blacklist status, warmup health into 0-100 score |

---

### INFRASTRUCTURE AND DEVOPS

| Component | Technology | Why |
|---|---|---|
| Containerization | Docker + Docker Compose | Self-hosted multi-service orchestration |
| Process Manager | PM2 | All Node.js workers + NestJS API managed by PM2 |
| Reverse Proxy | Nginx | SSL termination, routing, gzip, rate limiting at edge |
| SSL | Certbot (Let's Encrypt) | Free SSL auto-renewal on your domain |
| File Storage | MinIO | Self-hosted S3-compatible object storage for exports and attachments |
| Monitoring | Grafana + Prometheus | Server metrics: CPU, RAM, disk, queue depth, request rate |
| Log Aggregation | Grafana Loki | Centralized logs from all PM2 worker processes |
| Error Tracking | Sentry (self-hosted) | Application error tracking and alerting |
| Spark Cluster | Standalone Spark + Apache Livy | 3-node Spark cluster for batch jobs. Livy = REST API to submit jobs |
| OpenSearch | 3-node OpenSearch cluster | Distributed search on 100Cr lead records |
| Database Backups | MongoDB mongodump + PG dump | Nightly automated backups to MinIO |

---

### MULTI-SERVER LAYOUT (SELF-HOSTED)

| Server | Role | Specs |
|---|---|---|
| Server A | Next.js + NestJS API + Nginx | 32 cores, 64GB RAM, 1TB NVMe |
| Server B | Heavy Workers (dedup, export, mapping, AI) | 64 cores, 256GB RAM, 2TB NVMe |
| Server C | Email Workers (delivery, sync, bounce, warmup) | 16 cores, 32GB RAM, dedicated IPs |
| Server D | Scraping Workers (Maps, LinkedIn, Website) | 32 cores, 64GB RAM |
| Server E | MongoDB Primary Shards | 64 cores, 512GB RAM, 20TB NVMe |
| Server F | MongoDB Replica Shards (read-only) | 64 cores, 512GB RAM, 20TB NVMe |
| Server G | OpenSearch Cluster | 64 cores, 256GB RAM, 10TB NVMe |
| Server H | Redis + ClickHouse | 16 cores, 64GB RAM |
| Server I | PostgreSQL | 16 cores, 64GB RAM, 2TB NVMe |
| Server J | Apache Spark Master + Workers | 64 cores, 256GB RAM, 4TB NVMe |
| Server K | MinIO + Grafana + Loki + Monitoring | 16 cores, 32GB RAM, 10TB NVMe |

---

## SECTION 3 — FINAL SUMMARY

`
PILLAR              TECHNOLOGY
──────              ──────────
Frontend            Next.js 15 + shadcn/ui + Tailwind + Zustand + TanStack
Backend API         NestJS (TypeScript) — Modular Monolith
Event Backbone      Apache Kafka
Batch Processing    Apache Spark (PySpark) + Apache Livy
Search              OpenSearch (3-node cluster)
Lead Storage        MongoDB Sharded (100Cr) + Read Replicas
Operational DB      PostgreSQL + Prisma
Analytics DB        ClickHouse (Phase 7+)
Cache and Queues    Redis 64GB + BullMQ
File Storage        MinIO (self-hosted S3)
AI and Agents       OpenRouter (multi-model) + 8 Custom Agents
Browser Scraping    Playwright + puppeteer-stealth
Email Delivery      Gmail OAuth2 + Mailcow SMTP
Process Manager     PM2 + Docker Compose + Nginx
Monitoring          Grafana + Prometheus + Loki + Sentry
`

**Total Modules: 18 Sidebar Sections**
**Total Workers: 19 Background PM2 Processes**
**Total AI Agents: 8 Specialized Agents**
**Data Capacity: 100 Cr+ records**
**Target Scale: 10 lakh emails/day + 100 concurrent heavy users**

---

*RevenueOS v2.0 | September 2026*
*Stack: Next.js + NestJS + Kafka + Spark + OpenSearch + MongoDB + PostgreSQL + Redis*

