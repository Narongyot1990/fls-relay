import { MongoClient, type Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Database is not configured");
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 }).connect()
      .catch((error) => { global._mongoClientPromise = undefined; throw error; });
  }
  return (await global._mongoClientPromise).db();
}
