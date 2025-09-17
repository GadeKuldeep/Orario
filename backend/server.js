// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

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

// Routes hello world
app.use("/api/", landingRouters);
app.use("/api/login", loginRouter);
app.use("/api/register", registerRouter);
app.use("/api/admin", adminRoutes);
app.use("/api/student",studentRouter);
app.use("/api/faculty",facultyRoutes);
app.use("/api/notifications", notificationRoutes);


// Default route for testing 
app.get("/", (req, res) => {
  res.send("Server is running ✅");
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
