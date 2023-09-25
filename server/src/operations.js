import fs from "fs";
import { stdout } from "process";
import database from "./database.js";

const operations = {};

const log = (msg, overwrite = false) => {
  stdout.clearLine(0);
  stdout.cursorTo(0);
  if (overwrite) {
    stdout.write(msg);
  } else {
    console.log(msg);
  }
};

operations.setupDatabase = async (proteinIds) => {
  try {
    const startTimer = Date.now();
    const proteinCount = proteinIds.length;
    const maxDocCount = (proteinCount * (proteinCount + 1)) / 2;
    const docCountBound = 500000;

    let collCount = Math.ceil(maxDocCount / docCountBound);
    log(
      `DB SETUP -> Setting up ${collCount} collections to store ${maxDocCount} documents for ${proteinCount} proteins`
    );
    for (let collResetIndex = 0; collResetIndex < collCount; collResetIndex++) {
      await database.resetCollection(collResetIndex);
    }
    log("DB SETUP -> Collections setted up");

    let docCount = 0;
    let indexRef = 0;
    const promises = [];
    for (let collIndex = 0; collIndex < collCount; collIndex++) {
      const collection = await database.getCollection(collIndex);
      for (indexRef; indexRef < proteinCount; indexRef++) {
        let pairs = [];
        const id1 = proteinIds[indexRef];

        for (let indexCmp = indexRef; indexCmp < proteinCount; indexCmp++) {
          const id2 = proteinIds[indexCmp];
          pairs.push([id1, id2]);

          if (pairs.length >= 5000 || indexCmp === proteinCount - 1) {
            const docs = pairs.map(([id1, id2]) => ({
              _id: `${id1}-${id2}`,
              match: null,
            }));
            promises.push(async () => await collection.insertMany(docs));

            pairs = [];
            docCount += docs.length;
          }
        }

        if (docCount >= docCountBound) break;
      }

      if (docCount >= docCountBound || collIndex === collCount - 1) {
        log(
          `DB SETUP -> Set to insert ${docCount} documents into collection ${collIndex}`
        );
        docCount = 0;
      }
    }

    log("DB SETUP -> Inserting documents into collections...");
    log(`PROGRESS: 0%`, true);
    let count = 0;
    await Promise.all(
      promises.map(async (fn) => {
        await fn();
        count += 1;
        const progress = Number.parseFloat(
          (count / promises.length) * 100
        ).toFixed(2);
        log(`PROGRESS: ${progress}%`, true);
      })
    );
    log("PROGRESS: 100%\n", true);

    const endTimer = Date.now();
    log(`DB SETUP -> Done in ${(endTimer - startTimer) / 1000}s`);
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
