import crypto from "crypto"; 
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Department from "../models/Department.js";
import generateToken from "../utils/generateToken.js"; // default import
import bcrypt from "bcryptjs";

// ===================== AUTH FUNCTIONS =====================
export const register = async (req, res) => {
  try {
    const { name, email, password, role, department, semester, designation, uniqueId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, msg: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      department,
      ...(role === "student" && { semester, uniqueId }),
      ...(role === "faculty" && { designation, uniqueId })
    });

    await user.save();
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      msg: "User registered successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        token
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, msg: "Server error during registration" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ success: false, msg: "Invalid credentials" });
    if (!user.isActive) return res.status(400).json({ success: false, msg: "Account has been deactivated" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, msg: "Invalid credentials" });

    const token = generateToken(user);
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      msg: "Login successful",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        token
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, msg: "Server error during login" });
  }
};

export const logout = async (req, res) => {
  try {
    res.json({ success: true, msg: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

// ===================== PROFILE =====================
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").populate("department", "name code");
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, preferences } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, preferences, profileCompleted: true },
      { new: true, runValidators: true }
    ).select("-password");
    res.json({ success: true, msg: "Profile updated successfully", data: user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select("+password");
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, msg: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, msg: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

// ===================== PASSWORD RESET =====================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    console.log(`Password reset token (send via email): ${resetToken}`);
    res.json({ success: true, msg: "Password reset token generated. Check email." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ success: false, msg: "Invalid or expired token" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    res.json({ success: true, msg: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

// ===================== REFRESH TOKEN =====================
export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, msg: "Token is required" });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ success: false, msg: "Invalid token" });

      const user = { id: decoded.id, role: decoded.role };
      const newToken = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });

      res.json({ success: true, token: newToken });
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

// ===================== ADMIN/FACULTY USER MANAGEMENT =====================
export const getAllUsers = async (req, res) => {
  const users = await User.find().select("-password").populate("department", "name code");
  res.json({ success: true, data: users });
};

export const getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password").populate("department", "name code");
  if (!user) return res.status(404).json({ success: false, msg: "User not found" });
  res.json({ success: true, data: user });
};

export const updateUser = async (req, res) => {
  const updates = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");
  res.json({ success: true, msg: "User updated", data: user });
};

export const deactivateUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  res.json({ success: true, msg: "User deactivated", data: user });
};

export const activateUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  res.json({ success: true, msg: "User activated", data: user });
};

export const deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, msg: "User deleted" });
};
