import { Globe, Lock, Users, Tag, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

interface AboutTabProps {
  space: {
    id: string;
    name: string;
    description: string | null;
    cover_image: string | null;
    is_private: boolean;
    member_count?: number | null;
    pricing_type?: 'free' | 'paid';
    price_per_month?: number | null;
    primary_color?: string | null;
    owner?: {
      id: string;
      email?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
    } | null;
  };
}

export default function AboutTab({ space }: AboutTabProps) {
  const handleUploadImage = () => {
    console.log("Upload images/videos clicked");
    // Logic to handle image upload would go here
  };
  
  // Default values for properties that might be missing
  const memberCount = space.member_count ?? 1;
  const pricingType = space.pricing_type ?? 'free';
  const pricePerMonth = space.price_per_month ?? 0;
  const primaryColor = space.primary_color ?? '#26A69A';

  return (
    <div className="w-full bg-[#F5FAFA] p-6 rounded-xl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left column - Main content */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-4 text-[#37474F]">{space.name}</h1>
          
          {/* Upload area */}
          <motion.div 
            whileHover={{ boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)" }}
            className="bg-[#E0F2F1] rounded-xl flex flex-col items-center justify-center cursor-pointer mb-6 border-2 border-dashed border-[#26A69A] transition-all duration-300 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)]"
            style={{ height: "396px" }}
            onClick={handleUploadImage}
          >
            <div className="p-6 rounded-full bg-[#B2DFDB] mb-3">
              <Upload className="h-8 w-8 text-[#26A69A]" />
            </div>
            <p className="text-[#26A69A] font-medium mb-1">Upload images / videos</p>
            <p className="text-[#78909C] text-sm">Click to browse or drag and drop</p>
          </motion.div>
          
          {/* Bottom metadata */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center bg-white px-3 py-2 rounded-lg shadow-sm">
              {space.is_private ? (
                <><Lock className="h-5 w-5 mr-2 text-[#26A69A]" /> <span className="text-[#37474F]">Private</span></>
              ) : (
                <><Globe className="h-5 w-5 mr-2 text-[#26A69A]" /> <span className="text-[#37474F]">Public</span></>
              )}
            </div>
            
            <div className="flex items-center bg-white px-3 py-2 rounded-lg shadow-sm">
              <Users className="h-5 w-5 mr-2 text-[#26A69A]" /> 
              <span className="text-[#37474F]">1 member</span>
            </div>
            
            <div className="flex items-center bg-white px-3 py-2 rounded-lg shadow-sm">
              <Tag className="h-5 w-5 mr-2 text-[#26A69A]" /> 
              <span className="text-[#37474F]">{pricingType === 'free' ? 'Free' : `$${pricePerMonth}/month`}</span>
            </div>
          </div>
          
          {/* Description area */}
          <motion.div 
            whileHover={{ boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)" }}
            className="bg-white p-5 rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-300"
          >
            <p className="text-[#37474F]">
              {space.description || "Add a description..."}
            </p>
          </motion.div>
        </div>
        
        {/* Right column - Sidebar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="md:w-80 bg-gradient-to-br from-[#E0F2F1] to-[#B2DFDB] rounded-xl p-5 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)]"
        >
          {/* Cover image uploader */}
          <motion.div 
            whileHover={{ 
              boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
              scale: 1.02
            }}
            className="bg-[#26A69A] aspect-video rounded-xl flex items-center justify-center text-white cursor-pointer mb-4 shadow-md transition-all duration-300"
          >
            {space.cover_image ? (
              <img 
                src={space.cover_image} 
                alt={`${space.name} cover`}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center">
                <Upload size={24} className="mb-1" />
                <p className="text-sm font-medium">Upload cover photo</p>
              </div>
            )}
          </motion.div>
          
          {/* Space info */}
          <div className="bg-white rounded-xl border border-[#E0F2F1] p-4 mb-4 shadow-sm">
            <h3 className="font-semibold text-[#37474F] mb-1">{space.name}</h3>
            <p className="text-sm text-[#78909C] mb-3">
              skool.com/nextpath-ai-1811
            </p>
            
            <Separator className="my-3 bg-[#E0F2F1]" />
            
            <p className="text-sm text-[#37474F] mb-4">
              {space.description || "Add your group description here by clicking the \"Settings\" button."}
            </p>
            
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-[#F5FAFA] rounded-lg shadow-sm">
                <div className="text-lg font-semibold text-[#26A69A]">1</div>
                <div className="text-xs text-[#78909C]">Member</div>
              </div>
              <div className="text-center p-2 bg-[#F5FAFA] rounded-lg shadow-sm">
                <div className="text-lg font-semibold text-[#26A69A]">0</div>
                <div className="text-xs text-[#78909C]">Online</div>
              </div>
              <div className="text-center p-2 bg-[#F5FAFA] rounded-lg shadow-sm">
                <div className="text-lg font-semibold text-[#26A69A]">1</div>
                <div className="text-xs text-[#78909C]">Admin</div>
              </div>
            </div>
          </div>
          
          {/* Settings button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              className="w-full justify-center font-medium text-white bg-[#26A69A] hover:bg-[#FF6F61] rounded-xl transition-colors duration-300"
            >
              SETTINGS
            </Button>
          </motion.div>
          
          {/* Powered by */}
          <div className="text-center text-xs text-[#78909C] mt-4">
            powered by <span className="text-[#37474F]">Lokaa</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 