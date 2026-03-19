import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Dashboard.css";

const API = (path, opts = {}) =>
  fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });

const Student = () => {
  const navigate  = useNavigate();
  const [user]    = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [activeTab, setActiveTab] = useState('schedule');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'student') { navigate('/auth/login'); return; }
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const r = await API('/api/notification');
      const d = await r.json();
      if (d.success) setNotifications(d.data || []);
    } catch { }
    setLoading(false);
  };

  const logout = () => { localStorage.removeItem('user'); navigate('/'); };

  const navItems = [
    { id: 'schedule',       icon: '📚', label: 'Class Schedule' },
    { id: 'exams',          icon: '📝', label: 'Exams' },
    { id: 'notifications',  icon: '🔔', label: 'Notifications' },
    { id: 'profile',        icon: '👤', label: 'My Profile' },
  ];

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : 'S';

  return (
    <div className="dash-shell">
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
              {n.id === 'notifications' && notifications.filter(n => !n.isRead).length > 0 && (
                <span style={{
                  marginLeft:'auto', background:'#ef4444', color:'white',
                  borderRadius:'50%', width:18, height:18, fontSize:'.7rem',
                  fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center'
                }}>
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-pill-avatar" style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
              {getInitial(user?.name)}
            </div>
            <div className="user-pill-info">
              <p className="user-pill-name">{user?.name || 'Student'}</p>
              <p className="user-pill-role">Semester {user?.semester || '—'}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>↩ Logout</button>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <h1 className="topbar-title">{navItems.find(n => n.id === activeTab)?.label || 'Student Portal'}</h1>
            <p className="topbar-sub">ORARIO Student Academic Portal</p>
          </div>
          <div className="topbar-right">
            <div style={{
              padding:'.4rem 1rem', background:'var(--bg)', borderRadius:8,
              fontSize:'.85rem', fontWeight:700, color:'var(--muted)'
            }}>
              📅 Semester {user?.semester || '—'}
            </div>
          </div>
        </header>

        <div className="dash-body">
          {loading ? (
            <div className="loader-wrap"><div className="loader-ring"></div><p>Loading…</p></div>
          ) : (
            <>
              {/* ── SCHEDULE TAB ── */}
              {activeTab === 'schedule' && (
                <div>
                  <div className="kpi-grid">
                    <div className="kpi-card" style={{'--accent':'#3b82f6'}}>
                      <div className="kpi-icon">📖</div>
                      <div className="kpi-body">
                        <span className="kpi-value">Sem {user?.semester || '—'}</span>
                        <span className="kpi-label">Current Semester</span>
                      </div>
                    </div>
                    <div className="kpi-card" style={{'--accent':'#10b981'}}>
                      <div className="kpi-icon">🔔</div>
                      <div className="kpi-body">
                        <span className="kpi-value">{notifications.filter(n => !n.isRead).length}</span>
                        <span className="kpi-label">Unread Notifications</span>
                      </div>
                    </div>
                    <div className="kpi-card" style={{'--accent':'#8b5cf6'}}>
                      <div className="kpi-icon">🎓</div>
                      <div className="kpi-body">
                        <span className="kpi-value">{user?.uniqueId || 'N/A'}</span>
                        <span className="kpi-label">Student ID</span>
                      </div>
                    </div>
                  </div>

                  <div className="no-data-state" style={{background:'white', borderRadius:'var(--radius)', padding:'4rem', boxShadow:'var(--shadow)'}}>
                    <div className="icon">📅</div>
                    <h3>Your Timetable is Being Finalized</h3>
                    <p>
                      The Department of {user?.department?.name || 'your department'} is currently finalizing
                      the academic timetable. You will receive a notification as soon as it is published.
                    </p>
                    <button className="btn-primary" style={{marginTop:'1.5rem'}} onClick={fetchNotifications}>
                      🔄 Check for Updates
                    </button>
                  </div>
                </div>
              )}

              {/* ── EXAMS TAB ── */}
              {activeTab === 'exams' && (
                <div className="no-data-state" style={{background:'white', borderRadius:'var(--radius)', boxShadow:'var(--shadow)'}}>
                  <div className="icon">📝</div>
                  <h3>No Exam Schedule Yet</h3>
                  <p>No upcoming exams have been scheduled for Semester {user?.semester}. Check back closer to the term end.</p>
                </div>
              )}

              {/* ── NOTIFICATIONS TAB ── */}
              {activeTab === 'notifications' && (
                <div className="panel-full">
                  <div className="panel-header">
                    <h2>Notifications</h2>
                    <span className="count-badge">{notifications.length} total</span>
                  </div>

                  {notifications.length > 0 ? notifications.map(n => (
                    <div key={n._id} className="activity-row" style={{
                      padding:'1rem', borderRadius:12, marginBottom:'.5rem',
                      background: n.isRead ? 'var(--bg)' : 'rgba(79,70,229,.05)',
                      borderLeft: `4px solid ${n.isRead ? 'var(--border)' : 'var(--primary)'}`
                    }}>
                      <div className="act-dot" style={{background: n.isRead ? '#cbd5e1' : 'var(--primary)'}}></div>
                      <div style={{flex:1}}>
                        <p className="act-name">{n.title}</p>
                        <p className="act-time">{n.message}</p>
                        <p className="act-time" style={{marginTop:'.2rem'}}>{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`tag tag-${n.priority === 'high' ? 'published' : 'draft'}`}>{n.priority}</span>
                    </div>
                  )) : (
                    <div className="no-data-state" style={{padding:'3rem'}}>
                      <div className="icon">🔔</div>
                      <h3>No Notifications Yet</h3>
                      <p>You're all caught up! Check back for timetable updates and announcements.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── PROFILE TAB ── */}
              {activeTab === 'profile' && (
                <div className="panel-full">
                  <h3 className="panel-title">Student Profile</h3>
                  <div style={{display:'flex', alignItems:'center', gap:'1.5rem', marginBottom:'2rem',
                    padding:'1.5rem', background:'linear-gradient(135deg,rgba(79,70,229,.08),rgba(16,185,129,.06))',
                    borderRadius:'var(--radius)', border:'1px solid rgba(79,70,229,.12)'}}>
                    <div style={{
                      width:70, height:70, borderRadius:18,
                      background:'linear-gradient(135deg,#10b981,#059669)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'2rem', color:'white', fontWeight:800, flexShrink:0
                    }}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 style={{fontWeight:900, fontSize:'1.4rem'}}>{user?.name}</h2>
                      <p style={{color:'var(--muted)', fontSize:'.9rem', marginTop:'.2rem'}}>
                        {user?.email} · Semester {user?.semester} · <span className="role-tag role-student">STUDENT</span>
                      </p>
                    </div>
                  </div>

                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem'}}>
                    <div className="form-group">
                      <label>Full Name</label>
                      <input type="text" readOnly value={user?.name || ''} />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input type="email" readOnly value={user?.email || ''} />
                    </div>
                    <div className="form-group">
                      <label>Student ID</label>
                      <input type="text" readOnly value={user?.uniqueId || 'Not assigned'} />
                    </div>
                    <div className="form-group">
                      <label>Current Semester</label>
                      <input type="text" readOnly value={`Semester ${user?.semester || '—'}`} />
                    </div>
                  </div>

                  <div style={{marginTop:'1rem', padding:'1rem', background:'var(--bg)', borderRadius:12, fontSize:'.85rem', color:'var(--muted)'}}>
                    💡 To update your information, please contact your department HOD or system administrator.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Student;
