import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Register.css"

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
    semester: '',
    designation: '',
    uniqueId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Prepare data based on role
    const submitData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      department: formData.department,
      ...(formData.role === 'student' && { 
        semester: formData.semester,
        uniqueId: formData.uniqueId 
      }),
      ...(formData.role === 'faculty' && { 
        designation: formData.designation,
        uniqueId: formData.uniqueId 
      })
    };

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and redirect to login
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data));
        navigate('/auth/login');
      } else {
        setError(data.msg || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.',err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/auth/login');
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h2>Create Account</h2>
          <p>Join our university system</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>

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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                placeholder="Enter department"
              />
            </div>

            <div className="form-group">
              <label htmlFor="uniqueId">
                {formData.role === 'student' ? 'Student ID' : 'Faculty ID'}
              </label>
              <input
                type="text"
                id="uniqueId"
                name="uniqueId"
                value={formData.uniqueId}
                onChange={handleChange}
                required
                placeholder={formData.role === 'student' ? 'Enter student ID' : 'Enter faculty ID'}
              />
            </div>
          </div>

          {formData.role === 'student' && (
            <div className="form-group">
              <label htmlFor="semester">Semester</label>
              <select
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                required
              >
                <option value="">Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
          )}

          {formData.role === 'faculty' && (
            <div className="form-group">
              <label htmlFor="designation">Designation</label>
              <input
                type="text"
                id="designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                required
                placeholder="Enter designation (e.g., Professor)"
              />
            </div>
          )}

          <button 
            type="submit" 
            className="register-btn"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="register-links">
          <button 
            type="button" 
            className="link-btn"
            onClick={handleLogin}
          >
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;