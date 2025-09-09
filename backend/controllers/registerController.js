import bcrypt from "bcryptjs";
import User from "../models/User.js";

const registerController = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      department,
    });

    await user.save();

    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

export default registerController;
