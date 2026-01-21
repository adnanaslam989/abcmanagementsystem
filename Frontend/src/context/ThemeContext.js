import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('appTheme');
    return savedTheme || 'blue';
  });

  const themes = {
    blue: {
      primary: '#4f6df0',
      secondary: '#1210ad',
      accent: '#3b82f6',
      sidebar: 'linear-gradient(135deg, #4f6df0 0%, #1210ad 100%)',
      header: 'linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%)',
      footer: 'linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%)'
    },
    dark: {
      primary: '#2c3e50',
      secondary: '#1a1a2e',
      accent: '#3498db',
      sidebar: 'linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%)',
      header: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
      footer: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)'
    },
    light: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      accent: '#3498db',
      sidebar: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      header: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      footer: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
    },
    green: {
      primary: '#10b981',
      secondary: '#047857',
      accent: '#059669',
      sidebar: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      header: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
      footer: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)'
    },
    purple: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      accent: '#8b5cf6',
      sidebar: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      header: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
      footer: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)'
    }
  };

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('appTheme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, themes, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);