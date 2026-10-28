/**
 * Seed Script: Realistic B2B Outreach Incoming Emails & Conversations
 * Database: pluto (emails & email_accounts collections)
 */

const { MongoClient, Long, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const plutoUri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI;

// Conversations templates for B2B replies
const emailTemplates = [
  {
    subjectSuffix: 'Quick Intro & Q3 Platform Architecture Review',
    fromName: 'Sandeep Singhania',
    fromEmail: 'sandeep.singhania@relianceretail-corp.in',
    snippet: 'Hi, thanks for reaching out. We are currently evaluating our enterprise pipeline and would love to review your platform deck...',
    status: 'human_reply',
    category: 'inbox',
    bodyGenerator: (account) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; font-size: 14.5px;">
        <p>Hi ${account.first_name},</p>
        <p>Thanks for getting in touch. Your email arrived at the perfect time—we are currently in the middle of our Q3 vendor evaluation for modernizing our data infrastructure.</p>
        <p>We are keen to understand:</p>
        <ol style="padding-left: 20px;">
          <li>How does your platform handle real-time deduplication across multi-tenant shards?</li>
          <li>What are the native connectors supported for Snowflake and Databricks?</li>
          <li>Do you support dedicated on-prem VPC deployment for Indian data residency compliance?</li>
        </ol>
        <p>Could you share your enterprise architecture whitepaper and pricing tiers? Also, if you have 15 minutes this <b>Thursday at 3:30 PM IST</b>, we can jump on a quick Zoom call.</p>
        <p>Looking forward to connecting.</p>
        <br/>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; color: #475569; font-size: 13px;">
          <strong>Sandeep Singhania</strong><br/>
          Vice President – Enterprise Architecture & Systems<br/>
          Reliance Retail Corporate Centre, Navi Mumbai<br/>
          <span style="color: #64748b;">Direct: +91 98200 44123 | sandeep.singhania@relianceretail-corp.in</span>
        </div>
        <br/>
        <div style="border-left: 2px solid #cbd5e1; padding-left: 14px; margin-top: 25px; color: #64748b; font-size: 12.5px;">
          <em>On Tuesday, Oct 06, 2026, ${account.first_name} ${account.last_name} &lt;${account.email}&gt; wrote:</em><br/><br/>
          Hi Sandeep, I noticed Reliance Retail's recent expansion into unified enterprise pipelines. We help leading Indian conglomerates automate multi-source B2B intelligence with 99.8% data hygiene...
        </div>
      </div>
    `
  },
  {
    subjectSuffix: 'Re: Technical Demo & Sandbox Access Request',
    fromName: 'Jennifer Walsh',
    fromEmail: 'jennifer.walsh@apexcloud-systems.com',
    snippet: 'Hi, I shared your proposal with our CTO. We would like to proceed with a 14-day technical sandbox trial...',
    status: 'human_reply',
    category: 'inbox',
    bodyGenerator: (account) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; font-size: 14.5px;">
        <p>Hi ${account.first_name},</p>
        <p>Following up on your note—I reviewed your overview with our VP of Engineering and CTO yesterday during our pipeline standup.</p>
        <p>The automated rate-limiting and Google Pub/Sub real-time sync capabilities align directly with what we need to solve for our global SDR team.</p>
        <p>Could your team provision a <b>14-day staging sandbox</b> for 5 test users? Here is our team lead's email: <code>dev-lead@apexcloud-systems.com</code>.</p>
        <p>Please send over the MSA / DPA documents when convenient so our legal counsel can begin review.</p>
        <br/>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; color: #475569; font-size: 13px;">
          <strong>Jennifer Walsh</strong><br/>
          Director of Global Revenue Operations<br/>
          ApexCloud Systems Inc.<br/>
          <span style="color: #64748b;">San Francisco • London • Bengaluru</span>
        </div>
      </div>
    `
  },
  {
    subjectSuffix: 'Pricing & Vendor Onboarding Questionnaire',
    fromName: 'Tarun Khanna',
    fromEmail: 'tarun.khanna@zomato-partnerships.in',
    snippet: 'Hi, looping in our procurement lead Rajiv. Please share the standard commercial terms for 50+ seats...',
    status: 'human_reply',
    category: 'inbox',
    bodyGenerator: (account) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; font-size: 14.5px;">
        <p>Hi ${account.first_name},</p>
        <p>Thanks for the follow-up note. The multi-inbox rotation and cold outreach engine looks very promising for our B2B commercial division.</p>
        <p>I am looping in <b>Rajiv Sen</b> (copied here) from our Procurement & Strategic Sourcing division to review standard commercial terms for an initial tier of <b>50 seats</b>.</p>
        <p>Rajiv, could you share our standard vendor NDA so ${account.first_name}'s team can submit the pricing proposal?</p>
        <br/>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; color: #475569; font-size: 13px;">
          <strong>Tarun Khanna</strong><br/>
          Head of Commercial Growth & Strategic Accounts<br/>
          Zomato Media Pvt. Ltd., Gurugram, Haryana<br/>
        </div>
      </div>
    `
  },
  {
    subjectSuffix: 'Automatic Reply: Out of Office (Leadership Summit)',
    fromName: 'Amitav Roy',
    fromEmail: 'amitav.roy@paytm-core.in',
    snippet: 'Thank you for your message. I am currently out of the office attending the Annual FinTech Leadership Summit with limited email access...',
    status: 'automatic_reply',
    category: 'inbox',
    bodyGenerator: (account) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; font-size: 14.5px;">
        <p>Hello,</p>
        <p>Thank you for your email. I am currently out of the office attending the <b>Annual FinTech & Cloud Summit</b> and will have limited access to email.</p>
        <p>I will return to normal office hours on Monday, October 19th. During this period, my emails will not be monitored on a regular schedule.</p>
        <p>For urgent operational queries, please contact:</p>
        <ul>
          <li>Technical inquiries: <code>tech-ops@paytm-core.in</code></li>
          <li>Commercial inquiries: <code>partnerships@paytm-core.in</code></li>
        </ul>
        <p>Thank you for your patience and understanding.</p>
        <br/>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; color: #64748b; font-size: 12.5px;">
          Amitav Roy | Chief Technology Officer | PayTM Towers, Noida Sector 5
        </div>
      </div>
    `
  },
  {
    subjectSuffix: 'Unsubscribe Request - Remove from Outreach Database',
    fromName: 'Marcus Vance',
    fromEmail: 'marcus.vance@barclays-gsc.co.uk',
    snippet: 'Please remove our domain and email addresses from your cold outreach distribution list...',
    status: 'unsubscribe',
    category: 'inbox',
    bodyGenerator: (account) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; font-size: 14.5px;">
        <p>Hi ${account.first_name},</p>
        <p>Please remove my email address and the <code>@barclays-gsc.co.uk</code> domain from your marketing and sales outreach lists as we are not currently seeking third-party pipeline tooling.</p>
        <p>Thank you for honoring our unsubscribe request.</p>
        <br/>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; color: #64748b; font-size: 12.5px;">
          Marcus Vance | Enterprise Infrastructure & Sourcing
        </div>
      </div>
    `
  },
  {
    subjectSuffix: 'Delivery Failure: Mailbox quota exceeded',
    fromName: 'Mail Delivery Subsystem',
    fromEmail: 'mailer-daemon@googlemail.com',
    snippet: '552 5.2.2 The email account that you tried to reach is over quota and unable to receive new messages...',
    status: 'soft_bounce',
    category: 'inbox',
    bodyGenerator: (account) => `
      <div style="font-family: monospace; background: #f8fafc; padding: 18px; border: 1px solid #e2e8f0; border-radius: 6px; color: #334155; font-size: 13px;">
        <strong>Delivery Status Notification (Failure)</strong><br/><br/>
        The response from the remote server was:<br/>
        <code>552 5.2.2 The email account that you tried to reach is over quota and unable to receive new messages. Recipient mailbox storage capacity exceeded. [IN-MUM-SRV04.PROD.TATA.COM]</code><br/><br/>
        Action: failed<br/>
        Status: 5.2.2 (Mailbox full / quota exceeded)<br/>
        Diagnostic-Code: smtp; 552 5.2.2 Storage limit exceeded
      </div>
    `
  },
  {
    subjectSuffix: '[PROMOTIONAL] AI-Powered Sales Automation Weekly Digest',
    fromName: 'SaaS Pulse Digest',
    fromEmail: 'newsletter@saaspulse-weekly.com',
    snippet: 'This week in B2B growth: 5 tips to scale multi-inbox rotation and improve email deliverability in 2026...',
    status: 'other',
    category: 'spam',
    bodyGenerator: (account) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; padding: 15px;">
        <h3 style="color: #6366f1;">SaaS Pulse Weekly Digest #142</h3>
        <p>Hello ${account.first_name}, here are the top trends in B2B cold email deliverability this week:</p>
        <ul>
          <li>How inbox warm-up protocols are evolving with Google and Yahoo's latest DMARC thresholds.</li>
          <li>Why spintax and dynamic message threading boost reply rates by 34%.</li>
          <li>Case study: Scaling outbound from 10 to 100 inboxes without burning sender reputation.</li>
        </ul>
        <p><a href="https://example.com" style="color: #6366f1;">Read the full newsletter online &rarr;</a></p>
      </div>
    `
  }
];

async function seedRealisticEmails() {
  console.log('🔗 Connecting to MongoDB Atlas...');
  const client = new MongoClient(plutoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const db = client.db('pluto');
    const accountsCol = db.collection('email_accounts');
    const emailsCol = db.collection('emails');

    // 1. Fetch all accounts
    const accounts = await accountsCol.find({}).toArray();
    console.log(`📊 Found ${accounts.length} email accounts in Pluto database.`);

    if (accounts.length === 0) {
      console.error('❌ No email accounts found. Please seed accounts first!');
      return;
    }

    // 2. Update all accounts with fresh last_synced_at timestamp (5 to 30 mins ago)
    console.log('🔄 Updating accounts with active synchronization timestamps...');
    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      const minsAgo = 5 + (i * 2);
      const syncedAt = new Date(Date.now() - minsAgo * 60 * 1000);
      await accountsCol.updateOne(
        { _id: acc._id },
        {
          $set: {
            last_synced_at: syncedAt,
            syncing: false,
            last_sync_status: 'success',
            last_sync_count: 6,
            updated_at: new Date()
          }
        }
      );
    }
    console.log('✅ Accounts updated with live sync timestamps (green indicators ready).');

    // 3. Clear old emails
    console.log('🧹 Clearing previous emails collection...');
    const delRes = await emailsCol.deleteMany({});
    console.log(`✅ Removed ${delRes.deletedCount} old email documents.`);

    // 4. Generate realistic emails for each account
    console.log('🚀 Generating realistic B2B incoming emails for each account...');
    const emailsToInsert = [];
    const now = Date.now();

    for (let accIdx = 0; accIdx < accounts.length; accIdx++) {
      const acc = accounts[accIdx];
      const accNumericId = acc.id instanceof Long ? acc.id.toNumber() : Number(acc.id) || (accIdx + 1);

      // Generate 5 inbox emails + 1 spam email for this account
      for (let tIdx = 0; tIdx < emailTemplates.length; tIdx++) {
        const tmpl = emailTemplates[tIdx];

        // Randomize timing: between 20 minutes ago and 5 days ago
        const hoursAgo = (tIdx * 8) + (accIdx * 2) + Math.floor(Math.random() * 4);
        const receivedAt = new Date(now - hoursAgo * 60 * 60 * 1000);

        const emailId = `msg_${accNumericId}_${tIdx}_${Date.now().toString(36)}`;
        const messageId = `<${emailId}@${acc.email.split('@')[1] || 'domain.com'}>`;
        const threadId = `th_${accNumericId}_${tIdx}_${Math.random().toString(36).substring(2, 8)}`;

        const htmlBody = tmpl.bodyGenerator(acc);
        const plainBody = tmpl.snippet;

        emailsToInsert.push({
          _id: new ObjectId(),
          id: emailId,
          email_account_id: Long.fromNumber(accNumericId),
          account_email: acc.email,
          message_id: messageId,
          thread_id: threadId,
          subject: `${tmpl.subjectSuffix} [${acc.first_name} ${acc.last_name}]`,
          from: tmpl.fromName,
          from_name: tmpl.fromName,
          from_email: tmpl.fromEmail,
          to: acc.email,
          snippet: tmpl.snippet,
          body: htmlBody,
          body_plain: plainBody,
          received_at: receivedAt,
          category: tmpl.category,
          status: tmpl.status,
          status_reasons: [tmpl.status],
          read: tIdx > 1 ? 1 : 0, // First 2 emails are unread
          created_at: receivedAt,
          updated_at: receivedAt
        });
      }
    }

    console.log(`📝 Inserting ${emailsToInsert.length} realistic B2B emails...`);
    const insertRes = await emailsCol.insertMany(emailsToInsert);
    console.log(`🎉 Successfully inserted ${insertRes.insertedCount} emails across ${accounts.length} inboxes!`);

    // Verify counts
    const totalCount = await emailsCol.countDocuments({});
    const inboxCount = await emailsCol.countDocuments({ category: 'inbox' });
    const spamCount = await emailsCol.countDocuments({ category: 'spam' });
    console.log(`📊 Pluto Emails Statistics:`);
    console.log(`   - Total Emails: ${totalCount}`);
    console.log(`   - Inbox: ${inboxCount}`);
    console.log(`   - Spam: ${spamCount}`);

    // Verify sample query for ananya.iyer@wipro-connect.in
    const sampleAccount = accounts.find(a => a.email.includes('ananya')) || accounts[0];
    const sampleEmails = await emailsCol.find({
      $or: [
        { email_account_id: Long.fromNumber(sampleAccount.id) },
        { account_email: sampleAccount.email }
      ],
      category: 'inbox'
    }).toArray();
    console.log(`🔍 Verified ${sampleEmails.length} inbox emails for ${sampleAccount.email}!`);

  } catch (error) {
    console.error('❌ Email seeding failed:', error);
  } finally {
    await client.close();
    console.log('🔌 Connection closed.');
  }
}

seedRealisticEmails();
