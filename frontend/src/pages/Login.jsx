import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Login.css"

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify({
          id: data.data.id,
          name: data.data.name,
          email: data.data.email,
          role: data.data.role,
          department: data.data.department
        }));

        // Redirect based on user role
        navigate(data.data.redirectUrl);
      } else {
        setError(data.msg || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.',err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/auth/forgot-password');
  };

  const handleRegister = () => {
    navigate('/auth/register');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your account</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="login-links">
          <button 
            type="button" 
            className="link-btn"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </button>
          <button 
            type="button" 
            className="link-btn"
            onClick={handleRegister}
          >
            Don't have an account? Register
          </button>
        </div>

        <div className="role-info">
          <p><strong>Demo Roles:</strong></p>
          <p>• Student: Access to student dashboard</p>
          <p>• Faculty: Access to faculty dashboard</p>
          <p>• Admin: Access to admin dashboard</p>
        </div>
      </div>
    </div>
  );
}

export default Login;