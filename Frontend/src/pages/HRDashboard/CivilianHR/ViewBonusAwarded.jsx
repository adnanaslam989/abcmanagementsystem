import { useState, useEffect } from 'react';
import './ViewBonusAwarded.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const ViewBonusAwarded = () => {
  const [bonusData, setBonusData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  // Use your backend URL
  const API_BASE_URL = 'http://localhost:5000/api'; // Update with your backend URL

  // Fetch real bonus data from API
  useEffect(() => {
    fetchBonusData();
  }, []);

  const fetchBonusData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Fetching bonus data from API...');
      const response = await fetch(`${API_BASE_URL}/bonus/awarded-bonuses`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📊 Bonus data received:', result);
      
      if (result.success) {
        setBonusData(result.bonuses);
        console.log(`✅ Loaded ${result.bonuses.length} bonus records`);
      } else {
        throw new Error(result.message || 'Failed to fetch bonus data');
      }
    } catch (err) {
      console.error('❌ Error fetching bonus data:', err);
      setError(`Failed to load bonus data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Export to CSV functionality
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Bonus To', 'Employee Name', 'Bonus Days', 'Bonus Date', 'Awarded By', 'Rank', 'Officer Name', 'Reason'];
    const csvData = filteredData.map(item => [
      item.bonus_to,
      item.employee_name,
      item.bonus_days,
      item.bonus_date,
      item.awarded_by,
      item.rank,
      item.awarded_by_name,
      item.reason
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bonus-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    fetchBonusData();
  };

  const filteredData = bonusData.filter(item => 
    item.employee_name.toLowerCase().includes(filter.toLowerCase()) ||
    item.awarded_by_name.toLowerCase().includes(filter.toLowerCase()) ||
    item.reason.toLowerCase().includes(filter.toLowerCase()) ||
    item.bonus_to.toLowerCase().includes(filter.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="view-bonus-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading bonus data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-bonus-page">
        <div className="error-container">
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleRefresh}>Retry</button>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-bonus-page">
      {/* Header */}
      <header className="bonus-header">
        <div className="header-container">
          <h1>Bonus Awarded Records</h1>
          <p>View all awarded bonus records for civilian employees</p>
          <div className="data-info">
            Last updated: {new Date().toLocaleString()} • {bonusData.length} total records
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="bonus-content">
            {/* Controls Section */}
            <section className="controls-section">
              <div className="search-filter">
                <input
                  type="text"
                  placeholder="Search by employee name, awarded by, reason, or PAK..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="search-input"
                />
                <div className="filter-info">
                  Showing {filteredData.length} of {bonusData.length} records
                  {filter && ` for "${filter}"`}
                </div>
              </div>
              <div className="action-buttons">
                <button className="refresh-btn" onClick={handleRefresh} title="Refresh Data">
                  🔄 Refresh
                </button>
                <button className="print-btn" onClick={handlePrint}>
                  🖨️ Print Report
                </button>
                <button className="export-btn" onClick={handleExport}>
                  📊 Export CSV
                </button>
              </div>
            </section>

            {/* Bonus Data Table */}
            <section className="bonus-section">
              <div className="datagrid">
                <table className="bonus-table">
                  <thead>
                    <tr>
                      <th>Bonus ID</th>
                      <th>PAK</th>
                      <th>Civilian Name</th>
                      <th>Bonus Days</th>
                      <th>Bonus Date</th>
                      <th>Awarded By PAK</th>
                      <th>Rank</th>
                      <th>Officer Name</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((bonus, index) => (
                        <tr key={bonus.bonus_id || index} className={index % 2 === 0 ? 'alt' : ''}>
                          <td className="bonus-id">{bonus.bonus_id}</td>
                          <td className="bonus-to">{bonus.bonus_to}</td>
                          <td className="employee-name">{bonus.employee_name}</td>
                          <td className="days-cell">{bonus.bonus_days}</td>
                          <td className="bonus-date">
                            {bonus.bonus_date ? new Date(bonus.bonus_date).toLocaleDateString('en-GB') : 'N/A'}
                          </td>
                          <td className="awarded-by">{bonus.awarded_by}</td>
                          <td className="rank-column">{bonus.rank}</td>
                          <td className="awarded-name">{bonus.awarded_by_name}</td>
                          <td className="reason-cell" title={bonus.reason}>
                            {bonus.reason && bonus.reason.length > 50 
                              ? `${bonus.reason.substring(0, 50)}...` 
                              : bonus.reason
                            }
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="no-data">
                          {bonusData.length === 0 
                            ? 'No bonus records found in the database' 
                            : 'No records match your search criteria'
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Statistics */}
              <div className="summary-section">
                <div className="summary-cards">
                  <div className="summary-card">
                    <h4>Total Records</h4>
                    <p className="summary-number">{filteredData.length}</p>
                    <small>Filtered: {filteredData.length} / Total: {bonusData.length}</small>
                  </div>
                  <div className="summary-card">
                    <h4>Total Bonus Days</h4>
                    <p className="summary-number">
                      {filteredData.reduce((sum, item) => sum + parseInt(item.bonus_days || 0), 0)}
                    </p>
                    <small>Days awarded</small>
                  </div>
                  <div className="summary-card">
                    <h4>Average Days</h4>
                    <p className="summary-number">
                      {filteredData.length > 0 
                        ? (filteredData.reduce((sum, item) => sum + parseInt(item.bonus_days || 0), 0) / filteredData.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                    <small>Per award</small>
                  </div>
                  <div className="summary-card">
                    <h4>Latest Award</h4>
                    <p className="summary-number">
                      {filteredData.length > 0 
                        ? new Date(Math.max(...filteredData.map(item => new Date(item.bonus_date || 0)))).toLocaleDateString('en-GB')
                        : 'N/A'
                      }
                    </p>
                    <small>Most recent</small>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {filteredData.length > 0 && (
                <div className="info-section">
                  <div className="info-card">
                    <h4>Recent Bonus Awards</h4>
                    <div className="recent-list">
                      {filteredData.slice(0, 5).map((item, index) => (
                        <div key={index} className="recent-item">
                          <span className="recent-name">{item.employee_name}</span>
                          <span className="recent-days">{item.bonus_days} days</span>
                          <span className="recent-date">
                            {item.bonus_date ? new Date(item.bonus_date).toLocaleDateString('en-GB') : 'N/A'}
                          </span>
                          <span className="recent-officer">by {item.awarded_by_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBonusAwarded;