import React, { useState, useEffect, useCallback } from 'react';
import "./Dashboard.css";

const API = async (path, opts = {}) => {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  return res;
};

/* ─── Reusable Modal ─── */
const Modal = ({ title, children, onClose }) => (
  <div style={{
    position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000,
    display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem'
  }}>
    <div style={{
      background:'white', borderRadius:20, width:'100%', maxWidth:520,
      boxShadow:'0 25px 60px rgba(0,0,0,.25)', overflow:'hidden'
    }}>
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'1.5rem 2rem', borderBottom:'1px solid #e2e8f0'
      }}>
        <h3 style={{fontWeight:800, fontSize:'1.1rem'}}>{title}</h3>
        <button onClick={onClose} style={{
          background:'#f1f5f9', border:'none', borderRadius:8, width:32, height:32,
          cursor:'pointer', fontSize:'1.1rem', color:'#64748b'
        }}>×</button>
      </div>
      <div style={{padding:'2rem'}}>{children}</div>
    </div>
  </div>
);

/* ─── Main Admin Component ─── */
export const Admin = () => {
  const [user] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState(null); // { type, data }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      window.location.href = user ? `/${user.role}/dashboard` : '/auth/login';
      return;
    }
    fetchDashboard();
  }, []);

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };
  const showError   = (msg) => { setError(msg);   setTimeout(() => setError(''), 5000); };

  /* ── Fetch helpers ── */
  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const r = await API('/api/admin/dashboard');
      if (r.status === 401 || r.status === 403) { localStorage.removeItem('user'); window.location.href='/auth/login'; return; }
      const d = await r.json();
      if (d.success) setDashboardData(d.data);
      else showError(d.msg || 'Dashboard load failed');
    } catch { showError('Network error loading dashboard.'); }
    setLoading(false);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API('/api/admin/users');
      const d = await r.json();
      if (d.success) setUsers(d.data?.users || d.data || []);
      else showError(d.msg || 'Failed to load users');
    } catch { showError('Failed to load users'); }
    setLoading(false);
  }, []);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API('/api/admin/departments');
      const d = await r.json();
      if (d.success) setDepartments(d.data || []);
      else showError(d.msg || 'Failed to load departments');
    } catch { showError('Failed to load departments'); }
    setLoading(false);
  }, []);

  const fetchClassrooms = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API('/api/admin/classrooms');
      const d = await r.json();
      if (d.success) setClassrooms(d.data || []);
      else showError(d.msg || 'Failed to load classrooms');
    } catch { showError('Failed to load classrooms'); }
    setLoading(false);
  }, []);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API('/api/admin/subjects');
      const d = await r.json();
      if (d.success) setSubjects(d.data?.subjects || d.data || []);
      else showError(d.msg || 'Failed to load subjects');
    } catch { showError('Failed to load subjects'); }
    setLoading(false);
  }, []);

  const fetchTimetables = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API('/api/admin/timetables');
      const d = await r.json();
      if (d.success) setTimetables(d.data?.timetables || d.data || []);
      else showError(d.msg || 'Failed to load timetables');
    } catch { showError('Failed to load timetables'); }
    setLoading(false);
  }, []);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError(''); setSuccess('');
    if (tab === 'dashboard') fetchDashboard();
    if (tab === 'users') fetchUsers();
    if (tab === 'departments') fetchDepartments();
    if (tab === 'classrooms') fetchClassrooms();
    if (tab === 'subjects') fetchSubjects();
    if (tab === 'timetables') fetchTimetables();
  };

  /* ── CRUD Actions ── */
  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      const r = await API(`/api/admin/users/${userId}/status`, { method:'PUT', body: JSON.stringify({ isActive: false }) });
      const d = await r.json();
      if (d.success) { showSuccess('User deactivated successfully.'); fetchUsers(); }
      else showError(d.msg || 'Failed to deactivate user');
    } catch { showError('Error deactivating user'); }
  };

  const handleDeleteDept = async (deptId, name) => {
    if (!window.confirm(`Delete department "${name}"?`)) return;
    try {
      const r = await API(`/api/admin/departments/${deptId}`, { method:'DELETE' });
      const d = await r.json();
      const msg = d.message || d.msg;
      if (d.success) { showSuccess('Department deleted.'); fetchDepartments(); }
      else showError(msg || 'Cannot delete — it may have assigned users or subjects.');
    } catch { showError('Error deleting department'); }
  };

  const handleDeleteClassroom = async (id, name) => {
    if (!window.confirm(`Delete classroom "${name}"?`)) return;
    try {
      const r = await API(`/api/admin/classrooms/${id}`, { method:'DELETE' });
      const d = await r.json();
      if (d.success) { showSuccess('Classroom deleted.'); fetchClassrooms(); }
      else showError(d.msg || d.message || 'Failed to delete classroom');
    } catch { showError('Error deleting classroom'); }
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try {
      const r = await API(`/api/admin/subjects/${id}`, { method:'DELETE' });
      const d = await r.json();
      if (d.success) { showSuccess('Subject deleted.'); fetchSubjects(); }
      else showError(d.msg || d.message || 'Failed to delete subject');
    } catch { showError('Error deleting subject'); }
  };

  const handleDeleteTimetable = async (id) => {
    if (!window.confirm('Delete this timetable? This also removes its optimization logs.')) return;
    try {
      const r = await API(`/api/admin/timetable/${id}`, { method:'DELETE' });
      const d = await r.json();
      if (d.success) { showSuccess('Timetable deleted.'); fetchTimetables(); }
      else showError(d.msg || 'Failed to delete timetable');
    } catch { showError('Error deleting timetable'); }
  };

  const handleApproveTimetable = async (id) => {
    try {
      const r = await API(`/api/admin/timetable/${id}/approve`, { method:'PUT' });
      const d = await r.json();
      if (d.success) { showSuccess('Timetable approved!'); fetchTimetables(); }
      else showError(d.msg || 'Failed to approve');
    } catch { showError('Error approving timetable'); }
  };

  const handlePublishTimetable = async (id) => {
    if (!window.confirm('Publish this timetable? Students and faculty will be able to see it.')) return;
    try {
      const r = await API(`/api/admin/timetable/${id}/publish`, { method:'PUT' });
      const d = await r.json();
      if (d.success) { showSuccess('Timetable published successfully!'); fetchTimetables(); }
      else showError(d.msg || 'Failed to publish');
    } catch { showError('Error publishing timetable'); }
  };

  const logout = () => { localStorage.removeItem('user'); window.location.href = '/'; };

  const navItems = [
    { id: 'dashboard',   icon: '📊', label: 'Dashboard' },
    { id: 'users',       icon: '👥', label: 'Users' },
    { id: 'departments', icon: '🏛️', label: 'Departments' },
    { id: 'classrooms',  icon: '🏫', label: 'Classrooms' },
    { id: 'subjects',    icon: '📚', label: 'Subjects' },
    { id: 'timetables',  icon: '📅', label: 'Timetables' },
    { id: 'reports',     icon: '📈', label: 'Analytics' },
  ];

  return (
    <div className="dash-shell">
      {modal && renderModal(modal, setModal, departments, showSuccess, showError, fetchUsers, fetchDepartments, fetchClassrooms, fetchSubjects, fetchTimetables)}

      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="sidebar-brand">
          <span className="brand-logo">⏱</span>
          <span className="brand-name">ORARIO</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(n => (
            <button key={n.id} className={`nav-btn ${activeTab === n.id ? 'active' : ''}`} onClick={() => switchTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-pill-avatar">A</div>
            <div className="user-pill-info">
              <p className="user-pill-name">{user?.name || 'Super Admin'}</p>
              <p className="user-pill-role">{user?.email}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>↩ Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <h1 className="topbar-title">{navItems.find(n => n.id === activeTab)?.label}</h1>
            <p className="topbar-sub">ORARIO Admin Control Center</p>
          </div>
          <div className="topbar-right">
            <span className="live-dot"></span>
            <span className="live-text">System Live</span>
          </div>
        </header>

        <div className="dash-body">
          {error   && <div className="alert alert-error">⚠️ {error} <button onClick={() => setError('')}>×</button></div>}
          {success && <div className="alert alert-success">✅ {success} <button onClick={() => setSuccess('')}>×</button></div>}

          {loading ? (
            <div className="loader-wrap"><div className="loader-ring"></div><p>Loading…</p></div>
          ) : (
            <>
              {activeTab === 'dashboard'   && <DashboardTab data={dashboardData} onTabSwitch={switchTab} />}
              {activeTab === 'users'       && <UsersTab users={users} onAdd={() => setModal({type:'addFaculty'})} onDelete={handleDeleteUser} onEdit={(u) => setModal({type:'editUser', data:u})} />}
              {activeTab === 'departments' && <DepartmentsTab departments={departments} onAdd={() => setModal({type:'addDept'})} onDelete={handleDeleteDept} onEdit={(d) => setModal({type:'editDept', data:d})} />}
              {activeTab === 'classrooms'  && <ClassroomsTab classrooms={classrooms} departments={departments} onAdd={() => setModal({type:'addClassroom'})} onDelete={handleDeleteClassroom} />}
              {activeTab === 'subjects'    && <SubjectsTab subjects={subjects} departments={departments} onAdd={() => setModal({type:'addSubject'})} onDelete={handleDeleteSubject} />}
              {activeTab === 'timetables'  && <TimetablesTab timetables={timetables} departments={departments} onGenerate={() => setModal({type:'generateTimetable'})} onApprove={handleApproveTimetable} onPublish={handlePublishTimetable} onDelete={handleDeleteTimetable} />}
              {activeTab === 'reports'     && <ReportsTab />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

/* ─── Modal Renderer ─── */
function renderModal(modal, setModal, departments, showSuccess, showError, fetchUsers, fetchDeptsFn, fetchClassrooms, fetchSubjects, fetchTimetables) {
  const close = () => setModal(null);

  if (modal.type === 'addFaculty') return (
    <AddFacultyModal departments={departments} onClose={close} onSuccess={() => { showSuccess('Faculty added!'); fetchUsers(); close(); }} onError={showError} />
  );
  if (modal.type === 'editUser') return (
    <EditUserModal user={modal.data} onClose={close} onSuccess={() => { showSuccess('User updated!'); fetchUsers(); close(); }} onError={showError} />
  );
  if (modal.type === 'addDept') return (
    <AddDeptModal onClose={close} onSuccess={() => { showSuccess('Department created!'); fetchDeptsFn(); close(); }} onError={showError} />
  );
  if (modal.type === 'editDept') return (
    <EditDeptModal dept={modal.data} onClose={close} onSuccess={() => { showSuccess('Department updated!'); fetchDeptsFn(); close(); }} onError={showError} />
  );
  if (modal.type === 'addClassroom') return (
    <AddClassroomModal departments={departments} onClose={close} onSuccess={() => { showSuccess('Classroom added!'); fetchClassrooms(); close(); }} onError={showError} />
  );
  if (modal.type === 'addSubject') return (
    <AddSubjectModal departments={departments} onClose={close} onSuccess={() => { showSuccess('Subject added!'); fetchSubjects(); close(); }} onError={showError} />
  );
  if (modal.type === 'generateTimetable') return (
    <GenerateTimetableModal departments={departments} onClose={close} onSuccess={() => { showSuccess('Timetable generation started! Check back shortly.'); fetchTimetables(); close(); }} onError={showError} />
  );
  return null;
}

/* ─── Dashboard Tab ─── */
const DashboardTab = ({ data, onTabSwitch }) => {
  const stats = [
    { label: 'Total Faculty',    value: data?.stats?.totalFaculty    ?? 0, icon: '👨‍🏫', color: '#4f46e5' },
    { label: 'Total Students',   value: data?.stats?.totalStudents   ?? 0, icon: '🎓', color: '#10b981' },
    { label: 'Departments',      value: data?.stats?.totalDepartments ?? 0, icon: '🏛️', color: '#8b5cf6' },
    { label: 'Classrooms',       value: data?.stats?.totalClassrooms ?? 0, icon: '🏫', color: '#f59e0b' },
    { label: 'Pending Leaves',   value: data?.stats?.pendingLeaves   ?? 0, icon: '📋', color: '#ef4444' },
  ];
  return (
    <div>
      <div className="kpi-grid">
        {stats.map(s => (
          <div className="kpi-card" key={s.label} style={{'--accent': s.color}}>
            <div className="kpi-icon">{s.icon}</div>
            <div className="kpi-body">
              <span className="kpi-value">{s.value}</span>
              <span className="kpi-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="two-col">
        <div className="panel">
          <h3 className="panel-title">🕒 Recent Timetable Activity</h3>
          {data?.recentActivities?.length > 0 ? data.recentActivities.map((a, i) => (
            <div className="activity-row" key={i}>
              <div className="act-dot" style={{background: a.status === 'approved' ? '#10b981' : a.status === 'published' ? '#4f46e5' : '#f59e0b'}}></div>
              <div style={{flex:1}}>
                <p className="act-name">{a.title || 'Timetable'} — {a.department?.name || 'Unknown'}</p>
                <p className="act-time">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
              <span className={`tag tag-${a.status}`}>{a.status}</span>
            </div>
          )) : <p className="empty-msg">No recent timetable activity yet.</p>}
        </div>
        <div className="panel">
          <h3 className="panel-title">⚡ Quick Actions</h3>
          <div className="actions-grid">
            <button className="action-tile" style={{'--c':'#4f46e5'}} onClick={() => onTabSwitch('users')}>
              <span>👤</span><p>Manage Users</p>
            </button>
            <button className="action-tile" style={{'--c':'#10b981'}} onClick={() => onTabSwitch('timetables')}>
              <span>📅</span><p>Timetables</p>
            </button>
            <button className="action-tile" style={{'--c':'#8b5cf6'}} onClick={() => onTabSwitch('departments')}>
              <span>🏛️</span><p>Departments</p>
            </button>
            <button className="action-tile" style={{'--c':'#f59e0b'}} onClick={() => onTabSwitch('classrooms')}>
              <span>🏫</span><p>Classrooms</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Users Tab ─── */
const UsersTab = ({ users, onAdd, onDelete, onEdit }) => (
  <div className="panel-full">
    <div className="panel-header">
      <h2>User Directory</h2>
      <button className="btn-primary" onClick={onAdd}>+ Add Faculty / Student</button>
    </div>
    <div className="table-wrap">
      <table className="data-tbl">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {users.length > 0 ? users.map(u => (
            <tr key={u._id}>
              <td><strong>{u.name}</strong></td>
              <td style={{color:'var(--muted)'}}>{u.email}</td>
              <td><span className={`role-tag role-${u.role}`}>{u.role.toUpperCase()}</span></td>
              <td>{u.department?.name || '—'}</td>
              <td><span className={`status-dot ${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
              <td>
                <button className="btn-sm btn-view" onClick={() => onEdit(u)}>✏️ Edit</button>
                {u.role !== 'admin' && <button className="btn-sm btn-del" style={{marginLeft:6}} onClick={() => onDelete(u._id, u.name)}>🗑️ Remove</button>}
              </td>
            </tr>
          )) : <tr><td colSpan={6} className="empty-cell">No users found</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

/* ─── Departments Tab ─── */
const DepartmentsTab = ({ departments, onAdd, onDelete, onEdit }) => (
  <div className="panel-full">
    <div className="panel-header">
      <h2>Department Management</h2>
      <button className="btn-primary" onClick={onAdd}>+ Add Department</button>
    </div>
    <div className="table-wrap">
      <table className="data-tbl">
        <thead><tr><th>Name</th><th>Code</th><th>Head of Dept</th><th>Faculty</th><th>Students</th><th>Actions</th></tr></thead>
        <tbody>
          {departments.length > 0 ? departments.map(d => (
            <tr key={d._id}>
              <td><strong>{d.name}</strong></td>
              <td><span className="code-chip">{d.code}</span></td>
              <td>{d.headOfDepartment?.name || '—'}</td>
              <td>{d.facultyCount || 0}</td>
              <td>{d.studentCount || 0}</td>
              <td>
                <button className="btn-sm btn-view" onClick={() => onEdit(d)}>✏️ Edit</button>
                <button className="btn-sm btn-del" style={{marginLeft:6}} onClick={() => onDelete(d._id, d.name)}>🗑️ Delete</button>
              </td>
            </tr>
          )) : <tr><td colSpan={6} className="empty-cell">No departments found. Add one to get started.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

/* ─── Classrooms Tab ─── */
const ClassroomsTab = ({ classrooms, departments, onAdd, onDelete }) => (
  <div className="panel-full">
    <div className="panel-header">
      <h2>Resource Centers</h2>
      <button className="btn-primary" onClick={onAdd}>+ Add Classroom</button>
    </div>
    <div className="table-wrap">
      <table className="data-tbl">
        <thead><tr><th>Room No.</th><th>Name</th><th>Capacity</th><th>Building</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {classrooms.length > 0 ? classrooms.map(c => (
            <tr key={c._id}>
              <td><strong>{c.roomNumber}</strong></td>
              <td>{c.name || '—'}</td>
              <td>{c.capacity}</td>
              <td>{c.building || '—'}</td>
              <td>{c.department?.name || '—'}</td>
              <td><span className={`status-dot ${c.isActive !== false ? 'active' : 'inactive'}`}>{c.isActive !== false ? 'Available' : 'Inactive'}</span></td>
              <td>
                <button className="btn-sm btn-del" onClick={() => onDelete(c._id, c.roomNumber)}>🗑️ Delete</button>
              </td>
            </tr>
          )) : <tr><td colSpan={7} className="empty-cell">No classrooms added yet.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

/* ─── Subjects Tab ─── */
const SubjectsTab = ({ subjects, departments, onAdd, onDelete }) => (
  <div className="panel-full">
    <div className="panel-header">
      <h2>Subject Registry</h2>
      <button className="btn-primary" onClick={onAdd}>+ Add Subject</button>
    </div>
    <div className="table-wrap">
      <table className="data-tbl">
        <thead><tr><th>Code</th><th>Name</th><th>Credits</th><th>Semester</th><th>Type</th><th>Department</th><th>Actions</th></tr></thead>
        <tbody>
          {subjects.length > 0 ? subjects.map(s => (
            <tr key={s._id}>
              <td><span className="code-chip">{s.code}</span></td>
              <td><strong>{s.name}</strong></td>
              <td>{s.credits}</td>
              <td>Sem {s.semester}</td>
              <td><span className={`tag tag-${s.type || 'theory'}`}>{s.type || 'theory'}</span></td>
              <td>{s.department?.name || '—'}</td>
              <td>
                <button className="btn-sm btn-del" onClick={() => onDelete(s._id, s.name)}>🗑️ Delete</button>
              </td>
            </tr>
          )) : <tr><td colSpan={7} className="empty-cell">No subjects added yet.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

/* ─── Timetables Tab ─── */
const TimetablesTab = ({ timetables, departments, onGenerate, onApprove, onPublish, onDelete }) => (
  <div className="panel-full">
    <div className="panel-header">
      <h2>Master Timetables</h2>
      <button className="btn-primary" onClick={onGenerate}>⚙️ Generate Timetable</button>
    </div>
    <div className="table-wrap">
      <table className="data-tbl">
        <thead><tr><th>Title</th><th>Department</th><th>Semester</th><th>Year</th><th>Fitness</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {timetables.length > 0 ? timetables.map(t => (
            <tr key={t._id}>
              <td><strong>{t.title || 'Untitled'}</strong></td>
              <td>{t.department?.name || '—'}</td>
              <td>Sem {t.semester}</td>
              <td>{t.academicYear}</td>
              <td>{t.optimizationMetrics?.fitnessScore ? `${(t.optimizationMetrics.fitnessScore * 100).toFixed(1)}%` : '—'}</td>
              <td><span className={`tag tag-${t.status}`}>{t.status}</span></td>
              <td style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {t.status === 'draft' && <button className="btn-sm btn-approve" onClick={() => onApprove(t._id)}>✅ Approve</button>}
                {t.status === 'approved' && <button className="btn-sm btn-view" onClick={() => onPublish(t._id)}>🚀 Publish</button>}
                <button className="btn-sm btn-del" onClick={() => onDelete(t._id)}>🗑️</button>
              </td>
            </tr>
          )) : <tr><td colSpan={7} className="empty-cell">No timetables generated yet. Click "Generate Timetable" to begin.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

/* ─── Reports Tab ─── */
const ReportsTab = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async (type) => {
    setLoading(true);
    try {
      const r = await API(`/api/admin/reports/${type}`);
      const d = await r.json();
      if (d.success) setReportData({ type, data: d.data });
    } catch { }
    setLoading(false);
  };

  return (
    <div>
      <div className="two-col" style={{marginBottom:'1.5rem'}}>
        <div className="panel" style={{textAlign:'center', padding:'2.5rem'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'1rem'}}>📊</div>
          <h3 style={{fontWeight:800,marginBottom:'.5rem'}}>Attendance Report</h3>
          <p style={{color:'var(--muted)',marginBottom:'1.5rem',fontSize:'.9rem'}}>Faculty attendance rates and patterns.</p>
          <button className="btn-primary" onClick={() => loadReport('attendance')} disabled={loading}>
            {loading ? '⏳ Loading…' : 'Generate Report'}
          </button>
        </div>
        <div className="panel" style={{textAlign:'center', padding:'2.5rem'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'1rem'}}>🏫</div>
          <h3 style={{fontWeight:800,marginBottom:'.5rem'}}>Room Utilization</h3>
          <p style={{color:'var(--muted)',marginBottom:'1.5rem',fontSize:'.9rem'}}>Classroom usage efficiency analysis.</p>
          <button className="btn-primary" onClick={() => loadReport('utilization')}>Generate Report</button>
        </div>
      </div>
      {reportData && (
        <div className="panel-full">
          <h3 className="panel-title">📋 {reportData.type.charAt(0).toUpperCase() + reportData.type.slice(1)} Report</h3>
          <pre style={{background:'var(--bg)',padding:'1rem',borderRadius:12,fontSize:'.82rem',overflow:'auto',maxHeight:400}}>
            {JSON.stringify(reportData.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════
   MODAL COMPONENTS
══════════════════════════════════ */

const FormField = ({ label, name, type = 'text', value, onChange, required, options, placeholder }) => (
  <div className="form-group">
    <label>{label}{required && ' *'}</label>
    {options ? (
      <select name={name} value={value} onChange={onChange} required={required}>
        <option value="">Select {label}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <input type={type} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder} />
    )}
  </div>
);

/* Add Faculty Modal */
const AddFacultyModal = ({ departments, onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({ name:'', email:'', password:'', department:'', designation:'Assistant Professor', role:'faculty', semester:'' });
  const [saving, setSaving] = useState(false);
  const setF = e => setForm(f => ({...f, [e.target.name]: e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const endpoint = form.role === 'student' ? '/api/admin/student/add' : '/api/admin/faculty/add';
      const body = form.role === 'student'
        ? { name: form.name, email: form.email, password: form.password, department: form.department, semester: parseInt(form.semester) }
        : { name: form.name, email: form.email, password: form.password, department: form.department, designation: form.designation };
      const r = await API(endpoint, { method:'POST', body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) onSuccess();
      else onError(d.msg || d.message || 'Failed to add user');
    } catch { onError('Network error'); }
    setSaving(false);
  };

  return (
    <Modal title="Add New User" onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label="Role" name="role" value={form.role} onChange={setF} required
          options={[{value:'faculty',label:'Faculty'},{value:'hod',label:'Head of Department'},{value:'student',label:'Student'}]} />
        <FormField label="Full Name" name="name" value={form.name} onChange={setF} required placeholder="Dr. Jane Smith" />
        <FormField label="Email Address" name="email" type="email" value={form.email} onChange={setF} required placeholder="jane@orario.com" />
        <FormField label="Password" name="password" type="password" value={form.password} onChange={setF} required placeholder="Min 6 characters" />
        <FormField label="Department" name="department" value={form.department} onChange={setF} required
          options={departments.map(d => ({value:d._id, label:d.name}))} />
        {form.role !== 'student'
          ? <FormField label="Designation" name="designation" value={form.designation} onChange={setF} required placeholder="e.g. Assistant Professor" />
          : <FormField label="Semester" name="semester" type="number" value={form.semester} onChange={setF} required placeholder="1-8" />
        }
        <div style={{display:'flex',gap:12,marginTop:'1.5rem'}}>
          <button type="button" onClick={onClose} className="btn-sm btn-del" style={{flex:1,padding:'.75rem'}}>Cancel</button>
          <button type="submit" className="btn-primary" style={{flex:2}} disabled={saving}>{saving ? 'Adding…' : 'Add User'}</button>
        </div>
      </form>
    </Modal>
  );
};

/* Edit User Modal */
const EditUserModal = ({ user, onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({ isActive: user?.isActive ?? true });
  const [saving, setSaving] = useState(false);
  const setF = e => setForm(f => ({...f, [e.target.name]: e.target.value === 'true'}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await API(`/api/admin/users/${user._id}/status`, { method:'PUT', body: JSON.stringify({ isActive: form.isActive }) });
      const d = await r.json();
      if (d.success) onSuccess();
      else onError(d.msg || 'Update failed');
    } catch { onError('Network error'); }
    setSaving(false);
  };

  return (
    <Modal title={`Edit: ${user?.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{padding:'1rem',background:'var(--bg)',borderRadius:12,marginBottom:'1.5rem'}}>
          <p><strong>Email:</strong> {user?.email}</p>
          <p style={{marginTop:'.3rem'}}><strong>Role:</strong> <span className={`role-tag role-${user?.role}`}>{user?.role?.toUpperCase()}</span></p>
        </div>
        <FormField label="Account Status" name="isActive" value={String(form.isActive)} onChange={setF} required
          options={[{value:'true',label:'Active'},{value:'false',label:'Inactive / Suspended'}]} />
        <div style={{display:'flex',gap:12,marginTop:'1.5rem'}}>
          <button type="button" onClick={onClose} className="btn-sm btn-del" style={{flex:1,padding:'.75rem'}}>Cancel</button>
          <button type="submit" className="btn-primary" style={{flex:2}} disabled={saving}>{saving ? 'Saving…' : 'Update User'}</button>
        </div>
      </form>
    </Modal>
  );
};

/* Add Department Modal */
const AddDeptModal = ({ onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({ name:'', code:'', description:'' });
  const [saving, setSaving] = useState(false);
  const setF = e => setForm(f => ({...f, [e.target.name]: e.target.name === 'code' ? e.target.value.toUpperCase() : e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await API('/api/admin/departments', { method:'POST', body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) onSuccess();
      else onError(d.msg || d.message || 'Failed to create department');
    } catch { onError('Network error'); }
    setSaving(false);
  };

  return (
    <Modal title="Add New Department" onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label="Department Name" name="name" value={form.name} onChange={setF} required placeholder="e.g. Computer Science and Engineering" />
        <FormField label="Department Code" name="code" value={form.code} onChange={setF} required placeholder="e.g. CSE" />
        <FormField label="Description" name="description" value={form.description} onChange={setF} placeholder="Brief description (optional)" />
        <div style={{display:'flex',gap:12,marginTop:'1.5rem'}}>
          <button type="button" onClick={onClose} className="btn-sm btn-del" style={{flex:1,padding:'.75rem'}}>Cancel</button>
          <button type="submit" className="btn-primary" style={{flex:2}} disabled={saving}>{saving ? 'Creating…' : 'Create Department'}</button>
        </div>
      </form>
    </Modal>
  );
};

/* Edit Department Modal */
const EditDeptModal = ({ dept, onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({ name: dept?.name || '', code: dept?.code || '', description: dept?.description || '' });
  const [saving, setSaving] = useState(false);
  const setF = e => setForm(f => ({...f, [e.target.name]: e.target.name === 'code' ? e.target.value.toUpperCase() : e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await API(`/api/admin/departments/${dept._id}`, { method:'PUT', body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) onSuccess();
      else onError(d.msg || d.message || 'Update failed');
    } catch { onError('Network error'); }
    setSaving(false);
  };

  return (
    <Modal title={`Edit: ${dept?.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label="Department Name" name="name" value={form.name} onChange={setF} required />
        <FormField label="Department Code" name="code" value={form.code} onChange={setF} required />
        <FormField label="Description" name="description" value={form.description} onChange={setF} />
        <div style={{display:'flex',gap:12,marginTop:'1.5rem'}}>
          <button type="button" onClick={onClose} className="btn-sm btn-del" style={{flex:1,padding:'.75rem'}}>Cancel</button>
          <button type="submit" className="btn-primary" style={{flex:2}} disabled={saving}>{saving ? 'Saving…' : 'Update Department'}</button>
        </div>
      </form>
    </Modal>
  );
};

/* Add Classroom Modal */
const AddClassroomModal = ({ departments, onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({ name:'', roomNumber:'', capacity:30, building:'', department:'' });
  const [saving, setSaving] = useState(false);
  const setF = e => setForm(f => ({...f, [e.target.name]: e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await API('/api/admin/classrooms', { method:'POST', body: JSON.stringify({...form, capacity: parseInt(form.capacity)}) });
      const d = await r.json();
      if (d.success) onSuccess();
      else onError(d.msg || d.message || 'Failed to add classroom');
    } catch { onError('Network error'); }
    setSaving(false);
  };

  return (
    <Modal title="Add New Classroom" onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label="Room Number" name="roomNumber" value={form.roomNumber} onChange={setF} required placeholder="e.g. A-101" />
        <FormField label="Room Name" name="name" value={form.name} onChange={setF} required placeholder="e.g. Main Lecture Hall" />
        <FormField label="Seating Capacity" name="capacity" type="number" value={form.capacity} onChange={setF} required placeholder="30" />
        <FormField label="Building" name="building" value={form.building} onChange={setF} placeholder="e.g. Block A" />
        <FormField label="Department" name="department" value={form.department} onChange={setF} required
          options={departments.map(d => ({value:d._id, label:d.name}))} />
        <div style={{display:'flex',gap:12,marginTop:'1.5rem'}}>
          <button type="button" onClick={onClose} className="btn-sm btn-del" style={{flex:1,padding:'.75rem'}}>Cancel</button>
          <button type="submit" className="btn-primary" style={{flex:2}} disabled={saving}>{saving ? 'Adding…' : 'Add Classroom'}</button>
        </div>
      </form>
    </Modal>
  );
};

/* Add Subject Modal */
const AddSubjectModal = ({ departments, onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({ name:'', code:'', credits:3, department:'', semester:1, type:'theory' });
  const [saving, setSaving] = useState(false);
  const setF = e => setForm(f => ({...f, [e.target.name]: e.target.name === 'code' ? e.target.value.toUpperCase() : e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await API('/api/admin/subjects', {
        method:'POST',
        body: JSON.stringify({...form, credits: parseInt(form.credits), semester: parseInt(form.semester)})
      });
      const d = await r.json();
      if (d.success) onSuccess();
      else onError(d.msg || d.message || 'Failed to add subject');
    } catch { onError('Network error'); }
    setSaving(false);
  };

  return (
    <Modal title="Add New Subject" onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label="Subject Name" name="name" value={form.name} onChange={setF} required placeholder="e.g. Data Structures" />
        <FormField label="Subject Code" name="code" value={form.code} onChange={setF} required placeholder="e.g. CS301" />
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
          <FormField label="Credits" name="credits" type="number" value={form.credits} onChange={setF} required />
          <FormField label="Semester" name="semester" type="number" value={form.semester} onChange={setF} required />
        </div>
        <FormField label="Type" name="type" value={form.type} onChange={setF} required
          options={[{value:'theory',label:'Theory'},{value:'lab',label:'Lab'},{value:'elective',label:'Elective'}]} />
        <FormField label="Department" name="department" value={form.department} onChange={setF} required
          options={departments.map(d => ({value:d._id, label:d.name}))} />
        <div style={{display:'flex',gap:12,marginTop:'1.5rem'}}>
          <button type="button" onClick={onClose} className="btn-sm btn-del" style={{flex:1,padding:'.75rem'}}>Cancel</button>
          <button type="submit" className="btn-primary" style={{flex:2}} disabled={saving}>{saving ? 'Adding…' : 'Add Subject'}</button>
        </div>
      </form>
    </Modal>
  );
};

/* Generate Timetable Modal */
const GenerateTimetableModal = ({ departments, onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({ department:'', semester:1, academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear()+1) });
  const [saving, setSaving] = useState(false);
  const setF = e => setForm(f => ({...f, [e.target.name]: e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await API('/api/admin/timetable/generate', {
        method:'POST',
        body: JSON.stringify({...form, semester: parseInt(form.semester)})
      });
      const d = await r.json();
      if (d.success) onSuccess();
      else onError(d.msg || d.message || 'Timetable generation failed. Make sure subjects and classrooms exist for this department.');
    } catch { onError('Network error'); }
    setSaving(false);
  };

  return (
    <Modal title="⚙️ Generate AI Timetable" onClose={onClose}>
      <p style={{color:'var(--muted)',fontSize:'.88rem',marginBottom:'1.5rem',lineHeight:1.5}}>
        The AI Decision Engine will use faculty availability, classroom capacities, and subject constraints to auto-generate an optimized timetable.
      </p>
      <form onSubmit={submit}>
        <FormField label="Department" name="department" value={form.department} onChange={setF} required
          options={departments.map(d => ({value:d._id, label:d.name}))} />
        <FormField label="Semester" name="semester" type="number" value={form.semester} onChange={setF} required placeholder="1-8" />
        <FormField label="Academic Year" name="academicYear" value={form.academicYear} onChange={setF} required placeholder="e.g. 2024-2025" />
        <div style={{display:'flex',gap:12,marginTop:'1.5rem'}}>
          <button type="button" onClick={onClose} className="btn-sm btn-del" style={{flex:1,padding:'.75rem'}}>Cancel</button>
          <button type="submit" className="btn-primary" style={{flex:2}} disabled={saving}>
            {saving ? '⏳ Generating…' : '🚀 Generate Timetable'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Admin;
