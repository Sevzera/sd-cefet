import fs from "fs";
import database from "./database.js";

const operations = {};

operations.getIds = () => {
  try {
    const ids = fs.readFileSync("./src/ids.txt").toString().split(",");
    return ids;
  } catch (err) {
    console.log(err);
  }
};

operations.getClientName = (url) => {
  const name = url.split("//")[1].split(":")[0];
  return name;
};

operations.getBatches = (proteins, activeClientsNum) => {
  const batchSize = Math.ceil(proteins.length / activeClientsNum);
  const batches = new Array(activeClientsNum).fill([]);

  batches.forEach((batch, i) => {
    const start = i * batchSize;
    const end = start + batchSize;
    const batchData = proteins.slice(start, end);
    batch.push(...batchData);
  });

  return batches;
};

export default operations;
