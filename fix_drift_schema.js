
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = "pluto"; 

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    
    // Define the corrected validator
    const validator = {
        $jsonSchema: {
            bsonType: "object",
            required: [
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
                audience_id: { bsonType: ["int", "long", "null"] },
                batch_size: { bsonType: ["int", "long", "null"] },
                categories: { bsonType: ["array", "string", "null"] },
                created_at: { bsonType: ["date", "null"] },
                deleted_at: { bsonType: ["date", "null"] },
                // FIX: Allow array or null for filters
                filters: { 
                    bsonType: ["array", "null"],
                    items: {
                        bsonType: "object",
                        properties: {
                            email: { bsonType: "string" },
                            status: { bsonType: "string" },
                            sequence_id: { bsonType: ["objectId", "string", "int", "long"] },
                            created_at: { bsonType: ["date", "string"] },
                            updated_at: { bsonType: ["date", "string"] }
                        }
                    } 
                },
                from_emails: { bsonType: ["array", "string", "null"] },
                manual_assignments: { bsonType: ["string", "null", "object"] }, // Allow object/string/null
                name: { bsonType: "string" },
                previous_sequence_id: { bsonType: ["objectId", "string", "null"] },
                scheduled_at: { bsonType: ["date", "string", "null"] }, // Allow date/string/null
                sequence_number: { bsonType: ["int", "long", "null"] },
                set_id: { bsonType: ["objectId", "double", "long", "string"] }, // Permissive
                status: { bsonType: "string" },
                subject: { bsonType: "string" },
                template_id: { bsonType: ["objectId", "string", "int", "long", "null"] }, // Permissive
                time_gap: { bsonType: ["int", "long", "null"] },
                timezone: { bsonType: ["string", "null"] },
                updated_at: { bsonType: "date" },
                wait_time: { bsonType: ["int", "long"] },
                wait_unit: { bsonType: "string" }
            }
        }
    };

    console.log("Updating drift_sequences validator...");
    await db.command({
        collMod: "drift_sequences",
        validator: validator,
        validationLevel: "strict",
        validationAction: "error"
    });

    console.log("Validator updated successfully.");

  } catch (e) {
      console.error("Error updating validator:", e);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
