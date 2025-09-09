// src/pages/StudentDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/student"; // adjust if needed

const StudentDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token"); // token saved after login

  // axios instance with auth header
  const authAxios = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, timetableRes, notifRes] = await Promise.all([
          authAxios.get("/dashboard"),
          authAxios.get("/timetable"),
          authAxios.get("/notifications"),
        ]);

        setDashboard(dashRes.data);
        setTimetable(timetableRes.data);
        setNotifications(notifRes.data);
      } catch (err) {
        console.error("❌ Error fetching student data:", err.response?.data || err);
      } finally {
        setLoading(false);
      }f
    };

    fetchData();
  }, []);

  if (loading) return <p>Loading student dashboard...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🎓 Student Dashboard</h1>

      {/* Dashboard Summary */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold">Overview</h2>
        {dashboard ? (
          <ul className="list-disc ml-6">
            <li>Welcome: {dashboard.name}</li>
            <li>Enrolled Courses: {dashboard.courses?.length || 0}</li>
          </ul>
        ) : (
          <p>No dashboard data available.</p>
        )}
      </section>

      {/* Timetable */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold">📅 Timetable</h2>
        {timetable.length > 0 ? (
          <table className="border-collapse border border-gray-400 w-full">
            <thead>
              <tr>
                <th className="border p-2">Day</th>
                <th className="border p-2">Subject</th>
                <th className="border p-2">Faculty</th>
                <th className="border p-2">Room</th>
                <th className="border p-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {timetable.map((cls, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{cls.day}</td>
                  <td className="border p-2">{cls.subject}</td>
                  <td className="border p-2">{cls.facultyName}</td>
                  <td className="border p-2">{cls.room}</td>
                  <td className="border p-2">{cls.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No timetable assigned yet.</p>
        )}
      </section>

      {/* Notifications */}
      <section>
        <h2 className="text-xl font-semibold">🔔 Notifications</h2>
        {notifications.length > 0 ? (
          <ul className="list-disc ml-6">
            {notifications.map((n, idx) => (
              <li key={idx}>
                {n.message}{" "}
                <span className="text-sm text-gray-500">({n.date})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No notifications.</p>
        )}
      </section>
    </div>
  );
};

export default StudentDashboard;
