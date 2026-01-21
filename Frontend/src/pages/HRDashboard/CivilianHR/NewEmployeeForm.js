import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './EmployeeForms.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const NewEmployeeForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    pak: '',
    pass_no: '',
    appointment: '',
    employee_name: '',
    father_name: '',
    phone: '',
    mobile: '',
    temp_address: '',
    permanent_address: '',
    email: '',
    postin_date: new Date().toISOString().split('T')[0],
    postout_date: '',
    cnic: '',
    dob: '',
    qualification: '',
    experience: '',
    reference: '',
    salary_pm: '',
    deployment: '',
    bank_account: '',
    bank_address: '',
    blood_group: '',
    section: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
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

  const generatePAK = async () => {
    try {
      // Get next available PAK from server
      const response = await fetch('http://10.0.0.7:5000/api/employee/generate-pak');
      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          pak: data.pak
        }));
      } else {
        // Fallback: Generate timestamp-based PAK
        const timestamp = Date.now().toString().slice(-6);
        const newPAK = `CIV-${timestamp}`;
        setFormData(prev => ({
          ...prev,
          pak: newPAK
        }));
      }
    } catch (error) {
      // Fallback: Generate timestamp-based PAK
      const timestamp = Date.now().toString().slice(-6);
      const newPAK = `CIV-${timestamp}`;
      setFormData(prev => ({
        ...prev,
        pak: newPAK
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
    
    if (!formData.pak?.trim()) {
      newErrors.pak = 'PAK number is required';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.mobile && !/^03\d{2}-\d{7}$/.test(formData.mobile)) {
      newErrors.mobile = 'Mobile format: 0300-1234567';
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
      const response = await fetch('http://10.0.0.7:5000/api/employee/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Employee created successfully! PAK: ${data.employee.pak}, Default Password: 123456` 
        });
        
        // Reset form
        setTimeout(() => {
          setFormData({
            pak: '',
            pass_no: '',
            appointment: '',
            employee_name: '',
            father_name: '',
            phone: '',
            mobile: '',
            temp_address: '',
            permanent_address: '',
            email: '',
            postin_date: new Date().toISOString().split('T')[0],
            postout_date: '',
            cnic: '',
            dob: '',
            qualification: '',
            experience: '',
            reference: '',
            salary_pm: '',
            deployment: '',
            bank_account: '',
            bank_address: '',
            blood_group: '',
            section: ''
          });
          setErrors({});
          
          // Optionally navigate
          setTimeout(() => {
            navigate('/hr/civilian/view-employee');
          }, 3000);
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Error creating new employee:', error);
      setMessage({ type: 'error', text: 'Failed to create employee' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure? All entered data will be lost.')) {
      navigate('/hr/civilian/view-employee');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset form? All entered data will be lost.')) {
      setFormData({
        pak: '',
        pass_no: '',
        appointment: '',
        employee_name: '',
        father_name: '',
        phone: '',
        mobile: '',
        temp_address: '',
        permanent_address: '',
        email: '',
        postin_date: new Date().toISOString().split('T')[0],
        postout_date: '',
        cnic: '',
        dob: '',
        qualification: '',
        experience: '',
        reference: '',
        salary_pm: '',
        deployment: '',
        bank_account: '',
        bank_address: '',
        blood_group: '',
        section: ''
      });
      setErrors({});
      setMessage({ type: '', text: '' });
    }
  };

  return (
    <div className="employee-form-page">
   

        {/* Header */}
      <StandardHeader
      title={<h1>Add New Employee</h1>}
      subtitle="Create a new civilian employee record"
      />

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="employee-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>PAK Number *</label>
              <div className="input-with-button">
                <input
                  type="text"
                  name="pak"
                  value={formData.pak}
                  onChange={handleChange}
                  className={errors.pak ? 'error' : ''}
                  placeholder="CIV-001"
                />
                <button 
                  type="button" 
                  className="generate-btn"
                  onClick={generatePAK}
                >
                  Generate
                </button>
              </div>
              {errors.pak && <span className="error-text">{errors.pak}</span>}
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Employee Name *</label>
              <input
                type="text"
                name="employee_name"
                value={formData.employee_name}
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
                value={formData.father_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Appointment *</label>
              <input
                type="text"
                name="appointment"
                value={formData.appointment}
                onChange={handleChange}
                className={errors.appointment ? 'error' : ''}
                placeholder="Computer Operator"
              />
              {errors.appointment && <span className="error-text">{errors.appointment}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Identity Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>CNIC *</label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                placeholder="35201-1234567-1"
                className={errors.cnic ? 'error' : ''}
              />
              {errors.cnic && <span className="error-text">{errors.cnic}</span>}
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Pass Number</label>
              <input
                type="text"
                name="pass_no"
                value={formData.pass_no}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Blood Group</label>
              <select
                name="blood_group"
                value={formData.blood_group}
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
          </div>
        </div>

        <div className="form-section">
          <h3>Employment Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>Post In Date</label>
              <input
                type="date"
                name="postin_date"
                value={formData.postin_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Salary (PM)</label>
              <input
                type="text"
                name="salary_pm"
                value={formData.salary_pm}
                onChange={handleChange}
                placeholder="50000"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Deployment</label>
              <input
                type="text"
                name="deployment"
                value={formData.deployment}
                onChange={handleChange}
                placeholder="Research & Development"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Section</label>
              <input
                type="text"
                name="section"
                value={formData.section}
                onChange={handleChange}
                placeholder="IT Section"
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
                value={formData.phone}
                onChange={handleChange}
                placeholder="051-1234567"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Mobile</label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
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
                value={formData.email}
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
                value={formData.temp_address}
                onChange={handleChange}
                rows="3"
                placeholder="House #1, Street 2, City"
              />
            </div>

            <div className="form-group full-width">
              <label style={{color:'black'}}>Permanent Address</label>
              <textarea
                name="permanent_address"
                value={formData.permanent_address}
                onChange={handleChange}
                rows="3"
                placeholder="House #5, Street 10, City"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Additional Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'black'}}>Qualification</label>
              <input
                type="text"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                placeholder="Bachelor of Computer Science"
              />
            </div>

            <div className="form-group">
              <label style={{color:'black'}}>Experience</label>
              <input
                type="text"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="5 years"
              />
            </div>

            <div className="form-group full-width">
              <label style={{color:'black'}}>Reference</label>
              <textarea
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                rows="2"
                placeholder="Reference details"
              />
            </div>

            <div className="form-group full-width">
              <label style={{color:'black'}}>Bank Account</label>
              <input
                type="text"
                name="bank_account"
                value={formData.bank_account}
                onChange={handleChange}
                placeholder="1234567890"
              />
            </div>

            <div className="form-group full-width">
              <label style={{color:'black'}}>Bank Address</label>
              <textarea
                name="bank_address"
                value={formData.bank_address}
                onChange={handleChange}
                rows="2"
                placeholder="Bank name, Branch, City"
              />
            </div>
          </div>
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
            type="button" 
            className="reset-btn"
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset
          </button>
          <button 
            type="submit" 
            className="save-btn"
            disabled={isSaving}
          >
            {isSaving ? 'Creating...' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewEmployeeForm;