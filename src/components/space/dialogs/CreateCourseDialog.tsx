import { log } from '@/utils/logger';
// This file was created to resolve a build error due to its absence.
// Please populate it with the necessary code for the Create Course Dialog. 

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { uploadCourseImage, validateCourseImage } from "@/utils/courseImageUpload";
import { useSpace } from "@/hooks/useSpace";

interface CreateCourseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateCourse: (courseData: {
    title: string;
    description: string;
    accessType: "open" | "paid";
    price: number | null;
    isPublished: boolean;
    currency: string;
    coverImageUrl?: string;
  }) => Promise<void>;
  isCreating: boolean;
  spacePricingType?: 'free' | 'paid'; // To enforce business rules
  primaryColor: string;
}

export default function CreateCourseDialog({
  isOpen,
  onOpenChange,
  onCreateCourse,
  isCreating,
  spacePricingType,
  primaryColor,
}: CreateCourseDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState<"open" | "paid">("open");
  const [price, setPrice] = useState("");
  const [currency] = useState("USD");
  const [isPublished, setIsPublished] = useState(true);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const { space } = useSpace();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !space?.id) return;

    // Validate the file first
    const validation = validateCourseImage(file);
    if (!validation.isValid) {
      log.error('Component', "Invalid file:", validation.error);
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadedUrl = await uploadCourseImage(file, space.id);
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

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setAccessType("open");
      setPrice("");
      // Currency is fixed to USD
      setIsPublished(true);
      setCoverImageUrl("");
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    // Basic Validations (can be made more robust)
    if (!title.trim()) {
      alert("Course title required"); // Replace with toast
      return;
    }
    if (title.length > 50) {
      alert("Title too long (max 50 chars)"); // Replace with toast
      return;
    }
    if (description.length > 5000) {
      alert("Description too long (max 5000 chars)"); // Replace with toast
      return;
    }
    if (spacePricingType === 'paid' && accessType === 'paid') {
      alert("Paid spaces cannot have paid courses. Please set course access to 'Open'."); // Replace with toast
      return;
    }

    let priceValue: number | null = null;
    if (accessType === "paid") {
      if (!price.trim()) {
        alert("Price required for paid course"); // Replace with toast
        return;
      }
      priceValue = parseFloat(price);
      if (isNaN(priceValue) || priceValue < 0) {
        alert("Invalid price. Must be a positive number."); // Replace with toast
        return;
      }
    }

    await onCreateCourse({
      title,
      description,
      accessType,
      price: accessType === "paid" ? parseFloat(price) || 0 : null,
      isPublished,
      currency,
      coverImageUrl: coverImageUrl || undefined
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-y-auto !fixed !inset-0 !translate-x-0 !translate-y-0 m-auto">
        <DialogHeader className="pt-4 pb-2 px-6">
          <DialogTitle className="text-xl font-semibold">Add Course</DialogTitle>
          <DialogDescription className="sr-only">
            Fill in the details below to create a new course for your space.
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 pb-4">
          <div className="space-y-4">
            {/* Course Title - Full Width */}
            <div className="grid gap-1.5">
              <Label htmlFor="new-course-title-dialog">Course Title</Label>
              <Input 
                id="new-course-title-dialog" 
                placeholder="e.g., Mastering Digital Art" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
              />
              <div className="text-xs text-gray-500 self-end text-right pr-1">
                {title.length} / 50
              </div>
            </div>
            
            {/* Course Description - Full Width */}
            <div className="grid gap-1.5">
              <Label htmlFor="new-course-description-dialog">Course Description</Label>
              <Textarea 
                id="new-course-description-dialog" 
                placeholder="Provide a compelling description of your new course..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                rows={3}
              />
              <div className="text-xs text-gray-500 self-end text-right pr-1">
                {description.length} / 5000
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
                      id="new-access-open-dialog" 
                      name="new-access-type-dialog" 
                      value="open"
                      checked={accessType === "open"}
                      onChange={() => setAccessType("open")} 
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-3 shrink-0"
                      style={{color: primaryColor, borderColor: primaryColor}}
                    />
                    <div>
                      <label htmlFor="new-access-open-dialog" className="font-semibold text-gray-800 block text-sm cursor-pointer">Open</label>
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
                      id="new-access-paid-dialog" 
                      name="new-access-type-dialog" 
                      value="paid"
                      checked={accessType === "paid"}
                      onChange={() => setAccessType("paid")} 
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-3 shrink-0"
                      style={{color: primaryColor, borderColor: primaryColor}}
                    />
                    <div>
                      <label htmlFor="new-access-paid-dialog" className="font-semibold text-gray-800 block text-sm cursor-pointer">Buy now</label>
                      <span className="text-xs text-gray-500 block">Members pay a 1-time price.</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {accessType === "paid" && (
                <div className="mt-3">
                  <Label htmlFor="new-course-price-dialog" className="text-sm font-medium">One-time purchase price</Label>
                  <div className="relative mt-1.5">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      $
                    </div>
                    <Input 
                      id="new-course-price-dialog" 
                      type="number"
                      placeholder="49.99" 
                      value={price} 
                      onChange={(e) => setPrice(e.target.value)} 
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
              disabled={isCreating}
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleSubmit}
              className="text-white px-6"
              style={{ backgroundColor: primaryColor }}
              disabled={isCreating}
            >
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isCreating ? "ADDING..." : "ADD"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 