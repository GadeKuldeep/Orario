import express from "express";
import { body } from "express-validator";
import {
  // Faculty Management (Admin)
  addFaculty,
  updateFaculty,
  deleteFaculty,
  getAllFaculty,
  getFacultyById,
  
  // Faculty Self-Service
  getFacultyDashboard,
  getFacultyProfile,
  updateFacultyProfile,
  getFacultyTimetable,
  updateFacultyAvailability,
  applyForLeave,
  getLeaveHistory,
  updateLeaveRequest,
  getFacultySubjects,
  getSubstituteRequests,
  acceptSubstituteAssignment,
  
  // Attendance & Schedule
  markAttendance,
  getAttendanceSummary,
  getScheduleConflicts
} from "../controllers/facultyController.js";

import { 
  verifyToken, 
  isAdmin, 
  isFaculty,
  isAdminOrFaculty,
  isAdminOrSelf,
  isSameDepartment,
  rateLimitByUser
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply JWT verification and rate limiting to all routes
router.use(verifyToken);
router.use(rateLimitByUser);

/**
 * 🔒 ADMIN-ONLY ROUTES - Faculty Management
 */
router.post("/admin/add", isAdmin, [
  body("name").notEmpty().trim(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("department").notEmpty(),
  body("designation").notEmpty()
], addFaculty);

router.put("/admin/:id", isAdmin, updateFaculty);
router.delete("/admin/:id", isAdmin, deleteFaculty);
router.get("/admin/all", isAdmin, getAllFaculty);
router.get("/admin/:id", isAdmin, getFacultyById);

/**
 * 👨‍🏫 FACULTY SELF-SERVICE ROUTES (Faculty only)
 */
// Dashboard & Profile
router.get("/dashboard", isFaculty, getFacultyDashboard);
router.get("/profile", isFaculty, getFacultyProfile);
router.put("/profile", isFaculty, updateFacultyProfile);

// Timetable & Schedule
router.get("/timetable", isFaculty, getFacultyTimetable);
router.get("/schedule/conflicts", isFaculty, getScheduleConflicts);

// Availability Management
router.put("/availability", isFaculty, updateFacultyAvailability);
router.get("/subjects", isFaculty, getFacultySubjects);

// Leave Management
router.post("/leave/apply", isFaculty, applyForLeave);
router.get("/leave/history", isFaculty, getLeaveHistory);
router.put("/leave/:leaveId", isFaculty, updateLeaveRequest);

// Substitute Management
router.get("/substitute/requests", isFaculty, getSubstituteRequests);
router.put("/substitute/:requestId/accept", isFaculty, acceptSubstituteAssignment);

// Attendance
router.post("/attendance/mark", isFaculty, markAttendance);
router.get("/attendance/summary", isFaculty, getAttendanceSummary);

/**
 * 🔄 SHARED ROUTES (Admin & Faculty)
 */

// Admin can view faculty profiles and timetables for management
router.get("/:id/profile", isAdminOrFaculty, isSameDepartment, getFacultyProfile);
router.get("/:id/timetable", isAdminOrFaculty, isSameDepartment, getFacultyTimetable);
router.get("/:id/attendance/summary", isAdminOrFaculty, isSameDepartment, getAttendanceSummary);

// Department-specific faculty listings
router.get("/department/:departmentId", isAdminOrFaculty, isSameDepartment, getAllFaculty);

export default router;