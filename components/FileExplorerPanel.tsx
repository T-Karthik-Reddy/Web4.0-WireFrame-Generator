
import React from 'react';
import { FileNode } from '../types';
import { FileIcon } from './icons/FileIcon';

interface FileExplorerPanelProps {
  files: FileNode[];
  selectedFile: FileNode | null;
  onSelectFile: (file: FileNode) => void;
}

const FileExplorerPanel: React.FC<FileExplorerPanelProps> = ({ files, selectedFile, onSelectFile }) => {
  if (files.length === 0) {
    return (
        <div className="p-4 text-center text-gray-500 text-sm">
            <p>No files generated yet.</p>
            <p>Describe your app to get started.</p>
        </div>
    );
  }

  return (
    <div className="p-2">
        <h2 className="text-xs font-bold uppercase text-gray-500 px-2 mb-2">Files</h2>
      <ul>
        {files.map((file) => (
          <li key={file.name}>
            <button
              onClick={() => onSelectFile(file)}
              className={`w-full text-left px-3 py-1.5 flex items-center rounded-md text-sm ${
                selectedFile?.name === file.name
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{file.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileExplorerPanel;