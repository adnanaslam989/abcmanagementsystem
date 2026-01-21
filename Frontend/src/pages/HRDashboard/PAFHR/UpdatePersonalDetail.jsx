// pages/HRDashboard/PAFHR/PAFemployee.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../../context/AppContext';
import './UpdatePersonalDetail.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';

const PAFemployee = () => {
  const { state } = useApp();
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
    postin_date: '',
    postout_date: '',
    section: '',
    deployment: '',
    custodian: ''
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [employeePicture, setEmployeePicture] = useState('/images/default-avatar.jpg');
  const fileInputRef = useRef(null);

  // Fetch PAF employee data from database
  useEffect(() => {
    const fetchPAFEmployeeData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const userPAK = state.user?.pak;
        
        if (!userPAK) {
          setMessage('User not authenticated');
          setLoading(false);
          return;
        }

        const response = await fetch(`http://10.0.0.7:5000/api/PAFemployee/${userPAK}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setFormData(data.employee);
          // Load employee picture
          await loadEmployeePicture(userPAK);
        } else {
          setMessage(data.message || 'Failed to fetch PAF employee data');
        }
      } catch (error) {
        console.error('Error fetching PAF employee data:', error);
        setMessage('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPAFEmployeeData();
  }, [state.user?.pak]);

  // Load employee picture
  const loadEmployeePicture = async (pak) => {
    try {
      const token = localStorage.getItem('token');
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const imageUrl = `http://10.0.0.7:5000/api/PAFemployee/${pak}/picture?t=${timestamp}`;
      
      // Create a test image to check if it loads
      const img = new Image();
      img.onload = () => {
        setEmployeePicture(imageUrl);
      };
      img.onerror = () => {
        setEmployeePicture('/images/default-avatar.jpg');
      };
      img.src = imageUrl;
      
    } catch (error) {
      console.error('Error loading employee picture:', error);
      setEmployeePicture('/images/default-avatar.jpg');
    }
  };

  // Check if employee has picture
  const checkPictureExists = async (pak) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://10.0.0.7:5000/api/PAFemployee/${pak}/has-picture`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.hasPicture;
      }
      return false;
    } catch (error) {
      console.error('Error checking picture:', error);
      return false;
    }
  };

  // Handle picture upload
  const handlePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Please select a valid image file (JPEG, PNG, etc.)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingPicture(true);
      const token = localStorage.getItem('token');
      const userPAK = state.user?.pak;

      const formData = new FormData();
      formData.append('picture', file);

      const response = await fetch(`http://10.0.0.7:5000/api/PAFemployee/${userPAK}/picture`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Picture updated successfully!');
        // Reload the picture
        await loadEmployeePicture(userPAK);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.message || 'Failed to update picture');
      }
    } catch (error) {
      console.error('Error uploading picture:', error);
      setMessage('Network error while uploading picture');
    } finally {
      setUploadingPicture(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Trigger file input click
  const handleUpdatePictureClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Remove picture
  const handleRemovePicture = async () => {
    try {
      const token = localStorage.getItem('token');
      const userPAK = state.user?.pak;

      const response = await fetch(`http://10.0.0.7:5000/api/PAFemployee/${userPAK}/picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Picture removed successfully!');
        setEmployeePicture('/images/default-avatar.jpg');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.message || 'Failed to remove picture');
      }
    } catch (error) {
      console.error('Error removing picture:', error);
      setMessage('Network error while removing picture');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      const userPAK = state.user?.pak;

      if (!userPAK) {
        setMessage('User not authenticated');
        setUpdating(false);
        return;
      }

      // Prepare data for update - convert empty strings to null for database
      const updateData = {
        category: formData.category || null,
        rank: formData.rank || null,
        branch_trade: formData.branch_trade || null,
        phone_office: formData.phone_office || null,
        intercom: formData.intercom || null,
        phone_res: formData.phone_res || null,
        defcom_office: formData.defcom_office || null,
        defcom_res: formData.defcom_res || null,
        mobile: formData.mobile || null,
        address: formData.address || null,
        email: formData.email || null,
        postin_date: formData.postin_date || null,
        postout_date: formData.postout_date || null,
        section: formData.section || null,
        deployment: formData.deployment || null,
        custodian: formData.custodian || null
      };

      console.log('🔄 Sending update data:', updateData);

      const response = await fetch(`http://10.0.0.7:5000/api/PAFemployee/${userPAK}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      console.log('📩 Backend response:', data);

      if (response.ok && data.success) {
        setMessage('PAF Employee data updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.message || `Failed to update data: ${response.status}`);
        console.error('Backend error response:', data);
      }
    } catch (error) {
      console.error('Network error updating PAF employee data:', error);
      setMessage(`Network error: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <div className="paf-employee">
        <div className="loading-container">
          <div className="loading-spinner">Loading PAF employee data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="paf-employee">
 

       {/* Header */}
           <StandardHeader 
        title={<h1>Update PAF Employee Detail</h1>}
        subtitle=   {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      />


      <form onSubmit={handleSubmit} className="paf-employee-form">
        <div className="form-container">
<div className="photo-section">
  <div className="photo-container">
    {/* Hidden file input */}
    <input
      type="file"
      ref={fileInputRef}
      onChange={handlePictureUpload}
      accept="image/*"
      style={{ display: 'none' }}
    />
    
    
    {/* Picture BELOW buttons */}
    <div className="photo-wrapper">
      <img 
        src={employeePicture} 
        alt="PAF Employee" 
        className="employee-photo"
        onError={(e) => {
          e.target.src = '/images/default-avatar.jpg';
        }}
      />
    </div>
    
    {uploadingPicture && (
      <div className="upload-progress">
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
        <p>Uploading picture...</p>
      </div>
    )}
  </div>
</div>




       {/* Updated form section with correct table structure */}
<div className="form-section">
  <div className="datagrid">
    <table>
      <thead>
        <tr>
          <th colSpan="2">PAF Employee Information</th>
        </tr>
      </thead>
      <tbody>
        {/* Row 1 */}
        <tr>
          <td>PAK:</td>
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
          <td>Category:</td>
          <td>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
            >
              <option value="">Select Category</option>
              <option value="Officer">Officer</option>
              <option value="JCO">JCO</option>
              <option value="Airman">Airman</option>
              <option value="Civilian">Civilian</option>
            </select>
          </td>
        </tr>

        {/* Row 2 */}
        <tr>
          <td>Rank:</td>
          <td>
            <input
              type="text"
              name="rank"
              value={formData.rank}
              onChange={handleInputChange}
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
          <td>Branch/Trade:</td>
          <td>
            <input
              type="text"
              name="branch_trade"
              value={formData.branch_trade}
              onChange={handleInputChange}
            />
          </td>
        </tr>
        <tr className="alt">
          <td>Phone Office:</td>
          <td>
            <input
              type="text"
              name="phone_office"
              value={formData.phone_office}
              onChange={handleInputChange}
            />
          </td>
        </tr>

        {/* Row 4 */}
        <tr>
          <td>Intercom:</td>
          <td>
            <input
              type="text"
              name="intercom"
              value={formData.intercom}
              onChange={handleInputChange}
            />
          </td>
        </tr>
        <tr className="alt">
          <td>Phone Residence:</td>
          <td>
            <input
              type="text"
              name="phone_res"
              value={formData.phone_res}
              onChange={handleInputChange}
            />
          </td>
        </tr>

        {/* Row 5 */}
        <tr>
          <td>Defcom Office:</td>
          <td>
            <input
              type="text"
              name="defcom_office"
              value={formData.defcom_office}
              onChange={handleInputChange}
            />
          </td>
        </tr>
        <tr className="alt">
          <td>Defcom Residence:</td>
          <td>
            <input
              type="text"
              name="defcom_res"
              value={formData.defcom_res}
              onChange={handleInputChange}
            />
          </td>
        </tr>

        {/* Row 6 */}
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
          <td>Address:</td>
          <td>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows="3"
            />
          </td>
        </tr>

        {/* Row 7 */}
        <tr>
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
        <tr className="alt">
          <td>Post In Date:</td>
          <td>
            <input
              type="date"
              name="postin_date"
              value={formData.postin_date}
              onChange={handleInputChange}
            />
          </td>
        </tr>

        {/* Row 8 */}
        <tr>
          <td>Post Out Date:</td>
          <td>
            <input
              type="date"
              name="postout_date"
              value={formData.postout_date}
              onChange={handleInputChange}
            />
          </td>
        </tr>
        <tr className="alt">
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
              <option value="OPERATIONS">OPERATIONS</option>
            </select>
          </td>
        </tr>

        {/* Row 9 */}
        <tr>
          <td>Deployment:</td>
          <td>
            <select
              name="deployment"
              value={formData.deployment}
              onChange={handleInputChange}
            >
              <option value="">Select Deployment</option>
              <option value="Admin Office">Admin Office</option>
              <option value="Workshop">Workshop</option>
              <option value="Main Gate">Main Gate</option>
              <option value="Canteen">Canteen</option>
              <option value="Operations Room">Operations Room</option>
              <option value="Control Room">Control Room</option>
              <option value="Technical Section">Technical Section</option>
            </select>
          </td>
        </tr>
        <tr className="alt">
          <td>Custodian:</td>
          <td>
            <input
              type="text"
              name="custodian"
              value={formData.custodian}
              onChange={handleInputChange}
            />
          </td>
        </tr>

      
      </tbody>
    </table>
      {/* ACTION BUTTONS ROW - CORRECTED */}
          <td colSpan="2" className="action-buttons">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update'}
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

export default PAFemployee;