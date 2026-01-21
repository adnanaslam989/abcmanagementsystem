import React, { useState, useEffect } from 'react';
import './ViewPersonnelAttendance.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const ViewPersonnelAttendance = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUserPak, setCurrentUserPak] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [dataSource, setDataSource] = useState('');
  const [apiStatus, setApiStatus] = useState('');
  

  // Initialize component
  useEffect(() => {
    // Set default dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(formatDate(firstDay));
    setEndDate(formatDate(lastDay));
    
    // Check API connection
    checkApiStatus();
    
    // Set default PAK (you can change this based on logged-in user)
    const defaultPak = ''; // Example PAK
    setCurrentUserPak(defaultPak);
    checkEmployeeExists(defaultPak);
  }, []);

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const checkApiStatus = async () => {
    try {
      const response = await fetch('http://10.0.0.7:5000/api/PAFemployee/attendance/test');
      if (response.ok) {
        setApiStatus('✅ API Connected');
      } else {
        setApiStatus('❌ API Connection Failed');
      }
    } catch (err) {
      setApiStatus('❌ API Connection Error');
    }
  };

  const checkEmployeeExists = async (pak) => {
    if (!pak) return;
    
    try {
      const response = await fetch(`http://10.0.0.7:5000/api/PAFemployee/attendance/check/${pak}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.exists) {
          setEmployeeInfo(result.employee);
          
          // Get available months
          fetchAvailableMonths(pak);
          
          if (!result.tableExists) {
            setError('Attendance table not found in database. Using demonstration mode.');
          } else if (result.attendanceCount === 0) {
            setError('No attendance records found for this employee. Using demonstration mode.');
          }
        } else {
          setError(`Employee ${pak} not found in database. Using demonstration mode.`);
          setEmployeeInfo({
            pak: pak,
            rank: 'Unknown',
            name: 'Unknown Employee'
          });
        }
      }
    } catch (err) {
      console.error('Error checking employee:', err);
    }
  };

  const fetchAvailableMonths = async (pak) => {
    try {
      const response = await fetch(`http://10.0.0.7:5000/api/PAFemployee/attendance/months/${pak}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAvailableMonths(result.data);
        }
      }
    } catch (err) {
      console.error('Error fetching months:', err);
    }
  };

  const handlePakChange = (e) => {
    const newPak = e.target.value;
    setCurrentUserPak(newPak);
    
    if (newPak && newPak.trim() !== '') {
      checkEmployeeExists(newPak);
    }
  };

  const handleMonthSelect = (monthData) => {
    setStartDate(monthData.start_date);
    setEndDate(monthData.end_date);
  };

  // Helper function to generate sample data (not a hook)
  const generateSampleData = () => {
    // Generate realistic sample data
    const start = new Date(startDate);
    const end = new Date(endDate);
    const sampleData = [];
    let rowNumber = 1;
    
    // Generate dates between start and end
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Generate status with some variety
      let status = 'Present';
      let remarks = '';
      
      if (rowNumber === 3) {
        status = 'Late';
        remarks = 'Traffic delay';
      } else if (rowNumber === 8) {
        status = 'Half Day';
        remarks = 'Medical appointment';
      } else if (rowNumber >= 10 && rowNumber <= 12) {
        status = 'A/Leave';
        remarks = 'Annual leave';
      } else if (rowNumber === 15) {
        status = 'Absent';
        remarks = 'Sick';
      }
      
      sampleData.push({
        row_number: rowNumber++,
        attendence_date: formatDate(date),
        STATUS: status,
        REMARKS: remarks,
        day_name: date.toLocaleDateString('en-US', { weekday: 'long' })
      });
    }
    
    // Calculate statistics
    const stats = {
      presentCount: sampleData.filter(r => r.STATUS === 'Present').length,
      absentCount: sampleData.filter(r => r.STATUS === 'Absent').length,
      lateCount: sampleData.filter(r => r.STATUS === 'Late').length,
      halfDayCount: sampleData.filter(r => r.STATUS === 'Half Day').length,
      leaveCount: sampleData.filter(r => r.STATUS === 'A/Leave').length
    };
    
    setAttendanceData(sampleData);
    setSummaryData([
      { STATUS: 'Present', countt: stats.presentCount },
      { STATUS: 'Absent', countt: stats.absentCount },
      { STATUS: 'Late', countt: stats.lateCount },
      { STATUS: 'Half Day', countt: stats.halfDayCount }
    ]);
    setLeaveData(stats.leaveCount > 0 ? [{ STATUS: 'A/Leave', countt: stats.leaveCount }] : []);
    
    if (!employeeInfo) {
      setEmployeeInfo({
        pak: currentUserPak,
        rank: 'Captain',
        name: 'Sample Employee'
      });
    }
    
    setDataSource('SAMPLE_DATA');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date');
      return;
    }

    if (!currentUserPak || currentUserPak.trim() === '') {
      setError('Please enter a valid PAK number');
      return;
    }

    setLoading(true);
    setError('');
    setDataSource('');

    try {
      const apiUrl = `http://10.0.0.7:5000/api/PAFemployee/attendance/view/${currentUserPak}?startDate=${startDate}&endDate=${endDate}`;
      console.log('Fetching from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        
        // Try to parse as JSON for better error message
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || `HTTP ${response.status}: ${response.statusText}`);
        } catch {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      console.log('API Result:', result);
      
      if (result.success && result.data) {
        const data = result.data;
        setDataSource(result.data_source || 'REAL_DATABASE');
        
        setEmployeeInfo(data.employee);
        setAttendanceData(data.attendanceData || []);
        setSummaryData(data.summaryData || []);
        setLeaveData(data.leaveData || []);
        
        if (data.attendanceData.length === 0) {
          setError('No attendance records found for the selected date range.');
        }
      } else {
        throw new Error(result.message || 'Failed to fetch attendance data');
      }
      
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError(`Database Error: ${err.message}. Showing sample data for demonstration.`);
      
      // Use sample data for demonstration
      generateSampleData();
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!attendanceData || attendanceData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['S/No.', 'Date', 'Day', 'Status', 'Remarks'].join(',');
    
    const csvData = attendanceData.map(record => [
      record.row_number,
      record.attendence_date,
      record.day_name || new Date(record.attendence_date).toLocaleDateString('en-US', { weekday: 'long' }),
      `"${record.STATUS || ''}"`,
      `"${record.REMARKS || ''}"`
    ].join(',')).join('\n');

    const csvContent = headers + '\n' + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${currentUserPak}_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate statistics from current data
  const calculateStatistics = () => {
    if (!attendanceData || attendanceData.length === 0) {
      return {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        halfDays: 0,
        leaveDays: 0,
        attendancePercentage: 0
      };
    }

    const presentDays = attendanceData.filter(item => 
      item.STATUS && item.STATUS.includes('Present')).length;
    const absentDays = attendanceData.filter(item => 
      item.STATUS && item.STATUS.includes('Absent')).length;
    const lateDays = attendanceData.filter(item => 
      item.STATUS && item.STATUS.includes('Late')).length;
    const halfDays = attendanceData.filter(item => 
      item.STATUS && (item.STATUS.includes('Half') || item.STATUS.includes('Half Day'))).length;
    const leaveDays = attendanceData.filter(item => 
      item.STATUS && item.STATUS.includes('Leave')).length;

    const workingDays = attendanceData.length;
    const attendancePercentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

    return {
      totalDays: workingDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      leaveDays,
      attendancePercentage: parseFloat(attendancePercentage.toFixed(2))
    };
  };

  const stats = calculateStatistics();

  return (
    <div className="view-personnel-attendance">
      
      
      
     


      {/* Header */}
                 <StandardHeader 
              title={<h1>PAF Personnel Attendance</h1>}
              subtitle={ 
                  <div className="attendance-header">
        <div className="header-info">
          <span className={`api-status ${apiStatus.includes('✅') ? 'connected' : 'disconnected'}`}>
            {apiStatus}
          </span>
          {dataSource && (
            <span className="data-source">
              Data Source: <strong>{dataSource}</strong>
            </span>
          )}
        </div>
        <div className="header-actions">
          <button onClick={handlePrint} className="action-btn print-btn">
            Print Report
          </button>
          <button 
            onClick={handleExport} 
            className="action-btn export-btn"
            disabled={!attendanceData || attendanceData.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

              }
            />



      <form onSubmit={handleSubmit} className="date-selection-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="pakInput">PAK Number *</label>
            <input
              type="text"
              id="pakInput"
              value={currentUserPak}
              onChange={handlePakChange}
              className="pak-input"
              placeholder="Enter PAK number"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="startDate">Start Date *</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="endDate">End Date *</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-input"
              required
            />
          </div>
          
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Fetching Data...
              </>
            ) : 'View Attendance'}
          </button>
        </div>
        
        {availableMonths.length > 0 && (
          <div className="month-selection">
            <label>Quick Select Month:</label>
            <div className="month-buttons">
              {availableMonths.slice(0, 6).map((month, index) => (
                <button
                  key={index}
                  type="button"
                  className="month-btn"
                  onClick={() => handleMonthSelect(month)}
                  title={`${month.record_count} records available`}
                >
                  {month.month_year} ({month.record_count})
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {error && (
        <div className={`message ${error.includes('Error') ? 'error' : 'warning'}`}>
          {error}
        </div>
      )}

      {attendanceData.length > 0 && employeeInfo && (
        <div className="attendance-report">
          {/* Header Section */}
          <div className="report-header">
            <div className="employee-info">
              <h2>Attendance Report</h2>
              <div className="info-grid">
                <div className="info-item">
                  <strong>PAK No:</strong>
                  <span>{employeeInfo.pak}</span>
                </div>
                <div className="info-item">
                  <strong>Rank:</strong>
                  <span>{employeeInfo.rank || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <strong>Name:</strong>
                  <span>{employeeInfo.name || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <strong>Category:</strong>
                  <span>{employeeInfo.category || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="date-range">
              <div className="date-item">
                <strong>Period:</strong>
                <span>{new Date(startDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}</span>
                <span className="date-separator">to</span>
                <span>{new Date(endDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}</span>
              </div>
              <div className="report-meta">
                <span className="record-count">
                  {attendanceData.length} attendance records
                </span>
                <span className="generated-on">
                  Generated on: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-label">Working Days</span>
              <span className="stat-value">{stats.totalDays}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Present</span>
              <span className="stat-value present">{stats.presentDays}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Absent</span>
              <span className="stat-value absent">{stats.absentDays}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Late</span>
              <span className="stat-value late">{stats.lateDays}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Leave</span>
              <span className="stat-value leave">{stats.leaveDays}</span>
            </div>
            <div className="stat-item highlight">
              <span className="stat-label">Attendance %</span>
              <span className="stat-value percentage">
                {stats.attendancePercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Details Section */}
          <div className="details-section">
            <h3>Attendance Details</h3>
            <div className="datagrid-container">
              <div className="datagrid">
                <table>
                  <thead>
                    <tr>
                      <th width="60">S/No.</th>
                      <th width="120">Date</th>
                      <th width="100">Day</th>
                      <th width="100">Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map((record, index) => (
                      <tr key={index} className={index % 2 === 0 ? '' : 'alt'}>
                        <td>{record.row_number}</td>
                        <td>
                          {new Date(record.attendence_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td>
                          {record.day_name || 
                           new Date(record.attendence_date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </td>
                        <td>
                          <span 
                            className={`status-badge ${(record.STATUS || '').toLowerCase().replace(/\s+/g, '-').replace('/', '-')}`}
                          >
                            {record.STATUS || 'N/A'}
                          </span>
                        </td>
                        <td>{record.REMARKS || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="statistics-section">
            <h3>Detailed Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <h4>Total Working Days</h4>
                  <p className="stat-number">{stats.totalDays}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <h4>Present Days</h4>
                  <p className="stat-number">{stats.presentDays}</p>
                  <p className="stat-percent">
                    {stats.totalDays > 0 ? ((stats.presentDays / stats.totalDays) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">❌</div>
                <div className="stat-content">
                  <h4>Absent Days</h4>
                  <p className="stat-number">{stats.absentDays}</p>
                  <p className="stat-percent">
                    {stats.totalDays > 0 ? ((stats.absentDays / stats.totalDays) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">⏰</div>
                <div className="stat-content">
                  <h4>Late Arrivals</h4>
                  <p className="stat-number">{stats.lateDays}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">½</div>
                <div className="stat-content">
                  <h4>Half Days</h4>
                  <p className="stat-number">{stats.halfDays}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🏖️</div>
                <div className="stat-content">
                  <h4>Leave Days</h4>
                  <p className="stat-number">{stats.leaveDays}</p>
                  <p className="stat-percent">
                    {stats.totalDays > 0 ? ((stats.leaveDays / stats.totalDays) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Progress */}
          <div className="progress-section">
            <h3>Attendance Progress</h3>
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${Math.min(stats.attendancePercentage, 100)}%`,
                    backgroundColor: stats.attendancePercentage >= 90 ? '#2ecc71' : 
                                   stats.attendancePercentage >= 75 ? '#f39c12' : '#e74c3c'
                  }}
                >
                  <span className="progress-text">
                    {stats.attendancePercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="progress-labels">
                <span>0%</span>
                <span className="progress-status">
                  {stats.attendancePercentage >= 90 ? 'Excellent' : 
                   stats.attendancePercentage >= 75 ? 'Good' : 
                   stats.attendancePercentage >= 60 ? 'Average' : 'Needs Improvement'}
                </span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Summary Notes */}
          <div className="summary-notes">
            <p>
              <strong>Note:</strong> Attendance calculation excludes weekends. 
              Leave days are counted separately from working days.
            </p>
            {dataSource === 'SAMPLE_DATA' && (
              <p className="sample-note">
                <strong>⚠️ Demonstration Mode:</strong> Showing sample data. 
                Real attendance data will be displayed when connected to the database.
              </p>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>Fetching attendance data from database...</p>
            <p className="loading-sub">Please wait while we retrieve the records</p>
          </div>
        </div>
      )}

      {!loading && attendanceData.length === 0 && !error && (
        <div className="no-data-message">
          <div className="no-data-content">
            <div className="no-data-icon">📊</div>
            <h3>No Attendance Data</h3>
            <p>Select a PAK number and date range to view attendance records</p>
            <button 
              onClick={() => setCurrentUserPak('')}
              className="demo-btn"
            >
              Try with Sample PAK: 
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewPersonnelAttendance;