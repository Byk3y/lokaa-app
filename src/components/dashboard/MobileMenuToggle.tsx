
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileMenuToggleProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
  closeMobileSidebar: () => void;
}

const MobileMenuToggle = ({ 
  isMobileOpen, 
  setIsMobileOpen, 
  closeMobileSidebar 
}: MobileMenuToggleProps) => {
  return (
    <>
      {/* Mobile Menu Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="rounded-full bg-white shadow-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileSidebar}
        ></div>
      )}
    </>
  );
};

export default MobileMenuToggle;
