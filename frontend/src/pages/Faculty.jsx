import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Faculty = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
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

  const getSlotColor = (day, slot) => {
    const item = availability.find(a => a.day === day && a.slot === slot);
    if (!item) return '#f8f9fa';
    if (item.status === 'preferred') return '#d4edda'; // Greenish
    if (item.status === 'unavailable') return '#f8d7da'; // Reddish
    return '#e2e3e5'; // Grayish available
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
        setMessage('Availability updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setMessage('Failed to save availability.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
           <h1 style={{ margin: 0, color: '#2c3e50' }}>Faculty Dashboard - ORARIO</h1>
           <p style={{ color: '#7f8c8d' }}>Welcome back, Prof. {user?.name}</p>
        </div>
        <button 
          onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
          style={{ padding: '0.6rem 1.2rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Logout
        </button>
      </header>

      <main>
        <section style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
                <h2 style={{ margin: 0 }}>Mark Your Weekly Availability</h2>
                <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>Click on slots to cycle: ⚪ Available → 🟢 Preferred → 🔴 Unavailable</p>
            </div>
            <button 
              onClick={handleSave} 
              disabled={loading}
              style={{ padding: '0.8rem 1.5rem', background: '#2980b9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>

          {message && <div style={{ padding: '1rem', background: '#d1ecf1', color: '#0c5460', borderRadius: '6px', marginBottom: '1rem' }}>{message}</div>}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr>
                  <th style={{ padding: '1rem', border: '1px solid #dee2e6' }}>Time / Day</th>
                  {days.map(d => <th key={d} style={{ padding: '1rem', border: '1px solid #dee2e6' }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {slots.map(s => (
                  <tr key={s}>
                    <td style={{ padding: '1rem', border: '1px solid #dee2e6', fontWeight: 'bold', background: '#f8f9fa' }}>{s}</td>
                    {days.map(d => (
                      <td 
                        key={d+s} 
                        onClick={() => toggleSlot(d, s)}
                        style={{ 
                          padding: '1rem', 
                          border: '1px solid #dee2e6', 
                          cursor: 'pointer', 
                          background: getSlotColor(d, s),
                          transition: 'all 0.2s'
                        }}
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
        </section>
      </main>
    </div>
  );
};

export default Faculty;

