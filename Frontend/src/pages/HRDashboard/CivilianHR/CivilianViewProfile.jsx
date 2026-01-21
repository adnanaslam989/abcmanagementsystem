import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CivilianViewProfile.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const CivilianViewProfile = () => {
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

  const API_BASE_URL = 'http://10.0.0.7:5000/api';

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

      console.log('🔄 Fetching employees from:', API_BASE_URL);

      // Fetch current employees
      const currentResponse = await fetch(`${API_BASE_URL}/employee/current-employees`);

      if (!currentResponse.ok) {
        throw new Error(`HTTP error! status: ${currentResponse.status}`);
      }

      const currentData = await currentResponse.json();
      console.log('✅ Current employees data:', currentData);

      if (currentData.success) {
        setCurrentEmployees(currentData.employees || []);
      } else {
        throw new Error(currentData.message || 'Failed to fetch current employees');
      }

      // Fetch ex-employees
      const exResponse = await fetch(`${API_BASE_URL}/employee/ex-employees`);

      if (!exResponse.ok) {
        throw new Error(`HTTP error! status: ${exResponse.status}`);
      }

      const exData = await exResponse.json();
      console.log('✅ Ex-employees data:', exData);

      if (exData.success) {
        setExEmployees(exData.employees || []);
      }

    } catch (error) {
      console.error('❌ Error fetching employees:', error);
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
      const response = await fetch(`${API_BASE_URL}/employee/${pak}`);

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
      console.error('Error fetching employee data:', error);
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
      const response = await fetch(`${API_BASE_URL}/employee/${pak}`);

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
      console.error('Error fetching employee data:', error);
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
      navigate(`/hr/civilian/edit-employee/${employeeData.pak}`);
    }
  };

  const handleAddNewEmployee = () => {
    navigate('/hr/civilian/new-employee');
  };

  const getPhotoUrl = (pak) => {
    return `${API_BASE_URL}/employee/employee/${pak}/photo?t=${Date.now()}`;
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
    formData.append('photo', file);

    try {
      const response = await fetch(
        `${API_BASE_URL}/employee/${employeeData.pak}/photo`,
        {
          method: 'POST',
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

      if (!formData.appointment?.trim()) {
        newErrors.appointment = 'Appointment is required';
      }

      if (!formData.cnic?.trim()) {
        newErrors.cnic = 'CNIC is required';
      } else if (!/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic)) {
        newErrors.cnic = 'CNIC must be in format: 35201-1234567-1';
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

        // Convert empty date strings to null for backend
        if (dataToSend.dob === '') dataToSend.dob = null;
        if (dataToSend.postin_date === '') dataToSend.postin_date = null;
        if (dataToSend.postout_date === '') dataToSend.postout_date = null;

        const response = await fetch(`${API_BASE_URL}/employee/${formData.pak}`, {
          method: 'PUT',
          headers: {
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
            <h3>Edit Employee Profile</h3>
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
                  <label>Father Name</label>
                  <input
                    type="text"
                    name="father_name"
                    value={formData.father_name || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>CNIC *</label>
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
                  <label>Date of Birth</label>
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
              <h4>Contact Information</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone || ''}
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
              <h4>Address Details</h4>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Temporary Address</label>
                  <textarea
                    name="temp_address"
                    value={formData.temp_address || ''}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Permanent Address</label>
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
              <h4>Additional Information</h4>
              <div className="form-grid">
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
                  <label>Section</label>
                  <input
                    type="text"
                    name="section"
                    value={formData.section || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Qualification</label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Experience</label>
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience || ''}
                    onChange={handleChange}
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
        title={<h1>Civilian Employee Management</h1>}
        subtitle={ 
     <div className="header-actions">
            <button
              className="add-new-btn"
              onClick={handleAddNewEmployee}
              disabled={isLoading}
            >
              ➕ Add New Employee
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
                    <label style={{color:'Black'}}>CURRENT EMPLOYEE:</label>
                    <select
                      id="currentEmployee"
                      value={selectedEmployee || ''}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="form-select"
                      disabled={isLoading}
                    >
                      <option value="">--Select Employee--</option>
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
                      {currentEmployees.length} current employees
                    </div>
                  </div>
                 

                  <div className="form-group">
                    <label style={{color:'Black'}}>EX-EMPLOYEE:</label>
                    <select
                      id="exEmployee"
                      value={selectedExEmployee || ''}
                      onChange={(e) => setSelectedExEmployee(e.target.value)}
                      className="form-select"
                      disabled={isLoading || exEmployees.length === 0}
                    >
                      <option value="">--Select Ex Employee--</option>
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
                      {exEmployees.length} ex-employees
                    </div>
                  </div>
                </div>
              </form>
            </section>

            {isLoading && (
              <div className="loading-section">
                <div className="loading-spinner"></div>
                <p>Loading employee data...</p>
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
                        alt="Employee"
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
                        <p className="employee-appointment">{employeeData.appointment || 'N/A'}</p>
                        <p className="employee-pak">PAK: {employeeData.pak}</p>
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
                            <th colSpan="2">View Civilian Employee Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="label">PAK NO.</td>
                            <td className="value">{employeeData.pak}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">APPOINTMENT</td>
                            <td className="value">{employeeData.appointment || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">EMPLOYEE NAME</td>
                            <td className="value">{employeeData.employee_name}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">FATHER NAME</td>
                            <td className="value">{employeeData.father_name || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">PHONE</td>
                            <td className="value">{employeeData.phone || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">MOBILE</td>
                            <td className="value">{employeeData.mobile || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">TEMPORARY ADDRESS</td>
                            <td className="value">{employeeData.temp_address || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">PERMANENT ADDRESS</td>
                            <td className="value">{employeeData.permanent_address || 'N/A'}</td>
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
                            <td className="label">CNIC</td>
                            <td className="value">{employeeData.cnic || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">DATE OF BIRTH</td>
                            <td className="value">{employeeData.dob || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">QUALIFICATION</td>
                            <td className="value">{employeeData.qualification || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">EXPERIENCE</td>
                            <td className="value">{employeeData.experience || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">REFERENCE</td>
                            <td className="value">{employeeData.reference || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">SALARY (PM)</td>
                            <td className="value">{employeeData.salary_pm || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">DEPLOYMENT</td>
                            <td className="value">{employeeData.deployment || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">BANK ACCOUNT</td>
                            <td className="value">{employeeData.bank_account || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">BANK ADDRESS</td>
                            <td className="value">{employeeData.bank_address || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">BLOOD GROUP</td>
                            <td className="value">{employeeData.blood_group || 'N/A'}</td>
                          </tr>
                          <tr className="alt">
                            <td className="label">SECTION</td>
                            <td className="value">{employeeData.section || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="label">PASS NO</td>
                            <td className="value">{employeeData.pass_no || 'N/A'}</td>
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

export default CivilianViewProfile;