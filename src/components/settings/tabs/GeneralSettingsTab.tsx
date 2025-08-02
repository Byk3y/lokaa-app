import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lock, Globe, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface SpaceSettingsData {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  primary_color: string | null;
  subdomain: string;
  owner_id: string;
  is_private: boolean;
}

interface GeneralSettingsTabProps {
  space: SpaceSettingsData | null;
  formData: Partial<SpaceSettingsData>;
  setFormData: (data: Partial<SpaceSettingsData>) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function GeneralSettingsTab({ 
  space, 
  formData, 
  setFormData, 
  saving, 
  onSubmit 
}: GeneralSettingsTabProps) {
  const handleUploadImage = () => {
    toast({ title: "Coming Soon", description: "Image upload functionality will be available soon." });
  };

  return (
    <form onSubmit={onSubmit}>
      {/* Icon and Cover upload sections */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Icon upload */}
        <div>
          <Label className="block text-sm mb-1">Icon</Label>
          <div>
            <div className="aspect-square w-24 h-24 bg-gray-100 rounded-md border flex items-center justify-center relative overflow-hidden mb-1">
              {/* Placeholder for icon */}
              <div className="text-gray-400 text-center">
                <span>Upload</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">Recommended: 128x128</p>
            <button 
              type="button" 
              className="mt-2 px-6 py-1.5 border rounded-md text-sm"
              onClick={handleUploadImage}
            >
              CHANGE
            </button>
          </div>
        </div>
        
        {/* Cover upload */}
        <div>
          <Label className="block text-sm mb-1">Cover</Label>
          <div>
            <div className="aspect-video w-full bg-gray-100 rounded-md border flex items-center justify-center relative overflow-hidden mb-1">
              {formData.cover_image ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute inset-0 w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${formData.cover_image || '/default-space-cover.jpg'})` }}
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <span>Upload</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">Recommended: 1084x576</p>
            <button 
              type="button" 
              className="mt-2 px-6 py-1.5 border rounded-md text-sm"
              onClick={handleUploadImage}
            >
              CHANGE
            </button>
          </div>
        </div>
      </div>

      {/* Space Name */}
      <div className="mb-6">
        <Label htmlFor="name" className="block text-sm mb-1">Space name</Label>
        <Input
          id="name"
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full"
          required
        />
      </div>

      {/* Space Description */}
      <div className="mb-6">
        <Label htmlFor="description" className="block text-sm mb-1">Space description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full"
          rows={3}
          placeholder="What's your space about?"
        />
      </div>

      {/* Privacy Settings */}
      <div className="mb-8">
        <Label className="block text-sm mb-2">Privacy</Label>
        <RadioGroup
          value={formData.is_private ? 'private' : 'public'}
          onValueChange={(value) => setFormData({ ...formData, is_private: value === 'private' })}
        >
          <div className="flex items-center space-x-3 p-3 border rounded-md">
            <RadioGroupItem value="public" id="public" />
            <Globe className="h-5 w-5 text-gray-600" />
            <div>
              <Label htmlFor="public" className="font-medium">Public</Label>
              <p className="text-sm text-gray-500">Anyone can find and join this space</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-md">
            <RadioGroupItem value="private" id="private" />
            <Lock className="h-5 w-5 text-gray-600" />
            <div>
              <Label htmlFor="private" className="font-medium">Private</Label>
              <p className="text-sm text-gray-500">Only invited members can join</p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Primary Color */}
      <div className="mb-8">
        <Label htmlFor="primary_color" className="block text-sm mb-1">Primary Color</Label>
        <div className="flex items-center space-x-3">
          <Input
            id="primary_color"
            type="color"
            value={formData.primary_color || '#f59e0b'}
            onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
            className="w-16 h-10 p-1 border rounded"
          />
          <Input
            type="text"
            value={formData.primary_color || '#f59e0b'}
            onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
            className="flex-1"
            placeholder="#f59e0b"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}