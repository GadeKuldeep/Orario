import express from "express";
import {
  generateTimetable,
  getTimetable,
  updateTimetable,
  deleteTimetable,
  getTimetableOptions,
  approveTimetable,
  publishTimetable,
  handleFacultyAbsence,
  getTimetableConflicts,
  optimizeTimetable,
  getTimetableHistory
} from "../controllers/timetableController.js";

import { 
  verifyToken, 
  isAdmin, 
  isFaculty,
  isAdminOrFaculty,
  isSameDepartment,
  rateLimitByUser 
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply JWT protection and rate limiting to all routes
router.use(verifyToken);
router.use(rateLimitByUser);

// === TIMETABLE GENERATION & MANAGEMENT (Admin only) ===
router.post("/generate", isAdmin, generateTimetable);
router.delete("/:timetableId", isAdmin, deleteTimetable);

// === TIMETABLE VIEWING (Admin, Faculty, and Department-based access) ===
router.get("/department/:departmentId", isAdminOrFaculty, isSameDepartment, getTimetable);
router.get("/department/:departmentId/semester/:semester", isAdminOrFaculty, isSameDepartment, getTimetable);

// === TIMETABLE OPTIMIZATION & ANALYSIS ===
router.post("/:timetableId/optimize", isAdminOrFaculty, optimizeTimetable);
router.get("/:timetableId/conflicts", isAdminOrFaculty, getTimetableConflicts);
router.get("/:timetableId/options", isAdminOrFaculty, getTimetableOptions);

// === APPROVAL WORKFLOW (Admin only) ===
router.put("/:timetableId/approve", isAdmin, approveTimetable);
router.put("/:timetableId/publish", isAdmin, publishTimetable);

// === TIMETABLE MODIFICATION (Admin and Faculty with department restrictions) ===
router.put("/:timetableId", isAdminOrFaculty, updateTimetable);

// === ABSENCE HANDLING (Faculty and Admin) ===
router.post("/absence/handle", isAdminOrFaculty, handleFacultyAbsence);

// === HISTORY & ANALYTICS (Admin and Faculty with department access) ===
router.get("/history/department/:departmentId", isAdminOrFaculty, isSameDepartment, getTimetableHistory);

export default router;