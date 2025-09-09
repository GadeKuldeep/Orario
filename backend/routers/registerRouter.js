import express from "express";
import registerController from "../controllers/registerController.js";

const router = express.Router();

// POST /api/register
router.post("/", registerController);

export default router;
