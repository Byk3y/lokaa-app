
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SpaceTypeDialog } from "./SpaceTypeDialog";

export function CreateSpaceButton() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setShowDialog(true)}
        className="bg-lokaa-600 hover:bg-lokaa-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Space
      </Button>
      
      <SpaceTypeDialog 
        open={showDialog} 
        onOpenChange={setShowDialog}
      />
    </>
  );
}
