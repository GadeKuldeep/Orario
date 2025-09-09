import express from "express";
import {
  getStudentDashboard,
  getStudentTimetable,
  exportStudentTimetableICS,
  getStudentNotifications,
  markNotificationsRead,
  searchTimetable,
} from "../controllers/studentDashboardController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Middleware: allow only students
const isStudent = (req, res, next) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ msg: "Access denied: Students only" });
  }
  next();
};

// All student routes protected by JWT and student role
router.use(verifyToken);
router.use(isStudent);

// GET /api/student/dashboard
router.get("/dashboard", getStudentDashboard);

// GET /api/student/timetable
// optional query params: ?day=Monday&facultyId=...&subject=...&room=...&limit=50&page=1
router.get("/timetable", getStudentTimetable);

// GET /api/student/timetable/export?format=ics
router.get("/timetable/export", exportStudentTimetableICS);

// GET /api/student/notifications?limit=20
router.get("/notifications", getStudentNotifications);

// POST /api/student/notifications/mark-read
router.post("/notifications/mark-read", markNotificationsRead);

// GET /api/student/timetable/search?q=Data%20Structures
router.get("/timetable/search", searchTimetable);

export default router;
