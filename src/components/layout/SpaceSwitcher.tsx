import React, { useState } from 'react';
import { Menu, ChevronDown, X } from 'lucide-react';

// Placeholder spaces data
const spaces = [
  { id: '1', name: 'AI Automation Society', icon: '/ais-icon.png', type: 'free', members: 61500 },
  { id: '2', name: 'Tech Snack University', icon: '/tsu-icon.png', type: 'free', members: 3200 },
  { id: '3', name: 'Skoolers', icon: '/skoolers-icon.png', type: 'free', members: 51100 },
];

const currentSpace = spaces[0];

const SpaceSwitcher: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Responsive: show hamburger on mobile, dropdown on web
      return (
    <div className="relative">
      {/* Mobile: Hamburger menu */}
      <div className="flex items-center md:hidden">
        <button onClick={() => setDrawerOpen(true)} className="p-2 focus:outline-none">
          <Menu className="h-7 w-7" />
        </button>
        <img src={currentSpace.icon} alt={currentSpace.name} className="h-7 w-7 rounded-md ml-2" />
        <span className="ml-2 font-semibold text-lg">{currentSpace.name}</span>
      </div>
      {/* Web: Dropdown */}
      <div className="hidden md:flex items-center cursor-pointer select-none" onClick={() => setDropdownOpen(v => !v)}>
        <img src={currentSpace.icon} alt={currentSpace.name} className="h-8 w-8 rounded-md" />
        <span className="ml-2 font-semibold text-lg">{currentSpace.name}</span>
        <ChevronDown className="ml-1 h-5 w-5 text-gray-500" />
      </div>
      {/* Dropdown menu (web) */}
      {dropdownOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border z-50 hidden md:block">
          {spaces.map(space => (
            <div key={space.id} className="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer">
              <img src={space.icon} alt={space.name} className="h-7 w-7 rounded-md" />
              <div className="ml-3 flex-1">
                <div className="font-semibold">{space.name}</div>
                <div className="text-xs text-gray-500">{space.members.toLocaleString()} members • {space.type === 'free' ? 'Free' : 'Paid'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Drawer (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-72 bg-white h-full shadow-xl p-6 flex flex-col">
            <div className="flex items-center mb-6">
              <span className="font-bold text-lg flex-1">Your Spaces</span>
              <button onClick={() => setDrawerOpen(false)} className="p-1"><X className="h-6 w-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {spaces.map(space => (
                <div key={space.id} className="flex items-center px-2 py-3 rounded-lg hover:bg-gray-100 cursor-pointer mb-1">
                  <img src={space.icon} alt={space.name} className="h-7 w-7 rounded-md" />
                  <div className="ml-3 flex-1">
                    <div className="font-semibold">{space.name}</div>
                    <div className="text-xs text-gray-500">{space.members.toLocaleString()} members • {space.type === 'free' ? 'Free' : 'Paid'}</div>
                  </div>
              </div>
              ))}
              </div>
          </div>
          {/* Overlay */}
          <div className="flex-1 bg-black bg-opacity-30" onClick={() => setDrawerOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default SpaceSwitcher; 