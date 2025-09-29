import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import Timetable from "../models/Timetable.js";
import Subject from "../models/Subject.js";
import Notification from "../models/Notification.js";
import Department from "../models/Department.js";

// ===== LEAVE MANAGEMENT CONTROLLERS =====

/**
 * Apply for leave
 */
export const applyForLeave = async (req, res) => {
  try {
    const { date, status, leaveType, reason, substituteId, substituteReason } = req.body;
    const facultyId = req.user.id;

    // Validate required fields
    if (!date || !status) {
      return res.status(400).json({
        success: false,
        message: "Date and status are required"
      });
    }

    // Check if leave already exists for this date
    const existingLeave = await Attendance.findOne({
      faculty: facultyId,
      date: new Date(date),
      isActive: true
    });

    if (existingLeave) {
      return res.status(400).json({
        success: false,
        message: "Leave already applied for this date"
      });
    }

    // Get faculty's affected classes for the date
    const affectedClasses = await getAffectedClasses(facultyId, new Date(date));

    // Create leave application
    const leaveApplication = new Attendance({
      faculty: facultyId,
      date: new Date(date),
      status,
      leaveType: status === "leave" ? leaveType : undefined,
      reason,
      substitute: substituteId || undefined,
      substituteReason: substituteId ? substituteReason : undefined,
      substituteApproved: false,
      affectedClasses,
      approvalStatus: "pending",
      createdBy: facultyId
    });

    await leaveApplication.save();

    // Populate the saved document for response
    const populatedLeave = await Attendance.findById(leaveApplication._id)
      .populate("faculty", "name email uniqueId")
      .populate("substitute", "name email uniqueId")
      .populate("affectedClasses.subject", "name code")
      .populate("affectedClasses.timetableEntry");

    // Create notification for HOD/admin
    await createNotification({
      title: "New Leave Application",
      message: `${req.user.name} has applied for ${leaveType || status} leave on ${new Date(date).toDateString()}`,
      recipientType: "role_based",
      type: "leave_approval",
      actionRequired: true,
      relatedEntity: {
        entityType: "attendance",
        entityId: leaveApplication._id
      },
      sender: facultyId
    });

    res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      data: populatedLeave
    });

  } catch (error) {
    console.error("Apply leave error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get leave history for current user
 */
export const getLeaveHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    const filter = { 
      faculty: userId, 
      isActive: true 
    };

    // Apply filters
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const leaves = await Attendance.find(filter)
      .populate("faculty", "name email uniqueId")
      .populate("substitute", "name email uniqueId")
      .populate("approvedBy", "name email")
      .populate("affectedClasses.subject", "name code")
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: leaves,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get my leave history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get substitute suggestions for a leave date
 */
export const getSubstituteSuggestions = async (req, res) => {
  try {
    const { date, subjectId } = req.query;
    const facultyId = req.user.id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }

    // Get current faculty's department
    const faculty = await User.findById(facultyId);
    if (!faculty || !faculty.department) {
      return res.status(400).json({
        success: false,
        message: "Faculty department not found"
      });
    }

    // Find available faculty from same department
    const availableFaculty = await User.find({
      department: faculty.department,
      role: "faculty",
      isActive: true,
      _id: { $ne: facultyId } // Exclude current faculty
    }).select("name email uniqueId designation subjectsAssigned");

    // Filter faculty who are available on the given date
    const suggestions = await Promise.all(
      availableFaculty.map(async (faculty) => {
        const isAvailable = await checkFacultyAvailability(faculty._id, new Date(date));
        return {
          ...faculty.toObject(),
          available: isAvailable,
          suitabilityScore: await calculateSuitabilityScore(faculty, subjectId)
        };
      })
    );

    // Sort by suitability score (highest first)
    suggestions.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error("Get substitute suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Handle substitute assignment
 */
export const handleSubstituteAssignment = async (req, res) => {
  try {
    const { attendanceId, substituteId, reason } = req.body;
    const facultyId = req.user.id;

    const attendance = await Attendance.findOne({
      _id: attendanceId,
      faculty: facultyId,
      isActive: true
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found"
      });
    }

    if (attendance.status !== "leave") {
      return res.status(400).json({
        success: false,
        message: "Substitute can only be assigned for leave applications"
      });
    }

    // Check if substitute is available
    const isAvailable = await checkFacultyAvailability(substituteId, attendance.date);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Selected substitute is not available on the leave date"
      });
    }

    attendance.substitute = substituteId;
    attendance.substituteReason = reason;
    attendance.substituteApproved = false;

    await attendance.save();

    // Notify substitute
    await createNotification({
      title: "Substitute Assignment Request",
      message: `You have been requested to substitute for ${req.user.name} on ${attendance.date.toDateString()}`,
      recipient: substituteId,
      type: "substitute_assignment",
      actionRequired: true,
      relatedEntity: {
        entityType: "attendance",
        entityId: attendance._id
      },
      sender: facultyId
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate("faculty", "name email uniqueId")
      .populate("substitute", "name email uniqueId");

    res.json({
      success: true,
      message: "Substitute assigned successfully",
      data: populatedAttendance
    });

  } catch (error) {
    console.error("Handle substitute assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get leave requests for approval (HOD/Admin)
 */
export const getLeaveRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, departmentId } = req.query;
    const user = req.user;

    let filter = { 
      isActive: true,
      approvalStatus: status || "pending"
    };

    // If user is faculty (HOD), filter by their department
    if (user.role === "faculty") {
      const hodDepartment = await Department.findOne({ headOfDepartment: user.id });
      if (hodDepartment) {
        const departmentFaculty = await User.find({ 
          department: hodDepartment._id,
          role: "faculty"
        }).select("_id");
        
        filter.faculty = { $in: departmentFaculty.map(f => f._id) };
      }
    }

    const leaveRequests = await Attendance.find(filter)
      .populate("faculty", "name email uniqueId department")
      .populate("substitute", "name email uniqueId")
      .populate("approvedBy", "name email")
      .populate({
        path: "faculty",
        populate: { path: "department", select: "name code" }
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: leaveRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get leave requests error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get department-specific leave requests
 */
export const getDepartmentLeaveRequests = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Get all faculty in the department
    const departmentFaculty = await User.find({ 
      department: departmentId,
      role: "faculty"
    }).select("_id");

    const filter = {
      faculty: { $in: departmentFaculty.map(f => f._id) },
      isActive: true,
      ...(status && { approvalStatus: status })
    };

    const leaveRequests = await Attendance.find(filter)
      .populate("faculty", "name email uniqueId")
      .populate("substitute", "name email uniqueId")
      .populate("approvedBy", "name email")
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: leaveRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get department leave requests error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Approve leave request
 */
export const approveLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { approved, remarks } = req.body;
    const approvedBy = req.user.id;

    const attendance = await Attendance.findById(leaveId);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found"
      });
    }

    attendance.approvalStatus = approved ? "approved" : "rejected";
    attendance.approvedBy = approvedBy;
    attendance.approvalDate = new Date();
    
    if (remarks) {
      attendance.reason = attendance.reason ? `${attendance.reason} | Approval Remarks: ${remarks}` : remarks;
    }

    await attendance.save();

    // Update affected classes status based on approval
    if (approved) {
      await updateAffectedClasses(attendance);
    }

    // Notify faculty about approval status
    await createNotification({
      title: `Leave Application ${approved ? "Approved" : "Rejected"}`,
      message: `Your leave application for ${attendance.date.toDateString()} has been ${approved ? "approved" : "rejected"}`,
      recipient: attendance.faculty,
      type: "leave_approval",
      relatedEntity: {
        entityType: "attendance",
        entityId: attendance._id
      },
      sender: approvedBy
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate("faculty", "name email uniqueId")
      .populate("approvedBy", "name email");

    res.json({
      success: true,
      message: `Leave application ${approved ? "approved" : "rejected"} successfully`,
      data: populatedAttendance
    });

  } catch (error) {
    console.error("Approve leave error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update leave status (admin/HOD)
 */
export const updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, remarks } = req.body;

    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const attendance = await Attendance.findById(leaveId);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found"
      });
    }

    attendance.approvalStatus = status;
    attendance.approvedBy = req.user.id;
    attendance.approvalDate = new Date();
    
    if (remarks) {
      attendance.reason = attendance.reason ? `${attendance.reason} | Admin Remarks: ${remarks}` : remarks;
    }

    await attendance.save();

    if (status === "approved") {
      await updateAffectedClasses(attendance);
    }

    res.json({
      success: true,
      message: "Leave status updated successfully",
      data: attendance
    });

  } catch (error) {
    console.error("Update leave status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ===== ATTENDANCE MANAGEMENT CONTROLLERS =====

/**
 * Mark attendance
 */
export const markAttendance = async (req, res) => {
  try {
    const { facultyId, date, status, leaveType, reason } = req.body;
    const markedBy = req.user.id;

    // Validate required fields
    if (!facultyId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: "Faculty ID, date, and status are required"
      });
    }

    // Check if attendance already marked for this date
    const existingAttendance = await Attendance.findOne({
      faculty: facultyId,
      date: new Date(date),
      isActive: true
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this date"
      });
    }

    const attendance = new Attendance({
      faculty: facultyId,
      date: new Date(date),
      status,
      leaveType: status === "leave" ? leaveType : undefined,
      reason,
      approvedBy: markedBy,
      approvalStatus: "approved",
      createdBy: markedBy
    });

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate("faculty", "name email uniqueId")
      .populate("approvedBy", "name email");

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: populatedAttendance
    });

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
    const { facultyId, departmentId, startDate, endDate } = req.query;
    const user = req.user;

    let filter = { isActive: true };
    let targetFaculty = [];

    // Determine scope based on user role and parameters
    if (facultyId) {
      // Specific faculty (admin/HOD access)
      filter.faculty = facultyId;
    } else if (departmentId) {
      // Department-wide (HOD/admin access)
      const departmentFaculty = await User.find({ 
        department: departmentId,
        role: "faculty"
      }).select("_id");
      filter.faculty = { $in: departmentFaculty.map(f => f._id) };
    } else if (user.role === "faculty") {
      // Faculty viewing their own attendance
      filter.faculty = user.id;
    } else if (user.role === "admin") {
      // Admin viewing all attendance (no filter applied)
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const attendanceRecords = await Attendance.find(filter)
      .populate("faculty", "name email uniqueId department")
      .populate("approvedBy", "name email")
      .sort({ date: -1 });

    // Calculate summary statistics
    const summary = calculateAttendanceSummary(attendanceRecords);

    res.json({
      success: true,
      data: attendanceRecords,
      summary
    });

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
 * Get affected classes for a faculty on a specific date
 */
async function getAffectedClasses(facultyId, date) {
  try {
    // Find timetable entries for the faculty on the given date
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[date.getDay()];

    const timetableEntries = await Timetable.find({
      "schedule.slots.faculty": facultyId,
      "schedule.day": dayName,
      "validity.startDate": { $lte: date },
      "validity.endDate": { $gte: date },
      status: { $in: ["approved", "published"] }
    });

    const affectedClasses = [];

    timetableEntries.forEach(timetable => {
      timetable.schedule.forEach(daySchedule => {
        if (daySchedule.day === dayName) {
          daySchedule.slots.forEach(slot => {
            if (slot.faculty.toString() === facultyId.toString()) {
              affectedClasses.push({
                timetableEntry: timetable._id,
                subject: slot.subject,
                timeSlot: slot.timeSlot,
                status: "cancelled"
              });
            }
          });
        }
      });
    });

    return affectedClasses;

  } catch (error) {
    console.error("Error getting affected classes:", error);
    return [];
  }
}

/**
 * Check if faculty is available on a specific date
 */
async function checkFacultyAvailability(facultyId, date) {
  try {
    // Check if faculty has already applied for leave on this date
    const existingLeave = await Attendance.findOne({
      faculty: facultyId,
      date: date,
      isActive: true,
      approvalStatus: { $in: ["approved", "pending"] }
    });

    return !existingLeave;

  } catch (error) {
    console.error("Error checking faculty availability:", error);
    return false;
  }
}

/**
 * Calculate suitability score for substitute faculty
 */
async function calculateSuitabilityScore(faculty, subjectId) {
  let score = 50; // Base score

  try {
    // Bonus if faculty teaches the same subject
    if (subjectId && faculty.subjectsAssigned.includes(subjectId)) {
      score += 30;
    }

    // Bonus based on designation
    const designationBonus = {
      "Professor": 20,
      "Associate Professor": 15,
      "Assistant Professor": 10,
      "Lecturer": 5
    };
    
    if (faculty.designation && designationBonus[faculty.designation]) {
      score += designationBonus[faculty.designation];
    }

    return Math.min(score, 100); // Cap at 100

  } catch (error) {
    console.error("Error calculating suitability score:", error);
    return score;
  }
}

/**
 * Update affected classes when leave is approved
 */
async function updateAffectedClasses(attendance) {
  try {
    // Implementation would update timetable entries
    // to reflect cancelled/rescheduled classes
    // This is a placeholder for the actual implementation
    console.log("Updating affected classes for attendance:", attendance._id);
  } catch (error) {
    console.error("Error updating affected classes:", error);
  }
}

/**
 * Calculate attendance summary statistics
 */
function calculateAttendanceSummary(attendanceRecords) {
  const summary = {
    total: attendanceRecords.length,
    present: 0,
    absent: 0,
    leave: 0,
    half_day: 0,
    presentPercentage: 0
  };

  attendanceRecords.forEach(record => {
    if (record.status === "present") summary.present++;
    else if (record.status === "absent") summary.absent++;
    else if (record.status === "leave") summary.leave++;
    else if (record.status === "half_day") summary.half_day++;
  });

  if (summary.total > 0) {
    summary.presentPercentage = ((summary.present / summary.total) * 100).toFixed(2);
  }

  return summary;
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

// Export all functions correctly
export default {
  applyForLeave,
  getLeaveHistory, // Fixed: changed from getMyLeaveHistory to getLeaveHistory
  approveLeaveRequest,
  getLeaveRequests,
  updateLeaveStatus,
  getAttendanceSummary,
  markAttendance,
  getSubstituteSuggestions,
  handleSubstituteAssignment,
  getDepartmentLeaveRequests
};