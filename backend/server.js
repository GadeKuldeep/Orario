import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import landingRoute from './routers/landingRouter.js';
import authRoute from './routers/authRoutes.js';
import adminRoute from './routers/adminRoutes.js';
import attendanceRoute from './routers/attendanceRoutes.js';
import facultyRoute from './routers/facultyRoutes.js';
import notificationRoute from './routers/notificationRoutes.js';
import studentRoute from './routers/studentRoutes.js';
import timetableRoute from './routers/timetableRoutes.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: ["https://orario-4.netlify.app", "http://localhost:5173"],
  credentials: true
}));

app.use("/api/", landingRoute);
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);  
app.use("/api/attendance", attendanceRoute);
app.use("/api/faculty", facultyRoute);
app.use("/api/notification", notificationRoute);
app.use("/api/student", studentRoute);
app.use("/api/timetable", timetableRoute);

app.use(express.static(path.join(__dirname, "build")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully...");
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port: ${process.env.PORT}...`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });
