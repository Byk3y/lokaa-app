/**
 * Base Modal Component
 * 
 * Modern React modal foundation component,
 * replacing legacy inline HTML string injection.
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ModalProps, ModalConfig } from './types/modal';

// Size configuration
const sizeClasses = {
  sm: 'max-w-sm w-full sm:w-96 min-w-80', // 384px on desktop, full width on mobile, min 320px
  md: 'max-w-md w-full sm:w-auto min-w-80',  
  lg: 'max-w-lg w-full sm:w-auto min-w-96',
  xl: 'max-w-xl w-full sm:w-auto min-w-96'
};

// Position configuration
const positionClasses = {
  center: 'items-center justify-center',
  top: 'items-start justify-center pt-16'
};

interface BaseModalProps extends ModalProps {
  config: ModalConfig;
}

export default function BaseModal({ 
  isOpen, 
  onClose, 
  config, 
  children 
}: BaseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);



  // Enhanced positioning protection against Phase 8 interference
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Ensure modal container is properly positioned after Phase 8 protection
      const modalContainer = modalRef.current.closest('[role="dialog"]') as HTMLElement;
      if (modalContainer) {
        const computedStyle = getComputedStyle(modalContainer);
        
        // Verify modal has proper positioning (in case Phase 8 interference)
        if (computedStyle.position !== 'fixed' || parseInt(computedStyle.zIndex) < 9999) {
          console.log('🔧 [BaseModal] Applying positioning fix for modal:', config.id);
          modalContainer.style.position = 'fixed';
          modalContainer.style.top = '0';
          modalContainer.style.left = '0';
          modalContainer.style.right = '0';
          modalContainer.style.bottom = '0';
          modalContainer.style.zIndex = '10000';
          modalContainer.style.display = 'flex';
        }
      }
    }
  }, [isOpen, config.id]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus the modal
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      // Restore focus when modal closes
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // Click outside to close
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && config.backdrop && config.closable) {
      onClose();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && config.closable) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className={cn(
        // Base overlay styles
        "fixed inset-0 z-[10000] flex backdrop-blur-sm",
        "bg-black/50 transition-all duration-300",
        positionClasses[config.position || 'center'],
        isOpen ? "opacity-100" : "opacity-0"
      )}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      aria-modal="true"
      role="dialog"
      aria-labelledby={config.title ? `${config.id}-title` : undefined}
    >
      <div
        ref={modalRef}
        className={cn(
          // Base modal styles
          "relative bg-white rounded-xl shadow-2xl",
          "transform transition-all duration-300 ease-out",
          "mx-4",
          sizeClasses[config.size || 'md'],
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
          config.className
        )}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(config.title || config.closable) && (
          <div className="flex items-center justify-between p-6 pb-0">
            {config.title && (
              <h2 
                id={`${config.id}-title`}
                className="text-xl font-semibold text-gray-900"
              >
                {config.title}
              </h2>
            )}
            
            {config.closable && (
              <button
                onClick={onClose}
                className={cn(
                  "rounded-lg p-1.5 text-gray-400 hover:text-gray-600",
                  "hover:bg-gray-100 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-teal-500"
                )}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn(
          "p-6",
          config.title || config.closable ? "pt-4" : ""
        )}>
          {children}
        </div>
      </div>
    </div>
  );

  // Render in portal to avoid z-index issues
  return createPortal(modalContent, document.body);
} 