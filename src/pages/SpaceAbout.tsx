import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Globe, Lock, Users, Upload, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Space } from "@/types/space";

// Interface for cover image uploader props
interface CoverImageUploaderProps {
  coverImage: string | null;
  onUpload: () => void;
}

// Interface for space stats
interface SpaceStats {
  members: number;
  online: number;
  admins: number;
}

// Interface for current user
interface CurrentUser {
  id: string;
}

// Extended Space interface to include is_private
interface ExtendedSpace extends Space {
  is_private: boolean;
}

// Component for uploading the cover image
const CoverImageUploader = ({ coverImage, onUpload }: CoverImageUploaderProps) => {
  return (
    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-gray-100">
      {coverImage ? (
        <img 
          src={coverImage} 
          alt="Space cover" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 text-sm">No cover image</p>
        </div>
      )}
      <Button 
        variant="secondary" 
        size="sm" 
        className="absolute bottom-3 right-3 bg-white/80 hover:bg-white text-gray-800"
        onClick={onUpload}
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload cover photo
      </Button>
    </div>
  );
};

// Main About page component
export default function SpaceAbout() {
  const { subdomain } = useParams<{ subdomain: string }>();
  
  // Mock data - would normally be passed in as props or fetched
  const [space, setSpace] = useState<ExtendedSpace>({
    id: "123",
    name: "Nextpath AI",
    description: "A community for AI enthusiasts and practitioners.",
    cover_image: null,
    subdomain: subdomain || "nextpath-ai",
    owner_id: "owner123",
    is_private: false,
    pricing_type: "free",
    price_per_month: null,
    member_count: 1,
    primary_color: "#10b981", // teal color
  });
  
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    id: "owner123" // simulate that current user is the owner
  });
  
  const [spaceStats, setSpaceStats] = useState<SpaceStats>({
    members: 1,
    online: 0,
    admins: 1
  });
  
  // State for tracking if the user is dragging over the upload area
  const [isDragging, setIsDragging] = useState(false);
  
  // Handlers for drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Handle the dropped files
    const files = Array.from(e.dataTransfer.files);
    console.log("Dropped files:", files);
    // Process files here (upload logic would go here)
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    console.log("Selected files:", files);
    // Process files here (upload logic would go here)
  };
  
  const handleUploadCover = () => {
    console.log("Upload cover photo clicked");
    // Upload cover photo logic would go here
  };
  
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main content column */}
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{space.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  {space.is_private ? (
                    <><Lock className="h-4 w-4 mr-1" /> Private</>
                  ) : (
                    <><Globe className="h-4 w-4 mr-1" /> Public</>
                  )}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" /> 
                  {space.member_count} {space.member_count === 1 ? 'member' : 'members'}
                </div>
                <div>
                  {space.pricing_type === 'free' ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      Free
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      ${space.price_per_month}/month
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">About</h2>
              <p className="text-gray-700">
                {space.description || "Add a description..."}
              </p>
            </div>
            
            {/* Upload area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-10 text-center mb-8 transition-colors duration-200 ${
                isDragging ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-400'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <Upload size={40} className="text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Upload images / videos</h3>
                <p className="text-gray-500 mb-4 max-w-md">
                  Drag and drop files here, or click to select files from your device.
                </p>
                <Button 
                  variant="outline" 
                  className="border-teal-500 text-teal-600 hover:bg-teal-50"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Select Files
                </Button>
                <input 
                  id="file-upload" 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileSelect}
                />
              </div>
            </div>
            
            {/* Gallery would go here */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Empty state */}
                <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No media yet</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="w-full md:w-80 space-y-6">
            {/* Cover Image */}
            <Card>
              <CardContent className="p-4">
                <CoverImageUploader 
                  coverImage={space.cover_image} 
                  onUpload={handleUploadCover} 
                />
              </CardContent>
            </Card>
            
            {/* Space Info */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-800 mb-1">{space.name}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  lokaa.com/space/{space.subdomain}
                </p>
                
                <Separator className="my-3" />
                
                <p className="text-sm text-gray-700 mb-4">
                  {space.description || "Add your group description here..."}
                </p>
                
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center p-2 bg-gray-50 rounded-md">
                    <div className="text-lg font-semibold">{spaceStats.members}</div>
                    <div className="text-xs text-gray-500">Members</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-md">
                    <div className="text-lg font-semibold">{spaceStats.online}</div>
                    <div className="text-xs text-gray-500">Online</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-md">
                    <div className="text-lg font-semibold">{spaceStats.admins}</div>
                    <div className="text-xs text-gray-500">Admins</div>
                  </div>
                </div>
                
                {/* Settings button (only for owner) */}
                {currentUser.id === space.owner_id && (
                  <Button 
                    className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => console.log("Settings clicked")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 