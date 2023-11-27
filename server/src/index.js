import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";
import operations from "./operations.js";
import utils from "./utils.js";
const { SERVER_PORT } = process.env;

const CLIENT_QUEUE_SIZE = 100;
const DONE_MAX = 1000;
const LOCAL_QUEUE_MIN = 5000;
const REFILL_SIZE = 1000;
const MESSAGES_MAX = 10;
const REQUEST_TIMEOUT_SECONDS = 20;

const status = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  ERROR: "Error",
};

const state = {
  is_running: false,
  is_locked: false,
  show_interval_id: null,
  clients: [
    {
      name: "",
      url: "",
      status: "",
      queue: [],
      timeout_id: null,
    },
  ],
  queue: [],
  done: [],
  saving: [],
};

const messages = [];
const show = () => {
  if (messages.length >= MESSAGES_MAX)
    messages.splice(0, messages.length - MESSAGES_MAX);

  console.clear();
  console.log(
    "---------------------------------\n" +
      "STATE\n\n" +
      `QUEUE: ${state.queue.length}\n` +
      `DONE: ${state.done.length}\n` +
      `SAVING: ${state.saving.length} batch(es)\n` +
      `CLIENTS AVAILABLE: ${state.clients
        .filter((client) => client.status === status.AVAILABLE)
        .map((client) => client.name)}\n` +
      `CLIENTS BUSY: ${state.clients
        .filter((client) => client.status === status.BUSY)
        .map((client) => client.name)}\n` +
      `CLIENTS ERROR: ${state.clients
        .filter((client) => client.status === status.ERROR)
        .map((client) => client.name)}\n` +
      "\n---------------------------------\n" +
      messages.join("\n")
  );
};

const handleClientError = (client) => {
  client.status = status.ERROR;
  state.queue.push(...client.queue);
  client.queue = [];
};

async function run() {
  try {
    show();

    if (state.is_running) return;
    state.is_running = !state.is_running;

    // REFILL QUEUE IF NEEDED
    if (state.queue.length <= LOCAL_QUEUE_MIN) {
      const processing = state.clients.reduce(
        (accumulator, client) => [...accumulator, ...client.queue],
        []
      );
      const exceptions = [
        ...processing,
        ...state.queue,
        ...state.done.map((pair) => pair._id),
        ...state.saving.flat().map((pair) => pair._id),
      ];
      operations.getPairs(REFILL_SIZE, exceptions).then((pairs) => {
        state.queue.push(...pairs);
      });
    }

    // HANDLE CLIENTS
    for (const client of state.clients) {
      if (client.status === status.ERROR) continue;

      if (client.status === status.AVAILABLE && state.queue.length) {
        client.status = status.BUSY;
        client.queue = state.queue.splice(0, CLIENT_QUEUE_SIZE);
        axios
          .post(`${client.url}/run`, {
            queue: client.queue,
          })
          .then(() => {
            client.timeout_id = setTimeout(() => {
              if (client.status === status.BUSY) {
                messages.push(`Connection timed out for ${client.name}`);
                handleClientError(client);
              }
            }, REQUEST_TIMEOUT_SECONDS * 1000);
          })
          .catch(({ code }) => {
            messages.push(`/run request failed for ${client.name} [${code}]`);
            handleClientError(client);
          });
      }
    }

    // SAVE DATA
    if (state.done.length >= DONE_MAX) {
      state.saving.push([...state.done]);
      state.done = [];
    }
    if (state.saving.length && !state.is_locked) {
      state.is_locked = true;
      const batch = state.saving.at(0);
      operations.updatePairs(batch).then(() => {
        messages.push(`Saved ${batch.length} pairs to database`);
        state.saving.shift();
        state.is_locked = false;
      });
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
    const { name, url } = utils.getClientNameAndURL(req);
    const index = state.clients.findIndex((c) => c.name === name);

    let client = {};
    if (index === -1) {
      client = {
        name,
        url,
        status: status.AVAILABLE,
        queue: [],
        timeout_id: null,
      };
      state.clients.push(client);
    } else {
      client = state.clients[index];
      if (client.status === status.BUSY) {
        handleClientError(client);
        messages.push(`${client.name} hit /join while busy`);
        return res
          .status(500)
          .send(
            "Client was already busy and is now errored out, try hitting /join to sign-in again"
          );
      }
      client.url = url;
      client.status = status.AVAILABLE;
      client.queue = [];
      if (client.timeout_id) clearTimeout(client.timeout_id);
      client.timeout_id = null;
    }

    res.status(200).end();
    const message = `${client.name} joined`;
    if (messages.at(-1) !== message) messages.push(message);
  } catch (error) {
    messages.push("/join ERROR: ", error);
    res.status(500).send("Server error");
  }
});

server.post("/done", (req, res) => {
  try {
    const { name } = utils.getClientNameAndURL(req);
    const { done } = req.body;
    const client = state.clients.find((client) => client.name === name);

    if (!client)
      return res.status(500).send("Client is invalid, hit /join to sign-in");

    if (client.status === status.ERROR)
      return res
        .status(500)
        .send("Client is errored out, try hitting /join to sign-in again");

    state.done.push(...done);
    client.status = status.AVAILABLE;
    client.queue = [];
    clearTimeout(client.timeout_id);
    client.timeout_id = null;
  } catch (error) {
    messages.push("/done ERROR: ", error);
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
