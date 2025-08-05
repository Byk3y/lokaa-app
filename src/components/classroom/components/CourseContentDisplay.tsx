import React from 'react';
import CourseSidebar from '../CourseSidebar';
import LessonContent from '../LessonContent';
import RichTextEditor from '@/components/ui/rich-text-editor';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

interface CourseContentDisplayProps {
  displayCourse: CourseDetailData;
  selectedLesson: CourseLesson | null;
  setSelectedLesson: (lesson: CourseLesson | null) => void;
  isOwner: boolean;
  isAdmin: boolean;
  // Page creation state
  isCreatingPage: boolean;
  newPageContent: string;
  setNewPageContent: (content: string) => void;
  setNewPageTitle: (title: string) => void;
  handleCreateNewPage: (moduleId?: string) => void;
  handleCancelCreate: () => void;
  handleSaveNewPage: (title: string) => Promise<void>;
  handleUpdateLesson: (lessonId: string, updates: Record<string, unknown>) => Promise<void>;
  handleMarkAsDone: () => Promise<void>;
  // Course management handlers
  handleEditCourse: () => void;
  handleDeleteCourse: () => void;
  handleAddFolder: () => void;
  // Page management handlers
  openDeletePageDialog: (pageId: string, title: string) => void;
  openRevertToDraftDialog: (pageId: string, title: string, isPublished: boolean) => void;
  openChangeFolderDialog: (pageId: string, title: string, currentFolderId: string | null) => void;
}

/**
 * CourseContentDisplay handles the main desktop layout coordination
 * Extracted from CourseDetailView to isolate content display logic
 */
export const CourseContentDisplay: React.FC<CourseContentDisplayProps> = ({
  displayCourse,
  selectedLesson,
  setSelectedLesson,
  isOwner,
  isAdmin,
  isCreatingPage,
  newPageContent,
  setNewPageContent,
  setNewPageTitle,
  handleCreateNewPage,
  handleCancelCreate,
  handleSaveNewPage,
  handleUpdateLesson,
  handleMarkAsDone,
  handleEditCourse,
  handleDeleteCourse,
  handleAddFolder,
  openDeletePageDialog,
  openRevertToDraftDialog,
  openChangeFolderDialog
}) => {
  return (
    <div className="flex w-full">
      <CourseSidebar
        course={displayCourse}
        selectedLesson={selectedLesson}
        onLessonSelect={setSelectedLesson}
        isOwner={isOwner}
        isAdmin={isAdmin}
        ownershipLoading={false}
        isCreatingPage={isCreatingPage}
        onAddLesson={(moduleId) => handleCreateNewPage(moduleId)}
        onAddModule={() => handleCreateNewPage()}
        onEditCourse={handleEditCourse}
        onDeleteCourse={handleDeleteCourse}
        onAddFolder={handleAddFolder}
        spaceId={displayCourse.space_id}
        onDeletePage={(pageId, title) => openDeletePageDialog(pageId, title)}
        onRevertToDraft={(pageId, title, isPublished) => openRevertToDraftDialog(pageId, title, isPublished)}
        onChangeFolder={(pageId, title, currentFolderId) => openChangeFolderDialog(pageId, title, currentFolderId)}
      />

      <div className="flex-1 w-full min-w-0">
        {/* Show inline page creation in right panel - Direct to editor without title field */}
        {isCreatingPage ? (
          <div className="flex-1 pt-1 pb-6 pl-12 pr-6 overflow-hidden bg-gray-50">
            <RichTextEditor
              content={newPageContent}
              onChange={setNewPageContent}
              placeholder="Write your lesson content here...

You can use headings, bold text, links, and other formatting to structure your content."
              className="h-full"
              onSave={(title, content) => {
                setNewPageTitle(title);
                setNewPageContent(content);
                handleSaveNewPage(title);
              }}
              onCancel={handleCancelCreate}
              hideTitle={false}
              isSaving={false}
              spaceId={displayCourse?.space_id}
              courseId={displayCourse?.id}
              lessonId={undefined}
            />
          </div>
        ) : (
          <LessonContent
            lesson={selectedLesson}
            courseName={displayCourse.title}
            isOwner={isOwner}
            isAdmin={isAdmin}
            completed={selectedLesson?.completed || false}
            onUpdateLesson={handleUpdateLesson}
            onCreateNewPage={() => handleCreateNewPage()}
            onMarkAsDone={handleMarkAsDone}
          />
        )}
      </div>
    </div>
  );
};