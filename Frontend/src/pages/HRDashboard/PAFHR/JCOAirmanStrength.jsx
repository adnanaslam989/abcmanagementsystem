import React, { useState, useEffect } from 'react';
import './JCOAirmanStrength.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';




const JCOAirmanStrength = () => {
  const [jcoAirmen, setJcoAirmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredJcoAirmen, setFilteredJcoAirmen] = useState([]);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    jcos: 0,
    airmen: 0,
    researchAnalysis: 0,
    designDevelopment: 0
  });

  // Fetch real data from API
  useEffect(() => {
    const fetchJcoAirmen = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch JCOs and Airmen from API
        const response = await fetch('http://10.0.0.7:5000/api/PAFemployee/jco-airmen/all');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          // Add row numbers and format data from database
          const dataWithRowNumbers = data.data.map((person, index) => {
            // Format date properly
            const formatDate = (dateString) => {
              if (!dateString) return 'N/A';
              try {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                }).replace(',', '');
              } catch (e) {
                return dateString;
              }
            };

            return {
              row_number: index + 1,
              // Map database column names to frontend property names
              pak: person.PAK || person.pak,
              category: person.CATEGORY || person.category,
              rank: person.RANK || person.rank,
              employee_name: person.EMPLOYEE_NAME || person.employee_name,
              branch_trade: person.BRANCHTRADE || person.branch_trade,
              phone_office: person.PHONE_OFFICE || person.phone_office || 'N/A',
              intercom: person.INTERCOM || person.intercom || 'N/A',
              phone_res: person.PHONE_RES || person.phone_res || 'N/A',
              defcom_office: person.DEFCOM_OFFICE || person.defcom_office || 'N/A',
              defcom_res: person.DEFCOM_RES || person.defcom_res || 'N/A',
              mobile: person.MOBILE || person.mobile || 'N/A',
              address: person.ADDRESS || person.address || 'Address not available',
              email: person.EMAIL || person.email || 'N/A',
              postin_date: formatDate(person.POSTIN_DATE || person.postin_date),
              section: person.SECTION || person.section || 'Not Assigned',
              deployment: person.DEPLOYMENT || person.deployment || 'Not Assigned'
            };
          });

          setJcoAirmen(dataWithRowNumbers);
          setFilteredJcoAirmen(dataWithRowNumbers);

          // Calculate statistics
          calculateStats(dataWithRowNumbers);
        } else {
          throw new Error(data.message || 'Failed to fetch data from server');
        }
      } catch (error) {
        console.error('Error fetching JCO/Airman data:', error);
        setError(`Failed to load JCO/Airman data: ${error.message}`);

        // Fallback to mock data if API fails
        console.log('🔄 Using mock data as fallback...');
        const mockJcoAirmen = [
          {
            row_number: 1,
            pak: 'JCO001',
            category: 'JCO',
            rank: 'Subedar',
            employee_name: 'Ali Khan',
            branch_trade: 'Technical',
            phone_office: '051-1234501',
            intercom: '201',
            phone_res: '051-7654301',
            defcom_office: 'DEF-101',
            defcom_res: 'DEF-102',
            mobile: '0300-1234501',
            address: 'House No. 111, Street 22, Sector G-9/1, Islamabad',
            email: 'ali.khan@example.com',
            postin_date: '15-Jan-19',
            section: 'Technical Wing',
            deployment: 'Research & Analysis'
          },
          {
            row_number: 2,
            pak: 'JCO002',
            category: 'JCO',
            rank: 'Naib Subedar',
            employee_name: 'Hassan Ahmed',
            branch_trade: 'Operations',
            phone_office: '051-1234502',
            intercom: '202',
            phone_res: '051-7654302',
            defcom_office: 'DEF-103',
            defcom_res: 'DEF-104',
            mobile: '0300-1234502',
            address: 'House No. 222, Street 33, Sector F-8/2, Islamabad',
            email: 'hassan.ahmed@example.com',
            postin_date: '20-Mar-18',
            section: 'Operations',
            deployment: 'Design & Development'
          }
        ];
        setJcoAirmen(mockJcoAirmen);
        setFilteredJcoAirmen(mockJcoAirmen);
        calculateStats(mockJcoAirmen);
      } finally {
        setLoading(false);
      }
    };

    fetchJcoAirmen();
  }, []);

  // Calculate statistics function
  const calculateStats = (data) => {
    const jcos = data.filter(p =>
      p.category && p.category.toLowerCase().includes('jco')
    ).length;

    const airmen = data.filter(p =>
      p.category && (
        p.category.toLowerCase().includes('airman') ||
        p.category.toLowerCase().includes('airmen')
      )
    ).length;

    const researchAnalysis = data.filter(p =>
      p.deployment && p.deployment.toLowerCase().includes('research')
    ).length;

    const designDevelopment = data.filter(p =>
      p.deployment && p.deployment.toLowerCase().includes('design')
    ).length;

    setStats({
      total: data.length,
      jcos,
      airmen,
      researchAnalysis,
      designDevelopment
    });
  };

  // Filter JCOs/Airmen based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredJcoAirmen(jcoAirmen);
    } else {
      const filtered = jcoAirmen.filter(person => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (person.employee_name && person.employee_name.toLowerCase().includes(searchLower)) ||
          (person.pak && person.pak.toLowerCase().includes(searchLower)) ||
          (person.rank && person.rank.toLowerCase().includes(searchLower)) ||
          (person.section && person.section.toLowerCase().includes(searchLower)) ||
          (person.branch_trade && person.branch_trade.toLowerCase().includes(searchLower)) ||
          (person.category && person.category.toLowerCase().includes(searchLower)) ||
          (person.deployment && person.deployment.toLowerCase().includes(searchLower))
        );
      });
      setFilteredJcoAirmen(filtered);
    }
  }, [searchTerm, jcoAirmen]);

const handlePrint = () => {
  if (filteredJcoAirmen.length === 0) {
    alert('No JCO/Airman data available to print');
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
  const printData = filteredJcoAirmen;
  const categoryDistribution = getCategoryDistribution();
  const rankDistribution = getRankDistribution();
  const deploymentDistribution = getDeploymentDistribution();
  
  // Generate statistics HTML
  const statsHTML = `
    <div class="print-stats-grid">
      <div class="print-stat-card" style="border-color: #2c3e50;">
        <div class="print-stat-value">${stats.total}</div>
        <div class="print-stat-label">Total JCOs/Airmen</div>
      </div>
      <div class="print-stat-card" style="border-color: #e74c3c;">
        <div class="print-stat-value">${stats.jcos}</div>
        <div class="print-stat-label">JCOs</div>
        <div class="print-stat-percentage">
          ${stats.total > 0 ? ((stats.jcos / stats.total) * 100).toFixed(1) : '0.0'}%
        </div>
      </div>
      <div class="print-stat-card" style="border-color: #3498db;">
        <div class="print-stat-value">${stats.airmen}</div>
        <div class="print-stat-label">Airmen</div>
        <div class="print-stat-percentage">
          ${stats.total > 0 ? ((stats.airmen / stats.total) * 100).toFixed(1) : '0.0'}%
        </div>
      </div>
      <div class="print-stat-card" style="border-color: #f39c12;">
        <div class="print-stat-value">${stats.researchAnalysis}</div>
        <div class="print-stat-label">Research & Analysis</div>
      </div>
    </div>
  `;

  // Generate category distribution chart
  const categoryDistributionHTML = generateCategoryDistributionChart(categoryDistribution, printData.length);
  
  // Generate rank distribution chart (top 10)
  const rankDistributionHTML = generateRankDistributionChart(rankDistribution, printData.length);
  
  // Generate deployment distribution
  const deploymentDistributionHTML = generateDeploymentDistributionChart(deploymentDistribution);

  // Generate JCO/Airman table HTML
  let personnelTableHTML = '';
  
  if (printData.length > 0) {
    printData.forEach((person, index) => {
      const rowBgColor = index % 2 === 0 ? '#f8f9fa' : 'white';
      const categoryColor = getCategoryColor(person.category);
      const rankColor = getRankColor(person.rank);
      const deploymentColor = getDeploymentColor(person.deployment);
      
      personnelTableHTML += `
        <tr style="background-color: ${rowBgColor};">
          <td style="text-align: center; font-weight: bold; padding: 8px;">${index + 1}</td>
          <td style="font-weight: bold; padding: 8px; font-family: monospace; color: #2c3e50;">
            ${person.pak || 'N/A'}
          </td>
          <td style="padding: 8px;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; color: white; background-color: ${categoryColor};">
              ${person.category || 'Unknown'}
            </span>
          </td>
          <td style="padding: 8px;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; color: white; background-color: ${rankColor};">
              ${person.rank || 'N/A'}
            </span>
          </td>
          <td style="padding: 8px; font-weight: 600;">${person.employee_name || 'N/A'}</td>
          <td style="padding: 8px;">${person.branch_trade || 'N/A'}</td>
          <td style="padding: 8px; text-align: center; font-family: monospace;">${person.phone_office || 'N/A'}</td>
          <td style="padding: 8px; text-align: center;">${person.intercom || 'N/A'}</td>
          <td style="padding: 8px; text-align: center; font-family: monospace;">${person.phone_res || 'N/A'}</td>
          <td style="padding: 8px; text-align: center; font-family: monospace;">${person.defcom_office || 'N/A'}</td>
          <td style="padding: 8px; text-align: center; font-family: monospace;">${person.defcom_res || 'N/A'}</td>
          <td style="padding: 8px; font-family: monospace;">${person.mobile || 'N/A'}</td>
          <td style="padding: 8px; font-size: 9px; line-height: 1.2;">
            ${person.address && person.address.length > 40 ? 
              `<span title="${person.address}">${person.address.substring(0, 40)}...</span>` : 
              person.address || 'N/A'
            }
          </td>
          <td style="padding: 8px; font-size: 9px;">
            ${person.email && person.email !== 'N/A' ? 
              `<a href="mailto:${person.email}" style="color: #1a3e6f; text-decoration: none; word-break: break-all;">${person.email}</a>` : 
              'N/A'
            }
          </td>
          <td style="padding: 8px; text-align: center;">${person.postin_date || 'N/A'}</td>
          <td style="padding: 8px;">${person.section || 'N/A'}</td>
          <td style="padding: 8px;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 9px; background-color: ${deploymentColor}; color: white; font-weight: bold;">
              ${person.deployment || 'Not Assigned'}
            </span>
          </td>
        </tr>
      `;
    });
  } else {
    personnelTableHTML = `
      <tr>
        <td colspan="17" style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 14px; margin-bottom: 10px;">No JCO/Airman data available</div>
          ${searchTerm ? `<div style="font-size: 12px;">Search filter: "${searchTerm}"</div>` : ''}
        </td>
      </tr>
    `;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>JCOs/Airmen Strength Report - Pakistan Air Force</title>
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
          border-bottom: 3px solid #8e44ad;
          background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
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
        
        .warning-banner {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 8px;
          border-radius: 4px;
          margin: 10px 0;
          font-size: 10px;
        }
        
        /* Statistics Grid */
        .print-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin: 20px 0;
          page-break-inside: avoid;
        }
        
        .print-stat-card {
          border: 2px solid;
          padding: 12px 8px;
          text-align: center;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 3px 6px rgba(0,0,0,0.1);
        }
        
        .print-stat-value {
          font-size: 24px;
          font-weight: 800;
          margin: 5px 0;
          color: #2c3e50;
        }
        
        .print-stat-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        
        .print-stat-percentage {
          font-size: 11px;
          font-weight: bold;
          color: #7f8c8d;
          margin-top: 5px;
        }
        
        /* Distribution Charts */
        .distribution-charts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
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
          border-bottom: 2px solid;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .category-title {
          border-bottom-color: #e74c3c;
        }
        
        .rank-title {
          border-bottom-color: #3498db;
        }
        
        .deployment-title {
          border-bottom-color: #f39c12;
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
        
        /* Deployment Grid */
        .deployment-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
          margin-top: 10px;
        }
        
        .deployment-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px;
          background: white;
          border-radius: 3px;
          border: 1px solid #e9ecef;
        }
        
        .deployment-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .deployment-name {
          flex: 1;
          font-size: 9px;
        }
        
        .deployment-count {
          font-weight: bold;
          color: #2c3e50;
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
          background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
          color: white;
          padding: 12px 6px;
          text-align: left;
          font-weight: 700;
          border: 1px solid #8e44ad;
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
        
        /* Column widths optimized for A4 landscape */
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
        .print-table th:nth-child(17), .print-table td:nth-child(17) { width: 120px; }
        
        /* Color Legend */
        .legend-container {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin: 15px 0;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }
        
        .legend-group {
          flex: 1;
        }
        
        .legend-group-title {
          font-size: 10px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #ddd;
        }
        
        .legend-items {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 5px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 8px;
        }
        
        .legend-color {
          width: 10px;
          height: 10px;
          border-radius: 2px;
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
          border-top: 2px solid #8e44ad;
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
          color: #8e44ad;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #8e44ad;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="header-logo">
          <div class="logo-placeholder">🎖️</div>
          <div>
            <h1>PAKISTAN AIR FORCE</h1>
            <h2>JCOs & AIRMEN STRENGTH REPORT</h2>
          </div>
          <div class="logo-placeholder">✈️</div>
        </div>
        
        <div class="report-identity">
          <div><strong>Organization:</strong> Pakistan Air Force - JCOs & Airmen</div>
          <div><strong>Report ID:</strong> PAF-JCO-AIR-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}</div>
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
          <strong>Data Source:</strong> HRMS Database (JCOs/Airmen)
        </div>
        <div>
          <strong>Total Records:</strong> ${jcoAirmen.length}
        </div>
        ${searchTerm ? `
          <div class="search-info">
            <strong>Search Filter:</strong> "${searchTerm}" (${filteredJcoAirmen.length} matches)
          </div>
        ` : ''}
        ${error ? `
          <div class="warning-banner">
            ⚠️ ${error} (Limited data due to connection issues)
          </div>
        ` : ''}
      </div>
      
      <!-- Statistics Section -->
      <div>
        <div class="section-header">📊 JCO/AIRMAN STATISTICS</div>
        ${statsHTML}
      </div>
      
      <!-- Distribution Charts -->
      <div class="distribution-charts">
        <div class="distribution-chart">
          <div class="chart-title category-title">🎯 CATEGORY DISTRIBUTION</div>
          ${categoryDistributionHTML}
        </div>
        
        <div class="distribution-chart">
          <div class="chart-title rank-title">⭐ RANK DISTRIBUTION (Top 10)</div>
          ${rankDistributionHTML}
        </div>
        
        <div class="distribution-chart">
          <div class="chart-title deployment-title">📍 DEPLOYMENT DISTRIBUTION</div>
          ${deploymentDistributionHTML}
        </div>
      </div>
      
      <!-- Color Legend -->
      <div class="legend-container">
        <div class="legend-group">
          <div class="legend-group-title">Category Colors:</div>
          <div class="legend-items">
            ${Object.entries(categoryDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => `
                <div class="legend-item">
                  <div class="legend-color" style="background-color: ${getCategoryColor(category)};"></div>
                  <div style="flex: 1;">${category || 'Unknown'}</div>
                  <div style="font-weight: bold;">${count}</div>
                </div>
              `).join('')}
          </div>
        </div>
        
        <div class="legend-group">
          <div class="legend-group-title">Rank Colors (Top 10):</div>
          <div class="legend-items">
            ${Object.entries(rankDistribution)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([rank, count]) => `
                <div class="legend-item">
                  <div class="legend-color" style="background-color: ${getRankColor(rank)};"></div>
                  <div style="flex: 1;">${rank || 'Unknown'}</div>
                  <div style="font-weight: bold;">${count}</div>
                </div>
              `).join('')}
          </div>
        </div>
      </div>
      
      <!-- Main Personnel Table -->
      <div class="print-table-container">
        <div class="section-header">👥 JCOs & AIRMEN DETAILS (${printData.length} ${searchTerm ? 'FILTERED' : 'TOTAL'} RECORDS)</div>
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
            ${personnelTableHTML}
          </tbody>
        </table>
      </div>
      
      <div class="print-footer">
        <p><strong>Pakistan Air Force - JCOs & Airmen Strength Report</strong></p>
        <p>Total: ${stats.total} | JCOs: ${stats.jcos} (${stats.total > 0 ? ((stats.jcos / stats.total) * 100).toFixed(1) : '0.0'}%) | 
        Airmen: ${stats.airmen} (${stats.total > 0 ? ((stats.airmen / stats.total) * 100).toFixed(1) : '0.0'}%)</p>
        <p>Research & Analysis: ${stats.researchAnalysis} | Design & Development: ${stats.designDevelopment}</p>
        <p>Database Records: ${jcoAirmen.length} | Displayed: ${filteredJcoAirmen.length} | ${searchTerm ? `Search: "${searchTerm}"` : 'All records'}</p>
        <p>HRMS Database | Generated on: ${currentDate} at ${currentTime}</p>
        <p class="confidential">CONFIDENTIAL - For Official Use Only - JCO/Airman Data</p>
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
const generateCategoryDistributionChart = (distribution, total) => {
  const categories = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1]);
  
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
const generateRankDistributionChart = (distribution, total) => {
  const ranks = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10 ranks
  
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

// Helper function to generate deployment distribution chart
const generateDeploymentDistributionChart = (distribution) => {
  const deployments = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1]);
  
  let chartHTML = '<div class="deployment-grid">';

  deployments.forEach(([deployment, count]) => {
    const color = getDeploymentColor(deployment);
    
    chartHTML += `
      <div class="deployment-item">
        <span class="deployment-dot" style="background-color: ${color};"></span>
        <span class="deployment-name">${deployment || 'Not Assigned'}</span>
        <span class="deployment-count">${count}</span>
      </div>
    `;
  });

  chartHTML += '</div>';

  if (deployments.length === 0) {
    chartHTML = '<div style="text-align: center; padding: 20px; color: #666;">No deployment data available</div>';
  }

  return chartHTML;
};

  const handleExport = () => {
    // Simple CSV export functionality
    const headers = [
      'S/No.', 'Pak', 'Category', 'Rank', 'Employee Name', 'Branch/Trade',
      'Phone Office', 'Intercom', 'Phone Res.', 'Defcom Office', 'Defcom Res.',
      'Mobile', 'Address', 'Email', 'Post In Date', 'Section', 'Deployment'
    ].join(',');

    const csvData = filteredJcoAirmen.map(person =>
      [
        person.row_number,
        person.pak || '',
        person.category || '',
        person.rank || '',
        `"${person.employee_name || ''}"`,
        person.branch_trade || '',
        person.phone_office || '',
        person.intercom || '',
        person.phone_res || '',
        person.defcom_office || '',
        person.defcom_res || '',
        person.mobile || '',
        `"${person.address || ''}"`,
        person.email || '',
        person.postin_date || '',
        person.section || '',
        person.deployment || ''
      ].join(',')
    ).join('\n');

    const csvContent = headers + '\n' + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jco_airman_strength_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get category distribution for statistics
  const getCategoryDistribution = () => {
    const categoryCount = {};
    filteredJcoAirmen.forEach(person => {
      const category = person.category || 'Unknown';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    return categoryCount;
  };

  // Get rank distribution
  const getRankDistribution = () => {
    const rankCount = {};
    filteredJcoAirmen.forEach(person => {
      const rank = person.rank || 'Unknown';
      rankCount[rank] = (rankCount[rank] || 0) + 1;
    });
    return rankCount;
  };

  // Get deployment distribution
  const getDeploymentDistribution = () => {
    const deploymentCount = {};
    filteredJcoAirmen.forEach(person => {
      const deployment = person.deployment || 'Not Assigned';
      deploymentCount[deployment] = (deploymentCount[deployment] || 0) + 1;
    });
    return deploymentCount;
  };

  const categoryDistribution = getCategoryDistribution();
  const rankDistribution = getRankDistribution();
  const deploymentDistribution = getDeploymentDistribution();

  if (loading) {
    return (
      <div className="jco-airman-strength">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading JCO/Airman data from database...</p>
          <p className="loading-subtext">Fetching real-time data from HRMS system</p>
        </div>
      </div>
    );
  }

  if (error && jcoAirmen.length === 0) {
    return (
      <div className="jco-airman-strength">
        <div className="error-message">
          <h3>⚠️ Connection Error</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button
              onClick={() => window.location.reload()}
              className="action-btn retry-btn"
            >
              Retry Connection
            </button>
            <button
              onClick={() => {
                // Use mock data
                const mockData = [...jcoAirmen];
                setFilteredJcoAirmen(mockData);
                calculateStats(mockData);
                setError(null);
              }}
              className="action-btn continue-btn"
            >
              Continue with Available Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="jco-airman-strength">
      <div className="strength-header">

        {/* Header */}
        <StandardHeader
          title={<h1 style={{ color: '#ffffffff'}}  >Total Strength Of JCOs/Airmen</h1>
          }
        />

        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, PAK, rank, category, section, branch, or deployment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="clear-search"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button onClick={handlePrint} className="action-btn print-btn">
            Print Report
          </button>
          <button onClick={handleExport} className="action-btn export-btn">
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="warning-banner">
          ⚠️ {error} (Showing available data)
        </div>
      )}

      <div className="summary-stats">
        <div className="stat-card">
          <h3>Total JCOs/Airmen</h3>
          <p className="stat-number">{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>JCOs</h3>
          <p className="stat-number">{stats.jcos}</p>
        </div>
        <div className="stat-card">
          <h3>Airmen</h3>
          <p className="stat-number">{stats.airmen}</p>
        </div>

      </div>

      {filteredJcoAirmen.length > 0 && (
        <>
          <div className="distribution-section">
            <div className="category-distribution">
              <h3>Category Distribution</h3>
              <div className="distribution-bars">
                {Object.entries(categoryDistribution).map(([category, count]) => (
                  <div key={category} className="distribution-item">
                    <div className="dist-label">{category}</div>
                    <div className="dist-count">{count}</div>
                    <div
                      className="dist-progress"
                      style={{
                        width: `${(count / filteredJcoAirmen.length) * 100}%`,
                        backgroundColor: getCategoryColor(category)
                      }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rank-distribution">
              <h3>Rank Distribution</h3>
              <div className="distribution-bars">
                {Object.entries(rankDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([rank, count]) => (
                    <div key={rank} className="distribution-item">
                      <div className="dist-label">{rank}</div>
                      <div className="dist-count">{count}</div>
                      <div
                        className="dist-progress"
                        style={{
                          width: `${(count / filteredJcoAirmen.length) * 100}%`,
                          backgroundColor: getRankColor(rank)
                        }}
                      ></div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="deployment-distribution">
            <h3>Deployment Distribution</h3>
            <div className="deployment-grid">
              {Object.entries(deploymentDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([deployment, count]) => (
                  <div key={deployment} className="deployment-item">
                    <span
                      className="deployment-dot"
                      style={{ backgroundColor: getDeploymentColor(deployment) }}
                    ></span>
                    <span className="deployment-name">{deployment}</span>
                    <span className="deployment-count">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      <div className="datagrid">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>S/No.</th>
                <th>Pak</th>
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
              {filteredJcoAirmen.length === 0 ? (
                <tr>
                  <td colSpan="17" className="no-data">
                    {searchTerm
                      ? 'No JCOs/Airmen found matching your search criteria.'
                      : 'No JCO/Airman data available in the database.'
                    }
                  </td>
                </tr>
              ) : (
                filteredJcoAirmen.map((person, index) => (
                  <tr key={person.pak} className={index % 2 === 0 ? '' : 'alt'}>
                    <td>{person.row_number}</td>
                    <td>
                      <span className={`pak-number ${person.category?.toLowerCase()}-pak`}>
                        {person.pak || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(person.category) }}
                      >
                        {person.category || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="rank-badge"
                        style={{ backgroundColor: getRankColor(person.rank), fontSize:'8px' }}
                      >
                        {person.rank || 'N/A'}
                      </span>
                    </td>
                    <td>{person.employee_name || 'N/A'}</td>
                    <td>{person.branch_trade || 'N/A'}</td>
                    <td>{person.phone_office || 'N/A'}</td>
                    <td>{person.intercom || 'N/A'}</td>
                    <td>{person.phone_res || 'N/A'}</td>
                    <td>{person.defcom_office || 'N/A'}</td>
                    <td>{person.defcom_res || 'N/A'}</td>
                    <td>{person.mobile || 'N/A'}</td>
                    <td title={person.address || ''}>
                      {person.address && person.address.length > 30
                        ? person.address.substring(0, 30) + '...'
                        : person.address || 'N/A'
                      }
                    </td>
                    <td>{person.email || 'N/A'}</td>
                    <td>{person.postin_date || 'N/A'}</td>
                    <td>{person.section || 'N/A'}</td>
                    <td>
                      <span
                        className="deployment-badge"
                        style={{ backgroundColor: getDeploymentColor(person.deployment) }}
                      >
                        {person.deployment || 'Not Assigned'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-footer">
        <p>
          Showing {filteredJcoAirmen.length} of {jcoAirmen.length} JCOs/Airmen
          {searchTerm && ` (Filtered by: "${searchTerm}")`}
        </p>
        <p className="data-info">
          Data fetched from HRMS database • Last updated: {new Date().toLocaleDateString()}
          {error && ' • Limited data due to connection issues'}
        </p>
      </div>
    </div>
  );
};

// Helper function to assign colors to categories
const getCategoryColor = (category) => {
  if (!category) return '#95a5a6';

  const categoryColors = {
    'jco': '#e74c3c',
    'jcos': '#e74c3c',
    'airman': '#3498db',
    'airmen': '#3498db',
    'aircraftman': '#2ecc71',
    'leading aircraftman': '#27ae60',
    'corporal': '#2980b9',
    'sergeant': '#8e44ad',
    'subedar': '#d35400',
    'naib subedar': '#f39c12',
    'subedar major': '#c0392b'
  };

  const lowerCategory = category.toLowerCase();
  return categoryColors[lowerCategory] || '#95a5a6';
};

// Helper function to assign colors to ranks
const getRankColor = (rank) => {
  if (!rank) return '#95a5a6';

  const rankColors = {
    'subedar major': '#c0392b',
    'subedar': '#d35400',
    'naib subedar': '#f39c12',
    'sergeant': '#8e44ad',
    'corporal': '#2980b9',
    'leading aircraftman': '#2ecc71',
    'aircraftman': '#27ae60',
    'hawaldar': '#3498db',
    'naik': '#16a085',
    'lance naik': '#1abc9c',
    'sepoy': '#95a5a6'
  };

  const lowerRank = rank.toLowerCase();
  return rankColors[lowerRank] || '#95a5a6';
};

// Helper function to assign colors to deployments
const getDeploymentColor = (deployment) => {
  if (!deployment) return '#95a5a6';

  const deploymentColors = {
    'research & analysis': '#3498db',
    'design & development': '#2ecc71',
    'support services': '#f39c12',
    'operations': '#e74c3c',
    'administration': '#9b59b6',
    'technical': '#1abc9c',
    'maintenance': '#34495e',
    'training': '#f1c40f',
    'logistics': '#d35400',
    'security': '#c0392b'
  };

  const lowerDeployment = deployment.toLowerCase();
  return deploymentColors[lowerDeployment] || '#95a5a6';
};

export default JCOAirmanStrength;