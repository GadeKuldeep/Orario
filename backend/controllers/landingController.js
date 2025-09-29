import Attendance from "../models/Attendance.js";
import Timetable from "../models/Timetable.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Subject from "../models/Subject.js";
import Classroom from "../models/Classroom.js";

/**
 * Landing Controller - Provides dashboard data based on user role
 */
const landingController = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;
    
    // Base landing page data (public)
    let landingData = {
      title: "Timetable Management System",
      systemStats: await getSystemStats(),
      announcements: await getRecentAnnouncements(),
      isAuthenticated: !!userId,
      userRole: userRole || 'guest'
    };

    // Add role-specific data if user is authenticated
    if (userId && userRole) {
      switch (userRole) {
        case 'admin':
          landingData = {
            ...landingData,
            ...await getAdminDashboardData()
          };
          break;
          
        case 'faculty':
          landingData = {
            ...landingData,
            ...await getFacultyDashboardData(userId)
          };
          break;
          
        case 'student':
          landingData = {
            ...landingData,
            ...await getStudentDashboardData(userId)
          };
          break;
      }
      
      // Add user-specific notifications
      landingData.notifications = await getRecentNotifications(userId);
    }

    res.status(200).json({
      success: true,
      data: landingData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Landing controller error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading landing page data",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get system-wide statistics (public data)
 */
const getSystemStats = async () => {
  try {
    const [
      totalFaculty,
      totalStudents,
      totalDepartments,
      totalSubjects,
      activeTimetables,
      todayAttendance
    ] = await Promise.all([
      User.countDocuments({ role: 'faculty', isActive: true }),
      User.countDocuments({ role: 'student', isActive: true }),
      Department.countDocuments(),
      Subject.countDocuments(),
      Timetable.countDocuments({ 
        status: 'published', 
        'validity.isCurrent': true 
      }),
      Attendance.countDocuments({ 
        date: { 
          $gte: new Date().setHours(0,0,0,0), 
          $lt: new Date().setHours(23,59,59,999) 
        } 
      })
    ]);

    return {
      totalFaculty,
      totalStudents,
      totalDepartments,
      totalSubjects,
      activeTimetables,
      todayAttendance
    };
  } catch (error) {
    console.error("Error fetching system stats:", error);
    return {};
  }
};

/**
 * Get recent system announcements
 */
const getRecentAnnouncements = async () => {
  try {
    const announcements = await Notification.find({
      recipientType: { $in: ['all_faculty', 'all_students', 'role_based'] },
      type: 'announcement'
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title message createdAt priority')
    .lean();

    return announcements;
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return [];
  }
};

/**
 * Get admin-specific dashboard data
 */
const getAdminDashboardData = async () => {
  try {
    const [
      pendingApprovals,
      recentOptimizations,
      maintenanceClassrooms,
      departmentStats
    ] = await Promise.all([
      // Pending attendance approvals
      Attendance.countDocuments({ 
        approvalStatus: 'pending',
        status: { $in: ['leave', 'half_day'] }
      }),
      
      // Recent optimization logs
      import('../models/OptimizationLog.js').then(model =>
        model.default.find().sort({ createdAt: -1 }).limit(3).lean()
      ).catch(() => []),
      
      // Classrooms under maintenance
      Classroom.countDocuments({ 'underMaintenance.status': true }),
      
      // Department statistics
      Department.find()
        .select('name facultyCount studentCount subjectCount')
        .lean()
    ]);

    return {
      adminData: {
        pendingApprovals,
        recentOptimizations,
        maintenanceClassrooms,
        departmentStats,
        quickActions: [
          { label: 'Manage Timetables', route: '/admin/timetables' },
          { label: 'Faculty Management', route: '/admin/faculty' },
          { label: 'System Analytics', route: '/admin/analytics' }
        ]
      }
    };
  } catch (error) {
    console.error("Error fetching admin data:", error);
    return { adminData: {} };
  }
};

/**
 * Get faculty-specific dashboard data
 */
const getFacultyDashboardData = async (userId) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0,0,0,0));
    const endOfDay = new Date(today.setHours(23,59,59,999));

    const [
      todaySchedule,
      recentAttendance,
      pendingSubstitutions,
      upcomingLeaves,
      subjectStats
    ] = await Promise.all([
      // Today's classes
      getTodaysSchedule(userId),
      
      // Recent attendance status
      Attendance.findOne({
        faculty: userId,
        date: { $gte: startOfDay, $lt: endOfDay }
      }).lean(),
      
      // Pending substitute assignments
      Timetable.countDocuments({
        'schedule.slots': {
          $elemMatch: {
            isSubstitute: true,
            faculty: userId,
            substituteApproved: false
          }
        }
      }),
      
      // Upcoming leaves
      Attendance.find({
        faculty: userId,
        date: { $gte: startOfDay },
        status: { $in: ['leave', 'half_day'] },
        approvalStatus: 'approved'
      })
      .sort({ date: 1 })
      .limit(5)
      .select('date status leaveType reason')
      .lean(),
      
      // Subject statistics
      Subject.countDocuments({ 'facultyAssigned.faculty': userId })
    ]);

    return {
      facultyData: {
        todaySchedule,
        attendanceStatus: recentAttendance,
        pendingSubstitutions,
        upcomingLeaves,
        subjectCount: subjectStats,
        quickActions: [
          { label: 'Mark Attendance', route: '/faculty/attendance' },
          { label: 'View Timetable', route: '/faculty/timetable' },
          { label: 'Apply Leave', route: '/faculty/leave' }
        ]
      }
    };
  } catch (error) {
    console.error("Error fetching faculty data:", error);
    return { facultyData: {} };
  }
};

/**
 * Get student-specific dashboard data
 */
const getStudentDashboardData = async (userId) => {
  try {
    const user = await User.findById(userId)
      .select('department semester coursesEnrolled')
      .populate('department', 'name code')
      .lean();

    const [
      todaySchedule,
      recentNotifications,
      departmentTimetable
    ] = await Promise.all([
      // Today's classes for student
      getTodaysScheduleForStudent(user),
      
      // Recent notifications
      Notification.find({
        $or: [
          { recipient: userId },
          { recipientType: 'all_students' },
          { 
            recipientType: 'department',
            'relatedEntity.entityId': user.department?._id 
          }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title message type createdAt')
      .lean(),
      
      // Current timetable
      Timetable.findOne({
        department: user.department,
        semester: user.semester,
        status: 'published',
        'validity.isCurrent': true
      })
      .select('title validity optimizationMetrics')
      .lean()
    ]);

    return {
      studentData: {
        studentInfo: {
          department: user.department,
          semester: user.semester,
          enrolledSubjects: user.coursesEnrolled?.length || 0
        },
        todaySchedule,
        recentNotifications,
        currentTimetable: departmentTimetable,
        quickActions: [
          { label: 'View Timetable', route: '/student/timetable' },
          { label: 'My Subjects', route: '/student/subjects' },
          { label: 'Academic Calendar', route: '/student/calendar' }
        ]
      }
    };
  } catch (error) {
    console.error("Error fetching student data:", error);
    return { studentData: {} };
  }
};

/**
 * Get today's schedule for faculty
 */
const getTodaysSchedule = async (userId) => {
  try {
    const today = new Date().toLocaleString('en-us', { weekday: 'long' });
    const timetables = await Timetable.find({
      status: 'published',
      'validity.isCurrent': true,
      'schedule.slots.faculty': userId
    })
    .populate('schedule.slots.subject', 'name code')
    .populate('schedule.slots.classroom', 'name roomNumber')
    .lean();

    const todaySchedule = [];
    
    timetables.forEach(timetable => {
      const daySchedule = timetable.schedule.find(day => day.day === today);
      if (daySchedule) {
        daySchedule.slots.forEach(slot => {
          if (slot.faculty.toString() === userId.toString()) {
            todaySchedule.push({
              timeSlot: slot.timeSlot,
              subject: slot.subject,
              classroom: slot.classroom,
              type: slot.type,
              hasConflict: slot.hasConflict
            });
          }
        });
      }
    });

    return todaySchedule.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  } catch (error) {
    console.error("Error fetching today's schedule:", error);
    return [];
  }
};

/**
 * Get today's schedule for student
 */
const getTodaysScheduleForStudent = async (student) => {
  try {
    const today = new Date().toLocaleString('en-us', { weekday: 'long' });
    const timetable = await Timetable.findOne({
      department: student.department,
      semester: student.semester,
      status: 'published',
      'validity.isCurrent': true
    })
    .populate('schedule.slots.subject', 'name code type')
    .populate('schedule.slots.faculty', 'name designation')
    .populate('schedule.slots.classroom', 'name roomNumber building')
    .lean();

    if (!timetable) return [];

    const daySchedule = timetable.schedule.find(day => day.day === today);
    if (!daySchedule) return [];

    return daySchedule.slots
      .sort((a, b) => a.slotOrder - b.slotOrder)
      .map(slot => ({
        timeSlot: slot.timeSlot,
        subject: slot.subject,
        faculty: slot.faculty,
        classroom: slot.classroom,
        type: slot.type
      }));
  } catch (error) {
    console.error("Error fetching student schedule:", error);
    return [];
  }
};

/**
 * Get recent notifications for user
 */
const getRecentNotifications = async (userId) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipient: userId },
        { recipientType: { $in: ['all_faculty', 'all_students', 'role_based'] } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('title message type priority isRead createdAt actionRequired')
    .lean();

    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

export default landingController;