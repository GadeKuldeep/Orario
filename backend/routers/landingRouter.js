import express from "express";
import landingController from "../controllers/landingController.js";
const router = express.Router();
router.get("/", landingController);
export default router;
