import React from 'react';
import './InventoryDashboard.css';

const InventoryDashboard = () => {
  return (
    <div className="inventory-dashboard">
      <div className="dashboard-header">
        <h1>Inventory Management Dashboard</h1>
        <p>Track and manage organization inventory and assets</p>
      </div>
      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Items</h3>
            <p className="stat-number">542</p>
          </div>
          <div className="stat-card">
            <h3>Low Stock</h3>
            <p className="stat-number">23</p>
          </div>
          <div className="stat-card">
            <h3>Categories</h3>
            <p className="stat-number">15</p>
          </div>
        </div>
        <div className="coming-soon">
          <h2>Inventory Module - Coming Soon</h2>
          <p>This module is under development and will be available soon.</p>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;