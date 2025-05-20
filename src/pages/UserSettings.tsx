import { useState, useRef, useEffect } from "react";
import React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import ProfileImageUploader from "@/components/profile/ProfileImageUploader";
import { toast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  User, 
  Users, 
  DollarSign, 
  CircleUser, 
  Bell, 
  MessageSquare, 
  CreditCard, 
  Clock, 
  PaintBucket, 
  Eye, 
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Settings as SettingsIcon,
  Plus,
  Compass,
  Copy as CopyIcon,
  Search
} from "lucide-react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import ModernDropdownTrigger from "@/components/ModernDropdownTrigger";
import { createPortal } from 'react-dom';
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ProfileDropdown from "../components/common/ProfileDropdown";
import SpaceSwitcher from "@/components/spaces/SpaceSwitcher";

// Lokaa brand color
const BRAND_COLOR = "#00A389";

// Pin icon component
const PinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 13L15 16M9 9L7 7M15 8L17 6M8 15L6 17M12.5 7.5L16.5 11.5C17.7 12.7 17.7 14.5 16.5 15.7L15.7 16.5C14.5 17.7 12.7 17.7 11.5 16.5L7.5 12.5C6.3 11.3 6.3 9.5 7.5 8.3L8.3 7.5C9.5 6.3 11.3 6.3 12.5 7.5Z" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// SocialLinks interface
interface SocialLinks {
  website?: string;
  instagram?: string;
  x?: string;
  youtube?: string;
  linkedin?: string;
  facebook?: string;
}

// Menu item props interface
interface MenuItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
  brandColor: string;
}

// Menu item component
const MenuItem = ({ id, label, icon, onClick, isActive, brandColor }: MenuItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center py-3 px-5 w-full mb-2 transition-colors rounded-[20px] mx-2`}
      style={{ 
        backgroundColor: isActive ? `${brandColor}15` : 'transparent',
        transition: 'background-color 150ms ease'
      }}
    >
      <div className="mr-3" style={{ color: isActive ? brandColor : '#888888' }}>
        {icon}
      </div>
      <span 
        className="text-[16px] font-bold" 
        style={{ 
          fontFamily: 'Inter, sans-serif', 
          color: isActive ? brandColor : '#444444',
          fontWeight: isActive ? 700 : 600
        }}
      >
        {label}
      </span>
    </button>
  );
};

// Replace the countries array with a full list of all countries
const countries = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica","Croatia","Cuba","Cyprus","Czechia (Czech Republic)","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Holy See","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (formerly Burma)","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine State","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

export default function UserSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { tab } = useParams<{ tab?: string }>();
  
  // Initialize activeTab from URL param if available, otherwise use default
  const [activeTab, setActiveTab] = useState(() => {
    const validTabs = ["spaces", "profile", "affiliates", "payouts", "account", "notifications", 
                      "chat", "payment-methods", "payment-history", "theme"];
    if (tab && validTabs.includes(tab)) {
      return tab;
    }
    
    // Extract tab from pathname if no param is present
    const pathParts = location.pathname.split('/');
    const pathTab = pathParts[pathParts.length - 1];
    if (validTabs.includes(pathTab) && pathTab !== 'settings') {
      return pathTab;
    }
    
    return "spaces"; // default tab
  });
  
  const [spaceSwitcherOpen, setSpaceSwitcherOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef(null);
  const spaceSwitcherRef = useRef(null);
  const dropdownRef = useRef(null);
  const [bio, setBio] = useState("Here to learn");
  const [myersBriggs, setMyersBriggs] = useState("Don't show");
  const [showSocial, setShowSocial] = useState(false);
  const [showMembership, setShowMembership] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [country, setCountry] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    instagram: '',
    x: '',
    youtube: '',
    linkedin: '',
    facebook: '',
  });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hideFromSearch, setHideFromSearch] = useState(false);
  const [activeAffiliateTab, setActiveAffiliateTab] = useState('lokaa');
  const affiliateLink = 'https://www.lokaa.com/signup?ref=your-affiliate-id';
  const [copied, setCopied] = useState(false);
  const [timezone, setTimezone] = useState('(GMT +01:00) Africa/Lagos');
  const timezones = [
    '(GMT +01:00) Africa/Lagos',
    '(GMT +00:00) UTC',
    '(GMT -05:00) America/New_York',
    '(GMT +01:00) Europe/Berlin',
    '(GMT +05:30) Asia/Kolkata',
    // ...add more as needed
  ];
  const [spaceSwitcherHovered, setSpaceSwitcherHovered] = useState(false);
  const spaceSwitcherIconRef = useRef(null);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [hasChangedName, setHasChangedName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [spaceSearchQuery, setSpaceSearchQuery] = useState("");

  // Fetch user details from the users table
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user || userDataLoaded) return;
      
      console.log('Fetching user details from users table for user ID:', user.id);
      
      try {
        setUserDataLoaded(true); // Mark as attempted to load
        
        // First, check if the has_changed_name column exists
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name, profile_url, bio, country, social_links')
          .eq('id', user.id)
          .single();
          
        if (userError) {
          console.error('Error fetching user details:', userError);
          
          // Show error toast to user
          toast({
            title: "Error loading profile",
            description: "We couldn't load your profile information. Please refresh the page.",
            variant: "destructive"
          });
          
          return;
        }
        
        if (userData) {
          console.log('User details fetched successfully:', userData);
          setFirstName(userData.first_name || "");
          setLastName(userData.last_name || "");
          
          // Set the profile URL state
          if (userData.profile_url) {
            setProfileUrl(userData.profile_url);
          } else if (user.user_metadata?.full_name) {
            // If no profile_url but we have a name, create a fallback URL from the name
            const nameFallback = user.user_metadata.full_name.toLowerCase().replace(/\s+/g, '-');
            setProfileUrl(nameFallback);
          } else if (user.email) {
            // Last resort: use email prefix
            const emailPrefix = user.email.split('@')[0];
            setProfileUrl(emailPrefix);
          }
          
          // Set bio and country if available
          if (userData.bio) setBio(userData.bio);
          if (userData.country) setCountry(userData.country);
          
          // Set social links if available
          if (userData.social_links) {
            try {
              // If social_links is stored as a JSON string
              if (typeof userData.social_links === 'string') {
                const parsedLinks = JSON.parse(userData.social_links);
                setSocialLinks({
                  website: parsedLinks.website || '',
                  instagram: parsedLinks.instagram || '',
                  x: parsedLinks.x || '',
                  youtube: parsedLinks.youtube || '',
                  linkedin: parsedLinks.linkedin || '',
                  facebook: parsedLinks.facebook || '',
                });
              } else if (typeof userData.social_links === 'object') {
                // If it's already an object
                const links = userData.social_links as SocialLinks;
                setSocialLinks({
                  website: links.website || '',
                  instagram: links.instagram || '',
                  x: links.x || '',
                  youtube: links.youtube || '',
                  linkedin: links.linkedin || '',
                  facebook: links.facebook || '',
                });
              }
            } catch (e) {
              console.error('Error parsing social links:', e);
            }
          }
          
          // Check user metadata for name change status
          // @ts-expect-error - Linter seems to not pick up the extended user_metadata type here
          if (user.user_metadata && user.user_metadata.has_changed_name === true) {
            setHasChangedName(true);
          }
        } else {
          console.warn('No user data found in the users table for ID:', user.id);
          
          // This is likely a new user, we'll let them set their name
          setFirstName("");
          setLastName("");
          setHasChangedName(false);
          
          // Set a default URL based on email if available
          if (user.email) {
            const emailPrefix = user.email.split('@')[0];
            setProfileUrl(emailPrefix);
          }
        }
      } catch (error) {
        console.error('Error in fetchUserDetails:', error);
        
        // Show error toast to user
        toast({
          title: "Error loading profile",
          description: "An unexpected error occurred. Please try again later.",
          variant: "destructive"
        });
      }
    };
    
    fetchUserDetails();
  }, [user, userDataLoaded]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      // For space switcher, check if click is outside its container
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSpaceSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Get user's initials
  const getUserInitials = () => {
    if (!user) return "A";
    
    if (user.user_metadata?.firstName && user.user_metadata?.lastName) {
      return `${user.user_metadata.firstName.charAt(0)}${user.user_metadata.lastName.charAt(0)}`;
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return "A";
  };

  const spaces = [
    {
      id: "nextpath-ai",
      name: "nextpath ai",
      members: "1 member",
      type: "Free",
      logo: "NA",
      color: "#F59E0B"
    },
    {
      id: "ai-automation",
      name: "AI Automation Society",
      members: "51.2k members",
      type: "Free",
      logo: "AIS",
      color: "#000000"
    },
    {
      id: "skoolers",
      name: "Skoolers",
      members: "51.3k members",
      type: "Free",
      logo: <div className="bg-[#74B9FF] flex items-center justify-center w-full h-full rounded-[12px]">
        <img src="https://placehold.co/40x40/74B9FF/FFF?text=🐱" alt="Skoolers logo" className="w-8 h-8" />
      </div>,
      color: "#74B9FF"
    },
    {
      id: "automation-university",
      name: "Automation University",
      members: "3k members",
      type: "Free",
      logo: <div className="flex items-center justify-center w-full h-full rounded-[12px] overflow-hidden">
        <img src="https://placehold.co/40x40/29086B/FFF?text=AU" alt="Automation University logo" className="w-full h-full object-cover" />
      </div>,
      color: "#29086B"
    },
    {
      id: "ai-automations",
      name: "AI Automations by Kia",
      members: "3.6k members",
      type: "Free",
      logo: <div className="bg-black flex items-center justify-center w-full h-full rounded-[12px] overflow-hidden">
        <img src="https://placehold.co/40x40/000000/74B9FF?text=AI" alt="AI Automations logo" className="w-8 h-8" />
      </div>,
      color: "#000000"
    }
  ];

  // Keep URL in sync with active tab
  useEffect(() => {
    // Only update URL if it doesn't match current tab
    const currentPath = location.pathname;
    const expectedPath = `/settings/${activeTab}`;
    const baseSettingsPath = '/settings';
    
    // If we're on the base settings path and using default tab, don't change URL
    if (currentPath === baseSettingsPath && activeTab === "spaces") {
      return;
    }
    
    // For any other case, sync the URL with the active tab
    if (currentPath !== expectedPath) {
      // Use replace to avoid cluttering browser history
      navigate(expectedPath, { replace: true });
    }
  }, [activeTab, location.pathname, navigate]);

  // Update tab selection handler to update state only
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Function to handle name change
  const handleNameChange = async () => {
    if (hasChangedName) {
      toast({
        title: "Name already changed",
        description: "You can only change your name once.",
        variant: "destructive"
      });
      return;
    }
    
    // If not editing yet, enable editing
    if (!isEditingName) {
      setIsEditingName(true);
      return;
    }
    
    // Validate name fields
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Invalid name",
        description: "First name and last name are required.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSavingName(true);
      
      // Update the user's name in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', user.id);
        
      if (updateError) {
        console.error('Error updating user name:', updateError);
        toast({
          title: "Update failed",
          description: "Failed to update your name. Please try again.",
          variant: "destructive"
        });
        setIsSavingName(false);
        return;
      }
      
      // Also store in user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { 
          has_changed_name: true 
        }
      });
      
      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
      }
      
      setHasChangedName(true);
      setIsEditingName(false);
      
      toast({
        title: "Name updated",
        description: "Your name has been updated successfully.",
      });
    } catch (error) {
      console.error('Error in handleNameChange:', error);
      toast({
        title: "Update failed",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSavingName(false);
    }
  };

  // Function to save profile updates (bio, country, social links)
  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSavingProfile(true);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          bio,
          country,
          social_links: socialLinks
        })
        .eq('id', user.id);
        
      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Update failed",
          description: "Failed to update your profile. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error in handleSaveProfile:', error);
      toast({
        title: "Update failed",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] w-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between py-3">
          <div className="flex items-center">
            {/* Space Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center cursor-pointer" onClick={() => setSpaceSwitcherOpen(!spaceSwitcherOpen)}>
                <h1 className="text-4xl font-bold leading-none" style={{ color: BRAND_COLOR }}>Lokaa</h1>
                <span className="ml-2"><ModernDropdownTrigger open={spaceSwitcherOpen} /></span>
              </div>
              
              {/* Dropdown menu */}
              {spaceSwitcherOpen && (
                <div
                  className="absolute top-14 left-0 bg-white rounded-2xl shadow-2xl w-[300px] z-20 border border-gray-100 max-h-[80vh] overflow-y-auto transition-all duration-200"
                  style={{ minWidth: 240, opacity: spaceSwitcherOpen ? 1 : 0, transform: spaceSwitcherOpen ? 'translateY(0)' : 'translateY(-8px)' }}
                >
                  {/* Search bar */}
                  <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search spaces"
                        value={spaceSearchQuery}
                        onChange={(e) => setSpaceSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="p-4 flex flex-col gap-2 border-b border-gray-100 bg-white">
                    <button 
                      onClick={() => {navigate('/create-space'); setSpaceSwitcherOpen(false);}}
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-[#E6F7F1] text-gray-800 font-medium transition"
                    >
                      <Plus className="h-5 w-5 text-gray-500 mr-3" />
                      Create a space
                    </button>
                    <button
                      onClick={() => {navigate('/discover'); setSpaceSwitcherOpen(false);}}
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-[#E6F7F1] text-gray-800 font-medium transition"
                    >
                      <Compass className="h-5 w-5 text-gray-500 mr-3" />
                      Discover spaces
                    </button>
                  </div>

                  {/* User spaces */}
                  <div className="py-2 bg-white">
                    {user ? (
                      <>
                        {Array.isArray(spaces) && spaces.length > 0 ? (
                          spaces
                            .filter(space => !spaceSearchQuery || space.name.toLowerCase().includes(spaceSearchQuery.toLowerCase()))
                            .map((space) => (
                              <button
                                key={space.id}
                                onClick={() => { navigate(`/space/${space.id}`); setSpaceSwitcherOpen(false); }}
                                className="flex items-center px-4 py-2 w-full hover:bg-gray-50 rounded-lg transition group focus:ring-2 focus:ring-[#00A389]"
                              >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center mr-3 overflow-hidden bg-gray-100 group-hover:ring-2 group-hover:ring-[#00A389]">
                                  {typeof space.logo === 'string' ? (
                                    <span className="text-base font-bold text-gray-600">
                                      {space.logo}
                                    </span>
                                  ) : (
                                    space.logo
                                  )}
                                </div>
                                <span className="text-sm font-medium">{space.name}</span>
                              </button>
                            ))
                        ) : (
                          <div className="px-4 py-3 text-center text-gray-500 text-sm">
                            No spaces available
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="px-4 py-4">
                        <button 
                          onClick={() => navigate('/login')}
                          className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-800 text-sm font-medium mb-2"
                        >
                          Sign in
                        </button>
                        <button
                          onClick={() => navigate('/signup')}
                          className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-800 text-sm font-medium"
                        >
                          Sign up
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <Button variant="ghost" size="sm" className="relative">
              <MessageCircle size={20} className="text-gray-500" />
            </Button>
            
            <Button variant="ghost" size="sm" className="relative">
              <Bell size={20} className="text-gray-500" />
            </Button>
            
            {/* Profile Icon with Dropdown */}
            <div className="relative" ref={profileRef}>
              <ProfileDropdown 
                variant="default" 
                size="md" 
                customMenuItems={[
                  {
                    label: "Create a space",
                    onClick: () => navigate('/create-space'),
                    className: "text-gray-500 hover:text-gray-900"
                  },
                  {
                    label: "Discover spaces",
                    onClick: () => navigate('/discover'),
                    className: "text-gray-500 hover:text-gray-900"
                  }
                ]}
              />
            </div>
          </div>
        </div>
      </header>
      
      {/* Page content */}
      <div className="page-container max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex gap-8 items-start">
          {/* Sidebar */}
          <div className="w-[280px] bg-white rounded-[16px] shadow-[0px_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <nav className="py-4">
              {/* Menu items */}
              <div className="space-y-1">
                <MenuItem 
                  id="spaces" 
                  label="Spaces" 
                  icon={<MessageSquare size={20} />} 
                  onClick={() => handleTabChange("spaces")}
                  isActive={activeTab === "spaces"}
                  brandColor={BRAND_COLOR}
                />
                
                <MenuItem 
                  id="profile" 
                  label="Profile" 
                  icon={<User size={20} />} 
                  onClick={() => handleTabChange("profile")}
                  isActive={activeTab === "profile"}
                  brandColor={BRAND_COLOR}
                />
                
                <MenuItem 
                  id="affiliates" 
                  label="Affiliates" 
                  icon={<Users size={20} />} 
                  onClick={() => handleTabChange("affiliates")}
                  isActive={activeTab === "affiliates"}
                  brandColor={BRAND_COLOR}
                />
                
                <MenuItem 
                  id="payouts" 
                  label="Payouts" 
                  icon={<DollarSign size={20} />} 
                  onClick={() => handleTabChange("payouts")}
                  isActive={activeTab === "payouts"}
                  brandColor={BRAND_COLOR}
                />
                
                <MenuItem 
                  id="account" 
                  label="Account" 
                  icon={<CircleUser size={20} />} 
                  onClick={() => handleTabChange("account")}
                  isActive={activeTab === "account"}
                  brandColor={BRAND_COLOR}
                />
                
                <MenuItem 
                  id="notifications" 
                  label="Notifications" 
                  icon={<Bell size={20} />} 
                  onClick={() => handleTabChange("notifications")}
                  isActive={activeTab === "notifications"}
                  brandColor={BRAND_COLOR}
                />
                
                <MenuItem 
                  id="chat" 
                  label="Chat" 
                  icon={<MessageSquare size={20} />} 
                  onClick={() => handleTabChange("chat")}
                  isActive={activeTab === "chat"}
                  brandColor={BRAND_COLOR}
                />
                
                <MenuItem 
                  id="payment-methods" 
                  label="Payment methods" 
                  icon={<CreditCard size={20} />} 
                  onClick={() => handleTabChange("payment-methods")}
                  isActive={activeTab === "payment-methods"}
                  brandColor={BRAND_COLOR}
                />
                
                <MenuItem 
                  id="payment-history" 
                  label="Payment history" 
                  icon={<Clock size={20} />} 
                  onClick={() => handleTabChange("payment-history")}
                  isActive={activeTab === "payment-history"}
                  brandColor={BRAND_COLOR}
                />
                
                <MenuItem 
                  id="theme" 
                  label="Theme" 
                  icon={<PaintBucket size={20} />} 
                  onClick={() => handleTabChange("theme")}
                  isActive={activeTab === "theme"}
                  brandColor={BRAND_COLOR}
                />
              </div>
            </nav>
          </div>
          
          {/* Main content */}
          <div className="flex-1">
            {activeTab === "spaces" && (
              <div className="spaces-card max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
                <h1 className="text-[24px] font-semibold text-[#111111]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Spaces
                </h1>
                <p className="text-[14px] text-[#777777] mt-2 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Drag and drop to reorder, pin to sidebar, or hide.
                </p>
                
                <div className="bg-white rounded-[16px] px-6 border border-gray-100">
                  <div>
                    {spaces.map((space, index) => (
                      <div key={space.id}>
                        <div className="flex items-center justify-between py-4">
                          <div className="flex items-center">
                            <div 
                              className="w-[48px] h-[48px] rounded-[12px] flex items-center justify-center text-lg font-bold text-white overflow-hidden"
                              style={{ backgroundColor: typeof space.logo === 'string' ? space.color : 'transparent' }}
                            >
                              {typeof space.logo === 'string' ? space.logo : space.logo}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-[18px] text-[#111111]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                {space.name}
                              </div>
                              <div className="text-[14px] text-[#666666] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                                {space.members} • {space.type}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-[32px] px-3 uppercase bg-[#F2F2F2] border-[#E5E5E5] text-[#555555] text-[14px] rounded-md hover:bg-[#E6F7F1] hover:border-[#31C48D] hover:text-[#31C48D]"
                              style={{ fontFamily: 'Inter, sans-serif' }}
                            >
                              Settings
                            </Button>
                            <Button variant="ghost" size="sm" className="text-gray-400 p-2 rounded-full hover:bg-[#E6F7F1] hover:text-[#31C48D]">
                              <Eye size={20} className="text-[#888888]" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-gray-400 p-2 rounded-full hover:bg-[#E6F7F1] hover:text-[#31C48D]">
                              <PinIcon />
                            </Button>
                          </div>
                        </div>
                        {index < spaces.length - 1 && (
                          <div className="h-[1px] bg-gray-200"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "profile" && (
              <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
                <h1 className="text-[24px] font-semibold text-[#111111] mb-6">Profile</h1>
                <div className="flex flex-col items-center mb-6">
                  <ProfileImageUploader
                    currentImageUrl={user?.user_metadata?.avatar_url || null}
                    onImageUploaded={(url) => {
                      // The URL will be updated in user metadata automatically by the component
                      toast({
                        title: "Profile photo updated",
                        description: "Your profile photo has been updated successfully",
                      });
                    }}
                    size="lg"
                    userInitials={getUserInitials()}
                    className="mb-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">Click on image to upload new photo</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">First Name</label>
                    <input 
                      type="text" 
                      value={firstName} 
                      onChange={e => setFirstName(e.target.value)} 
                      placeholder="First Name" 
                      className={`w-full border border-gray-200 rounded-md px-3 py-2 ${isEditingName ? 'bg-white' : 'bg-gray-50'} text-gray-900`} 
                      disabled={!isEditingName}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName} 
                      onChange={e => setLastName(e.target.value)} 
                      placeholder="Last Name" 
                      className={`w-full border border-gray-200 rounded-md px-3 py-2 ${isEditingName ? 'bg-white' : 'bg-gray-50'} text-gray-900`} 
                      disabled={!isEditingName}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-4 flex justify-between items-center">
                  <span>You can only change your name once, and you must use your real name.</span>
                  {isEditingName ? (
                    <Button 
                      onClick={handleNameChange} 
                      className="px-4 py-1 h-7 text-xs bg-green-600 text-white hover:bg-green-700"
                      disabled={isSavingName}
                    >
                      {isSavingName ? "Saving..." : "Save name"}
                    </Button>
                  ) : (
                    <button 
                      onClick={handleNameChange} 
                      className={`text-[#2563eb] hover:underline ${hasChangedName ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={hasChangedName}
                    >
                      Change name
                    </button>
                  )}
                </div>
                {/* URL section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Profile URL</h3>
                  
                  <div className="flex flex-col space-y-1">
                    <Label htmlFor="profile-url">Your Profile URL</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        id="profile-url" 
                        type="text" 
                        readOnly 
                        value={profileUrl ? `lokaa.com/profile/${profileUrl}` : "Not available yet"}
                        className="flex-grow"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (profileUrl) {
                            navigator.clipboard.writeText(`lokaa.com/profile/${profileUrl}`);
                            toast({ title: "URL Copied!", description: "Profile URL copied to clipboard." });
                          }
                        }}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-4">You can change your URL once you've got 90 contributions, 30 followers, and been using it for 90 days.</div>
                <div className="mb-2">
                  <label className="block text-gray-400 text-sm mb-1">Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={150} rows={3} placeholder="Tell us about yourself..." className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-900 resize-none" />
                  <div className="text-xs text-gray-400 text-right mt-1">{bio.length} / 150</div>
                </div>
                <div className="mb-2">
                  <label className="block text-gray-400 text-sm mb-1">Country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-900">
                    <option value="">Select your country</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {/* Expandable Sections */}
                <div className="border-t border-gray-200 pt-2">
                  <button className="flex items-center w-full justify-between py-3 text-[16px] font-semibold text-gray-900" onClick={() => setShowSocial(v => !v)}>
                    Social links {showSocial ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {showSocial && (
                    <div className="pb-3">
                      <input
                        type="text"
                        placeholder="Website"
                        value={socialLinks.website}
                        onChange={e => setSocialLinks({ ...socialLinks, website: e.target.value })}
                        className="w-full mb-4 border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A389]"
                      />
                      <input
                        type="text"
                        placeholder="Instagram"
                        value={socialLinks.instagram}
                        onChange={e => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                        className="w-full mb-4 border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A389]"
                      />
                      <input
                        type="text"
                        placeholder="X"
                        value={socialLinks.x}
                        onChange={e => setSocialLinks({ ...socialLinks, x: e.target.value })}
                        className="w-full mb-4 border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A389]"
                      />
                      <input
                        type="text"
                        placeholder="YouTube"
                        value={socialLinks.youtube}
                        onChange={e => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                        className="w-full mb-4 border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A389]"
                      />
                      <input
                        type="text"
                        placeholder="LinkedIn"
                        value={socialLinks.linkedin}
                        onChange={e => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                        className="w-full mb-4 border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A389]"
                      />
                      <input
                        type="text"
                        placeholder="Facebook"
                        value={socialLinks.facebook}
                        onChange={e => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A389]"
                      />
                    </div>
                  )}
                  <button className="flex items-center w-full justify-between py-3 text-[16px] font-semibold text-gray-900" onClick={() => setShowAdvanced(v => !v)}>
                    Advanced {showAdvanced ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {showAdvanced && (
                    <div className="pb-3 flex items-center justify-between">
                      <span className="text-[16px] text-gray-700">Hide profile from search engines</span>
                      <button
                        type="button"
                        aria-pressed={hideFromSearch}
                        onClick={() => setHideFromSearch(v => !v)}
                        className={`relative inline-flex h-9 w-16 items-center rounded-full transition-colors focus:outline-none ${hideFromSearch ? 'bg-[#00A389]' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`inline-block h-8 w-8 transform rounded-full bg-gray-400 transition-transform ${hideFromSearch ? 'translate-x-7 bg-[#00A389]' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  )}
                  
                  {/* Save Profile Button */}
                  <div className="mt-6 flex justify-end">
                    <Button 
                      onClick={handleSaveProfile}
                      className="px-6 py-2 bg-[#00A389] hover:bg-[#008E78] text-white font-semibold"
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "affiliates" && (
              <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
                <h1 className="text-[24px] font-semibold text-[#111111] mb-1">Affiliates</h1>
                <p className="text-[16px] text-gray-600 mb-6">Earn commission for life when you invite somebody to create or join a Lokaa space.</p>
                {/* Stat cards */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[120px] bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center py-4">
                    <div className="text-[24px] font-bold text-gray-800">$0</div>
                    <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
                  </div>
                  <div className="flex-1 min-w-[120px] bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center py-4">
                    <div className="text-[24px] font-bold text-gray-800">$0</div>
                    <div className="text-xs text-gray-500 mt-1">Lifetime</div>
                  </div>
                  <div className="flex-1 min-w-[120px] bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center py-4">
                    <div className="text-[24px] font-bold text-gray-800">$0</div>
                    <div className="text-xs text-gray-500 mt-1">Account balance</div>
                  </div>
                </div>
                {/* Payout button below cards */}
                <div className="flex justify-end mb-4">
                  <button className="bg-gray-200 text-gray-400 font-bold rounded-lg px-5 py-2 text-[15px] cursor-not-allowed" disabled>PAYOUT</button>
                </div>
                {/* Affiliate links pills */}
                <div className="flex gap-2 mb-4">
                  <button className="px-4 py-1 rounded-full bg-gray-400 text-white font-semibold text-[15px] cursor-default">Lokaa platform</button>
                </div>
                <div className="mb-2 text-[15px] text-gray-700">Earn <span className="font-bold">40% commission</span> when you invite somebody to create a Lokaa space.</div>
                {/* Affiliate link with copy */}
                <div className="flex items-center mb-8">
                  <input
                    type="text"
                    value={affiliateLink}
                    readOnly
                    className="flex-1 bg-[#f7fafc] border border-[#f3e7c4] rounded-l-lg px-4 py-2 font-semibold text-[#2563eb] text-[16px] cursor-pointer outline-none"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    className="bg-[#ffe6a0] hover:bg-[#ffe6a0]/90 text-[#444] font-bold px-6 py-2 rounded-r-lg border border-l-0 border-[#f3e7c4] text-[16px]"
                    onClick={() => {navigator.clipboard.writeText(affiliateLink); setCopied(true); setTimeout(() => setCopied(false), 1200);}}
                  >{copied ? 'COPIED!' : 'COPY'}</button>
                </div>
                {/* Referrals placeholder */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 mt-4">
                  <svg width="64" height="64" fill="none" viewBox="0 0 64 64" className="mb-4"><circle cx="32" cy="32" r="32" fill="#F3F4F6"/><g><circle cx="32" cy="32" r="20" fill="#fff"/><path d="M32 44c6.627 0 12-5.373 12-12S38.627 20 32 20 20 25.373 20 32s5.373 12 12 12z" fill="#FDE68A"/><path d="M32 36a4 4 0 100-8 4 4 0 000 8z" fill="#FBBF24"/></g></svg>
                  <div className="text-gray-500 text-[16px] text-center">Your referrals will show here</div>
                </div>
              </div>
            )}
            
            {activeTab === "payouts" && (
              <div className="max-w-[900px] mx-auto bg-white rounded-[20px] border border-gray-200 py-10 px-8 shadow-sm relative">
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-[24px] font-semibold text-[#181818]">Payouts</h1>
                  <SettingsIcon size={24} className="text-gray-400 mt-1" />
                </div>
                <div className="text-[16px] text-gray-400 mb-8">Payouts for space and affiliate earnings.</div>
                <div className="text-[16px] text-gray-400 mt-8">No payouts yet</div>
              </div>
            )}
            
            {activeTab === "account" && (
              <div className="max-w-[760px] mx-auto bg-white rounded-[20px] border border-gray-200 py-8 px-6 shadow-sm">
                <h1 className="text-[24px] font-semibold text-[#181818] mb-8">Account</h1>
                {/* Email */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                  <div>
                    <div className="text-[18px] font-bold text-[#181818] mb-1">Email</div>
                    <div className="text-[16px] text-gray-700">{user?.email || 'your@email.com'}</div>
                  </div>
                  <button className="mt-4 md:mt-0 bg-gray-100 text-gray-500 font-bold rounded-md px-5 py-2 text-[15px] cursor-pointer border border-gray-200">CHANGE EMAIL</button>
                </div>
                {/* Password */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                  <div>
                    <div className="text-[18px] font-bold text-[#181818] mb-1">Password</div>
                    <div className="text-[16px] text-gray-700">Change your password</div>
                  </div>
                  <button className="mt-4 md:mt-0 bg-gray-100 text-gray-500 font-bold rounded-md px-5 py-2 text-[15px] cursor-pointer border border-gray-200">CHANGE PASSWORD</button>
                </div>
                {/* Timezone */}
                <div className="mb-8">
                  <div className="text-[18px] font-bold text-[#181818] mb-2">Timezone</div>
                  <div className="relative">
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-5 py-4 text-[18px] text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#00A389]"
                    >
                      {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                    <ChevronDown size={24} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                {/* Log out everywhere */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[18px] font-bold text-[#181818] mb-1">Log out of all devices</div>
                    <div className="text-[16px] text-gray-700">Log out of all active sessions on all devices.</div>
                  </div>
                  <button className="mt-4 md:mt-0 bg-gray-100 text-gray-400 font-bold rounded-md px-5 py-2 text-[15px] cursor-not-allowed border border-gray-200" disabled>LOG OUT EVERYWHERE</button>
                </div>
              </div>
            )}
            
            {activeTab === "notifications" && (
              <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
                <h1 className="text-[24px] font-semibold text-[#181818] mb-2">Notifications</h1>
                <div className="text-[15px] text-gray-700 mb-8">Manage how you want to be notified about new messages and activity.</div>
                <div className="space-y-6">
                  {/* Sound notifications */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[17px] font-bold text-[#181818]">Sound notifications</div>
                      <div className="text-[15px] text-gray-600">Play a sound when I receive a message</div>
                    </div>
                    <button className="relative inline-flex h-7 w-12 items-center rounded-full bg-green-400">
                      <span className="inline-block h-6 w-6 transform rounded-full bg-white border border-gray-200 translate-x-5 transition-transform" />
                    </button>
                  </div>
                  {/* Desktop notifications */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[17px] font-bold text-[#181818]">Desktop notifications</div>
                      <div className="text-[15px] text-gray-600">Show desktop notifications for new messages</div>
                    </div>
                    <button className="relative inline-flex h-7 w-12 items-center rounded-full bg-green-400">
                      <span className="inline-block h-6 w-6 transform rounded-full bg-white border border-gray-200 translate-x-5 transition-transform" />
                    </button>
                  </div>
                  {/* Email notifications */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[17px] font-bold text-[#181818]">Email notifications</div>
                      <div className="text-[15px] text-gray-600">Send me an email if I miss a message</div>
                    </div>
                    <button className="relative inline-flex h-7 w-12 items-center rounded-full bg-green-400">
                      <span className="inline-block h-6 w-6 transform rounded-full bg-white border border-gray-200 translate-x-5 transition-transform" />
                    </button>
                  </div>
                  {/* Push notifications */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[17px] font-bold text-[#181818]">Push notifications</div>
                      <div className="text-[15px] text-gray-600">Send push notifications to my device</div>
                    </div>
                    <button className="relative inline-flex h-7 w-12 items-center rounded-full bg-green-400">
                      <span className="inline-block h-6 w-6 transform rounded-full bg-white border border-gray-200 translate-x-5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "chat" && (
              <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
                {/* Notifications */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-[22px] font-bold text-[#181818]">Notifications</h2>
                    <button className="relative inline-flex h-7 w-12 items-center rounded-full bg-green-400">
                      <span className="inline-block h-6 w-6 transform rounded-full bg-white border border-gray-200 translate-x-5 transition-transform" />
                    </button>
                  </div>
                  <div className="text-[15px] text-gray-700 mb-4">Notify me with sound and blinking tab header when somebody messages me.</div>
                  <div className="flex items-center justify-between mb-1 mt-6">
                    <h2 className="text-[18px] font-bold text-[#181818]">Email notifications</h2>
                    <button className="relative inline-flex h-7 w-12 items-center rounded-full bg-green-400">
                      <span className="inline-block h-6 w-6 transform rounded-full bg-white border border-gray-200 translate-x-5 transition-transform" />
                    </button>
                  </div>
                  <div className="text-[15px] text-gray-700">If you're offline and somebody messages you, we'll let you know via email. We won't email you if you're online.</div>
                </div>
                {/* Who can message me? */}
                <div className="mb-8">
                  <h2 className="text-[18px] font-bold text-[#181818] mb-1">Who can message me?</h2>
                  <div className="text-[15px] text-gray-700 mb-4">Only members in the group you're in can message you. You choose what group users can message you from by turning your chat on/off below.</div>
                  <div className="space-y-3">
                    {spaces.map((space) => (
                      <div key={space.id} className="flex items-center justify-between bg-transparent">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-lg font-bold text-white overflow-hidden" style={{ backgroundColor: typeof space.logo === 'string' ? space.color : 'transparent' }}>
                            {typeof space.logo === 'string' ? space.logo : space.logo}
                          </div>
                          <span className="font-bold text-[17px] text-[#181818]">{space.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 font-bold text-[15px] cursor-default">
                            <MessageSquare size={20} className="text-gray-400" />
                            ON
                            <ChevronDown size={18} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Blocked users */}
                <div className="border-t border-gray-200 pt-8 mt-8">
                  <h2 className="text-[20px] font-bold text-[#181818] mb-2">Blocked users</h2>
                  <div className="text-[17px] text-gray-700">You have no blocked users.</div>
                </div>
              </div>
            )}
            
            {activeTab === "payment-history" && (
              <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
                <h1 className="text-[24px] font-semibold text-[#181818] mb-2">Payment history</h1>
                <div className="text-[15px] text-gray-700 mb-8">View all your past payments and transactions.</div>
                {/* Table header */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr>
                        <th className="text-[15px] font-bold text-[#181818] py-2">Date</th>
                        <th className="text-[15px] font-bold text-[#181818] py-2">Description</th>
                        <th className="text-[15px] font-bold text-[#181818] py-2">Amount</th>
                        <th className="text-[15px] font-bold text-[#181818] py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Empty state row */}
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-[17px] text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <svg width="56" height="56" fill="none" viewBox="0 0 56 56" className="mb-3"><circle cx="28" cy="28" r="28" fill="#F3F4F6"/><g><rect x="16" y="24" width="24" height="16" rx="4" fill="#fff"/><rect x="20" y="28" width="16" height="2" rx="1" fill="#E5E7EB"/><rect x="20" y="32" width="10" height="2" rx="1" fill="#E5E7EB"/></g></svg>
                            No payments found
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeTab === "theme" && (
              <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
                <h1 className="text-[24px] font-semibold text-[#181818] mb-2">Theme</h1>
                <div className="text-[15px] text-gray-700 mb-8">Choose your preferred appearance for the app.</div>
                <div className="max-w-xs">
                  <label className="block text-[16px] font-bold text-[#181818] mb-2">Appearance</label>
                  <div className="relative">
                    <select
                      className="w-full border border-gray-200 rounded-lg px-5 py-4 text-[18px] text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#00A389] bg-white"
                      defaultValue="light"
                    >
                      <option value="light">Light (default)</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                    <ChevronDown size={24} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "payment-methods" && (
              <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
                <h1 className="text-[24px] font-semibold text-[#181818] mb-2">Payment methods</h1>
                <div className="text-[15px] text-gray-700 mb-8">Manage your payment methods for subscriptions and purchases.</div>
                
                {/* Empty state for payment methods */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 px-4">
                  <svg width="64" height="64" fill="none" viewBox="0 0 64 64" className="mb-4">
                    <circle cx="32" cy="32" r="32" fill="#F3F4F6"/>
                    <g>
                      <rect x="16" y="24" width="32" height="18" rx="4" fill="#fff"/>
                      <rect x="20" y="28" width="24" height="3" rx="1.5" fill="#E5E7EB"/>
                      <rect x="20" y="34" width="16" height="3" rx="1.5" fill="#E5E7EB"/>
                    </g>
                  </svg>
                  <div className="text-gray-500 text-[16px] text-center">You don't have any payment methods yet</div>
                  <button className="mt-6 px-6 py-3 bg-[#00A389] text-white font-semibold rounded-lg text-[16px] hover:bg-[#00A389]/90 transition-colors">
                    Add payment method
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}