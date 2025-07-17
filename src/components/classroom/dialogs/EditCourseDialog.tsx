import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CourseDisplayData } from '@/types/classroom';

interface EditCourseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  course: CourseDisplayData | null;
  spacePricingType?: 'free' | 'paid';
  primaryColor?: string;
  onCourseUpdated?: (course: CourseDisplayData) => void;
}

export function EditCourseDialog({
  isOpen,
  onOpenChange,
  course,
  spacePricingType = 'free',
  primaryColor = '#26A69A',
  onCourseUpdated,
}: EditCourseDialogProps) {
  // Form state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [accessType, setAccessType] = useState<'open' | 'paid'>('open');
  const [isPublished, setIsPublished] = useState(true);
  const [coursePrice, setCoursePrice] = useState('');
  const [courseCurrency, setCourseCurrency] = useState('NGN');
  const [isUpdating, setIsUpdating] = useState(false);

  // Populate form when course or dialog opens
  useEffect(() => {
    if (isOpen && course) {
      setCourseTitle(course.title || '');
      setCourseDescription(course.description || '');
      setAccessType(course.access_type || 'open');
      setIsPublished(course.is_published !== false);
      setCoursePrice(course.price ? String(course.price) : '');
      setCourseCurrency(course.currency || 'NGN');
    }
  }, [isOpen, course]);

  const handleUpdateCourse = async () => {
    if (!course) return;
    
    setIsUpdating(true);

    try {
      // Validate inputs
      if (!courseTitle.trim()) {
        toast({
          title: "Course title required",
          description: "Please enter a title for your course",
          variant: "destructive"
        });
        return;
      }

      if (courseTitle.length > 50) {
        toast({
          title: "Title too long",
          description: "Course title must be 50 characters or less",
          variant: "destructive"
        });
        return;
      }

      if (courseDescription.length > 5000) {
        toast({
          title: "Description too long",
          description: "Course description must be 5000 characters or less",
          variant: "destructive"
        });
        return;
      }

      // Business rule: only free spaces can have a paid course
      if (spacePricingType === 'paid' && accessType === 'paid') {
        toast({
          title: "Action not allowed",
          description: "Paid spaces cannot have paid courses at this time. Please set course access to 'Open'.",
          variant: "destructive"
        });
        return;
      }

      let priceValue: number | null = null;
      if (accessType === "paid") {
        if (!coursePrice.trim()) {
          toast({
            title: "Price required",
            description: "Please enter a price for your paid course",
            variant: "destructive"
          });
          return;
        }
        priceValue = parseFloat(coursePrice);
        if (isNaN(priceValue) || priceValue < 0) {
          toast({
            title: "Invalid price",
            description: "Please enter a valid positive price.",
            variant: "destructive"
          });
          return;
        }
      }

      // Update in Supabase
      const { data: updatedCourseData, error: updateError } = await (getSupabaseClient() as any)
        .from('courses')
        .update({
          title: courseTitle.trim(),
          description: courseDescription.trim(),
          access_type: accessType,
          price: priceValue,
          is_published: isPublished,
          currency: courseCurrency,
        })
        .eq('id', course.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (updatedCourseData) {
        toast({
          title: "Course Updated!",
          description: `"${updatedCourseData.title}" has been successfully updated.`,
        });

        // Create updated CourseDisplayData object
        const updatedDisplayCourse: CourseDisplayData = {
          ...course,
          title: updatedCourseData.title,
          description: updatedCourseData.description,
          access_type: updatedCourseData.access_type as 'open' | 'paid',
          price: updatedCourseData.price,
          is_published: updatedCourseData.is_published,
          currency: courseCurrency,
        };

        // Notify parent component
        onCourseUpdated?.(updatedDisplayCourse);
        
        // Close dialog
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Error updating course:", error);
      toast({
        title: "Failed to Update Course",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!course) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>Update the course details.</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Course Title */}
              <div className="grid gap-1.5">
                <Label htmlFor="edit-course-title" className="text-sm font-medium">Course Title</Label>
                <Input
                  id="edit-course-title"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g., Introduction to React"
                  className="text-base py-2.5 px-3"
                />
                <div className="text-xs text-gray-500 text-right">
                  {courseTitle.length} / 50
                </div>
              </div>

              {/* Course Description */}
              <div className="grid gap-1.5">
                <Label htmlFor="edit-course-description" className="text-sm font-medium">Course Description</Label>
                <Textarea
                  id="edit-course-description"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  placeholder="Describe what students will learn..."
                  rows={4}
                  className="text-base py-2.5 px-3"
                />
                <div className="text-xs text-gray-500 text-right">
                  {courseDescription.length} / 5000
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Access Type */}
              <div className="grid gap-3">
                <Label className="text-sm font-medium">Course Access</Label>
                <RadioGroup 
                  value={accessType} 
                  onValueChange={(value: 'open' | 'paid') => setAccessType(value)}
                  className="gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="open" id="edit-access-open" />
                    <Label htmlFor="edit-access-open" className="text-sm cursor-pointer">
                      Open (Free Access)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paid" id="edit-access-paid" />
                    <Label htmlFor="edit-access-paid" className="text-sm cursor-pointer">
                      Paid Course
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Price (only show if paid) */}
              {accessType === 'paid' && (
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-course-price" className="text-sm font-medium">Course Price</Label>
                  <div className="flex gap-2">
                    <select 
                      value={courseCurrency}
                      onChange={(e) => setCourseCurrency(e.target.value)}
                      className="px-3 py-2.5 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white w-20"
                    >
                      <option value="NGN">₦</option>
                      <option value="USD">$</option>
                      <option value="EUR">€</option>
                      <option value="GBP">£</option>
                    </select>
                    <Input 
                      id="edit-course-price"
                      type="number"
                      placeholder="0.00"
                      value={coursePrice}
                      onChange={(e) => setCoursePrice(e.target.value)}
                      className="text-base py-2.5 px-3 flex-1"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}

              {/* Publish Status */}
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Publish Course</Label>
                  <p className="text-xs text-gray-500">
                    {isPublished ? "Course is visible to students" : "Course is hidden from students"}
                  </p>
                </div>
                <Switch 
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center">
          <div></div>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-6"
              disabled={isUpdating}
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleUpdateCourse}
              className="px-6"
              style={{ backgroundColor: primaryColor, color: 'white' }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isUpdating ? "SAVING..." : "SAVE CHANGES"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditCourseDialog; 