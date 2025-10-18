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
  const [error, setError] = useState('');

  // Check authentication and role on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || user.role !== 'admin') {
        setError('Access denied. Admin privileges required.');
        // Redirect to appropriate dashboard
        const redirectUrl = user ? `/${user.role}/dashboard` : '/auth/login';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 2000);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      setError('Authentication error. Please login again.');
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 2000);
      return false;
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    if (checkAuth()) {
      fetchDashboardData();
    }
  }, []);

  const fetchDashboardData = async () => {
    if (!checkAuth()) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/dashboard-overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.status === 401 || response.status === 403) {
        setError('Access forbidden. Please check your admin permissions.');
        localStorage.removeItem('user');
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.msg || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Network error. Please try again.');
      
      // If unauthorized, redirect to login
      if (error.message.includes('401') || error.message.includes('403')) {
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
      }
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      
      if (response.status === 401 || response.status === 403) {
        setError('Access forbidden. Please login again.');
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users || data.data || []);
      } else {
        setError(data.msg || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/departments', {
        credentials: 'include'
      });
      
      if (response.status === 401 || response.status === 403) {
        setError('Access forbidden. Please login again.');
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch departments');
      
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data || []);
      } else {
        setError(data.msg || 'Failed to fetch departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to fetch departments');
    }
    setLoading(false);
  };

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/classrooms', {
        credentials: 'include'
      });
      
      if (response.status === 401 || response.status === 403) {
        setError('Access forbidden. Please login again.');
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch classrooms');
      
      const data = await response.json();
      if (data.success) {
        setClassrooms(data.data || []);
      } else {
        setError(data.msg || 'Failed to fetch classrooms');
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      setError('Failed to fetch classrooms');
    }
    setLoading(false);
  };

  const fetchTimetables = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/timetables', {
        credentials: 'include'
      });
      
      if (response.status === 401 || response.status === 403) {
        setError('Access forbidden. Please login again.');
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch timetables');
      
      const data = await response.json();
      if (data.success) {
        setTimetables(data.data?.timetables || data.data || []);
      } else {
        setError(data.msg || 'Failed to fetch timetables');
      }
    } catch (error) {
      console.error('Error fetching timetables:', error);
      setError('Failed to fetch timetables');
    }
    setLoading(false);
  };

  const handleTabChange = (tab) => {
    if (!checkAuth()) return;
    
    setActiveTab(tab);
    setError('');
    
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

  // Render functions for each tab
  const renderUsers = () => (
    <div className="tab-content">
      <div className="content-header">
        <h2>User Management</h2>
        <button className="btn-primary">Add User</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.department || 'N/A'}</td>
                <td>
                  <button className="btn-sm btn-edit">Edit</button>
                  <button className="btn-sm btn-delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loading && (
          <div className="no-data">
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDepartments = () => (
    <div className="tab-content">
      <div className="content-header">
        <h2>Department Management</h2>
        <button className="btn-primary">Add Department</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Code</th>
              <th>Head</th>
              <th>Faculty Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id}>
                <td>{dept.id}</td>
                <td>{dept.name}</td>
                <td>{dept.code}</td>
                <td>{dept.head || 'N/A'}</td>
                <td>{dept.facultyCount || 0}</td>
                <td>
                  <button className="btn-sm btn-edit">Edit</button>
                  <button className="btn-sm btn-delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {departments.length === 0 && !loading && (
          <div className="no-data">
            <p>No departments found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderClassrooms = () => (
    <div className="tab-content">
      <div className="content-header">
        <h2>Classroom Management</h2>
        <button className="btn-primary">Add Classroom</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Capacity</th>
              <th>Type</th>
              <th>Facilities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classrooms.map((classroom) => (
              <tr key={classroom.id}>
                <td>{classroom.id}</td>
                <td>{classroom.name}</td>
                <td>{classroom.capacity}</td>
                <td>{classroom.type || 'Regular'}</td>
                <td>{classroom.facilities?.join(', ') || 'None'}</td>
                <td>
                  <button className="btn-sm btn-edit">Edit</button>
                  <button className="btn-sm btn-delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {classrooms.length === 0 && !loading && (
          <div className="no-data">
            <p>No classrooms found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTimetables = () => (
    <div className="tab-content">
      <div className="content-header">
        <h2>Timetable Management</h2>
        <button className="btn-primary">Generate Timetable</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Department</th>
              <th>Semester</th>
              <th>Academic Year</th>
              <th>Status</th>
              <th>Generated On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {timetables.map((timetable) => (
              <tr key={timetable.id}>
                <td>{timetable.id}</td>
                <td>{timetable.department}</td>
                <td>{timetable.semester}</td>
                <td>{timetable.academicYear}</td>
                <td>
                  <span className={`status-badge ${timetable.status}`}>
                    {timetable.status}
                  </span>
                </td>
                <td>{new Date(timetable.generatedOn).toLocaleDateString()}</td>
                <td>
                  <button className="btn-sm btn-view">View</button>
                  <button className="btn-sm btn-edit">Edit</button>
                  <button className="btn-sm btn-delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {timetables.length === 0 && !loading && (
          <div className="no-data">
            <p>No timetables found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="dashboard-grid">
      {dashboardData ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon faculty">👨‍🏫</div>
              <div className="stat-info">
                <h3>{dashboardData.stats?.totalFaculty || 0}</h3>
                <p>Total Faculty</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon student">🎓</div>
              <div className="stat-info">
                <h3>{dashboardData.stats?.totalStudents || 0}</h3>
                <p>Total Students</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon department">🏛️</div>
              <div className="stat-info">
                <h3>{dashboardData.stats?.totalDepartments || 0}</h3>
                <p>Departments</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon classroom">🏫</div>
              <div className="stat-info">
                <h3>{dashboardData.stats?.totalClassrooms || 0}</h3>
                <p>Classrooms</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon leave">📋</div>
              <div className="stat-info">
                <h3>{dashboardData.stats?.pendingLeaves || 0}</h3>
                <p>Pending Leaves</p>
              </div>
            </div>
          </div>

          <div className="dashboard-content">
            <div className="recent-activities">
              <h3>Recent Activities</h3>
              <div className="activities-list">
                {dashboardData.recentActivities?.map((activity, index) => (
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
                {(!dashboardData.recentActivities || dashboardData.recentActivities.length === 0) && (
                  <div className="no-data">
                    <p>No recent activities</p>
                  </div>
                )}
              </div>
            </div>

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                {dashboardData.quickActions?.map((action, index) => (
                  <button key={index} className="action-btn">
                    {action.label}
                  </button>
                ))}
                {(!dashboardData.quickActions || dashboardData.quickActions.length === 0) && (
                  <div className="no-data">
                    <p>No quick actions available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="no-data">
          <p>No dashboard data available</p>
        </div>
      )}
    </div>
  );

  // Add error display at the top of your render
  if (error && !loading && !checkAuth()) {
    return (
      <div className="admin-container">
        <div className="error-container">
          <h2>Access Error</h2>
          <p>{error}</p>
          <button 
            className="btn-primary" 
            onClick={() => window.location.href = '/auth/login'}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="user-info">
          <span>Welcome, Admin</span>
          <div className="user-avatar">A</div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button className="close-error" onClick={() => setError('')}>×</button>
        </div>
      )}

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
              👥 Users
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
              📊 Reports
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
              {activeTab === 'subjects' && <div className="tab-content"><h2>Subjects Management - Coming Soon</h2></div>}
              {activeTab === 'reports' && <div className="tab-content"><h2>Reports - Coming Soon</h2></div>}
              {activeTab === 'settings' && <div className="tab-content"><h2>System Settings - Coming Soon</h2></div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};