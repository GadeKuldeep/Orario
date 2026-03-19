import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Department from './models/Department.js';

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    // Clear existing users
    await User.deleteMany();
    await Department.deleteMany();

    // Create a demo department
    const demoDept = new Department({
       name: "Computer Science and Engineering",
       code: "CSE",
       facultyCount: 0,
       studentCount: 0,
       subjectCount: 0
    });
    await demoDept.save();

    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminHashedPassword = await bcrypt.hash('admin123', 10);

    const users = [
      {
        name: "Super Admin",
        email: "admin@orario.com",
        password: adminHashedPassword,
        role: "admin",
        isActive: true,
        profileCompleted: true
      },
      {
        name: "Dr. Robert Smith",
        email: "hod@orario.com",
        password: hashedPassword,
        role: "hod",
        department: demoDept._id,
        uniqueId: "HOD-CSE-001",
        designation: "Head of Department",
        isActive: true,
        profileCompleted: true
      },
      {
        name: "Prof. Alice Johnson",
        email: "faculty@orario.com",
        password: hashedPassword,
        role: "faculty",
        department: demoDept._id,
        uniqueId: "FAC-CSE-001",
        designation: "Assistant Professor",
        isActive: true,
        profileCompleted: true
      },
      {
        name: "James Wilson",
        email: "student@orario.com",
        password: hashedPassword,
        role: "student",
        department: demoDept._id,
        uniqueId: "STU-CSE-2024-001",
        semester: 4,
        isActive: true,
        profileCompleted: true
      }
    ];

    await User.insertMany(users);
    console.log("Database seeded successfully!");
    process.exit();
  } catch (err) {
    console.error("Error seeding database:", err);
    process.exit(1);
  }
};

seedDB();
