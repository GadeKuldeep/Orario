import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Login.css"

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify({
          id: data.data.id,
          name: data.data.name,
          email: data.data.email,
          role: data.data.role,
          department: data.data.department
        }));
        
        // Use navigate instead of window.location for smoother transition if possible
        // but the backend provides a redirectUrl
        window.location.href = data.data.redirectUrl;
      } else {
        setError(data.msg || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection refused. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <div className="login-header">
          <h2 className="gradient-text">Welcome Back</h2>
          <p>Sign in to your ORARIO workstation</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="admin@orario.com" />
          </div>

          <div className="form-group">
            <label>Secure Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
          </div>

          <button type="submit" className="login-btn highlight" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="login-links">
           <button type="button" className="link-btn" onClick={() => navigate('/auth/register')}>
             Create new account
           </button>
        </div>

        <div className="demo-creds">
           <p style={{fontWeight: 800, fontSize: '0.8rem', color: '#3498db', textTransform: 'uppercase', marginBottom: '0.5rem'}}>Master Demo Accounts</p>
           <div className="creds-list">
              <div className="cred-item"><span>Admin</span> <code>admin@orario.com</code> / <code>admin123</code></div>
              <div className="cred-item"><span>HOD</span> <code>hod@orario.com</code> / <code>password123</code></div>
              <div className="cred-item"><span>Faculty</span> <code>faculty@orario.com</code> / <code>password123</code></div>
              <div className="cred-item"><span>Student</span> <code>student@orario.com</code> / <code>password123</code></div>
           </div>
        </div>
      </div>
    </div>
  );
}

export default Login;