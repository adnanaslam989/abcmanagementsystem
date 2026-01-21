import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ViewProfile.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const ViewProfile = () => {
  const navigate = useNavigate();
  const [currentEmployees, setCurrentEmployees] = useState([]);
  const [exEmployees, setExEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedExEmployee, setSelectedExEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('/images/default-avatar.png');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const API_BASE_URL = 'http://10.0.0.7:5000/api/PAFemployee';

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employeeData?.pak) {
      setPhotoPreview(getPhotoUrl(employeeData.pak));
    }
  }, [employeeData?.pak]);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Fetching PAF employees from:', API_BASE_URL);

      const token = localStorage.getItem('token');

      // Fetch current employees
      const currentResponse = await fetch(`${API_BASE_URL}/list/current`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!currentResponse.ok) {
        throw new Error(`HTTP error! status: ${currentResponse.status}`);
      }
      
      const currentData = await currentResponse.json();
      console.log('✅ Current PAF employees data:', currentData);
      
      if (currentData.success) {
        setCurrentEmployees(currentData.employees || []);
      } else {
        throw new Error(currentData.message || 'Failed to fetch current PAF employees');
      }

      // Fetch ex-employees
      const exResponse = await fetch(`${API_BASE_URL}/list/ex`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!exResponse.ok) {
        throw new Error(`HTTP error! status: ${exResponse.status}`);
      }
      
      const exData = await exResponse.json();
      console.log('✅ Ex-PAF employees data:', exData);
      
      if (exData.success) {
        setExEmployees(exData.employees || []);
      }

    } catch (error) {
      console.error('❌ Error fetching PAF employees:', error);
      setError(`Failed to load employee list: ${error.message}. Make sure your backend server is running on port 5000.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCurrentEmployeeSelect = async (employee) => {
    if (!employee) return;
    
    setIsLoading(true);
    setSelectedEmployee(employee);
    setSelectedExEmployee(null);
    setError(null);
    setShowEditForm(false);
    
    try {
      const pak = employee.split(' : ')[0];
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/${pak}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setEmployeeData(result.employee);
      } else {
        throw new Error(result.message || 'Failed to fetch employee data');
      }
    } catch (error) {
      console.error('Error fetching PAF employee data:', error);
      setError(`Failed to load employee details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExEmployeeSelect = async (employee) => {
    if (!employee) return;
    
    setIsLoading(true);
    setSelectedExEmployee(employee);
    setSelectedEmployee(null);
    setError(null);
    setShowEditForm(false);
    
    try {
      const pak = employee.split(' : ')[0];
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/${pak}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setEmployeeData(result.employee);
      } else {
        throw new Error(result.message || 'Failed to fetch employee data');
      }
    } catch (error) {
      console.error('Error fetching PAF employee data:', error);
      setError(`Failed to load employee details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEditEmployee = () => {
    if (employeeData) {
      navigate(`/hr/paf/edit-employee/${employeeData.pak}`);
    }
  };

  const handleAddNewEmployee = () => {
    navigate('/hr/paf/new-employee');
  };

const getPhotoUrl = (pak) => {
  return `${API_BASE_URL}/${pak}/picture?t=${Date.now()}`;
};

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      setUploadStatus({
        type: 'error',
        message: 'Please select an image file (JPEG, PNG, etc.)'
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus({
        type: 'error',
        message: 'File size must be less than 5MB'
      });
      return;
    }
    
    // Preview image
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Set selected file and automatically upload
    setSelectedFile(file);
    handlePhotoUpload(file);
  };

const handlePhotoUpload = async (file = selectedFile) => {
  if (!file || !employeeData?.pak) return;
  
  setUploadingPhoto(true);
  setUploadStatus({
    type: 'info',
    message: 'Uploading photo...'
  });
  
  const formData = new FormData();
  formData.append('picture', file); // Changed from 'photo' to 'picture'
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${API_BASE_URL}/${employeeData.pak}/picture`, // Correct endpoint
      {
        method: 'PUT', // Changed from POST to PUT
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData, browser will set it automatically
        },
        body: formData,
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      setUploadStatus({
        type: 'success',
        message: 'Photo uploaded successfully!'
      });
      
      // Refresh photo preview after 2 seconds
      setTimeout(() => {
        setPhotoPreview(`${getPhotoUrl(employeeData.pak)}?t=${Date.now()}`);
        setUploadStatus(null);
      }, 2000);
    } else {
      setUploadStatus({
        type: 'error',
        message: data.message || 'Failed to upload photo'
      });
    }
  } catch (error) {
    console.error('Error uploading photo:', error);
    setUploadStatus({
      type: 'error',
      message: 'Network error. Please try again.'
    });
  } finally {
    setUploadingPhoto(false);
    setSelectedFile(null);
    // Clear the file input
    const fileInput = document.getElementById('photo-upload-input');
    if (fileInput) fileInput.value = '';
  }
};

  // Edit Form Component (Inline)
  const EditEmployeeForm = ({ employeeData, onSave, onCancel }) => {
    const [formData, setFormData] = useState(employeeData || {});
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      setFormData(employeeData || {});
    }, [employeeData]);

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

    const validateForm = () => {
      const newErrors = {};
      
      if (!formData.employee_name?.trim()) {
        newErrors.employee_name = 'Employee name is required';
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
        newErrors.mobile = 'Mobile must be in format: 0300-1234567';
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
      
      try {
        // Prepare data - convert empty date strings to null
        const dataToSend = { ...formData };
        const token = localStorage.getItem('token');
        
        // Convert empty date strings to null for backend
        if (dataToSend.postin_date === '') dataToSend.postin_date = null;
        if (dataToSend.postout_date === '') dataToSend.postout_date = null;
        
        const response = await fetch(`${API_BASE_URL}/${formData.pak}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend)
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert('Employee updated successfully!');
          onSave(formData);
          setShowEditForm(false);
        } else {
          throw new Error(data.message);
        }
      } catch (error) {
        console.error('Error saving employee data:', error);
        alert(`Failed to save changes: ${error.message}`);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="edit-form-overlay">
        <div className="edit-form-container">
          <div className="edit-form-header">
            <h3>Edit PAF Employee Profile</h3>
            <p>PAK: {formData.pak} - {formData.employee_name}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="edit-form">
            <div className="form-section">
              <h4>Personal Information</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Employee Name *</label>
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
                  <label>PAK Number *</label>
                  <input
                    type="text"
                    name="pak"
                    value={formData.pak || ''}
                    onChange={handleChange}
                    className={errors.pak ? 'error' : ''}
                  />
                  {errors.pak && <span className="error-text">{errors.pak}</span>}
                </div>

                <div className="form-group">
                  <label>Rank *</label>
                  <input
                    type="text"
                    name="rank"
                    value={formData.rank || ''}
                    onChange={handleChange}
                    className={errors.rank ? 'error' : ''}
                  />
                  {errors.rank && <span className="error-text">{errors.rank}</span>}
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Contact Information</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Phone (Office)</label>
                  <input
                    type="text"
                    name="phone_office"
                    value={formData.phone_office || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Intercom</label>
                  <input
                    type="text"
                    name="intercom"
                    value={formData.intercom || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Phone (Residence)</label>
                  <input
                    type="text"
                    name="phone_res"
                    value={formData.phone_res || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Defcom (Office)</label>
                  <input
                    type="text"
                    name="defcom_office"
                    value={formData.defcom_office || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Defcom (Residence)</label>
                  <input
                    type="text"
                    name="defcom_res"
                    value={formData.defcom_res || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Mobile</label>
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
                  <label>Email</label>
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
              <h4>Professional Information</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Branch/Trade</label>
                  <input
                    type="text"
                    name="branch_trade"
                    value={formData.branch_trade || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Post In Date</label>
                  <input
                    type="date"
                    name="postin_date"
                    value={formData.postin_date || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Post Out Date</label>
                  <input
                    type="date"
                    name="postout_date"
                    value={formData.postout_date || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Section</label>
                  <input
                    type="text"
                    name="section"
                    value={formData.section || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Deployment</label>
                  <input
                    type="text"
                    name="deployment"
                    value={formData.deployment || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Custodian</label>
                  <input
                    type="text"
                    name="custodian"
                    value={formData.custodian || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Address Details</h4>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={formData.address || ''}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={onCancel}
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
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="view-employee-page">


{/* Header */}
           <StandardHeader 
        title={<h1>PAF Employee Management</h1>}
        subtitle={ <div className="header-actions">
            <button 
              className="add-new-btn"
              onClick={handleAddNewEmployee}
              disabled={isLoading}
            >
              ➕ Add New PAF Employee
            </button>
          </div>
        }
      />


      <div className="main-content-wrapper">
        <div className="a4-container">
          <div className="employee-content">
            {error && (
              <div className="error-message">
                <p>{error}</p>
                <div className="error-actions">
                  <button onClick={fetchEmployees} className="retry-btn">
                    Retry
                  </button>
                  <button onClick={() => setError(null)} className="dismiss-btn">
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <section className="selection-section">
              <form className="employee-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="currentEmployee" className='current_Employee' style={{color:'Black'}}>CURRENT PAF EMPLOYEE:</label>
                    <select 
                      id="currentEmployee"
                      value={selectedEmployee || ''}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="form-select"
                      disabled={isLoading}
                    >
                      <option value="">--Select PAF Employee--</option>
                      {currentEmployees.map((employee, index) => (
                        <option key={index} value={employee}>
                          {employee}
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      className="flatbtn-blu"
                      onClick={() => handleCurrentEmployeeSelect(selectedEmployee)}
                      disabled={!selectedEmployee || isLoading}
                    >
                      View Profile
                    </button>
                    <div className="employee-count">
                      {currentEmployees.length} current PAF employees
                    </div>
                  </div>
             

                  <div className="form-group">
                    <label htmlFor="exEmployee" style={{color:'Black'}}>EX-PAF EMPLOYEE:</label>
                    <select 
                      id="exEmployee"
                      value={selectedExEmployee || ''}
                      onChange={(e) => setSelectedExEmployee(e.target.value)}
                      className="form-select"
                      disabled={isLoading || exEmployees.length === 0}
                    >
                      <option value="">--Select Ex PAF Employee--</option>
                      {exEmployees.map((employee, index) => (
                        <option key={index} value={employee}>
                          {employee}
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      className="flatbtn-blu"
                      onClick={() => handleExEmployeeSelect(selectedExEmployee)}
                      disabled={!selectedExEmployee || isLoading || exEmployees.length === 0}
                    >
                      View Profile
                    </button>
                    <div className="employee-count">
                      {exEmployees.length} ex-PAF employees
                    </div>
                  </div>
                </div>
              </form>
            </section>

            {isLoading && (
              <div className="loading-section">
                <div className="loading-spinner"></div>
                <p>Loading PAF employee data...</p>
              </div>
            )}

            {employeeData && !isLoading && (
              <section className="details-section">
                <div className="details-container">
                  {/* Employee Photo Section */}
                  <div className="employee-photo-section">
                    {/* Photo Container */}
                    <div className="photo-container">
                      <img 
                        src={photoPreview}
                        alt="PAF Employee" 
                        className="photo-img"
                        onError={(e) => {
                          e.target.src = '/images/default-avatar.png';
                        }}
                      />
                      
                      {/* Photo Overlay with Upload Button */}
                      <div className="photo-overlay">
                        <button
                          type="button"
                          className="upload-photo-btn"
                          onClick={() => document.getElementById('photo-upload-input').click()}
                          disabled={uploadingPhoto}
                        >
                          <span className="upload-icon">📷</span>
                          <span className="upload-text">
                            {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      id="photo-upload-input"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden-file-input"
                    />

                    {/* Upload status message */}
                    {uploadStatus && (
                      <div className={`upload-status ${uploadStatus.type}`}>
                        {uploadStatus.message}
                      </div>
                    )}

                    {/* Employee Info Card */}
                    <div className="employee-info-card">
                      <div className="employee-basic-info">
                        <h3>{employeeData.employee_name}</h3>
                        <p className="employee-rank">{employeeData.rank || 'N/A'}</p>
                        <p className="employee-pak">PAK: {employeeData.pak}</p>
                        <p className="employee-category">Category: {employeeData.category || 'N/A'}</p>
                        <p className="employee-section">Section: {employeeData.section || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {/* Employee Actions */}
                    <div className="employee-actions">
                      <button 
                        className="edit-btn"
                        onClick={handleEditEmployee}
                      >
                        <span className="btn-icon">✏️</span>
                        <span className="btn-text">Edit Profile</span>
                      </button>
                      <button 
                        className="edit-inline-btn"
                        onClick={() => setShowEditForm(true)}
                      >
                        <span className="btn-icon">⚡</span>
                        <span className="btn-text">Quick Edit</span>
                      </button>
                      <button 
                        className="print-btn-action"
                        onClick={handlePrint}
                      >
                        <span className="btn-icon">🖨️</span>
                        <span className="btn-text">Print</span>
                      </button>
                    </div>
                  </div>

                  {/* Employee Details Grid */}
                  <div className="employee-details">
                    <div className="datagrid">
                      <table className="employee-table">
                        <thead>
                          <tr>
                            <th colSpan="2">View PAF Employee Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="label">PAK NO.</td>
                            <td className="value">{employeeData.pak}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">CATEGORY</td>
                            <td className="value">{employeeData.category || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">RANK</td>
                            <td className="value">{employeeData.rank || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">NAME</td>
                            <td className="value">{employeeData.employee_name}</td>
                          </tr>
                          <tr>
                            <td className="label">BRANCH/TRADE</td>
                            <td className="value">{employeeData.branch_trade || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">PHONE OFFICE</td>
                            <td className="value">{employeeData.phone_office || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">INTERCOM</td>
                            <td className="value">{employeeData.intercom || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">PHONE RES</td>
                            <td className="value">{employeeData.phone_res || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">DEFCOM OFFICE</td>
                            <td className="value">{employeeData.defcom_office || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">DEFCOM RES</td>
                            <td className="value">{employeeData.defcom_res || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">MOBILE</td>
                            <td className="value">{employeeData.mobile || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">ADDRESS</td>
                            <td className="value">{employeeData.address || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">EMAIL</td>
                            <td className="value">{employeeData.email || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">POST IN DATE</td>
                            <td className="value">{employeeData.postin_date || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">POST OUT DATE</td>
                            <td className="value">{employeeData.postout_date || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">SECTION</td>
                            <td className="value">{employeeData.section || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">DEPLOYMENT</td>
                            <td className="value">{employeeData.deployment || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">CUSTODIAN</td>
                            <td className="value">{employeeData.custodian || 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {showEditForm && employeeData && (
              <EditEmployeeForm
                employeeData={employeeData}
                onSave={(updatedData) => {
                  setEmployeeData(updatedData);
                  fetchEmployees(); // Refresh the list
                }}
                onCancel={() => setShowEditForm(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProfile;