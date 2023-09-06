import express from "express";
import communicationService from "./communicationService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    await communicationService.showResult("1", "2");
    await communicationService.indexResult("1", "2");
    await communicationService.createResult("1", "2", {
      result: 1,
    });
    await communicationService.updateResult("1", "2", {
      result: 1,
    });
    await communicationService.deleteResult("1", "2");
    res.status(200).json({ success: true, message: "hit" });
  } catch (error) {
    console.log("Error in communicationRoutes.get: ", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
