// backend/routers/facultyRoutes.js
import express from "express";
import { body } from "express-validator";
import {
  addFaculty,
  updateFaculty,
  deleteFaculty,
  getAllFaculty,
  getFacultyById,
  updateAvailability,
  getFacultyTimetable,
} from "../controllers/facultyController.js";

const router = express.Router();

/**
 * ADMIN ROUTES
 */
router.post(
  "/admin/add",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
  ],
  addFaculty
);

router.put("/admin/:id", updateFaculty);
router.delete("/admin/:id", deleteFaculty);
router.get("/admin/all", getAllFaculty);
router.get("/admin/:id", getFacultyById);

/**
 * FACULTY ROUTES
 */
router.put("/availability/:id", updateAvailability);
router.get("/timetable/:id", getFacultyTimetable);

export default router;
