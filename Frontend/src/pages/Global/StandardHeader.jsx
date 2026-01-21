import React from 'react';
import './StandardHeader.css';

const StandardHeader = ({ title, subtitle, additionalInfo, children }) => {
  return (
    <header className="standard-header">
      <div className="header-container">
        <div className="header-content">
          <h1>{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
          {additionalInfo && <div className="additional-info">{additionalInfo}</div>}
          {children && <div className="header-children">{children}</div>}
        </div>
      </div>
    </header>
  );
};

export default StandardHeader;