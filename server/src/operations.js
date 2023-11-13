import utils from "./utils.js";
import database from "./database.js";

const operations = {};

operations.setupDatabase = async (proteinIds) => {
  try {
    const startTimer = Date.now();
    const proteinCount = proteinIds.length;
    const maxDocCount = (proteinCount * (proteinCount + 1)) / 2;
    const docCountBound = 500000;

    let collCount = Math.floor(maxDocCount / docCountBound);
    utils.log(
      `DB SETUP -> Setting up ${collCount} collections to store ${maxDocCount} documents for ${proteinCount} proteins`
    );
    for (
      let collResetIndex = -1;
      collResetIndex < collCount;
      collResetIndex++
    ) {
      await database.resetCollection(collResetIndex);
    }
    utils.log("DB SETUP -> Collections setted up");

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
              utils.log(`PROGRESS: ${progress}%`, true);
            });

            pairs = [];
            docCount += docs.length;
          }
        }

        indexedIds.push(id1);

        if (docCount >= docCountBound) break;
      }

      if (docCount >= docCountBound || collIndex === collCount - 1) {
        utils.log(
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

    utils.log("DB SETUP -> Inserting documents into collections...");
    utils.log(`PROGRESS: 0%`, true);
    let count = 0;
    for (let i = 0; i < Math.ceil(promises.length / 1000); i++) {
      const slicedPromises = promises.slice(i * 1000, (i + 1) * 1000);
      await Promise.all(slicedPromises.map((fn) => fn()));
    }
    utils.log("PROGRESS: 100%\n", true);

    const endTimer = Date.now();
    utils.log(`DB SETUP -> Done in ${(endTimer - startTimer) / 1000}s`);
  } catch (error) {
    console.error("Error in operations.setupDatabase: ", error);
    throw error;
  }
};

operations.getProteinIds = (start, end) => {
  try {
    const ids = fs.readFileSync("./src/ids.txt").toString().split(",");
    return ids.slice(start, end);
  } catch (error) {
    console.error("Error in operations.setupDatabase: ", error);
    throw error;
  }
};

operations.getPairs = async (size = 1, exceptions = []) => {
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
          _id: {
            $nin: exceptions,
          },
          match: null,
        },
      },
      { $limit: size },
      {
        $project: {
          _id: 1,
        },
      },
    ];
    const result = await collection.aggregate(pipeline).toArray();

    const pairs = result.map((doc) => doc._id);
    return pairs;
  } catch (error) {
    console.error("Error in operations.getPairs: ", error);
    throw error;
  }
};

operations.getMaxIndex = async (ids) => {
  try {
    const collection = await database.getCollection(-1);
    const result = await collection.find({ _id: { $in: ids } }).toArray();
    const indexes = result.map((doc) => doc.collection);
    const max = Math.max(...indexes);
    return max;
  } catch (error) {
    console.error("Error in operations.getMaxIndex: ", error);
    throw error;
  }
};

operations.updatePair = async (id1, id2, match) => {
  try {
    const max = await operations.getMaxIndex([id1, id2]);
    let result = null;
    for (let index = 0; index <= max; index++) {
      const collection = await database.getCollection(index);
      const doc = await collection.findOneAndUpdate(
        {
          _id: {
            $in: [`${id1}-${id2}`, `${id2}-${id1}`],
          },
        },
        {
          $set: {
            match: Number(match),
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
    console.error("Error in operations.updatePair: ", error);
    throw error;
  }
};

operations.updatePairs = async (pairs) => {
  try {
    const promises = [];

    for (const pair of pairs) {
      const { _id, match } = pair;
      const [id1, id2] = utils._idToIds(_id);
      promises.push(operations.updatePair(id1, id2, match));
    }

    const result = await Promise.all(promises);
    return result;
  } catch (error) {
    console.error("Error in operations.updatePairs: ", error);
    throw error;
  }
};

operations.resetPairs = async (pairs) => {
  try {
    const collCount = database.collections.length;
    const promises = [];

    for (let i = 0; i < collCount; i++) {
      const collection = await database.getCollection(i);
      promises.push(
        collection.updateMany(
          {},
          {
            $set: {
              match: null,
            },
          }
        )
      );
    }

    const result = await Promise.all(promises);
    return result;
  } catch (error) {
    console.error("Error in operations.setPairMatches: ", error);
    throw error;
  }
};

export default operations;
