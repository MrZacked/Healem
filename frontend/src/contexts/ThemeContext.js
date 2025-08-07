import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('healem-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newTheme = !prev;
      localStorage.setItem('healem-theme', newTheme ? 'dark' : 'light');
      return newTheme;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    
    if (isDarkMode) {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: {
      // Light theme colors
      light: {
        primary: '#2c5aa0',
        primaryHover: '#1e3f73',
        secondary: '#28a745',
        secondaryHover: '#1e7e34',
        danger: '#dc3545',
        dangerHover: '#c82333',
        warning: '#ffc107',
        warningHover: '#e0a800',
        info: '#17a2b8',
        infoHover: '#138496',
        background: '#ffffff',
        backgroundSecondary: '#f8f9fa',
        backgroundTertiary: '#e9ecef',
        surface: '#ffffff',
        surfaceSecondary: '#f1f3f4',
        text: '#212529',
        textSecondary: '#6c757d',
        textMuted: '#868e96',
        border: '#dee2e6',
        borderLight: '#e9ecef',
        shadow: 'rgba(0, 0, 0, 0.1)',
        shadowMedium: 'rgba(0, 0, 0, 0.15)',
        shadowHeavy: 'rgba(0, 0, 0, 0.25)'
      },
      // Dark theme colors
      dark: {
        primary: '#4dabf7',
        primaryHover: '#339af0',
        secondary: '#51cf66',
        secondaryHover: '#40c057',
        danger: '#ff6b6b',
        dangerHover: '#ff5252',
        warning: '#ffd43b',
        warningHover: '#ffcc02',
        info: '#74c0fc',
        infoHover: '#4dabf7',
        background: '#121212',
        backgroundSecondary: '#1e1e1e',
        backgroundTertiary: '#2d2d2d',
        surface: '#1e1e1e',
        surfaceSecondary: '#2d2d2d',
        text: '#ffffff',
        textSecondary: '#b3b3b3',
        textMuted: '#666666',
        border: '#404040',
        borderLight: '#333333',
        shadow: 'rgba(0, 0, 0, 0.3)',
        shadowMedium: 'rgba(0, 0, 0, 0.4)',
        shadowHeavy: 'rgba(0, 0, 0, 0.6)'
      }
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem'
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px'
    },
    shadows: {
      sm: isDarkMode ? '0 1px 2px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.1)',
      md: isDarkMode ? '0 4px 6px rgba(0, 0, 0, 0.4)' : '0 4px 6px rgba(0, 0, 0, 0.15)',
      lg: isDarkMode ? '0 10px 15px rgba(0, 0, 0, 0.5)' : '0 10px 15px rgba(0, 0, 0, 0.25)',
      xl: isDarkMode ? '0 20px 25px rgba(0, 0, 0, 0.6)' : '0 20px 25px rgba(0, 0, 0, 0.35)'
    }
  };

  const currentColors = isDarkMode ? theme.colors.dark : theme.colors.light;

  return (
    <ThemeContext.Provider value={{ ...theme, colors: currentColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;