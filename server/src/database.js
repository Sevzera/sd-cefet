import { MongoClient } from "mongodb";
const uri =
  "mongodb+srv://sev:262951@sd-cluster.6rzpygc.mongodb.net/?retryWrites=true&w=majority";
const databaseName = "sd-database";
const collectionName = "results";

const database = {
  collections: [],
  getCollection: async (index) => {
    try {
      if (!database.collections[index]) {
        await MongoClient.connect(uri).then((client, err) => {
          if (err) console.log(err);
          else {
            database.collections[index] = client
              .db(databaseName)
              .collection(`${collectionName}-${index}`);
          }
        });
      }
      return database.collections[index];
    } catch (error) {
      console.log(`Error in db.getCollection(${index}): `, error);
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
