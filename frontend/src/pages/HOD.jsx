import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Dashboard.css";

const API = (path, opts = {}) =>
  fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });

const days  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const slots = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
               '14:00-15:00', '15:00-16:00', '16:00-17:00'];

const HOD = () => {
  const navigate = useNavigate();
  const [user]   = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timetables, setTimetables]   = useState([]);
  const [facStats,   setFacStats]     = useState({ total: 0, available: 0, onLeave: 0 });
  const [loading,    setLoading]      = useState(true);
  const [msg,        setMsg]          = useState({ text: '', type: '' });

  useEffect(() => {
    if (!user || user.role !== 'hod') { navigate('/auth/login'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ttRes] = await Promise.all([
        API('/api/admin/timetables?status=draft&status=approved'),
      ]);
      const ttData = await ttRes.json();
      if (ttData.success) setTimetables(ttData.data?.timetables || ttData.data || []);
    } catch { setMsg({ text: 'Failed to load data.', type: 'error' }); }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    try {
      const r = await API(`/api/admin/timetable/${id}/approve`, { method: 'PUT' });
      const d = await r.json();
      if (d.success) {
        setMsg({ text: 'Timetable approved successfully!', type: 'success' });
        loadData();
      } else {
        setMsg({ text: d.msg || 'Approval failed', type: 'error' });
      }
    } catch { setMsg({ text: 'Network error during approval.', type: 'error' }); }
  };

  const logout = () => { localStorage.removeItem('user'); navigate('/'); };

  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Overview' },
    { id: 'drafts',    icon: '⏳', label: 'Pending Drafts' },
    { id: 'faculty',   icon: '👥', label: 'Faculty' },
  ];

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : 'H';

  return (
    <div className="dash-shell">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="sidebar-brand">
          <span className="brand-logo">⏱</span>
          <span className="brand-name">ORARIO</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(n => (
            <button key={n.id} className={`nav-btn ${activeTab === n.id ? 'active' : ''}`}
              onClick={() => setActiveTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-pill-avatar" style={{background: 'linear-gradient(135deg,#10b981,#059669)'}}>
              {getInitial(user?.name)}
            </div>
            <div className="user-pill-info">
              <p className="user-pill-name">{user?.name || 'HOD'}</p>
              <p className="user-pill-role">Head of Department</p>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>↩ Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <h1 className="topbar-title">
              {navItems.find(n => n.id === activeTab)?.label || 'HOD Dashboard'}
            </h1>
            <p className="topbar-sub">Department Head — Orario Management System</p>
          </div>
          <div className="topbar-right">
            <span className="live-dot"></span>
            <span className="live-text">Department Active</span>
          </div>
        </header>

        <div className="dash-body">
          {msg.text && (
            <div className={`alert alert-${msg.type}`}>
              {msg.type === 'success' ? '✅' : '⚠️'} {msg.text}
              <button onClick={() => setMsg({ text: '', type: '' })}>×</button>
            </div>
          )}

          {loading ? (
            <div className="loader-wrap"><div className="loader-ring"></div><p>Loading…</p></div>
          ) : (
            <>
              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'dashboard' && (
                <div>
                  <div className="kpi-grid">
                    <div className="kpi-card" style={{'--accent': '#3b82f6'}}>
                      <div className="kpi-icon">👨‍🏫</div>
                      <div className="kpi-body">
                        <span className="kpi-value">{timetables.length}</span>
                        <span className="kpi-label">Timetables Generated</span>
                      </div>
                    </div>
                    <div className="kpi-card" style={{'--accent': '#f59e0b'}}>
                      <div className="kpi-icon">⏳</div>
                      <div className="kpi-body">
                        <span className="kpi-value">{timetables.filter(t => t.status === 'draft').length}</span>
                        <span className="kpi-label">Awaiting Approval</span>
                      </div>
                    </div>
                    <div className="kpi-card" style={{'--accent': '#10b981'}}>
                      <div className="kpi-icon">✅</div>
                      <div className="kpi-body">
                        <span className="kpi-value">{timetables.filter(t => t.status === 'approved').length}</span>
                        <span className="kpi-label">Approved Timetables</span>
                      </div>
                    </div>
                    <div className="kpi-card" style={{'--accent': '#8b5cf6'}}>
                      <div className="kpi-icon">🚀</div>
                      <div className="kpi-body">
                        <span className="kpi-value">{timetables.filter(t => t.status === 'published').length}</span>
                        <span className="kpi-label">Published Timetables</span>
                      </div>
                    </div>
                  </div>

                  <div className="panel">
                    <h3 className="panel-title">📅 All Timetables in Your Department</h3>
                    {timetables.length === 0
                      ? <p className="empty-msg">No timetables generated yet. Ask admin to generate one.</p>
                      : timetables.map(t => (
                          <div key={t._id} className="activity-row">
                            <div className="act-dot" style={{background: t.status === 'draft' ? '#f59e0b' : t.status === 'approved' ? '#10b981' : '#3b82f6'}}></div>
                            <div style={{flex:1}}>
                              <p className="act-name">{t.title || 'Untitled Timetable'}</p>
                              <p className="act-time">Semester {t.semester} · {t.academicYear} · Fitness: {((t.optimizationMetrics?.fitnessScore || 0) * 100).toFixed(1)}%</p>
                            </div>
                            <span className={`tag tag-${t.status}`}>{t.status}</span>
                            {t.status === 'draft' && (
                              <button className="btn-sm btn-approve" onClick={() => handleApprove(t._id)}>Approve</button>
                            )}
                          </div>
                        ))
                    }
                  </div>
                </div>
              )}

              {/* ── DRAFTS TAB ── */}
              {activeTab === 'drafts' && (
                <div className="panel-full">
                  <div className="panel-header">
                    <h2>AI-Generated Timetable Drafts</h2>
                    <span className="count-badge">{timetables.filter(t=>t.status==='draft').length} pending</span>
                  </div>
                  <div className="table-wrap">
                    <table className="data-tbl">
                      <thead>
                        <tr>
                          <th>Title</th><th>Semester</th><th>Academic Year</th>
                          <th>Fitness Score</th><th>Status</th><th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timetables.filter(t => t.status === 'draft').length > 0
                          ? timetables.filter(t => t.status === 'draft').map(t => (
                              <tr key={t._id}>
                                <td><strong>{t.title || 'Untitled'}</strong></td>
                                <td>Semester {t.semester}</td>
                                <td>{t.academicYear}</td>
                                <td>
                                  <span className="tag tag-approved">
                                    {((t.optimizationMetrics?.fitnessScore || 0) * 100).toFixed(1)}%
                                  </span>
                                </td>
                                <td><span className="tag tag-draft">Draft</span></td>
                                <td>
                                  <button className="btn-sm btn-approve" onClick={() => handleApprove(t._id)}>
                                    ✅ Approve
                                  </button>
                                </td>
                              </tr>
                            ))
                          : <tr><td colSpan={6} className="empty-cell">No pending drafts to review.</td></tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── FACULTY TAB ── */}
              {activeTab === 'faculty' && (
                <div className="no-data-state">
                  <div className="icon">👥</div>
                  <h3>Faculty Workload Coming Soon</h3>
                  <p>Detailed per-faculty schedule hours and workload balancing will appear here once timetables are approved and published.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default HOD;
