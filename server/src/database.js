import { MongoClient } from "mongodb";
const uri =
  "mongodb+srv://sev:262951@sd-cluster.6rzpygc.mongodb.net/?retryWrites=true&w=majority";
const databaseName = "sd-database";
const indexLabel = "index";
const collectionLabel = "results";
const client = await MongoClient.connect(uri);

const getAccessibleCollections = async () => {
  try {
    const regex = new RegExp(`^${collectionLabel}-[0-9]+$`);
    const collections = await client
      .db(databaseName)
      .listCollections()
      .toArray();
    return collections
      .filter((collection) => regex.test(collection.name))
      .sort((coll1, coll2) => {
        const collIndex1 = Number(coll1.name.split("-")[1]);
        const collIndex2 = Number(coll2.name.split("-")[1]);

        return collIndex1 - collIndex2;
      });
  } catch (error) {
    console.log("Error in getAccessibleCollections: ", error.message);
    throw error;
  }
};

const database = {
  collections: await getAccessibleCollections(),
  getCollection: async (index) => {
    try {
      const db = client.db(databaseName);

      let collectionName = `${collectionLabel}-${index}`;
      if (index === -1) {
        return db.collection(indexLabel);
      }

      const collection = database.collections.find(
        (c) => c.name === collectionName
      );

      if (collection) return db.collection(collection.name);
      else throw new Error(`Collection ${collectionName} not found`);
    } catch (error) {
      console.log(`Error in db.getCollection(${index}): `, error.message);
      throw error;
    }
  },
  resetCollection: async (index) => {
    try {
      const db = client.db(databaseName);

      let collectionName = `${collectionLabel}-${index}`;
      if (index === -1) {
        await db.dropCollection(indexLabel);
        await db.createCollection(indexLabel);
        return;
      }

      if (database.collections.some((c) => c.name === collectionName)) {
        await db.dropCollection(collectionName);
      }

      await db.createCollection(collectionName);
      database.collections = await db.listCollections().toArray();
    } catch (error) {
      console.log("Error in db.resetCollection: ", error.message);
      throw error;
    }
  },
};

export default database;
