import express from "express";
import cors from "cors";
import operations from "./operations.js";

export default global = {
  isBusy: false,
};

const port = 2000;
const api = express();

api.use(cors({ origin: "*" }));

api.listen(port, () => {
  console.log(`Client is running on port ${port}`);
});

api.get("/client/state", (req, res) => {
  res.send(global);
});

api.post("/client/download-pdb", (req, res) => {
  const { id } = req.body;
  res.send(`Downloading PDB file for ${id}`);
});

api.post("/client/download-pdbs", (req, res) => {
  const { id1, id2 } = req.body;
  res.send(`Downloading PDB file for ${id}`);
});

api.post("/client/process-pair", (req, res) => {
  const { id1, id2 } = req.body;
  res.send(`Downloading PDB file for ${id}`);
});

api.post("/client/process-pairs", (req, res) => {
  const { pairs } = req.body;
  res.send(`Downloading PDB file for ${id}`);
});
