// backend/controllers/studentDashboardController.js
import mongoose from "mongoose";
import User from "../models/User.js"; 
import Timetable from "../models/Timetable.js";
import Notification from "../models/Notification.js";
import Classroom from "../models/Classroom.js";
import Subject from "../models/Subject.js";
import { createICSStringForEvents } from "../utils/icsUtils.js";
import logger from "../utils/logger.js"; // ✅ now works with default export

/**
 * Utility: parse pagination params
 */
const parsePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || "50", 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Simple time overlap detector for conflict detection
 */
const timeOverlap = (aStart, aEnd, bStart, bEnd) => {
  return !(aEnd <= bStart || bEnd <= aStart);
};

/**
 * Normalize slot object for client
 */
const normalizeSlot = (slotDoc) => {
  return {
    id: slotDoc._id?.toString?.() || slotDoc.slotId || null,
    courseId: slotDoc.courseId,
    subject: slotDoc.subjectName || slotDoc.subject || slotDoc.courseName,
    facultyId: slotDoc.facultyId,
    facultyName: slotDoc.facultyName,
    roomId: slotDoc.roomId,
    roomName: slotDoc.roomName,
    day: slotDoc.day,
    startTime: slotDoc.startTime,
    endTime: slotDoc.endTime,
    durationMinutes: slotDoc.durationMinutes || null,
    type: slotDoc.type || "Lecture",
    meta: slotDoc.meta || {},
  };
};

/**
 * GET /api/student/dashboard
 */
export const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student id" });
    }

    const student = await User.findById(studentId).select("-password -__v").lean();
    if (!student || student.role !== "student") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { page, limit, skip } = parsePagination(req);

    const countDirect = await Timetable.countDocuments({ studentIds: student._id }).catch(() => 0);
    let matchQuery;
    if (countDirect > 0) matchQuery = { studentIds: student._id };
    else {
      matchQuery = {
        $or: [
          { courseId: student.courseId },
          { department: student.department },
          { batch: student.batch },
        ],
      };
    }

    const timetableDocs = await Timetable.find(matchQuery)
      .sort({ dayIndex: 1, startTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const timetable = timetableDocs.map(normalizeSlot);

    const upcoming = timetable
      .map((s) => {
        const nextStart = computeNextOccurrenceDate(s.day, s.startTime);
        return { ...s, nextStart: nextStart ? nextStart.toISOString() : null };
      })
      .filter((s) => s.nextStart)
      .sort((a, b) => new Date(a.nextStart) - new Date(b.nextStart))
      .slice(0, 6);

    const notifications = await Notification.find({ userId: student._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const weeklyHours = timetable.reduce((acc, s) => acc + (s.durationMinutes || 60) / 60, 0);
    const classCount = timetable.length;

    const conflicts = [];
    for (let i = 0; i < timetable.length; i++) {
      for (let j = i + 1; j < timetable.length; j++) {
        const a = timetable[i];
        const b = timetable[j];
        if (a.day === b.day && timeOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
          conflicts.push({
            slotA: a,
            slotB: b,
            reason: "Overlapping times on same day",
          });
        }
      }
    }

    return res.json({
      success: true,
      message: "Student dashboard fetched",
      data: {
        student,
        stats: {
          weeklyHours,
          classCount,
          upcomingCount: upcoming.length,
          conflictCount: conflicts.length,
        },
        timetable,
        upcoming,
        notifications,
        conflicts,
        pagination: { page, limit },
      },
    });
  } catch (err) {
    logger.error("getStudentDashboard error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/student/timetable
 */
export const getStudentTimetable = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { day, facultyId, subject, room } = req.query;
    const { page, limit, skip } = parsePagination(req);

    let baseQuery = {};
    const countDirect = await Timetable.countDocuments({ studentIds: studentId }).catch(() => 0);
    if (countDirect > 0) baseQuery.studentIds = studentId;
    else {
      const student = await User.findById(studentId).lean();
      baseQuery.$or = [{ courseId: student.courseId }, { department: student.department }, { batch: student.batch }];
    }

    if (day) baseQuery.day = day;
    if (facultyId) baseQuery.facultyId = facultyId;
    if (subject) baseQuery.subjectName = { $regex: subject, $options: "i" };
    if (room) baseQuery.roomName = { $regex: room, $options: "i" };

    const [total, docs] = await Promise.all([
      Timetable.countDocuments(baseQuery),
      Timetable.find(baseQuery).sort({ dayIndex: 1, startTime: 1 }).skip(skip).limit(limit).lean(),
    ]);

    const results = docs.map(normalizeSlot);

    return res.json({
      success: true,
      message: "Student timetable fetched",
      data: { total, results, pagination: { page, limit } },
    });
  } catch (err) {
    logger.error("getStudentTimetable error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/student/timetable/export?format=ics
 */
export const exportStudentTimetableICS = async (req, res) => {
  try {
    const studentId = req.user.id;
    const format = (req.query.format || "ics").toLowerCase();

    const docs = await Timetable.find({ studentIds: studentId }).lean().catch(() => []);
    const slots = docs.map(normalizeSlot);

    const events = slots.map((s) => {
      const start = computeNextOccurrenceDate(s.day, s.startTime);
      const end = start ? new Date(start.getTime() + (s.durationMinutes || 60) * 60000) : null;
      return {
        title: s.subject,
        description: `Faculty: ${s.facultyName || ""}\nRoom: ${s.roomName || ""}`,
        location: s.roomName || s.roomId,
        start,
        end,
      };
    });

    if (format === "ics") {
      const icsContent = createICSStringForEvents(events);
      res.setHeader("Content-Type", "text/calendar; charset=UTF-8");
      res.setHeader("Content-Disposition", `attachment; filename="timetable_${studentId}.ics"`);
      return res.send(icsContent);
    } else {
      return res.status(400).json({ success: false, message: "Unsupported export format" });
    }
  } catch (err) {
    logger.error("exportStudentTimetableICS error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/student/notifications
 */
export const getStudentNotifications = async (req, res) => {
  try {
    const studentId = req.user.id;
    const limit = Math.min(100, parseInt(req.query.limit || "20", 10));
    const unreadOnly = req.query.unread === "true";

    const q = { userId: studentId };
    if (unreadOnly) q.read = false;

    const notes = await Notification.find(q).sort({ createdAt: -1 }).limit(limit).lean();

    return res.json({ success: true, message: "Notifications fetched", data: notes });
  } catch (err) {
    logger.error("getStudentNotifications error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/student/notifications/mark-read
 */
export const markNotificationsRead = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { ids, all } = req.body;

    if (all) {
      await Notification.updateMany({ userId: studentId, read: false }, { $set: { read: true } });
      return res.json({ success: true, message: "All notifications marked read" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids array required" });
    }

    const objectIds = ids.filter((id) => mongoose.isValidObjectId(id)).map((id) => mongoose.Types.ObjectId(id));
    await Notification.updateMany({ _id: { $in: objectIds }, userId: studentId }, { $set: { read: true } });

    return res.json({ success: true, message: "Selected notifications marked read" });
  } catch (err) {
    logger.error("markNotificationsRead error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/student/timetable/search?q=
 */
export const searchTimetable = async (req, res) => {
  try {
    const studentId = req.user.id;
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ success: false, message: "Query param q required" });

    const regex = new RegExp(q, "i");

    const matchStudent = { studentIds: studentId };
    const fallbackCount = await Timetable.countDocuments(matchStudent).catch(() => 0);
    const baseQuery =
      fallbackCount > 0 ? matchStudent : { $or: [{ courseId: req.user.courseId }, { department: req.user.department }] };

    const results = await Timetable.find({
      ...baseQuery,
      $or: [{ subjectName: regex }, { facultyName: regex }, { roomName: regex }],
    })
      .limit(50)
      .lean();

    return res.json({ success: true, message: "Search results", data: results.map(normalizeSlot) });
  } catch (err) {
    logger.error("searchTimetable error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------------------------
   Helpers
---------------------------- */
const computeNextOccurrenceDate = (weekdayName, timeStr) => {
  if (!weekdayName || !timeStr) return null;
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayIndex = weekdays.indexOf(weekdayName.toLowerCase());
  if (dayIndex === -1) return null;

  const [hh, mm] = (timeStr || "09:00").split(":").map((x) => parseInt(x, 10) || 0);
  const now = new Date();
  const todayMondayBased = (now.getDay() + 6) % 7;
  const diff = dayIndex - todayMondayBased;
  const candidate = new Date(now);
  candidate.setDate(now.getDate() + (diff >= 0 ? diff : diff + 7));
  candidate.setHours(hh, mm, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
  return candidate;
};
