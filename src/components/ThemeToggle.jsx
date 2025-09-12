import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm text-gray-600 dark:text-gray-300">Theme:</span>
      <button
        onClick={toggleTheme}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isDark ? 'bg-blue-600' : 'bg-gray-200'}
        `}
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out
            ${isDark ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      <div className="flex items-center space-x-1 text-sm">
        <span className={`${isDark ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
          
        </span>
        <span className={`${isDark ? 'text-yellow-400 font-medium' : 'text-gray-400'}`}>
          
        </span>
      </div>
    </div>
  );
};

export default ThemeToggle;
