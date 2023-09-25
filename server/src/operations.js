import fs from "fs";
import { stdout } from "process";
import database from "./database.js";

const operations = {};

operations.setupDatabase = async (proteinIds) => {
  try {
    const startTimer = Date.now();

    let collCount = database.collections.length;
    console.log("DB SETUP -> Resetting collections...");
    for (let collResetIndex = 0; collResetIndex < collCount; collResetIndex++) {
      await database.resetCollection(collResetIndex);
    }
    console.log("DB SETUP -> Collections reset");

    const proteinCount = proteinIds.length;
    let docCount = 0;
    const maxDocsPerCollection = 6000000;
    let breakIdIndex = 0;
    const promises = [];
    for (let collIndex = 0; collIndex < collCount; collIndex++) {
      const collection = await database.getCollection(collIndex);
      console.log(`COLL${collIndex} -> Inserting null matched pairs...`);

      for (let id1Index = breakIdIndex; id1Index < proteinCount; id1Index++) {
        let pairs = [];
        const id1 = proteinIds[id1Index];

        for (let id2Index = id1Index; id2Index < proteinCount; id2Index++) {
          const id2 = proteinIds[id2Index];
          pairs.push([id1, id2]);

          if (pairs.length >= 1000 || id2Index === proteinCount - 1) {
            const insert = async () => {
              const docs = pairs.map(([id1, id2]) => ({
                _id: `${id1}-${id2}`,
                match: null,
              }));
              await collection.insertMany(docs);
              docCount += docs.length;
            };

            promises.push(insert());
            stdout.clearLine(0);
            stdout.cursorTo(0);
            stdout.write(
              `COLL${collIndex} -> PROGRESS: ${Number.parseFloat(
                (docCount / maxDocsPerCollection) * 100
              ).toFixed(2)}%`
            );

            pairs = [];
          }
        }

        if (docCount > maxDocsPerCollection) {
          stdout.clearLine(0);
          stdout.cursorTo(0);
          console.log(`COLL${collIndex} -> PROGRESS: 100%`);
          docCount = 0;
          breakIdIndex = id1Index;
          break;
        }
      }
    }

    await Promise.all(promises);

    const endTimer = Date.now();
    console.log(`DB SETUP -> done in ${(endTimer - startTimer) / 1000}s`);
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
