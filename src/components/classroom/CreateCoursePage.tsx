import { log } from '@/utils/logger';
import { formatAsTitle } from '@/utils/textUtils';
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, ImageIcon, ArrowLeft } from "lucide-react";
import { uploadCourseImage, validateCourseImage } from "@/utils/courseImageUpload";
import { useSpace } from "@/hooks/useSpace";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useNavigate } from 'react-router-dom';

interface CreateCoursePageProps {
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
  spacePricingType?: 'free' | 'paid';
  primaryColor: string;
  onClose?: () => void;
}

export default function CreateCoursePage({
  onCreateCourse,
  isCreating,
  spacePricingType,
  primaryColor,
  onClose,
}: CreateCoursePageProps) {
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
  const isMobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !space?.id) return;

    // Validate the file first
    const validation = validateCourseImage(file);
    if (!validation.isValid) {
      log.error('Component', "Invalid file:", new Error(validation.error));
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadedUrl = await uploadCourseImage(file, space.id);
      if (uploadedUrl) {
        setCoverImageUrl(uploadedUrl);
      }
    } catch (error) {
      log.error('Component', "Upload failed:", error as Error);
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

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

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
    <div className="flex-1 overflow-y-auto bg-white">
      {/* Mobile Header - Inline with content, not fixed */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">Add course</h2>
          <button
            onClick={handleBack}
            className="p-2 -mr-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="border-b border-gray-200 bg-white">
          <div className="px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">Add Course</h2>
            <p className="text-sm text-gray-500 mt-1">
              Fill in the details below to create a new course for your space.
            </p>
          </div>
        </div>
      )}
      
      {/* Scrollable Content - Everything including buttons */}
      <div className={`${isMobile ? 'p-4' : 'px-6 py-6'}`}>
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Course Title */}
          <div className="grid gap-2">
            <Label htmlFor="new-course-title-page" className="text-sm font-medium text-gray-700">Course name</Label>
            <Input 
              id="new-course-title-page" 
              placeholder="Course name" 
              value={title}
              onChange={(e) => setTitle(formatAsTitle(e.target.value))}
              className="text-base py-3 px-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm"
              maxLength={50}
            />
            <div className="text-xs text-gray-500 self-end text-right pr-1">
              {title.length}/50
            </div>
          </div>
          
          {/* Course Description */}
          <div className="grid gap-2">
            <Label htmlFor="new-course-description-page" className="text-sm font-medium text-gray-700">Course description</Label>
            <Textarea 
              id="new-course-description-page" 
              placeholder="Course description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] text-base py-3 px-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm"
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 self-end text-right pr-1">
              {description.length}/500
            </div>
          </div>

          {/* Access Type Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Course access</Label>
            <div className="space-y-3">
              {/* Open Access */}
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  accessType === 'open' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setAccessType('open')}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    accessType === 'open' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {accessType === 'open' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Open</div>
                    <div className="text-sm text-gray-500">All members can access.</div>
                  </div>
                </div>
              </div>

              {/* Buy Now Access */}
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  accessType === 'paid' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setAccessType('paid')}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    accessType === 'paid' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {accessType === 'paid' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Buy now</div>
                    <div className="text-sm text-gray-500">Members pay a 1-time price to unlock.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Input for Paid Courses */}
            {accessType === 'paid' && (
              <div className="mt-4">
                <Label htmlFor="course-price" className="text-sm font-medium text-gray-700">Price (USD)</Label>
                <Input
                  id="course-price"
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 text-base py-3 px-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Cover</Label>
            <div className="text-xs text-gray-500">1460 x 752 px</div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {coverImageUrl ? (
              <div className="relative">
                <img
                  src={coverImageUrl}
                  alt="Course cover"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={removeCoverImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={triggerImageUpload}
                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                {isUploadingImage ? (
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                    <Button variant="outline" className="mt-2">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </>
                )}
              </div>
            )}
            
            {coverImageUrl && (
              <Button
                variant="outline"
                onClick={triggerImageUpload}
                className="w-full"
              >
                CHANGE
              </Button>
            )}
          </div>

          {/* Published Toggle */}
          <div className="flex items-center justify-between py-4">
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
          </div>

          {/* Action Buttons - Part of scrollable content */}
          <div className="pt-6 space-y-3">
            <Button 
              onClick={handleSubmit}
              className="w-full text-white py-3 bg-blue-500 hover:bg-blue-600"
              disabled={isCreating}
            >
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isCreating ? "ADDING..." : "ADD"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="w-full py-3"
              disabled={isCreating}
            >
              CANCEL
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 