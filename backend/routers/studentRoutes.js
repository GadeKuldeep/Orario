import express from "express";
import {
  getStudentDashboard,
  getStudentTimetable,
  exportStudentTimetableICS,
  getStudentNotifications,
  markNotificationsRead,
  searchTimetable,
  getStudentProfile,
  updateStudentProfile,
  getAttendanceSummary,
  getCourseMaterials
} from "../controllers/studentDashboardController.js";

import { 
  verifyToken, 
  isStudent,
  isAdminOrSelf,
  optionalAuth,
  rateLimitByUser 
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply JWT protection and rate limiting to all routes
router.use(verifyToken);
router.use(rateLimitByUser);

// === STUDENT-ONLY ROUTES ===

// Dashboard & Profile (Student only)
router.get("/dashboard", isStudent, getStudentDashboard);
router.get("/profile", isStudent, getStudentProfile);
router.put("/profile", isStudent, updateStudentProfile);

// Timetable Management (Student only)
router.get("/timetable", isStudent, getStudentTimetable);
router.get("/timetable/export", isStudent, exportStudentTimetableICS);
router.get("/timetable/search", isStudent, searchTimetable);

// Notifications (Student only)
router.get("/notifications", isStudent, getStudentNotifications);
router.post("/notifications/mark-read", isStudent, markNotificationsRead);
router.put("/notifications/mark-all-read", isStudent, markNotificationsRead);

// Academic Resources (Student only)
router.get("/attendance", isStudent, getAttendanceSummary);
router.get("/courses/:courseId/materials", isStudent, getCourseMaterials);

export default router;