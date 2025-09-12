// src/components/Stepper.js
import React from 'react';

export default function Stepper({ step, steps }) {
  return (
    <div className="flex items-center justify-between mx-auto my-6 max-w-3xl theme-transition">
      {steps.map((label, idx) => {
        const isActive = step === idx + 1;
        return (
          <React.Fragment key={idx}>
            <div className="flex items-center">
              <div 
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full font-bold transition-colors duration-200
                  ${isActive 
                    ? 'bg-amber-500 text-black dark:bg-amber-400 dark:text-gray-900' 
                    : 'bg-gray-600 text-white dark:bg-gray-500 dark:text-gray-100'
                  }
                `}
              >
                {idx + 1}
              </div>
              <span 
                className={`
                  ml-2 text-xs transition-colors duration-200
                  ${isActive 
                    ? 'text-amber-500 font-medium dark:text-amber-400' 
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-gray-600 dark:bg-gray-500 mx-3 theme-transition" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
