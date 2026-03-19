import TeacherAvailability from "../models/TeacherAvailability.js";
import User from "../models/User.js";

export const getAvailability = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const availability = await TeacherAvailability.find({ teacher: teacherId });
    res.json({ success: true, data: availability });
  } catch (error) {
    console.error("Fetch availability error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const updateAvailability = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { availabilityData } = req.body; // Expect an array of objects

    // Clean up current availability (bulk update)
    await TeacherAvailability.deleteMany({ teacher: teacherId });

    // Mark as bulk set
    const records = availabilityData.map(item => ({
      teacher: teacherId,
      day: item.day,
      slot: item.slot,
      status: item.status,
      reason: item.reason
    }));

    await TeacherAvailability.insertMany(records);

    res.json({ success: true, msg: "Availability updated successfully" });
  } catch (error) {
    console.error("Update availability error:", error);
    res.status(500).json({ success: false, msg: "Server error during update" });
  }
};

export const getAllTeacherAvailabilities = async (req, res) => {
  try {
    const allAvailability = await TeacherAvailability.find().populate('teacher', 'name email');
    res.json({ success: true, data: allAvailability });
  } catch (error) {
    console.error("Fetch all availabilities error:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};
