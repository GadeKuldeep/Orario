import React, { createContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// Pages
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import { Admin } from "./pages/Admin.jsx";
import Student from "./pages/Student.jsx";
import Faculty from "./pages/Faculty.jsx";
import HOD from "./pages/HOD.jsx";

// ✅ Global API Context (for consistent backend URL access)
export const ApiContext = createContext();

// ✅ Define backend URLs for different environments
const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://orario-3.onrender.com" // Render live backend
    : "http://localhost:3000";         // Local dev backend

// ✅ Create MUI theme
const theme = createTheme({
  palette: {
    primary: { main: "#1976d2" },
    secondary: { main: "#dc004e" },
    background: { default: "#f5f5f5" },
  },
  typography: {
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
});

const App = () => {
  return (
    <ApiContext.Provider value={{ API_BASE_URL }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/admin/dashboard" element={<Admin />} />
            <Route path="/student/dashboard" element={<Student />} />
            <Route path="/faculty/dashboard" element={<Faculty />} />
            <Route path="/hod/dashboard" element={<HOD />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ApiContext.Provider>
  );
};

export default App;
