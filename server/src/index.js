import express from "express";
import cors from "cors";
import utils from "./utils.js";

const clientUrls = ["http://localhost:2000/client"];

const global = {
  clients: [
    {
      name: null,
      url: null,
      latestState: null,
    },
  ],
  proteins: utils.getIds().map((id) => ({
    id,
    comparedWith: [],
  })),
};

const port = 1999;
const api = express();

api.use(cors({ origin: "*" }));

api.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


