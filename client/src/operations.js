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
  return console.log(`Processing ${id1} and ${id2}`);
};

operations.processPairs = async (pairs) => {
  await run("sh ./src/lsqkab.sh");
  await sleep(5);
  return console.log(`Processing ${pairs}`);
};

export default operations;
