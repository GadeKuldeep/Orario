// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";   // Needed for __dirname in ES modules

// Setup __dirname in ES Module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes from their original locations 
import landingRouters from "./routers/landingRouter.js";
import loginRouter from "./routers/loginRouter.js";
import registerRouter from "./routers/registerRouter.js";
import adminRoutes from "./routers/adminRoutes.js";
import notificationRoutes from "./routers/NotificationRoute.js";
import studentRouter from "./routers/studentRoutes.js";
import facultyRoutes from "./routers/facultyRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: "http://localhost:1573", credentials: true }));

// API Routes
app.use("/api/", landingRouters);
app.use("/api/login", loginRouter);
app.use("/api/register", registerRouter);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRouter);
app.use("/api/faculty", facultyRoutes);
app.use("/api/notifications", notificationRoutes);

// Serve frontend build (React/Vue/Angular build folder)
app.use(express.static(path.join(__dirname, "build")));

// Default route for frontend (React Router Fallback)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Connect to MongoDB and start server
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
