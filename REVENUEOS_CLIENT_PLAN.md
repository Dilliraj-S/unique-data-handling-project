# RevenueOS â€” Product Plan and Technology Proposal
### Prepared for Client Review | September 2026

---

## CURRENT SYSTEM â€” Modules and Sections (Live in Production)

The following modules and sections are already built and live in the system.

---

### MODULE 1 â€” Filters (Data Discovery)
*Find, filter, and explore lead and company records across all databases*

| Section | Display Name | Status |
|---|---|---|
| contacts | Contacts | LIVE |
| companies | Companies | LIVE |
| products | Zoom Products | LIVE |
| needtoaction | Need To Action | LIVE |
| zoom | Zoom | LIVE |
| apollo | Apollo | LIVE |
| apolloproduct | Apollo Products | LIVE |
| linkedinprodcut | LinkedIn Products | LIVE |
| g2product | G2 Products | LIVE |
| msps | MSPs Products | LIVE |
| mssps | MSSPs Products | LIVE |
| outsourcingdb | OutSourcing DB | LIVE |
| dlslidb | DLS LI DB | LIVE |
| karurdb | Karur DB | LIVE |
| tempmasterleads | Temp Master Leads | LIVE |
| tempmasteraccounts | Temp Master Accounts | LIVE |
| others | Others | LIVE |
| addtoproduct | Add Products | LIVE |

---

### MODULE 2 â€” Email System
*Full outbound email campaign management, delivery, tracking, and reporting*

| Section | Display Name | Status |
|---|---|---|
| mailconfig | Mail Config | LIVE |
| engage | Engage | LIVE |
| emailscheduling | Campaigning System | LIVE |
| emaildelivery | Email Delivery | LIVE |
| driftemail | Drift Email | LIVE |
| emailbouncereports | Email Bounce Reports | LIVE |
| emailsentstatus | Email Sent Status | LIVE |
| bounceupdate | Bounce Update | LIVE |

---

### MODULE 3 â€” Query Chain
*Workflow and process automation management*

| Section | Display Name | Status |
|---|---|---|
| masterflows | Master Flows | LIVE |
| workflows | WorkFlows | LIVE |

---

### MODULE 4 â€” Query Nest
*Data operations: import, mapping, bulk update, user management*

| Section | Display Name | Status |
|---|---|---|
| insert | Insert | LIVE |
| addusers | Add Users | LIVE |
| mapping | Company Mapping | LIVE |
| bulkupdate | Bulk Update | LIVE |

---

### MODULE 5 â€” CRUD Operations
*Direct database record create, update, delete operations*

| Section | Display Name | Status |
|---|---|---|
| create | Create | LIVE |
| update | Update | LIVE |
| delete | Delete | LIVE |

---

### MODULE 6 â€” Automations
*AI-powered enrichment and data intelligence agents*

| Section | Display Name | Status |
|---|---|---|
| domain | Domain Intelligence | LIVE |
| linkedin | LinkedIn Profile Agent | LIVE |
| emailphotoscraper | Email Photo Scraper | LIVE |

---

### MODULE 7 â€” Queue Management Module
*Real-time background job monitoring and control*

| Section | Display Name | Status |
|---|---|---|
| queuecontrolcenter | Queue Control Center | LIVE |

---

### MODULE 8 â€” Developer Mode *(Internal Only â€” Not shown to end users)*
*System-level administration for tokens, modules, sections, permissions*

| Section | Display Name | Status |
|---|---|---|
| tokens | Token Management | LIVE |
| modules | Module Management | LIVE |
| sections | Section Management | LIVE |
| permissions | Permissions | LIVE |
| users | Users | LIVE |

---

## NEW MODULES TO ADD â€” RevenueOS Full Platform

These are the modules and sections that need to be built as part of the RevenueOS upgrade.

---

### NEW MODULE â€” Dashboard
*Central command center showing real-time revenue operations health*

| Section | What It Does | Status |
|---|---|---|
| Overview | Live stats: emails sent, open rate, reply rate, active campaigns, meetings booked | NEW |
| Revenue Dashboard | Pipeline value, opportunities, closed revenue, campaign attribution | NEW |
| Campaign Performance | Per-campaign: sent, opened, clicked, replied, bounced, unsubscribed | NEW |
| Activity Feed | Real-time stream: email opens, replies, bounces, new leads, agent completions | NEW |
| Tasks / Action Center | Extend existing Need To Action with smart priority queue and AI suggestions | EXTEND |

---

### EXTEND MODULE â€” Filters (SuperSearch Upgrade)
*Add advanced discovery capabilities on top of existing Filters module*

| Section | What It Does | Status |
|---|---|---|
| Intent | Companies actively researching your category (buyer intent signals) | NEW |
| Technologies | Find companies by tech stack (Salesforce, AWS, Stripe, HubSpot, etc.) | NEW |
| Job Changes | Decision-makers who recently changed jobs â€” high-intent targeting signal | NEW |
| Lookalikes | Input a company â†’ find 100+ companies with matching firmographic profile | NEW |
| Saved Searches | Save any filter as a Smart List that auto-refreshes daily | NEW |
| Enrichment | Dedicated enrichment center UI â€” bulk enrich domains and emails | EXTEND (exists in Automations) |
| Verification | Bulk SMTP email verification â€” valid / risky / catch-all / invalid | NEW |
| Credits | Credit balance, per-operation costs, usage history | NEW |

---

### NEW MODULE â€” Prospects
*Working pipeline of people actively in your outreach flow*

| Section | What It Does | Status |
|---|---|---|
| All Prospects | Master list with full profile: enrichment data, ICP score, activity timeline | NEW |
| My Prospects | Prospects assigned to the current logged-in user | NEW |
| Replied | All prospects who replied to any campaign email | NEW |
| Positive | Prospects with positive/interested reply (AI classified) | NEW |
| Meetings | Prospects with a meeting booked â€” shows date and outcome | NEW |
| Bounced | All hard and soft bounced emails with bounce reason | NEW |
| Unsubscribed | Permanently suppressed prospects who clicked unsubscribe | NEW |
| Suppression List | Global suppression: unsubscribes + manual adds + bounces + domain blocks | NEW |

---

### NEW MODULE â€” Companies
*Company-level view aggregating all contacts under each company*

| Section | What It Does | Status |
|---|---|---|
| All Companies | Full company list with firmographic data: industry, size, revenue, location | NEW |
| Company Technologies | Tech stack per company detected via scraping | NEW |
| Enrichment | Trigger bulk domain enrichment for companies missing data | EXTEND |

---

### NEW MODULE â€” Lists
*Manage lead collections for campaign targeting*

| Section | What It Does | Status |
|---|---|---|
| Lead Lists | Static lists â€” manually added or CSV imported | NEW |
| Smart Lists | Dynamic lists from saved search filters, auto-updates daily | NEW |
| Suppression Lists | Domain and email lists excluded from all sends | NEW |

---

### EXTEND MODULE â€” Email System â†’ Campaigns Upgrade
*Add visual sequence builder, A/B testing, and email editor*

| Section | What It Does | Status |
|---|---|---|
| Mail Config | Existing mailbox configuration â€” keep as-is | LIVE |
| Engage | Existing campaign management â€” extend with analytics | EXTEND |
| Campaigning System | Existing scheduling â€” keep as-is | LIVE |
| Email Delivery | Existing delivery tracker â€” keep as-is | LIVE |
| Drift Email | Existing drip sequences â€” migrate to visual sequence builder | EXTEND |
| Email Bounce Reports | Existing bounce reports â€” keep as-is | LIVE |
| Email Sent Status | Existing sent status â€” keep as-is | LIVE |
| Bounce Update | Existing bounce update â€” keep as-is | LIVE |
| Sequence Builder (Visual) | React Flow drag-and-drop visual email sequence builder | NEW |
| Email Editor | Rich text editor with variable insertion and spam score check | NEW |
| A/B Tests | Email variant testing â€” split audience, auto-pick winner | NEW |
| Templates | Saved email templates: Cold Intro, Follow-up, Breakup types | NEW |

---

### NEW MODULE â€” Unified Inbox (Unibox)
*All email replies across all mailboxes in one threaded view*

| Section | What It Does | Status |
|---|---|---|
| All | Every reply across all campaigns and mailboxes, threaded format | NEW |
| Unread | Replies not yet actioned by any team member | NEW |
| Assigned | Replies assigned to specific team members | NEW |
| Positive | Hot leads â€” interested replies classified by AI ReplyAgent | NEW |
| AI Reply Assistant | AI-generated suggested reply draft per conversation | NEW |

---

### NEW MODULE â€” Deliverability
*Protect sender reputation and ensure inbox placement*

| Section | What It Does | Status |
|---|---|---|
| Mailbox Dashboard | Health per mailbox: send volume, bounce rate, spam rate, warmup status | EXTEND |
| Warmup | P2P email warmup network â€” auto-sends and replies to build reputation | NEW |
| Domains | Sending domain management â€” add domains, view mailboxes per domain | NEW |
| DNS Config | SPF, DKIM, DMARC validation per domain with exact fix instructions | NEW |
| Spam Tests | Pre-send content analysis â€” detects spam words, missing unsubscribe links | NEW |
| Blacklists | Monitor if your domain or IP is on Spamhaus, Barracuda, SORBS, MXToolbox | NEW |
| Inbox Placement | Send test emails to seed accounts â€” shows Primary/Spam/Promotions tab | NEW |
| Reputation | Composite sender score 0-100 per domain â€” aggregated from all signals | NEW |

---

### NEW MODULE â€” Analytics
*Data and reporting across every part of the revenue operation*

| Section | What It Does | Status |
|---|---|---|
| Overview | Top-level: total leads, active campaigns, emails sent, reply rate, meetings | NEW |
| Campaign Analytics | Per-campaign deep dive with time-series charts | EXTEND |
| Email Analytics | Per-mailbox: daily volume, delivery rate, bounce rate, spam complaints | EXTEND |
| Mailbox Analytics | Mailbox health trends over time â€” spot declining reputation early | EXTEND |
| Revenue Analytics | Campaign â†’ Replies â†’ Meetings â†’ Opportunities â†’ Revenue attribution funnel | NEW |
| Automation Analytics | Workflow execution rates, drop-off per node, success vs error counts | EXTEND |

---

### EXTEND MODULE â€” Automations â†’ AI + Scraper Upgrade
*Extend existing Automations module with AI agents and new scrapers*

| Section | What It Does | Status |
|---|---|---|
| Domain Intelligence | Existing 4-tier AI domain enrichment â€” keep as-is | LIVE |
| LinkedIn Profile Agent | Existing LinkedIn scraper â€” enhance with follow-up DM automation | EXTEND |
| Email Photo Scraper | Existing Gmail photo scraper â€” add bulk dashboard and quality scoring | EXTEND |
| Google Maps Scraper | Scrape Google Maps by keyword and location â€” extract business data | NEW |
| Website Scraper | Visit company websites â€” extract contact email, phone, description | NEW |
| Scraper Scheduler | Configure which scraper runs on schedule â€” daily/weekly per source | NEW |

---

### EXTEND MODULE â€” Query Chain â†’ Visual Workflow Builder
*Upgrade existing Query Chain workflows to visual drag-and-drop builder*

| Section | What It Does | Status |
|---|---|---|
| Master Flows | Existing master flows â€” migrate to visual canvas | EXTEND |
| WorkFlows | Existing workflows â€” keep as-is, add visual builder | EXTEND |
| Workflow Builder | React Flow visual canvas â€” trigger â†’ condition â†’ action nodes | NEW |
| Triggers | Configure workflow triggers: new lead, email opened, reply received, stage changed | EXTEND |
| Logs | Full workflow execution log per run, per node | EXTEND |

---

### NEW MODULE — Meetings
*Calendar booking system integrated with prospect pipeline*

| Section | What It Does | Status |
|---|---|---|
| Calendar | Connect Google Calendar or Outlook — view all upcoming meetings | NEW |
| Bookings | Public booking page — prospects choose slot from email link | NEW |
| Meeting Types | 15-min intro, 30-min demo, 60-min deep-dive — each with unique URL | NEW |
| Availability | Set available days, hours, buffer time — timezone-aware | NEW |

---

### NEW MODULE — AI Intelligence & Copilot Suite
*All AI-powered tools & Natural Language MCP Copilot in one module*

| Section | What It Does | Status |
|---|---|---|
| AI Revenue Copilot | Central natural language interface (Ctrl+K). Talk directly to 100 Cr database, build campaigns, and query analytics | NEW (MCP Core) |
| Natural Language Lead Search | Search leads via plain English ("CTOs of SaaS companies in India with 500+ staff") → auto-converts to OpenSearch query | NEW (MCP Search) |
| AI Smart CSV Mapping | Auto-detects and maps chaotic CSV headers (`fname`, `org_name`, `desig`) to standard schema on upload | NEW (MCP Import) |
| AI Campaign Builder | "Create campaign for Fintech VPs" → auto-finds leads + writes 4-step sequence + sets up with 1-click human approval | NEW (MCP Outreach) |
| AI Data Quality & Dedup Advisor | Explains database health, duplicate clusters, and recommends PySpark optimization actions | NEW (MCP PySpark) |
| AI Data Analyst (Ask Your Data) | Ask conversational questions ("Which industry has the best reply rate?") → queries stats & generates chart | NEW (MCP Analytics) |
| Email Writer | CopywriterAgent — generates multi-step email sequences with subject lines and CTAs | NEW |
| Personalization | PersonalizationAgent — 1:1 icebreaker per lead at bulk scale | NEW |
| Lead Research | ResearchAgent — company/person intelligence brief from live web scraping | EXTEND |
| Lead Scoring | ScoringAgent — ICP score 0-100 per lead based on firmographic fit | NEW |
| Reply Assistant | ReplyAgent — suggested reply draft per incoming email in Unibox | NEW |
| AI Settings | Choose LLM model (OpenRouter), set token budgets, enforce human approval before sends | NEW |

---

### NEW MODULE — Autonomous AI Campaign Pipeline
*One natural language command triggers a fully automated 7-step outreach pipeline — from lead discovery to final report — with a mandatory human approval gate before any email is sent*

| Section | What It Does | Status |
|---|---|---|
| Campaign Command Center | Natural language input box — user types target criteria and the AI orchestrator plans the full campaign | NEW |
| Step 1: AI Lead Fetch | MCP `search_leads()` queries OpenSearch on 100 Cr records using parsed filter JSON | NEW |
| Step 2: Lead Batching | MCP `create_lead_batches()` groups fetched leads into 500-per-batch sets and saves to PostgreSQL | NEW |
| Step 3: Email Template Generator | MCP `generate_email_sequence()` calls CopywriterAgent — writes 4-step sequence with subject lines and CTAs | NEW |
| Step 4: Pre-Send Spam Test | MCP `run_spam_test()` checks SpamAssassin score, DNS (SPF/DKIM/DMARC), spam trigger words, unsubscribe link, image ratio | NEW |
| Step 5: Human Approval Gate | AI shows full campaign preview — leads found, email draft, spam score, send schedule. Nothing sends until user clicks APPROVE | NEW |
| Step 6: Automated Email Sending | MCP `launch_campaign()` pushes jobs to BullMQ → email-delivery-worker sends via Gmail OAuth2/SMTP at max 500/day/mailbox | NEW |
| Step 7: Live Monitoring | Gmail PubSub + IMAP Sync tracks delivery in real time. BounceDetector classifies hard/soft bounces. ReplyAgent classifies replies | NEW |
| Step 8: AI Campaign Report | MCP `get_campaign_report()` collects Sent / Delivered / Opened / Clicked / Replied / Bounced / Positive / Negative and AI writes summary | NEW |

**Full Pipeline Flow:**

```
USER COMMAND (Natural Language)
"Send emails to IT companies, 500-50M employees, named XYZ"
                    │
                    ▼
         LangGraph AI Orchestrator
         (Parses intent, builds execution plan)
                    │
    ┌───────────────┼──────────────────┬──────────────────┐
    ▼               ▼                  ▼                  ▼
 STEP 1          STEP 2             STEP 3             STEP 4
Lead Fetch      Batch Leads       Write Email        Spam Test
MCP Tool        MCP Tool          Templates          Before Send
    │               │             MCP Tool           MCP Tool
    ▼               ▼                │                  │
OpenSearch      500/batch         CopywriterAgent    SpamAssassin
100 Cr query    PostgreSQL        4-step sequence    + DNS Check
Results         saved             Subject + CTA      SPF/DKIM Score
                    │
                    ▼
         ⚠️ HUMAN APPROVAL GATE
      AI shows: leads found, email preview,
      spam score, send schedule estimate.
      Pipeline PAUSES. Nothing sends until
      user clicks APPROVE.
                    │
                    ▼
         STEP 5: EMAIL SENDING
         BullMQ → email-delivery-worker
         Gmail OAuth2 + Mailcow SMTP
         Max 500/day/mailbox (Redis limiter)
         Business hours only, timezone-aware
                    │
                    ▼
         STEP 6: LIVE MONITORING
         Gmail PubSub + IMAP Sync
         Bounce Detection + Suppression
         ReplyAgent: Positive / Neutral / Negative
                    │
                    ▼
         STEP 7: AI CAMPAIGN REPORT
         Sent · Delivered · Opened · Clicked
         Replied · Bounced · Unsubscribed
         Positive Replies · Campaign Health Score
         AI written natural language summary
         + recommended next actions
```

**Technology Stack for This Module:**

| Step | Technology |
|---|---|
| Natural language parsing | LangGraph StateGraph + LangChain (FastAPI) |
| Lead fetch from 100 Cr DB | MCP `search_leads()` → OpenSearch |
| Lead batching | MCP `create_lead_batches()` → PostgreSQL |
| Email sequence writing | MCP `generate_email_sequence()` → CopywriterAgent (Claude 3.5 Sonnet) |
| Spam testing | MCP `run_spam_test()` → SpamAssassin + DNS validation |
| Human approval gate | LangGraph interrupt → Next.js UI approval dialog |
| Email sending | MCP `launch_campaign()` → BullMQ → email-delivery-worker |
| Bounce detection | gmail-pubsub-worker + BounceDetector + SuppressionService |
| Reply classification | ReplyAgent (LangGraph + GPT-4o) |
| Final report | MCP `get_campaign_report()` → PostgreSQL + AI summary |

---

### NEW MODULE â€” Integrations
*Connect RevenueOS to external tools*

| Section | What It Does | Status |
|---|---|---|
| CRM | Two-way sync with HubSpot or Salesforce â€” prospects, activities, deals | NEW |
| Calendar | Connect Google Calendar or Outlook for meeting sync | NEW |
| Automation | Zapier or Make.com â€” trigger external workflows from RevenueOS events | NEW |
| API and Webhooks | REST API access and inbound webhook configurator | NEW |

---

### NEW MODULE â€” Team
*Workspace member management and audit trail*

| Section | What It Does | Status |
|---|---|---|
| Members | All workspace users â€” invite, assign roles, remove | EXTEND (exists in Query Nest) |
| Roles and Permissions | Define what each role can see and do â€” custom roles supported | EXTEND |
| Activity | Audit log â€” who did what and when across the entire workspace | NEW |

---

### NEW MODULE â€” Billing
*Subscription, usage, and credit management*

| Section | What It Does | Status |
|---|---|---|
| Plan | Current plan, features included, upgrade or downgrade | NEW |
| Usage | This month usage vs plan limits â€” emails, enrichments, verifications | NEW |
| Credits | Credit balance and transaction history | NEW |
| Invoices | Past invoices with PDF download â€” Stripe-powered | NEW |

---

### NEW MODULE â€” Settings
*Workspace and account configuration*

| Section | What It Does | Status |
|---|---|---|
| Workspace | Name, logo, timezone, default sender name, booking page domain | NEW |
| Profile | Personal name, email, password, photo | NEW |
| Notifications | Which events trigger email or in-app notifications | NEW |
| Security | 2-Factor Authentication, SSO login, API key management | NEW |

---

## MODULE STATUS SUMMARY

| # | Module | Sections Live | Sections to Add | Status |
|---|---|---|---|---|
| 1 | Filters (SuperSearch) | 18 | 8 | EXTEND |
| 2 | Email System (Campaigns) | 8 | 4 | EXTEND |
| 3 | Query Chain (Workflows) | 2 | 3 | EXTEND |
| 4 | Query Nest (Data Ops) | 4 | 0 | KEEP |
| 5 | CRUD Operations | 3 | 0 | KEEP |
| 6 | Automations (AI + Scrapers) | 3 | 3 | EXTEND |
| 7 | Queue Management Module | 1 | 0 | KEEP |
| 8 | Developer Mode | 5 | 0 | KEEP (Internal) |
| 9 | Dashboard | 0 | 5 | NEW |
| 10 | Prospects | 0 | 8 | NEW |
| 11 | Companies | 0 | 3 | NEW |
| 12 | Lists | 0 | 3 | NEW |
| 13 | Unified Inbox (Unibox) | 0 | 5 | NEW |
| 14 | Deliverability | 0 | 8 | NEW |
| 15 | Analytics | 0 | 6 | NEW |
| 16 | Meetings | 0 | 4 | NEW |
| 17 | AI Intelligence | 0 | 8 | NEW |
| 18 | Integrations | 0 | 4 | NEW |
| 19 | Team | 0 | 3 | NEW |
| 20 | Billing | 0 | 4 | NEW |
| 21 | Settings | 0 | 4 | NEW |
| **TOTAL** | | **44 Live** | **83 New** | **127 Total Sections** |

---

## TECHNOLOGY STACK

### Core Platform

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15 (App Router) | All UI, pages, SSR, routing |
| UI Components | shadcn/ui + Radix UI + Tailwind CSS v4 | Accessible, premium design system |
| State Management | Zustand + TanStack Query | Global state + server data caching |
| Real-time | Socket.io | Live inbox, queue progress, activity feed |
| Visual Builder | React Flow | Workflow canvas + sequence step builder |
| Email Editor | TipTap Rich Text Editor | Variable insertion, formatting, preview |
| Charts | Recharts | Campaign and revenue analytics charts |
| Backend API | NestJS (TypeScript) â€” Modular Monolith | Auth, campaigns, billing, CRM, inbox |
| AI + Scraping Service | FastAPI (Python) | Google Maps scraper, website scraper, all 8 AI agents |
| AI Orchestration | LangGraph (Python) | Stateful multi-agent pipeline with human-in-the-loop |
| AI Agent Framework | LangChain (Python) | Chains, tools, prompts, memory, output parsing per agent |
| Process Manager | PM2 (API cluster + all workers) | Zero-downtime reload, per-worker RAM limits |
| Reverse Proxy | Nginx + SSL (Certbot / Let's Encrypt) | Route Next.js + NestJS + FastAPI, SSL termination |

---

### Data Layer

| Layer | Technology | Purpose |
|---|---|---|
| Lead Database | MongoDB (Sharded) | 100 Cr+ contacts and companies across planetary shards |
| MongoDB Read Replicas | MongoDB Replica Sets | Heavy batch jobs read from replica â€” primary stays fast |
| Operational Database | PostgreSQL + Prisma | Auth, campaigns, billing, inbox, CRM, workflows |
| Search and Filter | OpenSearch (3-node cluster) | Sub-second search and filtering on 100 Cr records |
| Analytics Database | ClickHouse | Campaign and revenue analytics aggregations (Phase 2) |
| Cache and Queues | Redis 64 GB + BullMQ | Background job queues, rate limiters per mailbox |
| File Storage | MinIO (self-hosted S3) | Exported CSV files, email attachments, scraped data |

---

### Infrastructure

| Layer | Technology | Purpose |
|---|---|---|
| Event Backbone | Apache Kafka | All system events flow through Kafka â€” decouples every service |
| Batch Processing | Apache Spark (PySpark) | 100 Cr dedup, collection mapping, lead scoring, analytics at scale |
| Spark Job Trigger | Apache Livy REST API | Submit Spark jobs from Node.js workers |
| Containerization | Docker + Docker Compose | Self-hosted multi-service orchestration |
| Monitoring | Grafana + Prometheus | Server metrics, queue depth, request rates |
| Log Aggregation | Grafana Loki | Centralized logs from all PM2 workers |
| Error Tracking | Sentry (self-hosted) | Application error tracking |

---

### Email Infrastructure

| Component | Technology |
|---|---|
| Gmail Sending | Gmail OAuth2 + Google APIs |
| SMTP Sending | Mailcow + Nodemailer |
| IMAP Sync | node-imap + mailparser |
| Reply Detection | Google Cloud PubSub + Gmail Watch API |
| Rate Limiting | Redis per-mailbox distributed limiter |
| Bounce Detection | BounceDetector + IMAP header parsing |
| Open Tracking | 1x1 pixel + Kafka event |
| Click Tracking | Redirect URL + Kafka event |

---

### AI and Agents (FastAPI + LangChain + LangGraph)

| Agent | Framework | Model | Job |
|---|---|---|---|
| ResearchAgent | LangGraph StateGraph | Claude / GPT-4o via OpenRouter | Company and person intelligence brief â€” web search + Jina + Playwright tools |
| CopywriterAgent | LangChain SequentialChain | Claude 3.5 Sonnet via OpenRouter | Multi-step email sequence with subject lines, body, CTA |
| PersonalizationAgent | LangChain MapChain | GPT-4o mini via OpenRouter | Bulk 1:1 icebreaker per lead â€” parallel execution |
| ScoringAgent | LangChain StructuredOutput | GPT-4o + custom scoring logic | ICP lead score 0-100 â€” JSON schema enforced output |
| ReplyAgent | LangGraph + ConversationMemory | GPT-4o via OpenRouter | Reply classification + context-aware draft suggestion |
| EnrichmentAgent | LangGraph 4-tier waterfall | GPT-4o + Jina Reader + Playwright | Static lookup â†’ Playwright scrape â†’ Jina â†’ LLM extraction |
| VerificationAgent | No LLM â€” SMTP TCP handshake | N/A | Live email validity: MX lookup â†’ SMTP handshake â†’ parse response |
| CampaignGeneratorAgent | LangGraph multi-step | Claude 3.5 Sonnet via OpenRouter | Plain text brief â†’ audience filter â†’ sequence â†’ subject lines |
| AI Orchestrator | LangGraph AgentOrchestrator | N/A | Routes jobs to agents, manages state, retry, caching, human approval |
| LLM Router | OpenRouter | Multi-model | Primary model fails â†’ auto-fallback to next model |
| AI Cache | PostgreSQL ai_research table | N/A | Caches LLM output per domain. Same domain never billed twice |

---

### Scraping Infrastructure

| Component | Technology |
|---|---|
| Browser Automation | Playwright (Node.js) |
| Anti-Detection | puppeteer-extra-plugin-stealth |
| Content Extraction | Jina Reader API |
| AI Data Extraction | OpenRouter structured output |
| Browser Pool Limit | Max 5 concurrent browsers per worker |

---

### Background Workers (All PM2 Managed)

| Worker | Job |
|---|---|
| email-delivery-worker | Campaign email sending via Gmail or SMTP |
| drift-worker | Drip sequence step dispatch |
| email-sync-worker | IMAP reply and thread sync |
| gmail-pubsub-worker | Google PubSub bounce and reply processing |
| bounce-detection-worker | Bounce classification and suppression |
| dedup-worker | Triggers Spark dedup job via Livy API |
| mapping-worker | Triggers Spark collection mapping job |
| export-worker | Triggers Spark export job, uploads to MinIO |
| enrichment-worker | 4-tier domain enrichment agent |
| google-maps-scraper-worker | Google Maps business scraping |
| website-scraper-worker | Company website data extraction |
| linkedin-followup-worker | LinkedIn connection and DM automation |
| gmail-photo-scraper-worker | Gmail profile photo enrichment |
| verification-worker | SMTP email verification |
| warmup-worker | P2P email warmup automation |
| ai-research-worker | ResearchAgent, PersonalizationAgent, ScoringAgent |
| ai-campaign-worker | CopywriterAgent, CampaignGeneratorAgent |
| analytics-worker | Nightly Spark analytics aggregation trigger |
| spark-job-trigger-worker | Master Spark job launcher and monitor |
| audience-queue-worker | Bulk audience assignment to campaigns |

---

## PLATFORM CAPABILITIES

| Capability | Target |
|---|---|
| Lead Database Capacity | 100 Cr+ records (1 Billion+) |
| Concurrent User Workloads | 100+ simultaneous heavy operations |
| Email Sending Volume | 10 lakh (1 Million) emails per day |
| Search Response Time | Sub-second on 100 Cr records |
| Deduplication Speed | 100 Cr records in 20-45 minutes (Spark) |
| Email Verification Speed | 1 million emails in 15-25 minutes |
| Export Speed | 50 Cr records streaming to CSV without crash |
| Deployment | Self-hosted on own server infrastructure |
| Data Isolation | Per-workspace â€” multi-tenant safe |

---

## BUILD PHASES

| Phase | Focus | Timeline |
|---|---|---|
| Phase 1 | Foundation: Multi-tenant, Auth, PostgreSQL, Kafka setup | Weeks 1-3 |
| Phase 2 | Core Campaigns: Unibox, Visual Sequence Builder, A/B Testing | Weeks 4-7 |
| Phase 3 | SuperSearch: Intent, Technologies, Job Changes, Verification, Credits | Weeks 8-11 |
| Phase 4 | Deliverability: Warmup, DNS, Spam Tests, Blacklists, Inbox Placement | Weeks 12-14 |
| Phase 5 | Automation: Visual Workflow Builder, Event-driven triggers | Weeks 15-17 |
| Phase 6 | AI Intelligence: All 8 agents, Campaign Generator, Lead Scoring | Weeks 18-21 |
| Phase 7 | Revenue Layer: Meetings, Pipeline CRM, Revenue Analytics | Weeks 22-25 |
| Phase 8 | Enterprise: Billing, SSO, Audit Logs, Integrations, Super Admin | Weeks 26-30 |

---

---

## FINAL TECHNOLOGY MAP

| Service | Technology | Role |
|---|---|---|
| Frontend | Next.js 15 (TypeScript) | All UI, pages, components |
| Backend API | NestJS (TypeScript) | Auth, campaigns, billing, inbox, CRM, workspaces, settings |
| AI + Scraping Service | FastAPI (Python) | Google Maps scraper, website scraper, all 8 AI agents |
| AI Agent Framework | LangChain (Python) | Chains, tools, prompts, memory, output parsing |
| AI Orchestration | LangGraph (Python) | Stateful multi-agent graph with conditional edges, human-in-the-loop |
| Event Backbone | Apache Kafka | All system events. NestJS, FastAPI, Spark all connect via Kafka |
| Batch Processing | Apache Spark (PySpark) | Dedup, mapping, scoring, analytics, export on 100 Cr records |
| Spark Job Trigger | Apache Livy REST API | Submit Spark jobs from Node.js BullMQ worker |
| Lead Database | MongoDB Sharded | 100 Cr+ leads and companies across planetary shards |
| Operational Database | PostgreSQL + Prisma | Auth, campaigns, billing, inbox threads, CRM, audit logs |
| Search and Filter | OpenSearch (3-node) | Sub-second search and filter on 100 Cr records |
| Analytics Database | ClickHouse | Campaign and revenue aggregations (Phase 7+) |
| Cache and Queues | Redis 64 GB + BullMQ | Job queues, per-mailbox rate limiters, Bloom filter |
| File Storage | MinIO (self-hosted S3) | Exported CSV, attachments, scraped files |
| Process Manager | PM2 | All Node.js workers + NestJS API managed as separate processes |
| Reverse Proxy | Nginx + Certbot SSL | Routes Next.js + NestJS + FastAPI, SSL termination |
| Containerization | Docker + Docker Compose | Self-hosted multi-service orchestration |
| Monitoring | Grafana + Prometheus + Loki | Server metrics, queue depth, centralized logs |
| Error Tracking | Sentry (self-hosted) | Application errors from all services |

---

## COMPLETE SIDEBAR — ALL 21 MODULES WITH SECTIONS

### EXISTING MODULES (Live — Keep Exact Names)

| Module | Sections (Live) |
|---|---|
| **Filters** | Contacts, Companies, Zoom Products, Need To Action, Zoom, Apollo, Apollo Products, LinkedIn Products, G2 Products, MSPs Products, MSSPs Products, OutSourcing DB, DLS LI DB, Karur DB, Temp Master Leads, Temp Master Accounts, Others, Add Products |
| **Email System** | Mail Config, Engage, Campaigning System, Email Delivery, Drift Email, Email Bounce Reports, Email Sent Status, Bounce Update |
| **Query Chain** | Master Flows, WorkFlows |
| **Query Nest** | Insert, Add Users, Company Mapping, Bulk Update |
| **CRUD Operations** | Create, Update, Delete |
| **Automations** | Domain Intelligence, LinkedIn Profile Agent, Email Photo Scraper |
| **Queue Management Module** | Queue Control Center |
| **Developer Mode** *(internal only)* | Token Management, Module Management, Section Management, Permissions, Users |

---

### NEW + EXTENDED MODULES (To Build)

| # | Module | Sections | Status |
|---|---|---|---|
| 1 | **Dashboard** | Overview, Revenue Dashboard, Campaign Performance, Activity Feed, Tasks / Action Center | NEW |
| 2 | **Filters** *(extend)* | + Intent, Technologies, Job Changes, Lookalikes, Saved Searches, Enrichment, Verification, Credits | EXTEND |
| 3 | **Prospects** | All Prospects, My Prospects, Replied, Positive, Meetings, Bounced, Unsubscribed, Suppression List | NEW |
| 4 | **Companies** | All Companies, Company Technologies, Enrichment | NEW |
| 5 | **Lists** | Lead Lists, Smart Lists, Suppression Lists | NEW |
| 6 | **Email System** *(extend)* | + Sequence Builder (Visual), Email Editor, A/B Tests, Templates | EXTEND |
| 7 | **Unified Inbox (Unibox)** | All, Unread, Assigned, Positive, AI Reply Assistant | NEW |
| 8 | **Deliverability** | Mailbox Dashboard, Warmup, Domains, DNS Config, Spam Tests, Blacklists, Inbox Placement, Reputation | NEW |
| 9 | **Analytics** | Overview, Campaign Analytics, Email Analytics, Mailbox Analytics, Revenue Analytics, Automation Analytics | NEW |
| 10 | **Query Chain** *(extend)* | + Workflow Builder (Visual), Triggers, Logs | EXTEND |
| 11 | **Meetings** | Calendar, Bookings, Meeting Types, Availability | NEW |
| 12 | **AI Intelligence** | AI Assistant, Email Writer, Personalization, Lead Research, Lead Scoring, Campaign Generator, Reply Assistant, AI Settings | NEW |
| 13 | **Automations** *(extend)* | + Google Maps Scraper, Website Scraper, LinkedIn Follow-up Agent (enhance), Gmail Photo Enrichment (enhance), Scraper Scheduler | EXTEND |
| 14 | **Integrations** | CRM (HubSpot / Salesforce), Calendar, Automation (Zapier / Make), API and Webhooks | NEW |
| 15 | **Team** | Members, Roles and Permissions, Activity | NEW |
| 16 | **Billing** | Plan, Usage, Credits, Invoices | NEW |
| 17 | **Settings** | Workspace, Profile, Notifications, Security | NEW |

---

### SECTION COUNT SUMMARY

| Category | Modules | Sections |
|---|---|---|
| Live Today | 8 | 44 |
| New to Build | 9 | 57 |
| Existing to Extend | 4 | 26 |
| **Total Target** | **21** | **127** |

---

## SERVICE COMMUNICATION MAP

`
Browser
  │
  ▼
Nginx (reverse proxy + SSL)
  ├──► Next.js :3000        (frontend pages + SSR)
  ├──► NestJS API :4000     (all user-facing REST API)
  └──► FastAPI :8001        (scraping + AI agents — internal only)

NestJS API
  ├──► PostgreSQL           (campaigns, billing, auth, CRM)
  ├──► Redis + BullMQ       (push jobs to worker queues)
  ├──► Kafka Producer       (publish events: email.sent, lead.created)
  └──► OpenSearch           (all search/filter queries)

FastAPI Service
  ├──► Playwright (Python)  (Google Maps + website scraping)
  ├──► LangChain / LangGraph (all 8 AI agent pipelines)
  ├──► OpenRouter           (LLM API — multi-model)
  ├──► Jina Reader API      (web content extraction)
  ├──► Kafka Consumer       (receives jobs from NestJS via Kafka)
  └──► Kafka Producer       (publishes results back to NestJS)

Apache Kafka (event backbone)
  ├──► NestJS publishes and consumes
  ├──► FastAPI publishes and consumes
  └──► Spark reads from Kafka for batch triggers

Apache Spark (batch processing)
  ├──► Reads from MongoDB Replica (dedup, mapping, export)
  ├──► Writes to MongoDB Primary (dedup results, scored leads)
  ├──► Writes to PostgreSQL (analytics aggregations)
  └──► Writes to MinIO (exported CSV files)

PM2 Workers (all Node.js — separate processes)
  ├──► email-delivery-worker   → Gmail OAuth2 / Mailcow SMTP
  ├──► drift-worker            → BullMQ sequence steps
  ├──► email-sync-worker       → IMAP thread sync
  ├──► gmail-pubsub-worker     → Google PubSub replies/bounces
  ├──► bounce-detection-worker → Suppression list updates
  ├──► verification-worker     → SMTP pinger
  ├──► warmup-worker           → P2P warmup pool
  ├──► dedup-worker            → Triggers Spark via Livy API
  ├──► mapping-worker          → Triggers Spark via Livy API
  ├──► export-worker           → Triggers Spark → MinIO upload
  ├──► audience-queue-worker   → Campaign audience assignment
  └──► spark-job-trigger-worker → Livy API job manager
`

---

*RevenueOS Platform Plan | Version 2.1 | September 2026*
*Current: 44 live sections across 8 modules*
*Target: 127 total sections across 21 modules*
*Tech: Next.js + NestJS + FastAPI + LangChain + LangGraph + Kafka + Spark + OpenSearch + MongoDB + PostgreSQL + Redis + MinIO*

