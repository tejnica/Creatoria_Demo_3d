import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme, isDark, isLight } = useTheme();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm text-gray-600 dark:text-gray-300">Theme:</span>
      <button
        onClick={toggleTheme}
        type="button"
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isDark ? 'bg-blue-600' : 'bg-gray-200'}
        `}
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out
            ${isDark ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      <div className="flex items-center space-x-1 text-sm">
        <span className={`font-medium ${isLight ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>☀️</span>
        <span className={`font-medium ${isDark ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>🌙</span>
      </div>
    </div>
  );
};

export default ThemeToggle;
