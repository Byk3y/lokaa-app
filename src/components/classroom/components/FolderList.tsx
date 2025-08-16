import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, MoreHorizontal, FileText, CheckCircle, Plus } from "lucide-react";
import { formatAsTitle } from '@/utils/textUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CourseLesson } from '@/types/classroom/courseDetail';

interface FolderListProps {
  folders: Array<{id: string, title: string}>;
  organizedPages: {
    folderPages: Record<string, CourseLesson[]>;
  };
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (folderId: string) => void;
  selectedLesson: CourseLesson | null;
  onLessonSelect: (lesson: CourseLesson) => void;
  isOwner?: boolean;
  isAdmin?: boolean;
  isCreatingPage?: boolean;
  onAddLesson?: (moduleId?: string) => void;
  onRevertToDraft?: (pageId: string, title: string, isPublished: boolean) => void;
  onChangeFolder?: (pageId: string, title: string, moduleId: string | null) => void;
  onDuplicatePage?: (pageId: string) => void;
  onDeletePage?: (pageId: string, title: string) => void;
}

export default function FolderList({
  folders,
  organizedPages,
  expandedFolders,
  onToggleFolder,
  selectedLesson,
  onLessonSelect,
  isOwner = false,
  isAdmin = false,
  isCreatingPage = false,
  onAddLesson,
  onRevertToDraft,
  onChangeFolder,
  onDuplicatePage,
  onDeletePage,
}: FolderListProps) {
  
  const isLessonSelected = (lesson: CourseLesson) => {
    return selectedLesson?.id === lesson.id;
  };

  return (
    <>
      {/* Folders */}
      {folders.map((folder) => (
        <div key={folder.id} className="space-y-1">
          <div className="group">
            <div 
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-all duration-150"
              onClick={() => onToggleFolder(folder.id)}
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
                    onClick={() => onLessonSelect(lesson)}
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
              
              {/* New Page Button for this folder */}
              {(isOwner || isAdmin) && (
                <div className="pt-2">
                  <Button
                    onClick={() => onAddLesson?.(folder.id)}
                    disabled={isCreatingPage}
                    className="w-full h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium border border-gray-200"
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    {isCreatingPage ? 'Creating...' : 'New page'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}