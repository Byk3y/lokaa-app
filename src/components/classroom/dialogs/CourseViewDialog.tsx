import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatAsTitle } from '@/utils/textUtils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Book, Users, Clock, PlayCircle, CheckCircle2, Lock } from "lucide-react";
import type { CourseDisplayData } from '@/hooks/useClassroomCache';

interface CourseViewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  course: CourseDisplayData | null;
  primaryColor: string;
}

export default function CourseViewDialog({
  isOpen,
  onOpenChange,
  course,
  primaryColor,
}: CourseViewDialogProps) {
  if (!course) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pt-6 pb-4 px-6 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
                {formatAsTitle(course.title)}
              </DialogTitle>
              <p className="text-gray-600 text-sm mb-3">
                {course.description || "No description available"}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{course.students} student{course.students !== 1 ? 's' : ''}</span>
                </div>
                {course.weeks > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{course.weeks} week{course.weeks !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <Badge variant={course.is_published ? "default" : "secondary"}>
                  {course.is_published ? "Published" : "Draft"}
                </Badge>
              </div>
            </div>
            {course.image_url && (
              <div className="w-24 h-24 rounded-lg overflow-hidden ml-4 flex-shrink-0">
                <img 
                  src={course.image_url} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Enrollment Status */}
          {course.enrolled && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">You are enrolled in this course</span>
              </div>
              
              {course.progress !== undefined && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <Progress 
                    value={course.progress} 
                    className="h-2"
                    style={{ 
                      '--progress-background': primaryColor,
                    } as React.CSSProperties}
                  />
                </div>
              )}
            </div>
          )}

          {/* Course Content Preview */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Book className="h-5 w-5" />
                Course Content
              </h3>
              
              {course.enrolled ? (
                <div className="space-y-3">
                  {/* Placeholder for actual course modules/lessons */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <PlayCircle className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Introduction</div>
                      <div className="text-sm text-gray-500">Get started with the course</div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      Start
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <PlayCircle className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Module 1: Fundamentals</div>
                      <div className="text-sm text-gray-500">Learn the basics</div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      Continue
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
                    <Lock className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Module 2: Advanced Topics</div>
                      <div className="text-sm text-gray-500">Unlock by completing Module 1</div>
                    </div>
                    <Badge variant="secondary">Locked</Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Course Content Locked</h4>
                  <p className="text-gray-600 mb-4">
                    Enroll in this course to access the full content and start learning.
                  </p>
                  <Button 
                    style={{ backgroundColor: primaryColor, color: 'white' }}
                    onClick={() => onOpenChange(false)} // Close dialog to return to course grid
                  >
                    {course.access_type === 'paid' && course.price 
                      ? `Enroll for ${course.currency === 'USD' ? '$' : '₦'}${course.price}`
                      : 'Enroll Now'
                    }
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}