import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./ForgotPassword.css"

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Password reset instructions have been sent to your email.');
      } else {
        setError(data.msg || 'Failed to send reset instructions');
      }
    } catch (err) {
      setError('Network error. Please try again.',err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/api/login');
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <h2>Reset Your Password</h2>
          <p>Enter your email to receive reset instructions</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your registered email"
            />
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Instructions'}
          </button>
        </form>

        <div className="forgot-password-links">
          <button 
            type="button" 
            className="link-btn"
            onClick={handleBackToLogin}
          >
            Back to Login
          </button>
        </div>

        <div className="info-note">
          <p><strong>Note:</strong> You will receive a reset token in your email. Use it to set a new password.</p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;