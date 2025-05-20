import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lock, Globe, ArrowLeft, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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

// Sidebar navigation items
const settingsNavItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'invite', label: 'Invite' },
  { id: 'general', label: 'General', active: true },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'categories', label: 'Categories' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'gamification', label: 'Gamification' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'links', label: 'Links' },
  { id: 'billing', label: 'Billing & referrals' }
];

export default function SpaceSettings() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [space, setSpace] = useState<SpaceSettingsData | null>(null);
  const [formData, setFormData] = useState<Partial<SpaceSettingsData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  useEffect(() => {
    const fetchSpaceSettings = async () => {
      if (!subdomain || !user) {
        setLoading(false);
        toast({ title: "Error", description: "User or Space ID missing.", variant: "destructive" });
        navigate(`/space/${subdomain}`);
        return;
      }
      
      setLoading(true);
      try {
        // Use type assertion to work around TypeScript issues
        const { data, error } = await supabase
          .from('spaces')
          .select('id, name, description, cover_image, primary_color, subdomain, owner_id, is_private') // Select specific columns
          .eq('subdomain', subdomain)
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') { 
            toast({ title: "Not Found", description: "Could not find settings for this space.", variant: "destructive" });
          } else {
            toast({ title: "Error", description: `Failed to load settings: ${error.message}`, variant: "destructive" });
          }
          navigate(`/space/${subdomain}`);
          return; 
        }
        
        // Type assertion to safely handle the data
        const spaceData = data as SpaceSettingsData; // Use defined interface
        
        if (!spaceData || spaceData.owner_id !== user.id) {
          toast({ title: "Unauthorized", description: "You don't have permission to edit these settings.", variant: "destructive" });
          navigate(`/space/${subdomain}`);
          return;
        }
        
        // Use the type assertion to safely set state
        setSpace({
          id: spaceData.id,
          name: spaceData.name,
          description: spaceData.description,
          cover_image: spaceData.cover_image,
          primary_color: spaceData.primary_color,
          subdomain: spaceData.subdomain,
          owner_id: spaceData.owner_id,
          is_private: spaceData.is_private ?? false
        });
        
        setFormData({
          name: spaceData.name,
          description: spaceData.description,
          primary_color: spaceData.primary_color || '#000000',
          cover_image: spaceData.cover_image,
          is_private: spaceData.is_private ?? false
        });
      } catch (error: unknown) { // Typed error
        console.error("Error fetching space settings:", error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast({ title: "Error", description: `Failed to load settings: ${message}`, variant: "destructive" });
        navigate(`/space/${subdomain}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSpaceSettings();
  }, [subdomain, user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePrivacyChange = (value: string) => {
    setFormData(prev => ({ ...prev, is_private: value === 'private' }));
  };

  const handleUploadImage = () => {
    // Placeholder for future image upload functionality
    toast({ title: "Upload", description: "Upload functionality coming soon!" });
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
      };

      const { error } = await supabase
        .from('spaces')
        .update(updateData)
        .eq('id', space.id);

      if (error) throw error;

      toast({ title: "Success", description: "Settings updated successfully." });
      // Stay on the page after successful save
    } catch (error: unknown) { // Typed error
      console.error("Error updating settings:", error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error",
        description: `Failed to update settings: ${message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-10 h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
    return (
    <div className="min-h-screen bg-white">
      {/* Header with back button and close */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-amber-600 rounded-md flex items-center justify-center text-white text-xl font-bold mr-4">
            {space?.name.charAt(0).toUpperCase() || 'C'}C
          </div>
          <div>
            <h1 className="font-medium">{space?.name || 'Space Settings'}</h1>
            <p className="text-gray-500 text-sm">Group settings</p>
          </div>
        </div>
        <button 
          onClick={() => navigate(`/space/${subdomain}`)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex">
        {/* Left sidebar */}
        <div className="w-64 border-r min-h-[calc(100vh-60px)]">
          <nav className="py-4">
            <ul>
              {settingsNavItems.map(item => (
                <li key={item.id}>
                  <button
                    className={`w-full text-left px-6 py-3 ${item.id === activeTab ? 'bg-amber-100 text-amber-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main content area */}
        <div className="flex-1 p-8">
          <form onSubmit={handleSubmit}>
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

            {/* Group name */}
            <div className="mb-6">
              <Label htmlFor="name" className="block text-sm mb-1">Group name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                className="w-full max-w-md"
                maxLength={30}
              />
              <div className="text-right text-xs text-gray-500 mt-1">{formData.name?.length || 0}/30</div>
            </div>

            {/* URL */}
            <div className="mb-6">
              <Label htmlFor="url" className="block text-sm mb-1">URL</Label>
              <Input
                id="url"
                value={`lokaa.com/${space?.subdomain || ''}`}
                readOnly
                className="w-full max-w-md bg-gray-50"
              />
              <div className="text-xs text-gray-500 mt-1">You can change your URL with a paid account. <span className="text-blue-500">Upgrade now?</span></div>
            </div>

            {/* Group description */}
            <div className="mb-6">
              <Label htmlFor="description" className="block text-sm mb-1">Group description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                className="w-full max-w-md"
                maxLength={150}
                rows={4}
              />
              <div className="text-right text-xs text-gray-500 mt-1">{formData.description?.length || 0}/150</div>
            </div>

            {/* Color and Initials */}
            <div className="mb-6 grid grid-cols-2 gap-8 max-w-md">
              <div>
                <Label htmlFor="initials" className="block text-sm mb-1">Initials</Label>
                <Input
                  id="initials"
                  value={space?.name?.substring(0, 2).toUpperCase() || 'CC'}
                  readOnly
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="color" className="block text-sm mb-1">Color</Label>
                <div className="flex items-center">
                  <Input
                    id="color"
                    name="primary_color"
                    type="text"
                    value={formData.primary_color || '#000000'}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                  <div
                    className="h-9 w-9 ml-2 border rounded"
                    style={{ backgroundColor: formData.primary_color || '#000000' }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Privacy settings */}
            <div className="mb-10">
              <Label className="block text-sm mb-3">Privacy</Label>
              <RadioGroup
                value={formData.is_private ? 'private' : 'public'}
                onValueChange={handlePrivacyChange}
                className="grid grid-cols-2 gap-4 max-w-2xl"
              >
                <div className={`border rounded-md p-4 ${formData.is_private ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      <span>Private</span>
                    </div>
                    <RadioGroupItem value="private" id="private" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Only members can see who's in the group and what they post. Content is hidden from search engines.
                  </p>
                </div>

                <div className={`border rounded-md p-4 ${!formData.is_private ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      <span>Public</span>
                    </div>
                    <RadioGroupItem value="public" id="public" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Anyone can see who's in the group and what they post. Content is discoverable by search engines.
                  </p>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              UPDATE SETTINGS
            </Button>
          </form>
        </div>
      </div>
    </div>
    // Minor comment to try and refresh parser state
  );
}