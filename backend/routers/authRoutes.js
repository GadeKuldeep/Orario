import express from "express";
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser
} from "../controllers/authController.js";

import { 
  verifyToken, 
  isAdmin, 
  isAdminOrSelf,
  isAdminOrFaculty,
  optionalAuth,
  rateLimitByUser
} from "../middleware/authMiddleware.js";

const router = express.Router();

// === PUBLIC ROUTES ===

// Authentication routes (with rate limiting potential)
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// === PROTECTED ROUTES ===
router.use(verifyToken); // Apply JWT verification to all routes below
router.use(rateLimitByUser); // Apply rate limiting to authenticated routes

// === USER MANAGEMENT ROUTES ===

// Personal profile management (accessible to all authenticated users for their own data)
router.get("/profile", getProfile);
router.put("/profile", updateProfile); // Users can update their own profile
router.put("/change-password", changePassword);

// Token management
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

// === ADMIN-ONLY USER MANAGEMENT ===

router.get("/users", isAdmin, getAllUsers); // Get all users (admin only)
router.get("/users/:id", isAdminOrSelf, getUserById); // Admin can get any user, users can get themselves
router.put("/users/:id", isAdminOrSelf, updateUser); // Admin can update any user, users can update themselves
router.put("/users/:id/deactivate", isAdmin, deactivateUser); // Only admin can deactivate users
router.put("/users/:id/activate", isAdmin, activateUser); // Only admin can activate users
router.delete("/users/:id", isAdmin, deleteUser); // Only admin can delete users

// === DEPARTMENT-SPECIFIC ROUTES ===

router.get("/department/:departmentId/users", isAdminOrFaculty, getAllUsers); // Get users by department

// === OPTIONAL AUTH ROUTES (EXAMPLE) ===
// If you need routes that work with or without authentication
router.get("/public-profile/:id", optionalAuth, getProfile);

export default router;