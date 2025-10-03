import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./page/LandingPage.jsx"; 
import LoginPage from "./page/LoginPage.jsx";
import AdminPage from "./page/AdminPage.jsx";
import StudentDashboard from "./page/StudentPage.jsx";
import FacultyDashboard from "./page/FacultyDashboard.jsx";
import TimetableGenerator from "./page/TimetableGenerator.jsx";
import RegistrationPage from "./page/RegistrationPage.jsx";


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegistrationPage />} />
        <Route path="/admin/dashboard" element={<AdminPage />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/faculty/dashboard" element={<FacultyDashboard />}/>
        <Route path="/timetable/generate" element={<TimetableGenerator />}/>
      </Routes>
    </Router>
  );
};

export default App;