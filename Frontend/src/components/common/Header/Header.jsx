import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import ChangePassword from '../ChangePassword/ChangePassword';
import './Header.css';

const Header = () => {
  const { state, logout } = useApp();
  const { theme: currentTheme, themes } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => logout();
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsDropdownOpen(false);
    }
  };

  const handleChangePasswordClick = () => {
    setIsDropdownOpen(false);
    setShowChangePassword(true);
  };

  const handlePasswordChangeSuccess = () => {
    setShowChangePassword(false);
    alert('Password changed successfully! Please login again.');
    logout();
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserInitials = () => {
    const name = state.user?.employee_name || state.user?.name || '';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = () => {
    const colors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)'
    ];
    const index = (state.user?.employee_name?.length || 0) % colors.length;
    return colors[index];
  };

  return (
    <>
      <header className={`header ${currentTheme}`}>
        <div className="header-container">
          <div className="organization-info">
            <h1 className="organization-name">CryptoDiv Management System</h1>
            <p className="organization-tagline">Professional • Secure • Efficient</p>
          </div>
        
          <div className="user-section" ref={dropdownRef}>
            <div className="user-profile" onClick={toggleDropdown}>
              <div className="user-info">
                <span className="user-name">{state.user?.employee_name || state.user?.name || 'User'}</span>
                <span className="user-role">{state.user?.appointment || 'Employee'}</span>
              </div>
              <div 
                className="user-avatar"
                style={{ background: getAvatarColor() }}
              >
                {getUserInitials()}
              </div>
              <div className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>
                ▼
              </div>
            </div>

            {isDropdownOpen && (
              <div className="user-dropdown">
                <div className="dropdown-header">
                  <div 
                    className="user-avatar large"
                    style={{ background: getAvatarColor() }}
                  >
                    {getUserInitials()}
                  </div>
                  <div className="user-details">
                    <div className="user-name">{state.user?.employee_name || state.user?.name || 'User'}</div>
                    <div className="user-pak">PAK: {state.user?.pak || 'N/A'}</div>
                    <div className="user-deployment">{state.user?.deployment || 'No Deployment'}</div>
                    <div className="user-section-badge">{state.user?.section || 'General'}</div>
                  </div>
                </div>

                <div className="dropdown-divider"></div>

                <div className="dropdown-item">
                  <span className="item-icon">👤</span>
                  My Profile
                </div>
                <div className="dropdown-item">
                  <span className="item-icon">⚙️</span>
                  Settings
                </div>
                <div className="dropdown-item" onClick={handleChangePasswordClick}>
                  <span className="item-icon">🔒</span>
                  Change Password
                </div>

                <div className="dropdown-divider"></div>

                <button 
                  className="dropdown-item logout"
                  onClick={handleLogout}
                >
                  <span className="item-icon">🚪</span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showChangePassword && state.user && (
        <ChangePassword
          user={state.user}
          onSuccess={handlePasswordChangeSuccess}
          onCancel={() => setShowChangePassword(false)}
        />
      )}
    </>
  );
};

export default Header;