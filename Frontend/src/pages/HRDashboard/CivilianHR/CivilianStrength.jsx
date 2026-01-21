import React, { useState, useEffect } from 'react';
import './CivilianStrength.css';
import axios from 'axios';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const CivilianStrength = () => {
  const [civilians, setCivilians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCivilians, setFilteredCivilians] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    research: 0,
    design: 0,
    support: 0,
    other: 0
  });
  const [error, setError] = useState(null);
  const [appointmentDistribution, setAppointmentDistribution] = useState({});
  const [deploymentDistribution, setDeploymentDistribution] = useState({});

  // API base URL
  const API_BASE_URL = 'http://10.0.0.7:5000/api';

  // Calculate statistics and distributions
  const calculateStatsAndDistributions = (data) => {
    // Deployment stats
    const research = data.filter(civilian => 
      (civilian.deployment || '').toLowerCase().includes('research')
    ).length;
    
    const design = data.filter(civilian => 
      (civilian.deployment || '').toLowerCase().includes('design')
    ).length;
    
    const support = data.filter(civilian => 
      (civilian.deployment || '').toLowerCase().includes('support')
    ).length;
    
    const other = data.length - (research + design + support);
    
    setStats({
      total: data.length,
      research,
      design,
      support,
      other
    });

    // Appointment distribution
    const appDist = {};
    data.forEach(civilian => {
      const appointment = civilian.appointment || 'Unknown';
      appDist[appointment] = (appDist[appointment] || 0) + 1;
    });
    setAppointmentDistribution(appDist);

    // Deployment distribution
    const depDist = {};
    data.forEach(civilian => {
      const deployment = civilian.deployment || 'Not Assigned';
      depDist[deployment] = (depDist[deployment] || 0) + 1;
    });
    setDeploymentDistribution(depDist);
  };

  // Fetch civilian data from database
  const fetchCivilians = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Fetching civilian data from API...');
      
      // Fetch civilian data
      const response = await axios.get(`${API_BASE_URL}/employee/total-strength`, {
        timeout: 10000
      });
      
      console.log('✅ API Response received');
      
      if (response.data && Array.isArray(response.data)) {
        // Transform the data
        const transformedData = response.data.map((civilian, index) => ({
          row_number: civilian.row_number || index + 1,
          pak: civilian.PAK || civilian.pak || '',
          appointment: civilian.appointment || civilian.APPOINTMENT || '',
          employee_name: civilian.employee_name || civilian.EMPLOYEE_NAME || '',
          father_name: civilian.father_name || civilian.FATHER_NAME || '',
          phone: civilian.phone || civilian.PHONE || '',
          mobile: civilian.mobile || civilian.MOBILE || '',
          address: civilian.address || civilian.TEMP_ADDRESS || civilian.PERMANENT_ADDRESS || '',
          email: civilian.email || civilian.EMAIL || '',
          postin_date: civilian.postin_date || civilian.POSTIN_DATE || '',
          dob: civilian.dob || civilian.DOB || '',
          qualification: civilian.qualification || civilian.QUALIFICATION || '',
          experience: civilian.experience || civilian.EXPERIENCE || '',
          salary_pm: civilian.salary_pm || civilian.SALARY_PM || '',
          deployment: civilian.deployment || civilian.DEPLOYMENT || '',
          section: civilian.section || civilian.SECTION || '',
          cnic: civilian.cnic || civilian.CNIC || '',
          blood_group: civilian.blood_group || civilian.BLOOD_GROUP || ''
        }));

        console.log(`✅ Transformed ${transformedData.length} civilians`);
        
        setCivilians(transformedData);
        setFilteredCivilians(transformedData);
        
        // Try to fetch statistics from API
        try {
          console.log('📊 Fetching statistics...');
          const statsResponse = await axios.get(`${API_BASE_URL}/employee/statistics`);
          if (statsResponse.data) {
            console.log('✅ Statistics received:', statsResponse.data);
            setStats({
              total: statsResponse.data.total || transformedData.length,
              research: statsResponse.data.research || 0,
              design: statsResponse.data.design || 0,
              support: statsResponse.data.support || 0,
              other: statsResponse.data.other_deployment || 0
            });
          } else {
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
      console.error('❌ Error fetching civilian data:', error);
      
      let errorMessage = 'Failed to load civilian data. ';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check if backend server is running.';
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status} - ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please ensure backend is running on http://10.0.0.7:5000';
      } else {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      // Set empty arrays
      setCivilians([]);
      setFilteredCivilians([]);
      setStats({ total: 0, research: 0, design: 0, support: 0, other: 0 });
      setAppointmentDistribution({});
      setDeploymentDistribution({});
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchCivilians();
  }, []);

  // Filter civilians based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCivilians(civilians);
    } else {
      const filtered = civilians.filter(civilian => {
        const searchableFields = [
          civilian.employee_name,
          civilian.pak,
          civilian.appointment,
          civilian.section,
          civilian.deployment,
          civilian.qualification
        ].map(field => (field || '').toLowerCase());
        
        const searchTermLower = searchTerm.toLowerCase();
        return searchableFields.some(field => field.includes(searchTermLower));
      });
      setFilteredCivilians(filtered);
    }
  }, [searchTerm, civilians]);

  // Enhanced Print Function
  const handlePrint = () => {
    // Create a print-friendly version
    const printContent = document.getElementById('printarea');
    
    if (!printContent) {
      alert('Content not found for printing!');
      return;
    }
    
    // Create a print window
    const printWindow = window.open('', '_blank');
    
    // Create print-friendly HTML
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Civilian Strength Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: black;
            background: white;
            font-size: 11px;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          
          .print-header h1 {
            margin: 0;
            font-size: 22px;
            color: #333;
          }
          
          .print-header h2 {
            margin: 5px 0 0 0;
            font-size: 16px;
            color: #666;
          }
          
          .print-date {
            text-align: right;
            font-size: 11px;
            color: #666;
            margin-bottom: 20px;
          }
          
          .stats-grid-print {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin: 20px 0;
            page-break-inside: avoid;
          }
          
          .stat-card-print {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
            background: #f8f9fa;
          }
          
          .stat-value-print {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          
          .stat-label-print {
            font-size: 9px;
            color: #666;
          }
          
          .print-table-container {
            width: 100%;
            margin: 15px 0;
            page-break-inside: avoid;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          
          .print-table th {
            background: #2056AC;
            color: white;
            border: 1px solid #ddd;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
          }
          
          .print-table td {
            border: 1px solid #ddd;
            padding: 4px;
            text-align: left;
          }
          
          .print-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          
          .print-footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            
            .print-table {
              font-size: 8px;
            }
          }
          
          /* Make sure all text is black for printing */
          * {
            color: black !important;
          }
          
          /* Ensure table fits on page */
          .print-table th,
          .print-table td {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          /* Adjust column widths for print */
          .print-table th:nth-child(1) { width: 40px; } /* S.No */
          .print-table th:nth-child(2) { width: 150px; } /* NAME/PAK */
          .print-table th:nth-child(3) { width: 100px; } /* Appointment */
          .print-table th:nth-child(4) { width: 120px; } /* Father Name */
          .print-table th:nth-child(5) { width: 90px; } /* Mobile */
          .print-table th:nth-child(6) { width: 150px; } /* Address */
          .print-table th:nth-child(7) { width: 120px; } /* Email */
          .print-table th:nth-child(8) { width: 80px; } /* Post In Date */
          .print-table th:nth-child(9) { width: 80px; } /* DOB */
          .print-table th:nth-child(10) { width: 120px; } /* Qualification */
          .print-table th:nth-child(11) { width: 100px; } /* Experience */
          .print-table th:nth-child(12) { width: 80px; } /* Salary */
          .print-table th:nth-child(13) { width: 120px; } /* Deployment */
          .print-table th:nth-child(14) { width: 80px; } /* Section */
          .print-table th:nth-child(15) { width: 100px; } /* CNIC */
          .print-table th:nth-child(16) { width: 60px; } /* Blood Group */
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>Total Strength Of Civilian Employees</h1>
          <h2>Civilian Manpower Report System</h2>
        </div>
        
        <div class="print-date">
          Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
        
        <!-- Summary Statistics -->
        <div class="stats-grid-print">
          <div class="stat-card-print">
            <div class="stat-value-print">${stats.total}</div>
            <div class="stat-label-print">Total Civilians</div>
          </div>
          <div class="stat-card-print">
            <div class="stat-value-print">${stats.research}</div>
            <div class="stat-label-print">Research & Analysis</div>
          </div>
          <div class="stat-card-print">
            <div class="stat-value-print">${stats.design}</div>
            <div class="stat-label-print">Design & Development</div>
          </div>
          <div class="stat-card-print">
            <div class="stat-value-print">${stats.support}</div>
            <div class="stat-label-print">Support Services</div>
          </div>
          <div class="stat-card-print">
            <div class="stat-value-print">${stats.other}</div>
            <div class="stat-label-print">Other Deployment</div>
          </div>
        </div>
        
        <!-- Table -->
        <div class="print-table-container">
          <table class="print-table">
            <thead>
              <tr>
                <th>S/No.</th>
                <th>NAME/PAK</th>
                <th>Appointment</th>
                <th>Father Name</th>
                <th>Mobile</th>
                <th>Address</th>
                <th>Email</th>
                <th>Post In Date</th>
                <th>Date of Birth</th>
                <th>Qualification</th>
                <th>Experience</th>
                <th>Salary (PM)</th>
                <th>Deployment</th>
                <th>Section</th>
                <th>CNIC</th>
                <th>Blood Group</th>
              </tr>
            </thead>
            <tbody>
    `);
    
    // Add table rows
    filteredCivilians.forEach((civilian, index) => {
      printWindow.document.write(`
        <tr>
          <td>${index + 1}</td>
          <td>${(civilian.employee_name || 'N/A')} / ${(civilian.pak || 'N/A')}</td>
          <td>${civilian.appointment || 'N/A'}</td>
          <td>${civilian.father_name || 'N/A'}</td>
          <td>${civilian.mobile || 'N/A'}</td>
          <td title="${civilian.address || ''}">${civilian.address && civilian.address.length > 30 ? civilian.address.substring(0, 30) + '...' : civilian.address || 'N/A'}</td>
          <td>${civilian.email || 'N/A'}</td>
          <td>${civilian.postin_date || 'N/A'}</td>
          <td>${civilian.dob || 'N/A'}</td>
          <td title="${civilian.qualification || ''}">${civilian.qualification && civilian.qualification.length > 25 ? civilian.qualification.substring(0, 25) + '...' : civilian.qualification || 'N/A'}</td>
          <td title="${civilian.experience || ''}">${civilian.experience && civilian.experience.length > 25 ? civilian.experience.substring(0, 25) + '...' : civilian.experience || 'N/A'}</td>
          <td>${civilian.salary_pm ? 'Rs. ' + civilian.salary_pm : 'N/A'}</td>
          <td>${civilian.deployment || 'N/A'}</td>
          <td>${civilian.section || 'N/A'}</td>
          <td>${civilian.cnic || 'N/A'}</td>
          <td>${civilian.blood_group || 'N/A'}</td>
        </tr>
      `);
    });
    
    // Close table and add footer
    printWindow.document.write(`
            </tbody>
          </table>
        </div>
        
        <div class="print-footer">
          <p>Showing ${filteredCivilians.length} of ${civilians.length} records</p>
          <p>Civilian Manpower Report System - Generated on: ${new Date().toLocaleDateString()}</p>
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

  const handleExport = () => {
    if (filteredCivilians.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'S/No.', 'PAK', 'Appointment', 'Employee Name', 'Father Name', 'Phone',
      'Mobile', 'Address', 'Email', 'Post In Date', 'Date of Birth',
      'Qualification', 'Experience', 'Salary (PM)', 'Deployment', 'Section',
      'CNIC', 'Blood Group'
    ].join(',');

    const csvData = filteredCivilians.map(civilian =>
      [
        civilian.row_number,
        civilian.pak,
        `"${(civilian.appointment || '').replace(/"/g, '""')}"`,
        `"${(civilian.employee_name || '').replace(/"/g, '""')}"`,
        `"${(civilian.father_name || '').replace(/"/g, '""')}"`,
        civilian.phone,
        civilian.mobile,
        `"${(civilian.address || '').replace(/"/g, '""')}"`,
        civilian.email,
        civilian.postin_date,
        civilian.dob,
        `"${(civilian.qualification || '').replace(/"/g, '""')}"`,
        `"${(civilian.experience || '').replace(/"/g, '""')}"`,
        civilian.salary_pm,
        `"${(civilian.deployment || '').replace(/"/g, '""')}"`,
        civilian.section,
        civilian.cnic,
        civilian.blood_group
      ].join(',')
    ).join('\n');

    const csvContent = headers + '\n' + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civilian_strength_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleRetry = () => {
    setError(null);
    fetchCivilians();
  };

  // Helper function to get appointment color
  const getAppointmentColor = (appointment) => {
    if (!appointment) return '#95a5a6';
    
    const appointmentLower = appointment.toLowerCase();
    const appointmentColors = {
      'supervisor': 'LightGrey',
      'Lab Technician': '#3498db',
      'JRO': '#f39c12',
      'RO': '#2ecc71',
      'SRO': '#1abc9c',
      'PRO': '#d35400',
      'Manager': '#8e44ad',
      'Admin': '#16a085',
      'Mgmt': '#27ae60'
    };
    
    for (const [key, color] of Object.entries(appointmentColors)) {
      if (appointmentLower.includes(key.toLowerCase())) {
        return color;
      }
    }
    
    return '#95a5a6';
  };

  // Helper function to get deployment color
  const getDeploymentColor = (deployment) => {
    if (!deployment) return '#95a5a6';
    
    const deploymentLower = deployment.toLowerCase();
    const deploymentColors = {
      'research': '#3498db',
      'analysis': '#3498db',
      'design': '#2ecc71',
      'development': '#2ecc71',
      'support': '#f39c12',
      'services': '#f39c12',
      'administration': '#9b59b6',
      'finance': '#e67e22',
      'technical': '#1abc9c'
    };
    
    for (const [key, color] of Object.entries(deploymentColors)) {
      if (deploymentLower.includes(key.toLowerCase())) {
        return color;
      }
    }
    
    return '#95a5a6';
  };

  if (loading) {
    return (
      <div className="civilian-strength">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading civilian data from database...</p>
          <p className="loading-subtext">Connecting to backend server...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="civilian-strength">
        <div className="error-container">
          <div className="error-header">
            <span className="error-icon">⚠️</span>
            <h2>Connection Error</h2>
          </div>
          
          <div className="error-details">
            <p><strong>Error:</strong> {error}</p>
            <p><strong>API URL:</strong> {API_BASE_URL}/employee/total-strength</p>
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
                  <a href="http://10.0.0.7:5000/api/test" target="_blank" rel="noopener noreferrer">
                    http://10.0.0.7:5000/api/test
                  </a>
                </pre>
              </li>
              <li>Check if civ_manpower table exists in database</li>
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
    <div className="civilian-strength">
      {/* Header */}
      <StandardHeader 
        title={<h1>Total Strength Of Civilian Employees</h1>}
      />
      
      <div id="printarea">
        <div className="strength-header">
          <div className="header-actions">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by name, PAK, appointment, section, or deployment..."
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
              <button onClick={handleExport} className="action-btn export-btn">
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
              <h3>Total Civilians</h3>
              <p className="stat-number">{stats.total}</p>
              <p className="stat-subtitle">From Database</p>
            </div>
          </div>
          <div className="stat-card stat-research">
            <div className="stat-icon">🔬</div>
            <div className="stat-content">
              <h3>Research & Analysis</h3>
              <p className="stat-number">{stats.research}</p>
              <p className="stat-subtitle">Research Team</p>
            </div>
          </div>
          <div className="stat-card stat-design">
            <div className="stat-icon">🎨</div>
            <div className="stat-content">
              <h3>Design & Development</h3>
              <p className="stat-number">{stats.design}</p>
              <p className="stat-subtitle">Design Team</p>
            </div>
          </div>
          <div className="stat-card stat-support">
            <div className="stat-icon">🛠️</div>
            <div className="stat-content">
              <h3>Support Services</h3>
              <p className="stat-number">{stats.support}</p>
              <p className="stat-subtitle">Support Team</p>
            </div>
          </div>
          {stats.other > 0 && (
            <div className="stat-card stat-other">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <h3>Other Deployment</h3>
                <p className="stat-number">{stats.other}</p>
                <p className="stat-subtitle">Other Teams</p>
              </div>
            </div>
          )}
        </div>

        {/* Appointment Distribution Graph */}
        {Object.keys(appointmentDistribution).length > 0 && (
          <div className="appointment-breakdown">
            <h3>Appointment Distribution</h3>
            <div className="appointment-bars">
              {Object.entries(appointmentDistribution)
                .sort((a, b) => b[1] - a[1]) // Sort by count descending
                .slice(0, 8) // Show top 8 appointments
                .map(([appointment, count]) => (
                  <div key={appointment} className="appointment-bar">
                    <div className="appointment-label">{appointment || 'Unknown'}</div>
                    <div className="appointment-count">{count}</div>
                    <div 
                      className="appointment-progress" 
                      style={{ 
                        width: `${(count / stats.total) * 100}%`,
                        backgroundColor: getAppointmentColor(appointment)
                      }}
                    ></div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Deployment Distribution Graph */}
        {Object.keys(deploymentDistribution).length > 0 && (
          <div className="deployment-breakdown">
            <h3>Deployment Distribution</h3>
            <div className="deployment-bars">
              {Object.entries(deploymentDistribution)
                .sort((a, b) => b[1] - a[1]) // Sort by count descending
                .map(([deployment, count]) => (
                  <div key={deployment} className="deployment-bar">
                    <div className="deployment-label">{deployment || 'Not Assigned'}</div>
                    <div className="deployment-count">{count}</div>
                    <div 
                      className="deployment-progress" 
                      style={{ 
                        width: `${(count / stats.total) * 100}%`,
                        backgroundColor: getDeploymentColor(deployment)
                      }}
                    ></div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="data-container">
          <div className="table-header">
            <h3>Civilian Employee Details</h3>
            <div className="table-info">
              <span className="record-count">
                📋 {filteredCivilians.length} records
                {searchTerm && ` (filtered)`}
              </span>
            </div>
          </div>
          
          <div className="datagrid">
            <table>
              <thead>
                <tr>
                  <th style={{fontSize:'14px'}}>S/No.</th>
                  <th style={{fontSize:'14px'}}>NAME/PAK</th>
                  <th style={{fontSize:'14px'}}>Appointment</th>
                  <th style={{fontSize:'14px'}}>Father Name</th>
                  <th style={{fontSize:'14px'}}>Mobile</th>
                  <th style={{fontSize:'14px'}}>Address</th>
                  <th style={{fontSize:'14px'}}>Email</th>
                  <th style={{fontSize:'14px'}}>Post In Date</th>
                  <th style={{fontSize:'14px'}}>Date of Birth</th>
                  <th style={{fontSize:'14px'}}>Qualification</th>
                  <th style={{fontSize:'14px'}}>Experience</th>
                  <th style={{fontSize:'14px'}}>Salary (PM)</th>
                  <th style={{fontSize:'14px'}}>Deployment</th>
                  <th style={{fontSize:'14px'}}>Section</th>
                  <th style={{fontSize:'14px'}}>CNIC</th>
                  <th style={{fontSize:'14px'}}>Blood Group</th>
                </tr>
              </thead>
              <tbody>
                {filteredCivilians.length === 0 ? (
                  <tr>
                    <td colSpan="18" className="no-data">
                      {searchTerm  
                        ? `No civilians found for "${searchTerm}"`
                        : 'No civilian records found in the database'
                      }
                    </td>
                  </tr>
                ) : (
                  filteredCivilians.map((civilian, index) => (
                    <tr key={`${civilian.pak}-${index}`} className={index % 2 === 0 ? '' : 'alt'}>
                      <td>{civilian.row_number}</td>
                      <td className="pak-cell">{civilian.employee_name+ " / "+ civilian.pak || 'N/A'}</td>
                      <td>
                        <span 
                          className="appointment-badge"
                          style={{ backgroundColor: getAppointmentColor(civilian.appointment) }}
                        >
                          {civilian.appointment || 'N/A'}
                        </span>
                      </td>
                      <td className="employee-name">{civilian.employee_name || 'N/A'}</td>
                      <td>{civilian.father_name || 'N/A'}</td>
                      <td>{civilian.mobile || 'N/A'}</td>
                      <td className="address-cell" title={civilian.address || ''}>
                        {civilian.address && civilian.address.length > 25 
                          ? civilian.address.substring(0, 25) + '...' 
                          : civilian.address || 'N/A'
                        }
                      </td>
                      <td>
                        {civilian.email && civilian.email !== 'N/A' ? (
                          <a href={`mailto:${civilian.email}`} className="email-link">
                            {civilian.email}
                          </a>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>{civilian.postin_date || 'N/A'}</td>
                      <td>{civilian.dob || 'N/A'}</td>
                      <td className="qualification-cell" title={civilian.qualification || ''}>
                        {civilian.qualification && civilian.qualification.length > 20 
                          ? civilian.qualification.substring(0, 20) + '...' 
                          : civilian.qualification || 'N/A'
                        }
                      </td>
                      <td className="experience-cell" title={civilian.experience || ''}>
                        {civilian.experience && civilian.experience.length > 20 
                          ? civilian.experience.substring(0, 20) + '...' 
                          : civilian.experience || 'N/A'
                        }
                      </td>
                      <td className="salary-cell">
                        {civilian.salary_pm ? `Rs. ${civilian.salary_pm}` : 'N/A'}
                      </td>
                      <td>
                        <span 
                          className="deployment-badge"
                          style={{ backgroundColor: getDeploymentColor(civilian.deployment) }}
                        >
                          {civilian.deployment || 'N/A'}
                        </span>
                      </td>
                      <td>{civilian.section || 'N/A'}</td>
                      <td className="cnic-cell">{civilian.cnic || 'N/A'}</td>
                      <td>
                        <span 
                          className="blood-group-badge"
                          style={{ 
                            backgroundColor: civilian.blood_group ? '#e74c3c' : '#95a5a6',
                            color: 'white'
                          }}
                        >
                          {civilian.blood_group || 'N/A'}
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
          <div className="footer-left">
            <p>
              Showing <strong>{filteredCivilians.length}</strong> of <strong>{civilians.length}</strong> civilians (Database Records)
            </p>
            {searchTerm && (
              <p className="search-info">
                Filtered by: "<strong>{searchTerm}</strong>"
              </p>
            )}
            {!loading && civilians.length === 0 && !error && (
              <p className="data-info">
                📊 Connected to database but no civilian records found
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
    </div>
  );
};

export default CivilianStrength;