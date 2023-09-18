import { MongoClient } from "mongodb";
const uri =
  "mongodb+srv://sev:262951@sd-cluster.6rzpygc.mongodb.net/?retryWrites=true&w=majority";
const databaseName = "sd-database";
const collectionName = "results";

const database = {
  connection: null,
};

database.connect = async () => {
  if (!database.connection) {
    await MongoClient.connect(uri).then((client, err) => {
      if (err) console.log(err);
      else {
        console.log("Connected successfully to database");
        database.connection = client
          .db(databaseName)
          .collection(collectionName);
      }
    });
  }
  return database.connection;
};

database.show = async (id1, id2) => {
  try {
    console.log("show", {
      id1,
      id2,
    });
  } catch (error) {
    console.log("Error in db.show: ", error);
    throw error;
  }
};

database.index = async (id1, id2) => {
  try {
    console.log("index", {
      id1,
      id2,
    });
  } catch (error) {
    console.log("Error in db.index: ", error);
    throw error;
  }
};

database.create = async (id1, id2, data) => {
  try {
    console.log("create", {
      id1,
      id2,
      data,
    });
  } catch (error) {
    console.log("Error in db.create: ", error);
    throw error;
  }
};

database.update = async (id1, id2, data) => {
  try {
    console.log("update", {
      id1,
      id2,
      data,
    });
  } catch (error) {
    console.log("Error in db.update: ", error);
    throw error;
  }
};

database.delete = async (id1, id2) => {
  try {
    console.log("delete", {
      id1,
      id2,
    });
  } catch (error) {
    console.log("Error in db.delete: ", error);
    throw error;
  }
};

export default await database.connect();