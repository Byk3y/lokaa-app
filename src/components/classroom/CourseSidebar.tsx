import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatAsTitle } from '@/utils/textUtils';
import { useRootFolders } from '@/hooks/useRootFolders';
import { log } from '@/utils/logger';
import { getLessonUrl } from '@/utils/slugUtils';
import SidebarHeader from './components/SidebarHeader';
import FolderList from './components/FolderList';
import RootPagesList from './components/RootPagesList';
import EmptyState from './components/EmptyState';
import type { 
  CourseLesson, 
  CourseModule, 
  CourseDetailData, 
  CourseSidebarProps 
} from '@/types/classroom/courseDetail';

export default function CourseSidebar({
  course,
  selectedLesson,
  onLessonSelect,
  isOwner = false,
  isAdmin = false,
  ownershipLoading = false,
  isCreatingPage = false,
  onAddLesson,
  onEditLesson,
  onAddModule,
  onEditCourse,
  onDeleteCourse,
  onAddFolder,
  spaceId,
  onDeletePage,
  onRevertToDraft,
  onDuplicatePage,
  onChangeFolder,
}: CourseSidebarProps) {
  

  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain: string }>();
  
  // Handle lesson selection with navigation (Skool-style)
  const handleLessonSelect = (lesson: CourseLesson) => {
    // Call the original onLessonSelect for local state
    onLessonSelect(lesson);
    
    // Debug logging
    log.debug('Component', '🎓 [CourseSidebar] handleLessonSelect called with:', {
      lessonTitle: lesson.title,
      lessonId: lesson.id,
      subdomain,
      courseShortId: course.short_id,
      hasAllRequired: !!(lesson.id && subdomain && course.short_id)
    });
    
    // Navigate to the lesson URL if lesson ID is available (Skool-style)
    if (lesson.id && subdomain && course.short_id) {
      const lessonUrl = getLessonUrl(subdomain, course.short_id, lesson.id);
      log.debug('Component', '🎓 [CourseSidebar] Navigating to lesson:', lessonUrl);
      navigate(lessonUrl);
    } else {
      log.warn('Component', '🎓 [CourseSidebar] Missing required data for navigation:', {
        lessonId: lesson.id,
        subdomain,
        courseShortId: course.short_id
      });
    }
  };
  // Initialize folders as expanded by default
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Get folders using the hook
  const { folders, loading: foldersLoading } = useRootFolders(spaceId || '', course?.id || '');

  // Auto-expand all folders on first load
  React.useEffect(() => {
    if (folders.length > 0) {
      const initialExpanded: Record<string, boolean> = {};
      folders.forEach(folder => {
        if (!(folder.id in expandedFolders)) {
          initialExpanded[folder.id] = true; // Expand by default
        }
      });
      if (Object.keys(initialExpanded).length > 0) {
        setExpandedFolders(prev => ({ ...prev, ...initialExpanded }));
      }
    }
  }, [folders]);

  // Debug logging
  log.debug('CourseSidebar - Raw course data:', JSON.stringify(course, null, 2));
  log.debug('CourseSidebar - Course modules:', JSON.stringify(course.modules, null, 2));

  // Get all pages from the course and organize them by folder
  const organizedPages = course.modules.reduce<{
    rootPages: CourseLesson[];
    folderPages: Record<string, CourseLesson[]>;
  }>((acc, module) => {
    if (module.lessons) {
      // If the module is a folder
      if (module.module_type === 'folder') {
        // Skip the default "Pages" folder as its contents should go to root
        if (module.title !== 'Pages') {
          acc.folderPages[module.id] = [...(module.lessons || [])];
        }
      }
      
      // For each lesson, check if it belongs to a specific folder
      module.lessons.forEach(lesson => {
        if (lesson.module_id) {
          // Find the module this lesson belongs to
          const parentModule = course.modules.find(m => m.id === lesson.module_id);
          
          // If parent module is a folder and not the default "Pages" folder
          if (parentModule && parentModule.module_type === 'folder' && parentModule.title !== 'Pages') {
            if (!acc.folderPages[parentModule.id]) {
              acc.folderPages[parentModule.id] = [];
            }
            // Only add if not already in the folder
            if (!acc.folderPages[parentModule.id].some(p => p.id === lesson.id)) {
              acc.folderPages[parentModule.id].push(lesson);
            }
          } else {
            // If parent is "Pages" folder or not a folder, add to root
            if (!acc.rootPages.some(p => p.id === lesson.id)) {
              acc.rootPages.push(lesson);
            }
          }
        } else {
          // If no module_id, add to root pages
          if (!acc.rootPages.some(p => p.id === lesson.id)) {
            acc.rootPages.push(lesson);
          }
        }
      });
    }
    return acc;
  }, { rootPages: [], folderPages: {} });

  // Sort root pages by lesson_order
  organizedPages.rootPages.sort((a, b) => (a.lesson_order || 0) - (b.lesson_order || 0));

  // Sort pages within each folder by lesson_order
  Object.keys(organizedPages.folderPages).forEach(folderId => {
    organizedPages.folderPages[folderId].sort((a, b) => (a.lesson_order || 0) - (b.lesson_order || 0));
  });

  log.debug('CourseSidebar - Organized pages:', JSON.stringify(organizedPages, null, 2));
  log.debug('CourseSidebar - Folders from hook:', JSON.stringify(folders, null, 2));

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };


  if (!course) {
    return (
      <div className="w-80 border-r border-gray-100 bg-gray-50/50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading course...</div>
      </div>
    );
  }

  // Handle back to courses navigation
  const handleBackToCourses = () => {
    if (subdomain) {
      navigate(`/${subdomain}/space/classroom`);
    }
  };

  return (
    <div className="w-80 border-r border-gray-100 bg-white flex flex-col mt-1 ml-4 rounded-lg shadow-lg h-fit">
      <SidebarHeader
        course={course}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isCreatingPage={isCreatingPage}
        onEditCourse={onEditCourse}
        onDeleteCourse={onDeleteCourse}
        onAddFolder={onAddFolder}
        onAddLesson={onAddLesson}
        onBackToCourses={handleBackToCourses}
      />

      {/* Content */}
      <div className="overflow-y-auto p-3">
        <div className="space-y-2">
          {/* Root Pages */}
          <RootPagesList
            rootPages={organizedPages.rootPages}
            selectedLesson={selectedLesson}
            onLessonSelect={handleLessonSelect}
            isOwner={isOwner}
            isAdmin={isAdmin}
            isCreatingPage={isCreatingPage}
            onAddLesson={onAddLesson}
            onRevertToDraft={onRevertToDraft}
            onChangeFolder={onChangeFolder}
            onDuplicatePage={onDuplicatePage}
            onDeletePage={onDeletePage}
          />

          {/* Folders */}
          <FolderList
            folders={folders}
            organizedPages={organizedPages}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            selectedLesson={selectedLesson}
            onLessonSelect={handleLessonSelect}
            isOwner={isOwner}
            isAdmin={isAdmin}
            isCreatingPage={isCreatingPage}
            onAddLesson={onAddLesson}
            onRevertToDraft={onRevertToDraft}
            onChangeFolder={onChangeFolder}
            onDuplicatePage={onDuplicatePage}
            onDeletePage={onDeletePage}
          />

          {/* Empty State */}
          <EmptyState show={organizedPages.rootPages.length === 0 && folders.length === 0} />
        </div>
      </div>
    </div>
  );
} 