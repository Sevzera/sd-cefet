import express from "express";
import axios from "axios";
import cors from "cors";

const serverUrl = "http://localhost:1999";

let shouldReportError = false;
const state = {
  name: "",
  url: "",
  status: "",
  queue: [],
  results: [],
};
const operations = {};

const port = 2000;
const client = express();

client.use(cors({ origin: "*" }));
client.use(express.json());

client.listen(port, async () => {
  try {
    console.log(`Client is running on port ${port}`);
    const { status, data } = await axios.post(`${serverUrl}/join`);
    if (status === 200) {
      state.name = data.name;
      state.url = data.url;
      state.status = data.status;
      state.queue = data.queue;
      state.results = [];
    }
  } catch (err) {
    console.log("client listen error: ", err.message);
  }
});

client.get("/check", async (req, res) => {
  try {
    if (shouldReportError) {
      res.status(500);
      shouldReportError = false;
    } else {
      res.status(200);
    }
  } catch (err) {
    console.log("/state error: ", err.message);
  }
});

client.post("/process", async (req, res) => {
  try {
    const { pairs } = req.body;
    const results = await operations.processPairs(pairs);
    res.status(200).send(results);
  } catch (err) {
    shouldReportError = true;
    console.log("/process error: ", err.message);
  }
});

operations.sleep = (s) => {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
};

operations.processPair = async (id1, id2) => {
  const time = Number(Math.random() * 10).toFixed(2);
  await operations.sleep(time);
  const match = Number(Math.random() * 100).toFixed(2);

  return {
    id1,
    id2,
    match,
  };
};

operations.processPairs = async (pairs) => {
  const processes = [];
  for (const pair of pairs) {
    const [id1, id2] = pair;
    processes.push(operations.processPair(id1, id2));
  }

  return await Promise.all(processes);
};
