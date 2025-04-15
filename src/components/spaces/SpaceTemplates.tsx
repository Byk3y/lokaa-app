
import { FileText, Calendar, MessageSquare, BookOpen, Users, Image } from "lucide-react";
import EmptyState from "./EmptyState";

export const SpaceTemplates = {
  posts: () => (
    <EmptyState
      icon={<FileText className="w-8 h-8" />}
      title="No posts yet"
      description="Create your first post to start engaging with your community!"
      actionLabel="Create Post"
      onAction={() => {}} // To be implemented
    />
  ),
  
  events: () => (
    <EmptyState
      icon={<Calendar className="w-8 h-8" />}
      title="No events scheduled"
      description="Schedule your first event to bring your community together!"
      actionLabel="Create Event"
      onAction={() => {}} // To be implemented
    />
  ),
  
  chat: () => (
    <EmptyState
      icon={<MessageSquare className="w-8 h-8" />}
      title="Start a conversation"
      description="Begin chatting with your community members!"
      actionLabel="Start Chat"
      onAction={() => {}} // To be implemented
    />
  ),
  
  course: () => (
    <EmptyState
      icon={<BookOpen className="w-8 h-8" />}
      title="Create your course"
      description="Start building your course content and lessons!"
      actionLabel="Add First Lesson"
      onAction={() => {}} // To be implemented
    />
  ),
  
  members: () => (
    <EmptyState
      icon={<Users className="w-8 h-8" />}
      title="Build your member base"
      description="Invite members to join this exclusive space!"
      actionLabel="Invite Members"
      onAction={() => {}} // To be implemented
    />
  ),
  
  images: () => (
    <EmptyState
      icon={<Image className="w-8 h-8" />}
      title="Share your first image"
      description="Start building your image gallery!"
      actionLabel="Upload Image"
      onAction={() => {}} // To be implemented
    />
  )
};
