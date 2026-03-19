import express from "express";
import { 
    getAvailability, 
    updateAvailability, 
    getAllTeacherAvailabilities 
} from "../controllers/teacherController.js";
import { verifyToken, isSameDepartment } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

// Teacher's own availability management
router.get("/availability", getAvailability);
router.post("/availability", updateAvailability);

// Admin-level view of all teacher availabilities
router.get("/all-availabilities", getAllTeacherAvailabilities);

export default router;
