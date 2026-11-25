const { MongoClient } = require("mongodb");
const { mongoUri, dbName } = require("./config");

let client;
let database;

async function connectDB() {
  client = new MongoClient(mongoUri);
  await client.connect();
  database = client.db(dbName);
  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("notes").createIndex({ owner: 1, updatedAt: -1 })
  ]);
  console.log(`MongoDB connected: ${dbName}`);
  return database;
}

function getDB() {
  if (!database) throw new Error("Database has not been connected");
  return database;
}

async function closeDB() {
  if (client) await client.close();
}

module.exports = { connectDB, getDB, closeDB };
