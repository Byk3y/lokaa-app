import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, MoreHorizontal, FileText, CheckCircle } from "lucide-react";
import { formatAsTitle } from '@/utils/textUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRootFolders } from '@/hooks/useRootFolders';
import { log } from '@/utils/logger';
import { getLessonUrl } from '@/utils/slugUtils';
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

  const isLessonSelected = (lesson: CourseLesson) => {
    return selectedLesson?.id === lesson.id;
  };

  if (!course) {
    return (
      <div className="w-80 border-r border-gray-100 bg-gray-50/50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading course...</div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-gray-100 bg-white flex flex-col mt-1 ml-4 rounded-lg shadow-lg h-fit">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {formatAsTitle(course.title)}
            </h2>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{course.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${course.progress || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
          {(isOwner || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                  <MoreHorizontal className="h-4 w-4" strokeWidth={2.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEditCourse}>
                  Edit course
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddFolder}>
                  Add folder
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onDeleteCourse}
                  className="text-red-600 focus:text-red-600"
                >
                  Delete course
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* Add New Page Button */}
        {(isOwner || isAdmin) && (
          <Button
            onClick={() => onAddLesson?.()}
            disabled={isCreatingPage}
            className="w-full h-9 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isCreatingPage ? 'Creating...' : 'New page'}
          </Button>
        )}
        </div>

      {/* Content */}
      <div className="overflow-y-auto p-3">
        <div className="space-y-2">
          {/* Root Pages */}
          {organizedPages.rootPages.length > 0 && (
            <div className="space-y-1">
              {organizedPages.rootPages.map((lesson) => (
                <div key={lesson.id} className="group">
                  <div 
                    className={`
                      flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-150
                      ${isLessonSelected(lesson) 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50 border border-transparent'
                      }
                    `}
                    onClick={() => handleLessonSelect(lesson)}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <FileText className={`
                        mr-3 h-4 w-4 flex-shrink-0
                        ${isLessonSelected(lesson) ? 'text-blue-600' : 'text-gray-400'}
                      `} />
                      <div className="flex-1 min-w-0">
                        <div className={`
                          text-sm font-medium truncate flex items-center gap-2
                          ${isLessonSelected(lesson) ? 'text-blue-900' : 'text-gray-900'}
                        `}>
                          <span className="truncate">{formatAsTitle(lesson.title)}</span>
                          {!lesson.is_published && (isOwner || isAdmin) && (
                            <span className="ml-2 inline-block px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              Draft
                            </span>
                          )}
                        </div>
        </div>
      </div>

                    <div className="flex items-center gap-1">
                      {lesson.completed && (
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" strokeWidth={2.5} />
                      )}
                      {(isOwner || isAdmin) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 opacity-100 sm:opacity-100 md:opacity-100 hover:bg-gray-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" strokeWidth={2.5} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="text-sm">
                              Edit page
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onRevertToDraft && onRevertToDraft(lesson.id, lesson.title, lesson.is_published)}
                              className="text-sm"
                            >
                              {lesson.is_published ? 'Revert to draft' : 'Publish page'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onChangeFolder && onChangeFolder(lesson.id, lesson.title, lesson.module_id)}
                              className="text-sm"
                            >
                              Change folder
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDuplicatePage && onDuplicatePage(lesson.id)}
                              className="text-sm"
                            >
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-sm">
                              <ChevronRight className="mr-2 h-3 w-3" />
                              Drip status: Off
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDeletePage && onDeletePage(lesson.id, lesson.title)}
                              className="text-sm text-red-600 focus:text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Folders */}
          {folders.map((folder) => (
            <div key={folder.id} className="space-y-1">
              <div className="group">
                <div 
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-all duration-150"
                  onClick={() => toggleFolder(folder.id)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <span className="text-sm font-bold text-gray-900 truncate">
                      {folder.title}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({organizedPages.folderPages[folder.id]?.length || 0})
                  </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {(isOwner || isAdmin) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                            className="h-7 w-7 p-0 opacity-100 sm:opacity-100 md:opacity-100 hover:bg-gray-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" strokeWidth={2.5} />
                    </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={() => onAddLesson?.(folder.id)}
                            className="text-sm"
                          >
                            Add page in folder
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-sm">
                            Edit folder
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-sm text-red-600 focus:text-red-600">
                            Delete folder
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    {/* Chevron moved to far right */}
                    {(expandedFolders[folder.id] !== false) ? (
                      <ChevronDown className="h-4 w-4 text-gray-600 flex-shrink-0" strokeWidth={2.5} />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-600 flex-shrink-0" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
              </div>

              {/* Folder Contents */}
              {(expandedFolders[folder.id] !== false) && organizedPages.folderPages[folder.id] && (
                <div className="space-y-1">
                  {organizedPages.folderPages[folder.id].map((lesson) => (
                    <div key={lesson.id} className="group">
                      <div 
                        className={`
                          flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-150
                          ${isLessonSelected(lesson) 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-50 border border-transparent'
                          }
                        `}
                        onClick={() => handleLessonSelect(lesson)}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <FileText className={`
                            mr-3 h-4 w-4 flex-shrink-0
                            ${isLessonSelected(lesson) ? 'text-blue-600' : 'text-gray-400'}
                          `} />
                          <div className="flex-1 min-w-0">
                            <div className={`
                              text-sm font-medium truncate flex items-center gap-2
                              ${isLessonSelected(lesson) ? 'text-blue-900' : 'text-gray-900'}
                            `}>
                              <span className="truncate">{formatAsTitle(lesson.title)}</span>
                              {!lesson.is_published && (isOwner || isAdmin) && (
                                <span className="ml-2 inline-block px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                  Draft
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {lesson.completed && (
                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" strokeWidth={2.5} />
                          )}
                          {(isOwner || isAdmin) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0 opacity-100 sm:opacity-100 md:opacity-100 hover:bg-gray-200"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" strokeWidth={2.5} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="text-sm">
                                  Edit page
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onRevertToDraft && onRevertToDraft(lesson.id, lesson.title, lesson.is_published)}
                                  className="text-sm"
                                >
                                  {lesson.is_published ? 'Revert to draft' : 'Publish page'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onChangeFolder && onChangeFolder(lesson.id, lesson.title, lesson.module_id)}
                                  className="text-sm"
                                >
                                  Change folder
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onDuplicatePage && onDuplicatePage(lesson.id)}
                                  className="text-sm"
                                >
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-sm">
                                  <ChevronRight className="mr-2 h-3 w-3" />
                                  Drip status: Off
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onDeletePage && onDeletePage(lesson.id, lesson.title)}
                                  className="text-sm text-red-600 focus:text-red-600"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

          {/* New Page Placeholder */}
          {organizedPages.rootPages.length === 0 && folders.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pages yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new page.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 