import Timetable from "../models/Timetable.js";
import Notification from "../models/Notification.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";

export const getStudentDashboard = async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .populate("department", "name code")
      .populate("coursesEnrolled.course", "name code credits");

    // Get current timetable
    const currentTimetable = await Timetable.findOne({
      department: student.department,
      semester: student.semester,
      "validity.isCurrent": true,
      status: "published"
    }).populate("schedule.slots.subject", "name code")
      .populate("schedule.slots.faculty", "name")
      .populate("schedule.slots.classroom", "roomNumber");

    // Get upcoming classes for today
    const today = new Date().toLocaleString('en-us', { weekday: 'long' });
    const todaySchedule = currentTimetable?.schedule.find(day => day.day === today) || { slots: [] };

    // Get recent notifications
    const recentNotifications = await Notification.find({
      recipient: req.user.id,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      data: {
        studentInfo: {
          name: student.name,
          department: student.department,
          semester: student.semester,
          coursesEnrolled: student.coursesEnrolled
        },
        todaySchedule: todaySchedule.slots.sort((a, b) => a.slotOrder - b.slotOrder),
        upcomingDeadlines: [], // Would integrate with assignment system
        recentNotifications,
        quickStats: {
          totalCourses: student.coursesEnrolled.length,
          classesToday: todaySchedule.slots.length,
          unreadNotifications: await Notification.countDocuments({
            recipient: req.user.id,
            isRead: false
          })
        }
      }
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getStudentTimetable = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    const { day, format } = req.query;

    let timetable = await Timetable.findOne({
      department: student.department,
      semester: student.semester,
      "validity.isCurrent": true,
      status: "published"
    }).populate("schedule.slots.subject", "name code type")
      .populate("schedule.slots.faculty", "name email")
      .populate("schedule.slots.classroom", "roomNumber building");

    if (!timetable) {
      return res.status(404).json({ success: false, msg: "No published timetable found" });
    }

    // Filter by day if specified
    if (day) {
      timetable.schedule = timetable.schedule.filter(d => d.day === day);
    }

    // Format response based on request
    if (format === 'minimal') {
      const minimalSchedule = timetable.schedule.map(day => ({
        day: day.day,
        slots: day.slots.map(slot => ({
          time: slot.timeSlot,
          subject: slot.subject.name,
          faculty: slot.faculty.name,
          room: slot.classroom.roomNumber
        }))
      }));
      
      return res.json({ success: true, data: minimalSchedule });
    }

    res.json({ success: true, data: timetable });
  } catch (error) {
    console.error("Get student timetable error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const exportStudentTimetableICS = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    
    const timetable = await Timetable.findOne({
      department: student.department,
      semester: student.semester,
      "validity.isCurrent": true,
      status: "published"
    }).populate("schedule.slots.subject", "name code")
      .populate("schedule.slots.faculty", "name")
      .populate("schedule.slots.classroom", "roomNumber");

    if (!timetable) {
      return res.status(404).json({ success: false, msg: "No timetable found" });
    }

    // Generate ICS content
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Timetable Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    timetable.schedule.forEach(day => {
      day.slots.forEach(slot => {
        // Convert day and time to actual dates (simplified)
        const eventDate = new Date();
        const dayOffset = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          .indexOf(day.day);
        
        eventDate.setDate(eventDate.getDate() + (dayOffset - eventDate.getDay() + 7) % 7);
        
        const [startTime, endTime] = slot.timeSlot.split('-');
        const [startHour, startMinute] = startTime.split(':');
        const [endHour, endMinute] = endTime.split(':');
        
        eventDate.setHours(parseInt(startHour), parseInt(startMinute), 0);
        const endDate = new Date(eventDate);
        endDate.setHours(parseInt(endHour), parseInt(endMinute), 0);

        icsContent.push(
          'BEGIN:VEVENT',
          `SUMMARY:${slot.subject.name}`,
          `DESCRIPTION:Faculty: ${slot.faculty.name}\\nRoom: ${slot.classroom.roomNumber}`,
          `DTSTART:${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `LOCATION:${slot.classroom.roomNumber}`,
          'END:VEVENT'
        );
      });
    });

    icsContent.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename=timetable-${student.uniqueId}.ics`);
    res.send(icsContent.join('\r\n'));
  } catch (error) {
    console.error("Export timetable error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getStudentNotifications = async (req, res) => {
  try {
    const { limit = 20, page = 1, unreadOnly } = req.query;
    
    const filter = { recipient: req.user.id };
    if (unreadOnly === 'true') filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
          unreadCount
        }
      }
    });
  } catch (error) {
    console.error("Get student notifications error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await Notification.updateMany(
        { _id: { $in: notificationIds }, recipient: req.user.id },
        { isRead: true, readAt: new Date() }
      );
    } else {
      // Mark all notifications as read
      await Notification.updateMany(
        { recipient: req.user.id, isRead: false },
        { isRead: true, readAt: new Date() }
      );
    }

    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });

    res.json({
      success: true,
      msg: "Notifications marked as read",
      data: { unreadCount }
    });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const searchTimetable = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const student = await User.findById(req.user.id);

    if (!searchTerm) {
      return res.status(400).json({ success: false, msg: "Search term required" });
    }

    const timetable = await Timetable.findOne({
      department: student.department,
      semester: student.semester,
      "validity.isCurrent": true,
      status: "published"
    }).populate("schedule.slots.subject", "name code")
      .populate("schedule.slots.faculty", "name")
      .populate("schedule.slots.classroom", "roomNumber");

    if (!timetable) {
      return res.status(404).json({ success: false, msg: "No timetable found" });
    }

    // Search across subjects, faculty, and classrooms
    const searchResults = [];
    timetable.schedule.forEach(day => {
      day.slots.forEach(slot => {
        const searchableText = `
          ${slot.subject.name} ${slot.subject.code} 
          ${slot.faculty.name} 
          ${slot.classroom.roomNumber}
        `.toLowerCase();

        if (searchableText.includes(searchTerm.toLowerCase())) {
          searchResults.push({
            day: day.day,
            timeSlot: slot.timeSlot,
            subject: slot.subject,
            faculty: slot.faculty,
            classroom: slot.classroom
          });
        }
      });
    });

    res.json({
      success: true,
      data: {
        searchTerm,
        results: searchResults,
        totalResults: searchResults.length
      }
    });
  } catch (error) {
    console.error("Search timetable error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};
// Add these to your existing exports

export const getStudentProfile = async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .populate("department", "name code")
      .populate("coursesEnrolled.course", "name code credits")
      .select("-password -refreshToken");

    if (!student) {
      return res.status(404).json({ success: false, msg: "Student not found" });
    }

    res.json({
      success: true,
      data: {
        profile: {
          uniqueId: student.uniqueId,
          name: student.name,
          email: student.email,
          phone: student.phone,
          semester: student.semester,
          department: student.department,
          coursesEnrolled: student.coursesEnrolled,
          dateOfBirth: student.dateOfBirth,
          address: student.address,
          emergencyContact: student.emergencyContact,
          enrollmentDate: student.enrollmentDate,
          academicStatus: student.academicStatus
        }
      }
    });
  } catch (error) {
    console.error("Get student profile error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const updateStudentProfile = async (req, res) => {
  try {
    const { phone, address, emergencyContact, dateOfBirth } = req.body;
    
    // Fields that students are allowed to update
    const allowedUpdates = {};
    if (phone !== undefined) allowedUpdates.phone = phone;
    if (address !== undefined) allowedUpdates.address = address;
    if (emergencyContact !== undefined) allowedUpdates.emergencyContact = emergencyContact;
    if (dateOfBirth !== undefined) allowedUpdates.dateOfBirth = dateOfBirth;

    const updatedStudent = await User.findByIdAndUpdate(
      req.user.id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    res.json({
      success: true,
      msg: "Profile updated successfully",
      data: { profile: updatedStudent }
    });
  } catch (error) {
    console.error("Update student profile error:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, msg: errors.join(', ') });
    }
    
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getAttendanceSummary = async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .populate("coursesEnrolled.course", "name code");

    // Mock attendance data - you'll integrate with your actual attendance system
    const attendanceSummary = student.coursesEnrolled.map(courseEnrollment => {
      const course = courseEnrollment.course;
      
      // Mock data - replace with actual attendance calculation
      const totalClasses = Math.floor(Math.random() * 30) + 20; // 20-50 classes
      const attendedClasses = Math.floor(totalClasses * (0.7 + Math.random() * 0.25)); // 70-95% attendance
      const attendancePercentage = ((attendedClasses / totalClasses) * 100).toFixed(1);
      
      return {
        course: {
          _id: course._id,
          name: course.name,
          code: course.code
        },
        attendance: {
          totalClasses,
          attendedClasses,
          absentClasses: totalClasses - attendedClasses,
          percentage: parseFloat(attendancePercentage),
          status: attendancePercentage >= 75 ? 'Satisfactory' : 'Unsatisfactory'
        },
        lastUpdated: new Date()
      };
    });

    const overallStats = attendanceSummary.reduce((stats, course) => {
      stats.totalCourses++;
      stats.totalClasses += course.attendance.totalClasses;
      stats.attendedClasses += course.attendance.attendedClasses;
      
      if (course.attendance.percentage >= 75) {
        stats.satisfactoryCourses++;
      }
      
      return stats;
    }, { totalCourses: 0, totalClasses: 0, attendedClasses: 0, satisfactoryCourses: 0 });

    overallStats.overallPercentage = overallStats.totalClasses > 0 
      ? parseFloat(((overallStats.attendedClasses / overallStats.totalClasses) * 100).toFixed(1))
      : 0;

    res.json({
      success: true,
      data: {
        summary: attendanceSummary,
        overallStats: {
          ...overallStats,
          overallStatus: overallStats.overallPercentage >= 75 ? 'Satisfactory' : 'Unsatisfactory'
        }
      }
    });
  } catch (error) {
    console.error("Get attendance summary error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getCourseMaterials = async (req, res) => {
  try {
    const { courseId } = req.params;
    const student = await User.findById(req.user.id);

    // Check if student is enrolled in the course
    const isEnrolled = student.coursesEnrolled.some(
      enrollment => enrollment.course.toString() === courseId
    );

    if (!isEnrolled) {
      return res.status(403).json({ 
        success: false, 
        msg: "You are not enrolled in this course" 
      });
    }

    // Mock course materials - integrate with your actual materials system
    const mockMaterials = [
      {
        _id: "1",
        title: "Course Syllabus",
        type: "document",
        url: "/materials/syllabus.pdf",
        uploadedBy: "Dr. Smith",
        uploadedAt: new Date('2024-01-15'),
        size: "2.1 MB",
        description: "Course outline and evaluation criteria"
      },
      {
        _id: "2",
        title: "Lecture 1 - Introduction",
        type: "video",
        url: "/materials/lecture1.mp4",
        uploadedBy: "Dr. Smith",
        uploadedAt: new Date('2024-01-20'),
        duration: "45:30",
        description: "Introduction to course concepts"
      },
      {
        _id: "3",
        title: "Assignment 1 Guidelines",
        type: "document",
        url: "/materials/assignment1.pdf",
        uploadedBy: "Dr. Smith",
        uploadedAt: new Date('2024-01-25'),
        size: "1.5 MB",
        description: "Detailed instructions for first assignment"
      },
      {
        _id: "4",
        title: "Weekly Reading Materials",
        type: "link",
        url: "https://example.com/readings",
        uploadedBy: "Dr. Smith",
        uploadedAt: new Date('2024-01-28'),
        description: "External resources for this week"
      }
    ];

    // Get course info
    const course = await Subject.findById(courseId).select("name code");

    res.json({
      success: true,
      data: {
        course: {
          _id: course._id,
          name: course.name,
          code: course.code
        },
        materials: mockMaterials,
        totalMaterials: mockMaterials.length,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error("Get course materials error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};