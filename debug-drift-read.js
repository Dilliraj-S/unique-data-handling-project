
const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb://localhost:27017";
const dbName = "pluto"; 

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    const collection = db.collection('drift_sequences');

    const idStr = "694b8cadcb5500e7ebb26f89"; // From logs
    let query = {};
    try {
        query = { _id: new ObjectId(idStr) };
    } catch(e) {
        console.log("Invalid ObjectId, trying generic string search if needed");
    }

    const doc = await collection.findOne(query);

    if (!doc) {
        console.log("Document not found with ObjectId. Searching all...");
        // Fallback?
    } else {
        console.log("Found Document:");
        console.log(JSON.stringify(doc, (key, value) => {
             // Custom replacer to reveal types if possible, though JSON.stringify flattens types.
             // We rely on node console log for Objects usually, but here we want to see if strings look like numbers.
             return value;
        }, 2));
        
        // Explicitly check types of fields
        console.log("\n--- Type Checks ---");
        console.log("id type:", typeof doc.id, doc.id?.constructor?.name);
        console.log("created_at type:", typeof doc.created_at, doc.created_at?.constructor?.name);
        console.log("updated_at type:", typeof doc.updated_at, doc.updated_at?.constructor?.name);
        console.log("sequence_number type:", typeof doc.sequence_number, doc.sequence_number?.constructor?.name);
        console.log("wait_time type:", typeof doc.wait_time, doc.wait_time?.constructor?.name);
        console.log("assignment_mode:", doc.assignment_mode);
        console.log("status:", doc.status);
    }

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
