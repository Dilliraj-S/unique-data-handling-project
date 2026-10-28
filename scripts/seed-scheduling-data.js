/**
 * Seed realistic B2B audience segments, templates, and campaigns
 */
const { MongoClient, Long } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const plutoUri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI;

async function seedScheduling() {
  const client = new MongoClient(plutoUri);
  try {
    await client.connect();
    const db = client.db('pluto');

    console.log('Connected to pluto database. Seeding scheduling data...');

    // 1. Audiences
    const audiencesCol = db.collection('audiences');
    // Update existing audiences with realistic B2B names
    await audiencesCol.updateOne({ id: 1 }, { $set: { name: 'Tier-1 Enterprise CTOs & VPs - India', updated_at: new Date().toISOString() } });
    await audiencesCol.updateOne({ id: 2 }, { $set: { name: 'Cloud & DevOps Decision Makers', updated_at: new Date().toISOString() } });
    
    // Add extra realistic audiences if not present
    const existingAud3 = await audiencesCol.findOne({ id: 3 });
    if (!existingAud3) {
      await audiencesCol.insertOne({
        id: 3,
        name: 'SaaS Tech Founders - Bengaluru & Hyderabad',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        deleted_at: null,
        created_by: 'USR_ADMIN_001'
      });
    }

    const existingAud4 = await audiencesCol.findOne({ id: 4 });
    if (!existingAud4) {
      await audiencesCol.insertOne({
        id: 4,
        name: 'FinTech & Payments Engineering Leads',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        deleted_at: null,
        created_by: 'USR_ADMIN_001'
      });
    }

    // 2. Templates
    const templatesCol = db.collection('templates');
    const existingTemplatesCount = await templatesCol.countDocuments({});
    if (existingTemplatesCount === 0) {
      const sampleTemplates = [
        {
          id: 1,
          title: 'SaaS Platform Architecture Review',
          subject: 'Quick Intro & Q3 Platform Architecture Review - {{first_name}}',
          content: `<p>Hi {{first_name}},</p><p>I came across your engineering leadership at {{company}} and noticed your focus on scalable data infrastructure.</p><p>We help enterprise teams streamline data pipelining with real-time deduplication and sub-second query latency.</p><p>Would you be open to a brief 10-minute discovery exchange this Thursday?</p><p>Best regards,<br/>Enterprise Solutions Team</p>`,
          last_modified: new Date(Date.now() - 86400000).toISOString(),
          created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          deleted_at: null,
          created_by: 'USR_ADMIN_001'
        },
        {
          id: 2,
          title: 'Cloud & AI Workload Optimization Pitch',
          subject: 'Streamlining Cloud & AI Workloads for {{company}}',
          content: `<p>Hi {{first_name}},</p><p>With cloud infrastructure costs surging across Q3, most VP Engineering teams we speak with are actively consolidating their distributed clusters.</p><p>Our native connectors for Snowflake, Databricks, and AWS VPC reduce egress overhead by up to 34%.</p><p>Would you be interested in seeing the benchmark report for {{company}}?</p><p>Regards,<br/>Cloud Architecture Team</p>`,
          last_modified: new Date(Date.now() - 2 * 86400000).toISOString(),
          created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          deleted_at: null,
          created_by: 'USR_ADMIN_001'
        },
        {
          id: 3,
          title: 'Dedicated Sandbox Provisioning Follow-Up',
          subject: 'Re: Dedicated Sandbox Provisioning for {{company}}',
          content: `<p>Hi {{first_name}},</p><p>Following up on my previous note. We have pre-provisioned a dedicated sandbox tenant in our Mumbai VPC cluster so your team can test ingestion speeds with your own sample payloads.</p><p>Let me know if 3:00 PM tomorrow works for a quick walkthrough link.</p><p>Cheers,<br/>Product Operations</p>`,
          last_modified: new Date(Date.now() - 3600000 * 5).toISOString(),
          created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          deleted_at: null,
          created_by: 'USR_ADMIN_001'
        },
        {
          id: 4,
          title: 'Quarterly Outreach Benchmark & SLA Guarantee',
          subject: 'Benchmarking Outreach SLA & Compliance for {{company}}',
          content: `<p>Hi {{first_name}},</p><p>Ensuring 99.8% inbox placement and DPDP compliance is at the core of our enterprise tier.</p><p>Would love to share how similar technology firms in India are managing their domain health across 20+ automated sending nodes.</p><p>Best regards,<br/>Deliverability Practice</p>`,
          last_modified: new Date(Date.now() - 3600000 * 12).toISOString(),
          created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
          deleted_at: null,
          created_by: 'USR_ADMIN_001'
        }
      ];
      await templatesCol.insertMany(sampleTemplates);
      console.log('Inserted 4 realistic templates.');
    }

    // 3. Campaigns
    const campaignsCol = db.collection('campaigns');
    const existingCampaignsCount = await campaignsCol.countDocuments({});
    if (existingCampaignsCount === 0) {
      const sampleCampaigns = [
        {
          id: 1,
          name: 'Tier-1 Enterprise CTO Outreach - Q3',
          template_id: 1,
          audience_id: 1,
          status: 'Sending',
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          deleted_at: null,
          created_by: 'USR_ADMIN_001'
        },
        {
          id: 2,
          name: 'Bengaluru & Hyderabad Tech Founders Pitch',
          template_id: 2,
          audience_id: 3,
          status: 'Draft',
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          deleted_at: null,
          created_by: 'USR_ADMIN_001'
        },
        {
          id: 3,
          name: 'Cloud & DevOps Modernization Sequence',
          template_id: 3,
          audience_id: 2,
          status: 'Completed',
          created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          deleted_at: null,
          created_by: 'USR_ADMIN_001'
        }
      ];
      await campaignsCol.insertMany(sampleCampaigns);
      console.log('Inserted 3 realistic campaigns.');
    }

    console.log('Seeding scheduling data completed successfully!');
  } finally {
    await client.close();
  }
}

seedScheduling().catch(err => {
  console.error('Error seeding scheduling data:', err);
  process.exit(1);
});
