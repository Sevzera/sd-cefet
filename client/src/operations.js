import fs from "fs";

const sleep = (s) => {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
};

const operations = {};

operations.getIds = () => {
  try {
    const ids = fs.readFileSync("./src/ids.txt").toString().split(",");
    return ids;
  } catch (err) {
    console.log(err);
  }
};

operations.processPair = async (id1, id2) => {
  const time = Number(Math.random() * 10).toFixed(2);
  await sleep(time);
  const match = Number(Math.random() * 100).toFixed(2);
  console.log(`Processed ${id1} and ${id2} for ${time} seconds and got ${match}% match`);
  return match;
};

operations.processPairs = async (pairs) => {

  const processedPairs = [];
  for (const pair of pairs) {
    const [id1, id2] = pair;
    const match = await operations.processPair(id1, id2);
    processedPairs.push(pair.push(match));
  }

  return console.log(`Processed ${pairs}`);
};

export default operations;
