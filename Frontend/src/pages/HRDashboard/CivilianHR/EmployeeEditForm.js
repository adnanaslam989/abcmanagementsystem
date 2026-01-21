import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EmployeeForms.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const EmployeeEditForm = () => {
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
      const response = await fetch(`http://10.0.0.7:5000/api/employee/${id}`);
      const data = await response.json();
      
      if (data.success) {
        const employeeWithPassword = {
          ...data.employee,
          password: '' // Always keep password blank for security
        };
        setEmployeeData(employeeWithPassword);
        setFormData(employeeWithPassword);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setMessage({ type: 'error', text: 'Failed to load employee data' });
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
    
    if (!formData.appointment?.trim()) {
      newErrors.appointment = 'Appointment is required';
    }
    
    if (!formData.cnic?.trim()) {
      newErrors.cnic = 'CNIC is required';
    } else if (!/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic)) {
      newErrors.cnic = 'CNIC format: 35201-1234567-1';
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
      // Clean the data before sending
      const cleanFormData = { ...formData };
      
      // Remove password from main employee update (handled separately)
      const passwordToUpdate = cleanFormData.password;
      delete cleanFormData.password;
      
      // DEBUG: Log what's being sent
      console.log('📤 Sending update data:', {
        id,
        cleanFormData,
        stringified: JSON.stringify(cleanFormData)
      });
      
      // Step 1: Update employee data
      const response = await fetch(`http://10.0.0.7:5000/api/employee/${id}`, {
        method: 'PUT',
        headers: {
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
          const token = localStorage.getItem('token');
          const passwordResponse = await fetch(`http://10.0.0.7:5000/api/employee/${id}/update-password`, {
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
      let successMessage = 'Employee updated successfully!';
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
          navigate('/hr/civilian/view-employee');
        }
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error saving employee data:', error);
      setMessage({ type: 'error', text: `Failed to save changes: ${error.message}` });
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
      navigate('/hr/civilian/view-employee');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading employee data...</p>
      </div>
    );
  }

  return (
    <div className="employee-form-page">
      {/* Header */}
      <StandardHeader
        title={<h1>Edit Employee Profile</h1>}
        subtitle={<p className="form-subtitle">PAK: {id} - {employeeData?.employee_name}</p>}
      />
      
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
              <label style={{color:'black'}}>Father Name</label>
              <input
                type="text"
                name="father_name"
                value={formData.father_name || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>CNIC *</label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic || ''}
                onChange={handleChange}
                placeholder="35201-1234567-1"
                className={errors.cnic ? 'error' : ''}
              />
              {errors.cnic && <span className="error-text">{errors.cnic}</span>}
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Employment Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>Appointment *</label>
              <input
                type="text"
                name="appointment"
                value={formData.appointment || ''}
                onChange={handleChange}
                className={errors.appointment ? 'error' : ''}
              />
              {errors.appointment && <span className="error-text">{errors.appointment}</span>}
            </div>

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
              <label style={{color:'black'}}>Pass Number</label>
              <input
                type="text"
                name="pass_no"
                value={formData.pass_no || ''}
                onChange={handleChange}
              />
            </div>

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

            <div className="form-group">
              <label style={{color:'black'}}>Salary (PM)</label>
              <input
                type="text"
                name="salary_pm"
                value={formData.salary_pm || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Contact Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
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
              <label style={{color:'black'}}>Temporary Address</label>
              <textarea
                name="temp_address"
                value={formData.temp_address || ''}
                onChange={handleChange}
                rows="3"
              />
            </div>

            <div className="form-group full-width">
              <label style={{color:'black'}}>Permanent Address</label>
              <textarea
                name="permanent_address"
                value={formData.permanent_address || ''}
                onChange={handleChange}
                rows="3"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Additional Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>Deployment</label>
              <input
                type="text"
                name="deployment"
                value={formData.deployment || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Section</label>
              <input
                type="text"
                name="section"
                value={formData.section || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Qualification</label>
              <input
                type="text"
                name="qualification"
                value={formData.qualification || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Experience</label>
              <input
                type="text"
                name="experience"
                value={formData.experience || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Blood Group</label>
              <select
                name="blood_group"
                value={formData.blood_group || ''}
                onChange={handleChange}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label style={{color:'black'}}>Reference</label>
              <textarea
                name="reference"
                value={formData.reference || ''}
                onChange={handleChange}
                rows="2"
              />
            </div>

            <div className="form-group full-width">
              <label style={{color:'black'}}>Bank Account</label>
              <input
                type="text"
                name="bank_account"
                value={formData.bank_account || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label style={{color:'black'}}>Bank Address</label>
              <textarea
                name="bank_address"
                value={formData.bank_address || ''}
                onChange={handleChange}
                rows="2"
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

export default EmployeeEditForm;