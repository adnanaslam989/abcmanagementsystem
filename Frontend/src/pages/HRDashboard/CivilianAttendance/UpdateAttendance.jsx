import { useState, useEffect } from 'react';
import './UpdateAttendance.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const API_BASE = 'http://10.0.0.7:5000/api/employee';

const UpdateAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState(['Present', 'Absent', 'Late', 'Half Day', 'Leave']);
  const [defaultTimes, setDefaultTimes] = useState({
    time_in: '08:00',
    time_out: '17:00'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isBiometricOnline, setIsBiometricOnline] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [biometricData, setBiometricData] = useState({});

  useEffect(() => {
    // Check biometric system status
    checkBiometricStatus();
    // Fetch default times
    fetchDefaultTimes();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      // This would be a real API call to check biometric system
      setIsBiometricOnline(true); // Assuming online for now
    } catch (error) {
      console.error('Error checking biometric status:', error);
      setIsBiometricOnline(false);
    }
  };

  const fetchDefaultTimes = async () => {
    try {
      const response = await fetch(`${API_BASE}/attendance/default-times`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDefaultTimes({
            time_in: result.default_time_in,
            time_out: result.default_time_out
          });
          console.log('Default times loaded:', result);
        }
      }
    } catch (error) {
      console.error('Error fetching default times:', error);
    }
  };

  const calculateMissedHours = (timeIn, status) => {
    if (status === 'Absent' || status === 'Leave') {
      return 8; // Full day missed
    }
    
    if (status === 'Half Day') {
      return 4; // Half day missed
    }
    
    if (!timeIn || status === 'Present' || status === 'Late') {
      if (!timeIn) return 0; // No time in, assume on time
      
      // Calculate missed hours based on time_in compared to default time
      let formattedTime = timeIn;
      if (formattedTime.length === 4) {
        formattedTime = '0' + formattedTime;
      }
      
      const [hours, minutes] = formattedTime.split(':').map(Number);
      const [defaultHour, defaultMinute] = defaultTimes.time_in.split(':').map(Number);
      const defaultTimeInMinutes = defaultHour * 60 + defaultMinute;
      const actualTimeIn = hours * 60 + minutes;
      
      if (actualTimeIn > defaultTimeInMinutes) {
        const missedHours = ((actualTimeIn - defaultTimeInMinutes) / 60);
        const roundedHours = Math.round(missedHours * 100) / 100;
        
        // For Late status, minimum 0.25 hours if late
        if (status === 'Late' && roundedHours === 0) {
          return 0.25;
        }
        return roundedHours;
      }
    }
    
    return 0;
  };

  const fetchAttendanceData = async () => {
    if (!selectedDate) {
      setMessage('Please select a date first');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      console.log('Fetching attendance for date:', selectedDate);
      
      const response = await fetch(`${API_BASE}/attendance/date-details/${selectedDate}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load data');
      }
      
      // Update default times if returned with data
      if (result.default_time_in && result.default_time_out) {
        setDefaultTimes({
          time_in: result.default_time_in,
          time_out: result.default_time_out
        });
      }
      
      // Process the data
      const processedData = result.attendance.map((record, index) => {
        // Format time for display (handle 24-hour format)
        const formatTimeForDisplay = (time) => {
          if (!time) return '';
          // Ensure time is in HH:MM format
          const [hours, minutes] = time.split(':');
          // Return in 24-hour format for input field
          return `${hours.toString().padStart(2, '0')}:${minutes}`;
        };
        
        const timeIn = formatTimeForDisplay(record.time_in);
        const status = record.STATUS || 'Present';
        const missedHours = calculateMissedHours(timeIn, status);
        
        return {
          row_number: (index + 1).toString(),
          pak: record.PAK,
          employee_name: record.EMPLOYEE_NAME || 'Unknown',
          appointment: record.APPOINTMENT || 'N/A',
          attendence_date: record.attendence_date, // Use the formatted date from database
          status: status,
          time_in: timeIn,
          time_out: formatTimeForDisplay(record.time_out),
          missed_hours: record.MISSED_HOURS || missedHours,
          remarks: record.REMARKS || '',
          attendence_id: record.ATTENDENCE_ID,
          // Check if time_out is missing
          needs_time_out: !record.time_out || record.time_out === '00:00' || record.time_out === null
        };
      });
      
      setAttendanceData(processedData);
      
      if (processedData.length === 0) {
        setMessage(`No attendance records found for ${selectedDate}`);
      } else {
        setMessage(`Loaded ${processedData.length} records for ${selectedDate} (Default Time: ${defaultTimes.time_in} - ${defaultTimes.time_out})`);
      }
      
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setMessage(`❌ Error: ${error.message}`);
      
      // Fallback to mock data for testing
      const mockData = getMockData();
      setAttendanceData(mockData);
      setMessage('Using mock data. Please check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const getMockData = () => {
    // Return mock data for fallback
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        row_number: '1',
        pak: 'PAK001',
        employee_name: 'Israr',
        appointment: 'Engineer',
        attendence_date: today,
        status: 'Present',
        time_in: '08:15',
        time_out: '17:05',
        missed_hours: 0.25,
        remarks: '',
        attendence_id: '1',
        needs_time_out: false
      },
      {
        row_number: '2',
        pak: 'PAK002',
        employee_name: 'Nafees',
        appointment: 'Designer',
        attendence_date: today,
        status: 'Present',
        time_in: '08:05',
        time_out: '',
        missed_hours: 0,
        remarks: 'Came early',
        attendence_id: '2',
        needs_time_out: true
      }
    ];
  };

  const handleEmployeeChange = (index, field, value) => {
    const updatedData = [...attendanceData];
    
    if (field === 'status') {
      updatedData[index] = {
        ...updatedData[index],
        [field]: value
      };
      
      // If status changes to Absent or Leave, clear time fields
      if (value === 'Absent' || value === 'Leave') {
        updatedData[index].time_in = '';
        updatedData[index].time_out = '';
        // Calculate missed hours based on new status
        updatedData[index].missed_hours = calculateMissedHours('', value);
      } else if (value === 'Half Day') {
        // Calculate missed hours for half day
        updatedData[index].missed_hours = calculateMissedHours(updatedData[index].time_in, value);
      } else if (value === 'Present' || value === 'Late') {
        // If status changes back to Present/Late, set default time_in if empty
        if (!updatedData[index].time_in) {
          updatedData[index].time_in = defaultTimes.time_in;
        }
        // Recalculate missed hours
        updatedData[index].missed_hours = calculateMissedHours(updatedData[index].time_in, value);
      }
    } else if (field === 'time_in') {
      // Handle time input with proper 24-hour format
      let formattedTime = value;
      
      // If user types 15, convert to 15:00
      if (formattedTime.length === 2 && /^\d{2}$/.test(formattedTime)) {
        const hour = parseInt(formattedTime, 10);
        if (hour >= 0 && hour <= 23) {
          formattedTime = `${formattedTime}:00`;
        }
      }
      // If user types 15:3, convert to 15:30
      else if (formattedTime.length === 4 && formattedTime.includes(':')) {
        const [hours, minutes] = formattedTime.split(':');
        if (minutes.length === 1) {
          formattedTime = `${hours}:${minutes}0`;
        }
      }
      
      updatedData[index] = {
        ...updatedData[index],
        [field]: formattedTime
      };
      
      // Recalculate missed hours based on new time_in
      const newMissedHours = calculateMissedHours(formattedTime, updatedData[index].status);
      updatedData[index].missed_hours = newMissedHours;
    } else if (field === 'time_out') {
      // Handle time_out input with proper 24-hour format
      let formattedTime = value;
      
      // If user types 15, convert to 15:00
      if (formattedTime.length === 2 && /^\d{2}$/.test(formattedTime)) {
        const hour = parseInt(formattedTime, 10);
        if (hour >= 0 && hour <= 23) {
          formattedTime = `${formattedTime}:00`;
        }
      }
      // If user types 15:3, convert to 15:30
      else if (formattedTime.length === 4 && formattedTime.includes(':')) {
        const [hours, minutes] = formattedTime.split(':');
        if (minutes.length === 1) {
          formattedTime = `${hours}:${minutes}0`;
        }
      }
      
      updatedData[index] = {
        ...updatedData[index],
        [field]: formattedTime
      };
    } else {
      updatedData[index] = {
        ...updatedData[index],
        [field]: value
      };
    }
    
    setAttendanceData(updatedData);
  };

  const formatTimeForInput = (time) => {
    if (!time) return '';
    // Ensure time is in HH:MM format for input field
    const [hours, minutes] = time.split(':');
    return `${hours.toString().padStart(2, '0')}:${minutes || '00'}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (attendanceData.length === 0) {
      setMessage('No attendance data to update');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Prepare data for submission
      const updateData = {
        date: selectedDate,
        attendance_records: attendanceData.map(record => ({
          pak: record.pak,
          attendence_id: record.attendence_id,
          status: record.status,
          time_in: record.time_in ? formatTimeForInput(record.time_in) : '',
          time_out: record.time_out ? formatTimeForInput(record.time_out) : '',
          remarks: record.remarks
        }))
      };

      console.log('Submitting update data:', updateData);

      const response = await fetch(`${API_BASE}/attendance/update-details`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

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
        throw new Error(result.message || 'Failed to update attendance');
      }

      setMessage(`✅ Successfully updated ${result.updatedCount || 0} records! (Default Time: ${defaultTimes.time_in})`);
      
      // Refresh data after successful update
      setTimeout(() => {
        fetchAttendanceData();
      }, 2000);

    } catch (error) {
      console.error('Error updating attendance:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBiometricData = async () => {
    if (!selectedDate) {
      setMessage('Please select a date first');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/attendance/biometric-data/${selectedDate}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch biometric data: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch biometric data');
      }

      setBiometricData(result.biometric_data);
      setMessage(`✅ Fetched biometric data for ${result.count} employees`);

      // Apply biometric data to attendance records
      const updatedData = attendanceData.map(record => {
        const bioData = result.biometric_data[record.pak];
        if (bioData) {
          const newTimeIn = bioData.time_in;
          const newMissedHours = calculateMissedHours(newTimeIn, record.status);
          
          return {
            ...record,
            time_in: bioData.time_in,
            time_out: bioData.time_out,
            missed_hours: newMissedHours
          };
        }
        return record;
      });

      setAttendanceData(updatedData);
      
    } catch (error) {
      console.error('Error fetching biometric data:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setAttendanceData([]);
    setMessage('');
  };

  const handleRefresh = () => {
    setAttendanceData([]);
    setMessage('');
    fetchAttendanceData();
  };

  return (
    <div className="update-attendance-page">
      {/* Header */}
      <header className="attendance-header">
        <div className="header-container">
          <h1>Update Civilian Attendance</h1>
          <p>Update attendance records for civilian employees</p>
          
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="attendance-content">
            {/* Date Selection & System Status */}
            <div className="controls-section">
              <div className="date-selection">
                <div className="form-group">
                  <label htmlFor="attendanceDate">Select Date:</label>
                  <input
                    type="date"
                    id="attendanceDate"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="date-input"
                  />
                  <button
                    type="button"
                    className="load-btn"
                    onClick={fetchAttendanceData}
                    disabled={isLoading || !selectedDate}
                  >
                    {isLoading ? 'Loading...' : 'Load Attendance'}
                  </button>
                </div>
              </div>
              
              <div className="system-status">
                <div className="status-indicator">
                  <span className={`status-dot ${isBiometricOnline ? 'online' : 'offline'}`}></span>
                  <span>Biometric System: {isBiometricOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}`}>
                {message}
              </div>
            )}

            {/* Action Buttons */}
            {attendanceData.length > 0 && (
              <div className="action-buttons-top">
                <button
                  type="button"
                  className="action-btn biometric-btn"
                  onClick={fetchBiometricData}
                  disabled={!isBiometricOnline || isLoading}
                >
                  Apply Biometric Data
                </button>
                <button
                  type="button"
                  className="action-btn save-btn"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save All Changes'}
                </button>
                <button
                  type="button"
                  className="action-btn refresh-btn"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  Refresh
                </button>
              </div>
            )}

            {/* Attendance Update Form */}
            {attendanceData.length > 0 ? (
              <section className="attendance-form-section">
                <form onSubmit={handleSubmit}>
                  <div className="section-header">
                    <h3>Attendance Records for {selectedDate}</h3>
                    <p>
                      Total: {attendanceData.length} records | 
                      Missing Time-Out: {attendanceData.filter(r => r.needs_time_out).length} |
                      Default Time: {defaultTimes.time_in} - {defaultTimes.time_out}
                    </p>
                  </div>

                  <div className="datagrid">
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th>S/No.</th>
                          <th>PAK</th>
                          <th>Employee Name</th>
                          <th>Appointment</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Time In</th>
                          <th>Time Out</th>
                          <th>Missed Hours</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.map((record, index) => (
                          <tr key={index} className={`${index % 2 === 0 ? 'alt' : ''} ${record.needs_time_out ? 'needs-update' : ''}`}>
                            <td className="serial-number">{record.row_number}</td>
                            <td>
                              <input
                                type="text"
                                value={record.pak}
                                readOnly
                                className="readonly-input"
                                disabled
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.employee_name}
                                readOnly
                                className="readonly-input"
                                disabled
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.appointment}
                                readOnly
                                className="readonly-input"
                                disabled
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.attendence_date}
                                readOnly
                                className="readonly-input date-display"
                                disabled
                              />
                            </td>
                            <td>
                              <select
                                value={record.status}
                                onChange={(e) => handleEmployeeChange(index, 'status', e.target.value)}
                                className="status-select"
                                disabled={isLoading}
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
                                onChange={(e) => handleEmployeeChange(index, 'time_in', e.target.value)}
                                className={`time-input ${!record.time_in || record.time_in === defaultTimes.time_in ? 'default-time' : ''}`}
                                disabled={record.status === 'Absent' || record.status === 'Leave' || isLoading}
                                step="60"
                              />
                            </td>
                            <td>
                              <input
                                type="time"
                                value={record.time_out}
                                onChange={(e) => handleEmployeeChange(index, 'time_out', e.target.value)}
                                className={`time-input ${!record.time_out || record.time_out === defaultTimes.time_out ? 'default-time' : ''}`}
                                disabled={isLoading}
                                step="60"
                              />
                              {record.needs_time_out && (
                                <span className="warning-indicator" title="Time-out required">⚠️</span>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.missed_hours.toFixed(2)}
                                readOnly
                                className="hours-input readonly"
                                disabled
                                title={`Automatically calculated based on Time In and Status (Default: ${defaultTimes.time_in})`}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.remarks}
                                onChange={(e) => handleEmployeeChange(index, 'remarks', e.target.value)}
                                className="remarks-input"
                                placeholder="Enter remarks"
                                disabled={isLoading}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  <div className="legend-section">
                    <div className="legend-item">
                      <span className="color-box needs-update"></span>
                      <span>Missing Time-Out (Required)</span>
                    </div>
                    <div className="legend-item">
                      <span className="color-box default-time"></span>
                      <span>Default Time ({defaultTimes.time_in} - {defaultTimes.time_out})</span>
                    </div>
                    <div className="legend-item">
                      <span className="color-box biometric-data"></span>
                      <span>Biometric Data Applied</span>
                    </div>
                    <div className="legend-item">
                      <span className="color-box readonly-field"></span>
                      <span>Auto-calculated Field</span>
                    </div>
                  </div>
                </form>
              </section>
            ) : (
              /* No Data Message */
              <div className="no-data-message">
                {isLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading attendance data...</p>
                  </div>
                ) : (
                  <>
                    <h3>No Attendance Data Loaded</h3>
                    <p>Select a date and click "Load Attendance" to view and update records.</p>
                    <div className="instructions">
                      <h4>How to use:</h4>
                      <ol>
                        <li>Select a date from the calendar</li>
                        <li>Click "Load Attendance" to fetch records</li>
                        <li>Edit status, time, and remarks as needed</li>
                        <li>Missed Hours are automatically calculated based on default time ({defaultTimes.time_in})</li>
                        <li>Click "Apply Biometric Data" to fetch from biometric device</li>
                        <li>Click "Save All Changes" to update database</li>
                      </ol>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateAttendance;