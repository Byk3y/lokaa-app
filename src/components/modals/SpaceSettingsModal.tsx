import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion } from "framer-motion";
import { Loader2, Upload, Star, Users, Link, Layers, Shield, UserPlus, Settings, Globe, Lock, X, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import useSpaceSettingsModal from '@/hooks/useSpaceSettingsModal';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Constants for storage
const STORAGE_BUCKET_NAME = 'media';
const MAX_ICON_SIZE_MB = 2;
const MAX_COVER_SIZE_MB = 8;
const MAX_ICON_SIZE_BYTES = MAX_ICON_SIZE_MB * 1024 * 1024;
const MAX_COVER_SIZE_BYTES = MAX_COVER_SIZE_MB * 1024 * 1024;

// Helper function to resolve image URLs that might be stored in localStorage
const resolveImageUrl = (imageUrl: string | null, fallbackUrl: string = '/default-cover.jpg'): string => {
  if (!imageUrl) return fallbackUrl;
  
  // If the URL starts with 'local:', retrieve from localStorage
  if (imageUrl.startsWith('local:')) {
    const storageKey = imageUrl.replace('local:', '');
    const storedImage = localStorage.getItem(storageKey);
    return storedImage || fallbackUrl;
  }
  
  // Otherwise, use the URL directly
  return imageUrl;
};

// Function to compress images before storing
const compressImage = async (file: File, maxWidthHeight: number, quality: number = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height && width > maxWidthHeight) {
          height = Math.round((height * maxWidthHeight) / width);
          width = maxWidthHeight;
        } else if (height > maxWidthHeight) {
          width = Math.round((width * maxWidthHeight) / height);
          height = maxWidthHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          file.type,
          quality
        );
      };
      img.onerror = () => reject(new Error('Image loading error'));
    };
    reader.onerror = () => reject(new Error('File reading error'));
  });
};

// Define a placeholder type for form data
interface SpaceSettingsData {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  icon_image: string | null;
  primary_color: string | null;
  is_private: boolean;
  pricing_type?: 'free' | 'paid';
  price_per_month?: number;
  subdomain: string;
  owner_id: string;
}

export default function SpaceSettingsModal() {
  const { user } = useAuth();
  const { isOpen, spaceId, close } = useSpaceSettingsModal();
  const { space, loading, error, fetchSpaceSettings } = useSpaceSettingsStore();
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<SpaceSettingsData>>({});
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [editingSubdomain, setEditingSubdomain] = useState(false);
  const [subdomainValue, setSubdomainValue] = useState("");
  
  // Fetch space settings when the modal opens and spaceId changes
  useEffect(() => {
    if (isOpen && spaceId && user) {
      fetchSpaceSettings(spaceId, user.id);
    }
  }, [isOpen, spaceId, user, fetchSpaceSettings]);
  
  // Initialize form data from space once loaded
  useEffect(() => {
    if (space) {
      console.log("Initializing form data from space:", space);
      setFormData({
        name: space.name,
        description: space.description || "", // Convert null to empty string for the form
        cover_image: space.cover_image,
        is_private: space.is_private
      });
    }
  }, [space]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log(`Input change: ${name} = "${value}"`);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle privacy toggle
  const handlePrivacyChange = (value: string) => {
    setFormData(prev => ({ ...prev, is_private: value === 'private' }));
  };

  // Add function to check if Supabase storage is working
  const checkStorageAccess = async () => {
    try {
      console.log("Checking Supabase storage bucket access...");
      const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET_NAME);
    
      if (error) {
        console.error("Storage access error:", error);
        return false;
      }
      
      console.log("Storage bucket accessible:", data);
      return true;
    } catch (err) {
      console.error("Storage access check failed:", err);
      return false;
    }
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'cover') => {
    const files = event.target.files;
    if (!files || files.length === 0 || !space) return;
    
    const file = files[0];
    const maxSize = type === 'icon' ? MAX_ICON_SIZE_BYTES : MAX_COVER_SIZE_BYTES;
    
    // Validate file size
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `${type === 'icon' ? 'Icon' : 'Cover'} image must be less than ${type === 'icon' ? MAX_ICON_SIZE_MB : MAX_COVER_SIZE_MB}MB`,
        variant: "destructive"
      });
        return;
      }
      
    if (type === 'icon') {
      setUploadingIcon(true);
    } else {
      setUploadingCover(true);
    }
    
    try {
      console.log(`Starting upload for ${type} image:`, file.name);
      
      // Compress the image for storage efficiency
      const maxDimension = type === 'icon' ? 128 : 800; // Limit cover images to 800px max dimension
      const quality = type === 'icon' ? 0.9 : 0.7; // Use higher quality for icons, lower for covers
      
      console.log(`Compressing ${type} image to max dimension: ${maxDimension}px with quality: ${quality}`);
      const compressedBlob = await compressImage(file, maxDimension, quality);
      console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB, Compressed size: ${(compressedBlob.size / 1024).toFixed(2)}KB`);
      
      // Convert compressed blob to base64 for localStorage
      const reader = new FileReader();
      reader.readAsDataURL(compressedBlob);
      
      // Create a promise to handle FileReader async operation
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      
      // Add a unique key for this image in local storage
      const storageKey = `space_${type}_${space.id}_${Date.now()}`;
      
      // Try to store in localStorage with error handling
      try {
        localStorage.setItem(storageKey, base64Data);
        console.log(`Compressed image stored in localStorage with key: ${storageKey}`);
      } catch (localStorageError) {
        console.error("localStorage error:", localStorageError);
        // If localStorage fails, try to clear some space
        try {
          // Find and remove old images with the same prefix
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`space_${type}_${space.id}_`) && key !== storageKey) {
              keysToRemove.push(key);
            }
          }
          
          // Remove old images (if any)
          if (keysToRemove.length > 0) {
            console.log(`Removing ${keysToRemove.length} old images to free up space`);
            keysToRemove.forEach(key => localStorage.removeItem(key));
            // Try storing again
            localStorage.setItem(storageKey, base64Data);
            console.log(`Successfully stored image after clearing space`);
          } else {
            throw new Error("No space available in localStorage");
          }
        } catch (retryError) {
          throw new Error("Insufficient storage space: Please try a smaller image or clear your browser cache");
        }
      }
      
      // Try to upload to Supabase storage
      try {
        // Create a new File object from the compressed blob
        const compressedFile = new File([compressedBlob], file.name, { type: file.type });
        
        // Try to upload to Supabase storage
        const filePath = `spaces/${space.id}/${type}/${uuidv4()}-${file.name.replace(/\s+/g, '-')}`;
        console.log("Uploading compressed image to path:", filePath);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .upload(filePath, compressedFile, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }
        
        console.log("Upload successful:", uploadData);
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .getPublicUrl(filePath);
        
        const publicUrl = urlData.publicUrl;
        console.log("Public URL:", publicUrl);
        
        // Update form data with new image URL
        setFormData(prev => ({
          ...prev,
          [type === 'icon' ? 'icon_image' : 'cover_image']: publicUrl
        }));
        
        // Update space in database
        const { error: updateError } = await supabase
          .from('spaces')
          .update({ 
            [type === 'icon' ? 'icon_image' : 'cover_image']: publicUrl 
          })
          .eq('id', space.id);
          
        if (updateError) {
          console.error("Error updating space record:", updateError);
          throw updateError;
        }
        
        toast({
          title: "Upload successful",
          description: `${type === 'icon' ? 'Icon' : 'Cover'} image has been updated.`
        });
        
        // Refresh space data
        await fetchSpaceSettings(space.id, user?.id || '');
        
      } catch (storageError) {
        console.warn("Supabase storage upload failed, using localStorage instead:", storageError);
        
        // Fallback to localStorage URL
        const localUrl = `local:${storageKey}`;
        
        // Update form data with local URL
        setFormData(prev => ({
          ...prev,
          [type === 'icon' ? 'icon_image' : 'cover_image']: localUrl
        }));
        
        // Update space in database with local reference
        const { error: updateError } = await supabase
          .from('spaces')
          .update({ 
            [type === 'icon' ? 'icon_image' : 'cover_image']: localUrl 
          })
          .eq('id', space.id);
          
        if (updateError) {
          console.error("Error updating space record with local URL:", updateError);
          throw updateError;
        }
        
        toast({
          title: "Image saved locally",
          description: `${type === 'icon' ? 'Icon' : 'Cover'} image has been saved to local storage.`
        });
        
        // Refresh space data
        await fetchSpaceSettings(space.id, user?.id || '');
      }
        
      } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: "Upload failed",
        description: error.message || `Could not upload ${type} image.`,
        variant: "destructive"
      });
    } finally {
      if (type === 'icon') {
        setUploadingIcon(false);
    } else {
        setUploadingCover(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space) return;
    setSaving(true);

    try {
      console.log("Saving form data:", formData);
      
      // Create a clean update object with only the fields we want to update
      const updateData: Partial<SpaceSettingsData> = {};
      
      // Only include fields that are defined and have changed
      if (formData.name !== undefined) updateData.name = formData.name;
      if (formData.description !== undefined) updateData.description = formData.description === "" ? null : formData.description;
      if (formData.is_private !== undefined) updateData.is_private = formData.is_private;
      
      console.log("Sending update data to server:", updateData);

      const { error } = await supabase
        .from('spaces')
        .update(updateData)
        .eq('id', space.id);

      if (error) throw error;

      toast({ title: "Success", description: "Settings updated successfully." });
      // Refresh space data
      if (user) {
        fetchSpaceSettings(space.id, user.id);
      }
      
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: `Failed to update settings: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">Space settings</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[600px]"> {/* Fixed height container for consistent sizing */}
          {/* Left sidebar with tabs */}
          <div className="w-56 border-r shrink-0">
            <div className="px-2 py-4">
              <div className="space-y-1">
                <button 
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${activeTab === "general" ? "bg-amber-50 text-amber-900 font-medium" : "hover:bg-gray-100"}`}
                  onClick={() => setActiveTab("general")}
                >
                  <div className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    <span>General</span>
                  </div>
                </button>
                <button 
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${activeTab === "subscriptions" ? "bg-amber-50 text-amber-900 font-medium" : "hover:bg-gray-100"}`}
                  onClick={() => setActiveTab("subscriptions")}
                >
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-2" />
                    <span>Subscriptions</span>
                  </div>
                </button>
                <button 
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${activeTab === "invite" ? "bg-amber-50 text-amber-900 font-medium" : "hover:bg-gray-100"}`}
                  onClick={() => setActiveTab("invite")}
                >
                  <div className="flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    <span>Invite</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          {/* Right content area - Consistent height content with scrollable interior */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              {/* GENERAL TAB */}
              {activeTab === "general" && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    {/* Icon upload */}
                    <div>
                      <div className="flex items-center mb-1">
                        <Label className="block text-sm font-medium">Icon</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 ml-1 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="w-[200px] text-xs">Your space icon appears in navigation and listings. Square format recommended.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div>
                        <div 
                          className="aspect-square w-24 h-24 bg-gray-100 rounded-md border flex items-center justify-center relative overflow-hidden mb-1 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
                          onClick={() => document.getElementById('icon-upload-input')?.click()}
                        >
                          {formData.icon_image ? (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                              className="absolute inset-0 w-full h-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${resolveImageUrl(formData.icon_image)})` }}
                            />
                          ) : (
                            <div className="text-gray-400 text-center">
                              <Upload className="h-5 w-5 mx-auto mb-1" />
                              <span className="text-xs">Upload</span>
                            </div>
                          )}
                          
                          {uploadingIcon && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Recommended: 128×128</p>
                        <div className="relative mt-2 flex space-x-2">
                          <Button 
                            type="button" 
                            className="px-3 py-1.5 h-8 border rounded-md text-xs bg-white hover:bg-gray-50 shadow-sm"
                            onClick={() => document.getElementById('icon-upload-input')?.click()}
                            disabled={uploadingIcon}
                          >
                            {uploadingIcon ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                UPLOADING...
                              </>
                            ) : 'CHANGE'}
                          </Button>
                          
                          {formData.icon_image && (
                            <Button 
                              type="button" 
                              variant="outline"
                              className="px-3 py-1.5 h-8 border rounded-md text-xs bg-white hover:bg-gray-50"
                              onClick={() => setFormData(prev => ({ ...prev, icon_image: null }))}
                            >
                              RESET
                            </Button>
                          )}
                          
                          <Input 
                            id="icon-upload-input" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={e => handleImageUpload(e, 'icon')}
                            disabled={uploadingIcon}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Cover upload */}
                    <div>
                      <div className="flex items-center mb-1">
                        <Label className="block text-sm font-medium">Cover</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 ml-1 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="w-[200px] text-xs">Cover image appears at the top of your space. Widescreen format recommended.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div>
                        <div 
                          className="aspect-video w-full bg-gray-100 rounded-md border flex items-center justify-center relative overflow-hidden mb-1 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
                          onClick={() => document.getElementById('cover-upload-input')?.click()}
                        >
                          {formData.cover_image ? (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                              className="absolute inset-0 w-full h-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${resolveImageUrl(formData.cover_image)})` }}
                            />
                          ) : (
                            <div className="text-gray-400 text-center">
                              <Upload className="h-5 w-5 mx-auto mb-1" />
                              <span className="text-xs">Upload</span>
                            </div>
                          )}
                          
                          {uploadingCover && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Recommended: 1084×576</p>
                        <div className="relative mt-2 flex space-x-2">
                          <Button 
                            type="button" 
                            className="px-3 py-1.5 h-8 border rounded-md text-xs bg-white hover:bg-gray-50 shadow-sm"
                            onClick={() => document.getElementById('cover-upload-input')?.click()}
                            disabled={uploadingCover}
                          >
                            {uploadingCover ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                UPLOADING...
                              </>
                            ) : 'CHANGE'}
                          </Button>
                          
                          {formData.cover_image && (
                            <Button 
                              type="button" 
                              variant="outline"
                              className="px-3 py-1.5 h-8 border rounded-md text-xs bg-white hover:bg-gray-50"
                              onClick={() => setFormData(prev => ({ ...prev, cover_image: null }))}
                            >
                              RESET
                            </Button>
                          )}
                          
                          <Input 
                            id="cover-upload-input" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={e => handleImageUpload(e, 'cover')}
                            disabled={uploadingCover}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Space name */}
                  <div className="mb-6">
                    <Label htmlFor="name" className="block text-sm font-medium mb-1">Space name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      className="w-full max-w-md"
                      maxLength={30}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">This appears in navigation and listings</span>
                      <span className="text-xs text-gray-500">{formData.name?.length || 0}/30</span>
                    </div>
                  </div>

                  {/* URL */}
                  <div className="mb-6">
                    <Label className="block text-sm font-medium mb-1">URL</Label>
                    {editingSubdomain ? (
                      <div className="flex max-w-md">
                        <div className="flex items-center px-3 bg-gray-100 border-y border-l rounded-l-md text-gray-500 text-sm">
                          lokaa.com/
                        </div>
                        <Input
                          value={subdomainValue}
                          onChange={(e) => setSubdomainValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          className="rounded-l-none focus-visible:ring-offset-0"
                          placeholder="your-subdomain"
                          maxLength={30}
                        />
                        <div className="flex ml-2">
                          <Button 
                            type="button" 
                            size="sm"
                            className="h-10 bg-amber-400 hover:bg-amber-500 text-black mr-1"
                            onClick={() => {
                              // TODO: Implement URL change logic
                              setEditingSubdomain(false);
                              toast({
                                title: "URL updated",
                                description: "Your space URL has been updated successfully."
                              });
                            }}
                          >
                            Save
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            className="h-10"
                            onClick={() => setEditingSubdomain(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center max-w-md">
                        <div className="flex-1 flex items-center border rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                          <span className="text-gray-500">lokaa.com/</span>
                          <span className="font-medium">{formData.subdomain || 'your-subdomain'}</span>
                        </div>
                        <Button 
                          type="button" 
                          variant="link" 
                          className="text-amber-600 hover:text-amber-700 px-2 py-0 h-auto"
                          onClick={() => {
                            setSubdomainValue(formData.subdomain || '');
                            setEditingSubdomain(true);
                          }}
                        >
                          CHANGE URL
                        </Button>
                      </div>
                    )}
                    <div className="mt-1">
                      <p className="text-xs text-gray-500">Changing your URL will break existing links to your space</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <Label htmlFor="description" className="block text-sm font-medium mb-1">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description ?? ""}
                      onChange={handleInputChange}
                      placeholder="Add a short description of your space"
                      className="w-full resize-none"
                      rows={4}
                      maxLength={250}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">This appears on your space page and in search results</span>
                      <span className="text-xs text-gray-500">{(formData.description?.length || 0)}/250</span>
                    </div>
                  </div>

                  {/* Privacy */}
                  <div className="mb-6">
                    <Label className="block text-sm font-medium mb-2">Privacy</Label>
                    <RadioGroup 
                      value={formData.is_private ? 'private' : 'public'}
                      onValueChange={handlePrivacyChange}
                      className="flex flex-col space-y-3"
                    >
                      <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                        <RadioGroupItem value="public" id="public" />
                        <Label htmlFor="public" className="flex items-center cursor-pointer">
                          <Globe className="h-4 w-4 mr-2 text-green-600" />
                          <div>
                            <div className="font-medium">Public</div>
                            <div className="text-xs text-gray-500">Anyone can see this space</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                        <RadioGroupItem value="private" id="private" />
                        <Label htmlFor="private" className="flex items-center cursor-pointer">
                          <Lock className="h-4 w-4 mr-2 text-blue-600" />
                          <div>
                            <div className="font-medium">Private</div>
                            <div className="text-xs text-gray-500">Only members can see this space</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Submit button */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      type="submit"
                      className="bg-amber-400 hover:bg-amber-500 text-black font-medium"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          SAVING...
                        </>
                      ) : 'SAVE CHANGES'}
                    </Button>
                  </div>
                </form>
              )}
              
              {/* SUBSCRIPTIONS TAB */}
              {activeTab === "subscriptions" && (
                <div className="h-full flex flex-col">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Subscriptions</h3>
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                      <p className="text-amber-800">Setup subscriptions settings for your space (coming soon)</p>
                      <p className="text-sm text-amber-700 mt-2">You'll be able to set up paid memberships, offer trials, and manage subscribers.</p>
                    </div>

                    {/* Placeholder content to maintain the same height as General tab */}
                    <div className="space-y-6 opacity-50 pointer-events-none">
                      <div className="mb-6">
                        <Label className="block text-sm font-medium mb-1">Pricing</Label>
                        <div className="flex items-center space-x-2">
                          <Switch id="pricing-type" />
                          <Label htmlFor="pricing-type">Enable paid subscriptions</Label>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <Label className="block text-sm font-medium mb-1">Monthly Price ($)</Label>
                        <Input
                          type="number"
                          className="w-full max-w-md"
                          placeholder="9.99"
                          disabled
                        />
                      </div>
                      
                      <div className="mb-6">
                        <Label className="block text-sm font-medium mb-1">Free Trial Period (days)</Label>
                        <Input
                          type="number"
                          className="w-full max-w-md"
                          placeholder="7"
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* INVITE TAB */}
              {activeTab === "invite" && (
                <div className="h-full flex flex-col">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Invite members</h3>
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                      <p className="text-amber-800">Invite by email feature coming soon</p>
                      <p className="text-sm text-amber-700 mt-2">You'll be able to invite members via email and manage pending invitations.</p>
                    </div>

                    {/* Placeholder content to maintain the same height as General tab */}
                    <div className="space-y-6 opacity-50 pointer-events-none">
                      <div className="mb-6">
                        <Label className="block text-sm font-medium mb-1">Invite via Email</Label>
                        <div className="flex max-w-md">
                          <Input
                            type="email"
                            className="rounded-r-none"
                            placeholder="user@example.com"
                            disabled
                          />
                          <Button 
                            type="button"
                            className="rounded-l-none"
                            disabled
                          >
                            Send Invite
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <Label className="block text-sm font-medium mb-1">Invite Link</Label>
                        <div className="flex max-w-md">
                          <Input
                            type="text"
                            className="rounded-r-none bg-gray-50"
                            value="https://lokaa.com/invite/abcdef123456"
                            readOnly
                            disabled
                          />
                          <Button 
                            type="button"
                            className="rounded-l-none"
                            disabled
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <Label className="block text-sm font-medium mb-1">Pending Invites</Label>
                        <div className="border rounded-md p-4 text-center text-gray-500">
                          No pending invites
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 