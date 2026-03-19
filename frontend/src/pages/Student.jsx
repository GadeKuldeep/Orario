import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Admin.css";

const Student = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [activeTab, setActiveTab] = useState('schedule');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/auth/login');
    }
  }, []);

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>ORARIO <span style={{fontSize: '0.8rem', color: '#666'}}>STUDENT PORTAL</span></h1>
        <div className="user-info">
          <div style={{textAlign: 'right'}}>
            <p style={{margin: 0, fontWeight: 700}}>{user?.name}</p>
            <p style={{margin: 0, fontSize: '0.75rem', color: '#64748b'}}>Student • Sem {user?.semester || 0}</p>
          </div>
          <div className="user-avatar" style={{background: 'var(--success-gradient)'}}>S</div>
          <button 
             onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
             className="btn-sm btn-delete" style={{marginLeft: '1rem'}}>Logout</button>
        </div>
      </header>

      <div className="admin-content">
        <aside className="sidebar">
          <button className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
            📚 Class Schedule
          </button>
          <button className={`nav-item ${activeTab === 'exams' ? 'active' : ''}`} onClick={() => setActiveTab('exams')}>
            📝 Exam Schedule
          </button>
          <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            👤 Student Profile
          </button>
        </aside>

        <main className="main-content">
          <div className="content-header">
             <h2>{activeTab === 'schedule' ? 'Weekly Academic Schedule' : 'Student Information'}</h2>
          </div>

          {activeTab === 'schedule' && (
             <div style={{textAlign: 'center', padding: '5rem', background: 'white', borderRadius: '24px', boxShadow: 'var(--card-shadow)'}}>
                <div style={{fontSize: '4rem', marginBottom: '1.5rem'}}>📅</div>
                <h3 style={{fontSize: '1.8rem', fontWeight: 800, color: '#1e293b'}}>Your Schedule is Processing</h3>
                <p style={{color: '#64748b', fontSize: '1.1rem', maxWidth: '500px', margin: 'auto'}}>The Department of Computer Science is finalizing the term timetable. You will receive a notification once it is published.</p>
                <button className="btn-primary" style={{marginTop: '2rem'}}>Enable Notifications</button>
             </div>
          )}

          {activeTab === 'exams' && (
             <div className="table-container">
                <p style={{textAlign: 'center', padding: '2rem'}}>No upcoming exams scheduled for Semester {user?.semester}.</p>
             </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Student;
