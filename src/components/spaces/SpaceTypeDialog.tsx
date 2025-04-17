
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, MessageSquare, BookOpen, Users, Image } from "lucide-react";

interface SpaceType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface SpaceTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpaceTypeDialog({ open, onOpenChange }: SpaceTypeDialogProps) {
  const navigate = useNavigate();
  const { communityId } = useParams();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const spaceTypes: SpaceType[] = [
    {
      id: "posts",
      name: "Posts",
      description: "Share updates, articles, and discussions with your community.",
      icon: <FileText className="h-6 w-6" />,
    },
    {
      id: "chat",
      name: "Chat",
      description: "Create a dedicated chat room for real-time conversations.",
      icon: <MessageSquare className="h-6 w-6" />,
    },
    {
      id: "events",
      name: "Events",
      description: "Schedule and manage online or in-person events.",
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      id: "course",
      name: "Course",
      description: "Create educational content with lessons and modules.",
      icon: <BookOpen className="h-6 w-6" />,
    },
    {
      id: "members",
      name: "Members",
      description: "Create a members-only space with exclusive content.",
      icon: <Users className="h-6 w-6" />,
    },
    {
      id: "images",
      name: "Gallery",
      description: "Share images and media with your community.",
      icon: <Image className="h-6 w-6" />,
    },
  ];
  
  const handleContinue = () => {
    if (!selectedType || !communityId) return;
    
    navigate(`/c/${communityId}/spaces/create?type=${selectedType}`);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Space Type</DialogTitle>
          <DialogDescription>
            Select what type of space you want to create. You can customize it further after creation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {spaceTypes.map((type) => (
            <div
              key={type.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors hover:border-lokaa-300 ${
                selectedType === type.id 
                  ? "border-lokaa-600 bg-lokaa-50" 
                  : "border-gray-200"
              }`}
              onClick={() => setSelectedType(type.id)}
            >
              <div className="flex items-center mb-2 text-lokaa-600">
                {type.icon}
                <span className="ml-2 font-medium">{type.name}</span>
              </div>
              <p className="text-sm text-gray-600">{type.description}</p>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleContinue}
            disabled={!selectedType}
            className="bg-lokaa-600 hover:bg-lokaa-700"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
