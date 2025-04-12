
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText: string;
  actionLink: string;
  icon: React.ReactNode;
}

export default function EmptyState({
  title,
  description,
  actionText,
  actionLink,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
      <div className="w-16 h-16 rounded-full bg-lokaa-100 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md">{description}</p>
      <Link to={actionLink}>
        <Button className="bg-lokaa-600 hover:bg-lokaa-700">
          {actionText}
        </Button>
      </Link>
    </div>
  );
}
