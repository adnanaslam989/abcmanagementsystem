// LatePenaltyCalculation.jsx - UPDATED VERSION with retroactive penalty toggle
import { useState, useEffect } from 'react';
import './LatePenaltyCalculation.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const API_BASE_URL = 'http://10.0.0.7:5000/api';

const LatePenaltyCalculation = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [penaltyData, setPenaltyData] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [militaryOfficers, setMilitaryOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [penaltyReason, setPenaltyReason] = useState('HR Dept. Due to Late coming policy');
  const [summary, setSummary] = useState(null);

  const [settingsForm, setSettingsForm] = useState({
    late_ignore_count: 3,
    grace_period_minutes: 15,
    double_penalty_start: '09:15',
    double_penalty_end: '10:00',
    quadruple_penalty_start: '10:00',
    quadruple_penalty_end: '16:00',
    late_time_in_threshold: '09:00',
    half_day_penalty_factor: 4,
    full_day_penalty_factor: 8,
    short_leave_exempt: true,
    retroactive_penalty: false  // NEW: Toggle for retroactive penalty calculation
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    fetchSettings();
    fetchMilitaryOfficers();
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await fetchWithErrorHandling('/penalty/settings');
      if (data.success) {
        const settingsData = {
          ...data.settings,
          retroactive_penalty: data.settings.retroactive_penalty !== undefined ? data.settings.retroactive_penalty : true
        };
        setSettings(settingsData);
        setSettingsForm(settingsData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(settingsForm);
    }
  };

  const fetchMilitaryOfficers = async () => {
    try {
      const data = await fetchWithErrorHandling('/bonus/military-officers');
      if (data.success) {
        setMilitaryOfficers(data.officers);
        if (data.officers.length > 0) {
          setSelectedOfficer(data.officers[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching officers:', error);
    }
  };

  const handleDateSubmit = async () => {
    if (!selectedDate) {
      setMessage('Please select date first');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setPenaltyData([]);
    setSummary(null);

    try {
      const data = await fetchWithErrorHandling(`/penalty/attendance/${selectedDate}`);
      
      if (data.success) {
        const processedData = data.attendance.map(record => ({
          ...record,
          pak: record.pak || '',
          employee_name: record.employee_name || 'Unknown',
          status: record.status || 'Present',
          time_in: record.time_in || '',
          late_minutes: record.late_minutes || 0,
          penalty_factor: record.penalty_factor || 0,
          penalty_hours: record.penalty_hours || '0.00',
          total_late_instances: record.total_late_instances || 0,
          is_eligible_for_penalty: record.is_eligible_for_penalty || false,
          penalty_remarks: record.penalty_remarks || record.remarks || '',
          apply_penalty: record.apply_penalty || false,
          is_late: record.is_late || false,
          has_existing_penalty: record.has_existing_penalty || false,
          penalty_charged_instances: record.penalty_charged_instances || 0  // NEW: Track charged instances
        }));
        
        setPenaltyData(processedData);
        setSettings(data.settings);
        setMessage(`✅ Loaded ${data.count} attendance records for ${selectedDate}`);
        
        setTimeout(() => {
          setMessage('');
        }, 3000);
      } else {
        setMessage('Failed to load attendance data');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingPenalties = async () => {
    try {
      const data = await fetchWithErrorHandling(`/penalty/check-existing/${selectedDate}`);
      if (data.success && data.has_existing) {
        const proceed = window.confirm(
          `⚠️ Penalties have already been calculated for ${selectedDate}.\n` +
          `Existing records: ${data.existing_count}\n\n` +
          `Do you want to proceed anyway? This may create duplicate entries.`
        );
        
        if (!proceed) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking existing penalties:', error);
      return true;
    }
  };

  const handleCalculatePenalties = async () => {
    if (!selectedDate) {
      setMessage('Please select date first');
      return;
    }

    const shouldProceed = await checkExistingPenalties();
    if (!shouldProceed) {
      return;
    }

    setIsCalculating(true);
    setMessage('');

    try {
      const data = await fetchWithErrorHandling('/penalty/calculate', {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate })
      });
      
      if (data.success) {
        // Check for existing penalties for each employee
        const penaltiesWithExistingCheck = await Promise.all(
          data.penalties.map(async (record) => {
            try {
              const existingCheck = await fetchWithErrorHandling(
                `/penalty/check-existing-employee/${record.pak}/${selectedDate}`
              );
              
              return {
                ...record,
                pak: record.pak || '',
                employee_name: record.employee_name || 'Unknown',
                status: record.status || 'Present',
                time_in: record.time_in || '',
                late_minutes: record.late_minutes || 0,
                penalty_factor: record.penalty_factor || 0,
                penalty_hours: record.penalty_hours || '0.00',
                total_late_instances: record.total_late_instances || 0,
                penalty_charged_instances: record.penalty_charged_instances || 0,
                is_eligible_for_penalty: record.is_eligible_for_penalty || false,
                penalty_remarks: record.penalty_remarks || record.remarks || '',
                // Don't auto-check if penalty already exists
                apply_penalty: record.is_eligible_for_penalty && !existingCheck.has_existing,
                is_late: record.is_late || false,
                has_existing_penalty: existingCheck.has_existing || false
              };
            } catch (error) {
              console.error(`Error checking existing penalty for ${record.pak}:`, error);
              return {
                ...record,
                pak: record.pak || '',
                employee_name: record.employee_name || 'Unknown',
                status: record.status || 'Present',
                time_in: record.time_in || '',
                late_minutes: record.late_minutes || 0,
                penalty_factor: record.penalty_factor || 0,
                penalty_hours: record.penalty_hours || '0.00',
                total_late_instances: record.total_late_instances || 0,
                penalty_charged_instances: record.penalty_charged_instances || 0,
                is_eligible_for_penalty: record.is_eligible_for_penalty || false,
                penalty_remarks: record.penalty_remarks || record.remarks || '',
                apply_penalty: record.is_eligible_for_penalty,
                is_late: record.is_late || false,
                has_existing_penalty: false
              };
            }
          })
        );
        
        setPenaltyData(penaltiesWithExistingCheck);
        setSummary(data.summary);
        
        // Count how many have existing penalties
        const existingCount = penaltiesWithExistingCheck.filter(r => r.has_existing_penalty).length;
        const message = existingCount > 0 
          ? `✅ Calculated penalties: ${data.summary.eligible_for_penalty} employees eligible (${existingCount} already have penalties), Total: ${data.summary.total_penalty_hours} penalty hours`
          : `✅ Calculated penalties: ${data.summary.eligible_for_penalty} employees eligible, Total: ${data.summary.total_penalty_hours} penalty hours`;
        
        setMessage(message);
        
        setTimeout(() => {
          setMessage('');
        }, 5000);
      } else {
        setMessage('Failed to calculate penalties');
      }
    } catch (error) {
      console.error('Error calculating penalties:', error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleToggleApplyPenalty = (index) => {
    setPenaltyData(prevData => {
      const updatedData = [...prevData];
      const record = updatedData[index];
      
      // Don't allow toggling if penalty already exists in database
      if (record.has_existing_penalty) {
        alert(`Cannot modify penalty for ${record.employee_name} - penalty already exists in database.`);
        return prevData;
      }
      
      updatedData[index] = {
        ...record,
        apply_penalty: !record.apply_penalty
      };
      
      // Recalculate summary
      const totalEmployees = updatedData.length;
      const eligibleForPenalty = updatedData.filter(r => r.is_eligible_for_penalty).length;
      const totalPenaltyHours = updatedData
        .filter(r => r.apply_penalty)
        .reduce((sum, r) => sum + parseFloat(r.penalty_hours || 0), 0)
        .toFixed(2);
      const exemptedCount = updatedData.filter(r => 
        r.is_eligible_for_penalty && r.is_short_leave && settings?.short_leave_exempt
      ).length;
      
      setSummary({
        total_employees: totalEmployees,
        eligible_for_penalty: eligibleForPenalty,
        total_penalty_hours: totalPenaltyHours,
        exempted_due_to_short_leave: exemptedCount
      });
      
      return updatedData;
    });
  };

  const handleApplyAll = (apply) => {
    const updatedData = penaltyData.map(record => ({
      ...record,
      // Only apply to eligible records that don't already have penalties in database
      apply_penalty: (record.is_eligible_for_penalty && !record.has_existing_penalty) ? apply : record.apply_penalty
    }));
    
    setPenaltyData(updatedData);
    
    const totalEmployees = updatedData.length;
    const eligibleForPenalty = updatedData.filter(r => r.is_eligible_for_penalty).length;
    const totalPenaltyHours = updatedData
      .filter(r => r.apply_penalty)
      .reduce((sum, r) => sum + parseFloat(r.penalty_hours || 0), 0)
      .toFixed(2);
    const exemptedCount = updatedData.filter(r => 
      r.is_eligible_for_penalty && r.is_short_leave && settings?.short_leave_exempt
    ).length;
    
    setSummary({
      total_employees: totalEmployees,
      eligible_for_penalty: eligibleForPenalty,
      total_penalty_hours: totalPenaltyHours,
      exempted_due_to_short_leave: exemptedCount
    });
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettingsForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value) : 
              value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      const data = await fetchWithErrorHandling('/penalty/settings/save', {
        method: 'POST',
        body: JSON.stringify(settingsForm)
      });
      
      if (data.success) {
        setSettings(settingsForm);
        setShowSettings(false);
        setMessage('✅ Penalty settings saved successfully');
        
        setTimeout(() => {
          setMessage('');
        }, 3000);
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage(`❌ ${error.message}`);
    }
  };

  const handleSavePenalties = async () => {
    if (!selectedOfficer) {
      setMessage('Please select an authorizing officer');
      return;
    }

    const selectedPenalties = penaltyData.filter(r => r.apply_penalty && parseFloat(r.penalty_hours) > 0);
    if (selectedPenalties.length === 0) {
      setMessage('No penalties selected for saving');
      return;
    }

    // Check for duplicates before saving
    const duplicateCheckPromises = selectedPenalties.map(async (penalty) => {
      try {
        const response = await fetchWithErrorHandling(
          `/penalty/check-duplicate/${penalty.pak}/${selectedDate}/${encodeURIComponent(penalty.penalty_remarks)}`
        );
        return {
          ...penalty,
          isDuplicate: response.is_duplicate
        };
      } catch (error) {
        console.error(`Error checking duplicate for ${penalty.pak}:`, error);
        return {
          ...penalty,
          isDuplicate: false
        };
      }
    });

    const checkedPenalties = await Promise.all(duplicateCheckPromises);
    const duplicates = checkedPenalties.filter(p => p.isDuplicate);
    
    if (duplicates.length > 0) {
      const duplicateNames = duplicates.map(d => `${d.employee_name} (${d.pak})`).join('\n');
      const proceed = window.confirm(
        `⚠️ Found ${duplicates.length} duplicate penalty records:\n\n${duplicateNames}\n\n` +
        `These penalties already exist in the database. Do you want to save only non-duplicate records?`
      );
      
      if (!proceed) {
        return;
      }
      
      // Remove duplicates from the list to save
      const filteredPenalties = checkedPenalties.filter(p => !p.isDuplicate);
      
      if (filteredPenalties.length === 0) {
        setMessage('All selected penalties already exist in the database');
        return;
      }
      
      if (!window.confirm(`Save ${filteredPenalties.length} non-duplicate penalty records?`)) {
        return;
      }
      
      await savePenaltiesToDatabase(filteredPenalties);
    } else {
      if (!window.confirm(`Are you sure you want to save ${selectedPenalties.length} penalty records?\nThis will add negative hours to bonus_hours table.`)) {
        return;
      }
      
      await savePenaltiesToDatabase(selectedPenalties);
    }
  };

  const savePenaltiesToDatabase = async (penaltiesToSave) => {
    setIsSaving(true);
    setMessage('Saving penalties...');

    try {
      const data = await fetchWithErrorHandling('/penalty/save-penalties', {
        method: 'POST',
        body: JSON.stringify({
          penalties: penaltiesToSave,
          date: selectedDate,
          awarded_by: selectedOfficer,
          reason: penaltyReason
        })
      });
      
      if (data.success) {
        let successMessage = `✅ Successfully saved ${data.saved_count} penalty records`;
        
        if (data.skipped_count > 0) {
          successMessage += `, skipped ${data.skipped_count} duplicate records`;
        }
        
        setMessage(successMessage);
        
        if (data.saved_records && data.saved_records.length > 0) {
          const summary = data.saved_records.map(r => 
            `${r.employee_name}: -${r.penalty_hours} hours`
          ).join('\n');
          
          // Update local data to mark saved records
          setPenaltyData(prevData => 
            prevData.map(record => {
              const savedRecord = data.saved_records.find(sr => sr.pak === record.pak);
              if (savedRecord) {
                return {
                  ...record,
                  has_existing_penalty: true,
                  apply_penalty: false // Uncheck after saving
                };
              }
              return record;
            })
          );
          
          alert(`Penalties saved successfully!\n\nSaved records:\n${summary}`);
        }
        
        // Refresh the data
        setTimeout(() => {
          handleDateSubmit();
        }, 2000);
      } else {
        setMessage(`❌ Failed to save penalties: ${data.message}`);
        
        if (data.errors && data.errors.length > 0) {
          console.error('Save errors:', data.errors);
        }
      }
    } catch (error) {
      console.error('Error saving penalties:', error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    return time.length === 5 ? time : '--:--';
  };

  const getPenaltyColor = (hours) => {
    const numHours = parseFloat(hours || 0);
    if (numHours === 0) return '#6c757d';
    if (numHours < 1) return '#ffc107';
    if (numHours < 4) return '#fd7e14';
    return '#dc3545';
  };

  return (
    <div className="late-penalty-page">
      <StandardHeader
        title="Late Coming Penalty Calculation"
        subtitle="Automated penalty calculation based on organization's late coming policy"
      />

      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="penalty-content">
            {showSettings && (
              <div className="settings-panel">
                <div className="settings-header">
                  <h3>Penalty Settings</h3>
                  <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
                </div>
                <div className="settings-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{color:'black'}}>Late Ignore Count:</label>
                      <input
                        type="number"
                        name="late_ignore_count"
                        value={settingsForm.late_ignore_count}
                        onChange={handleSettingsChange}
                        min="0"
                        max="10"
                        className="form-input"
                      />
                      <small>Number of late arrivals to ignore before penalties (default: 3)</small>
                    </div>
                    <div className="form-group">
                      <label style={{color:'black'}}>Grace Period (minutes):</label>
                      <input
                        type="number"
                        name="grace_period_minutes"
                        value={settingsForm.grace_period_minutes}
                        onChange={handleSettingsChange}
                        min="0"
                        max="60"
                        className="form-input"
                      />
                      <small>Minutes after official time that are not penalized (default: 15)</small>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{color:'black'}}>Double Penalty Start:</label>
                      <input
                        type="time"
                        name="double_penalty_start"
                        value={settingsForm.double_penalty_start}
                        onChange={handleSettingsChange}
                        className="form-input"
                      />
                      <small>Time when double penalty begins (default: 09:15)</small>
                    </div>
                    <div className="form-group">
                      <label style={{color:'black'}}>Double Penalty End:</label>
                      <input
                        type="time"
                        name="double_penalty_end"
                        value={settingsForm.double_penalty_end}
                        onChange={handleSettingsChange}
                        className="form-input"
                      />
                      <small>Time when double penalty ends (default: 10:00)</small>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{color:'black'}}>Quadruple Penalty Start:</label>
                      <input
                        type="time"
                        name="quadruple_penalty_start"
                        value={settingsForm.quadruple_penalty_start}
                        onChange={handleSettingsChange}
                        className="form-input"
                      />
                      <small>Time when quadruple penalty begins (default: 10:00)</small>
                    </div>
                    <div className="form-group">
                      <label style={{color:'black'}}>Quadruple Penalty End:</label>
                      <input
                        type="time"
                        name="quadruple_penalty_end"
                        value={settingsForm.quadruple_penalty_end}
                        onChange={handleSettingsChange}
                        className="form-input"
                      />
                      <small>Time when quadruple penalty ends (default: 16:00)</small>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{color:'black'}}>Late Time Threshold:</label>
                      <input
                        type="time"
                        name="late_time_in_threshold"
                        value={settingsForm.late_time_in_threshold}
                        onChange={handleSettingsChange}
                        className="form-input"
                      />
                      <small>Official start time (default: 09:00)</small>
                    </div>
                    <div className="form-group">
                      <label style={{color:'black'}}>Exempt Short Leaves:</label>
                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          name="short_leave_exempt"
                          checked={settingsForm.short_leave_exempt}
                          onChange={handleSettingsChange}
                          className="form-checkbox"
                        />
                        <span>Exempt employees who applied for short leave</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* NEW: Retroactive Penalty Checkbox */}
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{color:'black'}}>Retroactive Penalty Calculation:</label>
                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          name="retroactive_penalty"
                          checked={settingsForm.retroactive_penalty}
                          onChange={handleSettingsChange}
                          className="form-checkbox"
                        />
                        <span>Apply retroactive penalty for previous late instances</span>
                      </div>
                      <small>
                        When enabled: On (n+1)th late arrival, penalty is calculated for previous n instances.<br/>
                        When disabled: Only current late instance penalty is calculated.
                      </small>
                    </div>
                  </div>
                  
                  <div className="settings-actions">
                    <button className="save-settings-btn" onClick={handleSaveSettings}>
                      Save Settings
                    </button>
                    <button className="cancel-settings-btn" onClick={() => setShowSettings(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="policy-info-card">
              <h4>📋 Late Coming Penalty Policy</h4>
              <div className="policy-details">
                <p><strong>Current Settings:</strong></p>
                <ul>
                  <li>Ignore first {settings?.late_ignore_count || 3} late arrivals per month</li>
                  <li>Grace period: {settings?.grace_period_minutes || 15} minutes after {settings?.late_time_in_threshold || '09:00'}</li>
                  <li>Double penalty: {settings?.double_penalty_start || '09:15'} to {settings?.double_penalty_end || '10:00'}</li>
                  <li>Quadruple penalty: After {settings?.quadruple_penalty_start || '10:00'}</li>
                  <li>Short leave exemption: {settings?.short_leave_exempt ? 'Enabled' : 'Disabled'}</li>
                  <li>Retroactive penalty: {settings?.retroactive_penalty !== false ? 'Enabled' : 'Disabled'}</li>
                </ul>
                <button className="edit-settings-btn" onClick={() => setShowSettings(true)}>
                  ⚙️ Edit Settings
                </button>
              </div>
            </div>

            <section className="date-section">
              <div className="date-form">
                <div className="form-group">
                  <label htmlFor="penaltyDate">Select Date:</label>
                  <input
                    type="date"
                    id="penaltyDate"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="date-input"
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <button
                    type="button"
                    className="load-btn"
                    onClick={handleDateSubmit}
                    disabled={isLoading || !selectedDate}
                  >
                    {isLoading ? 'Loading...' : 'Load Attendance'}
                  </button>
                  <button
                    type="button"
                    className="calculate-btn"
                    onClick={handleCalculatePenalties}
                    disabled={isCalculating || penaltyData.length === 0}
                  >
                    {isCalculating ? 'Calculating...' : 'Calculate Penalties'}
                  </button>
                </div>
              </div>
            </section>

            {message && (
              <div className={`message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}`}>
                {message}
              </div>
            )}

            {summary && (
              <div className="summary-section">
                <div className="summary-cards">
                  <div className="summary-card">
                    <h4>Total Employees</h4>
                    <p className="summary-number">{summary.total_employees}</p>
                  </div>
                  <div className="summary-card">
                    <h4>Eligible for Penalty</h4>
                    <p className="summary-number" style={{ color: '#dc3545' }}>
                      {summary.eligible_for_penalty}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h4>Total Penalty Hours</h4>
                    <p className="summary-number" style={{ color: '#dc3545', fontWeight: 'bold' }}>
                      {summary.total_penalty_hours}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h4>Exempted (Short Leave)</h4>
                    <p className="summary-number" style={{ color: '#6c757d' }}>
                      {summary.exempted_due_to_short_leave || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {penaltyData.length > 0 && (
              <div className="authorization-section">
                <div className="form-row">
                  <div className="form-group">
                    <label>Authorizing Officer:</label>
                    <select
                      value={selectedOfficer}
                      onChange={(e) => setSelectedOfficer(e.target.value)}
                      className="form-select"
                      disabled={isSaving}
                    >
                      <option value="">-- Select Officer --</option>
                      {militaryOfficers.map((officer, index) => (
                        <option key={index} value={officer}>
                          {officer}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Penalty Reason:</label>
                    <input
                      type="text"
                      value={penaltyReason}
                      onChange={(e) => setPenaltyReason(e.target.value)}
                      className="form-input"
                      placeholder="Enter penalty reason"
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            )}

            {penaltyData.length > 0 && (
              <div className="action-buttons-top">
                <button
                  type="button"
                  className="action-btn apply-all-btn"
                  onClick={() => handleApplyAll(true)}
                  disabled={isSaving}
                >
                  Apply All Penalties
                </button>
                <button
                  type="button"
                  className="action-btn remove-all-btn"
                  onClick={() => handleApplyAll(false)}
                  disabled={isSaving}
                >
                  Remove All Penalties
                </button>
                <button
                  type="button"
                  className="action-btn save-penalties-btn"
                  onClick={handleSavePenalties}
                  disabled={isSaving || !selectedOfficer}
                >
                  {isSaving ? 'Saving...' : 'Save Penalties to Database'}
                </button>
              </div>
            )}

            {penaltyData.length > 0 ? (
              <section className="penalty-form-section">
                <div className="datagrid">
                  <table className="penalty-table">
                    <thead>
                      <tr>
                        <th width="1">#</th>
                        <th width="220">Employee Info</th>
                        <th width="70">Status</th>
                        <th width="150">Time In</th>
                        <th width="90">Late Minutes</th>
                        <th width="90">Late #</th>
                        <th width="90">Penalty Factor</th>
                        <th width="100">Penalty Hours</th>
                        <th width="200">Remarks</th>
                        <th width="70">Apply</th>
                      </tr>
                    </thead>
                    <tbody>
                      {penaltyData.map((record, index) => {
                        const isLate = record.is_late || record.status === 'Late';
                        const hasPenalty = parseFloat(record.penalty_hours || 0) > 0;
                        const isEligible = record.is_eligible_for_penalty || false;
                        const hasExisting = record.has_existing_penalty || false;
                        
                        return (
                          <tr key={index} className={`
                            ${index % 2 === 0 ? 'alt' : ''} 
                            ${isLate ? 'late-row' : ''}
                            ${hasPenalty ? 'penalty-row' : ''}
                            ${hasExisting ? 'existing-penalty-row' : ''}
                          `}>
                            <td className="serial-number">{index + 1}</td>
                            <td className="employee-info-cell">
                              <div className="employee-info">
                                <div className="pak-number">{record.pak || 'N/A'}</div>
                                <div className="employee-name">{record.employee_name || 'Unknown'}</div>
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge ${(record.status || 'Present').toLowerCase()}`}>
                                {record.status || 'Present'}
                              </span>
                            </td>
                            <td>
                              <input
                                type="text"
                                value={formatTime(record.time_in)}
                                readOnly
                                className="readonly-input time-display"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.late_minutes || '0'}
                                readOnly
                                className="readonly-input"
                                style={{
                                  color: record.late_minutes > 0 ? '#dc3545' : '#6c757d',
                                  fontWeight: record.late_minutes > 0 ? 'bold' : 'normal'
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.total_late_instances || '0'}
                                readOnly
                                className="readonly-input"
                                style={{
                                  color: (record.total_late_instances || 0) > (settings?.late_ignore_count || 3) ? '#dc3545' : '#6c757d',
                                  fontWeight: (record.total_late_instances || 0) > (settings?.late_ignore_count || 3) ? 'bold' : 'normal'
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.penalty_factor || '1'}
                                readOnly
                                className="readonly-input"
                                style={{
                                  color: record.penalty_factor > 1 ? '#fd7e14' : '#6c757d',
                                  fontWeight: record.penalty_factor > 1 ? 'bold' : 'normal'
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.penalty_hours || '0.00'}
                                readOnly
                                className="readonly-input penalty-hours"
                                style={{
                                  color: getPenaltyColor(record.penalty_hours),
                                  backgroundColor: parseFloat(record.penalty_hours || 0) > 0 ? '#f8d7da' : '#f8f9fa',
                                  fontWeight: 'bold'
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.penalty_remarks || record.remarks || ''}
                                readOnly
                                className="readonly-input remarks-display"
                              />
                            </td>
                            <td className="apply-column">
                              <div className="checkbox-container">
                                <input
                                  type="checkbox"
                                  checked={record.apply_penalty || false}
                                  onChange={() => handleToggleApplyPenalty(index)}
                                  className="penalty-checkbox"
                                  disabled={!isEligible || hasExisting || isSaving}
                                  id={`checkbox-${index}`}
                                />
                                <label 
                                  htmlFor={`checkbox-${index}`}
                                  className={`checkmark-label ${hasExisting ? 'disabled-checkmark' : ''}`}
                                >
                                  <span className="checkmark"></span>
                                  {hasExisting && (
                                    <div className="existing-tooltip">✓ Already saved</div>
                                  )}
                                </label>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="legend-section">
                  <div className="legend-item">
                    <span className="color-box" style={{ backgroundColor: '#f8d7da' }}></span>
                    <span>Penalty Hours</span>
                  </div>
                  <div className="legend-item">
                    <span className="color-box" style={{ backgroundColor: '#fff3cd' }}></span>
                    <span>Late Arrival</span>
                  </div>
                  <div className="legend-item">
                    <span className="color-box" style={{ backgroundColor: '#d4edda' }}></span>
                    <span>On Time / Present</span>
                  </div>
                  <div className="legend-item">
                    <span className="color-box" style={{ backgroundColor: '#e2e3e5' }}></span>
                    <span>Already Saved (Cannot Modify)</span>
                  </div>
                </div>

                <div className="calculation-notes">
                  <h4>📝 Calculation Notes:</h4>
                  <ul>
                    <li><strong>Penalty Hours = (Late Minutes / 60) × (Penalty Factor - 1)</strong></li>
                    <li>Actual late hours are already deducted in attendance balance calculation</li>
                    <li>Only additional penalty hours are calculated here</li>
                    <li>Late ignore count: {settings?.late_ignore_count || 3} instances</li>
                    <li>Retroactive penalty calculation: {settings?.retroactive_penalty !== false ? 'Enabled' : 'Disabled'}</li>
                    {settings?.retroactive_penalty !== false ? (
                      <li>On {settings?.late_ignore_count + 1 || 4}th+ late arrival, previous {settings?.late_ignore_count || 3} late instances are also penalized</li>
                    ) : (
                      <li>Only current late instance penalty is calculated (no retroactive)</li>
                    )}
                    <li>Short leaves are {settings?.short_leave_exempt ? 'exempted' : 'not exempted'} from penalties</li>
                    <li>Penalties are saved as negative hours in bonus_hours table</li>
                    <li>Already saved penalties cannot be modified (grayed out)</li>
                  </ul>
                </div>
              </section>
            ) : (
              <div className="no-data-message">
                {isLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading attendance data...</p>
                  </div>
                ) : (
                  <>
                    <div className="no-data-icon">⏰</div>
                    <h3>No Attendance Data Loaded</h3>
                    <p>Select a date and click "Load Attendance" to view and calculate penalties.</p>
                    <div className="instructions">
                      <h4>How to use:</h4>
                      <ol>
                        <li>Select a date from the calendar</li>
                        <li>Click "Load Attendance" to fetch records</li>
                        <li>Click "Calculate Penalties" to apply policy calculations</li>
                        <li>Review and adjust penalties using checkboxes</li>
                        <li>Select an authorizing officer and enter reason</li>
                        <li>Click "Save Penalties" to save to database</li>
                        <li>Use "Edit Settings" button to modify penalty policy</li>
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

export default LatePenaltyCalculation;