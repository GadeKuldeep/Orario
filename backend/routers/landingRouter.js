import express from "express";
import landingController from "../controllers/landingController.js";
import { 
  verifyToken, 
  optionalAuth, 
  rateLimitByUser 
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public landing page with optional authentication
router.get("/", optionalAuth, rateLimitByUser, landingController);

// Alternative version with separate authenticated vs public views
router.get("/", optionalAuth, landingController);

export default router;