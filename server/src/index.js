import express from "express";
import axios from "axios";
import cors from "cors";
import operations from "./operations.js";

const global = {
  isRunning: false,
  clients: [],
  proteins: operations.getIds()
};

async function run () {
  try{
    const { isRunning, clients, proteins } = global;

    const activeClients = clients.filter(
      (c) => c.state.isActive
    );
    const batches = operations.getBatches(proteins, activeClients.length);
    
    console.log(batches.length)
  } catch (err) {
    console.log('run error: ', err.message);
  }
}

const port = 1999;
const server = express();

server.use(cors({ origin: "*" }));
server.use(express.json());

server.post('/join', (req, res) => {
  try{
    const url = `${req.protocol}://${req.get('host')}`;
    const name = operations.getClientName(url);
    const { state } = req.body;
    state.isActive = true;
    global.clients.push({
      name,
      url,
      state
    });
    console.log(global.clients)
    res.status(200).send({
      name,
      state
    });
  } catch (err) {
    console.log('/join error: ', err.message);
  }
});

server.listen(port, async () => {
  try {
    console.log(`Server is running on port ${port}`);
    setInterval(run, 5000);
  } catch (err) {
    console.log('server listen error: ', err.message);
  }
});

