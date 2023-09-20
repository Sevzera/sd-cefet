import fs from "fs";
import { stdout } from "process";
import database from "./database.js";

const operations = {};

operations.setupDatabase = async (proteinIds, resetCollection) => {
  try {
    const startTimer = Date.now();

    // continue from here
    const collection = await database.getCollection(index);
    if (resetCollection) {
      console.log(`COLL${index} -> Resetting collection...`);
      await collection.deleteMany();
      console.log(`COLL${index} -> Collection reset!`);
    }
    console.log(`COLL${index} -> Inserting null matched pairs...`);
    const promises = [];
    for (const [i, id1] of proteinIds.entries()) {
      let pairs = [];
      for (let j = i; j < proteinIds.length; j++) {
        const id2 = proteinIds[j];
        pairs.push([id1, id2]);
        if (pairs.length >= 1000 || j === proteinIds.length - 1) {
          const insert = async () => {
            const docs = pairs.map(([id1, id2]) => ({
              _id: `${id1}-${id2}`,
              match: null,
            }));
            await collection.insertMany(docs);
            stdout.clearLine(0);
            stdout.cursorTo(0);
            stdout.write(
              `COLL${index} -> PROGRESS: ${Number.parseFloat(
                (i / proteinIds.length) * 100
              ).toFixed(2)}%`
            );
          };
          promises.push(insert());
          pairs = [];
        }
      }
    }

    await Promise.all(promises);
    stdout.clearLine(0);
    stdout.cursorTo(0);
    console.log(`COLL${index} -> PROGRESS: 100%`);

    const endTimer = Date.now();
    console.log(`COLL${index} -> done in ${(endTimer - startTimer) / 1000}s`);
  } catch (err) {
    console.log(err);
  }
};

operations.getProteinIds = (start, end) => {
  try {
    const ids = fs.readFileSync("./src/ids.txt").toString().split(",");
    return ids.slice(start, end);
  } catch (err) {
    console.log(err);
  }
};

operations.getClientName = (url) => {
  const name = url.split("//")[1].split(":")[0];
  return name;
};

export default operations;
