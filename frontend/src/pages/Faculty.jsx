import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Dashboard.css";

const API = (path, opts = {}) =>
  fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });

const days  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const slots = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
               '14:00-15:00', '15:00-16:00', '16:00-17:00'];

const Faculty = () => {
  const navigate  = useNavigate();
  const [user]    = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [activeTab, setActiveTab]   = useState('availability');
  const [availability, setAvail]    = useState([]);
  const [loading,  setLoading]      = useState(false);
  const [saving,   setSaving]       = useState(false);
  const [msg,      setMsg]          = useState({ text: '', type: '' });

  useEffect(() => {
    if (!user || (user.role !== 'faculty' && user.role !== 'hod')) {
      navigate('/auth/login'); return;
    }
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const r = await API('/api/teacher/availability');
      const d = await r.json();
      if (d.success) setAvail(d.data || []);
    } catch { }
    setLoading(false);
  };

  const getStatus = (day, slot) =>
    availability.find(a => a.day === day && a.slot === slot)?.status;

  const toggleSlot = (day, slot) => {
    const cur = getStatus(day, slot);
    let next;
    if (!cur || cur === 'available') next = 'preferred';
    else if (cur === 'preferred')    next = 'unavailable';
    else                             next = 'available';

    setAvail(prev => [...prev.filter(a => !(a.day === day && a.slot === slot)), { day, slot, status: next }]);
  };

  const getClass = (day, slot) => {
    const s = getStatus(day, slot);
    if (s === 'preferred') return 'pref';
    if (s === 'unavailable') return 'busy';
    return '';
  };

  const getEmoji = (day, slot) => {
    const s = getStatus(day, slot);
    if (s === 'preferred') return '⭐';
    if (s === 'unavailable') return '🚫';
    return '';
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const r = await API('/api/teacher/availability', {
        method: 'POST',
        body: JSON.stringify({ availabilityData: availability })
      });
      const d = await r.json();
      if (d.success) {
        setMsg({ text: 'Availability preferences saved successfully!', type: 'success' });
        setTimeout(() => setMsg({ text: '', type: '' }), 4000);
      } else {
        setMsg({ text: d.msg || 'Save failed.', type: 'error' });
      }
    } catch {
      setMsg({ text: 'Network error. Try again.', type: 'error' });
    }
    setSaving(false);
  };

  const logout = () => { localStorage.removeItem('user'); navigate('/'); };

  const navItems = [
    { id: 'availability', icon: '📆', label: 'Availability' },
    { id: 'schedule',     icon: '🏫', label: 'My Schedule' },
    { id: 'profile',      icon: '👤', label: 'My Profile' },
  ];

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : 'F';

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
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-pill-avatar" style={{background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)'}}>
              {getInitial(user?.name)}
            </div>
            <div className="user-pill-info">
              <p className="user-pill-name">Prof. {user?.name || 'Faculty'}</p>
              <p className="user-pill-role">{user?.designation || 'Faculty Member'}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>↩ Logout</button>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <h1 className="topbar-title">{navItems.find(n => n.id === activeTab)?.label || 'Faculty Hub'}</h1>
            <p className="topbar-sub">Faculty Self-Service — ORARIO Platform</p>
          </div>
          {activeTab === 'availability' && (
            <button className="btn-primary" onClick={saveAvailability} disabled={saving}>
              {saving ? '⏳ Saving…' : '💾 Save Preferences'}
            </button>
          )}
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
              {/* ── AVAILABILITY TAB ── */}
              {activeTab === 'availability' && (
                <div className="panel-full">
                  <div style={{marginBottom:'1.5rem'}}>
                    <h3 style={{fontWeight:800, fontSize:'1.1rem'}}>Set Your Weekly Availability</h3>
                    <p style={{color:'var(--muted)', marginTop:'.4rem', fontSize:'.9rem'}}>
                      Click cells to cycle: ⬜ Standard → ⭐ Preferred → 🚫 Unavailable
                    </p>
                  </div>

                  <div className="avail-grid">
                    <table className="avail-table">
                      <thead>
                        <tr>
                          <th style={{textAlign:'left', paddingLeft:'1rem'}}>Time Slot</th>
                          {days.map(d => <th key={d}>{d}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {slots.map(s => (
                          <tr key={s}>
                            <td style={{padding:'.6rem 1rem', fontWeight:700, fontSize:'.85rem', color:'var(--text)', whiteSpace:'nowrap'}}>{s}</td>
                            {days.map(d => (
                              <td key={d+s} style={{padding:0}}>
                                <div
                                  className={`avail-cell ${getClass(d, s)}`}
                                  onClick={() => toggleSlot(d, s)}
                                >
                                  {getEmoji(d, s)}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{display:'flex', gap:'2rem', marginTop:'1.5rem', fontSize:'.85rem', fontWeight:600, color:'var(--muted)'}}>
                    <span style={{display:'flex', alignItems:'center', gap:'.4rem'}}><span className="avail-cell" style={{width:24, height:24, display:'inline-flex'}}></span> Standard</span>
                    <span style={{display:'flex', alignItems:'center', gap:'.4rem'}}><span className="avail-cell pref" style={{width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'.8rem'}}>⭐</span> Preferred</span>
                    <span style={{display:'flex', alignItems:'center', gap:'.4rem'}}><span className="avail-cell busy" style={{width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'.8rem'}}>🚫</span> Unavailable</span>
                  </div>
                </div>
              )}

              {/* ── SCHEDULE TAB ── */}
              {activeTab === 'schedule' && (
                <div className="no-data-state">
                  <div className="icon">📅</div>
                  <h3>Your Timetable Will Appear Here</h3>
                  <p>Once your HOD approves the department timetable and it is published, your personal class schedule will be displayed here automatically.</p>
                </div>
              )}

              {/* ── PROFILE TAB ── */}
              {activeTab === 'profile' && (
                <div className="panel-full">
                  <h3 className="panel-title">Academic Profile</h3>
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
                      <label>Role</label>
                      <input type="text" readOnly value={user?.role || ''} />
                    </div>
                    <div className="form-group">
                      <label>Designation</label>
                      <input type="text" readOnly value={user?.designation || 'Not specified'} />
                    </div>
                  </div>
                  <div style={{marginTop:'1rem', padding:'1rem', background:'var(--bg)', borderRadius:12, fontSize:'.85rem', color:'var(--muted)'}}>
                    💡 To update your profile, please reach out to your department administrator.
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

export default Faculty;
