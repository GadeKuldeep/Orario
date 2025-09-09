import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminPage.css";

const AdminPage = () => {
  const [overview, setOverview] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timetableOptions, setTimetableOptions] = useState([]);
  const [reports, setReports] = useState([]);
  const navigate = useNavigate();

  const BASE_URL = "http://localhost:1573";
  const token = localStorage.getItem("token");

  const authFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      navigate("/login");
      throw new Error("Unauthorized. Redirecting...");
    }
    return res;
  };

  const fetchOverview = async () => {
    try {
      const res = await authFetch(`${BASE_URL}/api/admin/dashboard`);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const data = await res.json();
      setOverview(data);
    } catch (err) {
      console.error("❌ Error fetching overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) return;
      const res = await authFetch(`${BASE_URL}/api/notifications/${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("❌ Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleGenerateTimetable = async () => {
    try {
      const res = await authFetch(`${BASE_URL}/api/admin/timetable/generate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const data = await res.json();
      setTimetableOptions(data.options || []);
    } catch (err) {
      console.error("❌ Failed to generate timetable:", err);
    }
  };

  const handleFetchReports = async () => {
    try {
      const res = await authFetch(`${BASE_URL}/api/admin/reports`);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const data = await res.json();
      setReports(data.utilization || []);
    } catch (err) {
      console.error("❌ Failed to fetch reports:", err);
    }
  };

  const goToProfile = () => {
    navigate("/profile");
  };

  if (loading) return <div className="loading">Loading Dashboard...</div>;

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div className="branding">
          <h1 className="page-title">Smart Classroom & Timetable Scheduler</h1>
          <h3 className="sub-title">Admin Dashboard – Government of Jharkhand</h3>
        </div>
        <button className="profile-btn" onClick={goToProfile}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>

        </button>
      </header>

      {/* Overview Section */}
      <section className="overview-section">
        <h2 className="section-title">Overview</h2>
        <div className="cards-container">
          <div className="card">🏫 Classrooms: {overview.totalClassrooms}</div>
          <div className="card">👩‍🏫 Faculty: {overview.totalFaculty}</div>
          <div className="card">🎓 Students: {overview.totalStudents}</div>
          <div className="card">⏳ Approvals: {overview.pendingApprovals}</div>
          <div className="card conflict">⚠️ Conflicts: {overview.conflictCount}</div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2 className="section-title">Quick Actions</h2>
        <div className="action-buttons">
          <button onClick={() => (window.location.href = "/admin/faculty/add")}>➕ Add Faculty</button>
          <button onClick={() => (window.location.href = "/admin/classroom/add")}>🏫 Add Classroom</button>
          <button onClick={handleGenerateTimetable}>📅 Generate Timetable</button>
          <button onClick={handleFetchReports}>📊 View Reports</button>
        </div>
      </section>

      {/* Timetable Section */}
      {timetableOptions.length > 0 && (
        <section className="timetable-section">
          <h2 className="section-title">Generated Timetables</h2>
          <ul>
            {timetableOptions.map((t) => (
              <li key={t.id}>
                <strong>{t.room}</strong> – {t.subject} ({t.faculty}) [{t.time}]
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reports Section */}
      {reports.length > 0 && (
        <section className="reports-section">
          <h2 className="section-title">Classroom Utilization</h2>
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Capacity</th>
                <th>Usage Count</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={i}>
                  <td>{r.room}</td>
                  <td>{r.capacity}</td>
                  <td>{r.usageCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Notifications */}
      <section className="notifications">
        <h2 className="section-title">Notifications</h2>
        {notifications.length > 0 ? (
          <ul>
            {notifications.map((n) => (
              <li key={n._id}>
                <span className={`notif-type ${n.type}`}>{n.type}</span> – {n.message}
              </li>
            ))}
          </ul>
        ) : (
          <p>No new notifications.</p>
        )}
      </section>
    </div>
  );
};

export default AdminPage;
