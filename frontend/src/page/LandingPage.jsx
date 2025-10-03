import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  const homeRef = useRef(null);
  const aboutRef = useRef(null);
  const featuresRef = useRef(null);
  const contactRef = useRef(null);
  const navigate = useNavigate();

  const [currentImage, setCurrentImage] = useState(0);
  const [landingData, setLandingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch landing page data
  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        console.log("Fetching landing page data...");
        
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch('http://localhost:5000/api/landing', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          credentials: 'include' // Important for cookies/sessions
        });
        
        console.log("Response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Landing data received:", result);
        
        if (result.success) {
          setLandingData(result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch landing data');
        }
      } catch (err) {
        console.error("Error fetching landing data:", err);
        setError(err.message);
        
        // Set fallback data for development
        setLandingData({
          title: "Timetable Management System",
          systemStats: {
            totalFaculty: 45,
            totalStudents: 1200,
            totalDepartments: 8,
            totalSubjects: 150,
            activeTimetables: 12,
            todayAttendance: 340
          },
          announcements: [
            {
              title: "Welcome to Orario",
              message: "New timetable system launched successfully!",
              createdAt: new Date().toISOString(),
              priority: "high"
            },
            {
              title: "System Maintenance",
              message: "Scheduled maintenance this weekend",
              createdAt: new Date().toISOString(),
              priority: "medium"
            }
          ],
          isAuthenticated: false,
          userRole: 'guest'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLandingData();
  }, []);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const goToLogin = () => {
    navigate("/auth/login");
  };

  const goToDashboard = () => {
    navigate("/dashboard");
  };

  // Background image carousel effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const bgImages = [
    "https://plus.unsplash.com/premium_photo-1691588961759-e61c6e241082?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y29sbGFnZSUyMHN0dWRlbnRzfGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1654366698665-e6d611a9aaa9?q=80&w=1556&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1741636174546-0d8c52a5aa00?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGNvbGxhZ2UlMjBzdHVkZW50c3xlbnwwfHwwfHx8MA%3D%3D"
  ];

  // Role-specific dashboard preview component
  const DashboardPreview = () => {
    if (!landingData?.isAuthenticated) return null;

    const { userRole, adminData, facultyData, studentData } = landingData;

    const renderAdminPreview = () => (
      <div className="dashboard-preview admin-preview">
        <h3>Admin Dashboard</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{adminData?.pendingApprovals || 0}</span>
            <span className="stat-label">Pending Approvals</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{adminData?.maintenanceClassrooms || 0}</span>
            <span className="stat-label">Classrooms in Maintenance</span>
          </div>
        </div>
        <button className="dashboard-btn" onClick={goToDashboard}>
          Go to Admin Dashboard
        </button>
      </div>
    );

    const renderFacultyPreview = () => (
      <div className="dashboard-preview faculty-preview">
        <h3>Faculty Dashboard</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{facultyData?.todaySchedule?.length || 0}</span>
            <span className="stat-label">Today's Classes</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{facultyData?.pendingSubstitutions || 0}</span>
            <span className="stat-label">Pending Substitutions</span>
          </div>
        </div>
        <button className="dashboard-btn" onClick={goToDashboard}>
          Go to Faculty Dashboard
        </button>
      </div>
    );

    const renderStudentPreview = () => (
      <div className="dashboard-preview student-preview">
        <h3>Student Dashboard</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{studentData?.todaySchedule?.length || 0}</span>
            <span className="stat-label">Today's Classes</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{studentData?.studentInfo?.enrolledSubjects || 0}</span>
            <span className="stat-label">Enrolled Subjects</span>
          </div>
        </div>
        <button className="dashboard-btn" onClick={goToDashboard}>
          Go to Student Dashboard
        </button>
      </div>
    );

    return (
      <div className="role-preview-section">
        {userRole === 'admin' && renderAdminPreview()}
        {userRole === 'faculty' && renderFacultyPreview()}
        {userRole === 'student' && renderStudentPreview()}
      </div>
    );
  };

  // System statistics component
  const SystemStats = () => {
    if (!landingData?.systemStats) return null;

    const stats = landingData.systemStats;

    return (
      <div className="system-stats">
        <h3>System Overview</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{stats.totalFaculty || 0}</span>
            <span className="stat-label">Faculty Members</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.totalStudents || 0}</span>
            <span className="stat-label">Students</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.totalDepartments || 0}</span>
            <span className="stat-label">Departments</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.activeTimetables || 0}</span>
            <span className="stat-label">Active Timetables</span>
          </div>
        </div>
      </div>
    );
  };

  // Announcements component
  const Announcements = () => {
    if (!landingData?.announcements?.length) return null;

    return (
      <div className="announcements-section">
        <h3>Recent Announcements</h3>
        <div className="announcements-list">
          {landingData.announcements.map((announcement, index) => (
            <div key={index} className="announcement-card">
              <h4>{announcement.title}</h4>
              <p>{announcement.message}</p>
              <span className="announcement-date">
                {new Date(announcement.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Notifications component
  const Notifications = () => {
    if (!landingData?.notifications?.length) return null;

    return (
      <div className="notifications-section">
        <h3>Recent Notifications</h3>
        <div className="notifications-list">
          {landingData.notifications.slice(0, 5).map((notification, index) => (
            <div key={index} className={`notification-card ${notification.isRead ? 'read' : 'unread'}`}>
              <div className="notification-header">
                <h4>{notification.title}</h4>
                {!notification.isRead && <span className="notification-badge">New</span>}
                {notification.actionRequired && <span className="action-required">Action Required</span>}
              </div>
              <p>{notification.message}</p>
              <div className="notification-footer">
                <span className="notification-type">{notification.type}</span>
                <span className="notification-date">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Orario Portal...</p>
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="navbar">
        <h2 className="logo">Orario</h2>
        <ul>
          <li onClick={() => scrollToSection(homeRef)}>Home</li>
          <li onClick={() => scrollToSection(aboutRef)}>About</li>
          <li onClick={() => scrollToSection(featuresRef)}>Features</li>
          <li onClick={() => scrollToSection(contactRef)}>Contact</li>
          {landingData?.isAuthenticated && (
            <li onClick={goToDashboard}>Dashboard</li>
          )}
        </ul>
      </nav>

      {/* Hero Section */}
      <section
        ref={homeRef}
        className="section hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${bgImages[currentImage]})`
        }}
      >
        <div className="hero-content">
          <h1>Welcome to Orario Portal</h1>
          <p>Intelligent Timetable Management System</p>
          {error && (
            <div className="error-banner">
              <p>⚠️ Using demo data. {error}</p>
            </div>
          )}
          {!landingData?.isAuthenticated ? (
            <button className="login-btn" onClick={goToLogin}>
              Login
            </button>
          ) : (
            <button className="dashboard-btn" onClick={goToDashboard}>
              Go to Dashboard
            </button>
          )}
        </div>

        {/* Dashboard Preview for authenticated users */}
        {landingData?.isAuthenticated && <DashboardPreview />}

        {/* System Stats */}
        <SystemStats />
      </section>

      {/* About Section */}
      <section ref={aboutRef} className="section about">
        <div className="container">
          <h2>About Orario</h2>
          <p>
            Orario is an intelligent web-based platform designed to revolutionize classroom and
            timetable scheduling for higher education institutions. It simplifies complex scheduling
            challenges by optimizing classroom utilization, balancing faculty workload, and ensuring a
            seamless learning experience for students.
          </p>
          <div className="features-highlight">
            <div className="feature-item">
              <h4>Smart Scheduling</h4>
              <p>AI-powered timetable optimization with conflict detection</p>
            </div>
            <div className="feature-item">
              <h4>Real-time Updates</h4>
              <p>Instant notifications for changes and announcements</p>
            </div>
            <div className="feature-item">
              <h4>Role-based Access</h4>
              <p>Customized dashboards for admins, faculty, and students</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="section features">
        <div className="container">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Automated Timetable Generation</h3>
              <p>Generate optimized timetables automatically based on constraints and preferences</p>
            </div>
            <div className="feature-card">
              <h3>Conflict Resolution</h3>
              <p>Smart detection and resolution of scheduling conflicts in real-time</p>
            </div>
            <div className="feature-card">
              <h3>Attendance Tracking</h3>
              <p>Integrated attendance system with analytics and reporting</p>
            </div>
            <div className="feature-card">
              <h3>Mobile Friendly</h3>
              <p>Access your schedule and notifications on any device</p>
            </div>
          </div>
        </div>

        {/* Announcements */}
        <Announcements />

        {/* Notifications for authenticated users */}
        {landingData?.isAuthenticated && <Notifications />}
      </section>

      {/* Contact Section */}
      <section ref={contactRef} className="section contact">
        <div className="container">
          <h2>Contact Us</h2>
          <div className="contact-content">
            <div className="contact-info">
              <h3>Get In Touch</h3>
              <p>Have questions about Orario? We're here to help!</p>
              <div className="contact-details">
                <p>📧 support@orario.com</p>
                <p>📞 +1 (555) 123-4567</p>
                <p>🏢 123 Education Lane, Campus City</p>
              </div>
            </div>
            <form className="contact-form">
              <input type="text" placeholder="Your Name" required />
              <input type="email" placeholder="Your Email" required />
              <textarea placeholder="Your Message" rows="5" required></textarea>
              <button type="submit">Send Message</button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 Orario Timetable Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;