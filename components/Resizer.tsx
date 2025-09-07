
import React from 'react';

interface ResizerProps {
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const Resizer: React.FC<ResizerProps> = ({ onMouseDown }) => {
  return (
    <div
      className="w-1.5 bg-gray-200 hover:bg-cyan-500 active:bg-cyan-600 cursor-col-resize transition-colors duration-200 flex-shrink-0"
      onMouseDown={onMouseDown}
      aria-hidden="true"
    />
  );
};

export default Resizer;