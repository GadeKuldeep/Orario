import User from "../models/User.js";
import Department from "../models/Department.js";
import Subject from "../models/Subject.js";
import Classroom from "../models/Classroom.js";
import Timetable from "../models/Timetable.js";
import Attendance from "../models/Attendance.js";
import Notification from "../models/Notification.js";
import OptimizationLog from "../models/OptimizationLog.js";
import SystemLog from "../models/SystemLog.js";

export const getDashboardOverview = async (req, res) => {
  try {
    const totalFaculty = await User.countDocuments({ role: 'faculty', isActive: true });
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    const totalDepartments = await Department.countDocuments();
    const totalClassrooms = await Classroom.countDocuments({ isActive: true });
    
    // Recent activities
    const recentTimetables = await Timetable.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('department', 'name code');
    
    const pendingLeaves = await Attendance.countDocuments({ 
      approvalStatus: 'pending',
      status: 'leave'
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalFaculty,
          totalStudents,
          totalDepartments,
          totalClassrooms,
          pendingLeaves
        },
        recentActivities: recentTimetables,
        quickActions: [
          { label: 'Generate Timetable', path: '/admin/timetable/generate' },
          { label: 'Add Faculty', path: '/admin/faculty/add' },
          { label: 'View Reports', path: '/admin/reports' }
        ]
      }
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getSystemAnalytics = async (req, res) => {
  try {
    // Faculty workload analysis
    const facultyWorkload = await Timetable.aggregate([
      { $unwind: "$schedule" },
      { $unwind: "$schedule.slots" },
      {
        $group: {
          _id: "$schedule.slots.faculty",
          totalHours: { $sum: 1 },
          departments: { $addToSet: "$department" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "faculty"
        }
      },
      { $unwind: "$faculty" },
      {
        $project: {
          name: "$faculty.name",
          email: "$faculty.email",
          department: "$faculty.department",
          totalHours: 1
        }
      }
    ]);

    // Classroom utilization
    const classroomUtilization = await Timetable.aggregate([
      { $unwind: "$schedule" },
      { $unwind: "$schedule.slots" },
      {
        $group: {
          _id: "$schedule.slots.classroom",
          totalSlots: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "classrooms",
          localField: "_id",
          foreignField: "_id",
          as: "classroom"
        }
      },
      { $unwind: "$classroom" },
      {
        $project: {
          roomNumber: "$classroom.roomNumber",
          capacity: "$classroom.capacity",
          utilization: { $multiply: [{ $divide: ["$totalSlots", 40] }, 100] } // Assuming 40 slots per week
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        facultyWorkload,
        classroomUtilization
      }
    });
  } catch (error) {
    console.error("System analytics error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const addFaculty = async (req, res) => {
  try {
    const { name, email, password, department, designation, specialization, uniqueId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, msg: "Faculty with this email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const faculty = new User({
      name,
      email,
      password: hashedPassword,
      role: 'faculty',
      department,
      designation,
      specialization,
      uniqueId,
      profileCompleted: true
    });

    await faculty.save();

    // Update department faculty count
    await Department.findByIdAndUpdate(department, { $inc: { facultyCount: 1 } });

    res.status(201).json({
      success: true,
      msg: "Faculty added successfully",
      data: faculty
    });
  } catch (error) {
    console.error("Add faculty error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const addStudent = async (req, res) => {
  try {
    const { name, email, password, department, semester, uniqueId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, msg: "Student with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const student = new User({
      name,
      email,
      password: hashedPassword,
      role: 'student',
      department,
      semester,
      uniqueId,
      profileCompleted: true
    });

    await student.save();

    // Update department student count
    await Department.findByIdAndUpdate(department, { $inc: { studentCount: 1 } });

    res.status(201).json({
      success: true,
      msg: "Student added successfully",
      data: student
    });
  } catch (error) {
    console.error("Add student error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { role, department, page = 1, limit = 10 } = req.query;
    
    const filter = { isActive: true };
    if (role) filter.role = role;
    if (department) filter.department = department;

    const users = await User.find(filter)
      .select("-password")
      .populate("department", "name code")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const manageUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.json({
      success: true,
      msg: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    console.error("Manage user status error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const addClassroom = async (req, res) => {
  try {
    const { name, roomNumber, capacity, department, building, floor, facilities, equipment } = req.body;

    const existingClassroom = await Classroom.findOne({ roomNumber });
    if (existingClassroom) {
      return res.status(400).json({ success: false, msg: "Classroom with this room number already exists" });
    }

    const classroom = new Classroom({
      name,
      roomNumber,
      capacity,
      department,
      building,
      floor,
      facilities,
      equipment
    });

    await classroom.save();

    res.status(201).json({
      success: true,
      msg: "Classroom added successfully",
      data: classroom
    });
  } catch (error) {
    console.error("Add classroom error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getClassrooms = async (req, res) => {
  try {
    const { department } = req.query;
    
    const filter = { isActive: true };
    if (department) filter.department = department;

    const classrooms = await Classroom.find(filter)
      .populate("department", "name code")
      .sort({ roomNumber: 1 });

    res.json({ success: true, data: classrooms });
  } catch (error) {
    console.error("Get classrooms error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};
export const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ 
        success: false, 
        msg: "Classroom not found" 
      });
    }

    const updatedClassroom = await Classroom.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    res.status(200).json({
      success: true,
      msg: "Classroom deleted successfully",
      data: updatedClassroom
    });
  } catch (error) {
    console.error("Delete classroom error:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        msg: "Invalid classroom ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: "Server error" 
    });
  }
};
export const updateClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, roomNumber, capacity, department, building, floor, facilities, equipment } = req.body;

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ 
        success: false, 
        msg: "Classroom not found" 
      });
    }

    // Check if room number is being changed and if it already exists
    if (roomNumber && roomNumber !== classroom.roomNumber) {
      const existingClassroom = await Classroom.findOne({ roomNumber });
      if (existingClassroom) {
        return res.status(400).json({ 
          success: false, 
          msg: "Classroom with this room number already exists" 
        });
      }
    }

    const updatedClassroom = await Classroom.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(roomNumber && { roomNumber }),
        ...(capacity && { capacity }),
        ...(department && { department }),
        ...(building && { building }),
        ...(floor && { floor }),
        ...(facilities && { facilities }),
        ...(equipment && { equipment })
      },
      { new: true, runValidators: true }
    ).populate("department", "name code");

    res.json({
      success: true,
      msg: "Classroom updated successfully",
      data: updatedClassroom
    });
  } catch (error) {
    console.error("Update classroom error:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        msg: "Invalid classroom ID format" 
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: "Validation error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: "Server error" 
    });
  }
};
export const addSubject = async (req, res) => {
  try {
    const { name, code, credits, department, semester, type, facultyAssigned } = req.body;

    const existingSubject = await Subject.findOne({ code });
    if (existingSubject) {
      return res.status(400).json({ success: false, msg: "Subject with this code already exists" });
    }

    const subject = new Subject({
      name,
      code,
      credits,
      department,
      semester,
      type,
      facultyAssigned
    });

    await subject.save();

    // Update department subject count
    await Department.findByIdAndUpdate(department, { $inc: { subjectCount: 1 } });

    res.status(201).json({
      success: true,
      msg: "Subject added successfully",
      data: subject
    });
  } catch (error) {
    console.error("Add subject error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};
export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ success: false, msg: "Subject not found" });
    }

    await Subject.findByIdAndDelete(id);

    await Department.findByIdAndUpdate(subject.department, { $inc: { subjectCount: -1 } });

    res.status(200).json({
      success: true,
      msg: "Subject deleted successfully"
    });
  } catch (error) {
    console.error("Delete subject error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const generateTimetable = async (req, res) => {
  try {
    const { department, semester, academicYear, constraints } = req.body;

    // Get all necessary data
    const subjects = await Subject.find({ department, semester });
    const faculty = await User.find({ department, role: 'faculty', isActive: true });
    const classrooms = await Classroom.find({ department, isActive: true });
    const departmentData = await Department.findById(department);

    if (!subjects.length || !faculty.length || !classrooms.length) {
      return res.status(400).json({ 
        success: false, 
        msg: "Insufficient data for timetable generation" 
      });
    }

    // AI-powered timetable generation logic
    const generatedSchedule = await generateOptimizedTimetable({
      subjects,
      faculty,
      classrooms,
      department: departmentData,
      constraints
    });

    const timetable = new Timetable({
      title: `${departmentData.name} - Semester ${semester} - ${academicYear}`,
      department,
      semester,
      academicYear,
      schedule: generatedSchedule.schedule,
      generatedBy: req.user.id,
      validity: {
        startDate: new Date(academicYear.split('-')[0], 0, 1), // Start of academic year
        endDate: new Date(academicYear.split('-')[1], 11, 31)  // End of academic year
      },
      optimizationMetrics: generatedSchedule.metrics,
      constraints: {
        hardConstraints: constraints?.hardConstraints || [],
        softConstraints: constraints?.softConstraints || []
      }
    });

    await timetable.save();

    // Log optimization
    const optimizationLog = new OptimizationLog({
      timetable: timetable._id,
      department,
      algorithmUsed: "genetic",
      performance: {
        executionTime: generatedSchedule.metrics.executionTime,
        fitnessScore: generatedSchedule.metrics.fitnessScore,
        conflictsResolved: generatedSchedule.metrics.conflictsResolved
      },
      status: "success",
      generatedBy: req.user.id
    });

    await optimizationLog.save();

    res.status(201).json({
      success: true,
      msg: "Timetable generated successfully",
      data: timetable,
      optimizationMetrics: generatedSchedule.metrics
    });

  } catch (error) {
    console.error("Generate timetable error:", error);
    res.status(500).json({ success: false, msg: "Server error during timetable generation" });
  }
};

// AI Timetable Optimization Function
const generateOptimizedTimetable = async (data) => {
  const { subjects, faculty, classrooms, department, constraints } = data;
  
  const days = department.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = department.timeSlots || [
    { slot: "9:00-10:00", order: 1 }, { slot: "10:00-11:00", order: 2 },
    { slot: "11:00-12:00", order: 3 }, { slot: "14:00-15:00", order: 4 },
    { slot: "15:00-16:00", order: 5 }
  ];

  let schedule = [];
  let conflictsResolved = 0;
  let facultyWorkload = {};
  let classroomUsage = {};

  // Initialize workload tracking
  faculty.forEach(f => facultyWorkload[f._id] = 0);
  classrooms.forEach(c => classroomUsage[c._id] = []);

  for (let day of days) {
    let daySchedule = { day, slots: [] };
    
    for (let subject of subjects) {
      const subjectHours = subject.teachingHours || 3; // Default to 3 hours per week
      
      for (let hour = 0; hour < subjectHours; hour++) {
        // Find available time slot
        const availableSlot = findAvailableSlot(
          day, timeSlots, facultyWorkload, classroomUsage, 
          subject, faculty, classrooms
        );

        if (availableSlot) {
          daySchedule.slots.push({
            timeSlot: availableSlot.timeSlot,
            slotOrder: availableSlot.order,
            subject: subject._id,
            faculty: availableSlot.facultyId,
            classroom: availableSlot.classroomId,
            type: "regular"
          });

          // Update tracking
          facultyWorkload[availableSlot.facultyId]++;
          classroomUsage[availableSlot.classroomId].push(`${day}-${availableSlot.timeSlot}`);
          conflictsResolved++;
        }
      }
    }
    
    schedule.push(daySchedule);
  }

  // Calculate metrics
  const totalPossibleSlots = days.length * timeSlots.length;
  const utilizedSlots = schedule.reduce((total, day) => total + day.slots.length, 0);
  const utilizationRate = (utilizedSlots / totalPossibleSlots) * 100;

  return {
    schedule,
    metrics: {
      fitnessScore: calculateFitnessScore(schedule, facultyWorkload, classroomUsage),
      conflictsResolved,
      facultySatisfaction: 85, // Placeholder - would calculate based on preferences
      roomUtilization: utilizationRate,
      executionTime: 2500 // Placeholder - actual timing
    }
  };
};
export const exportData = async (req, res) => {
  try {
    const { exportType, format = 'json', filters = {} } = req.body;

    let data;
    let filename;

    switch (exportType) {
      case 'users':
        data = await exportUsersData(filters);
        filename = `users_export_${Date.now()}`;
        break;
      
      case 'timetable':
        data = await exportTimetableData(filters);
        filename = `timetable_export_${Date.now()}`;
        break;
      
      case 'attendance':
        data = await exportAttendanceData(filters);
        filename = `attendance_export_${Date.now()}`;
        break;
      
      case 'departments':
        data = await exportDepartmentsData(filters);
        filename = `departments_export_${Date.now()}`;
        break;
      
      case 'classrooms':
        data = await exportClassroomsData(filters);
        filename = `classrooms_export_${Date.now()}`;
        break;
      
      case 'subjects':
        data = await exportSubjectsData(filters);
        filename = `subjects_export_${Date.now()}`;
        break;
      
      default:
        return res.status(400).json({
          success: false,
          msg: "Invalid export type. Available types: users, timetable, attendance, departments, classrooms, subjects"
        });
    }

    if (format === 'csv') {
      return exportAsCSV(res, data, filename, exportType);
    } else if (format === 'excel') {
      return exportAsExcel(res, data, filename, exportType);
    } else {
      // Default JSON response
      res.json({
        success: true,
        data: data,
        exportInfo: {
          type: exportType,
          format: format,
          generatedAt: new Date(),
          recordCount: Array.isArray(data) ? data.length : 1
        }
      });
    }

  } catch (error) {
    console.error("Export data error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error during data export",
      error: error.message 
    });
  }
};

// Helper functions for different data types
const exportUsersData = async (filters) => {
  const { role, department, isActive = true } = filters;
  
  const query = { isActive };
  if (role) query.role = role;
  if (department) query.department = department;

  const users = await User.find(query)
    .select('-password')
    .populate('department', 'name code')
    .sort({ createdAt: -1 });

  return users.map(user => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department?.name || 'N/A',
    uniqueId: user.uniqueId,
    designation: user.designation || 'N/A',
    specialization: user.specialization || 'N/A',
    semester: user.semester || 'N/A',
    isActive: user.isActive,
    createdAt: user.createdAt
  }));
};

const exportTimetableData = async (filters) => {
  const { department, semester, status } = filters;
  
  const query = {};
  if (department) query.department = department;
  if (semester) query.semester = semester;
  if (status) query.status = status;

  const timetables = await Timetable.find(query)
    .populate('department', 'name code')
    .populate('generatedBy', 'name email')
    .populate('approvedBy', 'name email')
    .sort({ createdAt: -1 });

  return timetables.map(tt => ({
    id: tt._id,
    title: tt.title,
    department: tt.department?.name,
    semester: tt.semester,
    academicYear: tt.academicYear,
    status: tt.status,
    generatedBy: tt.generatedBy?.name,
    approvedBy: tt.approvedBy?.name,
    totalDays: tt.schedule.length,
    totalSlots: tt.schedule.reduce((total, day) => total + day.slots.length, 0),
    fitnessScore: tt.optimizationMetrics?.fitnessScore || 0,
    createdAt: tt.createdAt
  }));
};

const exportAttendanceData = async (filters) => {
  const { startDate, endDate, status, department } = filters;
  
  const query = {};
  if (status) query.status = status;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const attendance = await Attendance.find(query)
    .populate('faculty', 'name email department')
    .populate('subject', 'name code')
    .populate('classroom', 'roomNumber')
    .sort({ date: -1 });

  return attendance.map(record => ({
    id: record._id,
    date: record.date,
    faculty: record.faculty?.name,
    facultyEmail: record.faculty?.email,
    department: record.faculty?.department,
    subject: record.subject?.name,
    subjectCode: record.subject?.code,
    classroom: record.classroom?.roomNumber,
    status: record.status,
    approvalStatus: record.approvalStatus,
    notes: record.notes || 'N/A'
  }));
};

const exportDepartmentsData = async (filters) => {
  const departments = await Department.find(filters)
    .populate('headOfDepartment', 'name email')
    .sort({ name: 1 });

  return departments.map(dept => ({
    id: dept._id,
    name: dept.name,
    code: dept.code,
    description: dept.description || 'N/A',
    headOfDepartment: dept.headOfDepartment?.name || 'N/A',
    facultyCount: dept.facultyCount,
    studentCount: dept.studentCount,
    subjectCount: dept.subjectCount,
    workingDays: dept.workingDays?.join(', ') || 'N/A',
    createdAt: dept.createdAt
  }));
};

const exportClassroomsData = async (filters) => {
  const { department, isActive = true } = filters;
  
  const query = { isActive };
  if (department) query.department = department;

  const classrooms = await Classroom.find(query)
    .populate('department', 'name code')
    .sort({ roomNumber: 1 });

  return classrooms.map(room => ({
    id: room._id,
    name: room.name,
    roomNumber: room.roomNumber,
    capacity: room.capacity,
    department: room.department?.name,
    building: room.building,
    floor: room.floor,
    facilities: room.facilities?.join(', ') || 'N/A',
    equipment: room.equipment?.join(', ') || 'N/A',
    isActive: room.isActive
  }));
};

const exportSubjectsData = async (filters) => {
  const { department, semester, type } = filters;
  
  const query = {};
  if (department) query.department = department;
  if (semester) query.semester = semester;
  if (type) query.type = type;

  const subjects = await Subject.find(query)
    .populate('department', 'name code')
    .populate('facultyAssigned', 'name email')
    .sort({ semester: 1, name: 1 });

  return subjects.map(subject => ({
    id: subject._id,
    name: subject.name,
    code: subject.code,
    credits: subject.credits,
    department: subject.department?.name,
    semester: subject.semester,
    type: subject.type,
    facultyAssigned: subject.facultyAssigned?.map(f => f.name).join(', ') || 'N/A',
    teachingHours: subject.teachingHours || 'N/A',
    maxStudents: subject.maxStudents || 'N/A',
    createdAt: subject.createdAt
  }));
};

// CSV Export Helper
const exportAsCSV = (res, data, filename, exportType) => {
  if (!data || data.length === 0) {
    return res.status(404).json({ success: false, msg: "No data to export" });
  }

  const headers = Object.keys(data[0]).join(',');
  const csvData = data.map(row => 
    Object.values(row).map(value => 
      `"${String(value || '').replace(/"/g, '""')}"`
    ).join(',')
  ).join('\n');

  const csv = `${headers}\n${csvData}`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
  res.send(csv);
};

// Excel Export Helper (you'll need to install exceljs package for this)
const exportAsExcel = async (res, data, filename, exportType) => {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(exportType);

    // Add headers
    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        key: key,
        width: 15
      }));

      // Add data
      worksheet.addRows(data);

      // Style headers
      worksheet.getRow(1).font = { bold: true };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    throw new Error(`Excel export failed: ${error.message}`);
  }
};
export const deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;

    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ success: false, msg: "Timetable not found" });
    }

    await Timetable.findByIdAndDelete(id);

    await OptimizationLog.deleteMany({ timetable: id });

    res.status(200).json({
      success: true,
      msg: "Timetable deleted successfully"
    });
  } catch (error) {
    console.error("Delete timetable error:", error);
    res.status(500).json({ success: false, msg: "Server error during timetable deletion" });
  }
};

// Helper functions for timetable optimization
const findAvailableSlot = (day, timeSlots, facultyWorkload, classroomUsage, subject, faculty, classrooms) => {
  // Simplified algorithm - in production, use more sophisticated AI
  for (let slot of timeSlots) {
    // Find faculty who can teach this subject
    const availableFaculty = faculty.filter(f => 
      f.subjectsAssigned?.includes(subject._id) && 
      facultyWorkload[f._id] < (f.maxWeeklyHours || 40)
    );

    // Find available classroom
    const availableClassroom = classrooms.find(c => 
      !classroomUsage[c._id]?.includes(`${day}-${slot.slot}`) &&
      c.capacity >= (subject.maxStudents || 60)
    );

    if (availableFaculty.length > 0 && availableClassroom) {
      // Select faculty with least workload
      const selectedFaculty = availableFaculty.reduce((prev, curr) => 
        facultyWorkload[prev._id] < facultyWorkload[curr._id] ? prev : curr
      );

      return {
        timeSlot: slot.slot,
        order: slot.order,
        facultyId: selectedFaculty._id,
        classroomId: availableClassroom._id
      };
    }
  }
  return null;
};

const calculateFitnessScore = (schedule, facultyWorkload, classroomUsage) => {
  // Simplified fitness calculation
  let score = 100;

  // Penalize for uneven faculty workload
  const workloads = Object.values(facultyWorkload);
  const avgWorkload = workloads.reduce((a, b) => a + b, 0) / workloads.length;
  const workloadVariance = Math.sqrt(
    workloads.reduce((a, b) => a + Math.pow(b - avgWorkload, 2), 0) / workloads.length
  );
  score -= workloadVariance * 2;

  return Math.max(0, Math.min(100, score));
};

export const approveTimetable = async (req, res) => {
  try {
    const { timetableId } = req.params;

    const timetable = await Timetable.findByIdAndUpdate(
      timetableId,
      { 
        status: 'approved',
        approvedBy: req.user.id,
        'changeLog.changes': 'Timetable approved by admin',
        'changeLog.changedBy': req.user.id
      },
      { new: true }
    );

    if (!timetable) {
      return res.status(404).json({ success: false, msg: "Timetable not found" });
    }

    res.json({
      success: true,
      msg: "Timetable approved successfully",
      data: timetable
    });
  } catch (error) {
    console.error("Approve timetable error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getReports = async (req, res) => {
  try {
    const { reportType } = req.params;

    let reportData = {};

    switch (reportType) {
      case 'attendance':
        reportData = await generateAttendanceReport();
        break;
      case 'utilization':
        reportData = await generateUtilizationReport();
        break;
      case 'performance':
        reportData = await generatePerformanceReport();
        break;
      default:
        reportData = await generateComprehensiveReport();
    }

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

// Report generation helper functions
const generateAttendanceReport = async () => {
  const attendanceStats = await Attendance.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  const facultyAttendance = await Attendance.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "faculty",
        foreignField: "_id",
        as: "faculty"
      }
    },
    { $unwind: "$faculty" },
    {
      $group: {
        _id: "$faculty._id",
        name: { $first: "$faculty.name" },
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } }
      }
    },
    {
      $project: {
        name: 1,
        attendanceRate: { $multiply: [{ $divide: ["$present", "$total"] }, 100] }
      }
    }
  ]);

  return { attendanceStats, facultyAttendance };
};

// Department Management Controllers

/**
 * Create new department
 */
export const createDepartment = async (req, res) => {
  try {
    const { name, code, description, headOfDepartment } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Department name and code are required"
      });
    }

    // Check if department already exists
    const existingDepartment = await Department.findOne({
      $or: [{ name }, { code }]
    });

    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: "Department with this name or code already exists"
      });
    }

    const department = new Department({
      name,
      code,
      description,
      headOfDepartment: headOfDepartment || null
    });

    await department.save();

    // If headOfDepartment is assigned, update the user's role
    if (headOfDepartment) {
      await User.findByIdAndUpdate(headOfDepartment, {
        department: department._id,
        role: 'hod'
      });
    }

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department
    });

  } catch (error) {
    console.error("Create department error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get all departments
 */
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("headOfDepartment", "name email")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error("Get departments error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update department
 */
export const updateDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { name, code, description, headOfDepartment } = req.body;

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    // Check if another department already uses the name or code
    if (name || code) {
      const existingDepartment = await Department.findOne({
        $and: [
          { _id: { $ne: departmentId } },
          { $or: [{ name: name || department.name }, { code: code || department.code }] }
        ]
      });

      if (existingDepartment) {
        return res.status(400).json({
          success: false,
          message: "Another department with this name or code already exists"
        });
      }
    }

    // Update department
    const updatedDepartment = await Department.findByIdAndUpdate(
      departmentId,
      {
        ...(name && { name }),
        ...(code && { code }),
        ...(description && { description }),
        ...(headOfDepartment !== undefined && { headOfDepartment })
      },
      { new: true }
    ).populate("headOfDepartment", "name email");

    // Update HOD role if changed
    if (headOfDepartment !== undefined) {
      // Remove HOD role from previous head
      if (department.headOfDepartment) {
        await User.findByIdAndUpdate(department.headOfDepartment, {
          role: 'faculty'
        });
      }

      // Assign HOD role to new head
      if (headOfDepartment) {
        await User.findByIdAndUpdate(headOfDepartment, {
          department: departmentId,
          role: 'hod'
        });
      }
    }

    res.json({
      success: true,
      message: "Department updated successfully",
      data: updatedDepartment
    });

  } catch (error) {
    console.error("Update department error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Delete department
 */
export const deleteDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    // Check if department has users
    const userCount = await User.countDocuments({ department: departmentId });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete department with assigned users"
      });
    }

    // Check if department has subjects
    const subjectCount = await Subject.countDocuments({ department: departmentId });
    if (subjectCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete department with assigned subjects"
      });
    }

    await Department.findByIdAndDelete(departmentId);

    res.json({
      success: true,
      message: "Department deleted successfully"
    });

  } catch (error) {
    console.error("Delete department error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Add bcrypt import at the top of your file
import bcrypt from 'bcryptjs';

// Report generation helper functions (add these if missing)
const generateUtilizationReport = async () => {
  const classroomUtilization = await Timetable.aggregate([
    { $unwind: "$schedule" },
    { $unwind: "$schedule.slots" },
    {
      $group: {
        _id: "$schedule.slots.classroom",
        totalSlots: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "classrooms",
        localField: "_id",
        foreignField: "_id",
        as: "classroom"
      }
    },
    { $unwind: "$classroom" },
    {
      $project: {
        roomNumber: "$classroom.roomNumber",
        capacity: "$classroom.capacity",
        totalSlots: 1,
        utilizationRate: { $multiply: [{ $divide: ["$totalSlots", 40] }, 100] }
      }
    }
  ]);

  return { classroomUtilization };
};

const generatePerformanceReport = async () => {
  const facultyPerformance = await Attendance.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "faculty",
        foreignField: "_id",
        as: "faculty"
      }
    },
    { $unwind: "$faculty" },
    {
      $group: {
        _id: "$faculty._id",
        name: { $first: "$faculty.name" },
        department: { $first: "$faculty.department" },
        totalClasses: { $sum: 1 },
        presentCount: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        leaveCount: { $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] } }
      }
    },
    {
      $lookup: {
        from: "departments",
        localField: "department",
        foreignField: "_id",
        as: "department"
      }
    },
    { $unwind: "$department" },
    {
      $project: {
        name: 1,
        department: "$department.name",
        totalClasses: 1,
        attendanceRate: { $multiply: [{ $divide: ["$presentCount", "$totalClasses"] }, 100] },
        leavePercentage: { $multiply: [{ $divide: ["$leaveCount", "$totalClasses"] }, 100] }
      }
    }
  ]);

  return { facultyPerformance };
};

const generateComprehensiveReport = async () => {
  const [attendanceReport, utilizationReport, performanceReport] = await Promise.all([
    generateAttendanceReport(),
    generateUtilizationReport(),
    generatePerformanceReport()
  ]);

  return {
    ...attendanceReport,
    ...utilizationReport,
    ...performanceReport,
    generatedAt: new Date()
  };
};
export const getOptimizationLogs = async (req, res) => {
  try {
    const { 
      department, 
      algorithmUsed, 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (department) filter.department = department;
    if (algorithmUsed) filter.algorithmUsed = algorithmUsed;
    if (status) filter.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Sort configuration
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const logs = await OptimizationLog.find(filter)
      .populate('department', 'name code')
      .populate('generatedBy', 'name email')
      .populate('timetable', 'title academicYear')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await OptimizationLog.countDocuments(filter);

    // Calculate performance metrics
    const performanceMetrics = await OptimizationLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          averageFitnessScore: { $avg: "$performance.fitnessScore" },
          averageExecutionTime: { $avg: "$performance.executionTime" },
          successCount: { 
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } 
          },
          failedCount: { 
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } 
          },
          algorithms: { $addToSet: "$algorithmUsed" }
        }
      }
    ]);

    // Algorithm performance comparison
    const algorithmPerformance = await OptimizationLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$algorithmUsed",
          count: { $sum: 1 },
          avgFitnessScore: { $avg: "$performance.fitnessScore" },
          avgExecutionTime: { $avg: "$performance.executionTime" },
          successRate: {
            $avg: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          algorithm: "$_id",
          count: 1,
          avgFitnessScore: { $round: ["$avgFitnessScore", 2] },
          avgExecutionTime: { $round: ["$avgExecutionTime", 2] },
          successRate: { $multiply: [{ $round: ["$successRate", 4] }, 100] },
          _id: 0
        }
      }
    ]);

    // Recent optimization trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTrends = await OptimizationLog.aggregate([
      {
        $match: {
          ...filter,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          dailyCount: { $sum: 1 },
          avgFitness: { $avg: "$performance.fitnessScore" }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalLogs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        analytics: {
          summary: performanceMetrics[0] || {
            totalLogs: 0,
            averageFitnessScore: 0,
            averageExecutionTime: 0,
            successCount: 0,
            failedCount: 0,
            algorithms: []
          },
          algorithmPerformance,
          recentTrends
        }
      }
    });

  } catch (error) {
    console.error("Get optimization logs error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching optimization logs",
      error: error.message 
    });
  }
};

export const getOptimizationLogDetails = async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await OptimizationLog.findById(logId)
      .populate('department', 'name code')
      .populate('generatedBy', 'name email')
      .populate('timetable')
      .populate({
        path: 'timetable',
        populate: {
          path: 'department',
          select: 'name code'
        }
      });

    if (!log) {
      return res.status(404).json({
        success: false,
        msg: "Optimization log not found"
      });
    }

    // Get similar logs for comparison
    const similarLogs = await OptimizationLog.find({
      department: log.department,
      _id: { $ne: logId }
    })
      .populate('department', 'name code')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        log,
        similarLogs
      }
    });

  } catch (error) {
    console.error("Get optimization log details error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching log details" 
    });
  }
};

export const deleteOptimizationLog = async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await OptimizationLog.findById(logId);
    if (!log) {
      return res.status(404).json({
        success: false,
        msg: "Optimization log not found"
      });
    }

    await OptimizationLog.findByIdAndDelete(logId);

    res.json({
      success: true,
      msg: "Optimization log deleted successfully"
    });

  } catch (error) {
    console.error("Delete optimization log error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while deleting optimization log" 
    });
  }
};

export const getOptimizationStats = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    // Calculate date range based on timeframe
    const startDate = new Date();
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const stats = await OptimizationLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOptimizations: { $sum: 1 },
          successfulOptimizations: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] }
          },
          averageFitnessScore: { $avg: "$performance.fitnessScore" },
          averageExecutionTime: { $avg: "$performance.executionTime" },
          bestFitnessScore: { $max: "$performance.fitnessScore" },
          worstFitnessScore: { $min: "$performance.fitnessScore" },
          departmentsCount: { $addToSet: "$department" },
          algorithmsUsed: { $addToSet: "$algorithmUsed" }
        }
      },
      {
        $project: {
          totalOptimizations: 1,
          successRate: {
            $multiply: [
              { $divide: ["$successfulOptimizations", "$totalOptimizations"] },
              100
            ]
          },
          averageFitnessScore: { $round: ["$averageFitnessScore", 2] },
          averageExecutionTime: { $round: ["$averageExecutionTime", 2] },
          bestFitnessScore: 1,
          worstFitnessScore: 1,
          departmentsCount: { $size: "$departmentsCount" },
          algorithmsUsed: { $size: "$algorithmsUsed" }
        }
      }
    ]);

    // Weekly/Monthly trends
    const groupFormat = timeframe === '7d' ? '%Y-%m-%d' : '%Y-%m-%U';

    const trends = await OptimizationLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: "$createdAt"
            }
          },
          count: { $sum: 1 },
          avgFitness: { $avg: "$performance.fitnessScore" },
          successCount: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          period: "$_id",
          count: 1,
          avgFitness: { $round: ["$avgFitness", 2] },
          successRate: {
            $multiply: [
              { $divide: ["$successCount", "$count"] },
              100
            ]
          }
        }
      },
      { $sort: { period: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: stats[0] || {
          totalOptimizations: 0,
          successRate: 0,
          averageFitnessScore: 0,
          averageExecutionTime: 0
        },
        trends,
        timeframe
      }
    });

  } catch (error) {
    console.error("Get optimization stats error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching optimization stats" 
    });
  }
};
export const getSubjects = async (req, res) => {
  try {
    const { 
      department, 
      semester, 
      type, 
      facultyAssigned,
      page = 1, 
      limit = 10,
      search 
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (type) filter.type = type;
    if (facultyAssigned) filter.facultyAssigned = facultyAssigned;

    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const subjects = await Subject.find(filter)
      .populate('department', 'name code')
      .populate('facultyAssigned', 'name email designation')
      .sort({ semester: 1, name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Subject.countDocuments(filter);

    // Get subject statistics
    const subjectStats = await Subject.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalSubjects: { $sum: 1 },
          totalCredits: { $sum: "$credits" },
          bySemester: {
            $push: {
              semester: "$semester",
              credits: "$credits"
            }
          },
          byType: {
            $push: "$type"
          }
        }
      },
      {
        $project: {
          totalSubjects: 1,
          totalCredits: 1,
          semesterDistribution: {
            $arrayToObject: {
              $map: {
                input: "$bySemester",
                as: "item",
                in: {
                  k: { $toString: "$$item.semester" },
                  v: {
                    count: { $sum: 1 },
                    totalCredits: { $sum: "$$item.credits" }
                  }
                }
              }
            }
          },
          typeDistribution: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ["$byType", []] },
                as: "type",
                in: {
                  k: "$$type",
                  v: {
                    $size: {
                      $filter: {
                        input: "$byType",
                        as: "t",
                        cond: { $eq: ["$$t", "$$type"] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    // Faculty workload analysis for subjects
    const facultyWorkload = await Subject.aggregate([
      { $match: filter },
      { $unwind: "$facultyAssigned" },
      {
        $group: {
          _id: "$facultyAssigned",
          subjectCount: { $sum: 1 },
          totalCredits: { $sum: "$credits" },
          subjects: { $push: { name: "$name", code: "$code", credits: "$credits" } }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "faculty"
        }
      },
      { $unwind: "$faculty" },
      {
        $project: {
          facultyName: "$faculty.name",
          facultyEmail: "$faculty.email",
          facultyDesignation: "$faculty.designation",
          subjectCount: 1,
          totalCredits: 1,
          subjects: 1
        }
      },
      { $sort: { subjectCount: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        subjects,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalSubjects: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        statistics: subjectStats[0] || {
          totalSubjects: 0,
          totalCredits: 0,
          semesterDistribution: {},
          typeDistribution: {}
        },
        facultyWorkload
      }
    });

  } catch (error) {
    console.error("Get subjects error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching subjects",
      error: error.message 
    });
  }
};

export const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id)
      .populate('department', 'name code')
      .populate('facultyAssigned', 'name email designation');

    if (!subject) {
      return res.status(404).json({
        success: false,
        msg: "Subject not found"
      });
    }

    // Get related subjects (same department and semester)
    const relatedSubjects = await Subject.find({
      department: subject.department,
      semester: subject.semester,
      _id: { $ne: id }
    })
      .populate('facultyAssigned', 'name email')
      .limit(5);

    // Get timetable slots for this subject
    const timetableSlots = await Timetable.aggregate([
      { $unwind: "$schedule" },
      { $unwind: "$schedule.slots" },
      {
        $match: {
          "schedule.slots.subject": subject._id,
          department: subject.department
        }
      },
      {
        $project: {
          day: "$schedule.day",
          timeSlot: "$schedule.slots.timeSlot",
          classroom: "$schedule.slots.classroom",
          faculty: "$schedule.slots.faculty",
          timetableTitle: "$title",
          academicYear: "$academicYear"
        }
      },
      {
        $lookup: {
          from: "classrooms",
          localField: "classroom",
          foreignField: "_id",
          as: "classroom"
        }
      },
      { $unwind: "$classroom" },
      {
        $lookup: {
          from: "users",
          localField: "faculty",
          foreignField: "_id",
          as: "faculty"
        }
      },
      { $unwind: "$faculty" }
    ]);

    res.json({
      success: true,
      data: {
        subject,
        relatedSubjects,
        timetableSlots,
        slotCount: timetableSlots.length
      }
    });

  } catch (error) {
    console.error("Get subject by ID error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching subject details" 
    });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, credits, type, facultyAssigned, teachingHours, maxStudents } = req.body;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        msg: "Subject not found"
      });
    }

    // Check if code is being changed and if it already exists
    if (code && code !== subject.code) {
      const existingSubject = await Subject.findOne({ code });
      if (existingSubject) {
        return res.status(400).json({
          success: false,
          msg: "Subject with this code already exists"
        });
      }
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(code && { code }),
        ...(credits && { credits }),
        ...(type && { type }),
        ...(facultyAssigned && { facultyAssigned }),
        ...(teachingHours && { teachingHours }),
        ...(maxStudents && { maxStudents })
      },
      { new: true, runValidators: true }
    )
      .populate('department', 'name code')
      .populate('facultyAssigned', 'name email');

    res.json({
      success: true,
      msg: "Subject updated successfully",
      data: updatedSubject
    });

  } catch (error) {
    console.error("Update subject error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: "Validation error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ 
      success: false, 
      msg: "Server error while updating subject" 
    });
  }
};

export const assignFacultyToSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyIds } = req.body; // Array of faculty IDs

    if (!facultyIds || !Array.isArray(facultyIds)) {
      return res.status(400).json({
        success: false,
        msg: "Faculty IDs array is required"
      });
    }

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        msg: "Subject not found"
      });
    }

    // Verify all faculty exist and belong to the same department
    const faculty = await User.find({
      _id: { $in: facultyIds },
      role: 'faculty',
      department: subject.department
    });

    if (faculty.length !== facultyIds.length) {
      return res.status(400).json({
        success: false,
        msg: "One or more faculty members not found or don't belong to the subject's department"
      });
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { facultyAssigned: facultyIds },
      { new: true }
    )
      .populate('department', 'name code')
      .populate('facultyAssigned', 'name email designation');

    res.json({
      success: true,
      msg: "Faculty assigned to subject successfully",
      data: updatedSubject
    });

  } catch (error) {
    console.error("Assign faculty to subject error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while assigning faculty" 
    });
  }
};
import SystemSetting from "../models/SystemSetting.js";

export const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.findOne().sort({ createdAt: -1 });
    
    // Default system settings if none exist
    const defaultSettings = {
      timetable: {
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        minBreakBetweenClasses: 1,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        timeSlots: [
          { slot: "9:00-10:00", order: 1 },
          { slot: "10:00-11:00", order: 2 },
          { slot: "11:00-12:00", order: 3 },
          { slot: "14:00-15:00", order: 4 },
          { slot: "15:00-16:00", order: 5 }
        ]
      },
      attendance: {
        autoApproveLeaves: false,
        maxLeavesPerMonth: 2,
        notificationBeforeClass: 15, // minutes
        allowLateMarking: true,
        lateThreshold: 10 // minutes
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        scheduleChanges: true,
        leaveApprovals: true,
        systemUpdates: true
      },
      academic: {
        currentAcademicYear: "2024-2025",
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        gradingSystem: "percentage",
        passPercentage: 40,
        maxBacklogsAllowed: 4
      },
      system: {
        maintenanceMode: false,
        autoBackup: true,
        backupFrequency: "daily",
        dataRetentionPeriod: 365, // days
        sessionTimeout: 30 // minutes
      }
    };

    const systemSettings = settings || new SystemSetting(defaultSettings);
    
    if (!settings) {
      await systemSettings.save();
    }

    res.json({
      success: true,
      data: systemSettings
    });

  } catch (error) {
    console.error("Get system settings error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching system settings",
      error: error.message 
    });
  }
};

export const updateSystemSettings = async (req, res) => {
  try {
    const { timetable, attendance, notifications, academic, system } = req.body;

    let existingSettings = await SystemSetting.findOne().sort({ createdAt: -1 });

    if (!existingSettings) {
      // Create new settings if none exist
      existingSettings = new SystemSetting({
        timetable: timetable || {},
        attendance: attendance || {},
        notifications: notifications || {},
        academic: academic || {},
        system: system || {}
      });
    } else {
      // Update existing settings
      if (timetable) existingSettings.timetable = { ...existingSettings.timetable, ...timetable };
      if (attendance) existingSettings.attendance = { ...existingSettings.attendance, ...attendance };
      if (notifications) existingSettings.notifications = { ...existingSettings.notifications, ...notifications };
      if (academic) existingSettings.academic = { ...existingSettings.academic, ...academic };
      if (system) existingSettings.system = { ...existingSettings.system, ...system };
      
      existingSettings.updatedBy = req.user.id;
      existingSettings.updatedAt = new Date();
    }

    await existingSettings.save();

    // Log settings change
    await SystemSetting.findByIdAndUpdate(existingSettings._id, {
      $push: {
        changeLog: {
          changedBy: req.user.id,
          changes: "System settings updated",
          timestamp: new Date()
        }
      }
    });

    res.json({
      success: true,
      msg: "System settings updated successfully",
      data: existingSettings
    });

  } catch (error) {
    console.error("Update system settings error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: "Validation error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ 
      success: false, 
      msg: "Server error while updating system settings" 
    });
  }
};

export const resetSystemSettings = async (req, res) => {
  try {
    const { section } = req.body; // Optional: reset specific section

    let existingSettings = await SystemSetting.findOne().sort({ createdAt: -1 });

    const defaultSettings = {
      timetable: {
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        minBreakBetweenClasses: 1,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        timeSlots: [
          { slot: "9:00-10:00", order: 1 },
          { slot: "10:00-11:00", order: 2 },
          { slot: "11:00-12:00", order: 3 },
          { slot: "14:00-15:00", order: 4 },
          { slot: "15:00-16:00", order: 5 }
        ]
      },
      attendance: {
        autoApproveLeaves: false,
        maxLeavesPerMonth: 2,
        notificationBeforeClass: 15,
        allowLateMarking: true,
        lateThreshold: 10
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        scheduleChanges: true,
        leaveApprovals: true,
        systemUpdates: true
      },
      academic: {
        currentAcademicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        gradingSystem: "percentage",
        passPercentage: 40,
        maxBacklogsAllowed: 4
      },
      system: {
        maintenanceMode: false,
        autoBackup: true,
        backupFrequency: "daily",
        dataRetentionPeriod: 365,
        sessionTimeout: 30
      }
    };

    if (!existingSettings) {
      existingSettings = new SystemSetting(defaultSettings);
    } else if (section) {
      // Reset specific section
      if (defaultSettings[section]) {
        existingSettings[section] = defaultSettings[section];
      }
    } else {
      // Reset all settings
      existingSettings.timetable = defaultSettings.timetable;
      existingSettings.attendance = defaultSettings.attendance;
      existingSettings.notifications = defaultSettings.notifications;
      existingSettings.academic = defaultSettings.academic;
      existingSettings.system = defaultSettings.system;
    }

    existingSettings.updatedBy = req.user.id;
    existingSettings.updatedAt = new Date();

    await existingSettings.save();

    res.json({
      success: true,
      msg: section ? `${section} settings reset to default` : "All system settings reset to default",
      data: existingSettings
    });

  } catch (error) {
    console.error("Reset system settings error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while resetting system settings" 
    });
  }
};

export const getSystemHealth = async (req, res) => {
  try {
    // Database health check
    const dbStatus = await checkDatabaseHealth();
    
    // Storage health check
    const storageStatus = await checkStorageHealth();
    
    // Performance metrics
    const performanceMetrics = await getPerformanceMetrics();
    
    // Recent errors
    const recentErrors = await getRecentSystemErrors();

    const systemHealth = {
      status: 'healthy',
      timestamp: new Date(),
      components: {
        database: dbStatus,
        storage: storageStatus,
        api: performanceMetrics.api,
        authentication: performanceMetrics.auth
      },
      metrics: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        activeConnections: performanceMetrics.activeConnections
      },
      issues: recentErrors.length > 0 ? recentErrors : null
    };

    // Overall status determination
    if (dbStatus.status === 'error' || storageStatus.status === 'error') {
      systemHealth.status = 'unhealthy';
    } else if (dbStatus.status === 'warning' || storageStatus.status === 'warning') {
      systemHealth.status = 'degraded';
    }

    res.json({
      success: true,
      data: systemHealth
    });

  } catch (error) {
    console.error("Get system health error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while checking system health" 
    });
  }
};

export const getSystemLogs = async (req, res) => {
  try {
    const { 
      level, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50,
      search 
    } = req.query;

    const filter = {};
    
    if (level) filter.level = level;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { message: { $regex: search, $options: 'i' } },
        { 'meta.userId': { $regex: search, $options: 'i' } }
      ];
    }

    // In a real application, you'd query from a SystemLog model
    // For now, return mock data or implement with your logging system
    const logs = []; // await SystemLog.find(filter).sort({ timestamp: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = 0; // await SystemLog.countDocuments(filter);

    const logStats = await SystemLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalLogs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        statistics: {
          byLevel: logStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    console.error("Get system logs error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching system logs" 
    });
  }
};

// Helper functions for system health
const checkDatabaseHealth = async () => {
  try {
    // Test database connection
    const result = await Department.findOne().select('_id').lean();
    return {
      status: 'healthy',
      responseTime: 'fast', // You can measure actual response time
      connected: true,
      lastCheck: new Date()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      connected: false,
      lastCheck: new Date()
    };
  }
};

const checkStorageHealth = async () => {
  try {
    // Check storage availability (simplified)
    const fs = require('fs');
    const path = require('path');
    
    const testDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, 'healthcheck.txt');
    fs.writeFileSync(testFile, 'health check');
    fs.unlinkSync(testFile);
    
    return {
      status: 'healthy',
      writable: true,
      availableSpace: 'adequate', // You can check actual disk space
      lastCheck: new Date()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      writable: false,
      lastCheck: new Date()
    };
  }
};

const getPerformanceMetrics = () => {
  // Simplified performance metrics
  return {
    api: {
      status: 'healthy',
      averageResponseTime: '120ms',
      requestsPerMinute: 45
    },
    auth: {
      status: 'healthy',
      activeSessions: 23,
      tokenValidityRate: 99.8
    },
    activeConnections: 15
  };
};

const getRecentSystemErrors = () => {
  // This would query your error logging system
  return [];
};
export const getTimetableById = async (req, res) => {
  try {
    const { id } = req.params;

    const timetable = await Timetable.findById(id)
      .populate('department', 'name code')
      .populate('generatedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('schedule.slots.subject', 'name code credits')
      .populate('schedule.slots.faculty', 'name email designation')
      .populate('schedule.slots.classroom', 'roomNumber capacity building');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    // Calculate timetable statistics
    const timetableStats = {
      totalDays: timetable.schedule.length,
      totalSlots: timetable.schedule.reduce((total, day) => total + day.slots.length, 0),
      facultyCount: new Set(timetable.schedule.flatMap(day => 
        day.slots.map(slot => slot.faculty?._id)
      )).size - 1, // Subtract 1 for null values
      classroomCount: new Set(timetable.schedule.flatMap(day => 
        day.slots.map(slot => slot.classroom?._id)
      )).size - 1,
      subjectCount: new Set(timetable.schedule.flatMap(day => 
        day.slots.map(slot => slot.subject?._id)
      )).size - 1
    };

    // Group slots by faculty for workload analysis
    const facultyWorkload = {};
    timetable.schedule.forEach(day => {
      day.slots.forEach(slot => {
        if (slot.faculty) {
          const facultyId = slot.faculty._id.toString();
          if (!facultyWorkload[facultyId]) {
            facultyWorkload[facultyId] = {
              faculty: slot.faculty,
              totalSlots: 0,
              days: new Set(),
              subjects: new Set()
            };
          }
          facultyWorkload[facultyId].totalSlots++;
          facultyWorkload[facultyId].days.add(day.day);
          if (slot.subject) {
            facultyWorkload[facultyId].subjects.add(slot.subject.name);
          }
        }
      });
    });

    // Convert to array format
    const facultyWorkloadArray = Object.values(facultyWorkload).map(workload => ({
      faculty: workload.faculty,
      totalSlots: workload.totalSlots,
      daysWorking: workload.days.size,
      subjectsTeaching: Array.from(workload.subjects)
    }));

    res.json({
      success: true,
      data: {
        timetable,
        statistics: timetableStats,
        facultyWorkload: facultyWorkloadArray,
        optimizationMetrics: timetable.optimizationMetrics || {}
      }
    });

  } catch (error) {
    console.error("Get timetable by ID error:", error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        msg: "Invalid timetable ID format"
      });
    }
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching timetable details" 
    });
  }
};

export const getAllTimetables = async (req, res) => {
  try {
    const { 
      department, 
      semester, 
      academicYear, 
      status,
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;
    if (status) filter.status = status;

    // Sort configuration
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const timetables = await Timetable.find(filter)
      .populate('department', 'name code')
      .populate('generatedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Timetable.countDocuments(filter);

    // Get timetable statistics
    const timetableStats = await Timetable.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTimetables: { $sum: 1 },
          approvedCount: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          draftCount: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
          averageFitnessScore: { $avg: "$optimizationMetrics.fitnessScore" },
          departments: { $addToSet: "$department" }
        }
      },
      {
        $project: {
          totalTimetables: 1,
          approvedCount: 1,
          pendingCount: 1,
          draftCount: 1,
          approvalRate: {
            $multiply: [
              { $divide: ["$approvedCount", "$totalTimetables"] },
              100
            ]
          },
          averageFitnessScore: { $round: ["$averageFitnessScore", 2] },
          departmentCount: { $size: "$departments" }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        timetables,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTimetables: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        statistics: timetableStats[0] || {
          totalTimetables: 0,
          approvedCount: 0,
          pendingCount: 0,
          draftCount: 0,
          approvalRate: 0,
          averageFitnessScore: 0,
          departmentCount: 0
        }
      }
    });

  } catch (error) {
    console.error("Get all timetables error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching timetables" 
    });
  }
};

export const updateTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status, schedule, constraints } = req.body;

    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (status) updateData.status = status;
    if (schedule) updateData.schedule = schedule;
    if (constraints) updateData.constraints = constraints;

    // If status is being changed to approved, set approvedBy
    if (status === 'approved') {
      updateData.approvedBy = req.user.id;
      updateData.approvedAt = new Date();
    }

    const updatedTimetable = await Timetable.findByIdAndUpdate(
      id,
      {
        ...updateData,
        $push: {
          changeLog: {
            changedBy: req.user.id,
            changes: `Timetable ${status ? `status changed to ${status}` : 'updated'}`,
            timestamp: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate('department', 'name code')
      .populate('generatedBy', 'name email')
      .populate('approvedBy', 'name email');

    res.json({
      success: true,
      msg: "Timetable updated successfully",
      data: updatedTimetable
    });

  } catch (error) {
    console.error("Update timetable error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: "Validation error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ 
      success: false, 
      msg: "Server error while updating timetable" 
    });
  }
};

export const getTimetableByDepartment = async (req, res) => {
  try {
    const { departmentId, semester } = req.params;
    const { academicYear } = req.query;

    const filter = { 
      department: departmentId,
      status: 'approved' // Only get approved timetables
    };
    
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    const timetable = await Timetable.findOne(filter)
      .populate('department', 'name code')
      .populate('schedule.slots.subject', 'name code credits')
      .populate('schedule.slots.faculty', 'name email designation')
      .populate('schedule.slots.classroom', 'roomNumber capacity building')
      .sort({ createdAt: -1 }); // Get the most recent one

    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "No approved timetable found for the specified criteria"
      });
    }

    // Format timetable for easier consumption
    const formattedTimetable = {
      _id: timetable._id,
      title: timetable.title,
      department: timetable.department,
      semester: timetable.semester,
      academicYear: timetable.academicYear,
      schedule: timetable.schedule.map(day => ({
        day: day.day,
        slots: day.slots.map(slot => ({
          timeSlot: slot.timeSlot,
          slotOrder: slot.slotOrder,
          subject: slot.subject,
          faculty: slot.faculty,
          classroom: slot.classroom,
          type: slot.type
        })).sort((a, b) => a.slotOrder - b.slotOrder)
      })).sort((a, b) => {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      })
    };

    res.json({
      success: true,
      data: formattedTimetable
    });

  } catch (error) {
    console.error("Get timetable by department error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching department timetable" 
    });
  }
};

export const cloneTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const { academicYear, semester, title } = req.body;

    const originalTimetable = await Timetable.findById(id);
    if (!originalTimetable) {
      return res.status(404).json({
        success: false,
        msg: "Original timetable not found"
      });
    }

    // Create a new timetable based on the original
    const newTimetable = new Timetable({
      title: title || `${originalTimetable.title} (Copy)`,
      department: originalTimetable.department,
      semester: semester || originalTimetable.semester,
      academicYear: academicYear || originalTimetable.academicYear,
      schedule: originalTimetable.schedule,
      generatedBy: req.user.id,
      status: 'draft',
      constraints: originalTimetable.constraints,
      optimizationMetrics: {
        ...originalTimetable.optimizationMetrics,
        clonedFrom: originalTimetable._id
      },
      validity: {
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      }
    });

    await newTimetable.save();

    res.status(201).json({
      success: true,
      msg: "Timetable cloned successfully",
      data: newTimetable
    });

  } catch (error) {
    console.error("Clone timetable error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while cloning timetable" 
    });
  }
};

export const getTimetableConflicts = async (req, res) => {
  try {
    const { id } = req.params;

    const timetable = await Timetable.findById(id)
      .populate('schedule.slots.faculty', 'name email')
      .populate('schedule.slots.classroom', 'roomNumber')
      .populate('schedule.slots.subject', 'name code');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    const conflicts = {
      facultyConflicts: [],
      classroomConflicts: [],
      timeSlotConflicts: []
    };

    // Check for faculty conflicts (same faculty in multiple places at same time)
    const facultySchedule = {};
    timetable.schedule.forEach(day => {
      day.slots.forEach(slot => {
        if (slot.faculty) {
          const key = `${day.day}-${slot.timeSlot}`;
          if (!facultySchedule[key]) {
            facultySchedule[key] = [];
          }
          facultySchedule[key].push({
            faculty: slot.faculty,
            subject: slot.subject,
            classroom: slot.classroom
          });
        }
      });
    });

    // Find faculty conflicts
    Object.entries(facultySchedule).forEach(([timeslot, assignments]) => {
      if (assignments.length > 1) {
        const facultyIds = assignments.map(a => a.faculty._id.toString());
        const uniqueFacultyIds = [...new Set(facultyIds)];
        
        if (facultyIds.length !== uniqueFacultyIds.length) {
          // There's a conflict - same faculty assigned multiple times
          conflicts.facultyConflicts.push({
            timeslot,
            assignments,
            conflictType: 'faculty_double_booking'
          });
        }
      }
    });

    // Check for classroom conflicts
    const classroomSchedule = {};
    timetable.schedule.forEach(day => {
      day.slots.forEach(slot => {
        if (slot.classroom) {
          const key = `${day.day}-${slot.timeSlot}`;
          if (!classroomSchedule[key]) {
            classroomSchedule[key] = [];
          }
          classroomSchedule[key].push({
            classroom: slot.classroom,
            subject: slot.subject,
            faculty: slot.faculty
          });
        }
      });
    });

    // Find classroom conflicts
    Object.entries(classroomSchedule).forEach(([timeslot, assignments]) => {
      if (assignments.length > 1) {
        conflicts.classroomConflicts.push({
          timeslot,
          assignments,
          conflictType: 'classroom_double_booking'
        });
      }
    });

    res.json({
      success: true,
      data: {
        timetableId: id,
        conflicts,
        summary: {
          totalConflicts: conflicts.facultyConflicts.length + conflicts.classroomConflicts.length,
          facultyConflicts: conflicts.facultyConflicts.length,
          classroomConflicts: conflicts.classroomConflicts.length
        }
      }
    });

  } catch (error) {
    console.error("Get timetable conflicts error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while checking timetable conflicts" 
    });
  }
};
export const getTimetableVersions = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Find the original timetable
    const originalTimetable = await Timetable.findById(timetableId);
    if (!originalTimetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    // Find all versions of this timetable (including clones and previous versions)
    const versions = await Timetable.find({
      $or: [
        { _id: timetableId }, // The original
        { 'optimizationMetrics.clonedFrom': timetableId }, // Direct clones
        { 'changeLog.originalTimetable': timetableId } // Version history
      ]
    })
      .populate('department', 'name code')
      .populate('generatedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Timetable.countDocuments({
      $or: [
        { _id: timetableId },
        { 'optimizationMetrics.clonedFrom': timetableId },
        { 'changeLog.originalTimetable': timetableId }
      ]
    });

    // Calculate version statistics
    const versionStats = {
      totalVersions: total,
      approvedVersions: versions.filter(v => v.status === 'approved').length,
      draftVersions: versions.filter(v => v.status === 'draft').length,
      currentVersion: versions[0]?._id.toString(), // Most recent
      originalVersion: timetableId
    };

    // Version comparison data
    const versionComparison = versions.map(version => ({
      _id: version._id,
      title: version.title,
      version: version.optimizationMetrics?.version || '1.0',
      status: version.status,
      createdAt: version.createdAt,
      fitnessScore: version.optimizationMetrics?.fitnessScore || 0,
      changes: version.changeLog?.length || 0,
      isCurrent: version._id.toString() === versions[0]?._id.toString(),
      isOriginal: version._id.toString() === timetableId
    }));

    res.json({
      success: true,
      data: {
        versions,
        versionComparison,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalVersions: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        statistics: versionStats
      }
    });

  } catch (error) {
    console.error("Get timetable versions error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching timetable versions" 
    });
  }
};

export const createTimetableVersion = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const { versionName, description, changes } = req.body;

    const originalTimetable = await Timetable.findById(timetableId);
    if (!originalTimetable) {
      return res.status(404).json({
        success: false,
        msg: "Original timetable not found"
      });
    }

    // Calculate next version number
    const existingVersions = await Timetable.find({
      'optimizationMetrics.clonedFrom': timetableId
    }).sort({ 'optimizationMetrics.version': -1 });

    const latestVersion = existingVersions[0]?.optimizationMetrics?.version || '1.0';
    const nextVersion = incrementVersion(latestVersion);

    // Create new version
    const newVersion = new Timetable({
      title: versionName || `${originalTimetable.title} - v${nextVersion}`,
      department: originalTimetable.department,
      semester: originalTimetable.semester,
      academicYear: originalTimetable.academicYear,
      schedule: originalTimetable.schedule,
      generatedBy: req.user.id,
      status: 'draft',
      constraints: originalTimetable.constraints,
      optimizationMetrics: {
        ...originalTimetable.optimizationMetrics,
        clonedFrom: timetableId,
        version: nextVersion,
        parentVersion: latestVersion
      },
      changeLog: [{
        changedBy: req.user.id,
        changes: description || `New version created from v${latestVersion}`,
        timestamp: new Date(),
        originalTimetable: timetableId
      }],
      validity: originalTimetable.validity
    });

    // Apply specific changes if provided
    if (changes && Array.isArray(changes)) {
      changes.forEach(change => {
        applyChangeToTimetable(newVersion, change);
      });
    }

    await newVersion.save();

    // Update original timetable's version history
    await Timetable.findByIdAndUpdate(timetableId, {
      $push: {
        changeLog: {
          changedBy: req.user.id,
          changes: `New version v${nextVersion} created`,
          timestamp: new Date(),
          versionCreated: newVersion._id
        }
      }
    });

    res.status(201).json({
      success: true,
      msg: "Timetable version created successfully",
      data: newVersion,
      version: nextVersion
    });

  } catch (error) {
    console.error("Create timetable version error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while creating timetable version" 
    });
  }
};

export const restoreTimetableVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const { makeCurrent = true } = req.body;

    const versionTimetable = await Timetable.findById(versionId);
    if (!versionTimetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable version not found"
      });
    }

    const originalTimetableId = versionTimetable.optimizationMetrics?.clonedFrom;
    if (!originalTimetableId) {
      return res.status(400).json({
        success: false,
        msg: "This is not a versioned timetable"
      });
    }

    if (makeCurrent) {
      // Make this version the current one by updating the original
      const originalTimetable = await Timetable.findById(originalTimetableId);
      
      const updatedTimetable = await Timetable.findByIdAndUpdate(
        originalTimetableId,
        {
          schedule: versionTimetable.schedule,
          constraints: versionTimetable.constraints,
          status: 'draft', // Reset to draft when restoring
          $push: {
            changeLog: {
              changedBy: req.user.id,
              changes: `Restored from version v${versionTimetable.optimizationMetrics?.version}`,
              timestamp: new Date(),
              restoredFrom: versionId
            }
          }
        },
        { new: true }
      );

      res.json({
        success: true,
        msg: "Timetable version restored as current",
        data: updatedTimetable
      });
    } else {
      // Just create a new copy from this version
      const newVersion = await createVersionFromVersion(versionTimetable, req.user.id);
      
      res.json({
        success: true,
        msg: "New timetable created from version",
        data: newVersion
      });
    }

  } catch (error) {
    console.error("Restore timetable version error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while restoring timetable version" 
    });
  }
};

export const compareTimetableVersions = async (req, res) => {
  try {
    const { version1Id, version2Id } = req.params;

    const [version1, version2] = await Promise.all([
      Timetable.findById(version1Id)
        .populate('schedule.slots.subject', 'name code')
        .populate('schedule.slots.faculty', 'name email')
        .populate('schedule.slots.classroom', 'roomNumber'),
      Timetable.findById(version2Id)
        .populate('schedule.slots.subject', 'name code')
        .populate('schedule.slots.faculty', 'name email')
        .populate('schedule.slots.classroom', 'roomNumber')
    ]);

    if (!version1 || !version2) {
      return res.status(404).json({
        success: false,
        msg: "One or both timetable versions not found"
      });
    }

    const differences = findTimetableDifferences(version1, version2);

    res.json({
      success: true,
      data: {
        version1: {
          _id: version1._id,
          title: version1.title,
          version: version1.optimizationMetrics?.version,
          createdAt: version1.createdAt
        },
        version2: {
          _id: version2._id,
          title: version2.title,
          version: version2.optimizationMetrics?.version,
          createdAt: version2.createdAt
        },
        differences,
        summary: {
          totalDifferences: differences.added.length + differences.removed.length + differences.modified.length,
          added: differences.added.length,
          removed: differences.removed.length,
          modified: differences.modified.length
        }
      }
    });

  } catch (error) {
    console.error("Compare timetable versions error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while comparing timetable versions" 
    });
  }
};

export const getTimetableVersionHistory = async (req, res) => {
  try {
    const { timetableId } = req.params;

    const timetable = await Timetable.findById(timetableId);
    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    // Get all change logs with version information
    const versionHistory = await Timetable.aggregate([
      {
        $match: {
          $or: [
            { _id: timetableId },
            { 'optimizationMetrics.clonedFrom': timetableId }
          ]
        }
      },
      { $unwind: { path: "$changeLog", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          version: "$optimizationMetrics.version",
          title: "$title",
          status: "$status",
          changeLog: 1,
          createdAt: 1
        }
      },
      { $sort: { "changeLog.timestamp": -1 } },
      { $limit: 50 }
    ]);

    // Format the history
    const formattedHistory = versionHistory
      .filter(item => item.changeLog) // Remove items without change logs
      .map(item => ({
        version: item.version || '1.0',
        title: item.title,
        status: item.status,
        change: item.changeLog.changes,
        changedBy: item.changeLog.changedBy,
        timestamp: item.changeLog.timestamp,
        type: item.changeLog.versionCreated ? 'version_created' : 'modification'
      }));

    res.json({
      success: true,
      data: {
        timetable: {
          _id: timetableId,
          title: timetable.title,
          currentVersion: timetable.optimizationMetrics?.version || '1.0'
        },
        history: formattedHistory,
        totalChanges: formattedHistory.length
      }
    });

  } catch (error) {
    console.error("Get timetable version history error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching version history" 
    });
  }
};

// Helper functions for version control
const incrementVersion = (currentVersion) => {
  const parts = currentVersion.split('.');
  const minor = parseInt(parts[1]) + 1;
  return `${parts[0]}.${minor}`;
};

const applyChangeToTimetable = (timetable, change) => {
  const { type, day, timeSlot, action, data } = change;

  switch (type) {
    case 'slot_add':
      // Add a new slot
      const daySchedule = timetable.schedule.find(s => s.day === day);
      if (daySchedule) {
        daySchedule.slots.push({
          timeSlot,
          slotOrder: data.slotOrder,
          subject: data.subject,
          faculty: data.faculty,
          classroom: data.classroom,
          type: data.type || 'regular'
        });
      }
      break;

    case 'slot_remove':
      // Remove a slot
      timetable.schedule.forEach(daySchedule => {
        if (daySchedule.day === day) {
          daySchedule.slots = daySchedule.slots.filter(
            slot => slot.timeSlot !== timeSlot
          );
        }
      });
      break;

    case 'slot_modify':
      // Modify an existing slot
      timetable.schedule.forEach(daySchedule => {
        if (daySchedule.day === day) {
          const slot = daySchedule.slots.find(s => s.timeSlot === timeSlot);
          if (slot) {
            Object.assign(slot, data);
          }
        }
      });
      break;

    default:
      break;
  }
};

const createVersionFromVersion = async (versionTimetable, userId) => {
  const nextVersion = incrementVersion(versionTimetable.optimizationMetrics?.version || '1.0');

  const newVersion = new Timetable({
    title: `${versionTimetable.title} - v${nextVersion}`,
    department: versionTimetable.department,
    semester: versionTimetable.semester,
    academicYear: versionTimetable.academicYear,
    schedule: versionTimetable.schedule,
    generatedBy: userId,
    status: 'draft',
    constraints: versionTimetable.constraints,
    optimizationMetrics: {
      ...versionTimetable.optimizationMetrics,
      clonedFrom: versionTimetable.optimizationMetrics?.clonedFrom,
      version: nextVersion,
      parentVersion: versionTimetable.optimizationMetrics?.version
    },
    changeLog: [{
      changedBy: userId,
      changes: `Created from version v${versionTimetable.optimizationMetrics?.version}`,
      timestamp: new Date()
    }]
  });

  await newVersion.save();
  return newVersion;
};

const findTimetableDifferences = (version1, version2) => {
  const differences = {
    added: [],
    removed: [],
    modified: []
  };

  // Compare schedules
  const slots1 = flattenSchedule(version1.schedule);
  const slots2 = flattenSchedule(version2.schedule);

  // Find added slots
  differences.added = slots2.filter(slot2 =>
    !slots1.some(slot1 => areSlotsEqual(slot1, slot2))
  );

  // Find removed slots
  differences.removed = slots1.filter(slot1 =>
    !slots2.some(slot2 => areSlotsEqual(slot1, slot2))
  );

  // Find modified slots (same time but different content)
  differences.modified = slots1.filter(slot1 => {
    const matchingSlot = slots2.find(slot2 => 
      slot1.day === slot2.day && slot1.timeSlot === slot2.timeSlot
    );
    return matchingSlot && !areSlotsEqual(slot1, matchingSlot);
  }).map(slot1 => ({
    from: slot1,
    to: slots2.find(slot2 => 
      slot1.day === slot2.day && slot1.timeSlot === slot2.timeSlot
    )
  }));

  return differences;
};

const flattenSchedule = (schedule) => {
  const flattened = [];
  schedule.forEach(day => {
    day.slots.forEach(slot => {
      flattened.push({
        day: day.day,
        ...slot
      });
    });
  });
  return flattened;
};

const areSlotsEqual = (slot1, slot2) => {
  return (
    slot1.day === slot2.day &&
    slot1.timeSlot === slot2.timeSlot &&
    slot1.subject?.toString() === slot2.subject?.toString() &&
    slot1.faculty?.toString() === slot2.faculty?.toString() &&
    slot1.classroom?.toString() === slot2.classroom?.toString()
  );
};
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password')
      .populate('department', 'name code')
      .populate('subjectsAssigned', 'name code');

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    // Get additional user-specific data based on role
    let additionalData = {};
    
    if (user.role === 'faculty') {
      // Faculty-specific data
      additionalData = await getFacultyData(user._id);
    } else if (user.role === 'student') {
      // Student-specific data
      additionalData = await getStudentData(user._id);
    } else if (user.role === 'hod') {
      // HOD-specific data
      additionalData = await getHODData(user._id);
    }

    res.json({
      success: true,
      data: {
        user,
        ...additionalData
      }
    });

  } catch (error) {
    console.error("Get user by ID error:", error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        msg: "Invalid user ID format"
      });
    }
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching user details" 
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      department, 
      designation, 
      specialization, 
      semester, 
      isActive,
      role,
      subjectsAssigned 
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          msg: "User with this email already exists"
        });
      }
    }

    // Handle role changes
    if (role && role !== user.role) {
      await handleRoleChange(user, role, department);
    }

    const updateData = {
      ...(name && { name }),
      ...(email && { email }),
      ...(department && { department }),
      ...(designation && { designation }),
      ...(specialization && { specialization }),
      ...(semester && { semester }),
      ...(isActive !== undefined && { isActive }),
      ...(role && { role }),
      ...(subjectsAssigned && { subjectsAssigned })
    };

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password')
     .populate('department', 'name code')
     .populate('subjectsAssigned', 'name code');

    res.json({
      success: true,
      msg: "User updated successfully",
      data: updatedUser
    });

  } catch (error) {
    console.error("Update user error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: "Validation error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ 
      success: false, 
      msg: "Server error while updating user" 
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    // Check if user can be deleted (no active dependencies)
    const canDelete = await checkUserDependencies(user);
    if (!canDelete.canDelete) {
      return res.status(400).json({
        success: false,
        msg: "Cannot delete user",
        reasons: canDelete.reasons
      });
    }

    // Soft delete - set isActive to false
    const deletedUser = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).select('-password');

    // Update department counts
    if (user.department) {
      await updateDepartmentCounts(user.department, user.role, -1);
    }

    res.json({
      success: true,
      msg: "User deleted successfully",
      data: deletedUser
    });

  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while deleting user" 
    });
  }
};

export const getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const user = await User.findById(id).select('name email role');
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    // Get user activity based on role
    let activityData = {};
    
    switch (user.role) {
      case 'faculty':
        activityData = await getFacultyActivity(id, startDate, endDate);
        break;
      case 'student':
        activityData = await getStudentActivity(id, startDate, endDate);
        break;
      case 'hod':
        activityData = await getHodActivity(id, startDate, endDate);
        break;
      case 'admin':
        activityData = await getAdminActivity(id, startDate, endDate);
        break;
    }

    res.json({
      success: true,
      data: {
        user,
        activity: activityData
      }
    });

  } catch (error) {
    console.error("Get user activity error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching user activity" 
    });
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 6 characters long"
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(id, { password: hashedPassword });

    // Log the password reset activity
    await Notification.create({
      user: id,
      title: "Password Reset",
      message: "Your password has been reset by administrator",
      type: "security",
      priority: "high"
    });

    res.json({
      success: true,
      msg: "Password reset successfully"
    });

  } catch (error) {
    console.error("Reset user password error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while resetting password" 
    });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('name email role department');
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    let stats = {};

    switch (user.role) {
      case 'faculty':
        stats = await getFacultyStats(id);
        break;
      case 'student':
        stats = await getStudentStats(id);
        break;
      case 'hod':
        stats = await getHodStats(id, user.department);
        break;
    }

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        stats
      }
    });

  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching user statistics" 
    });
  }
};

// Helper functions
const getFacultyData = async (facultyId) => {
  const [timetableSlots, attendance, subjects] = await Promise.all([
    // Timetable slots assigned to faculty
    Timetable.aggregate([
      { $unwind: "$schedule" },
      { $unwind: "$schedule.slots" },
      { $match: { "schedule.slots.faculty": facultyId } },
      {
        $group: {
          _id: null,
          totalSlots: { $sum: 1 },
          departments: { $addToSet: "$department" },
          subjects: { $addToSet: "$schedule.slots.subject" }
        }
      }
    ]),
    
    // Attendance records
    Attendance.find({ faculty: facultyId })
      .populate('subject', 'name code')
      .sort({ date: -1 })
      .limit(10),
    
    // Subjects assigned
    Subject.find({ facultyAssigned: facultyId })
      .populate('department', 'name code')
  ]);

  return {
    timetableStats: timetableSlots[0] || { totalSlots: 0, departments: [], subjects: [] },
    recentAttendance: attendance,
    assignedSubjects: subjects
  };
};

const getStudentData = async (studentId) => {
  const [attendance, timetable] = await Promise.all([
    // Student attendance
    Attendance.aggregate([
      { $match: { student: studentId } },
      {
        $group: {
          _id: "$subject",
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "subjects",
          localField: "_id",
          foreignField: "_id",
          as: "subject"
        }
      },
      { $unwind: "$subject" }
    ]),
    
    // Student timetable
    Timetable.findOne({
      department: (await User.findById(studentId)).department,
      status: 'approved'
    })
  ]);

  return {
    attendanceSummary: attendance,
    timetable: timetable
  };
};

const getHODData = async (hodId) => {
  const department = await Department.findOne({ headOfDepartment: hodId });
  
  if (!department) {
    return { department: null };
  }

  const [facultyCount, studentCount, timetableCount] = await Promise.all([
    User.countDocuments({ department: department._id, role: 'faculty', isActive: true }),
    User.countDocuments({ department: department._id, role: 'student', isActive: true }),
    Timetable.countDocuments({ department: department._id })
  ]);

  return {
    department: {
      ...department.toObject(),
      facultyCount,
      studentCount,
      timetableCount
    }
  };
};

const handleRoleChange = async (user, newRole, newDepartment) => {
  // If changing from HOD, remove HOD from department
  if (user.role === 'hod') {
    await Department.findOneAndUpdate(
      { headOfDepartment: user._id },
      { $unset: { headOfDepartment: 1 } }
    );
  }

  // If changing to HOD, assign to department
  if (newRole === 'hod' && newDepartment) {
    await Department.findByIdAndUpdate(newDepartment, {
      headOfDepartment: user._id
    });
  }

  // Update department counts if department changed
  if (newDepartment && newDepartment.toString() !== user.department?.toString()) {
    // Decrement old department
    if (user.department) {
      await updateDepartmentCounts(user.department, user.role, -1);
    }
    // Increment new department
    await updateDepartmentCounts(newDepartment, newRole, 1);
  }
};

const checkUserDependencies = async (user) => {
  const reasons = [];

  // Check if faculty is assigned to any subjects
  if (user.role === 'faculty') {
    const subjectCount = await Subject.countDocuments({ facultyAssigned: user._id });
    if (subjectCount > 0) {
      reasons.push(`User is assigned to ${subjectCount} subjects`);
    }
  }

  // Check if user has any timetable assignments
  const timetableCount = await Timetable.countDocuments({
    "schedule.slots.faculty": user._id
  });
  if (timetableCount > 0) {
    reasons.push(`User has ${timetableCount} timetable assignments`);
  }

  // Check if HOD is assigned to a department
  if (user.role === 'hod') {
    const department = await Department.findOne({ headOfDepartment: user._id });
    if (department) {
      reasons.push(`User is HOD of ${department.name}`);
    }
  }

  return {
    canDelete: reasons.length === 0,
    reasons
  };
};

const updateDepartmentCounts = async (departmentId, role, increment) => {
  const updateField = role === 'faculty' ? 'facultyCount' : 
                     role === 'student' ? 'studentCount' : null;

  if (updateField) {
    await Department.findByIdAndUpdate(departmentId, {
      $inc: { [updateField]: increment }
    });
  }
};

// Activity tracking helpers
const getFacultyActivity = async (facultyId, startDate, endDate) => {
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.date = {};
    if (startDate) dateFilter.date.$gte = new Date(startDate);
    if (endDate) dateFilter.date.$lte = new Date(endDate);
  }

  const [attendance, timetableUpdates] = await Promise.all([
    Attendance.find({ faculty: facultyId, ...dateFilter })
      .populate('subject', 'name code')
      .sort({ date: -1 }),
    
    Timetable.find({
      "changeLog.changedBy": facultyId,
      ...(startDate || endDate ? {
        "changeLog.timestamp": {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) })
        }
      } : {})
    })
  ]);

  return { attendance, timetableUpdates };
};

const getStudentActivity = async (studentId, startDate, endDate) => {
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.date = {};
    if (startDate) dateFilter.date.$gte = new Date(startDate);
    if (endDate) dateFilter.date.$lte = new Date(endDate);
  }

  const attendance = await Attendance.find({ student: studentId, ...dateFilter })
    .populate('subject', 'name code')
    .populate('faculty', 'name')
    .sort({ date: -1 });

  return { attendance };
};

const getFacultyStats = async (facultyId) => {
  const [attendanceStats, workloadStats] = await Promise.all([
    Attendance.aggregate([
      { $match: { faculty: facultyId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]),
    
    Timetable.aggregate([
      { $unwind: "$schedule" },
      { $unwind: "$schedule.slots" },
      { $match: { "schedule.slots.faculty": facultyId } },
      {
        $group: {
          _id: null,
          totalHours: { $sum: 1 },
          subjectsCount: { $addToSet: "$schedule.slots.subject" },
          departmentsCount: { $addToSet: "$department" }
        }
      }
    ])
  ]);

  return {
    attendance: attendanceStats,
    workload: workloadStats[0] || { totalHours: 0, subjectsCount: [], departmentsCount: [] }
  };
};
export const manageTimetableConstraints = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const { hardConstraints, softConstraints, optimizationPreferences } = req.body;

    const timetable = await Timetable.findById(timetableId);
    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    // Validate constraints
    const validationResult = validateConstraints(hardConstraints, softConstraints);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        msg: "Invalid constraints",
        errors: validationResult.errors
      });
    }

    const updatedTimetable = await Timetable.findByIdAndUpdate(
      timetableId,
      {
        constraints: {
          hardConstraints: hardConstraints || timetable.constraints?.hardConstraints || [],
          softConstraints: softConstraints || timetable.constraints?.softConstraints || [],
          optimizationPreferences: optimizationPreferences || timetable.constraints?.optimizationPreferences || {}
        },
        $push: {
          changeLog: {
            changedBy: req.user.id,
            changes: "Timetable constraints updated",
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      msg: "Timetable constraints updated successfully",
      data: {
        timetable: updatedTimetable,
        constraints: updatedTimetable.constraints
      }
    });

  } catch (error) {
    console.error("Manage timetable constraints error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while managing timetable constraints" 
    });
  }
};

export const getDefaultConstraints = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        msg: "Department not found"
      });
    }

    // Get department-specific default constraints
    const defaultConstraints = await getDepartmentDefaultConstraints(departmentId);

    res.json({
      success: true,
      data: {
        department: {
          _id: department._id,
          name: department.name,
          code: department.code
        },
        defaultConstraints
      }
    });

  } catch (error) {
    console.error("Get default constraints error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching default constraints" 
    });
  }
};

export const createConstraintTemplate = async (req, res) => {
  try {
    const { name, description, department, constraints, isGlobal } = req.body;

    // Check if template name already exists
    const existingTemplate = await ConstraintTemplate.findOne({ name, department });
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        msg: "Constraint template with this name already exists for the department"
      });
    }

    const template = new ConstraintTemplate({
      name,
      description,
      department: isGlobal ? null : department,
      isGlobal,
      constraints: {
        hardConstraints: constraints.hardConstraints || [],
        softConstraints: constraints.softConstraints || [],
        optimizationPreferences: constraints.optimizationPreferences || {}
      },
      createdBy: req.user.id
    });

    await template.save();

    res.status(201).json({
      success: true,
      msg: "Constraint template created successfully",
      data: template
    });

  } catch (error) {
    console.error("Create constraint template error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: "Validation error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ 
      success: false, 
      msg: "Server error while creating constraint template" 
    });
  }
};

export const getConstraintTemplates = async (req, res) => {
  try {
    const { department, isGlobal, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (isGlobal !== undefined) filter.isGlobal = isGlobal === 'true';

    const templates = await ConstraintTemplate.find(filter)
      .populate('department', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ConstraintTemplate.countDocuments(filter);

    // Get template usage statistics
    const templateStats = await Promise.all(
      templates.map(async (template) => {
        const usageCount = await Timetable.countDocuments({
          'constraints.templateId': template._id
        });
        return {
          templateId: template._id,
          usageCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        templates,
        templateStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTemplates: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Get constraint templates error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching constraint templates" 
    });
  }
};

export const applyConstraintTemplate = async (req, res) => {
  try {
    const { timetableId, templateId } = req.params;

    const [timetable, template] = await Promise.all([
      Timetable.findById(timetableId),
      ConstraintTemplate.findById(templateId)
    ]);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        msg: "Constraint template not found"
      });
    }

    // Check if template is applicable to the timetable's department
    if (!template.isGlobal && template.department?.toString() !== timetable.department.toString()) {
      return res.status(400).json({
        success: false,
        msg: "This constraint template is not applicable to the timetable's department"
      });
    }

    const updatedTimetable = await Timetable.findByIdAndUpdate(
      timetableId,
      {
        constraints: {
          ...template.constraints,
          templateId: template._id,
          templateName: template.name,
          appliedAt: new Date()
        },
        $push: {
          changeLog: {
            changedBy: req.user.id,
            changes: `Applied constraint template: ${template.name}`,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    // Update template usage count
    await ConstraintTemplate.findByIdAndUpdate(templateId, {
      $inc: { usageCount: 1 },
      lastUsedAt: new Date()
    });

    res.json({
      success: true,
      msg: "Constraint template applied successfully",
      data: {
        timetable: updatedTimetable,
        template: {
          _id: template._id,
          name: template.name,
          description: template.description
        }
      }
    });

  } catch (error) {
    console.error("Apply constraint template error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while applying constraint template" 
    });
  }
};

export const analyzeConstraints = async (req, res) => {
  try {
    const { timetableId } = req.params;

    const timetable = await Timetable.findById(timetableId)
      .populate('department', 'name code')
      .populate('schedule.slots.faculty', 'name email')
      .populate('schedule.slots.classroom', 'roomNumber capacity');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    const analysis = await performConstraintAnalysis(timetable);

    res.json({
      success: true,
      data: {
        timetable: {
          _id: timetable._id,
          title: timetable.title,
          department: timetable.department
        },
        analysis,
        recommendations: generateOptimizationRecommendations(analysis)
      }
    });

  } catch (error) {
    console.error("Analyze constraints error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while analyzing constraints" 
    });
  }
};

export const getConstraintViolations = async (req, res) => {
  try {
    const { timetableId } = req.params;

    const timetable = await Timetable.findById(timetableId)
      .populate('schedule.slots.faculty', 'name email')
      .populate('schedule.slots.classroom', 'roomNumber capacity')
      .populate('schedule.slots.subject', 'name code');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    const violations = await detectConstraintViolations(timetable);

    res.json({
      success: true,
      data: {
        timetable: {
          _id: timetable._id,
          title: timetable.title
        },
        violations,
        summary: {
          totalViolations: violations.hardViolations.length + violations.softViolations.length,
          hardViolations: violations.hardViolations.length,
          softViolations: violations.softViolations.length,
          severity: violations.hardViolations.length > 0 ? 'high' : 
                   violations.softViolations.length > 0 ? 'medium' : 'none'
        }
      }
    });

  } catch (error) {
    console.error("Get constraint violations error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while detecting constraint violations" 
    });
  }
};

// Helper functions
const validateConstraints = (hardConstraints, softConstraints) => {
  const errors = [];
  const validConstraintTypes = [
    'faculty_availability',
    'classroom_availability',
    'subject_prerequisites',
    'time_preferences',
    'max_daily_hours',
    'min_break_between_classes',
    'consecutive_classes',
    'room_capacity',
    'equipment_requirements'
  ];

  // Validate hard constraints
  if (hardConstraints && Array.isArray(hardConstraints)) {
    hardConstraints.forEach((constraint, index) => {
      if (!validConstraintTypes.includes(constraint.type)) {
        errors.push(`Hard constraint ${index}: Invalid constraint type '${constraint.type}'`);
      }
      if (!constraint.condition) {
        errors.push(`Hard constraint ${index}: Condition is required`);
      }
    });
  }

  // Validate soft constraints
  if (softConstraints && Array.isArray(softConstraints)) {
    softConstraints.forEach((constraint, index) => {
      if (!validConstraintTypes.includes(constraint.type)) {
        errors.push(`Soft constraint ${index}: Invalid constraint type '${constraint.type}'`);
      }
      if (constraint.weight === undefined || constraint.weight < 0 || constraint.weight > 1) {
        errors.push(`Soft constraint ${index}: Weight must be between 0 and 1`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const getDepartmentDefaultConstraints = async (departmentId) => {
  // Default constraints based on department characteristics
  const department = await Department.findById(departmentId);
  
  const baseConstraints = {
    hardConstraints: [
      {
        type: 'faculty_availability',
        condition: 'faculty must be available during assigned time',
        description: 'Faculty cannot be assigned to multiple classes simultaneously'
      },
      {
        type: 'classroom_availability',
        condition: 'classroom must be available during assigned time',
        description: 'Classroom cannot be double-booked'
      },
      {
        type: 'room_capacity',
        condition: 'classroom capacity must accommodate expected students',
        description: 'Room capacity constraint'
      }
    ],
    softConstraints: [
      {
        type: 'time_preferences',
        condition: 'prefer morning classes for theory subjects',
        weight: 0.7,
        description: 'Time preference constraint'
      },
      {
        type: 'consecutive_classes',
        condition: 'avoid more than 3 consecutive classes for faculty',
        weight: 0.8,
        description: 'Faculty workload distribution'
      },
      {
        type: 'min_break_between_classes',
        condition: 'minimum 1-hour break between classes in different buildings',
        weight: 0.6,
        description: 'Travel time consideration'
      }
    ],
    optimizationPreferences: {
      priority: 'balanced', // balanced, faculty_preference, room_utilization
      algorithm: 'genetic',
      maxIterations: 1000,
      populationSize: 50
    }
  };

  // Department-specific adjustments
  if (department?.specialRequirements) {
    baseConstraints.hardConstraints.push({
      type: 'equipment_requirements',
      condition: 'specialized equipment requirements must be met',
      description: department.specialRequirements
    });
  }

  return baseConstraints;
};

const performConstraintAnalysis = (timetable) => {
  const analysis = {
    feasibility: 'high',
    complexity: 'medium',
    resourceUtilization: {},
    constraintSatisfaction: {},
    potentialIssues: []
  };

  // Analyze faculty workload
  const facultyWorkload = {};
  timetable.schedule.forEach(day => {
    day.slots.forEach(slot => {
      if (slot.faculty) {
        const facultyId = slot.faculty._id.toString();
        facultyWorkload[facultyId] = (facultyWorkload[facultyId] || 0) + 1;
      }
    });
  });

  analysis.resourceUtilization.faculty = {
    totalFaculty: Object.keys(facultyWorkload).length,
    averageLoad: Object.values(facultyWorkload).reduce((a, b) => a + b, 0) / Object.keys(facultyWorkload).length,
    maxLoad: Math.max(...Object.values(facultyWorkload)),
    minLoad: Math.min(...Object.values(facultyWorkload))
  };

  // Analyze classroom utilization
  const classroomUsage = {};
  timetable.schedule.forEach(day => {
    day.slots.forEach(slot => {
      if (slot.classroom) {
        const classroomId = slot.classroom._id.toString();
        classroomUsage[classroomId] = (classroomUsage[classroomId] || 0) + 1;
      }
    });
  });

  analysis.resourceUtilization.classrooms = {
    totalClassrooms: Object.keys(classroomUsage).length,
    utilizationRate: (Object.values(classroomUsage).reduce((a, b) => a + b, 0) / (Object.keys(classroomUsage).length * 40)) * 100
  };

  return analysis;
};

const detectConstraintViolations = (timetable) => {
  const violations = {
    hardViolations: [],
    softViolations: []
  };

  const constraints = timetable.constraints || {};
  const schedule = timetable.schedule;

  // Check for faculty double-booking (hard constraint)
  const facultySchedule = {};
  schedule.forEach(day => {
    day.slots.forEach(slot => {
      if (slot.faculty) {
        const key = `${day.day}-${slot.timeSlot}`;
        if (!facultySchedule[key]) {
          facultySchedule[key] = [];
        }
        facultySchedule[key].push(slot);
      }
    });
  });

  // Detect faculty conflicts
  Object.entries(facultySchedule).forEach(([timeslot, slots]) => {
    const facultyIds = slots.map(s => s.faculty._id.toString());
    const uniqueFacultyIds = [...new Set(facultyIds)];
    
    if (facultyIds.length !== uniqueFacultyIds.length) {
      violations.hardViolations.push({
        type: 'faculty_double_booking',
        timeslot,
        description: 'Faculty assigned to multiple classes simultaneously',
        severity: 'high',
        slots: slots.map(s => ({
          faculty: s.faculty.name,
          subject: s.subject?.name,
          classroom: s.classroom?.roomNumber
        }))
      });
    }
  });

  // Check classroom capacity (hard constraint)
  schedule.forEach(day => {
    day.slots.forEach(slot => {
      if (slot.classroom && slot.subject) {
        const expectedStudents = slot.subject.maxStudents || 60;
        const classroomCapacity = slot.classroom.capacity;
        
        if (expectedStudents > classroomCapacity) {
          violations.hardViolations.push({
            type: 'room_capacity_exceeded',
            timeslot: `${day.day} ${slot.timeSlot}`,
            description: `Classroom capacity exceeded: ${expectedStudents} students > ${classroomCapacity} capacity`,
            severity: 'high',
            classroom: slot.classroom.roomNumber,
            subject: slot.subject.name,
            expectedStudents,
            capacity: classroomCapacity
          });
        }
      }
    });
  });

  // Check soft constraints
  if (constraints.softConstraints) {
    constraints.softConstraints.forEach(constraint => {
      const violation = checkSoftConstraint(constraint, timetable);
      if (violation) {
        violations.softViolations.push(violation);
      }
    });
  }

  return violations;
};

const checkSoftConstraint = (constraint, timetable) => {
  // Implement specific soft constraint checks
  switch (constraint.type) {
    case 'max_daily_hours':
      return checkMaxDailyHours(constraint, timetable);
    case 'consecutive_classes':
      return checkConsecutiveClasses(constraint, timetable);
    case 'time_preferences':
      return checkTimePreferences(constraint, timetable);
    default:
      return null;
  }
};

const generateOptimizationRecommendations = (analysis) => {
  const recommendations = [];

  if (analysis.resourceUtilization.faculty.maxLoad > 6) {
    recommendations.push({
      type: 'faculty_workload',
      priority: 'high',
      description: 'Consider redistributing faculty workload - some faculty have excessive teaching hours',
      suggestion: 'Add more faculty or adjust subject assignments'
    });
  }

  if (analysis.resourceUtilization.classrooms.utilizationRate < 60) {
    recommendations.push({
      type: 'room_utilization',
      priority: 'medium',
      description: 'Classroom utilization is low - consider consolidating classes',
      suggestion: 'Optimize room assignments to improve utilization'
    });
  }

  return recommendations;
};
export const publishTimetable = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const { publishDate, notificationMessage } = req.body;

    const timetable = await Timetable.findById(timetableId)
      .populate('department', 'name code')
      .populate('generatedBy', 'name email');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    // Check if timetable is approved
    if (timetable.status !== 'approved') {
      return res.status(400).json({
        success: false,
        msg: "Only approved timetables can be published"
      });
    }

    // Check for conflicts before publishing
    const conflicts = await detectPublishingConflicts(timetable);
    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "Cannot publish timetable due to conflicts",
        conflicts
      });
    }

    const publishData = {
      status: 'published',
      publishedBy: req.user.id,
      publishedAt: new Date(),
      publishDate: publishDate || new Date(),
      isActive: true
    };

    // If publishing a new timetable, deactivate old ones for the same department/semester
    if (timetable.status !== 'published') {
      await deactivatePreviousTimetables(timetable.department, timetable.semester);
    }

    const publishedTimetable = await Timetable.findByIdAndUpdate(
      timetableId,
      {
        ...publishData,
        $push: {
          changeLog: {
            changedBy: req.user.id,
            changes: `Timetable published${notificationMessage ? `: ${notificationMessage}` : ''}`,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    )
      .populate('department', 'name code')
      .populate('publishedBy', 'name email')
      .populate('generatedBy', 'name email');

    // Send notifications to relevant users
    await sendPublishNotifications(publishedTimetable, notificationMessage);

    // Create system log for publishing
    await SystemLog.create({
      action: 'timetable_published',
      performedBy: req.user.id,
      target: timetableId,
      description: `Timetable published for ${timetable.department.name} - Semester ${timetable.semester}`,
      metadata: {
        department: timetable.department._id,
        semester: timetable.semester,
        academicYear: timetable.academicYear
      }
    });

    res.json({
      success: true,
      msg: "Timetable published successfully",
      data: publishedTimetable
    });

  } catch (error) {
    console.error("Publish timetable error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while publishing timetable" 
    });
  }
};

export const unpublishTimetable = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const { reason } = req.body;

    const timetable = await Timetable.findById(timetableId)
      .populate('department', 'name code');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    if (timetable.status !== 'published') {
      return res.status(400).json({
        success: false,
        msg: "Only published timetables can be unpublished"
      });
    }

    const unpublishedTimetable = await Timetable.findByIdAndUpdate(
      timetableId,
      {
        status: 'approved',
        isActive: false,
        unpublishedAt: new Date(),
        unpublishedBy: req.user.id,
        unpublishedReason: reason,
        $push: {
          changeLog: {
            changedBy: req.user.id,
            changes: `Timetable unpublished${reason ? `: ${reason}` : ''}`,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    // Send unpublish notifications
    await sendUnpublishNotifications(unpublishedTimetable, reason);

    res.json({
      success: true,
      msg: "Timetable unpublished successfully",
      data: unpublishedTimetable
    });

  } catch (error) {
    console.error("Unpublish timetable error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while unpublishing timetable" 
    });
  }
};

export const getPublishedTimetables = async (req, res) => {
  try {
    const { 
      department, 
      semester, 
      academicYear,
      page = 1, 
      limit = 10 
    } = req.query;

    const filter = { 
      status: 'published',
      isActive: true 
    };
    
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    const timetables = await Timetable.find(filter)
      .populate('department', 'name code')
      .populate('publishedBy', 'name email')
      .populate('generatedBy', 'name email')
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Timetable.countDocuments(filter);

    // Get publishing statistics
    const publishStats = await Timetable.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            department: "$department",
            semester: "$semester"
          },
          count: { $sum: 1 },
          latestPublish: { $max: "$publishedAt" }
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id.department",
          foreignField: "_id",
          as: "department"
        }
      },
      { $unwind: "$department" }
    ]);

    res.json({
      success: true,
      data: {
        timetables,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTimetables: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        statistics: {
          totalPublished: total,
          byDepartmentSemester: publishStats
        }
      }
    });

  } catch (error) {
    console.error("Get published timetables error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching published timetables" 
    });
  }
};

export const getTimetablePublicationHistory = async (req, res) => {
  try {
    const { timetableId } = req.params;

    const timetable = await Timetable.findById(timetableId);
    if (!timetable) {
      return res.status(404).json({
        success: false,
        msg: "Timetable not found"
      });
    }

    // Get publication history from change logs
    const publicationHistory = await Timetable.aggregate([
      { $match: { _id: timetable._id } },
      { $unwind: "$changeLog" },
      {
        $match: {
          $or: [
            { "changeLog.changes": { $regex: /published/i } },
            { "changeLog.changes": { $regex: /unpublished/i } }
          ]
        }
      },
      {
        $project: {
          action: {
            $cond: [
              { $regexMatch: { input: "$changeLog.changes", regex: /published/i } },
              "published",
              "unpublished"
            ]
          },
          changedBy: "$changeLog.changedBy",
          timestamp: "$changeLog.timestamp",
          changes: "$changeLog.changes",
          reason: "$changeLog.reason"
        }
      },
      { $sort: { timestamp: -1 } }
    ]);

    // Populate user details
    const populatedHistory = await User.populate(publicationHistory, {
      path: 'changedBy',
      select: 'name email'
    });

    res.json({
      success: true,
      data: {
        timetable: {
          _id: timetable._id,
          title: timetable.title,
          department: timetable.department,
          semester: timetable.semester
        },
        publicationHistory: populatedHistory,
        currentStatus: timetable.status,
        isActive: timetable.isActive
      }
    });

  } catch (error) {
    console.error("Get timetable publication history error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching publication history" 
    });
  }
};

export const bulkPublishTimetables = async (req, res) => {
  try {
    const { timetableIds, publishDate, notificationMessage } = req.body;

    if (!timetableIds || !Array.isArray(timetableIds) || timetableIds.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Timetable IDs array is required"
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const timetableId of timetableIds) {
      try {
        const timetable = await Timetable.findById(timetableId)
          .populate('department', 'name code');

        if (!timetable) {
          results.failed.push({
            timetableId,
            error: "Timetable not found"
          });
          continue;
        }

        if (timetable.status !== 'approved') {
          results.failed.push({
            timetableId,
            error: "Timetable is not approved"
          });
          continue;
        }

        // Check conflicts
        const conflicts = await detectPublishingConflicts(timetable);
        if (conflicts.length > 0) {
          results.failed.push({
            timetableId,
            error: "Publishing conflicts detected",
            conflicts
          });
          continue;
        }

        // Deactivate previous timetables
        await deactivatePreviousTimetables(timetable.department, timetable.semester);

        const publishedTimetable = await Timetable.findByIdAndUpdate(
          timetableId,
          {
            status: 'published',
            publishedBy: req.user.id,
            publishedAt: new Date(),
            publishDate: publishDate || new Date(),
            isActive: true,
            $push: {
              changeLog: {
                changedBy: req.user.id,
                changes: `Timetable published via bulk operation`,
                timestamp: new Date()
              }
            }
          },
          { new: true }
        );

        await sendPublishNotifications(publishedTimetable, notificationMessage);

        results.successful.push({
          timetableId,
          timetable: {
            _id: publishedTimetable._id,
            title: publishedTimetable.title,
            department: publishedTimetable.department.name,
            semester: publishedTimetable.semester
          }
        });

      } catch (error) {
        results.failed.push({
          timetableId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      msg: `Bulk publish operation completed. Successful: ${results.successful.length}, Failed: ${results.failed.length}`,
      data: results
    });

  } catch (error) {
    console.error("Bulk publish timetables error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error during bulk publish operation" 
    });
  }
};

// Helper functions
const detectPublishingConflicts = async (timetable) => {
  const conflicts = [];

  // Check if there's already an active published timetable for same department/semester
  const existingActive = await Timetable.findOne({
    department: timetable.department,
    semester: timetable.semester,
    status: 'published',
    isActive: true,
    _id: { $ne: timetable._id }
  });

  if (existingActive) {
    conflicts.push({
      type: 'active_timetable_exists',
      message: `There is already an active published timetable for ${timetable.department.name} - Semester ${timetable.semester}`,
      existingTimetable: existingActive._id
    });
  }

  // Check for timetable validity period conflicts
  const validityConflicts = await Timetable.find({
    department: timetable.department,
    status: 'published',
    _id: { $ne: timetable._id },
    $or: [
      {
        'validity.startDate': { $lte: timetable.validity?.endDate },
        'validity.endDate': { $gte: timetable.validity?.startDate }
      }
    ]
  });

  if (validityConflicts.length > 0) {
    conflicts.push({
      type: 'validity_period_conflict',
      message: `Timetable validity period conflicts with ${validityConflicts.length} existing timetables`,
      conflictingTimetables: validityConflicts.map(t => t._id)
    });
  }

  return conflicts;
};

const deactivatePreviousTimetables = async (departmentId, semester) => {
  await Timetable.updateMany(
    {
      department: departmentId,
      semester: semester,
      status: 'published',
      isActive: true
    },
    {
      isActive: false,
      $push: {
        changeLog: {
          changedBy: null, // System action
          changes: "Automatically deactivated due to new timetable publication",
          timestamp: new Date()
        }
      }
    }
  );
};

const sendPublishNotifications = async (timetable, customMessage) => {
  try {
    // Get all users in the department (faculty and students)
    const departmentUsers = await User.find({
      department: timetable.department,
      isActive: true,
      $or: [{ role: 'faculty' }, { role: 'student' }]
    }).select('_id');

    const userIds = departmentUsers.map(user => user._id);

    const notificationMessage = customMessage || 
      `New timetable published for ${timetable.department.name} - Semester ${timetable.semester}`;

    // Create notifications for all users
    const notifications = userIds.map(userId => ({
      user: userId,
      title: "Timetable Published",
      message: notificationMessage,
      type: "timetable",
      priority: "high",
      relatedEntity: {
        type: "timetable",
        id: timetable._id
      },
      actionUrl: `/timetable/view/${timetable._id}`
    }));

    await Notification.insertMany(notifications);

    // TODO: Implement email notifications if needed
    // await sendEmailNotifications(userIds, 'timetable_published', {
    //   timetableTitle: timetable.title,
    //   department: timetable.department.name,
    //   semester: timetable.semester,
    //   message: notificationMessage
    // });

  } catch (error) {
    console.error("Error sending publish notifications:", error);
    // Don't fail the whole operation if notifications fail
  }
};

const sendUnpublishNotifications = async (timetable, reason) => {
  try {
    const departmentUsers = await User.find({
      department: timetable.department,
      isActive: true,
      $or: [{ role: 'faculty' }, { role: 'student' }]
    }).select('_id');

    const userIds = departmentUsers.map(user => user._id);

    const notificationMessage = reason ? 
      `Timetable unpublished: ${reason}` : 
      "Timetable has been unpublished";

    const notifications = userIds.map(userId => ({
      user: userId,
      title: "Timetable Unpublished",
      message: notificationMessage,
      type: "timetable",
      priority: "medium",
      relatedEntity: {
        type: "timetable",
        id: timetable._id
      }
    }));

    await Notification.insertMany(notifications);

  } catch (error) {
    console.error("Error sending unpublish notifications:", error);
  }
};
export const sendBulkNotifications = async (req, res) => {
  try {
    const { 
      title, 
      message, 
      targetUsers, 
      targetRoles, 
      targetDepartments, 
      notificationType = "general",
      priority = "medium",
      actionUrl,
      scheduleSend,
      sendEmail = false,
      sendSMS = false 
    } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        msg: "Title and message are required"
      });
    }

    // Validate target parameters
    if (!targetUsers && !targetRoles && !targetDepartments) {
      return res.status(400).json({
        success: false,
        msg: "Must specify at least one target: users, roles, or departments"
      });
    }

    // Build user filter based on targets
    const userFilter = { isActive: true };
    
    if (targetUsers && targetUsers.length > 0) {
      userFilter._id = { $in: targetUsers };
    }
    
    if (targetRoles && targetRoles.length > 0) {
      userFilter.role = { $in: targetRoles };
    }
    
    if (targetDepartments && targetDepartments.length > 0) {
      userFilter.department = { $in: targetDepartments };
    }

    // Get target users
    const targetUserRecords = await User.find(userFilter).select('_id email name');
    
    if (targetUserRecords.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "No users found matching the specified criteria"
      });
    }

    const userIds = targetUserRecords.map(user => user._id);

    // Create notification records
    const notifications = userIds.map(userId => ({
      user: userId,
      title,
      message,
      type: notificationType,
      priority,
      actionUrl,
      sentBy: req.user.id,
      scheduledFor: scheduleSend ? new Date(scheduleSend) : new Date(),
      deliveryMethods: {
        inApp: true,
        email: sendEmail,
        sms: sendSMS
      },
      metadata: {
        bulkSend: true,
        totalRecipients: userIds.length,
        targetCriteria: {
          users: targetUsers,
          roles: targetRoles,
          departments: targetDepartments
        }
      }
    }));

    // Save notifications to database
    const savedNotifications = await Notification.insertMany(notifications);

    // Send immediate notifications if not scheduled
    if (!scheduleSend || new Date(scheduleSend) <= new Date()) {
      await processNotificationDelivery(savedNotifications, targetUserRecords);
    }

    // Log the bulk notification activity
    await SystemLog.create({
      action: 'bulk_notification_sent',
      performedBy: req.user.id,
      targetModel: 'Notification',
      description: `Bulk notification sent to ${userIds.length} users: ${title}`,
      metadata: {
        notificationId: savedNotifications[0]?._id,
        recipientCount: userIds.length,
        notificationType,
        priority,
        deliveryMethods: {
          email: sendEmail,
          sms: sendSMS
        }
      }
    });

    res.json({
      success: true,
      msg: `Notification sent successfully to ${userIds.length} users`,
      data: {
        notification: {
          title,
          message,
          type: notificationType,
          priority
        },
        delivery: {
          totalRecipients: userIds.length,
          scheduled: !!scheduleSend,
          scheduledFor: scheduleSend,
          methods: {
            inApp: true,
            email: sendEmail,
            sms: sendSMS
          }
        },
        recipients: {
          byRole: await getRecipientStatsByRole(userFilter),
          byDepartment: await getRecipientStatsByDepartment(userFilter)
        }
      }
    });

  } catch (error) {
    console.error("Send bulk notifications error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while sending bulk notifications" 
    });
  }
};

export const getNotificationTemplates = async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;

    const filter = { isTemplate: true };
    if (type) filter.type = type;

    const templates = await Notification.find(filter)
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);

    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTemplates: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Get notification templates error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching notification templates" 
    });
  }
};

export const createNotificationTemplate = async (req, res) => {
  try {
    const { 
      name, 
      title, 
      message, 
      type, 
      priority, 
      defaultActionUrl,
      variables 
    } = req.body;

    // Check if template with same name already exists
    const existingTemplate = await Notification.findOne({ 
      name, 
      isTemplate: true 
    });
    
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        msg: "Notification template with this name already exists"
      });
    }

    const template = new Notification({
      name,
      title,
      message,
      type,
      priority,
      actionUrl: defaultActionUrl,
      isTemplate: true,
      variables: variables || [],
      createdBy: req.user.id,
      metadata: {
        templateVersion: '1.0',
        variableCount: variables?.length || 0
      }
    });

    await template.save();

    res.status(201).json({
      success: true,
      msg: "Notification template created successfully",
      data: template
    });

  } catch (error) {
    console.error("Create notification template error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: "Validation error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ 
      success: false, 
      msg: "Server error while creating notification template" 
    });
  }
};

export const getNotificationAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, type, priority } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    if (type) dateFilter.type = type;
    if (priority) dateFilter.priority = priority;

    // Basic notification statistics
    const notificationStats = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          readCount: { $sum: { $cond: [{ $eq: ["$isRead", true] }, 1, 0] } },
          byType: {
            $push: {
              type: "$type",
              isRead: "$isRead"
            }
          },
          byPriority: {
            $push: {
              priority: "$priority",
              isRead: "$isRead"
            }
          }
        }
      },
      {
        $project: {
          totalNotifications: 1,
          readCount: 1,
          readRate: {
            $cond: [
              { $eq: ["$totalNotifications", 0] },
              0,
              { $multiply: [{ $divide: ["$readCount", "$totalNotifications"] }, 100] }
            ]
          },
          typeDistribution: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ["$byType.type", []] },
                as: "type",
                in: {
                  k: "$$type",
                  v: {
                    total: {
                      $size: {
                        $filter: {
                          input: "$byType",
                          as: "item",
                          cond: { $eq: ["$$item.type", "$$type"] }
                        }
                      }
                    },
                    read: {
                      $size: {
                        $filter: {
                          input: "$byType",
                          as: "item",
                          cond: {
                            $and: [
                              { $eq: ["$$item.type", "$$type"] },
                              { $eq: ["$$item.isRead", true] }
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          priorityDistribution: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ["$byPriority.priority", []] },
                as: "priority",
                in: {
                  k: "$$priority",
                  v: {
                    total: {
                      $size: {
                        $filter: {
                          input: "$byPriority",
                          as: "item",
                          cond: { $eq: ["$$item.priority", "$$priority"] }
                        }
                      }
                    },
                    read: {
                      $size: {
                        $filter: {
                          input: "$byPriority",
                          as: "item",
                          cond: {
                            $and: [
                              { $eq: ["$$item.priority", "$$priority"] },
                              { $eq: ["$$item.isRead", true] }
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    // Daily notification trends
    const dailyTrends = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 },
          readCount: { $sum: { $cond: [{ $eq: ["$isRead", true] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    // Most active notifiers
    const topSenders = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$sentBy",
          notificationCount: { $sum: 1 },
          averageReadRate: {
            $avg: { $cond: [{ $eq: ["$isRead", true] }, 1, 0] }
          }
        }
      },
      { $sort: { notificationCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          userName: "$user.name",
          userEmail: "$user.email",
          notificationCount: 1,
          averageReadRate: { $multiply: ["$averageReadRate", 100] }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: notificationStats[0] || {
          totalNotifications: 0,
          readCount: 0,
          readRate: 0,
          typeDistribution: {},
          priorityDistribution: {}
        },
        trends: {
          daily: dailyTrends,
          timeRange: {
            startDate: startDate || 'beginning',
            endDate: endDate || 'now'
          }
        },
        topSenders,
        summary: {
          totalPeriodNotifications: notificationStats[0]?.totalNotifications || 0,
          averageReadRate: notificationStats[0]?.readRate || 0,
          daysCovered: dailyTrends.length
        }
      }
    });

  } catch (error) {
    console.error("Get notification analytics error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching notification analytics" 
    });
  }
};

export const scheduleNotification = async (req, res) => {
  try {
    const { 
      title, 
      message, 
      targetUsers, 
      targetRoles, 
      targetDepartments,
      scheduleDate,
      notificationType = "scheduled",
      priority = "medium",
      actionUrl,
      repeat,
      sendEmail = false,
      sendSMS = false 
    } = req.body;

    if (!scheduleDate || new Date(scheduleDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        msg: "Valid future schedule date is required"
      });
    }

    // Build user filter
    const userFilter = { isActive: true };
    if (targetUsers) userFilter._id = { $in: targetUsers };
    if (targetRoles) userFilter.role = { $in: targetRoles };
    if (targetDepartments) userFilter.department = { $in: targetDepartments };

    const targetUserRecords = await User.find(userFilter).select('_id');
    const userIds = targetUserRecords.map(user => user._id);

    if (userIds.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "No users found matching the specified criteria"
      });
    }

    const notifications = userIds.map(userId => ({
      user: userId,
      title,
      message,
      type: notificationType,
      priority,
      actionUrl,
      sentBy: req.user.id,
      scheduledFor: new Date(scheduleDate),
      isScheduled: true,
      deliveryMethods: {
        inApp: true,
        email: sendEmail,
        sms: sendSMS
      },
      repeat: repeat || null,
      metadata: {
        scheduled: true,
        originalSchedule: scheduleDate,
        totalRecipients: userIds.length
      }
    }));

    const savedNotifications = await Notification.insertMany(notifications);

    res.json({
      success: true,
      msg: `Notification scheduled for ${savedNotifications.length} users`,
      data: {
        scheduledFor: scheduleDate,
        totalRecipients: savedNotifications.length,
        notificationIds: savedNotifications.map(n => n._id)
      }
    });

  } catch (error) {
    console.error("Schedule notification error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while scheduling notification" 
    });
  }
};

export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { unreadOnly, type, page = 1, limit = 20 } = req.query;

    const filter = { user: userId };
    if (unreadOnly === 'true') filter.isRead = false;
    if (type) filter.type = type;

    const notifications = await Notification.find(filter)
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);

    // Mark as read if requested
    if (unreadOnly === 'true') {
      await Notification.updateMany(
        { _id: { $in: notifications.map(n => n._id) } },
        { isRead: true, readAt: new Date() }
      );
    }

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalNotifications: total,
          unreadCount: unreadOnly === 'true' ? 0 : await Notification.countDocuments({ 
            user: userId, 
            isRead: false 
          })
        }
      }
    });

  } catch (error) {
    console.error("Get user notifications error:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Server error while fetching user notifications" 
    });
  }
};

// Helper functions
const processNotificationDelivery = async (notifications, users) => {
  try {
    // Group users by delivery preferences
    const emailUsers = users.filter(user => 
      notifications.some(n => n.deliveryMethods?.email && n.user.toString() === user._id.toString())
    );
    
    const smsUsers = users.filter(user => 
      notifications.some(n => n.deliveryMethods?.sms && n.user.toString() === user._id.toString())
    );

    // Send emails
    if (emailUsers.length > 0) {
      await sendEmailNotifications(notifications, emailUsers);
    }

    // Send SMS
    if (smsUsers.length > 0) {
      await sendSMSNotifications(notifications, smsUsers);
    }

    // Update notification status
    const notificationIds = notifications.map(n => n._id);
    await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { 
        $set: { 
          isSent: true,
          sentAt: new Date()
        } 
      }
    );

  } catch (error) {
    console.error("Error processing notification delivery:", error);
  }
};

const sendEmailNotifications = async (notifications, users) => {
  // TODO: Implement email service integration
  // This would integrate with your email service (SendGrid, Mailgun, etc.)
  console.log(`Would send ${notifications.length} email notifications to ${users.length} users`);
};

const sendSMSNotifications = async (notifications, users) => {
  // TODO: Implement SMS service integration
  // This would integrate with your SMS service (Twilio, etc.)
  console.log(`Would send ${notifications.length} SMS notifications to ${users.length} users`);
};

const getRecipientStatsByRole = async (userFilter) => {
  const stats = await User.aggregate([
    { $match: userFilter },
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
};

const getRecipientStatsByDepartment = async (userFilter) => {
  const stats = await User.aggregate([
    { $match: userFilter },
    {
      $lookup: {
        from: "departments",
        localField: "department",
        foreignField: "_id",
        as: "department"
      }
    },
    { $unwind: "$department" },
    {
      $group: {
        _id: "$department._id",
        departmentName: { $first: "$department.name" },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat.departmentName] = stat.count;
    return acc;
  }, {});
};