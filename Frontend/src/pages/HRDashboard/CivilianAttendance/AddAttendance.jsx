// AddAttendance.jsx - COMPLETE WORKING VERSION WITH EXCEL IMPORT
import { useState, useEffect, useRef } from 'react';
import './AddAttendance.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const API_BASE = 'http://10.0.0.7:5000/api/employee';
const BIOMETRIC_API_BASE = 'http://10.0.0.7:5000/api/biometric';

const AddAttendance = () => {
  const [attendanceDate, setAttendanceDate] = useState('');
  const [employees, setEmployees] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState(['Present', 'Absent', 'Leave', 'Medical Leave']);
  const [defaultTime, setDefaultTime] = useState({ time_in: '09:00', time_out: '17:00' });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isDateExist, setIsDateExist] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState([]);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [dateFormat, setDateFormat] = useState('auto'); // Default to auto-detect
  const fileInputRef = useRef(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setAttendanceDate(today);
    loadImportStats();
  }, []);

  const loadImportStats = async () => {
    try {
      const response = await fetch(`${BIOMETRIC_API_BASE}/import-stats`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setImportStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error loading import stats:', error);
    }
  };

  const handleDateSubmit = async () => {
    if (!attendanceDate) {
      setMessage('Please select date first');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setShowUpdatePrompt(false);

    try {
      const checkResponse = await fetch(`${API_BASE}/attendance/check-date?date=${attendanceDate}`);

      if (!checkResponse.ok) {
        throw new Error(`Failed to check date: ${checkResponse.status}`);
      }

      const checkData = await checkResponse.json();
      console.log('Date check result:', checkData);

      if (checkData.exists) {
        setMessage(`❌ Attendance for ${attendanceDate} already exists!`);
        setIsDateExist(true);
        setShowUpdatePrompt(true);
        setEmployees([]);
        setExistingAttendance([]);

        const existingResponse = await fetch(`${API_BASE}/attendance/date/${attendanceDate}`);
        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          setExistingAttendance(existingData.attendance || []);
        }

        setIsLoading(false);
        return;
      } else {
        setIsDateExist(false);
        setShowUpdatePrompt(false);

        const employeesResponse = await fetch(`${API_BASE}/current-employees`);

        if (!employeesResponse.ok) {
          throw new Error(`Failed to fetch employees: ${employeesResponse.status}`);
        }

        const employeesData = await employeesResponse.json();

        if (!employeesData.success || !employeesData.employees) {
          throw new Error('Invalid employee data format received');
        }

        const employeesWithData = employeesData.employees.map((emp, index) => {
          const parts = emp.split(' : ');
          return {
            row_number: (index + 1).toString(),
            pak: parts[0] || '',
            appointment: parts[1] || '',
            employee_name: parts[2] || '',
            status: 'Present',
            time_in: defaultTime.time_in,
            remarks: ''
          };
        });

        if (employeesWithData.length === 0) {
          setMessage('No current employees found in the database');
          setIsLoading(false);
          return;
        }

        setEmployees(employeesWithData);
        setMessage(`✅ Loaded ${employeesWithData.length} employees for new attendance`);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessage('Error: ' + error.message);

      if (!isDateExist) {
        const mockEmployees = [
          { row_number: '1', pak: 'O-1210710', employee_name: 'Adnan', appointment: 'Engineer' },
          { row_number: '2', pak: 'A-1236', employee_name: 'Test User 2', appointment: 'Designer' },
        ];

        const employeesWithData = mockEmployees.map(emp => ({
          ...emp,
          status: 'Present',
          remarks: '',
          time_in: defaultTime.time_in
        }));

        setEmployees(employeesWithData);
        setMessage('Using mock data. Please check backend connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        '.xlsx',
        '.xls'
      ];

      const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

      if (!validTypes.includes(file.type) && !validTypes.includes(fileExt)) {
        alert('Please select an Excel file (.xlsx or .xls)');
        event.target.value = '';
        return;
      }

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size should be less than 10MB');
        event.target.value = '';
        return;
      }

      setSelectedFile(file);
      setMessage(`📄 Selected file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    }
  };

  const handleImportExcel = async () => {
    if (!selectedFile) {
      alert('Please select an Excel file first');
      return;
    }

    if (!attendanceDate) {
      alert('Please select attendance date first');
      return;
    }

    if (employees.length === 0) {
      alert('Please load employees first by clicking "Load Employees"');
      return;
    }

    setIsImporting(true);
    setMessage('Importing attendance data from Excel...');

    try {
      const formData = new FormData();
      formData.append('excelFile', selectedFile);
      formData.append('date', attendanceDate);
      formData.append('dateFormat', dateFormat);

      const response = await fetch(`${BIOMETRIC_API_BASE}/import-excel`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Import error response:', errorText);
        throw new Error(`HTTP ${response.status}: Failed to import Excel file`);
      }

      const result = await response.json();

      console.log('Import result:', result);

      if (result.success) {
        // Build detailed alert message
        let alertMessage = `📊 Excel Import Results:\n\n`;
        alertMessage += `Total records found: ${result.totalRecordsInFile}\n`;
        alertMessage += `Successfully matched: ${result.matchedCount}\n`;
        alertMessage += `Not matched: ${result.unmatchedCount}\n`;

        if (result.allDatesInFile && result.allDatesInFile.length > 0) {
          alertMessage += `\nDates found in file:\n`;
          result.allDatesInFile.forEach(fileDate => {
            const isSelected = fileDate === attendanceDate;
            alertMessage += `• ${fileDate} ${isSelected ? '← SELECTED' : ''}\n`;
          });
        }

        if (result.matchedCount > 0) {
          // Process the imported data
          processImportedData(result.attendanceData);
          alertMessage += `\n✅ Time entries have been filled in the form for ${result.matchedCount} employees.`;
        } else {
          alertMessage += `\n⚠️ No matching records found.\n`;
          alertMessage += `Possible reasons:\n`;
          alertMessage += `1. Date in Excel doesn't match selected date\n`;
          alertMessage += `2. Employee IDs don't match PAK numbers\n`;
          alertMessage += `3. Excel file format is incorrect`;
        }

        alert(alertMessage);

        if (result.matchedCount > 0) {
          setMessage(`✅ Imported ${result.matchedCount} time entries from Excel`);
        } else {
          setMessage(`⚠️ No matching records found for ${attendanceDate}`);
        }

        // Clear file selection
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Reload import stats
        loadImportStats();

      } else {
        throw new Error(result.message || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);

      let errorMessage = `❌ Import failed: ${error.message}\n\n`;
      errorMessage += `Please check:\n`;
      errorMessage += `1. Excel file has correct format\n`;
      errorMessage += `2. Required columns: ID, NAME, DATE\n`;
      errorMessage += `3. Date format matches selection\n`;
      errorMessage += `4. Selected date: ${attendanceDate}`;

      alert(errorMessage);
      setMessage(`❌ Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };


  const processImportedData = (importedData) => {
    const updatedEmployees = [...employees];
    let matchCount = 0;
    let unmatchedCount = 0;


    // Clear previous Excel marks
    updatedEmployees.forEach(emp => {
      delete emp.excelImported;
      delete emp.excelTimeIn;
      delete emp.excelRemarks;
    });


    // Process matched records
    importedData.forEach(record => {
      if (record.matched && record.matchedPAK) {
        const employeeIndex = updatedEmployees.findIndex(emp =>
          emp.pak && record.matchedPAK &&
          emp.pak.toString() === record.matchedPAK.toString()
        );

        if (employeeIndex !== -1) {
          // Format time (hh:mm:ss to hh:mm)
          let timeIn = record.timeIn;
          if (timeIn && timeIn.includes(':')) {
            const parts = timeIn.split(':');
            timeIn = `${parts[0].padStart(2, '0')}:${parts[1]}`;
          }

          if (timeIn) {
            // Determine status based on time
            let status = 'Present';
            const timeInMinutes = parseInt(timeIn.split(':')[0]) * 60 + parseInt(timeIn.split(':')[1]);
            const lateThreshold = 9 * 60 + 15; // 09:15
            if (timeInMinutes > lateThreshold) {
              status = 'Late';
            }

            updatedEmployees[employeeIndex] = {
              ...updatedEmployees[employeeIndex],
              time_in: timeIn,
              status: status,
              remarks: `Excel: ${timeIn}`,
              excelImported: true,
              excelTimeIn: true,
              excelRemarks: true
            };
            matchCount++;
          }
        } else {
          unmatchedCount++;
        }
      } else {
        unmatchedCount++;
      }
    });

    setEmployees(updatedEmployees);

    const summaryMessage = `✅ Updated ${matchCount} employee records with Excel data`;
    if (unmatchedCount > 0) {
      setMessage(`${summaryMessage} | ${unmatchedCount} records not matched`);
    } else {
      setMessage(summaryMessage);
    }
  };


  const handleEmployeeChange = (index, field, value) => {
    const updatedEmployees = [...employees];
    updatedEmployees[index] = {
      ...updatedEmployees[index],
      [field]: value
    };

    // Clear Excel flags if user manually edits the field
    if (field === 'time_in' && updatedEmployees[index].excelTimeIn) {
      updatedEmployees[index].excelTimeIn = false;
    }
    if (field === 'remarks' && updatedEmployees[index].excelRemarks) {
      updatedEmployees[index].excelRemarks = false;
    }

    if (field === 'status' && (value === 'Absent' || value === 'Leave')) {
      updatedEmployees[index].time_in = '';
    } else if (field === 'status' && (value === 'Present' || value === 'Late') && !updatedEmployees[index].time_in) {
      updatedEmployees[index].time_in = defaultTime.time_in;
    }

    setEmployees(updatedEmployees);
  };

  const getExcelImportedCount = () => {
  return employees.filter(emp => emp.excelImported).length;
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (employees.length === 0) {
      setMessage('No employee data to submit');
      return;
    }

    if (isDateExist) {
      setMessage('❌ Cannot submit: Attendance for this date already exists!');
      setShowUpdatePrompt(true);
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const attendanceData = {
        attendance_date: attendanceDate,
        employees: employees.map(emp => ({
          pak: emp.pak,
          status: emp.status,
          time_in: emp.time_in,
          remarks: emp.remarks
        }))
      };

      console.log('Submitting attendance data:', attendanceData);

      const endpoint = `${API_BASE}/attendance/add`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(attendanceData)
      });

      console.log('Response status:', response.status, 'from', endpoint);

      const text = await response.text();
      let result;

      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError, 'Raw text:', text);
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.message || 'Failed to save attendance');
      }

      setMessage(`✅ Attendance saved successfully! ${result.message || ''}`);


      setTimeout(() => {
        handleReset(); // This resets everything
        setMessage('');
        setEmployees([]);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1500);

    } catch (error) {
      console.error('Error saving attendance:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    const today = new Date().toISOString().split('T')[0];
    setAttendanceDate(today);
    setEmployees([]);
    setMessage('');
    setIsDateExist(false);
    setExistingAttendance([]);
    setShowUpdatePrompt(false);
    setSelectedFile(null);
    setDateFormat('auto');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const goToUpdateAttendance = () => {
    window.location.href = '/hr/civilian-attendance/update-by-date';
  };

  const handleClosePrompt = () => {
    setShowUpdatePrompt(false);
    setMessage('');
    setEmployees([]);
    setExistingAttendance([]);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="page-container">
      <StandardHeader
        title="Add Attendance"
        subtitle="Add new attendance records for all civilian employees"
      />

      <main className="main-content">
        <div className="main-content-wrapper">
          <div className="standard-card">
            <section className="date-section mb-lg">
              <form className="date-form">
                <div className="form-group">
                  <label htmlFor="attendanceDate" style={{ color: 'Black' }} >Select Date:</label>
                  <input
                    type="date"
                    id="attendanceDate"
                    value={attendanceDate}
                    onChange={(e) => {
                      setAttendanceDate(e.target.value);
                      setEmployees([]);
                      setIsDateExist(false);
                      setShowUpdatePrompt(false);
                      setMessage('');
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="standard-input"
                    max={today}
                    style={{ minWidth: '150px' }}
                  />
                  <button
                    type="button"
                    className="standard-btn standard-btn-primary"
                    onClick={handleDateSubmit}
                    disabled={isLoading || !attendanceDate}
                  >
                    {isLoading ? 'Checking...' : 'Load Employees'}
                  </button>
                </div>
              </form>

              {/* Excel Import Status Indicator */}
              {employees.some(emp => emp.excelImported) && (
                <div className="info-note" style={{
                  backgroundColor: '#e8f4fd',
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  borderLeft: '4px solid #28a745'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: '#28a745',
                      borderRadius: '50%'
                    }}></div>
                    <div>
                      <strong>✅ Excel Import Applied</strong> -
                      <span style={{ marginLeft: '5px' }}>
                        {employees.filter(emp => emp.excelImported).length} records updated from Excel file
                      </span>
                    </div>
                  </div>
                  <div style={{
                    marginTop: '5px',
                    fontSize: '12px',
                    color: '#28a745',
                    display: 'flex',
                    gap: '15px'
                  }}>
                    <span>• Green-highlighted rows: Excel-imported records</span>
                    <span>• Green time fields: Imported from Excel</span>
                    <span>• Green remarks: Excel remarks</span>
                  </div>
                </div>
              )}

              {/* Excel Import Section */}
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '6px'
              }}>
                <h4 style={{ marginBottom: '15px' }}>📊 Import Attendance from Excel</h4>

                {/* Date Format Selection */}
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '200px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                        Date Format in Excel:
                      </label>
                      <select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="auto">Auto-detect (Recommended - tries all formats)</option>
                        <option value="yyyy-mm-dd hh:mm:ss">yyyy-mm-dd hh:mm:ss</option>
                        <option value="yyyy/mm/dd hh:mm:ss">yyyy/mm/dd hh:mm:ss</option>
                        <option value="dd-mm-yyyy hh:mm:ss">dd-mm-yyyy hh:mm:ss</option>
                        <option value="dd/mm/yyyy hh:mm:ss">dd/mm/yyyy hh:mm:ss</option>
                        <option value="mm/dd/yyyy hh:mm:ss">mm/dd/yyyy hh:mm:ss</option>
                        <option value="yyyy-mm-dd hh:mm">yyyy-mm-dd hh:mm</option>
                        <option value="yyyy/mm/dd hh:mm">yyyy/mm/dd hh:mm</option>
                        <option value="dd-mm-yyyy hh:mm">dd-mm-yyyy hh:mm</option>
                        <option value="dd/mm/yyyy hh:mm">dd/mm/yyyy hh:mm</option>
                        <option value="mm/dd/yyyy hh:mm">mm/dd/yyyy hh:mm</option>
                      </select>
                    </div>

                    <div style={{
                      padding: '8px',
                      backgroundColor: '#e8f4fd',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <strong>Selected:</strong> {attendanceDate}
                    </div>
                  </div>

                  <div style={{
                    marginTop: '5px',
                    fontSize: '12px',
                    color: '#6c757d',
                    padding: '5px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    {dateFormat === 'auto'
                      ? 'Auto-detect will try all common date formats'
                      : `Format: ${dateFormat}`}
                  </div>
                </div>

                {/* File Selection and Import Button */}
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".xlsx,.xls"
                      style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        flex: 1,
                        backgroundColor: 'white'
                      }}
                    />

                    <button
                      type="button"
                      onClick={handleImportExcel}
                      disabled={!selectedFile || !attendanceDate || employees.length === 0 || isImporting}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: !selectedFile || !attendanceDate || employees.length === 0 || isImporting ?
                          '#6c757d' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: !selectedFile || !attendanceDate || employees.length === 0 || isImporting ?
                          'not-allowed' : 'pointer',
                        minWidth: '150px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {isImporting ? (
                        <>
                          <span className="loading-spinner-small"></span>
                          Importing...
                        </>
                      ) : (
                        '📥 Import from Excel'
                      )}
                    </button>
                  </div>

                  {selectedFile && (
                    <div style={{
                      padding: '10px',
                      backgroundColor: '#e8f4fd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      marginTop: '10px'
                    }}>
                      <strong>Selected File:</strong> {selectedFile.name}
                      <span style={{ color: '#6c757d', marginLeft: '10px' }}>
                        ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div style={{
                  padding: '10px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginTop: '10px'
                }}>
                  <div><strong>📋 Excel File Requirements:</strong></div>
                  <div>1. <strong>Required columns:</strong> ID, NAME, DATE (in any order)</div>
                  <div>2. <strong>ID column:</strong> Employee number (e.g., 1210710 for O-1210710)</div>
                  <div>3. <strong>DATE column:</strong> Date and time (e.g., 2026-01-06 09:13:26)</div>
                  <div>4. <strong>Matching:</strong> First entry = Time In, Last entry = Time Out</div>
                  <div>5. <strong>Note:</strong> Date must match selected attendance date</div>
                </div>

                {/* Import Statistics */}
                {importStats && (
                  <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <div><strong>📈 Import Statistics:</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                      <div>Total Imports: <strong>{importStats.total_imports || 0}</strong></div>
                      <div>Total Records: <strong>{importStats.total_records || 0}</strong></div>
                      <div>Matched: <strong>{importStats.total_matched || 0}</strong></div>
                    </div>
                  </div>
                )}

                {/* Debug Button */}
                <div style={{ marginTop: '15px', textAlign: 'center' }}>
                  <button
                    onClick={async () => {
                      if (!selectedFile) {
                        alert('Please select a file first');
                        return;
                      }

                      const formData = new FormData();
                      formData.append('excelFile', selectedFile);

                      try {
                        const response = await fetch(`${BIOMETRIC_API_BASE}/debug-excel`, {
                          method: 'POST',
                          body: formData
                        });

                        const result = await response.json();
                        console.log('Debug result:', result);
                        alert(`Debug Results:\n\nRows: ${result.totalRows}\nColumns: ${result.columns.join(', ')}\nFirst Date: "${result.firstDateValue}"`);
                      } catch (error) {
                        alert(`Debug failed: ${error.message}`);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginLeft: '10px'
                    }}
                  >
                    🔍 Debug File
                  </button>
                </div>
              </div>
            </section>

            {message && (
              <div className={`standard-message ${message.includes('✅') ? 'standard-message-success' : message.includes('❌') ? 'standard-message-error' : 'standard-message-info'} mb-lg`}>
                {message}
              </div>
            )}

            {showUpdatePrompt && (
              <div className="update-prompt-modal">
                <div className="modal-overlay"></div>
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>⚠️ Attendance Already Exists</h3>
                  </div>
                  <div className="modal-body">
                    <p>
                      <strong>Attendance for {attendanceDate} already exists!</strong>
                    </p>
                    <p>
                      This form is only for adding <strong>NEW</strong> attendance records.
                      You cannot add attendance for the same date twice.
                    </p>

                    <div className="existing-info">
                      <p><strong>Existing Records Found:</strong> {existingAttendance.length}</p>
                    </div>

                    <div className="action-buttons-modal">
                      <button
                        className="standard-btn standard-btn-primary"
                        onClick={goToUpdateAttendance}
                      >
                        Go to Update Attendance Form
                      </button>
                      <button
                        className="standard-btn standard-btn-secondary"
                        onClick={handleClosePrompt}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {employees.length > 0 && (
              <section className="attendance-form-section">
                <form onSubmit={handleSubmit}>
             <div className="attendance-header-info">
  <div className="date-display">
    <strong>New Attendance for:</strong>
    <input
      type="date"
      value={attendanceDate}
      readOnly
      className="standard-input"
      style={{ width: 'auto', marginLeft: '10px' }}
    />
  </div>
  <div className="employee-count">
    <strong>Total Employees:</strong> {employees.length}
    {/* Show Excel imported count if any */}
    {getExcelImportedCount() > 0 && (
      <span style={{ marginLeft: '10px', color: '#28a745', fontSize: '12px', fontWeight: 'bold' }}>
        ({getExcelImportedCount()} updated from Excel)
      </span>
    )}
    {/* Show ready for import if file selected but not imported yet */}
    {selectedFile && getExcelImportedCount() === 0 && (
      <span style={{ marginLeft: '10px', color: '#28a745', fontSize: '12px' }}>
        (Excel file ready for import)
      </span>
    )}
  </div>
</div>


                  <div className="info-note" style={{ backgroundColor: '#e8f4fd', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                    <p><strong>📋 You are adding NEW attendance for {attendanceDate}</strong></p>
                    <p>Default time-in: {defaultTime.time_in} | Leave time_in empty for Absent/Leave status</p>
                    {selectedFile && (
                      <p style={{ color: '#28a745', marginTop: '5px' }}>
                        ✅ Excel file selected: {selectedFile.name}
                      </p>
                    )}
                  </div>




                  <div className="datagrid">
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th style={{ width: '10px', fontSize: '15px' }}>S/No.</th>
                          <th style={{ width: '10px', fontSize: '15px' }}>Name / PAK</th>
                          <th style={{ width: '10px', fontSize: '15px' }}>Appointment</th>
                          <th style={{ width: '10px', fontSize: '15px' }}>Status</th>
                          <th style={{ width: '10px', fontSize: '15px' }}>Time In</th>
                          <th style={{ width: '10px', fontSize: '15px' }}>Remarks</th>
                        </tr>
                      </thead>

                      <tbody>
                        {employees.map((employee, index) => (
                          <tr
                            key={index}
                            className={`${index % 2 === 0 ? 'alt' : ''} ${employee.excelImported ? 'excel-imported-row' : ''}`}
                            title={employee.excelImported ? "This record was updated from Excel import" : ""}
                          >
                            <td className="serial-number">
                              {employee.row_number}
                              {employee.excelImported && <span className="excel-status">Excel</span>}
                            </td>

                            <td>
                              <input
                                type="text"
                                value={employee.employee_name + " / " + employee.pak}
                                readOnly
                                className="readonly-input"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={employee.appointment || 'N/A'}
                                readOnly
                                className="readonly-input"
                              />
                            </td>
                            <td>
                              <select
                                value={employee.status}
                                onChange={(e) => handleEmployeeChange(index, 'status', e.target.value)}
                                className={`status-select ${employee.excelImported ? 'excel-status-field' : ''}`}
                              >
                                {attendanceStatus.map((status, statusIndex) => (
                                  <option key={statusIndex} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="time"
                                value={employee.time_in}
                                onChange={(e) => handleEmployeeChange(index, 'time_in', e.target.value)}
                                className={`time-input ${!employee.time_in ? 'default-time' : ''} ${employee.excelTimeIn ? 'excel-time-in' : ''}`}
                                disabled={employee.status === 'Absent' || employee.status === 'Leave'}
                                title={employee.excelTimeIn ? "Time imported from Excel" : ""}
                              />
                              {employee.excelTimeIn && (
                                <div className="excel-indicator"></div>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={employee.remarks}
                                onChange={(e) => handleEmployeeChange(index, 'remarks', e.target.value)}
                                className={`remarks-input ${employee.excelRemarks ? 'excel-remarks' : ''}`}
                                placeholder="Enter remarks"
                                title={employee.excelRemarks ? "Remarks imported from Excel" : ""}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>

                    </table>
                  </div>

                  <div className="action-buttons">
                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save New Attendance'}
                    </button>
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={handleReset}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            )}

            {isLoading && employees.length === 0 && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Checking attendance date and loading employees...</p>
              </div>
            )}

            {!isLoading && employees.length === 0 && !message && !showUpdatePrompt && (
              <div className="no-data-message">
                <div className="no-data-icon">📅</div>
                <h3>Ready to Add New Attendance</h3>
                <p>Select a date and click "Load Employees" to add new attendance records</p>
                <p className="note-text">
                  <strong>Note:</strong> You can import attendance data from Excel file after loading employees.
                  <br />
                  Excel should have columns: ID, NAME, DATE (with date and time)
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddAttendance;