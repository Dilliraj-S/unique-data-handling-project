
const { MongoClient, ObjectId } = require('mongodb');
const SendDriftEmailJob = require('./services/DriftEmail/SendDriftEmailJob');

async function verifyBounceFix() {
  process.env.MONGODB_URI = 'mongodb://localhost:27017'; // Fix: Ensure Job has a URI
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('pluto');

    // 1. Setup Test Data
    const sequenceId = new ObjectId();
    const subscriberId = new ObjectId();
    const messageId = `<test_msg_${Date.now()}@example.com>`;
    
    // Create Subscriber
    await db.collection('subscribers').updateOne(
      { _id: subscriberId },
      { $set: { 
          email: 'john.bounce@example.com', 
          status: 'subscribed',
          audience_id: 12345, 
          id: 12345,
          first_name: 'John',
          last_name: 'Bounce',
          phone_number: '1234567890'
      } },
      { upsert: true, bypassDocumentValidation: true }
    );

    // Create Sequence
    await db.collection('drift_sequences').updateOne(
      { _id: sequenceId },
      { $set: { 
          status: 'running', 
          set_id: 'test_set', 
          batch_size: 1,
          // Required fields:
          assignment_mode: null,
          audience_id: 12345,
          categories: [],
          created_at: new Date(),
          deleted_at: null,
          filters: null,
          from_emails: [],
          manual_assignments: null,
          name: 'Test Sequence',
          previous_sequence_id: null,
          scheduled_at: null,
          sequence_number: 1,
          subject: 'Test Subject',
          template_id: null,
          time_gap: 0,
          timezone: null,
          updated_at: new Date(),
          wait_time: 0,
          wait_unit: 'days'
      } },
      { upsert: true, bypassDocumentValidation: true }
    );

    // Create Sent Log
    await db.collection('drift_sequence_logs').insertOne({
      sequence_id: sequenceId,
      subscriber_id: subscriberId,
      set_id: 'test_set',
      email_account_id: new ObjectId(),
      template_id: new ObjectId(),
      batch_size: 1,
      status: 'sent', 
      message_id: messageId,
      sent_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }, { bypassDocumentValidation: true });

    // Create Bounce in Emails Collection
    await db.collection('emails').insertOne({
      message_id: 'bounce_msg_123',
      account_email: 'test@example.com',
      thread_id: 'thread_123',
      subject: 'Bounce Notification',
      body: 'Failed delivery',
      in_reply_to: messageId, 
      from: 'mailer-daemon@google.com',
      status: 'hard_bounce',
      category: 'hard_bounce',
      created_at: new Date(),
      updated_at: new Date()
    }, { bypassDocumentValidation: true });

    console.log('✅ Test Data Created');
    console.log(`- Subscriber: john.bounce@example.com`);
    console.log(`- Message ID: ${messageId}`);
    console.log(`- Bounce from: mailer-daemon@google.com`);

    // 2. Run the Fix
    const job = new SendDriftEmailJob();
    await job.connect();
    
    console.log('🔄 Running checkSequenceCompletion...');
    await job.checkSequenceCompletion(sequenceId);

    // 3. Verify Results
    const updatedSequence = await db.collection('drift_sequences').findOne({ _id: sequenceId });
    const filters = updatedSequence.filters || [];
    
    console.log('\n🔍 Inspection Results:');
    console.log('Filters found:', JSON.stringify(filters, null, 2));

    const targetFilter = filters.find(f => f.email === 'john.bounce@example.com');
    
    if (targetFilter && (targetFilter.status === 'hard_bounce' || targetFilter.status === 'hard_bounce')) {
      console.log('\n✅ SUCCESS: Subscriber "john.bounce@example.com" is correctly marked as "hard_bounce"!');
    } else {
      console.log('\n❌ FAILURE: Subscriber was not marked as hard_bounce.');
      console.log('Actual status:', targetFilter ? targetFilter.status : 'Filter not found');
    }

    // Cleanup
    // await db.collection('drift_sequence_logs').deleteMany({ sequence_id: sequenceId });
    // await db.collection('drift_sequences').deleteOne({ _id: sequenceId });
    // await db.collection('emails').deleteOne({ in_reply_to: messageId });
    // await db.collection('subscribers').deleteOne({ _id: subscriberId });

  } catch (err) {
    console.error('VERIFICATION ERROR:', err.message);
    if (err.code === 121) {
        console.error('Validation Errors:', JSON.stringify(err.errInfo, null, 2));
    }
    // console.error(err); // Full stack trace often truncated
  } finally {
    await client.close();
  }
}

verifyBounceFix();
