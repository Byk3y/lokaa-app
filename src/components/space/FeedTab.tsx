import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Check, Users, Plus, Edit, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FeedTabProps {
  space: {
    id: string;
    name: string;
    description: string | null;
  };
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      avatar_url?: string;
    };
  };
}

export default function FeedTab({ space, user }: FeedTabProps) {
  const [postText, setPostText] = useState("");
  const [setupCompletion, setSetupCompletion] = useState({
    invitePeople: false,
    addDescription: !!space.description,
    setCoverImage: false,
    writeFirstPost: false
  });
  
  // Calculate progress based on completed tasks
  const completedTasks = Object.values(setupCompletion).filter(Boolean).length;
  const totalTasks = Object.keys(setupCompletion).length;
  const progressValue = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Function to handle task completion
  const handleTaskComplete = (taskId: string) => {
    setSetupCompletion(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };
  
  return (
    <div className="flex-1 space-y-6">
      {/* Post Creation Area */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden"
      >
        <div className="px-5 py-4 flex items-center">
          <Avatar className="h-10 w-10 rounded-lg overflow-hidden mr-4 border-2 border-[#E0F2F1]">
            <AvatarImage 
              src={user?.user_metadata?.avatar_url} 
              alt="Profile" 
            />
            <AvatarFallback className="bg-[#26A69A] text-white">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-grow">
            <input 
              type="text" 
              placeholder="Write something..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F5FAFA] rounded-xl border border-[#E0F2F1] focus:outline-none focus:ring-2 focus:ring-[#26A69A] text-[#37474F] placeholder-[#78909C] transition-all"
            />
          </div>
        </div>
        
        <div className="flex px-4 py-3 border-t border-[#E0F2F1] bg-[#F5FAFA]">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center px-4 py-1.5 rounded-lg hover:bg-[#E0F2F1] text-[#26A69A] text-sm transition-colors"
          >
            All
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center px-4 py-1.5 rounded-lg hover:bg-[#E0F2F1] text-[#26A69A] text-sm transition-colors"
          >
            General discussion
          </motion.button>
          
          <div className="ml-auto flex space-x-2">
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: "#E0F2F1" }}
              whileTap={{ scale: 0.98 }}
              className="p-1.5 text-[#26A69A] hover:bg-[#E0F2F1] rounded-lg transition-all"
            >
              <Image className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
      
      {/* Setup Checklist Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-gradient-to-br from-[#E0F2F1] to-[#B2DFDB] rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden"
      >
        <div className="p-5">
          {/* Progress Bar Section */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-md font-medium text-[#37474F]">Set up your group</h2>
              <span className="text-sm text-[#26A69A]">{completedTasks}/{totalTasks} Complete</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="w-full">
                  <Progress 
                    value={progressValue} 
                    className="h-2 rounded-full shadow-sm bg-white [&>*]:bg-[#26A69A]"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Complete all steps to launch your space faster!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Checklist Items */}
          <div className="space-y-4">
            {/* Invite People */}
            <motion.div 
              whileHover={{ x: 5 }}
              className="flex items-center"
            >
              <motion.div
                initial={false}
                animate={{ 
                  scale: setupCompletion.invitePeople ? 1 : 0.8, 
                  opacity: setupCompletion.invitePeople ? 1 : 0.7 
                }}
                className={`h-6 w-6 rounded-full border flex items-center justify-center mr-3 transition-all ${
                  setupCompletion.invitePeople ? 'border-[#26A69A] bg-[#E0F2F1]' : 'border-[#B2DFDB]'
                }`}
              >
                {setupCompletion.invitePeople && (
                  <Check className="h-3.5 w-3.5 text-[#26A69A]" />
                )}
              </motion.div>
              <motion.button 
                whileHover={{ color: "#FF6F61" }}
                onClick={() => handleTaskComplete("invitePeople")}
                className={`${
                  setupCompletion.invitePeople 
                    ? 'text-[#78909C] line-through' 
                    : 'text-[#26A69A] hover:text-[#FF6F61]'
                } text-sm font-medium flex items-center`}
              >
                Invite 3 people
                {!setupCompletion.invitePeople && (
                  <Plus className="h-3.5 w-3.5 ml-1" />
                )}
              </motion.button>
            </motion.div>
            
            {/* Add Description */}
            <motion.div 
              whileHover={{ x: 5 }}
              className="flex items-center"
            >
              <motion.div
                initial={false}
                animate={{ 
                  scale: setupCompletion.addDescription ? 1 : 0.8, 
                  opacity: setupCompletion.addDescription ? 1 : 0.7 
                }}
                className={`h-6 w-6 rounded-full border flex items-center justify-center mr-3 transition-all ${
                  setupCompletion.addDescription ? 'border-[#26A69A] bg-[#E0F2F1]' : 'border-[#B2DFDB]'
                }`}
              >
                {setupCompletion.addDescription && (
                  <Check className="h-3.5 w-3.5 text-[#26A69A]" />
                )}
              </motion.div>
              <motion.button 
                whileHover={{ color: "#FF6F61" }}
                onClick={() => handleTaskComplete("addDescription")}
                className={`${
                  setupCompletion.addDescription 
                    ? 'text-[#78909C] line-through' 
                    : 'text-[#26A69A] hover:text-[#FF6F61]'
                } text-sm font-medium flex items-center`}
              >
                Add group description
                {!setupCompletion.addDescription && (
                  <Edit className="h-3.5 w-3.5 ml-1" />
                )}
              </motion.button>
            </motion.div>
            
            {/* Set Cover Image */}
            <motion.div 
              whileHover={{ x: 5 }}
              className="flex items-center"
            >
              <motion.div
                initial={false}
                animate={{ 
                  scale: setupCompletion.setCoverImage ? 1 : 0.8, 
                  opacity: setupCompletion.setCoverImage ? 1 : 0.7 
                }}
                className={`h-6 w-6 rounded-full border flex items-center justify-center mr-3 transition-all ${
                  setupCompletion.setCoverImage ? 'border-[#26A69A] bg-[#E0F2F1]' : 'border-[#B2DFDB]'
                }`}
              >
                {setupCompletion.setCoverImage && (
                  <Check className="h-3.5 w-3.5 text-[#26A69A]" />
                )}
              </motion.div>
              <motion.button 
                whileHover={{ color: "#FF6F61" }}
                onClick={() => handleTaskComplete("setCoverImage")}
                className={`${
                  setupCompletion.setCoverImage 
                    ? 'text-[#78909C] line-through' 
                    : 'text-[#26A69A] hover:text-[#FF6F61]'
                } text-sm font-medium flex items-center`}
              >
                Set cover image
                {!setupCompletion.setCoverImage && (
                  <Upload className="h-3.5 w-3.5 ml-1" />
                )}
              </motion.button>
            </motion.div>
            
            {/* Write First Post */}
            <motion.div 
              whileHover={{ x: 5 }}
              className="flex items-center"
            >
              <motion.div
                initial={false}
                animate={{ 
                  scale: setupCompletion.writeFirstPost ? 1 : 0.8, 
                  opacity: setupCompletion.writeFirstPost ? 1 : 0.7 
                }}
                className={`h-6 w-6 rounded-full border flex items-center justify-center mr-3 transition-all ${
                  setupCompletion.writeFirstPost ? 'border-[#26A69A] bg-[#E0F2F1]' : 'border-[#B2DFDB]'
                }`}
              >
                {setupCompletion.writeFirstPost && (
                  <Check className="h-3.5 w-3.5 text-[#26A69A]" />
                )}
              </motion.div>
              <motion.button 
                whileHover={{ color: "#FF6F61" }}
                onClick={() => handleTaskComplete("writeFirstPost")}
                className={`${
                  setupCompletion.writeFirstPost 
                    ? 'text-[#78909C] line-through' 
                    : 'text-[#26A69A] hover:text-[#FF6F61]'
                } text-sm font-medium flex items-center`}
              >
                Write your first post
                {!setupCompletion.writeFirstPost && (
                  <Edit className="h-3.5 w-3.5 ml-1" />
                )}
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      {/* Empty State For Posts */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white rounded-xl p-8 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center text-center"
      >
        <div className="h-16 w-16 bg-[#E0F2F1] rounded-full flex items-center justify-center mb-4">
          <Edit className="h-8 w-8 text-[#26A69A]" />
        </div>
        <h3 className="text-lg font-medium text-[#37474F] mb-2">No posts yet</h3>
        <p className="text-[#78909C] mb-4 max-w-md">
          Share your thoughts, questions, or resources with your group members.
        </p>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button 
            className="bg-[#26A69A] hover:bg-[#FF6F61] text-white font-medium rounded-xl px-6 transition-colors"
          >
            Create First Post
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
} 