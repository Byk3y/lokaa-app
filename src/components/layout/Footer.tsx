
import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 pt-12 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-lokaa-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Lokaa</span>
            </Link>
            <p className="text-gray-600 text-sm">
              Build communities, share knowledge, and monetize your passion in emerging markets.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-3">
              <li><Link to="/features" className="text-gray-600 hover:text-lokaa-600 text-sm">Features</Link></li>
              <li><Link to="/pricing" className="text-gray-600 hover:text-lokaa-600 text-sm">Pricing</Link></li>
              <li><Link to="/integrations" className="text-gray-600 hover:text-lokaa-600 text-sm">Integrations</Link></li>
              <li><Link to="/changelog" className="text-gray-600 hover:text-lokaa-600 text-sm">Changelog</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-gray-600 hover:text-lokaa-600 text-sm">About</Link></li>
              <li><Link to="/blog" className="text-gray-600 hover:text-lokaa-600 text-sm">Blog</Link></li>
              <li><Link to="/careers" className="text-gray-600 hover:text-lokaa-600 text-sm">Careers</Link></li>
              <li><Link to="/contact" className="text-gray-600 hover:text-lokaa-600 text-sm">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-3">
              <li><Link to="/help" className="text-gray-600 hover:text-lokaa-600 text-sm">Help Center</Link></li>
              <li><Link to="/community" className="text-gray-600 hover:text-lokaa-600 text-sm">Community</Link></li>
              <li><Link to="/guides" className="text-gray-600 hover:text-lokaa-600 text-sm">Guides</Link></li>
              <li><Link to="/api" className="text-gray-600 hover:text-lokaa-600 text-sm">API Documentation</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-xs mb-4 md:mb-0">
            &copy; {currentYear} Lokaa. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link to="/terms" className="text-gray-600 hover:text-lokaa-600 text-xs">Terms</Link>
            <Link to="/privacy" className="text-gray-600 hover:text-lokaa-600 text-xs">Privacy</Link>
            <Link to="/cookies" className="text-gray-600 hover:text-lokaa-600 text-xs">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
