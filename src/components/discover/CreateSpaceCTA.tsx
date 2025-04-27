
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CreateSpaceCTA() {
  const navigate = useNavigate();
  
  return (
    <div className="mb-10 bg-lokaa-50 rounded-xl p-6 border border-lokaa-100">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Want to build your own Space?</h3>
        <p className="text-gray-600 mb-4">Start your community and monetize your passion.</p>
        <Button 
          className="bg-lokaa-600 hover:bg-lokaa-700 px-6 py-2 text-lg"
          onClick={() => navigate('/create-space')}
        >
          Create My Space
        </Button>
      </div>
    </div>
  );
}
