import express from "express";
import {
  applyForLeave,
  getLeaveHistory,
  approveLeaveRequest,
  getLeaveRequests,
  updateLeaveStatus,
  getAttendanceSummary,
  markAttendance,
  getSubstituteSuggestions,
  handleSubstituteAssignment,
  getDepartmentLeaveRequests
} from "../controllers/attendanceController.js";

import { 
  verifyToken, 
  isAdmin, 
  isFaculty, 
  isAdminOrFaculty,
  isSameDepartment
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply JWT protection to all routes
router.use(verifyToken);

// === LEAVE ROUTES ===

// Personal leave operations (accessible to all authenticated users for their own data)
router.get("/leave/my-history", getLeaveHistory);

// Faculty leave operations
router.post("/leave/apply", isFaculty, applyForLeave);
router.get("/leave/faculty/suggestions", isFaculty, getSubstituteSuggestions);
router.post("/leave/faculty/assign-substitute", isFaculty, handleSubstituteAssignment);

// Admin/HOD leave management
router.get("/leave/requests", isAdminOrFaculty, getLeaveRequests);
router.get("/leave/department/:departmentId", isAdminOrFaculty, isSameDepartment, getDepartmentLeaveRequests);
router.put("/leave/:leaveId/approve", isAdminOrFaculty, approveLeaveRequest);
router.put("/leave/:leaveId/status", isAdminOrFaculty, updateLeaveStatus);

// === ATTENDANCE ROUTES ===

// Personal attendance (all users)
router.get("/attendance/my-summary", getAttendanceSummary);

// Attendance marking (admin/faculty only)
router.post("/attendance/mark", isAdminOrFaculty, markAttendance);

// Department attendance (department-restricted)
router.get("/attendance/department/:departmentId", isAdminOrFaculty, isSameDepartment, getAttendanceSummary);

// Admin analytics (admin only)
router.get("/admin/analytics", isAdmin, getAttendanceSummary);

export default router;