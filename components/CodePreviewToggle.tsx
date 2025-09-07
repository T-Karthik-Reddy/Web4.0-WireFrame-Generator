
import React from 'react';
import { ViewMode } from '../types';
import { CodeIcon } from './icons/CodeIcon';
import { EyeIcon } from './icons/EyeIcon';

interface CodePreviewToggleProps {
  viewMode: ViewMode;
  onToggle: (mode: ViewMode) => void;
}

const CodePreviewToggle: React.FC<CodePreviewToggleProps> = ({ viewMode, onToggle }) => {
  return (
    <div className="flex items-center bg-gray-200 rounded-lg p-1">
      <button
        onClick={() => onToggle('code')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors duration-200 ${
          viewMode === 'code' ? 'btn-gradient text-white shadow-sm' : 'text-gray-500 hover:bg-gray-300'
        }`}
      >
        <CodeIcon className="h-5 w-5 mr-2"/>
        Code
      </button>
      <button
        onClick={() => onToggle('preview')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors duration-200 ${
          viewMode === 'preview' ? 'btn-gradient text-white shadow-sm' : 'text-gray-500 hover:bg-gray-300'
        }`}
      >
        <EyeIcon className="h-5 w-5 mr-2"/>
        Preview
      </button>
    </div>
  );
};

export default CodePreviewToggle;