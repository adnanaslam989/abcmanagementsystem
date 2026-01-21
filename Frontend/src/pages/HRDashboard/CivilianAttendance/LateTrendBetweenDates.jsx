import React, { useState, useEffect } from 'react';
import './LateTrendBetweenDates.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const LateTrendBetweenDates = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [viewMode, setViewMode] = useState('summary'); // 'summary', 'late', 'early', 'employee'
  
  const API_BASE_URL = 'http://10.0.0.7:5000';

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    setToDate(todayStr);
    setFromDate(thirtyDaysAgoStr);
  }, []);

  const handleDateSubmit = async () => {
    if (!fromDate || !toDate) {
      alert('Please select both from and to dates');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      alert('From date cannot be greater than To date');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnalysisData(null);
    setSelectedEmployee(null);
    setEmployeeDetails(null);
    
    try {
      console.log(`📊 Fetching complete analysis for ${fromDate} to ${toDate}`);
      
      const response = await fetch(
        `${API_BASE_URL}/api/employee/attendance/late-trend/complete-analysis?start_date=${fromDate}&end_date=${toDate}`
      );
      
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('API Result:', result);
      
      if (result.success) {
        setAnalysisData(result);
        setViewMode('summary');
      } else {
        setError(result.message || 'Failed to fetch analysis data');
      }
      
    } catch (error) {
      console.error('Error fetching analysis:', error);
      setError(`Error: ${error.message}. Please check if backend server is running.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewEmployeeDetails = async (pak) => {
    if (!pak || !fromDate || !toDate) return;
    
    setIsLoadingDetails(true);
    setSelectedEmployee(pak);
    setViewMode('employee');
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/employee/attendance/late-trend/employee-details/${pak}?start_date=${fromDate}&end_date=${toDate}`
      );
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setEmployeeDetails(result);
        }
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handlePrint = () => {
  if (!analysisData) {
    alert('No analysis data available to print');
    return;
  }

  // Create a print window
  const printWindow = window.open('', '_blank');
  
  // Get current view mode data
  let currentData = null;
  let viewTitle = '';
  let tableHTML = '';
  
  if (viewMode === 'summary') {
    currentData = analysisData;
    viewTitle = 'Complete Trend Analysis';
    tableHTML = generateSummaryTable(analysisData.all_employees);
  } else if (viewMode === 'late') {
    currentData = analysisData.all_employees.filter(emp => emp.late_arrivals.total_instances > 0);
    viewTitle = 'Late Arrival Analysis';
    tableHTML = generateLateTable(currentData);
  } else if (viewMode === 'early') {
    currentData = analysisData.all_employees.filter(emp => emp.early_leaving.total_instances > 0);
    viewTitle = 'Early Leaving Analysis';
    tableHTML = generateEarlyTable(currentData);
  } else if (viewMode === 'employee' && employeeDetails) {
    viewTitle = 'Employee Detail Analysis';
    tableHTML = generateEmployeeDetailTable(employeeDetails);
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Late Trend Analysis Report - ${formatDate(fromDate)} to ${formatDate(toDate)}</title>
      <style>
        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 15px;
          color: #333;
          background: #fff;
          font-size: 11px;
          line-height: 1.4;
        }
        
        /* Report Header */
        .print-header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #2c3e50;
        }
        
        .print-header h1 {
          margin: 0;
          font-size: 22px;
          color: #2c3e50;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        
        .print-header h2 {
          margin: 5px 0 0 0;
          font-size: 14px;
          color: #7f8c8d;
          font-weight: 400;
        }
        
        /* Meta Information */
        .print-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #666;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ecf0f1;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .print-meta div {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        /* Quick Stats */
        .quick-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin: 20px 0;
          page-break-inside: avoid;
        }
        
        .stat-card {
          border: 1px solid #ddd;
          padding: 15px 10px;
          text-align: center;
          background: #f8f9fa;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #2c3e50;
          margin: 5px 0;
        }
        
        .stat-value.late { color: #e74c3c; }
        .stat-value.early { color: #3498db; }
        .stat-value.total { color: #27ae60; }
        
        .stat-label {
          font-size: 10px;
          color: #7f8c8d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        
        /* Summary Section */
        .summary-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 25px 0;
          page-break-inside: avoid;
        }
        
        .summary-card {
          border: 1px solid #ddd;
          padding: 15px;
          background: #fff;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .summary-title {
          font-size: 13px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #3498db;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        /* Day-wise Analysis */
        .day-wise-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-top: 10px;
        }
        
        .day-card {
          border: 1px solid #ecf0f1;
          padding: 10px;
          border-radius: 4px;
          text-align: center;
          background: #fff;
        }
        
        .day-header {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 5px;
          font-size: 11px;
        }
        
        .day-stats {
          font-size: 10px;
        }
        
        .day-stat {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        
        /* Main Tables */
        .table-container {
          margin: 25px 0;
          page-break-inside: avoid;
          overflow-x: visible;
        }
        
        .table-title {
          font-size: 13px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #27ae60;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 10px;
          table-layout: fixed;
        }
        
        .print-table th {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-weight: 700;
          border: 1px solid #2980b9;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .print-table td {
          padding: 10px 8px;
          border: 1px solid #ecf0f1;
          vertical-align: middle;
        }
        
        .print-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .print-table tr:hover {
          background: #e8f4fc;
        }
        
        /* Column widths for summary table */
        .summary-table th:nth-child(1),
        .summary-table td:nth-child(1) { width: 40px; text-align: center; }
        .summary-table th:nth-child(2),
        .summary-table td:nth-child(2) { width: 180px; }
        .summary-table th:nth-child(3),
        .summary-table td:nth-child(3) { width: 100px; }
        .summary-table th:nth-child(4),
        .summary-table td:nth-child(4) { width: 70px; text-align: center; }
        .summary-table th:nth-child(5),
        .summary-table td:nth-child(5) { width: 70px; text-align: center; }
        .summary-table th:nth-child(6),
        .summary-table td:nth-child(6) { width: 70px; text-align: center; }
        .summary-table th:nth-child(7),
        .summary-table td:nth-child(7) { width: 70px; text-align: center; }
        .summary-table th:nth-child(8),
        .summary-table td:nth-child(8) { width: 80px; text-align: center; }
        .summary-table th:nth-child(9),
        .summary-table td:nth-child(9) { width: 80px; text-align: center; }
        .summary-table th:nth-child(10),
        .summary-table td:nth-child(10) { width: 90px; text-align: center; }
        .summary-table th:nth-child(11),
        .summary-table td:nth-child(11) { width: 80px; text-align: center; }
        
        /* Count badges */
        .count-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          text-align: center;
          min-width: 40px;
        }
        
        .badge-late {
          background: #ffeaea;
          color: #e74c3c;
          border: 1px solid #e74c3c;
        }
        
        .badge-early {
          background: #e8f4fc;
          color: #3498db;
          border: 1px solid #3498db;
        }
        
        .badge-total {
          background: #e8f8f0;
          color: #27ae60;
          border: 1px solid #27ae60;
        }
        
        .badge-severity {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .severity-high { background: #ffebee; color: #d32f2f; border: 1px solid #d32f2f; }
        .severity-medium { background: #fff3e0; color: #f57c00; border: 1px solid #f57c00; }
        .severity-low { background: #e8f5e8; color: #388e3c; border: 1px solid #388e3c; }
        .severity-none { background: #f5f5f5; color: #757575; border: 1px solid #9e9e9e; }
        
        /* Employee photo in table */
        .employee-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .employee-photo-small {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #ecf0f1;
        }
        
        .employee-info-small {
          display: flex;
          flex-direction: column;
        }
        
        .employee-name-small {
          font-weight: 600;
          font-size: 11px;
          color: #2c3e50;
        }
        
        .employee-pak-small {
          font-size: 9px;
          color: #7f8c8d;
        }
        
        /* Day badge */
        .day-badge {
          display: inline-block;
          padding: 3px 8px;
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          color: #2c3e50;
        }
        
        /* Page breaks and printing */
        @page {
          size: A4 portrait;
          margin: 15mm 10mm;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
            font-size: 10px;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-table {
            break-inside: avoid;
          }
          
          .summary-section,
          .quick-stats {
            break-inside: avoid;
          }
        }
        
        /* Footer */
        .print-footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 15px;
          page-break-inside: avoid;
        }
        
        .print-footer p {
          margin: 5px 0;
        }
        
        /* Work hours info */
        .work-hours-info {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 4px;
          margin: 15px 0;
          border: 1px solid #ecf0f1;
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 10px;
        }
        
        .work-hours-info span {
          display: flex;
          align-items: center;
          gap: 5px;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>Late & Early Trend Analysis Report</h1>
        <h2>${formatDate(fromDate)} to ${formatDate(toDate)}</h2>
      </div>
      
      <div class="print-meta">
        <div>
          <strong>Report ID:</strong> LTA-${fromDate.replace(/-/g, '')}-${toDate.replace(/-/g, '')}
        </div>
        <div>
          <strong>View:</strong> ${viewTitle}
        </div>
        <div>
          <strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
        <div>
          <strong>Period:</strong> ${formatDate(fromDate)} to ${formatDate(toDate)}
        </div>
      </div>
      
      ${analysisData.work_hours ? `
        <div class="work-hours-info">
          <span><strong>🕒 Working Hours:</strong> ${analysisData.work_hours.official_start} to ${analysisData.work_hours.official_end}</span>
          <span><strong>⏱️ Grace Period:</strong> ${analysisData.work_hours.grace_period} minutes</span>
          <span><strong>👥 Employees Analyzed:</strong> ${analysisData.summary?.total_employees_analyzed || 0}</span>
        </div>
      ` : ''}
      
      <!-- Quick Stats Section -->
      <div class="quick-stats">
        <div class="stat-card">
          <div class="stat-value late">${analysisData.summary?.total_late_arrivals || 0}</div>
          <div class="stat-label">Late Arrivals</div>
        </div>
        <div class="stat-card">
          <div class="stat-value early">${analysisData.summary?.total_early_leaving || 0}</div>
          <div class="stat-label">Early Leaving</div>
        </div>
        <div class="stat-card">
          <div class="stat-value total">${analysisData.summary?.total_instances || 0}</div>
          <div class="stat-label">Total Issues</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${analysisData.summary?.peak_day || 'N/A'}</div>
          <div class="stat-label">Peak Day</div>
        </div>
      </div>
      
      <!-- Summary Section -->
      <div class="summary-section">
        <div class="summary-card">
          <div class="summary-title">📊 Overall Summary</div>
          <div style="font-size: 11px;">
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ecf0f1;">
              <span><strong>Total Employees Analyzed:</strong></span>
              <span>${analysisData.summary?.total_employees_analyzed || 0}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ecf0f1;">
              <span><strong>Average Late Duration:</strong></span>
              <span>${analysisData.summary?.average_late_minutes || 0} minutes</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ecf0f1;">
              <span><strong>Average Early Duration:</strong></span>
              <span>${analysisData.summary?.average_early_minutes || 0} minutes</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0;">
              <span><strong>Report Period:</strong></span>
              <span>${formatDate(fromDate)} to ${formatDate(toDate)}</span>
            </div>
          </div>
        </div>
        
        <div class="summary-card">
          <div class="summary-title">📅 Day-wise Distribution</div>
          <div class="day-wise-grid">
            ${analysisData.day_wise_analysis ? Object.entries(analysisData.day_wise_analysis).map(([day, stats]) => `
              <div class="day-card">
                <div class="day-header">${day}</div>
                <div class="day-stats">
                  <div class="day-stat">
                    <span>Late:</span>
                    <span style="color: #e74c3c; font-weight: bold;">${stats.late_count || 0}</span>
                  </div>
                  <div class="day-stat">
                    <span>Early:</span>
                    <span style="color: #3498db; font-weight: bold;">${stats.early_count || 0}</span>
                  </div>
                  <div class="day-stat">
                    <span>Total:</span>
                    <span style="color: #27ae60; font-weight: bold;">${stats.total_instances || 0}</span>
                  </div>
                </div>
              </div>
            `).join('') : '<div style="text-align: center; padding: 10px; color: #666;">No day-wise data available</div>'}
          </div>
        </div>
      </div>
      
      <!-- Main Data Table -->
      <div class="table-container">
        <div class="table-title">${viewTitle === 'Employee Detail Analysis' ? '👤 ' : '👥 '}${viewTitle} ${viewMode === 'summary' ? `(${analysisData.all_employees?.length || 0} employees)` : viewMode === 'employee' ? '' : `(${currentData?.length || 0} records)`}</div>
        ${tableHTML}
      </div>
      
      <div class="print-footer">
        <p><strong>Late Trend Analysis Report</strong></p>
        <p>Total Late Arrivals: ${analysisData.summary?.total_late_arrivals || 0} | Total Early Leaving: ${analysisData.summary?.total_early_leaving || 0} | Total Issues: ${analysisData.summary?.total_instances || 0}</p>
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

// Helper function to generate summary table
const generateSummaryTable = (employees) => {
  if (!employees || employees.length === 0) {
    return '<div style="text-align: center; padding: 30px; color: #666;">No employee data available</div>';
  }

  let tableHTML = `
    <table class="print-table summary-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Employee</th>
          <th>Department</th>
          <th>Late</th>
          <th>Early</th>
          <th>Total</th>
          <th>Avg Late</th>
          <th>Avg Early</th>
          <th>Peak Day</th>
          <th>Severity</th>
        </tr>
      </thead>
      <tbody>
  `;

  employees.forEach((employee, index) => {
    const severityClass = employee.severity ? `severity-${employee.severity.toLowerCase()}` : 'severity-none';
    
    tableHTML += `
      <tr>
        <td style="text-align: center; font-weight: bold;">${index + 1}</td>
        <td>
          <div class="employee-cell">
            <div style="width: 30px; height: 30px; border-radius: 50%; background: #ecf0f1; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #7f8c8d; font-size: 12px;">
              ${employee.employee_name?.charAt(0) || '?'}
            </div>
            <div class="employee-info-small">
              <div class="employee-name-small">${employee.employee_name}</div>
              <div class="employee-pak-small">PAK: ${employee.pak}</div>
            </div>
          </div>
        </td>
        <td>${employee.department || 'N/A'}</td>
        <td style="text-align: center;">
          <span class="count-badge badge-late">${employee.late_arrivals.total_instances}</span>
        </td>
        <td style="text-align: center;">
          <span class="count-badge badge-early">${employee.early_leaving.total_instances}</span>
        </td>
        <td style="text-align: center;">
          <span class="count-badge badge-total">${employee.total_instances}</span>
        </td>
        <td style="text-align: center;">${employee.late_arrivals.average_minutes}m</td>
        <td style="text-align: center;">${employee.early_leaving.average_minutes}m</td>
        <td style="text-align: center;">
          <span class="day-badge">
            ${employee.late_arrivals.most_frequent_day === 'None' && 
             employee.early_leaving.most_frequent_day === 'None' 
              ? 'None' 
              : employee.late_arrivals.most_frequent_day !== 'None'
                ? employee.late_arrivals.most_frequent_day
                : employee.early_leaving.most_frequent_day}
          </span>
        </td>
        <td style="text-align: center;">
          <span class="badge-severity ${severityClass}">
            ${employee.severity?.toUpperCase() || 'NONE'}
          </span>
        </td>
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
  `;

  return tableHTML;
};

// Helper function to generate late analysis table
const generateLateTable = (lateEmployees) => {
  if (!lateEmployees || lateEmployees.length === 0) {
    return '<div style="text-align: center; padding: 30px; color: #666;">No late arrival data available</div>';
  }

  let tableHTML = `
    <table class="print-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Employee</th>
          <th>Late Count</th>
          <th>Avg Late (min)</th>
          <th>Total Minutes</th>
          <th>Most Frequent Day</th>
          <th>Department</th>
        </tr>
      </thead>
      <tbody>
  `;

  lateEmployees.forEach((employee, index) => {
    tableHTML += `
      <tr>
        <td style="text-align: center; font-weight: bold;">${index + 1}</td>
        <td>
          <div class="employee-cell">
            <div style="width: 30px; height: 30px; border-radius: 50%; background: #ecf0f1; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #7f8c8d; font-size: 12px;">
              ${employee.employee_name?.charAt(0) || '?'}
            </div>
            <div class="employee-info-small">
              <div class="employee-name-small">${employee.employee_name}</div>
              <div class="employee-pak-small">PAK: ${employee.pak}</div>
            </div>
          </div>
        </td>
        <td style="text-align: center;">
          <span class="count-badge badge-late">${employee.late_arrivals.total_instances}</span>
        </td>
        <td style="text-align: center; color: #e74c3c; font-weight: bold;">${employee.late_arrivals.average_minutes}m</td>
        <td style="text-align: center; font-weight: bold;">${employee.late_arrivals.total_minutes.toFixed(0)}m</td>
        <td style="text-align: center;">
          <span class="day-badge">${employee.late_arrivals.most_frequent_day || 'None'}</span>
        </td>
        <td>${employee.department || 'N/A'}</td>
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
  `;

  return tableHTML;
};

// Helper function to generate early analysis table
const generateEarlyTable = (earlyEmployees) => {
  if (!earlyEmployees || earlyEmployees.length === 0) {
    return '<div style="text-align: center; padding: 30px; color: #666;">No early leaving data available</div>';
  }

  let tableHTML = `
    <table class="print-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Employee</th>
          <th>Early Count</th>
          <th>Avg Early (min)</th>
          <th>Total Minutes</th>
          <th>Most Frequent Day</th>
          <th>Department</th>
        </tr>
      </thead>
      <tbody>
  `;

  earlyEmployees.forEach((employee, index) => {
    tableHTML += `
      <tr>
        <td style="text-align: center; font-weight: bold;">${index + 1}</td>
        <td>
          <div class="employee-cell">
            <div style="width: 30px; height: 30px; border-radius: 50%; background: #ecf0f1; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #7f8c8d; font-size: 12px;">
              ${employee.employee_name?.charAt(0) || '?'}
            </div>
            <div class="employee-info-small">
              <div class="employee-name-small">${employee.employee_name}</div>
              <div class="employee-pak-small">PAK: ${employee.pak}</div>
            </div>
          </div>
        </td>
        <td style="text-align: center;">
          <span class="count-badge badge-early">${employee.early_leaving.total_instances}</span>
        </td>
        <td style="text-align: center; color: #3498db; font-weight: bold;">${employee.early_leaving.average_minutes}m</td>
        <td style="text-align: center; font-weight: bold;">${employee.early_leaving.total_minutes.toFixed(0)}m</td>
        <td style="text-align: center;">
          <span class="day-badge">${employee.early_leaving.most_frequent_day || 'None'}</span>
        </td>
        <td>${employee.department || 'N/A'}</td>
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
  `;

  return tableHTML;
};

// Helper function to generate employee detail table
const generateEmployeeDetailTable = (employeeDetails) => {
  if (!employeeDetails || !employeeDetails.records || employeeDetails.records.length === 0) {
    return '<div style="text-align: center; padding: 30px; color: #666;">No employee detail data available</div>';
  }

  let tableHTML = `
    <table class="print-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>Time In</th>
          <th>Time Out</th>
          <th>Issue Type</th>
          <th>Late (min)</th>
          <th>Early (min)</th>
          <th>Total Effect</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  employeeDetails.records.forEach((record, index) => {
    const issueType = record.issue_type?.toLowerCase() || '';
    const isLate = issueType.includes('late');
    const isEarly = issueType.includes('early');
    const badgeClass = isLate && isEarly ? 'badge-total' : isLate ? 'badge-late' : 'badge-early';
    const badgeText = isLate && isEarly ? 'Both' : isLate ? 'Late' : isEarly ? 'Early' : 'N/A';
    
    tableHTML += `
      <tr>
        <td>${record.date}</td>
        <td>${record.day_name}</td>
        <td>${record.time_in_str || '--:--'}</td>
        <td>${record.time_out_str || '--:--'}</td>
        <td style="text-align: center;">
          <span class="count-badge ${badgeClass}">${badgeText}</span>
        </td>
        <td style="text-align: center; color: ${isLate ? '#e74c3c' : '#666'};">
          ${isLate ? `${record.late_minutes}m` : '--'}
        </td>
        <td style="text-align: center; color: ${isEarly ? '#3498db' : '#666'};">
          ${isEarly ? `${record.early_minutes}m` : '--'}
        </td>
        <td style="text-align: center; font-weight: bold;">
          ${record.total_effect_minutes > 0 ? `${record.total_effect_minutes}m` : '--'}
        </td>
        <td>${record.STATUS}</td>
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
  `;

  return tableHTML;
};

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      case 'none': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getSeverityBadge = (severity) => {
    const color = getSeverityColor(severity);
    return (
      <span 
        className="severity-badge" 
        style={{ 
          backgroundColor: `${color}20`,
          color: color,
          border: `1px solid ${color}`
        }}
      >
        {severity?.toUpperCase() || 'NONE'}
      </span>
    );
  };

  const getTrendIcon = (trend) => {
    switch (trend?.toLowerCase()) {
      case 'high': return '📈';
      case 'increasing': return '📈';
      case 'stable': return '➡️';
      case 'none': return '✅';
      default: return '📊';
    }
  };

  const getEmployeePhotoUrl = (pak) => {
    return `${API_BASE_URL}/api/employee/employee/${pak}/photo`;
  };

  // Calculate statistics for top employees banner
  const calculateTopEmployeesStats = () => {
    if (!analysisData?.top_employees) return null;
    
    const topEmployees = analysisData.top_employees;
    const totalLate = topEmployees.reduce((sum, emp) => sum + emp.late_arrivals, 0);
    const totalEarly = topEmployees.reduce((sum, emp) => sum + emp.early_leaving, 0);
    const totalInstances = totalLate + totalEarly;
    
    // Find most frequent day
    const dayCounts = {};
    if (analysisData.day_wise_analysis) {
      Object.entries(analysisData.day_wise_analysis).forEach(([day, stats]) => {
        dayCounts[day] = stats.total_instances;
      });
    }
    
    const mostFrequentDay = Object.entries(dayCounts).reduce((max, [day, count]) => 
      count > max.count ? { day, count } : max, 
      { day: 'No Data', count: 0 }
    );
    
    return {
      totalLate,
      totalEarly,
      totalInstances,
      avgLatePerEmployee: (totalLate / topEmployees.length).toFixed(1),
      avgEarlyPerEmployee: (totalEarly / topEmployees.length).toFixed(1),
      mostFrequentDay: mostFrequentDay.day,
      mostFrequentDayCount: mostFrequentDay.count
    };
  };

  return (
    <div className="page-container">
      <StandardHeader 
        title="Late Trend Analysis"
        subtitle="Comprehensive analysis of employee late arrivals and early leaving"
      />

      <main className="main-content">
        <div className="main-content-wrapper">
          <div className="a4-container standard-card">
            <div className="report-content">
              {/* Error Message */}
              {error && (
                <div className="error-message standard-message standard-message-info mb-lg">
                  {error}
                </div>
              )}

              {/* Date Selection Section */}
              <section className="selection-section mb-lg">
                <div className="selection-form">
                  <div className="form-group">
                    <label htmlFor="fromDate">From Date:</label>
                    <input
                      type="date"
                      id="fromDate"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="standard-input"
                      style={{ minWidth: '150px' }}
                    />
                    <label htmlFor="toDate">To Date:</label>
                    <input
                      type="date"
                      id="toDate"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="standard-input"
                      style={{ minWidth: '150px' }}
                    />
                    <button
                      type="button"
                      className="standard-btn standard-btn-primary"
                      onClick={handleDateSubmit}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Analyzing...' : '📊 Analyze Trends'}
                    </button>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <small style={{ color: '#6c757d' }}>
                      Select date range to analyze late arrival and early leaving trends
                    </small>
                  </div>
                </div>
              </section>

              {/* Action Buttons */}
              {analysisData && (
                <div className="action-buttons-top standard-card mb-lg">
                  <div className="view-toggles">
                    <button 
                      className={`standard-btn ${viewMode === 'summary' ? 'standard-btn-primary' : 'standard-btn-secondary'}`}
                      onClick={() => setViewMode('summary')}
                    >
                      📊 Summary
                    </button>
                    <button 
                      className={`standard-btn ${viewMode === 'late' ? 'standard-btn-primary' : 'standard-btn-secondary'}`}
                      onClick={() => setViewMode('late')}
                    >
                      ⏰ Late Analysis ({analysisData.summary?.total_late_arrivals || 0})
                    </button>
                    <button 
                      className={`standard-btn ${viewMode === 'early' ? 'standard-btn-primary' : 'standard-btn-secondary'}`}
                      onClick={() => setViewMode('early')}
                    >
                      🚪 Early Analysis ({analysisData.summary?.total_early_leaving || 0})
                    </button>
                    {selectedEmployee && (
                      <button 
                        className={`standard-btn ${viewMode === 'employee' ? 'standard-btn-primary' : 'standard-btn-secondary'}`}
                        onClick={() => setViewMode('employee')}
                      >
                        👤 Employee Details
                      </button>
                    )}
                  </div>
                  <button className="standard-btn standard-btn-primary" onClick={handlePrint}>
                    🖨️ Print Report
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Analyzing late trends...</p>
                  <p className="loading-subtext">Processing data from {formatDate(fromDate)} to {formatDate(toDate)}</p>
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}

              {/* Report Section */}
              {analysisData && !isLoading && (
                <div id="printarea">
                  {/* Report Header */}
                  <div className="report-title-section mb-lg">
                    <h2>Late & Early Trend Analysis: {formatDate(fromDate)} to {formatDate(toDate)}</h2>
                    <div className="report-subtitle">
                      <span>Analysis Period: {formatDate(fromDate)} - {formatDate(toDate)}</span>
                      <span>Generated: {new Date().toLocaleDateString()}</span>
                    </div>
                    {analysisData.work_hours && (
                      <div className="work-hours-info">
                        <span>🕒 Working Hours: {analysisData.work_hours.official_start} to {analysisData.work_hours.official_end}</span>
                        <span>⏱️ Grace Period: {analysisData.work_hours.grace_period} minutes</span>
                        <span>📊 Employees Analyzed: {analysisData.summary?.total_employees_analyzed || 0}</span>
                      </div>
                    )}
                  </div>

                  {/* Summary View */}
                  {viewMode === 'summary' && (
                    <>
                      {/* Top Employees Banner */}
                      {analysisData.top_employees && analysisData.top_employees.length > 0 && (
                        <section className="top-employees-section mb-xl">
                          <h3 className="mb-md text-center">🏆 Top 8 Employees with Most Issues</h3>
                          <div className="top-employees-banner">
                            <div className="top-employees-stats">
                              <div className="stat-card">
                                <div className="stat-value">{analysisData.summary?.total_late_arrivals || 0}</div>
                                <div className="stat-label">Total Late Arrivals</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-value">{analysisData.summary?.total_early_leaving || 0}</div>
                                <div className="stat-label">Total Early Leaving</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-value">{analysisData.summary?.total_instances || 0}</div>
                                <div className="stat-label">Total Issues</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-value">{analysisData.summary?.peak_day || 'N/A'}</div>
                                <div className="stat-label">Peak Day</div>
                              </div>
                            </div>
                            
                            <div className="top-employees-grid">
                              {analysisData.top_employees.map((employee, index) => (
                                <div 
                                  key={index} 
                                  className="top-employee-card"
                                  onClick={() => handleViewEmployeeDetails(employee.pak)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="employee-rank">{index + 1}</div>
                                  <div className="employee-photo-container">
                                    {employee.has_photo ? (
                                      <img 
                                        src={getEmployeePhotoUrl(employee.pak)} 
                                        alt={employee.employee_name}
                                        className="employee-photo"
                                        onError={(e) => {
                                          e.target.src = 'https://via.placeholder.com/80?text=No+Photo';
                                        }}
                                      />
                                    ) : (
                                      <div className="employee-photo-placeholder">
                                        {employee.employee_name?.charAt(0) || '?'}
                                      </div>
                                    )}
                                  </div>
                                  <div className="employee-info">
                                    <div className="employee-name">{employee.employee_name}</div>
                                    <div className="employee-department">{employee.department}</div>
                                    <div className="employee-stats">
                                      <span className="stat-badge late">{employee.late_arrivals} Late</span>
                                      <span className="stat-badge early">{employee.early_leaving} Early</span>
                                    </div>
                                    <div className="employee-total">{employee.total_instances} Total</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}

                      {/* Day-wise Analysis */}
                      {analysisData.day_wise_analysis && (
                        <section className="day-wise-section mb-xl">
                          <h3 className="mb-md">📅 Day-wise Analysis</h3>
                          <div className="day-wise-grid">
                            {Object.entries(analysisData.day_wise_analysis).map(([day, stats]) => (
                              <div key={day} className="day-card">
                                <div className="day-header">{day}</div>
                                <div className="day-stats">
                                  <div className="day-stat">
                                    <span className="stat-label">Late:</span>
                                    <span className="stat-value late">{stats.late_count || 0}</span>
                                  </div>
                                  <div className="day-stat">
                                    <span className="stat-label">Early:</span>
                                    <span className="stat-value early">{stats.early_count || 0}</span>
                                  </div>
                                  <div className="day-stat">
                                    <span className="stat-label">Total:</span>
                                    <span className="stat-value total">{stats.total_instances || 0}</span>
                                  </div>
                                </div>
                                {stats.total_instances > 0 && (
                                  <div className="day-progress">
                                    <div 
                                      className="progress-bar"
                                      style={{
                                        width: `${(stats.total_instances / (analysisData.summary?.total_instances || 1)) * 100}%`
                                      }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* All Employees Table */}
                      {analysisData.all_employees && analysisData.all_employees.length > 0 && (
                        <section className="all-employees-section mb-xl">
                          <h3 className="mb-md">👥 All Employees with Issues ({analysisData.all_employees.length})</h3>
                          <div className="datagrid-container">
                            <table className="analysis-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Employee</th>
                                  <th>Department</th>
                                  <th>Late Arrivals</th>
                                  <th>Early Leaving</th>
                                  <th>Total</th>
                                  <th>Avg Late (min)</th>
                                  <th>Avg Early (min)</th>
                                  <th>Most Frequent Day</th>
                                  <th>Severity</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysisData.all_employees.map((employee, index) => (
                                  <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                                    <td className="text-center">{index + 1}</td>
                                    <td className="employee-info-cell">
                                      <div className="employee-mini-info">
                                        <div className="employee-photo-mini">
                                          {employee.has_photo ? (
                                            <img 
                                              src={getEmployeePhotoUrl(employee.pak)} 
                                              alt={employee.employee_name}
                                              className="photo-mini"
                                              onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/40?text=No+Photo';
                                              }}
                                            />
                                          ) : (
                                            <div className="photo-placeholder-mini">
                                              {employee.employee_name?.charAt(0) || '?'}
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <div className="employee-pak">{employee.pak}</div>
                                          <div className="employee-name-table">{employee.employee_name}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td>{employee.department}</td>
                                    <td className="text-center">
                                      <div className="count-bubble late-count">
                                        {employee.late_arrivals.total_instances}
                                      </div>
                                    </td>
                                    <td className="text-center">
                                      <div className="count-bubble early-count">
                                        {employee.early_leaving.total_instances}
                                      </div>
                                    </td>
                                    <td className="text-center">
                                      <div className="count-bubble total-count">
                                        {employee.total_instances}
                                      </div>
                                    </td>
                                    <td className="text-center">
                                      {employee.late_arrivals.average_minutes}m
                                    </td>
                                    <td className="text-center">
                                      {employee.early_leaving.average_minutes}m
                                    </td>
                                    <td className="text-center">
                                      <div className="day-badge">
                                        {employee.late_arrivals.most_frequent_day === 'None' && 
                                         employee.early_leaving.most_frequent_day === 'None' 
                                          ? 'None' 
                                          : employee.late_arrivals.most_frequent_day !== 'None'
                                            ? employee.late_arrivals.most_frequent_day
                                            : employee.early_leaving.most_frequent_day}
                                      </div>
                                    </td>
                                    <td className="text-center">
                                      {getSeverityBadge(employee.severity)}
                                    </td>
                                    <td className="text-center">
                                      <button
                                        className="standard-btn standard-btn-sm standard-btn-outline"
                                        onClick={() => handleViewEmployeeDetails(employee.pak)}
                                      >
                                        View Details
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}
                    </>
                  )}

                  {/* Late Analysis View */}
                  {viewMode === 'late' && analysisData.all_employees && (
                    <section className="late-analysis-section mb-xl">
                      <h3 className="mb-md">⏰ Late Arrival Analysis</h3>
                      <div className="summary-cards mb-lg">
                        <div className="summary-card">
                          <div className="summary-icon">⏰</div>
                          <div className="summary-content">
                            <div className="summary-value">{analysisData.summary?.total_late_arrivals || 0}</div>
                            <div className="summary-label">Total Late Arrivals</div>
                          </div>
                        </div>
                        <div className="summary-card">
                          <div className="summary-icon">📊</div>
                          <div className="summary-content">
                            <div className="summary-value">{analysisData.summary?.average_late_minutes || 0}m</div>
                            <div className="summary-label">Average Late Duration</div>
                          </div>
                        </div>
                        <div className="summary-card">
                          <div className="summary-icon">📅</div>
                          <div className="summary-content">
                            <div className="summary-value">
                              {Object.entries(analysisData.day_wise_analysis || {}).reduce((maxDay, [day, stats]) => 
                                stats.late_count > maxDay.count ? { day, count: stats.late_count } : maxDay, 
                                { day: 'None', count: 0 }
                              ).day}
                            </div>
                            <div className="summary-label">Most Late Day</div>
                          </div>
                        </div>
                      </div>

                      <div className="datagrid-container">
                        <table className="analysis-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Employee</th>
                              <th>Total Late</th>
                              <th>Avg Late (min)</th>
                              <th>Most Frequent Day</th>
                              <th>Total Minutes</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.all_employees
                              .filter(emp => emp.late_arrivals.total_instances > 0)
                              .sort((a, b) => b.late_arrivals.total_instances - a.late_arrivals.total_instances)
                              .map((employee, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                                  <td className="text-center">{index + 1}</td>
                                  <td className="employee-info-cell">
                                    <div className="employee-mini-info">
                                      <div className="employee-photo-mini">
                                        {employee.has_photo ? (
                                          <img 
                                            src={getEmployeePhotoUrl(employee.pak)} 
                                            alt={employee.employee_name}
                                            className="photo-mini"
                                          />
                                        ) : (
                                          <div className="photo-placeholder-mini">
                                            {employee.employee_name?.charAt(0) || '?'}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="employee-pak">{employee.pak}</div>
                                        <div className="employee-name-table">{employee.employee_name}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <div className="count-bubble late-count">
                                      {employee.late_arrivals.total_instances}
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    {employee.late_arrivals.average_minutes}m
                                  </td>
                                  <td className="text-center">
                                    <div className="day-badge">
                                      {employee.late_arrivals.most_frequent_day === 'None' 
                                        ? 'None' 
                                        : employee.late_arrivals.most_frequent_day}
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    {employee.late_arrivals.total_minutes.toFixed(0)}m
                                  </td>
                                  <td className="text-center">
                                    <button
                                      className="standard-btn standard-btn-sm standard-btn-outline"
                                      onClick={() => handleViewEmployeeDetails(employee.pak)}
                                    >
                                      View Records
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {/* Early Analysis View */}
                  {viewMode === 'early' && analysisData.all_employees && (
                    <section className="early-analysis-section mb-xl">
                      <h3 className="mb-md">🚪 Early Leaving Analysis</h3>
                      <div className="summary-cards mb-lg">
                        <div className="summary-card">
                          <div className="summary-icon">🚪</div>
                          <div className="summary-content">
                            <div className="summary-value">{analysisData.summary?.total_early_leaving || 0}</div>
                            <div className="summary-label">Total Early Leaving</div>
                          </div>
                        </div>
                        <div className="summary-card">
                          <div className="summary-icon">📊</div>
                          <div className="summary-content">
                            <div className="summary-value">{analysisData.summary?.average_early_minutes || 0}m</div>
                            <div className="summary-label">Average Early Duration</div>
                          </div>
                        </div>
                        <div className="summary-card">
                          <div className="summary-icon">📅</div>
                          <div className="summary-content">
                            <div className="summary-value">
                              {Object.entries(analysisData.day_wise_analysis || {}).reduce((maxDay, [day, stats]) => 
                                stats.early_count > maxDay.count ? { day, count: stats.early_count } : maxDay, 
                                { day: 'None', count: 0 }
                              ).day}
                            </div>
                            <div className="summary-label">Most Early Day</div>
                          </div>
                        </div>
                      </div>

                      <div className="datagrid-container">
                        <table className="analysis-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Employee</th>
                              <th>Total Early</th>
                              <th>Avg Early (min)</th>
                              <th>Most Frequent Day</th>
                              <th>Total Minutes</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.all_employees
                              .filter(emp => emp.early_leaving.total_instances > 0)
                              .sort((a, b) => b.early_leaving.total_instances - a.early_leaving.total_instances)
                              .map((employee, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                                  <td className="text-center">{index + 1}</td>
                                  <td className="employee-info-cell">
                                    <div className="employee-mini-info">
                                      <div className="employee-photo-mini">
                                        {employee.has_photo ? (
                                          <img 
                                            src={getEmployeePhotoUrl(employee.pak)} 
                                            alt={employee.employee_name}
                                            className="photo-mini"
                                          />
                                        ) : (
                                          <div className="photo-placeholder-mini">
                                            {employee.employee_name?.charAt(0) || '?'}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="employee-pak">{employee.pak}</div>
                                        <div className="employee-name-table">{employee.employee_name}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <div className="count-bubble early-count">
                                      {employee.early_leaving.total_instances}
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    {employee.early_leaving.average_minutes}m
                                  </td>
                                  <td className="text-center">
                                    <div className="day-badge">
                                      {employee.early_leaving.most_frequent_day === 'None' 
                                        ? 'None' 
                                        : employee.early_leaving.most_frequent_day}
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    {employee.early_leaving.total_minutes.toFixed(0)}m
                                  </td>
                                  <td className="text-center">
                                    <button
                                      className="standard-btn standard-btn-sm standard-btn-outline"
                                      onClick={() => handleViewEmployeeDetails(employee.pak)}
                                    >
                                      View Records
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {/* Employee Details View */}
                  {viewMode === 'employee' && (selectedEmployee || employeeDetails) && (
                    <section className="employee-details-section mb-xl">
                      {isLoadingDetails ? (
                        <div className="loading-container">
                          <div className="loading-spinner"></div>
                          <p>Loading employee details...</p>
                        </div>
                      ) : employeeDetails ? (
                        <>
                          <div className="employee-header mb-lg">
                            <button
                              className="standard-btn standard-btn-sm standard-btn-outline mb-md"
                              onClick={() => setViewMode('summary')}
                            >
                              ← Back to Summary
                            </button>
                            
                            <div className="employee-profile-card">
                              <div className="employee-photo-large">
                                {employeeDetails.employee.has_photo ? (
                                  <img 
                                    src={getEmployeePhotoUrl(employeeDetails.employee.pak)} 
                                    alt={employeeDetails.employee.employee_name}
                                    className="photo-large"
                                  />
                                ) : (
                                  <div className="photo-placeholder-large">
                                    {employeeDetails.employee.employee_name?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              <div className="employee-profile-info">
                                <h3>{employeeDetails.employee.employee_name}</h3>
                                <div className="profile-details">
                                  <div><strong>PAK:</strong> {employeeDetails.employee.pak}</div>
                                  <div><strong>Appointment:</strong> {employeeDetails.employee.appointment}</div>
                                  <div><strong>Department:</strong> {employeeDetails.employee.department}</div>
                                  <div><strong>Section:</strong> {employeeDetails.employee.section}</div>
                                </div>
                              </div>
                              <div className="employee-stats-card">
                                <div className="stat-box">
                                  <div className="stat-value">{employeeDetails.statistics.total_instances}</div>
                                  <div className="stat-label">Total Issues</div>
                                </div>
                                <div className="stat-box">
                                  <div className="stat-value">{employeeDetails.statistics.late_arrivals}</div>
                                  <div className="stat-label">Late Arrivals</div>
                                </div>
                                <div className="stat-box">
                                  <div className="stat-value">{employeeDetails.statistics.early_leaving}</div>
                                  <div className="stat-label">Early Leaving</div>
                                </div>
                                <div className="stat-box">
                                  <div className="stat-value">{employeeDetails.statistics.most_frequent_day}</div>
                                  <div className="stat-label">Most Frequent Day</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Day Distribution */}
                          {employeeDetails.statistics.day_distribution && (
                            <div className="employee-day-distribution mb-lg">
                              <h4>📅 Day-wise Distribution</h4>
                              <div className="day-distribution-grid">
                                {Object.entries(employeeDetails.statistics.day_distribution).map(([day, stats]) => (
                                  <div key={day} className="distribution-card">
                                    <div className="distribution-day">{day.slice(0, 3)}</div>
                                    <div className="distribution-stats">
                                      <div className="distribution-stat">
                                        <span className="stat-dot late"></span>
                                        <span>{stats.late || 0}</span>
                                      </div>
                                      <div className="distribution-stat">
                                        <span className="stat-dot early"></span>
                                        <span>{stats.early || 0}</span>
                                      </div>
                                      <div className="distribution-total">{stats.total || 0}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Records Table */}
                          {employeeDetails.records && employeeDetails.records.length > 0 && (
                            <div className="employee-records-section">
                              <h4 className="mb-md">📋 Detailed Records</h4>
                              <div className="datagrid-container">
                                <table className="analysis-table">
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      <th>Day</th>
                                      <th>Time In</th>
                                      <th>Time Out</th>
                                      <th>Issue Type</th>
                                      <th>Late (min)</th>
                                      <th>Early (min)</th>
                                      <th>Total Effect</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {employeeDetails.records.map((record, index) => (
                                      <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                                        <td>{record.date}</td>
                                        <td>{record.day_name}</td>
                                        <td>{record.time_in_str || '--:--'}</td>
                                        <td>{record.time_out_str || '--:--'}</td>
                                        <td>
                                          <span className={`issue-badge ${record.issue_type?.toLowerCase().includes('late') ? 'late' : 
                                            record.issue_type?.toLowerCase().includes('early') ? 'early' : 'both'}`}>
                                            {record.issue_type}
                                          </span>
                                        </td>
                                        <td className="text-center">
                                          {record.is_late ? `${record.late_minutes}m` : '--'}
                                        </td>
                                        <td className="text-center">
                                          {record.is_early ? `${record.early_minutes}m` : '--'}
                                        </td>
                                        <td className="text-center">
                                          {record.total_effect_minutes > 0 ? `${record.total_effect_minutes}m` : '--'}
                                        </td>
                                        <td>{record.STATUS}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              
                              {/* Pagination Info */}
                              {employeeDetails.pagination && (
                                <div className="pagination-info mt-md text-center">
                                  Showing {employeeDetails.records.length} of {employeeDetails.pagination.total_records} records
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="no-data-message">
                          <p>No employee details available.</p>
                        </div>
                      )}
                    </section>
                  )}

                  {/* Report Footer */}
                  <div className="report-footer standard-card text-center mt-xl">
                    <p><strong>Report generated on:</strong> {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                    <p>Late Trend Analysis System | Based on actual attendance data</p>
                    {analysisData.work_hours && (
                      <p><strong>Working Hours:</strong> {analysisData.work_hours.official_start} to {analysisData.work_hours.official_end} 
                      (Grace: {analysisData.work_hours.grace_period} minutes, Early Buffer: 15 minutes)</p>
                    )}
                  </div>
                </div>
              )}

              {/* No Data Message */}
              {analysisData && analysisData.all_employees && analysisData.all_employees.length === 0 && !isLoading && (
                <div className="no-data-message">
                  <div className="no-data-icon">📊</div>
                  <h3>No Late/Early Data Found</h3>
                  <p>No late arrivals or early leaving records found for the selected date range.</p>
                  <p>Please select a different date range or check if attendance data exists.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LateTrendBetweenDates;