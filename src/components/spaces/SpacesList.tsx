import React from 'react';
import { Link } from 'react-router-dom';
import { Space } from '../../types/space';
import { Users } from 'lucide-react';
import { SpaceAssetsUtils, useSpaceAssets } from "@/shared/utils/space-assets-utils";

interface SpacesListProps {
  spaces: Space[];
  loading: boolean;
}

/**
 * SpacesList component renders a list of spaces in a grid layout
 * ✅ UPGRADED: Now uses unified SpaceAssetsUtils system
 */
export default function SpacesList({ spaces, loading }: SpacesListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!spaces || spaces.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">No spaces found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {spaces.map((space) => {
        // 🚀 NEW: Use unified space assets system for each space
        const { assets, placeholder } = useSpaceAssets(space);
        
        return (
          <Link
            key={space.id}
            to={`/spaces/${space.id}`}
            className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Cover Image */}
            <div className="relative h-48">
              {assets.hasCover && assets.coverUrl ? (
                <img
                  src={assets.coverUrl}
                  alt={space.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                // 🎨 UPGRADED: Professional gradient placeholder using unified colors
                <div 
                  className="w-full h-full flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${placeholder.gradientFrom}, ${placeholder.gradientTo})` 
                  }}
                >
                  <span 
                    className="text-2xl font-bold"
                    style={{ color: placeholder.textColor }}
                  >
                    {placeholder.initials}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                {/* ✅ UPGRADED: Now uses unified SpaceAssetsUtils for consistent icon handling */}
                {assets.hasIcon && assets.iconUrl ? (
                  <div className="h-10 w-10 rounded-md overflow-hidden">
                    <img 
                      src={assets.iconUrl} 
                      alt={`${space.name} icon`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // 🎨 UPGRADED: Graceful fallback to unified placeholder
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.style.background = `linear-gradient(135deg, ${placeholder.gradientFrom}, ${placeholder.gradientTo})`;
                          parent.style.display = 'flex';
                          parent.style.alignItems = 'center';
                          parent.style.justifyContent = 'center';
                          const initialsSpan = document.createElement('span');
                          initialsSpan.textContent = placeholder.initials;
                          initialsSpan.style.color = placeholder.textColor;
                          initialsSpan.style.fontSize = '14px';
                          initialsSpan.style.fontWeight = '600';
                          parent.appendChild(initialsSpan);
                        }
                      }}
                    />
                  </div>
                ) : (
                  // 🎨 UPGRADED: Unified placeholder with professional gradient
                  <div 
                    className="h-10 w-10 rounded-md flex items-center justify-center text-sm font-medium"
                    style={{ 
                      background: `linear-gradient(135deg, ${placeholder.gradientFrom}, ${placeholder.gradientTo})`,
                      color: placeholder.textColor
                    }}
                  >
                    {placeholder.initials}
                  </div>
                )}
                <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                  {space.name}
                </h3>
              </div>
              <p className="text-gray-600 text-sm mt-1">{space.description}</p>
              <div className="flex items-center mt-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Users size={16} className="mr-1" />
                  <span>{space.members || space.member_count || 0} members</span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
} 