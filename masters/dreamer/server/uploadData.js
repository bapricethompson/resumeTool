// CommonJS version
const fs = require("fs");
const { MongoClient } = require("mongodb");
const csv = require("csv-parser");

const MONGO_URI =
  "mongodb+srv://sd6200:JQ7GhhWLZxgNyNAe@cluster0.aagcme2.mongodb.net/?retryWrites=true&w=majority";
const DB_NAME = "finalProject"; // your database name
const COLLECTION_NAME = "embedded_jobs"; // your collection name
const CSV_FILE = "./job_title_des.csv"; // path to your CSV file

async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
}

async function uploadData() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Parse CSV file
    const jsonData = await parseCSV(CSV_FILE);

    // Insert all documents into the collection
    const result = await collection.insertMany(jsonData);
    console.log(`✅ Inserted ${result.insertedCount} documents`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

uploadData();
