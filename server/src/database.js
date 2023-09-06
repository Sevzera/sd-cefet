import { MongoClient } from "mongodb";
const uri =
  "mongodb+srv://sev:262951@sd-cluster.6rzpygc.mongodb.net/?retryWrites=true&w=majority";
const databaseName = "sd-database";

let connection;
async function connect() {
  if (!connection) {
    await MongoClient.connect(uri).then((client, err) => {
      if (err) console.log(err);
      else {
        console.log("Connected successfully to database");
        connection = client.db(databaseName);
      }
    });
  }
  return connection;
}

export default await connect();
