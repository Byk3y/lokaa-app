
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
}

export default function LoadingSpinner({ size = "md" }: LoadingSpinnerProps) {
  // Map size prop to actual pixel size
  const sizeMap = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const sizeClass = sizeMap[size];

  return (
    <div className="flex justify-center py-8">
      <Loader2 className={`${sizeClass} animate-spin text-lokaa-600`} />
    </div>
  );
}
