import React, { useState, useEffect } from 'react';
import './ViewAttendanceBetweenDates.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const ViewAttendanceBetweenDates = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetail, setEmployeeDetail] = useState({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllColumns, setShowAllColumns] = useState(false);

  const API_BASE_URL = 'http://10.0.0.7:5000';

  useEffect(() => {
    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setToDate(today.toISOString().split('T')[0]);
    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const handleDateSubmit = async () => {
    if (!fromDate || !toDate) {
      setError('Please select both from and to dates');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setError('From date cannot be greater than To date');
      return;
    }

    setError('');
    setIsLoading(true);
    setShowReport(false);
    setAttendanceData([]);
    setSummaryData(null);
    
    try {
    const response = await fetch(
      `${API_BASE_URL}/api/employee/attendance-between-dates/complete-summary?start_date=${fromDate}&end_date=${toDate}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch data`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to load data');
    }

    // DEBUG: Log the data to console
    console.log('API Response:', result);
    console.log('First employee data:', result.employee_summary?.[0]);
    
    setAttendanceData(result.employee_summary || []);
    setSummaryData(result.overall_summary || {
      totalEmployees: 0,
      totalWorkingDays: 0,
      averageAttendance: '0%',
      statusSummary: []
    });
    setShowReport(true);
    setIsLoading(false);
    
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    setError(`Error: ${error.message}. Please check backend connection.`);
    setIsLoading(false);
    setShowReport(false);
  }
};

 const handlePrint = () => {
  if (!showReport || attendanceData.length === 0) {
    alert('No report data available to print');
    return;
  }

  // Create a print window
  const printWindow = window.open('', '_blank');
  
  // Calculate statistics
  const totalEmployees = attendanceData.length;
  const avgAttendance = summaryData?.averageAttendance || '0%';
  const totalWorkingDays = summaryData?.totalWorkingDays || 0;
  
  // Create status summary HTML
  const statusSummaryHTML = summaryData?.statusSummary?.map((item, index) => {
    const color = getAttendanceColor(item.percentage);
    return `
      <div class="print-status-item" style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
        <span>
          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></span>
          ${item.status}
        </span>
        <span>${item.count} records (${item.percentage})</span>
      </div>
    `;
  }).join('') || '<div style="text-align: center; padding: 10px; color: #666;">No status data available</div>';

  // Create employee table HTML
  let employeeTableHTML = '';
  attendanceData.forEach((employee, index) => {
    const attendanceColor = getAttendanceColor(employee.attendance_percentage);
    const rowBgColor = index % 2 === 0 ? '#f8f9fa' : 'white';
    
    employeeTableHTML += `
      <tr style="background-color: ${rowBgColor};">
        <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-weight: bold;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">
          <div style="font-weight: bold;">${employee.employee_name}</div>
          <div style="font-size: 10px; color: #666;">PAK: ${employee.pak}</div>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${employee.total_days || 0}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; color: #28a745; font-weight: bold;">${employee.present_days || 0}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; color: #17a2b8; font-weight: bold;">${employee.leave_days || 0}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; color: #dc3545; font-weight: bold;">${employee.absent_days || 0}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: ${attendanceColor};">
          ${employee.attendance_percentage || '0%'}
        </td>
      </tr>
    `;
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Attendance Report - ${formatDate(fromDate)} to ${formatDate(toDate)}</title>
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
        
        /* Main Table */
        .main-table-container {
          margin: 20px 0;
          page-break-inside: avoid;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 10px;
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
        
        /* Table column widths */
        .main-table th:nth-child(1),
        .main-table td:nth-child(1) { width: 40px; text-align: center; } /* S/No */
        .main-table th:nth-child(2),
        .main-table td:nth-child(2) { width: 180px; } /* Name/PAK */
        .main-table th:nth-child(3),
        .main-table td:nth-child(3) { width: 80px; text-align: center; } /* Total Days */
        .main-table th:nth-child(4),
        .main-table td:nth-child(4) { width: 70px; text-align: center; } /* Present */
        .main-table th:nth-child(5),
        .main-table td:nth-child(5) { width: 70px; text-align: center; } /* Leave */
        .main-table th:nth-child(6),
        .main-table td:nth-child(6) { width: 70px; text-align: center; } /* Absent */
        .main-table th:nth-child(7),
        .main-table td:nth-child(7) { width: 70px; text-align: center; } /* % */
        
        /* Report statistics */
        .report-stats {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          font-size: 11px;
        }
        
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
          size: A4 portrait;
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
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>Attendance Between Dates Report</h1>
        <h2>${formatDate(fromDate)} to ${formatDate(toDate)}</h2>
      </div>
      
      <div class="print-meta">
        <div>
          <strong>Report ID:</strong> ATT-${fromDate.replace(/-/g, '')}-${toDate.replace(/-/g, '')}
        </div>
        <div>
          <strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
        <div>
          <strong>Period:</strong> ${formatDate(fromDate)} to ${formatDate(toDate)}
        </div>
      </div>
      
      <!-- Quick Stats -->
      <div class="quick-stats-print">
        <div class="stat-card-print">
          <div class="stat-value-print">${totalEmployees}</div>
          <div class="stat-label-print">Total Employees</div>
        </div>
        <div class="stat-card-print">
          <div class="stat-value-print">${totalWorkingDays}</div>
          <div class="stat-label-print">Working Days</div>
        </div>
        <div class="stat-card-print">
          <div class="stat-value-print">${avgAttendance}</div>
          <div class="stat-label-print">Avg Attendance</div>
        </div>
        <div class="stat-card-print">
          <div class="stat-value-print">${attendanceData.reduce((sum, emp) => sum + (emp.total_days || 0), 0)}</div>
          <div class="stat-label-print">Total Days</div>
        </div>
      </div>
      
      <!-- Summary Section -->
      <div class="summary-print">
        <div class="summary-card-print">
          <div class="summary-title">📈 Overall Summary</div>
          <div class="overall-stats-print">
            <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
              <span><strong>Total Employees:</strong></span>
              <span>${totalEmployees}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
              <span><strong>Total Working Days:</strong></span>
              <span>${totalWorkingDays}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
              <span><strong>Average Attendance:</strong></span>
              <span style="color: ${getAttendanceColor(avgAttendance)}; font-weight: bold;">${avgAttendance}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 5px 0;">
              <span><strong>Report Period:</strong></span>
              <span>${formatDate(fromDate)} to ${formatDate(toDate)}</span>
            </div>
          </div>
        </div>
        
        <div class="summary-card-print">
          <div class="summary-title">📊 Status Distribution</div>
          <div class="status-distribution-print">
            ${statusSummaryHTML}
          </div>
        </div>
      </div>
      
      <!-- Report Statistics -->
      <div class="report-stats">
        <div><strong>Total Employees:</strong> ${totalEmployees}</div>
        <div><strong>Working Days in Period:</strong> ${totalWorkingDays}</div>
        <div><strong>Average Attendance Rate:</strong> ${avgAttendance}</div>
        <div><strong>Date Range:</strong> ${formatDate(fromDate)} to ${formatDate(toDate)}</div>
        <div><strong>Total Present Days:</strong> ${attendanceData.reduce((sum, emp) => sum + (emp.present_days || 0), 0)}</div>
        <div><strong>Total Leave Days:</strong> ${attendanceData.reduce((sum, emp) => sum + (emp.leave_days || 0), 0)}</div>
      </div>
      
      <!-- Main Employee Table -->
      <div class="main-table-container">
        <div style="font-size: 12px; font-weight: bold; margin-bottom: 10px; color: #333; border-bottom: 2px solid #28a745; padding-bottom: 5px;">
          👥 Employee Attendance Summary (${totalEmployees} employees)
        </div>
        <table class="print-table main-table">
          <thead>
            <tr>
              <th>S/No</th>
              <th>Name/PAK</th>
              <th>Total Days</th>
              <th>Present</th>
              <th>Leave</th>
              <th>Absent</th>
              <th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            ${employeeTableHTML}
          </tbody>
        </table>
      </div>
      
      <div class="print-footer">
        <p><strong>Attendance Between Dates Report</strong></p>
        <p>Total Employees: ${totalEmployees} | Working Days: ${totalWorkingDays} | Avg Attendance: ${avgAttendance}</p>
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

  const handleDetailView = async (employee) => {
    setSelectedEmployee(employee);
    setIsDetailLoading(true);
    setEmployeeDetail({});
    
    try {
      // Fetch COMPLETE employee detail
      const response = await fetch(
        `${API_BASE_URL}/api/employee/attendance-between-dates/complete-employee-detail/${employee.pak}?start_date=${fromDate}&end_date=${toDate}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch employee details`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Employee detail received:', {
          records: result.attendance_records?.length || 0,
          summary: result.summary
        });
        
        setEmployeeDetail({
          employee: result.employee,
          attendance_records: result.attendance_records || [],
          summary: result.summary || {},
          working_info: result.working_info || {}
        });
        setShowDetailView(true);
      } else {
        throw new Error(result.message || 'Failed to load employee details');
      }
    } catch (error) {
      console.error('Error fetching employee detail:', error);
      // Create basic detail as fallback
      setEmployeeDetail({
        employee: employee,
        attendance_records: [],
        summary: {
          total_days: employee.total_days || 0,
          present_days: employee.present_days || 0,
          leave_days: employee.leave_days || 0,
          absent_days: employee.absent_days || 0,
          attendance_percentage: employee.attendance_percentage || '0%'
        },
        working_info: {}
      });
      setShowDetailView(true);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleBackFromDetail = () => {
    setShowDetailView(false);
    setSelectedEmployee(null);
    setEmployeeDetail({});
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

  const getAttendanceColor = (percentage) => {
    if (!percentage || typeof percentage !== 'string') return '#6c757d';
    const percent = parseFloat(percentage.replace('%', '')) || 0;
    if (percent >= 90) return '#27ae60';
    if (percent >= 80) return '#f39c12';
    if (percent >= 70) return '#e67e22';
    return '#e74c3c';
  };

  const getStatusColor = (status) => {
    if (!status) return '#6c757d';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('present')) return '#28a745';
    if (statusLower.includes('late')) return '#ffc107';
    if (statusLower.includes('leave')) return '#17a2b8';
    if (statusLower.includes('absent')) return '#dc3545';
    if (statusLower.includes('half')) return '#fd7e14';
    if (statusLower.includes('holiday')) return '#6f42c1';
    return '#6c757d';
  };

  // Employee Detail View Component
  const EmployeeDetailView = ({ employee, fromDate, toDate, onBack, detailData }) => {
    const { employee: empInfo, attendance_records, summary, working_info } = detailData;
    const isDataLoaded = empInfo && summary;

    if (isDetailLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading employee attendance details...</p>
        </div>
      );
    }

    if (!isDataLoaded) {
      return (
        <div className="error-container">
          <h3>No Data Available</h3>
          <p>Could not load employee details. Please try again.</p>
          <button className="back-btn" onClick={onBack}>
            ↩️ Back to Summary
          </button>
        </div>
      );
    }

    return (
      <div className="employee-detail-page">
        <div className="action-buttons-top">
<button className="print-btn" onClick={() => {
  const printWindow = window.open('', '_blank');
  const { employee: empInfo, attendance_records, summary, working_info } = employeeDetail;
  
  // Create detailed attendance HTML
  let detailedAttendanceHTML = '';
  if (attendance_records && attendance_records.length > 0) {
    attendance_records.forEach((record, index) => {
      const statusColor = getStatusColor(record.STATUS);
      const rowBgColor = index % 2 === 0 ? '#f8f9fa' : 'white';
      
      detailedAttendanceHTML += `
        <tr style="background-color: ${rowBgColor};">
          <td style="padding: 6px; border-bottom: 1px solid #ddd;">${record.date || 'N/A'}</td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd;">${record.day_name || 'N/A'}</td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center; background-color: ${statusColor}; color: white; font-weight: bold; border-radius: 4px;">
            ${record.STATUS || 'N/A'}
          </td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center;">
            ${record.time_in && record.time_in !== '00:00:00' ? record.time_in.substring(0, 5) : '--:--'}
          </td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center;">
            ${record.time_out && record.time_out !== '00:00:00' ? record.time_out.substring(0, 5) : '--:--'}
          </td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: ${record.MISSED_HOURS > 0 ? '#28a745' : record.MISSED_HOURS < 0 ? '#dc3545' : '#6c757d'}">
            ${record.MISSED_HOURS !== null && record.MISSED_HOURS !== undefined ? 
              `${record.MISSED_HOURS > 0 ? '+' : ''}${parseFloat(record.MISSED_HOURS).toFixed(1)}h` : 
              '0.0h'}
          </td>
          <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size: 11px;">${record.REMARKS || ''}</td>
        </tr>
      `;
    });
  } else {
    detailedAttendanceHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px; color: #6c757d;">
          <div style="font-size: 14px; margin-bottom: 10px;">No attendance records found for this period</div>
          <div style="font-size: 12px;">${formatDate(fromDate)} to ${formatDate(toDate)}</div>
        </td>
      </tr>
    `;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Employee Detail - ${empInfo.employee_name || selectedEmployee.employee_name}</title>
      <style>
        body { font-family: Arial; margin: 20px; color: #000; background: #fff; font-size: 11px; }
        .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .print-header h1 { margin: 0; font-size: 18px; color: #333; }
        .print-header h2 { margin: 5px 0 0 0; font-size: 12px; color: #666; }
        .print-meta { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-bottom: 15px; }
        .employee-info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #ddd; }
        .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0; }
        .summary-box { border: 1px solid #ddd; padding: 10px; text-align: center; background: #fff; }
        .summary-value { font-size: 16px; font-weight: bold; color: #2c3e50; margin: 5px 0; }
        .summary-label { font-size: 9px; color: #666; }
        .detail-table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 15px 0; }
        .detail-table th { background: #2056AC; color: white; padding: 10px 8px; text-align: left; font-weight: bold; border: 1px solid #ddd; }
        .detail-table td { padding: 8px; border: 1px solid #ddd; }
        .detail-table tr:nth-child(even) { background: #f9f9f9; }
        .print-footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
        @page { size: A4 portrait; margin: 10mm; }
        @media print { body { margin: 0; padding: 15px; } }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>Employee Attendance Detail Report</h1>
        <h2>${formatDate(fromDate)} to ${formatDate(toDate)}</h2>
      </div>
      
      <div class="print-meta">
        <div><strong>Employee:</strong> ${empInfo.employee_name || selectedEmployee.employee_name}</div>
        <div><strong>PAK:</strong> ${empInfo.pak || selectedEmployee.pak}</div>
        <div><strong>Generated:</strong> ${new Date().toLocaleDateString()}</div>
      </div>
      
      <div class="employee-info">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
          <div><strong>Appointment:</strong> ${empInfo.appointment || selectedEmployee.appointment}</div>
          <div><strong>Deployment:</strong> ${empInfo.deployment || selectedEmployee.deployment}</div>
          <div><strong>Section:</strong> ${empInfo.section || 'N/A'}</div>
          <div><strong>Working Days:</strong> ${working_info?.working_days_count || summary.total_days || 0}</div>
        </div>
      </div>
      
      <div class="summary-grid">
        <div class="summary-box">
          <div class="summary-label">Total Days</div>
          <div class="summary-value">${summary.total_days || 0}</div>
        </div>
        <div class="summary-box">
          <div class="summary-label">Present Days</div>
          <div class="summary-value" style="color: #28a745;">${summary.total_present || summary.present_days || 0}</div>
        </div>
        <div class="summary-box">
          <div class="summary-label">Leave Days</div>
          <div class="summary-value" style="color: #17a2b8;">${summary.leave_days || 0}</div>
        </div>
        <div class="summary-box">
          <div class="summary-label">Absent Days</div>
          <div class="summary-value" style="color: #dc3545;">${summary.absent_days || 0}</div>
        </div>
        <div class="summary-box">
          <div class="summary-label">Attendance %</div>
          <div class="summary-value" style="color: ${getAttendanceColor(summary.attendance_percentage)};">
            ${summary.attendance_percentage || '0%'}
          </div>
        </div>
      </div>
      
      <div style="margin-top: 20px;">
        <div style="font-size: 12px; font-weight: bold; margin-bottom: 10px; color: #333;">
          📋 Daily Attendance Records (${attendance_records?.length || 0})
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
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
        <p><strong>Employee Attendance Detail Report</strong></p>
        <p>${empInfo.employee_name || selectedEmployee.employee_name} (PAK: ${empInfo.pak || selectedEmployee.pak})</p>
        <p>Civilian Attendance Management System</p>
      </div>
      
      <script>
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
}}>            🖨️ Print this page
          </button>
          <button className="back-btn" onClick={onBack}>
            ↩️ Back to Summary
          </button>
        </div>

        <div id="printarea">
          <div className="detail-header">
            <div className="header-left">
              <h3>Attendance Detail Report</h3>
              <h2>{formatDate(fromDate)} to {formatDate(toDate)}</h2>
              <p className="period-info">
                Working Days: {working_info?.working_days_count || summary.total_days || 0} days
              </p>
            </div>
            <div className="header-right">
              <div className="employee-info-card">
                <div className="employee-text">
                  <h3>{empInfo.employee_name || employee.employee_name}</h3>
                  <p><strong>PAK:</strong> {empInfo.pak || employee.pak}</p>
                  <p><strong>Appointment:</strong> {empInfo.appointment || employee.appointment}</p>
                  <p><strong>Deployment:</strong> {empInfo.deployment || employee.deployment}</p>
                  <p><strong>Section:</strong> {empInfo.section || 'N/A'}</p>
                  <p><strong>Contact:</strong> {empInfo.phone || 'N/A'} | {empInfo.email || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="section">
            <h3>Attendance Summary</h3>
            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-value">{summary.total_days || 0}</div>
                <div className="card-label">Total Days</div>
              </div>
              <div className="summary-card">
                <div className="card-value">{summary.total_present || summary.present_days || 0}</div>
                <div className="card-label">Present Days</div>
              </div>
              <div className="summary-card">
                <div className="card-value">{summary.late_days || 0}</div>
                <div className="card-label">Late Days</div>
              </div>
              <div className="summary-card">
                <div className="card-value">{summary.leave_days || 0}</div>
                <div className="card-label">Leave Days</div>
              </div>
              <div className="summary-card">
                <div className="card-value">{summary.absent_days || 0}</div>
                <div className="card-label">Absent Days</div>
              </div>
              <div className="summary-card highlight">
                <div 
                  className="card-value" 
                  style={{ color: getAttendanceColor(summary.attendance_percentage) }}
                >
                  {summary.attendance_percentage || '0%'}
                </div>
                <div className="card-label">Attendance %</div>
              </div>
              <div className="summary-card">
                <div className="card-value">{summary.half_day_days || 0}</div>
                <div className="card-label">Half Days</div>
              </div>
              <div className="summary-card">
                <div className="card-value">{summary.holiday_work_days || 0}</div>
                <div className="card-label">Holiday Work</div>
              </div>
              <div className="summary-card">
                <div className="card-value">{summary.total_missed_hours || 0}h</div>
                <div className="card-label">Missed Hours</div>
              </div>
              <div className="summary-card">
                <div className="card-value">{summary.total_extra_hours || 0}h</div>
                <div className="card-label">Extra Hours</div>
              </div>
            </div>
          </div>

          <div className="section">
            <h3>Daily Attendance Record ({attendance_records?.length || 0} records)</h3>
            <div className="datagrid" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <table className="detail-table">
                <thead>
                  <tr>
                    <th width="100px">Date</th>
                    <th width="100px">Day</th>
                    <th width="100px">Status</th>
                    <th width="80px">Time In</th>
                    <th width="80px">Time Out</th>
                    <th width="80px">Hours</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance_records && attendance_records.length > 0 ? (
                    attendance_records.map((record, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                        <td>{record.date || 'N/A'}</td>
                        <td>{record.day_name || 'N/A'}</td>
                        <td 
                          style={{ 
                            color: '#fff',
                            backgroundColor: getStatusColor(record.STATUS),
                            fontWeight: 'bold',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            textAlign: 'center'
                          }}
                        >
                          {record.STATUS || 'N/A'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {record.time_in && record.time_in !== '00:00:00' ? 
                            record.time_in.substring(0, 5) : '--:--'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {record.time_out && record.time_out !== '00:00:00' ? 
                            record.time_out.substring(0, 5) : '--:--'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          {record.MISSED_HOURS !== null && record.MISSED_HOURS !== undefined ? 
                            `${record.MISSED_HOURS > 0 ? '+' : ''}${parseFloat(record.MISSED_HOURS).toFixed(1)}h` : 
                            '0.0h'}
                        </td>
                        <td className="remarks">{record.REMARKS || ''}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#6c757d' }}>
                        <div style={{ fontSize: '16px', marginBottom: '10px' }}>
                          No attendance records found for this period
                        </div>
                        <div style={{ fontSize: '14px' }}>
                          This employee may not have any attendance records between {formatDate(fromDate)} and {formatDate(toDate)}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="report-footer">
            <p>Report generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
            <p>Civilian Attendance Management System | Employee PAK: {empInfo.pak || employee.pak}</p>
          </div>
        </div>
      </div>
    );
  };

  if (showDetailView && selectedEmployee) {
    return (
      <EmployeeDetailView 
        employee={selectedEmployee}
        fromDate={fromDate}
        toDate={toDate}
        onBack={handleBackFromDetail}
        detailData={employeeDetail}
      />
    );
  }

  return (
    <div className="attendance-between-dates-page">
      
      
     

             {/* Header */}
           <StandardHeader 
        title={<h1>View Attendance Between Dates</h1>}
        subtitle="Complete attendance report for selected date range"
      />

      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="report-content">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <section className="selection-section">
              <div className="selection-form">
                <div className="form-group">
                  <label htmlFor="fromDate">From Date:</label>
                  <input
                    type="date"
                    id="fromDate"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="date-input"
                  />
                  <label htmlFor="toDate">To Date:</label>
                  <input
                    type="date"
                    id="toDate"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="date-input"
                  />
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleDateSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : '📊 Generate Report'}
                  </button>
                </div>
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <small style={{ color: '#6c757d' }}>
                    Select date range to view attendance summary for all employees
                  </small>
                </div>
              </div>
            </section>

            {showReport && (
              <div className="action-buttons-top">
                <button className="print-btn" onClick={handlePrint}>
                  🖨️ Print Report
                </button>
                <button 
                  className={`toggle-btn ${showAllColumns ? 'active' : ''}`}
                  onClick={() => setShowAllColumns(!showAllColumns)}
                >
                  {showAllColumns ? '📋 Compact View' : '📊 Detailed View'}
                </button>
                <div className="report-info">
                  Showing: {attendanceData.length} employees | 
                  Period: {formatDate(fromDate)} to {formatDate(toDate)}
                </div>
              </div>
            )}

            {showReport && attendanceData.length > 0 ? (
              <div id="printarea">
                <div className="report-title-section">
                  <h2>Attendance Report: {formatDate(fromDate)} to {formatDate(toDate)}</h2>
                  <div className="report-subtitle">
                    <span>Total Employees: {summaryData?.totalEmployees || 0}</span>
                    <span>Working Days: {summaryData?.totalWorkingDays || 0}</span>
                    <span>Avg Attendance: {summaryData?.averageAttendance || '0%'}</span>
                  </div>
                </div>

                {summaryData && (
                  <section className="summary-section">
                    <div className="summary-grid">
                      <div className="summary-card">
                        <h4>📈 Overall Summary</h4>
                        <div className="overall-stats">
                          <div className="stat-item">
                            <span className="stat-label">Total Employees:</span>
                            <span className="stat-value">{summaryData.totalEmployees}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Total Working Days:</span>
                            <span className="stat-value">{summaryData.totalWorkingDays}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Average Attendance:</span>
                            <span 
                              className="stat-value highlight"
                              style={{ color: getAttendanceColor(summaryData.averageAttendance) }}
                            >
                              {summaryData.averageAttendance}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="summary-card">
                        <h4>📊 Status Distribution</h4>
                        <div className="status-distribution">
                          {summaryData.statusSummary && summaryData.statusSummary.length > 0 ? (
                            summaryData.statusSummary.map((item, index) => (
                              <div key={index} className="distribution-item">
                                <div className="distribution-header">
                                  <span className="status-name">{item.status}</span>
                                  <span className="status-percentage">{item.percentage}</span>
                                </div>
                                <div className="distribution-bar">
                                  <div 
                                    className="distribution-fill"
                                    style={{ 
                                      width: item.percentage,
                                      backgroundColor: getAttendanceColor(item.percentage)
                                    }}
                                  ></div>
                                </div>
                                <div className="distribution-count">{item.count} records</div>
                              </div>
                            ))
                          ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                              No status data available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <section className="detailed-attendance-section">
                  <div className="section-header">
                    <h4>👥 Employee Attendance Summary ({attendanceData.length} employees)</h4>
                    <div className="table-info">
                      <span>Scroll horizontally to see more columns →</span>
                    </div>
                  </div>
                  <div className="datagrid" >
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th style={{ width: '10px', fontSize:'15px' }}>S/No</th>
                          <th style={{ width: '100px', fontSize:'15px' }}>Name/PAK</th>
                          <th style={{ width: '10px' , fontSize:'15px'}}>Total Days</th>
                          <th style={{ width: '10px' , fontSize:'15px'}}>Present</th>
                          <th style={{ width: '10px' , fontSize:'15px'}}>Leave</th>
                          <th style={{ width: '10px' , fontSize:'15px'}}>Absent</th>
                          <th style={{ width: '10px', fontSize:'15px' }}>%</th>
                          <th style={{ width: '10px', fontSize:'15px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.map((employee, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                            <td className="serial-number" style={{ position: 'sticky', left: 0, background: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                              {index + 1}
                            </td>
                            <td  className='employee-name'>
                              {employee.employee_name} / ({employee.pak}) 

                            </td>
                            <td style={{ alignContent:'Center' }}>{employee.total_days}</td>
                            <td className="present-days">{employee.present_days}</td>
                            <td className="leave-days">{employee.leave_days}</td>
                            <td className="absent-days">{employee.absent_days}</td>
                            
                            <td 
                              className="attendance-percentage"
                              style={{ 
                                color: getAttendanceColor(employee.attendance_percentage), 
                                fontWeight: 'bold' 
                              }}
                            >
                              {employee.attendance_percentage}
                            </td>
                            <td className="action-cell" style={{ position: 'sticky', right: 0, background: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                              <button
                                type="button"
                                className="detail-btn"
                                onClick={() => handleDetailView(employee)}
                                disabled={isDetailLoading}
                                title="View detailed attendance"
                              >
                                📋 Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-footer">
                    <p>Total: {attendanceData.length} employees found</p>
                  </div>
                </section>

                <div className="report-footer">
                  <p>Report generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                  <p>Civilian Attendance Management System | Page 1 of 1</p>
                </div>
              </div>
            ) : showReport ? (
              <div className="no-data-message">
                <div className="no-data-icon">📊</div>
                <h3>No Attendance Data Available</h3>
                <p>No attendance records found for the selected date range ({formatDate(fromDate)} to {formatDate(toDate)}).</p>
                <p>Please select a different date range or check if attendance data exists for this period.</p>
              </div>
            ) : null}

            {isLoading && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading attendance data...</p>
                <p className="loading-subtext">Fetching data for {formatDate(fromDate)} to {formatDate(toDate)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAttendanceBetweenDates;