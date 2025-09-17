// backend/controllers/facultyController.js
import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Timetable from "../models/Timetable.js";

/**
 * ADMIN: Add Faculty
 */
export const addFaculty = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { name, email, password, department, subjects } = req.body;

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ msg: "Faculty already exists." });

    const hashed = await bcrypt.hash(password, 10);

    const faculty = new User({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: "faculty",
      department,
      subjects,
    });

    const saved = await faculty.save();
    const { password: _, ...safeFaculty } = saved.toObject();

    res.status(201).json({ msg: "Faculty added.", faculty: safeFaculty });
  } catch (err) {
    res.status(500).json({ msg: "Error adding faculty.", error: err.message });
  }
};

/**
 * ADMIN: Update Faculty
 */
export const updateFaculty = async (req, res) => {
  try {
    const faculty = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!faculty) return res.status(404).json({ msg: "Faculty not found." });

    res.json({ msg: "Faculty updated.", faculty });
  } catch (err) {
    res.status(500).json({ msg: "Error updating faculty.", error: err.message });
  }
};

/**
 * ADMIN: Delete Faculty
 */
export const deleteFaculty = async (req, res) => {
  try {
    const faculty = await User.findByIdAndDelete(req.params.id);
    if (!faculty) return res.status(404).json({ msg: "Faculty not found." });

    res.json({ msg: "Faculty deleted." });
  } catch (err) {
    res.status(500).json({ msg: "Error deleting faculty.", error: err.message });
  }
};

/**
 * ADMIN: Get All Faculty
 */
export const getAllFaculty = async (req, res) => {
  try {
    const faculty = await User.find({ role: "faculty" }).select("-password");
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching faculty.", error: err.message });
  }
};

/**
 * ADMIN: Get Faculty by ID
 */
export const getFacultyById = async (req, res) => {
  try {
    const faculty = await User.findById(req.params.id).select("-password");
    if (!faculty) return res.status(404).json({ msg: "Faculty not found." });

    res.json(faculty);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching faculty.", error: err.message });
  }
};

/**
 * FACULTY: Update Availability
 */
export const updateAvailability = async (req, res) => {
  try {
    const { available_slots, preferences } = req.body;

    const faculty = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { available_slots, preferences } },
      { new: true }
    );

    if (!faculty) return res.status(404).json({ msg: "Faculty not found." });

    res.json({ msg: "Availability updated.", faculty });
  } catch (err) {
    res.status(500).json({ msg: "Error updating availability.", error: err.message });
  }
};

/**
 * FACULTY: Get Timetable
 */
export const getFacultyTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.find({ faculty_id: req.params.id });
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching timetable.", error: err.message });
  }
};
