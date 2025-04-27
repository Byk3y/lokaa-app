import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Use navigate for redirects if needed
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Lock, Globe } from 'lucide-react';

// Define the structure including the new privacy field
interface SpaceSettingsData {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  primary_color: string | null;
  subdomain: string; // Needed for URL preview
  owner_id: string;
  is_private: boolean; // Added privacy field
}

type SpaceSettingsModalProps = {
  spaceId: string;
  onClose: () => void; // Make onClose mandatory for modal
};

export default function SpaceSettingsModal({ spaceId, onClose }: SpaceSettingsModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [space, setSpace] = useState<SpaceSettingsData | null>(null);
  const [formData, setFormData] = useState<Partial<Omit<SpaceSettingsData, 'id' | 'subdomain' | 'owner_id'>> & { is_private?: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSpaceSettings = async () => {
      if (!spaceId || !user) {
         setLoading(false);
         toast({ title: "Error", description: "User or Space ID missing.", variant: "destructive" });
         onClose(); // Close modal if essential props are missing
         return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('spaces')
          .select('id, name, description, cover_image, primary_color, subdomain, owner_id, is_private')
          .eq('id', spaceId)
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') { 
            toast({ title: "Not Found", description: "Could not find settings for this space.", variant: "destructive" });
          } else {
             toast({ title: "Error", description: `Failed to load settings: ${error.message}`, variant: "destructive" });
          }
          onClose(); 
          return; 
        }
        
        if (!data || data.owner_id !== user.id) {
           toast({ title: "Unauthorized", description: "You don't have permission.", variant: "destructive" });
           onClose();
           return;
        }
        
        const fetchedSpace = data as SpaceSettingsData;
        setSpace(fetchedSpace);
        setFormData({
          name: fetchedSpace.name,
          description: fetchedSpace.description,
          primary_color: fetchedSpace.primary_color || '#000000',
          cover_image: fetchedSpace.cover_image,
          is_private: fetchedSpace.is_private ?? false
        });

      } catch (error: any) {
        console.error("Error fetching space settings:", error);
        toast({ title: "Error", description: `Failed to load settings: ${error.message || 'Unknown error'}`, variant: "destructive" });
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchSpaceSettings();
  }, [spaceId, user, onClose]); // Removed navigate dependency


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handler for privacy radio group changes
  const handlePrivacyChange = (value: string) => {
    setFormData(prev => ({ ...prev, is_private: value === 'private' }));
  };

  // Placeholder for image upload logic
  const handleImageUpload = (file: File, type: 'cover') => {
    console.log(`Uploading ${type}:`, file.name);
    toast({ title: "Upload Placeholder", description: "Image upload logic not yet implemented." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space) return; 
    setSaving(true);

    try {
      const updateData: Partial<SpaceSettingsData> = {
        name: formData.name,
        description: formData.description,
        primary_color: formData.primary_color,
        is_private: formData.is_private,
        // cover_image: formData.cover_image // Only include if changed via upload
      };

      const { error } = await supabase
        .from('spaces')
        .update(updateData)
        .eq('id', space.id); 

      if (error) throw error;

      toast({ title: "Success", description: "Settings updated successfully." });
      onClose(); // Close modal on successful save

    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast({ title: "Error", description: `Failed to update settings: ${error.message || 'Unknown error'}`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10 h-96"> {/* Fixed height for loader */}
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // No !space check needed here as useEffect handles errors/unauth by calling onClose
  
  // Using Dialog structure implicitly (DialogContent is the parent)
  return (
     <div className="p-0"> {/* Remove padding if DialogContent provides it */} 
       {/* We can add DialogHeader, DialogTitle, DialogDescription here if needed */}
       {/* Or use the Card structure as before */}
       <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Manage your space's basic information and appearance.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 max-h-[65vh] overflow-y-auto p-6"> {/* Adjusted padding/height */}
            {/* Cover Upload Section - Simplified, no Icon */}
             <div className="space-y-2">
               <Label htmlFor="cover-upload">Cover</Label>
                 <div className="aspect-video w-full bg-gray-100 rounded-md border flex items-center justify-center relative overflow-hidden">
                   {formData.cover_image ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute inset-0 w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${formData.cover_image || '/default-space-cover.jpg'})` }}
                      />
                    ) : (
                      <Upload className="h-8 w-8 text-gray-400"/>
                    )}
                    <Button type="button" variant="outline" size="sm" className="absolute bottom-2 right-2 bg-white/80 hover:bg-white" onClick={() => document.getElementById('cover-upload-input-modal')?.click()}>Upload</Button>
                    <Input id="cover-upload-input-modal" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], 'cover')}/>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Recommended: 1084x576px</p>
               </div>

            {/* Space Name */}
            <div className="space-y-2">
              <Label htmlFor="modal-name">Space name</Label>
              <Input
                id="modal-name"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                maxLength={30} 
                required
              />
              <p className="text-xs text-gray-500 text-right">{formData.name?.length || 0}/30</p>
            </div>

            {/* URL Preview */}
            {space && (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={`lokaa.com/${space.subdomain}`} 
                  readOnly
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="modal-description">Group description</Label>
              <Textarea
                id="modal-description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                maxLength={150} 
                rows={3}
              />
               <p className="text-xs text-gray-500 text-right">{formData.description?.length || 0}/150</p>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="modal-primary_color">Color</Label>
               <div className="flex items-center gap-2">
                   <Input
                      id="modal-primary_color"
                      name="primary_color"
                      type="text" 
                      value={formData.primary_color || '#000000'}
                      onChange={handleInputChange}
                      className="w-24"
                    />
                    <div
                       className="h-8 w-8 rounded border"
                       style={{ backgroundColor: formData.primary_color || '#000000' }}
                     ></div>
                </div>
            </div>
            
            {/* --- Privacy Section --- */}
            <div className="space-y-2">
              <Label>Privacy</Label>
              <RadioGroup
                value={formData.is_private === undefined ? 'public' : (formData.is_private ? 'private' : 'public')}
                onValueChange={handlePrivacyChange}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* Private Option */}
                <Label htmlFor="privacy-private" className="flex flex-col p-4 border rounded-md cursor-pointer hover:border-gray-400 has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        <span>Private</span>
                     </div>
                    <RadioGroupItem value="private" id="privacy-private" />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Only members can see who's in the group and what they post. Content is hidden from search engines.
                  </p>
                </Label>

                {/* Public Option */}
                 <Label htmlFor="privacy-public" className="flex flex-col p-4 border rounded-md cursor-pointer hover:border-gray-400 has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Globe className="h-4 w-4" />
                       <span>Public</span>
                     </div>
                     <RadioGroupItem value="public" id="privacy-public" />
                   </div>
                   <p className="text-sm text-gray-500 mt-2">
                     Anyone can see who's in the group and what they post. Content is discoverable by search engines.
                   </p>
                 </Label>
              </RadioGroup>
            </div>
            {/* --- End Privacy Section --- */}

          </CardContent>
          <CardFooter className="pt-6 flex justify-end gap-2"> {/* Adjusted footer */} 
            <Button type="button" variant="outline" onClick={onClose}>
               Cancel
             </Button>
            <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              UPDATE SETTINGS
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 