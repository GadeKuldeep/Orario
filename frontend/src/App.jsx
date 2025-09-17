import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./page/LandingPage.jsx"; 
import LoginPage from "./page/LoginPage.jsx";
import AdminPage from "./page/AdminPage.jsx";
import StudentDashboard from "./page/StudentPage.jsx";
import FacultyDashboard from "./page/FacultyDashboard.jsx";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<AdminPage />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/faculty/dashboard" element={<FacultyDashboard />}/>
      </Routes>
    </Router>
  );
};

export default App;
