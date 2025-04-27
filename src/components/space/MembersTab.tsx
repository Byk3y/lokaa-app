import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, UserPlus, Mail, Crown, Shield, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface MembersTabProps {
  space: {
    id: string;
    name: string;
  };
}

// Mock data for members
const mockMembers = [
  { 
    id: '1', 
    name: 'You (Owner)', 
    email: 'you@example.com', 
    role: 'owner', 
    avatar: null,
    joinedDate: '3 months ago',
    isOnline: true
  },
  { 
    id: '2', 
    name: 'Jane Smith', 
    email: 'jane@example.com', 
    role: 'admin', 
    avatar: null,
    joinedDate: '2 months ago',
    isOnline: false
  },
  { 
    id: '3', 
    name: 'John Doe', 
    email: 'john@example.com', 
    role: 'member', 
    avatar: null,
    joinedDate: '1 month ago',
    isOnline: true
  }
];

export default function MembersTab({ space }: MembersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState(mockMembers);
  
  // Filter members based on search query
  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-[#26A69A]" />;
      default:
        return null;
    }
  };
  
  // Get role text
  const getRoleText = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };
  
  return (
    <div className="flex-1 space-y-6">
      {/* Members Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden"
      >
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-[#26A69A] mr-2" />
            <h2 className="text-lg font-medium text-[#37474F]">Members</h2>
            <div className="ml-2 px-2 py-0.5 bg-[#E0F2F1] rounded-full text-xs font-medium text-[#26A69A]">
              {members.length}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#78909C]" />
              <Input
                type="text"
                placeholder="Search members"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 h-9 bg-[#F5FAFA] border-[#E0F2F1] rounded-lg text-sm w-full focus-visible:ring-[#26A69A]"
              />
            </div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                className="bg-[#26A69A] hover:bg-[#FF6F61] text-white rounded-lg flex items-center h-9 px-3 transition-colors"
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Invite
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      {/* Members List */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)]"
      >
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-3 p-4 border-b border-[#E0F2F1] bg-[#F5FAFA] rounded-t-xl">
          <div className="col-span-5 text-sm font-medium text-[#78909C]">Member</div>
          <div className="col-span-3 text-sm font-medium text-[#78909C]">Role</div>
          <div className="col-span-3 text-sm font-medium text-[#78909C]">Joined</div>
          <div className="col-span-1 text-sm font-medium text-[#78909C] text-right">Actions</div>
        </div>
        
        {/* Members Rows */}
        <div className="divide-y divide-[#E0F2F1]">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <motion.div 
                key={member.id}
                whileHover={{ backgroundColor: "#F5FAFA" }}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 items-center"
              >
                {/* Member Info */}
                <div className="col-span-5 flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10 rounded-full border-2 border-[#E0F2F1]">
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback className="bg-[#26A69A] text-white">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {member.isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-[#37474F]">{member.name}</div>
                    <div className="text-sm text-[#78909C]">{member.email}</div>
                  </div>
                </div>
                
                {/* Role */}
                <div className="col-span-3 flex items-center text-sm">
                  <div className="flex items-center px-2.5 py-1 rounded-full bg-[#F5FAFA] border border-[#E0F2F1]">
                    {getRoleIcon(member.role)}
                    <span className="ml-1 text-[#37474F]">{getRoleText(member.role)}</span>
                  </div>
                </div>
                
                {/* Joined Date */}
                <div className="col-span-3 text-sm text-[#78909C]">
                  {member.joinedDate}
                </div>
                
                {/* Actions */}
                <div className="col-span-1 flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: "#E0F2F1" }}
                    whileTap={{ scale: 0.9 }}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-[#78909C] hover:bg-[#E0F2F1]"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </motion.button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="h-12 w-12 bg-[#F5FAFA] rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="h-6 w-6 text-[#78909C]" />
              </div>
              <h3 className="text-[#37474F] font-medium mb-1">No members found</h3>
              <p className="text-[#78909C] text-sm">
                Try adjusting your search or invite new members to your space.
              </p>
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Invite Members CTA */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-gradient-to-br from-[#E0F2F1] to-[#B2DFDB] rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] p-6"
      >
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-16 w-16 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-[#26A69A]" />
          </div>
          
          <div className="flex-grow text-center md:text-left">
            <h3 className="text-lg font-medium text-[#37474F] mb-1">Grow your community</h3>
            <p className="text-[#37474F] max-w-md opacity-80">
              Invite friends, colleagues, or customers to join your space and engage with your content.
            </p>
          </div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="flex-shrink-0"
          >
            <Button 
              className="bg-white text-[#26A69A] hover:text-[#FF6F61] shadow-md font-medium rounded-xl px-6 transition-colors border border-[#E0F2F1]"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Send Invitations
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
} 