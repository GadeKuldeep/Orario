import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", req.body);

    // 1️⃣ Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(401).json({ msg: "User not found" });
    }
    console.log("✅ User found:", user.email);

    // 2️⃣ Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Wrong password for:", email);
      return res.status(401).json({ msg: "Wrong password" });
    }

    // 3️⃣ Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 4️⃣ Role-based dashboard redirect
    let dashboardPath = "/student/dashboard";
    if (user.role === "admin") dashboardPath = "/admin/dashboard";
    if (user.role === "faculty") dashboardPath = "/faculty/dashboard";

    // 5️⃣ Send response
    res.json({
      msg: "Login successful",
      token,
      role: user.role,
      redirectTo: dashboardPath,
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Server error. Please try again later", error: err.message });
  }
};

export default loginController;
