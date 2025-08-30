import React from 'react';
import clsx from 'clsx';

export interface ToolbarDividerProps {
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

/**
 * Visual separator for toolbar sections
 * Supports both vertical (default) and horizontal orientations
 */
export const ToolbarDivider: React.FC<ToolbarDividerProps> = ({ 
  className, 
  orientation = 'vertical' 
}) => (
  <div 
    className={clsx(
      'bg-gray-300 flex-shrink-0',
      {
        'w-px h-6': orientation === 'vertical',
        'h-px w-6': orientation === 'horizontal'
      },
      className
    )}
    style={{ marginRight: orientation === 'vertical' ? '12px' : '0' }}
    role="separator"
    aria-orientation={orientation}
  />
);

export default ToolbarDivider;
