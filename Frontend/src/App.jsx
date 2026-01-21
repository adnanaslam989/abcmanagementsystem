import React, { useState, useEffect } from 'react'; // Add useState and useEffect imports
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';

import Header from './components/common/Header/Header';
import Footer from './components/common/Footer/Footer';
import Sidebar from './components/common/Sidebar/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home/Home';
import HRDashboard from './pages/HRDashboard/HRDashboard';
import InventoryDashboard from './pages/InventoryDashboard/InventoryDashboard';
import CanteenDashboard from './pages/CanteenDashboard/CanteenDashboard';
import UpdatePersonalDetail from './pages/HRDashboard/PAFHR/UpdatePersonalDetail';
import ViewProfile from './pages/HRDashboard/PAFHR/ViewProfile';
import TotalStrength from './pages/HRDashboard/PAFHR/TotalStrength';
import OfficersStrength from './pages/HRDashboard/PAFHR/OfficersStrength';
import JCOAirmanStrength from './pages/HRDashboard/PAFHR/JCOAirmanStrength';
import AssignUserRoles from './pages/HRDashboard/PAFHR/AssignUserRoles';
import ViewPersonnelAttendance from './pages/HRDashboard/PAFAttendance/ViewPersonnelAttendance';
import PAFEmployeeEditForm from './pages/HRDashboard/PAFHR/PAFEmployeeEditForm';
import PAFNewEmployeeForm from './pages/HRDashboard/PAFHR/PAFNewEmployeeForm';

// Civilian HR
import CivilianUpdatePersonalDetail from './pages/HRDashboard/CivilianHR/UpdatePersonalDetail';
import CivilianViewProfile from './pages/HRDashboard/CivilianHR/CivilianViewProfile';
import CivilianStrength from './pages/HRDashboard/CivilianHR/CivilianStrength';
import AwardPenalizeForm from './pages/HRDashboard/CivilianHR/AwardPenalizeForm';
import ViewHoursRecords from './pages/HRDashboard/CivilianHR/ViewHoursRecords';
import EmployeeEditForm from './pages/HRDashboard/CivilianHR/EmployeeEditForm';
import NewEmployeeForm from './pages/HRDashboard/CivilianHR/NewEmployeeForm';

// Civilian attendance
import AddAttendance from './pages/HRDashboard/CivilianAttendance/AddAttendance';
import UpdateAttendance from './pages/HRDashboard/CivilianAttendance/UpdateAttendance';
import UnitWorkingHours from './pages/HRDashboard/CivilianAttendance/UnitWorkingHours';
import UpdateAttendanceByDate from './pages/HRDashboard/CivilianAttendance/UpdateAttendanceByDate';
import LatePenaltyCalculation from './pages/HRDashboard/CivilianAttendance/LatePenaltyCalculation';
import BiometricTestPage from './pages/HRDashboard/CivilianAttendance/BiometricTestPage';



import HolidayWork from './pages/HRDashboard/CivilianAttendance/HolidayWork';
import ViewManhoursReport from './pages/HRDashboard/CivilianAttendance/ViewManhoursReport';
import ViewAttendanceHistory from './pages/HRDashboard/CivilianAttendance/ViewAttendanceHistory';
import ViewAttendanceBetweenDates from './pages/HRDashboard/CivilianAttendance/ViewAttendanceBetweenDates';
import LateTrendBetweenDates from './pages/HRDashboard/CivilianAttendance/LateTrendBetweenDates';

import './App.css';

const AppContent = () => {
  const location = useLocation();
  const { state } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isAuthenticated = state.isAuthenticated;
  const showSidebar = isAuthenticated && location.pathname !== '/' && location.pathname !== '/login';

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="App">
      {isAuthenticated && <Header />}

      <div className="app-layout">
        {showSidebar && (
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={setSidebarCollapsed}
          />
        )}

        <main className={`main-content ${showSidebar && !sidebarCollapsed ? 'with-sidebar' : 'sidebar-collapsed'}`}>
          <div className="content-wrapper">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />

              {/* PAF HR Routes */}
              <Route path="/hr" element={
                <ProtectedRoute>
                  <HRDashboard />
                </ProtectedRoute>
              } />

              <Route path="/hr/paf/edit-employee/:id" element={
                <ProtectedRoute>
                  <PAFEmployeeEditForm />
                </ProtectedRoute>
              } />
              <Route path="/hr/paf/new-employee" element={
                <ProtectedRoute>
                  <PAFNewEmployeeForm />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian/new-employee" element={
                <ProtectedRoute>
                  <NewEmployeeForm />
                </ProtectedRoute>
              } />

              <Route path="/hr/paf/update-personal" element={
                <ProtectedRoute>
                  <UpdatePersonalDetail />
                </ProtectedRoute>
              } />

              <Route path="/hr/paf/view-profile" element={
                <ProtectedRoute>
                  <ViewProfile />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian/edit-employee/:id" element={
                <ProtectedRoute>
                  <EmployeeEditForm />
                </ProtectedRoute>
              } />

              <Route path="/hr/paf/total-strength" element={
                <ProtectedRoute>
                  <TotalStrength />
                </ProtectedRoute>
              } />

              <Route path="/hr/paf/officers-strength" element={
                <ProtectedRoute>
                  <OfficersStrength />
                </ProtectedRoute>
              } />

              <Route path="/hr/paf/jco-strength" element={
                <ProtectedRoute>
                  <JCOAirmanStrength />
                </ProtectedRoute>
              } />

              <Route path="/hr/paf/assign-roles" element={
                <ProtectedRoute>
                  <AssignUserRoles />
                </ProtectedRoute>
              } />

              <Route path="/hr/paf-attendance/view" element={
                <ProtectedRoute>
                  <ViewPersonnelAttendance />
                </ProtectedRoute>
              } />

              {/* Civilian HR Routes */}
              <Route path="/hr/civilian/update-personal" element={
                <ProtectedRoute>
                  <CivilianUpdatePersonalDetail />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian/view-employee" element={
                <ProtectedRoute>
                  <CivilianViewProfile />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian/civilian-strength" element={
                <ProtectedRoute>
                  <CivilianStrength />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian/award-bonus" element={
                <ProtectedRoute>
                  <AwardPenalizeForm />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian/view-bonus" element={
                <ProtectedRoute>
                  <ViewHoursRecords />
                </ProtectedRoute>
              } />

              {/* Civilian Attendance Routes */}
              <Route path="/hr/civilian-attendance/add" element={
                <ProtectedRoute>
                  <AddAttendance />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian-attendance/update" element={
                <ProtectedRoute>
                  <UpdateAttendance />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian-attendance/working-hours" element={
                <ProtectedRoute>
                  <UnitWorkingHours />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian-attendance/update-by-date" element={
                <ProtectedRoute>
                  <UpdateAttendanceByDate />
                </ProtectedRoute>
              } />

   <Route path="/hr/civilian-attendance/late-penalty" element={
                <ProtectedRoute>
                  <LatePenaltyCalculation />
                </ProtectedRoute>
              } />

              <Route path="/hr/biometric-test" element={<BiometricTestPage />} />



              <Route path="/hr/civilian-attendance/holiday-work" element={
                <ProtectedRoute>
                  <HolidayWork />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian-attendance/manhours-report" element={
                <ProtectedRoute>
                  <ViewManhoursReport />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian-attendance/view-history" element={
                <ProtectedRoute>
                  <ViewAttendanceHistory />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian-attendance/between-dates" element={
                <ProtectedRoute>
                  <ViewAttendanceBetweenDates />
                </ProtectedRoute>
              } />

              <Route path="/hr/civilian-attendance/late-trend" element={
                <ProtectedRoute>
                  <LateTrendBetweenDates />
                </ProtectedRoute>
              } />

              {/* Other Dashboard Routes */}
              <Route path="/inventory" element={
                <ProtectedRoute>
                  <InventoryDashboard />
                </ProtectedRoute>
              } />

              <Route path="/canteen" element={
                <ProtectedRoute>
                  <CanteenDashboard />
                </ProtectedRoute>
              } />

              {/* Catch all route for authenticated users */}
              <Route path="*" element={
                <ProtectedRoute>
                  <Navigate to="/hr" replace />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </main>
      </div>

      {isAuthenticated && <Footer />}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Router>
          <AppContent />
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;