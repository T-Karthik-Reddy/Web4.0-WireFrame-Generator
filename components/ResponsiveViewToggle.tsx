import React from 'react';
import { ResponsiveMode } from '../types';
import { DesktopIcon } from './icons/DesktopIcon';
import { MobileIcon } from './icons/MobileIcon';

interface ResponsiveViewToggleProps {
  mode: ResponsiveMode;
  onToggle: (mode: ResponsiveMode) => void;
}

const ResponsiveViewToggle: React.FC<ResponsiveViewToggleProps> = ({ mode, onToggle }) => {
  return (
    <div className="flex items-center bg-gray-200 rounded-lg p-1">
      <button
        onClick={() => onToggle('desktop')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors duration-200 ${
          mode === 'desktop' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:bg-gray-300'
        }`}
        title="Desktop View"
        aria-label="Switch to desktop view"
      >
        <DesktopIcon className="h-5 w-5"/>
      </button>
      <button
        onClick={() => onToggle('mobile')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors duration-200 ${
          mode === 'mobile' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:bg-gray-300'
        }`}
        title="Mobile View (375px)"
        aria-label="Switch to mobile view"
      >
        <MobileIcon className="h-5 w-5"/>
      </button>
    </div>
  );
};

export default ResponsiveViewToggle;
