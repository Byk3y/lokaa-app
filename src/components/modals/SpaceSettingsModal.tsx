import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Dialog, 
  DialogContent as DefaultDialogContent,
  DialogClose,
  DialogOverlay,
  DialogPortal
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Lock, Globe, X, Check, Settings, ChevronDown, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import useSpaceSettingsModal from '@/hooks/useSpaceSettingsModal';
import { AnimatePresence, motion } from 'framer-motion';

interface SpaceSettingsData {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
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

// Define preset colors (Keep for potential future use, or remove if certain)
const presetColors = [
  "#4CAF50", // Green
  "#FF5722", // Deep Orange
  "#2196F3", // Blue
  "#FFC107", // Amber
  "#F44336", // Red
  "#9C27B0", // Purple
  "#009688", // Teal
  "#E91E63", // Pink
  "#607D8B", // Blue Grey
  "#8BC34A", // Light Green
  "#673AB7", // Deep Purple
  "#795548"  // Brown
];

// Create components for each settings section
const GeneralSettings = ({ 
  space, 
  formData, 
  handleInputChange, 
  handlePrivacyChange, 
  handleUploadImage, 
  userEmail
}: {
  space: SpaceSettingsData | null;
  formData: Partial<SpaceSettingsData>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handlePrivacyChange: (value: string) => void;
  handleUploadImage: () => void;
  userEmail: string | undefined;
}) => {
  
  return (
    <div className="space-y-8">
      {/* Icon and Cover section - Adjust Cover size */}
      <div className="flex flex-row space-x-6 items-start">
        {/* Icon Section */}
        <div className="flex flex-col items-start">
          <div className="mb-1">
            <h4 className="text-base font-medium text-gray-800">Icon</h4>
            <p className="text-sm text-gray-500">Recommended: 128×128</p> 
          </div>
          <div className="w-[72px] h-[72px] bg-gray-100 rounded-md flex flex-col items-center justify-center mb-2 relative overflow-hidden">
            <span className="text-xs font-medium text-blue-500">Upload</span>
          </div>
          <button 
            type="button" 
            className="w-[72px] py-2 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50"
            onClick={handleUploadImage}
          >
            CHANGE
          </button>
        </div>
        
        {/* Cover Section - Set fixed width, aspect-video calculates height */}
        <div className="flex flex-col items-start">
          <div className="mb-1">
            <h4 className="text-base font-medium text-gray-800">Cover</h4>
            <p className="text-sm text-gray-500">Recommended: 1084×576</p>
          </div>
          {/* Constrain width to match screenshot (approx 271px) */}
          <div className="w-[271px]"> 
            <div className="aspect-video w-full bg-gray-100 rounded-md flex flex-col items-center justify-center mb-2 relative overflow-hidden">
              <span className="text-xs font-medium text-blue-500">Upload</span>
            </div>
            <button 
              type="button"
              className="py-2 px-6 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              onClick={handleUploadImage}
            >
              CHANGE
            </button>
          </div>
        </div>
      </div>

      {/* Space name - Improved Floating Label */}
      <div>
        <div className="relative">
          <Input
            type="text"
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleInputChange}
            className="peer h-[52px] w-full rounded-md border border-gray-300 px-3 pt-5 pb-1.5 text-base 
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            maxLength={30}
          />
          <label
            htmlFor="name"
            className="absolute left-3 top-2 text-xs text-gray-500 transition-all 
                     peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 
                     peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 
                     pointer-events-none"
          >
            Space name
          </label>
        </div>
        {/* Character count below */}
        <div className="text-right text-xs text-gray-500 mt-1 pr-1">{formData.name?.length || 0}/30</div>
      </div>
      
      {/* Space description - Apply similar floating label pattern */}
      <div>
        <div className="relative">
          <Textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            className="peer min-h-[100px] w-full rounded-md border border-gray-300 px-3 pt-6 pb-2 text-base 
                      focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
            maxLength={150}
            rows={4}
          />
          <label
            htmlFor="description"
            className="absolute left-3 top-2 text-xs text-gray-500 transition-all 
                     peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 
                     peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 
                     pointer-events-none"
          >
            Space description
          </label>
        </div>
        <div className="text-right text-xs text-gray-500 mt-1 pr-1">{formData.description?.length || 0}/150</div>
      </div>

      {/* Custom URL Block */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sparkles className="h-6 w-6 text-amber-600" /> 
          <div>
            <h5 className="text-base font-medium text-gray-800">Stand out with a custom URL</h5>
            <p className="text-sm text-gray-600">lokaa.com/{space?.subdomain || 'your-subdomain'}</p>
          </div>
        </div>
        <Button 
          type="button"
          variant="secondary"
          className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold border-amber-200"
          // onClick={() => { /* Add URL change logic later */ }}
        >
          CHANGE URL
        </Button>
      </div>

      {/* Privacy settings */}
      <div>
        <h4 className="text-base font-medium text-gray-800 mb-2">Privacy</h4>
        <RadioGroup
          value={formData.is_private ? 'private' : 'public'}
          onValueChange={handlePrivacyChange}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className={`border rounded-lg p-4 ${formData.is_private ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="private" id="private" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
              <div className="flex-1">
                <label htmlFor="private" className="flex items-center text-sm font-medium cursor-pointer">
                  <Lock className="h-4 w-4 mr-1.5 text-gray-700" />
                  Private
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Only members can see who's in the space and what they post. Content is hidden from search engines.
                </p>
              </div>
            </div>
          </div>

          <div className={`border rounded-lg p-4 ${!formData.is_private ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="public" id="public" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
              <div className="flex-1">
                <label htmlFor="public" className="flex items-center text-sm font-medium cursor-pointer">
                  <Globe className="h-4 w-4 mr-1.5 text-gray-700" />
                  Public
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Anyone can see who's in the space and what they post. Content is discoverable by search engines.
                </p>
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Support Email Section */}
      <div className="text-sm text-gray-600 mt-4">
        Support email: {userEmail || 'your@email.com'} 
        <button 
          type="button" 
          className="ml-1 text-blue-500 hover:underline cursor-pointer"
          // onClick={() => { /* Add email change logic later */ }}
        >
          (change)
        </button>
      </div>
    </div>
  );
};

// Placeholder component for other settings tabs
const PlaceholderSettings = ({ title }: { title: string }) => (
  <div className="py-8 px-4 text-center">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
      <Settings className="h-8 w-8 text-amber-600" />
    </div>
    <h3 className="text-lg font-medium text-gray-800 mb-2">{title} Settings</h3>
    <p className="text-sm text-gray-500 max-w-md mx-auto">
      This section is under development. The {title.toLowerCase()} settings will be available soon.
    </p>
  </div>
);

export default function SpaceSettingsModal() {
  const { isOpen, spaceId, subdomain, close } = useSpaceSettingsModal();
  const { user } = useAuth();
  const [space, setSpace] = useState<SpaceSettingsData | null>(null);
  const [formData, setFormData] = useState<Partial<SpaceSettingsData>>({});
  const [loading, setLoading] = useState(() => !space || space.id !== spaceId);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  useEffect(() => {
    if (!isOpen) return; // Only run logic when modal is open

    // Check if we need to fetch data (first load or spaceId changed)
    const shouldFetch = !space || space.id !== spaceId;
    
    if (shouldFetch) {
      setLoading(true); // Show loader only when fetching new data
    
    const fetchSpaceSettings = async () => {
      if (!spaceId || !user) {
        setLoading(false);
        toast({ title: "Error", description: "User or Space ID missing.", variant: "destructive" });
          close();
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('spaces')
            .select('*')
          .eq('id', spaceId)
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') { 
            toast({ title: "Not Found", description: "Could not find settings for this space.", variant: "destructive" });
          } else {
            toast({ title: "Error", description: `Failed to load settings: ${error.message}`, variant: "destructive" });
          }
            close();
          return; 
        }
        
        const spaceData = data as any;
        
        if (!spaceData || spaceData.owner_id !== user.id) {
          toast({ title: "Unauthorized", description: "You don't have permission to edit these settings.", variant: "destructive" });
            close();
          return;
        }
        
        setSpace({
          id: spaceData.id,
          name: spaceData.name,
          description: spaceData.description,
          cover_image: spaceData.cover_image,
          subdomain: spaceData.subdomain,
          owner_id: spaceData.owner_id,
          is_private: spaceData.is_private ?? false
        });
        
        setFormData({
          name: spaceData.name,
          description: spaceData.description,
          cover_image: spaceData.cover_image,
          is_private: spaceData.is_private ?? false
        });
      } catch (error: any) {
        console.error("Error fetching space settings:", error);
        toast({ title: "Error", description: `Failed to load settings: ${error.message || 'Unknown error'}`, variant: "destructive" });
          close();
      } finally {
          setLoading(false); // Hide loader after fetch completes or fails
      }
    };
    
    fetchSpaceSettings();
    } else {
      // If data already exists for this spaceId, ensure loading is false
      setLoading(false);
    }
  }, [spaceId, user, isOpen, close, space]); // Add space to dependency array

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
        is_private: formData.is_private,
      };

      const { error } = await supabase
        .from('spaces')
        .update(updateData)
        .eq('id', space.id);

      if (error) throw error;

      toast({ title: "Success", description: "Settings updated successfully." });
      close(); // Close modal after successful save
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
  
  // Render the active settings content based on selected tab
  const renderActiveSettings = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettings 
            space={space}
            formData={formData}
            handleInputChange={handleInputChange}
            handlePrivacyChange={handlePrivacyChange}
            handleUploadImage={handleUploadImage}
            userEmail={user?.email}
          />
        );
      case 'dashboard':
        return <PlaceholderSettings title="Dashboard" />;
      case 'payouts':
        return <PlaceholderSettings title="Payouts" />;
      case 'invite':
        return <PlaceholderSettings title="Invite" />;
      case 'subscriptions':
        return <PlaceholderSettings title="Subscriptions" />;
      case 'categories':
        return <PlaceholderSettings title="Categories" />;
      case 'tabs':
        return <PlaceholderSettings title="Tabs" />;
      case 'plugins':
        return <PlaceholderSettings title="Plugins" />;
      case 'metrics':
        return <PlaceholderSettings title="Metrics" />;
      case 'gamification':
        return <PlaceholderSettings title="Gamification" />;
      case 'discovery':
        return <PlaceholderSettings title="Discovery" />;
      case 'links':
        return <PlaceholderSettings title="Links" />;
      case 'billing':
        return <PlaceholderSettings title="Billing & Referrals" />;
      default:
        return <PlaceholderSettings title="Settings" />;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] border-none p-0 shadow-xl sm:rounded-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        >
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-xl w-full max-h-[95vh] overflow-hidden"
          >
            <div className="relative h-full">
              <DialogClose 
                className="absolute right-4 top-4 z-10 rounded-full p-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center w-8 h-8"
                onClick={close}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
              
              {loading ? (
    <div className="flex items-center justify-center p-10 h-96">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ) : (
                <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] h-[95vh]">
      {/* Left sidebar */}
                  <div className="border-r bg-white overflow-y-auto h-full">
                    <div className="flex items-center p-4 border-b sticky top-0 bg-white z-10">
                      <div className="w-12 h-12 flex-shrink-0 bg-amber-600 rounded-md flex items-center justify-center text-white text-xl font-bold mr-3">
                        <span className="text-xl">{space?.name?.substring(0, 2).toUpperCase() || 'S'}</span>
          </div>
          <div>
                        <h3 className="font-semibold text-base">{space?.name || 'Space Settings'}</h3>
                        <p className="text-sm text-gray-500">Space settings</p>
          </div>
        </div>
                    <nav>
          <ul>
            {settingsNavItems.map(item => (
              <li key={item.id}>
                <button
                              className={`w-full text-left px-6 py-3 text-sm font-medium
                                ${item.id === activeTab 
                                  ? 'bg-amber-100 text-black' 
                                  : 'text-gray-600 hover:bg-gray-50'}`}
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
                  <div className="overflow-y-auto p-8">
        <form onSubmit={handleSubmit}>
                      {renderActiveSettings()}
                      
                      {/* Submit button - always displayed regardless of active tab */}
                      <div className="mt-8 flex justify-end">
            <Button
              type="submit"
                          className="bg-amber-600 hover:bg-amber-700 text-white px-8"
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              UPDATE SETTINGS
            </Button>
          </div>
        </form>
      </div>
    </div>
              )}
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
} 