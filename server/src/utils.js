import { stdout } from "process";

const utils = {};

utils.log = (msg, overwrite = false) => {
  stdout.clearLine(0);
  stdout.cursorTo(0);
  if (overwrite) {
    stdout.write(msg);
  } else {
    console.log(msg);
  }
};

utils.isUrlValid = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

utils._idToIds = (_id) => {
  try {
    const ids = _id.split("-");
    return ids;
  } catch (error) {
    throw error;
  }
};

export default utils;
