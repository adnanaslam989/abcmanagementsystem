import React, { useState, useEffect } from 'react';
import './EmployeeDetailView.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const EmployeeDetailView = ({ employeeId, selectedYear, onBack }) => {
  const [employeeData, setEmployeeData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [officialTimeIn, setOfficialTimeIn] = useState(480); // 8:00 AM in minutes

  useEffect(() => {
    if (employeeId && selectedYear) {
      fetchEmployeeDetail();
    }
  }, [employeeId, selectedYear]);

  const fetchEmployeeDetail = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API calls
      setTimeout(() => {
        const mockEmployeeData = {
          pak: employeeId,
          employee_name: 'israr',
          postin_date: '2020-03-15',
          postin_year: '2020',
          current_year: new Date().getFullYear().toString()
        };

        const mockAttendanceRecords = [
          {
            attendence_date: '2024-01-15',
            Name_of_Day: 'Monday',
            status: 'Present',
            time_in: '08:15',
            time_out: '17:00',
            missed_hours: 0.25,
            remarks: '15 minutes late',
            TIME_IN_MINUTES: 495
          },
          {
            attendence_date: '2024-01-16',
            Name_of_Day: 'Tuesday',
            status: 'Leave',
            time_in: '00:00',
            time_out: '00:00',
            missed_hours: 8.0,
            remarks: 'Sick leave',
            TIME_IN_MINUTES: 0
          },
          {
            attendence_date: '2024-01-17',
            Name_of_Day: 'Wednesday',
            status: 'Present',
            time_in: '08:00',
            time_out: '17:00',
            missed_hours: 0,
            remarks: '',
            TIME_IN_MINUTES: 480
          },
          {
            attendence_date: '2024-01-18',
            Name_of_Day: 'Thursday',
            status: 'Short Leave',
            time_in: '08:00',
            time_out: '14:00',
            missed_hours: 3.0,
            remarks: 'Doctor appointment',
            TIME_IN_MINUTES: 480
          },
          {
            attendence_date: '2024-01-19',
            Name_of_Day: 'Friday',
            status: 'Present',
            time_in: '07:45',
            time_out: '17:15',
            missed_hours: 0,
            remarks: 'Early arrival',
            TIME_IN_MINUTES: 465
          }
        ];

        const mockSummaryData = {
          POSTIN_DATE: '2020-03-15',
          Counted_Days: '365',
          allowed_leave_days: 20.0,
          allowed_leave_hours: 160.0,
          availed_leave_hours: 48.5,
          availed_leave_days: 6.06,
          remaining_leave_hours: 111.5,
          remaing_leave_days: 13.94,
          BONUS: 3,
          Balance: 16.94
        };

        setEmployeeData(mockEmployeeData);
        setAttendanceRecords(mockAttendanceRecords);
        setSummaryData(mockSummaryData);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching employee detail:', error);
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    const subject = `Leave Record ${selectedYear} - ${employeeData?.employee_name}`;
    const body = `Please find the attached leave record for ${employeeData?.employee_name} (${employeeData?.pak}) for the year ${selectedYear}.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getStatusStyle = (status, timeInMinutes, dayName) => {
    if (status === 'Leave') {
      return { backgroundColor: '#292929', color: 'white' };
    }
    
    if (timeInMinutes > officialTimeIn && 
        status !== 'Short Leave' && 
        dayName !== 'Saturday' && 
        dayName !== 'Sunday') {
      return { backgroundColor: 'darkorange' };
    }
    
    return {};
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading employee details...</p>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="error-container">
        <p>No employee data found.</p>
        <button onClick={onBack} className="standard-btn standard-btn-secondary">Back to Summary</button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <StandardHeader 
        title={`Employee Detail View - ${selectedYear}`}
        subtitle={`Leave record analysis for ${employeeData.employee_name}`}
        additionalInfo={
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span>PAK: <strong>{employeeData.pak}</strong></span>
            <span>Post In: <strong>{employeeData.postin_date}</strong></span>
          </div>
        }
      />

      <main className="main-content">
        <div className="main-content-wrapper">
          {/* Action Buttons */}
          <div className="action-buttons-top standard-card mb-lg">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex gap-md flex-wrap">
                <button className="standard-btn standard-btn-primary" onClick={handlePrint}>
                  🖨️ Print this page
                </button>
                <button className="standard-btn standard-btn-secondary" onClick={handleSendEmail}>
                  📧 Send Mail
                </button>
                <button className="standard-btn standard-btn-secondary" onClick={onBack}>
                  ↩️ Back to Summary
                </button>
              </div>
            </div>
          </div>

          <div id="printarea">
            {/* Employee Info Header */}
            <div className="detail-header standard-card mb-lg">
              <div className="d-flex justify-content-between align-items-center flex-wrap">
                <div className="header-left">
                  <h3>Leave Record</h3>
                  <h2>{selectedYear}</h2>
                </div>
                <div className="employee-info">
                  <div className="employee-text">
                    <strong>{employeeData.employee_name}</strong>
                    <br />
                    <strong>{employeeData.pak}</strong>
                  </div>
                  <div className="employee-photo">
                    <div className="photo-placeholder">
                      {employeeData.employee_name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Records Table */}
            <div className="section standard-card mb-lg">
              <h3>Attendance Records</h3>
              <div className="datagrid">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th width="100px">Date</th>
                      <th>Status</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Leave Hours</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                        <td>{record.attendence_date}</td>
                        <td style={getStatusStyle(record.status, record.TIME_IN_MINUTES, record.Name_of_Day)}>
                          {record.status}
                        </td>
                        <td style={getStatusStyle(record.status, record.TIME_IN_MINUTES, record.Name_of_Day)}>
                          {record.time_in}
                        </td>
                        <td>{record.time_out}</td>
                        <td>{record.missed_hours.toFixed(2)}</td>
                        <td>{record.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Section */}
            <div className="section standard-card mb-lg">
              <h2>Summary</h2>
              <div className="datagrid">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Post In Date</th>
                      <th>Counted Days</th>
                      <th>Allowed Leave Days</th>
                      <th>Allowed Leave Hours</th>
                      <th>Availed Leave Hours</th>
                      <th>Availed Leave Days</th>
                      <th>Remaining Leave Hours</th>
                      <th>Remaining Leave Days</th>
                      <th>Bonus</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData && (
                      <tr>
                        <td>{summaryData.POSTIN_DATE}</td>
                        <td>{summaryData.Counted_Days}</td>
                        <td>{summaryData.allowed_leave_days.toFixed(2)}</td>
                        <td>{summaryData.allowed_leave_hours.toFixed(2)}</td>
                        <td>{summaryData.availed_leave_hours.toFixed(2)}</td>
                        <td>{summaryData.availed_leave_days.toFixed(2)}</td>
                        <td>{summaryData.remaining_leave_hours.toFixed(2)}</td>
                        <td>{summaryData.remaing_leave_days.toFixed(2)}</td>
                        <td>{summaryData.BONUS}</td>
                        <td>{summaryData.Balance.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Report Footer */}
            <div className="report-footer standard-card text-center">
              <p>Report generated on: {new Date().toLocaleDateString()}</p>
              <p>Civilian Manhour Report System</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDetailView;