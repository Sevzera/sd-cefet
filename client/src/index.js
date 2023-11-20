import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";
const { CLIENT_PORT, SERVER_HOST, SERVER_PORT } = process.env;
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

const MAX_MESSAGES = 4;
const MAX_PROCESSING_SECONDS = 10;

const operations = {};

const client = express();

client.use(cors({ origin: "*" }));
client.use(express.json());

let retry_timeout_id = null;

const state = {
  name: null,
  url: null,
  status: null,
  queue: [],
  done: [],
};

const messages = [];
async function show() {
  try {
    if (messages.length >= MAX_MESSAGES)
      messages.splice(0, messages.length - MAX_MESSAGES);

    console.clear();
    console.log(
      "---------------------------------\n" +
        "STATE\n" +
        `\nQUEUE: ${state.queue.length - state.done.length}\n` +
        `DONE: ${state.done.length}\n` +
        "\n---------------------------------\n" +
        messages.map((message) => message + "\n").join("")
    );
  } catch (error) {
    throw error;
  }
}

const PORT_OFFSET = Number(process.argv[2]) || 0;
const PORT = Number(CLIENT_PORT) + PORT_OFFSET;

const setupConnection = async () => {
  try {
    messages.push("Trying to connect to server...");
    await axios
      .post(`${SERVER_URL}/join`, {
        port: PORT,
      })
      .then(({ data }) => {
        messages.push("Connected to server");
        const { queue } = data;
        state.queue = queue;
        state.done = [];
        clearInterval(retry_timeout_id);
      })
      .catch(() => {
        messages.push(`Couldn't connect to server, trying again in 5 seconds`);
        retry_timeout_id = setTimeout(setupConnection, 5000);
      });
  } catch (error) {
    throw error;
  }
};

client.listen(PORT, async () => {
  try {
    messages.push(`Client is listening on port ${PORT}`);
    setInterval(show, 1000);
    await setupConnection();
  } catch (error) {
    messages.push("client listen ERROR: ", error);
  }
});

client.post("/run", async (req, res) => {
  try {
    const { queue } = req.body;
    state.queue = queue;
    state.done = [];
    res.status(200).send("Processing...");

    await operations.process();
    await axios
      .post(`${SERVER_URL}/done`, {
        done: state.done,
        port: PORT,
      })
      .catch(({ response }) => {
        if (response) {
          const { data: message } = response;
          messages.push(message);
        } else {
          messages.push("Server is down, trying to reconnect in 5 seconds");
          retry_timeout_id = setTimeout(setupConnection, 5000);
        }
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
    const time = Number(Math.random() * MAX_PROCESSING_SECONDS).toFixed(2);
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
