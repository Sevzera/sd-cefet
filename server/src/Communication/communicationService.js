import database from "../database.js";
const resultsCollection = database.collection("results");

const communicationService = {};

communicationService.showResult = async (id1, id2) => {
  try {
    console.log("showResult", {
      id1,
      id2,
    });
  } catch (error) {
    console.log("Error in communicationService.showResult: ", error);
    throw error;
  }
};

communicationService.indexResult = async (id1, id2) => {
  try {
    console.log("indexResult", {
      id1,
      id2,
    });
  } catch (error) {
    console.log("Error in communicationService.indexResult: ", error);
    throw error;
  }
};

communicationService.createResult = async (id1, id2, data) => {
  try {
    console.log("createResult", {
      id1,
      id2,
      data,
    });
  } catch (error) {
    console.log("Error in communicationService.createResult: ", error);
    throw error;
  }
};

communicationService.updateResult = async (id1, id2, data) => {
  try {
    console.log("updateResult", {
      id1,
      id2,
      data,
    });
  } catch (error) {
    console.log("Error in communicationService.updateResult: ", error);
    throw error;
  }
};

communicationService.deleteResult = async (id1, id2) => {
  try {
    console.log("deleteResult", {
      id1,
      id2,
    });
  } catch (error) {
    console.log("Error in communicationService.deleteResult: ", error);
    throw error;
  }
};

export default communicationService;
