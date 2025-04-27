import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function CreateSpaceButton() {
  return (
    <Button 
      className="bg-lokaa-600 hover:bg-lokaa-700"
      asChild
    >
      <Link to="/create-space">
        <Plus className="w-4 h-4 mr-2" />
        Create Space
      </Link>
    </Button>
  );
}
