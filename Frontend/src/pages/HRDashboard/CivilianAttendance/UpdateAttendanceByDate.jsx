import { useState, useEffect, useRef } from 'react';
import './UpdateAttendanceByDate.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const API_BASE_URL = 'http://10.0.0.7:5000';
const BIOMETRIC_API_BASE = 'http://10.0.0.7:5000/api/biometric';

const UpdateAttendanceByDate = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState(['Present', 'Absent', 'Leave', 'Medical Leave']);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dateExists, setDateExists] = useState(false);
  const [defaultTimes, setDefaultTimes] = useState({ time_in: '09:00', time_out: '17:00' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [dateFormat, setDateFormat] = useState('auto');
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    fetchDefaultTimes();
  }, []);

  const fetchWithErrorHandling = async (url, options = {}) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const text = await response.text();
        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  const fetchDefaultTimes = async () => {
    try {
      const data = await fetchWithErrorHandling('/api/employee/working-hours');
      if (data.success) {
        setDefaultTimes({
          time_in: data.time_in,
          time_out: data.time_out
        });
      }
    } catch (error) {
      console.error('Error fetching default times:', error);
      setDefaultTimes({ time_in: '09:00', time_out: '17:00' });
    }
  };

  const formatTimeForInput = (timeString) => {
    if (!timeString) return '';

    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      if (parts.length >= 2) {
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1].substring(0, 2).padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    }

    if (timeString.includes(' ')) {
      const timePart = timeString.split(' ')[1];
      if (timePart) {
        return timePart.substring(0, 5);
      }
    }

    return timeString;
  };

  const normalizeTime = (time) => {
    if (!time) return '';

    time = time.trim();

    if (time.includes(':')) {
      const parts = time.split(':');
      if (parts.length >= 2) {
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1].padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    }

    if (time.length === 4 && !isNaN(time)) {
      return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
    }

    return time;
  };

  const handleDateSubmit = async () => {
    if (!selectedDate) {
      setMessage('Please select date first to update data');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setSelectedFile(null);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      console.log(`📅 Checking date: ${selectedDate}`);

      const checkData = await fetchWithErrorHandling(`/api/employee/attendance/check-date?date=${selectedDate}`);
      console.log('Check date response:', checkData);

      if (!checkData.exists) {
        setMessage(`No attendance records found for ${selectedDate}. Please add attendance first.`);
        setDateExists(false);
        setAttendanceData([]);
        setIsLoading(false);
        return;
      }

      setDateExists(true);

      // Fetch attendance data for the selected date
      console.log(`📋 Fetching attendance data for: ${selectedDate}`);
      const data = await fetchWithErrorHandling(`/api/employee/attendance/date/${selectedDate}`);
      console.log('Attendance data response:', data);

      if (data.success && data.attendance) {
        const formattedData = data.attendance.map((record, index) => {
          let timeIn = '';
          if (record.time_in) {
            timeIn = normalizeTime(record.time_in);
          } else if (record.TIME_IN) {
            timeIn = formatTimeForInput(record.TIME_IN);
          }

          let timeOut = '';
          if (record.time_out) {
            timeOut = normalizeTime(record.time_out);
          } else if (record.TIME_OUT) {
            timeOut = formatTimeForInput(record.TIME_OUT);
          }

          let balanceHours = '0.00';
          const dbMissedHours = record.MISSED_HOURS;

          if (dbMissedHours !== null && dbMissedHours !== undefined) {
            const hoursNum = parseFloat(dbMissedHours);

            if (hoursNum > 0) {
              balanceHours = `+${hoursNum.toFixed(2)}`;
            } else if (hoursNum < 0) {
              balanceHours = hoursNum.toFixed(2);
            } else {
              balanceHours = '0.00';
            }
          } else {
            if (record.status === 'Present' || record.status === 'Late') {
              balanceHours = calculateWorkHoursBalance(timeIn, timeOut, record.status);
            } else if (record.status === 'Absent') {
              balanceHours = '-8.00';
            } else if (record.status === 'Leave') {
              balanceHours = '0.00';
            }
          }

          console.log(`Record ${index}: PAK=${record.PAK}, DB MissedHours=${dbMissedHours}, Display Balance=${balanceHours}`);

          return {
            row_number: (index + 1).toString(),
            pak: record.PAK || '',
            employee_name: record.EMPLOYEE_NAME || 'Unknown',
            attendence_date: record.attendence_date || record.ATTENDENCE_DATE || selectedDate,
            attendence_id: record.ATTENDENCE_ID,
            status: record.STATUS || 'Present',
            time_in: timeIn,
            time_out: timeOut,
            balance_hours: balanceHours,
            remarks: record.REMARKS || ''
          };
        });

        console.log('Formatted data with missed hours:', formattedData);
        setAttendanceData(formattedData);
        setMessage(`✅ Loaded ${formattedData.length} records for ${selectedDate}`);

        if (formattedData.length > 0) {
          console.log('First 3 records loaded:');
          formattedData.slice(0, 3).forEach((record, idx) => {
            console.log(`Record ${idx}: PAK=${record.pak}, Balance=${record.balance_hours}, Status=${record.status}`);
          });
        }

        setTimeout(() => {
          setMessage('');
        }, 3000);
      } else {
        setMessage('Failed to load attendance data');
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setMessage(`❌ ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
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

    if (!selectedDate) {
      alert('Please select date first');
      return;
    }

    if (attendanceData.length === 0) {
      alert('Please load attendance data first by clicking "Load Data"');
      return;
    }

    setIsImporting(true);
    setMessage('Importing attendance data from Excel...');

    try {
      const formData = new FormData();
      formData.append('excelFile', selectedFile);
      formData.append('date', selectedDate);
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
        setImportResults(result);

        // Process imported data
        const matchResults = processImportedData(result.attendanceData);

        // Build detailed message
        let alertMessage = `📊 Excel Import Results:\n\n`;
        alertMessage += `Total records in form: ${attendanceData.length}\n`;
        alertMessage += `Total records in Excel: ${result.totalRecordsInFile}\n`;
        alertMessage += `Matched records: ${matchResults.matchedCount}\n`;
        alertMessage += `Not matched: ${result.unmatchedCount}\n\n`;
        alertMessage += `Time entries updated for: ${matchResults.matchedCount} employees\n\n`;

        if (result.allDatesInFile && result.allDatesInFile.length > 0) {
          alertMessage += `Dates found in Excel:\n`;
          result.allDatesInFile.forEach(fileDate => {
            const isSelected = fileDate === selectedDate;
            alertMessage += `• ${fileDate} ${isSelected ? '← SELECTED' : ''}\n`;
          });
          alertMessage += `\n`;
        }

        alertMessage += `✅ Time entries have been updated in the form for matched employees.`;
        alert(alertMessage);

        setMessage(`✅ Imported ${matchResults.matchedCount} time entries from Excel`);

        // Clear file selection
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

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
      errorMessage += `4. Selected date: ${selectedDate}`;

      alert(errorMessage);
      setMessage(`❌ Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const processImportedData = (importedData) => {
    const updatedData = [...attendanceData];
    let matchedCount = 0;
    let unmatchedCount = 0;

    // Clear previous Excel marks
    updatedData.forEach(emp => {
      delete emp.excelImported;
      delete emp.excelTimeIn;
      delete emp.excelTimeOut;
      delete emp.excelRemarks;
    });

    // Process matched records
    importedData.forEach(record => {
      if (record.matched && record.matchedPAK) {
        const employeeIndex = updatedData.findIndex(emp =>
          emp.pak && record.matchedPAK &&
          emp.pak.toString() === record.matchedPAK.toString()
        );

        if (employeeIndex !== -1) {
          // Format times (hh:mm:ss to hh:mm)
          let timeIn = record.timeIn;
          let timeOut = record.timeOut;

          if (timeIn && timeIn.includes(':')) {
            const parts = timeIn.split(':');
            timeIn = `${parts[0].padStart(2, '0')}:${parts[1]}`;
          }

          if (timeOut && timeOut.includes(':')) {
            const parts = timeOut.split(':');
            timeOut = `${parts[0].padStart(2, '0')}:${parts[1]}`;
          }

          // Only update if employee is Present or Late
          if (updatedData[employeeIndex].status === 'Present' ||
            updatedData[employeeIndex].status === 'Late') {

            // Mark as Excel imported
            updatedData[employeeIndex].excelImported = true;

            // Update time_in (always update if available)
            if (timeIn) {
              updatedData[employeeIndex].time_in = timeIn;
              updatedData[employeeIndex].excelTimeIn = true;
            }

            // Update time_out (only if available - may be empty for single entry)
            if (timeOut) {
              updatedData[employeeIndex].time_out = timeOut;
              updatedData[employeeIndex].excelTimeOut = true;
            }

            // Recalculate balance if both times are available
            if (timeIn && timeOut) {
              const balanceHours = calculateWorkHoursBalance(
                updatedData[employeeIndex].time_in,
                updatedData[employeeIndex].time_out,
                updatedData[employeeIndex].status
              );
              updatedData[employeeIndex].balance_hours = balanceHours;
            } else if (timeIn && !timeOut) {
              // Only time in available, set balance to 0.00
              updatedData[employeeIndex].balance_hours = '0.00';
            }

            // Add remark about Excel import
            const existingRemarks = updatedData[employeeIndex].remarks || '';
            const entryCount = record.totalEntries || 0;
            let timeRemark = '';

            if (timeIn && timeOut) {
              timeRemark = `Excel ${timeIn}-${timeOut}`;
            } else if (timeIn && !timeOut) {
              timeRemark = `Excel ${timeIn}`;
            }

            updatedData[employeeIndex].remarks = timeRemark;
            updatedData[employeeIndex].excelRemarks = true;

            matchedCount++;
          }
        } else {
          unmatchedCount++;
        }
      } else {
        unmatchedCount++;
      }
    });

    setAttendanceData(updatedData);

    // Set import results for display
    setImportResults({
      ...importResults,
      matchedCount: matchedCount,
      totalMatched: matchedCount
    });

    const summaryMessage = `✅ Updated ${matchedCount} employee records with Excel data`;
    if (unmatchedCount > 0) {
      setMessage(`${summaryMessage} | ${unmatchedCount} records not matched`);
    } else {
      setMessage(summaryMessage);
    }

    return { matchedCount, unmatchedCount };
  };


  // Helper function to count Excel-imported records
  const getExcelImportedCount = () => {
    return attendanceData.filter(emp => emp.excelImported).length;
  };


  const handleEmployeeChange = (index, field, value) => {
    const updatedData = [...attendanceData];
    // Clear Excel flag if user manually edits remarks
    if (field === 'remarks' && updatedData[index].excelRemarks) {
      updatedData[index].excelRemarks = false;
      // Also clear excelImported flag if no more Excel fields
      if (!updatedData[index].excelTimeIn && !updatedData[index].excelTimeOut) {
        updatedData[index].excelImported = false;
      }
    }


    updatedData[index] = {
      ...updatedData[index],
      [field]: value
    };
    setAttendanceData(updatedData);
  };

 const getTimeInputClass = (status, isExcelField = false) => {
  let className = 'time-input';
  if (status === 'Leave' || status === 'Absent') {
    className += ' leave-time';
  }
  if (isExcelField) {
    className += ' excel-time';
  }
  return className;
};

  const calculateWorkHoursBalance = (timeIn, timeOut, status) => {
    if (status === 'Absent') {
      return '-8.00';
    }

    if (status === 'Leave') {
      return '0.00';
    }

    if (!timeIn || !timeOut) {
      return '0.00';
    }

    const normalizedTimeIn = normalizeTime(timeIn);
    const normalizedTimeOut = normalizeTime(timeOut);

    if (!normalizedTimeIn || !normalizedTimeOut) {
      return '0.00';
    }

    const [inHours, inMinutes] = normalizedTimeIn.split(':').map(Number);
    const [outHours, outMinutes] = normalizedTimeOut.split(':').map(Number);
    const [defaultInHours, defaultInMinutes] = defaultTimes.time_in.split(':').map(Number);
    const [defaultOutHours, defaultOutMinutes] = defaultTimes.time_out.split(':').map(Number);

    const totalInMinutes = inHours * 60 + inMinutes;
    const totalOutMinutes = outHours * 60 + outMinutes;
    const defaultInTotalMinutes = defaultInHours * 60 + defaultInMinutes;
    const defaultOutTotalMinutes = defaultOutHours * 60 + defaultOutMinutes;

    const requiredMinutes = defaultOutTotalMinutes - defaultInTotalMinutes;
    const workedMinutes = totalOutMinutes - totalInMinutes;
    const extraMinutes = workedMinutes - requiredMinutes;
    const extraHours = extraMinutes / 60;

    if (extraHours === 0) {
      return '0.00';
    } else if (extraHours > 0) {
      return `+${extraHours.toFixed(2)}`;
    } else {
      return extraHours.toFixed(2);
    }
  };

  const handleTimeChange = (index, field, value) => {
    const updatedData = [...attendanceData];
    const record = updatedData[index];

    if (field === 'time_in' || field === 'time_out') {
      value = normalizeTime(value);

      // Clear Excel flags if user manually edits the field
      if (field === 'time_in' && record.excelTimeIn) {
        updatedData[index].excelTimeIn = false;
        // Also clear excelImported flag if no more Excel fields
        if (!record.excelTimeOut && !record.excelRemarks) {
          updatedData[index].excelImported = false;
        }
      }
      if (field === 'time_out' && record.excelTimeOut) {
        updatedData[index].excelTimeOut = false;
        if (!record.excelTimeIn && !record.excelRemarks) {
          updatedData[index].excelImported = false;
        }
      }
    }

    updatedData[index] = {
      ...record,
      [field]: value
    };

    if (field === 'time_in' || field === 'time_out') {
      const newRecord = updatedData[index];
      const balanceHours = calculateWorkHoursBalance(
        newRecord.time_in,
        newRecord.time_out,
        newRecord.status
      );
      updatedData[index].balance_hours = balanceHours;
    }

    setAttendanceData(updatedData);
  };

  const handleStatusChange = (index, newStatus) => {
    const updatedData = [...attendanceData];
    const record = updatedData[index];

    // Clear Excel flags if status changes from Present/Late to Absent/Leave
    if ((record.status === 'Present' || record.status === 'Late') &&
      (newStatus === 'Absent' || newStatus === 'Leave')) {
      delete updatedData[index].excelTimeIn;
      delete updatedData[index].excelTimeOut;
      delete updatedData[index].excelRemarks;
      delete updatedData[index].excelImported;
    }



    updatedData[index] = {
      ...record,
      status: newStatus
    };

    if (newStatus === 'Absent') {
      updatedData[index].time_in = '';
      updatedData[index].time_out = '';
      updatedData[index].balance_hours = '-8.00';
    } else if (newStatus === 'Leave') {
      updatedData[index].time_in = '';
      updatedData[index].time_out = '';
      updatedData[index].balance_hours = '0.00';
    } else if (newStatus === 'Medical Leave') {
      updatedData[index].time_in = '';
      updatedData[index].time_out = '';
      updatedData[index].balance_hours = '0.00';
    } else if (newStatus === 'Present' || newStatus === 'Late') {
      const balanceHours = calculateWorkHoursBalance(
        record.time_in,
        record.time_out,
        newStatus
      );
      updatedData[index].balance_hours = balanceHours;

      if (newStatus === 'Late' && balanceHours === '0.00') {
        updatedData[index].balance_hours = '-0.25';
      }
    }

    setAttendanceData(updatedData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const updateData = {
        attendance_records: attendanceData.map(record => {
          let balanceValue = record.balance_hours;
          if (balanceValue.startsWith('+')) {
            balanceValue = balanceValue.substring(1);
          }
          const hoursValue = parseFloat(balanceValue) || 0;

          return {
            attendence_id: record.attendence_id,
            pak: record.pak,
            status: record.status,
            time_in: record.time_in || '',
            time_out: record.time_out || '',
            missed_hours: hoursValue,
            remarks: record.remarks || ''
          };
        }),
        date: selectedDate
      };

      const result = await fetchWithErrorHandling('/api/employee/attendance/update-details', {
        method: 'POST',
        body: JSON.stringify(updateData)
      });

      if (result.success) {
        setMessage(`✅ ${result.message || 'Data updated successfully!'}`);

        // RESET PAGE TO ORIGINAL CONDITION AFTER SUCCESSFUL UPDATE
        setTimeout(() => {
          handleReset(); // This resets everything
          setMessage(''); // Clear success message
        }, 1500); // Wait 1.5 seconds before resetting
      } else {
        setMessage(`❌ ${result.message || 'Failed to update data'}`);
        if (result.errors) {
          console.error('Update errors:', result.errors);
        }
      }

      setIsLoading(false);

      if (result.success) {
        setTimeout(() => {
          setMessage('');
        }, 5000);
      }
    } catch (error) {
      setMessage('❌ Network error: Failed to update attendance data');
      setIsLoading(false);
      console.error('Error updating attendance data:', error);
    }
  };

  const handleReset = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setAttendanceData([]);
    setMessage('');
    setDateExists(false);
    setSelectedFile(null);
    setImportResults(null);
    setDateFormat('auto');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const populateWithDefaultTimes = () => {
    const updatedData = attendanceData.map(record => {
      if (record.status === 'Present' || record.status === 'Late') {
        const timeIn = record.time_in || defaultTimes.time_in;
        const timeOut = record.time_out || defaultTimes.time_out;
        const balanceHours = calculateWorkHoursBalance(timeIn, timeOut, record.status);

        return {
          ...record,
          time_in: timeIn,
          time_out: timeOut,
          balance_hours: balanceHours
        };
      }
      return record;
    });

    setAttendanceData(updatedData);
    setMessage('✅ Default times populated for present/late employees');

    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  const calculateTotals = () => {
    let totalExtraWork = 0;
    let totalMissedHours = 0;

    attendanceData.forEach(record => {
      const balanceStr = record.balance_hours || '0';
      let hoursValue = parseFloat(balanceStr) || 0;

      if (typeof balanceStr === 'string' && balanceStr.startsWith('+')) {
        hoursValue = parseFloat(balanceStr.substring(1)) || 0;
      }

      if (hoursValue > 0) {
        totalExtraWork += hoursValue;
      } else if (hoursValue < 0) {
        totalMissedHours += Math.abs(hoursValue);
      }
    });

    return { totalExtraWork, totalMissedHours };
  };

  const { totalExtraWork, totalMissedHours } = calculateTotals();

  const getRequiredHours = () => {
    const [inHours, inMinutes] = defaultTimes.time_in.split(':').map(Number);
    const [outHours, outMinutes] = defaultTimes.time_out.split(':').map(Number);
    const totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    return (totalMinutes / 60).toFixed(1);
  };

  return (
    <div className="update-attendance-bydate-page">
      {/* Header */}
      <StandardHeader
        title="Update Attendance By Date"
        subtitle={
          <div className="default-times-info">
            <small>Default shift: {defaultTimes.time_in} to {defaultTimes.time_out} ({getRequiredHours()} hours per day)</small>
            <br />
          </div>
        }
      />


      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="attendance-content">
            <div className="debug-info" style={{
              padding: '10px',
              backgroundColor: '#ff4141a4',
              borderRadius: '4px',
              marginBottom: '15px',
              fontSize: '12px'
            }}>
              <strong>📊 Work Hours Balance System:</strong>
              <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                <li><span style={{ color: '#28a745', fontWeight: 'bold' }}>Positive (+)</span> = Extra work / Overtime (worked MORE than required)</li>
                <li><span style={{ color: '#dc3545', fontWeight: 'bold' }}>Negative (-)</span> = Missed hours (worked LESS than required)</li>
                <li><span style={{ color: '#6c757d', fontWeight: 'bold' }}>Zero (0.00)</span> = Worked exact required hours</li>
              </ul>
            </div>

            <section className="date-section">
              <form className="date-form">
                <div className="form-group">
                  <label style={{ color: 'black' }}>Select Date:</label>
                  <input
                    type="date"
                    id="attendanceDate"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setAttendanceData([]);
                      setDateExists(false);
                      setMessage('');
                      setSelectedFile(null);
                      setImportResults(null);
                      setDateFormat('auto');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="date-input"
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <button
                    type="button"
                    className="flatbtn-blu"
                    onClick={handleDateSubmit}
                    disabled={isLoading || !selectedDate}
                  >
                    {isLoading ? 'Loading...' : 'Load Data'}
                  </button>
                </div>
              </form>

              {/* Excel Import Section - Only show when data is loaded */}
              {dateExists && attendanceData.length > 0 && (
                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px'
                }}>
                  <h4 style={{ marginBottom: '15px' }}>📊 Import Time from Excel</h4>

                  {/* Excel Import Status Indicator */}
                  {getExcelImportedCount() > 0 && (
                    <div className="info-note" style={{
                      backgroundColor: '#e8f4fd',
                      padding: '10px',
                      borderRadius: '4px',
                      marginBottom: '15px',
                      borderLeft: '4px solid #28a745',
                      marginTop: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: '#28a745',
                          borderRadius: '50%'
                        }}></div>
                        <div>
                          <strong style={{color:'black'}}>✅ Excel Import Applied</strong> -
                          <span style={{ marginLeft: '5px',color:'Grey' }}>
                            {getExcelImportedCount()} records updated from Excel file
                          </span>
                        </div>
                      </div>
                      <div style={{
                        marginTop: '5px',
                        fontSize: '12px',
                        color: '#28a745',
                        display: 'flex',
                        gap: '15px',
                        flexWrap: 'wrap'
                      }}>
                        <span>• Green-highlighted rows: Excel-imported records</span>
                        <span>• Green time fields: Imported from Excel</span>
                        <span>• Green remarks: Excel remarks</span>
                      </div>
                    </div>
                  )}

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
                          <option value="auto">Auto-detect (Recommended)</option>
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
                        padding: '9px',
                        backgroundColor: '#3498db',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginTop: '27px'
                      }}>
                        <strong>Selected Date:</strong> {selectedDate}
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
                  <div style={{
                    marginBottom: '15px',
                    color: 'DarkGreen'

                  }}>
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
                        disabled={!selectedFile || !selectedDate || attendanceData.length === 0 || isImporting}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: !selectedFile || !selectedDate || attendanceData.length === 0 || isImporting ?
                            '#6c757d' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: !selectedFile || !selectedDate || attendanceData.length === 0 || isImporting ?
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
                        backgroundColor: '#1782d3ff',
                        borderRadius: '4px',
                        fontSize: '14px',
                        marginTop: '10px',
                        color: 'Black'

                      }}>
                        <strong>Selected File:</strong> {selectedFile.name}
                        <span style={{ color: '#000000ff', marginLeft: '10px' }}>
                          ({(selectedFile.size / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#E9ECEF',
                    borderRadius: '4px',
                    fontSize: '12px',
                    marginTop: '10px',
                    color: 'Black'
                  }}>
                    <div><strong>📋 Excel File Requirements:</strong></div>
                    <div>1. <strong>Required columns:</strong> ID, NAME, DATE (in any order)</div>
                    <div>2. <strong>ID column:</strong> Employee number (e.g., 1210710 for O-1210710)</div>
                    <div>3. <strong>DATE column:</strong> Date and time (e.g., 2026-01-06 09:13:26)</div>
                    <div>4. <strong>Matching:</strong> First entry = Time In, Last entry = Time Out</div>
                    <div>5. <strong>Note:</strong> Date must match selected attendance date</div>
                  </div>

                  {/* Import Results Display */}
                  {importResults && (
                    <div style={{
                      marginTop: '15px',
                      padding: '15px',
                      backgroundColor: '#dfdfdfff',
                      border: '1px solid #b8daff',
                      borderRadius: '4px',
                      fontSize: '14px',
                      color: 'black'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '20px' }}>📊</div>
                        <div>
                          <strong>Import Summary:</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px' }}>
                        <div style={{ flex: '1', minWidth: '200px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span>Records in Form:</span>
                            <strong>{attendanceData.length}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span>Records in Excel:</span>
                            <strong>{importResults.totalRecordsInFile}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span>Matched Records:</span>
                            <strong style={{ color: '#28a745' }}>{importResults.matchedCount}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span>Not Matched:</span>
                            <strong style={{ color: '#dc3545' }}>{importResults.unmatchedCount}</strong>
                          </div>
                        </div>

                        <div style={{ flex: '1', minWidth: '200px' }}>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '10px' }}>
                            <strong>Note:</strong> Only Present/Late records will be updated
                          </div>
                          <div style={{ fontSize: '12px', color: '#28a745' }}>
                            ✅ Time entries have been updated for matched employees
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {message && (
              <div className={`message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : message.includes('⚠️') ? 'warning' : 'info'}`}>
                {message}
              </div>
            )}

            {dateExists && attendanceData.length > 0 && (
              <div className="date-display-section">
                <div className="selected-date">
                  <strong>Attendance Date: </strong>
                  <input
                    type="date"
                    value={selectedDate}
                    readOnly
                    className="readonly-date"
                  />
                  <span style={{ marginLeft: '20px', fontSize: '14px', color: '#666' }}>
                    Total Records: {attendanceData.length} | Required Hours: {getRequiredHours()}
                    {getExcelImportedCount() > 0 && (
                      <span style={{ marginLeft: '10px', color: '#28a745', fontSize: '12px', fontWeight: 'bold' }}>
                        ({getExcelImportedCount()} updated from Excel)
                      </span>
                    )}
                  </span>
                </div>
                <div className="action-buttons-top">
                  <button
                    type="button"
                    className="flatbtn-grn"
                    onClick={populateWithDefaultTimes}
                    disabled={isLoading}
                  >
                    Fill Default Times
                  </button>
                </div>
              </div>
            )}

            {dateExists && attendanceData.length > 0 && (
              <section className="attendance-form-section">
                <form onSubmit={handleSubmit}>
                  <div className="datagrid-container">
                    <div className="datagrid">
                      <table className="attendance-table">
                        <thead>
                          <tr>
                            <th>S/No.</th>
                            <th>Name/PAK</th>
                            <th>Status</th>
                            <th>Time In</th>
                            <th>Time Out</th>
                            <th>+/- Hrs</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>

                        <tbody>
  {attendanceData.map((record, index) => {
    const balanceStr = record.balance_hours || '0';
    const isExtraWork = balanceStr.startsWith('+') || parseFloat(balanceStr) > 0;
    const isMissedHours = balanceStr.startsWith('-') || parseFloat(balanceStr) < 0;
    const balanceValue = parseFloat(balanceStr) || 0;
    
    return (
      <tr 
        key={index} 
        className={`${index % 2 === 0 ? 'alt' : ''} ${record.excelImported ? 'excel-imported-row' : ''}`}
        title={record.excelImported ? "This record was updated from Excel import" : ""}
      >
        <td className="serial-number">
          {record.row_number}
          {record.excelImported && <span className="excel-status">Excel</span>}
        </td>
       
        <td>
          <input
            type="text"
            value={record.employee_name +" / " +record.pak}
            readOnly
            className="readonly-input"
            title={record.employee_name}
          />
        </td>
        <td>
          <select
            value={record.status}
            onChange={(e) => handleStatusChange(index, e.target.value)}
            className={`status-select ${record.excelImported ? 'excel-status-field' : ''}`}
            style={{
              backgroundColor: record.status === 'Absent' ? '#f8d7da' : 
                             record.status === 'Leave' ? '#fff3cd' : 
                             record.status === 'Medical Leave' ? '#e8e0ff' : 
                             record.status === 'Half Day' ? '#d1ecf1' : '#ffffff'
            }}
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
            value={record.time_in}
            onChange={(e) => handleTimeChange(index, 'time_in', e.target.value)}
            className={`${getTimeInputClass(record.status)} ${record.excelTimeIn ? 'excel-time-in' : ''}`}
            disabled={record.status === 'Leave' || record.status === 'Absent'}
            step="300"
            title={record.excelTimeIn ? "Time In imported from Excel" : ""}
          />
        </td>
        <td>
          <input
            type="time"
            value={record.time_out}
            onChange={(e) => handleTimeChange(index, 'time_out', e.target.value)}
            className={`${getTimeInputClass(record.status)} ${record.excelTimeOut ? 'excel-time-out' : ''}`}
            disabled={record.status === 'Leave' || record.status === 'Absent'}
            step="300"
            title={record.excelTimeOut ? "Time Out imported from Excel" : ""}
          />
        </td>
        <td>
          <input
            type="text"
            value={record.balance_hours}
            readOnly
            className="readonly-input balance-hours"
            style={{
              color: isExtraWork ? '#28a745' :
                     isMissedHours ? '#dc3545' :
                     '#6c757d',
              fontWeight: 'bold',
              backgroundColor: isExtraWork ? '#d4edda' : 
                              isMissedHours ? '#f8d7da' : '#f8f9fa'
            }}
            title={isExtraWork ? 
              `Extra Work: ${Math.abs(balanceValue).toFixed(2)} hours` : 
              isMissedHours ? 
              `Missed hours: ${Math.abs(balanceValue).toFixed(2)} hours` :
              'Worked exact required hours'
            }
          />
        </td>
        <td>
          <input
            type="text"
            value={record.remarks}
            onChange={(e) => handleEmployeeChange(index, 'remarks', e.target.value)}
            className={`remarks-input ${record.excelRemarks ? 'excel-remarks' : ''}`}
            placeholder="Enter remarks"
            maxLength="100"
            title={record.excelRemarks ? "Remarks imported from Excel" : ""}
          />
        </td>
      </tr>
    );
  })}
</tbody>


                      </table>
                    </div>
                  </div>

                  <div className="summary-info">
                    <div className="summary-cards">
                      <div className="summary-card">
                        <h4>Total Records</h4>
                        <p className="summary-number">{attendanceData.length}</p>
                      </div>
                      <div className="summary-card">
                        <h4>Present</h4>
                        <p className="summary-number">
                          {attendanceData.filter(record => record.status === 'Present').length}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h4>Late</h4>
                        <p className="summary-number">
                          {attendanceData.filter(record => record.status === 'Late').length}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h4>Half Day</h4>
                        <p className="summary-number">
                          {attendanceData.filter(record => record.status === 'Half Day').length}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h4>Absent</h4>
                        <p className="summary-number">
                          {attendanceData.filter(record => record.status === 'Absent').length}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h4>Leave</h4>
                        <p className="summary-number">
                          {attendanceData.filter(record => record.status === 'Leave').length}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h4>Total Extra Work</h4>
                        <p className="summary-number" style={{ color: '#28a745', fontWeight: 'bold' }}>
                          +{totalExtraWork.toFixed(2)}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h4>Total Missed Hours</h4>
                        <p className="summary-number" style={{ color: '#dc3545', fontWeight: 'bold' }}>
                          -{totalMissedHours.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="legend-section">
                    <div className="legend-item">
                      <span className="color-box" style={{ backgroundColor: '#28a745' }}></span>
                      <span>Extra Work / Overtime (+)</span>
                    </div>
                    <div className="legend-item">
                      <span className="color-box" style={{ backgroundColor: '#dc3545' }}></span>
                      <span>Missed Hours (-)</span>
                    </div>
                    <div className="legend-item">
                      <span className="color-box" style={{ backgroundColor: '#f8d7da' }}></span>
                      <span>Absent (-8.00)</span>
                    </div>
                    <div className="legend-item">
                      <span className="color-box" style={{ backgroundColor: '#fff3cd' }}></span>
                      <span>Leave (0.00)</span>
                    </div>
                    <div className="legend-item">
                      <span className="color-box" style={{ backgroundColor: '#d4edda' }}></span>
                      <span>Late</span>
                    </div>
                    <div className="legend-item">
                      <span className="color-box" style={{ backgroundColor: '#d1ecf1' }}></span>
                      <span>Half Day (-4.00)</span>
                    </div>
                  </div>

                  <div className="action-buttons">
                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Updating...' : 'Update Records'}
                    </button>
                    <button
                      type="button"
                      className="reset-btn"
                      onClick={handleReset}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            )}

            {isLoading && attendanceData.length === 0 && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading attendance data...</p>
              </div>
            )}

            {!isLoading && !dateExists && selectedDate && (
              <div className="no-data-message">
                <div className="no-data-icon">📋</div>
                <h3>No Attendance Records Found</h3>
                <p>No attendance records found for <strong>{selectedDate}</strong>.</p>
                <p className="note-text">
                  <strong>Note:</strong> You need to add attendance records first before updating.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateAttendanceByDate;