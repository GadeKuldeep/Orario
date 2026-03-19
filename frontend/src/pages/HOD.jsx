import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Admin.css";

const HOD = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'hod') {
      navigate('/auth/login');
    } else {
      fetchTimetables();
    }
  }, []);

  const fetchTimetables = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/timetables?status=draft', { credentials: 'include' });
      const result = await response.json();
      if (result.success) setTimetables(result.data || []);
    } catch (err) {
      setError("Failed to sync schedules.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const response = await fetch(`/api/admin/timetable/${id}/approve`, {
        method: 'PUT',
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        alert("Timetable approved successfully!");
        fetchTimetables();
      }
    } catch (err) {
      alert("Approval failed.");
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>ORARIO <span style={{fontSize: '0.8rem', color: '#666'}}>DEPT. HEAD</span></h1>
        <div className="user-info">
          <div style={{textAlign: 'right'}}>
            <p style={{margin: 0, fontWeight: 700}}>{user?.name}</p>
            <p style={{margin: 0, fontSize: '0.75rem', color: '#64748b'}}>Department Head</p>
          </div>
          <div className="user-avatar" style={{background: 'var(--success-gradient)'}}>H</div>
          <button 
            onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
            style={{ marginLeft: '1rem', padding: '0.5rem 1rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >Logout</button>
        </div>
      </header>

      <div className="admin-content">
        <aside className="sidebar">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            📊 Dept. Overview
          </button>
          <button className={`nav-item ${activeTab === 'drafts' ? 'active' : ''}`} onClick={() => setActiveTab('drafts')}>
            ⏳ Pending Reviews
          </button>
          <button className={`nav-item ${activeTab === 'faculty' ? 'active' : ''}`} onClick={() => setActiveTab('faculty')}>
            👥 Faculty Workload
          </button>
        </aside>

        <main className="main-content">
          <div className="content-header">
             <h2>{activeTab === 'dashboard' ? 'Departmental Insights' : activeTab === 'drafts' ? 'AI Timetable Drafts' : 'Faculty Management'}</h2>
          </div>

          {activeTab === 'drafts' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Semester</th>
                    <th>Fitness Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timetables.map(t => (
                    <tr key={t._id}>
                      <td>v{t.version}</td>
                      <td>Semester {t.semester}</td>
                      <td><span className="status-badge active">{(t.optimizationMetrics?.fitnessScore * 100).toFixed(1)}%</span></td>
                      <td>
                        <button className="btn-sm btn-view" onClick={() => alert("Detailed view pending")}>Analyze</button>
                        <button className="btn-sm btn-primary" onClick={() => handleApprove(t._id)}>Approve</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {timetables.length === 0 && <p style={{textAlign: 'center', padding: '2rem'}}>No pending drafts for review.</p>}
            </div>
          )}

          {activeTab === 'dashboard' && (
             <div className="stats-grid">
               <div className="stat-card">
                  <div className="stat-icon faculty">👨‍🏫</div>
                  <div className="stat-info"><h3>12</h3><p>Active Faculty</p></div>
               </div>
               <div className="stat-card">
                  <div className="stat-icon classroom">🏫</div>
                  <div className="stat-info"><h3>04</h3><p>Dedicated Labs</p></div>
               </div>
             </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default HOD;
