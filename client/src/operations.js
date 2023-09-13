import { exec } from "child_process";

const sleep = (s) => {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
};

const run = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        reject(error.message);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        reject(stderr);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
};

const operations = {};

operations.downloadPDB = async (id) => {
  return console.log(`Downloading PDB file for ${id}`);
};

operations.downloadPDBs = async (ids) => {
  return console.log(`Downloading PDB files for ${ids}`);
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
