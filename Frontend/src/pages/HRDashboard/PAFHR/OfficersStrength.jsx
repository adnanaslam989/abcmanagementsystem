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
  });
  const [error, setError] = useState(null);
  const [categoryDistribution, setCategoryDistribution] = useState({});
  const [rankDistribution, setRankDistribution] = useState({});

  // API base URL - adjust if your backend is on different port
  const API_BASE_URL = 'http://10.0.0.7:5000/api';

  // Calculate statistics and distributions
  const calculateStatsAndDistributions = (data) => {
    // Category stats
    const officers = data.filter(emp => 
      (emp.category || '').toLowerCase() === 'officer'
    ).length;
    
 
    
    setStats({
      total: data.length,
    });

    // Category distribution for graph
    const catDist = {};
    data.forEach(emp => {
      const category = emp.category || 'Unknown';
      catDist[category] = (catDist[category] || 0) + 1;
    });
    setCategoryDistribution(catDist);

    // Rank distribution for graph
    const rankDist = {};
    data.forEach(emp => {
      const rank = emp.rank || 'Unknown';
      rankDist[rank] = (rankDist[rank] || 0) + 1;
    });
    setRankDistribution(rankDist);
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
            
            });
          } else {
            // Calculate stats from data
            calculateStatsAndDistributions(transformedData);
          }
        } catch (statsError) {
          console.warn('⚠️ Using client-side statistics calculation:', statsError.message);
          calculateStatsAndDistributions(transformedData);
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
      setStats({ total: 0, officers: 0 });
      setCategoryDistribution({});
      setRankDistribution({});
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
  if (officerEmployees.length === 0) {
    alert('No officer data available to print');
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
  
  // Prepare data for printing
  const printData = searchTerm ? officerEmployees : 
    officerEmployees.filter(emp => (emp.category || '').toLowerCase() === 'officer');
  
  // Generate statistics HTML
  const statsHTML = `
    <div class="print-stats-grid">
      <div class="print-stat-card" style="border-color: #2c3e50;">
        <div class="print-stat-value">${stats.total}</div>
        <div class="print-stat-label">Total Employees</div>
      </div>
      <div class="print-stat-card" style="border-color: #3498db;">
        <div class="print-stat-value">${stats.officers}</div>
        <div class="print-stat-label">Commissioned Officers</div>
        <div class="print-stat-percentage">
          ${stats.total > 0 ? ((stats.officers / stats.total) * 100).toFixed(1) : '0.0'}%
        </div>
      </div>
    </div>
  `;

  // Generate category distribution HTML
  const categoryDistributionHTML = generateCategoryDistributionChart();
  
  // Generate rank distribution HTML
  const rankDistributionHTML = generateRankDistributionChart();

  // Generate officer table HTML
  let officerTableHTML = '';
  
  if (printData.length > 0) {
    printData.forEach((employee, index) => {
      const rowBgColor = index % 2 === 0 ? '#f8f9fa' : 'white';
      const categoryColor = getCategoryColor(employee.category);
      const rankColor = getRankColor(employee.rank);
      
      officerTableHTML += `
        <tr style="background-color: ${rowBgColor};">
          <td style="text-align: center; font-weight: bold; padding: 8px;">${index + 1}</td>
          <td style="font-weight: bold; padding: 8px; font-family: monospace;">${employee.pak || 'N/A'}</td>
          <td style="padding: 8px;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; color: white; background-color: ${categoryColor};">
              ${employee.category || 'N/A'}
            </span>
          </td>
          <td style="padding: 8px;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; color: white; background-color: ${rankColor};">
              ${employee.rank || 'N/A'}
            </span>
          </td>
          <td style="padding: 8px; font-weight: 600;">${employee.employee_name || 'N/A'}</td>
          <td style="padding: 8px;">${employee.branch_trade || 'N/A'}</td>
          <td style="padding: 8px; text-align: center; font-family: monospace;">${employee.phone_office || 'N/A'}</td>
          <td style="padding: 8px; text-align: center;">${employee.intercom || 'N/A'}</td>
          <td style="padding: 8px; text-align: center; font-family: monospace;">${employee.phone_res || 'N/A'}</td>
          <td style="padding: 8px; text-align: center; font-family: monospace;">${employee.defcom_office || 'N/A'}</td>
          <td style="padding: 8px; text-align: center; font-family: monospace;">${employee.defcom_res || 'N/A'}</td>
          <td style="padding: 8px; font-family: monospace;">${employee.mobile || 'N/A'}</td>
          <td style="padding: 8px; font-size: 9px; line-height: 1.2;">
            ${employee.address && employee.address.length > 40 ? 
              `<span title="${employee.address}">${employee.address.substring(0, 40)}...</span>` : 
              employee.address || 'N/A'
            }
          </td>
          <td style="padding: 8px; font-size: 9px;">
            ${employee.email && employee.email !== 'N/A' ? 
              `<a href="mailto:${employee.email}" style="color: #1a3e6f; text-decoration: none; word-break: break-all;">${employee.email}</a>` : 
              'N/A'
            }
          </td>
          <td style="padding: 8px; text-align: center;">${employee.postin_date || 'N/A'}</td>
          <td style="padding: 8px;">${employee.section || 'N/A'}</td>
          <td style="padding: 8px;">${employee.deployment || 'N/A'}</td>
        </tr>
      `;
    });
  } else {
    officerTableHTML = `
      <tr>
        <td colspan="17" style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 14px; margin-bottom: 10px;">No officer data available</div>
          ${searchTerm ? `<div style="font-size: 12px;">Search filter: "${searchTerm}"</div>` : ''}
        </td>
      </tr>
    `;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Officers Strength Report - Pakistan Air Force</title>
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
          font-size: 16px;
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
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin: 20px 0;
          page-break-inside: avoid;
        }
        
        .print-stat-card {
          border: 2px solid;
          padding: 15px 10px;
          text-align: center;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 3px 6px rgba(0,0,0,0.1);
        }
        
        .print-stat-value {
          font-size: 28px;
          font-weight: 800;
          margin: 5px 0;
          color: #1a3e6f;
        }
        
        .print-stat-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        
        .print-stat-percentage {
          font-size: 12px;
          font-weight: bold;
          color: #3498db;
          margin-top: 5px;
        }
        
        /* Distribution Charts */
        .distribution-charts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 25px 0;
          page-break-inside: avoid;
        }
        
        .distribution-chart {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }
        
        .chart-title {
          font-size: 11px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid #3498db;
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
          margin: 25px 0;
          overflow-x: auto;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 8px;
          table-layout: fixed;
          min-width: 2000px;
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
        .print-table th:nth-child(1), .print-table td:nth-child(1) { width: 35px; text-align: center; }
        .print-table th:nth-child(2), .print-table td:nth-child(2) { width: 60px; }
        .print-table th:nth-child(3), .print-table td:nth-child(3) { width: 70px; }
        .print-table th:nth-child(4), .print-table td:nth-child(4) { width: 90px; }
        .print-table th:nth-child(5), .print-table td:nth-child(5) { width: 120px; }
        .print-table th:nth-child(6), .print-table td:nth-child(6) { width: 100px; }
        .print-table th:nth-child(7), .print-table td:nth-child(7) { width: 70px; text-align: center; }
        .print-table th:nth-child(8), .print-table td:nth-child(8) { width: 60px; text-align: center; }
        .print-table th:nth-child(9), .print-table td:nth-child(9) { width: 70px; text-align: center; }
        .print-table th:nth-child(10), .print-table td:nth-child(10) { width: 80px; text-align: center; }
        .print-table th:nth-child(11), .print-table td:nth-child(11) { width: 80px; text-align: center; }
        .print-table th:nth-child(12), .print-table td:nth-child(12) { width: 90px; }
        .print-table th:nth-child(13), .print-table td:nth-child(13) { width: 150px; }
        .print-table th:nth-child(14), .print-table td:nth-child(14) { width: 120px; }
        .print-table th:nth-child(15), .print-table td:nth-child(15) { width: 80px; text-align: center; }
        .print-table th:nth-child(16), .print-table td:nth-child(16) { width: 100px; }
        .print-table th:nth-child(17), .print-table td:nth-child(17) { width: 100px; }
        
        /* Category and Rank Colors Legend */
        .legend-container {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 15px 0;
          flex-wrap: wrap;
          background: #f8f9fa;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }
        
        .legend-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .legend-group-title {
          font-size: 10px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 5px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9px;
        }
        
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }
        
        .legend-text {
          display: flex;
          justify-content: space-between;
          min-width: 100px;
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
            position: static;
          }
        }
        
        /* Footer */
        .print-footer {
          margin-top: 30px;
          text-align: center;
          font-size: 9px;
          color: #666;
          border-top: 2px solid #1a3e6f;
          padding-top: 15px;
          page-break-inside: avoid;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
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
          padding: 5px;
          border: 1px solid #e74c3c;
          border-radius: 3px;
          background: #fff5f5;
          display: inline-block;
        }
        
        /* Header logo placeholder */
        .header-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 15px;
        }
        
        .logo-placeholder {
          width: 70px;
          height: 70px;
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        
        /* Section headers */
        .section-header {
          font-size: 12px;
          color: #1a3e6f;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #1a3e6f;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="header-logo">
          <div class="logo-placeholder">✈️</div>
          <div>
            <h1>PAKISTAN AIR FORCE</h1>
            <h2>OFFICERS STRENGTH REPORT</h2>
          </div>
          <div class="logo-placeholder">⭐</div>
        </div>
        
        <div class="report-identity">
          <div><strong>Organization:</strong> Pakistan Air Force - Commissioned Officers</div>
          <div><strong>Report ID:</strong> PAF-OFF-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}</div>
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
          <strong>Data Source:</strong> Manpower Database (Officers Only)
        </div>
        <div>
          <strong>Officer Records:</strong> ${stats.officers}
        </div>
        ${searchTerm ? `
          <div class="search-info">
            <strong>Search Filter:</strong> "${searchTerm}" (${printData.length} matches)
          </div>
        ` : ''}
      </div>
      
      <!-- Statistics Section -->
      <div>
        <div class="section-header">📊 OFFICER STATISTICS</div>
        ${statsHTML}
      </div>
      
      <!-- Distribution Charts -->
      <div class="distribution-charts">
        <div class="distribution-chart">
          <div class="chart-title">📈 CATEGORY DISTRIBUTION</div>
          ${categoryDistributionHTML}
        </div>
        
        <div class="distribution-chart">
          <div class="chart-title">🎖️ RANK DISTRIBUTION (Top 10)</div>
          ${rankDistributionHTML}
        </div>
      </div>
      
      <!-- Color Legend -->
      <div class="legend-container">
        <div class="legend-group">
          <div class="legend-group-title">Category Colors:</div>
          ${Object.entries(categoryDistribution).map(([category, count]) => `
            <div class="legend-item">
              <div class="legend-color" style="background-color: ${getCategoryColor(category)};"></div>
              <div class="legend-text">
                <span>${category || 'Unknown'}</span>
                <span style="font-weight: bold;">${count}</span>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="legend-group">
          <div class="legend-group-title">Rank Colors (Top 10):</div>
          ${Object.entries(rankDistribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([rank, count]) => `
              <div class="legend-item">
                <div class="legend-color" style="background-color: ${getRankColor(rank)};"></div>
                <div class="legend-text">
                  <span>${rank || 'Unknown'}</span>
                  <span style="font-weight: bold;">${count}</span>
                </div>
              </div>
            `).join('')}
        </div>
      </div>
      
      <!-- Main Officer Table -->
      <div class="print-table-container">
        <div class="section-header">👥 OFFICER DETAILS (${printData.length} ${searchTerm ? 'FILTERED' : 'TOTAL'} RECORDS)</div>
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
            ${officerTableHTML}
          </tbody>
        </table>
      </div>
      
      <div class="print-footer">
        <p><strong>Pakistan Air Force - Officers Strength Report</strong></p>
        <p>Total Employees: ${stats.total} | Commissioned Officers: ${stats.officers} | Officer Ratio: ${stats.total > 0 ? ((stats.officers / stats.total) * 100).toFixed(1) : '0.0'}%</p>
        <p>Database Records: ${employees.length} | Officer Records: ${officerEmployees.length} | ${searchTerm ? `Filtered: ${printData.length}` : `All officer records displayed`}</p>
        <p>Civilian Attendance Management System | Generated on: ${currentDate} at ${currentTime}</p>
        <p class="confidential">CONFIDENTIAL - For Official Use Only - Officers Data</p>
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
  const categories = Object.entries(categoryDistribution)
    .sort((a, b) => b[1] - a[1]);
  
  const total = stats.total;
  let chartHTML = '';

  categories.forEach(([category, count]) => {
    if (count > 0) {
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      const barWidth = total > 0 ? (count / total) * 100 : 0;
      const color = getCategoryColor(category);
      
      chartHTML += `
        <div class="chart-item">
          <div class="chart-label">
            <span><strong>${category || 'Unknown'}</strong></span>
            <span>${count} (${percentage}%)</span>
          </div>
          <div class="chart-bar">
            <div class="chart-fill" style="width: ${barWidth}%; background-color: ${color};"></div>
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

// Helper function to generate rank distribution chart
const generateRankDistributionChart = () => {
  const ranks = Object.entries(rankDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10 ranks
  
  const total = stats.total;
  let chartHTML = '';

  ranks.forEach(([rank, count]) => {
    if (count > 0) {
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      const barWidth = total > 0 ? (count / total) * 100 : 0;
      const color = getRankColor(rank);
      
      chartHTML += `
        <div class="chart-item">
          <div class="chart-label">
            <span><strong>${rank || 'Unknown'}</strong></span>
            <span>${count} (${percentage}%)</span>
          </div>
          <div class="chart-bar">
            <div class="chart-fill" style="width: ${barWidth}%; background-color: ${color};"></div>
          </div>
        </div>
      `;
    }
  });

  if (chartHTML === '') {
    chartHTML = '<div style="text-align: center; padding: 20px; color: #666;">No rank data available</div>';
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

  const handleRetry = () => {
    setError(null);
    fetchEmployees();
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

  // Helper function to get rank color (same as officers form)
  const getRankColor = (rank) => {
    if (!rank) return '#95a5a6';
    
    const rankLower = rank.toLowerCase();
    const rankColors = {
      'colonel': '#e74c3c',
      'major': '#3498db',
      'captain': '#2ecc71',
      'lieutenant': '#f39c12',
      'subedar': '#9b59b6',
      'naib subedar': '#1abc9c',
      'brigadier': '#d35400',
      'lieutenant colonel': '#8e44ad',
      'wing commander': '#16a085',
      'squadron leader': '#27ae60',
      'assistant': '#e67e22',
      'clerk': '#34495e',
      'technician': '#1abc9c',
      'manager': '#9b59b6',
      'supervisor': '#f1c40f'
    };
    
    // Check for partial matches
    for (const [key, color] of Object.entries(rankColors)) {
      if (rankLower.includes(key.toLowerCase())) {
        return color;
      }
    }
    
    return '#95a5a6';
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

  // Officer-only data for datagrid (DO NOT affect other features)
const officerEmployees = filteredEmployees.filter(emp =>
  (emp.category || '').toLowerCase() === 'officer'
);

  return (
    <div className="total-strength">
      <div className="strength-header">

        {/* Header */}
                   <StandardHeader 
                title={ <h1 style={{ color: '#ffffffff'}}>Total Officers Strength Of PAF Employees</h1>}
              />
        
        <div className="header-actions">
          <div className="search-box" >
            <input
            style={{color:'Black'}}
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
          <div className="action-buttons">
            <button onClick={handlePrint} className="action-btn print-btn">
              🖨️ Print Report
            </button>
            <button onClick={handleExport} className="action-btn export-btn" style={{background:'#6a5a97ff'}}>
              📥 Export CSV
            </button>
            <button onClick={handleRetry} className="action-btn refresh-btn">
              🔄 Refresh Data
            </button>
          </div>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-card stat-total">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Employees</h3>
            <p className="stat-number">{stats.total}</p>
            <p className="stat-subtitle">From Database</p>
          </div>
        </div>
        <div className="stat-card stat-officers">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>Officers</h3>
            <p className="stat-number">{stats.officers}</p>
            <p className="stat-subtitle">Commissioned Officers</p>
          </div>
        </div>
       
      </div>

      {/* Category Distribution Graph */}
      {Object.keys(categoryDistribution).length > 0 && (
        <div className="category-breakdown">
          <h3>Category Distribution</h3>
          <div className="category-bars">
            {Object.entries(categoryDistribution).map(([category, count]) => (
              <div key={category} className="category-bar">
                <div className="category-label">{category || 'Unknown'}</div>
                <div className="category-count">{count}</div>
                <div 
                  className="category-progress" 
                  style={{ 
                    width: `${(count / stats.total) * 100}%`,
                    backgroundColor: getCategoryColor(category)
                  }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rank Distribution Graph */}
      {Object.keys(rankDistribution).length > 0 && (
        <div className="rank-breakdown">
          <h3>Top Rank Distribution</h3>
          <div className="rank-bars">
            {Object.entries(rankDistribution)
              .sort((a, b) => b[1] - a[1]) // Sort by count descending
              .slice(0, 10) // Show top 10 ranks
              .map(([rank, count]) => (
                <div key={rank} className="rank-bar">
                  <div className="rank-label">{rank || 'Unknown'}</div>
                  <div className="rank-count">{count}</div>
                  <div 
                    className="rank-progress" 
                    style={{ 
                      width: `${(count / stats.total) * 100}%`,
                      backgroundColor: getRankColor(rank)
                    }}
                  ></div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="data-container">
        <div className="table-header">
          <h3>Employee Details</h3>
          <div className="table-info">
            <span className="record-count">
📋 {officerEmployees.length} records
              {searchTerm && ` (filtered)`}
            </span>
          </div>
        </div>
        
        <div className="datagrid">
          <table>
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
{officerEmployees.length === 0 ? (
                <tr>
                  <td colSpan="17" className="no-data">
                    {searchTerm 
                      ? `No employees found for "${searchTerm}"`
                      : 'No employee records found in the database'
                    }
                  </td>
                </tr>
              ) : (
officerEmployees.map((employee, index) => (
                  <tr key={`${employee.pak}-${index}`} className={index % 2 === 0 ? '' : 'alt'}>
                    <td>{employee.row_number}</td>
                    <td className="pak-cell">{employee.pak || 'N/A'}</td>
                    <td>
                      <span 
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(employee.category) }}
                      >
                        {employee.category || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="rank-badge"
                        style={{ backgroundColor: getRankColor(employee.rank),fontSize:'8px' }}
                      >
                        {employee.rank || 'N/A'}
                      </span>
                    </td>
                    <td className="employee-name">{employee.employee_name || 'N/A'}</td>
                    <td>{employee.branch_trade || 'N/A'}</td>
                    <td>{employee.phone_office || 'N/A'}</td>
                    <td>{employee.intercom || 'N/A'}</td>
                    <td>{employee.phone_res || 'N/A'}</td>
                    <td>{employee.defcom_office || 'N/A'}</td>
                    <td>{employee.defcom_res || 'N/A'}</td>
                    <td>{employee.mobile || 'N/A'}</td>
                    <td className="address-cell" title={employee.address || ''}>
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
      </div>

      <div className="table-footer">
        <div className="footer-left">
          <p>
Showing <strong>{officerEmployees.length}</strong> of <strong>{employees.length}</strong> employees
          </p>
          {searchTerm && (
            <p className="search-info">
              Filtered by: "<strong>{searchTerm}</strong>"
            </p>
          )}
          {!loading && employees.length === 0 && !error && (
            <p className="data-info">
              📊 Connected to database but no employee records found
            </p>
          )}
        </div>
        <div className="footer-right">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="scroll-top-btn"
          >
            ↑ Back to Top
          </button>
        </div>
      </div>
    </div>
  );
};

export default TotalStrength;