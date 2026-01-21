// utils/userUtils.js
export const getUserTypeDisplay = (userType) => {
  switch (userType) {
    case 'civilian':
      return 'Civilian Employee';
    case 'uniformed':
      return 'Uniformed Personnel';
    default:
      return 'User';
  }
};

export const getEmployeeTable = (userType) => {
  return userType === 'civilian' ? 'civ_manpower' : 'manpower';
};

export const getAppointmentField = (userType) => {
  return userType === 'civilian' ? 'APPOINTMENT' : 'RANK';
};

// Usage in components:
import { getUserTypeDisplay } from '../utils/userUtils';

// In your component:
const userTypeDisplay = getUserTypeDisplay(state.user?.userType);