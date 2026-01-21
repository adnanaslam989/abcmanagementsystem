// pages/HRDashboard/PAFHR/UpdatePersonalDetail.jsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import './UpdatePersonalDetail.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const UpdatePersonalDetail = () => {
  const { state } = useApp();
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
    postin_date: '',
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

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('/images/default-avatar.jpg');

  // Use your backend URL
  const API_BASE_URL = 'http://10.0.0.7:5000/api';

  // Fetch employee data from database
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Use logged-in user's PAK or you can modify this to accept PAK as prop/parameter
        const userPAK = state.user?.pak;

        if (!userPAK) {
          setMessage('User not authenticated');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/employee/${userPAK}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setFormData(data.employee);

          // Load employee photo
          loadEmployeePhoto(userPAK);
        } else {
          setMessage(data.message || 'Failed to fetch employee data');
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
        setMessage('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [state.user?.pak]);

  // Load employee photo
  const loadEmployeePhoto = async (pak) => {
    try {
      const photoUrl = `${API_BASE_URL}/employee/employee/${pak}/photo?t=${new Date().getTime()}`;
      setPhotoPreview(photoUrl);
    } catch (error) {
      console.error('Error loading photo:', error);
      setPhotoPreview('/images/default-avatar.jpg');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleMobileFormat = (e) => {
    let value = e.target.value.replace(/-/g, '');
    if (value.length === 11) {
      value = value.slice(0, 4) + '-' + value.slice(4);
    }
    setFormData(prevState => ({
      ...prevState,
      mobile: value
    }));
  };

  // Handle file selection for photo upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage('Please select an image file (JPEG, PNG, etc.)');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File size too large. Please select an image under 5MB.');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload photo to server
  const handlePhotoUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a photo first');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setUploadingPhoto(true);
      const token = localStorage.getItem('token');
      const userPAK = state.user?.pak;

      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('pak', userPAK);

      const response = await fetch(`${API_BASE_URL}/employee/${userPAK}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Photo updated successfully!');
        setSelectedFile(null);

        // Refresh photo preview to get the updated version
        loadEmployeePhoto(userPAK);
      } else {
        throw new Error(data.message || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setMessage('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      const userPAK = state.user?.pak;

      // Prepare data for update (only include editable fields)
      const updateData = {
        pass_no: formData.pass_no,
        father_name: formData.father_name,
        phone: formData.phone,
        mobile: formData.mobile,
        temp_address: formData.temp_address,
        permanent_address: formData.permanent_address,
        email: formData.email,
        dob: formData.dob,
        qualification: formData.qualification,
        experience: formData.experience,
        reference: formData.reference,
        deployment: formData.deployment,
        blood_group: formData.blood_group,
        section: formData.section
      };

      const response = await fetch(`${API_BASE_URL}/employee/${userPAK}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Data updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.message || 'Failed to update data');
      }
    } catch (error) {
      console.error('Error updating data:', error);
      setMessage('Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <div className="update-personal-detail">
        <div className="loading-container">
          <div className="loading-spinner">Loading employee data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="update-personal-detail">
      
      {/* Header */}
                 <StandardHeader 
              title={<h1>Update Personal Employee Detail</h1>}
              subtitle={ <div className="header-actions">
                  {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
                </div>
              }
            />
            
      <form onSubmit={handleSubmit} className="personal-detail-form">
        <div className="form-container">
          <div className="photo-section">
            <div className="photo-container">
              <img
                src={photoPreview}
                alt="Employee"
                className="employee-photo"
                onError={(e) => {
                  e.target.src = '/images/default-avatar.jpg';
                }}
              />

           

             
            </div>
          </div>

          <div className="form-section">
            <div className="datagrid">
              <table>
                <thead>
                  <tr>
                    <th colSpan="2">Personal Information</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 */}
                  <tr>
                    <td>Pak:</td>
                    <td>
                      <input
                        type="text"
                        name="pak"
                        value={formData.pak}
                        onChange={handleInputChange}
                        className="readonly"
                        readOnly
                      />
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Pass No.:</td>
                    <td>
                      <input
                        type="text"
                        name="pass_no"
                        value={formData.pass_no}
                        onChange={handleInputChange}
                      />
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr>
                    <td>Appointment:</td>
                    <td>
                      <input
                        type="text"
                        name="appointment"
                        value={formData.appointment}
                        onChange={handleInputChange}
                        className="readonly"
                        readOnly
                      />
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Employee Name:</td>
                    <td>
                      <input
                        type="text"
                        name="employee_name"
                        value={formData.employee_name}
                        onChange={handleInputChange}
                        className="readonly"
                        readOnly
                      />
                    </td>
                  </tr>

                  {/* Row 3 */}
                  <tr>
                    <td>Father Name:</td>
                    <td>
                      <input
                        type="text"
                        name="father_name"
                        value={formData.father_name}
                        onChange={handleInputChange}
                      />
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Phone:</td>
                    <td>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </td>
                  </tr>

                  {/* Row 4 */}
                  <tr>
                    <td>Mobile:</td>
                    <td>
                      <input
                        type="text"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        onBlur={handleMobileFormat}
                        placeholder="0300-1234567"
                      />
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Temporary Address:</td>
                    <td>
                      <textarea
                        name="temp_address"
                        value={formData.temp_address}
                        onChange={handleInputChange}
                        rows="3"
                      />
                    </td>
                  </tr>

                  {/* Row 5 */}
                  <tr>
                    <td>Permanent Address:</td>
                    <td>
                      <textarea
                        name="permanent_address"
                        value={formData.permanent_address}
                        onChange={handleInputChange}
                        rows="3"
                      />
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Email:</td>
                    <td>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$"
                        title="pattern should be abc@yahoo.com"
                      />
                    </td>
                  </tr>

                  {/* Row 6 */}
                  <tr>
                    <td>Post In Date:</td>
                    <td>
                      <input
                        type="date"
                        name="postin_date"
                        value={formData.postin_date}
                        onChange={handleInputChange}
                        className="readonly"
                        readOnly
                      />
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Post Out Date:</td>
                    <td>
                      <input
                        type="date"
                        name="postout_date"
                        value={formData.postout_date}
                        onChange={handleInputChange}
                        className="readonly"
                        readOnly
                      />
                    </td>
                  </tr>

                  {/* Row 7 */}
                  <tr>
                    <td>CNIC:</td>
                    <td>
                      <input
                        type="text"
                        name="cnic"
                        value={formData.cnic}
                        onChange={handleInputChange}
                        className="readonly"
                        readOnly
                      />
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Date Of Birth:</td>
                    <td>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                      />
                    </td>
                  </tr>

                  {/* Row 8 */}
                  <tr>
                    <td>Qualification:</td>
                    <td>
                      <input
                        type="text"
                        name="qualification"
                        value={formData.qualification}
                        onChange={handleInputChange}
                      />
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Experience:</td>
                    <td>
                      <textarea
                        name="experience"
                        value={formData.experience}
                        onChange={handleInputChange}
                        rows="3"
                      />
                    </td>
                  </tr>

                  {/* Row 9 */}
                  <tr>
                    <td>Reference:</td>
                    <td>
                      <input
                        type="text"
                        name="reference"
                        value={formData.reference}
                        onChange={handleInputChange}
                      />
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Salary PM:</td>
                    <td>
                      <input
                        type="text"
                        name="salary_pm"
                        value={formData.salary_pm}
                        onChange={handleInputChange}
                        className="readonly"
                        readOnly
                      />
                    </td>
                  </tr>

                  {/* Row 10 */}
                  <tr>
                    <td>Deployment:</td>
                    <td>
                      <select
                        name="deployment"
                        value={formData.deployment}
                        onChange={handleInputChange}
                      >
                        <option value="Research & Analysis">Research & Analysis</option>
                        <option value="Design & Development">Design & Development</option>
                        <option value="Admin Office">Admin Office</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Main Gate">Main Gate</option>
                        <option value="Canteen">Canteen</option>
                      </select>
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Bank Account:</td>
                    <td>
                      <input
                        type="text"
                        name="bank_account"
                        value={formData.bank_account}
                        onChange={handleInputChange}
                        className="readonly"
                        readOnly
                      />
                    </td>
                  </tr>

                  {/* Row 11 */}
                  <tr>
                    <td>Bank Address:</td>
                    <td>
                      <input
                        type="text"
                        name="bank_address"
                        value={formData.bank_address}
                        onChange={handleInputChange}
                        className="readonly"
                        readOnly
                      />
                    </td>
                  </tr>
                  <tr className="alt">
                    <td>Blood Group:</td>
                    <td>
                      <select
                        name="blood_group"
                        value={formData.blood_group}
                        onChange={handleInputChange}
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
                    </td>
                  </tr>

                  {/* Row 12 */}
                  <tr>
                    <td>Section:</td>
                    <td>
                      <select
                        name="section"
                        value={formData.section}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Section</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="TECH">TECH</option>
                        <option value="SECURITY">SECURITY</option>
                        <option value="MESS">MESS</option>
                        <option value="HR">HR</option>
                        <option value="FINANCE">FINANCE</option>
                      </select>
                    </td>
                  </tr>


                </tbody>
              </table>

              {/* Action Buttons */}
              <td colSpan="2" className="action-buttons">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Update Personal Data'}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCancel}
                  disabled={updating}
                >
                  Cancel
                </button>
              </td>


            </div>
          </div>
        </div>
      </form>

      <div className="form-note">
        <h4>Note: Pink highlighted text fields are readonly!</h4>
      </div>
    </div>
  );
};

export default UpdatePersonalDetail;