import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Admin.css"; // Reuse Admin styles for consistency

const HOD = () => {
  const [activeTab, setActiveTab] = useState('review');
  const [draftTimetables, setDraftTimetables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!user || user.role !== 'hod') {
      navigate('/auth/login');
    } else {
        fetchDrafts();
    }
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/timetables?status=draft&department=${user.department}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setDraftTimetables(data.data || []);
      }
    } catch (err) {
      setError('Failed to fetch draft timetables');
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
      const data = await response.json();
      if (data.success) {
        alert('Timetable approved successfully!');
        fetchDrafts();
      }
    } catch (err) {
      alert('Error during approval');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)' }}>
        <h1>HOD Portal - ORARIO</h1>
        <div className="user-info">
          <span>Welcome, Head of Dept. {user?.name}</span>
          <div className="user-avatar" style={{ background: '#e67e22' }}>H</div>
        </div>
      </div>

      <div className="admin-content">
        <div className="sidebar" style={{ width: '200px' }}>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>
              📋 Review Drafts
            </button>
            <button className={`nav-item ${activeTab === 'faculty' ? 'active' : ''}`} onClick={() => setActiveTab('faculty')}>
              👨‍🏫 Dept. Faculty
            </button>
          </nav>
        </div>

        <div className="main-content">
            <div className="tab-content">
                <h2>Pending Timetable Reviews</h2>
                <p>Review the AI-generated drafts below and approve the most suitable one for this semester.</p>
                
                {loading ? <p>Loading draft options...</p> : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Option Name</th>
                                    <th>Fitness Score</th>
                                    <th>Generated On</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {draftTimetables.map(dt => (
                                    <tr key={dt._id}>
                                        <td>{dt.title}</td>
                                        <td>
                                            <span style={{ color: dt.optimizationMetrics?.fitnessScore > 85 ? 'green' : 'orange' }}>
                                                {dt.optimizationMetrics?.fitnessScore || 0}%
                                            </span>
                                        </td>
                                        <td>{new Date(dt.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <button className="btn-sm btn-view" style={{ background: '#3498db' }}>View Details</button>
                                            <button className="btn-sm btn-edit" style={{ background: '#27ae60' }} onClick={() => handleApprove(dt._id)}>Approve & Publish</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {draftTimetables.length === 0 && <p className="no-data">No draft timetables pending review for your department.</p>}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default HOD;
