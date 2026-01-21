import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PAFEmployeeForms.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const PAFNewEmployeeForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    pak: '',
    category: '',
    rank: '',
    employee_name: '',
    branch_trade: '',
    phone_office: '',
    intercom: '',
    phone_res: '',
    defcom_office: '',
    defcom_res: '',
    mobile: '',
    address: '',
    email: '',
    postin_date: new Date().toISOString().split('T')[0],
    postout_date: '',
    section: '',
    deployment: '',
    custodian: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const categoryOptions = ['Officer', 'JCO', 'Airmen', 'Civilian'];
  const rankOptions = {
    'Officer': ['Air Commodore', 'Group Captain', 'Wing Commander', 'Squadron Leader', 'Flight Lieutenant', 'Flying Officer'],
    'JCO': ['Subedar Major', 'Subedar', 'Naib Subedar', 'Havildar', 'Naik', 'Lance Naik'],
    'Airmen': ['Sergeant', 'Corporal', 'Leading Aircraftman', 'Aircraftman'],
    'Civilian': ['Assistant', 'Clerk', 'Supervisor']
  };

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
      const token = localStorage.getItem('token');
      const category = formData.category || 'PAF';
      let prefix = 'PAF-';
      
      if (category === 'Officer') prefix = 'OF-';
      else if (category === 'JCO') prefix = 'JCO-';
      else if (category === 'Airmen') prefix = 'AM-';
      else if (category === 'Civilian') prefix = 'CIV-';
      
      // Try to get next PAK from server
      try {
        const response = await fetch(`http://10.0.0.7:5000/api/PAFemployee/generate-pak?category=${category}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setFormData(prev => ({
              ...prev,
              pak: data.pak
            }));
            return;
          }
        }
      } catch (apiError) {
        console.log('Using fallback PAK generation');
      }
      
      // Fallback: Generate timestamp-based PAK
      const timestamp = Date.now().toString().slice(-6);
      const newPAK = `${prefix}${timestamp}`;
      setFormData(prev => ({
        ...prev,
        pak: newPAK
      }));
    } catch (error) {
      // Ultimate fallback
      const timestamp = Date.now().toString().slice(-6);
      const newPAK = `PAF-${timestamp}`;
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
    
    if (!formData.category?.trim()) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.rank?.trim()) {
      newErrors.rank = 'Rank is required';
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
      const token = localStorage.getItem('token');
      
      // First check if PAK exists
      const checkResponse = await fetch(`http://10.0.0.7:5000/api/PAFemployee/check-pak/${formData.pak}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const checkData = await checkResponse.json();
      
      if (checkData.exists) {
        setMessage({ type: 'error', text: `PAK ${formData.pak} already exists! Please generate a new one.` });
        setIsSaving(false);
        return;
      }
      
      // Create new employee
      const response = await fetch('http://10.0.0.7:5000/api/PAFemployee/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `PAF Employee created successfully! PAK: ${data.employee.pak}, Default Password: 123` 
        });
        
        // Reset form
        setTimeout(() => {
          setFormData({
            pak: '',
            category: '',
            rank: '',
            employee_name: '',
            branch_trade: '',
            phone_office: '',
            intercom: '',
            phone_res: '',
            defcom_office: '',
            defcom_res: '',
            mobile: '',
            address: '',
            email: '',
            postin_date: new Date().toISOString().split('T')[0],
            postout_date: '',
            section: '',
            deployment: '',
            custodian: ''
          });
          setErrors({});
          
          // Optionally navigate
          setTimeout(() => {
            navigate('/hr/paf/view-employee');
          }, 3000);
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Error creating new PAF employee:', error);
      setMessage({ type: 'error', text: 'Failed to create PAF employee' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure? All entered data will be lost.')) {
      navigate('/hr/paf/view-employee');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset form? All entered data will be lost.')) {
      setFormData({
        pak: '',
        category: '',
        rank: '',
        employee_name: '',
        branch_trade: '',
        phone_office: '',
        intercom: '',
        phone_res: '',
        defcom_office: '',
        defcom_res: '',
        mobile: '',
        address: '',
        email: '',
        postin_date: new Date().toISOString().split('T')[0],
        postout_date: '',
        section: '',
        deployment: '',
        custodian: ''
      });
      setErrors({});
      setMessage({ type: '', text: '' });
    }
  };

  return (
    <div className="paf-employee-form-page">
      
      
      
     
      {/* Header */}
        <StandardHeader
          title={<h1>Add New PAF Employee</h1>}
          subtitle="Create a new PAF employee record"

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
              <label style={{color:'Black'}}>Category *</label>
              <select
                name="category"
                value={formData.category}
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
              <label style={{color:'Black'}}>Rank *</label>
              <select
                name="rank"
                value={formData.rank}
                onChange={handleChange}
                className={errors.rank ? 'error' : ''}
                disabled={!formData.category}
              >
                <option value="">Select Rank</option>
                {formData.category && rankOptions[formData.category] ? (
                  rankOptions[formData.category].map(rank => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))
                ) : (
                  <option value="">Select Category first</option>
                )}
              </select>
              {errors.rank && <span className="error-text">{errors.rank}</span>}
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>Employee Name *</label>
              <input
                type="text"
                name="employee_name"
                value={formData.employee_name}
                onChange={handleChange}
                className={errors.employee_name ? 'error' : ''}
                placeholder="Full Name"
              />
              {errors.employee_name && <span className="error-text">{errors.employee_name}</span>}
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>PAK Number *</label>
              <div className="input-with-button">
                <input
                  type="text"
                  name="pak"
                  value={formData.pak}
                  onChange={handleChange}
                  className={errors.pak ? 'error' : ''}
                  placeholder="e.g., PAF-001"
                />
                <button 
                  type="button" 
                  className="generate-btn"
                  onClick={generatePAK}
                  disabled={!formData.category}
                >
                  Generate
                </button>
              </div>
              {errors.pak && <span className="error-text">{errors.pak}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Professional Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label style={{color:'Black'}}>Branch/Trade</label>
              <input
                type="text"
                name="branch_trade"
                value={formData.branch_trade}
                onChange={handleChange}
                placeholder="e.g., Technical, Administration"
              />
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>Section</label>
              <input
                type="text"
                name="section"
                value={formData.section}
                onChange={handleChange}
                placeholder="e.g., IT Department, Operations"
              />
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>Deployment</label>
              <input
                type="text"
                name="deployment"
                value={formData.deployment}
                onChange={handleChange}
                placeholder="e.g., HQ, Wing, Squadron"
              />
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>Custodian</label>
              <input
                type="text"
                name="custodian"
                value={formData.custodian}
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
              <label style={{color:'Black'}}>Phone (Office)</label>
              <input
                type="text"
                name="phone_office"
                value={formData.phone_office}
                onChange={handleChange}
                placeholder="051-1234567"
              />
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>Intercom</label>
              <input
                type="text"
                name="intercom"
                value={formData.intercom}
                onChange={handleChange}
                placeholder="101"
              />
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>Phone (Residence)</label>
              <input
                type="text"
                name="phone_res"
                value={formData.phone_res}
                onChange={handleChange}
                placeholder="051-7654321"
              />
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>Defcom (Office)</label>
              <input
                type="text"
                name="defcom_office"
                value={formData.defcom_office}
                onChange={handleChange}
                placeholder="DEF-001"
              />
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>Defcom (Residence)</label>
              <input
                type="text"
                name="defcom_res"
                value={formData.defcom_res}
                onChange={handleChange}
                placeholder="DEF-002"
              />
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>Mobile</label>
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
              <label style={{color:'Black'}}>Email</label>
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
              <label style={{color:'Black'}}>Address</label>
              <textarea
                name="address"
                value={formData.address}
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
              <label style={{color:'Black'}}>Post In Date</label>
              <input
                type="date"
                name="postin_date"
                value={formData.postin_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{color:'Black'}}>Post Out Date (if applicable)</label>
              <input
                type="date"
                name="postout_date"
                value={formData.postout_date}
                onChange={handleChange}
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
            {isSaving ? 'Creating...' : 'Create PAF Employee'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PAFNewEmployeeForm;