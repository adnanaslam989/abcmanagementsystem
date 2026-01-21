import React, { useState } from 'react';
import './ChangePassword.css';

const ChangePassword = ({ user, onSuccess, onCancel }) => {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (passwords.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    // Check if new password is same as current
    if (passwords.currentPassword === passwords.newPassword) {
      setError('New password cannot be the same as current password');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://10.0.0.7:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pak: user.pak,
          ...passwords
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password changed successfully!');
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 2000);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="change-password-modal-overlay">
      <div className="change-password-modal">
        <div className="modal-header">
          <h2>Change Password</h2>
          <button 
            className="close-button"
            onClick={onCancel}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="user-info-banner">
            <span className="user-badge">👤</span>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-pak">PAK: {user.pak}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="password-form">
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}
            
            {success && (
              <div className="success-message">
                ✅ {success}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="currentPassword">
                <span className="label-icon">🔒</span>
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwords.currentPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
                disabled={isLoading}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">
                <span className="label-icon">🔄</span>
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwords.newPassword}
                onChange={handleChange}
                placeholder="Enter new password (min. 6 characters)"
                disabled={isLoading}
                required
                autoComplete="new-password"
              />
              <div className="password-hint">
                Password must be at least 6 characters long
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <span className="label-icon">✓</span>
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your new password"
                disabled={isLoading}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <p className="security-note">
            🔒 For security reasons, you will be asked to login again after changing your password.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;