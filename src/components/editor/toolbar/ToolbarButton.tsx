import React from 'react';
import clsx from 'clsx';

export interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  'aria-pressed'?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable toolbar button component for rich text editors
 * Supports both icon and text-based buttons with consistent styling
 * 
 * 🚀 PERFORMANCE OPTIMIZED:
 * - React.memo to prevent unnecessary re-renders
 * - Optimized className computation
 */
export const ToolbarButton: React.FC<ToolbarButtonProps> = React.memo(({ 
  onClick, 
  isActive = false, 
  title, 
  icon, 
  children,
  'aria-pressed': ariaPressed,
  disabled = false,
  className
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={ariaPressed ?? isActive}
    disabled={disabled}
    className={clsx(
      'flex items-center justify-center',
      'h-9 px-3 rounded border-none cursor-pointer transition-all duration-150 ease-in-out',
      'text-gray-600 hover:text-gray-800 hover:bg-gray-50',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
      {
        'bg-gray-100 text-gray-900': isActive && !disabled,
        'bg-transparent': !isActive || disabled
      },
      className
    )}
  >
    {icon ? (
      <div className={clsx(
        'w-4 h-4 flex items-center justify-center',
        'transition-colors duration-150'
      )}>
        {React.cloneElement(icon as React.ReactElement, {
          size: 16,
          strokeWidth: 2.5,
          className: 'stroke-current'
        })}
      </div>
    ) : (
      <span className={clsx(
        'text-sm font-bold leading-none px-0.5',
        'transition-colors duration-150'
      )}>
        {children}
      </span>
    )}
  </button>
));

// Add display name for debugging
ToolbarButton.displayName = 'ToolbarButton';

export default ToolbarButton;
