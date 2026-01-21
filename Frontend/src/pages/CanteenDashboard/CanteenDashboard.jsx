import React from 'react';
import './CanteenDashboard.css';

const CanteenDashboard = () => {
  return (
    <div className="canteen-dashboard">
      <div className="dashboard-header">
        <h1>Canteen Management Dashboard</h1>
        <p>Manage canteen operations, menu and orders</p>
      </div>
      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Today's Orders</h3>
            <p className="stat-number">89</p>
          </div>
          <div className="stat-card">
            <h3>Active Menu Items</h3>
            <p className="stat-number">24</p>
          </div>
          <div className="stat-card">
            <h3>Monthly Revenue</h3>
            <p className="stat-number">$2,847</p>
          </div>
        </div>
        <div className="coming-soon">
          <h2>Canteen Module - Coming Soon</h2>
          <p>This module is under development and will be available soon.</p>
        </div>
      </div>
    </div>
  );
};

export default CanteenDashboard;