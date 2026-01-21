import React from 'react';
import { useLocation } from 'react-router-dom';
import './HRDashboard.css';


const HRDashboard = () => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/hr/paf/update-personal') return 'Update Personal Detail';
    if (path === '/hr/paf/view-profile') return 'View Profile';
    if (path === '/hr/paf/total-strength') return 'Total Strength';
    if (path === '/hr/paf/officers-strength') return 'Officers Strength';
    if (path === '/hr/paf/jco-strength') return 'JCO/Airman Strength';
    if (path === '/hr/paf/assign-roles') return 'Assign User Roles';
    if (path === '/hr/paf/civilian-strength') return 'Civilian Strength';
    if (path === '/hr/paf/jco-strength') return 'JCO/Airman Strength';
    if (path === '/hr/paf/assign-roles') return 'Assign User Roles';
    if (path === '/hr/paf-attendance/view') return 'View Personnel Attendance';

    if (path === '/hr/CivilianHR/update-personal') return 'Update Personal Detail (Civilian)';
    if (path === '/hr/CivilianHR/view-profile-civilian') return 'View Employee Civilian';
    if (path === '/hr/civilian/civilian-strength') return 'Civilian Strength';
    if (path === '/hr/CivilianHR/view-penalize') return 'Award/Penalize';
    if (path === '/hr/civilian/view-bonus') return 'View Bonus dfdf';


    if (path === '/hr/civilian-attendance/add') return 'Mark Civilian Attendance';
    if (path === '/hr/civilian-attendance/update') return 'Update Civilian Attendance';
    if (path === '/hr/civilian-attendance/working-hours') return 'Unit Working Hours';
    if (path === '/hr/civilian-attendance/update-by-date') return 'Update Attendance By Date';
    if (path === '/hr/civilian-attendance/late-penalty-calculation') return 'Late Penalty Calculation';
    if (path === '/hr/civilian-attendance/holiday-work') return 'Work On Holiday';
    if (path === '/hr/civilian-attendance/manhours-report') return 'View Manhours Report';
    if (path === '/hr/civilian-attendance/view-history') return 'View Attendance History';
    if (path === '/hr/civilian-attendance/between-dates') return 'View Attendance Between Dates';
    if (path === '/hr/civilian-attendance/late-trend') return 'Late Trend Analysis';


    // Add more paths as needed
    return 'HR Management Dashboard';

  };

  const getPageContent = () => {
    const path = location.pathname;

    // Return different content based on the current path
    switch (path) {
      case '/hr':
        return (
          <div className="dashboard-default">
           <h2 style={{textAlign:'center'}}>Welcome to HR Management System</h2>
            <p style={{textAlign:'center'}}>Select an option from the sidebar to manage HR operations.</p>
          </div>
        );
      default:
        return (
          <div className="coming-soon">
            <h2>{getPageTitle()} - Under Development</h2>
            <p>This feature is currently being developed and will be available soon.</p>
            <p>Current path: {location.pathname}</p>
          </div>
        );
    }
  };

  return (
    <div className="hr-dashboard">
      <div className="dashboard-header">
        <h1>{getPageTitle()}</h1>
        <p>Manage employees, attendance, payroll and HR operations</p>
      </div>
      <div className="dashboard-content">
        {getPageContent()}
      </div>
    </div>
  );
};

export default HRDashboard;