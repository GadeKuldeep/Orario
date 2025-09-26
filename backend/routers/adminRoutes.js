// routes/adminRoutes.js
import express from "express";
import {
  getDashboardOverview,
  addFaculty,
  addClassroom,
  approveTimetable,
  getReports,
} from "../controllers/adminDashboardController.js";

import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";
import { generateTimetable } from "../controllers/generateTimeTableController.js";


const router = express.Router();

/**
 * 🔒 All admin routes are protected by JWT + Admin role check
 */

// Dashboard Overview
router.get("/dashboard", verifyToken, isAdmin, getDashboardOverview);

// Faculty Management
router.post("/faculty/add", verifyToken, isAdmin, addFaculty);

// Classroom Management
router.post("/classroom/add", verifyToken, isAdmin, addClassroom);

// Timetable Management
router.post("/timetable/generate", verifyToken, isAdmin,generateTimetable );
router.put("/timetable/approve", verifyToken, isAdmin, approveTimetable);

// Reports
router.get("/reports", verifyToken, isAdmin, getReports);

export default router;
