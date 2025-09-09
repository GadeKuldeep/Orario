// controllers/adminDashboardController.js
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import Timetable from "../models/Timetable.js";
import jwt from "jsonwebtoken";

// 🛠️ Dummy scheduling algorithm placeholder
// Replace with your real scheduling logic later
const generateOptimizedTimetable = async () => {
  return [
    { id: 1, room: "CSE-101", subject: "Operating Systems", faculty: "Dr. Priya Sharma", time: "10:00-11:00" },
    { id: 2, room: "CSE-102", subject: "DBMS", faculty: "Dr. Rahul Mehta", time: "11:00-12:00" },
  ];
};

// Middleware helpers
export const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(403).json({ msg: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach payload (id, role) to req
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Unauthorized", error: err.message });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Admin access only" });
  }
  next();
};

// Get dashboard overview
export const getDashboardOverview = async (req, res) => {
  try {
    const totalClassrooms = await Classroom.countDocuments();
    const totalFaculty = await User.countDocuments({ role: "faculty" });
    const totalStudents = await User.countDocuments({ role: "student" });
    const pendingApprovals = await Timetable.countDocuments({ status: "pending" });
    const conflictCount = await Timetable.countDocuments({ conflict: true });

    res.json({
      totalClassrooms,
      totalFaculty,
      totalStudents,
      pendingApprovals,
      conflictCount,
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Add new faculty
export const addFaculty = async (req, res) => {
  try {
    const { name, email, password, department, subjects } = req.body;

    if (!name || !email || !password || !department)
      return res.status(400).json({ msg: "All required fields must be filled" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: "Email already exists" });

    const newFaculty = new User({
      name,
      email,
      password, // ⚠️ Ensure password is hashed in User model pre-save hook
      role: "faculty",
      department,
      subjects,
    });

    await newFaculty.save();
    res.status(201).json({ msg: "Faculty added successfully", faculty: newFaculty });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Add new classroom
export const addClassroom = async (req, res) => {
  try {
    const { name, capacity, facilities } = req.body;

    if (!name || !capacity)
      return res.status(400).json({ msg: "Classroom name and capacity are required" });

    const newClassroom = new Classroom({ name, capacity, facilities });
    await newClassroom.save();

    res.status(201).json({ msg: "Classroom added successfully", classroom: newClassroom });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Generate timetable
export const generateTimetable = async (req, res) => {
  try {
    const timetableOptions = await generateOptimizedTimetable();
    res.status(200).json({ msg: "Generated timetables", options: timetableOptions });
  } catch (err) {
    res.status(500).json({ msg: "Failed to generate timetable", error: err.message });
  }
};

// Approve or reject timetable
export const approveTimetable = async (req, res) => {
  try {
    const { timetableId, status } = req.body;

    if (!timetableId || !status)
      return res.status(400).json({ msg: "timetableId and status are required" });

    const timetable = await Timetable.findByIdAndUpdate(
      timetableId,
      { status },
      { new: true }
    );

    if (!timetable) return res.status(404).json({ msg: "Timetable not found" });

    res.json({ msg: `Timetable ${status} successfully`, timetable });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Fetch classroom utilization reports
export const getReports = async (req, res) => {
  try {
    const classrooms = await Classroom.find();
    const timetables = await Timetable.find();

    const utilization = classrooms.map((room) => {
      const usage = timetables.filter(
        (tt) => tt.roomId?.toString() === room._id.toString()
      ).length;
      return {
        room: room.name,
        capacity: room.capacity,
        usageCount: usage,
      };
    });

    res.json({ utilization });
  } catch (err) {
    res.status(500).json({ msg: "Error fetching reports", error: err.message });
  }
};
