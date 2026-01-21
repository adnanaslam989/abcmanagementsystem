// pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    pak: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetData, setResetData] = useState({
    pak: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const { login, state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      const from = location.state?.from?.pathname || '/hr';
      navigate(from, { replace: true });
    }
  }, [state.isAuthenticated, navigate, location]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleResetInputChange = (e) => {
    const { name, value } = e.target;
    setResetData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (resetError) setResetError('');
    if (resetSuccess) setResetSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!credentials.pak || !credentials.password) {
      setError('Please enter both PAK number and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://10.0.0.7:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        // Use context login function
        login(data.user, data.token);

        // Navigate to intended page or default
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check if the server is running.');
    } finally {
      setIsLoading(false);
    }
  };


const handleResetPassword = async (e) => {
  e.preventDefault();

  // Validate inputs
  if (!resetData.pak || !resetData.newPassword || !resetData.confirmPassword) {
    setResetError('All fields are required');
    return;
  }

  if (resetData.newPassword.length < 6) {
    setResetError('Password must be at least 6 characters long');
    return;
  }

  if (resetData.newPassword !== resetData.confirmPassword) {
    setResetError('Passwords do not match');
    return;
  }

  setResetLoading(true);
  setResetError('');
  setResetSuccess('');

  try {
    // Directly call the reset password API
    const response = await fetch('http://10.0.0.7:5000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pak: resetData.pak,
        newPassword: resetData.newPassword
      }),
    });

    const data = await response.json();

    if (response.ok) {
      setResetSuccess('Password reset successfully! You can now login with your new password.');
      setResetData({
        pak: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowResetModal(false);
      }, 3000);
    } else {
      setResetError(data.message || 'Failed to reset password. Please contact administrator.');
    }
  } catch (error) {
    console.error('Reset password error:', error);
    setResetError('Network error. Please check if the server is running.');
  } finally {
    setResetLoading(false);
  }
};


  // Show loading while checking authentication
  if (state.loading) {
    return (
      <div className="login-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="login-container">
        <div className="login-background">
          <div className="login-card">
            {/* Header Section */}
            <div className="login-header">
              <h1>Organization Management System</h1>
            </div>
            <p className="welcome-text">Welcome back! Please sign in to your account</p>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="login-form">
              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}

              <div className="input-group">
                <label htmlFor="pak">PAK Number</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    id="pak"
                    name="pak"
                    value={credentials.pak}
                    onChange={handleInputChange}
                    placeholder="Enter your PAK number"
                    className="login-input"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="login-input"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`login-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

             
            </form>

            {/* Footer */}
            <div className="login-footer">
              <p>Organization Management Portal</p>
              <div className="security-info">
                <span className="security-badge">🔒 Secure Login</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button 
                className="modal-close"
                onClick={() => setShowResetModal(false)}
                disabled={resetLoading}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Enter your PAK number and new password. You will need to login again with the new password.
              </p>

              <form onSubmit={handleResetPassword}>
                {resetError && (
                  <div className="error-message">
                    ⚠️ {resetError}
                  </div>
                )}

                {resetSuccess && (
                  <div className="success-message">
                    ✅ {resetSuccess}
                  </div>
                )}

                <div className="modal-input-group">
                  <label htmlFor="reset-pak">PAK Number</label>
                  <input
                    type="text"
                    id="reset-pak"
                    name="pak"
                    value={resetData.pak}
                    onChange={handleResetInputChange}
                    placeholder="Enter your PAK number"
                    disabled={resetLoading}
                    required
                  />
                </div>

                <div className="modal-input-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={resetData.newPassword}
                    onChange={handleResetInputChange}
                    placeholder="Enter new password (min. 6 characters)"
                    disabled={resetLoading}
                    required
                  />
                  <div className="password-hint">
                    Password must be at least 6 characters long
                  </div>
                </div>

                <div className="modal-input-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={resetData.confirmPassword}
                    onChange={handleResetInputChange}
                    placeholder="Confirm your new password"
                    disabled={resetLoading}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-cancel"
                    onClick={() => setShowResetModal(false)}
                    disabled={resetLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="modal-submit"
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <>
                        <div className="spinner small"></div>
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <p className="security-note">
                🔒 For security reasons, please contact administrator if you face any issues.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;