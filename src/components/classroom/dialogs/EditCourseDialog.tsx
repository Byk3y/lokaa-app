import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { formatAsTitle } from '@/utils/textUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { uploadCourseImage, validateCourseImage } from "@/utils/courseImageUpload";
import type { CourseDisplayData } from '@/hooks/useClassroomCache';

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
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Populate form when course or dialog opens
  useEffect(() => {
    if (isOpen && course) {
      setCourseTitle(course.title || '');
      setCourseDescription(course.description || '');
      setAccessType(course.access_type || 'open');
      setIsPublished(course.is_published !== false);
      setCoursePrice(course.price ? String(course.price) : '');
      setCourseCurrency(course.currency || 'NGN');
      setCoverImageUrl(course.image_url || '');
    }
  }, [isOpen, course]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !course?.space_id) return;

    // Validate the file first
    const validation = validateCourseImage(file);
    if (!validation.isValid) {
      log.error('Component', "Invalid file:", new Error(validation.error || 'Unknown validation error'));
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadedUrl = await uploadCourseImage(file, course.space_id);
      if (uploadedUrl) {
        setCoverImageUrl(uploadedUrl);
      }
    } catch (error) {
      log.error('Component', "Upload failed:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const removeCoverImage = () => {
    setCoverImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
          image_url: coverImageUrl || null,
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
          image_url: coverImageUrl || null,
        };

        // Notify parent component
        onCourseUpdated?.(updatedDisplayCourse);
        
        // Close dialog
        onOpenChange(false);
      }
    } catch (error: any) {
      log.error('Component', "Error updating course:", error);
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
        
        <div className="px-6 pb-4">
          <div className="space-y-4">
            {/* Course Title - Full Width */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-course-title">Course Title</Label>
              <Input
                id="edit-course-title"
                value={courseTitle}
                onChange={(e) => setCourseTitle(formatAsTitle(e.target.value))}
                placeholder="e.g., Introduction to React"
                className="text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
              />
              <div className="text-xs text-gray-500 self-end text-right pr-1">
                {courseTitle.length} / 50
              </div>
            </div>

            {/* Course Description - Full Width */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-course-description">Course Description</Label>
              <Textarea
                id="edit-course-description"
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                placeholder="Describe what students will learn..."
                className="min-h-[80px] text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                rows={3}
              />
              <div className="text-xs text-gray-500 self-end text-right pr-1">
                {courseDescription.length} / 5000
              </div>
            </div>

            {/* Access Type Section - Full Width */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Access Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div 
                  onClick={() => setAccessType("open")}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out 
                              ${accessType === "open" 
                                ? 'border-primary ring-2 ring-primary shadow-md bg-primary/5' 
                                : 'border-gray-300 hover:border-gray-400 bg-white'}`}
                  style={{borderColor: accessType === "open" ? primaryColor : undefined}}
                >
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="edit-access-open" 
                      name="edit-access-type" 
                      value="open"
                      checked={accessType === "open"}
                      onChange={() => setAccessType("open")} 
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-3 shrink-0"
                      style={{color: primaryColor, borderColor: primaryColor}}
                    />
                    <div>
                      <label htmlFor="edit-access-open" className="font-semibold text-gray-800 block text-sm cursor-pointer">Open</label>
                      <span className="text-xs text-gray-500 block">All members can access.</span>
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setAccessType("paid")}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out 
                              ${accessType === "paid" 
                                ? 'border-primary ring-2 ring-primary shadow-md bg-primary/5' 
                                : 'border-gray-300 hover:border-gray-400 bg-white'}`}
                  style={{borderColor: accessType === "paid" ? primaryColor : undefined}}
                >
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="edit-access-paid" 
                      name="edit-access-type" 
                      value="paid"
                      checked={accessType === "paid"}
                      onChange={() => setAccessType("paid")} 
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-3 shrink-0"
                      style={{color: primaryColor, borderColor: primaryColor}}
                    />
                    <div>
                      <label htmlFor="edit-access-paid" className="font-semibold text-gray-800 block text-sm cursor-pointer">Buy now</label>
                      <span className="text-xs text-gray-500 block">Members pay a 1-time price.</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {accessType === "paid" && (
                <div className="mt-3">
                  <Label htmlFor="edit-course-price" className="text-sm font-medium">One-time purchase price</Label>
                  <div className="relative mt-1.5">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      $
                    </div>
                    <Input 
                      id="edit-course-price"
                      type="number"
                      placeholder="49.99" 
                      value={coursePrice}
                      onChange={(e) => setCoursePrice(e.target.value)}
                      className="text-base py-2.5 pl-8 pr-4 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                      min="0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cover Image Section - Full Width */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cover Image</Label>
              <div className="flex items-start gap-4">
                {/* Upload Area */}
                <div>
                  {coverImageUrl ? (
                    <div className="relative max-w-[365px] w-full">
                      <img
                        src={coverImageUrl}
                        alt="Course cover"
                        className="w-full h-[188px] object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={removeCoverImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={triggerImageUpload}
                      disabled={isUploadingImage}
                      className="w-[365px] h-[188px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="h-8 w-8 text-gray-400 mb-2 animate-spin" />
                          <span className="text-sm text-gray-500">Uploading...</span>
                        </>
                      ) : (
                        <span className="text-lg font-medium text-blue-500">Upload</span>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Details and Controls - Right next to image */}
                <div className="flex flex-col justify-center space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Cover</h3>
                    <p className="text-sm text-gray-500">1460 x 752 px</p>
                  </div>
                  <button
                    type="button"
                    onClick={triggerImageUpload}
                    disabled={isUploadingImage}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isUploadingImage ? "UPLOADING..." : "CHANGE"}
                  </button>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-2 pt-0 flex sm:justify-between items-center">
          {/* Published Toggle - Simple version */}
          <div 
            role="switch"
            aria-checked={isPublished}
            onClick={() => setIsPublished(prev => !prev)}
            className="flex items-center cursor-pointer"
          >
            <div 
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out 
                          ${isPublished ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <div 
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out 
                            ${isPublished ? 'translate-x-5' : 'translate-x-0'}`}
              ></div>
            </div>
            <span className={`ml-3 font-medium text-sm ${isPublished ? 'text-green-700' : 'text-gray-700'}`}>
              {isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          
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
              className="text-white px-6"
              style={{ backgroundColor: primaryColor }}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isUpdating ? "SAVING..." : "SAVE CHANGES"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditCourseDialog; 