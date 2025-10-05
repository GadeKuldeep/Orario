import React, { useState, useEffect } from 'react';
import "./Admin.css";

export const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard-overview');
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/departments');
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
    setLoading(false);
  };

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/classrooms');
      const data = await response.json();
      if (data.success) {
        setClassrooms(data.data);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
    setLoading(false);
  };

  const fetchTimetables = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/timetables');
      const data = await response.json();
      if (data.success) {
        setTimetables(data.data.timetables);
      }
    } catch (error) {
      console.error('Error fetching timetables:', error);
    }
    setLoading(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'users':
        fetchUsers();
        break;
      case 'departments':
        fetchDepartments();
        break;
      case 'classrooms':
        fetchClassrooms();
        break;
      case 'timetables':
        fetchTimetables();
        break;
      default:
        break;
    }
  };

  const renderDashboard = () => (
    <div className="dashboard-grid">
      {dashboardData && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon faculty">👨‍🏫</div>
              <div className="stat-info">
                <h3>{dashboardData.stats.totalFaculty}</h3>
                <p>Total Faculty</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon student">🎓</div>
              <div className="stat-info">
                <h3>{dashboardData.stats.totalStudents}</h3>
                <p>Total Students</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon department">🏛️</div>
              <div className="stat-info">
                <h3>{dashboardData.stats.totalDepartments}</h3>
                <p>Departments</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon classroom">🏫</div>
              <div className="stat-info">
                <h3>{dashboardData.stats.totalClassrooms}</h3>
                <p>Classrooms</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon leave">📋</div>
              <div className="stat-info">
                <h3>{dashboardData.stats.pendingLeaves}</h3>
                <p>Pending Leaves</p>
              </div>
            </div>
          </div>

          <div className="dashboard-content">
            <div className="recent-activities">
              <h3>Recent Activities</h3>
              <div className="activities-list">
                {dashboardData.recentActivities.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">📅</div>
                    <div className="activity-details">
                      <p className="activity-title">Timetable Generated</p>
                      <p className="activity-meta">
                        {activity.department?.name} • {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                {dashboardData.quickActions.map((action, index) => (
                  <button key={index} className="action-btn">
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="content-section">
      <div className="section-header">
        <h2>User Management</h2>
        <button className="btn-primary">Add User</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.department?.name || 'N/A'}</td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-edit">Edit</button>
                    <button className="btn-delete">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDepartments = () => (
    <div className="content-section">
      <div className="section-header">
        <h2>Department Management</h2>
        <button className="btn-primary">Add Department</button>
      </div>
      <div className="cards-grid">
        {departments.map((dept) => (
          <div key={dept._id} className="department-card">
            <h3>{dept.name}</h3>
            <p className="dept-code">{dept.code}</p>
            <div className="dept-stats">
              <div className="stat">
                <span className="stat-value">{dept.facultyCount || 0}</span>
                <span className="stat-label">Faculty</span>
              </div>
              <div className="stat">
                <span className="stat-value">{dept.studentCount || 0}</span>
                <span className="stat-label">Students</span>
              </div>
              <div className="stat">
                <span className="stat-value">{dept.subjectCount || 0}</span>
                <span className="stat-label">Subjects</span>
              </div>
            </div>
            <div className="card-actions">
              <button className="btn-edit">Edit</button>
              <button className="btn-delete">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderClassrooms = () => (
    <div className="content-section">
      <div className="section-header">
        <h2>Classroom Management</h2>
        <button className="btn-primary">Add Classroom</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Room Number</th>
              <th>Name</th>
              <th>Capacity</th>
              <th>Department</th>
              <th>Building</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classrooms.map((classroom) => (
              <tr key={classroom._id}>
                <td>{classroom.roomNumber}</td>
                <td>{classroom.name}</td>
                <td>{classroom.capacity}</td>
                <td>{classroom.department?.name || 'N/A'}</td>
                <td>{classroom.building || 'N/A'}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-edit">Edit</button>
                    <button className="btn-delete">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTimetables = () => (
    <div className="content-section">
      <div className="section-header">
        <h2>Timetable Management</h2>
        <button className="btn-primary">Generate Timetable</button>
      </div>
      <div className="cards-grid">
        {timetables.map((timetable) => (
          <div key={timetable._id} className="timetable-card">
            <h3>{timetable.title}</h3>
            <div className="timetable-meta">
              <p><strong>Department:</strong> {timetable.department?.name}</p>
              <p><strong>Semester:</strong> {timetable.semester}</p>
              <p><strong>Status:</strong> 
                <span className={`status-badge ${timetable.status}`}>
                  {timetable.status}
                </span>
              </p>
            </div>
            <div className="card-actions">
              <button className="btn-view">View</button>
              <button className="btn-edit">Edit</button>
              <button className="btn-publish">Publish</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="user-info">
          <span>Welcome, Admin</span>
          <div className="user-avatar">A</div>
        </div>
      </div>

      <div className="admin-content">
        <div className="sidebar">
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleTabChange('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => handleTabChange('users')}
            >
              👥 User Management
            </button>
            <button 
              className={`nav-item ${activeTab === 'departments' ? 'active' : ''}`}
              onClick={() => handleTabChange('departments')}
            >
              🏛️ Departments
            </button>
            <button 
              className={`nav-item ${activeTab === 'classrooms' ? 'active' : ''}`}
              onClick={() => handleTabChange('classrooms')}
            >
              🏫 Classrooms
            </button>
            <button 
              className={`nav-item ${activeTab === 'timetables' ? 'active' : ''}`}
              onClick={() => handleTabChange('timetables')}
            >
              📅 Timetables
            </button>
            <button 
              className={`nav-item ${activeTab === 'subjects' ? 'active' : ''}`}
              onClick={() => handleTabChange('subjects')}
            >
              📚 Subjects
            </button>
            <button 
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => handleTabChange('reports')}
            >
              📈 Reports
            </button>
            <button 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
            >
              ⚙️ Settings
            </button>
          </nav>
        </div>

        <div className="main-content">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'users' && renderUsers()}
              {activeTab === 'departments' && renderDepartments()}
              {activeTab === 'classrooms' && renderClassrooms()}
              {activeTab === 'timetables' && renderTimetables()}
              {activeTab === 'subjects' && <div>Subjects Management - Coming Soon</div>}
              {activeTab === 'reports' && <div>Reports - Coming Soon</div>}
              {activeTab === 'settings' && <div>System Settings - Coming Soon</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};