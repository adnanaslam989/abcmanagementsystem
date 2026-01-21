import { useState, useEffect } from 'react';
import './UnitWorkingHours.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const API_BASE = 'http://10.0.0.7:5000/api/employee';

const UnitWorkingHours = () => {
  const [workingHours, setWorkingHours] = useState({
    time_in: '08:00',
    time_out: '17:00'
  });
  const [currentHours, setCurrentHours] = useState({
    time_in: '08:00',
    time_out: '17:00'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch current working hours on component mount
  useEffect(() => {
    fetchCurrentWorkingHours();
  }, []);

  const fetchCurrentWorkingHours = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${API_BASE}/working-hours`);
      
      if (!response.ok) {
        throw new Error(`Failed to load working hours: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load working hours');
      }

      const hoursData = {
        time_in: result.time_in,
        time_out: result.time_out
      };
      
      setWorkingHours(hoursData);
      setCurrentHours(hoursData);
      setHasChanges(false);
      
      if (result.message) {
        setMessage(result.message);
      }
      
    } catch (error) {
      console.error('Error fetching working hours:', error);
      setMessage(`❌ Error: ${error.message}`);
      
      // Set default values as fallback
      const defaultHours = {
        time_in: '08:00',
        time_out: '17:00'
      };
      setWorkingHours(defaultHours);
      setCurrentHours(defaultHours);
      setMessage('Using default working hours. Please check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/working-hours/history`);
      
      if (!response.ok) {
        throw new Error(`Failed to load history: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setHistory(result.history || []);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setMessage(`❌ Error loading history: ${error.message}`);
    }
  };

  const handleInputChange = (field, value) => {
    const updatedHours = {
      ...workingHours,
      [field]: value
    };
    setWorkingHours(updatedHours);
    
    // Check if there are changes
    const changesExist = 
      updatedHours.time_in !== currentHours.time_in || 
      updatedHours.time_out !== currentHours.time_out;
    setHasChanges(changesExist);
  };

  const validateWorkingHours = () => {
    const { time_in, time_out } = workingHours;
    
    if (!time_in || !time_out) {
      setMessage('Both time-in and time-out are required');
      return false;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time_in) || !timeRegex.test(time_out)) {
      setMessage('Invalid time format. Use HH:MM format (24-hour)');
      return false;
    }

    // Convert times to minutes for comparison
    const [inHours, inMinutes] = time_in.split(':').map(Number);
    const [outHours, outMinutes] = time_out.split(':').map(Number);
    
    const totalInMinutes = inHours * 60 + inMinutes;
    const totalOutMinutes = outHours * 60 + outMinutes;

    if (totalOutMinutes <= totalInMinutes) {
      setMessage('Time-out must be after time-in');
      return false;
    }

    // Check minimum working hours (at least 1 hour)
    const workingMinutes = totalOutMinutes - totalInMinutes;
    if (workingMinutes < 60) {
      setMessage('Minimum working hours should be at least 1 hour');
      return false;
    }

    // Check maximum working hours (no more than 12 hours)
    if (workingMinutes > 12 * 60) {
      setMessage('Maximum working hours cannot exceed 12 hours');
      return false;
    }

    return true;
  };

  const calculateWorkingHours = (timeIn = workingHours.time_in, timeOut = workingHours.time_out) => {
    if (!timeIn || !timeOut) return '0 hours 0 minutes';
    
    const [inHours, inMinutes] = timeIn.split(':').map(Number);
    const [outHours, outMinutes] = timeOut.split(':').map(Number);
    
    const totalInMinutes = inHours * 60 + inMinutes;
    const totalOutMinutes = outHours * 60 + outMinutes;
    
    const workingMinutes = totalOutMinutes - totalInMinutes;
    const hours = Math.floor(workingMinutes / 60);
    const minutes = workingMinutes % 60;
    
    return `${hours} hours ${minutes} minutes`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateWorkingHours()) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/working-hours/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workingHours)
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to update working hours: ${response.status}`);
      }

      setMessage(`✅ ${result.message}`);
      setCurrentHours({
        time_in: result.time_in,
        time_out: result.time_out
      });
      setHasChanges(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        if (message.includes('✅')) {
          setMessage('');
        }
      }, 5000);

      console.log('Working hours updated successfully:', result);
      
    } catch (error) {
      console.error('Error updating working hours:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm('Are you sure you want to reset to default working hours (08:00 - 17:00)?')) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/working-hours/reset`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to reset working hours');
      }

      const defaultHours = {
        time_in: result.time_in,
        time_out: result.time_out
      };
      
      setWorkingHours(defaultHours);
      setCurrentHours(defaultHours);
      setHasChanges(false);
      setMessage(`✅ ${result.message}`);
      
      setTimeout(() => {
        if (message.includes('✅')) {
          setMessage('');
        }
      }, 5000);

    } catch (error) {
      console.error('Error resetting working hours:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormReset = () => {
    setWorkingHours(currentHours);
    setHasChanges(false);
    setMessage('');
  };

  const getTimeDifferenceColor = () => {
    const { time_in, time_out } = workingHours;
    
    const [inHours, inMinutes] = time_in.split(':').map(Number);
    const [outHours, outMinutes] = time_out.split(':').map(Number);
    
    const totalInMinutes = inHours * 60 + inMinutes;
    const totalOutMinutes = outHours * 60 + outMinutes;
    
    const workingMinutes = totalOutMinutes - totalInMinutes;
    const hours = workingMinutes / 60;

    if (hours >= 8 && hours <= 9) return 'optimal';
    if (hours >= 7 && hours < 8) return 'warning';
    if (hours > 9 && hours <= 10) return 'warning';
    if (hours > 10) return 'danger';
    return 'danger';
  };

  const formatHistoryDate = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="unit-working-hours-page">


           {/* Header */}
           <StandardHeader 
        title={<h1>Unit Working Hours</h1>}
        subtitle={ <div className="header-actions">
            <button
              type="button"
              className="history-btn"
              onClick={() => {
                if (!showHistory) {
                  fetchHistory();
                } else {
                  setShowHistory(false);
                }
              }}
              disabled={isLoading}
            >
              {showHistory ? 'Hide History' : 'View History'}
            </button>
          </div>}
      />

      {/* Main Content */}
      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="working-hours-content">
            {/* Message Display */}
            {message && (
              <div className={`message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}`}>
                {message}
              </div>
            )}

            {/* Working Hours History */}
            {showHistory && history.length > 0 && (
              <section className="history-section">
                <div className="history-card">
                  <h3>Working Hours History</h3>
                  <div className="history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date Updated</th>
                          <th>Time In</th>
                          <th>Time Out</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((record, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'alt' : ''}>
                            <td>{formatHistoryDate(record.time_in)}</td>
                            <td>{record.time_in.split(' ')[1]}</td>
                            <td>{record.time_out.split(' ')[1]}</td>
                            <td>{record.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="history-note">Showing last {history.length} changes</p>
                </div>
              </section>
            )}

            {/* Current Settings Display */}
            <section className="current-settings">
              <div className="settings-card">
                <h3>Current Working Hours</h3>
                <div className="current-times">
                  <div className="time-display">
                    <span className="time-label">Time In:</span>
                    <span className="time-value">{currentHours.time_in}</span>
                  </div>
                  <div className="time-display">
                    <span className="time-label">Time Out:</span>
                    <span className="time-value">{currentHours.time_out}</span>
                  </div>
                  <div className="duration-display">
                    <span className="duration-label">Total Duration:</span>
                    <span className="duration-value">{calculateWorkingHours(currentHours.time_in, currentHours.time_out)}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Update Form */}
            <section className="update-form-section">
              <form onSubmit={handleSubmit}>
                <div className="form-header">
                  <h3 style={{color:'White'}}>Update Working Hours</h3>
                  <p style={{color:'White'}}>Set the default time-in and time-out for the unit</p>
                </div>

                <div className="time-inputs-container">
                  <div className="time-input-group">
                    <label htmlFor="time_in">Time In:</label>
                    <input
                      type="time"
                      id="time_in"
                      value={workingHours.time_in}
                      onChange={(e) => handleInputChange('time_in', e.target.value)}
                      className="time-input"
                      required
                      disabled={isLoading}
                      step="300" // 5 minute increments
                    />
                    <div className="time-hint">24-hour format (HH:MM)</div>
                  </div>

                  <div className="time-input-group">
                    <label htmlFor="time_out">Time Out:</label>
                    <input
                      type="time"
                      id="time_out"
                      value={workingHours.time_out}
                      onChange={(e) => handleInputChange('time_out', e.target.value)}
                      className="time-input"
                      required
                      disabled={isLoading}
                      step="300" // 5 minute increments
                    />
                    <div className="time-hint">24-hour format (HH:MM)</div>
                  </div>
                </div>

                {/* Working Hours Summary */}
                <div className="summary-section">
                  <div className={`summary-card ${getTimeDifferenceColor()}`}>
                    <h4>Working Hours Summary</h4>
                    <div className="summary-details">
                      <div className="summary-item">
                        <span>Start Time:</span>
                        <strong>{workingHours.time_in}</strong>
                      </div>
                      <div className="summary-item">
                        <span>End Time:</span>
                        <strong>{workingHours.time_out}</strong>
                      </div>
                      <div className="summary-item">
                        <span>Total Duration:</span>
                        <strong>{calculateWorkingHours()}</strong>
                      </div>
                      <div className="summary-status">
                        <span>Status: </span>
                        <span className={`status ${getTimeDifferenceColor()}`}>
                          {getTimeDifferenceColor() === 'optimal' ? 'Optimal' : 
                           getTimeDifferenceColor() === 'warning' ? 'Warning' : 'Not Recommended'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Rules */}
                <div className="rules-section">
                  <h4>Validation Rules</h4>
                  <ul className="rules-list">
                    <li className="valid">✓ Time-out must be after time-in</li>
                    <li className="valid">✓ Minimum working hours: 1 hour</li>
                    <li className="valid">✓ Maximum working hours: 12 hours</li>
                    <li className="recommended">✓ Recommended: 8-9 hours per day</li>
                    <li className="format">✓ Format: 24-hour (HH:MM)</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isLoading || !hasChanges}
                  >
                    {isLoading ? 'Updating...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={handleFormReset}
                    disabled={isLoading || !hasChanges}
                  >
                    Cancel Changes
                  </button>
                  <button
                    type="button"
                    className="default-btn"
                    onClick={handleResetToDefault}
                    disabled={isLoading}
                  >
                    Reset to Default
                  </button>
                </div>
              </form>
            </section>

            {/* Impact Information */}
            <section className="impact-info">
              <div className="info-card">
                <h4>Impact of Changes</h4>
                <div className="impact-list">
                  <div className="impact-item">
                    <span className="impact-icon">⏰</span>
                    <div className="impact-content">
                      <strong>Attendance Calculation</strong>
                      <p>Missed hours calculation will use the new default time</p>
                    </div>
                  </div>
                  <div className="impact-item">
                    <span className="impact-icon">📊</span>
                    <div className="impact-content">
                      <strong>Reports & Analytics</strong>
                      <p>All attendance reports will reflect the updated working hours</p>
                    </div>
                  </div>
                  <div className="impact-item">
                    <span className="impact-icon">👥</span>
                    <div className="impact-content">
                      <strong>All Employees</strong>
                      <p>Applies to all civilian employees in the unit</p>
                    </div>
                  </div>
                  <div className="impact-item">
                    <span className="impact-icon">⚡</span>
                    <div className="impact-content">
                      <strong>Immediate Effect</strong>
                      <p>Changes take effect immediately for new attendance records</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            
          </div>
        </div>
      </div>
    </div>
  );
};



export default UnitWorkingHours;