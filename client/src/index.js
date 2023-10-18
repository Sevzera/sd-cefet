import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";
const { CLIENT_HOST, CLIENT_PORT, SERVER_HOST, SERVER_PORT } = process.env;
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

const operations = {};

const client = express();

client.use(cors({ origin: "*" }));
client.use(express.json());

let is_connected = false;
let retry_timeout_id = null;

const state = {
  name: null,
  url: null,
  status: null,
  queue: [],
  done: [],
};

async function show() {
  try {
    console.clear();
    console.log(
      "----------------------------------------\n" +
        "STATE\n\n" +
        `NAME: ${state.name}\n` +
        `URL: ${state.url}\n` +
        `STATUS: ${state.status}\n` +
        `\nQUEUE: ${state.queue.length}\n` +
        `DONE: ${state.done.length}\n` +
        "\n----------------------------------------"
    );
  } catch (error) {
    throw error;
  }
}

const PORT_OFFSET = Number(process.argv[2]) || 0;
const PORT = Number(CLIENT_PORT) + PORT_OFFSET;

const setupConnection = async () => {
  try {
    console.log("Setting up connection to server...");

    const { status, data } = await axios.post(`${SERVER_URL}/join`, {
      host: CLIENT_HOST,
      port: PORT,
    });

    if (status === 200) {
      const { name, url, status, queue } = data.new_state;
      is_connected = true;
      state.name = name;
      state.url = url;
      state.status = status;
      state.queue = queue;
      state.done = [];
      clearInterval(retry_timeout_id);
      setInterval(show, 1000);
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED" || error.code === "ECONNRESET") {
      is_connected = false;
      console.log(
        "Lost connection to server, trying again in 5 seconds" +
          "\n----------------------------------------"
      );
      retry_timeout_id = setTimeout(setupConnection, 5000);
    } else throw error;
  }
};

client.listen(PORT, async () => {
  try {
    console.log(`Client is listening on port ${PORT}`);
    await setupConnection();
  } catch (error) {
    console.error("client listen error: ", error);
  }
});

client.post("/run", async (req, res) => {
  try {
    const { body } = req;
    const { status, queue } = body.new_state;
    state.status = status;
    state.queue = queue;
    state.done = [];
    res.status(200);

    await operations.process();
    await axios.post(`${SERVER_URL}/done`, {
      new_state: state,
    });
  } catch (error) {
    res.status(500);
    throw error;
  }
});

operations.sleep = (s) => {
  try {
    return new Promise((resolve) => setTimeout(resolve, s * 1000));
  } catch (error) {
    throw error;
  }
};

operations.processPair = async (pair) => {
  try {
    const time = Number(Math.random() * 10).toFixed(2);
    await operations.sleep(time);
    const match = Number(Math.random() * 100).toFixed(2);
    state.done.push({
      _id: pair,
      match,
    });
  } catch (error) {
    throw error;
  }
};

operations.process = async () => {
  try {
    const processes = [];
    state.queue.forEach((pair) => {
      processes.push(operations.processPair(pair));
    });
    await Promise.all(processes);
  } catch (error) {
    throw error;
  }
};
