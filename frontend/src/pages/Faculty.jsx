import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Admin.css";

const Faculty = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [activeTab, setActiveTab] = useState('availability');
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const slots = [
    "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", 
    "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"
  ];

  useEffect(() => {
    if (!user || (user.role !== 'faculty' && user.role !== 'hod')) {
      navigate('/auth/login');
    } else {
      fetchAvailability();
    }
  }, []);

  const fetchAvailability = async () => {
    try {
      const response = await fetch('/api/teacher/availability', { credentials: 'include' });
      const result = await response.json();
      if (result.success) setAvailability(result.data || []);
    } catch (err) {
      console.error("Error fetching availability");
    }
  };

  const toggleSlot = (day, slot) => {
    const existing = availability.find(a => a.day === day && a.slot === slot);
    let newStatus = "available";
    
    if (!existing) newStatus = "preferred";
    else if (existing.status === "available") newStatus = "preferred";
    else if (existing.status === "preferred") newStatus = "unavailable";
    else newStatus = "available";

    const filtered = availability.filter(a => !(a.day === day && a.slot === slot));
    setAvailability([...filtered, { day, slot, status: newStatus }]);
  };

  const getSlotColorClass = (day, slot) => {
    const item = availability.find(a => a.day === day && a.slot === slot);
    if (!item) return '';
    if (item.status === 'preferred') return 'preferred';
    if (item.status === 'unavailable') return 'unavailable';
    return '';
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/teacher/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilityData: availability }),
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setMessage('Your schedule preferences have been synchronized.');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      setMessage('Synchronization failed. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>ORARIO <span style={{fontSize: '0.8rem', color: '#666'}}>FACULTY HUB</span></h1>
        <div className="user-info">
          <div style={{textAlign: 'right'}}>
            <p style={{margin: 0, fontWeight: 700}}>Prof. {user?.name}</p>
            <p style={{margin: 0, fontSize: '0.75rem', color: '#64748b'}}>{user?.designation || 'Faculty Member'}</p>
          </div>
          <div className="user-avatar" style={{background: 'var(--accent-gradient)'}}>P</div>
          <button 
             onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
             className="btn-sm btn-delete" style={{marginLeft: '1rem'}}>Logout</button>
        </div>
      </header>

      <div className="admin-content">
        <aside className="sidebar">
          <button className={`nav-item ${activeTab === 'availability' ? 'active' : ''}`} onClick={() => setActiveTab('availability')}>
            📆 Weekly Availability
          </button>
          <button className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
            🏫 Active Schedule
          </button>
          <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            👤 Academic Profile
          </button>
        </aside>

        <main className="main-content">
          <div className="content-header">
             <h2>{activeTab === 'availability' ? 'Manage Your Availability' : 'Active Class Schedule'}</h2>
             {activeTab === 'availability' && (
                <button onClick={handleSave} disabled={loading} className="btn-primary">
                  {loading ? 'Syncing...' : 'Save Preferences'}
                </button>
             )}
          </div>

          {message && <div style={{ padding: '1rem', background: '#dcfce7', color: '#15803d', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 600 }}>{message}</div>}

          {activeTab === 'availability' && (
            <div className="table-container">
              <p style={{color: '#64748b', marginBottom: '1.5rem'}}>Click slots to cycle: ⚪ Standard → 🟢 Preferred (⭐) → 🔴 Unavailable (🚫)</p>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '8px' }}>
                <thead>
                  <tr>
                    <th style={{padding: '1rem', textAlign: 'left', color: '#64748b'}}>Time Slot</th>
                    {days.map(d => <th key={d}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {slots.map(s => (
                    <tr key={s}>
                      <td style={{ fontWeight: 800, color: '#1e293b' }}>{s}</td>
                      {days.map(d => (
                        <td 
                          key={d+s} 
                          onClick={() => toggleSlot(d, s)}
                          className={`availability-cell ${getSlotColorClass(d, s)}`}
                        >
                          {availability.find(a => a.day === d && a.slot === s)?.status === 'preferred' ? '⭐' : 
                           availability.find(a => a.day === d && a.slot === s)?.status === 'unavailable' ? '🚫' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'schedule' && (
             <div style={{textAlign: 'center', padding: '5rem'}}>
                <span style={{fontSize: '3rem'}}>⏳</span>
                <h3>Timetable Release Pending</h3>
                <p style={{color: '#64748b'}}>Once the HOD approves the department draft, your personal schedule will appear here.</p>
             </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Faculty;
