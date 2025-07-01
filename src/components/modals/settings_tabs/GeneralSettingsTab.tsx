import React, { useState, useEffect, useCallback, useRef } from 'react';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useSettingsValidation } from '@/hooks/useSettingsValidation';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Globe, Lock, Image as ImageIcon, Camera, Upload, AlertCircle } from 'lucide-react';
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
  const { formData, setFormDataField, permissions, space } = useSpaceSettingsStore();
  const [subdomainInput, setSubdomainInput] = useState(formData.subdomain || "");

  const iconInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Use settings validation
  const {
    validateData,
    validateFile,
    handleChange: validateField,
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

    // Validate file first
    const validation = await validateFile(file, type);
    if (!validation.isValid) {
      toast({ 
        title: "File Validation Failed", 
        description: validation.errors.join('. '), 
        variant: "destructive" 
      });
      return;
    }

    const bucketName = type === 'icon' ? 'space-icons' : 'space-covers';
    const filePathSuffix = type === 'icon' ? 'icon_image' : 'cover_image';
    
    try {
      const uploadedPath = await uploadFile(bucketName, filePathSuffix, file, space.id);
      
      // Construct URL with the bucket name
      const fullUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${uploadedPath}`;
      
      if (type === 'icon') {
        setFormDataField('icon_image', fullUrl);
        validateField('icon_image', fullUrl, { ...formData, icon_image: fullUrl });
        toast({ title: "Icon Updated", description: "New icon uploaded successfully." });
      } else {
        setFormDataField('cover_image', fullUrl);
        validateField('cover_image', fullUrl, { ...formData, cover_image: fullUrl });
        toast({ title: "Cover Image Updated", description: "New cover image uploaded successfully." });
      }
    } catch (error: any) {
      console.error("[handleFileUpload] Error during upload process:", error);
      toast({ title: "Upload Failed", description: error.message || "Could not upload file.", variant: "destructive" });
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
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div 
            onClick={canEdit ? triggerIconUpload : undefined} 
            className={`w-[96px] h-[96px] rounded-md border ${
              getFieldErrors('icon_image').length > 0 ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'
            } flex items-center justify-center text-xs font-medium transition-colors ${
              canEdit ? 'cursor-pointer bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700' : 'bg-gray-50 dark:bg-slate-800'
            }`}
          >
            {formData.icon_image ? (
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
              <Button variant="outline" size="sm" onClick={triggerIconUpload} className="text-xs px-3 py-1 dark:border-slate-600 dark:hover:bg-slate-700">
                Change
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div 
            onClick={canEdit ? triggerCoverUpload : undefined} 
            className={`w-[170px] h-[96px] rounded-md border ${
              getFieldErrors('cover_image').length > 0 ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'
            } flex items-center justify-center text-xs font-medium transition-colors ${
              canEdit ? 'cursor-pointer bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700' : 'bg-gray-50 dark:bg-slate-800'
            }`}
          >
            {formData.cover_image ? (
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
              <Button variant="outline" size="sm" onClick={triggerCoverUpload} className="text-xs px-3 py-1 dark:border-slate-600 dark:hover:bg-slate-700">
                Change
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