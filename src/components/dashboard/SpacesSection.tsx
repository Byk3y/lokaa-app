
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, PlusCircle } from "lucide-react";

interface SpacesSectionProps {
  closeMobileSidebar: () => void;
}

const SpacesSection = ({ closeMobileSidebar }: SpacesSectionProps) => {
  const [spacesExpanded, setSpacesExpanded] = useState(true);
  const toggleSpaces = () => setSpacesExpanded(!spacesExpanded);

  return (
    <div className="pt-4 pb-2">
      <button
        onClick={toggleSpaces}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100"
      >
        <span>Your Spaces</span>
        {spacesExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {spacesExpanded && (
        <div className="mt-1 pl-4 space-y-1">
          <Link
            to="/spaces/create"
            className="flex items-center px-4 py-2 text-sm text-lokaa-600 rounded-md hover:bg-gray-100"
            onClick={closeMobileSidebar}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Space
          </Link>
        </div>
      )}
    </div>
  );
};

export default SpacesSection;
