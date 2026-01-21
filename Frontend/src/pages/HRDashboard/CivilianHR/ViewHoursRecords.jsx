import { useState, useEffect } from 'react';
import './ViewHoursRecords.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const ViewHoursRecords = () => {
  const [hoursData, setHoursData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'award', 'penalty'

  // Use your backend URL
  const API_BASE_URL = 'http://10.0.0.7:5000/api';

  // Fetch real hours data from API
  useEffect(() => {
    fetchHoursData();
  }, []);

  const fetchHoursData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Fetching hours data from API...');
      const response = await fetch(`${API_BASE_URL}/bonus/awarded-hours`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📊 Hours data received:', result);
      
      if (result.success) {
        setHoursData(result.records);
        console.log(`✅ Loaded ${result.records.length} hours records`);
      } else {
        throw new Error(result.message || 'Failed to fetch hours data');
      }
    } catch (err) {
      console.error('❌ Error fetching hours data:', err);
      setError(`Failed to load hours data: ${err.message}`);
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

    const headers = ['Record ID', 'PAK', 'Civilian Name', 'Hours', 'Days Equivalent', 'Date', 'Action Type', 'Awarded By PAK', 'Rank', 'Officer Name', 'Reason'];
    const csvData = filteredData.map(item => [
      item.bonus_id,
      item.bonus_to,
      item.employee_name,
      item.bonus_hours,
      item.bonus_days,
      item.bonus_date,
      item.action_type === 'award' ? 'Award' : 'Penalty',
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
    a.download = `hours-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    fetchHoursData();
  };

  // Filter data based on search and type
  const filteredData = hoursData.filter(item => {
    // Filter by type
    if (filterType === 'award' && !item.is_positive) return false;
    if (filterType === 'penalty' && item.is_positive) return false;
    
    // Filter by search text
    if (filter) {
      const searchTerm = filter.toLowerCase();
      return (
        (item.employee_name && item.employee_name.toLowerCase().includes(searchTerm)) ||
        (item.awarded_by_name && item.awarded_by_name.toLowerCase().includes(searchTerm)) ||
        (item.reason && item.reason.toLowerCase().includes(searchTerm)) ||
        (item.bonus_to && item.bonus_to.toLowerCase().includes(searchTerm)) ||
        (item.rank && item.rank.toLowerCase().includes(searchTerm))
      );
    }
    return true;
  });

  // Calculate summary statistics
  const calculateStats = () => {
    const awards = filteredData.filter(item => item.is_positive);
    const penalties = filteredData.filter(item => !item.is_positive);
    
    const totalHours = filteredData.reduce((sum, item) => sum + parseFloat(item.bonus_hours || 0), 0);
    const totalAwards = awards.reduce((sum, item) => sum + parseFloat(item.bonus_hours || 0), 0);
    const totalPenalties = Math.abs(penalties.reduce((sum, item) => sum + parseFloat(item.bonus_hours || 0), 0));
    
    return {
      totalRecords: filteredData.length,
      awardsCount: awards.length,
      penaltiesCount: penalties.length,
      totalHours: totalHours.toFixed(2),
      totalAwards: totalAwards.toFixed(2),
      totalPenalties: totalPenalties.toFixed(2),
      netHours: totalHours.toFixed(2),
      netDays: (totalHours / 8).toFixed(2)
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="view-hours-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading hours records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-hours-page">
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
    <div className="view-hours-page">
   
           {/* Header */}
      <StandardHeader
      title={<h1>Hours Awarded & Penalized Records</h1>}
      subtitle="View all hours records (awards and penalties) for civilian employees"
      />


      {/* Main Content */}
      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="hours-content">
            {/* Controls Section */}
            <section className="controls-section">
              <div className="filters-container">
                <div className="type-filters">
                  <button 
                    className={`type-filter-btn ${filterType === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterType('all')}
                  >
                    All Records ({hoursData.length})
                  </button>
                  <button 
                    className={`type-filter-btn award ${filterType === 'award' ? 'active' : ''}`}
                    onClick={() => setFilterType('award')}
                  >
                    🎖️ Awards ({hoursData.filter(item => item.is_positive).length})
                  </button>
                  <button 
                    className={`type-filter-btn penalty ${filterType === 'penalty' ? 'active' : ''}`}
                    onClick={() => setFilterType('penalty')}
                  >
                    ⚠️ Penalties ({hoursData.filter(item => !item.is_positive).length})
                  </button>
                </div>
                
                <div className="search-filter">
                  <input
                    type="text"
                    placeholder="Search by name, officer, reason, or PAK..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="search-input"
                  />
                  <div className="filter-info">
                    Showing {filteredData.length} of {hoursData.length} records
                    {filter && ` for "${filter}"`}
                    {filterType !== 'all' && ` • Type: ${filterType}`}
                  </div>
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

            {/* Summary Statistics */}
            <section className="summary-section">
              <div className="summary-cards">
                <div className="summary-card">
                  <h4>Total Records</h4>
                  <p className="summary-number">{stats.totalRecords}</p>
                  <div className="summary-breakdown">
                    <span className="award-breakdown">🎖️ {stats.awardsCount}</span>
                    <span className="penalty-breakdown">⚠️ {stats.penaltiesCount}</span>
                  </div>
                </div>
                <div className="summary-card">
                  <h4>Total Hours</h4>
                  <p className={`summary-number ${parseFloat(stats.netHours) >= 0 ? 'positive' : 'negative'}`}>
                    {stats.netHours}
                  </p>
                  <div className="summary-breakdown">
                    <span className="award-breakdown">+{stats.totalAwards}</span>
                    <span className="penalty-breakdown">-{stats.totalPenalties}</span>
                  </div>
                </div>
                <div className="summary-card">
                  <h4>Days Equivalent</h4>
                  <p className={`summary-number ${parseFloat(stats.netDays) >= 0 ? 'positive' : 'negative'}`}>
                    {stats.netDays}
                  </p>
                  <small>1 day = 8 hours</small>
                </div>
                <div className="summary-card">
                  <h4>Net Balance</h4>
                  <p className={`summary-number ${parseFloat(stats.netHours) >= 0 ? 'positive' : 'negative'}`}>
                    {stats.netHours} hours
                  </p>
                  <small>{parseFloat(stats.netHours) >= 0 ? 'Net Positive' : 'Net Negative'}</small>
                </div>
              </div>
            </section>

            {/* Hours Data Table */}
            <section className="hours-section">
              <div className="datagrid">
                <table className="hours-table">
                  <thead>
                    <tr>
                      <th>Record ID</th>
                      <th>PAK</th>
                      <th>Civilian Name</th>
                      <th>Hours</th>
                      <th>Days</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Awarded By</th>
                      <th>Officer Name</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((record, index) => (
                        <tr key={record.bonus_id || index} className={`${index % 2 === 0 ? 'alt' : ''} ${record.is_positive ? 'award-row' : 'penalty-row'}`}>
                          <td className="record-id">{record.bonus_id}</td>
                          <td className="record-to">{record.bonus_to}</td>
                          <td className="employee-name">{record.employee_name}</td>
                          <td className={`hours-cell ${record.is_positive ? 'positive' : 'negative'}`}>
                            {record.bonus_hours > 0 ? `+${record.bonus_hours}` : record.bonus_hours}
                          </td>
                          <td className="days-cell">
                            {record.bonus_days}
                          </td>
                          <td className="record-date">
                            {record.bonus_date ? new Date(record.bonus_date).toLocaleDateString('en-GB') : 'N/A'}
                          </td>
                          <td className="type-cell">
                            <span className={`type-badge ${record.action_type}`}>
                              {record.action_type === 'award' ? '🎖️ Award' : '⚠️ Penalty'}
                            </span>
                          </td>
                          <td className="awarded-by">
                            <div className="officer-info">
                              <div className="officer-pak">{record.awarded_by?.split(' : ')[0] || 'N/A'}</div>
                              <div className="officer-rank">{record.rank}</div>
                            </div>
                          </td>
                          <td className="awarded-name">
                            {record.awarded_by_name || record.awarded_by?.split(' : ')[2] || 'N/A'}
                          </td>
                          <td className="reason-cell" title={record.reason}>
                            {record.reason && record.reason.length > 40 
                              ? `${record.reason.substring(0, 40)}...` 
                              : record.reason || 'N/A'
                            }
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" className="no-data">
                          {hoursData.length === 0 
                            ? 'No hours records found in the database' 
                            : 'No records match your search criteria'
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Additional Info */}
            {filteredData.length > 0 && (
              <section className="info-section">
                <div className="info-grid">
                  <div className="info-card recent">
                    <h4>Recent Activity</h4>
                    <div className="recent-list">
                      {filteredData.slice(0, 5).map((item, index) => (
                        <div key={index} className="recent-item">
                          <span className={`recent-type ${item.action_type}`}>
                            {item.action_type === 'award' ? '🎖️' : '⚠️'}
                          </span>
                          <span className="recent-name">{item.employee_name}</span>
                          <span className={`recent-hours ${item.is_positive ? 'positive' : 'negative'}`}>
                            {item.bonus_hours > 0 ? `+${item.bonus_hours}` : item.bonus_hours}h
                          </span>
                          <span className="recent-date">
                            {item.bonus_date ? new Date(item.bonus_date).toLocaleDateString('en-GB') : 'N/A'}
                          </span>
                          <span className="recent-officer">by {item.awarded_by_name?.split(' : ')[2] || item.awarded_by?.split(' : ')[2] || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="info-card breakdown">
                    <h4>Breakdown</h4>
                    <div className="breakdown-chart">
                      <div className="breakdown-item">
                        <div className="breakdown-label">Awards</div>
                        <div className="breakdown-bar">
                          <div 
                            className="breakdown-fill award-fill"
                            style={{ width: `${stats.awardsCount > 0 ? (stats.awardsCount / stats.totalRecords * 100) : 0}%` }}
                          ></div>
                        </div>
                        <div className="breakdown-value">{stats.awardsCount} records</div>
                      </div>
                      <div className="breakdown-item">
                        <div className="breakdown-label">Penalties</div>
                        <div className="breakdown-bar">
                          <div 
                            className="breakdown-fill penalty-fill"
                            style={{ width: `${stats.penaltiesCount > 0 ? (stats.penaltiesCount / stats.totalRecords * 100) : 0}%` }}
                          ></div>
                        </div>
                        <div className="breakdown-value">{stats.penaltiesCount} records</div>
                      </div>
                    </div>
                    <div className="breakdown-total">
                      <div className="total-hours">
                        <span>Total Hours:</span>
                        <span className={`total-value ${parseFloat(stats.netHours) >= 0 ? 'positive' : 'negative'}`}>
                          {stats.netHours}
                        </span>
                      </div>
                      <div className="total-days">
                        <span>Days Equivalent:</span>
                        <span className={`total-value ${parseFloat(stats.netDays) >= 0 ? 'positive' : 'negative'}`}>
                          {stats.netDays} days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewHoursRecords;