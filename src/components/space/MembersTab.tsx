import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, UserPlus, Mail, Crown, Shield, MoreHorizontal, Filter, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface MembersTabProps {
  space: {
    id: string;
    name: string;
  };
}

// Member status options
type MemberStatus = "active" | "cancelling" | "churned" | "banned";

// Mock data for members
const mockMembers = [
  { 
    id: '1', 
    name: 'You (Owner)', 
    email: 'you@example.com', 
    role: 'owner', 
    avatar: null,
    joinedDate: '3 months ago',
    isOnline: true,
    status: 'active' as MemberStatus,
    username: 'you-owner'
  },
  { 
    id: '2', 
    name: 'Jane Smith', 
    email: 'jane@example.com', 
    role: 'admin', 
    avatar: null,
    joinedDate: '2 months ago',
    isOnline: false,
    status: 'active' as MemberStatus,
    username: 'jane-smith'
  },
  { 
    id: '3', 
    name: 'John Doe', 
    email: 'john@example.com', 
    role: 'member', 
    avatar: null,
    joinedDate: '1 month ago',
    isOnline: true,
    status: 'active' as MemberStatus,
    username: 'john-doe'
  }
];

export default function MembersTab({ space }: MembersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [members] = useState(mockMembers);
  const [activeStatus, setActiveStatus] = useState<MemberStatus>("active");
  
  // Filter members based on search query and status
  const filteredMembers = members.filter(member => 
    (member.status === activeStatus) &&
    (member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()))
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

  // Get member counts by status
  const getStatusCount = (status: MemberStatus) => {
    return members.filter(m => m.status === status).length;
  };
  
  return (
    <div className="flex-1 space-y-6">
      {/* User Avatar Sidebar - Visible only on desktop */}
      <div className="flex gap-6">
        <div className="hidden md:block w-[80px]">
          <div className="flex flex-col items-center">
            <Avatar className="h-16 w-16 rounded-lg overflow-hidden border">
              <AvatarFallback className="bg-amber-500 text-white text-xl">
                {space.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        <div className="flex-1">
          {/* Status Filters + Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Status Filters */}
            <div className="flex">
              <Button
                variant={activeStatus === "active" ? "default" : "outline"}
                onClick={() => setActiveStatus("active")}
                className={`rounded-l-lg rounded-r-none border ${
                  activeStatus === "active" 
                    ? "bg-gray-200 hover:bg-gray-300 text-gray-800" 
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                Active ({getStatusCount("active")})
              </Button>
              <Button
                variant={activeStatus === "cancelling" ? "default" : "outline"}
                onClick={() => setActiveStatus("cancelling")}
                className={`rounded-none border-l-0 ${
                  activeStatus === "cancelling" 
                    ? "bg-gray-200 hover:bg-gray-300 text-gray-800" 
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                Cancelling
              </Button>
              <Button
                variant={activeStatus === "churned" ? "default" : "outline"}
                onClick={() => setActiveStatus("churned")}
                className={`rounded-none border-l-0 ${
                  activeStatus === "churned" 
                    ? "bg-gray-200 hover:bg-gray-300 text-gray-800" 
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                Churned
              </Button>
              <Button
                variant={activeStatus === "banned" ? "default" : "outline"}
                onClick={() => setActiveStatus("banned")}
                className={`rounded-r-lg rounded-l-none border-l-0 ${
                  activeStatus === "banned" 
                    ? "bg-gray-200 hover:bg-gray-300 text-gray-800" 
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                Banned
              </Button>
            </div>

            {/* Actions */}
            <div className="flex ml-auto gap-2">
              <Button
                variant="outline"
                className="rounded-lg border bg-white hover:bg-gray-100 gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button
                variant="outline"
                className="rounded-lg border bg-white hover:bg-gray-100 gap-2"
              >
                <FileDown className="h-4 w-4" />
                Export
              </Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium px-6"
              >
                INVITE
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border-gray-300 w-full rounded-lg"
            />
          </div>
          
          {/* Members List */}
          <div className="bg-white border rounded-xl overflow-hidden">
            {/* Members Rows */}
            <div className="divide-y divide-gray-200">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="col-span-1">
                      <div className="relative">
                        <Avatar className="h-10 w-10 rounded-full border">
                          <AvatarFallback className="bg-amber-500 text-white">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {member.isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
                        )}
                      </div>
                    </div>
                    
                    {/* Name & Info */}
                    <div className="col-span-5">
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">@{member.username}</div>
                      </div>
                    </div>
                    
                    {/* Free/Paid Status */}
                    <div className="col-span-3 text-sm flex items-center">
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                          Free
                        </span>
                        <span className="text-gray-500 text-xs">Lifetime access</span>
                      </div>
                    </div>
                    
                    {/* Access Level */}
                    <div className="col-span-2 flex items-center text-sm">
                      <div className="flex items-center px-2.5 py-0.5 rounded-full bg-gray-100">
                        {getRoleIcon(member.role)}
                        <span className="ml-1 text-gray-800">{getRoleText(member.role)}</span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-1 flex justify-end">
                      <button
                        className="h-8 w-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-gray-800 font-medium mb-1">No members found</h3>
                  <p className="text-gray-500 text-sm">
                    Try adjusting your search or invite new members to your space.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 