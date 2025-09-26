// src/components/TimetableGenerator.jsx
import React, { useState } from "react";
import axios from "axios";

const TimetableGenerator = () => {
  const [formData, setFormData] = useState({
    academicYear: "",
    semester: "",
    department: "",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    slotsPerDay: 8,
    options: 1,
    debug: false,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const token = localStorage.getItem("token");

      const payload = {
        academicYear: formData.academicYear.trim(),
        semester: Number(formData.semester),
        department: formData.department.trim(),
        days: formData.days,
        slotsPerDay: Number(formData.slotsPerDay),
        options: Number(formData.options),
        debug: Boolean(formData.debug),
      };

      if (!payload.academicYear || !payload.semester || !payload.department) {
        setError("Academic Year, Semester, and Department are required.");
        setLoading(false);
        return;
      }

      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await axios.post(
        "https://orario-3.onrender.com/api/admin/timetable/generate", // Render backend
        payload,
        { headers }
      );

      if (res.data.ok) {
        setResult(res.data);
      } else {
        setError(res.data.message || "Error generating timetable");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Internal error while generating timetable"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "auto" }}>
      <h2>Generate Timetable</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <div>
          <label>Academic Year:</label>
          <input
            type="text"
            name="academicYear"
            value={formData.academicYear}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Semester:</label>
          <input
            type="number"
            name="semester"
            value={formData.semester}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Department:</label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Slots per day:</label>
          <input
            type="number"
            name="slotsPerDay"
            value={formData.slotsPerDay}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Options:</label>
          <input
            type="number"
            name="options"
            value={formData.options}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              name="debug"
              checked={formData.debug}
              onChange={handleChange}
            />
            Debug Mode
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate Timetable"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <div>
          <h3>Result:</h3>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              maxHeight: "400px",
              overflowY: "scroll",
              background: "#f0f0f0",
              padding: "10px",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TimetableGenerator;
