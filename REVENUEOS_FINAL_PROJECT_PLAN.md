# RevenueOS — Final Project Plan and Developer Blueprint
## Current Platform Upgrade Path to Full RevenueOS SaaS

> **Status**: Current codebase is estimated at ~40-65% of the full RevenueOS spec across the 4 pillars.
> This document maps what **already exists**, what **must be built**, what **agents are needed**, and the **exact build order** to reach production-grade RevenueOS.

---

## PART 1 — What Is Already Built (KEEP AS-IS)

| Module / Feature | Current File(s) | RevenueOS Pillar |
|---|---|---|
| Multi-DB Connection Manager | src/lib/mongodb.js, src/config/database.js | Foundation |
| JWT Auth + RBAC Skeleton | AuthService.js, PermissionService.js | Auth / Identity |
| Dynamic Token Routing (MVC) | SkeletonService.js, SystemRouteController.js | API Layer |
| DataTable Server-Side Processing | TableHelper.js, DataService.js | API Layer |
| Multi-Source Lead Filter Views | filters/contacts.js, companies.js, apollo.js, zoom.js | SuperSearch |
| Planetary Sharded Lead DBs | moon, mars, jupiter, earth, mercury, saturn, neptune | SuperSearch |
| CSV Ingestion (1Cr+ records) | SimpleImportService.js, queue-worker.js | SuperSearch |
| Schema Field Mapping | mapping-worker.js, querynest/mapping.js | SuperSearch |
| Deduplication Engine O(1) | DuplicateRemovalService.js, deduplicate-worker.js | SuperSearch |
| Domain Enrichment (4-Tier AI) | DomainEnrichmentAgent.js, HeadlessScraperService.js, LLMService.js | Automation + AI |
| Gmail Photo Scraper (Avatar + Profile) | GmailPhotoScraper.js, gmail-photo-scraper-worker.js, OpenSearchService.js | Automation + AI / Data Enrichment |
| Google Maps Scraper | GoogleMapsScraperService.js (NEW), google-maps-scraper-worker.js (NEW) | SuperSearch / Data Acquisition |
| Website Scraper (Generic) | HeadlessScraperService.js (EXTEND), website-scraper-worker.js (NEW) | SuperSearch / Data Enrichment |
| LinkedIn Lead Follow-up Agent | LinkedInFollowupAgent.js (NEW), linkedin-followup-worker.js (NEW) | Engagement / Automation + AI |
| Multi-Account Email Config | mailconfig.js, GoogleAuthCtrl.js | Engagement |
| Google OAuth2 Inbox Connect | GmailUtility.js, GmailWatcherService.js | Engagement |
| Mailcow SMTP/IMAP Connect | MailcowImapService.js, mailcow-imap-worker.js | Engagement |
| Email Delivery Worker | EmailDeliveryService.js, email-delivery-worker.js | Engagement |
| Redis Distributed Rate Limiter | RedisRateLimiter.js, AccountRateLimiter.js | Engagement |
| RFC Message-ID Attribution | MessageIdService.js | Engagement |
| Drift Drip Sequences | driftemail.js, drift-worker.js, SendDriftEmailJob.js | Engagement |
| Google Cloud PubSub Webhook | gmail-pubsub-worker.js | Engagement |
| Smart Reply Classifier | SmartClassifier.js, AutoReplyDetector.js | Automation + AI |
| Bounce Detection + Suppression | BounceDetector.js, SuppressionService.js | Deliverability |
| Open/Click Pixel Tracking | /api/track/open.js | Engagement |
| MasterFlows Orchestration | MasterFlowService.js, WorkFlowService.js, ProcessFlowHelper.js | Automation |
| Queue Control Center UI | queuecontrolcenter.js, QueueManagerService.js | Platform Ops |
| CSV Export Engine | export-worker.js, ExportService.js | SuperSearch |
| Bulk Update Engine | bulkupdate-worker.js, querynest/bulkupdate.js | Data Ops |
| Cross-DB Transfer | dbtransfer-worker.js | Data Ops |
| Need-to-Action Workspace | NeedToActionService.js, needtoaction.js | Prospects |
| Audience Management | BulkAudienceAssignmentService.js, audience-queue-worker.js | Engagement |
| OpenSearch Profile Indexing | OpenSearchService.js, OpenSearchClient.js | Search |
| Campaign Stats Service | CampaignStatsService.js | Analytics |
| Email Sync Service | EmailSyncService.js, email-sync-worker.js | Engagement |
| 15+ Background Queue Workers | All *-worker.js files | Platform Ops |
| PM2 Ecosystem Config | ecosystem.config.cjs | Platform Ops |
| Database Migration Runner | database/migrate.js, database/migrations/ | Foundation |
| Seed System | database/seeds/ | Foundation |

---

## PART 2 — Gap Analysis (What Is MISSING — Must Build)

| # | Module | Pillar / Area |
|---|---|---|
| 1 | Multi-Tenant Workspace System | Foundation |
| 2 | Super Admin Panel | Foundation / Platform Ops |
| 3 | SSO / OAuth Login (Google/Microsoft) | Auth |
| 4 | MFA Setup and Verification | Auth |
| 5 | Onboarding Wizard (8 steps) | UX / Onboarding |
| 6 | Buyer Intent Signals | SuperSearch |
| 7 | Technology Stack Detection | SuperSearch |
| 8 | Job Change Alerts | SuperSearch |
| 9 | Lookalike Search Engine | SuperSearch |
| 10 | Saved Searches (Smart Lists) | SuperSearch |
| 11 | Live SMTP Email Pinger (Verification) | SuperSearch |
| 12 | Credit / Usage Metering System | SuperSearch + Billing |
| 13 | Waterfall Enrichment Engine | SuperSearch |
| 14 | A/B Split Test Engine | Engagement |
| 15 | Unified Master Inbox (Unibox) | Engagement |
| 16 | Multichannel Sequence Steps | Engagement |
| 17 | Visual Workflow Builder (React Flow) | Automation |
| 18 | AI Cold Email Copywriter | Automation + AI |
| 19 | AI Icebreaker / Line-1 Generator | Automation + AI |
| 20 | AI Reply Drafter | Automation + AI |
| 21 | Predictive Lead Scoring Engine | Automation + AI |
| 22 | AI Campaign Generator | Automation + AI |
| 23 | AI Lead Research Orchestrator | Automation + AI |
| 24 | P2P Email Warmup Network | Deliverability |
| 25 | DNS Health Validator (SPF/DKIM/DMARC) | Deliverability |
| 26 | Pre-Send Spam Trigger Analyzer | Deliverability |
| 27 | Blacklist Monitoring (DNSBL) | Deliverability |
| 28 | Inbox Placement Seed List Tester | Deliverability |
| 29 | Domain Reputation Score | Deliverability |
| 30 | Meeting Booking System (Cal-like) | Meetings |
| 31 | Revenue Pipeline / CRM | Pipeline / Revenue |
| 32 | Opportunity Lifecycle Tracking | Pipeline / Revenue |
| 33 | Revenue Attribution Reporting | Analytics |
| 34 | Event-Driven Analytics Engine | Analytics |
| 35 | CRM Integrations (HubSpot/Salesforce) | Integrations |
| 36 | Zapier / Make.com Webhook Builder | Integrations |
| 37 | Integration Marketplace | Integrations |
| 38 | Billing + Stripe Subscriptions | Billing |
| 39 | Plan Entitlements and Feature Gates | Billing |
| 40 | Agency / White-Label Workspace | Enterprise |
| 41 | Audit Log System | Enterprise / Security |
| 42 | Data Export and GDPR Compliance | Compliance |
| 43 | Google Maps Business Scraper UI | SuperSearch / Data Acquisition |
| 44 | Generic Website Scraper + Configurator | SuperSearch / Data Enrichment |
| 45 | LinkedIn Lead Follow-up Agent (Connection Req + Message) | Engagement / Automation + AI |
| 46 | Gmail Photo Enrichment Dashboard (bulk pull + attach) | Automation + AI / Data Enrichment |
| 47 | Scraper Job Scheduler (cron-based, per-source config) | Platform Ops |
| 48 | Scraped Data Deduplication Pipeline (Maps + Web + LinkedIn) | Data Ops |

---

## PART 3 - AI Agents Architecture (8 Agents)

The platform is powered by 8 specialized AI agents in an orchestrated pipeline:

| # | Agent | Role and Responsibilities |
|---|---|---|
| 1 | ResearchAgent | Scrapes company website, LinkedIn, news, Crunchbase. Builds structured intelligence brief. Feeds: PersonalizationAgent, ScoringAgent |
| 2 | CopywriterAgent | Generates multi-step email sequences from ICPs. Creates subject lines, body copy, CTAs, A/B variants. Feeds: CampaignBuilder, SequenceSteps |
| 3 | PersonalizationAgent | Generates 1:1 icebreakers using ResearchAgent output. Customizes email body for each prospect in bulk. Feeds: EmailDeliveryService per lead |
| 4 | ScoringAgent | Scores leads 0-100 based on ICP fit, engagement, intent signals, job title, headcount, tech stack. Updates: lead_score field |
| 5 | ReplyAgent | Classifies incoming emails (Positive/OOO/Unsubscribe). Drafts suggested replies from thread context. Updates: conversation status, campaign state |
| 6 | EnrichmentAgent | Multi-tier waterfall: Static to Puppeteer to Jina to OpenRouter LLM. Already partially built in DomainEnrichmentAgent.js |
| 7 | VerificationAgent | Live SMTP handshake pinger + MX record validator. Returns: valid / risky / catch-all / invalid. Feeds: SuppressionService |
| 8 | CampaignGeneratorAgent | Generates full campaign from plain-language brief. Input: Target CTOs at SaaS in USA under 100 emp. Output: Sequence steps, subject lines, audience filter |

### Agent Orchestration Flow:

User Brief -> CampaignGeneratorAgent -> ResearchAgent -> [EnrichmentAgent, VerificationAgent] -> PersonalizationAgent -> CopywriterAgent -> ScoringAgent -> Campaign Queue -> Email Delivery -> ReplyAgent -> [Draft reply to Unibox, Update campaign state]


---

## PART 4 - Final Sidebar Navigation (EXISTS vs NEW vs EXTEND)

### DASHBOARD
- Overview (NEW - built on CampaignStatsService)
- Revenue Dashboard (NEW - pipeline attribution)
- Campaign Performance (EXISTS - engage.js, CampaignStatsService)
- Activity Feed (NEW - event stream timeline)
- Tasks / Action Center (EXISTS - needtoaction.js, extend)

### SUPERSEARCH
- People (EXISTS - contacts.js, enhance)
- Companies (EXISTS - companies.js, enhance)
- Advanced Search (EXISTS - multi-source filters, combine)
- Intent (NEW - buyer intent signal engine)
- Technologies (NEW - tech stack detection)
- Job Changes (NEW - job change alert feed)
- Lookalikes (NEW - seed company to find similar)
- Saved Searches (NEW - persist filter state as Smart Lists)
- Enrichment (EXISTS - DomainEnrichmentAgent, UI needed)
- Verification (NEW - VerificationAgent UI)
- Credits (NEW - credit ledger and usage metering)

### PROSPECTS
- All Prospects (EXISTS - contacts.js, extend with timeline)
- My Prospects (NEW - user-scoped prospect view)
- Replied (EXISTS - SmartClassifier marks replied)
- Positive (EXISTS - positive reply filter)
- Meetings (NEW - prospects with booked meetings)
- Bounced (EXISTS - bounceupdate.js)
- Unsubscribed (EXISTS - SuppressionService)
- Suppression (EXISTS - SuppressionService UI)

### COMPANIES
- All Companies (EXISTS - companies.js, extend)
- Company Technologies (NEW - tech stack per company)
- Enrichment (EXISTS - DomainEnrichmentAgent)

### LISTS
- Lead Lists (EXISTS - audience management, extend)
- Smart Lists (NEW - saved search + auto-update lists)
- Suppression Lists (EXISTS - SuppressionService)

### CAMPAIGNS
- All Campaigns (EXISTS - engage.js, extend)
- Sequence Builder (EXISTS - driftemail.js, extend with visual)
- Email Editor (EXISTS - TinyMCE TemplateEditor.js)
- A/B Tests (NEW - split test engine)
- Templates (EXISTS - /api/templates)
- Scheduling (EXISTS - emailscheduling.js)

### AUTOMATIONS
- All Workflows (EXISTS - masterflows.js, migrate to visual)
- Workflow Builder (NEW - React Flow visual canvas)
- Triggers (EXISTS - ProcessFlowHelper.js, extend)
- Logs (EXISTS - process-logs.js)

### INBOX (UNIBOX) - ALL NEW
- All (NEW - unified inbox view)
- Unread (NEW)
- Assigned (NEW)
- Positive (NEW)
- AI Reply Assistant (NEW - ReplyAgent draft suggestions)

### DELIVERABILITY
- Mailbox Dashboard (EXISTS - mailconfig.js, extend)
- Warmup (NEW - P2P warmup pool engine)
- Domains (NEW - domain management)
- DNS Config (NEW - SPF/DKIM/DMARC validator)
- Spam Tests (NEW - pre-send spam content analyzer)
- Blacklists (NEW - DNSBL monitoring)
- Inbox Placement (NEW - seed list delivery testing)
- Reputation (NEW - sender score dashboard)

### ANALYTICS
- Overview (EXISTS - dashboard, extend)
- Campaign Analytics (EXISTS - CampaignStatsService, extend)
- Email Analytics (EXISTS - emailsentstatus, extend)
- Mailbox Analytics (EXISTS - bounceupdate, extend)
- Revenue Analytics (NEW - pipeline attribution engine)
- Automation Analytics (EXISTS - process-logs, extend)

### MEETINGS - ALL NEW
- Calendar (NEW - calendar connections)
- Bookings (NEW - meeting booking pages)
- Meeting Types (NEW - 15/30/60min types)
- Availability (NEW - availability rules)

### AI - MOSTLY NEW
- AI Assistant (NEW - chat interface)
- Email Writer (NEW - CopywriterAgent UI)
- Personalization (NEW - PersonalizationAgent bulk runner)
- Lead Research (EXISTS - DomainEnrichmentAgent, extend)
- Lead Scoring (NEW - ScoringAgent UI)
- Campaign Generator (NEW - CampaignGeneratorAgent UI)
- Reply Assistant (NEW - ReplyAgent Unibox integration)
- AI Settings (NEW - model, cost controls, human approval)

### INTEGRATIONS - ALL NEW
- CRM: HubSpot, Salesforce
- Calendar: Google, Outlook
- Automation: Zapier, Make.com
- API and Webhooks

### TEAM
- Members (EXISTS - developer/users.js, extend)
- Roles and Permissions (EXISTS - permissions.js, extend)
- Activity (NEW - audit log viewer)

### BILLING - ALL NEW
- Plan (Stripe subscription integration)
- Usage (credit metering)
- Credits (credit ledger)
- Invoices (Stripe invoice list)

### SETTINGS
- Workspace (NEW - workspace name, logo, timezone)
- Profile (EXISTS - profile/profile.js)
- Notifications (NEW)
- Security (NEW - 2FA, SSO, API keys)

### DEVELOPER MODE (Keep for Internal Use)
- Tokens (EXISTS)
- Modules / Sections (EXISTS)
- Permissions (EXISTS)
- Queue Control Center (EXISTS)


---

## PART 5 - Phased Build Roadmap

### Phase 1 - Foundation (Weeks 1-3)
Goal: Secure multi-tenant SaaS base. Only infrastructure, no visible features yet.

| Task | Status | Action |
|---|---|---|
| Monorepo setup (apps/web, apps/api, apps/worker) | NEW | Create turborepo/nx monorepo |
| PostgreSQL schema + migrations | NEW | Migrate transactional data from MongoDB |
| MongoDB retain for lead shards | EXISTS | Keep moon/mars/jupiter shards as-is |
| Multi-Tenant workspaces table | NEW | Build workspace_id injection middleware |
| JWT Auth + Refresh Tokens | EXISTS | Migrate AuthService.js + harden |
| MFA Setup and Verification | NEW | Add TOTP + backup codes |
| SSO OAuth (Google, Microsoft) | NEW | Add OAuth2 social login |
| Role-Permission middleware | EXISTS | Extend PermissionService.js to workspace-scope |
| Audit Log System | NEW | Create audit_logs table + middleware hook |
| Redis + BullMQ Infrastructure | EXISTS | Upgrade Bull to BullMQ |
| API versioning /api/v1/ | NEW | Wrap all routes under versioned prefix |
| Seed tenant + test data | EXISTS | Extend existing seed scripts |

---

### Phase 2 - Core Engagement (Weeks 4-7)
Goal: Sellable outbound cold email platform (current system's strongest area).

| Task | Status | Action |
|---|---|---|
| Leads table + prospect views | EXISTS | Migrate contacts.js to workspace-scoped |
| Lead Lists + Smart Lists | PARTIAL | Extend BulkAudienceAssignmentService.js |
| CSV Import with deduplication | EXISTS | Keep SimpleImportService.js + DuplicateRemovalService.js |
| Campaign creation + sequence builder | EXISTS | Extend driftemail.js + MasterFlowService.js |
| Visual Sequence Builder (React Flow) | NEW | Rebuild sequence UI with node-based canvas |
| Email Editor (TinyMCE) | EXISTS | Keep TemplateEditor.js |
| Mailbox management + Gmail OAuth2 | EXISTS | Keep GoogleAuthCtrl.js + GmailUtility.js |
| SMTP/IMAP adapter (Mailcow) | EXISTS | Keep MailcowImapService.js |
| Email delivery worker | EXISTS | Keep EmailDeliveryService.js |
| Redis rate limiter | EXISTS | Keep RedisRateLimiter.js |
| RFC Message-ID attribution | EXISTS | Keep MessageIdService.js |
| Open/Click tracking pixels | EXISTS | Keep /api/track/open.js |
| UNIFIED INBOX (Unibox) | NEW | Build new threaded conversation UI |
| Bounce + suppression handling | EXISTS | Keep BounceDetector.js + SuppressionService.js |
| Google Cloud PubSub reply listener | EXISTS | Keep gmail-pubsub-worker.js |
| SmartClassifier (reply intent) | EXISTS | Keep SmartClassifier.js + extend for Unibox |
| A/B Split Test Engine | NEW | Build campaign_variants table + rotation logic |
| Email scheduling (timezone-aware) | EXISTS | Keep emailscheduling.js |

---

### Phase 3 - SuperSearch (Weeks 8-11)
Goal: Full B2B data acquisition and prospect discovery engine.

| Task | Status | Action |
|---|---|---|
| People/Companies search with filters | EXISTS | Enhance filter views with OpenSearch facets |
| Multi-source sharded DBs | EXISTS | Keep planetary DB architecture |
| Buyer Intent Signal Engine | NEW | Build intent signal collection + scoring |
| Technology Stack Detection | NEW | Scrape BuiltWith/Wappalyzer-style tech detection |
| Job Change Alert Feed | NEW | Monitor LinkedIn RSS / external signals |
| Lookalike Search | NEW | ML-based find similar to this company |
| Saved Searches / Smart Lists | NEW | Persist filter state, auto-refresh daily |
| Enrichment Center UI | EXISTS | Extend domain.js automation page to full UI |
| Live SMTP Verification (VerificationAgent) | NEW | Build SMTP handshake pinger microservice |
| Credit / Usage Metering System | NEW | Build credits, credit_transactions tables |
| Waterfall Enrichment | NEW | Chain multiple data providers with fallback |
| OpenSearch indexing for fast search | PARTIAL | Extend OpenSearchService.js for all leads |

---

### Phase 4 - Deliverability Engine (Weeks 12-14)
Goal: Protect sender reputation, ensure inbox placement.

| Task | Status | Action |
|---|---|---|
| Mailbox health dashboard | EXISTS | Extend mailconfig.js deliverability tab |
| P2P Email Warmup Network | NEW | Build warmup pool + peer send/receive workers |
| Domain Management | NEW | Build domains table + DNS record tracking |
| DNS Health Validator (SPF/DKIM/DMARC) | NEW | Build automated DNS lookup + recommendations |
| Pre-Send Spam Trigger Analyzer | NEW | Check email body for spam words before dispatch |
| DNSBL Blacklist Monitor | NEW | Poll Spamhaus/Barracuda APIs for domain/IP status |
| Inbox Placement Seed Tester | NEW | Route test emails through seed accounts across ESPs |
| Domain Reputation Score | NEW | Aggregate health score from all above signals |
| Bounce rate monitoring | EXISTS | Keep emailbouncereports.js + extend |

---

### Phase 5 - Automation Engine (Weeks 15-17)
Goal: Visual workflow builder for lifecycle automation.

| Task | Status | Action |
|---|---|---|
| Visual Workflow Builder | NEW | Build React Flow canvas with node types |
| Trigger System | PARTIAL | Extend ProcessFlowHelper.js with trigger events |
| Action Nodes | PARTIAL | Extend existing actions (email, tag, list, webhook) |
| Condition / Branch Nodes | PARTIAL | Extend MasterFlowService.js with conditions |
| Workflow execution logs | EXISTS | Extend process-logs.js |
| Event-driven architecture | NEW | Implement domain events (LeadCreated, EmailOpened, etc.) |
| Webhook builder (inbound/outbound) | NEW | Build webhook endpoint manager |
| Automation templates library | NEW | Pre-built workflow templates |

---

### Phase 6 - AI Intelligence Layer (Weeks 18-21)
Goal: Full AI agent ecosystem for research, writing, scoring, and reply handling.

| Task | Status | Action |
|---|---|---|
| ResearchAgent | PARTIAL | Extend DomainEnrichmentAgent.js + LLMService.js |
| CopywriterAgent | NEW | Build LLM-powered sequence email writer |
| PersonalizationAgent | NEW | Build bulk 1:1 icebreaker generator per lead |
| ScoringAgent | NEW | Build ICP scoring model (0-100 scale) |
| ReplyAgent | PARTIAL | Extend SmartClassifier.js + add draft generation |
| VerificationAgent | NEW | Build SMTP pinger microservice |
| CampaignGeneratorAgent | NEW | Build plain-language to campaign workflow |
| AI Email Writer UI | NEW | Build UI for CopywriterAgent |
| AI Personalization UI (bulk runner) | NEW | Build batch personalization dashboard |
| AI Lead Scoring dashboard | NEW | Build ScoringAgent results visualization |
| AI Settings (model, cost controls) | NEW | Build token budget, human approval mode |
| AI Research cache layer | NEW | Cache LLM outputs to ai_research table |

---

### Phase 7 - Revenue Layer (Weeks 22-25)
Goal: Full pipeline, meetings, and revenue attribution.

| Task | Status | Action |
|---|---|---|
| Meeting Booking System | NEW | Calendar connection + booking page builder |
| Meeting types (15/30/60min) | NEW | Build configurable meeting templates |
| Calendar connections (Google, Outlook) | NEW | OAuth calendar sync |
| Revenue Pipeline / CRM | NEW | Build pipelines, pipeline_stages, opportunities |
| Opportunity lifecycle tracking | NEW | Lead to Contacted to Replied to Qualified to Won/Lost |
| Revenue attribution reporting | NEW | Campaign to Meeting to Opportunity to Revenue report |
| Event analytics aggregation | NEW | Build daily_stats aggregation tables |

---

### Phase 8 - Enterprise and Platform Hardening (Weeks 26-30)
Goal: SSO, agency/white-label, Super Admin, billing, and production hardening.

| Task | Status | Action |
|---|---|---|
| Stripe Billing + Subscriptions | NEW | Build plan entitlements + credit system |
| Feature gates / usage limits | NEW | Middleware gates per plan tier |
| Super Admin Panel | NEW | Workspace management, monitoring, abuse controls |
| Agency / White-Label | NEW | Multi-workspace switcher + custom branding |
| SSO (SAML/OIDC) | NEW | Enterprise SSO integration |
| Audit log viewer UI | NEW | Searchable audit log for compliance |
| GDPR/CCPA data export and deletion | NEW | Data subject request workflows |
| CRM integrations (HubSpot, Salesforce) | NEW | Bi-directional sync adapters |
| Zapier / Make webhook integration | NEW | Outbound webhook configurator |
| Performance + load testing | NEW | k6 / Artillery load tests |
| OpenTelemetry observability | NEW | Centralized APM + error tracking |


---

## PART 6 - New Database Schema (PostgreSQL additions on top of existing MongoDB)

### Identity and Multi-Tenancy
- workspaces (id, name, slug, owner_id, plan_id, status, timezone)
- workspace_members (id, workspace_id, user_id, role, status)
- api_keys (id, workspace_id, key_hash, name, last_used_at)
- sessions (id, user_id, workspace_id, token_hash, expires_at)
- audit_logs (id, workspace_id, user_id, action, entity, changes, ip)

### SuperSearch
- intent_signals (id, company_id, topic, score, source, detected_at)
- technologies (id, name, category, website)
- company_technologies (id, company_id, technology_id, detected_at)
- job_changes (id, person_id, old_company, new_company, changed_at)
- saved_searches (id, workspace_id, user_id, name, filters, last_run_at)
- enrichment_jobs (id, workspace_id, target_id, status, result, cost_credits)
- email_verifications (id, email, status, confidence, mx_valid, smtp_valid)
- credits (id, workspace_id, balance, reserved)
- credit_transactions (id, workspace_id, type, amount, reason, created_at)

### Campaigns (New Additions)
- campaign_variants (id, campaign_id, step_id, variant_type, content, weight)
- ab_test_results (id, campaign_id, variant_id, opens, replies, winner)

### Deliverability
- domains (id, workspace_id, domain, spf_valid, dkim_valid, dmarc_valid)
- dns_records (id, domain_id, type, value, status, checked_at)
- warmup_accounts (id, workspace_id, mailbox_id, status, daily_volume)
- warmup_messages (id, sender_id, receiver_id, subject, body, sent_at)
- spam_tests (id, workspace_id, mailbox_id, score, issues, tested_at)
- blacklist_checks (id, domain_id, ip, list_name, listed, checked_at)
- inbox_placement (id, workspace_id, mailbox_id, provider, tab, tested_at)
- reputation_scores (id, workspace_id, domain_id, score, factors, scored_at)

### Unified Inbox
- conversations (id, workspace_id, lead_id, mailbox_id, thread_id, status)
- conversation_msgs (id, conversation_id, direction, body, ai_draft, sent_at)
- inbox_assignments (id, conversation_id, assigned_to, assigned_at)

### Automation
- workflow_runs (id, workflow_id, trigger_data, status, started_at)
- workflow_events (id, run_id, node_id, status, output, executed_at)

### AI
- ai_requests (id, workspace_id, agent, prompt_version, tokens_in, tokens_out)
- ai_research (id, workspace_id, target_id, content, model, cached_at)
- ai_personalizations (id, workspace_id, lead_id, icebreaker, generated_at)
- ai_scores (id, workspace_id, lead_id, score, factors, scored_at)
- ai_usage (id, workspace_id, month, tokens, cost_usd)

### Meetings and Pipeline
- meeting_types (id, workspace_id, name, duration_min, booking_url)
- meetings (id, workspace_id, lead_id, type_id, status, scheduled_at)
- pipelines (id, workspace_id, name, stages)
- opportunities (id, workspace_id, lead_id, stage, value, closed_at)
- revenue_events (id, workspace_id, opportunity_id, amount, event_type)

### Analytics (Aggregated)
- campaign_daily_stats (id, workspace_id, campaign_id, date, sent, opens, clicks, replies)
- email_daily_stats (id, workspace_id, mailbox_id, date, sent, bounces, opens)
- revenue_daily_stats (id, workspace_id, date, meetings, opportunities, revenue)

### Billing
- plans (id, name, price_monthly, price_annual, features JSONB)
- subscriptions (id, workspace_id, plan_id, status, current_period_end)
- invoices (id, workspace_id, stripe_id, amount, status, paid_at)
- usage_records (id, workspace_id, feature, quantity, recorded_at)

---

## PART 7 - Repository / Monorepo Structure

`
revenueos/
  apps/
    web/          <- Next.js 16 + React 19 + Tailwind + shadcn/ui
    api/          <- NestJS / Node.js TypeScript API server
    worker/       <- All BullMQ background workers
    admin/        <- Super Admin Next.js panel

  packages/
    ui/           <- Shared React component library
    database/     <- Prisma schema + migrations (PostgreSQL)
    mongodb/      <- MongoDB connection manager (planetary shards)
    auth/         <- JWT + OAuth + MFA utilities
    permissions/  <- RBAC middleware + workspace isolation
    email/        <- Email delivery adapters (Gmail/SMTP/IMAP)
    search/       <- OpenSearch index manager
    ai/
      agents/
        ResearchAgent.js
        CopywriterAgent.js
        PersonalizationAgent.js
        ScoringAgent.js
        ReplyAgent.js
        EnrichmentAgent.js      <- Extend DomainEnrichmentAgent.js
        VerificationAgent.js
        CampaignGeneratorAgent.js
      prompts/
      cache/
      AgentOrchestrator.js
    billing/      <- Stripe integration + credit metering
    analytics/    <- Event collection + aggregation engine
    integrations/ <- CRM / Calendar / Zapier adapters
    config/       <- Shared env + constants

  infra/
    docker/
    migrations/   <- PostgreSQL versioned migrations
    monitoring/   <- OpenTelemetry config

  docs/
    api/
    architecture/
    product/
`

---

## PART 8 - Developer Acceptance Criteria

- Every tenant request has workspace_id injected server-side, never from client
- Cross-tenant data access tests must return 403
- All campaign sends are idempotent (duplicate job = no duplicate email)
- Suppressed/unsubscribed leads cannot be re-enrolled accidentally
- Mailbox and domain daily limits are enforced centrally by Redis
- All background jobs are retryable and observable via Queue Control Center
- AI research output is cached in ai_research table, never re-charged for same domain
- AI agents never fabricate prospect facts, verified vs inferred data is labeled separately
- DNS/SPF/DKIM/DMARC checks run automatically on domain connect
- Warmup engine respects provider policies and anti-spam regulations
- Billing usage is metered per operation and reconciled daily
- All API endpoints are versioned under /api/v1/
- Production secrets are never committed to source control
- Audit logs capture all sensitive create/update/delete operations

---

## PART 9 - North Star Product Metrics

| Metric | Target | Measures |
|---|---|---|
| Qualified Leads Found | Growing MoM | SuperSearch value |
| Verified Leads (% of total) | Greater than 85% | Data quality |
| Emails Delivered (not bounced) | Greater than 95% | Sending infrastructure health |
| Positive Reply Rate | Greater than 8% | Outreach effectiveness |
| Meetings Booked | Growing MoM | Business outcome |
| Opportunities Created | Growing MoM | Pipeline impact |
| Revenue Attributed | Growing MoM | North-star commercial metric |
| Mailbox Health Score | Greater than 80 avg | Infrastructure quality |
| Workflow Success Rate | Greater than 99% | Automation reliability |
| AI Cost per Qualified Outcome | Decreasing | AI economics |

---

## PART 10 - Final Module Disposition Table

| Module | Decision | Priority |
|---|---|---|
| MongoDB Planetary Lead Shards | KEEP AS-IS | Core infrastructure |
| DomainEnrichmentAgent (4-Tier) | KEEP + Extend as Agent | Phase 3 + 6 |
| EmailDeliveryService + Workers | KEEP + Wrap in adapter | Phase 2 |
| RedisRateLimiter | KEEP AS-IS | Phase 2 |
| BounceDetector + Suppression | KEEP AS-IS | Phase 2 |
| SmartClassifier + AutoReply | KEEP + Extend ReplyAgent | Phase 2 + 6 |
| MasterFlowService / Workflow | KEEP + Migrate to Visual | Phase 5 |
| Queue Control Center | KEEP AS-IS | Platform Ops |
| SkeletonService + TokenRouting | KEEP for internal admin | Internal |
| NeedToActionService | KEEP + Extend to Tasks | Phase 2 |
| GmailPhotoScraper + OpenSearch | KEEP + Extend ResearchAgent | Phase 3 + 6 |
| AuthService (JWT) | EXTEND (add MFA + SSO) | Phase 1 |
| PermissionService (RBAC) | EXTEND (workspace-scope) | Phase 1 |
| Drift Sequences | EXTEND (visual builder) | Phase 2 |
| driftemail.js (UI) | REBUILD (React Flow) | Phase 2 |
| Filter Views (contacts/company) | EXTEND (OpenSearch) | Phase 3 |
| Multi-Tenant Workspace | BUILD NEW | Phase 1 CRITICAL |
| Unified Inbox (Unibox) | BUILD NEW | Phase 2 CRITICAL |
| P2P Warmup Network | BUILD NEW | Phase 4 CRITICAL |
| DNS Health Validator | BUILD NEW | Phase 4 |
| A/B Split Test Engine | BUILD NEW | Phase 2 |
| 8 AI Agents | BUILD NEW (4 extend, 4 new) | Phase 6 |
| Meeting Booking System | BUILD NEW | Phase 7 |
| Revenue Pipeline / CRM | BUILD NEW | Phase 7 |
| Stripe Billing + Credits | BUILD NEW | Phase 8 |
| Super Admin Panel | BUILD NEW | Phase 8 |
| Agency / White-Label | BUILD NEW | Phase 8 |
| CRM Integrations | BUILD NEW | Phase 8 |
| Buyer Intent Engine | BUILD NEW | Phase 3 |
| VerificationAgent (SMTP Pinger) | BUILD NEW | Phase 3 + 6 |

---

*Generated: September 2026 | Version 1.0*
*Based on: Current codebase analysis (c:/edit/for) + RevenueOS PRD v1.0*
*Total estimated completion: 30 weeks / ~8 months with a 3-5 developer team*


---

## PART 11 - Tech Stack and Architecture Decision (New Project: Next.js + NestJS)

### Your Situation Summary
- You are building a NEW project from scratch in Next.js + NestJS
- You already have MongoDB (planetary shards) and it is working well
- You need to handle 100 Cr (1 BILLION) records at scale
- You are self-hosting on your OWN server
- Target: Full RevenueOS 4-Pillar platform

---

### Decision 1: MongoDB vs PostgreSQL vs Both?

RECOMMENDATION: USE BOTH. Here is exactly which data goes where.

#### MongoDB - Keep for Lead/Contact Data (Your Current Shards)
Best for: Unstructured, high-volume, append-heavy, schema-flexible data

| Data Type | Collection | Reason to Stay in MongoDB |
|---|---|---|
| Lead/Contact Records (100 Cr) | moon, mars, jupiter shards | Horizontal sharding, no joins needed, flexible schema |
| Company Records | earth, neptune shards | Same as above |
| Email Activity Logs (opens, clicks) | saturn shard | Write-heavy time-series, MongoDB handles this well |
| Scraped Data (Maps, Website, LinkedIn) | mercury shard | Unstructured/variable schema from scraping |
| AI Research Cache | central db | JSON blobs, no relational structure needed |
| Enrichment Results | per-shard | JSON output from enrichment agents |
| Queue Job Logs | central db | High write volume, short TTL |

MongoDB Strength at 100 Cr: With proper sharding key (company_domain or email hash), each shard holds 10-15 Cr records. Add 7-10 shards = 100 Cr easily. Already proven at your current scale.

#### PostgreSQL - Add for Operational/Transactional Data
Best for: Relational, ACID-compliant, join-heavy, billing, auth data

| Data Type | Table | Reason to Use PostgreSQL |
|---|---|---|
| Workspaces and Users | workspaces, users | ACID, foreign keys, joins |
| Campaigns and Sequences | campaigns, sequences, steps | Relational, complex queries |
| Mailbox Configuration | mailboxes, smtp_configs | Config data, joins with campaigns |
| Billing and Subscriptions | subscriptions, invoices, credits | ACID critical, financial data |
| Audit Logs | audit_logs | Append-only, compliance queries |
| Conversations / Inbox | conversations, messages | Thread structure, needs joins |
| Pipeline / CRM | opportunities, pipeline_stages | Relational by nature |
| Meeting Bookings | meetings, meeting_types | Calendar joins |
| Permissions and Roles | roles, permissions | Relational RBAC |
| A/B Test Config | campaign_variants, ab_results | Joins with campaigns |
| Saved Searches | saved_searches | JSON filters + user joins |
| Workflow Definitions | workflows, workflow_nodes | Graph structure with JSONB |

#### Add OpenSearch for Fast Search (Already Partially Built)
Best for: Full-text search, faceted filtering, autocomplete on 100 Cr records

| Use Case | Why OpenSearch |
|---|---|
| People search with 20+ filters | Inverted index, sub-second on 100 Cr |
| Company search + autocomplete | N-gram tokenizer |
| Email history full-text search | Full-text across all threads |
| Lead scoring + sorting | Numeric field sorting at scale |
| Deduplication check (bloom filter) | Fast existence check |

MongoDB queries across 100 Cr are slow without OpenSearch. Sync lead records to OpenSearch index in background. Search happens via OpenSearch, writes go to MongoDB shards.

#### Add ClickHouse for Analytics (If Needed at Scale)
Best for: Time-series aggregations, campaign analytics, billions of events

| Use Case | Why ClickHouse |
|---|---|
| Campaign open/click aggregations | Columnar, 100x faster than MongoDB for GROUP BY |
| Email sent per day per mailbox | Real-time materialized views |
| Revenue attribution reports | Multi-table joins on large datasets |
| Warmup progress over time | Time-series with rollups |

ClickHouse is optional at start. Add in Phase 7-8 when analytics queries become slow on MongoDB.

---

### Final Database Stack Summary

`
LEAD DATA (100 Cr records)          -> MongoDB Shards (moon/mars/jupiter/earth etc.)
FAST SEARCH + FILTERING             -> OpenSearch (sync from MongoDB)
OPERATIONAL / TRANSACTIONAL DATA    -> PostgreSQL (Prisma ORM)
QUEUES + RATE LIMITING + CACHE      -> Redis (BullMQ + RedisRateLimiter)
ANALYTICS + REPORTING (Phase 7+)    -> ClickHouse (optional, add when needed)
`

You do NOT need to migrate away from MongoDB. Add PostgreSQL alongside it for the new modules.

---

### Decision 2: Microservices vs Monolith?

RECOMMENDATION: MODULAR MONOLITH NOW, SPLIT MICROSERVICES LATER

#### Why NOT full microservices from Day 1:
- Microservices have massive DevOps overhead (service discovery, inter-service auth, distributed tracing)
- Your team is likely 2-5 developers — microservices need 10+ to maintain properly
- 90% of startups that go microservices from day 1 regret it (Netflix/Uber both started as monoliths)
- On self-hosted servers, microservices add network latency between services you control

#### Why NOT a traditional monolith:
- Hard to scale individual bottlenecks (search vs email delivery vs AI)
- One deployment = entire system down
- Tightly coupled code slows down development

#### What to build: Modular Monolith in a Monorepo

Architecture: Single NestJS API server with clearly separated Domain Modules. Each module is independently testable. Workers are separate processes already (you have this with PM2). When you need to scale later, each module can be extracted as a microservice without rewriting.

`
NestJS API Server (Single Process, Multiple Domain Modules)
  modules/
    auth/          <- AuthModule (JWT, MFA, SSO)
    workspaces/    <- WorkspaceModule (multi-tenancy)
    leads/         <- LeadsModule (CRUD, import, export)
    campaigns/     <- CampaignModule (sequences, scheduling)
    mailboxes/     <- MailboxModule (Gmail, SMTP, IMAP)
    inbox/         <- InboxModule (Unibox, conversations)
    enrichment/    <- EnrichmentModule (4-tier waterfall)
    scraping/      <- ScrapingModule (Maps, Website, LinkedIn)
    deliverability/<- DeliverabilityModule (warmup, DNS, spam)
    ai/            <- AIModule (8 agent orchestrator)
    billing/       <- BillingModule (Stripe, credits)
    analytics/     <- AnalyticsModule (stats, reports)
    workflows/     <- WorkflowModule (visual builder)
    meetings/      <- MeetingsModule (booking, calendar)
    pipeline/      <- PipelineModule (CRM, opportunities)
    integrations/  <- IntegrationsModule (HubSpot, Zapier)

BullMQ Workers (Separate PM2 Processes - Already Your Pattern)
  email-delivery-worker
  drift-worker
  enrichment-worker
  scraping-worker         <- NEW (Maps + Website + LinkedIn)
  linkedin-followup-worker <- NEW
  verification-worker     <- NEW
  warmup-worker           <- NEW
  dedup-worker
  export-worker
  ai-research-worker      <- NEW
  analytics-worker        <- NEW
`

#### When to Split to Microservices (Future):
If any of these happen, split THAT specific module:
- Scraping workers need 50+ CPU cores separate from API
- AI inference needs GPU servers separate from main server
- Email delivery needs isolated IP reputation per sending service
- Search needs its own OpenSearch cluster

---

### Decision 3: Full Tech Stack Recommendation (New Next.js + NestJS Project)

`
LAYER              TECHNOLOGY           REASON
------             ----------           ------
Frontend           Next.js 15+          SSR + API routes + App Router
UI Components      shadcn/ui + Radix    Accessible, unstyled components
Styling            Tailwind CSS v4      Utility-first, no runtime cost
State Management   Zustand + TanStack   Lightweight global + server state
Real-time UI       Socket.io client     Live inbox, queue status updates
Workflow Canvas    React Flow           Visual workflow + sequence builder
Email Editor       TipTap or TinyMCE    Rich text with variable insertion
Charts/Analytics   Recharts or Tremor   Campaign performance charts

Backend API        NestJS (TypeScript)  Modular, decorator-based, enterprise
ORM (PostgreSQL)   Prisma               Type-safe, migrations, great DX
MongoDB Driver     Mongoose or native   Your existing planetary shard pattern
Search             OpenSearch SDK       Fast faceted search on 100 Cr leads
Queue              BullMQ + Redis       Your existing PM2 worker pattern
Scheduler          BullMQ Cron          Replace node-cron with BullMQ cron jobs
Real-time          Socket.io server     Inbox notifications, live queue status
Auth               Passport.js + JWT    NestJS-native auth strategy
OAuth              Google + Microsoft   SMTP/Calendar connection + SSO login
File Storage       MinIO (self-hosted)  S3-compatible, on your own server
Email Parsing      mailparser + Imap    Your existing IMAP pattern
HTTP Scraping      Playwright + Cheerio Your existing HeadlessScraperService
LinkedIn Scraping  Playwright + stealth LinkedIn follow-up agent
Google Maps        Playwright + @googlemaps/google-maps-services-js
AI / LLM           OpenRouter (multi-model) Your existing LLMService pattern
AI Orchestration   Custom AgentOrchestrator.js (see Part 3)
Process Manager    PM2                  Your existing ecosystem.config.cjs
Containerization   Docker + Docker Compose Self-hosted multi-service setup
Reverse Proxy      Nginx                Route /api to NestJS, / to Next.js
SSL                Certbot (Let's Encrypt) Free SSL on your domain
Monitoring         Grafana + Prometheus Self-hosted metrics dashboard
Log Aggregation    Grafana Loki         Centralized logs from all PM2 workers
Error Tracking     Sentry (self-hosted) Error tracking without cloud cost
Migrations         Prisma Migrate       PostgreSQL schema versioning
Testing            Vitest + Supertest   Unit + integration tests
`

---

### Decision 4: Self-Hosted Server Requirements for 100 Cr Records

Minimum Server Specs for Production:

| Component | Minimum | Recommended |
|---|---|---|
| CPU | 32 cores | 64 cores (for concurrent scraping + AI workers) |
| RAM | 128 GB | 256 GB (MongoDB WiredTiger cache + OpenSearch heap) |
| Storage | 10 TB NVMe SSD | 20 TB NVMe SSD RAID-10 |
| Network | 1 Gbps | 10 Gbps (email sending volume) |
| MongoDB Servers | 1 server (sharded) | 3 servers (replica set per shard) |
| Redis | 32 GB RAM dedicated | 64 GB RAM dedicated |
| OpenSearch | 64 GB heap | 128 GB heap (100 Cr documents) |

Multi-Server Layout (Recommended for 100 Cr):

`
Server 1: API + Next.js frontend + Nginx (16 cores, 64GB RAM)
Server 2: NestJS API replicas + BullMQ workers (32 cores, 128GB RAM)
Server 3: MongoDB Shard 1-3 (moon, mars, jupiter) (32 cores, 256GB RAM)
Server 4: MongoDB Shard 4-7 (earth, mercury, saturn, neptune) (32 cores, 256GB RAM)
Server 5: OpenSearch Cluster (64 cores, 256GB RAM, 10TB NVMe)
Server 6: Redis + ClickHouse (16 cores, 64GB RAM)
Server 7: MinIO storage + Grafana + monitoring (8 cores, 32GB RAM)
`

Single Server (Budget): 64 cores, 512GB RAM, 20TB NVMe — all services on one box with Docker Compose. Works for 100 Cr records but no redundancy.

---

### Decision 5: New Scraper Modules Architecture

#### Google Maps Scraper
- Input: Search query (e.g. "IT companies in Chennai") + bounding box
- Process: Playwright headless, scroll through Maps results, extract business name, website, phone, address, category, rating, review count
- Output: Insert into mercury shard (raw_gmaps collection) -> dedup -> enrich domain -> push to leads
- Worker: google-maps-scraper-worker.js (BullMQ)
- Rate limit: 1 city per 5 minutes, rotate proxies, respect Maps TOS

#### Website Scraper (Generic)
- Input: Domain list or URL pattern config
- Process: Extend HeadlessScraperService.js, configurable selectors per site type
- Extract: Company name, description, contact email, phone, LinkedIn URL, team page
- Output: Enrich existing company records in planetary DBs
- Worker: website-scraper-worker.js (BullMQ)
- AI: Pass extracted text to LLMService for structured JSON extraction

#### LinkedIn Lead Follow-up Agent
- Input: LinkedIn profile URLs from your lead database
- Process: Playwright + stealth plugin (puppeteer-extra-plugin-stealth)
  - Step 1: Send connection request with personalized note (PersonalizationAgent output)
  - Step 2: Wait N days -> if connected, send follow-up DM
  - Step 3: Track connection status, update lead record
- Output: Update lead LinkedIn status, log touchpoints in activity feed
- Worker: linkedin-followup-worker.js (BullMQ)
- Rate limit: Max 50 connection requests/day/LinkedIn account (strict LinkedIn limits)
- Safety: Multiple LinkedIn accounts supported, per-account rate limiter

#### Gmail Photo Scraper (Enhance Existing)
- Current: GmailPhotoScraper.js + gmail-photo-scraper-worker.js
- Enhance: Add bulk dashboard UI showing photo fetch status per lead
- Add: Auto-attach fetched photo to lead profile in OpenSearch index
- Add: Queue prioritization (high-value leads first)
- Add: Photo quality scoring (skip low-res defaults)

---

### Decision 6: Project Folder Structure (New Project)

`
revenueos/                          <- Git root (new project)
  apps/
    web/                            <- Next.js 15 (App Router)
      app/
        (auth)/login, register
        (dashboard)/
          supersearch/people, companies, maps, website, linkedin
          prospects/
          campaigns/
          automations/
          inbox/
          deliverability/
          analytics/
          ai/
          meetings/
          pipeline/
          integrations/
          team/
          billing/
          settings/
        api/                        <- Next.js API routes (thin proxy to NestJS)
      components/
      hooks/
      stores/                       <- Zustand stores
      lib/

    api/                            <- NestJS (TypeScript)
      src/
        modules/
          auth/
          workspaces/
          leads/
          campaigns/
          mailboxes/
          inbox/
          enrichment/
          scraping/                 <- NEW (Maps + Website + LinkedIn)
          deliverability/
          ai/
          billing/
          analytics/
          workflows/
          meetings/
          pipeline/
          integrations/
        common/
          guards/
          decorators/
          filters/
          interceptors/
        config/
        main.ts

    workers/                        <- BullMQ worker processes
      email-delivery-worker.js
      drift-worker.js
      enrichment-worker.js
      google-maps-scraper-worker.js  <- NEW
      website-scraper-worker.js      <- NEW
      linkedin-followup-worker.js    <- NEW
      verification-worker.js         <- NEW
      warmup-worker.js               <- NEW
      dedup-worker.js
      export-worker.js
      ai-research-worker.js          <- NEW
      analytics-worker.js            <- NEW
      ecosystem.config.cjs           <- PM2 config (extend existing)

  packages/
    database/                       <- Prisma schema + PostgreSQL migrations
    mongodb/                        <- MongoDB connection (planetary shards, migrate from current)
    ui/                             <- Shared React components
    auth/                           <- JWT + OAuth utilities
    ai/                             <- 8 Agent classes + AgentOrchestrator
    email/                          <- Email adapter (Gmail + SMTP + IMAP)
    search/                         <- OpenSearch index manager
    scraping/                       <- HeadlessScraperService + Maps + LinkedIn
    billing/                        <- Stripe adapter
    config/                         <- Shared env schema

  infra/
    docker/
      docker-compose.yml            <- All services: Mongo, PG, Redis, OpenSearch, MinIO
      docker-compose.prod.yml
    nginx/
      nginx.conf
    monitoring/
      prometheus.yml
      grafana-dashboards/
    ssl/
      certbot-setup.sh

  docs/
    api/
    architecture/
    product/
`

---

### Quick Decision Reference Card

| Question | Answer |
|---|---|
| New project framework? | Next.js 15 + NestJS (TypeScript) |
| Keep MongoDB? | YES - for all 100 Cr lead records |
| Add PostgreSQL? | YES - for auth, campaigns, billing, inbox, CRM |
| Add OpenSearch? | YES - mandatory for search at 100 Cr scale |
| Add ClickHouse? | Optional, add in Phase 7 for analytics |
| Microservices? | NO - Modular Monolith first, split later |
| Self-hosted setup? | Docker Compose + PM2 + Nginx + MinIO |
| Google Maps Scraper? | YES - new module, Playwright-based |
| Website Scraper? | YES - extend HeadlessScraperService |
| LinkedIn Follow-up Agent? | YES - new agent with stealth Playwright |
| Gmail Photo Scraper? | YES - already exists, enhance with UI |
| 100 Cr capable? | YES - with MongoDB sharding + OpenSearch |
| Total timeline? | 30 weeks with 3-5 dev team |

---

*Updated: September 2026 | Version 1.1*
*Added: Google Maps Scraper, Website Scraper, LinkedIn Follow-up Agent, Gmail Photo Enhancement*
*Added: Complete Tech Stack Decision, DB Strategy for 100 Cr, Self-Hosted Architecture*

