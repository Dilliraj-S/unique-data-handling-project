
const { MongoClient } = require('mongodb');

const uri = "mongodb://localhost:27017";
const dbName = "pluto"; 

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    
    // Check if collection exists and drop it
    const collections = await db.listCollections({ name: 'drift_sequences' }).toArray();
    if (collections.length > 0) {
        console.log("Dropping existing drift_sequences collection...");
        await db.collection('drift_sequences').drop();
        console.log("Dropped.");
    }

    console.log("Creating drift_sequences collection with new schema...");
    
    await db.createCollection("drift_sequences", {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: [
                    // "_id", // MongoDB requires this implicitly, usually not needed in 'required' array for validator? 
                    // Validator checks document structure. _id is always present.
                    // User list:
                    "assignment_mode",
                    "audience_id",
                    "batch_size",
                    "categories",
                    "created_at",
                    "deleted_at",
                    "filters",
                    "from_emails",
                    "manual_assignments",
                    "name",
                    "previous_sequence_id",
                    "scheduled_at",
                    "sequence_number",
                    "set_id",
                    "status",
                    "subject",
                    "template_id",
                    "time_gap",
                    "timezone",
                    "updated_at",
                    "wait_time",
                    "wait_unit"
                ],
                properties: {
                    _id: { bsonType: "objectId" },
                    assignment_mode: { bsonType: ["string", "null"] },
                    audience_id: { bsonType: ["int", "long", "null"] }, // Permissive integer
                    batch_size: { bsonType: ["int", "long", "null"] },
                    categories: { 
                        // User: array | null | string
                        // For BSON array: bsonType: "array"
                        bsonType: ["array", "string", "null"]
                    },
                    created_at: { bsonType: ["date", "null"] }, // User schema has ref Date, but code uses null sometimes? User schema says just Ref Date. I'll allow null just in case or strictly Date.
                    // User schema: "created_at": { "$ref": "#/$defs/Date" }
                    // Ref Date: properties $date string.
                    // I will strictly enforce Date BSON type primarily.
                    // Wait, previous code code set it to Date object.
                    
                    deleted_at: { bsonType: ["date", "null"] },
                    filters: { bsonType: "null" }, // User schema says strict null? "type": "null". Code must set it to null.
                    from_emails: { bsonType: ["array", "string"] },
                    manual_assignments: { bsonType: "null" }, // Strict null?
                    name: { bsonType: "string" },
                    previous_sequence_id: { bsonType: ["objectId", "string", "null"] },
                    scheduled_at: { bsonType: "null" }, // Strict null?
                    sequence_number: { bsonType: ["int", "long"] },
                    set_id: { bsonType: ["objectId", "double", "long"] }, // Permissive: User said ObjectId or Double. I add Long for compatibility.
                    status: { bsonType: "string" },
                    subject: { bsonType: "string" },
                    template_id: { bsonType: ["int", "long", "null"] },
                    time_gap: { bsonType: ["int", "long", "null"] },
                    timezone: { bsonType: "null" },
                    updated_at: { bsonType: "date" },
                    wait_time: { bsonType: ["int", "long"] },
                    wait_unit: { bsonType: "string" }
                }
            }
        },
        validationLevel: "strict",
        validationAction: "error"
    });

    console.log("Collection created successfully with validator.");

  } catch (e) {
      console.error("Error creating collection:", e);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
