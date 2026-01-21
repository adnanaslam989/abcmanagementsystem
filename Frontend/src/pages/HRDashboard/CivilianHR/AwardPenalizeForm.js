import { useState, useEffect } from 'react';
import './AwardPenalize.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';



const AwardPenalizeForm = () => {
  const [civilianEmployees, setCivilianEmployees] = useState([]);
  const [militaryOfficers, setMilitaryOfficers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedAwardedBy, setSelectedAwardedBy] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    pak: '',
    employee_name: '',
    action_type: 'award', // 'award' or 'penalize'
    hours: '',
    bonus_date: new Date().toISOString().split('T')[0],
    awarded_by: '',
    reason: ''
  });
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);

  // Use your backend URL
  const API_BASE_URL = 'http://10.0.0.7:5000/api';

  // Fetch real data from API
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Calculate days when hours change - always use positive hours for calculation
  useEffect(() => {
    if (formData.hours && !isNaN(parseFloat(formData.hours))) {
      const hours = Math.abs(parseFloat(formData.hours));
      const days = (hours / 8).toFixed(2);
      setCalculatedDays(days);
    } else {
      setCalculatedDays(0);
    }
  }, [formData.hours]);

  const fetchEmployees = async () => {
    try {
      setApiLoading(true);
      
      // Fetch civilian employees
      const civilianResponse = await fetch(`${API_BASE_URL}/bonus/civilian-employees`);
      const civilianData = await civilianResponse.json();
      
      if (civilianData.success) {
        setCivilianEmployees(civilianData.employees);
      } else {
        throw new Error(civilianData.message || 'Failed to fetch civilian employees');
      }

      // Fetch military officers only (not all military employees)
      const officersResponse = await fetch(`${API_BASE_URL}/bonus/military-officers`);
      const officersData = await officersResponse.json();
      
      if (officersData.success) {
        setMilitaryOfficers(officersData.officers);
      } else {
        throw new Error(officersData.message || 'Failed to fetch military officers');
      }

    } catch (error) {
      console.error('Error fetching employees:', error);
      setMessage('Failed to load employee data');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setApiLoading(false);
    }
  };

  const handleEmployeeSelect = () => {
    if (selectedEmployee && selectedEmployee !== '--Select Employee--') {
      const splitData = selectedEmployee.split(' : ');
      const pak = splitData[0];
      const name = splitData[1];
      
      setFormData(prev => ({
        ...prev,
        pak: pak,
        employee_name: name
      }));
      setShowForm(true);
    }
  };

  const handleAwardedByChange = (e) => {
    setSelectedAwardedBy(e.target.value);
    setFormData(prev => ({
      ...prev,
      awarded_by: e.target.value
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For hours input, ensure only positive numbers are entered
    if (name === 'hours') {
      // Remove any negative signs entered by user
      const positiveValue = value.replace(/^-/, '');
      // Allow only numbers and one decimal point
      const sanitizedValue = positiveValue.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = sanitizedValue.split('.');
      const finalValue = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0];
      
      setFormData(prev => ({
        ...prev,
        [name]: finalValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleActionTypeChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      action_type: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.hours || !formData.bonus_date || !formData.awarded_by || !formData.reason) {
      setMessage('Please fill all required fields!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const hours = parseFloat(formData.hours);
    
    // Validate hours - always positive validation since user enters positive values
    if (hours < 0.1 || hours > 240) {
      setMessage('Hours must be between 0.1 and 240!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Convert to negative if penalize action is selected
    let finalHours = hours;
    if (formData.action_type === 'penalize') {
      finalHours = -hours;
    }
    // Award action keeps positive value

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/bonus/save`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          hours: finalHours // Send positive or negative based on action type
        })
      });

      const result = await response.json();

      if (result.success) {
        const actionText = formData.action_type === 'award' ? 'Awarded' : 'Penalized';
        setMessage(`${actionText} ${hours} hours successfully!`);
        
        // Reset form after successful submission
        setTimeout(() => {
          setMessage('');
          setShowForm(false);
          setSelectedEmployee('');
          setSelectedAwardedBy('');
          setFormData({
            pak: '',
            employee_name: '',
            action_type: 'award',
            hours: '',
            bonus_date: new Date().toISOString().split('T')[0],
            awarded_by: '',
            reason: ''
          });
          setCalculatedDays(0);
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to save data');
      }

    } catch (error) {
      console.error('Error saving data:', error);
      setMessage('Failed to save data!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedEmployee('');
    setSelectedAwardedBy('');
    setFormData({
      pak: '',
      employee_name: '',
      action_type: 'award',
      hours: '',
      bonus_date: new Date().toISOString().split('T')[0],
      awarded_by: '',
      reason: ''
    });
    setCalculatedDays(0);
  };

  const getButtonColor = () => {
    return formData.action_type === 'award' ? 'var(--accent-green)' : 'var(--accent-red)';
  };

  const getButtonText = () => {
    const hoursDisplay = formData.hours || '0';
    return formData.action_type === 'award' 
      ? `Award ${hoursDisplay} Hours` 
      : `Penalize ${hoursDisplay} Hours`;
  };

  const getDisplayHours = () => {
    if (!formData.hours) return '0';
    const hours = parseFloat(formData.hours);
    return formData.action_type === 'penalize' ? `-${hours}` : `+${hours}`;
  };

  return (
    <div className="award-penalize-page">
      {/* Header */}
      <StandardHeader
      title={<h1>Award / Penalize Hours</h1>}
      subtitle="Award bonus hours or impose penalties on civilian employees - Must be authorized by Officers only"
      />

      {/* Main Content */}
      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="bonus-content">
            {/* Loading State */}
            {apiLoading && (
              <div className="loading-section">
                <div className="loading-spinner"></div>
                <p>Loading employee data...</p>
              </div>
            )}

            {/* Employee Selection Section */}
            {!apiLoading && (
              <section className="selection-section">
                <div className="section-header">
                  <h2>Select Employee</h2>
                  <p>Choose a civilian employee to award or penalize hours</p>
                </div>
                <form className="selection-form">
                  <div className="form-group">
                    <label htmlFor="employeeSelect">Employee:</label>
                    <select 
                      id="employeeSelect"
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="form-select"
                      disabled={isLoading}
                    >
                      <option value="">--Select Civilian Employee--</option>
                      {civilianEmployees.map((employee, index) => (
                        <option key={index} value={employee}>
                          {employee}
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      className="select-btn"
                      onClick={handleEmployeeSelect}
                      disabled={!selectedEmployee || selectedEmployee === '--Select Civilian Employee--' || isLoading}
                    >
                      Select
                    </button>
                  </div>
                </form>
                <div className="employee-count">
                  {civilianEmployees.length} civilian employees available • {militaryOfficers.length} authorized officers
                </div>
              </section>
            )}

            {/* Hours Form Section */}
            {showForm && (
              <section className="form-section">
                <div className="section-header">
                  <h2>{formData.action_type === 'award' ? 'Award Hours' : 'Penalize Hours'}</h2>
                  <p>
                    {formData.action_type === 'award' 
                      ? 'Award bonus hours to the employee' 
                      : 'Impose penalty hours on the employee'}
                  </p>
                </div>
                
                <div className="datagrid">
                  <table className="hours-form-table">
                    <thead>
                      <tr>
                        <th colSpan="2">Hours Management Form</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="label">PAK</td>
                        <td>
                          <input
                            type="text"
                            name="pak"
                            value={formData.pak}
                            onChange={handleInputChange}
                            className="form-input readonly"
                            readOnly
                          />
                        </td>
                      </tr>
                      <tr className="alt">
                        <td className="label">Civilian Name</td>
                        <td>
                          <input
                            type="text"
                            name="employee_name"
                            value={formData.employee_name}
                            onChange={handleInputChange}
                            className="form-input readonly"
                            readOnly
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="label">Action Type *</td>
                        <td>
                          <select
                            name="action_type"
                            value={formData.action_type}
                            onChange={handleActionTypeChange}
                            className="form-select action-type-select"
                            required
                          >
                            <option value="award">🎖️ Award Hours</option>
                            <option value="penalize">⚠️ Penalize Hours</option>
                          </select>
                          <div className="field-info">
                            Select "Award Hours" for bonus (positive) or "Penalize Hours" for penalty (negative)
                          </div>
                        </td>
                      </tr>
                      <tr className="alt">
                        <td className="label">
                          Hours *
                        </td>
                        <td>
                          <div className="hours-input-group">
                            <div className="hours-display-wrapper">
                              <input
                                type="number"
                                name="hours"
                                value={formData.hours}
                                onChange={handleInputChange}
                                className="form-input hours-input"
                                step="0.1"
                                min="0.1"
                                max="240"
                                required
                                placeholder="Enter hours (0.1 to 240)"
                              />
                              <div className="hours-sign-indicator">
                                {formData.hours ? (
                                  <span className={`sign ${formData.action_type === 'award' ? 'positive' : 'negative'}`}>
                                    {formData.action_type === 'award' ? '+' : '-'}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="hours-info">
                              <div className="calculated-days">
                                {formData.hours ? (
                                  <>
                                    <span className="days-value">
                                      {formData.action_type === 'award' ? '+' : '-'}{calculatedDays}
                                    </span> days
                                    <span className="hours-display">
                                      ({getDisplayHours()} hours)
                                    </span>
                                  </>
                                ) : (
                                  'Enter hours to see calculation'
                                )}
                              </div>
                              <div className="conversion-info">
                                (1 day = 8 working hours) • Always enter positive hours
                              </div>
                            </div>
                          </div>
                          <div className="field-info">
                            {formData.action_type === 'award' 
                              ? 'Enter hours to award (0.1 to 240)' 
                              : 'Enter hours to penalize (0.1 to 240) - will be recorded as negative'}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="label">Date *</td>
                        <td>
                          <input
                            type="date"
                            name="bonus_date"
                            value={formData.bonus_date}
                            onChange={handleInputChange}
                            className="form-input"
                            required
                          />
                        </td>
                      </tr>
                      <tr className="alt">
                        <td className="label">Authorized By (Officer) *</td>
                        <td>
                          <select
                            name="awarded_by"
                            value={selectedAwardedBy}
                            onChange={handleAwardedByChange}
                            className="form-select"
                            required
                          >
                            <option value="">--Select Authorizing Officer--</option>
                            {militaryOfficers.map((officer, index) => (
                              <option key={index} value={officer}>
                                {officer}
                              </option>
                            ))}
                          </select>
                          <div className="field-info">
                            Must be selected from authorized officers only
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="label">Reason / Remarks *</td>
                        <td>
                          <input
                            type="text"
                            name="reason"
                            value={formData.reason}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder={formData.action_type === 'award' 
                              ? "Enter reason for awarding hours" 
                              : "Enter reason for penalty hours"}
                            required
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div className="action-buttons">
                    <button 
                      type="button" 
                      className="submit-btn"
                      onClick={handleSubmit}
                      disabled={isLoading}
                      style={{ backgroundColor: getButtonColor() }}
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner"></span>
                          Processing...
                        </>
                      ) : (
                        getButtonText()
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* Working Hours Info */}
                <div className="working-hours-info">
                  <span>⏰ 1 Working Day = 8 Hours</span>
                  <span>🎖️ Award: Positive hours (automatically +)</span>
                  <span>⚠️ Penalty: Negative hours (automatically -)</span>
                  <span>📊 Always enter positive hours</span>
                </div>

                {/* Message */}
                {message && (
                  <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
                    {message}
                  </div>
                )}
              </section>
            )}

            {/* Instructions */}
            {!showForm && !apiLoading && (
              <div className="instructions-section">
                <h3>How to use this form:</h3>
                <div className="instructions-grid">
                  <div className="instruction-card award">
                    <div className="instruction-icon">🎖️</div>
                    <h4>Award Hours</h4>
                    <p>Grant bonus hours to employees for exceptional performance, overtime, or special achievements.</p>
                    <ul>
                      <li>Select "Award Hours" from dropdown</li>
                      <li>Enter positive hours only</li>
                      <li>System records as positive value</li>
                      <li>Requires officer authorization</li>
                    </ul>
                  </div>
                  <div className="instruction-card penalize">
                    <div className="instruction-icon">⚠️</div>
                    <h4>Penalize Hours</h4>
                    <p>Deduct hours for disciplinary actions, late arrivals, or other infractions.</p>
                    <ul>
                      <li>Select "Penalize Hours" from dropdown</li>
                      <li>Enter positive hours only</li>
                      <li>System converts to negative value</li>
                      <li>Requires officer authorization</li>
                    </ul>
                  </div>
                </div>
                <div className="instructions-note">
                  <p><strong>Note:</strong> Always enter positive hours. The system automatically handles the sign (+/-) based on your selection.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwardPenalizeForm;