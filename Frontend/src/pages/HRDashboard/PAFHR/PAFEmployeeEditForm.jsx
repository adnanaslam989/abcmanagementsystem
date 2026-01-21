import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './PAFEmployeeForms.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const PAFEmployeeEditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employeeData, setEmployeeData] = useState(null);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Password reset states
  const [showPassword, setShowPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

 const fetchEmployeeData = async () => {
  setIsLoading(true);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://10.0.0.7:5000/api/PAFemployee/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Format date fields for input[type="date"]
      const formattedEmployee = { ...data.employee };
      
      // Convert null dates to empty strings for date inputs
      if (!formattedEmployee.postin_date) {
        formattedEmployee.postin_date = '';
      }
      
      if (!formattedEmployee.postout_date) {
        formattedEmployee.postout_date = '';
      }
      
      // Convert null values to empty strings for other fields
      Object.keys(formattedEmployee).forEach(key => {
        if (formattedEmployee[key] === null || formattedEmployee[key] === undefined) {
          formattedEmployee[key] = '';
        }
      });
      
      // Add password field (always blank for security)
      formattedEmployee.password = '';
      
      setEmployeeData(formattedEmployee);
      setFormData(formattedEmployee);
    } else {
      setMessage({ type: 'error', text: data.message });
    }
  } catch (error) {
    console.error('Error fetching PAF employee data:', error);
    setMessage({ 
      type: 'error', 
      text: `Failed to load PAF employee data: ${error.message}` 
    });
  } finally {
    setIsLoading(false);
  }
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'password') {
      setPasswordChanged(true);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.employee_name?.trim()) {
      newErrors.employee_name = 'Employee name is required';
    }
    
    if (!formData.rank?.trim()) {
      newErrors.rank = 'Rank is required';
    }
    
    if (!formData.category?.trim()) {
      newErrors.category = 'Category is required';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.mobile && !/^03\d{2}-\d{7}$/.test(formData.mobile)) {
      newErrors.mobile = 'Mobile format: 0300-1234567';
    }
    
    // Password validation (only if being changed)
    if (passwordChanged && formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  const validationErrors = validateForm();
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }
  
  setIsSaving(true);
  setMessage({ type: '', text: '' });
  
  try {
    const token = localStorage.getItem('token');
    
    // Clean the data before sending
    const cleanFormData = { ...formData };
    
    // Remove password from main employee update (handled separately)
    const passwordToUpdate = cleanFormData.password;
    delete cleanFormData.password;
    
    // Special handling for date fields
    if (cleanFormData.postin_date === '') {
      cleanFormData.postin_date = null;
    } else if (cleanFormData.postin_date) {
      // Ensure proper date format
      const date = new Date(cleanFormData.postin_date);
      if (!isNaN(date.getTime())) {
        cleanFormData.postin_date = date.toISOString().split('T')[0];
      } else {
        cleanFormData.postin_date = null;
      }
    }
    
    if (cleanFormData.postout_date === '') {
      cleanFormData.postout_date = null;
    } else if (cleanFormData.postout_date) {
      // Ensure proper date format
      const date = new Date(cleanFormData.postout_date);
      if (!isNaN(date.getTime())) {
        cleanFormData.postout_date = date.toISOString().split('T')[0];
      } else {
        cleanFormData.postout_date = null;
      }
    }
    
    // Convert string 'null' to actual null for all fields
    Object.keys(cleanFormData).forEach(key => {
      if (cleanFormData[key] === 'null') {
        cleanFormData[key] = null;
      }
      // Trim whitespace from string fields
      else if (typeof cleanFormData[key] === 'string') {
        cleanFormData[key] = cleanFormData[key].trim();
        // Convert empty strings to null for nullable fields
        if (cleanFormData[key] === '' && 
            ['phone_office', 'intercom', 'phone_res', 'defcom_office', 
             'defcom_res', 'mobile', 'email', 'section', 'deployment', 
             'custodian', 'branch_trade', 'address'].includes(key)) {
          cleanFormData[key] = null;
        }
      }
    });
    
    console.log('📤 Sending cleaned PAF employee update data:', {
      id,
      cleanFormData,
      stringified: JSON.stringify(cleanFormData)
    });
    
    // Step 1: Update employee data
    const response = await fetch(`http://10.0.0.7:5000/api/PAFemployee/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanFormData)
    });
    
    // DEBUG: Log raw response
    const responseText = await response.text();
    console.log('📥 Raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      throw new Error('Invalid JSON response from server');
    }
    
    console.log('📥 Parsed response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'Update failed');
    }
    
    // Step 2: Update password if changed
    if (passwordChanged && passwordToUpdate) {
      try {
        const passwordResponse = await fetch(`http://10.0.0.7:5000/api/PAFemployee/${id}/update-password`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: passwordToUpdate })
        });
        
        const passwordData = await passwordResponse.json();
        
        if (passwordData.success) {
          console.log('✅ Password updated successfully');
        } else {
          console.warn('⚠️ Employee data updated but password reset failed:', passwordData.message);
        }
      } catch (passwordError) {
        console.error('⚠️ Employee data updated but password reset error:', passwordError);
      }
    }
    
    // Success message
    let successMessage = 'PAF Employee updated successfully!';
    if (passwordChanged && passwordToUpdate) {
      successMessage += ' Password reset successfully!';
      setPasswordChanged(false);
      setFormData(prev => ({ ...prev, password: '' }));
    }
    
    setMessage({ 
      type: 'success', 
      text: successMessage 
    });
    
    // Refresh employee data
    await fetchEmployeeData();
    
    // Show success message for 3 seconds
    setTimeout(() => {
      if (!passwordChanged) { // Only auto-navigate if not resetting password
        navigate('/hr/paf/view-employee');
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error saving PAF employee data:', error);
    
    let errorMessage = `Failed to save changes: ${error.message}`;
    
    // Provide more specific error messages
    if (error.message.includes('date')) {
      errorMessage = 'Invalid date format. Please check the dates and try again.';
    } else if (error.message.includes('JSON')) {
      errorMessage = 'Server returned invalid response. Please try again.';
    } else if (error.message.includes('network') || error.message.includes('Network')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    }
    
    setMessage({ 
      type: 'error', 
      text: errorMessage 
    });
  } finally {
    setIsSaving(false);
  }
};

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const generateRandomPassword = () => {
    const length = 8;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setPasswordChanged(true);
  };

  const clearPassword = () => {
    setFormData(prev => ({ ...prev, password: '' }));
    setPasswordChanged(false);
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure? Unsaved changes will be lost.')) {
      navigate('/hr/paf/view-employee');
    }
  };

  const categoryOptions = ['Officer', 'JCO', 'Airmen', 'Civilian'];
  const rankOptions = {
    'Officer': ['Air Chief Marshal','Air Marshal','Air Vice Marshal','Air Commodore', 'Group Captain', 'Wing Commander', 'Squadron Leader', 'Flight Lieutenant', 'Flying Officer','Pilot Officer'],
    'JCO': ['CWO', 'WO', 'AWO'],
    'Airmen': ['Chf/Tech', 'Snr/Tech', 'Cpl/Tech', 'Jnr/Tech','SAC','LAC'],
    'Civilian': ['DD','Manager','Assistant Manager','LDC', 'Clerk', 'Supervisor', 'Cook','Mali','Office Boy','Lascar']
  };


  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading PAF employee data...</p>
      </div>
    );
  }

  return (
    <div className="paf-employee-form-page">
      <div className="form-header">
        <h2 style={{color:'white'}}>Edit PAF Employee Profile</h2>
        <p style={{color:'white'}} className="form-subtitle">PAK: {id} - {employeeData?.employee_name}</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="employee-form">
        <div className="form-section">
          <h3>Personal Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>PAK Number</label>
              <input
                type="text"
                name="pak"
                value={formData.pak || ''}
                disabled
                className="disabled"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Employee Name *</label>
              <input
                type="text"
                name="employee_name"
                value={formData.employee_name || ''}
                onChange={handleChange}
                className={errors.employee_name ? 'error' : ''}
              />
              {errors.employee_name && <span className="error-text">{errors.employee_name}</span>}
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Category *</label>
              <select
                name="category"
                value={formData.category || ''}
                onChange={handleChange}
                className={errors.category ? 'error' : ''}
              >
                <option value="">Select Category</option>
                {categoryOptions.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <span className="error-text">{errors.category}</span>}
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Rank *</label>
              <select
                name="rank"
                value={formData.rank || ''}
                onChange={handleChange}
                className={errors.rank ? 'error' : ''}
              >
                <option value="">Select Rank</option>
                {formData.category && rankOptions[formData.category] ? (
                  rankOptions[formData.category].map(rank => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))
                ) : (
                  Object.values(rankOptions).flat().map(rank => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))
                )}
              </select>
              {errors.rank && <span className="error-text">{errors.rank}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Professional Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>Branch/Trade</label>
              <input
                type="text"
                name="branch_trade"
                value={formData.branch_trade || ''}
                onChange={handleChange}
                placeholder="e.g., Technical, Administration"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Section</label>
              <input
                type="text"
                name="section"
                value={formData.section || ''}
                onChange={handleChange}
                placeholder="e.g., IT Department, Operations"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Deployment</label>
              <input
                type="text"
                name="deployment"
                value={formData.deployment || ''}
                onChange={handleChange}
                placeholder="e.g., HQ, Wing, Squadron"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Custodian</label>
              <input
                type="text"
                name="custodian"
                value={formData.custodian || ''}
                onChange={handleChange}
                placeholder="Responsible officer"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Contact Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>Phone (Office)</label>
              <input
                type="text"
                name="phone_office"
                value={formData.phone_office || ''}
                onChange={handleChange}
                placeholder="051-1234567"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Intercom</label>
              <input
                type="text"
                name="intercom"
                value={formData.intercom || ''}
                onChange={handleChange}
                placeholder="101"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Phone (Residence)</label>
              <input
                type="text"
                name="phone_res"
                value={formData.phone_res || ''}
                onChange={handleChange}
                placeholder="051-7654321"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Defcom (Office)</label>
              <input
                type="text"
                name="defcom_office"
                value={formData.defcom_office || ''}
                onChange={handleChange}
                placeholder="DEF-001"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Defcom (Residence)</label>
              <input
                type="text"
                name="defcom_res"
                value={formData.defcom_res || ''}
                onChange={handleChange}
                placeholder="DEF-002"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Mobile</label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile || ''}
                onChange={handleChange}
                placeholder="0300-1234567"
                className={errors.mobile ? 'error' : ''}
              />
              {errors.mobile && <span className="error-text">{errors.mobile}</span>}
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Address Details</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label style={{color:'black'}}>Address</label>
              <textarea
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                rows="3"
                placeholder="Full residential address"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Service Dates</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>Post In Date</label>
              <input
                type="date"
                name="postin_date"
                value={formData.postin_date || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Post Out Date</label>
              <input
                type="date"
                name="postout_date"
                value={formData.postout_date || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Password Reset Section - For HR Managers Only */}
        <div className="form-section password-section">
          <div className="section-header">
            <h3>🔐 Password Reset (HR Only)</h3>
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
            >
              {showPasswordSection ? '▲ Hide' : '▼ Show'} Password Reset
            </button>
          </div>
          
          {showPasswordSection && (
            <div className="password-reset-container">
              <div className="password-info-box">
                <p><strong>Instructions:</strong> This section is for HR managers to reset employee passwords when requested.</p>
                <p>Default password for new employees is "123456".</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group full-width">
                  <label style={{color:'black'}}>New Password</label>
                  <div className="password-input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password || ''}
                      onChange={handleChange}
                      placeholder="Enter new password (leave blank to keep current)"
                      className={`password-input ${errors.password ? 'error' : ''}`}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={togglePasswordVisibility}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                    <button
                      type="button"
                      className="generate-password-btn"
                      onClick={generateRandomPassword}
                      title="Generate secure password"
                    >
                      🎲 Generate
                    </button>
                    <button
                      type="button"
                      className="clear-password-btn"
                      onClick={clearPassword}
                      title="Clear password field"
                    >
                      ✕ Clear
                    </button>
                  </div>
                  {errors.password && <span className="error-text">{errors.password}</span>}
                  {passwordChanged && formData.password && (
                    <div className="password-status">
                      <span className="password-changed">✓ Password will be reset on save</span>
                      <span className="password-strength">
                        Strength: 
                        <span className={formData.password.length >= 8 ? 'strong' : 'weak'}>
                          {formData.password.length >= 8 ? ' Strong' : ' Weak'}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="password-warning">
                <p><strong>⚠️ Important:</strong> </p>
                <ul>
                  <li>Employee will be notified of password reset</li>
                  <li>Use this feature only when employee requests password reset</li>
                  <li>Ensure password is at least 6 characters long</li>
                  <li>Generate a secure password using the "Generate" button</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="save-btn"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          {passwordChanged && (
            <button
              type="button"
              className="save-reset-btn"
              onClick={() => {
                // Special save with password reset indicator
                document.querySelector('.save-btn').click();
              }}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save & Reset Password'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PAFEmployeeEditForm;