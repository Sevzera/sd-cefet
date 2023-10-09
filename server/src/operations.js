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

    let collCount = Math.floor(maxDocCount / docCountBound);
    log(
      `DB SETUP -> Setting up ${collCount} collections to store ${maxDocCount} documents for ${proteinCount} proteins`
    );
    for (
      let collResetIndex = -1;
      collResetIndex < collCount;
      collResetIndex++
    ) {
      await database.resetCollection(collResetIndex);
    }
    log("DB SETUP -> Collections setted up");

    let docCount = 0;
    let indexRef = 0;
    const promises = [];
    const index = await database.getCollection(-1);
    for (let collIndex = 0; collIndex < collCount; collIndex++) {
      const collection = await database.getCollection(collIndex);
      const indexedIds = [];

      for (indexRef; indexRef < proteinCount; indexRef++) {
        let pairs = [];
        const id1 = proteinIds[indexRef];

        for (let indexCmp = indexRef; indexCmp < proteinCount; indexCmp++) {
          const id2 = proteinIds[indexCmp];
          pairs.push([id1, id2]);

          if (pairs.length >= 10000 || indexCmp === proteinCount - 1) {
            const docs = pairs.map(([id1, id2]) => ({
              _id: `${id1}-${id2}`,
              match: null,
            }));
            promises.push(async () => {
              await collection.insertMany(docs);
              count += 1;
              const progress = Number.parseFloat(
                (count / promises.length) * 100
              ).toFixed(2);
              log(`PROGRESS: ${progress}%`, true);
            });

            pairs = [];
            docCount += docs.length;
          }
        }

        indexedIds.push(id1);

        if (docCount >= docCountBound) break;
      }

      if (docCount >= docCountBound || collIndex === collCount - 1) {
        log(
          `DB SETUP -> Set to insert ${docCount} documents into collection ${collIndex}`
        );
        docCount = 0;
        indexRef += 1;

        const docs = indexedIds.map((id) => ({
          _id: id,
          collection: collIndex,
        }));

        promises.push(() => index.insertMany(docs));
      }
    }

    log("DB SETUP -> Inserting documents into collections...");
    log(`PROGRESS: 0%`, true);
    let count = 0;
    for (let i = 0; i < Math.ceil(promises.length / 1000); i++) {
      const slicedPromises = promises.slice(i * 1000, (i + 1) * 1000);
      await Promise.all(slicedPromises.map((fn) => fn()));
    }
    log("PROGRESS: 100%\n", true);

    const endTimer = Date.now();
    log(`DB SETUP -> Done in ${(endTimer - startTimer) / 1000}s`);
  } catch (err) {
    log(err.message);
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

operations.getPair = async (id1, id2) => {
  try {
    const index = await database.getCollection(-1);
    const indexes = await index
      .find({
        _id: {
          $in: [id1, id2],
        },
      })
      .toArray();
    const collIndexes = indexes.map((index) => index.collection);

    let result = null;
    for (const collIndex of collIndexes) {
      const collection = await database.getCollection(collIndex);
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
    console.log("Error in db.getPair: ", error);
    throw error;
  }
};

operations.getPairs = async (ids = [], size = 1) => {
  try {
    const index = await database.getCollection(-1);
    const indexes = await index
      .find({
        _id: {
          $in: ids,
        },
      })
      .toArray();
    const collIndexes = indexes.map((index) => index.collection);

    let result = [];
    for (const collIndex of collIndexes) {
      const collection = await database.getCollection(collIndex);
      const docs = await collection
        .find(
          {
            _id: {
              $regex: `(${ids.join("|")})`,
            },
          },
          { $limit: size }
        )
        .toArray();
      if (docs.length) {
        result.push(...docs);
      }
    }
    return result;
  } catch (error) {
    console.log("Error in db.getPairs: ", error);
    throw error;
  }
};

operations.getPairsByMatch = async (match = null, size = 1) => {
  try {
    const collection = await database.getCollection(0);
    const collectionsToUnify = database.collections
      .map((collection) => collection.name)
      .splice(1);

    const pipeline = [
      ...collectionsToUnify.map((collection) => ({
        $unionWith: {
          coll: collection,
        },
      })),
      {
        $match: {
          match: {
            ...(match === null && { $eq: null }),
            ...(typeof match === "number" && { $gte: match }),
          },
        },
      },
      { $limit: size },
    ];
    const result = await collection.aggregate(pipeline).toArray();

    return result;
  } catch (error) {
    console.log("Error in db.getPairByMatch: ", error);
    throw error;
  }
};

operations.setPairMatch = async (id1, id2, match) => {
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
    console.log("Error in db.setPairMatch: ", error);
    throw error;
  }
};

export default operations;
