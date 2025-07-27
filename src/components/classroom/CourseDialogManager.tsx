import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { useCourseDialogs } from '@/hooks/classroom/useCourseDialogs';
import { ClassroomDialogManager } from './ClassroomDialogManager';
import { DeleteCourseDialog } from './dialogs/DeleteCourseDialog';
import DeletePageDialog from './dialogs/DeletePageDialog';
import RevertToDraftDialog from './dialogs/RevertToDraftDialog';
import ChangeFolderDialog from './dialogs/ChangeFolderDialog';
import type { CourseDetailData, CourseDetailViewProps } from '@/types/classroom/courseDetail';

interface CourseDialogManagerProps extends CourseDetailViewProps {
  enableDialogAnimations?: boolean;
  enableDialogAccessibility?: boolean;
  enableDialogFocusManagement?: boolean;
  enableDialogKeyboardNavigation?: boolean;
  enableDialogStatePersistence?: boolean;
  enableDialogAnalytics?: boolean;
  enableDialogErrorHandling?: boolean;
  onDialogOpen?: (dialogType: string, data?: any) => void;
  onDialogClose?: (dialogType: string, result?: any) => void;
  onDialogError?: (dialogType: string, error: Error) => void;
}

interface CourseDialogManagerReturn {
  // Dialog state
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  pageToDelete: any;
  pageToRevert: any;
  pageToChangeFolder: any;
  isReverting: boolean;
  isChangingFolder: boolean;
  
  // Dialog operations
  openDeleteCourseDialog: () => void;
  closeDeleteCourseDialog: () => void;
  openDeletePageDialog: (pageId: string, title: string) => void;
  closeDeletePageDialog: () => void;
  openRevertToDraftDialog: (pageId: string, title: string, isPublished: boolean) => void;
  closeRevertToDraftDialog: () => void;
  openChangeFolderDialog: (pageId: string, title: string, currentFolderId: string | null) => void;
  closeChangeFolderDialog: () => void;
  
  // Dialog confirmations
  handleConfirmDeleteCourse: () => Promise<void>;
  handleConfirmDeletePage: () => Promise<void>;
  handleConfirmRevertToDraft: () => Promise<void>;
  handleConfirmChangeFolder: (folderId: string | null) => Promise<void>;
  
  // Dialog orchestration
  openDialog: (dialogType: string, data?: any) => void;
  closeDialog: (dialogType: string) => void;
  closeAllDialogs: () => void;
  
  // Dialog accessibility
  focusFirstElement: (dialogType: string) => void;
  focusLastElement: (dialogType: string) => void;
  trapFocus: (dialogType: string) => void;
  
  // Dialog animations
  animateDialogOpen: (dialogType: string) => void;
  animateDialogClose: (dialogType: string) => void;
  
  // Dialog keyboard navigation
  handleKeyDown: (event: KeyboardEvent, dialogType: string) => void;
  handleEscapeKey: (dialogType: string) => void;
  handleTabKey: (event: KeyboardEvent, dialogType: string) => void;
  
  // Dialog state persistence
  saveDialogState: () => void;
  loadDialogState: () => any;
  clearDialogState: () => void;
  
  // Dialog analytics
  trackDialogAction: (action: string, dialogType: string, data?: any) => void;
  getDialogStats: () => any;
  
  // Dialog error handling
  handleDialogError: (dialogType: string, error: Error) => void;
  retryDialogAction: (dialogType: string, action: string) => void;
  
  // Dialog rendering
  renderDialogs: () => React.ReactNode;
}

/**
 * CourseDialogManager - Handles all dialog-related operations for course detail views
 * 
 * Responsibilities:
 * - Dialog orchestration and state management
 * - Dialog accessibility and focus management
 * - Dialog animations and transitions
 * - Dialog keyboard navigation
 * - Dialog state persistence
 * - Dialog analytics and tracking
 * - Dialog error handling and recovery
 * - Dialog rendering and composition
 */
const CourseDialogManager: React.FC<CourseDialogManagerProps> = ({
  courseId,
  onBack,
  moduleId,
  lessonId,
  enableDialogAnimations = true,
  enableDialogAccessibility = true,
  enableDialogFocusManagement = true,
  enableDialogKeyboardNavigation = true,
  enableDialogStatePersistence = true,
  enableDialogAnalytics = true,
  enableDialogErrorHandling = true,
  onDialogOpen,
  onDialogClose,
  onDialogError,
}) => {
  const { user } = useAuth();
  const { space } = useSpace();
  
  // Dialog state
  const [activeDialogs, setActiveDialogs] = useState<Set<string>>(new Set());
  const [dialogAnimations, setDialogAnimations] = useState<Record<string, boolean>>({});
  const [dialogFocus, setDialogFocus] = useState<Record<string, HTMLElement | null>>({});
  const [dialogErrors, setDialogErrors] = useState<Record<string, Error | null>>({});
  const [dialogStats, setDialogStats] = useState<any>({
    totalDialogsOpened: 0,
    totalDialogsClosed: 0,
    dialogErrors: 0,
    averageDialogDuration: 0,
    mostUsedDialog: '',
  });

  // Use the dialog management hook
  const {
    isDeleteDialogOpen,
    isDeleting,
    pageToDelete,
    pageToRevert,
    pageToChangeFolder,
    isReverting,
    isChangingFolder,
    openDeleteCourseDialog,
    closeDeleteCourseDialog,
    openDeletePageDialog,
    closeDeletePageDialog,
    openRevertToDraftDialog,
    closeRevertToDraftDialog,
    openChangeFolderDialog,
    closeChangeFolderDialog,
    handleConfirmDeleteCourse,
    handleConfirmDeletePage,
    handleConfirmRevertToDraft,
    handleConfirmChangeFolder
  } = useCourseDialogs({
    course: null, // Will be set by parent
    onCourseDeleted: onBack,
    onPageDeleted: (pageId) => {
      log.debug('DialogManager', '🎓 [CourseDialogManager] Page deleted:', pageId);
      trackDialogAction('page_deleted', 'delete_page', { pageId });
    },
    onPageUpdated: (pageId) => {
      log.debug('DialogManager', '🎓 [CourseDialogManager] Page updated:', pageId);
      trackDialogAction('page_updated', 'revert_draft', { pageId });
    },
    onPageMoved: (pageId, newFolderId) => {
      log.debug('DialogManager', '🎓 [CourseDialogManager] Page moved:', pageId, 'to folder:', newFolderId);
      trackDialogAction('page_moved', 'change_folder', { pageId, newFolderId });
    },
    onRefetch: () => {}, // Will be set by parent
    onSelectedLessonChange: () => {}, // Will be set by parent
    selectedLesson: null // Will be set by parent
  });

  log.debug('DialogManager', '🎓 [CourseDialogManager] Component rendered with courseId:', courseId);

  // Dialog orchestration
  const openDialog = useCallback((dialogType: string, data?: any) => {
    log.debug('DialogManager', '🎓 [CourseDialogManager] Opening dialog:', dialogType, data);
    
    setActiveDialogs(prev => new Set([...prev, dialogType]));
    
    if (enableDialogAnimations) {
      animateDialogOpen(dialogType);
    }
    
    if (enableDialogFocusManagement) {
      setTimeout(() => focusFirstElement(dialogType), 100);
    }
    
    trackDialogAction('dialog_opened', dialogType, data);
    onDialogOpen?.(dialogType, data);
  }, [enableDialogAnimations, enableDialogFocusManagement, onDialogOpen]);

  const closeDialog = useCallback((dialogType: string) => {
    log.debug('DialogManager', '🎓 [CourseDialogManager] Closing dialog:', dialogType);
    
    if (enableDialogAnimations) {
      animateDialogClose(dialogType);
    }
    
    setActiveDialogs(prev => {
      const newSet = new Set(prev);
      newSet.delete(dialogType);
      return newSet;
    });
    
    trackDialogAction('dialog_closed', dialogType);
    onDialogClose?.(dialogType);
  }, [enableDialogAnimations, onDialogClose]);

  const closeAllDialogs = useCallback(() => {
    log.debug('DialogManager', '🎓 [CourseDialogManager] Closing all dialogs');
    
    activeDialogs.forEach(dialogType => {
      closeDialog(dialogType);
    });
  }, [activeDialogs, closeDialog]);

  // Dialog accessibility
  const focusFirstElement = useCallback((dialogType: string) => {
    if (!enableDialogFocusManagement) return;
    
    const dialog = document.querySelector(`[data-dialog="${dialogType}"]`);
    if (dialog) {
      const firstFocusable = dialog.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
        setDialogFocus(prev => ({ ...prev, [dialogType]: firstFocusable }));
      }
    }
  }, [enableDialogFocusManagement]);

  const focusLastElement = useCallback((dialogType: string) => {
    if (!enableDialogFocusManagement) return;
    
    const dialog = document.querySelector(`[data-dialog="${dialogType}"]`);
    if (dialog) {
      const focusableElements = Array.from(dialog.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')) as HTMLElement[];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      if (lastFocusable) {
        lastFocusable.focus();
        setDialogFocus(prev => ({ ...prev, [dialogType]: lastFocusable }));
      }
    }
  }, [enableDialogFocusManagement]);

  const trapFocus = useCallback((dialogType: string) => {
    if (!enableDialogFocusManagement) return;
    
    const dialog = document.querySelector(`[data-dialog="${dialogType}"]`);
    if (dialog) {
      const focusableElements = Array.from(dialog.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')) as HTMLElement[];
      
      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Handle tab key to trap focus
        const handleTabKey = (event: KeyboardEvent) => {
          if (event.key === 'Tab') {
            if (event.shiftKey) {
              if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
              }
            } else {
              if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
              }
            }
          }
        };
        
        dialog.addEventListener('keydown', handleTabKey);
        return () => dialog.removeEventListener('keydown', handleTabKey);
      }
    }
  }, [enableDialogFocusManagement]);

  // Dialog animations
  const animateDialogOpen = useCallback((dialogType: string) => {
    if (!enableDialogAnimations) return;
    
    setDialogAnimations(prev => ({ ...prev, [dialogType]: true }));
    
    // Add animation classes
    const dialog = document.querySelector(`[data-dialog="${dialogType}"]`);
    if (dialog) {
      dialog.classList.add('dialog-open-animation');
    }
  }, [enableDialogAnimations]);

  const animateDialogClose = useCallback((dialogType: string) => {
    if (!enableDialogAnimations) return;
    
    setDialogAnimations(prev => ({ ...prev, [dialogType]: false }));
    
    // Add animation classes
    const dialog = document.querySelector(`[data-dialog="${dialogType}"]`);
    if (dialog) {
      dialog.classList.add('dialog-close-animation');
    }
  }, [enableDialogAnimations]);

  // Dialog keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent, dialogType: string) => {
    if (!enableDialogKeyboardNavigation) return;
    
    switch (event.key) {
      case 'Escape':
        handleEscapeKey(dialogType);
        break;
      case 'Tab':
        handleTabKey(event, dialogType);
        break;
      case 'Enter':
        // Handle enter key for confirmation
        break;
    }
  }, [enableDialogKeyboardNavigation]);

  const handleEscapeKey = useCallback((dialogType: string) => {
    log.debug('DialogManager', '🎓 [CourseDialogManager] Escape key pressed for dialog:', dialogType);
    closeDialog(dialogType);
  }, [closeDialog]);

  const handleTabKey = useCallback((event: KeyboardEvent, dialogType: string) => {
    if (!enableDialogFocusManagement) return;
    
    // Focus trapping is handled by trapFocus function
    // This is just for additional tab key handling if needed
  }, [enableDialogFocusManagement]);

  // Dialog state persistence
  const saveDialogState = useCallback(() => {
    if (!enableDialogStatePersistence) return;
    
    const state = {
      activeDialogs: Array.from(activeDialogs),
      dialogAnimations,
      dialogFocus: Object.keys(dialogFocus).reduce((acc, key) => {
        acc[key] = dialogFocus[key]?.tagName || null;
        return acc;
      }, {} as Record<string, string | null>),
      timestamp: Date.now()
    };
    
    localStorage.setItem('courseDialogState', JSON.stringify(state));
    log.debug('DialogManager', '🎓 [CourseDialogManager] Dialog state saved');
  }, [enableDialogStatePersistence, activeDialogs, dialogAnimations, dialogFocus]);

  const loadDialogState = useCallback(() => {
    if (!enableDialogStatePersistence) return null;
    
    try {
      const saved = localStorage.getItem('courseDialogState');
      if (saved) {
        const state = JSON.parse(saved);
        log.debug('DialogManager', '🎓 [CourseDialogManager] Dialog state loaded');
        return state;
      }
    } catch (error) {
      log.error('DialogManager', '🎓 [CourseDialogManager] Error loading dialog state:', error);
    }
    
    return null;
  }, [enableDialogStatePersistence]);

  const clearDialogState = useCallback(() => {
    if (!enableDialogStatePersistence) return;
    
    localStorage.removeItem('courseDialogState');
    log.debug('DialogManager', '🎓 [CourseDialogManager] Dialog state cleared');
  }, [enableDialogStatePersistence]);

  // Dialog analytics
  const trackDialogAction = useCallback((action: string, dialogType: string, data?: any) => {
    if (!enableDialogAnalytics) return;
    
    log.debug('DialogManager', '🎓 [CourseDialogManager] Tracking dialog action:', action, dialogType, data);
    
    setDialogStats(prev => ({
      ...prev,
      totalDialogsOpened: action === 'dialog_opened' ? prev.totalDialogsOpened + 1 : prev.totalDialogsOpened,
      totalDialogsClosed: action === 'dialog_closed' ? prev.totalDialogsClosed + 1 : prev.totalDialogsClosed,
      dialogErrors: action === 'dialog_error' ? prev.dialogErrors + 1 : prev.dialogErrors,
    }));
    
    // Here you could send analytics to your analytics service
    // analytics.track('dialog_action', { action, dialogType, data, timestamp: Date.now() });
  }, [enableDialogAnalytics]);

  const getDialogStats = useCallback(() => {
    return dialogStats;
  }, [dialogStats]);

  // Dialog error handling
  const handleDialogError = useCallback((dialogType: string, error: Error) => {
    log.error('DialogManager', '🎓 [CourseDialogManager] Dialog error:', dialogType, error);
    
    setDialogErrors(prev => ({ ...prev, [dialogType]: error }));
    setDialogStats(prev => ({ ...prev, dialogErrors: prev.dialogErrors + 1 }));
    
    trackDialogAction('dialog_error', dialogType, { error: error.message });
    onDialogError?.(dialogType, error);
    
    toast({
      title: "Dialog Error",
      description: `An error occurred in the ${dialogType} dialog. Please try again.`,
      variant: "destructive"
    });
  }, [onDialogError, trackDialogAction]);

  const retryDialogAction = useCallback((dialogType: string, action: string) => {
    log.debug('DialogManager', '🎓 [CourseDialogManager] Retrying dialog action:', dialogType, action);
    
    // Clear the error
    setDialogErrors(prev => ({ ...prev, [dialogType]: null }));
    
    // Retry the action based on the dialog type
    switch (dialogType) {
      case 'delete_course':
        handleConfirmDeleteCourse().catch(error => handleDialogError(dialogType, error));
        break;
      case 'delete_page':
        handleConfirmDeletePage().catch(error => handleDialogError(dialogType, error));
        break;
      case 'revert_draft':
        handleConfirmRevertToDraft().catch(error => handleDialogError(dialogType, error));
        break;
      case 'change_folder':
        // This would need the folderId parameter
        break;
      default:
        log.warn('DialogManager', '🎓 [CourseDialogManager] Unknown dialog type for retry:', dialogType);
    }
  }, [handleConfirmDeleteCourse, handleConfirmDeletePage, handleConfirmRevertToDraft, handleDialogError]);

  // Dialog rendering
  const renderDialogs = useCallback(() => {
    return (
      <>
        {/* Classroom Dialog Manager for Edit Course Dialog */}
        <ClassroomDialogManager 
          space={{
            id: space?.id || '',
            owner_id: space?.owner_id || '',
            primary_color: '#26A69A', // Default color
            pricing_type: 'free' // Default to free
          }}
          onDeletePage={async (pageId: string) => {
            try {
              // This would be handled by the parent component
              log.debug('DialogManager', '🎓 [CourseDialogManager] Delete page requested:', pageId);
            } catch (error) {
              handleDialogError('delete_page', error as Error);
            }
          }}
          onRevertToDraft={async (pageId: string) => {
            try {
              // This would be handled by the parent component
              log.debug('DialogManager', '🎓 [CourseDialogManager] Revert to draft requested:', pageId);
            } catch (error) {
              handleDialogError('revert_draft', error as Error);
            }
          }}
          onDuplicatePage={async (pageId: string) => {
            try {
              // This would be handled by the parent component
              log.debug('DialogManager', '🎓 [CourseDialogManager] Duplicate page requested:', pageId);
            } catch (error) {
              handleDialogError('duplicate_page', error as Error);
            }
          }}
          onChangeFolder={async (pageId: string, folderId: string | null) => {
            try {
              // This would be handled by the parent component
              log.debug('DialogManager', '🎓 [CourseDialogManager] Change folder requested:', pageId, folderId);
            } catch (error) {
              handleDialogError('change_folder', error as Error);
            }
          }}
        />

        {/* Delete Course Dialog */}
        <DeleteCourseDialog
          isOpen={isDeleteDialogOpen}
          onClose={closeDeleteCourseDialog}
          onConfirm={handleConfirmDeleteCourse}
          courseName="Course" // Will be set by parent
          isDeleting={isDeleting}
        />

        {/* Delete Page Dialog */}
        {pageToDelete && (
          <DeletePageDialog
            isOpen={!!pageToDelete}
            onOpenChange={(isOpen) => !isOpen && closeDeletePageDialog()}
            onConfirmDelete={handleConfirmDeletePage}
            isDeleting={isDeleting}
            pageTitle={pageToDelete.title}
          />
        )}

        {/* Revert to Draft Dialog */}
        {pageToRevert && (
          <RevertToDraftDialog
            isOpen={!!pageToRevert}
            onOpenChange={(isOpen) => !isOpen && closeRevertToDraftDialog()}
            onConfirmRevert={handleConfirmRevertToDraft}
            isReverting={isReverting}
            pageTitle={pageToRevert.title}
            isPublished={pageToRevert.isPublished}
          />
        )}

        {/* Change Folder Dialog */}
        {pageToChangeFolder && (
          <ChangeFolderDialog
            isOpen={!!pageToChangeFolder}
            onOpenChange={(isOpen) => !isOpen && closeChangeFolderDialog()}
            onConfirmChange={handleConfirmChangeFolder}
            isChanging={isChangingFolder}
            pageTitle={pageToChangeFolder.title}
            courseId={courseId || ''}
            currentFolderId={pageToChangeFolder.currentFolderId}
          />
        )}
      </>
    );
  }, [
    space,
    isDeleteDialogOpen,
    closeDeleteCourseDialog,
    handleConfirmDeleteCourse,
    isDeleting,
    pageToDelete,
    closeDeletePageDialog,
    handleConfirmDeletePage,
    pageToRevert,
    closeRevertToDraftDialog,
    handleConfirmRevertToDraft,
    isReverting,
    pageToChangeFolder,
    closeChangeFolderDialog,
    handleConfirmChangeFolder,
    isChangingFolder,
    courseId,
    handleDialogError
  ]);

  // Save dialog state on changes
  useEffect(() => {
    if (enableDialogStatePersistence) {
      saveDialogState();
    }
  }, [activeDialogs, dialogAnimations, dialogFocus, enableDialogStatePersistence, saveDialogState]);

  // Memoized return object to prevent unnecessary re-renders
  const dialogManagerReturn: CourseDialogManagerReturn = useMemo(() => ({
    // Dialog state
    isDeleteDialogOpen,
    isDeleting,
    pageToDelete,
    pageToRevert,
    pageToChangeFolder,
    isReverting,
    isChangingFolder,
    
    // Dialog operations
    openDeleteCourseDialog,
    closeDeleteCourseDialog,
    openDeletePageDialog,
    closeDeletePageDialog,
    openRevertToDraftDialog,
    closeRevertToDraftDialog,
    openChangeFolderDialog,
    closeChangeFolderDialog,
    
    // Dialog confirmations
    handleConfirmDeleteCourse,
    handleConfirmDeletePage,
    handleConfirmRevertToDraft,
    handleConfirmChangeFolder,
    
    // Dialog orchestration
    openDialog,
    closeDialog,
    closeAllDialogs,
    
    // Dialog accessibility
    focusFirstElement,
    focusLastElement,
    trapFocus,
    
    // Dialog animations
    animateDialogOpen,
    animateDialogClose,
    
    // Dialog keyboard navigation
    handleKeyDown,
    handleEscapeKey,
    handleTabKey,
    
    // Dialog state persistence
    saveDialogState,
    loadDialogState,
    clearDialogState,
    
    // Dialog analytics
    trackDialogAction,
    getDialogStats,
    
    // Dialog error handling
    handleDialogError,
    retryDialogAction,
    
    // Dialog rendering
    renderDialogs,
  }), [
    isDeleteDialogOpen,
    isDeleting,
    pageToDelete,
    pageToRevert,
    pageToChangeFolder,
    isReverting,
    isChangingFolder,
    openDeleteCourseDialog,
    closeDeleteCourseDialog,
    openDeletePageDialog,
    closeDeletePageDialog,
    openRevertToDraftDialog,
    closeRevertToDraftDialog,
    openChangeFolderDialog,
    closeChangeFolderDialog,
    handleConfirmDeleteCourse,
    handleConfirmDeletePage,
    handleConfirmRevertToDraft,
    handleConfirmChangeFolder,
    openDialog,
    closeDialog,
    closeAllDialogs,
    focusFirstElement,
    focusLastElement,
    trapFocus,
    animateDialogOpen,
    animateDialogClose,
    handleKeyDown,
    handleEscapeKey,
    handleTabKey,
    saveDialogState,
    loadDialogState,
    clearDialogState,
    trackDialogAction,
    getDialogStats,
    handleDialogError,
    retryDialogAction,
    renderDialogs,
  ]);

  return dialogManagerReturn;
};

export default CourseDialogManager; 