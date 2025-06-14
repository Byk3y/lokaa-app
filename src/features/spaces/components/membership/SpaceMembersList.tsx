/**
 * Space Members List Component
 * 
 * Displays a list of members for a space with role management options.
 * Uses the new Zustand-based membership state management.
 */

import { useState, useEffect } from 'react';
import { useMembership } from '../../hooks/useMembership';
import { MemberRole, SpaceMember, FetchMembersOptions } from '../../types/membership';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components';

interface SpaceMembersListProps {
  /** Space ID to fetch members for */
  spaceId: string;
  /** Owner ID of the space (optional, improves performance) */
  ownerId?: string;
  /** Maximum number of members to display */
  limit?: number;
  /** Whether to show role management options */
  showRoleControls?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Component for displaying and managing space members
 */
export function SpaceMembersList({
  spaceId,
  ownerId,
  limit = 10,
  showRoleControls = false,
  className = '',
}: SpaceMembersListProps) {
  const { 
    isOwner, 
    isAdmin,
    loading: membershipLoading,
    getMembers,
    changeRole,
    removeMemberFromSpace
  } = useMembership({ spaceId, ownerId });
  
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch members on initial load
  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      try {
        const options: FetchMembersOptions = {
          limit,
          status: 'active',
        };
        
        const fetchedMembers = await getMembers(options);
        setMembers(fetchedMembers);
        setError(null);
      } catch (err) {
        setError('Failed to load members');
        console.error('Error fetching members:', err);
      } finally {
        setLoading(false);
      }
    }
    
    if (spaceId) {
      fetchMembers();
    }
  }, [spaceId, getMembers, limit]);
  
  // Handle role change
  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    try {
      const success = await changeRole(memberId, newRole);
      if (success) {
        // Update the local list
        setMembers(members.map(member => 
          member.user_id === memberId 
            ? { ...member, role: newRole } 
            : member
        ));
      }
    } catch (err) {
      console.error('Error changing role:', err);
    }
  };
  
  // Handle member removal
  const handleRemoveMember = async (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        const success = await removeMemberFromSpace(memberId);
        if (success) {
          // Remove from the local list
          setMembers(members.filter(member => member.user_id !== memberId));
        }
      } catch (err) {
        console.error('Error removing member:', err);
      }
    }
  };
  
  // Loading state
  if (loading || membershipLoading) {
    return <div className="py-4 text-center text-gray-500">Loading members...</div>;
  }
  
  // Error state
  if (error) {
    return <div className="py-4 text-center text-red-500">{error}</div>;
  }
  
  // Empty state
  if (members.length === 0) {
    return <div className="py-4 text-center text-gray-500">No members found</div>;
  }
  
  // Helper to get initials for avatar fallback
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-medium">Members ({members.length})</h3>
      
      <ul className="divide-y divide-gray-100">
        {members.map((member) => (
          <li key={member.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                {member.avatar_url && (
                  <AvatarImage src={member.avatar_url} alt={member.full_name || 'Member'} />
                )}
                <AvatarFallback>
                  {getInitials(member.full_name)}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <p className="font-medium">{member.full_name || 'Anonymous'}</p>
                <p className="text-sm text-gray-500 capitalize">{member.role}</p>
              </div>
            </div>
            
            {showRoleControls && (isOwner || (isAdmin && member.role !== 'owner')) && (
              <div className="flex items-center space-x-2">
                {/* Role management dropdown */}
                {(isOwner || (isAdmin && member.role === 'member')) && (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.user_id, e.target.value as MemberRole)}
                    className="text-sm rounded border border-gray-300 py-1 px-2"
                    disabled={member.role === 'owner'}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    {isOwner && <option value="owner">Owner</option>}
                  </select>
                )}
                
                {/* Remove button */}
                {(isOwner || (isAdmin && member.role === 'member')) && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
} 