import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";
import operations from "./operations.js";
import utils from "./utils.js";
const { SERVER_PORT } = process.env;

const status = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  ERROR: "Error",
};

const state = {
  is_running: false,
  interval_id: null,
  clients: [
    {
      name: "",
      url: "",
      status: "",
      queue: [],
    },
  ],
  queue: [],
  done: [],
};

const switchIsRunning = () => (state.is_running = !state.is_running);

async function run() {
  try {
    const { is_running } = state;
    if (is_running) return;
    switchIsRunning();

    const { clients, queue, done } = state;

    console.clear();
    console.log(
      "----------------------------------------\n" +
        "STATE\n\n" +
        `QUEUE: ${queue.length}\n` +
        `DONE: ${done.length}\n` +
        `CLIENTS AVAILABLE: ${clients
          .filter((client) => client.status === status.AVAILABLE)
          .map((client) => client.name)}\n` +
        `CLIENTS BUSY: ${clients
          .filter((client) => client.status === status.BUSY)
          .map((client) => client.name)}\n` +
        `CLIENTS ERROR: ${clients
          .filter((client) => client.status === status.ERROR)
          .map((client) => client.name)}\n` +
        "\n----------------------------------------"
    );

    if (state.done.length >= 1000) {
      const { interval_id } = state;
      clearInterval(interval_id);
    }

    // REFILL QUEUE IF NEEDED
    if (queue.length < 100) {
      const size = 200 - queue.length;
      const processing = clients.reduce(
        (accumulator, client) => [...accumulator, ...client.queue],
        []
      );
      const pairs = await operations.getNullPairs(null, size, [
        ...processing,
        ...queue,
      ]);
      queue.push(...pairs);
    }

    // HANDLE CLIENTS
    for (const client of clients) {
      if (client.status === status.ERROR) continue;

      if (client.status === status.AVAILABLE) {
        const client_queue = queue.splice(0, 50);
        if (!client_queue.length) continue;

        client.status = status.BUSY;
        client.queue = client_queue;
        axios
          .post(`${client.url}/run`, {
            new_state: client,
          })
          .then(({ status }) => {
            if (status !== 200) {
              client.status = status.ERROR;
              queue.push(...client.queue);
              client.queue = [];
            }
          });
      }
    }

    switchIsRunning();
  } catch (error) {
    console.error("run error: ", error);
  }
}

const server = express();

server.use(cors({ origin: "*" }));
server.use(express.json());

async function initDatabase() {
  const proteinIds = operations.getProteinIds(0, 4000);
  await operations.setupDatabase(proteinIds);
}

server.post("/join", (req, res) => {
  try {
    const { host, port } = req.body;
    const url = `http://${host}:${port}`;

    const name = req.socket.remoteAddress + ":" + port;
    const index = state.clients.findIndex((c) => c.name === name);

    let client = {};
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

    res.status(200).send({
      new_state: client,
    });
  } catch (error) {
    console.error("/join error: ", error);
  }
});

server.post("/done", (req, res) => {
  try {
    const { new_state } = req.body;
    const client = state.clients.find(
      (client) => client.name === new_state.name
    );

    state.done.push(...new_state.queue);
    client.status = status.AVAILABLE;
    client.queue = [];
  } catch (error) {
    console.error("/done error: ", error);
  }
});

server.listen(SERVER_PORT, async () => {
  try {
    console.log(`Server is running on port ${SERVER_PORT}`);

    // Initializes database with 4000 proteins
    // await initDatabase();

    state.interval_id = setInterval(run, 5000);
  } catch (error) {
    console.error("server listen error: ", error);
  }
});
