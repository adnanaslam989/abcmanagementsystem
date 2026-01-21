import React, { useState, useEffect } from 'react';
import './TotalStrength.css';
import axios from 'axios';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const TotalStrength = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    officers: 0,
    jcos: 0,
    airmen: 0,
    civilians: 0
  });
  const [error, setError] = useState(null);

  // API base URL - adjust if your backend is on different port
  const API_BASE_URL = 'http://10.0.0.7:5000/api';

  // Calculate statistics from employee data
  const calculateStats = (data) => {
    const officers = data.filter(emp =>
      (emp.category || '').toLowerCase() === 'officer'
    ).length;

    const jcos = data.filter(emp =>
      (emp.category || '').toLowerCase() === 'jco'
    ).length;

    const airmen = data.filter(emp =>
      (emp.category || '').toLowerCase() === 'airmen'
    ).length;

    const civilians = data.filter(emp =>
      (emp.category || '').toLowerCase() === 'civilian'
    ).length;

    setStats({
      total: data.length,
      officers,
      jcos,
      airmen,
      civilians
    });
  };

  // Fetch employee data from database
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📡 Fetching employee data from API...');

      // First try to fetch from the API
      const response = await axios.get(`${API_BASE_URL}/PAFemployee/total-strength`, {
        timeout: 10000 // 10 second timeout
      });

      console.log('✅ API Response received:', response.data);

      if (response.data && Array.isArray(response.data)) {
        // Transform the data to match your frontend structure
        const transformedData = response.data.map((emp, index) => ({
          row_number: emp.row_number || index + 1,
          pak: emp.PAK || emp.pak || '',
          category: emp.category || emp.CATEGORY || '',
          rank: emp.rank || emp.RANK || '',
          employee_name: emp.employee_name || emp.EMPLOYEE_NAME || '',
          branch_trade: emp.branch_trade || emp.BRANCHTRADE || '',
          phone_office: emp.phone_office || emp.PHONE_OFFICE || '',
          intercom: emp.intercom || emp.INTERCOM || '',
          phone_res: emp.phone_res || emp.PHONE_RES || '',
          defcom_office: emp.defcom_office || emp.DEFCOM_OFFICE || '',
          defcom_res: emp.defcom_res || emp.DEFCOM_RES || '',
          mobile: emp.mobile || emp.MOBILE || '',
          address: emp.address || emp.ADDRESS || '',
          email: emp.email || emp.EMAIL || '',
          postin_date: emp.postin_date || emp.POSTIN_DATE || '',
          section: emp.section || emp.SECTION || '',
          deployment: emp.deployment || emp.DEPLOYMENT || ''
        }));

        console.log(`✅ Transformed ${transformedData.length} employees`);

        setEmployees(transformedData);
        setFilteredEmployees(transformedData);

        // Try to fetch statistics from API
        try {
          console.log('📊 Fetching statistics...');
          const statsResponse = await axios.get(`${API_BASE_URL}/PAFemployee/statistics`);
          if (statsResponse.data) {
            console.log('✅ Statistics received:', statsResponse.data);
            setStats({
              total: statsResponse.data.total || transformedData.length,
              officers: statsResponse.data.officers || 0,
              jcos: statsResponse.data.jcos || 0,
              airmen: statsResponse.data.airmen || 0,
              civilians: statsResponse.data.civilians || 0
            });
          } else {
            // Calculate stats from data
            calculateStats(transformedData);
          }
        } catch (statsError) {
          console.warn('⚠️ Using client-side statistics calculation:', statsError.message);
          calculateStats(transformedData);
        }
      } else {
        throw new Error('Invalid data format received from server');
      }
    } catch (error) {
      console.error('❌ Error fetching employee data:', error);

      let errorMessage = 'Failed to load employee data. ';

      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check if backend server is running.';
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status} - ${error.response.statusText}`;
        if (error.response.data?.error) {
          errorMessage += ` - ${error.response.data.error}`;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please ensure:';
        errorMessage += '\n1. Backend is running on http://10.0.0.7:5000';
        errorMessage += '\n2. Run: cd "X:\\CRYPTO DIV\\backendd" && node server.js';
      } else {
        errorMessage = error.message;
      }

      setError(errorMessage);

      // Set empty arrays
      setEmployees([]);
      setFilteredEmployees([]);
      setStats({ total: 0, officers: 0, jcos: 0, airmen: 0, civilians: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filter employees based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(employee => {
        const searchableFields = [
          employee.employee_name,
          employee.pak,
          employee.rank,
          employee.section,
          employee.category,
          employee.branch_trade
        ].map(field => (field || '').toLowerCase());

        const searchTermLower = searchTerm.toLowerCase();
        return searchableFields.some(field => field.includes(searchTermLower));
      });
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

 const handlePrint = () => {
  if (employees.length === 0) {
    alert('No employee data available to print');
    return;
  }

  // Create a print window
  const printWindow = window.open('', '_blank');
  
  // Get current date and time
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const currentTime = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  // Prepare data for printing (use filtered employees if search is active, otherwise all)
  const printData = searchTerm ? filteredEmployees : employees;
  
  // Generate statistics HTML
  const statsHTML = `
    <div class="print-stats-grid">
      <div class="print-stat-card" style="border-color: #3498db;">
        <div class="print-stat-value">${stats.total}</div>
        <div class="print-stat-label">Total Employees</div>
      </div>
      <div class="print-stat-card" style="border-color: #2ecc71;">
        <div class="print-stat-value">${stats.officers}</div>
        <div class="print-stat-label">Officers</div>
      </div>
      <div class="print-stat-card" style="border-color: #e74c3c;">
        <div class="print-stat-value">${stats.jcos}</div>
        <div class="print-stat-label">JCOs</div>
      </div>
      <div class="print-stat-card" style="border-color: #f39c12;">
        <div class="print-stat-value">${stats.airmen}</div>
        <div class="print-stat-label">Airmen</div>
      </div>
      <div class="print-stat-card" style="border-color: #9b59b6;">
        <div class="print-stat-value">${stats.civilians}</div>
        <div class="print-stat-label">Civilians</div>
      </div>
    </div>
  `;

  // Generate category distribution chart HTML
  const categoryDistributionHTML = generateCategoryDistributionChart();

  // Generate employee table HTML
  let employeeTableHTML = '';
  
  if (printData.length > 0) {
    printData.forEach((employee, index) => {
      const categoryColor = getCategoryColor(employee.category);
      const rowBgColor = index % 2 === 0 ? '#f8f9fa' : 'white';
      
      employeeTableHTML += `
        <tr style="background-color: ${rowBgColor};">
          <td style="text-align: center; font-weight: bold; padding: 8px;">${index + 1}</td>
          <td style="font-weight: bold; padding: 8px;">${employee.pak || 'N/A'}</td>
          <td style="padding: 8px;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; color: white; background-color: ${categoryColor};">
              ${employee.category || 'N/A'}
            </span>
          </td>
          <td style="padding: 8px;">${employee.rank || 'N/A'}</td>
          <td style="padding: 8px; font-weight: 600;">${employee.employee_name || 'N/A'}</td>
          <td style="padding: 8px;">${employee.branch_trade || 'N/A'}</td>
          <td style="padding: 8px; text-align: center;">${employee.phone_office || 'N/A'}</td>
          <td style="padding: 8px; text-align: center;">${employee.intercom || 'N/A'}</td>
          <td style="padding: 8px; text-align: center;">${employee.phone_res || 'N/A'}</td>
          <td style="padding: 8px; text-align: center;">${employee.defcom_office || 'N/A'}</td>
          <td style="padding: 8px; text-align: center;">${employee.defcom_res || 'N/A'}</td>
          <td style="padding: 8px;">${employee.mobile || 'N/A'}</td>
          <td style="padding: 8px; font-size: 10px;">${employee.address && employee.address.length > 40 ? employee.address.substring(0, 40) + '...' : employee.address || 'N/A'}</td>
          <td style="padding: 8px; font-size: 10px;">${employee.email && employee.email !== 'N/A' ? employee.email : 'N/A'}</td>
          <td style="padding: 8px; text-align: center;">${employee.postin_date || 'N/A'}</td>
          <td style="padding: 8px;">${employee.section || 'N/A'}</td>
          <td style="padding: 8px;">${employee.deployment || 'N/A'}</td>
        </tr>
      `;
    });
  } else {
    employeeTableHTML = `
      <tr>
        <td colspan="17" style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 14px; margin-bottom: 10px;">No employee data available</div>
          ${searchTerm ? `<div style="font-size: 12px;">Search filter: "${searchTerm}"</div>` : ''}
        </td>
      </tr>
    `;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Total Strength Report - Pakistan Air Force</title>
      <style>
        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', 'Arial', sans-serif;
          margin: 0;
          padding: 15px;
          color: #333;
          background: #fff;
          font-size: 9px;
          line-height: 1.3;
        }
        
        /* Report Header */
        .print-header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 3px solid #1a3e6f;
          background: linear-gradient(135deg, #1a3e6f 0%, #2c5282 100%);
          color: white;
          padding: 20px;
          border-radius: 4px;
          margin: -15px -15px 20px -15px;
        }
        
        .print-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        
        .print-header h2 {
          margin: 8px 0 0 0;
          font-size: 14px;
          font-weight: 400;
          opacity: 0.9;
        }
        
        .report-identity {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 15px;
          font-size: 10px;
          opacity: 0.8;
        }
        
        /* Meta Information */
        .print-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9px;
          color: #555;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ddd;
          flex-wrap: wrap;
          gap: 10px;
          background: #f8f9fa;
          padding: 12px;
          border-radius: 4px;
        }
        
        .print-meta div {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .search-info {
          background: #fff3cd;
          color: #856404;
          padding: 4px 8px;
          border-radius: 3px;
          border: 1px solid #ffeaa7;
        }
        
        /* Statistics Grid */
        .print-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin: 20px 0;
          page-break-inside: avoid;
        }
        
        .print-stat-card {
          border: 2px solid;
          padding: 12px 8px;
          text-align: center;
          background: #fff;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
        
        .print-stat-value {
          font-size: 22px;
          font-weight: 800;
          margin: 5px 0;
          color: #1a3e6f;
        }
        
        .print-stat-label {
          font-size: 9px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        
        /* Category Distribution Chart */
        .category-distribution {
          margin: 20px 0;
          page-break-inside: avoid;
        }
        
        .chart-container {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #e9ecef;
          margin-top: 10px;
        }
        
        .chart-item {
          margin-bottom: 8px;
        }
        
        .chart-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 9px;
        }
        
        .chart-bar {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .chart-fill {
          height: 100%;
          border-radius: 4px;
        }
        
        /* Main Table */
        .print-table-container {
          margin: 20px 0;
          overflow-x: auto;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 8px;
          table-layout: fixed;
          min-width: 2000px; /* Ensure all columns fit */
        }
        
        .print-table th {
          background: linear-gradient(135deg, #1a3e6f 0%, #2c5282 100%);
          color: white;
          padding: 12px 6px;
          text-align: left;
          font-weight: 700;
          border: 1px solid #1a3e6f;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          position: sticky;
          top: 0;
        }
        
        .print-table td {
          padding: 8px 6px;
          border: 1px solid #e0e0e0;
          vertical-align: middle;
          word-wrap: break-word;
        }
        
        .print-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .print-table tr:hover {
          background: #e8f4fc;
        }
        
        /* Column widths optimized for A4 */
        .print-table th:nth-child(1), .print-table td:nth-child(1) { width: 35px; text-align: center; } /* S/No */
        .print-table th:nth-child(2), .print-table td:nth-child(2) { width: 60px; } /* PAK */
        .print-table th:nth-child(3), .print-table td:nth-child(3) { width: 70px; } /* Category */
        .print-table th:nth-child(4), .print-table td:nth-child(4) { width: 80px; } /* Rank */
        .print-table th:nth-child(5), .print-table td:nth-child(5) { width: 120px; } /* Name */
        .print-table th:nth-child(6), .print-table td:nth-child(6) { width: 100px; } /* Branch/Trade */
        .print-table th:nth-child(7), .print-table td:nth-child(7) { width: 70px; text-align: center; } /* Phone Office */
        .print-table th:nth-child(8), .print-table td:nth-child(8) { width: 60px; text-align: center; } /* Intercom */
        .print-table th:nth-child(9), .print-table td:nth-child(9) { width: 70px; text-align: center; } /* Phone Res */
        .print-table th:nth-child(10), .print-table td:nth-child(10) { width: 80px; text-align: center; } /* Defcom Office */
        .print-table th:nth-child(11), .print-table td:nth-child(11) { width: 80px; text-align: center; } /* Defcom Res */
        .print-table th:nth-child(12), .print-table td:nth-child(12) { width: 90px; } /* Mobile */
        .print-table th:nth-child(13), .print-table td:nth-child(13) { width: 150px; } /* Address */
        .print-table th:nth-child(14), .print-table td:nth-child(14) { width: 120px; } /* Email */
        .print-table th:nth-child(15), .print-table td:nth-child(15) { width: 80px; text-align: center; } /* Post In Date */
        .print-table th:nth-child(16), .print-table td:nth-child(16) { width: 100px; } /* Section */
        .print-table th:nth-child(17), .print-table td:nth-child(17) { width: 100px; } /* Deployment */
        
        /* Email link styling */
        .email-link {
          color: #1a3e6f;
          text-decoration: none;
          word-break: break-all;
        }
        
        /* Page breaks and printing */
        @page {
          size: A4 landscape;
          margin: 15mm 10mm;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
            font-size: 8px;
          }
          
          .print-header {
            margin: 0;
            border-radius: 0;
            padding: 15px;
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
          
          .print-table th {
            position: static; /* Fix for print positioning */
          }
        }
        
        /* Footer */
        .print-footer {
          margin-top: 30px;
          text-align: center;
          font-size: 9px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 15px;
          page-break-inside: avoid;
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
        }
        
        .print-footer p {
          margin: 4px 0;
        }
        
        .confidential {
          color: #e74c3c;
          font-weight: bold;
          font-size: 10px;
          margin-top: 10px;
        }
        
        /* Legend for categories */
        .legend-container {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin: 15px 0;
          flex-wrap: wrap;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 9px;
        }
        
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        
        /* Header logo placeholder */
        .header-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin-bottom: 10px;
        }
        
        .logo-placeholder {
          width: 60px;
          height: 60px;
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="header-logo">
          <div class="logo-placeholder">✈️</div>
          <div>
            <h1>PAKISTAN AIR FORCE</h1>
            <h2>TOTAL STRENGTH REPORT</h2>
          </div>
          <div class="logo-placeholder">🛡️</div>
        </div>
        
        <div class="report-identity">
          <div><strong>Organization:</strong> Pakistan Air Force</div>
          <div><strong>Report ID:</strong> PAF-STR-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}</div>
        </div>
      </div>
      
      <div class="print-meta">
        <div>
          <strong>Report Date:</strong> ${currentDate}
        </div>
        <div>
          <strong>Generated:</strong> ${currentTime}
        </div>
        <div>
          <strong>Data Source:</strong> Manpower Database
        </div>
        <div>
          <strong>Total Records:</strong> ${employees.length}
        </div>
        ${searchTerm ? `
          <div class="search-info">
            <strong>Search Filter:</strong> "${searchTerm}" (${filteredEmployees.length} matches)
          </div>
        ` : ''}
      </div>
      
      <!-- Statistics Section -->
      <div>
        <h3 style="font-size: 12px; color: #1a3e6f; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #1a3e6f;">📊 STRENGTH STATISTICS</h3>
        ${statsHTML}
      </div>
      
      <!-- Category Distribution -->
      <div class="category-distribution">
        <h3 style="font-size: 12px; color: #1a3e6f; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #1a3e6f;">📈 CATEGORY DISTRIBUTION</h3>
        <div class="chart-container">
          ${categoryDistributionHTML}
        </div>
      </div>
      
      <!-- Legend -->
      <div class="legend-container">
        <div class="legend-item">
          <div class="legend-color" style="background-color: #3498db;"></div>
          <span>Officers</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #2ecc71;"></div>
          <span>JCOs</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #e74c3c;"></div>
          <span>Civilians</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #f39c12;"></div>
          <span>Airmen</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #9b59b6;"></div>
          <span>Unknown/Other</span>
        </div>
      </div>
      
      <!-- Main Employee Table -->
      <div class="print-table-container">
        <h3 style="font-size: 12px; color: #1a3e6f; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #1a3e6f;">
          👥 EMPLOYEE DETAILS (${printData.length} ${searchTerm ? 'FILTERED' : 'TOTAL'} RECORDS)
        </h3>
        <table class="print-table">
          <thead>
            <tr>
              <th>S/No.</th>
              <th>PAK</th>
              <th>Category</th>
              <th>Rank</th>
              <th>Employee Name</th>
              <th>Branch/Trade</th>
              <th>Phone Office</th>
              <th>Intercom</th>
              <th>Phone Res.</th>
              <th>Defcom Office</th>
              <th>Defcom Res.</th>
              <th>Mobile</th>
              <th>Address</th>
              <th>Email</th>
              <th>Post In Date</th>
              <th>Section</th>
              <th>Deployment</th>
            </tr>
          </thead>
          <tbody>
            ${employeeTableHTML}
          </tbody>
        </table>
      </div>
      
      <div class="print-footer">
        <p><strong>Pakistan Air Force - Total Strength Report</strong></p>
        <p>Officers: ${stats.officers} | JCOs: ${stats.jcos} | Airmen: ${stats.airmen} | Civilians: ${stats.civilians} | Total: ${stats.total}</p>
        <p>Database Records: ${employees.length} | ${searchTerm ? `Filtered: ${filteredEmployees.length}` : `All records displayed`}</p>
        <p>Civilian Attendance Management System | Generated on: ${currentDate} at ${currentTime}</p>
        <p class="confidential">CONFIDENTIAL - For Official Use Only</p>
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

// Helper function to generate category distribution chart
const generateCategoryDistributionChart = () => {
  const categories = [
    { name: 'Officers', count: stats.officers, color: '#3498db' },
    { name: 'JCOs', count: stats.jcos, color: '#2ecc71' },
    { name: 'Airmen', count: stats.airmen, color: '#f39c12' },
    { name: 'Civilians', count: stats.civilians, color: '#e74c3c' },
    { name: 'Other', count: stats.total - (stats.officers + stats.jcos + stats.airmen + stats.civilians), color: '#9b59b6' }
  ];

  const total = stats.total;
  let chartHTML = '';

  categories.forEach(category => {
    if (category.count > 0) {
      const percentage = total > 0 ? ((category.count / total) * 100).toFixed(1) : 0;
      const barWidth = total > 0 ? (category.count / total) * 100 : 0;
      
      chartHTML += `
        <div class="chart-item">
          <div class="chart-label">
            <span><strong>${category.name}</strong></span>
            <span>${category.count} (${percentage}%)</span>
          </div>
          <div class="chart-bar">
            <div class="chart-fill" style="width: ${barWidth}%; background-color: ${category.color};"></div>
          </div>
        </div>
      `;
    }
  });

  if (chartHTML === '') {
    chartHTML = '<div style="text-align: center; padding: 20px; color: #666;">No category data available</div>';
  }

  return chartHTML;
};

  const handleExport = () => {
    if (filteredEmployees.length === 0) {
      alert('No data to export');
      return;
    }

    // Simple CSV export functionality
    const headers = [
      'S/No.', 'Pak', 'Category', 'Rank', 'Employee Name', 'Branch/Trade',
      'Phone Office', 'Intercom', 'Phone Res.', 'Defcom Office', 'Defcom Res.',
      'Mobile', 'Address', 'Email', 'Post In Date', 'Section', 'Deployment'
    ].join(',');

    const csvData = filteredEmployees.map(employee =>
      [
        employee.row_number,
        employee.pak,
        employee.category,
        employee.rank,
        `"${(employee.employee_name || '').replace(/"/g, '""')}"`,
        employee.branch_trade,
        employee.phone_office,
        employee.intercom,
        employee.phone_res,
        employee.defcom_office,
        employee.defcom_res,
        employee.mobile,
        `"${(employee.address || '').replace(/"/g, '""')}"`,
        employee.email,
        employee.postin_date,
        employee.section,
        employee.deployment
      ].join(',')
    ).join('\n');

    const csvContent = headers + '\n' + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `total_strength_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };



  // Helper function to get category color
  const getCategoryColor = (category) => {
    if (!category) return '#95a5a6';

    const categoryLower = category.toLowerCase();
    const categoryColors = {
      'officer': '#3498db',      // Blue
      'jco': '#2ecc71',          // Green
      'civilian': '#e74c3c',     // Red
      'civil': '#e74c3c',        // Also Red for Civil
      'unknown': '#95a5a6'       // Gray
    };

    for (const [key, color] of Object.entries(categoryColors)) {
      if (categoryLower.includes(key.toLowerCase())) {
        return color;
      }
    }

    return '#95a5a6';
  };


  const handleRetry = () => {
    setError(null);
    fetchEmployees();
  };

  if (loading) {
    return (
      <div className="total-strength">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading employee data from database...</p>
          <p className="loading-subtext">Connecting to backend server...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="total-strength">
        <div className="error-container">
          <div className="error-header">
            <span className="error-icon">⚠️</span>
            <h2>Connection Error</h2>
          </div>

          <div className="error-details">
            <p><strong>Error:</strong> {error}</p>
            <p><strong>API URL:</strong> {API_BASE_URL}/PAFemployee/total-strength</p>
          </div>

          <div className="troubleshooting">
            <h3>Quick Fixes:</h3>
            <ol>
              <li>Ensure backend server is running:
                <pre>
                  cd "X:\CRYPTO DIV\backendd"<br />
                  node server.js
                </pre>
              </li>
              <li>Check if port 5000 is available</li>
              <li>Test backend connection:
                <pre>
                  Open: <a href="http://10.0.0.7:5000/api/test" target="_blank" rel="noopener noreferrer">
                    http://10.0.0.7:5000/api/test
                  </a>
                </pre>
              </li>
              <li>Check if manpower table exists in database</li>
            </ol>
          </div>

          <div className="error-actions">
            <button onClick={handleRetry} className="retry-btn">
              🔄 Retry Connection
            </button>
            <button onClick={() => window.location.reload()} className="refresh-btn">
              ↻ Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="total-strength">

      <div className="strength-header">


        {/* Header */}
        <StandardHeader
          title={<h1 style={{ color: '#ffffffff'}}>Total Strength Of PAF Employees</h1>}

        />


        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, PAK, rank, or section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <button onClick={handlePrint} className="action-btn print-btn">
            Print Report
          </button>
          <button onClick={handleExport} className="action-btn export-btn">
            Export CSV
          </button>
          <button onClick={handleRetry} className="action-btn refresh-btn">
            Refresh Data
          </button>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <h3>Total Employees</h3>
          <p className="stat-number">{stats.total}</p>
          <p className="stat-subtitle">From Database</p>
        </div>
        <div className="stat-card">
          <h3>Officers</h3>
          <p className="stat-number">{stats.officers}</p>
          <p className="stat-subtitle">Commissioned Officers</p>
        </div>
        <div className="stat-card">
          <h3>JCOs</h3>
          <p className="stat-number">{stats.jcos} </p>
          <p className="stat-subtitle">Junior Commissioned Officers</p>
        </div>
        <div className="stat-card">
          <h3>Airmen</h3>
          <p className="stat-number">{stats.airmen} </p>
          <p className="stat-subtitle">Airmen</p>
        </div>
        <div className="stat-card">
          <h3>Civilians</h3>
          <p className="stat-number">{stats.civilians}</p>
          <p className="stat-subtitle">Civilian Staff</p>
        </div>
      </div>

      <div className="datagrid">
        <table>
          <thead>
            <tr>
              <th>S/No.</th>
              <th width="60px">PAK</th>
              <th>Category</th>
              <th>Rank</th>
              <th width="100px">Employee Name</th>
              <th>Branch/Trade</th>
              <th>Phone Office</th>
              <th>Intercom</th>
              <th>Phone Res.</th>
              <th>Defcom Office</th>
              <th>Defcom Res.</th>
              <th width="90px">Mobile</th>
              <th>Address</th>
              <th>Email</th>
              <th width="60px">Post In Date</th>
              <th>Section</th>
              <th>Deployment</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="17" className="no-data">
                  {searchTerm
                    ? `No employees found for "${searchTerm}"`
                    : 'No employee records found in the database'
                  }
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee, index) => (
                <tr key={`${employee.pak}-${index}`} className={index % 2 === 0 ? '' : 'alt'}>
                  <td>{employee.row_number}</td>
                  <td>{employee.pak}</td>
                  <td>
                    <span className={`category-badge category-${employee.category?.toLowerCase() || 'unknown'}`}
                      style={{ backgroundColor: getCategoryColor(employee.category) }}
                    >
                      {employee.category || 'N/A'}
                    </span>
                  </td>
                  <td>{employee.rank || 'N/A'}</td>
                  <td>{employee.employee_name || 'N/A'}</td>
                  <td>{employee.branch_trade || 'N/A'}</td>
                  <td>{employee.phone_office || 'N/A'}</td>
                  <td>{employee.intercom || 'N/A'}</td>
                  <td>{employee.phone_res || 'N/A'}</td>
                  <td>{employee.defcom_office || 'N/A'}</td>
                  <td>{employee.defcom_res || 'N/A'}</td>
                  <td>{employee.mobile || 'N/A'}</td>
                  <td title={employee.address || ''}>
                    {employee.address && employee.address.length > 30
                      ? employee.address.substring(0, 30) + '...'
                      : employee.address || 'N/A'
                    }
                  </td>
                  <td>
                    {employee.email && employee.email !== 'N/A' ? (
                      <a href={`mailto:${employee.email}`} className="email-link">
                        {employee.email}
                      </a>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </td>
                  <td>{employee.postin_date || 'N/A'}</td>
                  <td>{employee.section || 'N/A'}</td>
                  <td>{employee.deployment || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <p>Showing {filteredEmployees.length} of {employees.length} employees (Database Records)</p>
        {searchTerm && (
          <p className="search-info">
            Filtered by: "{searchTerm}"
          </p>
        )}
        {!loading && employees.length === 0 && !error && (
          <p className="data-info">
            📊 Connected to database but no employee records found
          </p>
        )}
      </div>
    </div>
  );
};

export default TotalStrength;