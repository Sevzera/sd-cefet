import express from "express";
import axios from "axios";
import cors from "cors";
import operations from "./operations.js";

const status = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  ERROR: "Error",
};

const state = {
  isRunning: false,
  clients: [
    {
      name: "",
      url: "",
      status: "",
      queue: [],
    },
  ],
  queue: [],
  processing: [],
  results: [],
};

async function initDatabase() {
  const proteinIds = operations.getProteinIds(0, 4000);
  await operations.setupDatabase(proteinIds);
}

async function run() {
  try {
    if (state.isRunning) return;
    state.isRunning = true;

    if (state.queue <= 100) {
      const pairs = await operations.getNullPairs(null, 1000, state.processing);
      state.queue.push(...pairs);
    }

    // continue from here

    const { clients } = state;
    console.log(clients);
  } catch (err) {
    console.log("run error: ", err.message);
  }
}

const port = 1999;
const server = express();

server.use(cors({ origin: "*" }));
server.use(express.json());

server.post("/join", (req, res) => {
  try {
    const url = `${req.protocol}://${req.get("host")}`;
    const name = operations.getClientName(url);

    const index = state.clients.findIndex((c) => c.name === name);
    let client = null;
    if (index === -1) {
      client = {
        name,
        url,
        status: status.AVAILABLE,
        queue: [],
      };
      state.clients.push(client);
    } else {
      client = state.clients[index];
      client.url = url;
      client.status = status.AVAILABLE;
      client.queue = [];
    }

    res.status(200).send(client);
  } catch (err) {
    console.log("/join error: ", err.message);
  }
});

server.listen(port, async () => {
  try {
    console.log(`Server is running on port ${port}`);

    // Initializes database with 4000 proteins
    // await initDatabase();

    setInterval(run, 5000);
  } catch (err) {
    console.log("server listen error: ", err.message);
  }
});


