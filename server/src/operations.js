import fs from "fs";
import { stdout } from "process";
import database from "./database.js";

const operations = {};

operations.buildProteinIdPairs = async (proteinIds) => {
  try {
    const startTimer = Date.now();

    console.log("Resetting database...");
    await database.deleteMany();
    console.log("Database reset!");
    console.log("Inserting null matched pairs...");
    const promises = [];
    for (const [index, id1] of proteinIds.entries()) {
      const pairs = [];
      for (let i = index; i < proteinIds.length; i++) {
        const id2 = proteinIds[i];
        pairs.push([id1, id2]);
      }

      const pairObjects = pairs.map(([id1, id2]) => ({
        _id: `${id1}-${id2}`,
        // match: null,
        match: "100%",
      }));

      const promiseFn = async () => {
        await database.insertMany(pairObjects);
        stdout.clearLine(0);
        stdout.cursorTo(0);
        stdout.write(
          `PROGRESS: ${Number.parseFloat(
            (index / proteinIds.length) * 100
          ).toFixed(2)}%`
        );
      };
      promises.push(promiseFn());
    }

    await Promise.all(promises);
    stdout.clearLine(0);
    stdout.cursorTo(0);
    console.log("PROGRESS: 100%");
    const count = await database.countDocuments();
    console.log(`Inserted ${count} pairs`);

    const endTimer = Date.now();
    console.log(`Done in ${(endTimer - startTimer) / 1000}s`);
  } catch (err) {
    console.log(err);
  }
};

operations.getProteinIds = () => {
  try {
    const ids = fs.readFileSync("./src/ids.txt").toString().split(",");
    return ids.slice(0, 1000);
  } catch (err) {
    console.log(err);
  }
};

operations.getClientName = (url) => {
  const name = url.split("//")[1].split(":")[0];
  return name;
};

export default operations;
