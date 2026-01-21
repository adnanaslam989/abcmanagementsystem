import { useState, useEffect } from 'react';
import './HolidayWork.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const HolidayWork = () => {
  const [formData, setFormData] = useState({
    date: '',
    employee: '',
    time_in: '',
    time_out: '',
    remarks: 'Work On Holiday.'
  });
  const [employees, setEmployees] = useState([]);
  const [defaultTimes, setDefaultTimes] = useState({
    time_in: '08:00',
    time_out: '17:00'
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentHolidayWork, setRecentHolidayWork] = useState([]);
  const [isCheckingHoliday, setIsCheckingHoliday] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalRecord, setOriginalRecord] = useState(null);

  const API_BASE_URL = 'http://10.0.0.7:5000';

  useEffect(() => {
    fetchDefaultData();
    fetchRecentHolidayWork();
  }, []);

  const fetchDefaultData = async () => {
    try {
      setIsLoading(true);
      
      const timesResponse = await fetch(`${API_BASE_URL}/api/employee/working-hours`);
      const timesData = await timesResponse.json();
      
      if (timesData.success) {
        setDefaultTimes({
          time_in: timesData.time_in,
          time_out: timesData.time_out
        });
        
        setFormData(prev => ({
          ...prev,
          time_in: timesData.time_in,
          time_out: timesData.time_out
        }));
      }
      
      const employeesResponse = await fetch(`${API_BASE_URL}/api/employee/current-employees`);
      const employeesData = await employeesResponse.json();
      
      if (employeesData.success) {
        const formattedEmployees = employeesData.employees.map(emp => {
          const [pak, appointment, name] = emp.split(' : ');
          return {
            original: emp,
            display: `${name} (${pak}) - ${appointment}`
          };
        });
        setEmployees(formattedEmployees);
      }
      
      setIsLoading(false);
    } catch (error) {
      setMessage('Error loading default data');
      console.error('Error fetching default data:', error);
      setIsLoading(false);
    }
  };

  const fetchRecentHolidayWork = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employee/holiday-work/recent`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecentHolidayWork(data.holiday_work);
        }
      }
    } catch (error) {
      console.error('Error fetching recent holiday work:', error);
    }
  };

  const checkIfHoliday = (dateString) => {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const getDayName = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const handleDateChange = async (date) => {
    setFormData(prev => ({
      ...prev,
      date: date
    }));
    
    setIsEditMode(false);
    setExistingRecord(null);
    setOriginalRecord(null);
    
    if (date) {
      setIsCheckingHoliday(true);
      const isHoliday = checkIfHoliday(date);
      const dayName = getDayName(date);
      
      if (!isHoliday) {
        setMessage(`⚠️ Selected date (${dayName}) is not a Saturday or Sunday. Please select a weekend date for holiday work.`);
        setIsCheckingHoliday(false);
        return;
      } else {
        setMessage(`✅ Selected date: ${date} (${dayName})`);
      }
      
      if (formData.employee) {
        await checkExistingRecord(date, formData.employee);
      }
      
      setIsCheckingHoliday(false);
    }
  };

  const checkExistingRecord = async (date, employee) => {
    if (!date || !employee) return;
    
    try {
      const selectedEmployee = employees.find(emp => emp.display === employee);
      if (!selectedEmployee) return;
      
      const pak = selectedEmployee.original.split(' : ')[0];
      const response = await fetch(
        `${API_BASE_URL}/api/employee/holiday-work/check-with-data?date=${date}&pak=${pak}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.exists && data.record) {
          setExistingRecord(data.record);
          setMessage(`📝 Holiday work record found for ${employee.split(' - ')[0]} on ${date}. You can edit it below.`);
          
          setFormData({
            date: date,
            employee: employee,
            time_in: data.record.time_in || defaultTimes.time_in,
            time_out: data.record.time_out || defaultTimes.time_out,
            remarks: data.record.remarks || 'Work On Holiday.'
          });
          
          setOriginalRecord({
            time_in: data.record.time_in || defaultTimes.time_in,
            time_out: data.record.time_out || defaultTimes.time_out,
            remarks: data.record.remarks || 'Work On Holiday.'
          });
          
          setIsEditMode(true);
        } else {
          setExistingRecord(null);
          setIsEditMode(false);
          if (data.exists) {
            setMessage('⚠️ Record exists but could not load details.');
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing record:', error);
    }
  };

  const handleInputChange = (field, value) => {
    const updatedFormData = {
      ...formData,
      [field]: value
    };
    
    setFormData(updatedFormData);
    
    if (field === 'employee' && formData.date) {
      checkExistingRecord(formData.date, value);
    }
  };

  const calculateWorkHours = () => {
    const { time_in, time_out } = formData;
    
    if (!time_in || !time_out) return { hours: 0, minutes: 0, decimal: 0 };
    
    const [inHours, inMinutes] = time_in.split(':').map(Number);
    const [outHours, outMinutes] = time_out.split(':').map(Number);
    
    const totalInMinutes = inHours * 60 + inMinutes;
    const totalOutMinutes = outHours * 60 + outMinutes;
    
    const workMinutes = totalOutMinutes - totalInMinutes;
    const hours = Math.floor(workMinutes / 60);
    const minutes = workMinutes % 60;
    const decimal = parseFloat((workMinutes / 60).toFixed(2));
    
    return { hours, minutes, decimal };
  };

  const formatDuration = () => {
    const { hours, minutes, decimal } = calculateWorkHours();
    return `${hours} hours ${minutes} minutes (${decimal} hours)`;
  };

  const hasChanges = () => {
    if (!originalRecord || !isEditMode) return true;
    
    return (
      formData.time_in !== originalRecord.time_in ||
      formData.time_out !== originalRecord.time_out ||
      formData.remarks !== originalRecord.remarks
    );
  };

  const validateForm = () => {
    const { date, employee, time_in, time_out } = formData;

    if (!date) {
      setMessage('Please select a date');
      return false;
    }

    const isHoliday = checkIfHoliday(date);
    if (!isHoliday) {
      setMessage('Please select a Saturday or Sunday for holiday work');
      return false;
    }

    if (!employee || employee === '--Select Employee--') {
      setMessage('Please select an employee');
      return false;
    }

    if (!time_in || !time_out) {
      setMessage('Both time-in and time-out are required');
      return false;
    }

    const [inHours, inMinutes] = time_in.split(':').map(Number);
    const [outHours, outMinutes] = time_out.split(':').map(Number);
    
    const totalInMinutes = inHours * 60 + inMinutes;
    const totalOutMinutes = outHours * 60 + outMinutes;

    if (totalOutMinutes <= totalInMinutes) {
      setMessage('Time-out must be after time-in');
      return false;
    }

    const workMinutes = totalOutMinutes - totalInMinutes;
    if (workMinutes < 60) {
      setMessage('Minimum work duration should be at least 1 hour');
      return false;
    }

    if (workMinutes > 12 * 60) {
      setMessage('Maximum work duration cannot exceed 12 hours');
      return false;
    }

    if (isEditMode && !hasChanges()) {
      setMessage('No changes detected. Please make changes to update the record.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const selectedEmployee = employees.find(emp => emp.display === formData.employee);
      if (!selectedEmployee) {
        throw new Error('Employee not found');
      }
      
      const [pak, appointment, employeeName] = selectedEmployee.original.split(' : ');
      
      const { decimal: workHours } = calculateWorkHours();
      
      const holidayCreditHours = workHours;
      
      const submitData = {
        date: formData.date,
        pak: pak,
        employee_name: employeeName,
        appointment: appointment,
        time_in: formData.time_in,
        time_out: formData.time_out,
        work_hours: workHours,
        holiday_credit_hours: holidayCreditHours,
        remarks: formData.remarks,
        status: 'Holiday Work'
      };

      console.log('Submitting holiday work data:', submitData);

      let response;
      
      if (isEditMode && existingRecord) {
        submitData.attendence_id = existingRecord.ATTENDENCE_ID;
        response = await fetch(`${API_BASE_URL}/api/employee/holiday-work/update`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(submitData)
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/employee/holiday-work/save`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(submitData)
        });
      }

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Holiday work data ${isEditMode ? 'updated' : 'saved'} successfully!`);
        
        fetchRecentHolidayWork();
        
        setTimeout(() => {
          setMessage('');
          setFormData({
            date: '',
            employee: '',
            time_in: defaultTimes.time_in,
            time_out: defaultTimes.time_out,
            remarks: 'Work On Holiday.'
          });
          setExistingRecord(null);
          setIsEditMode(false);
          setOriginalRecord(null);
        }, 3000);
      } else {
        setMessage(`❌ Failed to ${isEditMode ? 'update' : 'save'}: ${result.message}`);
      }

      setIsLoading(false);

    } catch (error) {
      setMessage(`❌ Failed to ${isEditMode ? 'update' : 'save'} holiday work data`);
      setIsLoading(false);
      console.error('Error saving holiday work data:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      date: '',
      employee: '',
      time_in: defaultTimes.time_in,
      time_out: defaultTimes.time_out,
      remarks: 'Work On Holiday.'
    });
    setMessage('');
    setExistingRecord(null);
    setIsEditMode(false);
    setOriginalRecord(null);
  };

  const isFormValid = formData.date && 
                     formData.employee && 
                     formData.employee !== '--Select Employee--' &&
                     checkIfHoliday(formData.date);

  const DatePicker = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const isDateDisabled = (dateString) => {
      const date = new Date(dateString);
      const dayOfWeek = date.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    };

    const handleDateInput = (e) => {
      const selectedDate = e.target.value;
      
      if (selectedDate && isDateDisabled(selectedDate)) {
        setMessage('⚠️ Please select a Saturday or Sunday only.');
        e.target.value = formData.date;
        return;
      }
      
      handleDateChange(selectedDate);
    };

    return (
      <input
        type="date"
        name="date"
        value={formData.date}
        onChange={handleDateInput}
        className="form-input"
        required
        max={today}
        style={{
          borderColor: checkIfHoliday(formData.date) ? '#28a745' : '#dc3545',
          borderWidth: '2px'
        }}
      />
    );
  };

  const loadRecordForEdit = (record) => {
    const employeeDisplay = `${record.EMPLOYEE_NAME} (${record.pak}) - ${record.APPOINTMENT}`;
    
    setFormData({
      date: record.attendence_date,
      employee: employeeDisplay,
      time_in: record.time_in || defaultTimes.time_in,
      time_out: record.time_out || defaultTimes.time_out,
      remarks: record.remarks || 'Work On Holiday.'
    });
    
    setExistingRecord(record);
    setOriginalRecord({
      time_in: record.time_in || defaultTimes.time_in,
      time_out: record.time_out || defaultTimes.time_out,
      remarks: record.remarks || 'Work On Holiday.'
    });
    
    setIsEditMode(true);
    setMessage(`📝 Editing existing holiday work record for ${record.EMPLOYEE_NAME} on ${record.attendence_date}`);
  };

  return (
    <div className="page-container">
      <StandardHeader 
        title="Work On Holiday (Saturday/Sunday)"
        additionalInfo={
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
            Default working hours: {defaultTimes.time_in} - {defaultTimes.time_out}
          </div>
        }
      />

      <main className="main-content">
        <div className="main-content-wrapper">
          <div className="a4-container standard-card">
            <div className="holiday-content">
              {/* Message Display */}
              {message && (
                <div className={`standard-message ${message.includes('✅') ? 'standard-message-success' : message.includes('❌') ? 'standard-message-error' : message.includes('⚠️') ? 'standard-message-warning' : message.includes('📝') ? 'standard-message-info' : 'standard-message-info'}`}>
                  <div dangerouslySetInnerHTML={{ __html: message }} />
                </div>
              )}

              {/* Edit Mode Indicator */}
              {isEditMode && existingRecord && (
                <div className="edit-mode-indicator" style={{
                  padding: '12px',
                  backgroundColor: '#e8f4fd',
                  borderRadius: '6px',
                  marginBottom: '15px',
                  border: '2px solid #17a2b8',
                  color: '#0c5460'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      backgroundColor: '#17a2b8', 
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      ✏️ EDIT MODE
                    </span>
                    <span>Editing holiday work for <strong>{existingRecord.EMPLOYEE_NAME}</strong> on <strong>{existingRecord.attendence_date}</strong></span>
                  </div>
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '14px',
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    border: '1px solid #d1ecf1'
                  }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div>
                        <span style={{ color: '#6c757d' }}>Original:</span>
                        <div style={{ fontWeight: 'bold', color: '#dc3545' }}>
                          {originalRecord?.time_in} to {originalRecord?.time_out}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#6c757d' }}>Current:</span>
                        <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                          {formData.time_in} to {formData.time_out}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#6c757d' }}>Credit Hours:</span>
                        <div style={{ fontWeight: 'bold', color: '#17a2b8' }}>
                          +{calculateWorkHours().decimal.toFixed(2)} hrs
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Holiday Work Form */}
              <section className="holiday-form-section">
                <form onSubmit={handleSubmit}>
                  <div className="datagrid">
                    <table className="holiday-form-table">
                      <thead>
                        <tr>
                          <th colSpan="2" style={{
                            backgroundColor: isEditMode ? '#17a2b8' : '#28a745',
                            color: 'white'
                          }}>
                            {isEditMode ? '✏️ Edit Holiday Work Entry' : '➕ New Holiday Work Entry'} 
                            <span style={{ float: 'right', fontSize: '14px', fontWeight: 'normal' }}>
                              (Saturday/Sunday Only)
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="label">Date (Weekend Only):</td>
                          <td>
                            <DatePicker />
                            {formData.date && (
                              <span style={{ 
                                marginLeft: '10px', 
                                padding: '4px 8px',
                                fontSize: '13px', 
                                color: checkIfHoliday(formData.date) ? '#155724' : '#721c24',
                                backgroundColor: checkIfHoliday(formData.date) ? '#d4edda' : '#f8d7da',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                              }}>
                                {getDayName(formData.date)}
                              </span>
                            )}
                          </td>
                        </tr>
                        
                        <tr className="alt">
                          <td className="label">Employee:</td>
                          <td>
                            <select
                              name="employee"
                              value={formData.employee}
                              onChange={(e) => handleInputChange('employee', e.target.value)}
                              className="form-select"
                              required
                              disabled={isLoading || employees.length === 0}
                              style={{
                                borderColor: existingRecord ? '#17a2b8' : '#ced4da',
                                borderWidth: '2px'
                              }}
                            >
                              <option value="">--Select Employee--</option>
                              {employees.map((employee, index) => (
                                <option key={index} value={employee.display}>
                                  {employee.display}
                                </option>
                              ))}
                            </select>
                            {existingRecord && (
                              <div style={{ 
                                marginTop: '8px',
                                padding: '6px',
                                backgroundColor: '#e8f4fd',
                                borderRadius: '4px',
                                border: '1px solid #bee5eb'
                              }}>
                                <span style={{ 
                                  color: '#0c5460',
                                  fontSize: '13px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <span style={{ 
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px'
                                  }}>✓</span>
                                  Record exists - You can edit the times below
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td className="label">Time In:</td>
                          <td>
                            <input
                              type="time"
                              name="time_in"
                              value={formData.time_in}
                              onChange={(e) => handleInputChange('time_in', e.target.value)}
                              className="form-input"
                              required
                              step="300"
                              style={{
                                borderColor: isEditMode && hasChanges() && formData.time_in !== originalRecord?.time_in ? '#17a2b8' : '#ced4da'
                              }}
                            />
                            {isEditMode && hasChanges() && formData.time_in !== originalRecord?.time_in && (
                              <span style={{ 
                                marginLeft: '10px',
                                fontSize: '12px',
                                color: '#17a2b8',
                                fontWeight: 'bold'
                              }}>
                                Changed
                              </span>
                            )}
                          </td>
                        </tr>

                        <tr className="alt">
                          <td className="label">Time Out:</td>
                          <td>
                            <input
                              type="time"
                              name="time_out"
                              value={formData.time_out}
                              onChange={(e) => handleInputChange('time_out', e.target.value)}
                              className="form-input"
                              required
                              step="300"
                              style={{
                                borderColor: isEditMode && hasChanges() && formData.time_out !== originalRecord?.time_out ? '#17a2b8' : '#ced4da'
                              }}
                            />
                            {isEditMode && hasChanges() && formData.time_out !== originalRecord?.time_out && (
                              <span style={{ 
                                marginLeft: '10px',
                                fontSize: '12px',
                                color: '#17a2b8',
                                fontWeight: 'bold'
                              }}>
                                Changed
                              </span>
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td className="label">Work Duration:</td>
                          <td>
                            <div className="duration-display" style={{
                              padding: '12px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '6px',
                              border: '2px solid #e9ecef'
                            }}>
                              <div style={{ 
                                fontSize: '16px', 
                                fontWeight: 'bold',
                                color: '#28a745'
                              }}>
                                {formatDuration()}
                              </div>
                              <div style={{ 
                                fontSize: '13px', 
                                color: '#155724', 
                                marginTop: '6px',
                                padding: '6px',
                                backgroundColor: '#d4edda',
                                borderRadius: '4px'
                              }}>
                                <strong>Note:</strong> This will be added as <strong>+{calculateWorkHours().decimal.toFixed(2)} hours</strong> credit to employee's leave balance
                              </div>
                            </div>
                          </td>
                        </tr>

                        <tr className="alt">
                          <td className="label">Remarks:</td>
                          <td>
                            <textarea
                              rows="3"
                              name="remarks"
                              value={formData.remarks}
                              onChange={(e) => handleInputChange('remarks', e.target.value)}
                              className="remarks-textarea"
                              placeholder="Enter remarks for holiday work"
                              style={{
                                borderColor: isEditMode && hasChanges() && formData.remarks !== originalRecord?.remarks ? '#17a2b8' : '#ced4da'
                              }}
                            />
                            {isEditMode && hasChanges() && formData.remarks !== originalRecord?.remarks && (
                              <div style={{ 
                                marginTop: '8px',
                                fontSize: '12px',
                                color: '#17a2b8',
                                fontWeight: 'bold'
                              }}>
                                Remarks changed
                            </div>
                            )}
                          </td>
                        </tr>
                        
                        <tr>
                          <td colSpan="2" className="action-buttons-cell" style={{ padding: '20px' }}>
                            <div className="button-container" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                              <button
                                type="submit"
                                className="standard-btn standard-btn-primary"
                                disabled={isLoading || !isFormValid}
                                style={{
                                  backgroundColor: isEditMode ? '#ffc107' : '#28a745',
                                  borderColor: isEditMode ? '#ffc107' : '#28a745',
                                  padding: '12px 24px',
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  borderRadius: '6px',
                                  minWidth: '200px'
                                }}
                              >
                                {isLoading ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="spinner"></span>
                                    {isEditMode ? 'Updating...' : 'Saving...'}
                                  </span>
                                ) : (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isEditMode ? '✏️ Update' : '💾 Save'} Holiday Work
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                className="standard-btn standard-btn-secondary"
                                onClick={handleCancel}
                                disabled={isLoading}
                                style={{
                                  padding: '12px 24px',
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  borderRadius: '6px',
                                  minWidth: '120px'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                            {isEditMode && !hasChanges() && (
                              <div style={{ 
                                marginTop: '15px', 
                                padding: '12px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '6px',
                                fontSize: '14px',
                                color: '#6c757d',
                                textAlign: 'center',
                                border: '1px solid #e9ecef'
                              }}>
                                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>⚠️</span> No changes detected. Modify times or remarks to update the record.
                              </div>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </form>
              </section>

              {/* Recent Holiday Work */}
              <section className="recent-section" style={{ marginTop: '30px' }}>
                <div className="recent-card standard-card">
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '20px',
                    paddingBottom: '15px',
                    borderBottom: '2px solid #e9ecef'
                  }}>
                    <h3 style={{ 
                      color: '#343a40',
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: '600'
                    }}>
                      📋 Recent Holiday Work Entries
                    </h3>
                    <button 
                      onClick={fetchRecentHolidayWork}
                      className="standard-btn standard-btn-secondary"
                      style={{ 
                        padding: '8px 16px',
                        fontSize: '14px'
                      }}
                    >
                      🔄 Refresh
                    </button>
                  </div>
                  <div className="recent-list">
                    {recentHolidayWork.length > 0 ? (
                      recentHolidayWork.map((record, index) => (
                        <div key={index} className="recent-item" style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '15px',
                          marginBottom: '10px',
                          backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                          borderRadius: '6px',
                          border: '1px solid #e9ecef'
                        }}>
                          <div style={{ flex: 1, minWidth: '100px' }}>
                            <div style={{ 
                              fontWeight: '600', 
                              color: '#343a40',
                              fontSize: '14px'
                            }}>
                              {record.attendence_date}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: record.day_of_week === 1 ? '#28a745' : '#17a2b8',
                              backgroundColor: record.day_of_week === 1 ? '#d4edda' : '#d1ecf1',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              marginTop: '4px',
                              display: 'inline-block'
                            }}>
                              {record.day_of_week === 1 ? 'Sunday' : record.day_of_week === 7 ? 'Saturday' : ''}
                            </div>
                          </div>
                          <div style={{ flex: 2, minWidth: '200px' }}>
                            <div style={{ 
                              fontWeight: '600', 
                              color: '#212529',
                              fontSize: '15px'
                            }}>
                              {record.EMPLOYEE_NAME}
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#6c757d',
                              marginTop: '2px'
                            }}>
                              {record.pak} • {record.APPOINTMENT}
                            </div>
                          </div>
                          <div style={{ flex: 1.5, minWidth: '150px' }}>
                            <div style={{ 
                              color: '#495057',
                              fontSize: '14px'
                            }}>
                              <span style={{ fontWeight: '600' }}>{record.time_in}</span> to <span style={{ fontWeight: '600' }}>{record.time_out}</span>
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#28a745',
                              fontWeight: 'bold',
                              marginTop: '4px'
                            }}>
                              +{Math.abs(parseFloat(record.MISSED_HOURS)).toFixed(2)} hrs credit
                            </div>
                          </div>
                          <div style={{ flex: 0.5, minWidth: '80px' }}>
                            <button
                              onClick={() => loadRecordForEdit(record)}
                              className="standard-btn standard-btn-primary"
                              style={{ 
                                padding: '6px 12px',
                                fontSize: '13px',
                                width: '100%'
                              }}
                              title="Edit this record"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="recent-item" style={{ 
                        justifyContent: 'center', 
                        padding: '30px',
                        textAlign: 'center',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px'
                      }}>
                        <div style={{ 
                          color: '#6c757d',
                          fontSize: '15px'
                        }}>
                          📭 No recent holiday work records found
                        </div>
                        <div style={{ 
                          color: '#adb5bd',
                          fontSize: '14px',
                          marginTop: '10px'
                        }}>
                          Start by creating your first holiday work entry above
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HolidayWork;