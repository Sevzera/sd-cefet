import fs from "fs";

const utils = {};

utils.getIds = () => {
  try {
    const ids = fs.readFileSync("./src/ids.txt").toString().split(",");
    return ids;
  } catch (err) {
    console.log(err);
  }
};

export default utils;
