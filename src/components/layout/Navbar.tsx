
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isAuthenticated = false; // This will be connected to auth context later

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm py-3 md:py-4 px-4 md:px-6 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-lokaa-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <span className="font-bold text-xl text-gray-900">Lokaa</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/features"
            className={`text-sm font-medium transition-colors hover:text-lokaa-700 ${
              isActive("/features") ? "text-lokaa-700" : "text-gray-600"
            }`}
          >
            Features
          </Link>
          <Link
            to="/pricing"
            className={`text-sm font-medium transition-colors hover:text-lokaa-700 ${
              isActive("/pricing") ? "text-lokaa-700" : "text-gray-600"
            }`}
          >
            Pricing
          </Link>
          <Link
            to="/about"
            className={`text-sm font-medium transition-colors hover:text-lokaa-700 ${
              isActive("/about") ? "text-lokaa-700" : "text-gray-600"
            }`}
          >
            About
          </Link>
        </div>

        {/* Auth Buttons - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="default" className="bg-lokaa-600 hover:bg-lokaa-700">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" className="border-lokaa-600 text-lokaa-600 hover:bg-lokaa-50">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-lokaa-600 hover:bg-lokaa-700">Sign up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button onClick={toggleMenu} className="md:hidden text-gray-700">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg p-4 rounded-b-lg animate-fade-in z-50">
          <div className="flex flex-col space-y-4">
            <Link
              to="/features"
              onClick={closeMenu}
              className={`text-sm font-medium p-2 rounded-md ${
                isActive("/features") ? "bg-lokaa-50 text-lokaa-700" : "text-gray-600"
              }`}
            >
              Features
            </Link>
            <Link
              to="/pricing"
              onClick={closeMenu}
              className={`text-sm font-medium p-2 rounded-md ${
                isActive("/pricing") ? "bg-lokaa-50 text-lokaa-700" : "text-gray-600"
              }`}
            >
              Pricing
            </Link>
            <Link
              to="/about"
              onClick={closeMenu}
              className={`text-sm font-medium p-2 rounded-md ${
                isActive("/about") ? "bg-lokaa-50 text-lokaa-700" : "text-gray-600"
              }`}
            >
              About
            </Link>
            <div className="pt-2 border-t border-gray-100">
              {isAuthenticated ? (
                <Link to="/dashboard" onClick={closeMenu}>
                  <Button className="w-full bg-lokaa-600 hover:bg-lokaa-700">Dashboard</Button>
                </Link>
              ) : (
                <div className="flex flex-col space-y-2">
                  <Link to="/login" onClick={closeMenu}>
                    <Button variant="outline" className="w-full border-lokaa-600 text-lokaa-600 hover:bg-lokaa-50">
                      <LogIn className="mr-2 h-4 w-4" /> Log in
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={closeMenu}>
                    <Button className="w-full bg-lokaa-600 hover:bg-lokaa-700">Sign up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
