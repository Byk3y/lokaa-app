import ProfileDropdown from "@/components/common/ProfileDropdown";

interface UserMenuProps {
  avatarSize?: "sm" | "md" | "lg";
  showEmail?: boolean;
}

// This component is kept for backward compatibility
// It now uses the centralized ProfileDropdown component
export default function UserMenu({ 
  avatarSize = "md", 
  showEmail = true 
}: UserMenuProps) {
  // Map the avatarSize to ProfileDropdown's size prop
  const size = avatarSize;
  
  // Use the minimal variant of ProfileDropdown
  return (
    <ProfileDropdown 
      variant="minimal"
      size={size}
      showEmail={showEmail}
    />
  );
} 