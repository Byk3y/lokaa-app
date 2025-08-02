import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSpace } from "@/contexts/SpaceContext";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import AboutTabLayout from "./AboutTabLayout";

interface AboutTabProps {
  /** Dummy prop to avoid empty interface warning */
  _key?: string;
}

export default function AboutTab(props: AboutTabProps) {
  const { space: spaceData, loading, error } = useSpace();
  const { space: storeSpace } = useSpaceSettingsStore();
  
  // Use the same fallback pattern as other tabs
  const currentSpaceData = storeSpace || spaceData;

  // Handle error and loading states
  if (error && !currentSpaceData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {`Error loading space: ${error.message}`}
          </AlertDescription>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  // Early return if no space data is available from either source
  if (!currentSpaceData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Use the new layout component
  return <AboutTabLayout _key={props._key} />;
}