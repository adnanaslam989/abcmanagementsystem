import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import './Footer.css';

const Footer = () => {
  const { theme: currentTheme } = useTheme();
  
  return (
    <footer className={`footer ${currentTheme}`}>
      <div className="footer-container">
        <p className="copyright">
          &copy; {new Date().getFullYear()} CRDC Management System. All rights reserved.
        </p>
        <div className="footer-links">
          <a href="#privacy" className="footer-link">Privacy Policy</a>
          <span className="divider">•</span>
          <a href="#terms" className="footer-link">Terms of Service</a>
          <span className="divider">•</span>
          <a href="#contact" className="footer-link">Contact Support</a>
        </div>
        <div className="system-info">
          <span className="version">v1.0.0</span>
          <span className="status-indicator active">●</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;