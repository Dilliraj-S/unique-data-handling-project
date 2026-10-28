
const { MongoClient, Long, Int32, ObjectId } = require('mongodb');

// Replace with your actual connection string
const uri = "mongodb://localhost:27017";
const dbName = "pluto"; 

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    const collection = db.collection('drift_sequences');

    // Test data closely matching the schema and what saveSequences.js tries to save
    const testDoc = {
      id: Long.fromNumber(Date.now()), // Required Long
      set_id: Long.fromNumber(1766558893781), // Example Set Long ID
      name: "Debug Sequence",
      sequence_number: new Int32(1),
      subject: "Test Subject",
      template_id: Long.fromNumber(0),
      audience_id: Long.fromNumber(0),
      from_emails: JSON.stringify(["test@example.com"]),
      time_gap: new Int32(60),
      batch_size: new Int32(10),
      assignment_mode: "batch_size",
      manual_assignments: null,
      wait_time: new Int32(0),
      wait_unit: "minutes",
      categories: null,
      previous_sequence_id: null,
      status: "draft",
      scheduled_at: null,
      timezone: null,
      filters: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null
    };

    console.log("Attempting to insert test document:", JSON.stringify(testDoc, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value // Handle BigInt serialization
    , 2));

    try {
        const result = await collection.insertOne(testDoc);
        console.log("Insert successful!", result.insertedId);
        
        // Clean up
        await collection.deleteOne({ _id: result.insertedId });
        console.log("Cleaned up test document.");

    } catch (e) {
        console.error("Insert failed!");
        if (e.errInfo) {
            console.error("Validation Error Details:", JSON.stringify(e.errInfo, null, 2));
        } else {
            console.error(e);
        }
    }

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
