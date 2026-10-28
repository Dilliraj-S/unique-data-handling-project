const { MongoClient, ObjectId } = require('mongodb');

async function debug() {
  const client = new MongoClient(process.env.AUTOMATION_MONGODB_URI || 'mongodb://127.0.0.1:27017/pluto');
  await client.connect();
  const db = client.db('pluto');
  
  // Check bounce emails in the collection
  console.log('\n=== Checking emails collection for bounces ===');
  const bounces = await db.collection('emails').find({ 
    status: { $in: ['soft_bounce', 'hard_bounce'] } 
  }).limit(10).toArray();
  
  console.log(`Found ${bounces.length} bounce emails`);
  bounces.forEach(e => {
    console.log(`- ${e.status} | account: ${e.account_email} | from: ${e.from_email} | snippet: ${(e.snippet || '').substring(0, 50)}`);
  });
  
  // Check sequence 1 filters
  console.log('\n=== Checking Sequence 1 filters ===');
  const seq1 = await db.collection('drift_sequences').findOne({ 
    _id: new ObjectId('6958fca859720fdedcff9183')
  });
  
  if (seq1 && seq1.filters) {
    const statusCounts = {};
    seq1.filters.forEach(f => {
      statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
    });
    console.log('Filter status breakdown:', statusCounts);
    console.log('Total filters:', seq1.filters.length);
  }
  
  // Check sequence 2
  console.log('\n=== Checking Sequence 2 ===');
  const seq2 = await db.collection('drift_sequences').findOne({ 
    _id: new ObjectId('6958fca859720fdedcff9184')
  });
  console.log('Status:', seq2?.status);
  console.log('Categories:', seq2?.categories);
  console.log('Scheduled at:', seq2?.scheduled_at);
  
  await client.close();
}

debug().catch(console.error);
