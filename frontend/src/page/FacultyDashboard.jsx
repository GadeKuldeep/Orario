import React, { useEffect, useState } from 'react';
import "./FacultyDashboard.css";

const FacultyDashboard = () => {
  const [faculty, setFaculty] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [availability, setAvailability] = useState({ available_slots: "", preferences: "" });

  const facultyId = "replace_with_logged_in_faculty_id"; 
  // Dynamic API base: works with Vite proxy locally and deployed backend
  const API_BASE = import.meta.env.VITE_API_BASE || "/api/faculty";

  useEffect(() => {
    fetch(`${API_BASE}/admin/${facultyId}`)
      .then((res) => res.json())
      .then((data) => setFaculty(data));

    fetch(`${API_BASE}/timetable/${facultyId}`)
      .then((res) => res.json())
      .then((data) => setTimetable(data));
  }, []);

  const handleAvailabilityUpdate = async () => {
    await fetch(`${API_BASE}/availability/${facultyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(availability),
    });
    alert("Availability updated!");
  };

  return (
    <div className="faculty-dashboard">
      {/* Header */}
      <header className="faculty-header">
        <h1>Faculty Dashboard</h1>
        <div className="profile-section">
          <button className="logout-btn">Logout</button>
          <div className="profile-icon">👤</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="faculty-main">
        {/* Profile */}
        <section className="faculty-card">
          <h2>Profile</h2>
          {faculty ? (
            <div>
              <p><b>Name:</b> {faculty.name}</p>
              <p><b>Email:</b> {faculty.email}</p>
              <p><b>Department:</b> {faculty.department}</p>
              <p><b>Subjects:</b> {faculty.subjects?.join(", ")}</p>
            </div>
          ) : (
            <p>Loading profile...</p>
          )}
        </section>

        {/* Availability */}
        <section className="faculty-card">
          <h2>Update Availability</h2>
          <input
            type="text"
            placeholder="Available Slots"
            value={availability.available_slots}
            onChange={(e) => setAvailability({ ...availability, available_slots: e.target.value })}
          />
          <input
            type="text"
            placeholder="Preferences"
            value={availability.preferences}
            onChange={(e) => setAvailability({ ...availability, preferences: e.target.value })}
          />
          <button className="save-btn" onClick={handleAvailabilityUpdate}>Save</button>
        </section>

        {/* Timetable */}
        <section className="faculty-card timetable-card">
          <h2>My Timetable</h2>
          {timetable.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Subject</th>
                  <th>Classroom</th>
                </tr>
              </thead>
              <tbody>
                {timetable.map((slot, i) => (
                  <tr key={i}>
                    <td>{slot.day}</td>
                    <td>{slot.time}</td>
                    <td>{slot.subject}</td>
                    <td>{slot.classroom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No timetable assigned.</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default FacultyDashboard;
