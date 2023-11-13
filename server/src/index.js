import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";
import operations from "./operations.js";
import utils from "./utils.js";
const { SERVER_PORT } = process.env;

const CLIENT_QUEUE_SIZE = 100;
const DONE_MAX = 250;
const LOCAL_QUEUE_MIN = 500;
const REFILL_SIZE = 1000;
const MESSAGES_MAX = 4;
const REQUEST_TIMEOUT = CLIENT_QUEUE_SIZE * 10 + 5000;

const status = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  ERROR: "Error",
};

const state = {
  is_running: false,
  show_interval_id: null,
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
  saving: [],
};

const messages = [];
const show = () => {
  const { clients, queue, done } = state;

  if (messages.length >= MESSAGES_MAX)
    messages.splice(0, messages.length - MESSAGES_MAX);

  console.clear();
  console.log(
    "---------------------------------\n" +
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
      "\n---------------------------------\n" +
      messages.map((message) => message + "\n").join("")
  );
};

const handleClientError = (client) => {
  const { queue } = state;
  client.status = status.ERROR;
  queue.push(...client.queue);
  client.queue = [];
};

async function run() {
  try {
    show();

    const { is_running } = state;
    if (is_running) return;
    state.is_running = !state.is_running;

    const { clients, queue, done } = state;

    // SAVE DATA
    if (done.length >= DONE_MAX) {
      state.saving = [...done];
      state.done = [];
      const { saving } = state;
      operations.updatePairs(saving).then(() => {
        messages.push(`Saved ${saving.length} pairs to database`);
      });
    }

    // REFILL QUEUE IF NEEDED
    if (queue.length <= LOCAL_QUEUE_MIN) {
      const processing = clients.reduce(
        (accumulator, client) => [...accumulator, ...client.queue],
        []
      );
      const exceptions = [
        ...processing,
        ...queue,
        ...done.map((pair) => pair._id),
        ...saving.map((pair) => pair._id),
      ];
      const pairs = await operations.getPairs(REFILL_SIZE, exceptions);
      queue.push(...pairs);
    }

    // HANDLE CLIENTS
    for (const client of clients) {
      if (client.status === status.ERROR) continue;

      if (client.status === status.AVAILABLE && queue.length) {
        client.status = status.BUSY;
        client.queue = queue.splice(0, CLIENT_QUEUE_SIZE);
        axios
          .post(`${client.url}/run`, {
            new_state: client,
          })
          .then(() => {
            setTimeout(() => {
              if (client.status === status.BUSY) {
                messages.push(`Connection timed out for ${client.name}`);
                handleClientError(client);
              }
            }, REQUEST_TIMEOUT * 1000);
          })
          .catch(({ code }) => {
            messages.push(`Run request failed for ${client.name} [${code}]`);
            handleClientError(client);
          });
      }
    }

    state.is_running = !state.is_running;
  } catch (error) {
    messages.push("run ERROR: ", error);
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
    const host = req.socket.remoteAddress.split(":").pop();
    const { port } = req.body;
    const url = `http://${host}:${port}`;
    const { clients } = state;
    const name = host + ":" + port;
    const index = clients.findIndex((c) => c.name === name);

    let client = {};
    if (index === -1) {
      client = {
        name,
        url,
        status: status.AVAILABLE,
        queue: [],
      };
      clients.push(client);
    } else {
      client = clients[index];
      if (client.status === status.BUSY) {
        handleClientError(client);
        return messages.push(`${client.name} hit /join while busy`);
      }
      client.url = url;
      client.status = status.AVAILABLE;
      client.queue = [];
    }

    res.status(200).send({
      new_state: client,
    });
    messages.push(`${client.name} joined`);
  } catch (error) {
    messages.push("/join ERROR: ", error);
    res.status(500).send("Server error");
  }
});

server.post("/done", (req, res) => {
  try {
    const { new_state } = req.body;
    const { clients } = state;
    const client = clients.find((client) => client.name === new_state.name);

    if (!client)
      return res.status(500).send("Client is invalid, hit /join to sign-in");

    if (client.status === status.ERROR)
      return res
        .status(500)
        .send("Client is errored out, try hitting /join to sign-in again");

    const { done } = state;
    done.push(...new_state.done);
    client.status = status.AVAILABLE;
    client.queue = [];
  } catch (error) {
    messages.error("/done ERROR: ", error);
  }
});

server.listen(SERVER_PORT, async () => {
  try {
    console.log(`Server is running on port ${SERVER_PORT}`);

    // Initializes database with 4000 proteins, this takes some time
    // await initDatabase();
    // Resets all pairs to match = null, also takes some time but less than initDatabase
    // await operations.resetPairs();

    state.show_interval_id = setInterval(run, 1000);
  } catch (error) {
    console.error("server listen ERROR: ", error);
  }
});
