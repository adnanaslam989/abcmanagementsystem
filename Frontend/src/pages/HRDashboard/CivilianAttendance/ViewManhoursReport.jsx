import React, { useState, useEffect } from 'react';
import './ViewManhoursReport.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const ViewManhourReport = () => {
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [message, setMessage] = useState('');
  // Add user state
  const [user, setUser] = useState(null);
  const [isAuthorizedForAll, setIsAuthorizedForAll] = useState(false);

  const API_BASE_URL = 'http://10.0.0.7:5000';

  
  // Fetch user info and years on component mount
  useEffect(() => {
    fetchUserInfo();
    fetchYearData();
  }, []);

  // Function to fetch user info from token
  const fetchUserInfo = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        setMessage('⚠️ Please login to view reports');
        return;
      }

      // Decode the JWT token (without verification for frontend display)
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser(payload);

      // Check if user is authorized to see all records
      // Officers and JCOs can see all, others can only see their own
      const isOfficerOrJCO = payload.category === 'Officer' || payload.category === 'JCO'|| payload.appointment === 'JCO' || payload.appointment === 'HR Manager'|| payload.appointment === 'HR Supervisor' || payload.appointment === 'Supervisor' || payload.appointment === 'DD' || payload.appointment === 'Manager'   ;
      setIsAuthorizedForAll(isOfficerOrJCO);

      console.log('User info loaded:', {
        pak: payload.pak,
        name: payload.name,
        category: payload.category,
        isAuthorizedForAll: isOfficerOrJCO
      });
    } catch (error) {
      console.error('Error decoding token:', error);
      setMessage('⚠️ Error loading user information');
    }
  };

  // Fetch available years on component mount
  const fetchYearData = async () => {
    try {
      setIsLoading(true);
      setMessage('Loading available years...');

      const response = await fetch(`${API_BASE_URL}/api/employee/manhour-report/years`);

      if (!response.ok) {
        throw new Error('Failed to fetch years');
      }

      const data = await response.json();

      if (data.success) {
        setSelectedYear(data.current_year);
        setAvailableYears(data.available_years);
        setMessage('');
      } else {
        setMessage('Failed to load year data');
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching year data:', error);
      setMessage('❌ Error loading year data');
      setIsLoading(false);

      // Fallback to mock years if API fails
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = 0; i <= 20; i++) {
        years.push((currentYear - i).toString());
      }
      setSelectedYear(currentYear.toString());
      setAvailableYears(years);
      setMessage('⚠️ Using fallback data. API connection failed.');
    }
  };

  const handleYearSubmit = async () => {
    if (!selectedYear) {
      setMessage('Please select year first');
      return;
    }

    setIsLoading(true);
    setShowReport(false);
    setMessage(`Generating report for ${selectedYear}...`);

    try {
      let endpoint = '';

      if (isAuthorizedForAll) {
        // Officers/JCOs can see all data
        endpoint = `${API_BASE_URL}/api/employee/manhour-report/summary/${selectedYear}`;
      } else {
        // Others can only see their own data
        if (!user || !user.pak) {
          setMessage('User information not found. Please login again.');
          setIsLoading(false);
          return;
        }
        endpoint = `${API_BASE_URL}/api/employee/manhour-report/employee/${user.pak}/${selectedYear}`;
      }

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();

      if (data.success) {
        // Handle the response differently based on the endpoint
        if (isAuthorizedForAll) {
          // Full summary response
          setReportData(data.report_data);
          setMessage(`✅ Report generated for ${selectedYear} - ${data.count} employees`);
        } else {
          // Single employee detail response - wrap in array for consistency
          const singleEmployeeReport = {
            pak: data.employee.pak,
            employee_name: data.employee.employee_name,
            appointment: data.employee.appointment,
            postin_date: data.employee.postin_date,
            counted_days: data.summary.counted_days,
            allowed_leave_days: data.summary.allowed_leave_days,
            availed_leave_days: data.summary.availed_leave_days,
            remaining_leave_days: data.summary.remaining_leave_days,
            bonus_hours: data.summary.bonus_hours,
            earned_leave_days: data.summary.earned_leave_days,
            balance_leave_days: data.summary.balance_leave_days
          };
          setReportData([singleEmployeeReport]);
          setMessage(`✅ Report generated for ${selectedYear} - Your record`);
        }

        setShowReport(true);
      } else {
        setMessage(`❌ Failed to generate report: ${data.message}`);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setMessage(`❌ Error generating report: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Enhanced Print Function
  const handlePrint = () => {
    // Create a print-friendly version
    const printContent = document.getElementById('printarea');
    
    if (!printContent) {
      alert('Report content not found!');
      return;
    }
    
    // Create a print window
    const printWindow = window.open('', '_blank');
    
    // Get current styles
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules || sheet.rules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');
    
    // Create print-friendly HTML
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manhour Report Summary - ${selectedYear}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: black;
            background: white;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          
          .print-header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }
          
          .print-header h2 {
            margin: 5px 0 0 0;
            font-size: 18px;
            color: #666;
          }
          
          .print-date {
            text-align: right;
            font-size: 12px;
            color: #666;
            margin-bottom: 20px;
          }
          
          .stats-grid-print {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 10px;
            margin: 20px 0;
            page-break-inside: avoid;
          }
          
          .stat-card-print {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
            background: #f8f9fa;
          }
          
          .stat-value-print {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .stat-label-print {
            font-size: 10px;
            color: #666;
          }
          
          .print-table-container {
            width: 100%;
            margin: 20px 0;
            page-break-inside: avoid;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          
          .print-table th {
            background: #f8f9fa;
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
            font-weight: bold;
          }
          
          .print-table td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: center;
          }
          
          .print-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          
          .print-legend {
            margin-top: 30px;
            page-break-inside: avoid;
          }
          
          .print-legend h4 {
            margin-bottom: 10px;
            font-size: 12px;
          }
          
          .legend-item-print {
            margin-bottom: 5px;
            font-size: 10px;
          }
          
          .print-footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>Manhour Report Summary - ${selectedYear}</h1>
          <h2>Civilian Manhour Report System</h2>
        </div>
        
        <div class="print-date">
          Generated on: ${new Date().toLocaleDateString()}
        </div>
    `);
    
    // Add summary statistics (only if authorized)
    const summary = calculateSummary();
    if (summary && isAuthorizedForAll) {
      printWindow.document.write(`
        <div class="stats-grid-print">
          <div class="stat-card-print">
            <div class="stat-value-print">${summary.totalEmployees}</div>
            <div class="stat-label-print">Total Employees</div>
          </div>
          <div class="stat-card-print">
            <div class="stat-value-print">${summary.totalAllowedDays}</div>
            <div class="stat-label-print">Total Allowed Days</div>
          </div>
          <div class="stat-card-print">
            <div class="stat-value-print">${summary.totalAvailedDays}</div>
            <div class="stat-label-print">Total Availed Days</div>
          </div>
          <div class="stat-card-print">
            <div class="stat-value-print">${summary.totalBonusHours}h</div>
            <div class="stat-label-print">Total Bonus Hours</div>
          </div>
          <div class="stat-card-print">
            <div class="stat-value-print">${summary.totalBonusDays}</div>
            <div class="stat-label-print">Bonus (Days)</div>
          </div>
          <div class="stat-card-print">
            <div class="stat-value-print">${summary.totalEarnedDays}</div>
            <div class="stat-label-print">Total Earned Days</div>
          </div>
          <div class="stat-card-print">
            <div class="stat-value-print">${summary.totalBalanceDays}</div>
            <div class="stat-label-print">Total Balance Days</div>
          </div>
        </div>
      `);
    }
    
    // Add the table without action column
    printWindow.document.write(`
      <div class="print-table-container">
        <table class="print-table">
          <thead>
            <tr>
              <th>S/No.</th>
              <th>Employee Info</th>
              <th>Allowed<br />Leave</th>
              <th>Availed<br />Leave</th>
              <th>Remaining<br />Leave</th>
              <th>Bonus<br />Hours</th>
              <th>Earned<br />Leave</th>
              <th>Balance<br />Leave</th>
            </tr>
          </thead>
          <tbody>
    `);
    
    // Add table rows without action column
    reportData.forEach((employee, index) => {
      const earnedDays = employee.earned_leave_days || 0;
      const bonusHours = employee.bonus_hours || 0;
      
      printWindow.document.write(`
        <tr>
          <td>${index + 1}</td>
          <td style="text-align: left;">
            <div style="font-weight: bold; color: #e74c3c;">${employee.pak}</div>
            <div style="font-size: 9px; color: #666;">${employee.employee_name}</div>
          </td>
          <td>${employee.allowed_leave_days.toFixed(4)}</td>
          <td>${employee.availed_leave_days.toFixed(4)}</td>
          <td style="color: ${employee.remaining_leave_days < 0 ? '#dc3545' : '#28a745'}">
            ${employee.remaining_leave_days.toFixed(4)}
          </td>
          <td style="font-weight: bold;">
            <div>${bonusHours >= 0 ? '+' : ''}${bonusHours.toFixed(2)}h</div>
            <div style="font-size: 9px; opacity: 0.8;">
              (${bonusHours >= 0 ? '+' : ''}${(bonusHours / 8).toFixed(4)} d)
            </div>
          </td>
          <td style="font-weight: bold;">
            ${earnedDays >= 0 ? '+' : ''}${earnedDays.toFixed(4)}
          </td>
          <td style="font-weight: bold; background: #007bff; color: white;">
            ${employee.balance_leave_days.toFixed(4)}
          </td>
        </tr>
      `);
    });
    
    // Close table and add legend/footer
    printWindow.document.write(`
          </tbody>
        </table>
      </div>
      
      <div class="print-legend">
        <h4>📋 Report Legend</h4>
        <div class="legend-item-print">
          <strong>Allowed Leave Days:</strong> 20 days per year (prorated based on service)
        </div>
        <div class="legend-item-print">
          <strong>Availed Leave Days:</strong> Leave already taken (full day leaves)
        </div>
        <div class="legend-item-print">
          <strong>Remaining Leave Days:</strong> Allowed Days - Availed Days
        </div>
        <div class="legend-item-print">
          <strong>Bonus Hours:</strong> Awarded (+) or Penalized (-) hours (1 day = 8 hours)
        </div>
        <div class="legend-item-print">
          <strong>Earned Leave Days:</strong> Calculated from missed hours (+ for extra work, - for missed time)
        </div>
        <div class="legend-item-print">
          <strong>Balance Leave Days:</strong> Remaining + (Bonus Hours ÷ 8) + Earned Days
        </div>
      </div>
      
      <div class="print-footer">
        <p>Report generated on: ${new Date().toLocaleDateString()}</p>
        <p>Civilian Manhour Report System - ${selectedYear}</p>
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

  const handleDetailView = async (pak) => {
    const employee = reportData.find(emp => emp.pak === pak);
    if (!employee) return;

    setSelectedEmployee(employee);
    setShowDetailView(true);
  };

  const handleBackFromDetail = () => {
    setShowDetailView(false);
    setSelectedEmployee(null);
  };

  // Function to check if detail button should be shown for a specific employee
  const shouldShowDetailButton = (employeePak) => {
    // If user is authorized for all (Officer/JCO), show for all employees
    if (isAuthorizedForAll) {
      return true;
    }

    // If not authorized for all, show only for the logged-in user's own record
    return user && user.pak === employeePak;
  };

  const calculateSummary = () => {
    if (reportData.length === 0) return null;

    const totalEmployees = reportData.length;
    const totalAllowedDays = reportData.reduce((sum, emp) => sum + (emp.allowed_leave_days || 0), 0);
    const totalAvailedDays = reportData.reduce((sum, emp) => sum + (emp.availed_leave_days || 0), 0);
    const totalBonusHours = reportData.reduce((sum, emp) => sum + (emp.bonus_hours || 0), 0);
    const totalEarnedDays = reportData.reduce((sum, emp) => sum + (emp.earned_leave_days || 0), 0);
    const totalBalanceDays = reportData.reduce((sum, emp) => sum + (emp.balance_leave_days || 0), 0);

    return {
      totalEmployees,
      totalAllowedDays: totalAllowedDays.toFixed(4),
      totalAvailedDays: totalAvailedDays.toFixed(4),
      totalBonusHours: totalBonusHours.toFixed(2),
      totalBonusDays: (totalBonusHours / 8).toFixed(4),
      totalEarnedDays: totalEarnedDays.toFixed(4),
      totalBalanceDays: totalBalanceDays.toFixed(4)
    };
  };

  // Employee Detail View Component
  const EmployeeDetailView = ({ employeeId, selectedYear, onBack }) => {
    const [employeeData, setEmployeeData] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [summaryData, setSummaryData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [detailMessage, setDetailMessage] = useState('');
    const [hoursRecords, setHoursRecords] = useState([]);

    useEffect(() => {
      if (employeeId && selectedYear) {
        fetchEmployeeDetail();
      }
    }, [employeeId, selectedYear]);

    const fetchEmployeeDetail = async () => {
      setIsLoading(true);
      setDetailMessage('Loading employee details...');

      try {
        // Fetch employee basic details
        const response = await fetch(`${API_BASE_URL}/api/employee/manhour-report/employee/${employeeId}/${selectedYear}`);

        if (!response.ok) {
          throw new Error('Failed to fetch employee details');
        }

        const data = await response.json();

        if (data.success) {
          setEmployeeData(data.employee);
          setAttendanceRecords(data.attendance_records);
          setSummaryData(data.summary);

          // Fetch hours records (awards and penalties)
          await fetchHoursRecords(employeeId, selectedYear);
          setDetailMessage('');
        } else {
          setDetailMessage(`Failed to load details: ${data.message}`);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching employee detail:', error);
        setDetailMessage(`❌ Error loading details: ${error.message}`);
        setIsLoading(false);
      }
    };

    const fetchHoursRecords = async (pak, year) => {
      try {
        // Use the new endpoint for hours records
        const response = await fetch(`${API_BASE_URL}/api/bonus/history/${pak}`);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.records) {
            // Filter records for the selected year
            const yearRecords = data.records.filter(record => {
              const recordYear = new Date(record.BONUS_DATE).getFullYear();
              return recordYear.toString() === year.toString();
            });

            // Format the records
            const formattedRecords = yearRecords.map(record => ({
              BONUS_ID: record.BONUS_ID,
              BONUS_DATE: record.BONUS_DATE,
              BONUS_HOURS: record.BONUS_HOURS,
              AWARDED_BY: record.AWARDED_BY,
              REASON: record.REASON,
              ACTION_TYPE: record.BONUS_HOURS >= 0 ? 'Award' : 'Penalty'
            }));

            setHoursRecords(formattedRecords);
          } else {
            setHoursRecords([]);
          }
        } else {
          setHoursRecords([]);
        }
      } catch (error) {
        console.error('Error fetching hours records:', error);
        setHoursRecords([]);
      }
    };

  const handlePrint = () => {
  // Create a print window
  const printWindow = window.open('', '_blank');
  
  // Get today's date
  const today = new Date().toLocaleDateString();
  
  // Create print-friendly HTML
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Employee Leave Record - ${employeeData?.employee_name || 'Employee'}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: black;
          background: white;
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
          font-size: 16px;
          color: #666;
        }
        
        .employee-info-print {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
        }
        
        .info-label {
          font-weight: bold;
          color: #333;
        }
        
        .info-value {
          color: #666;
        }
        
        /* Leave Summary Section */
        .summary-section-print {
          margin: 20px 0;
        }
        
        .summary-table-print {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-bottom: 15px;
        }
        
        .summary-table-print th {
          background: #2056AC;
          color: white;
          padding: 10px 8px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #ddd;
        }
        
        .summary-table-print td {
          padding: 10px 8px;
          text-align: center;
          border: 1px solid #ddd;
        }
        
        .summary-table-print tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .balance-formula {
          background: #f0f7ff;
          padding: 15px;
          border-radius: 4px;
          margin: 15px 0;
          border-left: 4px solid #3498db;
          font-size: 12px;
        }
        
        /* Hours Records Section */
        .hours-section-print {
          margin: 20px 0;
        }
        
        .hours-table-print {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-bottom: 15px;
        }
        
        .hours-table-print th {
          background: #ffc107;
          color: #333;
          padding: 8px 6px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #ddd;
        }
        
        .hours-table-print td {
          padding: 8px 6px;
          border: 1px solid #ddd;
        }
        
        /* Attendance Records Section */
        .attendance-section-print {
          margin: 20px 0;
        }
        
        .attendance-table-print {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        
        .attendance-table-print th {
          background: #17a2b8;
          color: white;
          padding: 8px 4px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #ddd;
        }
        
        .attendance-table-print td {
          padding: 6px 4px;
          border: 1px solid #ddd;
        }
        
        .attendance-table-print tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        /* Status colors */
        .status-leave { background-color: #f8d7da; color: #721c24; }
        .status-absent { background-color: #292929; color: white; }
        .status-halfday { background-color: #d1ecf1; color: #0c5460; }
        .status-holiday { background-color: #d4edda; color: #155724; font-weight: bold; }
        .status-late { background-color: #fff3cd; color: #856404; }
        .status-present { background-color: #d4edda; color: #155724; }
        
        /* Attendance Summary */
        .attendance-summary-print {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin: 20px 0;
        }
        
        .summary-card-print {
          border: 1px solid #ddd;
          padding: 15px;
          text-align: center;
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        .summary-value-print {
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
          margin: 5px 0;
        }
        
        .summary-label-print {
          font-size: 11px;
          color: #666;
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
          margin: 15mm;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 15px;
          }
          
          .print-footer {
            page-break-inside: avoid;
          }
        }
        
        /* Column widths */
        .attendance-table-print th:nth-child(1),
        .attendance-table-print td:nth-child(1) { width: 80px; } /* Date */
        .attendance-table-print th:nth-child(2),
        .attendance-table-print td:nth-child(2) { width: 40px; } /* Day */
        .attendance-table-print th:nth-child(3),
        .attendance-table-print td:nth-child(3) { width: 60px; } /* Status */
        .attendance-table-print th:nth-child(4),
        .attendance-table-print td:nth-child(4) { width: 60px; } /* Time In */
        .attendance-table-print th:nth-child(5),
        .attendance-table-print td:nth-child(5) { width: 60px; } /* Time Out */
        .attendance-table-print th:nth-child(6),
        .attendance-table-print td:nth-child(6) { width: 70px; } /* Missed Hours */
        .attendance-table-print th:nth-child(7),
        .attendance-table-print td:nth-child(7) { width: 100px; } /* Remarks */
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>Employee Leave Record</h1>
        <h2>Civilian Manhour Report System - ${selectedYear}</h2>
      </div>
      
      <!-- Employee Information -->
      <div class="employee-info-print">
        <div class="info-item">
          <span class="info-label">Employee Name:</span>
          <span class="info-value">${employeeData?.employee_name || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">PAK Number:</span>
          <span class="info-value">${employeeData?.pak || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Appointment:</span>
          <span class="info-value">${employeeData?.appointment || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Post In Date:</span>
          <span class="info-value">${summaryData?.postin_date || 'N/A'}</span>
        </div>
      </div>
      
      <!-- Leave Summary Section -->
      <div class="summary-section-print">
        <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #28a745; padding-bottom: 5px;">Leave Summary</h3>
        
        <table class="summary-table-print">
          <thead>
            <tr>
              <th>Counted Days</th>
              <th>Allowed Leave</th>
              <th>Availed Leave</th>
              <th>Remaining Leave</th>
              <th>Bonus Hours</th>
              <th>Earned Leave</th>
              <th>Balance Leave</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${summaryData?.counted_days || '0'}</td>
              <td>${summaryData?.allowed_leave_days?.toFixed(4) || '0.0000'}</td>
              <td>${summaryData?.availed_leave_days?.toFixed(4) || '0.0000'}</td>
              <td>${summaryData?.remaining_leave_days?.toFixed(4) || '0.0000'}</td>
              <td style="background-color: ${summaryData?.bonus_hours >= 0 ? '#fff3cd' : '#f8d7da'}; color: ${summaryData?.bonus_hours >= 0 ? '#856404' : '#721c24'}; font-weight: bold;">
                ${summaryData?.bonus_hours >= 0 ? '+' : ''}${summaryData?.bonus_hours ? summaryData.bonus_hours.toFixed(2) : '0.00'} hours
              </td>
              <td style="background-color: ${summaryData?.earned_leave_days >= 0 ? '#d4edda' : '#f8d7da'}; color: ${summaryData?.earned_leave_days >= 0 ? '#155724' : '#721c24'}; font-weight: bold;">
                ${summaryData?.earned_leave_days >= 0 ? '+' : ''}${summaryData?.earned_leave_days?.toFixed(4) || '0.0000'}
              </td>
              <td style="background-color: #007bff; color: white; font-weight: bold; font-size: 12px;">
                ${summaryData?.balance_leave_days?.toFixed(4) || '0.0000'}
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- Balance Calculation Formula -->
        ${summaryData ? `
        <div class="balance-formula">
          <strong>Balance Calculation:</strong><br>
          ${summaryData.remaining_leave_days.toFixed(4)} days (Remaining) + 
          ${summaryData.bonus_hours ? (summaryData.bonus_hours / 8).toFixed(4) : '0.0000'} days (Bonus Hours converted) + 
          ${summaryData.earned_leave_days >= 0 ? '+' : ''}${summaryData.earned_leave_days.toFixed(4)} days (Earned) = 
          ${summaryData.balance_leave_days.toFixed(4)} days (Balance)
        </div>
        ` : ''}
      </div>
      
      <!-- Hours Records Section -->
      ${hoursRecords.length > 0 ? `
      <div class="hours-section-print">
        <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #ffc107; padding-bottom: 5px;">
          Hours Records (${hoursRecords.length} records)
        </h3>
        
        <table class="hours-table-print">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action Type</th>
              <th>Hours</th>
              <th>Awarded By</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${hoursRecords.map((record, index) => `
              <tr>
                <td>${record.BONUS_DATE ? new Date(record.BONUS_DATE).toLocaleDateString('en-GB') : 'N/A'}</td>
                <td>
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; background-color: ${record.ACTION_TYPE === 'Award' ? '#d4edda' : '#f8d7da'}; color: ${record.ACTION_TYPE === 'Award' ? '#155724' : '#721c24'}">
                    ${record.ACTION_TYPE}
                  </span>
                </td>
                <td style="font-weight: bold; color: ${record.BONUS_HOURS >= 0 ? '#28a745' : '#dc3545'}">
                  ${record.BONUS_HOURS >= 0 ? '+' : ''}${record.BONUS_HOURS}
                </td>
                <td>${record.AWARDED_BY || 'N/A'}</td>
                <td>${record.REASON || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <!-- Attendance Records Section -->
      <div class="attendance-section-print">
        <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #17a2b8; padding-bottom: 5px;">
          Attendance Records (${attendanceRecords.length} records)
        </h3>
        
        <table class="attendance-table-print">
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Status</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Missed Hours</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceRecords.map((record, index) => {
              const getStatusClass = (status) => {
                switch (status) {
                  case 'Leave': return 'status-leave';
                  case 'Absent': return 'status-absent';
                  case 'Half Day': return 'status-halfday';
                  case 'Holiday Work': return 'status-holiday';
                  case 'Late': return 'status-late';
                  case 'Present': return 'status-present';
                  default: return '';
                }
              };
              
              return `
              <tr>
                <td>${record.attendence_date || 'N/A'}</td>
                <td>${record.day_name?.substring(0, 3) || 'N/A'}</td>
                <td class="${getStatusClass(record.STATUS)}">${record.STATUS || 'N/A'}</td>
                <td>${record.time_in || '--:--'}</td>
                <td>${record.time_out || '--:--'}</td>
                <td style="font-weight: bold; color: ${parseFloat(record.MISSED_HOURS) > 0 ? '#28a745' : parseFloat(record.MISSED_HOURS) < 0 ? '#dc3545' : '#6c757d'}">
                  ${parseFloat(record.MISSED_HOURS) > 0 ? '+' : ''}${record.MISSED_HOURS || '0.00'}
                </td>
                <td>${record.REMARKS || ''}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Attendance Summary -->
      ${summaryData?.attendance_summary ? `
      <div class="attendance-summary-print">
        <div class="summary-card-print">
          <div class="summary-value-print">${summaryData.attendance_summary.present_days || 0}</div>
          <div class="summary-label-print">Present Days</div>
        </div>
        <div class="summary-card-print">
          <div class="summary-value-print">${summaryData.attendance_summary.absent_days || 0}</div>
          <div class="summary-label-print">Absent Days</div>
        </div>
        <div class="summary-card-print">
          <div class="summary-value-print">${summaryData.attendance_summary.leave_days || 0}</div>
          <div class="summary-label-print">Leave Days</div>
        </div>
        <div class="summary-card-print">
          <div class="summary-value-print">${summaryData.attendance_summary.holiday_work_days || 0}</div>
          <div class="summary-label-print">Holiday Work Days</div>
        </div>
      </div>
      ` : ''}
      
      <div class="print-footer">
        <p>Report generated on: ${today}</p>
        <p>Civilian Manhour Report System - ${selectedYear}</p>
        <p>Employee: ${employeeData?.employee_name || 'N/A'} (${employeeData?.pak || 'N/A'})</p>
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

    const handleSendEmail = () => {
      if (!employeeData) return;

      const subject = `Leave Record ${selectedYear} - ${employeeData.employee_name}`;
      let body = `Please find the leave record for ${employeeData.employee_name} (${employeeData.pak}) for the year ${selectedYear}.\n\n`;

      if (summaryData) {
        body += `LEAVE SUMMARY:\n`;
        body += `Post In Date: ${summaryData.postin_date}\n`;
        body += `Counted Days: ${summaryData.counted_days}\n`;
        body += `Allowed Leave: ${summaryData.allowed_leave_days.toFixed(4)} days\n`;
        body += `Availed Leave: ${summaryData.availed_leave_days.toFixed(4)} days\n`;
        body += `Remaining Leave: ${summaryData.remaining_leave_days.toFixed(4)} days\n`;
        body += `Bonus Hours: ${summaryData.bonus_hours ? summaryData.bonus_hours.toFixed(2) : '0.00'} hours\n`;
        body += `Earned Leave: ${summaryData.earned_leave_days.toFixed(4)} days\n`;
        body += `Balance Leave: ${summaryData.balance_leave_days.toFixed(4)} days\n`;
        body += `\n`;
        body += `Balance Formula: \n`;
        body += `Remaining Days (${summaryData.remaining_leave_days.toFixed(4)}) \n`;
        body += `+ Bonus Hours converted to days (${summaryData.bonus_hours ? (summaryData.bonus_hours / 8).toFixed(4) : '0.0000'}) \n`;
        body += `+ Earned Days (${summaryData.earned_leave_days.toFixed(4)}) \n`;
        body += `= ${summaryData.balance_leave_days.toFixed(4)} days\n`;
      }

      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const getStatusStyle = (status, timeInMinutes, dayName) => {
      const styles = {};

      switch (status) {
        case 'Leave':
          styles.backgroundColor = '#f8d7da';
          styles.color = '#721c24';
          break;
        case 'Absent':
          styles.backgroundColor = '#292929';
          styles.color = 'white';
          break;
        case 'Half Day':
          styles.backgroundColor = '#d1ecf1';
          styles.color = '#0c5460';
          break;
        case 'Holiday Work':
          styles.backgroundColor = '#d4edda';
          styles.color = '#155724';
          styles.fontWeight = 'bold';
          break;
        case 'Late':
          styles.backgroundColor = '#fff3cd';
          styles.color = '#856404';
          break;
        case 'Present':
          styles.backgroundColor = '#d4edda';
          styles.color = '#155724';
          break;
        default:
          styles.backgroundColor = '#f8f9fa';
          styles.color = '#212529';
      }

      return styles;
    };

    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{detailMessage || 'Loading employee details...'}</p>
        </div>
      );
    }

    if (!employeeData) {
      return (
        <div className="error-container">
          <p>No employee data found.</p>
          <button onClick={onBack} className="back-btn">Back to Summary</button>
        </div>
      );
    }

    return (
      <div className="employee-detail-page">
        {/* Action Buttons */}
        <div className="action-buttons-top">
          <button className="print-btn" onClick={handlePrint}>
            🖨️ Print this page
          </button>
          <button className="email-btn" onClick={handleSendEmail}>
            📧 Send Mail
          </button>
          <button className="back-btn" onClick={onBack}>
            ↩️ Back to Summary
          </button>
        </div>

        <div id="printarea">
          {/* Leave Summary Section */}
          <div className="section" style={{ marginTop: '20px' }}>
            <h2 style={{ borderBottom: '2px solid #28a745', paddingBottom: '10px' }}>Leave Summary</h2>
            <div className="datagrid">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Post In Date</th>
                    <th>Counted Days</th>
                    <th>Allowed Leave</th>
                    <th>Availed Leave</th>
                    <th>Remaining Leave</th>
                    <th>Bonus Hours</th>
                    <th>Earned Leave</th>
                    <th>Balance Leave</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData && (
                    <tr>
                      <td>{summaryData.postin_date}</td>
                      <td>{summaryData.counted_days}</td>
                      <td>{summaryData.allowed_leave_days.toFixed(4)}</td>
                      <td>{summaryData.availed_leave_days.toFixed(4)}</td>
                      <td>{summaryData.remaining_leave_days.toFixed(4)}</td>
                      <td style={{
                        backgroundColor: summaryData.bonus_hours >= 0 ? '#fff3cd' : '#f8d7da',
                        color: summaryData.bonus_hours >= 0 ? '#856404' : '#721c24',
                        fontWeight: 'bold'
                      }}>
                        {summaryData.bonus_hours >= 0 ? '+' : ''}{summaryData.bonus_hours ? summaryData.bonus_hours.toFixed(2) : '0.00'} hours
                      </td>
                      <td style={{
                        backgroundColor: summaryData.earned_leave_days >= 0 ? '#d4edda' : '#f8d7da',
                        color: summaryData.earned_leave_days >= 0 ? '#155724' : '#721c24',
                        fontWeight: 'bold'
                      }}>
                        {summaryData.earned_leave_days >= 0 ? '+' : ''}{summaryData.earned_leave_days.toFixed(4)} days
                      </td>
                      <td style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}>
                        {summaryData.balance_leave_days.toFixed(4)} days
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Balance Calculation Formula */}
            {summaryData && (
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '10px',
                marginTop: '10px',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <strong>Balance Calculation:</strong>
                <span style={{ marginLeft: '10px' }}>
                  {summaryData.remaining_leave_days.toFixed(4)} days (Remaining) +
                  {summaryData.bonus_hours ? ` ${(summaryData.bonus_hours / 8).toFixed(4)} days` : ' 0.0000 days'} (Bonus Hours converted) +
                  {summaryData.earned_leave_days >= 0 ? ` +${summaryData.earned_leave_days.toFixed(4)}` : ` ${summaryData.earned_leave_days.toFixed(4)}`} days (Earned) =
                  {summaryData.balance_leave_days.toFixed(4)} days (Balance)
                </span>
              </div>
            )}
          </div>

          {/* Hours Records Section (if any) */}
          {hoursRecords.length > 0 && (
            <div className="section" style={{ marginTop: '30px' }}>
              <h3 style={{ borderBottom: '2px solid #ffc107', paddingBottom: '10px' }}>
                Hours Records ({hoursRecords.length} records)
              </h3>
              <div className="datagrid">
                <table className="bonus-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Action Type</th>
                      <th>Hours</th>
                      <th>Awarded By</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hoursRecords.map((record, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                        <td>
                          {record.BONUS_DATE ?
                            new Date(record.BONUS_DATE).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            }) : 'N/A'
                          }
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            backgroundColor: record.ACTION_TYPE === 'Award' ? '#d4edda' : '#f8d7da',
                            color: record.ACTION_TYPE === 'Award' ? '#155724' : '#721c24'
                          }}>
                            {record.ACTION_TYPE}
                          </span>
                        </td>
                        <td style={{
                          fontWeight: 'bold',
                          color: record.BONUS_HOURS >= 0 ? '#28a745' : '#dc3545'
                        }}>
                          {record.BONUS_HOURS >= 0 ? '+' : ''}{record.BONUS_HOURS}
                        </td>
                        <td>{record.AWARDED_BY}</td>
                        <td>{record.REASON}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendance Records Table */}
          <div className="section" style={{ marginTop: '30px' }}>
            <h3 style={{ borderBottom: '2px solid #17a2b8', paddingBottom: '10px' }}>
              Attendance Records ({attendanceRecords.length} records)
            </h3>
            <div className="datagrid">
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Status</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Missed Hours</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                      <td>{record.attendence_date}</td>
                      <td>{record.day_name?.substring(0, 3) || 'N/A'}</td>
                      <td style={getStatusStyle(record.STATUS)}>
                        {record.STATUS}
                      </td>
                      <td>{record.time_in || '--:--'}</td>
                      <td>{record.time_out || '--:--'}</td>
                      <td>
                        {record.MISSED_HOURS !== null ?
                          <span style={{
                            color: parseFloat(record.MISSED_HOURS) > 0 ? '#28a745' :
                              parseFloat(record.MISSED_HOURS) < 0 ? '#dc3545' : '#6c757d',
                            fontWeight: 'bold'
                          }}>
                            {parseFloat(record.MISSED_HOURS) > 0 ? '+' : ''}{parseFloat(record.MISSED_HOURS).toFixed(2)}
                          </span> : '0.00'
                        }
                      </td>
                      <td>{record.REMARKS || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance Summary */}
          {summaryData?.attendance_summary && (
            <div className="section" style={{ marginTop: '30px' }}>
              <h3 style={{ borderBottom: '2px solid #6c757d', paddingBottom: '10px' }}>Attendance Summary</h3>
              <div className="stats-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '15px',
                marginTop: '15px'
              }}>
                <div className="stat-card" style={{
                  backgroundColor: '#d4edda',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#155724' }}>
                    {summaryData.attendance_summary.present_days}
                  </div>
                  <div style={{ color: '#155724' }}>Present Days</div>
                </div>
                <div className="stat-card" style={{
                  backgroundColor: '#f8d7da',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#721c24' }}>
                    {summaryData.attendance_summary.absent_days}
                  </div>
                  <div style={{ color: '#721c24' }}>Absent Days</div>
                </div>
                <div className="stat-card" style={{
                  backgroundColor: '#d1ecf1',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0c5460' }}>
                    {summaryData.attendance_summary.leave_days}
                  </div>
                  <div style={{ color: '#0c5460' }}>Leave Days</div>
                </div>
                <div className="stat-card" style={{
                  backgroundColor: '#fff3cd',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#856404' }}>
                    {summaryData.attendance_summary.holiday_work_days}
                  </div>
                  <div style={{ color: '#856404' }}>Holiday Work Days</div>
                </div>
              </div>
            </div>
          )}

          {/* Report Footer */}
          <div className="report-footer">
            <p>Report generated on: {new Date().toLocaleDateString()}</p>
            <p>Civilian Manhour Report System - {selectedYear}</p>
          </div>
        </div>
      </div>
    );
  };

  if (showDetailView) {
    return (
      <EmployeeDetailView
        employeeId={selectedEmployee.pak}
        selectedYear={selectedYear}
        onBack={handleBackFromDetail}
      />
    );
  }

  const summary = calculateSummary();

  return (
    <div className="manhour-report-page">
      {/* Header */}
      <StandardHeader
        title={<h1>View Manhours Report</h1>}
      />

      {/* Main Content */}
      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="report-content">
            {/* Message Display */}
            {message && (
              <div className={`message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : message.includes('⚠️') ? 'warning' : 'info'}`}>
                {message}
              </div>
            )}

            {/* Year Selection Section */}
            <section className="selection-section">
              <div className="selection-form">
                <div className="form-group">
                  <label htmlFor="selectedYear">Select Year:</label>
                  <select
                    id="selectedYear"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="year-select"
                    disabled={isLoading}
                  >
                    {availableYears.map((year, index) => (
                      <option key={index} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleYearSubmit}
                    disabled={isLoading}
                    style={{ minWidth: '80px' }}
                  >
                    {isLoading ? 'Loading...' : 'Generate Report'}
                  </button>
                </div>
                <div style={{
                  marginTop: '10px',
                  fontSize: '14px',
                  color: '#6c757d',
                  textAlign: 'center'
                }}>
                  <span style={{color:'White'}}>📅 Years available: {availableYears.length}</span>
                  {selectedYear && <span style={{color:'White'}}> | Selected: <strong>{selectedYear}</strong></span>}
                  {user && (
                    <span style={{ marginLeft: '15px', color: '#28a745', fontWeight: 'bold' }}>
                      👤 {user.name} ({isAuthorizedForAll ? 'Full Access' : 'Personal Access'})
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Report Section */}
            {showReport && (
              <div id="printarea">
                {/* Report Header */}
                <div className="report-title-section">
                  <h2>
                    Manhour Report Summary - {selectedYear}
                    {!isAuthorizedForAll && user && (
                      <span style={{ fontSize: '18px', color: '#666', marginLeft: '20px' }}>
                        (Personal Report for {user.name})
                      </span>
                    )}
                  </h2>
                  <div className="action-buttons">
                    <button className="print-btn" onClick={handlePrint}>
                      📄 Print Report
                    </button>
                  </div>
                </div>

                {/* Summary Statistics */}
                {summary && isAuthorizedForAll && (
                  <section className="summary-stats">
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-value">{summary.totalEmployees}</div>
                        <div className="stat-label">Total Employees</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{summary.totalAllowedDays}</div>
                        <div className="stat-label">Total Allowed Days</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{summary.totalAvailedDays}</div>
                        <div className="stat-label">Total Availed Days</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{summary.totalBonusHours}h</div>
                        <div className="stat-label">Total Bonus Hours</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{summary.totalBonusDays}</div>
                        <div className="stat-label">Bonus (Days)</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{summary.totalEarnedDays}</div>
                        <div className="stat-label">Total Earned Days</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{summary.totalBalanceDays}</div>
                        <div className="stat-label">Total Balance Days</div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Detailed Report Table */}
    <section className="detailed-report-section" style={{ marginTop: '0' }}>
                  <div className="table-container">
                    <div className="datagrid">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>S/No.</th>
                            <th>Employee Info</th>
                            <th>Allowed<br />Leave</th>
                            <th>Availed<br />Leave</th>
                            <th>Remaining<br />Leave</th>
                            <th>Bonus<br />Hours</th>
                            <th>Earned<br />Leave</th>
                            <th>Balance<br />Leave</th>
                            <th className="no-print">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.map((employee, index) => {
                            const earnedDays = employee.earned_leave_days || 0;
                            const bonusHours = employee.bonus_hours || 0;
                            const showDetailBtn = shouldShowDetailButton(employee.pak);

                            return (
                              <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                                <td>{index + 1}</td>
                                <td className="employee-info-cell">
                                  <div style={{ fontWeight: 'bold', color: '#e74c3c', marginBottom: '5px' }}>
                                    {employee.pak}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666' }}>
                                    {employee.employee_name}
                                  </div>
                                </td>
                                <td>{employee.allowed_leave_days.toFixed(4)}</td>
                                <td>{employee.availed_leave_days.toFixed(4)}</td>
                                <td style={{ color: employee.remaining_leave_days < 0 ? '#dc3545' : '#28a745' }}>
                                  {employee.remaining_leave_days.toFixed(4)}
                                </td>
                                <td className="bonus-hours" style={{
                                  backgroundColor: bonusHours >= 0 ? '#fff3cd' : '#f8d7da',
                                  color: bonusHours >= 0 ? '#856404' : '#721c24',
                                  fontWeight: 'bold'
                                }}>
                                  <div>{bonusHours >= 0 ? '+' : ''}{bonusHours.toFixed(2)}h</div>
                                  <div style={{ fontSize: '11px', opacity: '0.8' }}>
                                    ({bonusHours >= 0 ? '+' : ''}{(bonusHours / 8).toFixed(4)} d)
                                  </div>
                                </td>
                                <td className="earned-days" style={{
                                  backgroundColor: earnedDays >= 0 ? '#d4edda' : '#f8d7da',
                                  color: earnedDays >= 0 ? '#155724' : '#721c24',
                                  fontWeight: 'bold'
                                }}>
                                  {earnedDays >= 0 ? '+' : ''}{earnedDays.toFixed(4)}
                                </td>
                                <td className="balance-days" style={{
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  fontWeight: 'bold'
                                }}>
                                  {employee.balance_leave_days.toFixed(4)}
                                </td>
                                <td className="no-print action-cell">
                                  {showDetailBtn ? (
                                    <button
                                      type="button"
                                      className="detail-btn"
                                      onClick={() => handleDetailView(employee.pak)}
                                      title={isAuthorizedForAll ? "View employee details" : "View your detailed report"}
                                    >
                                      View Details
                                    </button>
                                  ) : (
                                    <span style={{ color: '#6c757d', fontSize: '11px' }}>
                                      Restricted
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Information message for non-authorized users */}
                  {!isAuthorizedForAll && (
                    <div className="info-message" style={{
                      backgroundColor: '#e7f3ff',
                      padding: '15px',
                      borderRadius: '5px',
                      marginTop: '20px',
                      borderLeft: '5px solid #007bff'
                    }}>
                      <strong>ℹ️ Personal Report Only</strong>
                      <p>You are viewing only your personal leave record. To view other employees' records, please contact your administrator.</p>
                      <p style={{ marginTop: '5px', fontSize: '14px' }}>
                        <strong>Note:</strong> You can click "View Details" on your own record to see detailed attendance information.
                      </p>
                    </div>
                  )}
                </section>

                {/* Report Legend */}
                <div className="report-legend">
                  <h4>📋 Report Legend</h4>
                  <div className="legend-items">
                    <div className="legend-item">
                      <strong>Allowed Leave Days:</strong> 20 days per year (prorated based on service)
                    </div>
                    <div className="legend-item">
                      <strong>Availed Leave Days:</strong> Leave already taken (full day leaves)
                    </div>
                    <div className="legend-item">
                      <strong>Remaining Leave Days:</strong> Allowed Days - Availed Days
                    </div>
                    <div className="legend-item">
                      <strong>Bonus Hours:</strong> Awarded (+) or Penalized (-) hours (1 day = 8 hours)
                    </div>
                    <div className="legend-item">
                      <strong>Earned Leave Days:</strong> Calculated from missed hours (+ for extra work, - for missed time)
                    </div>
                    <div className="legend-item">
                      <strong>Balance Leave Days:</strong> Remaining + (Bonus Hours ÷ 8) + Earned Days
                    </div>
                  </div>
                </div>

                {/* Report Footer */}
                <div className="report-footer">
                  <p>Report generated on: {new Date().toLocaleDateString()}</p>
                  <p>Civilian Manhour Report System - {selectedYear}</p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !showReport && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Generating manhour report...</p>
                <p className="loading-subtext">This may take a moment for large datasets</p>
              </div>
            )}

            {/* No Data Message */}
            {!isLoading && !showReport && selectedYear && (
              <div className="no-data-message">
                <div className="no-data-icon">📊</div>
                <h3>Ready to Generate Report</h3>
                <p>Select a year and click "Generate Report" to view manhour data for {selectedYear}.</p>
                <p>The report will show leave balances, attendance summary, and employee statistics.</p>
                {!isAuthorizedForAll && user && (
                  <div className="access-info" style={{
                    backgroundColor: '#fff3cd',
                    padding: '10px',
                    borderRadius: '5px',
                    marginTop: '15px',
                    fontSize: '14px'
                  }}>
                    <strong>ℹ️ Access Level: Personal</strong>
                    <p>You will only see your own leave record, not other employees' data.</p>
                    <p style={{ marginTop: '5px' }}>You can view detailed attendance information for your own record by clicking "View Details".</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewManhourReport;