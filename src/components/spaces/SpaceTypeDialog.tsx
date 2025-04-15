
import { useNavigate, useParams } from "react-router-dom";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Calendar, 
  MessageSquare, 
  BookOpen,
  Users,
  Image
} from "lucide-react";

interface SpaceType {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

const spaceTypes: SpaceType[] = [
  {
    id: "posts",
    icon: FileText,
    label: "Posts",
    description: "Create a feed for announcements and discussions"
  },
  {
    id: "events",
    icon: Calendar,
    label: "Events",
    description: "Schedule and manage community events"
  },
  {
    id: "chat",
    icon: MessageSquare,
    label: "Chat",
    description: "Real-time conversations and discussions"
  },
  {
    id: "course",
    icon: BookOpen,
    label: "Course",
    description: "Create structured learning content"
  },
  {
    id: "members",
    icon: Users,
    label: "Members",
    description: "Member directory and management"
  },
  {
    id: "images",
    icon: Image,
    label: "Images",
    description: "Share photos and visual content"
  }
];

interface SpaceTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpaceTypeDialog({ open, onOpenChange }: SpaceTypeDialogProps) {
  const navigate = useNavigate();
  const { communityId } = useParams();
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  
  const handleNext = () => {
    if (selectedType && communityId) {
      navigate(`/c/${communityId}/spaces/create?type=${selectedType}`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Choose space type</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {spaceTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                selectedType === type.id
                  ? "border-lokaa-600 bg-lokaa-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="flex-shrink-0">
                <type.icon className={`w-6 h-6 ${
                  selectedType === type.id ? "text-lokaa-600" : "text-gray-500"
                }`} />
              </div>
              <div className="text-left">
                <h3 className={`font-medium ${
                  selectedType === type.id ? "text-lokaa-600" : "text-gray-900"
                }`}>
                  {type.label}
                </h3>
                <p className="text-sm text-gray-500">{type.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <Button 
            onClick={handleNext}
            disabled={!selectedType}
            className="bg-lokaa-600 hover:bg-lokaa-700"
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
