import React, { useState, useEffect, useCallback, useRef } from 'react';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useSettingsValidation } from '@/hooks/useSettingsValidation';
import { useMembershipStore } from '@/features/spaces/store/membership-store';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Globe, Lock, Image as ImageIcon, Camera, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { Alert } from '@/components/ui/alert';

async function uploadFile(bucketName: string, filePath: string, file: File, spaceId?: string): Promise<string> {
  if (!file) throw new Error("File not selected");
  if (!spaceId) throw new Error("Space ID is required for uploading.");

  // Sanitize filename
  const fileExtension = file.name.split('.').pop() || 'bin';
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedFileName = `${sanitizedBaseName}.${fileExtension}`;

  // Simplified path structure that works with the RLS policy
  const fullFilePath = `${spaceId}_${Date.now()}_${sanitizedFileName}`;

  const { data, error } = await getSupabaseClient().storage
    .from(bucketName)
    .upload(fullFilePath, file, { 
        cacheControl: '3600', 
        upsert: true
    });

  if (error) {
    console.error("[uploadFile] Supabase upload error:", error);
    throw error;
  }
  if (!data?.path) {
    throw new Error("Upload successful, but no path returned.");
  }
  return data.path;
}

// Add type for form data
type FormDataField = 
  | 'name'
  | 'description'
  | 'subdomain'
  | 'is_private'
  | 'support_email'
  | 'icon_image'
  | 'cover_image';

export default function GeneralSettingsTab() {
  const { space, formData, setFormDataField, permissions } = useSpaceSettingsStore();
  const { triggerSpacesRefresh } = useMembershipStore();
  const [subdomainInput, setSubdomainInput] = useState(formData.subdomain || "");
  
  // File input refs
  const iconInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // Loading states for uploads
  const [iconUploading, setIconUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  // Use settings validation
  const {
    validateData,
    validateField,
    validateFile,
    errors,
    isValid,
    isValidating
  } = useSettingsValidation('general', { validateOnChange: true });

  useEffect(() => {
    // Validate initial data
    validateData(formData);
    setSubdomainInput(formData.subdomain || "");
  }, [formData, validateData]);

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSubdomain = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomainInput(newSubdomain);
    validateField('subdomain', newSubdomain, { ...formData, subdomain: newSubdomain });
  };

  const handleSubdomainBlur = () => {
    if (subdomainInput !== formData.subdomain) {
      setFormDataField('subdomain', subdomainInput);
    }
  };

  const handleInputChange = (field: FormDataField, value: string | boolean) => {
    setFormDataField(field, value);
    validateField(field, value, { ...formData, [field]: value });
  };
  
  const handleFileUpload = async (file: File | null, type: 'icon' | 'cover') => {
    if (!file || !space?.id) {
      toast({ title: "Upload Error", description: "No file selected or space ID missing.", variant: "destructive" });
      return;
    }

    // Set loading state
    if (type === 'icon') {
      setIconUploading(true);
    } else {
      setCoverUploading(true);
    }

    try {
      // Validate file first
      const isValidFile = await validateFile(file, type);
      if (!isValidFile) {
        toast({ 
          title: "File Validation Failed", 
          description: "Invalid file. Please check file size and format.", 
          variant: "destructive" 
        });
        return;
      }

      const bucketName = type === 'icon' ? 'space-icons' : 'space-covers';
      const filePathSuffix = type === 'icon' ? 'icon_image' : 'cover_image';
      
      const uploadedPath = await uploadFile(bucketName, filePathSuffix, file, space.id);
      
      // Construct URL with the bucket name
      const fullUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${uploadedPath}`;
      
      // CRITICAL FIX: Update all cache layers immediately to prevent disappearing on mobile background/foreground
      const updateAllCaches = async (field: 'icon_image' | 'cover_image', url: string) => {
        if (!space?.subdomain) return;
        
        try {
          // 1. Update lastActiveSpace cache (used by mobile recovery system)
          const lastActiveSpace = localStorage.getItem('lastActiveSpace');
          if (lastActiveSpace) {
            const parsed = JSON.parse(lastActiveSpace);
            parsed[field] = url;
            parsed.timestamp = Date.now(); // Mark as fresh data
            localStorage.setItem('lastActiveSpace', JSON.stringify(parsed));
            console.log(`🔄 [${type}Upload] Updated lastActiveSpace cache with new ${field}`);
          }
          
          // 2. Update space settings store cache (primary cache used by components)
          try {
            const { enhancedSpaceCache } = await import('@/hooks/useSpaceSettingsStore');
            const cacheKey = space.subdomain;
            const cached = enhancedSpaceCache?.get(cacheKey);
            if (cached && cached.data) {
              cached.data[field] = url;
              cached.timestamp = Date.now(); // Mark as fresh
              enhancedSpaceCache.set(cacheKey, cached);
              console.log(`🔄 [${type}Upload] Updated enhancedSpaceCache with new ${field}`);
            }
          } catch (importError) {
            console.warn(`⚠️ [${type}Upload] Could not update space settings cache:`, importError);
          }
          
          // 3. Update fallback cache (used during mobile recovery)
          const fallbackKey = `space_fallback_${space.subdomain}`;
          const fallbackCache = localStorage.getItem(fallbackKey);
          if (fallbackCache) {
            const parsed = JSON.parse(fallbackCache);
            if (parsed.data) {
              parsed.data[field] = url;
              parsed.timestamp = Date.now();
              localStorage.setItem(fallbackKey, JSON.stringify(parsed));
              console.log(`🔄 [${type}Upload] Updated fallback cache with new ${field}`);
            }
          }
          
          // 4. Update sessionStorage space_data cache (used by mobile recovery)
          const sessionKey = `space_data_${space.subdomain}`;
          const sessionCache = sessionStorage.getItem(sessionKey);
          if (sessionCache) {
            const parsed = JSON.parse(sessionCache);
            if (parsed.space) {
              parsed.space[field] = url;
              parsed.timestamp = Date.now();
              sessionStorage.setItem(sessionKey, JSON.stringify(parsed));
              console.log(`🔄 [${type}Upload] Updated sessionStorage cache with new ${field}`);
            }
          }
          
        } catch (error) {
          console.warn(`⚠️ [${type}Upload] Failed to update cache:`, error);
        }
      };
      
      if (type === 'icon') {
        setFormDataField('icon_image', fullUrl);
        validateField('icon_image', fullUrl, { ...formData, icon_image: fullUrl });
        await updateAllCaches('icon_image', fullUrl);
        
        // CRITICAL: Update database with new icon URL
        try {
          const { error: dbError } = await getSupabaseClient()
            .from('spaces')
            .update({ icon_image: fullUrl })
            .eq('id', space.id);
            
          if (dbError) {
            console.error('Failed to update database with icon URL:', dbError);
            throw dbError;
          }
          console.log(`✅ [iconUpload] Database updated successfully with new icon_image`);
          
          // CRITICAL: Trigger spaces refresh to update SpaceSwitcher icon
          try {
            await triggerSpacesRefresh();
            console.log(`🔄 [iconUpload] Triggered spaces refresh for SpaceSwitcher update`);
          } catch (refreshError) {
            console.warn('Failed to trigger spaces refresh:', refreshError);
            // Non-fatal error, don't block the upload success
          }
        } catch (dbError: any) {
          console.error('Database update failed:', dbError);
          toast({ title: "Database Update Failed", description: "Icon uploaded but not saved to database. Please try again.", variant: "destructive" });
          return;
        }
        
        toast({ title: "Icon Updated", description: "New icon uploaded successfully." });
      } else {
        setFormDataField('cover_image', fullUrl);
        validateField('cover_image', fullUrl, { ...formData, cover_image: fullUrl });
        await updateAllCaches('cover_image', fullUrl);
        
        // CRITICAL: Update database with new cover URL  
        try {
          const { error: dbError } = await getSupabaseClient()
            .from('spaces')
            .update({ cover_image: fullUrl })
            .eq('id', space.id);
            
          if (dbError) {
            console.error('Failed to update database with cover URL:', dbError);
            throw dbError;
          }
          console.log(`✅ [coverUpload] Database updated successfully with new cover_image`);
          
          // CRITICAL: Trigger spaces refresh to update SpaceSwitcher (in case it shows cover)
          try {
            await triggerSpacesRefresh();
            console.log(`🔄 [coverUpload] Triggered spaces refresh for SpaceSwitcher update`);
          } catch (refreshError) {
            console.warn('Failed to trigger spaces refresh:', refreshError);
            // Non-fatal error, don't block the upload success
          }
        } catch (dbError: any) {
          console.error('Database update failed:', dbError);
          toast({ title: "Database Update Failed", description: "Cover uploaded but not saved to database. Please try again.", variant: "destructive" });
          return;
        }
        
        toast({ title: "Cover Image Updated", description: "New cover image uploaded successfully." });
      }
    } catch (error: any) {
      console.error("[handleFileUpload] Error during upload process:", error);
      toast({ title: "Upload Failed", description: error.message || "Could not upload file.", variant: "destructive" });
    } finally {
      // Clear loading state
      if (type === 'icon') {
        setIconUploading(false);
      } else {
        setCoverUploading(false);
      }
    }
  };

  const triggerIconUpload = () => {
    iconInputRef.current?.click();
  }
  
  const triggerCoverUpload = () => {
    coverInputRef.current?.click();
  }

  const canEdit = permissions?.canEditSpace ?? false;

  // Helper to get field errors
  const getFieldErrors = (field: string) => errors[field] || [];

  return (
    <div className="space-y-8 p-6">
      {/* Show mobile network errors if any */}
      {errors._mobile && (
        <Alert variant="destructive">
          {errors._mobile.map((error, i) => (
            <p key={i} className="text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </p>
          ))}
        </Alert>
      )}

      {/* Icon & Cover Images */}
      <div className="flex flex-row items-start gap-8 mb-6 flex-wrap">
        {/* Icon Uploader */}
        <div className="flex items-center space-x-4">
          <div
            onClick={canEdit && !iconUploading ? triggerIconUpload : undefined}
            className={`w-14 h-14 rounded-md border ${
              getFieldErrors('icon_image').length > 0 ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'
            } flex items-center justify-center text-xs font-medium transition-colors ${
              canEdit && !iconUploading ? 'cursor-pointer bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700' : 'bg-gray-50 dark:bg-slate-800'
            } ${iconUploading ? 'opacity-70' : ''}`}
          >
            {iconUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            ) : formData.icon_image ? (
              <img src={formData.icon_image} alt="Icon" className="w-full h-full object-cover rounded-md" />
            ) : (
              <span className="text-gray-500 dark:text-slate-400">Upload</span>
            )}
          </div>
          <Input
            id="icon-upload"
            type="file"
            ref={iconInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              handleFileUpload(e.target.files ? e.target.files[0] : null, 'icon');
              if (e.target) e.target.value = '';
            }}
            disabled={!canEdit}
          />
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Icon</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Recommended: 96x96</p>
            {canEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={triggerIconUpload} 
                disabled={iconUploading}
                className="text-xs px-3 py-1 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                {iconUploading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Uploading...
                  </>
                ) : (
                  'Change'
                )}
              </Button>
            )}
          </div>
        </div>
        {/* Cover Uploader */}
        <div className="flex items-center space-x-4">
          <div
            onClick={canEdit && !coverUploading ? triggerCoverUpload : undefined}
            className={`w-[170px] h-[96px] rounded-md border ${
              getFieldErrors('cover_image').length > 0 ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'
            } flex items-center justify-center text-xs font-medium transition-colors ${
              canEdit && !coverUploading ? 'cursor-pointer bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700' : 'bg-gray-50 dark:bg-slate-800'
            } ${coverUploading ? 'opacity-70' : ''}`}
          >
            {coverUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            ) : formData.cover_image ? (
              <img src={formData.cover_image} alt="Cover" className="w-full h-full object-cover rounded-md" />
            ) : (
              <span className="text-gray-500 dark:text-slate-400">Upload</span>
            )}
          </div>
          <Input
            id="cover-upload"
            type="file"
            ref={coverInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              handleFileUpload(e.target.files ? e.target.files[0] : null, 'cover');
              if (e.target) e.target.value = '';
            }}
            disabled={!canEdit}
          />
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Cover</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Recommended: 1084x576</p>
            {canEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={triggerCoverUpload} 
                disabled={coverUploading}
                className="text-xs px-3 py-1 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                {coverUploading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Uploading...
                  </>
                ) : (
                  'Change'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Group Name (Space Name) */}
      <div>
        <div className="flex justify-between items-center">
          <Label htmlFor="spaceName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Group name</Label>
          <span className="text-xs text-gray-400 dark:text-slate-500">{formData.name?.length || 0}/30</span>
        </div>
        <Input 
          id="spaceName" 
          value={formData.name || ""} 
          onChange={(e) => handleInputChange('name', e.target.value.slice(0, 30))}
          className={`mt-1 w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-50 ${
            getFieldErrors('name').length > 0 ? 'border-red-500' : ''
          }`}
          maxLength={30}
          disabled={!canEdit}
        />
        {getFieldErrors('name').map((error, i) => (
          <p key={i} className="mt-1 text-sm text-red-500">{error}</p>
        ))}
      </div>

      {/* Group Description (Space Description) */}
      <div>
        <div className="flex justify-between items-center">
          <Label htmlFor="spaceDescription" className="text-sm font-medium text-gray-700 dark:text-gray-300">Group description</Label>
          <span className="text-xs text-gray-400 dark:text-slate-500">{formData.description?.length || 0}/150</span>
        </div>
        <Textarea 
          id="spaceDescription" 
          value={formData.description || ""} 
          onChange={(e) => handleInputChange('description', e.target.value.slice(0, 150))}
          rows={3}
          className={`mt-1 w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-50 resize-none ${
            getFieldErrors('description').length > 0 ? 'border-red-500' : ''
          }`}
          maxLength={150}
          disabled={!canEdit}
        />
        {getFieldErrors('description').map((error, i) => (
          <p key={i} className="mt-1 text-sm text-red-500">{error}</p>
        ))}
      </div>

      {/* Custom URL (Subdomain) */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom URL</Label>
        <div className="mt-1 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Stand out with a custom URL</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              {formData.subdomain ? `${formData.subdomain}.lokaa.so` : "Set your unique space URL"}
            </p>
          </div>
          <Button variant="outline" className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500 text-xs px-3 py-1.5" disabled={!canEdit} onClick={() => toast({title: "Subdomain Change", description: "Changing subdomain might have other implications. This feature is under review."})}>
            CHANGE URL
          </Button>
        </div>
        <Input 
          id="subdomain" 
          type="hidden"
          value={subdomainInput} 
          onChange={handleSubdomainChange}
          onBlur={handleSubdomainBlur}
          className={`mt-1 w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-50 ${
            getFieldErrors('subdomain').length > 0 ? 'border-red-500' : ''
          }`}
          placeholder="your-space-name"
          disabled={!canEdit}
        />
        {getFieldErrors('subdomain').map((error, i) => (
          <p key={i} className="mt-1 text-sm text-red-500">{error}</p>
        ))}
      </div>
      
      {/* Privacy */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Privacy</Label>
        <RadioGroup 
          value={formData.is_private ? "private" : "public"}
          onValueChange={(value) => handleInputChange('is_private', value === "private")}
          className="mt-2 space-y-3"
          disabled={!canEdit}
        >
          <Label htmlFor="private" className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${formData.is_private ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}>
            <div className="flex items-center mb-1">
              <RadioGroupItem value="private" id="private" className="mr-2" disabled={!canEdit} />
              <Lock className={`h-4 w-4 mr-1.5 ${formData.is_private ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}`} />
              <span className={`font-semibold ${formData.is_private ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>Private</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 ml-6">Only members can see who's in the group and what they post. Content is not discoverable by search engines.</p>
          </Label>

          <Label htmlFor="public" className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${!formData.is_private ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}>
            <div className="flex items-center mb-1">
              <RadioGroupItem value="public" id="public" className="mr-2" disabled={!canEdit} />
              <Globe className={`h-4 w-4 mr-1.5 ${!formData.is_private ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}`} />
              <span className={`font-semibold ${!formData.is_private ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>Public</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 ml-6">Anyone can see who's in the group and what they post. Content is discoverable by search engines.</p>
          </Label>
        </RadioGroup>
      </div>

      {/* Support Email */}
      <div>
        <Label htmlFor="supportEmail" className="text-sm font-medium text-gray-700 dark:text-gray-300">Support email</Label>
        <div className="mt-1 flex items-center">
          <Input 
            id="supportEmail" 
            type="email"
            value={formData.support_email || ""} 
            onChange={(e) => handleInputChange('support_email', e.target.value)}
            className={`w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-50 ${
              getFieldErrors('support_email').length > 0 ? 'border-red-500' : ''
            }`}
            placeholder="your-support@example.com"
            disabled={!canEdit}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This email will be displayed publicly for members seeking support. 
          If empty, the space owner's email might be used as a fallback (feature pending).
        </p>
        {getFieldErrors('support_email').map((error, i) => (
          <p key={i} className="mt-1 text-sm text-red-500">{error}</p>
        ))}
      </div>
    </div>
  );
} 