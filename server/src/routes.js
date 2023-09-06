import express from "express";
import communicationRoutes from "./Communication/communication.routes.js";

const router = express.Router();

router.use("/api/communication/", communicationRoutes);

export default router;
