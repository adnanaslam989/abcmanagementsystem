import React, { useState, useEffect } from 'react';
import './AssignUserRoles.css';
import '../../../pages/Global/GlobalStyles.css';
import StandardHeader from '../../../pages/Global/StandardHeader';


const AssignUserRoles = () => {
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedPak, setSelectedPak] = useState('');
  const [selectedEmployeeInfo, setSelectedEmployeeInfo] = useState(null);
  const [menuModules, setMenuModules] = useState({});
  const [roles, setRoles] = useState({
    PAF_HR: { add: false, update: false, view: false, assign: false },
    PAF_Attendance: { add: false, update: false, view: false, assign: false },
    Civilian_HR: { add: false, update: false, view: false, assign: false },
    Civilian_Attendance: { add: false, update: false, view: false, assign: false }
  });
  
  const [loading, setLoading] = useState(true);
  const [fetchingRoles, setFetchingRoles] = useState(false);
  const [fetchingMenu, setFetchingMenu] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('assign'); // 'assign' or 'update'

  // Fetch all employees and menu modules on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Fetch employees
        const employeesResponse = await fetch('http://10.0.0.7:5000/api/roles/all-employees');
        if (!employeesResponse.ok) throw new Error('Failed to fetch employees');
        const employeesData = await employeesResponse.json();
        
        if (employeesData.success) {
          setAllEmployees(employeesData.employees || []);
        } else {
          throw new Error(employeesData.message || 'Failed to load employees');
        }
        
        // Fetch menu modules with permissions
        const menuResponse = await fetch('http://10.0.0.7:5000/api/roles/menu-with-permissions');
        if (!menuResponse.ok) throw new Error('Failed to fetch menu permissions');
        const menuData = await menuResponse.json();
        
        if (menuData.success) {
          setMenuModules(menuData.modules || {});
        }
        
      } catch (error) {
        console.error('Error initializing data:', error);
        setMessage(`Error loading data: ${error.message}`);
        
        // Fallback mock data
        const mockEmployees = [
          { PAK: 'PAK001', display_text: 'PAK001 : Captain : Ali Khan (uniformed)' },
          { PAK: 'CIV001', display_text: 'CIV001 : Assistant : Sarah Wilson (civilian)' },
        ];
        setAllEmployees(mockEmployees);
        
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Extract PAK from selected employee
  const extractPakFromSelection = (selection) => {
    if (!selection) return '';
    return selection.split(' : ')[0] || '';
  };

  // Handle employee selection change
  const handleEmployeeChange = async (e) => {
    const selection = e.target.value;
    setSelectedEmployee(selection);
    const pak = extractPakFromSelection(selection);
    setSelectedPak(pak);
    
    // Clear previous employee info
    setSelectedEmployeeInfo(null);
    
    if (pak) {
      // Fetch employee details
      try {
        const response = await fetch(`http://10.0.0.7:5000/api/roles/employee/${pak}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSelectedEmployeeInfo(data.employee);
          }
        }
      } catch (error) {
        console.error('Error fetching employee details:', error);
      }
      
      // Fetch existing roles if in update mode or always fetch for both modes
      fetchUserRoles(pak);
    } else {
      resetRoles();
    }
  };

  // Fetch existing roles for a PAK
  const fetchUserRoles = async (pak) => {
    if (!pak) return;
    
    try {
      setFetchingRoles(true);
      setMessage('Loading existing roles...');
      
      const response = await fetch(`http://10.0.0.7:5000/api/roles/user/${pak}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.roles) {
        // Ensure all modules have proper structure
        const updatedRoles = {
          PAF_HR: data.roles.PAF_HR || { add: false, update: false, view: false, assign: false },
          PAF_Attendance: data.roles.PAF_Attendance || { add: false, update: false, view: false, assign: false },
          Civilian_HR: data.roles.Civilian_HR || { add: false, update: false, view: false, assign: false },
          Civilian_Attendance: data.roles.Civilian_Attendance || { add: false, update: false, view: false, assign: false }
        };
        
        setRoles(updatedRoles);
        setMessage('Existing roles loaded successfully');
        setTimeout(() => setMessage(''), 2000);
      } else {
        resetRoles();
        setMessage('No existing roles found for this user');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setMessage(`Error loading roles: ${error.message}`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setFetchingRoles(false);
    }
  };

  // Reset all roles to false
  const resetRoles = () => {
    setRoles({
      PAF_HR: { add: false, update: false, view: false, assign: false },
      PAF_Attendance: { add: false, update: false, view: false, assign: false },
      Civilian_HR: { add: false, update: false, view: false, assign: false },
      Civilian_Attendance: { add: false, update: false, view: false, assign: false }
    });
  };

  // Handle checkbox change for specific permission
  const handlePermissionChange = (module, permissionType) => (e) => {
    const checked = e.target.checked;
    setRoles(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permissionType]: checked
      }
    }));
  };

  // Handle select all for a module
  const handleSelectAll = (module) => (e) => {
    const checked = e.target.checked;
    setRoles(prev => ({
      ...prev,
      [module]: {
        add: checked,
        update: checked,
        view: checked,
        assign: checked
      }
    }));
  };

  // Handle select specific permission type for all modules
  const handleSelectAllPermissionType = (permissionType) => (e) => {
    const checked = e.target.checked;
    setRoles(prev => ({
      PAF_HR: { ...prev.PAF_HR, [permissionType]: checked },
      PAF_Attendance: { ...prev.PAF_Attendance, [permissionType]: checked },
      Civilian_HR: { ...prev.Civilian_HR, [permissionType]: checked },
      Civilian_Attendance: { ...prev.Civilian_Attendance, [permissionType]: checked }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that an employee is selected
    if (!selectedEmployee) {
      setMessage('Please select an employee');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const pak = selectedPak;
    if (!pak) {
      setMessage('Invalid PAK selected');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      // Prepare role data for submission
      const roleData = {
        pafhr: roles.PAF_HR,
        pafattendance: roles.PAF_Attendance,
        civilianhr: roles.Civilian_HR,
        civilianattendance: roles.Civilian_Attendance
      };

      const apiUrl = mode === 'update' 
        ? `http://10.0.0.7:5000/api/roles/update/${pak}`
        : 'http://10.0.0.7:5000/api/roles/assign';

      const method = mode === 'update' ? 'PUT' : 'POST';
      
      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pak: pak,
          roles: roleData
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`${mode === 'update' ? 'Updated' : 'Assigned'} user roles successfully!`);
        setTimeout(() => setMessage(''), 3000);
        
        // Reset form after successful submission (only if in assign mode)
        if (mode === 'assign') {
          setSelectedEmployee('');
          setSelectedPak('');
          setSelectedEmployeeInfo(null);
          resetRoles();
        }
      } else {
        throw new Error(result.message || 'Failed to save roles');
      }
      
    } catch (error) {
      setMessage(`Error ${mode === 'update' ? 'updating' : 'assigning'} user roles: ${error.message}`);
      console.error(`Error ${mode === 'update' ? 'updating' : 'assigning'} roles:`, error);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  const toggleMode = (newMode) => {
    setMode(newMode);
    setSelectedEmployee('');
    setSelectedPak('');
    setSelectedEmployeeInfo(null);
    resetRoles();
    setMessage('');
  };

  // Get menu items for a specific module
  const getMenuItemsForModule = (module) => {
    return menuModules[module] || [];
  };

  // Check if all permissions are selected for a module
  const isAllSelected = (module) => {
    const moduleRoles = roles[module] || {};
    return moduleRoles.add && moduleRoles.update && moduleRoles.view && moduleRoles.assign;
  };

  // Check if any permission is selected for a module
  const hasAnyPermission = (module) => {
    const moduleRoles = roles[module] || {};
    return moduleRoles.add || moduleRoles.update || moduleRoles.view || moduleRoles.assign;
  };

  if (loading) {
    return (
      <div className="assign-user-roles">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading employee data from database...</p>
        </div>
      </div>
    );
  }

  // Define modules in order
  const modules = [
    { key: 'PAF_HR', title: 'PAF Human Resource', color: '#1e40af' },
    { key: 'PAF_Attendance', title: 'PAF Attendance', color: '#1d4ed8' },
    { key: 'Civilian_HR', title: 'Civilian Human Resource', color: '#0369a1' },
    { key: 'Civilian_Attendance', title: 'Civilian Attendance', color: '#0ea5e9' }
  ];

  // Permission types
  const permissionTypes = [
    { key: 'add', label: 'Create/Add' },
    { key: 'update', label: 'Update/Edit' },
    { key: 'view', label: 'View/Read' },
    { key: 'assign', label: 'Assign Roles' }
  ];

  return (
    <div className="assign-user-roles">
             {/* Header */}
        <StandardHeader
          title={<h1>Assign/Update User Roles!</h1>}


          
      />
        

      <div className="content-wrapper">
    

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
            {fetchingRoles && <span className="loading-text"> (Loading...)</span>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="role-assignment-form">
          <div className="employee-selection">
            <div className="selection-container">
              <table className="selection-table">
                <tbody>
                  <tr>
                    <td colSpan="2">
                      <strong>SELECT EMPLOYEE:</strong>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2">
                      <select 
                        value={selectedEmployee}
                        onChange={handleEmployeeChange}
                        className="employee-select"
                        disabled={fetchingRoles}
                        style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                      >
                        <option value="">-- Select Employee (Civilian or PAF) --</option>
                        {allEmployees.map((employee, index) => (
                          <option key={index} value={employee.display_text}>
                            {employee.display_text}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  {selectedEmployeeInfo && (
                    <>
                      <tr>
                        <td colSpan="2" className="selected-info">
                          <strong>Selected Employee Details:</strong>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>PAK:</strong></td>
                        <td>{selectedEmployeeInfo.PAK}</td>
                      </tr>
                      <tr>
                        <td><strong>Name:</strong></td>
                        <td>{selectedEmployeeInfo.employee_name}</td>
                      </tr>
                      <tr>
                        <td><strong>Appointment/Rank:</strong></td>
                        <td>{selectedEmployeeInfo.appointment}</td>
                      </tr>
                      <tr>
                        <td><strong>Type:</strong></td>
                        <td>{selectedEmployeeInfo.employee_type}</td>
                      </tr>
                      {selectedEmployeeInfo.section && (
                        <tr>
                          <td><strong>Section:</strong></td>
                          <td>{selectedEmployeeInfo.section}</td>
                        </tr>
                      )}
                      {selectedEmployeeInfo.deployment && (
                        <tr>
                          <td><strong>Deployment:</strong></td>
                          <td>{selectedEmployeeInfo.deployment}</td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Global Permission Controls */}
          <div className="global-permissions">
            <h3>Quick Permissions</h3>
            <div className="permission-quick-select">
              {permissionTypes.map(perm => (
                <div key={perm.key} className="quick-permission">
                  <input 
                    type="checkbox" 
                    id={`quick-${perm.key}`}
                    onChange={handleSelectAllPermissionType(perm.key)}
                    checked={modules.every(module => roles[module.key]?.[perm.key])}
                    disabled={fetchingRoles}
                  />
                  <label htmlFor={`quick-${perm.key}`}>
                    {perm.label} All Modules
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="role-sections-container">
            <div className="role-sections">
              {modules.map((module) => {
                const moduleRoles = roles[module.key] || {};
                const menuItems = getMenuItemsForModule(module.key);
                const moduleHasAccess = hasAnyPermission(module.key);
                
                return (
                  <div key={module.key} className="role-section">
                    <div className="role-box">
                      <div 
                        className="section-title"
                        style={{ background: module.color }}
                      >
                        <h3>{module.title}</h3>
                        <div className="select-all">
                          <input 
                            type="checkbox" 
                            id={`select-all-${module.key}`}
                            checked={isAllSelected(module.key)}
                            onChange={handleSelectAll(module.key)}
                            disabled={fetchingRoles}
                          />
                          <label htmlFor={`select-all-${module.key}`}>Select All</label>
                        </div>
                      </div>
                      
                      <div className="permission-categories">
                        <div className="permission-category">
                          <h4>Module Permissions</h4>
                          <table className="role-table">
                            <tbody>
                              {permissionTypes.map(perm => (
                                <tr key={perm.key}>
                                  <td>{perm.label}</td>
                                  <td>
                                    <input 
                                      type="checkbox" 
                                      checked={moduleRoles[perm.key] || false}
                                      onChange={handlePermissionChange(module.key, perm.key)}
                                      className="role-checkbox"
                                      disabled={fetchingRoles}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {menuItems.length > 0 && (
                          <div className="menu-items-category">
                            <h4>Menu Items ({menuItems.length})</h4>
                            <div className="menu-items-list">
                              {menuItems.map((item, index) => (
                                <div 
                                  key={index} 
                                  className={`menu-item ${moduleHasAccess ? 'accessible' : 'inaccessible'}`}
                                  title={`Required: ${item.required_permission} permission`}
                                >
                                  <span className="menu-item-title">{item.menu_title}</span>
                                  <span className={`menu-item-permission ${item.required_permission}`}>
                                    {item.required_permission}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={fetchingRoles || !selectedEmployee}
            >
              {fetchingRoles ? 'Loading...' : (mode === 'assign' ? 'Save Role Assignment' : 'Update Role Assignment')}
            </button>
            <button 
              type="button" 
              className="clear-btn"
              onClick={() => {
                setSelectedEmployee('');
                setSelectedPak('');
                setSelectedEmployeeInfo(null);
                resetRoles();
                setMessage('');
              }}
              disabled={fetchingRoles}
            >
              Clear Form
            </button>
          </div>

          {selectedPak && (
            <div className="pak-info">
              <p><strong>PAK:</strong> {selectedPak}</p>
              <p><strong>Mode:</strong> {mode === 'assign' ? 'Assign New Roles' : 'Update Existing Roles'}</p>
              <p><strong>Status:</strong> {modules.filter(m => hasAnyPermission(m.key)).length} of {modules.length} modules have permissions</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AssignUserRoles;