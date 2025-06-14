import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SocialLinks, UserProfileData } from '../types/settings';

// Countries list (simplified from original)
const countries = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica","Croatia","Cuba","Cyprus","Czechia (Czech Republic)","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Holy See","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (formerly Burma)","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine State","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

/**
 * User Profile Hook
 * 
 * Handles user profile data loading, editing, and saving
 */
export function useUserProfile(user: any) {
  const [bio, setBio] = useState("Here to learn");
  const [myersBriggs, setMyersBriggs] = useState("Don't show");
  const [country, setCountry] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
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
  const [profileUrl, setProfileUrl] = useState("");
  
  // Loading and editing states
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [hasChangedName, setHasChangedName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Fetch user details from the users table
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user || userDataLoaded) return;
      
      console.log('Fetching user details from users table for user ID:', user.id);
      
      try {
        setUserDataLoaded(true);
        
        const { data: userData, error: userError } = await getSupabaseClient()
          .from('users')
          .select('first_name, last_name, profile_url, bio, country, social_links')
          .eq('id', user.id)
          .single();
          
        if (userError) {
          console.error('Error fetching user details:', userError);
          return;
        }

        if (userData) {
          setFirstName(userData.first_name || '');
          setLastName(userData.last_name || '');
          setProfileUrl(userData.profile_url || '');
          setBio(userData.bio || 'Here to learn');
          setCountry(userData.country || '');
          
          // Handle social_links with proper type checking
          if (userData.social_links && typeof userData.social_links === 'object') {
            setSocialLinks(userData.social_links as SocialLinks);
          } else {
            setSocialLinks({
              website: '',
              instagram: '',
              x: '',
              youtube: '',
              linkedin: '',
              facebook: '',
            });
          }
        }

        // Check if user has already changed their name
        if (user.user_metadata?.has_changed_name) {
          setHasChangedName(true);
        }
      } catch (error) {
        console.error('Error in fetchUserDetails:', error);
      }
    };

    fetchUserDetails();
  }, [user, userDataLoaded]);

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
    
    if (!isEditingName) {
      setIsEditingName(true);
      return;
    }
    
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
      
      const { error: updateError } = await getSupabaseClient()
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
        return;
      }
      
      const { error: metadataError } = await getSupabaseClient().auth.updateUser({
        data: { has_changed_name: true }
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

  // Function to save profile updates
  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSavingProfile(true);
    
    try {
      const { error } = await getSupabaseClient()
        .from('users')
        .update({
          bio: bio,
          country: country,
          social_links: socialLinks as any // Cast to any to handle Json type constraint
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
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return {
    // Data
    bio, setBio,
    myersBriggs, setMyersBriggs,
    country, setCountry,
    socialLinks, setSocialLinks,
    firstName, setFirstName,
    lastName, setLastName,
    hideFromSearch, setHideFromSearch,
    profileUrl, setProfileUrl,
    
    // States
    userDataLoaded,
    isEditingName,
    hasChangedName,
    isSavingName,
    isSavingProfile,
    
    // Actions
    handleNameChange,
    handleSaveProfile,
    
    // Constants
    countries
  };
} 