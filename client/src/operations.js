const operations = {};

const sleep = (s) => {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
};

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
  console.log(`Processing ${pairs}`);
  await sleep(5);
  return console.log(`Processing ${pairs}`);
};

export default operations;
