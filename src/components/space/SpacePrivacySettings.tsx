import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lock, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Database } from "@/types/supabase";

interface SpacePrivacySettingsProps {
  spaceId: string;
}

export default function SpacePrivacySettings({ spaceId }: SpacePrivacySettingsProps) {
  const { user } = useAuth();
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPrivacySetting = async () => {
      if (!spaceId || !user) {
        setLoading(false);
        return;
      }
      
      try {
        // Use the * wildcard to select all fields to avoid TypeScript issues
        const { data, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', spaceId)
          .single();
        
        if (error) throw error;

        // Attempt to read is_private, defaulting to false if it doesn't exist
        const spaceData = data as Database['public']['Tables']['spaces']['Row'] | null;
        setIsPrivate(spaceData?.is_private === true);
      } catch (error: unknown) {
        console.error("Error fetching privacy setting:", error instanceof Error ? error.message : String(error));
        // Still allow component to render with default value
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrivacySetting();
  }, [spaceId, user]);

  const handlePrivacyChange = (value: string) => {
    setIsPrivate(value === 'private');
  };

  const handleSave = async () => {
    if (!spaceId || !user) return;
    
    setSaving(true);
    try {
      // Use type assertion to bypass TypeScript errors
      const updateData: Partial<Database['public']['Tables']['spaces']['Row']> = { is_private: isPrivate };
      
      const { error } = await supabase
        .from('spaces')
        .update(updateData)
        .eq('id', spaceId);
        
      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: "Privacy settings updated successfully." 
      });
    } catch (error: unknown) {
      console.error("Error updating privacy setting:", error);
      toast({ 
        title: "Error", 
        description: `Failed to update privacy settings: ${(error instanceof Error ? error.message : String(error)) || 'Unknown error'}`, 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Privacy</Label>
        <RadioGroup
          value={isPrivate ? 'private' : 'public'}
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
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          SAVE PRIVACY SETTINGS
        </Button>
      </div>
    </div>
  );
} 