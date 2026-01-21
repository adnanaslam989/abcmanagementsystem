import React, { useState, useEffect } from 'react';
import './ViewAttendanceHistory.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const ViewAttendanceHistory = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [deploymentSummary, setDeploymentSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [message, setMessage] = useState('');

  const API_BASE_URL = 'http://10.0.0.7:5000';

  useEffect(() => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  const handleDateSubmit = async () => {
    if (!selectedDate) {
      setMessage('Please select date first');
      return;
    }

    setIsLoading(true);
    setShowReport(false);
    setMessage(`Loading attendance data for ${selectedDate}...`);
    
    try {
      // Fetch summary data
      const summaryResponse = await fetch(
        `${API_BASE_URL}/api/employee/attendance-history/summary/${selectedDate}`
      );
      
      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch summary data');
      }
      
      const summaryResult = await summaryResponse.json();
      
      if (!summaryResult.success) {
        throw new Error(summaryResult.message || 'Failed to load summary');
      }
      
      // Fetch detailed data
      const detailedResponse = await fetch(
        `${API_BASE_URL}/api/employee/attendance-history/detailed/${selectedDate}`
      );
      
      if (!detailedResponse.ok) {
        throw new Error('Failed to fetch detailed data');
      }
      
      const detailedResult = await detailedResponse.json();
      
      if (!detailedResult.success) {
        throw new Error(detailedResult.message || 'Failed to load details');
      }
      
      // Process summary data
      const statusCounts = summaryResult.status_counts || [];
      const totalStrength = summaryResult.total_strength || 0;
      
      // Calculate status percentages
      const statusWithPercentages = statusCounts.map(item => ({
        ...item,
        percentage: totalStrength > 0 ? Math.round((item.count / totalStrength) * 100) : 0
      }));
      
      setSummaryData({
        totalStrength: totalStrength,
        statusCounts: statusWithPercentages
      });
      
      setDeploymentSummary(summaryResult.deployment_summary || []);
      setAttendanceData(detailedResult.detailed_data || []);
      setShowReport(true);
      setMessage(`✅ Attendance data loaded for ${formatDate(selectedDate)}`);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setMessage(`❌ Error: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
  if (!showReport || !attendanceData || !summaryData) {
    alert('No report data available to print');
    return;
  }

  // Create a print window
  const printWindow = window.open('', '_blank');
  
  // Calculate statistics
  const totalPresent = calculateTotalPresent();
  const totalAbsentLeave = calculateTotalAbsentLeave();
  const attendancePercent = calculateAttendancePercentage();
  const totalDeployments = attendanceData.length;
  
  // Create status summary HTML
  const statusSummaryHTML = summaryData.statusCounts.map((item, index) => {
    const statusColor = getStatusColor(item.STATUS);
    return `
      <div class="print-status-item" style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
        <span>
          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${statusColor}; margin-right: 8px;"></span>
          ${item.STATUS}
        </span>
        <span>${item.count} (${item.percentage || 0}%)</span>
      </div>
    `;
  }).join('');

  // Create deployment summary HTML
  const deploymentSummaryHTML = deploymentSummary.map((dept, index) => {
    const present = parseInt(dept.present_count) || 0;
    const total = parseInt(dept.total_strength) || 1;
    const attendancePercent = Math.round((present / total) * 100);
    const absentLeave = total - present;
    const color = attendancePercent >= 90 ? '#28a745' : 
                  attendancePercent >= 70 ? '#ffc107' : '#dc3545';
    
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${dept.deployment}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${total}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${present}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: ${color}">
          ${attendancePercent}%
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${absentLeave}</td>
      </tr>
    `;
  }).join('');

  // Create detailed attendance HTML
  let detailedAttendanceHTML = '';
  attendanceData.forEach((deploymentGroup, groupIndex) => {
    detailedAttendanceHTML += `
      <tr style="background-color: #343a40; color: white;">
        <td colspan="9" style="padding: 12px; font-weight: bold; font-size: 14px;">
          🏢 ${deploymentGroup.deployment} - Total: ${deploymentGroup.employees.length} employees
        </td>
      </tr>
    `;
    
    deploymentGroup.employees.forEach((employee, empIndex) => {
      const statusColor = getStatusColor(employee.status);
      const rowBgColor = empIndex % 2 === 0 ? '#f8f9fa' : 'white';
      
      detailedAttendanceHTML += `
        <tr style="background-color: ${rowBgColor};">
          <td style="padding: 6px; text-align: center; border-bottom: 1px solid #ddd;">${employee.row_number || empIndex + 1}</td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd;">${employee.appointment || 'N/A'}</td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd;">${employee.employee_name}</td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center; background-color: ${statusColor}; color: white; font-weight: bold; border-radius: 4px;">
            ${employee.status}
          </td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center;">${employee.time_in || '--:--'}</td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center;">${employee.time_out || '--:--'}</td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: ${employee.MISSED_HOURS > 0 ? '#28a745' : employee.MISSED_HOURS < 0 ? '#dc3545' : '#6c757d'}">
            ${employee.MISSED_HOURS !== null && employee.MISSED_HOURS !== undefined ? 
              (employee.MISSED_HOURS > 0 ? '+' : '') + parseFloat(employee.MISSED_HOURS).toFixed(1) : 
              '0.0'}
          </td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size: 11px;">${employee.remarks || '-'}</td>
        </tr>
      `;
    });
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Attendance Report - ${formatDate(selectedDate)}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #000;
          background: #fff;
          font-size: 11px;
        }
        
        .print-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        
        .print-header h1 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }
        
        .print-header h2 {
          margin: 5px 0 0 0;
          font-size: 14px;
          color: #666;
        }
        
        .print-meta {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #666;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        
        /* Quick Stats */
        .quick-stats-print {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin: 20px 0;
        }
        
        .stat-card-print {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: center;
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        .stat-value-print {
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
          margin: 5px 0;
        }
        
        .stat-label-print {
          font-size: 10px;
          color: #666;
        }
        
        /* Summary Section */
        .summary-print {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0;
          page-break-inside: avoid;
        }
        
        .summary-card-print {
          border: 1px solid #ddd;
          padding: 15px;
          background: #fff;
        }
        
        .summary-title {
          font-size: 12px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #007bff;
        }
        
        /* Tables */
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 10px;
          page-break-inside: avoid;
        }
        
        .print-table th {
          background: #2056AC;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #ddd;
        }
        
        .print-table td {
          padding: 8px;
          border: 1px solid #ddd;
        }
        
        .print-table tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        /* Detailed table column widths */
        .detailed-table th:nth-child(1),
        .detailed-table td:nth-child(1) { width: 40px; text-align: center; } /* S/No */
        .detailed-table th:nth-child(2),
        .detailed-table td:nth-child(2) { width: 80px; } /* Appointment */
        .detailed-table th:nth-child(3),
        .detailed-table td:nth-child(3) { width: 150px; } /* Employee Name */
        .detailed-table th:nth-child(4),
        .detailed-table td:nth-child(4) { width: 80px; text-align: center; } /* Status */
        .detailed-table th:nth-child(5),
        .detailed-table td:nth-child(5) { width: 60px; text-align: center; } /* Time In */
        .detailed-table th:nth-child(6),
        .detailed-table td:nth-child(6) { width: 60px; text-align: center; } /* Time Out */
        .detailed-table th:nth-child(7),
        .detailed-table td:nth-child(7) { width: 60px; text-align: center; } /* Hours */
        .detailed-table th:nth-child(8),
        .detailed-table td:nth-child(8) { width: 100px; } /* Remarks */
        
        /* Deployment table column widths */
        .deployment-table th:nth-child(1),
        .deployment-table td:nth-child(1) { width: 150px; } /* Deployment */
        .deployment-table th:nth-child(2),
        .deployment-table td:nth-child(2),
        .deployment-table th:nth-child(3),
        .deployment-table td:nth-child(3),
        .deployment-table th:nth-child(5),
        .deployment-table td:nth-child(5) { width: 80px; text-align: center; } /* Counts */
        .deployment-table th:nth-child(4),
        .deployment-table td:nth-child(4) { width: 100px; text-align: center; } /* Attendance % */
        
        /* Footer */
        .print-footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 15px;
          }
          
          .page-break {
            page-break-before: always;
          }
        }
        
        /* Status colors */
        .status-present { background-color: #28a745; }
        .status-late { background-color: #ffc107; }
        .status-leave { background-color: #17a2b8; }
        .status-absent { background-color: #dc3545; }
        .status-halfday { background-color: #fd7e14; }
        .status-holiday { background-color: #6f42c1; }
        
        /* Report statistics */
        .report-stats {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>Attendance History Report</h1>
        <h2>${formatDate(selectedDate)}</h2>
      </div>
      
      <div class="print-meta">
        <div>
          <strong>Report ID:</strong> ATT-${selectedDate.replace(/-/g, '')}
        </div>
        <div>
          <strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>
      
      <!-- Quick Stats -->
      <div class="quick-stats-print">
        <div class="stat-card-print">
          <div class="stat-value-print">${summaryData.totalStrength || 0}</div>
          <div class="stat-label-print">Total Strength</div>
        </div>
        <div class="stat-card-print">
          <div class="stat-value-print">${totalPresent}</div>
          <div class="stat-label-print">Present Today</div>
          <div style="font-size: 9px; color: #28a745;">(${attendancePercent}%)</div>
        </div>
        <div class="stat-card-print">
          <div class="stat-value-print">${totalAbsentLeave}</div>
          <div class="stat-label-print">Absent/Leave</div>
          <div style="font-size: 9px; color: #dc3545;">
            (${summaryData.totalStrength > 0 ? Math.round((totalAbsentLeave / summaryData.totalStrength) * 100) : 0}%)
          </div>
        </div>
        <div class="stat-card-print">
          <div class="stat-value-print">${attendancePercent}%</div>
          <div class="stat-label-print">Attendance Rate</div>
        </div>
      </div>
      
      <!-- Summary Section -->
      <div class="summary-print">
        <div class="summary-card-print">
          <div class="summary-title">📋 Daily Status Summary</div>
          <div class="status-list-print">
            ${statusSummaryHTML}
            <div style="display: flex; justify-content: space-between; padding: 8px 0; margin-top: 5px; border-top: 2px solid #333; font-weight: bold;">
              <span>📊 Total Strength:</span>
              <span>${summaryData.totalStrength}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: bold; color: #28a745;">
              <span>🎯 Attendance Rate:</span>
              <span>${attendancePercent}%</span>
            </div>
          </div>
        </div>
        
        <div class="summary-card-print">
          <div class="summary-title">🏢 Deployment Summary</div>
          <table class="print-table deployment-table">
            <thead>
              <tr>
                <th>Deployment</th>
                <th>Total</th>
                <th>Present</th>
                <th>Attendance %</th>
                <th>Absent/Leave</th>
              </tr>
            </thead>
            <tbody>
              ${deploymentSummaryHTML}
            </tbody>
          </table>
          <div style="font-size: 9px; color: #666; margin-top: 10px; text-align: center;">
            <strong>Note:</strong> Present includes Present and Late statuses
          </div>
        </div>
      </div>
      
      <!-- Report Statistics -->
      <div class="report-stats">
        <div><strong>Total Deployments:</strong> ${totalDeployments}</div>
        <div><strong>Total Employees:</strong> ${summaryData.totalStrength}</div>
        <div><strong>Attendance Rate:</strong> ${attendancePercent}%</div>
        <div><strong>Report Date:</strong> ${formatDate(selectedDate)}</div>
        <div><strong>Present Count:</strong> ${totalPresent}</div>
        <div><strong>Absent/Leave Count:</strong> ${totalAbsentLeave}</div>
      </div>
      
      <!-- Detailed Attendance Table -->
      <div style="margin-top: 25px;">
        <div style="font-size: 12px; font-weight: bold; margin-bottom: 10px; color: #333; border-bottom: 2px solid #28a745; padding-bottom: 5px;">
          👥 Detailed Attendance by Deployment
        </div>
        <table class="print-table detailed-table">
          <thead>
            <tr>
              <th>S/No</th>
              <th>Appointment</th>
              <th>Employee Name</th>
              <th>Status</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Hours</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${detailedAttendanceHTML}
          </tbody>
        </table>
      </div>
      
      <div class="print-footer">
        <p><strong>Attendance History Report</strong> - ${formatDate(selectedDate)}</p>
        <p>Total Employees: ${summaryData.totalStrength} | Attendance Rate: ${attendancePercent}%</p>
        <p>Civilian Attendance Management System | Generated on: ${new Date().toLocaleDateString()}</p>
        <p>Page 1 of 1</p>
      </div>
      
      <script>
        // Auto-print and close
        window.onload = function() {
          setTimeout(function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  
  printWindow.document.close();
};

  const handleGeneratePDF = () => {
    setMessage('📄 PDF generation functionality would be implemented here');
    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'present':
        return '#28a745'; // Green
      case 'late':
        return '#ffc107'; // Yellow
      case 'leave':
        return '#17a2b8'; // Blue
      case 'absent':
        return '#dc3545'; // Red
      case 'half day':
        return '#fd7e14'; // Orange
      case 'holiday work':
        return '#6f42c1'; // Purple
      default:
        return '#6c757d'; // Gray
    }
  };

  // Calculate attendance percentage
  const calculateAttendancePercentage = () => {
    if (!summaryData || !summaryData.statusCounts) return 0;
    
    const presentCount = summaryData.statusCounts
      .filter(item => item.STATUS === 'Present' || item.STATUS === 'Late')
      .reduce((sum, item) => sum + parseInt(item.count), 0);
    
    const total = summaryData.totalStrength;
    
    return total > 0 ? Math.round((presentCount / total) * 100) : 0;
  };

  // Calculate chart data for pie chart - FIXED VERSION
  const calculateChartData = () => {
    if (!summaryData || !summaryData.statusCounts || summaryData.statusCounts.length === 0) return [];
    
    const total = summaryData.totalStrength;
    if (total === 0) return [];
    
    // Create a map of status counts
    const statusMap = {};
    summaryData.statusCounts.forEach(item => {
      statusMap[item.STATUS] = item.count;
    });
    
    // Define all possible statuses with their colors
    const statusDefinitions = [
      { status: 'Present', color: '#28a745' },
      { status: 'Late', color: '#ffc107' },
      { status: 'Half Day', color: '#fd7e14' },
      { status: 'Leave', color: '#17a2b8' },
      { status: 'Absent', color: '#dc3545' },
      { status: 'Holiday Work', color: '#6f42c1' }
    ];
    
    // Only include statuses that have actual data
    return statusDefinitions
      .filter(def => statusMap[def.status] > 0)
      .map(def => ({
        status: def.status,
        count: statusMap[def.status],
        color: def.color,
        percentage: Math.round((statusMap[def.status] / total) * 100)
      }));
  };

  // Calculate deployment chart data for pie chart
  const calculateDeploymentChartData = () => {
    if (!deploymentSummary || deploymentSummary.length === 0) return [];
    
    // Sort deployments by attendance percentage
    const sortedDeployments = [...deploymentSummary].sort((a, b) => {
      const aPercent = parseInt(a.present_count) / parseInt(a.total_strength);
      const bPercent = parseInt(b.present_count) / parseInt(b.total_strength);
      return bPercent - aPercent;
    });
    
    return sortedDeployments.map((dept, index) => {
      const present = parseInt(dept.present_count) || 0;
      const total = parseInt(dept.total_strength) || 1;
      const attendancePercent = Math.round((present / total) * 100);
      
      // Generate color based on attendance percentage
      let color;
      if (attendancePercent >= 90) color = '#28a745'; // Green for excellent
      else if (attendancePercent >= 70) color = '#ffc107'; // Yellow for good
      else color = '#dc3545'; // Red for poor
      
      return {
        deployment: dept.deployment,
        presentCount: present,
        totalStrength: total,
        attendancePercent: attendancePercent,
        color: color
      };
    });
  };

  // Generate conic gradient for status pie chart
  const generateStatusConicGradient = () => {
    const chartData = calculateChartData();
    if (chartData.length === 0) return 'conic-gradient(#6c757d 0% 100%)';
    
    let cumulativePercentage = 0;
    const gradientStops = chartData.map(item => {
      const start = cumulativePercentage + '%';
      cumulativePercentage += item.percentage;
      const end = cumulativePercentage + '%';
      return `${item.color} ${start} ${end}`;
    });
    
    return `conic-gradient(${gradientStops.join(', ')})`;
  };

  // Generate conic gradient for deployment pie chart
  const generateDeploymentConicGradient = () => {
    const chartData = calculateDeploymentChartData();
    if (chartData.length === 0) return 'conic-gradient(#6c757d 0% 100%)';
    
    // Calculate total employees across all deployments
    const totalEmployees = chartData.reduce((sum, dept) => sum + dept.totalStrength, 0);
    
    let cumulativePercentage = 0;
    const gradientStops = chartData.map(dept => {
      const percentage = (dept.totalStrength / totalEmployees) * 100;
      const start = cumulativePercentage + '%';
      cumulativePercentage += percentage;
      const end = cumulativePercentage + '%';
      return `${dept.color} ${start} ${end}`;
    });
    
    return `conic-gradient(${gradientStops.join(', ')})`;
  };

  // Calculate total present count
  const calculateTotalPresent = () => {
    if (!summaryData || !summaryData.statusCounts) return 0;
    
    return summaryData.statusCounts
      .filter(item => item.STATUS === 'Present' || item.STATUS === 'Late')
      .reduce((sum, item) => sum + parseInt(item.count), 0);
  };

  // Calculate total absent/leave
  const calculateTotalAbsentLeave = () => {
    if (!summaryData || !summaryData.statusCounts) return 0;
    
    return summaryData.statusCounts
      .filter(item => item.STATUS === 'Absent' || item.STATUS === 'Leave')
      .reduce((sum, item) => sum + parseInt(item.count), 0);
  };

  return (
    <div className="attendance-history-page">


        
          

             {/* Header */}
           <StandardHeader 
        title={<h1>View Attendance History</h1>}
        subtitle={ <div className="default-times-info">
            <small>Select a date to view attendance details</small>
          </div>}
      />

      {/* Main Content */}
      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="report-content">
            {/* Message Display */}
            {message && (
              <div className={`message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : message.includes('📄') ? 'info' : 'info'}`}>
                {message}
              </div>
            )}

            {/* Date Selection Section */}
            <section className="selection-section">
              <div className="selection-form">
                <div className="form-group">
                  <label htmlFor="selectedDate">Select Date:</label>
                  <input
                    type="date"
                    id="selectedDate"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="date-input"
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleDateSubmit}
                    disabled={isLoading}
                    style={{ minWidth: '80px' }}
                  >
                    {isLoading ? 'Loading...' : 'View Report'}
                  </button>
                </div>
                {selectedDate && (
                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: '10px',
                    fontSize: '14px',
                    color: '#6c757d'
                  }}>
                    Selected: <strong>{formatDate(selectedDate)}</strong>
                  </div>
                )}
              </div>
            </section>

            {/* Action Buttons */}
            {showReport && (
              <div className="action-buttons-top">
                <button className="pdf-btn" onClick={handleGeneratePDF}>
                  📊 Generate PDF
                </button>
                <button className="print-btn" onClick={handlePrint}>
                  🖨️ Print Report
                </button>
              </div>
            )}

            {/* Report Section */}
            {showReport && attendanceData && summaryData && (
              <div id="printarea">
                {/* Report Header */}
                <div className="report-title-section">
                  <h2>Attendance Report: {formatDate(selectedDate)}</h2>
                  <div style={{ 
                    marginTop: '10px',
                    fontSize: '14px',
                    color: '#6c757d'
                  }}>
                    Report ID: ATT-{selectedDate.replace(/-/g, '')}
                  </div>
                </div>

                {/* Quick Stats Overview */}
                <div className="quick-stats-overview" style={{ marginBottom: '2rem' }}>
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{summaryData.totalStrength || 0}</div>
                    <div className="stat-label">Total Strength</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-value">
                      {calculateTotalPresent()}
                      <small style={{ fontSize: '0.8rem', color: '#28a745' }}>
                        ({calculateAttendancePercentage()}%)
                      </small>
                    </div>
                    <div className="stat-label">Present Today</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">❌</div>
                    <div className="stat-value">
                      {calculateTotalAbsentLeave()}
                      <small style={{ fontSize: '0.8rem', color: '#dc3545' }}>
                        ({summaryData.totalStrength > 0 ? 
                          Math.round((calculateTotalAbsentLeave() / summaryData.totalStrength) * 100) : 0}%)
                      </small>
                    </div>
                    <div className="stat-label">Absent/Leave</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-value">{calculateAttendancePercentage()}%</div>
                    <div className="stat-label">Attendance Rate</div>
                  </div>
                </div>

                {/* Summary Section */}
                <section className="summary-section">
                  <div className="summary-grid">
                    <div className="summary-card">
                      <h4 style={{ borderBottom: '2px solid #28a745', paddingBottom: '10px' }}>
                        📋 Daily Summary
                      </h4>
                      <div className="status-list">
                        {summaryData.statusCounts.map((item, index) => (
                          <div key={index} className="status-item">
                            <span 
                              className="status-color"
                              style={{ backgroundColor: getStatusColor(item.STATUS) }}
                            ></span>
                            <span className="status-name">{item.STATUS}:</span>
                            <span className="status-count">{item.count}</span>
                            <span className="status-percentage">
                              ({item.percentage || 0}%)
                            </span>
                          </div>
                        ))}
                        <div className="status-item total-strength">
                          <span className="status-name"><strong>📊 Total Strength:</strong></span>
                          <span className="status-count"><strong>{summaryData.totalStrength}</strong></span>
                        </div>
                        <div className="status-item attendance-rate">
                          <span className="status-name"><strong>🎯 Attendance Rate:</strong></span>
                          <span className="status-count" style={{ color: '#28a745', fontWeight: 'bold' }}>
                            {calculateAttendancePercentage()}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="chart-placeholder">
                      <div className="chart-container">
                        <h4 style={{ borderBottom: '2px solid #17a2b8', paddingBottom: '10px' }}>
                          📊 Status Distribution
                        </h4>
                        <div className="pie-chart-placeholder">
                          <div 
                            className="chart-mock"
                            style={{ 
                              background: generateStatusConicGradient(),
                              width: '240px',
                              height: '240px',
                              borderRadius: '50%',
                              position: 'relative',
                              margin: '0 auto',
                              border: '8px solid white',
                              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                            }}
                          >
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '80px',
                              height: '80px',
                              backgroundColor: 'white',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                              <div style={{ 
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                color: '#2c3e50'
                              }}>
                                {calculateAttendancePercentage()}%
                              </div>
                            </div>
                          </div>
                          <div className="chart-legend">
                            {calculateChartData().map((item, index) => (
                              <div key={index} className="legend-item">
                                <span 
                                  className="legend-color" 
                                  style={{ backgroundColor: item.color }}
                                ></span>
                                <span style={{ flex: 1 }}>{item.status}</span>
                                <span style={{ 
                                  fontWeight: 'bold',
                                  marginRight: '10px'
                                }}>
                                  {item.count}
                                </span>
                                <span style={{ 
                                  color: '#667eea',
                                  fontWeight: '600',
                                  fontSize: '0.9rem'
                                }}>
                                  {item.percentage}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Deployment Summary */}
                {deploymentSummary.length > 0 && (
                  <section className="deployment-summary-section">
                    <div className="deployment-grid">
                      <div className="deployment-table-container">
                        <h4 style={{ borderBottom: '2px solid #6c757d', paddingBottom: '10px' }}>
                          🏢 Deployment-wise Summary
                        </h4>
                        <div className="datagrid">
                          <table className="deployment-table">
                            <thead>
                              <tr>
                                <th>Deployment</th>
                                <th>Total Strength</th>
                                <th>Total Present</th>
                                <th>Attendance %</th>
                                <th>Absent/Leave</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deploymentSummary.map((dept, index) => {
                                const present = parseInt(dept.present_count) || 0;
                                const total = parseInt(dept.total_strength) || 1;
                                const attendancePercent = Math.round((present / total) * 100);
                                const absentLeave = total - present;
                                
                                return (
                                  <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                                    <td><strong>{dept.deployment}</strong></td>
                                    <td>{total}</td>
                                    <td>{present}</td>
                                    <td>
                                      <span style={{ 
                                        color: attendancePercent >= 90 ? '#28a745' : 
                                               attendancePercent >= 70 ? '#ffc107' : '#dc3545',
                                        fontWeight: 'bold'
                                      }}>
                                        {attendancePercent}%
                                      </span>
                                    </td>
                                    <td>{absentLeave}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="table-legend">
                          <p><strong>Note:</strong> Present includes Present and Late statuses</p>
                        </div>
                      </div>

                 
                    </div>
                  </section>
                )}

                {/* Detailed Attendance Table */}
                <section className="detailed-attendance-section">
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: 0 }}>
                      👥 Detailed Attendance by Deployment
                    </h4>
                    <div className="attendance-summary-bar">
                      {calculateChartData().map((item, index) => (
                        <div 
                          key={index} 
                          className="summary-badge"
                          style={{ 
                            backgroundColor: `${item.color}20`,
                            color: item.color,
                            border: `1px solid ${item.color}40`
                          }}
                        >
                          <span>{item.status}:</span>
                          <span>{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="datagrid">
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>S/No</th>
                          <th style={{ width: '80px' }}>Appointment</th>
                          <th>Employee Name</th>
                          <th style={{ width: '120px' }}>Status</th>
                          <th style={{ width: '80px' }}>Time In</th>
                          <th style={{ width: '80px' }}>Time Out</th>
                          <th style={{ width: '80px' }}>Hours</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.map((deploymentGroup, groupIndex) => (
                          <React.Fragment key={groupIndex}>
                            {/* Deployment Header Row */}
                            <tr className="deployment-header">
                              <td colSpan="9" style={{ 
                                backgroundColor: '#343a40', 
                                color: 'white', 
                                fontWeight: 'bold', 
                                padding: '12px',
                                fontSize: '16px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>🏢 {deploymentGroup.deployment}</span>
                                  <span style={{ fontSize: '14px', opacity: 0.9 }}>
                                    Total: {deploymentGroup.employees.length} employees
                                  </span>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Employee Rows */}
                            {deploymentGroup.employees.map((employee, empIndex) => {
                              const statusColor = getStatusColor(employee.status);
                              const isPresent = employee.status === 'Present' || employee.status === 'Late';
                              const isHolidayWork = employee.status === 'Holiday Work';
                              
                              return (
                                <tr key={empIndex} className={empIndex % 2 === 0 ? 'alt' : ''}>
                                  <td className="serial-number" style={{ textAlign: 'center' }}>
                                    {employee.row_number}
                                  </td>
                               
                                  <td className="appointment">
                                    {employee.appointment}
                                  </td>
                                  <td className="employee-name">
                                    {employee.employee_name}
                                  </td>
                                  <td className="status" style={{ 
                                    color: '#fff',
                                    backgroundColor: statusColor,
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    padding: '6px',
                                    borderRadius: '4px'
                                  }}>
                                    {employee.status}
                                  </td>
                                  <td className="time-in" style={{ textAlign: 'center' }}>
                                    {employee.time_in || '--:--'}
                                  </td>
                                  <td className="time-out" style={{ textAlign: 'center' }}>
                                    {employee.time_out || '--:--'}
                                  </td>
                                  <td className="hours" style={{ 
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    color: employee.MISSED_HOURS > 0 ? '#28a745' : 
                                           employee.MISSED_HOURS < 0 ? '#dc3545' : '#6c757d'
                                  }}>
                                    {employee.MISSED_HOURS !== null && employee.MISSED_HOURS !== undefined ? 
                                      (employee.MISSED_HOURS > 0 ? '+' : '') + parseFloat(employee.MISSED_HOURS).toFixed(1) : 
                                      '0.0'
                                    }
                                  </td>
                                  <td className="remarks" style={{ fontSize: '13px' }}>
                                    {employee.remarks || '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Report Statistics */}
                <div className="report-statistics" style={{ 
                  marginTop: '30px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <h5>📈 Report Statistics</h5>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    marginTop: '15px'
                  }}>
                    <div>
                      <strong>Total Deployments:</strong> {attendanceData.length}
                    </div>
                    <div>
                      <strong>Total Employees:</strong> {summaryData.totalStrength}
                    </div>
                    <div>
                      <strong>Attendance Rate:</strong> {calculateAttendancePercentage()}%
                    </div>
                    <div>
                      <strong>Report Date:</strong> {formatDate(selectedDate)}
                    </div>
                  </div>
                </div>

                {/* Report Footer */}
                <div className="report-footer">
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px 0',
                    borderTop: '1px solid #dee2e6'
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                        Report generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                      </p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#adb5bd' }}>
                        Civilian Attendance Management System
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                        Report ID: ATT-{selectedDate.replace(/-/g, '')}
                      </p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#adb5bd' }}>
                        Page 1 of 1
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading attendance data for {formatDate(selectedDate)}...</p>
                <p className="loading-subtext">Fetching data from database...</p>
              </div>
            )}

            {/* No Report State */}
            {!isLoading && !showReport && (
              <div className="no-data-message">
                <div className="no-data-icon">📅</div>
                <h3>Select Date to View Attendance</h3>
                <p>Choose a date from the calendar above to view the attendance report.</p>
                <p>The report will show deployment-wise attendance, statistics, and detailed employee status.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAttendanceHistory;