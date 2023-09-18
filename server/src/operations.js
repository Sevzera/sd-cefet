import fs from "fs";
import { stdout } from "process";
import database from "./database.js";

const operations = {};

operations.buildProteinIdPairs = async (proteinIds) => {
  try {
    console.log("Building proteinId pairs...");
    let count = 0;
    const promises = [];
    for (const [index, id1] of proteinIds.entries()) {
      const pairs = [];
      for (let i = index; i < proteinIds.length; i++) {
        const id2 = proteinIds[i];
        count++;
        pairs.push([id1, id2]);
      }
      promises.push(
        database.bulkWrite(
          pairs.map(([id1, id2]) => ({
            insertOne: {
              document: {
                _id: `${id1}-${id2}`,
                match: null,
              },
            },
          }))
        )
      );
      stdout.clearLine(0);
      stdout.cursorTo(0);
      stdout.write(
        `PROGRESS: ${Number.parseFloat(
          (index / proteinIds.length) * 100
        ).toFixed(2)}%`
      );
    }

    await Promise.all(promises);
    stdout.clearLine(0);
    stdout.cursorTo(0);
    console.log("PROGRESS: 100%");
    console.log("Total pairs: ", count);
  } catch (err) {
    console.log(err);
  }
};

operations.getProteinIds = () => {
  try {
    const ids = fs.readFileSync("./src/ids.txt").toString().split(",");
    return ids.slice(0, 10);
  } catch (err) {
    console.log(err);
  }
};

operations.getClientName = (url) => {
  const name = url.split("//")[1].split(":")[0];
  return name;
};

export default operations;
