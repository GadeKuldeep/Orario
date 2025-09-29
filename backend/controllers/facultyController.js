import Faculty from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Timetable from "../models/Timetable.js";
import Subject from "../models/Subject.js";
import Department from "../models/Department.js";
import Notification from "../models/Notification.js";
import Classroom from "../models/Classroom.js";
import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";

// ===== ADMIN FACULTY MANAGEMENT CONTROLLERS =====

/**
 * Add new faculty (Admin only)
 */
export const addFaculty = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const {
      name,
      email,
      password,
      department,
      designation,
      specialization,
      uniqueId,
      maxWeeklyHours,
      qualifications
    } = req.body;

    // Check if faculty already exists
    const existingFaculty = await Faculty.findOne({
      $or: [{ email }, { uniqueId }]
    });

    if (existingFaculty) {
      return res.status(400).json({
        success: false,
        message: "Faculty with this email or ID already exists"
      });
    }

    // Verify department exists
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(400).json({
        success: false,
        message: "Department not found"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create faculty
    const faculty = new Faculty({
      name,
      email,
      password: hashedPassword,
      role: "faculty",
      department,
      designation,
      specialization,
      uniqueId,
      maxWeeklyHours: maxWeeklyHours || 40,
      qualifications: qualifications || [],
      profileCompleted: true
    });

    await faculty.save();

    // Update department faculty count
    await Department.findByIdAndUpdate(department, {
      $inc: { facultyCount: 1 }
    });

    // Remove password from response
    const facultyResponse = faculty.toObject();
    delete facultyResponse.password;

    // Create welcome notification
    await createNotification({
      title: "Welcome to Faculty Portal",
      message: `Your faculty account has been created. Your unique ID is ${uniqueId}`,
      recipient: faculty._id,
      type: "system_alert",
      sender: req.user.id
    });

    res.status(201).json({
      success: true,
      message: "Faculty added successfully",
      data: facultyResponse
    });

  } catch (error) {
    console.error("Add faculty error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update faculty (Admin only)
 */
export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove restricted fields
    delete updateData.password;
    delete updateData.role;
    delete updateData.email;

    const faculty = await Faculty.findById(id);
    if (!faculty || faculty.role !== "faculty") {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    // Handle department change
    if (updateData.department && updateData.department !== faculty.department.toString()) {
      // Update department counts
      await Department.findByIdAndUpdate(faculty.department, {
        $inc: { facultyCount: -1 }
      });
      await Department.findByIdAndUpdate(updateData.department, {
        $inc: { facultyCount: 1 }
      });
    }

    const updatedFaculty = await Faculty.findByIdAndUpdate(
      id,
      { ...updateData, profileCompleted: true },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Faculty updated successfully",
      data: updatedFaculty
    });

  } catch (error) {
    console.error("Update faculty error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Delete faculty (Admin only)
 */
export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id);
    if (!faculty || faculty.role !== "faculty") {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    // Check if faculty has active timetable entries
    const activeTimetable = await Timetable.findOne({
      "schedule.slots.faculty": id,
      status: { $in: ["approved", "published"] }
    });

    if (activeTimetable) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete faculty with active timetable assignments"
      });
    }

    // Soft delete - mark as inactive
    faculty.isActive = false;
    await faculty.save();

    // Update department count
    await Department.findByIdAndUpdate(faculty.department, {
      $inc: { facultyCount: -1 }
    });

    res.json({
      success: true,
      message: "Faculty deleted successfully"
    });

  } catch (error) {
    console.error("Delete faculty error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get all faculty (Admin only)
 */
export const getAllFaculty = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, designation, active } = req.query;

    const filter = { role: "faculty" };

    // Apply filters
    if (department) filter.department = department;
    if (designation) filter.designation = designation;
    if (active !== undefined) filter.isActive = active === "true";

    const faculty = await Faculty.find(filter)
      .select("-password")
      .populate("department", "name code")
      .populate("subjectsAssigned", "name code")
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Faculty.countDocuments(filter);

    res.json({
      success: true,
      data: faculty,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get all faculty error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get faculty by ID (Admin only)
 */
export const getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id)
      .select("-password")
      .populate("department", "name code headOfDepartment")
      .populate("subjectsAssigned", "name code credits type")
      .populate("preferences.teachingPreferences");

    if (!faculty || faculty.role !== "faculty") {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    // Get additional statistics
    const currentYear = new Date().getFullYear();
    const attendanceStats = await getFacultyAttendanceStats(id, currentYear);
    const timetableStats = await getFacultyTimetableStats(id);

    const facultyData = {
      ...faculty.toObject(),
      statistics: {
        attendance: attendanceStats,
        timetable: timetableStats
      }
    };

    res.json({
      success: true,
      data: facultyData
    });

  } catch (error) {
    console.error("Get faculty by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ===== FACULTY SELF-SERVICE CONTROLLERS =====

/**
 * Get faculty dashboard
 */
export const getFacultyDashboard = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Get upcoming classes for today
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = dayNames[currentDate.getDay()];

    const todaySchedule = await Timetable.aggregate([
      {
        $match: {
          "schedule.slots.faculty": facultyId,
          "schedule.day": today,
          "validity.startDate": { $lte: currentDate },
          "validity.endDate": { $gte: currentDate },
          status: { $in: ["approved", "published"] }
        }
      },
      { $unwind: "$schedule" },
      { $unwind: "$schedule.slots" },
      {
        $match: {
          "schedule.day": today,
          "schedule.slots.faculty": facultyId
        }
      },
      {
        $lookup: {
          from: "subjects",
          localField: "schedule.slots.subject",
          foreignField: "_id",
          as: "subject"
        }
      },
      {
        $lookup: {
          from: "classrooms",
          localField: "schedule.slots.classroom",
          foreignField: "_id",
          as: "classroom"
        }
      },
      {
        $project: {
          timeSlot: "$schedule.slots.timeSlot",
          slotOrder: "$schedule.slots.slotOrder",
          subject: { $arrayElemAt: ["$subject", 0] },
          classroom: { $arrayElemAt: ["$classroom", 0] },
          type: "$schedule.slots.type"
        }
      },
      { $sort: { slotOrder: 1 } }
    ]);

    // Get pending leave requests
    const pendingLeaves = await Attendance.countDocuments({
      faculty: facultyId,
      approvalStatus: "pending",
      isActive: true
    });

    // Get substitute requests
    const substituteRequests = await Attendance.countDocuments({
      substitute: facultyId,
      substituteApproved: false,
      isActive: true
    });

    // Get attendance summary for current month
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const monthlyAttendance = await Attendance.aggregate([
      {
        $match: {
          faculty: facultyId,
          date: { $gte: monthStart, $lte: monthEnd },
          isActive: true
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get notifications
    const recentNotifications = await Notification.find({
      recipient: facultyId,
      isRead: false
    })
    .sort({ createdAt: -1 })
    .limit(5);

    const dashboardData = {
      todaySchedule,
      summary: {
        pendingLeaves,
        substituteRequests,
        totalClassesToday: todaySchedule.length
      },
      attendance: monthlyAttendance,
      notifications: recentNotifications
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error("Get faculty dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get faculty profile
 */
export const getFacultyProfile = async (req, res) => {
  try {
    const facultyId = req.params.id || req.user.id;

    const faculty = await Faculty.findById(facultyId)
      .select("-password")
      .populate("department", "name code headOfDepartment")
      .populate("subjectsAssigned", "name code credits type")
      .populate("preferences.teachingPreferences");

    if (!faculty || faculty.role !== "faculty") {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    res.json({
      success: true,
      data: faculty
    });

  } catch (error) {
    console.error("Get faculty profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update faculty profile
 */
export const updateFacultyProfile = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const updateData = req.body;

    // Remove restricted fields
    delete updateData.email;
    delete updateData.role;
    delete updateData.department;
    delete updateData.uniqueId;

    const updatedFaculty = await Faculty.findByIdAndUpdate(
      facultyId,
      { ...updateData, profileCompleted: true },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedFaculty
    });

  } catch (error) {
    console.error("Update faculty profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get faculty timetable
 */
export const getFacultyTimetable = async (req, res) => {
  try {
    const facultyId = req.params.id || req.user.id;
    const { academicYear, semester } = req.query;

    const filter = {
      "schedule.slots.faculty": facultyId,
      status: { $in: ["approved", "published"] }
    };

    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = parseInt(semester);

    const timetable = await Timetable.findOne(filter)
      .populate("schedule.slots.subject", "name code credits type")
      .populate("schedule.slots.classroom", "name roomNumber building")
      .populate("schedule.slots.faculty", "name designation");

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "No timetable found for the faculty"
      });
    }

    // Format timetable data
    const formattedTimetable = timetable.schedule.map(daySchedule => ({
      day: daySchedule.day,
      slots: daySchedule.slots
        .filter(slot => slot.faculty._id.toString() === facultyId)
        .map(slot => ({
          timeSlot: slot.timeSlot,
          slotOrder: slot.slotOrder,
          subject: slot.subject,
          classroom: slot.classroom,
          type: slot.type,
          electiveGroup: slot.electiveGroup
        }))
        .sort((a, b) => a.slotOrder - b.slotOrder)
    }));

    res.json({
      success: true,
      data: {
        timetable: formattedTimetable,
        academicYear: timetable.academicYear,
        semester: timetable.semester,
        validity: timetable.validity
      }
    });

  } catch (error) {
    console.error("Get faculty timetable error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update faculty availability
 */
export const updateFacultyAvailability = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { availability, preferredTimeSlots, unavailableDays, teachingPreferences } = req.body;

    const updateData = {};
    
    if (availability) updateData.availability = availability;
    if (preferredTimeSlots) updateData["preferences.preferredTimeSlots"] = preferredTimeSlots;
    if (unavailableDays) updateData["preferences.unavailableDays"] = unavailableDays;
    if (teachingPreferences) updateData["preferences.teachingPreferences"] = teachingPreferences;

    const updatedFaculty = await Faculty.findByIdAndUpdate(
      facultyId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Availability updated successfully",
      data: updatedFaculty
    });

  } catch (error) {
    console.error("Update faculty availability error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get faculty subjects
 */
export const getFacultySubjects = async (req, res) => {
  try {
    const facultyId = req.user.id;

    const faculty = await Faculty.findById(facultyId)
      .populate("subjectsAssigned", "name code credits type semester department");

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    // Get additional subject statistics
    const subjectsWithStats = await Promise.all(
      faculty.subjectsAssigned.map(async (subject) => {
        const timetableCount = await Timetable.countDocuments({
          "schedule.slots.subject": subject._id,
          "schedule.slots.faculty": facultyId,
          status: { $in: ["approved", "published"] }
        });

        return {
          ...subject.toObject(),
          activeClasses: timetableCount
        };
      })
    );

    res.json({
      success: true,
      data: subjectsWithStats
    });

  } catch (error) {
    console.error("Get faculty subjects error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get schedule conflicts
 */
export const getScheduleConflicts = async (req, res) => {
  try {
    const facultyId = req.user.id;

    const conflicts = await Timetable.aggregate([
      {
        $match: {
          "schedule.slots.faculty": facultyId,
          "schedule.slots.hasConflict": true,
          "schedule.slots.conflictResolved": false,
          status: { $in: ["approved", "published"] }
        }
      },
      { $unwind: "$schedule" },
      { $unwind: "$schedule.slots" },
      {
        $match: {
          "schedule.slots.faculty": facultyId,
          "schedule.slots.hasConflict": true,
          "schedule.slots.conflictResolved": false
        }
      },
      {
        $lookup: {
          from: "subjects",
          localField: "schedule.slots.subject",
          foreignField: "_id",
          as: "subject"
        }
      },
      {
        $lookup: {
          from: "classrooms",
          localField: "schedule.slots.classroom",
          foreignField: "_id",
          as: "classroom"
        }
      },
      {
        $project: {
          day: "$schedule.day",
          timeSlot: "$schedule.slots.timeSlot",
          subject: { $arrayElemAt: ["$subject", 0] },
          classroom: { $arrayElemAt: ["$classroom", 0] },
          conflictType: "$schedule.slots.conflictType",
          timetable: "$title"
        }
      }
    ]);

    res.json({
      success: true,
      data: conflicts
    });

  } catch (error) {
    console.error("Get schedule conflicts error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ===== LEAVE MANAGEMENT CONTROLLERS =====

/**
 * Apply for leave (Faculty)
 */
export const applyForLeave = async (req, res) => {
  try {
    const { date, status, leaveType, reason, substituteId, substituteReason } = req.body;
    const facultyId = req.user.id;

    // Use the existing attendance controller function
    req.user.id = facultyId;
    const attendanceController = await import("./attendanceController.js");
    return attendanceController.applyForLeave(req, res);

  } catch (error) {
    console.error("Apply for leave error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get leave history (Faculty)
 */
export const getLeaveHistory = async (req, res) => {
  try {
    const facultyId = req.user.id;

    // Use the existing attendance controller function
    req.user.id = facultyId;
    const attendanceController = await import("./attendanceController.js");
    return attendanceController.getMyLeaveHistory(req, res);

  } catch (error) {
    console.error("Get leave history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update leave request (Faculty)
 */
export const updateLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { reason, substituteId, substituteReason } = req.body;
    const facultyId = req.user.id;

    const attendance = await Attendance.findOne({
      _id: leaveId,
      faculty: facultyId,
      approvalStatus: "pending",
      isActive: true
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Pending leave request not found"
      });
    }

    if (reason) attendance.reason = reason;
    if (substituteId) {
      attendance.substitute = substituteId;
      attendance.substituteReason = substituteReason;
      attendance.substituteApproved = false;
    }

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate("faculty", "name email uniqueId")
      .populate("substitute", "name email uniqueId");

    res.json({
      success: true,
      message: "Leave request updated successfully",
      data: populatedAttendance
    });

  } catch (error) {
    console.error("Update leave request error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ===== SUBSTITUTE MANAGEMENT CONTROLLERS =====

/**
 * Get substitute requests
 */
export const getSubstituteRequests = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const filter = {
      substitute: facultyId,
      isActive: true
    };

    if (status === "pending") {
      filter.substituteApproved = false;
    } else if (status === "approved") {
      filter.substituteApproved = true;
    }

    const requests = await Attendance.find(filter)
      .populate("faculty", "name email designation department")
      .populate("subject", "name code")
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get substitute requests error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Accept substitute assignment
 */
export const acceptSubstituteAssignment = async (req, res) => {
  try {
    const { requestId } = req.params;
    const facultyId = req.user.id;
    const { accept } = req.body;

    const attendance = await Attendance.findOne({
      _id: requestId,
      substitute: facultyId,
      isActive: true
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Substitute request not found"
      });
    }

    if (accept) {
      attendance.substituteApproved = true;
      
      // Update affected classes status
      attendance.affectedClasses.forEach(classItem => {
        classItem.status = "substitute_assigned";
      });

      await attendance.save();

      // Notify the original faculty
      await createNotification({
        title: "Substitute Request Accepted",
        message: `${req.user.name} has accepted your substitute request for ${attendance.date.toDateString()}`,
        recipient: attendance.faculty,
        type: "substitute_assignment",
        sender: facultyId
      });

    } else {
      // If rejected, remove substitute assignment
      attendance.substitute = null;
      attendance.substituteApproved = false;
      attendance.substituteReason = null;
      
      await attendance.save();
    }

    res.json({
      success: true,
      message: `Substitute request ${accept ? "accepted" : "rejected"} successfully`,
      data: attendance
    });

  } catch (error) {
    console.error("Accept substitute assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ===== ATTENDANCE CONTROLLERS =====

/**
 * Mark attendance (Faculty)
 */
export const markAttendance = async (req, res) => {
  try {
    const facultyId = req.user.id;

    // Faculty can only mark their own attendance
    req.body.facultyId = facultyId;
    
    const attendanceController = await import("./attendanceController.js");
    return attendanceController.markAttendance(req, res);

  } catch (error) {
    console.error("Mark attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get attendance summary
 */
export const getAttendanceSummary = async (req, res) => {
  try {
    const facultyId = req.params.id || req.user.id;

    // Use the existing attendance controller function
    req.query.facultyId = facultyId;
    const attendanceController = await import("./attendanceController.js");
    return attendanceController.getAttendanceSummary(req, res);

  } catch (error) {
    console.error("Get attendance summary error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ===== HELPER FUNCTIONS =====

/**
 * Get faculty attendance statistics
 */
async function getFacultyAttendanceStats(facultyId, year) {
  try {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const stats = await Attendance.aggregate([
      {
        $match: {
          faculty: facultyId,
          date: { $gte: yearStart, $lte: yearEnd },
          isActive: true
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const total = stats.reduce((sum, item) => sum + item.count, 0);
    const present = stats.find(item => item._id === "present")?.count || 0;
    const presentPercentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    return {
      total,
      present,
      presentPercentage,
      breakdown: stats
    };

  } catch (error) {
    console.error("Error getting faculty attendance stats:", error);
    return { total: 0, present: 0, presentPercentage: 0, breakdown: [] };
  }
}

/**
 * Get faculty timetable statistics
 */
async function getFacultyTimetableStats(facultyId) {
  try {
    const currentTimetable = await Timetable.findOne({
      "schedule.slots.faculty": facultyId,
      "validity.isCurrent": true,
      status: { $in: ["approved", "published"] }
    });

    if (!currentTimetable) {
      return { weeklyHours: 0, totalSubjects: 0, totalClasses: 0 };
    }

    let weeklyHours = 0;
    let subjects = new Set();
    let totalClasses = 0;

    currentTimetable.schedule.forEach(day => {
      day.slots.forEach(slot => {
        if (slot.faculty.toString() === facultyId.toString()) {
          weeklyHours += getSlotDuration(slot.timeSlot);
          subjects.add(slot.subject.toString());
          totalClasses++;
        }
      });
    });

    return {
      weeklyHours: Math.round(weeklyHours),
      totalSubjects: subjects.size,
      totalClasses
    };

  } catch (error) {
    console.error("Error getting faculty timetable stats:", error);
    return { weeklyHours: 0, totalSubjects: 0, totalClasses: 0 };
  }
}

/**
 * Calculate slot duration in hours
 */
function getSlotDuration(timeSlot) {
  // Example: "9:00-10:00" -> 1 hour
  const [start, end] = timeSlot.split('-');
  const startTime = new Date(`2000-01-01T${start}`);
  const endTime = new Date(`2000-01-01T${end}`);
  return (endTime - startTime) / (1000 * 60 * 60);
}

/**
 * Create notification
 */
async function createNotification(notificationData) {
  try {
    const notification = new Notification({
      ...notificationData,
      systemGenerated: !notificationData.sender
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

export default {
  // Admin functions
  addFaculty,
  updateFaculty,
  deleteFaculty,
  getAllFaculty,
  getFacultyById,
  
  // Faculty self-service
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
};