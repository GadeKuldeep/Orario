import express from "express";
import { body, param } from "express-validator";
import {
  // Dashboard & Analytics
  getDashboardOverview,
  getSystemAnalytics,
  
  // User Management
  addFaculty,
  addStudent,
  getAllUsers,
  manageUserStatus,
  getUserById,
  updateUser,
  
  // Resource Management
  addClassroom,
  getClassrooms,
  updateClassroom,
  deleteClassroom,
  addSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
  createDepartment,
  getDepartments,
  updateDepartment,
  
  // Timetable Management
  generateTimetable,
  approveTimetable,
  publishTimetable,
  getTimetableVersions,
  manageTimetableConstraints,
  getTimetableById,
  deleteTimetable,
  
  // Reports & Analytics
  getReports,
  exportData,
  getOptimizationLogs,
  
  // System Management
  getSystemSettings,
  updateSystemSettings,
  sendBulkNotifications
} from "../controllers/adminDashboardController.js";

import { 
  verifyToken, 
  isAdmin, 
  isSameDepartment,
  rateLimitByUser 
} from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * 🔒 All admin routes are protected by JWT + Admin role check
 */
router.use(verifyToken);
router.use(isAdmin);
router.use(rateLimitByUser); // Add rate limiting for admin actions

// 📊 Dashboard & Analytics
router.get("/dashboard", getDashboardOverview);
router.get("/analytics", getSystemAnalytics);

// 👥 User Management
router.post("/faculty/add", [
  body("name").notEmpty().trim().isLength({ min: 2 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("department").notEmpty(),
  body("designation").notEmpty()
], addFaculty);

router.post("/student/add", [
  body("name").notEmpty().trim().isLength({ min: 2 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("department").notEmpty(),
  body("semester").isInt({ min: 1, max: 8 })
], addStudent);

router.get("/users", getAllUsers);
router.get("/users/:userId", [
  param("userId").isMongoId()
], getUserById);

router.put("/users/:userId/status", [
  param("userId").isMongoId(),
  body("isActive").isBoolean()
], manageUserStatus);

router.put("/users/:userId/profile", [
  param("userId").isMongoId()
], updateUser);

// 🏫 Resource Management

// Classrooms
router.post("/classrooms", [
  body("name").notEmpty().trim(),
  body("roomNumber").notEmpty(),
  body("capacity").isInt({ min: 10 }),
  body("department").notEmpty()
], addClassroom);

router.get("/classrooms", getClassrooms);
router.get("/classrooms/:departmentId", [
  param("departmentId").notEmpty()
], getClassrooms);

router.put("/classrooms/:classroomId", [
  param("classroomId").isMongoId()
], updateClassroom);

router.delete("/classrooms/:classroomId", [
  param("classroomId").isMongoId()
], deleteClassroom);

// Subjects
router.post("/subjects", [
  body("name").notEmpty().trim(),
  body("code").notEmpty().isUppercase(),
  body("credits").isInt({ min: 1, max: 5 }),
  body("department").notEmpty(),
  body("semester").isInt({ min: 1, max: 8 })
], addSubject);

router.get("/subjects", getSubjects);
router.get("/subjects/:departmentId", [
  param("departmentId").notEmpty()
], getSubjects);

router.put("/subjects/:subjectId", [
  param("subjectId").isMongoId()
], updateSubject);

router.delete("/subjects/:subjectId", [
  param("subjectId").isMongoId()
], deleteSubject);

// Departments
router.post("/departments", [
  body("name").notEmpty().trim(),
  body("code").notEmpty().isUppercase()
], createDepartment);

router.get("/departments", getDepartments);
router.put("/departments/:departmentId", [
  param("departmentId").isMongoId()
], updateDepartment);

// 📅 Timetable Management
router.post("/timetable/generate", [
  body("department").notEmpty(),
  body("semester").isInt({ min: 1, max: 8 }),
  body("academicYear").notEmpty()
], generateTimetable);

router.get("/timetable/versions", getTimetableVersions);
router.get("/timetable/versions/:departmentId", [
  param("departmentId").notEmpty()
], getTimetableVersions);

router.get("/timetable/:timetableId", [
  param("timetableId").isMongoId()
], getTimetableById);

router.put("/timetable/:timetableId/approve", [
  param("timetableId").isMongoId()
], approveTimetable);

router.put("/timetable/:timetableId/publish", [
  param("timetableId").isMongoId()
], publishTimetable);

router.delete("/timetable/:timetableId", [
  param("timetableId").isMongoId()
], deleteTimetable);

router.put("/timetable/constraints", [
  body("department").notEmpty(),
  body("constraints").isObject()
], manageTimetableConstraints);

// 📈 Reports & Analytics
router.get("/reports", getReports);
router.get("/reports/:reportType", [
  param("reportType").isIn(['attendance', 'utilization', 'performance', 'all'])
], getReports);

router.get("/reports/export/:format", [
  param("format").isIn(['pdf', 'excel', 'csv'])
], exportData);

router.get("/optimization-logs", getOptimizationLogs);
router.get("/optimization-logs/:departmentId", [
  param("departmentId").notEmpty()
], getOptimizationLogs);

// ⚙️ System Management
router.get("/settings", getSystemSettings);
router.put("/settings", [
  body("settings").isObject()
], updateSystemSettings);

router.post("/notifications/bulk", [
  body("title").notEmpty().trim(),
  body("message").notEmpty().trim(),
  body("recipientType").isIn(['all', 'faculty', 'students', 'department']),
  body("department").optional().notEmpty()
], sendBulkNotifications);

// ✅ NEW: Department-specific admin routes
router.get("/department/:departmentId/overview", [
  param("departmentId").notEmpty()
], isSameDepartment, getDashboardOverview);

router.get("/department/:departmentId/users", [
  param("departmentId").notEmpty()
], isSameDepartment, getAllUsers);

// ✅ NEW: Backup and maintenance routes
router.post("/system/backup", (req, res) => {
  // Database backup functionality
  res.json({ success: true, message: "Backup initiated" });
});

router.get("/system/health", (req, res) => {
  res.json({ 
    success: true, 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    user: req.user 
  });
});

export default router;