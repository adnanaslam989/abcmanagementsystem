// context/AppContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';

const initialState = {
  isAuthenticated: false,
  user: null,
  roles: {},
  loading: true,
  token: localStorage.getItem('token') || null
};

const AppContext = createContext();

const appReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        roles: action.payload.user.roles || {},
        loading: false,
        token: action.payload.token
      };
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...initialState,
        loading: false
      };
    case 'SET_ROLES':
      return {
        ...state,
        roles: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const login = (user, token) => {
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { user, token }
    });
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const updateRoles = (roles) => {
    dispatch({ type: 'SET_ROLES', payload: roles });
  };

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  // Check for token on mount
  useEffect(() => {
    const token = localStorage.getItem('token'); // Define token here
    
    if (token) {
      // Verify token and fetch user data
      const verifyToken = async () => {
        try {
          const response = await fetch('http://10.0.0.7:5000/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // Fetch roles for this user
            const rolesResponse = await fetch(`http://10.0.0.7:5000/api/roles/user/${data.user.pak}`);
            const rolesData = await rolesResponse.json();
            
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: { 
                  ...data.user, 
                  roles: rolesData.success ? rolesData.roles : {} 
                },
                token
              }
            });
          } else {
            localStorage.removeItem('token');
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        }
      };
      
      verifyToken();
    } else {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  return (
    <AppContext.Provider value={{ 
      state, 
      dispatch, 
      login, 
      logout, 
      updateRoles,
      setLoading 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);