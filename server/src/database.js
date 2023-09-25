import { MongoClient } from "mongodb";
const uri =
  "mongodb+srv://sev:262951@sd-cluster.6rzpygc.mongodb.net/?retryWrites=true&w=majority";
const databaseName = "sd-database";
const collectionLabel = "results";
const client = await MongoClient.connect(uri);

const database = {
  collections: await client.db(databaseName).listCollections().toArray(),
  getCollection: async (index) => {
    try {
      const name = `${collectionLabel}-${index}`;
      const db = client.db(databaseName);
      const collection = database.collections.find((c) => c.name === name);
      if (collection) return db.collection(collection.name);
      else throw new Error(`Collection ${name} not found`);
    } catch (error) {
      console.log(`Error in db.getCollection(${index}): `, error.message);
      throw error;
    }
  },
  resetCollection: async (index) => {
    try {
      const db = client.db(databaseName);

      const collectionName = `${collectionLabel}-${index}`;
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

database.show = async (id1, id2) => {
  try {
    let result = null;
    for (const collection of database.collections) {
      const doc = await collection.findOne({
        _id: {
          $in: [`${id1}-${id2}`, `${id2}-${id1}`],
        },
      });
      if (doc) {
        result = doc;
        break;
      }
    }
    return result;
  } catch (error) {
    console.log("Error in db.show: ", error);
    throw error;
  }
};

database.index = async (ids) => {
  try {
    let result = [];
    for (const collection of database.collections) {
      const docs = await collection
        .find({
          _id: {
            $regex: `(${ids.join("|")})`,
          },
        })
        .toArray();
      if (docs.length) {
        result.push(...docs);
      }
    }
    return result;
  } catch (error) {
    console.log("Error in db.index: ", error);
    throw error;
  }
};

database.update = async (id1, id2, match) => {
  try {
    let result = null;
    for (const collection of database.collections) {
      const doc = await collection.findOneAndUpdate(
        {
          _id: {
            $in: [`${id1}-${id2}`, `${id2}-${id1}`],
          },
        },
        {
          $set: {
            match,
          },
        },
        {
          returnOriginal: false,
        }
      );
      if (doc) {
        result = doc;
        break;
      }
    }
    return result;
  } catch (error) {
    console.log("Error in db.update: ", error);
    throw error;
  }
};

export default database;
