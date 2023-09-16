import express from "express";
import axios from "axios";
import cors from "cors";
import operations from "./operations.js";

const serverUrl = "http://localhost:1999";

const global = {
  name: null,
  state: {
    isActive: false,
    queue: [],
  }
};

const port = 2000;
const client = express();

client.use(cors({ origin: "*" }));
client.use(express.json());

client.get("/state", (req, res) => {
  try{
    res.send(global.state);
  } catch(err){
    console.log('/state error: ', err.message);
  }
});

client.post("/run", (req, res) => {
  try{
    console.log(req.body)
    res.send(200);
  } catch(err){
    console.log('/run error: ', err.message);
  }
});

client.listen(port, async () => {
  try {
    console.log(`Client is running on port ${port}`);
    const {
      status,
      data
    } = await axios.post(`${serverUrl}/join`, {
      state: global.state
    });
    if(status === 200) {
      global.name = data.name;
      global.state = data.state;
    }
  } catch (err) {
    console.log('client listen error: ', err.message);
  }
});

